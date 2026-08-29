// Mad King (Boss 2) animáció-vezérlés: state -> anim leképezés, a fordulás-kompenzáció, és a
// LEVEZETETT konstansok. Az utolsó csoport a legfontosabb: ha valaki egy származtatott
// számot kézzel átír (mert "úgy jobban néz ki"), ezek a tesztek buknak.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

import MadKing, {
  KingState,
  MAX_HP,
  SLASH_RANGE,
  SLAM_HIT_HALF_WIDTH,
  LUNGE_HIT_RANGE,
} from '../../src/bosses/MadKing';
import {
  animKeyForState,
  BLADE_REACH_PX,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_WIDTH,
  FEET_OFFSET_Y,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  HALF_WIDTH,
  LEAP_AIRTIME_MS,
  LEAP_RISE_PX,
  LEAP_VELOCITY_Y,
  MAD_KING_ANIMS,
  MAD_KING_FACING,
  ORIGIN_Y,
  SCALE,
} from '../../src/bosses/MadKingAnimations';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../../src/player/PlayerAnimations';
import { GRAVITY_Y } from '../../src/config/physics';
import { bodyCenterX } from '../../src/systems/SpriteFacing';
import { createMockScene, getBody, type MockScene } from './helpers/phaserTestUtils';

describe('MadKingAnimations – state -> animáció', () => {
  it('minden támadás-állapot a saját animációjára képződik', () => {
    expect(animKeyForState(KingState.SLASH, null, false)).toBe(MAD_KING_ANIMS.SLASH);
    expect(animKeyForState(KingState.LEAP_WINDUP, null, false)).toBe(MAD_KING_ANIMS.LEAP_WINDUP);
    expect(animKeyForState(KingState.LEAP_AIR, null, false)).toBe(MAD_KING_ANIMS.LEAP_AIR);
    expect(animKeyForState(KingState.LEAP_SLAM, null, false)).toBe(MAD_KING_ANIMS.LEAP_SLAM);
    expect(animKeyForState(KingState.LUNGE_WINDUP, null, false)).toBe(
      MAD_KING_ANIMS.LUNGE_WINDUP
    );
    expect(animKeyForState(KingState.LUNGE, null, false)).toBe(MAD_KING_ANIMS.LUNGE_DASH);
    expect(animKeyForState(KingState.DEAD, null, false)).toBe(MAD_KING_ANIMS.DEATH);
  });

  it('az APPROACH a mozgás-flagtől függ', () => {
    expect(animKeyForState(KingState.APPROACH, null, true)).toBe(MAD_KING_ANIMS.WALK);
    expect(animKeyForState(KingState.APPROACH, null, false)).toBe(MAD_KING_ANIMS.IDLE);
  });

  it('a DORMANT MINDIG idle — a dialógus alatt a király nem sétálhat', () => {
    expect(animKeyForState(KingState.DORMANT, null, true)).toBe(MAD_KING_ANIMS.IDLE);
  });

  it('a COOLDOWN az ELŐZŐ AKCIÓ záró pózát tartja a képen', () => {
    // Ez a leképezés hordozza a becsapódás/csapás vizuális utóéletét: a LEAP_SLAM állapot
    // maga ÁTMENETI (a resolveSlam() azonnal cooldownba lép), tehát a slam pózt a cooldown
    // mutatja. Enélkül a király a becsapódás pillanatában idle-be pattanna.
    expect(animKeyForState(KingState.COOLDOWN, 'SLASH', false)).toBe(MAD_KING_ANIMS.SLASH);
    expect(animKeyForState(KingState.COOLDOWN, 'LEAP', false)).toBe(MAD_KING_ANIMS.LEAP_SLAM);
    // Kitörés után nincs mit megtartani: kifújja magát.
    expect(animKeyForState(KingState.COOLDOWN, 'LUNGE', false)).toBe(MAD_KING_ANIMS.IDLE);
    expect(animKeyForState(KingState.COOLDOWN, null, false)).toBe(MAD_KING_ANIMS.IDLE);
  });
});

describe('MadKingAnimations – levezetett konstansok', () => {
  it('a SLASH_RANGE a MÉRT penge-nyúlásból jön, nem szabadon hangolt szám', () => {
    expect(SLASH_RANGE).toBe(BLADE_REACH_PX * SCALE);
  });

  it('a FEET_OFFSET_Y és a HALF_WIDTH a body méretéből származik', () => {
    expect(FEET_OFFSET_Y).toBe((BODY_HEIGHT / 2) * SCALE);
    expect(HALF_WIDTH).toBe((BODY_WIDTH / 2) * SCALE);
  });

  it('az ORIGIN_Y a talpat a frame y=105-ére teszi (a MÉRT talpvonalra)', () => {
    // A sprite.y a body közepén van, tehát a talp a sprite.y + BODY_HEIGHT/2-nél. Frame-ben:
    const feetInFrame = ORIGIN_Y * FRAME_HEIGHT + BODY_HEIGHT / 2;
    expect(feetInFrame).toBeCloseTo(105, 5);
  });

  it('a ballisztika a GRAVITY_Y-ból SZÁRMAZIK — a LEAP_RISE_PX az egyetlen hangolópont', () => {
    expect(LEAP_VELOCITY_Y).toBeCloseTo(Math.sqrt(2 * GRAVITY_Y * LEAP_RISE_PX), 9);
    expect(LEAP_AIRTIME_MS).toBeCloseTo((2000 * LEAP_VELOCITY_Y) / GRAVITY_Y, 9);
  });

  it('az ugrás tényleges emelkedése a LEAP_RISE_PX (v^2 / 2g)', () => {
    const rise = (LEAP_VELOCITY_Y * LEAP_VELOCITY_Y) / (2 * GRAVITY_Y);
    expect(rise).toBeCloseTo(LEAP_RISE_PX, 6);
  });

  it('a találati sávok a két test félszélességéből épülnek', () => {
    expect(SLAM_HIT_HALF_WIDTH).toBe(HALF_WIDTH + PLAYER_BODY_WIDTH / 2 + 20);
    expect(LUNGE_HIT_RANGE).toBe(HALF_WIDTH + PLAYER_BODY_WIDTH / 2 + 8);
    // A becsapódás lökéshulláma szélesebb, mint a kitörés testközeli találata.
    expect(SLAM_HIT_HALF_WIDTH).toBeGreaterThan(LUNGE_HIT_RANGE);
  });
});

describe('MadKingAnimations – fordulás-kompenzáció', () => {
  let scene: MockScene;
  let king: MadKing;

  /**
   * A body VILÁG-koordinátás közepe — a bossAnimations.test.ts azonos helpere. A Phaser az
   * Arcade body pozícióját `x + scaleX * (offset.x - displayOriginX)`-ként számolja, a
   * displayOriginX pedig `originX * frameWidth`. Az offsetet a legutolsó setOffset() hívásból
   * olvassuk vissza (a mock body nem tárolja mezőként).
   */
  const bodyWorldCenterX = (): number => {
    const setOffset = getBody(king).setOffset as unknown as {
      mock: { calls: Array<[number, number]> };
    };
    const calls = setOffset.mock.calls;
    const offsetX = calls[calls.length - 1][0];
    const sprite = king as unknown as { x: number; originX: number };
    return sprite.x + SCALE * (offsetX - sprite.originX * FRAME_WIDTH + BODY_WIDTH / 2);
  };

  beforeEach(() => {
    scene = createMockScene();
    king = new MadKing(scene as unknown as Phaser.Scene, 400, 315);
    king.activate();
  });

  it('a geometria natívan JOBBRA néző, a testközép pont a frame közepén', () => {
    expect(MAD_KING_FACING.nativeFacing).toBe('right');
    // Ettől a kompenzáció itt matematikailag no-op — de a közös úton MEGY, hogy egy jövőbeli
    // body-eltolás ne okozzon néma elcsúszást (16. technikai tanulság).
    expect(bodyCenterX(MAD_KING_FACING)).toBe(FRAME_WIDTH / 2);
    expect(bodyCenterX(MAD_KING_FACING)).toBe(BODY_OFFSET_X + BODY_WIDTH / 2);
  });

  it('forduláskor a body VILÁG-közepe nem mozdul el a sprite.x-től', () => {
    const player = { x: 100, y: 315, isDead: () => false, takeDamage: () => undefined };

    // Balra néz (a player balra van)
    king.update(player as unknown as Parameters<MadKing['update']>[0]);
    const facingLeftCenter = bodyWorldCenterX();

    // Jobbra fordul
    player.x = 700;
    king.update(player as unknown as Parameters<MadKing['update']>[0]);
    const facingRightCenter = bodyWorldCenterX();

    expect(facingRightCenter).toBeCloseTo(facingLeftCenter, 5);
    expect(facingRightCenter).toBeCloseTo(king.x, 5);
  });

  it('a body mérete FORRÁS-pixelben megy be (a Phaser a scale-lel szorozza)', () => {
    // A setSize a konstruktorban fut le, MÉG a setScale UTÁN — a 15. technikai tanulság
    // szerint az Arcade Body a konstruktorában menti el a skálát.
    expect(getBody(king).setSize).toHaveBeenCalledWith(BODY_WIDTH, BODY_HEIGHT, false);
  });

  it('halálkor a DEATH animáció indul, és NEM fadel ki (a test a trón előtt marad)', () => {
    king.takeDamage(MAX_HP);

    const anims = king.anims as unknown as { currentKey: string | null };
    expect(anims.currentKey).toBe(MAD_KING_ANIMS.DEATH);
    // A Wing-Breakerrel ellentétben nincs elhalványító tween: a király FELOLDOZÁST kap,
    // a testének látszania kell a győzelmi beat alatt.
    expect(scene.tweens.add).not.toHaveBeenCalled();
  });
});
