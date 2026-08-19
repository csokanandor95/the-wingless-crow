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
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_FADE_IN_MS,
  DEFAULT_FADE_OUT_MS,
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
