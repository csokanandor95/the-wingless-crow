// Boss 2 (The Mad King) unit tesztek — Project_plan.md §23 "Unit testing / Boss" bontása
// szerint: HP, phase transition, attack state, death.
//
// Ugyanaz a harness, mint a boss.test.ts-ben: VALÓDI (mock scene-nel létrehozott) Player
// példányokat adunk át a king.update()-nek, hogy a találat-feloldás igazi getHP() csökkenést
// tudjon ellenőrizni.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

import MadKing, {
  KingState,
  MAX_HP,
  PHASE2_HP_RATIO,
  MOVE_SPEED_P1,
  MOVE_SPEED_P2,
  SLASH_RANGE,
  SLASH_DAMAGE,
  SLASH_STARTUP_MS,
  LEAP_MIN_RANGE,
  LEAP_COOLDOWN_MS,
  LEAP_MAX_SPEED_X,
  SLAM_DAMAGE,
  SLAM_HIT_HALF_WIDTH,
  LUNGE_MIN_RANGE,
  LUNGE_SPEED,
  LUNGE_DAMAGE,
  LUNGE_MAX_MS,
  LUNGE_COOLDOWN_MS,
  ACTION_COOLDOWN_MS,
  ATTACK_ROTATION,
} from '../../src/bosses/MadKing';
import {
  LEAP_AIRTIME_MS,
  LEAP_VELOCITY_Y,
  LEAP_WINDUP_MS,
  LUNGE_WINDUP_MS,
} from '../../src/bosses/MadKingAnimations';
import Player, { MAX_HP as PLAYER_MAX_HP } from '../../src/player/Player';
import {
  createMockScene,
  getBody,
  createDelayedCallRunner,
  type MockScene,
} from './helpers/phaserTestUtils';

const KING_X = 400;
const KING_Y = 315;

/** Sebzés, ami pontosan a Phase 2 küszöbre viszi a királyt. */
const DAMAGE_TO_PHASE2 = MAX_HP * PHASE2_HP_RATIO;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

describe('MadKing (Boss 2)', () => {
  let scene: MockScene;
  let king: MadKing;

  beforeEach(() => {
    scene = createMockScene();
    king = new MadKing(scene as unknown as Phaser.Scene, KING_X, KING_Y);
    king.activate(); // a scene a belépő végén hívja; enélkül DORMANT marad
  });

  describe('HP és halál', () => {
    it('teli HP-val és DORMANT állapotban indul', () => {
      const fresh = new MadKing(scene as unknown as Phaser.Scene, KING_X, KING_Y);

      expect(fresh.getHP()).toBe(MAX_HP);
      expect(fresh.getMaxHP()).toBe(MAX_HP);
      expect(fresh.kingState).toBe(KingState.DORMANT);
      expect(fresh.getPhase()).toBe(1);
    });

    it('DORMANT alatt SEBEZHETETLEN — a dialógus és a belépő nem harc', () => {
      const dormant = new MadKing(scene as unknown as Phaser.Scene, KING_X, KING_Y);

      dormant.takeDamage(50);

      expect(dormant.getHP()).toBe(MAX_HP);
    });

    it('a sebzés csökkenti a HP-t, és nem megy nulla alá', () => {
      king.takeDamage(40);
      expect(king.getHP()).toBe(MAX_HP - 40);

      king.takeDamage(MAX_HP * 2);
      expect(king.getHP()).toBe(0);
    });

    it('nulla HP-nál meghal, letiltja a bodyt és megáll', () => {
      king.takeDamage(MAX_HP);

      expect(king.isDead()).toBe(true);
      expect(king.kingState).toBe(KingState.DEAD);
      expect(getBody(king).enable).toBe(false);
      expect(getBody(king).velocity.x).toBe(0);
    });

    it('halálkor eventet emittál (a scene ebből ütemezi a győzelmet)', () => {
      const onDeath = vi.fn();
      king.on('king-death', onDeath);

      king.takeDamage(MAX_HP);

      expect(onDeath).toHaveBeenCalledTimes(1);
    });

    it('a halott király már nem sebezhető tovább', () => {
      king.takeDamage(MAX_HP);
      const onDeath = vi.fn();
      king.on('king-death', onDeath);

      king.takeDamage(10);

      expect(onDeath).not.toHaveBeenCalled();
    });
  });

  describe('Fázisváltás', () => {
    it('50% HP-nál Phase 2-be vált és eventet emittál', () => {
      const onPhase = vi.fn();
      king.on('king-phase-change', onPhase);

      king.takeDamage(DAMAGE_TO_PHASE2 - 1);
      expect(king.getPhase()).toBe(1);
      expect(onPhase).not.toHaveBeenCalled();

      king.takeDamage(1);
      expect(king.getPhase()).toBe(2);
      expect(onPhase).toHaveBeenCalledWith(2);
    });

    it('a fázisváltás PONTOSAN EGYSZER fut le', () => {
      const onPhase = vi.fn();
      king.on('king-phase-change', onPhase);

      king.takeDamage(DAMAGE_TO_PHASE2);
      king.takeDamage(10);

      expect(onPhase).toHaveBeenCalledTimes(1);
    });

    it('Phase 2-ben gyorsabban közelít', () => {
      // Olyan messze, hogy egyik rotációs támadás se induljon (a leap cooldownját elhasználjuk).
      const player = createPlayerAt(scene, KING_X - 600, KING_Y);

      king.update(player);
      const phase1Speed = Math.abs(getBody(king).velocity.x);

      // A leap elindult; visszük Phase 2-be, majd megnézzük a sétáját.
      king.takeDamage(DAMAGE_TO_PHASE2);
      expect(king.getPhase()).toBe(2);
      expect(phase1Speed === MOVE_SPEED_P1 || phase1Speed === 0).toBe(true);
      expect(MOVE_SPEED_P2).toBeGreaterThan(MOVE_SPEED_P1);
    });

    it('a fázisváltás a rotációt a KITÖRÉS slotjára állítja — a fázis a szignatúrájával nyit', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - (LUNGE_MIN_RANGE + 60), KING_Y);

      king.takeDamage(DAMAGE_TO_PHASE2);
      king.update(player);

      expect(ATTACK_ROTATION.indexOf('LUNGE')).toBeGreaterThanOrEqual(0);
      expect(king.kingState).toBe(KingState.LUNGE_WINDUP);

      runner.run(LUNGE_WINDUP_MS);
      expect(king.kingState).toBe(KingState.LUNGE);
    });
  });

  describe('Kardcsapás (reaktív, mindkét fázisban)', () => {
    it('közelharci távolságon belül azonnal csap, és megáll', () => {
      const player = createPlayerAt(scene, KING_X - (SLASH_RANGE - 20), KING_Y);

      king.update(player);

      expect(king.kingState).toBe(KingState.SLASH);
      expect(getBody(king).velocity.x).toBe(0);
    });

    it('a sebzés a CSAPÁS pillanatában oldódik fel, nem a támadás elején', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - (SLASH_RANGE - 20), KING_Y);

      king.update(player);
      expect(player.getHP()).toBe(PLAYER_MAX_HP);

      runner.run(SLASH_STARTUP_MS);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - SLASH_DAMAGE);
    });

    it('a csapás pillanatában eventet emittál (a hangot a scene játssza le)', () => {
      const runner = createDelayedCallRunner(scene);
      const onSlash = vi.fn();
      king.on('king-slash', onSlash);
      const player = createPlayerAt(scene, KING_X - (SLASH_RANGE - 20), KING_Y);

      king.update(player);
      expect(onSlash).not.toHaveBeenCalled();

      runner.run(SLASH_STARTUP_MS);
      expect(onSlash).toHaveBeenCalledTimes(1);
    });

    it('a hatótávon KÍVÜLRE kilépő playert nem találja el', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - (SLASH_RANGE - 20), KING_Y);

      king.update(player);
      player.x = KING_X - (SLASH_RANGE + 200); // a windup alatt elszalad
      runner.run(SLASH_STARTUP_MS);

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });

    it('a csapás után COOLDOWN-ba lép, majd visszatér APPROACH-ba', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - (SLASH_RANGE - 20), KING_Y);

      king.update(player);
      runner.run(SLASH_STARTUP_MS);
      expect(king.kingState).toBe(KingState.COOLDOWN);

      runner.run(ACTION_COOLDOWN_MS);
      expect(king.kingState).toBe(KingState.APPROACH);
    });

    it('a windup alatt megölt király már nem sebez', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - (SLASH_RANGE - 20), KING_Y);

      king.update(player);
      king.takeDamage(MAX_HP);
      runner.run(SLASH_STARTUP_MS);

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });
  });

  describe('Ugró becsapódás (a Phase 1 gap-closere)', () => {
    /** A slash hatótávján kívül, de a leap küszöbén túl. */
    const leapDistance = LEAP_MIN_RANGE + 60;

    it('a közelharci sávon kívül ugrik — a Phase 1 nem esik szét sétálásba', () => {
      const player = createPlayerAt(scene, KING_X - leapDistance, KING_Y);

      king.update(player);

      expect(king.kingState).toBe(KingState.LEAP_WINDUP);
      expect(getBody(king).velocity.x).toBe(0);
    });

    it('a LEAP_MIN_RANGE a SLASH_RANGE fölött van — különben lenne "holt sáv"', () => {
      expect(LEAP_MIN_RANGE).toBeGreaterThan(SLASH_RANGE);
    });

    it('a windup végén elrugaszkodik: felfelé induló sebesség + LEAP_AIR', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - leapDistance, KING_Y);

      king.update(player);
      runner.run(LEAP_WINDUP_MS);

      expect(king.kingState).toBe(KingState.LEAP_AIR);
      expect(getBody(king).velocity.y).toBeCloseTo(-LEAP_VELOCITY_Y, 5);
    });

    it('a vízszintes sebesség a repülési időből SZÁRMAZIK, hogy a célra érkezzen', () => {
      const runner = createDelayedCallRunner(scene);
      const travel = -leapDistance;
      const player = createPlayerAt(scene, KING_X + travel, KING_Y);

      king.update(player);
      runner.run(LEAP_WINDUP_MS);

      const expected = travel / (LEAP_AIRTIME_MS / 1000);
      expect(getBody(king).velocity.x).toBeCloseTo(expected, 5);
      // A becsapódás helye = start + vx * repülési idő, tehát a player akkori X-e.
      const landing = KING_X + getBody(king).velocity.x * (LEAP_AIRTIME_MS / 1000);
      expect(landing).toBeCloseTo(player.x, 5);
    });

    it('a vízszintes sebességet a LEAP_MAX_SPEED_X korlátozza', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - 5000, KING_Y);

      king.update(player);
      runner.run(LEAP_WINDUP_MS);

      expect(getBody(king).velocity.x).toBe(-LEAP_MAX_SPEED_X);
    });

    it('a cél a FELUGRÁSKOR rögzül — a windup alatt kilépve a becsapódás kikerülhető', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - leapDistance, KING_Y);

      king.update(player);
      runner.run(LEAP_WINDUP_MS); // itt rögzül a cél a player AKKORI x-én

      // A player oldalra lép, majd a király földet ér ott, ahova indult.
      const landingX = KING_X + getBody(king).velocity.x * (LEAP_AIRTIME_MS / 1000);
      king.x = landingX;
      player.x = landingX - (SLAM_HIT_HALF_WIDTH + 10);

      getBody(king).blocked.down = true;
      king.update(player);

      // A LEAP_SLAM állapot ÁTMENETI: a resolveSlam() ugyanabban a hívásban cooldownba lép,
      // a becsapódás PÓZÁT pedig a COOLDOWN -> lastAction leképezés tartja a képen (lásd
      // madKingAnimations.test.ts). Itt az számít, hogy a kitérés MŰKÖDÖTT.
      expect(king.kingState).toBe(KingState.COOLDOWN);
      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });

    it('a becsapódás a sávon BELÜL maradó playert eltalálja', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - leapDistance, KING_Y);

      king.update(player);
      runner.run(LEAP_WINDUP_MS);

      king.x = player.x;
      getBody(king).blocked.down = true;
      king.update(player);

      expect(player.getHP()).toBe(PLAYER_MAX_HP - SLAM_DAMAGE);
    });

    it('a becsapódás eventet emittál (hang + camera shake a scene-ben)', () => {
      const runner = createDelayedCallRunner(scene);
      const onSlam = vi.fn();
      king.on('king-slam', onSlam);
      const player = createPlayerAt(scene, KING_X - leapDistance, KING_Y);

      king.update(player);
      runner.run(LEAP_WINDUP_MS);
      expect(onSlam).not.toHaveBeenCalled();

      getBody(king).blocked.down = true;
      king.update(player);
      expect(onSlam).toHaveBeenCalledTimes(1);
    });

    it('a REPÜLÉS alatt NEM nullázza a vízszintes sebességet', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - leapDistance, KING_Y);

      king.update(player);
      runner.run(LEAP_WINDUP_MS);
      const airborneSpeed = getBody(king).velocity.x;

      // Levegőben (blocked.down false) egy update() nem szólhat bele a ballisztikába.
      king.update(player);

      expect(getBody(king).velocity.x).toBe(airborneSpeed);
      expect(king.kingState).toBe(KingState.LEAP_AIR);
    });

    it('a becsapódás után külön, HOSSZABB cooldownnal nyílik újra az ugrás', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - leapDistance, KING_Y);

      king.update(player);
      runner.run(LEAP_WINDUP_MS);
      getBody(king).blocked.down = true;
      king.update(player);

      // Az akció-cooldown lejár, de az ugrás sajátja még nem: a király sétál, nem ugrik.
      runner.run(ACTION_COOLDOWN_MS);
      expect(king.kingState).toBe(KingState.APPROACH);

      getBody(king).blocked.down = false;
      king.update(player);
      expect(king.kingState).toBe(KingState.APPROACH);

      runner.run(LEAP_COOLDOWN_MS);
      king.update(player);
      expect(king.kingState).toBe(KingState.LEAP_WINDUP);
    });
  });

  describe('Kitörés (CSAK Phase 2)', () => {
    const lungeDistance = LUNGE_MIN_RANGE + 60;

    it('Phase 1-ben NEM indul kitörés, még megfelelő távolságból sem', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - lungeDistance, KING_Y);

      // Az ugrást elhasználjuk, hogy a rotáció a kitörésre lépjen — Phase 1-ben mégsem indul.
      king.update(player);
      expect(king.kingState).toBe(KingState.LEAP_WINDUP);
      runner.run(LEAP_WINDUP_MS);
      getBody(king).blocked.down = true;
      king.update(player);
      runner.run(ACTION_COOLDOWN_MS);
      getBody(king).blocked.down = false;

      king.update(player);

      expect(king.kingState).not.toBe(KingState.LUNGE_WINDUP);
      expect(king.getPhase()).toBe(1);
    });

    it('Phase 2-ben elindul, és az irány a WINDUP ELEJÉN rögzül', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - lungeDistance, KING_Y);
      king.takeDamage(DAMAGE_TO_PHASE2);

      king.update(player);
      expect(king.kingState).toBe(KingState.LUNGE_WINDUP);

      // A player a windup alatt a másik oldalra kerül — a roham ettől nem fordul meg.
      player.x = KING_X + lungeDistance;
      runner.run(LUNGE_WINDUP_MS);

      expect(king.kingState).toBe(KingState.LUNGE);
      expect(getBody(king).velocity.x).toBe(-LUNGE_SPEED);
    });

    it('a windup irányát eventtel is közli', () => {
      const player = createPlayerAt(scene, KING_X - lungeDistance, KING_Y);
      king.takeDamage(DAMAGE_TO_PHASE2);
      const onWindup = vi.fn();
      king.on('king-lunge-windup', onWindup);

      king.update(player);

      expect(onWindup).toHaveBeenCalledWith(-1);
    });

    it('rohamonként LEGFELJEBB EGYSZER sebez', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - lungeDistance, KING_Y);
      king.takeDamage(DAMAGE_TO_PHASE2);

      king.update(player);
      runner.run(LUNGE_WINDUP_MS);

      king.x = player.x; // beleér a playerbe
      king.update(player);
      king.update(player);
      king.update(player);

      expect(player.getHP()).toBe(PLAYER_MAX_HP - LUNGE_DAMAGE);
    });

    it('falnak ütközve idő előtt véget ér, és megszédül', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - lungeDistance, KING_Y);
      king.takeDamage(DAMAGE_TO_PHASE2);

      king.update(player);
      runner.run(LUNGE_WINDUP_MS);

      getBody(king).blocked.left = true;
      king.update(player);

      expect(king.kingState).toBe(KingState.COOLDOWN);
      expect(getBody(king).velocity.x).toBe(0);
    });

    it('a kitörés után hosszabb csend jön, mint egy sima akció után', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - lungeDistance, KING_Y);
      king.takeDamage(DAMAGE_TO_PHASE2);

      king.update(player);
      runner.run(LUNGE_WINDUP_MS);
      runner.run(LUNGE_MAX_MS);

      expect(king.kingState).toBe(KingState.COOLDOWN);
      expect(LUNGE_COOLDOWN_MS).toBeGreaterThan(ACTION_COOLDOWN_MS);

      runner.run(LUNGE_COOLDOWN_MS);
      expect(king.kingState).toBe(KingState.APPROACH);
    });
  });

  describe('Mozgás', () => {
    it('a támadási sávokon kívül a player FELÉ közelít', () => {
      const runner = createDelayedCallRunner(scene);
      const player = createPlayerAt(scene, KING_X - (LEAP_MIN_RANGE + 60), KING_Y);

      // Elhasználjuk az ugrást, hogy tényleg a sétálás maradjon.
      king.update(player);
      runner.run(LEAP_WINDUP_MS);
      getBody(king).blocked.down = true;
      king.update(player);
      runner.run(ACTION_COOLDOWN_MS);
      getBody(king).blocked.down = false;

      king.update(player);

      expect(king.kingState).toBe(KingState.APPROACH);
      expect(getBody(king).velocity.x).toBe(-MOVE_SPEED_P1);
    });

    it('DEAD állapotban az update() nem mozgatja', () => {
      const player = createPlayerAt(scene, KING_X - 300, KING_Y);
      king.takeDamage(MAX_HP);

      king.update(player);

      expect(getBody(king).velocity.x).toBe(0);
    });
  });
});
