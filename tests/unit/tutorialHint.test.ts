// A billentyű-súgó tesztjei.
//
// A súlypont a KÖZÉPRE IGAZÍTÁS EGÉSZ PIXELRE — ez a „remegő felirat" hibájának
// regressziós védelme (lásd `TutorialHint.centerText()` doc-kommentjét). Egy jövőbeli
// `setOrigin(0.5)`-re visszaírás itt bukik el, nem a következő kézi végigjátszáson.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import TutorialHint from '../../src/ui/TutorialHint';
import type { TutorialHintDef } from '../../src/levels/LevelGeometry';
import { createMockScene, type MockScene } from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

const HINTS: TutorialHintDef[] = [
  { id: 'a', triggerX: 0, text: 'egy' },
  { id: 'b', triggerX: 1000, text: 'kettő' },
];

describe('TutorialHint', () => {
  let scene: MockScene;
  let hint: TutorialHint;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function text(): any {
    return scene.add.text.mock.results[0].value;
  }

  beforeEach(() => {
    scene = createMockScene();
    hint = new TutorialHint(scene as unknown as Phaser.Scene, HINTS);
  });

  it('a horgony (0, 0) — a középre igazítást a pozíció adja, nem az origin', () => {
    // Ez a "remegés" javításának lényege: origin 0.5 mellett a pozíció
    // `HINT_X - displayWidth / 2`, ami PÁRATLAN szélességnél FÉL pixelre esik, és a
    // mozgó kamera lebegőpontos maradéka mellett a roundPixels frame-enként átbillenti.
    expect(text().setOrigin).toHaveBeenCalledWith(0, 0);
  });

  it('PÁRATLAN szélességnél is EGÉSZ pixelre kerül', () => {
    text().displayWidth = 201;
    text().displayHeight = 41;

    hint.update(0);

    expect(Number.isInteger(text().x)).toBe(true);
    expect(Number.isInteger(text().y)).toBe(true);
  });

  it('páros szélességnél pontosan középen áll', () => {
    text().displayWidth = 200;
    text().displayHeight = 40;

    hint.update(0);

    // HINT_X = 400, HINT_Y = 74 (a modul privát konstansai) — a felirat közepe ide esik.
    expect(text().x + 200 / 2).toBe(400);
    expect(text().y + 40 / 2).toBe(74);
  });

  it('a triggerX átlépésekor jelenik meg, és csak EGYSZER', () => {
    hint.update(0); // 'a' triggerel
    const showsAfterFirst = scene.tweens.add.mock.calls.length;

    hint.update(10);
    hint.update(500);
    expect(scene.tweens.add.mock.calls.length).toBe(showsAfterFirst);

    hint.update(1000); // 'b' triggerel
    expect(scene.tweens.add.mock.calls.length).toBe(showsAfterFirst + 1);
  });

  it('minden új felirat ÚJRA igazít — a szélesség súgónként más', () => {
    text().displayWidth = 100;
    hint.update(0);
    const firstX = text().x;

    text().displayWidth = 300;
    hint.update(1000);

    expect(text().x).not.toBe(firstX);
    expect(Number.isInteger(text().x)).toBe(true);
  });

  it('a scene shutdownjára maga takarít', () => {
    expect(scene.events.once).toHaveBeenCalled();
  });
});
