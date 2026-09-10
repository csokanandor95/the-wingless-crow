/**
 * INTEGRATION — `Project_plan.md` 24. pont: *Sword → Enemy* és *Fireball → Enemy*.
 *
 * **Mi ez a réteg, és miért nem unit teszt?** A `combat.test.ts` a `Player` támadását MOCKOLT
 * célponton nézi, a `crowHarvester.test.ts` pedig a lény HP-ját MOCKOLT sebzésszámmal. Mindkettő
 * helyes a maga szintjén, de a KETTŐ TALÁLKOZÁSÁRÓL egyik sem állít semmit — pedig a
 * gyakorlatban ott romolhat el a dolog: ha az `ATTACK_CONFIGS` sebzése vagy egy lény `MAX_HP`-ja
 * elmozdul, a harc ritmusa változik meg, és egyik unit teszt sem bukik el tőle.
 *
 * Itt ezért MINDKÉT oldal VALÓDI: valódi `Player` üt valódi `CrowHarvester`/`Gravecaller`/
 * `Beast` lényt, a valódi `ATTACK_CONFIGS` és a valódi `Fireball` közreműködésével.
 *
 * **VÁLLALT KORLÁT (fontos, és szándékosan itt áll):** a scene-ek `physics.add.overlap`
 * bekötését ez a réteg NEM futtatja — a fake Phasernek nincs fizikai világa. Az alábbi két
 * `resolve*Hit()` helper a scene találat-szabályát TÜKRÖZI, nem hívja. Maga a bekötés
 * (van-e egyáltalán overlap regisztrálva, és a helyes tömbre-e) **E2E-ben** ellenőrzött.
 * Ez a réteg tehát a modulok KÖZTI SZERZŐDÉST bizonyítja, nem a fizikát.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('../unit/helpers/fakePhaser');
  return createFakePhaserModule();
});

// A mock-helperek a `tests/unit/helpers/` alatt élnek, mert mind a 34 unit teszt onnan
// importálja őket. Egy `tests/helpers/`-be költöztetés mind a 34 fájlt megbolygatná, érdemi
// haszon nélkül — a természetes helye ennek a lépésnek a tervezett unit-teszt audit.
import {
  createDelayedCallStepper,
  createMockScene,
  flushAllDelayedCalls,
  type MockScene,
} from '../unit/helpers/phaserTestUtils';

import Player from '../../src/player/Player';
import CrowHarvester, { MAX_HP as HARVESTER_MAX_HP } from '../../src/enemies/CrowHarvester';
import Gravecaller, { MAX_HP as GRAVECALLER_MAX_HP } from '../../src/enemies/Gravecaller';
import Beast, { MAX_HP as BEAST_MAX_HP } from '../../src/enemies/Beast';
import Fireball, { FIREBALL_CONFIG } from '../../src/combat/Projectile';
import { ATTACK_CONFIGS, AttackType, HEAVY_CHARGE_HITS } from '../../src/combat/Attack';
import type { Damageable } from '../../src/combat/DamageSystem';

const SWORD = ATTACK_CONFIGS[AttackType.SWORD];
const HEAVY = ATTACK_CONFIGS[AttackType.HEAVY];

/**
 * A `Level1Scene.handlePlayerHitEnemy()` szabálya, egy az egyben (`Level1Scene.ts:695`).
 * Visszaadja, hogy a találat ténylegesen sebzett-e — a scene ebből dönti el, szól-e a hang.
 */
function resolveSwordHit(player: Player, enemy: Phaser.GameObjects.GameObject & Damageable) {
  if (enemy.isDead() || player.hasHitTarget(enemy)) return false;

  const damage = player.getAttackHitbox().getData('damage') as number;
  enemy.takeDamage(damage);
  player.registerHit(enemy);
  return true;
}

/** A `Level1Scene.handleFireballHitEnemy()` szabálya (`Level1Scene.ts:710`). */
function resolveFireballHit(
  fireball: Fireball,
  enemy: Phaser.GameObjects.GameObject & Damageable
) {
  if (!fireball.active || fireball.hasAlreadyHit() || enemy.isDead()) return false;

  enemy.takeDamage(fireball.getDamage());
  fireball.onImpact();
  return true;
}

/**
 * Egy TELJES kardcsapás: gombnyomás → a hitbox élesedik (`startupDelayMs`) → a megadott
 * célpontok belesétálnak → a csapás lecseng.
 *
 * A hitbox ÉLESEDÉSÉNÉL állunk meg, mert a scene overlapje is ott sütne el. A `stepper`
 * regisztrációs sorrendben halad, és a `performAttack()` első ütemezése épp a startup.
 *
 * **A `blocked` ág nem óvatoskodás, hanem MÉRT viselkedés:** a `performAttack()` guardjai
 * (cooldown, lock, létra, és a heavynél a töltöttség) a legelső sorban állnak, tehát egy
 * blokkolt csapás EGYETLEN `delayedCall`-t sem ütemez — se hitbox, se animáció, se hang.
 * A helper ezt a különbséget adja vissza, ahelyett hogy elszállna rajta.
 */
function swing(
  scene: MockScene,
  player: Player,
  type: AttackType,
  targets: Array<Phaser.GameObjects.GameObject & Damageable>
): { blocked: boolean; hits: boolean[] } {
  const stepper = createDelayedCallStepper(scene, true);
  const scheduledBefore = scene.time.delayedCall.mock.calls.length;

  if (type === AttackType.HEAVY) player.heavyAttack();
  else player.attack();

  if (scene.time.delayedCall.mock.calls.length === scheduledBefore) {
    return { blocked: true, hits: [] };
  }

  stepper.next(); // startupDelayMs -> enableHitbox()

  const hits = targets.map((target) => resolveSwordHit(player, target));

  stepper.flushRemaining(); // a hitbox lekapcsolása, a state-reset és a cooldown lejárta
  return { blocked: false, hits };
}

function createPlayer(scene: MockScene): Player {
  return new Player(scene as unknown as Phaser.Scene, 100, 100);
}

describe('Sword → Enemy (Project_plan 24. pont)', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    player = createPlayer(scene);
  });

  it('egy teljes csapás a KONFIGURÁLT sebzést viszi be egy valódi CrowHarvesterre', () => {
    const enemy = new CrowHarvester(scene as unknown as Phaser.Scene, 140, 100);

    const { hits } = swing(scene, player, AttackType.SWORD, [enemy]);

    expect(hits).toEqual([true]);
    expect(enemy.getHP()).toBe(HARVESTER_MAX_HP - SWORD.damage);
  });

  it('a hitbox a startup ELŐTT még nem sebez', () => {
    const enemy = new CrowHarvester(scene as unknown as Phaser.Scene, 140, 100);

    player.attack();
    // A startup delayedCall SZÁNDÉKOSAN nem fut le: a windup alatt a kard még nem ér oda.
    expect(player.getAttackHitbox().getData('damage')).toBeUndefined();
    expect(enemy.getHP()).toBe(HARVESTER_MAX_HP);
  });

  it('EGY csapás ugyanazt a célpontot csak EGYSZER sebzi, akkor is, ha az overlap kitart', () => {
    const enemy = new CrowHarvester(scene as unknown as Phaser.Scene, 140, 100);
    const stepper = createDelayedCallStepper(scene, true);

    player.attack();
    stepper.next();

    // Az overlap több frame-en át fennáll — a scene handlere minden frame-ben lefut.
    const results = [
      resolveSwordHit(player, enemy),
      resolveSwordHit(player, enemy),
      resolveSwordHit(player, enemy),
    ];

    expect(results).toEqual([true, false, false]);
    expect(enemy.getHP()).toBe(HARVESTER_MAX_HP - SWORD.damage);
  });

  it('a halott lény már nem sebezhető tovább', () => {
    const enemy = new CrowHarvester(scene as unknown as Phaser.Scene, 140, 100);
    enemy.takeDamage(HARVESTER_MAX_HP);
    flushAllDelayedCalls(scene);

    const { hits } = swing(scene, player, AttackType.SWORD, [enemy]);

    expect(enemy.isDead()).toBe(true);
    expect(hits).toEqual([false]);
  });

  /**
   * A HARC RITMUSA. Ez az az állítás, ami CSAK ezen a szinten fogalmazható meg: a lények
   * `MAX_HP`-ja és a kard sebzése két külön modul két külön konstansa, és a hányadosuk maga a
   * game design. Ha bármelyik elmozdul, itt kell tudatos döntést hozni.
   */
  it.each([
    ['CrowHarvester', HARVESTER_MAX_HP, 4],
    ['Gravecaller', GRAVECALLER_MAX_HP, 3],
    ['Beast', BEAST_MAX_HP, 5],
  ])('%s pontosan %d HP -> %d kardcsapásból hal meg', (name, maxHp, expectedSwings) => {
    expect(Math.ceil(maxHp / SWORD.damage)).toBe(expectedSwings);

    const enemy =
      name === 'Gravecaller'
        ? new Gravecaller(scene as unknown as Phaser.Scene, 140, 100)
        : name === 'Beast'
          ? new Beast(scene as unknown as Phaser.Scene, 140, 100)
          : new CrowHarvester(scene as unknown as Phaser.Scene, 140, 100);

    for (let i = 0; i < expectedSwings; i++) {
      expect(enemy.isDead()).toBe(false);
      swing(scene, player, AttackType.SWORD, [enemy]);
    }

    flushAllDelayedCalls(scene);
    expect(enemy.isDead()).toBe(true);
  });
});

describe('Heavy slash töltése — csak BEÉRKEZETT alapcsapásból', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    player = createPlayer(scene);
  });

  it(`${HEAVY_CHARGE_HITS} beérkezett kardcsapás élesíti a heavyt`, () => {
    const enemy = new Beast(scene as unknown as Phaser.Scene, 140, 100);

    expect(player.isHeavyReady()).toBe(false);
    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) {
      swing(scene, player, AttackType.SWORD, [enemy]);
    }

    expect(player.getHeavyCharge()).toBe(HEAVY_CHARGE_HITS);
    expect(player.isHeavyReady()).toBe(true);
  });

  it('a LEVEGŐBE suhintás nem tölt — a töltés találathoz kötött', () => {
    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) {
      swing(scene, player, AttackType.SWORD, []);
    }

    expect(player.getHeavyCharge()).toBe(0);
    expect(player.isHeavyReady()).toBe(false);
  });

  it('egy TÖBB ellenfelet elérő ív is csak EGY töltetet ad — a swing számít, nem a célpont', () => {
    const a = new CrowHarvester(scene as unknown as Phaser.Scene, 140, 100);
    const b = new CrowHarvester(scene as unknown as Phaser.Scene, 150, 100);

    const { hits } = swing(scene, player, AttackType.SWORD, [a, b]);

    expect(hits).toEqual([true, true]);
    expect(a.getHP()).toBe(HARVESTER_MAX_HP - SWORD.damage);
    expect(b.getHP()).toBe(HARVESTER_MAX_HP - SWORD.damage);
    expect(player.getHeavyCharge()).toBe(1);
  });

  it('a heavy a nagyobb sebzését viszi be, és elhasználja a töltést', () => {
    // A töltés egy MÁSIK lényen gyűlik össze, hogy a heavy célpontja teli HP-val fogadja a
    // csapást. A `takeDamage()` 0-ra vág, tehát egy már megsebzett célponton a HP-KÜLÖNBSÉG
    // nem a heavy sebzését mérné — ezen a teszt első változata el is bukott.
    const dummy = new CrowHarvester(scene as unknown as Phaser.Scene, 300, 100);
    const target = new Beast(scene as unknown as Phaser.Scene, 140, 100);

    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) {
      swing(scene, player, AttackType.SWORD, [dummy]);
    }
    expect(player.isHeavyReady()).toBe(true);

    const { blocked } = swing(scene, player, AttackType.HEAVY, [target]);

    expect(blocked).toBe(false);
    expect(BEAST_MAX_HP - target.getHP()).toBe(HEAVY.damage);
    expect(HEAVY.damage).toBeGreaterThan(SWORD.damage);
    // A heavy NEM finanszírozza önmagát: a saját találata nem tölt vissza.
    expect(player.getHeavyCharge()).toBe(0);
    expect(player.isHeavyReady()).toBe(false);
  });

  it('töltés nélkül a heavy MEG SEM INDUL — se hitbox, se animáció, se hang', () => {
    const enemy = new Beast(scene as unknown as Phaser.Scene, 140, 100);

    expect(player.isHeavyReady()).toBe(false);
    const { blocked, hits } = swing(scene, player, AttackType.HEAVY, [enemy]);

    // A guard a `performAttack()` legelső soraiban áll, tehát a blokkolt heavy EGYETLEN
    // `delayedCall`-t sem ütemez — ez a néma no-op a `Player.ts` dokumentált viselkedése.
    expect(blocked).toBe(true);
    expect(hits).toEqual([]);
    expect(enemy.getHP()).toBe(BEAST_MAX_HP);
  });
});

describe('Fireball → Enemy (Project_plan 24. pont)', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    player = createPlayer(scene);
  });

  /** A scene `'fireball-cast'` handlere: a lövedéket a PÁLYA hozza létre, nem a Player. */
  function castAndSpawn(): Fireball {
    const spawned: Fireball[] = [];
    // `on`, nem `once`: a fake EventEmitter szándékosan minimális (csak `on`/`emit`) — a
    // scene-ek is `on`-nal kötik be a `'fireball-cast'`-ot, tehát ez a hűbb tükrözés is.
    player.on('fireball-cast', (x: number, y: number, direction: number) => {
      spawned.push(new Fireball(scene as unknown as Phaser.Scene, x, y, direction));
    });

    const stepper = createDelayedCallStepper(scene, true);
    player.castFireball();
    stepper.next(); // CAST_DELAY_MS -> 'fireball-cast'

    expect(spawned).toHaveLength(1);
    return spawned[0];
  }

  it('a cast valódi lövedéket szül, ami a konfigurált sebzést viszi be', () => {
    const enemy = new CrowHarvester(scene as unknown as Phaser.Scene, 300, 100);
    const fireball = castAndSpawn();

    expect(resolveFireballHit(fireball, enemy)).toBe(true);
    expect(enemy.getHP()).toBe(HARVESTER_MAX_HP - FIREBALL_CONFIG.damage);
  });

  it('a lövedék becsapódáskor megsemmisül, és nem sebez másodszor', () => {
    const first = new CrowHarvester(scene as unknown as Phaser.Scene, 300, 100);
    const second = new CrowHarvester(scene as unknown as Phaser.Scene, 320, 100);
    const fireball = castAndSpawn();

    resolveFireballHit(fireball, first);

    expect(fireball.hasAlreadyHit()).toBe(true);
    expect(resolveFireballHit(fireball, second)).toBe(false);
    expect(second.getHP()).toBe(HARVESTER_MAX_HP);
  });

  it('a tűzgolyó NEM tölti a heavyt — az kizárólag a kardhoz van kötve', () => {
    const enemy = new Beast(scene as unknown as Phaser.Scene, 300, 100);

    resolveFireballHit(castAndSpawn(), enemy);

    expect(enemy.getHP()).toBeLessThan(BEAST_MAX_HP);
    expect(player.getHeavyCharge()).toBe(0);
  });
});
