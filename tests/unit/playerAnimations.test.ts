// Player animáció-tesztek (Phase 8 – Atmosphere, player sprite iteráció).
//
// Két rétege van:
//   1. `animKeyForState` — pure függvény, Phaser nélkül tesztelhető state -> anim leképezés.
//   2. A Player tényleg elindítja-e a helyes animációt a state-váltásokon, és — ami ennél
//      is fontosabb — NEM indítja-e újra minden frame-ben (a nem loopoló DEAD animáció
//      különben vég nélkül ismételne).
//
// A 'phaser' mockolása ugyanaz a minta, mint a többi teszt fájlban: a vi.mock() factory
// dinamikus import()-tal éri el a megosztott fake-et, mert a hívás a fájl importjai FÖLÉ
// hoisztolódik (statikusan importált binding TDZ hibát adna).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Player, { PlayerState, MAX_HP } from '../../src/player/Player';
import { animKeyForState, PLAYER_ANIMS } from '../../src/player/PlayerAnimations';
import { AttackType } from '../../src/combat/Attack';
import {
  createMockScene,
  getBody,
  flushAllDelayedCalls,
  type MockScene,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

/**
 * A fake Phaser MockSprite AnimationState-je. A Player típusa a VALÓDI Phaser
 * AnimationState-et ígéri, ezért a teszt szűkíti a mock felületére.
 */
interface MockAnims {
  currentKey: string | null;
  playedKeys: string[];
  paused: boolean;
}

function anims(player: Player): MockAnims {
  return player.anims as unknown as MockAnims;
}

function setGrounded(player: Player, grounded: boolean): void {
  getBody(player).blocked.down = grounded;
}

describe('animKeyForState', () => {
  it.each([
    [PlayerState.IDLE, PLAYER_ANIMS.IDLE],
    [PlayerState.RUN, PLAYER_ANIMS.RUN],
    [PlayerState.JUMP, PLAYER_ANIMS.JUMP],
    [PlayerState.FALL, PLAYER_ANIMS.FALL],
    [PlayerState.CAST, PLAYER_ANIMS.CAST],
    [PlayerState.HURT, PLAYER_ANIMS.HURT],
    [PlayerState.CLIMB, PLAYER_ANIMS.CLIMB],
    [PlayerState.DEAD, PLAYER_ANIMS.DEAD],
  ])('%s -> %s', (state, expected) => {
    expect(animKeyForState(state, AttackType.LIGHT)).toBe(expected);
  });

  it('ATTACK a legutóbbi támadás-típus szerint ágazik el', () => {
    expect(animKeyForState(PlayerState.ATTACK, AttackType.LIGHT)).toBe(
      PLAYER_ANIMS.ATTACK_LIGHT
    );
    expect(animKeyForState(PlayerState.ATTACK, AttackType.HEAVY)).toBe(
      PLAYER_ANIMS.ATTACK_HEAVY
    );
  });

  it('minden state külön animáció-kulcsot kap (nincs véletlen ütközés)', () => {
    const keys = Object.values(PlayerState).map((state) =>
      animKeyForState(state, AttackType.LIGHT)
    );
    // Az ATTACK light/heavy párját a fenti teszt fedi; itt a light ágat számoljuk.
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('Player animáció-vezérlés', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    player = new Player(scene as unknown as Phaser.Scene, 100, 100);
  });

  it('a konstruktor az idle animációval indul', () => {
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.IDLE);
  });

  it('a body a rajzolt karakterhez van illesztve, nem a 128x64-es frame-hez', () => {
    // A pontos számok a PlayerAnimations konstansaiban élnek; itt az a lényeg, hogy a
    // Player egyáltalán beállítja őket — enélkül a 128px széles frame lenne az ütköző test.
    expect(getBody(player).setSize).toHaveBeenCalled();
    expect(getBody(player).setOffset).toHaveBeenCalled();
  });

  it('mozgás-state-eken követi az animációt', () => {
    setGrounded(player, true);
    player.moveRight();
    player.updateState();
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.RUN);

    player.jump();
    setGrounded(player, false);
    player.updateState();
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.JUMP);

    // Esés: felfelé irányuló sebesség nélkül a JUMP FALL-ra vált.
    getBody(player).velocity.y = 200;
    player.updateState();
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.FALL);

    setGrounded(player, true);
    player.stopMoving();
    player.updateState();
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.IDLE);
  });

  it('a light és a heavy támadás külön animációt indít', () => {
    setGrounded(player, true);

    player.attackLight();
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.ATTACK_LIGHT);

    flushAllDelayedCalls(scene);
    player.attackHeavy();
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.ATTACK_HEAVY);
  });

  it('a cast a saját animációját indítja', () => {
    setGrounded(player, true);
    player.castFireball();

    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.CAST);
  });

  it('sebzés HURT, halál DEAD animációt indít', () => {
    player.takeDamage(10);
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.HURT);

    player.takeDamage(MAX_HP);
    flushAllDelayedCalls(scene);
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.DEAD);
  });

  it('változatlan state mellett NEM indítja újra az animációt', () => {
    // Ez a playAnim() guardjának regressziós védelme: enélkül a nem loopoló DEAD
    // animáció minden frame-ben újraindulna, azaz vég nélkül ismételne.
    player.takeDamage(MAX_HP);
    flushAllDelayedCalls(scene);

    const playsAfterDeath = anims(player).playedKeys.length;
    player.updateState();
    player.updateState();
    player.updateState();

    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.DEAD);
    expect(anims(player).playedKeys.length).toBe(playsAfterDeath);
  });

  it('respawn után újraindul az idle animáció', () => {
    player.takeDamage(MAX_HP);
    flushAllDelayedCalls(scene);
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.DEAD);

    player.respawn(50, 50);
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.IDLE);
  });

  it('létrán állva megáll a mászás-animáció, mozgás közben pörög', () => {
    const ladder = { centerX: 100, topY: 50, bottomY: 250 };
    player.setLadderContact(ladder);

    player.climb(-1);
    player.updateState();
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.CLIMB);
    expect(anims(player).paused).toBe(false);

    player.climbIdle();
    player.updateState();
    expect(anims(player).paused).toBe(true);

    player.climb(1);
    player.updateState();
    expect(anims(player).paused).toBe(false);
  });
});
