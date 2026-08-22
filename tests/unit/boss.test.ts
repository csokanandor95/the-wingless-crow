// Boss (The Grafted Wing-Breaker) unit tesztek — Project_plan.md §23 "Unit testing / Boss"
// bontása szerint: HP, phase transition, attack state, death.
//
// Ugyanaz a harness, mint a crowHarvester.test.ts-ben: a CrowHarvesterhez hasonlóan itt is VALÓDI
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
  PROJECTILE_STARTUP_MS,
  CHARGE_MIN_RANGE,
  CHARGE_SPEED,
  CHARGE_DAMAGE,
  CHARGE_WINDUP_MS,
  CHARGE_MAX_MS,
  CHARGE_COOLDOWN_MS,
  ACTION_COOLDOWN_MS,
  ATTACK_ROTATION,
  SLASH_STARTUP_MS,
  SPELL_MIN_RANGE,
  SPELL_CAST_MS,
  SPELL_DAMAGE,
  SPELL_HIT_HALF_WIDTH,
} from '../../src/bosses/GraftedWingBreaker';
import { SPELL_IMPACT_MS } from '../../src/bosses/GraftedWingBreakerAnimations';
import Player, { MAX_HP as PLAYER_MAX_HP } from '../../src/player/Player';
import {
  createMockScene,
  getBody,
  createDelayedCallStepper,
  createDelayedCallRunner,
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
      // A player majdnem pontosan a boss felett van (pl. felugorva): a vízszintes távolság
      // ~0, a 2D távolság viszont túl nagy a slash-hez és túl kicsi a lövedékhez/spellhez
      // -> az APPROACH ág fut, aminek meg kell állnia, nem pörögnie.
      //
      // A magasság a KONSTANSOKBÓL származik, nem beégetett szám: a SLASH_RANGE a boss
      // sprite kaszájának tényleges nyúlásából jön, tehát egy sprite-csere magától
      // elmozdítaná ezt a küszöböt.
      const gapDistance = (SLASH_RANGE + PROJECTILE_MIN_RANGE) / 2;
      const abovePlayer = createPlayerAt(scene, BOSS_X + 2, BOSS_Y - gapDistance);

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

    // A csapás hangját a scene játssza le erre az eventre. A kasza hátrahúzása alatt még
    // csend van — a hang a lecsapás pillanatához (f20) tartozik, oda, ahol a sebzés is.
    it("a 'boss-slash'-t a windup VÉGÉN emittálja, nem az elején", () => {
      const onSlash = vi.fn();
      boss.on('boss-slash', onSlash);
      const player = createPlayerAt(scene, BOSS_X + SLASH_RANGE - 10, BOSS_Y);
      const runner = createDelayedCallRunner(scene);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.SLASH);
      expect(onSlash).not.toHaveBeenCalled();

      runner.run(SLASH_STARTUP_MS);
      expect(onSlash).toHaveBeenCalledTimes(1);
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

  // Shadow Spell (Phase 8): a boss a player AKKORI pozíciójára idéz egy árny-oszlopot, ami
  // csak SPELL_IMPACT_MS múlva csap le — addig oldalra kilépve kikerülhető. A charge-dzsal
  // szemben MINDKÉT fázisban elérhető.
  describe('attack state — shadow spell', () => {
    // Elég messze a spellhez (>SPELL_MIN_RANGE), de a charge vízszintes küszöbén BELÜL,
    // hogy Phase 2-ben ne a roham vigye el a sort.
    const SPELL_PLAYER_X = BOSS_X + SPELL_MIN_RANGE + 20;

    /**
     * A spell a lövedék MÖGÖTT áll a prioritási sorban, tehát oda kell juttatni a bosst,
     * hogy a lövedék épp újratöltsön. A runner késleltetés szerint válogat, így a lövedék
     * 500ms-os startupját lefuttatjuk, a 2200ms-os újratöltését viszont NEM.
     */
    function advanceToSpell(
      player: Player,
      runner: ReturnType<typeof createDelayedCallRunner>
    ): void {
      boss.update(player);
      expect(boss.bossState).toBe(BossState.PROJECTILE);

      runner.run(PROJECTILE_STARTUP_MS); // lövés -> COOLDOWN
      runner.run(ACTION_COOLDOWN_MS); // -> APPROACH, de canShoot még false
      boss.update(player);
    }

    it('a lövedék újratöltése alatt Shadow Spellt használ', () => {
      const player = createPlayerAt(scene, SPELL_PLAYER_X, BOSS_Y);
      advanceToSpell(player, createDelayedCallRunner(scene));

      expect(boss.bossState).toBe(BossState.SPELL);
      expect(getBody(boss).velocity.x).toBe(0); // castolás közben áll
    });

    it("a 'boss-spell' a cast végén tüzel, a player AKKORI pozíciójával", () => {
      const player = createPlayerAt(scene, SPELL_PLAYER_X, BOSS_Y);
      const runner = createDelayedCallRunner(scene);
      const onSpell = vi.fn();
      boss.on('boss-spell', onSpell);

      advanceToSpell(player, runner);
      expect(onSpell).not.toHaveBeenCalled(); // csak a cast UTÁN

      runner.run(SPELL_CAST_MS);

      expect(onSpell).toHaveBeenCalledTimes(1);
      // A célpont X-e a player pozíciója, az Y a boss talpa (a scene ide teszi az oszlopot).
      expect(onSpell).toHaveBeenCalledWith(SPELL_PLAYER_X, expect.any(Number));
      expect(boss.bossState).toBe(BossState.COOLDOWN);
    });

    it('a becsapódás eltalálja a helyben maradó playert', () => {
      const player = createPlayerAt(scene, SPELL_PLAYER_X, BOSS_Y);
      const runner = createDelayedCallRunner(scene);

      advanceToSpell(player, runner);
      runner.run(SPELL_CAST_MS);
      runner.run(SPELL_IMPACT_MS);

      expect(player.getHP()).toBe(PLAYER_MAX_HP - SPELL_DAMAGE);
    });

    it('oldalra kilépve NEM talál — a célpont a cast pillanatában rögzül', () => {
      const player = createPlayerAt(scene, SPELL_PLAYER_X, BOSS_Y);
      const runner = createDelayedCallRunner(scene);

      advanceToSpell(player, runner);
      runner.run(SPELL_CAST_MS);

      // A telegraph alatt kitér: a sáv széléről pont egy pixellel kilépve már elkerüli.
      player.x = SPELL_PLAYER_X + SPELL_HIT_HALF_WIDTH + 1;
      runner.run(SPELL_IMPACT_MS);

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });

    it('Phase 2-ben is elérhető (szemben a charge-dzsal, ami csak ott)', () => {
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, SPELL_PLAYER_X, BOSS_Y);
      // A runner a takeDamage() hit-villanását egyszerűen nem futtatja le: késleltetés
      // szerint válogat, a 100ms-os villanás pedig egyik lépésben sem szerepel.
      advanceToSpell(player, createDelayedCallRunner(scene));

      expect(boss.getPhase()).toBe(2);
      expect(boss.bossState).toBe(BossState.SPELL);
    });

    it('a saját cooldownja előtt nem ismételhető', () => {
      const player = createPlayerAt(scene, SPELL_PLAYER_X, BOSS_Y);
      const runner = createDelayedCallRunner(scene);

      advanceToSpell(player, runner);
      runner.run(SPELL_CAST_MS);
      runner.run(ACTION_COOLDOWN_MS); // -> APPROACH

      // Se lövedék (újratölt), se spell (cooldownon) -> egyszerűen közelít.
      boss.update(player);
      expect(boss.bossState).toBe(BossState.APPROACH);
      expect(getBody(boss).velocity.x).toBeGreaterThan(0);
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

  // A támadás-KÖRFORGÁS (ATTACK_ROTATION) tesztjei. Ez a blokk egy valódi, kézi teszten
  // talált hibára válaszol: Phase 2-ben a boss KIZÁRÓLAG charge-ot és slash-t használt.
  // Ok: a charge egy prioritási sor élén állt, a `canCharge` pedig ugyanabban a
  // delayedCall-ban állt vissza, ami a bosst APPROACH-ba vitte — tehát a döntés
  // pillanatában mindig kész volt, és a projectile/spell soha nem jutott szóhoz.
  describe('támadás-rotáció', () => {
    // Elég messze mindhárom rotált támadáshoz (a charge 200-as vízszintes küszöbe fölött).
    const FAR_PLAYER_X = BOSS_X + CHARGE_MIN_RANGE + 80;

    /** Egy teljes roham végigfuttatása a windup-tól a cooldown végéig. */
    function runFullCharge(runner: ReturnType<typeof createDelayedCallRunner>): void {
      runner.run(CHARGE_WINDUP_MS); // -> CHARGE
      runner.run(CHARGE_MAX_MS); // -> endCharge -> COOLDOWN
      runner.run(CHARGE_COOLDOWN_MS); // -> APPROACH (és canCharge vissza)
    }

    /** Egy cast-alapú támadás (projectile vagy spell) végigfuttatása. */
    function runCastAttack(runner: ReturnType<typeof createDelayedCallRunner>): void {
      runner.run(PROJECTILE_STARTUP_MS); // == SPELL_CAST_MS -> a lövés/idézés + COOLDOWN
      runner.run(ACTION_COOLDOWN_MS); // -> APPROACH
    }

    it('Phase 2-ben körbeér: charge -> projectile -> spell -> charge', () => {
      // EZ a bejelentett hiba regressziós tesztje. Prioritási sorral a 2. lépésnél újra
      // charge jönne, és a két távolsági támadás soha nem sülne el.
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, FAR_PLAYER_X, BOSS_Y);
      const runner = createDelayedCallRunner(scene);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.CHARGE_WINDUP);
      runFullCharge(runner);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.PROJECTILE);
      runCastAttack(runner);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.SPELL);
      runCastAttack(runner);

      // A kör bezárul: a roham újra sorra kerül.
      boss.update(player);
      expect(boss.bossState).toBe(BossState.CHARGE_WINDUP);
    });

    it('a fázisváltás a charge slotjára állítja a rotációt', () => {
      // Phase 1-ben a rotáció a lövedékkel nyit...
      const player = createPlayerAt(scene, FAR_PLAYER_X, BOSS_Y);
      boss.update(player);
      expect(boss.bossState).toBe(BossState.PROJECTILE);

      // ...Phase 2 viszont a szignatúra-mozdulatával, nem ott folytatva, ahol abbahagyta.
      const fresh = new GraftedWingBreaker(scene as unknown as Phaser.Scene, BOSS_X, BOSS_Y);
      fresh.activate();
      fresh.takeDamage(DAMAGE_TO_PHASE2);

      fresh.update(player);
      expect(fresh.bossState).toBe(BossState.CHARGE_WINDUP);
      expect(ATTACK_ROTATION.indexOf('CHARGE')).toBeGreaterThanOrEqual(0);
    });

    it('a nem elérhető támadást átugorja: a charge küszöbén belül lövedék jön', () => {
      // A charge vízszintesen >200-at kíván; 180-nál Phase 2-ben is a rotáció következő
      // ELÉRHETŐ eleme jön, nem áll be a boss.
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, BOSS_X + SPELL_MIN_RANGE + 20, BOSS_Y);

      boss.update(player);

      expect(boss.getPhase()).toBe(2);
      expect(boss.bossState).toBe(BossState.PROJECTILE);
    });

    it('a slash NEM forgatja a rotációt: közelharci közjáték után ott folytatódik', () => {
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const runner = createDelayedCallRunner(scene);
      const far = createPlayerAt(scene, FAR_PLAYER_X, BOSS_Y);

      boss.update(far); // rotáció: charge -> a mutató a projectile-re lép
      runFullCharge(runner);

      // Közelharci közjáték: a player bemegy, a boss slashel.
      const near = createPlayerAt(scene, BOSS_X + SLASH_RANGE - 10, BOSS_Y);
      boss.update(near);
      expect(boss.bossState).toBe(BossState.SLASH);
      runner.run(SLASH_STARTUP_MS);
      runner.run(ACTION_COOLDOWN_MS); // -> APPROACH

      // A player újra eltávolodik: a rotáció ott folytatódik, ahol abbamaradt.
      boss.update(far);
      expect(boss.bossState).toBe(BossState.PROJECTILE);
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
