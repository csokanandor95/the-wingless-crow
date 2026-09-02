import { describe, expect, it } from 'vitest';
import {
  DIALOGUE_SEEN_REGISTRY_KEY,
  hasSeenDialogue,
  markDialogueSeen,
  type DialogueMemoryStore,
} from '../../src/systems/DialogueMemory';

/**
 * A modul SZÁNDÉKOSAN nem importál Phasert (csak a registry strukturális felületét várja),
 * ezért itt — a többi teszt fájllal ellentétben — nem kell `vi.mock('phaser', ...)`.
 * Egy Map-alapú fake store elég.
 */
function createStore(initial?: Record<string, unknown>): DialogueMemoryStore & {
  raw: Map<string, unknown>;
} {
  const raw = new Map<string, unknown>(Object.entries(initial ?? {}));
  return {
    raw,
    get: (key: string) => raw.get(key),
    set: (key: string, value: unknown) => raw.set(key, value),
  };
}

describe('DialogueMemory', () => {
  it('üres registryn még egyetlen párbeszédet sem látott a player', () => {
    const store = createStore();

    expect(hasSeenDialogue(store, 'BossScene')).toBe(false);
  });

  it('a jelölés után az adott scene párbeszéde látottnak számít', () => {
    const store = createStore();

    markDialogueSeen(store, 'BossScene');

    expect(hasSeenDialogue(store, 'BossScene')).toBe(true);
  });

  it('a jelölés CSAK az adott scene-re vonatkozik', () => {
    const store = createStore();

    markDialogueSeen(store, 'BossScene');

    // A Boss 2 párbeszédét ettől még végig kell nézni.
    expect(hasSeenDialogue(store, 'Boss2Scene')).toBe(false);
  });

  it('több scene jelölése egymás mellett megél', () => {
    const store = createStore();

    markDialogueSeen(store, 'BossScene');
    markDialogueSeen(store, 'Boss2Scene');
    markDialogueSeen(store, 'FinalBossScene');

    expect(hasSeenDialogue(store, 'BossScene')).toBe(true);
    expect(hasSeenDialogue(store, 'Boss2Scene')).toBe(true);
    expect(hasSeenDialogue(store, 'FinalBossScene')).toBe(true);
  });

  it('a jelölés idempotens: ugyanaz a scene nem kerül be kétszer', () => {
    const store = createStore();

    markDialogueSeen(store, 'BossScene');
    markDialogueSeen(store, 'BossScene');

    expect(store.raw.get(DIALOGUE_SEEN_REGISTRY_KEY)).toEqual(['BossScene']);
  });

  it('minden EGYETLEN registry-kulcs alatt tárolódik — ezt törli a CreditsScene új játéknál', () => {
    const store = createStore();

    markDialogueSeen(store, 'BossScene');
    markDialogueSeen(store, 'Boss3Scene');

    expect([...store.raw.keys()]).toEqual([DIALOGUE_SEEN_REGISTRY_KEY]);
  });

  /**
   * Regresszió: a registry a végigjátszást is túléli, tehát az új játék takarítása után
   * (`registry.remove(...)` -> a `get()` undefined-ot ad) MINDEN párbeszédnek újra le kell
   * futnia. Ha a `hasSeenDialogue()` valaha nem tömb-értékre is `true`-t adna, ez bukik.
   */
  it('a kulcs törlése után minden párbeszéd újra lefut', () => {
    const store = createStore();
    markDialogueSeen(store, 'BossScene');

    store.raw.delete(DIALOGUE_SEEN_REGISTRY_KEY);

    expect(hasSeenDialogue(store, 'BossScene')).toBe(false);
  });
});
