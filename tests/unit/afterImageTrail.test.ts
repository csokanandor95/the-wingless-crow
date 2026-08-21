// AfterImageTrail — a boss charge-jának sebesség-csíkja (Phase 8, boss sprite iteráció).
//
// Miért van rá teszt: a "Bringer of Death" csomagban NINCS dash animáció, ezért a rohamot
// egy megtartott kitörés-póz + ez a csík adja ki. A csík két dolgot nem ronthat el:
// a throttle-t (különben frame-enként új sprite születne), és a forrás GEOMETRIÁJÁNAK
// átmásolását (az off-center boss sprite-nál egy hiányzó origin/flip azonnal félrecsúszó
// árnyékokat okozna).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import AfterImageTrail, {
  DEFAULT_ALPHA,
  DEFAULT_FADE_MS,
  DEFAULT_INTERVAL_MS,
  DEFAULT_TINT,
} from '../../src/systems/AfterImageTrail';
import {
  createMockScene,
  type MockImage,
  type MockScene,
  type MockTweenConfig,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

/** A boss aktuális állapota: off-center origin, tükrözve, 2x skálán. */
function createSource() {
  return {
    x: 300,
    y: 200,
    texture: { key: 'wing-breaker-clean' },
    frame: { name: 20 },
    originX: 0.242857,
    originY: 0.688172,
    flipX: true,
    scaleX: 2,
    scaleY: 2,
    depth: 0,
  };
}

function spawnedImages(scene: MockScene): MockImage[] {
  return scene.add.image.mock.results.map((result) => result.value as MockImage);
}

describe('AfterImageTrail', () => {
  let scene: MockScene;
  let source: ReturnType<typeof createSource>;
  let trail: AfterImageTrail;

  beforeEach(() => {
    scene = createMockScene();
    source = createSource();
    trail = new AfterImageTrail(
      scene as unknown as Phaser.Scene,
      source as unknown as Phaser.GameObjects.Sprite
    );
  });

  it('inaktív állapotban nem hoz létre semmit', () => {
    trail.update(false);
    trail.update(false);

    expect(scene.add.image).not.toHaveBeenCalled();
  });

  it('az aktív szakasz első frame-jén AZONNAL spawnol', () => {
    trail.update(true);

    expect(scene.add.image).toHaveBeenCalledTimes(1);
  });

  it('az intervallumon belül nem spawnol újra, utána igen', () => {
    trail.update(true);

    scene.time.now += DEFAULT_INTERVAL_MS - 1;
    trail.update(true);
    expect(scene.add.image).toHaveBeenCalledTimes(1);

    scene.time.now += 1;
    trail.update(true);
    expect(scene.add.image).toHaveBeenCalledTimes(2);
  });

  it('az inaktívvá válás nullázza a throttle-t, tehát az újraindulás azonnali', () => {
    trail.update(true);
    trail.update(false);

    // Az intervallum még nem telt el, mégis kell másolat: egy új roham eleje ne maradjon
    // csík nélkül.
    trail.update(true);
    expect(scene.add.image).toHaveBeenCalledTimes(2);
  });

  it('a másolat a forrás AKTUÁLIS frame-jét és geometriáját veszi át', () => {
    trail.update(true);
    const ghost = spawnedImages(scene)[0];

    expect(scene.add.image).toHaveBeenCalledWith(source.x, source.y, source.texture.key, 20);
    expect(ghost.originX).toBe(source.originX);
    expect(ghost.originY).toBe(source.originY);
    expect(ghost.flipX).toBe(true);
    expect(ghost.scaleX).toBe(2);
    expect(ghost.scaleY).toBe(2);
    // A forrás MÖGÉ kerül, hogy ne takarja ki a valódi bosst.
    expect(ghost.depth).toBe(source.depth - 1);
    expect(ghost.alpha).toBe(DEFAULT_ALPHA);
    expect(ghost.tint).toBe(DEFAULT_TINT);
  });

  it('a másolat elhalványul, majd megsemmisíti magát', () => {
    trail.update(true);
    const ghost = spawnedImages(scene)[0];

    const config = scene.tweens.add.mock.calls[0][0] as MockTweenConfig;
    expect(config.targets).toBe(ghost);
    expect(config.alpha).toBe(0);
    expect(config.duration).toBe(DEFAULT_FADE_MS);

    expect(ghost.destroyed).toBe(false);
    config.onComplete?.();
    expect(ghost.destroyed).toBe(true);
  });
});
