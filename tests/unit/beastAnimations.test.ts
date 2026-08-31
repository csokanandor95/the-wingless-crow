// Beast (Enemy 3) animáció-tesztek.
//
// Három dolgot őriznek, ebben a fontossági sorrendben:
//
//  1. **A LEVEZETETT geometria és hatótávok.** A projekt alapelve, hogy a hitbox az animáció
//     tényleges kiterjedéséből származik. Ha valaki a `BODY_*` értékekhez vagy a mért
//     nyúlásokhoz nyúl anélkül, hogy a hatótávokat is újraszámolná, itt bukik el.
//  2. **A roham két fázisának animációja.** A `CHARGE_WINDUP` a megtámasztott pózt (BRACE),
//     a `CHARGE` a fejlehajtott rohanást játssza — és a találat-villanás EGYIKET SEM írhatja
//     felül, mert az a player egyetlen információforrása arról, hogy jön a roham.
//  3. **A facing-kompenzáció.** Itt a test PONT a frame közepén ül, tehát a kompenzáció
//     matematikailag no-op — a teszt pont azt őrzi, hogy ez a jövőben se csússzon szét
//     (16. tanulság: a megosztott helper akkor is kell, ha épp nulla az eltolás).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import Beast, {
  BeastState,
  CHARGE_MIN_RANGE,
  CHARGE_TELEGRAPH_TINT,
  CHARGE_WINDUP_MS,
  HIT_FLASH_MS,
  MAX_HP,
  PATROL_RANGE,
} from '../../src/enemies/Beast';
import {
  animKeyForState,
  ATTACK_ANIM_MS,
  ATTACK_SLOT_MS,
  ATTACK_WINDUP_MS,
  BEAST_ANIMS,
  BEAST_FACING,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  BODY_WIDTH,
  FEET_OFFSET_Y,
  FRAME_SIZE,
  HALF_BODY_WIDTH,
  ORIGIN_Y,
  SHEET_COLUMNS,
} from '../../src/enemies/BeastAnimations';
import { BEAST_SPAWN_OFFSET } from '../../src/levels/LevelGeometry';
import Player from '../../src/player/Player';
import { bodyCenterX as geometryBodyCenterX } from '../../src/systems/SpriteFacing';
import {
  createMockScene,
  getBody,
  createDelayedCallRunner,
  flushAllDelayedCalls,
  type MockScene,
  type MockTweenConfig,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

const BEAST_X = 500;
const BEAST_Y = 400;

interface MockAnims {
  currentKey: string | null;
  playedKeys: string[];
}

function anims(sprite: Beast): MockAnims {
  return sprite.anims as unknown as MockAnims;
}

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

/**
 * A physics body VILÁGKOORDINÁTÁS közepe. A Phaser a body-t a game object bal felső sarkától
 * (`x - originX * frameWidth`) méri, ehhez adódik a body offsetje.
 */
function bodyCenterX(sprite: Beast): number {
  const setOffset = getBody(sprite).setOffset as unknown as {
    mock: { calls: Array<[number, number]> };
  };
  const calls = setOffset.mock.calls;
  const offsetX = calls[calls.length - 1][0];
  const spriteWithOrigin = sprite as unknown as { originX: number };
  return sprite.x - spriteWithOrigin.originX * FRAME_SIZE + offsetX + BODY_WIDTH / 2;
}

describe('a goatman lap geometriája (MÉRT értékek)', () => {
  it('a rács 6 oszlop x 64px — a 384x512-es lap 48 cellája', () => {
    expect(FRAME_SIZE).toBe(64);
    expect(SHEET_COLUMNS).toBe(6);
    expect(384 / FRAME_SIZE).toBe(SHEET_COLUMNS);
    expect((512 / FRAME_SIZE) * SHEET_COLUMNS).toBe(48);
  });

  it('a body a frame KÖZEPÉN ül, és a talp a frame alján van', () => {
    // A mért álló láb-sáv közepe 31,5; a body 20..44 -> közepe 32 = a frame közepe.
    expect(BODY_OFFSET_X + BODY_WIDTH / 2).toBe(FRAME_SIZE / 2);
    // A body alja PONTOSAN a frame alja: a sprite árnyék nélkül a keret aljára ül.
    expect(BODY_OFFSET_Y + BODY_HEIGHT).toBe(FRAME_SIZE);
  });

  it('a talp-offset és az origin EGYMÁSBÓL származik, nem külön hangolt', () => {
    expect(FEET_OFFSET_Y).toBe(BODY_HEIGHT / 2);
    expect(ORIGIN_Y).toBeCloseTo((BODY_OFFSET_Y + BODY_HEIGHT / 2) / FRAME_SIZE, 10);
    // Az origin frame-y-ja + a talp-offset = a talp frame-y-ja (a keret alja).
    expect(ORIGIN_Y * FRAME_SIZE + FEET_OFFSET_Y).toBe(FRAME_SIZE);
  });

  it('a layout spawn-offsetje a talp-offsetből jön (1px ejtéssel)', () => {
    // Ha a sprite valaha cserélődik, a layout nem hagyhatja itt a régi számot.
    expect(BEAST_SPAWN_OFFSET).toBe(FEET_OFFSET_Y + 1);
  });

  it('a FacingGeometry ugyanazokból a mezőkből épül, és a testközép levezetett', () => {
    expect(BEAST_FACING.frameWidth).toBe(FRAME_SIZE);
    expect(BEAST_FACING.bodyWidth).toBe(BODY_WIDTH);
    expect(BEAST_FACING.bodyOffsetX).toBe(BODY_OFFSET_X);
    expect(BEAST_FACING.originY).toBe(ORIGIN_Y);
    expect(BEAST_FACING.nativeFacing).toBe('right');
    expect(geometryBodyCenterX(BEAST_FACING)).toBe(FRAME_SIZE / 2);
    expect(HALF_BODY_WIDTH).toBe(BODY_WIDTH / 2);
  });

  it('a támadás slot-ideje a windupból SZÁMÍTÓDIK (3 windup-frame + a csapás)', () => {
    // Az f6/f7/f8 három VALÓDI windup-póz, ezért nem kell frame-ismétlés (szemben a
    // CrowHarvesterrel) — a csapás (f9) magától a 4. slotra esik.
    expect(ATTACK_SLOT_MS).toBe(ATTACK_WINDUP_MS / 3);
    expect(ATTACK_ANIM_MS).toBe(6 * ATTACK_SLOT_MS);
  });
});

describe('animKeyForState', () => {
  it('PATROL séta, CHASE futás — UGYANAZOKBÓL a frame-ekből, más tempóval', () => {
    expect(animKeyForState(BeastState.PATROL, true)).toBe(BEAST_ANIMS.WALK);
    expect(animKeyForState(BeastState.CHASE, true)).toBe(BEAST_ANIMS.RUN);
    expect(BEAST_ANIMS.WALK).not.toBe(BEAST_ANIMS.RUN);
  });

  it('állva mindkét állapotban idle', () => {
    expect(animKeyForState(BeastState.PATROL, false)).toBe(BEAST_ANIMS.IDLE);
    expect(animKeyForState(BeastState.CHASE, false)).toBe(BEAST_ANIMS.IDLE);
  });

  it('a roham két fázisa KÜLÖN animáció', () => {
    expect(animKeyForState(BeastState.CHARGE_WINDUP, false)).toBe(BEAST_ANIMS.BRACE);
    expect(animKeyForState(BeastState.CHARGE, true)).toBe(BEAST_ANIMS.CHARGE);
    expect(BEAST_ANIMS.BRACE).not.toBe(BEAST_ANIMS.CHARGE);
  });

  it('ATTACK és COOLDOWN UGYANARRA a kulcsra képződik le', () => {
    // Ez teszi lehetővé, hogy a playAnim() guardja mellett a 780ms-os támadás-animáció
    // egyben fusson végig az ATTACK + COOLDOWN állapotpáron.
    expect(animKeyForState(BeastState.ATTACK, false)).toBe(BEAST_ANIMS.ATTACK);
    expect(animKeyForState(BeastState.COOLDOWN, false)).toBe(BEAST_ANIMS.ATTACK);
  });

  it('DEAD a hit animációt adja (a fade-et a die() tweenje intézi)', () => {
    expect(animKeyForState(BeastState.DEAD, false)).toBe(BEAST_ANIMS.HIT);
  });
});

describe('Beast animáció-vezérlés', () => {
  let scene: MockScene;
  let beast: Beast;
  let farPlayer: Player;

  beforeEach(() => {
    scene = createMockScene();
    beast = new Beast(scene as unknown as Phaser.Scene, BEAST_X, BEAST_Y);
    // Elég messze ahhoz, hogy soha ne váltson ki detektálást — így tiszta PATROL marad.
    farPlayer = createPlayerAt(scene, BEAST_X + 5000, BEAST_Y);
  });

  describe('facing-kompenzáció', () => {
    it('a test világkoordinátás közepe forduláskor NEM mozdul', () => {
      beast.update(farPlayer); // patrol jobbra
      expect(beast.flipX).toBe(false);
      const facingRight = bodyCenterX(beast);

      beast.x = BEAST_X + PATROL_RANGE; // elérte a jobb határt -> megfordul
      beast.update(farPlayer);
      expect(beast.flipX).toBe(true);
      const facingLeft = bodyCenterX(beast);

      expect(facingRight).toBeCloseTo(BEAST_X, 5);
      expect(facingLeft).toBeCloseTo(BEAST_X + PATROL_RANGE, 5);
    });

    it('az origin és a body offset EGYÜTT tükröződik', () => {
      const spriteWithOrigin = beast as unknown as { originX: number };
      const originRight = spriteWithOrigin.originX;

      beast.x = BEAST_X + PATROL_RANGE;
      beast.update(farPlayer);
      const originLeft = spriteWithOrigin.originX;

      expect(originRight + originLeft).toBeCloseTo(1, 5);
    });
  });

  it('patrol közben walk, üldözés közben run', () => {
    beast.update(farPlayer);
    expect(anims(beast).currentKey).toBe(BEAST_ANIMS.WALK);

    const near = createPlayerAt(scene, BEAST_X + CHARGE_MIN_RANGE - 40, BEAST_Y);
    beast.takeDamage(1); // ébresztés, a pozíciótól függetlenül
    flushAllDelayedCalls(scene);
    // Kész rohammal a közeli player elől hátrál — az is RUN (mozog).
    beast.update(near);
    expect(anims(beast).currentKey).toBe(BEAST_ANIMS.RUN);
  });

  describe('a roham animációi', () => {
    function startCharge(): Player {
      const player = createPlayerAt(scene, BEAST_X + CHARGE_MIN_RANGE + 40, BEAST_Y);
      beast.update(player); // PATROL -> CHASE
      beast.update(player); // -> CHARGE_WINDUP
      expect(beast.beastState).toBe(BeastState.CHARGE_WINDUP);
      return player;
    }

    it('a windup a BRACE pózt, a roham a CHARGE animációt játssza', () => {
      const player = startCharge();
      expect(anims(beast).currentKey).toBe(BEAST_ANIMS.BRACE);

      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      beast.update(player);
      expect(anims(beast).currentKey).toBe(BEAST_ANIMS.CHARGE);
    });

    it('REGRESSZIÓ: a találat NEM írja felül a roham telegraph-ját', () => {
      // A piros tint + a megtámasztott póz a player EGYETLEN információja arról, hogy jön a
      // roham. Ha egy jól időzített kardcsapás lecserélné hit-animációra, pont a legfontosabb
      // pillanatban vakítaná el.
      const player = startCharge();
      beast.takeDamage(5);
      beast.update(player);
      expect(anims(beast).currentKey).toBe(BEAST_ANIMS.BRACE);

      const runner = createDelayedCallRunner(scene);
      runner.run(CHARGE_WINDUP_MS);
      beast.update(player);

      beast.takeDamage(5);
      beast.update(player);
      expect(anims(beast).currentKey).toBe(BEAST_ANIMS.CHARGE);
    });

    it('REGRESSZIÓ: a hit-villanás UTÁN visszatér a piros telegraph-tint', () => {
      // A goatman hit-frame-jeibe — a CrowHarvesterrel ellentétben — NINCS beleégetve fehér
      // villanás, ezért a Beast a bossok TintModes.FILL villanását használja. Ha a villanás
      // utáni visszaállás nem állapotfüggő, egy jól időzített találat pont a legfontosabb
      // pillanatban törölné le a player egyetlen figyelmeztetését.
      startCharge();
      const tinted = beast as unknown as { tintColor: number | null; tintMode: number };
      expect(tinted.tintColor).toBe(CHARGE_TELEGRAPH_TINT);

      beast.takeDamage(5); // fehér FILL villanás
      expect(tinted.tintColor).toBe(0xffffff);

      const runner = createDelayedCallRunner(scene);
      runner.run(HIT_FLASH_MS);

      expect(tinted.tintColor).toBe(CHARGE_TELEGRAPH_TINT);
      // A MÓDOT is vissza kell állítani: Phaser 4-ben a clearTint() nem nyúl hozzá.
      expect(tinted.tintMode).toBe(0);
    });

    it('minden roham ELÖLRŐL indítja a BRACE animációt', () => {
      startCharge();
      const playsAfterFirst = anims(beast).playedKeys.length;
      expect(anims(beast).playedKeys[playsAfterFirst - 1]).toBe(BEAST_ANIMS.BRACE);
    });
  });

  it('a támadás a saját animációját indítja, és COOLDOWN-ban NEM indul újra', () => {
    const near = createPlayerAt(scene, BEAST_X + 20, BEAST_Y);
    beast.update(near); // PATROL -> CHASE
    beast.update(near); // -> ATTACK

    expect(beast.beastState).toBe(BeastState.ATTACK);
    expect(anims(beast).currentKey).toBe(BEAST_ANIMS.ATTACK);

    const playsAfterAttackStart = anims(beast).playedKeys.length;
    beast.update(near); // még ATTACK
    expect(anims(beast).playedKeys.length).toBe(playsAfterAttackStart);
  });

  it('két egymást követő támadás MINDKÉTSZER újraindítja az animációt', () => {
    // Regresszió (9. tanulság): a COOLDOWN ugyanarra a kulcsra képződik le, mint az ATTACK,
    // és a cooldown lejárta után a lény már a következő update()-ben újra csaphat — közben
    // egyetlen frame sem jut a walk/idle-re, tehát a playAnim() guardja kihagyná a második
    // lejátszást, és a csapás a befagyott utolsó frame-en állna.
    const near = createPlayerAt(scene, BEAST_X + 20, BEAST_Y);
    beast.update(near);
    beast.update(near);
    const playsAfterFirst = anims(beast).playedKeys.length;

    flushAllDelayedCalls(scene); // startup -> találat -> cooldown -> CHASE
    expect(beast.beastState).toBe(BeastState.CHASE);

    beast.update(near); // azonnal új támadás, walk/idle frame nélkül

    expect(beast.beastState).toBe(BeastState.ATTACK);
    expect(anims(beast).playedKeys.length).toBe(playsAfterFirst + 1);
  });

  it('sebzésre lejátszik egy hit animációt, ami a következő frame-eken sem íródik felül', () => {
    beast.takeDamage(5);
    expect(anims(beast).currentKey).toBe(BEAST_ANIMS.HIT);

    beast.update(farPlayer);
    expect(anims(beast).currentKey).toBe(BEAST_ANIMS.HIT);

    flushAllDelayedCalls(scene);
    beast.update(farPlayer);
    // A takeDamage() CHASE-be vitte, de a `farPlayer` a LOSE_RANGE-en kívül van, tehát a
    // következő frame visszateszi PATROL-ba -> séta.
    expect(anims(beast).currentKey).toBe(BEAST_ANIMS.WALK);
  });

  it('halálkor hit animáció + elhalványuló tween indul', () => {
    beast.takeDamage(MAX_HP);

    expect(beast.isDead()).toBe(true);
    expect(anims(beast).currentKey).toBe(BEAST_ANIMS.HIT);

    const tweenCalls = scene.tweens.add.mock.calls;
    const tweenConfig = tweenCalls[tweenCalls.length - 1][0] as MockTweenConfig;
    expect(tweenConfig.targets).toBe(beast);
    expect(tweenConfig.alpha).toBe(0);
  });

  it('halál után az update() no-op, tehát az animáció sem íródik felül', () => {
    beast.takeDamage(MAX_HP);
    const playsAfterDeath = anims(beast).playedKeys.length;

    beast.update(farPlayer);
    beast.update(farPlayer);

    expect(anims(beast).playedKeys.length).toBe(playsAfterDeath);
  });
});
