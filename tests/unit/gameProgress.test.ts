// Az „új játék tiszta lappal" invariánsai.
//
// A `systems/GameProgress.ts` — a `DialogueMemory` mintájára — NEM importál Phasert, csak a
// registry `remove` felületét várja strukturálisan, tehát mockolás nélkül tesztelhető.
//
// Miért éles ez: a Phaser registry GAME-szintű, tehát túléli a scene-váltásokat ÉS a
// végigjátszást is. Ha egy kulcs kimarad a listából, a hiba NÉMA — a második nekifutás
// egyszerűen "furcsán" viselkedik (a Level 1 ajtaja rögtön a Level 2-re visz, a player a pálya
// végén éled, a boss-átvezetők eltűnnek), és semmi nem jelez.
import { describe, it, expect, vi } from 'vitest';
import { PROGRESS_REGISTRY_KEYS, resetProgress } from '../../src/systems/GameProgress';
import { DIALOGUE_SEEN_REGISTRY_KEY } from '../../src/systems/DialogueMemory';

describe('GameProgress', () => {
  describe('resetProgress', () => {
    it('MINDEN kulcsot eltávolít, egyenként', () => {
      const remove = vi.fn();

      resetProgress({ remove });

      expect(remove).toHaveBeenCalledTimes(PROGRESS_REGISTRY_KEYS.length);
      for (const key of PROGRESS_REGISTRY_KEYS) {
        expect(remove).toHaveBeenCalledWith(key);
      }
    });
  });

  describe('a kulcs-lista teljessége', () => {
    it('minden kulcs egyedi', () => {
      expect(new Set(PROGRESS_REGISTRY_KEYS).size).toBe(PROGRESS_REGISTRY_KEYS.length);
    });

    // Mind a NÉGY boss győzelmi flagje. Ezek nyitják a pályák ajtajának "tovább" ágát, tehát
    // egy bennmaradt flag átugorná a soron következő harcot.
    it('tartalmazza mind a négy boss-flaget', () => {
      for (const key of ['bossDefeated', 'kingDefeated', 'beastMasterDefeated', 'demonDefeated']) {
        expect(PROGRESS_REGISTRY_KEYS).toContain(key);
      }
    });

    // Mind a HÁROM pálya checkpointja (Level1Scene / Level2Scene / Level3Scene). Egy bennmaradt
    // checkpoint a pálya VÉGÉN élesztené a playert egy friss játékban.
    it('tartalmazza mind a három checkpointot', () => {
      for (const key of ['checkpoint', 'level2Checkpoint', 'level3Checkpoint']) {
        expect(PROGRESS_REGISTRY_KEYS).toContain(key);
      }
    });

    // IMPORTTAL, nem beírt sztringként — így a kulcs átnevezése a `DialogueMemory`-ban nem
    // hagyhatja árván ezt a listát. Enélkül egy második végigjátszásból NÉMÁN eltűnne az összes
    // boss-párbeszéd (mind "már láttam"-ra futna).
    it('tartalmazza a látott párbeszédek kulcsát', () => {
      expect(PROGRESS_REGISTRY_KEYS).toContain(DIALOGUE_SEEN_REGISTRY_KEY);
    });

    // Regresszió: ha valaha új, játékon átívelő registry-kulcs jön, a felvétele legyen TUDATOS
    // lépés, ne felejtődjön el.
    it('pontosan nyolc kulcs van (4 boss + 3 checkpoint + a párbeszéd-emlékezet)', () => {
      expect(PROGRESS_REGISTRY_KEYS).toHaveLength(8);
    });
  });
});
