// Boss (The Grafted Wing-Breaker) animáció-tesztek — Phase 8, boss sprite iteráció.
//
// Két blokk hordozza itt a súlyt:
//
// 1. FACING-KOMPENZÁCIÓ. Ez a sheet natívan BALRA néz (a CrowHarvester jobbra), a karakter
//    pedig a 140px-es frame JOBB oldalán ül (közepe x=106) — egy sima setFlipX() 72px-t
//    ugrasztaná oldalra. A kompenzációt a megosztott systems/SpriteFacing.ts végzi; ez a
//    teszt azt őrzi, hogy a SCALE-lel együtt is pontosan a sprite.x-en marad a test.
//
// 2. LEVEZETETT KONSTANSOK. A SLASH_RANGE és a támadás-időzítések nem szabadon hangolt
//    számok, hanem az animációs modul mért értékeiből származnak. Ha valaki átírja az egyiket
//    a másik nélkül, itt bukik ki.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import GraftedWingBreaker, {
  BossState,
  CHARGE_MIN_RANGE,
  MAX_HP,
  PHASE2_HP_RATIO,
  PROJECTILE_MIN_RANGE,
  PROJECTILE_STARTUP_MS,
  SLASH_RANGE,
  SLASH_STARTUP_MS,
} from '../../src/bosses/GraftedWingBreaker';
import {
  animKeyForState,
  ATTACK_SLOT_MS,
  BLADE_REACH_PX,
  BODY_WIDTH,
  CAST_RELEASE_MS,
  FRAME_WIDTH,
  SCALE,
  SLASH_FRAMES,
  SLASH_STRIKE_FRAME,
  SLASH_WINDUP_MS,
  WING_BREAKER_ANIMS,
} from '../../src/bosses/GraftedWingBreakerAnimations';
import Player from '../../src/player/Player';
import {
  createMockScene,
  getBody,
  createDelayedCallStepper,
  type MockScene,
  type MockTweenConfig,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

const BOSS_X = 400;
const BOSS_Y = 364;

/** Se slash-t, se lövedéket, se spellt nem vált ki -> tiszta APPROACH (és fordulás). */
const APPROACH_DISTANCE = (SLASH_RANGE + PROJECTILE_MIN_RANGE) / 2;

const DAMAGE_TO_PHASE2 = MAX_HP * PHASE2_HP_RATIO;

interface MockAnims {
  currentKey: string | null;
  playedKeys: string[];
}

function anims(sprite: GraftedWingBreaker): MockAnims {
  return sprite.anims as unknown as MockAnims;
}

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

/**
 * A physics body VILÁGKOORDINÁTÁS közepe. A Phaser a body pozícióját
 * `x + scaleX * (offset.x - displayOriginX)`-ként számolja (Body.updateFromGameObject),
 * a displayOriginX pedig `originX * frameWidth` — vagyis a skála egyenletes szorzó.
 * Ez a képlet teszi mérhetővé, hogy a fordulás tényleg nem mozdítja el a testet.
 */
function bodyCenterX(sprite: GraftedWingBreaker): number {
  const setOffset = getBody(sprite).setOffset as unknown as {
    mock: { calls: Array<[number, number]> };
  };
  const calls = setOffset.mock.calls;
  const offsetX = calls[calls.length - 1][0];
  const withOrigin = sprite as unknown as { originX: number };
  return sprite.x + SCALE * (offsetX - withOrigin.originX * FRAME_WIDTH + BODY_WIDTH / 2);
}

describe('animKeyForState', () => {
  it('DORMANT és a mozdulatlan APPROACH idle, a mozgó APPROACH walk', () => {
    expect(animKeyForState(BossState.DORMANT, null, false)).toBe(WING_BREAKER_ANIMS.IDLE);
    // A belépő alatt akkor sem sétál, ha a velocity valamiért nem nulla.
    expect(animKeyForState(BossState.DORMANT, null, true)).toBe(WING_BREAKER_ANIMS.IDLE);
    expect(animKeyForState(BossState.APPROACH, null, true)).toBe(WING_BREAKER_ANIMS.WALK);
    expect(animKeyForState(BossState.APPROACH, null, false)).toBe(WING_BREAKER_ANIMS.IDLE);
  });

  it('a PROJECTILE és a SPELL UGYANAZT a cast animációt játssza', () => {
    // Szándékos: a kettőt a VILÁGBAN megjelenő effekt különbözteti meg (repülő lövedék
    // vs. a player fölé idézett árny-oszlop), nem a boss testtartása.
    expect(animKeyForState(BossState.PROJECTILE, null, false)).toBe(WING_BREAKER_ANIMS.CAST);
    expect(animKeyForState(BossState.SPELL, null, false)).toBe(WING_BREAKER_ANIMS.CAST);
  });

  it('a charge windup és a dash külön kulcs', () => {
    expect(animKeyForState(BossState.CHARGE_WINDUP, null, false)).toBe(
      WING_BREAKER_ANIMS.CHARGE_WINDUP
    );
    expect(animKeyForState(BossState.CHARGE, null, true)).toBe(WING_BREAKER_ANIMS.DASH);
  });

  it('a COOLDOWN az ELŐZŐ AKCIÓ animációját folytatja', () => {
    // Ez teszi lehetővé, hogy a playAnim() guardja mellett a hosszabb támadás-animáció
    // egyben fusson végig a rövidebb akció-state és a rákövetkező COOLDOWN párosán.
    expect(animKeyForState(BossState.COOLDOWN, 'SLASH', false)).toBe(WING_BREAKER_ANIMS.SLASH);
    expect(animKeyForState(BossState.COOLDOWN, 'PROJECTILE', false)).toBe(
      WING_BREAKER_ANIMS.CAST
    );
    expect(animKeyForState(BossState.COOLDOWN, 'SPELL', false)).toBe(WING_BREAKER_ANIMS.CAST);
    // Charge után nincs mit folytatni: kifújja magát.
    expect(animKeyForState(BossState.COOLDOWN, 'CHARGE', false)).toBe(WING_BREAKER_ANIMS.IDLE);
    expect(animKeyForState(BossState.COOLDOWN, null, false)).toBe(WING_BREAKER_ANIMS.IDLE);
  });

  it('DEAD a death animációt adja', () => {
    expect(animKeyForState(BossState.DEAD, 'SLASH', false)).toBe(WING_BREAKER_ANIMS.DEATH);
  });
});

describe('levezetett konstansok', () => {
  it('a SLASH_RANGE a kasza tényleges nyúlása a skálával', () => {
    expect(SLASH_RANGE).toBe(BLADE_REACH_PX * SCALE);
  });

  it('a támadás-időzítések az animációból jönnek, nem beégetett számok', () => {
    expect(SLASH_STARTUP_MS).toBe(SLASH_WINDUP_MS);
    expect(PROJECTILE_STARTUP_MS).toBe(CAST_RELEASE_MS);
  });

  it('a SLASH_WINDUP_MS a frame-listából származik, a csapás frame-jének indexéből', () => {
    // A windup a windup-kockák ISMÉTLÉSÉBŐL hosszabbodik, nem a slot-idő emeléséből — így a
    // csapás UTÁNI kikövetkezés tempója változatlan marad. Ha valaki átírja a listát, a
    // gameplay-időzítés magától követi; ha viszont a strike-frame kiesne belőle, itt bukik.
    expect(SLASH_FRAMES).toContain(SLASH_STRIKE_FRAME);
    expect(SLASH_WINDUP_MS).toBe(SLASH_FRAMES.indexOf(SLASH_STRIKE_FRAME) * ATTACK_SLOT_MS);
    // A csapás előtti szakasz CSAK windup-kockákból áll (f16-19), a strike utáni rész pedig
    // szigorúan növekvő — különben a mozdulat nem olvasna "felhúz ... CSATT"-ként.
    const strikeIndex = SLASH_FRAMES.indexOf(SLASH_STRIKE_FRAME);
    expect(SLASH_FRAMES.slice(0, strikeIndex).every((f) => f >= 16 && f < SLASH_STRIKE_FRAME))
      .toBe(true);
  });
});

describe('GraftedWingBreaker animáció-vezérlés', () => {
  let scene: MockScene;
  let boss: GraftedWingBreaker;

  beforeEach(() => {
    scene = createMockScene();
    boss = new GraftedWingBreaker(scene as unknown as Phaser.Scene, BOSS_X, BOSS_Y);
    boss.activate();
  });

  describe('facing-kompenzáció', () => {
    it('a test világkoordinátás közepe forduláskor NEM mozdul', () => {
      boss.update(createPlayerAt(scene, BOSS_X - APPROACH_DISTANCE, BOSS_Y));
      const facingLeft = bodyCenterX(boss);

      boss.update(createPlayerAt(scene, BOSS_X + APPROACH_DISTANCE, BOSS_Y));
      const facingRight = bodyCenterX(boss);

      expect(facingLeft).toBeCloseTo(BOSS_X, 5);
      expect(facingRight).toBeCloseTo(BOSS_X, 5);
    });

    it('az origin és a body offset EGYÜTT tükröződik', () => {
      const withOrigin = boss as unknown as { originX: number };

      boss.update(createPlayerAt(scene, BOSS_X - APPROACH_DISTANCE, BOSS_Y));
      const originLeft = withOrigin.originX;

      boss.update(createPlayerAt(scene, BOSS_X + APPROACH_DISTANCE, BOSS_Y));
      const originRight = withOrigin.originX;

      expect(originLeft + originRight).toBeCloseTo(1, 5);
    });

    it('a sheet natívan BALRA néz: a JOBBRA fordulás igényel flipX-et', () => {
      boss.update(createPlayerAt(scene, BOSS_X - APPROACH_DISTANCE, BOSS_Y));
      expect(boss.flipX).toBe(false);

      boss.update(createPlayerAt(scene, BOSS_X + APPROACH_DISTANCE, BOSS_Y));
      expect(boss.flipX).toBe(true);
    });
  });

  it('a belépő (DORMANT) alatt idle-t játszik', () => {
    const dormant = new GraftedWingBreaker(scene as unknown as Phaser.Scene, BOSS_X, BOSS_Y);
    expect(anims(dormant).currentKey).toBe(WING_BREAKER_ANIMS.IDLE);
  });

  it('közelítés közben walk, megállva idle', () => {
    boss.update(createPlayerAt(scene, BOSS_X + APPROACH_DISTANCE, BOSS_Y));
    expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.WALK);

    // Deadzone: vízszintesen egy vonalban, de elérhetetlen -> megáll.
    boss.update(createPlayerAt(scene, BOSS_X + 2, BOSS_Y - APPROACH_DISTANCE));
    expect(getBody(boss).velocity.x).toBe(0);
    expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.IDLE);
  });

  it('a slash animáció a COOLDOWN alatt NEM indul újra', () => {
    const near = createPlayerAt(scene, BOSS_X + SLASH_RANGE - 10, BOSS_Y);
    const stepper = createDelayedCallStepper(scene);

    boss.update(near);
    expect(boss.bossState).toBe(BossState.SLASH);
    expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.SLASH);

    const playsAfterStart = anims(boss).playedKeys.length;
    stepper.next(); // SLASH_STARTUP_MS -> találat + COOLDOWN
    expect(boss.bossState).toBe(BossState.COOLDOWN);
    boss.update(near);

    expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.SLASH);
    expect(anims(boss).playedKeys.length).toBe(playsAfterStart);
  });

  it('két egymást követő slash MINDKÉTSZER újraindítja az animációt', () => {
    // Regresszió: a COOLDOWN ugyanarra az anim kulcsra képződik le, mint a SLASH, és a
    // cooldown lejárta után a boss már a következő update()-ben újra csaphat — közben
    // egyetlen frame sem jut a walk/idle-re. A playAnim() guardja emiatt kihagyná a
    // második lejátszást, és a csapás a befagyott utolsó frame-en állna.
    const near = createPlayerAt(scene, BOSS_X + SLASH_RANGE - 10, BOSS_Y);
    const stepper = createDelayedCallStepper(scene);

    boss.update(near);
    const playsAfterFirst = anims(boss).playedKeys.length;

    stepper.next(); // SLASH_STARTUP_MS -> találat + COOLDOWN
    stepper.flushRemaining(); // player HURT-clear + ACTION_COOLDOWN_MS -> APPROACH
    expect(boss.bossState).toBe(BossState.APPROACH);

    boss.update(near); // azonnal új slash, walk/idle frame nélkül

    expect(boss.bossState).toBe(BossState.SLASH);
    expect(anims(boss).playedKeys.length).toBe(playsAfterFirst + 1);
  });

  describe('charge', () => {
    const chargePlayerX = BOSS_X + CHARGE_MIN_RANGE + 80;

    function enterCharge(): { player: Player; stepper: ReturnType<typeof createDelayedCallStepper> } {
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, chargePlayerX, BOSS_Y);
      // A stepper átugorja a takeDamage() hit-villanás callbackjét.
      const stepper = createDelayedCallStepper(scene, true);

      boss.update(player);
      stepper.next(); // CHARGE_WINDUP_MS -> beginCharge()
      return { player, stepper };
    }

    it('a windup és a dash külön animáció, és a dash a rohammal indul', () => {
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, chargePlayerX, BOSS_Y);
      const stepper = createDelayedCallStepper(scene, true);

      boss.update(player);
      expect(boss.bossState).toBe(BossState.CHARGE_WINDUP);
      expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.CHARGE_WINDUP);

      stepper.next();
      expect(boss.bossState).toBe(BossState.CHARGE);
      expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.DASH);
    });

    it('falnak ütközve stagger (hurt) animáció megy, nem idle', () => {
      const { player } = enterCharge();

      getBody(boss).blocked.right = true;
      boss.update(player);

      expect(boss.bossState).toBe(BossState.COOLDOWN);
      expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.HURT);

      // A stagger a következő frame-eken sem íródik felül az idle-lel.
      boss.update(player);
      expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.HURT);
    });

    it('a charge végén a piros telegraph-tint eltűnik', () => {
      const { player } = enterCharge();
      const tinted = boss as unknown as { tintColor: number | null };
      expect(tinted.tintColor).not.toBeNull(); // roham közben még piros

      getBody(boss).blocked.right = true;
      boss.update(player);

      expect(tinted.tintColor).toBeNull();
    });
  });

  describe('találat-visszajelzés', () => {
    it('a hit-villanás FILL módú (a MULTIPLY fehér no-op lenne)', () => {
      const tinted = boss as unknown as { tintColor: number | null; tintMode: number };

      boss.takeDamage(10);

      expect(tinted.tintColor).toBe(0xffffff);
      // Phaser 4: a setTintFill() törölve van, a sziluett-villanás setTintMode(FILL)-lel megy.
      expect(tinted.tintMode).toBe(1);
    });

    it('a találat NEM törli a charge piros telegraph-ját', () => {
      boss.takeDamage(DAMAGE_TO_PHASE2);
      const player = createPlayerAt(scene, BOSS_X + CHARGE_MIN_RANGE + 80, BOSS_Y);
      boss.update(player);
      expect(boss.bossState).toBe(BossState.CHARGE_WINDUP);

      const stepper = createDelayedCallStepper(scene, true);
      boss.takeDamage(10);
      stepper.next(); // HIT_FLASH_MS -> a tint visszaállítása

      const tinted = boss as unknown as { tintColor: number | null; tintMode: number };
      expect(tinted.tintColor).toBe(0xff2222);
      expect(tinted.tintMode).toBe(0); // vissza MULTIPLY-ra
    });

    it('a boss NEM flinchel: találatra nem vált hurt animációra', () => {
      boss.update(createPlayerAt(scene, BOSS_X + APPROACH_DISTANCE, BOSS_Y));
      expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.WALK);

      boss.takeDamage(10);

      expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.WALK);
    });
  });

  describe('halál', () => {
    it('death animáció indul, majd egy elhalványuló tween', () => {
      const stepper = createDelayedCallStepper(scene);
      boss.takeDamage(MAX_HP);

      expect(anims(boss).currentKey).toBe(WING_BREAKER_ANIMS.DEATH);
      expect(scene.tweens.add).not.toHaveBeenCalled(); // csak az animáció UTÁN

      stepper.flushRemaining(); // DEATH_ANIM_MS
      const tweenCalls = scene.tweens.add.mock.calls;
      const tweenConfig = tweenCalls[tweenCalls.length - 1][0] as MockTweenConfig;
      expect(tweenConfig.targets).toBe(boss);
      expect(tweenConfig.alpha).toBe(0);
    });

    it('halál után az update() no-op, tehát az animáció sem íródik felül', () => {
      boss.takeDamage(MAX_HP);
      const playsAfterDeath = anims(boss).playedKeys.length;

      const player = createPlayerAt(scene, BOSS_X + APPROACH_DISTANCE, BOSS_Y);
      boss.update(player);
      boss.update(player);

      expect(anims(boss).playedKeys.length).toBe(playsAfterDeath);
    });
  });
});
