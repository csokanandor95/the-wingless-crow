import Phaser from 'phaser';

// Projektterv 18. pont – Audio. Első iteráció: egyetlen zenesáv (boss theme) kezelése
// fade-innel/fade-outtal. SFX és level-ambient a Phase 8 további iterációiban jön.
export const MUSIC_KEYS = {
  BOSS_THEME: 'boss-theme',
} as const;

export const DEFAULT_MUSIC_VOLUME = 0.45;
export const DEFAULT_FADE_IN_MS = 800;
export const DEFAULT_FADE_OUT_MS = 1500;

/**
 * A `sound.add()` deklarált visszatérési típusa `Phaser.Sound.BaseSound`, amin viszont
 * NINCS `volume`/`setVolume` — azok csak a konkrét implementációkon élnek. Mivel a fade
 * a `volume` tweenelésén alapul, erre a unióra szűkítünk. (A `NoAudioSound` ág — audio
 * nélküli böngésző — is biztonságos: ott a `play()` egyszerűen `false`-t ad vissza.)
 */
type PlayableSound =
  | Phaser.Sound.WebAudioSound
  | Phaser.Sound.HTML5AudioSound
  | Phaser.Sound.NoAudioSound;

export interface PlayMusicOptions {
  volume?: number;
  fadeInMs?: number;
}

export default class AudioManager {
  private scene: Phaser.Scene;
  private music: PlayableSound | null = null;
  private fadeTween: Phaser.Tweens.Tween | null = null;
  private isStopping = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // FONTOS: a Phaser SoundManager GAME-szintű, nem scene-szintű. Egy itt indított loop
    // simán túlélné a scene leállását, és a scene-be való újbóli belépéskor két példány
    // szólna egymáson. Ezért a scene shutdownja mindig, fade nélkül elvágja a zenét.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  playMusic(key: string, options: PlayMusicOptions = {}): void {
    // Egy esetleg még futó (vagy épp kifadelő) sáv azonnali elvágása — így nem stackelődik.
    this.stopMusicImmediately();

    const targetVolume = options.volume ?? DEFAULT_MUSIC_VOLUME;
    const fadeInMs = options.fadeInMs ?? DEFAULT_FADE_IN_MS;

    // Némán indul, a hangerőt a fade-in tween viszi fel.
    const sound = this.scene.sound.add(key, { loop: true, volume: 0 }) as PlayableSound;
    this.music = sound;

    // Autoplay policy: a Phaser WebAudioSoundManager touch/mouse/KEYDOWN eseményre oldja fel
    // az audio contextet. Mire a player a boss arénába ér, ez rég megtörtént (végigjátszotta
    // a Level 1-et), de ha valaki mégis feloldatlan állapotban jutna ide, megvárjuk.
    if (this.scene.sound.locked) {
      this.scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        this.startAndFadeIn(sound, targetVolume, fadeInMs);
      });
      return;
    }

    this.startAndFadeIn(sound, targetVolume, fadeInMs);
  }

  private startAndFadeIn(sound: PlayableSound, targetVolume: number, fadeInMs: number): void {
    // Az UNLOCKED-re várakozás alatt a sáv lecserélődhetett vagy a scene leállhatott.
    if (this.music !== sound) return;

    sound.play();
    this.fadeTo(sound, targetVolume, fadeInMs, false);
  }

  /** Elhalkítja, majd felszabadítja az aktuális zenét. Ismételt hívás no-op. */
  stopMusic(fadeOutMs = DEFAULT_FADE_OUT_MS): void {
    if (!this.music || this.isStopping) return;

    this.isStopping = true;
    this.fadeTo(this.music, 0, fadeOutMs, true);
  }

  getCurrentMusicKey(): string | null {
    return this.music?.key ?? null;
  }

  destroy(): void {
    this.stopMusicImmediately();
  }

  private fadeTo(
    sound: PlayableSound,
    targetVolume: number,
    durationMs: number,
    releaseOnComplete: boolean
  ): void {
    // Egy futó fade (pl. fade-in) leállítása, hogy az új fade az AKTUÁLIS hangerőről induljon.
    this.clearFadeTween();

    this.fadeTween = this.scene.tweens.add({
      targets: sound,
      volume: targetVolume,
      duration: durationMs,
      onComplete: () => {
        this.fadeTween = null;
        if (releaseOnComplete) this.releaseMusic();
      },
    });
  }

  private clearFadeTween(): void {
    this.fadeTween?.stop();
    this.fadeTween = null;
  }

  private releaseMusic(): void {
    this.music?.destroy();
    this.music = null;
    this.isStopping = false;
  }

  private stopMusicImmediately(): void {
    this.clearFadeTween();
    if (this.music) this.releaseMusic();
  }
}
