// Combat unit tesztek — Project_plan.md §23 "Unit testing / Combat" bontása szerint:
// light attack damage, heavy attack damage, fireball damage, cooldown, attack state.
//
// A sebzés-adat ténylegesen a Player attack-hitboxán landol (ATTACK_CONFIGS csak
// statikus konfiguráció), ezért a light/heavy/cooldown/attack state teszteket a
// megosztott harness-szel létrehozott Player-en keresztül végezzük — ugyanaz a minta,
// mint a player.test.ts-ben.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import { AttackType, ATTACK_CONFIGS } from '../../src/combat/Attack';
import Fireball, { FIREBALL_CONFIG } from '../../src/combat/Projectile';
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
  // Attack.ts saját kommentje szerint: "Light Attack: gyorsabb, kisebb sebzés.
  // Heavy Attack: lassabb, nagyobb sebzés." — ez a tervezési szándékot ellenőrzi,
  // nem a konkrét (hangolható) számokat, hogy egy véletlen felcserélést elkapjon.
  const light = ATTACK_CONFIGS[AttackType.LIGHT];
  const heavy = ATTACK_CONFIGS[AttackType.HEAVY];

  it('a Heavy nagyobb sebzést okoz, mint a Light', () => {
    expect(heavy.damage).toBeGreaterThan(light.damage);
  });

  it('a Heavy lassabb: hosszabb cooldown és startup delay', () => {
    expect(heavy.cooldownMs).toBeGreaterThan(light.cooldownMs);
    expect(heavy.startupDelayMs).toBeGreaterThan(light.startupDelayMs);
  });
});

describe('Player attack — sebzés, hitbox, state, cooldown', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    player = new Player(scene as unknown as Phaser.Scene, 100, 200);
  });

  it.each([
    ['attackLight', AttackType.LIGHT] as const,
    ['attackHeavy', AttackType.HEAVY] as const,
  ])('%s: ATTACK state, majd a helyes sebzés a hitboxon a startup után', (method, type) => {
    const config = ATTACK_CONFIGS[type];
    const stepper = createDelayedCallStepper(scene);

    player[method]();
    expect(player.playerState).toBe(PlayerState.ATTACK);

    stepper.next(); // startupDelayMs elteltével a hitbox engedélyezve
    expect(player.getAttackHitbox().getData('damage')).toBe(config.damage);

    stepper.next(); // activeDurationMs elteltével a hitbox letiltva
    stepper.next(); // startupDelayMs + activeDurationMs elteltével a state visszaáll
    expect(player.playerState).not.toBe(PlayerState.ATTACK);
  });

  it('cooldown: gyors egymás utáni attackLight() a másodikat blokkolja', () => {
    player.attackLight();
    const callsAfterFirst = scene.time.delayedCall.mock.calls.length;

    player.attackLight(); // még cooldown alatt -> no-op
    expect(scene.time.delayedCall.mock.calls.length).toBe(callsAfterFirst);
  });

  it('cooldown letelte után az attackLight() ismét sikeres', () => {
    const stepper = createDelayedCallStepper(scene);

    player.attackLight();
    stepper.next(); // startup
    stepper.next(); // active duration vége
    stepper.next(); // startup+active state reset
    stepper.next(); // cooldownMs -> canAttack = true

    const callsBefore = scene.time.delayedCall.mock.calls.length;
    player.attackLight();

    expect(scene.time.delayedCall.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(player.playerState).toBe(PlayerState.ATTACK);
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
