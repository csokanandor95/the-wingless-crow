// AudioManager unit tesztek — Project_plan.md §23 "Utility logic" (timers, state machines).
//
// A hangsúly nem a Phaser hang-API-ján van (azt nem a mi dolgunk tesztelni), hanem az
// AudioManager saját életciklus-logikáján: ne stackelődjön két loop, a fade ne induljon
// kétszer, és a scene leállása fade közben is elvágja a zenét. Ez utóbbi három a
// leggyakoribb valós hibaforrás, mert a Phaser SoundManager GAME-szintű, nem scene-szintű.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import AudioManager, {
  MUSIC_KEYS,
  SFX_KEYS,
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_FADE_IN_MS,
  DEFAULT_FADE_OUT_MS,
  DEFAULT_SFX_VOLUME,
  DEFAULT_SFX_DETUNE_RANGE,
  LEVEL_MUSIC_VOLUME,
  LEVEL_MUSIC_FADE_IN_MS,
  LEVEL2_MUSIC_FADE_IN_MS,
  FOOTSTEP_VOLUME,
  PLAYER_DEATH_VOLUME,
  DEATH_SFX_DETUNE_RANGE,
} from '../../src/systems/AudioManager';
import {
  createMockScene,
  flushLastTween,
  type MockScene,
  type MockSound,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

/** A `scene.sound.add()` n-edik (0-alapú) hívásának visszaadott mock hangja. */
function createdSound(scene: MockScene, index: number): MockSound {
  return scene.sound.add.mock.results[index].value as MockSound;
}

/** A legutóbb ütemezett fade-tween konfigja (`targets`, `volume`, `duration`, `onComplete`). */
function lastTweenConfig(scene: MockScene) {
  const calls = scene.tweens.add.mock.calls;
  return calls[calls.length - 1][0] as {
    targets: unknown;
    volume: number;
    duration: number;
    onComplete?: () => void;
  };
}

/** A `scene.sound.play()` legutóbbi hívásának konfigja (volume, detune). */
function lastSfxConfig(scene: MockScene) {
  const calls = scene.sound.play.mock.calls;
  return calls[calls.length - 1][1] as { volume?: number; detune?: number };
}

/** Egy `once(event, cb)` mockon regisztrált callback kikeresése és lefuttatása. */
function fireOnce(mock: ReturnType<typeof vi.fn>, event: string): void {
  const call = mock.mock.calls.find((args) => args[0] === event);
  if (!call) throw new Error(`Nincs '${event}' eseményre regisztrált callback.`);
  (call[1] as () => void)();
}

describe('AudioManager', () => {
  let scene: MockScene;
  let audio: AudioManager;

  beforeEach(() => {
    scene = createMockScene();
    audio = new AudioManager(scene as unknown as Phaser.Scene);
  });

  // Nem a lejátszás-logikát őrzik, hanem a KEVERÉSI SZÁNDÉKOT és a kulcstáblák épségét.
  describe('hangkeverés (mix) invariánsok', () => {
    it('minden zene-kulcs egyedi', () => {
      const keys = Object.values(MUSIC_KEYS);
      expect(new Set(keys).size).toBe(keys.length);
    });

    // A `2. Shadowforge Convergence (Loop)` EREDETILEG a Level 2 ambientje volt, és 2026-08-30-án
    // került át a végső arénára (user-döntés); a Level 2 azóta az `1. Whispers of the Abyss
    // (Loop)`-ot kapta. Mivel a ketto egy ideig UGYANAZ a sáv volt, egy későbbi "ez duplikátum,
    // vonjuk össze" takarítás csendben elvenné a végső harc zenéjét. Ez a teszt rögzíti, hogy
    // KÉT külön kulcs kell.
    it('a végső aréna és a Level 2 KÜLÖN zene-kulcsot használ', () => {
      expect(MUSIC_KEYS.FINAL_BOSS_THEME).toBeDefined();
      expect(MUSIC_KEYS.FINAL_BOSS_THEME).not.toBe(MUSIC_KEYS.LEVEL2_THEME);
    });

    // Mind az ÖT zenét játszó scene-nek (2 pálya + 3 boss aréna) saját kulcsa van.
    it('minden zenét játszó scene-nek van kulcsa', () => {
      expect(Object.keys(MUSIC_KEYS)).toHaveLength(5);
    });

    // A level ambient egy több perces szakaszon végig szól -> háttérben kell maradnia;
    // a harci SFX-nek pedig mindkét zenesáv fölött át kell vágnia. Egy későbbi
    // "csak feljebb veszem egy kicsit" hangolás nem fordíthatja meg észrevétlenül a sorrendet.
    it('level ambient < boss theme < SFX', () => {
      expect(LEVEL_MUSIC_VOLUME).toBeLessThan(DEFAULT_MUSIC_VOLUME);
      expect(DEFAULT_MUSIC_VOLUME).toBeLessThan(DEFAULT_SFX_VOLUME);
    });

    // A Level 2-be feloldott audio contexttel érkezünk (a NarrationScene felől), tehát ott
    // a zene tényleg a create() pillanatában indul — a fade-in az EGYETLEN dolog, ami
    // tompítja a belépést. A Level 1-en ezzel szemben az UNLOCKED-ág úgyis kivárja az első
    // billentyűleütést. Egy "egységesítsük a két konstanst" refaktor ezt csendben elvenné.
    it('a Level 2 belépője hosszabban fadel be, mint a Level 1-é', () => {
      expect(LEVEL2_MUSIC_FADE_IN_MS).toBeGreaterThan(LEVEL_MUSIC_FADE_IN_MS);
    });

    // A per-hang hangerők a forrásfájlok MÉRT csúcsértékéből vannak levezetve (lásd az
    // AudioManager kommentjét), mert a csomagok nincsenek egymáshoz normalizálva: a csúcsok
    // 0.081 és 0.708 között szórnak. Az "effektív hangosság" = csúcs * volume, és a
    // referencia a bevált kardsuhintás. Ezek az állítások azt őrzik, hogy egy későbbi
    // "csak felveszem egy kicsit" hangolás ne fordítsa meg a SZEREPEK sorrendjét.
    const PEAK = {
      SWORD_SWING: 0.287,
      FOOTSTEP: 0.214,
      PLAYER_DEATH: 0.699,
    } as const;
    const swordLoudness = PEAK.SWORD_SWING * DEFAULT_SFX_VOLUME;

    it('a lépés érezhetően halkabb a kardsuhintásnál', () => {
      // A player fut a pálya nagy részén: ha a lépés eléri a harc szintjét, elnyomja azt.
      expect(PEAK.FOOTSTEP * FOOTSTEP_VOLUME).toBeLessThan(swordLoudness * 0.6);
    });

    it('a player halála a kardsuhintásnál hangsúlyosabb', () => {
      expect(PEAK.PLAYER_DEATH * PLAYER_DEATH_VOLUME).toBeGreaterThan(swordLoudness);
    });

    // A detune-szórás ISMÉTLŐDŐ hangok gépiessége ellen való; egy halál egyszeri, drámai
    // esemény, amit egy véletlen elhangolás csak olcsóvá tenne.
    it('a halál-hangok pontos magasságon szólnak', () => {
      expect(DEATH_SFX_DETUNE_RANGE).toBe(0);
    });
  });

  describe('playMusic', () => {
    it('loopolva, némán hozza létre a hangot, elindítja, és felfadeli', () => {
      audio.playMusic(MUSIC_KEYS.BOSS_THEME);

      expect(scene.sound.add).toHaveBeenCalledWith(MUSIC_KEYS.BOSS_THEME, {
        loop: true,
        volume: 0,
      });
      expect(createdSound(scene, 0).play).toHaveBeenCalledTimes(1);

      const fade = lastTweenConfig(scene);
      expect(fade.targets).toBe(createdSound(scene, 0));
      expect(fade.volume).toBe(DEFAULT_MUSIC_VOLUME);
      expect(fade.duration).toBe(DEFAULT_FADE_IN_MS);
      expect(audio.getCurrentMusicKey()).toBe(MUSIC_KEYS.BOSS_THEME);
    });

    it('az options felülírja a hangerőt és a fade-in hosszát', () => {
      audio.playMusic(MUSIC_KEYS.BOSS_THEME, { volume: 0.2, fadeInMs: 100 });

      const fade = lastTweenConfig(scene);
      expect(fade.volume).toBe(0.2);
      expect(fade.duration).toBe(100);
    });

    // Ez a "boss arénába újra belépve két loop szól egymáson" regressziós tesztje.
    it('kétszeri hívás NEM stackel: az előző sáv azonnal felszabadul', () => {
      audio.playMusic(MUSIC_KEYS.BOSS_THEME);
      const firstSound = createdSound(scene, 0);
      const firstFadeTween = scene.tweens.add.mock.results[0].value as { stop: ReturnType<typeof vi.fn> };

      audio.playMusic(MUSIC_KEYS.BOSS_THEME);

      expect(firstFadeTween.stop).toHaveBeenCalled();
      expect(firstSound.destroy).toHaveBeenCalledTimes(1);
      expect(createdSound(scene, 1).destroy).not.toHaveBeenCalled();
    });
  });

  describe('autoplay policy (locked audio context)', () => {
    it('zárolt SoundManager esetén nem indít azonnal, csak UNLOCKED után', () => {
      scene.sound.locked = true;

      audio.playMusic(MUSIC_KEYS.BOSS_THEME);
      const sound = createdSound(scene, 0);
      expect(sound.play).not.toHaveBeenCalled();
      expect(scene.tweens.add).not.toHaveBeenCalled();

      fireOnce(scene.sound.once, 'unlocked');

      expect(sound.play).toHaveBeenCalledTimes(1);
      expect(lastTweenConfig(scene).volume).toBe(DEFAULT_MUSIC_VOLUME);
    });

    it('ha a feloldás előtt leáll a scene, az UNLOCKED már nem indítja el a hangot', () => {
      scene.sound.locked = true;
      audio.playMusic(MUSIC_KEYS.BOSS_THEME);
      const sound = createdSound(scene, 0);

      audio.destroy(); // pl. scene shutdown a feloldásra várva
      fireOnce(scene.sound.once, 'unlocked');

      expect(sound.play).not.toHaveBeenCalled();
    });
  });

  describe('stopMusic', () => {
    beforeEach(() => {
      audio.playMusic(MUSIC_KEYS.BOSS_THEME);
    });

    it('0-ra fadeli a hangerőt, és a fade végén felszabadítja a hangot', () => {
      audio.stopMusic();

      const fade = lastTweenConfig(scene);
      expect(fade.volume).toBe(0);
      expect(fade.duration).toBe(DEFAULT_FADE_OUT_MS);
      expect(createdSound(scene, 0).destroy).not.toHaveBeenCalled(); // még szól, csak halkul

      flushLastTween(scene); // a fade lefutott

      expect(createdSound(scene, 0).destroy).toHaveBeenCalledTimes(1);
      expect(audio.getCurrentMusicKey()).toBeNull();
    });

    it('a fade-in tweent leállítja, hogy a kifadelés az aktuális hangerőről induljon', () => {
      const fadeInTween = scene.tweens.add.mock.results[0].value as {
        stop: ReturnType<typeof vi.fn>;
      };

      audio.stopMusic();

      expect(fadeInTween.stop).toHaveBeenCalledTimes(1);
    });

    it('ismételt hívás nem indít második fade-et', () => {
      audio.stopMusic();
      const tweenCountAfterFirst = scene.tweens.add.mock.calls.length;

      audio.stopMusic();

      expect(scene.tweens.add.mock.calls.length).toBe(tweenCountAfterFirst);
    });

    it('zene nélkül no-op', () => {
      const freshScene = createMockScene();
      const freshAudio = new AudioManager(freshScene as unknown as Phaser.Scene);

      freshAudio.stopMusic();

      expect(freshScene.tweens.add).not.toHaveBeenCalled();
    });
  });

  // A playSfx() SZÁNDÉKOSAN másképp működik, mint a playMusic(): állapot nélküli one-shot,
  // ami nem exkluzív és nem is vár a feloldásra. Ezek a tesztek pont ezt a különbséget őrzik.
  describe('playSfx', () => {
    // A tábla nő minden SFX-iterációval. Egy másolat-beillesztésből maradt duplikált kulcs
    // NÉMÁN összeolvasztana két hangot (a BootScene ugyanarra a cache-bejegyzésre töltene),
    // és semmi nem szólna róla — sem a tsc, sem a build.
    it('minden SFX kulcs egyedi', () => {
      const keys = Object.values(SFX_KEYS);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('a megadott kulcsot és a default hangerőt adja át', () => {
      audio.playSfx(SFX_KEYS.SWORD_SWING);

      expect(scene.sound.play).toHaveBeenCalledTimes(1);
      expect(scene.sound.play.mock.calls[0][0]).toBe(SFX_KEYS.SWORD_SWING);
      expect(lastSfxConfig(scene).volume).toBe(DEFAULT_SFX_VOLUME);
    });

    it('az options felülírja a hangerőt', () => {
      audio.playSfx(SFX_KEYS.SWORD_IMPACT, { volume: 0.9 });

      expect(lastSfxConfig(scene).volume).toBe(0.9);
    });

    // A legfontosabb regressziós teszt: a playMusic() épp az ELLENKEZŐJÉT csinálja
    // (hard-stoppolja az előző sávot), az SFX-nek viszont tilos hozzányúlnia a zenéhez.
    it('NEM exkluzív: nem szakítja meg a szóló zenét, és nem is fadeli', () => {
      audio.playMusic(MUSIC_KEYS.BOSS_THEME);
      const tweensBefore = scene.tweens.add.mock.calls.length;

      audio.playSfx(SFX_KEYS.SWORD_SWING);
      audio.playSfx(SFX_KEYS.SWORD_IMPACT);

      expect(createdSound(scene, 0).destroy).not.toHaveBeenCalled();
      expect(audio.getCurrentMusicKey()).toBe(MUSIC_KEYS.BOSS_THEME);
      expect(scene.tweens.add.mock.calls.length).toBe(tweensBefore);
      // Az SFX one-shot: sound.play(), NEM sound.add() — nincs mit élettartamban kezelni.
      expect(scene.sound.add).toHaveBeenCalledTimes(1);
      expect(scene.sound.play).toHaveBeenCalledTimes(2);
    });

    // A zene UNLOCKED-re vár; egy késve elsülő kardsuhintás viszont rosszabb, mint a csend.
    it('zárolt SoundManager esetén eldobja a hangot, NEM halasztja el', () => {
      scene.sound.locked = true;

      audio.playSfx(SFX_KEYS.SWORD_SWING);

      expect(scene.sound.play).not.toHaveBeenCalled();
      expect(scene.sound.once).not.toHaveBeenCalled();
    });

    describe('detune (hangmagasság-szórás)', () => {
      it('default: a ±DEFAULT_SFX_DETUNE_RANGE tartományon belül marad', () => {
        for (let i = 0; i < 50; i++) {
          audio.playSfx(SFX_KEYS.SWORD_SWING);

          const detune = lastSfxConfig(scene).detune as number;
          expect(detune).toBeGreaterThanOrEqual(-DEFAULT_SFX_DETUNE_RANGE);
          expect(detune).toBeLessThanOrEqual(DEFAULT_SFX_DETUNE_RANGE);
        }
      });

      it('detuneRange: 0 esetén pontos lejátszás, nincs elhangolás', () => {
        audio.playSfx(SFX_KEYS.SWORD_IMPACT, { detuneRange: 0 });

        expect(lastSfxConfig(scene).detune).toBe(0);
      });
    });
  });

  describe('scene shutdown', () => {
    it('a konstruktor felregisztrálja a shutdown-hookot', () => {
      expect(scene.events.once).toHaveBeenCalledWith('shutdown', expect.any(Function));
    });

    it('shutdown FADE KÖZBEN is azonnal elvágja a zenét', () => {
      audio.playMusic(MUSIC_KEYS.BOSS_THEME);
      audio.stopMusic();
      const fadeOutTween = scene.tweens.add.mock.results[1].value as {
        stop: ReturnType<typeof vi.fn>;
      };

      fireOnce(scene.events.once, 'shutdown');

      expect(fadeOutTween.stop).toHaveBeenCalled();
      expect(createdSound(scene, 0).destroy).toHaveBeenCalledTimes(1);
      expect(audio.getCurrentMusicKey()).toBeNull();
    });

    it('shutdown a harc közben (fade nélkül) is leállítja a zenét', () => {
      audio.playMusic(MUSIC_KEYS.BOSS_THEME);

      fireOnce(scene.events.once, 'shutdown');

      expect(createdSound(scene, 0).destroy).toHaveBeenCalledTimes(1);
      expect(audio.getCurrentMusicKey()).toBeNull();
    });
  });
});
