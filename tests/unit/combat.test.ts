// Combat unit tesztek — Project_plan.md §23 "Unit testing / Combat" bontása szerint:
// sword attack damage, fireball damage, cooldown, attack state.
//
// A sebzés-adat ténylegesen a Player attack-hitboxán landol (ATTACK_CONFIGS csak
// statikus konfiguráció), ezért a sebzés/cooldown/attack state teszteket a megosztott
// harness-szel létrehozott Player-en keresztül végezzük — ugyanaz a minta, mint a
// player.test.ts-ben.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import {
  AttackType,
  ATTACK_CONFIGS,
  HEAVY_CHARGE_HITS,
  HEAVY_ECHO_OFFSET_PX,
} from '../../src/combat/Attack';
import Fireball, {
  FIREBALL_CONFIG,
  FIREBALL_MAX_CHARGES,
  FIREBALL_RECHARGE_MS,
} from '../../src/combat/Projectile';
import Player, { PlayerState } from '../../src/player/Player';
import {
  createMockScene,
  getBody,
  createDelayedCallStepper,
  flushLastTween,
  type MockScene,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

describe('ATTACK_CONFIGS invariánsok', () => {
  // Nem a konkrét (hangolható) számokat őrzik, hanem az Attack.ts kommentjében rögzített
  // tervezési szándékot. MINDEN támadás-típusra futnak: egy új AttackType felvétele így
  // nem csúszhat át némán az ellenőrzések mellett.
  const types = Object.values(AttackType);

  it.each(types)('%s: a cooldown nem rövidebb az animációnál', (type) => {
    // Különben nem a cooldownMs lenne a valódi kapu, hanem az ATTACK state-lock
    // (startup + active), és a szám félrevezetővé válna.
    const config = ATTACK_CONFIGS[type];
    expect(config.cooldownMs).toBeGreaterThanOrEqual(
      config.startupDelayMs + config.activeDurationMs
    );
  });

  it.each(types)('%s: a hitbox a player ELŐTT van, nem rajta', (type) => {
    const config = ATTACK_CONFIGS[type];
    expect(config.hitboxOffsetX).toBeGreaterThan(config.hitboxWidth / 2);
  });

  it.each(types)('%s: a támadás sebez', (type) => {
    expect(ATTACK_CONFIGS[type].damage).toBeGreaterThan(0);
  });
});

// A heavy MINDEN száma a kard számaiból + a mért hullám-sávhosszból származik. Ez a blokk
// azt őrzi, hogy ez a levezetés érvényben marad, ha valaki később "csak egy kicsit"
// hozzányúl az egyik értékhez.
describe('Heavy slash — levezetés-invariánsok', () => {
  const sword = ATTACK_CONFIGS[AttackType.SWORD];
  const heavy = ATTACK_CONFIGS[AttackType.HEAVY];

  it('a hitbox a hullám mért sávhosszával nyúlik meg', () => {
    expect(heavy.hitboxWidth).toBe(sword.hitboxWidth + HEAVY_ECHO_OFFSET_PX);
    expect(heavy.hitboxOffsetX).toBe(sword.hitboxOffsetX + HEAVY_ECHO_OFFSET_PX / 2);
  });

  it('a hitbox KÖZELI éle változatlan — a heavy előrefelé nyúlik, nem a player köré', () => {
    const swordNear = sword.hitboxOffsetX - sword.hitboxWidth / 2;
    const heavyNear = heavy.hitboxOffsetX - heavy.hitboxWidth / 2;

    expect(heavyNear).toBe(swordNear);
  });

  it('a hitbox behúzása a látványhoz képest MINDKÉT csapásnál azonos', () => {
    // A kard íve +63-ig ér (mért), a heavyé ennél HEAVY_ECHO_OFFSET_PX-szel tovább —
    // a hitbox pedig mindkettőnél ugyanannyival marad a látvány mögött.
    const SWORD_ARC_REACH_PX = 63;
    const swordInset = SWORD_ARC_REACH_PX - (sword.hitboxOffsetX + sword.hitboxWidth / 2);
    const heavyInset =
      SWORD_ARC_REACH_PX + HEAVY_ECHO_OFFSET_PX - (heavy.hitboxOffsetX + heavy.hitboxWidth / 2);

    expect(heavyInset).toBe(swordInset);
  });

  it('a heavy NEM teszi erősebbé a playert: a ciklus dps-e nem több a tiszta kardénál', () => {
    // A heavy HEAVY_CHARGE_HITS beérkezett alapcsapásból tölt, tehát a legjobb eset
    // 3 kard + 1 heavy. Ha ez a ciklus többet sebezne időegység alatt, mint a sima
    // kardozás, a "nem erősebb, csak változatosabb" szándék sérülne.
    const cycleDamage = HEAVY_CHARGE_HITS * sword.damage + heavy.damage;
    const cycleMs = HEAVY_CHARGE_HITS * sword.cooldownMs + heavy.cooldownMs;

    expect(cycleDamage / cycleMs).toBeLessThanOrEqual(sword.damage / sword.cooldownMs);
  });

  it('a heavy windupja hosszabb — a nagyobb hatótávnak ára van', () => {
    expect(heavy.startupDelayMs).toBeGreaterThan(sword.startupDelayMs);
  });
});

describe('Player attack — sebzés, hitbox, state, cooldown', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    player = new Player(scene as unknown as Phaser.Scene, 100, 200);
  });

  it('attack(): ATTACK state, majd a helyes sebzés a hitboxon a startup után', () => {
    const config = ATTACK_CONFIGS[AttackType.SWORD];
    const stepper = createDelayedCallStepper(scene);

    player.attack();
    expect(player.playerState).toBe(PlayerState.ATTACK);

    stepper.next(); // startupDelayMs elteltével a hitbox engedélyezve
    expect(player.getAttackHitbox().getData('damage')).toBe(config.damage);

    stepper.next(); // activeDurationMs elteltével a hitbox letiltva
    stepper.next(); // startupDelayMs + activeDurationMs elteltével a state visszaáll
    expect(player.playerState).not.toBe(PlayerState.ATTACK);
  });

  it('cooldown: gyors egymás utáni attack() a másodikat blokkolja', () => {
    player.attack();
    const callsAfterFirst = scene.time.delayedCall.mock.calls.length;

    player.attack(); // még cooldown alatt -> no-op
    expect(scene.time.delayedCall.mock.calls.length).toBe(callsAfterFirst);
  });

  it('cooldown letelte után az attack() ismét sikeres', () => {
    const stepper = createDelayedCallStepper(scene);

    player.attack();
    stepper.next(); // startup
    stepper.next(); // active duration vége
    stepper.next(); // startup+active state reset
    stepper.next(); // cooldownMs -> canAttack = true

    const callsBefore = scene.time.delayedCall.mock.calls.length;
    player.attack();

    expect(scene.time.delayedCall.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(player.playerState).toBe(PlayerState.ATTACK);
  });

  // A suhintás hangját a scene játssza le egy 'sword-swing' eventre (mint a 'fireball-cast'-ot),
  // hogy a Player ne függjön az AudioManagertől.
  describe("'sword-swing' event (a suhintás SFX kiváltója)", () => {
    it('sikeres attack() pontosan egyszer emittál', () => {
      const onSwing = vi.fn();
      player.on('sword-swing', onSwing);

      player.attack();

      expect(onSwing).toHaveBeenCalledTimes(1);
    });

    // A hang a cooldown-guard MÖGÖTT van: gombnyomkodással nem lehet hangspamet csinálni
    // olyan csapásokból, amiknek hitboxa sincs.
    it('a cooldownnal blokkolt attack() NEM emittál', () => {
      const onSwing = vi.fn();
      player.on('sword-swing', onSwing);

      player.attack();
      player.attack(); // még cooldown alatt -> no-op

      expect(onSwing).toHaveBeenCalledTimes(1);
    });
  });
});

// --- Heavy slash + tűzgolyó töltetek ----------------------------------------

/** Egy azonosítható, üres célpont — a Player csak a Set-kulcsként használja. */
const makeTarget = (): Phaser.GameObjects.GameObject => ({}) as Phaser.GameObjects.GameObject;

/**
 * Egy TELJES alapcsapás-ciklus, beérkezett találattal: ez tölti a heavy-t. A stepper
 * `skipExisting`-gel indul, hogy a korábbi ciklusok már lefuttatott hívásait ne süsse el
 * újra, a `flushRemaining()` pedig a cooldownt is lejáratja — így a következő csapás mehet.
 */
function landSwordHit(player: Player, scene: MockScene): void {
  const stepper = createDelayedCallStepper(scene, true);
  player.attack();
  player.registerHit(makeTarget());
  stepper.flushRemaining();
}

describe('Heavy slash — töltés és elsütés', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    player = new Player(scene as unknown as Phaser.Scene, 100, 200);
  });

  it('friss playeren a heavy NINCS feltöltve', () => {
    expect(player.getHeavyCharge()).toBe(0);
    expect(player.isHeavyReady()).toBe(false);
    expect(player.getHeavyChargeMax()).toBe(HEAVY_CHARGE_HITS);
  });

  it('töltés nélkül a heavyAttack() no-op: se state, se időzítő, se hang', () => {
    const onHeavy = vi.fn();
    player.on('heavy-swing', onHeavy);
    const callsBefore = scene.time.delayedCall.mock.calls.length;

    player.heavyAttack();

    expect(player.playerState).not.toBe(PlayerState.ATTACK);
    expect(scene.time.delayedCall.mock.calls.length).toBe(callsBefore);
    expect(onHeavy).not.toHaveBeenCalled();
  });

  it('minden BEÉRKEZETT alapcsapás egy töltetet ad, a küszöbön elérhetővé válik', () => {
    for (let i = 1; i <= HEAVY_CHARGE_HITS; i++) {
      landSwordHit(player, scene);
      expect(player.getHeavyCharge()).toBe(i);
    }

    expect(player.isHeavyReady()).toBe(true);
  });

  it('a töltet csapásonként EGYSZER jár, akkor is, ha az ív több ellenfelet ér el', () => {
    const stepper = createDelayedCallStepper(scene, true);
    player.attack();
    player.registerHit(makeTarget());
    player.registerHit(makeTarget());
    player.registerHit(makeTarget());
    stepper.flushRemaining();

    expect(player.getHeavyCharge()).toBe(1);
  });

  it('a töltés nem lép a maximum fölé', () => {
    for (let i = 0; i < HEAVY_CHARGE_HITS + 3; i++) landSwordHit(player, scene);

    expect(player.getHeavyCharge()).toBe(HEAVY_CHARGE_HITS);
  });

  it('feltöltve a heavyAttack() elindul, egyszer emittál, és nullázza a töltést', () => {
    const onHeavy = vi.fn();
    const onSword = vi.fn();
    player.on('heavy-swing', onHeavy);
    player.on('sword-swing', onSword);

    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) landSwordHit(player, scene);
    onSword.mockClear();

    player.heavyAttack();

    expect(player.playerState).toBe(PlayerState.ATTACK);
    expect(onHeavy).toHaveBeenCalledTimes(1);
    // A heavy SAJÁT eventet ad, nem az alapcsapásét — a hang így lehet más.
    expect(onSword).not.toHaveBeenCalled();
    expect(player.getHeavyCharge()).toBe(0);
  });

  it('a heavy a SAJÁT sebzését és hitboxát nyitja ki', () => {
    const heavy = ATTACK_CONFIGS[AttackType.HEAVY];
    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) landSwordHit(player, scene);

    const stepper = createDelayedCallStepper(scene, true);
    player.heavyAttack();
    stepper.next(); // startupDelayMs -> hitbox

    expect(player.getAttackHitbox().getData('damage')).toBe(heavy.damage);
    const hitboxBody = getBody(player.getAttackHitbox() as unknown as { body: unknown });
    expect(hitboxBody.setSize).toHaveBeenCalledWith(heavy.hitboxWidth, heavy.hitboxHeight);
  });

  // Enélkül a heavy önmagát finanszírozná: egy találat = egy új töltet, és a nagy csapás
  // soha nem fogyna el.
  it('a heavy SAJÁT találata NEM tölt újra', () => {
    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) landSwordHit(player, scene);

    player.heavyAttack();
    player.registerHit(makeTarget());

    expect(player.getHeavyCharge()).toBe(0);
  });

  it('respawn() nullázza a felgyűjtött töltést', () => {
    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) landSwordHit(player, scene);
    expect(player.isHeavyReady()).toBe(true);

    player.respawn(0, 0);

    expect(player.getHeavyCharge()).toBe(0);
    expect(player.isHeavyReady()).toBe(false);
  });
});

describe('Tűzgolyó töltetek — független visszatöltés', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    scene.time.now = 0;
    player = new Player(scene as unknown as Phaser.Scene, 100, 200);
  });

  /** Egy teljes cast: a CAST-lock és a lövések közti ritmus-cooldown is lejár. */
  function completeCast(): void {
    const stepper = createDelayedCallStepper(scene, true);
    player.castFireball();
    stepper.flushRemaining();
  }

  it('teli tárral indul', () => {
    expect(player.getFireballCharges()).toBe(FIREBALL_MAX_CHARGES);
    expect(player.getFireballMaxCharges()).toBe(FIREBALL_MAX_CHARGES);
    // Nincs mit tölteni -> a HUD-nak nem kell külön esetet kezelnie.
    expect(player.getFireballRechargeProgress()).toBe(1);
  });

  it('minden cast egy töltetet fogyaszt', () => {
    completeCast();
    expect(player.getFireballCharges()).toBe(FIREBALL_MAX_CHARGES - 1);

    completeCast();
    expect(player.getFireballCharges()).toBe(0);
  });

  it('üres tárral a cast no-op — a ritmus-cooldown lejárta UTÁN is', () => {
    const onCast = vi.fn();
    player.on('fireball-cast', onCast);

    for (let i = 0; i < FIREBALL_MAX_CHARGES; i++) completeCast();
    onCast.mockClear();

    const callsBefore = scene.time.delayedCall.mock.calls.length;
    player.castFireball();

    expect(scene.time.delayedCall.mock.calls.length).toBe(callsBefore);
    expect(player.playerState).not.toBe(PlayerState.CAST);
    expect(onCast).not.toHaveBeenCalled();
  });

  // EZ a rendszer lényege: a töltetek nem SORBAN töltődnek vissza, hanem mindegyik a
  // SAJÁT elköltésétől számítva. Egy lövés, várakozás, még egy -> eltolt visszatérés.
  it('a töltetek egymástól FÜGGETLENÜL térnek vissza', () => {
    completeCast(); // t = 0     -> visszatér 3000-nél

    scene.time.now = 1000;
    completeCast(); // t = 1000  -> visszatér 4000-nél
    expect(player.getFireballCharges()).toBe(0);

    scene.time.now = FIREBALL_RECHARGE_MS - 1;
    player.updateState();
    expect(player.getFireballCharges()).toBe(0);

    scene.time.now = FIREBALL_RECHARGE_MS;
    player.updateState();
    expect(player.getFireballCharges()).toBe(1);

    // A második töltet MÉG nincs vissza: a késleltetés pontosan az elköltések különbsége.
    scene.time.now = FIREBALL_RECHARGE_MS + 999;
    player.updateState();
    expect(player.getFireballCharges()).toBe(1);

    scene.time.now = FIREBALL_RECHARGE_MS + 1000;
    player.updateState();
    expect(player.getFireballCharges()).toBe(FIREBALL_MAX_CHARGES);
  });

  it('a sorozatban kilőtt töltetek együtt térnek vissza', () => {
    completeCast();
    completeCast();

    scene.time.now = FIREBALL_RECHARGE_MS;
    player.updateState();

    expect(player.getFireballCharges()).toBe(FIREBALL_MAX_CHARGES);
  });

  // A castFireball() maga is lejáratja a sort, tehát nem a hívási sorrenden múlik, hogy a
  // frissen visszatért töltet elérhető-e.
  it('a visszatért töltet updateState() nélkül is kilőhető', () => {
    for (let i = 0; i < FIREBALL_MAX_CHARGES; i++) completeCast();

    scene.time.now = FIREBALL_RECHARGE_MS;
    completeCast();

    expect(player.playerState).not.toBe(PlayerState.CAST); // a flush már visszaállította
    expect(player.getFireballCharges()).toBe(FIREBALL_MAX_CHARGES - 1);
  });

  it('a visszatöltés állapota 0-ról 1-re nő', () => {
    completeCast();
    expect(player.getFireballRechargeProgress()).toBeCloseTo(0);

    scene.time.now = FIREBALL_RECHARGE_MS / 2;
    expect(player.getFireballRechargeProgress()).toBeCloseTo(0.5);

    scene.time.now = FIREBALL_RECHARGE_MS;
    player.updateState();
    expect(player.getFireballRechargeProgress()).toBe(1);
  });

  it('respawn() teli tárral éleszt újra', () => {
    for (let i = 0; i < FIREBALL_MAX_CHARGES; i++) completeCast();
    expect(player.getFireballCharges()).toBe(0);

    player.respawn(0, 0);

    expect(player.getFireballCharges()).toBe(FIREBALL_MAX_CHARGES);
  });
});

describe('Fireball damage', () => {
  let scene: MockScene;
  let fireball: Fireball;

  beforeEach(() => {
    scene = createMockScene();
    fireball = new Fireball(scene as unknown as Phaser.Scene, 100, 200, 1);
  });

  it('getDamage() a FIREBALL_CONFIG.damage-t adja vissza', () => {
    expect(fireball.getDamage()).toBe(FIREBALL_CONFIG.damage);
  });

  it('hasAlreadyHit() false induláskor, true onImpact() után', () => {
    expect(fireball.hasAlreadyHit()).toBe(false);
    fireball.onImpact();
    expect(fireball.hasAlreadyHit()).toBe(true);
  });

  it('onImpact() idempotens: kétszeri hívás csak egy tweent indít', () => {
    fireball.onImpact();
    fireball.onImpact();

    expect(scene.tweens.add).toHaveBeenCalledTimes(1);
  });

  it('irány szerinti sebesség és flipX', () => {
    const leftScene = createMockScene();
    const leftFireball = new Fireball(leftScene as unknown as Phaser.Scene, 0, 0, -1);

    expect(getBody(leftFireball).velocity.x).toBe(-FIREBALL_CONFIG.speed);
    expect(leftFireball.flipX).toBe(true);
    expect(getBody(fireball).velocity.x).toBe(FIREBALL_CONFIG.speed);
    expect(fireball.flipX).toBe(false);
  });

  it('a tween onComplete lefutása után a fireball elpusztul', () => {
    fireball.onImpact();
    flushLastTween(scene);

    expect(fireball.active).toBe(false);
  });
});

// A boss lövedéke ugyanez az osztály, csak felülírt konfigurációval — ez a blokk védi a
// visszafelé-kompatibilitást (az options nélküli hívás viselkedése nem változhat).
describe('Fireball — ProjectileOptions felülírás', () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it('az options felülírja a damage-et és a speed-et', () => {
    const projectile = new Fireball(scene as unknown as Phaser.Scene, 0, 0, 1, {
      texture: 'boss-projectile-placeholder',
      damage: 42,
      speed: 260,
      size: 20,
    });

    expect(projectile.getDamage()).toBe(42);
    expect(getBody(projectile).velocity.x).toBe(260);
    expect(getBody(projectile).setSize).toHaveBeenCalledWith(20, 20);
  });

  it('hiányzó options esetén a FIREBALL_CONFIG default-jai érvényesek', () => {
    const projectile = new Fireball(scene as unknown as Phaser.Scene, 0, 0, 1, {});

    expect(projectile.getDamage()).toBe(FIREBALL_CONFIG.damage);
    expect(getBody(projectile).velocity.x).toBe(FIREBALL_CONFIG.speed);
    expect(getBody(projectile).setSize).toHaveBeenCalledWith(16, 16);
  });
});
