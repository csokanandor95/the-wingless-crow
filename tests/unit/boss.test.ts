// Boss (The Grafted Wing-Breaker) unit tesztek — Project_plan.md §23 "Unit testing / Boss"
// bontása szerint: HP, phase transition, attack state, death.
//
// Ugyanaz a harness, mint a hollow.test.ts-ben: a Hollow-hoz hasonlóan itt is VALÓDI
// (mock scene-nel létrehozott) Player példányokat adunk át a boss.update()-nek, hogy a
// találat-feloldás igazi getHP() csökkenést tudjon ellenőrizni.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import GraftedWingBreaker, {
  BossState,
  MAX_HP,
  PHASE2_HP_RATIO,
  MOVE_SPEED_P1,
  MOVE_SPEED_P2,
  SLASH_RANGE,
  SLASH_DAMAGE,
  PROJECTILE_MIN_RANGE,
  PROJECTILE_SPAWN_OFFSET_X,
  CHARGE_MIN_RANGE,
  CHARGE_SPEED,
  CHARGE_DAMAGE,
} from '../../src/bosses/GraftedWingBreaker';
import Player, { MAX_HP as PLAYER_MAX_HP } from '../../src/player/Player';
import {
  createMockScene,
  getBody,
  createDelayedCallStepper,
  type MockScene,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

const BOSS_X = 400;
const BOSS_Y = 370;

/** Sebzés, ami pontosan a Phase 2 küszöbre viszi a bosst. */
const DAMAGE_TO_PHASE2 = MAX_HP * PHASE2_HP_RATIO;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

describe('GraftedWingBreaker (Boss)', () => {
  let scene: MockScene;
  let boss: GraftedWingBreaker;

  beforeEach(() => {
    scene = createMockScene();
    boss = new GraftedWingBreaker(scene as unknown as Phaser.Scene, BOSS_X, BOSS_Y);
    boss.activate(); // a scene a belépő végén hívja; enélkül DORMANT marad
  });

  describe('HP', () => {
    it('új boss: HP a maximumon, Phase 1', () => {
      expect(boss.getHP()).toBe(MAX_HP);
      expect(boss.getMaxHP()).toBe(MAX_HP);
      expect(boss.getPhase()).toBe(1);
    });

    it('takeDamage: csökkenti a HP-t', () => {
      boss.takeDamage(30);
      expect(boss.getHP()).toBe(MAX_HP - 30);
    });

    it('takeDamage: nem megy 0 alá', () => {
      boss.takeDamage(MAX_HP + 100);
      expect(boss.getHP()).toBe(0);
    });

    it('DORMANT (belépő) alatt sebezhetetlen', () => {
      const dormant = new GraftedWingBreaker(scene as unknown as Phaser.Scene, BOSS_X, BOSS_Y);
      expect(dormant.bossState).toBe(BossState.DORMANT);

      dormant.takeDamage(50);
      expect(dormant.getHP()).toBe(MAX_HP);
    });

    it('DORMANT alatt nem mozog és nem támad', () => {
      const dormant = new GraftedWingBreaker(scene as unknown as Phaser.Scene, BOSS_X, BOSS_Y);
      const player = createPlayerAt(scene, BOSS_X + 20, BOSS_Y);
      const callsBefore = scene.time.delayedCall.mock.calls.length;

      dormant.update(player);

      expect(dormant.bossState).toBe(BossState.DORMANT);
      expect(scene.time.delayedCall.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('phase transition', () => {
    it('pontosan a MAX_HP felénél vált Phase 2-re', () => {
      boss.takeDamage(DAMAGE_TO_PHASE2 - 1);
      expect(boss.getPhase()).toBe(1);

      boss.takeDamage(1);
      expect(boss.getPhase()).toBe(2);
    });

    it("a 'boss-phase-change' event pontosan egyszer tüzel", () => {
      const onPhaseChange = vi.fn();
      boss.on('boss-phase-change', onPhaseChange);

      boss.takeDamage(DAMAGE_TO_PHASE2);
      expect(onPhaseChange).toHaveBeenCalledTimes(1);
      expect(onPhaseChange).toHaveBeenCalledWith(2);

      boss.takeDamage(20); // további sebzés már nem tüzeli újra
      expect(onPhaseChange).toHaveBeenCalledTimes(1);
    });

    it('Phase 2-ben gyorsabban közelít, mint Phase 1-ben', () => {
      // A player olyan távolságra van, ami se slash-t (>SLASH_RANGE), se lövedéket
      // (<PROJECTILE_MIN_RANGE), se charge-ot (<CHARGE_MIN_RANGE) nem vált ki -> APPROACH.
      const approachDistance = (SLASH_RANGE + PROJECTILE_MIN_RANGE) / 2;
      const player = createPlayerAt(scene, BOSS_X + approachDistance, BOSS_Y);

      boss.update(player);
      expect(getBody(boss).velocity.x).toBe(MOVE_SPEED_P1);

      boss.takeDamage(DAMAGE_TO_PHASE2);
      boss.update(player);
      expect(getBody(boss).velocity.x).toBe(MOVE_SPEED_P2);
    });
  });

  describe('approach', () => {
    it('DIRECTION_DEADZONE: közvetlenül a boss felett álló player nem okoz irány-oszcillációt', () => {
      // A player majdnem pontosan a boss felett van (pl. az aréna platformján): a
      // vízszintes távolság ~0, a 2D távolság viszont túl nagy a slash-hez és túl kicsi
      // a lövedékhez -> az APPROACH ág fut, aminek meg kell állnia, nem pörögnie.
      const abovePlayer = createPlayerAt(scene, BOSS_X + 2, BOSS_Y - 120);

      boss.update(abovePlayer);
      const firstVelocity = getBody(boss).velocity.x;
      boss.update(abovePlayer);
      const secondVelocity = getBody(boss).velocity.x;

      expect(boss.bossState).toBe(BossState.APPROACH);
      expect(firstVelocity).toBe(0);
      expect(secondVelocity).toBe(0);
    });
  });

  describe('attack state — slash', () => {
    it('SLASH_RANGE-en belül SLASH, a startup után valódi sebzés, majd COOLDOWN -> APPROACH', () => {
      const player = createPlayerAt(scene, BOSS_X + SLASH_RANGE - 10, BOSS_Y);
      const stepper = createDelayedCallStepper(scene);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.SLASH);
      expect(getBody(boss).velocity.x).toBe(0);

      // A resolveSlashHit() a Player.takeDamage()-en keresztül SAJÁT delayedCallt is ütemez
      // ugyanezen a mock scene-en, ezért a köztes állapot után flushRemaining() következik.
      stepper.next(); // SLASH_STARTUP_MS -> találat + COOLDOWN
      expect(player.getHP()).toBe(PLAYER_MAX_HP - SLASH_DAMAGE);
      expect(boss.bossState).toBe(BossState.COOLDOWN);

      stepper.flushRemaining(); // player HURT-clear + ACTION_COOLDOWN_MS -> APPROACH
      expect(boss.bossState).toBe(BossState.APPROACH);
    });

    it('a slash nem talál, ha a player időközben kilépett a hatótávból', () => {
      const player = createPlayerAt(scene, BOSS_X + SLASH_RANGE - 10, BOSS_Y);
      const stepper = createDelayedCallStepper(scene);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.SLASH);

      player.x = BOSS_X + SLASH_RANGE + 200; // elugrott a windup alatt
      stepper.next();

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });
  });

  describe('attack state — projectile', () => {
    it("PROJECTILE_MIN_RANGE-en túl lő, és a startup végén emittálja a 'boss-projectile'-t", () => {
      const player = createPlayerAt(scene, BOSS_X + PROJECTILE_MIN_RANGE + 100, BOSS_Y);
      const onProjectile = vi.fn();
      boss.on('boss-projectile', onProjectile);
      const stepper = createDelayedCallStepper(scene);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.PROJECTILE);
      expect(onProjectile).not.toHaveBeenCalled(); // csak a windup UTÁN

      stepper.next(); // PROJECTILE_STARTUP_MS
      expect(onProjectile).toHaveBeenCalledTimes(1);
      // A lövedék a boss előtt, a jobb oldalon (a player felé) születik.
      expect(onProjectile).toHaveBeenCalledWith(
        BOSS_X + PROJECTILE_SPAWN_OFFSET_X,
        expect.any(Number),
        1
      );
      expect(boss.bossState).toBe(BossState.COOLDOWN);
    });

    it('balra álló playerre balra lő', () => {
      const player = createPlayerAt(scene, BOSS_X - PROJECTILE_MIN_RANGE - 100, BOSS_Y);
      const onProjectile = vi.fn();
      boss.on('boss-projectile', onProjectile);
      const stepper = createDelayedCallStepper(scene);

      boss.update(player);
      stepper.next();

      expect(onProjectile).toHaveBeenCalledWith(
        BOSS_X - PROJECTILE_SPAWN_OFFSET_X,
        expect.any(Number),
        -1
      );
    });
  });

  describe('attack state — charge (csak Phase 2)', () => {
    // Elég messze a charge-hoz ÉS azonos magasságban: Phase 1-ben ez lövedéket vált ki,
    // Phase 2-ben charge-ot. Ez a Project_plan.md 12. pont fázis-szabályának direkt tesztje.
    const chargePlayerX = BOSS_X + CHARGE_MIN_RANGE + 80;

    it('Phase 1-ben SOHA nem charge-ol, akkor sem, ha a geometria megfelelne', () => {
      const player = createPlayerAt(scene, chargePlayerX, BOSS_Y);

      boss.update(player);

      expect(boss.getPhase()).toBe(1);
      expect(boss.bossState).toBe(BossState.PROJECTILE);
      expect(boss.bossState).not.toBe(BossState.CHARGE_WINDUP);
    });

    it('Phase 2-ben ugyanaz a geometria CHARGE_WINDUP-ot vált ki', () => {
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, chargePlayerX, BOSS_Y);

      boss.update(player);

      expect(boss.bossState).toBe(BossState.CHARGE_WINDUP);
      expect(getBody(boss).velocity.x).toBe(0); // windup alatt áll (telegraph)
    });

    it('CHARGE_WINDUP -> CHARGE: rögzített irányban indul, és legfeljebb egyszer sebez', () => {
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, chargePlayerX, BOSS_Y);
      // A stepper átugorja a takeDamage() hit-villanás callbackjét.
      const stepper = createDelayedCallStepper(scene, true);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.CHARGE_WINDUP);

      stepper.next(); // CHARGE_WINDUP_MS -> beginCharge()
      expect(boss.bossState).toBe(BossState.CHARGE);
      expect(getBody(boss).velocity.x).toBe(CHARGE_SPEED);

      // A boss beéri a playert: az első update sebez, a második már nem.
      player.x = BOSS_X + 10;
      boss.update(player);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - CHARGE_DAMAGE);

      boss.update(player);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - CHARGE_DAMAGE);
    });

    it('a falnak ütköző charge azonnal COOLDOWN-ba megy', () => {
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, chargePlayerX, BOSS_Y);
      const stepper = createDelayedCallStepper(scene, true);

      boss.update(player);
      stepper.next(); // -> CHARGE
      expect(boss.bossState).toBe(BossState.CHARGE);

      getBody(boss).blocked.right = true;
      boss.update(player);

      expect(boss.bossState).toBe(BossState.COOLDOWN);
      expect(getBody(boss).velocity.x).toBe(0);
    });
  });

  describe('death', () => {
    it('takeDamage(MAX_HP): DEAD, velocity nullázva, body letiltva', () => {
      boss.takeDamage(MAX_HP);

      expect(boss.isDead()).toBe(true);
      expect(boss.bossState).toBe(BossState.DEAD);
      expect(getBody(boss).velocity.x).toBe(0);
      expect(getBody(boss).velocity.y).toBe(0);
      expect(getBody(boss).enable).toBe(false);
    });

    it("halálkor emittálja a 'boss-death' eventet", () => {
      const onDeath = vi.fn();
      boss.on('boss-death', onDeath);

      boss.takeDamage(MAX_HP);

      expect(onDeath).toHaveBeenCalledTimes(1);
    });

    it('DEAD állapotban a takeDamage() és az update() is no-op', () => {
      boss.takeDamage(MAX_HP);
      const player = createPlayerAt(scene, BOSS_X + 20, BOSS_Y);
      const callsBefore = scene.time.delayedCall.mock.calls.length;

      boss.takeDamage(50);
      expect(() => boss.update(player)).not.toThrow();

      expect(boss.getHP()).toBe(0);
      expect(boss.bossState).toBe(BossState.DEAD);
      // Nem indul új támadás-lánc (nincs újabb ütemezett callback).
      expect(scene.time.delayedCall.mock.calls.length).toBe(callsBefore);
    });

    it('a halál megszakítja a folyamatban lévő támadást', () => {
      const player = createPlayerAt(scene, BOSS_X + SLASH_RANGE - 10, BOSS_Y);
      const stepper = createDelayedCallStepper(scene);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.SLASH);

      boss.takeDamage(MAX_HP); // a windup alatt hal meg
      stepper.flushRemaining(); // a beütemezett slash-callback lefut, de DEAD-en no-op

      expect(boss.bossState).toBe(BossState.DEAD);
      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });
  });
});
