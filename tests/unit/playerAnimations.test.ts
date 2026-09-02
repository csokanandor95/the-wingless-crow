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
import Phaser from 'phaser';
import {
  AttackType,
  HEAVY_CHARGE_HITS,
  HEAVY_ECHO_OFFSET_PX,
} from '../../src/combat/Attack';
import {
  animKeyForState,
  ARC_CROP_X,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  HEAVY_WAVE_ALPHA,
  HEAVY_WAVE_TINT,
  PLAYER_ANIMS,
} from '../../src/player/PlayerAnimations';
import {
  createMockScene,
  getBody,
  createDelayedCallStepper,
  flushAllDelayedCalls,
  type MockScene,
  type MockSprite,
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
    [PlayerState.ATTACK, PLAYER_ANIMS.ATTACK],
    [PlayerState.CAST, PLAYER_ANIMS.CAST],
    [PlayerState.HURT, PLAYER_ANIMS.HURT],
    [PlayerState.CLIMB, PLAYER_ANIMS.CLIMB],
    [PlayerState.DEAD, PLAYER_ANIMS.DEAD],
  ])('%s -> %s', (state, expected) => {
    expect(animKeyForState(state)).toBe(expected);
  });

  it('minden state külön animáció-kulcsot kap (nincs véletlen ütközés)', () => {
    const keys = Object.values(PlayerState).map((state) => animKeyForState(state));
    expect(new Set(keys).size).toBe(keys.length);
  });

  // A támadás-típus paraméter CSAK az ATTACK state-en számít, és default-ja van — ezért
  // maradt érvényes a fenti tábla, amikor a heavy slash bekerült.
  it('ATTACK + HEAVY a heavy animációt adja', () => {
    expect(animKeyForState(PlayerState.ATTACK, AttackType.HEAVY)).toBe(
      PLAYER_ANIMS.ATTACK_HEAVY
    );
  });

  it('a két kardtámadás animációja KÜLÖNBÖZIK (más a tempójuk)', () => {
    expect(animKeyForState(PlayerState.ATTACK, AttackType.HEAVY)).not.toBe(
      animKeyForState(PlayerState.ATTACK, AttackType.SWORD)
    );
  });

  it('a támadás-típus a többi state-en nem számít', () => {
    for (const state of Object.values(PlayerState)) {
      if (state === PlayerState.ATTACK) continue;
      expect(animKeyForState(state, AttackType.HEAVY)).toBe(animKeyForState(state));
    }
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

  it('a támadás a saját animációját indítja', () => {
    setGrounded(player, true);

    player.attack();
    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.ATTACK);
  });

  it('egymás utáni támadások ÚJRAINDÍTJÁK a nem loopoló attack animációt', () => {
    // A cooldown (350ms) alig hosszabb az animációnál (330ms), tehát a state-reset és a
    // cooldown lejárta ugyanabba a frame-közbe eshet — ilyenkor a playAnim() guardja
    // "ugyanaz a kulcs" alapon átugorná az újraindítást, és a kard a csapás utolsó
    // frame-jén ragadna. Ezt előzi meg a performAttack() currentAnimKey-nullázása.
    setGrounded(player, true);

    player.attack();
    const playsAfterFirst = anims(player).playedKeys.length;

    flushAllDelayedCalls(scene);
    player.attack();

    expect(anims(player).currentKey).toBe(PLAYER_ANIMS.ATTACK);
    expect(anims(player).playedKeys.length).toBeGreaterThan(playsAfterFirst);
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

/**
 * A heavy slash második hulláma. A látvány trükkje az, hogy UGYANAZT az animációt még
 * egyszer lejátsszuk egy előrébb tolt sprite-on, amiről a lovag testét levágtuk — így a
 * két ív egyetlen, kétszer olyan messzire érő csapásnak olvas.
 */
describe('Heavy slash — az izzó hullámok', () => {
  let scene: MockScene;
  let player: Player;

  /** A Player konstruktora a KÉT heavy-hullámot hozza létre, ebben a sorrendben. */
  function wave(index: number): MockSprite {
    return scene.add.sprite.mock.results[index].value as MockSprite;
  }

  /** A lovag saját ívére fekvő, izzító hullám (offset 0). */
  const near = () => wave(0);
  /** A sávhossznyival előrébb tolt MÁSODIK hullám. */
  const far = () => wave(1);

  function chargeHeavy(): void {
    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) {
      const stepper = createDelayedCallStepper(scene, true);
      player.attack();
      player.registerHit({} as Phaser.GameObjects.GameObject);
      stepper.flushRemaining();
    }
  }

  beforeEach(() => {
    scene = createMockScene();
    player = new Player(scene as unknown as Phaser.Scene, 100, 200);
  });

  it('a konstruktorban létrejönnek, REJTVE, a lovag testéről levágva', () => {
    for (const w of [near(), far()]) {
      expect(w.visible).toBe(false);
      // A vágás a 77. oszloptól indul: onnantól a frame már csak a kard ívét tartalmazza.
      expect(w.cropArgs).toEqual([ARC_CROP_X, 0, FRAME_WIDTH - ARC_CROP_X, FRAME_HEIGHT]);
    }
  });

  it('az alapcsapás NEM mutatja meg őket', () => {
    player.attack();
    expect(near().visible).toBe(false);
    expect(far().visible).toBe(false);
  });

  it('a heavy mindkettőt megmutatja, a HEAVY animációval', () => {
    chargeHeavy();
    player.heavyAttack();

    for (const w of [near(), far()]) {
      expect(w.visible).toBe(true);
      expect(w.playedKeys).toContain(PLAYER_ANIMS.ATTACK_HEAVY);
    }
  });

  it('a KÖZELI hullám a lovag saját ívére fekszik, a TÁVOLI a sávhossznyival előrébb', () => {
    chargeHeavy();
    player.heavyAttack();

    // Az első hullám a player pozícióján ül: ez izzítja fel a lovag SAJÁT ívét (a crop
    // miatt csak az ívet, a testét nem). A második a mért sávhossznyival előrébb.
    expect(near().x).toBe(player.x);
    expect(far().x).toBe(player.x + HEAVY_ECHO_OFFSET_PX);
    expect(far().y).toBe(player.y);
    expect(far().flipX).toBe(false);
  });

  it('balra fordulva a távoli hullám a MÁSIK oldalra kerül', () => {
    player.moveLeft();
    chargeHeavy();
    player.moveLeft();
    player.heavyAttack();

    expect(near().x).toBe(player.x);
    expect(far().x).toBe(player.x - HEAVY_ECHO_OFFSET_PX);
    expect(far().flipX).toBe(true);
  });

  // A tűz-hatás az ADD blendből jön: a világos ív hozzáADÓDIK a háttérhez, tehát világít.
  // MULTIPLY tinttel (a projekt szokásos módja) csak barnább ív lenne — lásd a
  // PlayerAnimations HEAVY_WAVE_TINT kommentjét.
  it('mindkét hullám IZZIK: tűz-tint + ADD blend', () => {
    for (const wave of [near(), far()]) {
      expect(wave.tint).toBe(HEAVY_WAVE_TINT);
      expect(wave.blendMode).toBe(Phaser.BlendModes.ADD);
      expect(wave.alpha).toBe(HEAVY_WAVE_ALPHA);
    }
  });

  it('a támadás végén eltűnnek', () => {
    chargeHeavy();
    const stepper = createDelayedCallStepper(scene, true);
    player.heavyAttack();
    expect(far().visible).toBe(true);

    stepper.flushRemaining();

    expect(near().visible).toBe(false);
    expect(far().visible).toBe(false);
  });

  it('halálkor azonnal eltűnnek — nem lóghatnak a képen a lovag alatt', () => {
    chargeHeavy();
    player.heavyAttack();
    expect(far().visible).toBe(true);

    player.takeDamage(MAX_HP);
    flushAllDelayedCalls(scene);

    expect(player.playerState).toBe(PlayerState.DEAD);
    expect(near().visible).toBe(false);
    expect(far().visible).toBe(false);
  });
});
