import { beforeEach, describe, expect, it, vi } from 'vitest';

// A vitest a vi.mock() hívást a fájl IMPORT sorai FÖLÉ mozgatja, ezért a factory nem
// hivatkozhat statikusan importált binding-ra (TDZ hiba) — innen a dinamikus import().
vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

import Dialogue, {
  autoAdvanceDue,
  charsRevealedAt,
  LINE_HOLD_MS,
  TYPE_SPEED_MS,
  type DialogueLine,
} from '../../src/ui/Dialogue';
import { createMockScene, type MockScene } from './helpers/phaserTestUtils';

const OPTIONS = { groundTop: 369, viewportWidth: 800 };

const LINES: DialogueLine[] = [
  { speaker: 'A', text: 'abcd' },
  { speaker: 'B', text: 'efg' },
];

/** Egy sor teljes végiggépeléséhez szükséges idő. */
const typeMs = (text: string): number => text.length * TYPE_SPEED_MS;

describe('Dialogue – pure mag', () => {
  it('a gépelés a sor kezdete óta eltelt időből származik', () => {
    expect(charsRevealedAt(0, TYPE_SPEED_MS)).toBe(0);
    expect(charsRevealedAt(-5, TYPE_SPEED_MS)).toBe(0);
    expect(charsRevealedAt(TYPE_SPEED_MS, TYPE_SPEED_MS)).toBe(1);
    expect(charsRevealedAt(TYPE_SPEED_MS * 3.9, TYPE_SPEED_MS)).toBe(3);
  });

  it('az automata léptetés a GÉPELÉS UTÁN indítja a tartást, nem a sor kezdetétől', () => {
    const length = 4;
    const typed = length * TYPE_SPEED_MS;

    // A tartás még nem telt le, pedig a szöveg már kész.
    expect(autoAdvanceDue(typed, length, TYPE_SPEED_MS, LINE_HOLD_MS)).toBe(false);
    expect(autoAdvanceDue(typed + LINE_HOLD_MS - 1, length, TYPE_SPEED_MS, LINE_HOLD_MS)).toBe(
      false
    );
    expect(autoAdvanceDue(typed + LINE_HOLD_MS, length, TYPE_SPEED_MS, LINE_HOLD_MS)).toBe(true);
  });

  it('hosszabb sor hosszabb ideig áll — a tartás a gépelés VÉGÉHEZ képest fix', () => {
    const short = autoAdvanceDue(LINE_HOLD_MS + 10 * TYPE_SPEED_MS, 10, TYPE_SPEED_MS, LINE_HOLD_MS);
    const long = autoAdvanceDue(LINE_HOLD_MS + 10 * TYPE_SPEED_MS, 40, TYPE_SPEED_MS, LINE_HOLD_MS);

    expect(short).toBe(true);
    expect(long).toBe(false);
  });
});

describe('Dialogue – lejátszás', () => {
  let scene: MockScene;
  let onComplete: ReturnType<typeof vi.fn>;

  const currentBody = (): string => {
    // Az utolsó bodyText.setText() argumentuma. A mock scene minden add.text()-re új objektumot
    // ad; a sorrend: speaker, body, hint.
    const bodyText = scene.add.text.mock.results[1].value as {
      setText: { mock: { calls: string[][] } };
    };
    const calls = bodyText.setText.mock.calls;
    return calls.length ? calls[calls.length - 1][0] : '';
  };

  const currentSpeaker = (): string => {
    const speakerText = scene.add.text.mock.results[0].value as {
      setText: { mock: { calls: string[][] } };
    };
    const calls = speakerText.setText.mock.calls;
    return calls.length ? calls[calls.length - 1][0] : '';
  };

  const create = (): Dialogue => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Dialogue(scene as any, LINES, OPTIONS, onComplete as () => void);
  };

  beforeEach(() => {
    scene = createMockScene();
    onComplete = vi.fn();
  });

  it('a szöveg karakterenként jelenik meg, a beszélő neve azonnal', () => {
    const dialogue = create();

    expect(currentSpeaker()).toBe('A');
    expect(currentBody()).toBe('');

    dialogue.update(TYPE_SPEED_MS * 2);
    expect(currentBody()).toBe('ab');

    dialogue.update(TYPE_SPEED_MS * 2);
    expect(currentBody()).toBe('abcd');
  });

  it('MAGÁTÓL lép a következő sorra, érintés nélkül', () => {
    const dialogue = create();

    dialogue.update(typeMs('abcd') + LINE_HOLD_MS - 1);
    expect(currentSpeaker()).toBe('A');

    dialogue.update(1);
    expect(currentSpeaker()).toBe('B');
    // Az új sor a nulláról gépel, nem örökli az előző sor eltelt idejét.
    expect(currentBody()).toBe('');
  });

  it('advance() GÉPELÉS KÖZBEN befejezi a sort, de NEM lép tovább', () => {
    const dialogue = create();

    dialogue.update(TYPE_SPEED_MS);
    expect(currentBody()).toBe('a');

    dialogue.advance();
    expect(currentBody()).toBe('abcd');
    expect(currentSpeaker()).toBe('A');
  });

  it('advance() KÉSZ sornál azonnal a következőre lép — így pörgethető végig', () => {
    const dialogue = create();

    dialogue.advance(); // 1. sor kész
    dialogue.advance(); // 2. sorra lép
    expect(currentSpeaker()).toBe('B');

    dialogue.advance(); // 2. sor kész
    expect(onComplete).not.toHaveBeenCalled();

    dialogue.advance(); // vége
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(dialogue.isFinished()).toBe(true);
  });

  it('a befejezett sor a tartás alatt is a TELJES szöveget mutatja', () => {
    const dialogue = create();

    dialogue.advance();
    dialogue.update(LINE_HOLD_MS - 1);

    expect(currentBody()).toBe('abcd');
    expect(currentSpeaker()).toBe('A');
  });

  it('az advance()-szel befejezett sor tartása a gyorsítás pillanatától indul', () => {
    const dialogue = create();

    dialogue.update(TYPE_SPEED_MS); // 1 karakter
    dialogue.advance(); // ugrás a gépelés végére

    dialogue.update(LINE_HOLD_MS - 1);
    expect(currentSpeaker()).toBe('A');

    dialogue.update(1);
    expect(currentSpeaker()).toBe('B');
  });

  it('egy update() LEGFELJEBB EGY sort léptet, bármilyen nagy is a delta', () => {
    const dialogue = create();

    // Egy frame-akadás (vagy háttérbe tett fül) után a Phaser több száz ms-os deltát ad.
    // Ez NEM pörgetheti át a párbeszédet, mielőtt a player elolvasná.
    dialogue.update(1_000_000);

    expect(currentSpeaker()).toBe('B');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('az onComplete PONTOSAN EGYSZER fut le, akkor is, ha az update() tovább ketyeg', () => {
    const dialogue = create();

    dialogue.update(1_000_000); // 1. sor -> 2. sor
    dialogue.update(1_000_000); // 2. sor -> vége
    expect(onComplete).toHaveBeenCalledTimes(1);

    dialogue.update(1_000_000);
    dialogue.advance();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('a végén felszabadítja a panelt és a feliratokat', () => {
    const dialogue = create();
    dialogue.update(1_000_000);
    dialogue.update(1_000_000);

    const panel = scene.add.graphics.mock.results[0].value as { destroyed: boolean };
    expect(panel.destroyed).toBe(true);

    for (const result of scene.add.text.mock.results) {
      const text = result.value as { destroyed: boolean };
      expect(text.destroyed).toBe(true);
    }

    // A destroy() idempotens: a scene-shutdown hookja is meghívja majd.
    expect(() => dialogue.destroy()).not.toThrow();
  });

  it('a scene SHUTDOWN-jára maga iratkozik fel — a scene-nek nincs takarítási teendője', () => {
    create();

    expect(scene.events.once).toHaveBeenCalledWith('shutdown', expect.any(Function));
  });
});
