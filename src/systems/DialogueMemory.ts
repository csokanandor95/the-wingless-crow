/**
 * „Melyik boss párbeszédét látta már a player?"
 *
 * Mind a négy aréna párbeszéddel nyit, és a harc csak utána indul. Egy bukott próbálkozás
 * után viszont a dialógust nem kell újranézni — a `FinalBossScene` ezt eddig scene-adattal
 * (`{ skipDialogue: true }`) oldotta meg, mert ott a vereség UGYANAZT a scene-t indítja újra.
 *
 * A Boss 1/2/3 retry-útja azonban ÁTMEGY EGY MÁSIK SCENE-EN (halál -> a pálya checkpointja ->
 * ajtó -> aréna), amit a scene-adat nem él túl. Ezért ez a modul a **registry**-be ír, ami
 * game-szintű, tehát a scene-váltásokat átvészeli.
 *
 * **EGYETLEN kulcs alatt egy scene-kulcs lista**, nem bossonként külön registry-bejegyzés: így
 * egy új boss felvétele nem jár se új kulccsal, se a takarítás bővítésével.
 *
 * FIGYELEM: a registry a végigjátszást is túléli — a `CreditsScene` új játéknál ezért törli a
 * `DIALOGUE_SEEN_REGISTRY_KEY`-t is (a `PROGRESS_REGISTRY_KEYS` listában). Enélkül egy második
 * végigjátszásból NÉMÁN eltűnne az összes boss-párbeszéd.
 */

/** A registry-kulcs, ami alatt a már látott párbeszédek scene-kulcsai ülnek (`string[]`). */
export const DIALOGUE_SEEN_REGISTRY_KEY = 'dialoguesSeen';

/**
 * A Phaser registry (`Phaser.Data.DataManager`) minimális felülete. Így a modul NEM importál
 * Phasert, tehát mockolás nélkül unit-tesztelhető — ugyanaz az elv, mint a `Level*Layout`
 * adatmoduloknál és a `Dialogue` pure magjánál.
 */
export interface DialogueMemoryStore {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
}

function seenList(store: DialogueMemoryStore): string[] {
  const stored = store.get(DIALOGUE_SEEN_REGISTRY_KEY);
  return Array.isArray(stored) ? (stored as string[]) : [];
}

/** Látta-e már a player az adott scene (jellemzően `this.scene.key`) párbeszédét? */
export function hasSeenDialogue(store: DialogueMemoryStore, id: string): boolean {
  return seenList(store).includes(id);
}

/**
 * A párbeszéd VÉGIGNÉZETTNEK jelölése. Idempotens: ugyanaz a scene-kulcs nem kerül be
 * kétszer.
 *
 * A hívás helye mindenütt a `Dialogue` `onComplete`-je, nem a párbeszéd indítása: a
 * dialógusból nincs kilépési út (a `PlayerController` csak a `beginFight()`-ban jön létre),
 * tehát ez az egyetlen pont, ahol a szöveg biztosan lement.
 */
export function markDialogueSeen(store: DialogueMemoryStore, id: string): void {
  const seen = seenList(store);
  if (seen.includes(id)) return;

  store.set(DIALOGUE_SEEN_REGISTRY_KEY, [...seen, id]);
}
