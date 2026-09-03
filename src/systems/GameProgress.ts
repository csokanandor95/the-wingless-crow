import { DIALOGUE_SEEN_REGISTRY_KEY } from './DialogueMemory';

/**
 * „Mit kell törölni ahhoz, hogy egy ÚJ JÁTÉK tiszta lappal induljon?"
 *
 * A Phaser registry GAME-szintű, tehát túléli a scene-váltásokat ÉS a végigjátszást is — pont
 * ezért kell új játéknál explicit törölni. Enélkül a második nekifutás a Level 1 ajtajánál
 * azonnal a Level 2-re vinne, a player a pálya végén éledne, és egyetlen boss-párbeszéd sem
 * futna le (mind „már láttam"-ra futna).
 *
 * **A lista KORÁBBAN a `CreditsScene`-ben élt**, és a credits vége hívta. 2026-09-03 óta a
 * `MainMenuScene` „Start Game"-je hívja: ott kezdődik ténylegesen egy futás, és a menübe a
 * credits felől IS visszajutunk. Így a `CreditsScene` már nem tud a progresszről, a törlés
 * pedig akkor is lefut, ha a játékos a credits után a menüből indít újat.
 *
 * A modul — a `DialogueMemory` mintájára — NEM importál Phasert, csak a registry `remove`
 * felületét várja strukturálisan, tehát mockolás nélkül unit-tesztelhető.
 */

/**
 * A Phaser registry (`Phaser.Data.DataManager`) minimális felülete: új játéknál csak törölni
 * kell.
 */
export interface ProgressStore {
  remove(key: string): unknown;
}

/**
 * Minden játékon átívelő registry-kulcs. Ha valaha új ilyen jön, IDE is fel kell venni —
 * a `gameProgress.test.ts` ezt regresszióként őrzi.
 *
 * Ahol íródnak: `bossDefeated` (BossScene), `kingDefeated` (Boss2Scene),
 * `beastMasterDefeated` (Boss3Scene), `demonDefeated` (FinalBossScene), `checkpoint`
 * (Level1Scene), `level2Checkpoint` (Level2Scene), `level3Checkpoint` (Level3Scene).
 */
export const PROGRESS_REGISTRY_KEYS = [
  'bossDefeated',
  'kingDefeated',
  'beastMasterDefeated',
  'demonDefeated',
  'checkpoint',
  'level2Checkpoint',
  'level3Checkpoint',
  // A már látott boss-párbeszédek listája (systems/DialogueMemory). IMPORTTAL, nem beírt
  // sztringként: így a kulcs átnevezése nem hagyhatja árván ezt a listát.
  DIALOGUE_SEEN_REGISTRY_KEY,
] as const;

/** Új játék tiszta lappal — a `MainMenuScene` „Start Game"-je hívja, közvetlenül a fade előtt. */
export function resetProgress(store: ProgressStore): void {
  for (const key of PROGRESS_REGISTRY_KEYS) store.remove(key);
}
