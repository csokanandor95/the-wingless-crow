// Gravecaller (Enemy 2) animáció-tesztek.
//
// Három dolgot őriz, ami egy jövőbeli sprite-/tuning-módosításnál csendben elromolhatna:
//
//   1. a LEVEZETETT konstansok (origin, talp-offset, cast-időzítés) tényleg a mért
//      geometriából/a frame-listából jönnek, nem kézzel írt számok;
//   2. a facing-kompenzáció origin + body offset párosa nem csúszik szét;
//   3. a cast animáció a TELJES CAST state-et lefedi, a REPOSITION viszont már walk/idle —
//      ez a Gravecaller egyetlen érdemi eltérése a CrowHarvester ATTACK/COOLDOWN párosától.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import Gravecaller, {
  GravecallerState,
  MAX_HP,
  PATROL_RANGE,
  RETREAT_RANGE,
  PREFERRED_RANGE,
  CAST_STARTUP_MS,
  CAST_RECOVERY_MS,
} from '../../src/enemies/Gravecaller';
import {
  animKeyForState,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  BODY_WIDTH,
  CAST_RELEASE_MS,
  CAST_TOTAL_MS,
  DEATH_ANIM_MS,
  DEATH_FADE_MS,
  FEET_OFFSET_Y,
  FRAME_SIZE,
  GRAVECALLER_ANIMS,
  GRAVECALLER_FACING,
  HALF_BODY_WIDTH,
  ORIGIN_Y,
} from '../../src/enemies/GravecallerAnimations';
import Player from '../../src/player/Player';
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

const CASTER_X = 1000;
const CASTER_Y = 400;

interface MockAnims {
  currentKey: string | null;
  playedKeys: string[];
}

function anims(sprite: Gravecaller): MockAnims {
  return sprite.anims as unknown as MockAnims;
}

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

/** A physics body VILÁGKOORDINÁTÁS közepe — lásd a CrowHarvester ugyanilyen helperét. */
function bodyCenterX(sprite: Gravecaller): number {
  const setOffset = getBody(sprite).setOffset as unknown as {
    mock: { calls: Array<[number, number]> };
  };
  const calls = setOffset.mock.calls;
  const offsetX = calls[calls.length - 1][0];
  const spriteWithOrigin = sprite as unknown as { originX: number };
  return sprite.x - spriteWithOrigin.originX * FRAME_SIZE + offsetX + BODY_WIDTH / 2;
}

describe('levezetett geometria', () => {
  it('a talp a body ALJÁN van — a spawn Y ebből számolható', () => {
    // A rajzolt alak talpa a 96x96-os frame y=64-énél van (az alsó 32 sor üres).
    expect(BODY_OFFSET_Y + BODY_HEIGHT).toBe(64);
    expect(ORIGIN_Y * FRAME_SIZE + FEET_OFFSET_Y).toBeCloseTo(64, 5);
  });

  it('a HALF_BODY_WIDTH a BODY_WIDTH-ből származik', () => {
    expect(HALF_BODY_WIDTH).toBe(BODY_WIDTH / 2);
  });

  it('a FacingGeometry a body konstansaiból épül, és a sheet JOBBRA néz', () => {
    expect(GRAVECALLER_FACING).toMatchObject({
      frameWidth: FRAME_SIZE,
      bodyWidth: BODY_WIDTH,
      bodyOffsetX: BODY_OFFSET_X,
      bodyOffsetY: BODY_OFFSET_Y,
      originY: ORIGIN_Y,
      nativeFacing: 'right',
    });
  });

  it('a cast gameplay-időzítése az ANIMÁCIÓBÓL jön, nem külön hangolt szám', () => {
    expect(CAST_STARTUP_MS).toBe(CAST_RELEASE_MS);
    expect(CAST_RECOVERY_MS).toBe(CAST_TOTAL_MS - CAST_RELEASE_MS);
    // A kioldás a teljes animáción BELÜL van, tehát van mit kikövetkezni utána.
    expect(CAST_RELEASE_MS).toBeLessThan(CAST_TOTAL_MS);
  });
});

describe('animKeyForState', () => {
  it('PATROL és MAINTAIN_DISTANCE a mozgás szerint vált walk és idle között', () => {
    for (const state of [GravecallerState.PATROL, GravecallerState.MAINTAIN_DISTANCE]) {
      expect(animKeyForState(state, true)).toBe(GRAVECALLER_ANIMS.WALK);
      expect(animKeyForState(state, false)).toBe(GRAVECALLER_ANIMS.IDLE);
    }
  });

  it('CAST a saját animációját adja', () => {
    expect(animKeyForState(GravecallerState.CAST, false)).toBe(GRAVECALLER_ANIMS.CAST);
  });

  it('REPOSITION már NEM a cast animációja — ott a lény ténylegesen mozog', () => {
    // Itt tér el a CrowHarvestertől, ahol az ATTACK és a COOLDOWN közös kulcsra képződik:
    // a Gravecaller CAST state-je a TELJES animációt lefedi (windup + kikövetkezés), tehát
    // a REPOSITION-re már nem marad lejátszanivaló.
    expect(animKeyForState(GravecallerState.REPOSITION, true)).toBe(GRAVECALLER_ANIMS.WALK);
    expect(animKeyForState(GravecallerState.REPOSITION, false)).toBe(GRAVECALLER_ANIMS.IDLE);
  });

  it('DEAD a valódi death animációt adja', () => {
    // A CrowHarvesterrel ellentétben ehhez a csomaghoz VAN death animáció.
    expect(animKeyForState(GravecallerState.DEAD, false)).toBe(GRAVECALLER_ANIMS.DEATH);
  });
});

describe('Gravecaller animáció-vezérlés', () => {
  let scene: MockScene;
  let caster: Gravecaller;
  let farPlayer: Player;

  beforeEach(() => {
    scene = createMockScene();
    caster = new Gravecaller(scene as unknown as Phaser.Scene, CASTER_X, CASTER_Y);
    caster.x = CASTER_X;
    caster.y = CASTER_Y;
    // Elég messze ahhoz, hogy soha ne váltson ki detektálást — így tiszta PATROL marad.
    farPlayer = createPlayerAt(scene, CASTER_X + 5000, CASTER_Y);
  });

  describe('facing-kompenzáció', () => {
    it('a test világkoordinátás közepe forduláskor NEM mozdul', () => {
      caster.update(farPlayer); // patrol jobbra
      expect(caster.flipX).toBe(false);
      const facingRight = bodyCenterX(caster);

      // Elérte a jobb oldali patrol-határt -> megfordul balra.
      caster.x = CASTER_X + PATROL_RANGE;
      caster.update(farPlayer);
      expect(caster.flipX).toBe(true);
      const facingLeft = bodyCenterX(caster);

      expect(facingRight).toBeCloseTo(CASTER_X, 5);
      expect(facingLeft).toBeCloseTo(CASTER_X + PATROL_RANGE, 5);
    });

    it('az origin és a body offset EGYÜTT tükröződik', () => {
      const spriteWithOrigin = caster as unknown as { originX: number };
      const originRight = spriteWithOrigin.originX;

      caster.x = CASTER_X + PATROL_RANGE;
      caster.update(farPlayer);
      const originLeft = spriteWithOrigin.originX;

      expect(originRight + originLeft).toBeCloseTo(1, 5);
    });
  });

  it('patrol közben walk, megállva idle', () => {
    caster.update(farPlayer);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.WALK);

    // Preferált sávban álló lény: megáll -> idle (majd castol, de az anim a következő
    // updateAnimation()-ig még idle volt — ezért itt egy vertikálisan elérhetetlen célt
    // használunk, ami megállít, de nem nyitja ki a cast kapuját).
    const unreachable = createPlayerAt(
      scene,
      CASTER_X + (RETREAT_RANGE + PREFERRED_RANGE) / 2,
      CASTER_Y - 300
    );
    caster.gravecallerState = GravecallerState.MAINTAIN_DISTANCE;
    caster.update(unreachable);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.IDLE);
  });

  it('a cast a saját animációját indítja, és a kikövetkezés alatt NEM indul újra', () => {
    const inBand = createPlayerAt(
      scene,
      CASTER_X + (RETREAT_RANGE + PREFERRED_RANGE) / 2,
      CASTER_Y
    );
    caster.update(inBand); // PATROL -> MAINTAIN_DISTANCE
    caster.update(inBand); // -> CAST

    expect(caster.gravecallerState).toBe(GravecallerState.CAST);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.CAST);

    const playsAfterCastStart = anims(caster).playedKeys.length;
    createDelayedCallRunner(scene).run(CAST_STARTUP_MS); // a kioldás után, még CAST
    caster.update(inBand);
    expect(anims(caster).playedKeys.length).toBe(playsAfterCastStart);
  });

  it('a REPOSITION-be lépve visszavált walk/idle animációra', () => {
    const inBand = createPlayerAt(
      scene,
      CASTER_X + (RETREAT_RANGE + PREFERRED_RANGE) / 2,
      CASTER_Y
    );
    caster.update(inBand);
    caster.update(inBand);

    const runner = createDelayedCallRunner(scene);
    runner.run(CAST_STARTUP_MS);
    runner.run(CAST_RECOVERY_MS);
    expect(caster.gravecallerState).toBe(GravecallerState.REPOSITION);

    // A sávban áll, tehát idle; ha közelebb lépnénk, walk lenne.
    caster.update(inBand);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.IDLE);

    inBand.x = CASTER_X + RETREAT_RANGE - 20; // rárohanunk -> hátrál
    caster.update(inBand);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.WALK);
  });

  it('sebzésre lejátszik egy hit animációt, ami a következő frame-eken sem íródik felül', () => {
    caster.takeDamage(5);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.HIT);

    caster.update(farPlayer);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.HIT);

    flushAllDelayedCalls(scene);
    caster.update(farPlayer);
    expect(anims(caster).currentKey).not.toBe(GRAVECALLER_ANIMS.HIT);
  });

  it('a CAST telegraph-ját a találat NEM szakítja meg', () => {
    // Bossoknál ez design-döntés (a telegraph olvashatósága fontosabb a flinchnél); itt
    // ugyanez az indok: a windup közben eltalált lény lövedéke ettől még megérkezik, tehát
    // a playernek látnia kell, hogy jön.
    const inBand = createPlayerAt(
      scene,
      CASTER_X + (RETREAT_RANGE + PREFERRED_RANGE) / 2,
      CASTER_Y
    );
    caster.update(inBand);
    caster.update(inBand);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.CAST);

    caster.takeDamage(1);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.CAST);
  });

  it('halálkor death animáció + KÉSLELTETETT elhalványuló tween indul', () => {
    caster.takeDamage(MAX_HP);

    expect(caster.isDead()).toBe(true);
    expect(anims(caster).currentKey).toBe(GRAVECALLER_ANIMS.DEATH);

    const tweenCalls = scene.tweens.add.mock.calls;
    const tweenConfig = tweenCalls[tweenCalls.length - 1][0] as MockTweenConfig;
    expect(tweenConfig.targets).toBe(caster);
    expect(tweenConfig.alpha).toBe(0);
    // A fade csak a TELJES death animáció UTÁN indul — enélkül a lény összeesés közben
    // tűnne el. (A CrowHarvesternél nincs death animáció, ott a fade azonnal indul.)
    expect(tweenConfig.delay).toBe(DEATH_ANIM_MS);
    expect(tweenConfig.duration).toBe(DEATH_FADE_MS);
  });

  it('halál után az update() no-op, tehát az animáció sem íródik felül', () => {
    caster.takeDamage(MAX_HP);
    const playsAfterDeath = anims(caster).playedKeys.length;

    caster.update(farPlayer);
    caster.update(farPlayer);

    expect(anims(caster).playedKeys.length).toBe(playsAfterDeath);
  });
});
