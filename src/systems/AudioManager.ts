import Phaser from 'phaser';

// Projektterv 18. pont – Audio.
//
// Két, SZÁNDÉKOSAN eltérő felépítésű ág él egymás mellett:
//  - ZENE: egyetlen, EXKLUZÍV sáv, fade-innel/fade-outtal és élettartam-kezeléssel
//    (`this.music`), mert egyszerre csak egy loop szólhat.
//  - SFX: állapot nélküli, NEM exkluzív one-shot lejátszás (`playSfx()`) — több csapás
//    hangja nyugodtan átfedhet, és a hang a lejátszás végén magától felszabadul.
// A kettő nem nyúl egymáshoz: egy SFX soha nem szakítja meg a zenét, és fordítva.
export const MUSIC_KEYS = {
  BOSS_THEME: 'boss-theme',
} as const;

export const SFX_KEYS = {
  SWORD_SWING: 'sfx-sword-swing',
  SWORD_IMPACT: 'sfx-sword-impact',
} as const;

export const DEFAULT_MUSIC_VOLUME = 0.45;
export const DEFAULT_FADE_IN_MS = 800;
export const DEFAULT_FADE_OUT_MS = 1500;

// Szándékosan a zene hangereje FÖLÖTT: a boss theme alatt is át kell vágnia.
export const DEFAULT_SFX_VOLUME = 0.5;
/** ±cent véletlen elhangolás hívásonként — egyetlen fájlból is változatos sorozat. */
export const DEFAULT_SFX_DETUNE_RANGE = 120;

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

export interface PlaySfxOptions {
  volume?: number;
  /** 0 = pontos lejátszás; egyébként ±ennyi cent véletlen elhangolás. */
  detuneRange?: number;
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

  /**
   * One-shot hangeffekt. NEM exkluzív: több hívás hangja átfedhet, és a zenét sem érinti.
   *
   * A `sound.play(key, config)` (szemben a `sound.add()`-del) olyan hangot hoz létre, ami a
   * lejátszás végén magától felszabadul — ezért nincs hozzá `this.music`-szerű
   * élettartam-kezelés, és a shutdown-hook sem foglalkozik vele (0,5 mp-es csattanás
   * nyugodtan végigszólhat a scene-váltás fade-je alatt).
   */
  playSfx(key: string, options: PlaySfxOptions = {}): void {
    // Zárolt audio contextnél az SFX-et ELDOBJUK, NEM halasztjuk (szemben a zenével, ami
    // az UNLOCKED eseményre vár): egy másodpercekkel később elsülő kardsuhintás rosszabb,
    // mint a néma csapás. A gyakorlatban ide amúgy sem jutunk — a Phaser
    // WebAudioSoundManager már az első keydown-ra felold, márpedig a támadás billentyű.
    if (this.scene.sound.locked) return;

    const detuneRange = options.detuneRange ?? DEFAULT_SFX_DETUNE_RANGE;

    this.scene.sound.play(key, {
      volume: options.volume ?? DEFAULT_SFX_VOLUME,
      detune: detuneRange === 0 ? 0 : Phaser.Math.Between(-detuneRange, detuneRange),
    });
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
