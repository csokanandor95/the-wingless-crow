// Árnyék-lidérc (az Ancient Demon Phase 2 idézésének terméke) unit tesztek.
//
// A lény szándékosan minimális (nincs state machine-je, nincs támadás-animációja), ezért a
// tesztek a NÉGY tulajdonságára koncentrálnak, amiken a Phase 2 játszhatósága múlik:
// mikortól él, hogyan sodródik, hogyan sebez (pontosan egyszer), és hogyan hal meg.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

import ShadeMinion, {
  SHADE_CONTACT_DAMAGE,
  SHADE_HIT_RANGE_X,
  SHADE_HIT_RANGE_Y,
  SHADE_LIFETIME_MS,
  SHADE_SPEED,
  ShadeState,
} from '../../src/bosses/ShadeMinion';
import { APPEAR_ANIM_MS, DEATH_ANIM_MS } from '../../src/bosses/ShadeMinionAnimations';
import Player, {
  HURT_LOCK_MS,
  MAX_HP as PLAYER_MAX_HP,
  MOVE_SPEED,
} from '../../src/player/Player';
import {
  createMockScene,
  createDelayedCallRunner,
  getBody,
  type MockScene,
} from './helpers/phaserTestUtils';

const SHADE_X = 400;
const SHADE_Y = 300;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

describe('ShadeMinion', () => {
  let scene: MockScene;
  let shade: ShadeMinion;
  let runner: ReturnType<typeof createDelayedCallRunner>;

  beforeEach(() => {
    scene = createMockScene();
    shade = new ShadeMinion(scene as unknown as Phaser.Scene, SHADE_X, SHADE_Y);
    runner = createDelayedCallRunner(scene);
  });

  /** A megjelenés-animáció lefuttatása: innentől él a lidérc. */
  function finishAppearing(): void {
    runner.run(APPEAR_ANIM_MS);
    expect(shade.shadeState).toBe(ShadeState.ALIVE);
  }

  describe('Megjelenés', () => {
    it('APPEARING állapotban születik, és LEBEG (nincs gravitációja)', () => {
      expect(shade.shadeState).toBe(ShadeState.APPEARING);
      expect(shade.isDead()).toBe(false);
      expect(getBody(shade).setAllowGravity).toHaveBeenCalledWith(false);
    });

    it('a megjelenés alatt NEM mozog és NEM sebez — az idézés telegraph, nem csapda', () => {
      const player = createPlayerAt(scene, SHADE_X, SHADE_Y);

      shade.update(player);

      expect(getBody(shade).velocity.x).toBe(0);
      expect(getBody(shade).velocity.y).toBe(0);
      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });

    it('a megjelenés-animáció végén válik élővé', () => {
      finishAppearing();
    });
  });

  describe('Sodródás', () => {
    it('KÉT tengelyen sodródik a player felé — a felugrás önmagában nem menedék', () => {
      const player = createPlayerAt(scene, SHADE_X + 300, SHADE_Y - 300);
      finishAppearing();

      shade.update(player);

      expect(getBody(shade).velocity.x).toBeGreaterThan(0);
      expect(getBody(shade).velocity.y).toBeLessThan(0);
    });

    it('a sebessége pontosan SHADE_SPEED, irányfüggetlenül', () => {
      const player = createPlayerAt(scene, SHADE_X - 200, SHADE_Y + 150);
      finishAppearing();

      shade.update(player);

      const { x, y } = getBody(shade).velocity;
      expect(Math.hypot(x, y)).toBeCloseTo(SHADE_SPEED, 6);
    });

    it('SZÁNDÉKOSAN lassabb a playernél — kikerülhető, de nyomást tart', () => {
      expect(SHADE_SPEED).toBeLessThan(MOVE_SPEED);
    });

    it('halott player mellett megáll', () => {
      const player = createPlayerAt(scene, SHADE_X + 300, SHADE_Y);
      finishAppearing();
      // A Player halála a HURT-lock LEJÁRTAKOR következik be, nem a takeDamage()-ben.
      player.takeDamage(PLAYER_MAX_HP);
      runner.run(HURT_LOCK_MS);
      expect(player.isDead()).toBe(true);

      shade.update(player);

      expect(getBody(shade).velocity.x).toBe(0);
      expect(getBody(shade).velocity.y).toBe(0);
    });
  });

  describe('Kontakt-sebzés', () => {
    it('érintésre sebez, ÉS azonnal el is pusztul', () => {
      const player = createPlayerAt(scene, SHADE_X, SHADE_Y);
      finishAppearing();

      shade.update(player);

      expect(player.getHP()).toBe(PLAYER_MAX_HP - SHADE_CONTACT_DAMAGE);
      expect(shade.isDead()).toBe(true);
    });

    it('PONTOSAN EGYSZER sebez — a folyamatos érintkezés nem darálja le a playert', () => {
      // Ez az oka annak, hogy a lidércnek nem kell HazardDamageGate (mint a tüskéknek):
      // a saját találatát nem éli túl, tehát a frame-enkénti sebzés fogalmilag lehetetlen.
      const player = createPlayerAt(scene, SHADE_X, SHADE_Y);
      finishAppearing();

      shade.update(player);
      shade.update(player);
      shade.update(player);

      expect(player.getHP()).toBe(PLAYER_MAX_HP - SHADE_CONTACT_DAMAGE);
    });

    it('a találati sávon KÍVÜL nem sebez', () => {
      const player = createPlayerAt(scene, SHADE_X + SHADE_HIT_RANGE_X + 10, SHADE_Y);
      finishAppearing();

      shade.update(player);

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
      expect(shade.isDead()).toBe(false);
    });

    it('a függőleges sáv is számít — a lidérc fölött/alatt elhaladva nincs találat', () => {
      const player = createPlayerAt(scene, SHADE_X, SHADE_Y - (SHADE_HIT_RANGE_Y + 10));
      finishAppearing();

      shade.update(player);

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });
  });

  describe('Halál', () => {
    it('BÁRMEKKORA sebzés megöli — egy kardcsapás vagy egy tűzgolyó elég', () => {
      finishAppearing();

      shade.takeDamage(1);

      expect(shade.isDead()).toBe(true);
      expect(shade.shadeState).toBe(ShadeState.DEAD);
      expect(getBody(shade).enable).toBe(false);
    });

    it('halálkor eventet emittál a pozíciójával', () => {
      const onDeath = vi.fn();
      shade.on('shade-death', onDeath);
      finishAppearing();

      shade.takeDamage(1);

      expect(onDeath).toHaveBeenCalledWith(SHADE_X, SHADE_Y);
    });

    it('a halál-animáció után megsemmisíti magát', () => {
      finishAppearing();
      shade.takeDamage(1);

      expect(shade.active).toBe(true);
      runner.run(DEATH_ANIM_MS);
      expect(shade.active).toBe(false);
    });

    it('a már halott lidérc nem hal meg újra', () => {
      const onDeath = vi.fn();
      finishAppearing();
      shade.takeDamage(1);
      shade.on('shade-death', onDeath);

      shade.takeDamage(1);

      expect(onDeath).not.toHaveBeenCalled();
    });

    it('lejár magától, ha senki nem öli meg', () => {
      finishAppearing();

      runner.run(SHADE_LIFETIME_MS);

      expect(shade.isDead()).toBe(true);
    });

    it('a MEGJELENÉS KÖZBEN megsemmisített lidérc nem kel életre utólag', () => {
      // A scene a démon halálakor (vagy a scene leállásakor) menet közben is destroy()-olhat.
      shade.destroy();
      expect(shade.shadeState).toBe(ShadeState.DEAD);

      runner.run(APPEAR_ANIM_MS);

      expect(shade.shadeState).toBe(ShadeState.DEAD);
    });

    it('a destroy() NEM emittál halál-eventet — különben minden takarítás hang-kórust adna', () => {
      // 24. technikai tanulság: a halál-event KIZÁRÓLAG a die()-ba kerülhet. A démon
      // legyőzésekor a scene az ÖSSZES lidércet megsemmisíti; destroy()-ból emittálva ez
      // egy egyszerre megszólaló haláltusa-kórus lenne a győzelmi beat alatt.
      const onDeath = vi.fn();
      shade.on('shade-death', onDeath);
      finishAppearing();

      shade.destroy();

      expect(onDeath).not.toHaveBeenCalled();
      expect(shade.isDead()).toBe(true);
    });
  });
});
