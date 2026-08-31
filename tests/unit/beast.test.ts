// Enemy 3 (Beast) unit tesztek — Project_plan.md §23 "Unit testing / Enemy" bontása szerint:
// HP, damage, death, state transitions.
//
// A Beast két dologban tér el a másik két lénytől, és a tesztek súlypontja is ezen van:
//
//  1. **A roham az ELSŐDLEGES támadás.** Ehhez kell a `CHASE` visszahátráló ága — enélkül a
//     Beast az első roham után örökre közelharci gépezet lenne (a 27. tanulság rokona). Ezt
//     egy sima kézi végigjátszás "működőnek" látná (a lény üt, a player megöli); csak a
//     ciklus figyelése mutatja meg, hogy a fő támadás soha többé nem sül el.
//  2. **A rohamot a PEREM is megállítja, nem csak a fal.** A bossok arénája fallal zárt,
//     ezért ott elég a `body.blocked`; egy párkányon álló Beast viszont enélkül leszaladna.
//
// A `Beast.update(player)` valódi Player-típust vár, ezért — a crowHarvester.test.ts
// mintájára — valódi (mock-alapú) Player példányok a teszt-adatok, nem duck-typing + cast.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import Beast, {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  ATTACK_RANGE,
  ATTACK_STARTUP_MS,
  BeastState,
  CHARGE_DAMAGE,
  CHARGE_HIT_RANGE,
  CHARGE_MAX_MS,
  CHARGE_MIN_RANGE,
  CHARGE_RECOVERY_MS,
  CHARGE_SPEED,
  CHARGE_VERTICAL_TOLERANCE,
  CHARGE_WINDUP_MS,
  CHASE_SPEED,
  DETECTION_RANGE,
  LOSE_RANGE,
  MAX_HP,
  PATROL_SPEED,
  VERTICAL_DETECTION_RANGE,
} from '../../src/enemies/Beast';
import {
  ATTACK_ANIM_MS,
  BODY_WIDTH as BEAST_BODY_WIDTH,
  HALF_BODY_WIDTH,
  MACE_REACH_PX,
  HORN_REACH_PX,
} from '../../src/enemies/BeastAnimations';
import Player, {
  MAX_HP as PLAYER_MAX_HP,
  MOVE_SPEED as PLAYER_MOVE_SPEED,
} from '../../src/player/Player';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../../src/player/PlayerAnimations';
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

const BEAST_X = 1000;
const BEAST_Y = 400;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

/**
 * Két frissítés: az első a detektálás (`updatePatrol()` a váltás frame-jén `return`-öl, a
 * CrowHarvester mintája), a második az első VALÓDI `CHASE`-frame. Csak azonos szinten,
 * `DETECTION_RANGE`-en belül álló playerrel működik — a vertikálisan elválasztott
 * eseteknél a sebzés-alapú `wake()` kell.
 */
function engage(beast: Beast, player: Player): void {
  beast.update(player);
  expect(beast.beastState).toBe(BeastState.CHASE);
  beast.update(player);
}

/** Felébresztés a player pozíciójától FÜGGETLENÜL (egy távoli tűzgolyó modellje). */
function wake(beast: Beast): void {
  beast.takeDamage(1);
  expect(beast.beastState).toBe(BeastState.CHASE);
}

describe('Beast', () => {
  let scene: MockScene;
  let beast: Beast;

  beforeEach(() => {
    scene = createMockScene();
    beast = new Beast(scene as unknown as Phaser.Scene, BEAST_X, BEAST_Y);
  });

  describe('HP és sebzés', () => {
    it('új Beast: HP a maximumon', () => {
      expect(beast.getHP()).toBe(MAX_HP);
      expect(beast.getMaxHP()).toBe(MAX_HP);
    });

    it('takeDamage: csökkenti a HP-t, de nem megy 0 alá', () => {
      beast.takeDamage(10);
      expect(beast.getHP()).toBe(MAX_HP - 10);

      beast.takeDamage(MAX_HP + 50);
      expect(beast.getHP()).toBe(0);
    });

    it('takeDamage PATROL alatt azonnal CHASE-be vált (távoli tűzgolyó is felébreszti)', () => {
      expect(beast.beastState).toBe(BeastState.PATROL);
      beast.takeDamage(1);
      expect(beast.beastState).toBe(BeastState.CHASE);
    });

    it('takeDamage DEAD állapotban nem csinál semmit', () => {
      beast.takeDamage(MAX_HP);
      expect(beast.isDead()).toBe(true);

      beast.takeDamage(1);
      expect(beast.getHP()).toBe(0);
    });
  });

  describe('halál', () => {
    it('takeDamage(MAX_HP): DEAD, velocity nullázva, body letiltva', () => {
      beast.takeDamage(MAX_HP);

      expect(beast.beastState).toBe(BeastState.DEAD);
      expect(beast.isDead()).toBe(true);
      expect(getBody(beast).enable).toBe(false);
    });

    it("a haláltusa a die()-ból megy: 'beast-death' PONTOSAN egyszer", () => {
      const onDeath = vi.fn();
      beast.on('beast-death', onDeath);

      beast.takeDamage(MAX_HP);
      expect(onDeath).toHaveBeenCalledTimes(1);
    });

    it('REGRESSZIÓ: a destroy() NEM emittál haláltusát (24. tanulság)', () => {
      // A scene resetEnemies()-e a player MINDEN halálakor megsemmisíti az összes lényt.
      // A destroy()-ból emittálva minden respawn haláltusa-kórussal indulna.
      const onDeath = vi.fn();
      const living = new Beast(scene as unknown as Phaser.Scene, BEAST_X, BEAST_Y);
      living.on('beast-death', onDeath);

      living.destroy();

      expect(onDeath).not.toHaveBeenCalled();
      expect(living.isDead()).toBe(true);
    });

    it('REGRESSZIÓ: a destroy() inertté teszi a függő támadás-callbacket (18. tanulság)', () => {
      const player = createPlayerAt(scene, BEAST_X + 20, BEAST_Y);
      beast.update(player); // PATROL -> CHASE

      const stepper = createDelayedCallStepper(scene, true);
      beast.update(player); // -> ATTACK, ütemezi a windup végét
      expect(beast.beastState).toBe(BeastState.ATTACK);

      beast.destroy();
      stepper.flushRemaining();

      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });
  });

  describe('PATROL és detektálás', () => {
    it('PATROL-ban a séta-határok között ingázik', () => {
      const walker = new Beast(scene as unknown as Phaser.Scene, BEAST_X, BEAST_Y, {
        patrolMinX: BEAST_X - 50,
        patrolMaxX: BEAST_X + 50,
      });
      const player = createPlayerAt(scene, BEAST_X + DETECTION_RANGE + 200, BEAST_Y);

      walker.update(player);
      expect(getBody(walker).velocity.x).toBe(PATROL_SPEED);

      walker.x = BEAST_X + 60; // átlépte a jobb határt
      walker.update(player);
      expect(getBody(walker).velocity.x).toBe(-PATROL_SPEED);
    });

    it('a detektálás vízszintes ÉS vertikális küszöböt is megkövetel', () => {
      // Vízszintesen közel, de egy másik platformon áll -> NEM ébred fel.
      const above = createPlayerAt(scene, BEAST_X + 10, BEAST_Y - VERTICAL_DETECTION_RANGE - 20);
      beast.update(above);
      expect(beast.beastState).toBe(BeastState.PATROL);

      // Ugyanaz a magasság -> felébred.
      const level = createPlayerAt(scene, BEAST_X + DETECTION_RANGE - 10, BEAST_Y);
      beast.update(level);
      expect(beast.beastState).toBe(BeastState.CHASE);
    });

    it('a LOSE_RANGE-en túl visszatér PATROL-ba', () => {
      wake(beast);
      const far = createPlayerAt(scene, BEAST_X + LOSE_RANGE + 10, BEAST_Y);
      beast.update(far);
      expect(beast.beastState).toBe(BeastState.PATROL);
    });
  });

  describe('közelharc (CSAK közvetlen közelben)', () => {
    it('ATTACK_RANGE-en belül támad, azon kívül nem', () => {
      const close = createPlayerAt(scene, BEAST_X + ATTACK_RANGE - 5, BEAST_Y);
      engage(beast, close);
      expect(beast.beastState).toBe(BeastState.ATTACK);

      const other = new Beast(scene as unknown as Phaser.Scene, BEAST_X, BEAST_Y);
      const far = createPlayerAt(scene, BEAST_X + ATTACK_RANGE + 20, BEAST_Y);
      engage(other, far);
      expect(other.beastState).toBe(BeastState.CHASE);
    });

    it('a sebzés a windup VÉGÉN érkezik, és emittálja a hang-eventet', () => {
      const onSwing = vi.fn();
      beast.on('beast-attack', onSwing);

      const player = createPlayerAt(scene, BEAST_X + ATTACK_RANGE - 5, BEAST_Y);
      beast.update(player); // PATROL -> CHASE

      const stepper = createDelayedCallStepper(scene, true);
      beast.update(player); // -> ATTACK

      // A windup alatt még nincs sebzés.
      expect(player.getHP()).toBe(PLAYER_MAX_HP);
      expect(onSwing).not.toHaveBeenCalled();

      stepper.next(); // ATTACK_STARTUP_MS
      expect(onSwing).toHaveBeenCalledTimes(1);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - ATTACK_DAMAGE);
      expect(beast.beastState).toBe(BeastState.COOLDOWN);
    });

    it('a windup alatt megölt lény már nem csap (és nem is hangos)', () => {
      const onSwing = vi.fn();
      beast.on('beast-attack', onSwing);

      const player = createPlayerAt(scene, BEAST_X + ATTACK_RANGE - 5, BEAST_Y);
      beast.update(player);

      const stepper = createDelayedCallStepper(scene, true);
      beast.update(player); // -> ATTACK

      beast.takeDamage(MAX_HP);
      stepper.flushRemaining();

      expect(onSwing).not.toHaveBeenCalled();
      expect(player.getHP()).toBe(PLAYER_MAX_HP);
    });

    it('COOLDOWN után visszatér CHASE-be', () => {
      const player = createPlayerAt(scene, BEAST_X + ATTACK_RANGE - 5, BEAST_Y);
      beast.update(player);

      const stepper = createDelayedCallStepper(scene, true);
      beast.update(player); // -> ATTACK

      stepper.next(); // startup -> sebzés + COOLDOWN
      expect(beast.beastState).toBe(BeastState.COOLDOWN);

      stepper.flushRemaining(); // cooldown (+ a player HURT-lockja)
      expect(beast.beastState).toBe(BeastState.CHASE);
    });
  });

  describe('roham (az ELSŐDLEGES támadás)', () => {
    function chargeSetup(distance = CHARGE_MIN_RANGE + 40): Player {
      const player = createPlayerAt(scene, BEAST_X + distance, BEAST_Y);
      engage(beast, player);
      return player;
    }

    it('CHARGE_MIN_RANGE-en túlról rohamot indít, nem közelít', () => {
      chargeSetup();
      expect(beast.beastState).toBe(BeastState.CHARGE_WINDUP);
      // A windup alatt ÁLL: a telegraph mozdulatlan póz.
      expect(getBody(beast).velocity.x).toBe(0);
    });

    it('a windup emittálja az irányt, és az a windup ELEJÉN rögzül', () => {
      const onWindup = vi.fn();
      beast.on('beast-charge-windup', onWindup);

      const player = chargeSetup();
      expect(onWindup).toHaveBeenCalledWith(1);

      // A player a windup alatt a lény MÖGÉ kerül — a roham iránya ettől NEM változik,
      // pont ez teszi kikerülhetővé.
      player.x = BEAST_X - 300;
      beast.update(player);

      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      expect(beast.beastState).toBe(BeastState.CHARGE);
      expect(getBody(beast).velocity.x).toBe(CHARGE_SPEED); // továbbra is JOBBRA
    });

    it('nem rohamoz másik szinten álló playerre', () => {
      const above = createPlayerAt(
        scene,
        BEAST_X + CHARGE_MIN_RANGE + 40,
        BEAST_Y - CHARGE_VERTICAL_TOLERANCE - 20
      );
      wake(beast);
      beast.update(above);
      expect(beast.beastState).toBe(BeastState.CHASE);
    });

    it('a roham legfeljebb EGYSZER sebez', () => {
      const player = chargeSetup();
      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);

      player.x = beast.x + CHARGE_HIT_RANGE - 5;
      beast.update(player);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - CHARGE_DAMAGE);

      beast.update(player);
      beast.update(player);
      expect(player.getHP()).toBe(PLAYER_MAX_HP - CHARGE_DAMAGE);
    });

    it('a roham a CHASE-perem elérésekor véget ér (nem szalad le a párkányról)', () => {
      // Ez a Beast valódi eltérése a bossoktól: ott fal van, itt perem.
      const bounded = new Beast(scene as unknown as Phaser.Scene, BEAST_X, BEAST_Y, {
        chaseMinX: BEAST_X - 200,
        chaseMaxX: BEAST_X + 100,
      });
      const player = createPlayerAt(scene, BEAST_X + CHARGE_MIN_RANGE + 40, BEAST_Y);
      engage(bounded, player);

      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      expect(bounded.beastState).toBe(BeastState.CHARGE);

      bounded.x = BEAST_X + 100; // elérte a peremet
      bounded.update(player);

      expect(bounded.beastState).toBe(BeastState.COOLDOWN);
      expect(getBody(bounded).velocity.x).toBe(0);
    });

    it('falnak ütközve is véget ér', () => {
      const player = chargeSetup();
      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);

      getBody(beast).blocked.right = true;
      player.x = BEAST_X + 500; // kívül a találati sugáron
      beast.update(player);

      expect(beast.beastState).toBe(BeastState.COOLDOWN);
    });

    it('CHARGE_MAX_MS után magától véget ér', () => {
      chargeSetup();
      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      expect(beast.beastState).toBe(BeastState.CHARGE);

      runner.run(CHARGE_MAX_MS);
      expect(beast.beastState).toBe(BeastState.COOLDOWN);
      expect(getBody(beast).velocity.x).toBe(0);
    });
  });

  describe('a visszahátrálás — ez teszi a rohamot elsődlegessé', () => {
    it('kész rohammal, túl közeli player elől HÁTRÁL (nem közelít)', () => {
      const player = createPlayerAt(scene, BEAST_X + CHARGE_MIN_RANGE - 40, BEAST_Y);
      engage(beast, player);

      expect(beast.beastState).toBe(BeastState.CHASE);
      // A player JOBBRA van, tehát a hátrálás BALRA visz.
      expect(getBody(beast).velocity.x).toBeLessThan(0);
    });

    it('REGRESSZIÓ: cooldownon lévő rohammal KÖZELÍT, nem áll bénán hátrálva', () => {
      // Enélkül a Beast a roham 2,6 mp-es cooldownja alatt is hátrálna, tehát menekülne a
      // player elől ahelyett, hogy közelharcolna.
      const player = createPlayerAt(scene, BEAST_X + CHARGE_MIN_RANGE + 40, BEAST_Y);
      engage(beast, player); // elhasználja a rohamot (-> CHARGE_WINDUP)

      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      runner.run(CHARGE_MAX_MS); // -> COOLDOWN, canCharge még false
      // KÉT callback van CHARGE_RECOVERY_MS-re: a stagger-animáció vége (playHitReaction) és
      // a COOLDOWN -> CHASE visszatérés. A runner hívásonként egyet süt el.
      runner.run(CHARGE_RECOVERY_MS);
      runner.run(CHARGE_RECOVERY_MS);
      expect(beast.beastState).toBe(BeastState.CHASE);

      player.x = beast.x + CHARGE_MIN_RANGE - 40;
      beast.update(player);

      expect(getBody(beast).velocity.x).toBe(CHASE_SPEED); // KÖZELÍT
    });

    it('SAROKBA SZORÍTHATÓ: a peremen megáll hátrálás helyett, és közelharcra vált', () => {
      // A Gravecaller döntése („sarokba szorítva viszont tüzel"): a lény nem válik bábuvá.
      const cornered = new Beast(scene as unknown as Phaser.Scene, BEAST_X, BEAST_Y, {
        chaseMinX: BEAST_X,
        chaseMaxX: BEAST_X + 400,
      });
      const player = createPlayerAt(scene, BEAST_X + CHARGE_MIN_RANGE - 40, BEAST_Y);
      engage(cornered, player);

      expect(getBody(cornered).velocity.x).toBe(0);

      // A player egészen odaér -> a Beast közelharcol.
      player.x = BEAST_X + ATTACK_RANGE - 5;
      cornered.update(player);
      expect(cornered.beastState).toBe(BeastState.ATTACK);
    });

    it('nem hátrál másik szinten álló player elől (oda úgysem rohamozna)', () => {
      const above = createPlayerAt(
        scene,
        BEAST_X + CHARGE_MIN_RANGE - 40,
        BEAST_Y - CHARGE_VERTICAL_TOLERANCE - 20
      );
      wake(beast);
      beast.update(above);

      expect(getBody(beast).velocity.x).toBe(CHASE_SPEED);
    });
  });

  // --- Fairness- és konzisztencia-invariánsok --------------------------------
  //
  // Ugyanaz a szerep, mint a madKing.test.ts "Fairness-invariánsok" blokkjáé: ha valaki
  // később "felgyorsítja" a Beastet, ne a következő kézi végigjátszás találja meg, hanem a CI.

  describe('fairness- és levezetés-invariánsok', () => {
    it('a közelharci windup HÁTRALÉPÉSSEL is kikerülhető, nem csak ugrással', () => {
      // Pontblank helyzet: a két test épp összeér.
      const pointBlank = HALF_BODY_WIDTH + PLAYER_BODY_WIDTH / 2;
      // A resolveAttackHit() +10 toleranciával dolgozik.
      const gain = ATTACK_RANGE + 10 - pointBlank;

      const REACTION_MS = 250;
      const backstepMs = (gain / PLAYER_MOVE_SPEED) * 1000;

      expect(
        backstepMs + REACTION_MS,
        'a hátralépés + reakcióidő nem fér bele a windupba'
      ).toBeLessThanOrEqual(ATTACK_STARTUP_MS);
    });

    it('a támadás ciklusa lefedi a teljes animációt', () => {
      // Különben a következő ütés a még futó animáció közepén indulna újra.
      expect(ATTACK_STARTUP_MS + ATTACK_COOLDOWN_MS).toBeGreaterThanOrEqual(ATTACK_ANIM_MS);
    });

    it('a roham és a közelharc kiválasztási sávja NEM fed át (27. tanulság)', () => {
      // Ha átfedne, a reaktív közelharc kiéheztetné a rohamot — pont az a hibaosztály, amit
      // az AncientDemon rotációjának megfordítása javított.
      expect(CHARGE_MIN_RANGE).toBeGreaterThan(ATTACK_RANGE);
    });

    it('a Beast gyorsabb a CrowHarvesternél, de nem elfuthatatlan', () => {
      // "Gyorsabb, agresszívebb" (Project_plan 11. pont) — de a player elfut előle, ha
      // időben indul, és a roham EGYENES vonalú, tehát oldalra lépve kikerülhető.
      expect(CHASE_SPEED).toBeLessThan(PLAYER_MOVE_SPEED);
      expect(CHARGE_SPEED).toBeGreaterThan(PLAYER_MOVE_SPEED);
    });

    it('a hatótávok az ANIMÁCIÓBÓL származnak, nem szabadon hangoltak', () => {
      expect(HALF_BODY_WIDTH).toBe(BEAST_BODY_WIDTH / 2);
      expect(ATTACK_RANGE).toBe(MACE_REACH_PX + PLAYER_BODY_WIDTH / 2);
      expect(CHARGE_HIT_RANGE).toBe(HORN_REACH_PX + PLAYER_BODY_WIDTH / 2);
    });
  });
});
