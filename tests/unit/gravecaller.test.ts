// Enemy 2 (Gravecaller) unit tesztek — Project_plan.md §23 "Unit testing / Enemy" bontása
// szerint: HP, damage, death, state transitions.
//
// A CrowHarvester tesztjének mintáját követi (valódi Player példány teszt-adatként, nem
// duck-typing + cast), de két olyan állítást is tartalmaz, ami CSAK a távolsági
// archetípusra igaz, és ami manuális végigjátszáson nehezen bizonyítható:
//
//   1. a VERTIKÁLIS KAPU a tüzelésre is érvényes — egy alulról fireballozott Gravecaller
//      felébred, de nem lő a levegőbe a player feje fölött;
//   2. a MAINTAIN DISTANCE hátrálása a felület peremén VÉGET ÉR — a platformon álló lény
//      sarokba szorítható, ez a "ne legyen nehéz megközelíteni" követelmény geometriai fele.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import Gravecaller, {
  GravecallerState,
  MAX_HP,
  DETECTION_RANGE,
  VERTICAL_DETECTION_RANGE,
  LOSE_RANGE,
  RETREAT_RANGE,
  RETREAT_SPEED,
  PREFERRED_RANGE,
  ADVANCE_SPEED,
  PATROL_SPEED,
  CAST_STARTUP_MS,
  CAST_RECOVERY_MS,
  REPOSITION_MS,
  PROJECTILE_SPAWN_OFFSET_X,
  PROJECTILE_SPAWN_OFFSET_Y,
  DIRECTION_DEADZONE,
} from '../../src/enemies/Gravecaller';
import Player from '../../src/player/Player';
import {
  createMockScene,
  getBody,
  createDelayedCallRunner,
  type MockScene,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

const CASTER_X = 1000;
const CASTER_Y = 400;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

describe('Gravecaller', () => {
  let scene: MockScene;
  let caster: Gravecaller;

  beforeEach(() => {
    scene = createMockScene();
    caster = new Gravecaller(scene as unknown as Phaser.Scene, CASTER_X, CASTER_Y);
    caster.x = CASTER_X;
    caster.y = CASTER_Y;
  });

  describe('HP', () => {
    it('új Gravecaller: HP a maximumon', () => {
      expect(caster.getHP()).toBe(MAX_HP);
      expect(caster.getMaxHP()).toBe(MAX_HP);
    });

    it('érdemben törékenyebb a CrowHarvesternél — karddal gyorsan leszedhető', async () => {
      const { MAX_HP: HARVESTER_MAX_HP } = await import('../../src/enemies/CrowHarvester');
      expect(MAX_HP).toBeLessThan(HARVESTER_MAX_HP);
    });
  });

  describe('damage', () => {
    it('takeDamage: csökkenti a HP-t', () => {
      caster.takeDamage(10);
      expect(caster.getHP()).toBe(MAX_HP - 10);
    });

    it('takeDamage: nem megy 0 alá', () => {
      caster.takeDamage(MAX_HP + 50);
      expect(caster.getHP()).toBe(0);
    });

    it('takeDamage PATROL alatt azonnal MAINTAIN_DISTANCE-be vált', () => {
      // Ugyanaz az elv, mint a CrowHarvesternél: egy távolról indított tűzgolyó is
      // felébreszti, nem csak a közelség.
      expect(caster.gravecallerState).toBe(GravecallerState.PATROL);
      caster.takeDamage(1);
      expect(caster.gravecallerState).toBe(GravecallerState.MAINTAIN_DISTANCE);
    });

    it('a halott Gravecallert már nem lehet sebezni', () => {
      caster.takeDamage(MAX_HP);
      expect(caster.isDead()).toBe(true);

      caster.takeDamage(10);
      expect(caster.getHP()).toBe(0);
    });
  });

  describe('death', () => {
    it('0 HP-nál meghal, megáll, és letiltja a physics bodyt', () => {
      caster.takeDamage(MAX_HP);

      expect(caster.gravecallerState).toBe(GravecallerState.DEAD);
      expect(caster.isDead()).toBe(true);
      expect(getBody(caster).enable).toBe(false);
    });

    it('a halál a TELJES death animáció UTÁN kezd elhalványulni', () => {
      // A csomagban van valódi death animáció (a CrowHarvesternél nem volt), ezért a fade
      // késleltetve indul — enélkül a lény az összeesés közben tűnne el.
      caster.takeDamage(MAX_HP);

      const calls = scene.tweens.add.mock.calls;
      const config = calls[calls.length - 1][0];
      expect(config.alpha).toBe(0);
      expect(config.delay).toBeGreaterThan(0);
    });

    it('a halott Gravecaller update()-je no-op', () => {
      const player = createPlayerAt(scene, CASTER_X + 50, CASTER_Y);
      caster.takeDamage(MAX_HP);

      const before = { ...getBody(caster).velocity };
      caster.update(player);
      expect(getBody(caster).velocity).toEqual(before);
    });
  });

  describe('DETECT PLAYER (PATROL -> MAINTAIN_DISTANCE)', () => {
    it('a CrowHarvesternél MESSZEBBRŐL vesz észre — ez teszi távolságivá', async () => {
      const { DETECTION_RANGE: HARVESTER_RANGE } = await import(
        '../../src/enemies/CrowHarvester'
      );
      expect(DETECTION_RANGE).toBeGreaterThan(HARVESTER_RANGE);
    });

    it('vízszintesen ÉS vertikálisan is közeli player -> MAINTAIN_DISTANCE', () => {
      const player = createPlayerAt(scene, CASTER_X + DETECTION_RANGE - 10, CASTER_Y);
      caster.update(player);
      expect(caster.gravecallerState).toBe(GravecallerState.MAINTAIN_DISTANCE);
    });

    it('a DETECTION_RANGE-en kívüli player nem ébreszti fel', () => {
      const player = createPlayerAt(scene, CASTER_X + DETECTION_RANGE + 10, CASTER_Y);
      caster.update(player);
      expect(caster.gravecallerState).toBe(GravecallerState.PATROL);
    });

    it('a vertikálisan távoli playert NEM veszi észre, akkor sem, ha vízszintesen mellette áll', () => {
      // Enélkül egy platformon álló Gravecaller a talajon futó playerre is tüzelne — a
      // vízszintes lövedék pedig elmenne a feje fölött.
      const player = createPlayerAt(scene, CASTER_X + 20, CASTER_Y + VERTICAL_DETECTION_RANGE + 10);
      caster.update(player);
      expect(caster.gravecallerState).toBe(GravecallerState.PATROL);
    });

    it('PATROL-ban a patrol-határok között jár', () => {
      const player = createPlayerAt(scene, CASTER_X + 2000, CASTER_Y);
      caster.update(player);
      expect(Math.abs(getBody(caster).velocity.x)).toBe(PATROL_SPEED);
    });
  });

  describe('MAINTAIN DISTANCE', () => {
    function engage(playerX: number, playerY = CASTER_Y): Player {
      const player = createPlayerAt(scene, playerX, playerY);
      caster.update(player); // PATROL -> MAINTAIN_DISTANCE
      caster.update(player); // a térközölés csak a következő frame-en fut
      return player;
    }

    it('a LOSE_RANGE-en túl lehagyva visszatér PATROL-ba', () => {
      const player = engage(CASTER_X + 100);
      expect(caster.gravecallerState).toBe(GravecallerState.MAINTAIN_DISTANCE);

      player.x = CASTER_X + LOSE_RANGE + 10;
      caster.update(player);
      expect(caster.gravecallerState).toBe(GravecallerState.PATROL);
    });

    it('túl közeli player -> HÁTRÁL, a playertől ELFELÉ', () => {
      engage(CASTER_X + RETREAT_RANGE - 20);
      // A player jobbra van, tehát balra hátrál.
      expect(getBody(caster).velocity.x).toBe(-RETREAT_SPEED);
    });

    it('a hátrálás LASSABB a playernél — nem menekülés, csak késleltetés', async () => {
      const { MOVE_SPEED } = await import('../../src/player/Player');
      expect(RETREAT_SPEED).toBeLessThan(MOVE_SPEED);
    });

    it('túl távoli player -> KÖZELÍT, hogy a lövedéke elérjen', () => {
      engage(CASTER_X + PREFERRED_RANGE + 40);
      expect(getBody(caster).velocity.x).toBe(ADVANCE_SPEED);
    });

    it('a preferált sávban MEGÁLL — és innen indul a cast', () => {
      // A cast kapuja az ÁLLÓ helyzet: a lény előbb rendezi a térközt, és csak utána lő.
      engage(CASTER_X + (RETREAT_RANGE + PREFERRED_RANGE) / 2);
      expect(getBody(caster).velocity.x).toBe(0);
      expect(caster.gravecallerState).toBe(GravecallerState.CAST);
    });

    it('MOZGÁS közben (hátrálás/közelítés) NEM castol', () => {
      for (const playerX of [CASTER_X + RETREAT_RANGE - 20, CASTER_X + PREFERRED_RANGE + 40]) {
        const fresh = new Gravecaller(scene as unknown as Phaser.Scene, CASTER_X, CASTER_Y);
        fresh.x = CASTER_X;
        fresh.y = CASTER_Y;

        const player = createPlayerAt(scene, playerX, CASTER_Y);
        fresh.update(player);
        fresh.update(player);

        expect(fresh.gravecallerState, `player @ ${playerX}`).toBe(
          GravecallerState.MAINTAIN_DISTANCE
        );
        expect(getBody(fresh).velocity.x, `player @ ${playerX}`).not.toBe(0);
      }
    });

    it('a hátrálás a chaseMinX peremén VÉGET ÉR — sarokba szorítva is tüzel', () => {
      // Ez a "ne legyen nehéz megközelíteni és karddal megölni" követelmény geometriai
      // fele: a platformon álló lénynek egyszerűen elfogy a hátraléphető tere. Ott viszont
      // ÁLL, tehát a cast kapuja kinyílik — nem válik ártalmatlan bábuvá.
      const cornered = new Gravecaller(
        scene as unknown as Phaser.Scene,
        CASTER_X,
        CASTER_Y,
        { chaseMinX: CASTER_X, chaseMaxX: CASTER_X + 200 }
      );
      cornered.x = CASTER_X;
      cornered.y = CASTER_Y;

      const player = createPlayerAt(scene, CASTER_X + RETREAT_RANGE - 20, CASTER_Y);
      cornered.update(player);
      cornered.update(player);

      expect(getBody(cornered).velocity.x).toBe(0);
      expect(cornered.gravecallerState).toBe(GravecallerState.CAST);
    });

    it('vízszintesen szinte egy vonalban lévő célnál nem pörög az irány', () => {
      engage(CASTER_X + DIRECTION_DEADZONE - 1);
      expect(getBody(caster).velocity.x).toBe(0);
    });
  });

  describe('ATTACK (CAST) -> REPOSITION', () => {
    function engageInBand(): Player {
      const player = createPlayerAt(
        scene,
        CASTER_X + (RETREAT_RANGE + PREFERRED_RANGE) / 2,
        CASTER_Y
      );
      caster.update(player); // PATROL -> MAINTAIN_DISTANCE
      caster.update(player); // MAINTAIN_DISTANCE -> CAST
      return player;
    }

    it('a sávban lévő playerre castol, és közben MEGÁLL', () => {
      engageInBand();
      expect(caster.gravecallerState).toBe(GravecallerState.CAST);
      expect(getBody(caster).velocity.x).toBe(0);
    });

    it('CAST_STARTUP_MS-nél emittálja a lövedéket, a helyes pozícióval és iránnyal', () => {
      const emitted: Array<[number, number, number]> = [];
      caster.on('gravecaller-projectile', (x: number, y: number, direction: number) => {
        emitted.push([x, y, direction]);
      });

      engageInBand();
      expect(emitted).toHaveLength(0); // a windup alatt még nincs lövedék

      createDelayedCallRunner(scene).run(CAST_STARTUP_MS);

      expect(emitted).toHaveLength(1);
      // A player jobbra van -> irány +1, a lövedék a testen kívül, mellmagasságban.
      expect(emitted[0]).toEqual([
        CASTER_X + PROJECTILE_SPAWN_OFFSET_X,
        CASTER_Y + PROJECTILE_SPAWN_OFFSET_Y,
        1,
      ]);
    });

    it('a bal oldali playerre balra lő', () => {
      const emitted: number[] = [];
      caster.on('gravecaller-projectile', (_x: number, _y: number, direction: number) => {
        emitted.push(direction);
      });

      const player = createPlayerAt(
        scene,
        CASTER_X - (RETREAT_RANGE + PREFERRED_RANGE) / 2,
        CASTER_Y
      );
      caster.update(player);
      caster.update(player);
      createDelayedCallRunner(scene).run(CAST_STARTUP_MS);

      expect(emitted).toEqual([-1]);
    });

    it('a kioldás után a kikövetkezés végén vált REPOSITION-be, majd vissza', () => {
      engageInBand();
      const runner = createDelayedCallRunner(scene);

      runner.run(CAST_STARTUP_MS);
      // A kikövetkezés alatt MÉG CAST: ez a punish-ablak második fele.
      expect(caster.gravecallerState).toBe(GravecallerState.CAST);

      runner.run(CAST_RECOVERY_MS);
      expect(caster.gravecallerState).toBe(GravecallerState.REPOSITION);

      runner.run(REPOSITION_MS);
      expect(caster.gravecallerState).toBe(GravecallerState.MAINTAIN_DISTANCE);
    });

    it('REPOSITION alatt MOZOG, de nem indít új castot', () => {
      const player = engageInBand();
      const runner = createDelayedCallRunner(scene);
      runner.run(CAST_STARTUP_MS);
      runner.run(CAST_RECOVERY_MS);
      expect(caster.gravecallerState).toBe(GravecallerState.REPOSITION);

      // Odalépünk hozzá: hátrálnia kell, de castolnia nem.
      player.x = CASTER_X + RETREAT_RANGE - 20;
      caster.update(player);

      expect(caster.gravecallerState).toBe(GravecallerState.REPOSITION);
      expect(getBody(caster).velocity.x).toBe(-RETREAT_SPEED);
    });

    it('a vertikálisan elérhetetlen playerre NEM castol, akkor sem, ha sebzés ébresztette', () => {
      // Egy alulról indított tűzgolyó felkelti (lásd fent), de a vízszintes lövedék úgysem
      // találná el — enélkül a végtelenségig lőné a levegőt.
      const emitted: unknown[] = [];
      caster.on('gravecaller-projectile', () => emitted.push(true));

      // A player VÍZSZINTESEN a preferált sávban van (tehát a lény áll, és a cast kapuja
      // emiatt nyitva lenne) — egyedül a magasságkülönbség tartja vissza.
      const player = createPlayerAt(
        scene,
        CASTER_X + (RETREAT_RANGE + PREFERRED_RANGE) / 2,
        CASTER_Y + VERTICAL_DETECTION_RANGE + 40
      );
      caster.takeDamage(1);
      expect(caster.gravecallerState).toBe(GravecallerState.MAINTAIN_DISTANCE);

      caster.update(player);
      caster.update(player);

      expect(getBody(caster).velocity.x).toBe(0); // áll, tehát nem a mozgás akadályozza
      expect(caster.gravecallerState).toBe(GravecallerState.MAINTAIN_DISTANCE);
      expect(emitted).toHaveLength(0);
    });

    it('a windup közben megölt Gravecaller már NEM lövi ki a lövedékét', () => {
      const emitted: unknown[] = [];
      caster.on('gravecaller-projectile', () => emitted.push(true));

      engageInBand();
      caster.takeDamage(MAX_HP);

      createDelayedCallRunner(scene).run(CAST_STARTUP_MS);
      expect(emitted).toHaveLength(0);
    });

    it('a windup közben MEGSEMMISÍTETT Gravecaller sem lő (resetEnemies)', () => {
      // A Level1Scene a player halálakor menet közben semmisíti meg az enemyket; a
      // destroy() override ezért állítja DEAD-re a state-et a super.destroy() ELŐTT
      // (CLAUDE.md 18. tanulság).
      const emitted: unknown[] = [];
      caster.on('gravecaller-projectile', () => emitted.push(true));

      engageInBand();
      caster.destroy();

      createDelayedCallRunner(scene).run(CAST_STARTUP_MS);
      expect(emitted).toHaveLength(0);
    });
  });

  describe('destroy', () => {
    it('DEAD-re állít és felszabadítja a debug HP-szöveget', () => {
      const texts = scene.add.text.mock.results.map((r) => r.value);
      caster.destroy();

      expect(caster.isDead()).toBe(true);
      expect(texts.some((t) => t.destroyed)).toBe(true);
      expect(scene.tweens.killTweensOf).toHaveBeenCalled();
    });
  });
});
