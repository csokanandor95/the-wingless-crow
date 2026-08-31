// A Beast Master animáció-modulja: state -> anim leképezés, a SCALE-ből LEVEZETETT geometria,
// és a fairness-számítás nyers képletei.
//
// A modul egyetlen dolgot csinál, amit a `BeastAnimations` nem: **ugyanabból a lapból egy
// nagyobb lényt vezet le**. A tesztek ezért végig azt bizonyítják, hogy a származtatás
// tényleg származtatás — nem egy párhuzamosan karbantartott számhalmaz.
import { describe, it, expect, vi } from 'vitest';
import {
  animKeyForState,
  ATTACK_ANIM_MS,
  ATTACK_RANGE,
  ATTACK_SLOT_MS,
  ATTACK_WINDUP_MS,
  BACKSTEP_ESCAPE_MS,
  BEAST_MASTER_ANIMS,
  BEAST_MASTER_FACING,
  CHARGE_HIT_RANGE,
  CHARGE_WINDUP_MS,
  DEATH_FADE_MS,
  FEET_OFFSET_Y,
  HALF_WIDTH,
  JUMP_ESCAPE_MS,
  SCALE,
} from '../../src/bosses/BeastMasterAnimations';
import {
  ATTACK_FRAMES,
  ATTACK_SLOTS_BEFORE_STRIKE,
  BEAST_ANIMS,
  BEAST_FACING,
  BODY_HEIGHT,
  BODY_WIDTH,
  CHARGE_WINDUP_MS as BEAST_CHARGE_WINDUP_MS,
  DEATH_FADE_MS as BEAST_DEATH_FADE_MS,
  FEET_OFFSET_Y as BEAST_FEET_OFFSET_Y,
  FRAME_SIZE,
  HORN_REACH_PX,
  MACE_REACH_PX,
} from '../../src/enemies/BeastAnimations';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../../src/player/PlayerAnimations';
import { JUMP_VELOCITY, MOVE_SPEED } from '../../src/player/Player';
import { GRAVITY_Y } from '../../src/config/physics';
import { bodyCenterX, isFlipped, originXFor, bodyOffsetXFor } from '../../src/systems/SpriteFacing';
import { BeastMasterState } from '../../src/bosses/BeastMaster';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

describe('geometria (a Beast lapjából, SCALE-lel LEVEZETVE)', () => {
  it('a SCALE EGÉSZ szám — a pixel art nem mosódik el', () => {
    expect(Number.isInteger(SCALE)).toBe(true);
    expect(SCALE).toBeGreaterThan(1);
  });

  it('a talp-offset és a félszélesség a nyers body-méretekből származik', () => {
    expect(FEET_OFFSET_Y).toBe((BODY_HEIGHT / 2) * SCALE);
    expect(HALF_WIDTH).toBe((BODY_WIDTH / 2) * SCALE);
    // ...és tényleg NAGYOBB, mint a sima Beasté.
    expect(FEET_OFFSET_Y).toBe(BEAST_FEET_OFFSET_Y * SCALE);
  });

  it('a hatótávak a MÉRT forrás-nyúlásokból származnak', () => {
    expect(ATTACK_RANGE).toBe(MACE_REACH_PX * SCALE + PLAYER_BODY_WIDTH / 2);
    expect(CHARGE_HIT_RANGE).toBe(HORN_REACH_PX * SCALE + PLAYER_BODY_WIDTH / 2);
  });

  it('a facing-geometria NYERS forrás-pixelben megy — az applyFacing skálafüggetlen', () => {
    // CLAUDE.md 15. tanulság: a body `setSize`/`setOffset` értékeit a Phaser a sprite
    // scaleX-ével szorozza, tehát itt SEM szabad előre skálázni.
    expect(BEAST_MASTER_FACING.frameWidth).toBe(FRAME_SIZE);
    expect(BEAST_MASTER_FACING.bodyWidth).toBe(BODY_WIDTH);
    expect(BEAST_MASTER_FACING).toEqual(BEAST_FACING);
  });
});

describe('facing-kompenzáció', () => {
  it('a body világkoordinátás közepe fordulásnál NEM mozdul', () => {
    // A geometria pont központozott (a test a frame közepén ül), tehát ez matematikailag
    // no-op — de a megosztott helperen megy át, hogy egy jövőbeli body-eltolás ne okozzon
    // néma elcsúszást (CLAUDE.md 16. tanulság).
    const centerFor = (faceLeft: boolean): number => {
      const originX = originXFor(BEAST_MASTER_FACING, faceLeft);
      const offsetX = bodyOffsetXFor(BEAST_MASTER_FACING, faceLeft);
      return offsetX + BEAST_MASTER_FACING.bodyWidth / 2 - originX * FRAME_SIZE;
    };

    expect(centerFor(true)).toBeCloseTo(centerFor(false));
  });

  it('a sheet natívan JOBBRA néz, tehát balra fordulás = flip', () => {
    expect(BEAST_MASTER_FACING.nativeFacing).toBe('right');
    expect(isFlipped(BEAST_MASTER_FACING, true)).toBe(true);
    expect(isFlipped(BEAST_MASTER_FACING, false)).toBe(false);
    expect(bodyCenterX(BEAST_MASTER_FACING)).toBe(FRAME_SIZE / 2);
  });
});

describe('fairness (a Player konstansaiból LEVEZETVE)', () => {
  const pointBlank = HALF_WIDTH + PLAYER_BODY_WIDTH / 2;
  const escape = ATTACK_RANGE + 10;

  it('a hátralépés ideje a hiányzó távolság / MOVE_SPEED', () => {
    expect(BACKSTEP_ESCAPE_MS).toBeCloseTo(((escape - pointBlank) / MOVE_SPEED) * 1000);
  });

  it('az ugrás ideje a ballisztikai pálya EMELKEDŐ ágából jön', () => {
    const requiredRise = Math.sqrt(escape ** 2 - pointBlank ** 2);
    const expected =
      ((Math.abs(JUMP_VELOCITY) -
        Math.sqrt(JUMP_VELOCITY ** 2 - 2 * GRAVITY_Y * requiredRise)) /
        GRAVITY_Y) *
      1000;

    expect(JUMP_ESCAPE_MS).toBeCloseTo(expected);
    // A szükséges emelkedés a player ugrás-magasságán BELÜL van, tehát az ugrás valóban
    // járható válasz (nem elméleti).
    expect(requiredRise).toBeLessThan(JUMP_VELOCITY ** 2 / (2 * GRAVITY_Y));
  });

  it('a slot-idő a windupból SZÁMÍTÓDIK, és az anim hossza a slotból', () => {
    expect(ATTACK_SLOT_MS).toBeCloseTo(ATTACK_WINDUP_MS / ATTACK_SLOTS_BEFORE_STRIKE);

    const frameCount = ATTACK_FRAMES.end - ATTACK_FRAMES.start + 1;
    expect(ATTACK_ANIM_MS).toBeCloseTo(frameCount * ATTACK_SLOT_MS);
  });

  it('a roham telegraph-ja HOSSZABB a sima Beasténél', () => {
    // Nagyobb és gyorsabb lény zárt arénában — a nagyobb fenyegetés hosszabb figyelmeztetést kap.
    expect(CHARGE_WINDUP_MS).toBeGreaterThan(BEAST_CHARGE_WINDUP_MS);
  });

  it('a halál-fade LASSABB, mint egy sima ellenfélé', () => {
    expect(DEATH_FADE_MS).toBeGreaterThan(BEAST_DEATH_FADE_MS);
  });
});

describe('animáció-kulcsok', () => {
  it('MIND különbözik a sima Beast kulcsaitól', () => {
    // KÖTELEZŐ: a Phaser AnimationManager GAME-szintű, a frame-listák azonosak, az IDŐZÍTÉS
    // viszont NEM — közös kulcsnál a Master lassabb csapása felülírná a Beastét.
    const masterKeys = Object.values(BEAST_MASTER_ANIMS);
    const beastKeys = Object.values(BEAST_ANIMS);

    for (const key of masterKeys) {
      expect(beastKeys, `${key} ütközik a Beast kulcsaival`).not.toContain(key);
    }
  });

  it('minden kulcs egyedi', () => {
    const keys = Object.values(BEAST_MASTER_ANIMS);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('animKeyForState', () => {
  it('az ATTACK és a COOLDOWN UGYANARRA a kulcsra képződik le', () => {
    // Így az 1040 ms-os animáció egyben fut végig az állapotpáron, ahelyett hogy a
    // state-váltásnál újraindulna (a CrowHarvester/Beast precedense).
    expect(animKeyForState(BeastMasterState.ATTACK, false)).toBe(BEAST_MASTER_ANIMS.ATTACK);
    expect(animKeyForState(BeastMasterState.COOLDOWN, false)).toBe(BEAST_MASTER_ANIMS.ATTACK);
  });

  it('a roham két fázisa KÜLÖN animáció', () => {
    expect(animKeyForState(BeastMasterState.CHARGE_WINDUP, false)).toBe(BEAST_MASTER_ANIMS.BRACE);
    expect(animKeyForState(BeastMasterState.CHARGE, true)).toBe(BEAST_MASTER_ANIMS.CHARGE);
  });

  it('a STAGGER a hit-frame-eket használja — a Take-Hit szerepe', () => {
    expect(animKeyForState(BeastMasterState.STAGGER, false)).toBe(BEAST_MASTER_ANIMS.HIT);
  });

  it('a DORMANT áll (a párbeszéd és a belépő alatt)', () => {
    expect(animKeyForState(BeastMasterState.DORMANT, false)).toBe(BEAST_MASTER_ANIMS.IDLE);
    // Akkor is, ha valamiért mozogna: a DORMANT nem futhat.
    expect(animKeyForState(BeastMasterState.DORMANT, true)).toBe(BEAST_MASTER_ANIMS.IDLE);
  });

  it('az APPROACH mozgásfüggő: RUN vagy IDLE', () => {
    expect(animKeyForState(BeastMasterState.APPROACH, true)).toBe(BEAST_MASTER_ANIMS.RUN);
    expect(animKeyForState(BeastMasterState.APPROACH, false)).toBe(BEAST_MASTER_ANIMS.IDLE);
  });

  it('a DEAD a hit-frame-en áll meg (nincs death animáció a csomagban)', () => {
    expect(animKeyForState(BeastMasterState.DEAD, false)).toBe(BEAST_MASTER_ANIMS.HIT);
  });
});
