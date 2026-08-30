// Boss 3 (Ancient Demon, Omen of Crows) unit tesztek — Project_plan.md §23 "Unit testing /
// Boss" bontása szerint: HP, phase transition, attack state, death.
//
// Ugyanaz a harness, mint a boss.test.ts / madKing.test.ts esetében: VALÓDI (mock scene-nel
// létrehozott) Player példányokat adunk át a demon.update()-nek, hogy a találat-feloldás
// igazi getHP() csökkenést tudjon ellenőrizni.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

import AncientDemon, {
  ACTION_COOLDOWN_MS,
  ATTACK_ROTATION,
  BLINK_COOLDOWN_P1_MS,
  BLINK_COOLDOWN_P2_MS,
  BLINK_MIN_RANGE,
  BLINK_OFFSET,
  COMBO_DAMAGE,
  COMBO_TELEGRAPH_TINT,
  DemonState,
  HIT_FLASH_MS,
  MAX_HP,
  MOVE_SPEED_P1,
  MOVE_SPEED_P2,
  NOVA_CLEAR_HEIGHT,
  NOVA_DAMAGE,
  NOVA_HIT_RANGE,
  NOVA_MAX_RANGE,
  NOVA_TELEGRAPH_TINT,
  PHASE2_HP_RATIO,
  SLASH_RANGE,
  SUMMON_COUNT,
  type DemonArenaBounds,
} from '../../src/bosses/AncientDemon';
import {
  COMBO_STRIKE1_MS,
  COMBO_STRIKE2_MS,
  COMBO_TOTAL_MS,
  FEET_OFFSET_Y,
  HALF_WIDTH,
  NOVA_IMPACT_MS,
  NOVA_TOTAL_MS,
  PLAYER_FEET_OFFSET_Y,
  SUMMON_RELEASE_MS,
  SUMMON_TOTAL_MS,
} from '../../src/bosses/AncientDemonAnimations';
import Player, {
  MAX_HP as PLAYER_MAX_HP,
  MOVE_SPEED,
  JUMP_VELOCITY,
} from '../../src/player/Player';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../../src/player/PlayerAnimations';
import { ATTACK_CONFIGS, AttackType } from '../../src/combat/Attack';
import { GRAVITY_Y } from '../../src/config/physics';
import {
  createMockScene,
  createDelayedCallRunner,
  flushLastTween,
  getBody,
  type MockScene,
} from './helpers/phaserTestUtils';

const DEMON_X = 400;
const DEMON_Y = 317; // GROUND_TOP (369) - FEET_OFFSET_Y (52)
const BOUNDS: DemonArenaBounds = { minX: 60, maxX: 740 };

/** Sebzés, ami pontosan a Phase 2 küszöbre viszi a démont. */
const DAMAGE_TO_PHASE2 = MAX_HP * PHASE2_HP_RATIO;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

describe('AncientDemon (Boss 3)', () => {
  let scene: MockScene;
  let demon: AncientDemon;

  beforeEach(() => {
    scene = createMockScene();
    demon = new AncientDemon(scene as unknown as Phaser.Scene, DEMON_X, DEMON_Y, BOUNDS);
    demon.activate(); // a scene a belépő végén hívja; enélkül DORMANT marad
  });

  /**
   * A démon a közelharci sávban ELŐBB novát dob (a rotáció megelőzi a reaktív kombót — lásd
   * az updateFloat() kommentjét), ezért a kombó vizsgálatához a novát előbb le kell futtatni.
   * Ez a helper visszaviszi a démont FLOAT-ba, elhasznált nova-cooldownnal.
   */
  function consumeNova(runner: ReturnType<typeof createDelayedCallRunner>, player: Player): void {
    const originalX = player.x;

    demon.update(player);
    expect(demon.demonState).toBe(DemonState.NOVA);

    // A becsapódás pillanatára KIVISSZÜK a playert a hullám sávjából, majd visszatesszük.
    // Enélkül a nova elvinne NOVA_DAMAGE-t, és a kombó-tesztek nem teli HP-ról indulnának —
    // pont az a hibaforrás, amit ez a helper el akar tüntetni.
    player.x = DEMON_X - 1000;
    runner.run(NOVA_IMPACT_MS);
    player.x = originalX;

    runner.run(NOVA_TOTAL_MS);
    runner.run(ACTION_COOLDOWN_MS);
    expect(demon.demonState).toBe(DemonState.FLOAT);
    expect(player.getHP()).toBe(PLAYER_MAX_HP);
  }

  describe('HP és halál', () => {
    it('teli HP-val és DORMANT állapotban indul', () => {
      const fresh = new AncientDemon(scene as unknown as Phaser.Scene, DEMON_X, DEMON_Y, BOUNDS);

      expect(fresh.getHP()).toBe(MAX_HP);
      expect(fresh.getMaxHP()).toBe(MAX_HP);
      expect(fresh.demonState).toBe(DemonState.DORMANT);
      expect(fresh.getPhase()).toBe(1);
    });

    it('DORMANT alatt SEBEZHETETLEN — a dialógus és a belépő nem harc', () => {
      const dormant = new AncientDemon(scene as unknown as Phaser.Scene, DEMON_X, DEMON_Y, BOUNDS);

      dormant.takeDamage(50);

      expect(dormant.getHP()).toBe(MAX_HP);
      expect(dormant.isVulnerable()).toBe(false);
    });

    it('a sebzés csökkenti a HP-t, és nem megy nulla alá', () => {
      demon.takeDamage(40);
      expect(demon.getHP()).toBe(MAX_HP - 40);

      demon.takeDamage(MAX_HP * 2);
      expect(demon.getHP()).toBe(0);
    });

    it('nulla HP-nál meghal, letiltja a bodyt és megáll', () => {
      demon.takeDamage(MAX_HP);

      expect(demon.isDead()).toBe(true);
      expect(demon.demonState).toBe(DemonState.DEAD);
      expect(getBody(demon).enable).toBe(false);
      expect(getBody(demon).velocity.x).toBe(0);
    });

    it('halálkor eventet emittál (a scene ebből ütemezi a győzelmet)', () => {
      const onDeath = vi.fn();
      demon.on('demon-death', onDeath);

      demon.takeDamage(MAX_HP);

      expect(onDeath).toHaveBeenCalledTimes(1);
    });

    it('villanás KÖZBEN megölve is teljes alfával foszlik szét — a halált látni kell', () => {
      const player = createPlayerAt(scene, DEMON_X - (BLINK_MIN_RANGE + 60), DEMON_Y);
      demon.update(player);
      expect(demon.demonState).toBe(DemonState.BLINK_OUT);

      demon.alpha = 0.2; // a tween félúton jár
      // A blink alatt sebezhetetlen, tehát a HP-t közvetlenül nullázzuk (ahogy a scene
      // sosem tenné) — itt a die() alfa-visszaállítását vizsgáljuk.
      demon.demonState = DemonState.FLOAT;
      demon.takeDamage(MAX_HP);

      expect(demon.isDead()).toBe(true);
      expect(demon.alpha).toBe(1);
    });

    it('a halott démon már nem sebezhető tovább', () => {
      demon.takeDamage(MAX_HP);
      const onDeath = vi.fn();
      demon.on('demon-death', onDeath);

      demon.takeDamage(10);

      expect(onDeath).not.toHaveBeenCalled();
    });
  });

  describe('Fázisváltás', () => {
    it('50% HP-nál Phase 2-be vált és eventet emittál', () => {
      const onPhase = vi.fn();
      demon.on('demon-phase-change', onPhase);

      demon.takeDamage(DAMAGE_TO_PHASE2 - 1);
      expect(demon.getPhase()).toBe(1);
      expect(onPhase).not.toHaveBeenCalled();

      demon.takeDamage(1);
      expect(demon.getPhase()).toBe(2);
      expect(onPhase).toHaveBeenCalledWith(2);
    });

    it('a fázisváltás PONTOSAN EGYSZER fut le', () => {
      const onPhase = vi.fn();
      demon.on('demon-phase-change', onPhase);

      demon.takeDamage(DAMAGE_TO_PHASE2);
      demon.takeDamage(10);

      expect(onPhase).toHaveBeenCalledTimes(1);
    });

    it('Phase 2-ben gyorsabban sodródik', () => {
      expect(MOVE_SPEED_P2).toBeGreaterThan(MOVE_SPEED_P1);

      // Olyan messze, hogy semmilyen rotációs támadás ne induljon: a nova hatótávon kívül,
      // a villanást pedig elhasználjuk.
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - (BLINK_MIN_RANGE + 200), DEMON_Y);

      demon.update(player); // BLINK indul
      flushLastTween(scene); // -> BLINK_IN
      flushLastTween(scene); // -> COOLDOWN
      runner.run(ACTION_COOLDOWN_MS); // -> FLOAT

      // A villanás után a démon a player mellett van, tehát a sodródáshoz újra el kell
      // távolodnia. A sebességet közvetlenül a fázisonkénti konstansokból ellenőrizzük.
      demon.takeDamage(DAMAGE_TO_PHASE2);
      expect(demon.getPhase()).toBe(2);
    });

    it('a fázisváltás a rotációt az IDÉZÉS slotjára állítja — a fázis a szignatúrájával nyit', () => {
      const runner = createDelayedCallRunner(scene);
      // Közel: a nova is elérhető lenne, de a rotáció az idézésre van állítva.
      const player = createPlayerAt(scene, DEMON_X - 60, DEMON_Y);

      demon.takeDamage(DAMAGE_TO_PHASE2);
      demon.update(player);

      expect(ATTACK_ROTATION.indexOf('SUMMON')).toBeGreaterThanOrEqual(0);
      expect(demon.demonState).toBe(DemonState.SUMMON);

      runner.run(SUMMON_RELEASE_MS);
      runner.run(SUMMON_TOTAL_MS);
      expect(demon.demonState).toBe(DemonState.COOLDOWN);
    });

    it('Phase 2-ben rövidebb a villanás cooldownja', () => {
      expect(BLINK_COOLDOWN_P2_MS).toBeLessThan(BLINK_COOLDOWN_P1_MS);
    });
  });

  describe('Kaszakombó (reaktív, mindkét fázisban)', () => {
    it('a rotáció MEGELŐZI a reaktív kombót — enélkül a nova sosem sülne el', () => {
      // A nova találati sávja (90) PONTOSAN a kombó hatótávja, tehát ha a kombó előzne,
      // a nova soha nem sülne el ott, ahol egyáltalán találhat. Ez a döntés regressziós
      // tesztje: közelharci távolságon belül is a NOVA indul először.
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);

      demon.update(player);

      expect(demon.demonState).toBe(DemonState.NOVA);
    });

    it('kimerült rotáció mellett közelharci távolságon belül kombózik', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);

      consumeNova(runner, player);
      demon.update(player);

      expect(demon.demonState).toBe(DemonState.COMBO);
      expect(getBody(demon).velocity.x).toBe(0);
    });

    it('MINDKÉT csapás sebez, ha a player a hatótávon belül marad', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);

      consumeNova(runner, player);
      demon.update(player);

      runner.run(COMBO_STRIKE1_MS);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - COMBO_DAMAGE);

      runner.run(COMBO_STRIKE2_MS);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - COMBO_DAMAGE * 2);
    });

    it('a kihátrált player a MÁSODIK csapást már nem kapja meg', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);

      consumeNova(runner, player);
      demon.update(player);

      runner.run(COMBO_STRIKE1_MS);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - COMBO_DAMAGE);

      player.x = DEMON_X - (SLASH_RANGE + 200);
      runner.run(COMBO_STRIKE2_MS);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - COMBO_DAMAGE);
    });

    it('a csapás pillanatában eventet emittál (a hangot a scene játssza le)', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);
      const onSlash = vi.fn();
      demon.on('demon-slash', onSlash);

      consumeNova(runner, player);
      demon.update(player);

      expect(onSlash).not.toHaveBeenCalled();
      runner.run(COMBO_STRIKE1_MS);
      expect(onSlash).toHaveBeenCalledTimes(1);
      runner.run(COMBO_STRIKE2_MS);
      expect(onSlash).toHaveBeenCalledTimes(2);
    });

    it('a kombó végén COOLDOWN-ba, majd FLOAT-ba tér vissza', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);

      consumeNova(runner, player);
      demon.update(player);

      runner.run(COMBO_STRIKE1_MS);
      runner.run(COMBO_STRIKE2_MS);
      runner.run(COMBO_TOTAL_MS);
      expect(demon.demonState).toBe(DemonState.COOLDOWN);

      runner.run(ACTION_COOLDOWN_MS);
      expect(demon.demonState).toBe(DemonState.FLOAT);
    });

    it('a windup alatt megölt démon NEM sebez és nem ad hangot', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);
      const onSlash = vi.fn();

      consumeNova(runner, player);
      demon.update(player);
      demon.on('demon-slash', onSlash);

      demon.takeDamage(MAX_HP);
      runner.run(COMBO_STRIKE1_MS);

      expect(onSlash).not.toHaveBeenCalled();
      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });
  });

  describe('Árny-hullám (nova)', () => {
    it('a rotáció elején áll, és a hatótávon belüli playerre indul', () => {
      const player = createPlayerAt(scene, DEMON_X - (NOVA_MAX_RANGE - 10), DEMON_Y);

      demon.update(player);

      expect(demon.demonState).toBe(DemonState.NOVA);
      expect(getBody(demon).velocity.x).toBe(0);
    });

    it('a hatótávon KÍVÜL nem indul el — nem pazarolja el vakon', () => {
      // A blinket is kizárjuk (a távolság a BLINK_MIN_RANGE alatt van), tehát a démon
      // egyszerűen sodródik.
      const between = (NOVA_MAX_RANGE + BLINK_MIN_RANGE) / 2;
      const player = createPlayerAt(scene, DEMON_X - between, DEMON_Y);

      demon.update(player);

      expect(demon.demonState).toBe(DemonState.FLOAT);
      expect(getBody(demon).velocity.x).toBe(-MOVE_SPEED_P1);
    });

    it('a TALAJON álló playert eltalálja a hullám sávján belül', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - (NOVA_HIT_RANGE - 10), DEMON_Y);

      demon.update(player);
      runner.run(NOVA_IMPACT_MS);

      expect(player.getHP()).toBe(PLAYER_MAX_HP - NOVA_DAMAGE);
    });

    it('a hullám sávján KÍVÜL álló playert nem éri el', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - (NOVA_HIT_RANGE - 10), DEMON_Y);

      demon.update(player);
      player.x = DEMON_X - (NOVA_HIT_RANGE + 10);
      runner.run(NOVA_IMPACT_MS);

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });

    it('a hullám FÖLÉ UGRÓ player kimarad belőle — ez a támadás ellenszere', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 20, DEMON_Y);

      demon.update(player);

      // A player talpa PONTOSAN a hullám teteje fölé kerül.
      const demonFeetY = DEMON_Y + FEET_OFFSET_Y;
      player.y = demonFeetY - NOVA_CLEAR_HEIGHT - PLAYER_FEET_OFFSET_Y - 1;

      runner.run(NOVA_IMPACT_MS);

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });

    it('a nem elég magasra ugró playert ELTALÁLJA', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 20, DEMON_Y);

      demon.update(player);

      const demonFeetY = DEMON_Y + FEET_OFFSET_Y;
      // Egy pixellel a hullám teteje ALATT.
      player.y = demonFeetY - NOVA_CLEAR_HEIGHT - PLAYER_FEET_OFFSET_Y + 1;

      runner.run(NOVA_IMPACT_MS);

      expect(player.getHP()).toBe(PLAYER_MAX_HP - NOVA_DAMAGE);
    });

    it('a becsapódáskor eventet emittál a TALAJ magasságával (a scene ebből rak hangot/rázást)', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 20, DEMON_Y);
      const onImpact = vi.fn();
      demon.on('demon-nova-impact', onImpact);

      demon.update(player);
      expect(onImpact).not.toHaveBeenCalled();

      runner.run(NOVA_IMPACT_MS);

      expect(onImpact).toHaveBeenCalledWith(DEMON_X, DEMON_Y + FEET_OFFSET_Y);
    });
  });

  describe('Villanás (blink)', () => {
    it('messzire került playerre villan, nem sétál utána', () => {
      const player = createPlayerAt(scene, DEMON_X - (BLINK_MIN_RANGE + 60), DEMON_Y);

      demon.update(player);

      expect(demon.demonState).toBe(DemonState.BLINK_OUT);
      expect(getBody(demon).velocity.x).toBe(0);
    });

    it('a villanás alatt SEBEZHETETLEN — a teleport nem ingyen punish-ablak', () => {
      const player = createPlayerAt(scene, DEMON_X - (BLINK_MIN_RANGE + 60), DEMON_Y);

      demon.update(player);
      expect(demon.isVulnerable()).toBe(false);
      demon.takeDamage(50);
      expect(demon.getHP()).toBe(MAX_HP);

      flushLastTween(scene); // -> BLINK_IN
      expect(demon.demonState).toBe(DemonState.BLINK_IN);
      expect(demon.isVulnerable()).toBe(false);
      demon.takeDamage(50);
      expect(demon.getHP()).toBe(MAX_HP);
    });

    it('a player mellé érkezik, a NAGYOBB szabad tér felőli oldalra', () => {
      // A player az aréna BAL felén -> a démon a JOBB oldalára érkezik.
      const player = createPlayerAt(scene, 120, DEMON_Y);

      demon.update(player);
      flushLastTween(scene);

      expect(demon.x).toBe(120 + BLINK_OFFSET);
    });

    it('az aréna JOBB felén álló player BAL oldalára érkezik', () => {
      const demonLeft = new AncientDemon(scene as unknown as Phaser.Scene, 120, DEMON_Y, BOUNDS);
      demonLeft.activate();
      const player = createPlayerAt(scene, 700, DEMON_Y);

      demonLeft.update(player);
      flushLastTween(scene);

      expect(demonLeft.x).toBe(700 - BLINK_OFFSET);
    });

    it('a cél az aréna határaira CLAMPELŐDIK — sosem teleportál a képen kívülre', () => {
      const player = createPlayerAt(scene, BOUNDS.maxX, DEMON_Y);
      const demonFar = new AncientDemon(
        scene as unknown as Phaser.Scene,
        BOUNDS.minX,
        DEMON_Y,
        BOUNDS
      );
      demonFar.activate();

      demonFar.update(player);
      flushLastTween(scene);

      expect(demonFar.x).toBeGreaterThanOrEqual(BOUNDS.minX);
      expect(demonFar.x).toBeLessThanOrEqual(BOUNDS.maxX);
    });

    it('az érkezés után COOLDOWN, majd FLOAT', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - (BLINK_MIN_RANGE + 60), DEMON_Y);

      demon.update(player);
      flushLastTween(scene); // -> BLINK_IN
      flushLastTween(scene); // az alpha-visszatérés vége -> COOLDOWN
      expect(demon.demonState).toBe(DemonState.COOLDOWN);

      runner.run(ACTION_COOLDOWN_MS);
      expect(demon.demonState).toBe(DemonState.FLOAT);
      expect(demon.isVulnerable()).toBe(true);
    });

    it('a BLINK_MIN_RANGE-en belül nem villan', () => {
      const player = createPlayerAt(scene, DEMON_X - (BLINK_MIN_RANGE - 20), DEMON_Y);

      demon.update(player);

      expect(demon.demonState).toBe(DemonState.FLOAT);
    });
  });

  describe('Idézés (CSAK Phase 2)', () => {
    it('Phase 1-ben NEM idéz', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);

      consumeNova(runner, player);
      demon.update(player);

      // A rotációban az idézés következne, de a fázis-szűrő kizárja -> reaktív kombó.
      expect(demon.demonState).toBe(DemonState.COMBO);
    });

    it('Phase 2-ben a spawn-pontokkal eventet emittál (a lidérceket a scene hozza létre)', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 60, DEMON_Y);
      const onSummon = vi.fn((_points: Array<{ x: number; y: number }>) => undefined);
      demon.on('demon-summon', onSummon);

      demon.takeDamage(DAMAGE_TO_PHASE2);
      demon.update(player);
      expect(demon.demonState).toBe(DemonState.SUMMON);
      expect(onSummon).not.toHaveBeenCalled();

      runner.run(SUMMON_RELEASE_MS);

      expect(onSummon).toHaveBeenCalledTimes(1);
      const points = onSummon.mock.calls[0][0];
      expect(points).toHaveLength(SUMMON_COUNT);
      // Egy balra, egy jobbra a démontól, a testén KÍVÜL.
      expect(points[0].x).toBeLessThan(DEMON_X - HALF_WIDTH);
      expect(points[1].x).toBeGreaterThan(DEMON_X + HALF_WIDTH);
      // A démon középpontja FÖLÖTT: a lidérc lebeg, nem a padlóról kel fel.
      for (const point of points) expect(point.y).toBeLessThan(DEMON_Y);
    });

    it('a windup alatt megölt démon NEM idéz', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 60, DEMON_Y);
      const onSummon = vi.fn();

      demon.takeDamage(DAMAGE_TO_PHASE2);
      demon.update(player);
      demon.on('demon-summon', onSummon);

      demon.takeDamage(MAX_HP);
      runner.run(SUMMON_RELEASE_MS);

      expect(onSummon).not.toHaveBeenCalled();
    });
  });

  describe('Telegraph-tintek', () => {
    it('a kombó és a nova telegraph-ja KÜLÖNBÖZIK — a windupjuk ugyanaz a mozdulat', () => {
      expect(COMBO_TELEGRAPH_TINT).not.toBe(NOVA_TELEGRAPH_TINT);
    });

    it('a hit-villanás NEM törli a futó telegraph-ot', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);

      demon.update(player); // NOVA indul -> ibolya telegraph
      expect(demon.demonState).toBe(DemonState.NOVA);

      demon.takeDamage(10); // fehér FILL villanás
      runner.run(HIT_FLASH_MS); // a villanás vége visszaállítja az ÁLLAPOTHOZ tartozó tintet

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((demon as any).tintColor).toBe(NOVA_TELEGRAPH_TINT);
    });

    it('a telegraph a kombó MÁSODIK csapásánál tűnik el, nem az elsőnél', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, DEMON_X - 40, DEMON_Y);

      consumeNova(runner, player);
      demon.update(player);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((demon as any).tintColor).toBe(COMBO_TELEGRAPH_TINT);

      runner.run(COMBO_STRIKE1_MS);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((demon as any).tintColor).toBe(COMBO_TELEGRAPH_TINT);

      runner.run(COMBO_STRIKE2_MS);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((demon as any).tintColor).toBeNull();
    });
  });

  describe('Fairness-invariánsok (MÉRT levezetések)', () => {
    /** Meddig tart a playernek `height` px-re felugrani? h = v*t - g*t^2/2 megoldása. */
    const timeToRiseMs = (height: number): number => {
      const v = Math.abs(JUMP_VELOCITY);
      const discriminant = v * v - 2 * GRAVITY_Y * height;
      expect(discriminant).toBeGreaterThan(0); // különben nem is ugorható meg
      return ((v - Math.sqrt(discriminant)) / GRAVITY_Y) * 1000;
    };

    /** Emberi reakcióidő, amit minden telegraph-nak el kell bírnia. */
    const REACTION_MS = 250;

    it('a kombó windupja elég a HÁTRALÉPÉSHEZ is, nem csak az ugráshoz', () => {
      // Pontblank: a két test félszélessége. Ennyiről kell SLASH_RANGE + 10-re jutni.
      const pointBlank = HALF_WIDTH + PLAYER_BODY_WIDTH / 2;
      const needed = SLASH_RANGE + 10 - pointBlank;
      const retreatMs = (needed / MOVE_SPEED) * 1000;

      expect(COMBO_STRIKE1_MS).toBeGreaterThanOrEqual(retreatMs + REACTION_MS);
    });

    it('a kombó windupja elég az UGRÁSHOZ is', () => {
      const pointBlank = HALF_WIDTH + PLAYER_BODY_WIDTH / 2;
      // Az ugrás akkor visz ki, ha a 2D távolság meghaladja a hatótávot.
      const neededRise = Math.sqrt((SLASH_RANGE + 10) ** 2 - pointBlank ** 2);
      // A démon középpontja eleve magasabban van a playerénél; ez a különbség ingyen van.
      const freeGap = FEET_OFFSET_Y - PLAYER_FEET_OFFSET_Y;

      expect(COMBO_STRIKE1_MS).toBeGreaterThanOrEqual(
        timeToRiseMs(Math.max(0, neededRise - freeGap)) + REACTION_MS
      );
    });

    it('a nova telegraph-ja elég a hullám FÖLÉ ugráshoz', () => {
      expect(NOVA_IMPACT_MS).toBeGreaterThanOrEqual(timeToRiseMs(NOVA_CLEAR_HEIGHT) + REACTION_MS);
    });

    it('a hullám átugorható: a szükséges magasság a player ugrás-plafonja ALATT van', () => {
      const maxJumpHeight = JUMP_VELOCITY ** 2 / (2 * GRAVITY_Y);
      expect(NOVA_CLEAR_HEIGHT).toBeLessThan(maxJumpHeight);
    });

    it('a démon hatótáv-előnye a projekt LEGKISEBBJE — a player is eléri közelharcban', () => {
      const config = ATTACK_CONFIGS[AttackType.SWORD];
      const playerReach = config.hitboxOffsetX + config.hitboxWidth / 2;
      // Ennyiről tudja a player eltalálni a démont (a saját középpontjától mérve).
      const playerStrikeDistance = playerReach + HALF_WIDTH;

      expect(playerStrikeDistance).toBeLessThan(SLASH_RANGE);
      // De az előny minimális: a fight közelharcban is vívható.
      expect(SLASH_RANGE - playerStrikeDistance).toBeLessThan(30);
    });

    it('a nova találati sávja PONTOSAN a közelharci sáv — a levegő az egyetlen menedék', () => {
      expect(NOVA_HIT_RANGE).toBe(SLASH_RANGE);
    });

    it('a player túlél legalább négy teljes kombót', () => {
      expect(PLAYER_MAX_HP / (COMBO_DAMAGE * 2)).toBeGreaterThanOrEqual(4);
    });
  });
});
