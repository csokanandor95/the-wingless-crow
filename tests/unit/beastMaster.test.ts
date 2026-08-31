// Boss 3 (The Beast Master) unit tesztek — Project_plan.md §23 „Unit testing / Boss" bontása
// szerint: HP, damage, death, state transitions.
//
// A mini-boss a `Beast` state machine-je boss-léptékben, ezért a tesztek súlypontja azon van,
// ami MÁS:
//
//  1. **FAIRNESS.** A `SCALE = 2` a hatótávot 44 -> 74-re növelte, tehát a Beast 390 ms-os
//     windupja itt már nem lenne elég. A blokk futtatható állítássá teszi, hogy MINDKÉT
//     válasz (hátralépés ÉS ugrás) működik — ha valaki később „felgyorsítja" a lényt, nem a
//     következő kézi végigjátszás fogja megtalálni, hanem a CI.
//  2. **A FALKA.** Küszöbönként PONTOSAN egyszer sül el, a helyes típussal — és a boss csak
//     eventet emittál, nem hoz létre lényt.
//  3. **DORMANT sebezhetetlenség** és a **STAGGER** punish-ablak (a `Beast`-nél egyik sincs).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import BeastMaster, {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  ATTACK_RANGE,
  ATTACK_STARTUP_MS,
  BeastMasterState,
  BACKOFF_SPEED,
  CHARGE_DAMAGE,
  CHARGE_HIT_RANGE,
  CHARGE_MAX_MS,
  CHARGE_MIN_RANGE,
  CHARGE_RECOVERY_MS,
  CHARGE_SPEED,
  CHARGE_WINDUP_MS,
  MAX_HP,
  MOVE_SPEED as MASTER_MOVE_SPEED,
  STAGGER_MS,
  SUMMON_SPAWN_DISTANCE,
  SUMMON_THRESHOLDS,
} from '../../src/bosses/BeastMaster';
import {
  ATTACK_ANIM_MS,
  BACKSTEP_ESCAPE_MS,
  HALF_WIDTH,
  JUMP_ESCAPE_MS,
  REACTION_MS,
  SCALE,
  ATTACK_WINDUP_MS,
} from '../../src/bosses/BeastMasterAnimations';
import {
  ATTACK_RANGE as BEAST_ATTACK_RANGE,
  MACE_REACH_PX,
  HORN_REACH_PX,
} from '../../src/enemies/BeastAnimations';
import {
  MAX_HP as MAD_KING_MAX_HP,
} from '../../src/bosses/MadKing';
import { MAX_HP as BEAST_MAX_HP } from '../../src/enemies/Beast';
import {
  ATTACK_RANGE as HARVESTER_ATTACK_RANGE,
  DETECTION_RANGE as HARVESTER_DETECTION_RANGE,
} from '../../src/enemies/CrowHarvester';
import {
  PREFERRED_RANGE as GRAVECALLER_PREFERRED_RANGE,
  RETREAT_RANGE as GRAVECALLER_RETREAT_RANGE,
} from '../../src/enemies/Gravecaller';
import Player, { MOVE_SPEED as PLAYER_MOVE_SPEED } from '../../src/player/Player';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../../src/player/PlayerAnimations';
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

const MASTER_X = 600;
const MASTER_Y = 325;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

describe('BeastMaster', () => {
  let scene: MockScene;
  let master: BeastMaster;

  beforeEach(() => {
    scene = createMockScene();
    master = new BeastMaster(scene as unknown as Phaser.Scene, MASTER_X, MASTER_Y);
  });

  // --- HP / sebzés ----------------------------------------------------------

  describe('HP és sebzés', () => {
    it('új Master: HP a maximumon', () => {
      expect(master.getHP()).toBe(MAX_HP);
      expect(master.getMaxHP()).toBe(MAX_HP);
    });

    it('a HP-létrán a sima Beast FÖLÖTT, a nagy bossok ALATT van', () => {
      // Mini-boss: a nyomás az arénából jön (nincs hova elfutni), nem a hosszból.
      expect(MAX_HP).toBeGreaterThan(BEAST_MAX_HP);
      expect(MAX_HP).toBeLessThan(MAD_KING_MAX_HP);
    });

    it('DORMANT alatt NEM sebezhető — a párbeszéd és a belépő védett', () => {
      expect(master.masterState).toBe(BeastMasterState.DORMANT);
      expect(master.isVulnerable()).toBe(false);

      master.takeDamage(50);
      expect(master.getHP()).toBe(MAX_HP);
    });

    it('activate() után sebezhető, és a HP nem megy 0 alá', () => {
      master.activate();
      expect(master.isVulnerable()).toBe(true);

      master.takeDamage(20);
      expect(master.getHP()).toBe(MAX_HP - 20);

      master.takeDamage(MAX_HP + 50);
      expect(master.getHP()).toBe(0);
    });

    it('activate() csak DORMANT-ból hat', () => {
      master.activate();
      master.activate();
      expect(master.masterState).toBe(BeastMasterState.APPROACH);
    });
  });

  describe('halál', () => {
    it('takeDamage(MAX_HP): DEAD, velocity nullázva, body letiltva', () => {
      master.activate();
      master.takeDamage(MAX_HP);

      expect(master.isDead()).toBe(true);
      expect(master.isVulnerable()).toBe(false);

      const body = getBody(master);
      expect(body.velocity.x).toBe(0);
      expect(body.enable).toBe(false);
    });

    it("a haláltusa eventje a die()-ból jön, EGYSZER", () => {
      // CLAUDE.md 24. tanulság: a destroy()-ból emittálva minden scene-reset
      // haláltusa-kórussal indulna.
      const onDeath = vi.fn();
      master.on('beast-master-death', onDeath);

      master.activate();
      master.takeDamage(MAX_HP);
      expect(onDeath).toHaveBeenCalledTimes(1);

      master.takeDamage(10);
      expect(onDeath).toHaveBeenCalledTimes(1);
    });
  });

  // --- FAIRNESS -------------------------------------------------------------

  describe('fairness-invariánsok', () => {
    it('a hatótáv a SCALE-ből származik, nem beégetett', () => {
      expect(ATTACK_RANGE).toBe(MACE_REACH_PX * SCALE + PLAYER_BODY_WIDTH / 2);
      expect(CHARGE_HIT_RANGE).toBe(HORN_REACH_PX * SCALE + PLAYER_BODY_WIDTH / 2);
      // A nagyobb test messzebbről ér el, mint a sima Beast — pont ezért kell hosszabb windup.
      expect(ATTACK_RANGE).toBeGreaterThan(BEAST_ATTACK_RANGE);
    });

    it('a windup mellett a HÁTRALÉPÉS is kivisz, nem csak az ugrás', () => {
      // Ez a Mad King fairness-módszere. A padlót a LASSABB válasz adja: ha a windup csak az
      // ugrást engedné, a közelharc gyakorlatilag kikerülhetetlen lenne pontblank helyzetből.
      expect(ATTACK_WINDUP_MS).toBeGreaterThanOrEqual(BACKSTEP_ESCAPE_MS + REACTION_MS);
      expect(ATTACK_WINDUP_MS).toBeGreaterThanOrEqual(JUMP_ESCAPE_MS + REACTION_MS);
    });

    it('a hátralépés a LASSABB válasz — tehát ő a mérvadó', () => {
      expect(BACKSTEP_ESCAPE_MS).toBeGreaterThan(JUMP_ESCAPE_MS);
    });

    it('a hátralépési idő a player exportált konstansaiból SZÁMÍTÓDIK', () => {
      const pointBlank = HALF_WIDTH + PLAYER_BODY_WIDTH / 2;
      const escape = ATTACK_RANGE + 10;
      expect(BACKSTEP_ESCAPE_MS).toBeCloseTo(((escape - pointBlank) / PLAYER_MOVE_SPEED) * 1000);
    });

    it('a sima Beast windupja NEM lenne elég ehhez a hatótávhoz', () => {
      // Regresszió: ha valaki „egyszerűsítésként" visszaírná a Beast 390 ms-át, a hátralépés
      // kiesne. A 390 az ottani 44-es hatótávhoz készült.
      expect(390).toBeLessThan(BACKSTEP_ESCAPE_MS + REACTION_MS);
    });

    it('a csapás teljes ciklusa lefedi az animációt', () => {
      // Enélkül a következő ütés a még futó animáció közepén indulna újra.
      expect(ATTACK_STARTUP_MS + ATTACK_COOLDOWN_MS).toBeGreaterThanOrEqual(ATTACK_ANIM_MS);
    });

    it('a roham és a közelharc kiválasztási sávja NEM fedi egymást', () => {
      // CLAUDE.md 27. tanulság: egy átfedő sáv kiéheztetné a rohamot — a lény örökre
      // közelharci gépezet lenne.
      expect(CHARGE_MIN_RANGE).toBeGreaterThan(ATTACK_RANGE);
    });

    it('a roham átszeli a 800 px-es arénát — nem lehet kifutni előle', () => {
      const chargeDistance = (CHARGE_MAX_MS * CHARGE_SPEED) / 1000;
      expect(chargeDistance).toBeGreaterThan(600);
      // ...és gyorsabb a playernél, tehát tényleg csak ugrással/fallal kerülhető ki.
      expect(CHARGE_SPEED).toBeGreaterThan(PLAYER_MOVE_SPEED);
    });

    it('a Master LASSABBAN közelít a playernél — a fenyegetés a roham', () => {
      expect(MASTER_MOVE_SPEED).toBeLessThan(PLAYER_MOVE_SPEED);
      expect(BACKOFF_SPEED).toBeLessThan(PLAYER_MOVE_SPEED);
    });

    it('a falnak rohanás punish-ablaka elég KÉT kardcsapásra', () => {
      // LEVEZETETT, a player konstansaiból: odafutás + 2 csapás + kilépés.
      const approach = (CHARGE_HIT_RANGE / PLAYER_MOVE_SPEED) * 1000;
      const twoSwings = 150 + 350; // startupDelayMs + cooldownMs (ATTACK_CONFIGS)
      expect(STAGGER_MS).toBeGreaterThanOrEqual(approach * 2 + twoSwings);
    });
  });

  // --- Közelharc ------------------------------------------------------------

  describe('közelharc', () => {
    it('ATTACK_RANGE-en belül támad, és a csapás a windup VÉGÉN sebez', () => {
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - 40, MASTER_Y);
      const hpBefore = player.getHP();

      master.update(player);
      expect(master.masterState).toBe(BeastMasterState.ATTACK);

      const runner = createDelayedCallRunner(scene);
      runner.run(ATTACK_STARTUP_MS);

      expect(player.getHP()).toBe(hpBefore - ATTACK_DAMAGE);
      expect(master.masterState).toBe(BeastMasterState.COOLDOWN);
    });

    it('a csapás hangját event jelzi, a windup VÉGÉN', () => {
      const onSwing = vi.fn();
      master.on('beast-master-attack', onSwing);
      master.activate();

      const player = createPlayerAt(scene, MASTER_X - 40, MASTER_Y);
      master.update(player);
      expect(onSwing).not.toHaveBeenCalled();

      createDelayedCallRunner(scene).run(ATTACK_STARTUP_MS);
      expect(onSwing).toHaveBeenCalledTimes(1);
    });

    it('a hatótávon KÍVÜLRE lépő playert már nem találja el', () => {
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - 40, MASTER_Y);
      const hpBefore = player.getHP();

      master.update(player);
      // A player elhátrál a windup alatt — pont az, amit a fairness-levezetés megenged.
      player.x = MASTER_X - (ATTACK_RANGE + 40);

      createDelayedCallRunner(scene).run(ATTACK_STARTUP_MS);
      expect(player.getHP()).toBe(hpBefore);
    });
  });

  // --- Roham ----------------------------------------------------------------

  describe('roham', () => {
    it('CHARGE_MIN_RANGE-en túl rohamot indít, és az irány a windup ELEJÉN rögzül', () => {
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - CHARGE_MIN_RANGE - 20, MASTER_Y);

      master.update(player);
      expect(master.masterState).toBe(BeastMasterState.CHARGE_WINDUP);

      // A player átkerül a MÁSIK oldalra — a roham ettől függetlenül balra indul.
      player.x = MASTER_X + 300;
      createDelayedCallRunner(scene).run(CHARGE_WINDUP_MS);

      expect(master.masterState).toBe(BeastMasterState.CHARGE);
      expect(getBody(master).velocity.x).toBe(-CHARGE_SPEED);
    });

    it('rohamonként LEGFELJEBB egyszer sebez', () => {
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - CHARGE_MIN_RANGE - 20, MASTER_Y);
      master.update(player);
      createDelayedCallRunner(scene).run(CHARGE_WINDUP_MS);

      const hpBefore = player.getHP();
      player.x = MASTER_X - 10; // a roham útjába kerül

      master.update(player);
      master.update(player);
      master.update(player);

      expect(player.getHP()).toBe(hpBefore - CHARGE_DAMAGE);
    });

    it('falnak ütközve STAGGER-be megy — ez a harc fő punish-ablaka', () => {
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - CHARGE_MIN_RANGE - 20, MASTER_Y);
      master.update(player);
      createDelayedCallRunner(scene).run(CHARGE_WINDUP_MS);
      expect(master.masterState).toBe(BeastMasterState.CHARGE);

      const onWallHit = vi.fn();
      master.on('beast-master-wall-hit', onWallHit);

      getBody(master).blocked.left = true;
      master.update(player);

      expect(master.masterState).toBe(BeastMasterState.STAGGER);
      expect(onWallHit).toHaveBeenCalledTimes(1);
      expect(getBody(master).velocity.x).toBe(0);
    });

    it('a STAGGER a beállított idő után APPROACH-ba tér vissza', () => {
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - CHARGE_MIN_RANGE - 20, MASTER_Y);
      master.update(player);

      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      getBody(master).blocked.left = true;
      master.update(player);

      runner.run(STAGGER_MS);
      expect(master.masterState).toBe(BeastMasterState.APPROACH);
    });

    it('idő előtt le nem álló roham a CHARGE_MAX_MS-nél véget ér', () => {
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - CHARGE_MIN_RANGE - 20, MASTER_Y);
      master.update(player);

      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      runner.run(CHARGE_MAX_MS);

      // Falnak NEM ütközött, tehát rövid recovery (COOLDOWN), nem STAGGER.
      expect(master.masterState).toBe(BeastMasterState.COOLDOWN);
    });

    it('a roham után HÁTRÁL, hogy új nekifutást nyerjen', () => {
      // Ez teszi a rohamot ELSŐDLEGESSÉ (a Beast `applyChasePositioning()`-jának elve).
      // Enélkül a Master a player mellett ragadna, és a roham soha többé nem sülne el.
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - (ATTACK_RANGE + 30), MASTER_Y);

      master.update(player);
      expect(master.masterState).toBe(BeastMasterState.APPROACH);
      // A player túl közel van a rohamhoz, de már a kardon kívül -> hátrálás, ELFELÉ.
      expect(getBody(master).velocity.x).toBe(BACKOFF_SPEED);
    });

    it('ha a roham COOLDOWN-on van, KÖZELÍT, nem hátrál', () => {
      // Enélkül a Master 2,4 mp-ig menekülne a player elől, ami se nem fenyegető, se nem
      // olvasható.
      master.activate();
      const player = createPlayerAt(scene, MASTER_X - CHARGE_MIN_RANGE - 20, MASTER_Y);
      master.update(player);

      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      runner.run(CHARGE_MAX_MS); // a roham lejár, a charge cooldownra megy

      // KÉT callback osztozik ezen a késleltetésen, és ez SZÁNDÉKOS: a
      // `CHARGE_RECOVERY_MS === HIT_ANIM_MS` (a Beast öröksége — a megtorpanás látványát a
      // hit-frame-ek adják, tehát a kettőnek együtt kell lejárnia). A runner
      // regisztrációs sorrendben halad: előbb a hit-reakció, aztán a state-visszaállítás.
      runner.run(CHARGE_RECOVERY_MS);
      expect(master.masterState).toBe(BeastMasterState.COOLDOWN);
      runner.run(CHARGE_RECOVERY_MS);
      expect(master.masterState).toBe(BeastMasterState.APPROACH);

      player.x = MASTER_X - (ATTACK_RANGE + 30);
      master.update(player);

      expect(getBody(master).velocity.x).toBe(-MASTER_MOVE_SPEED);
    });
  });

  // --- A falka --------------------------------------------------------------

  describe('falka (HP-küszöbök)', () => {
    it('a két küszöb a user által kért típusokat hívja', () => {
      expect(SUMMON_THRESHOLDS.map((t) => t.type)).toEqual(['crow-harvester', 'gravecaller']);
      expect(SUMMON_THRESHOLDS.map((t) => t.hpRatio)).toEqual([0.66, 0.33]);
    });

    it('66 %-nál CrowHarvestert hív, PONTOSAN egyszer', () => {
      const onSummon = vi.fn();
      master.on('beast-master-summon', onSummon);
      master.activate();

      master.takeDamage(Math.ceil(MAX_HP * 0.3)); // 70 % fölött marad
      expect(onSummon).not.toHaveBeenCalled();

      master.takeDamage(Math.ceil(MAX_HP * 0.1)); // átlépi a 66 %-ot
      expect(onSummon).toHaveBeenCalledTimes(1);
      expect(onSummon.mock.calls[0][0]).toBe('crow-harvester');

      // További sebzés ugyanabban a sávban NEM hív újra.
      master.takeDamage(1);
      expect(onSummon).toHaveBeenCalledTimes(1);
    });

    it('33 %-nál Gravecallert hív, és a korábbi küszöb nem sül el újra', () => {
      const onSummon = vi.fn();
      master.on('beast-master-summon', onSummon);
      master.activate();

      master.takeDamage(Math.ceil(MAX_HP * 0.7)); // 30 %-ra esik -> MINDKÉT küszöb átlépve
      expect(onSummon).toHaveBeenCalledTimes(2);
      expect(onSummon.mock.calls.map((c) => c[0])).toEqual(['crow-harvester', 'gravecaller']);

      master.takeDamage(5);
      expect(onSummon).toHaveBeenCalledTimes(2);
    });

    it('a halálos csapás NEM hív falkát', () => {
      // A gazdája nélkül értelmetlen lenne, és a győzelmi beat alatt sebezné a playert.
      const onSummon = vi.fn();
      master.on('beast-master-summon', onSummon);
      master.activate();

      master.takeDamage(MAX_HP);
      expect(onSummon).not.toHaveBeenCalled();
    });

    it('a spawn-távolság a hívott lények konstansaiból van LEVEZETVE', () => {
      // REGRESSZIÓ (kézi teszt, 2026-08-31): a falka a fal mellett éledt, a playertől akár
      // 680 px-re — mindkét fajta DETECTION_RANGE-én kívül —, tehát tétlenül sétálgatott.
      //
      // FELÜLRŐL: a SZŰKEBB detektálási hatótáv. A lénynek azonnal észre kell vennie a playert.
      expect(SUMMON_SPAWN_DISTANCE).toBeLessThanOrEqual(HARVESTER_DETECTION_RANGE);
      // ALULRÓL: ne a player nyakán éledjen (ugyanaz az elv, amiért a Level 3 A szakaszáról
      // kikerült a két kezdő crow). Bőven a közelharci hatótáv fölött.
      expect(SUMMON_SPAWN_DISTANCE).toBeGreaterThan(HARVESTER_ATTACK_RANGE * 2);
      // A Gravecallernek pont a „megáll és castol" sávba kell esnie: se hátrálás, se közelítés.
      expect(SUMMON_SPAWN_DISTANCE).toBeGreaterThan(GRAVECALLER_RETREAT_RANGE);
      expect(SUMMON_SPAWN_DISTANCE).toBeLessThan(GRAVECALLER_PREFERRED_RANGE);
    });

    it('CSAK a típust emittálja — a pozíciót a scene dönti el', () => {
      // REGRESSZIÓ (kézi teszt, 2026-08-31): a boss korábban a SAJÁT pozíciójából számolt
      // spawn-pontot is küldött. A fal mellől hívva a lény a sarokban jelent meg, a player
      // pedig a túloldalon — mindkét fajta DETECTION_RANGE-én kívül —, tehát a falka
      // tétlenül sétálgatott. A boss nem is tudhatja a helyes pozíciót: sem az aréna
      // határait, sem a tisztességes távolságot nem ismeri (lásd Boss3Scene.summonSpawnX).
      const onSummon = vi.fn();
      master.on('beast-master-summon', onSummon);
      master.activate();

      master.takeDamage(Math.ceil(MAX_HP * 0.4));
      expect(onSummon).toHaveBeenCalledTimes(1);
      expect(onSummon.mock.calls[0]).toEqual(['crow-harvester']);
    });
  });

  // --- Állapotgép -----------------------------------------------------------

  describe('állapotgép', () => {
    it('DORMANT alatt nem mozdul és nem támad', () => {
      const player = createPlayerAt(scene, MASTER_X - 30, MASTER_Y);

      master.update(player);
      expect(master.masterState).toBe(BeastMasterState.DORMANT);
      expect(getBody(master).velocity.x).toBe(0);
    });

    it('DEAD állapotban az update() nem csinál semmit', () => {
      master.activate();
      master.takeDamage(MAX_HP);

      const player = createPlayerAt(scene, MASTER_X - 30, MASTER_Y);
      master.update(player);

      expect(master.masterState).toBe(BeastMasterState.DEAD);
      expect(getBody(master).velocity.x).toBe(0);
    });
  });
});
