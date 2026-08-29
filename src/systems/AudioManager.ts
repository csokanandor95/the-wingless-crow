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
  LEVEL1_THEME: 'level1-theme',
  LEVEL2_THEME: 'level2-theme',
} as const;

export const SFX_KEYS = {
  SWORD_SWING: 'sfx-sword-swing',
  SWORD_IMPACT: 'sfx-sword-impact',
  /** A player tűzgolyója — a lövedék születésének pillanatában ('fireball-cast'). */
  FIREBALL_CAST: 'sfx-fireball-cast',
  /** A boss lövedéke. SZÁNDÉKOSAN másik hang, mint a playeré: hallani, kié a lövedék. */
  BOSS_PROJECTILE: 'sfx-boss-projectile',
  /** A Shadow Spell BECSAPÓDÁSA — nem a cast, és nem is a telegraph alatt. */
  BOSS_SPELL_IMPACT: 'sfx-boss-spell-impact',
  /**
   * A Gravecaller lövedéke, a KIOLDÁS pillanatában. Harmadik, saját tűzgolyó-hang: a
   * player (Fireball 2) és a boss (Fireball 3) mellé a csomag addig nem használt
   * Fireball 1-e — így három lövedék-forrás hallás után is megkülönböztethető.
   */
  GRAVECALLER_CAST: 'sfx-gravecaller-cast',
  /** A CrowHarvester ÉS a boss közelharci csapása — közös hang. */
  ENEMY_SWING: 'sfx-enemy-swing',
  /**
   * A player lépése futás közben. AZ EGYETLEN ISMÉTLŐDŐ SFX a projektben: nem egy diszkrét
   * eseményre szól, hanem a `Player` kadenciájára (`FOOTSTEP_INTERVAL_MS`).
   */
  PLAYER_FOOTSTEP: 'sfx-player-footstep',
  /** A player ugrása — a `jump()` grounded-guardja mögül. */
  PLAYER_JUMP: 'sfx-player-jump',
  /** A player halála (a zuhanás-halált is beleértve), a `die()`-ból. */
  PLAYER_DEATH: 'sfx-player-death',
  /** A CrowHarvester halála. SZÁNDÉKOSAN más lény-hang, mint a Gravecalleré. */
  HARVESTER_DEATH: 'sfx-harvester-death',
  /** A Gravecaller halála — hosszabb, „elnyújtottabb" haláltusa. */
  GRAVECALLER_DEATH: 'sfx-gravecaller-death',
} as const;

export const DEFAULT_MUSIC_VOLUME = 0.45;
export const DEFAULT_FADE_IN_MS = 800;
export const DEFAULT_FADE_OUT_MS = 1500;

/**
 * A projekt HANGKEVERÉSI hierarchiája, egy helyen (unit teszt őrzi a sorrendet):
 *   SFX (0.5)  >  boss theme (0.45)  >  level ambient (0.35)
 * A level-zene egy több perces szakaszon végig szól, ezért marad háttérben; a boss theme
 * pedig érezhetően felerősödik hozzá képest, amikor a harc kezdődik.
 */
export const LEVEL_MUSIC_VOLUME = 0.35;
/**
 * Ambient sávhoz hosszabb belépő, mint a boss theme 800ms-a. Ez itt nem esztétikai
 * finomság: a Level 1 közvetlenül az oldalbetöltés után indul, tehát az audio context
 * MINDIG zárolt, és a zene csak az első billentyűlenyomásnál kezd szólni — egy hirtelen
 * berobbanó sáv ott zavaró lenne. Lásd a Level1Scene.create() kommentjét.
 */
export const LEVEL_MUSIC_FADE_IN_MS = 2000;
/**
 * A Level 2 belépője SZÁNDÉKOSAN hosszabb a Level 1-énél, és ez nem ízlés kérdése, hanem a
 * két belépés különbsége:
 *  - a Level 1 közvetlenül az oldalbetöltés után indul, tehát az audio context ZÁROLT — a
 *    sáv ott amúgy is csak az első billentyűlenyomásnál kezd szólni (az UNLOCKED-ág);
 *  - a Level 2-be a NarrationScene felől érkezünk, MÁR FELOLDOTT contexttel, tehát a zene
 *    valóban a create() pillanatában indul. Itt a fade-in az EGYETLEN dolog, ami tompítja
 *    a belépést — a nyers sáv különben teljes intenzitással ütne be a fekete képernyőből.
 */
export const LEVEL2_MUSIC_FADE_IN_MS = 4000;

// Szándékosan a zene hangereje FÖLÖTT: a boss theme alatt is át kell vágnia.
export const DEFAULT_SFX_VOLUME = 0.5;
/** ±cent véletlen elhangolás hívásonként — egyetlen fájlból is változatos sorozat. */
export const DEFAULT_SFX_DETUNE_RANGE = 120;

/**
 * PER-HANG HANGERŐ — miért nem elég egyetlen közös `DEFAULT_SFX_VOLUME`.
 *
 * A forrás-csomagok NINCSENEK egymáshoz normalizálva: a hullámformák mért csúcsértéke
 * 0.081 és 0.708 között szór, ami majdnem 19 dB. Közös hangerővel a lépés hallhatatlan
 * lenne, a halál-nyögés pedig kiabálna — tehát ezek a számok NEM ízlés szerint hangoltak,
 * hanem méréssel levezetettek.
 *
 * Referencia a már bevált kardsuhintás: `sword-attack-2` csúcsa **0.287**, a hangereje
 * `DEFAULT_SFX_VOLUME` (0.5) -> **0.1435 effektív**. Minden új hangnál:
 *
 *     volume = (cél-arány * 0.1435) / a forrás mért csúcsa
 *
 * | hang                | forrás-csúcs | cél a referenciához | volume |
 * |---------------------|--------------|---------------------|--------|
 * | lépés               | 0.214        |  45 %               | 0.30   |
 * | ugrás               | 0.080        |  60 %               | 1.00 * |
 * | CrowHarvester halál | 0.362        | 100 %               | 0.40   |
 * | Gravecaller halál   | 0.256        | 100 %               | 0.56   |
 * | player halál        | 0.699        | 130 %               | 0.27   |
 *
 * (*) Az ugrás a képlet szerint 1.06-ot kívánna; 1.0 a maximum, amit torzítás nélkül
 * kiadhatunk, tehát ez a hang marad kissé a célszint alatt. A forrásfájl egyszerűen halk
 * (nincs éles dobbantása — ~470 ms páncélcsörgés). Ha kézi teszten nem hallható, NEM ezt
 * a számot kell emelni, hanem hangosabb assetet keresni.
 *
 * **Ha valaha lecserélsz egy assetet, a hangerőt ÚJRA KELL SZÁMOLNI a képlettel** — a
 * régi szám az adott fájl csúcsához tartozott, nem a szerephez.
 */
export const FOOTSTEP_VOLUME = 0.3;
export const PLAYER_JUMP_VOLUME = 1;
export const PLAYER_DEATH_VOLUME = 0.27;
export const HARVESTER_DEATH_VOLUME = 0.4;
export const GRAVECALLER_DEATH_VOLUME = 0.56;

/**
 * A halál-hangok pontos magasságon szólnak. A detune-szórás célja, hogy egy ISMÉTLŐDŐ hang
 * (kardcsapás, lépés) ne váljon gépiessé — egy lény halála viszont egyszeri, drámai
 * esemény, amit egy véletlen elhangolás csak olcsóvá tenne.
 */
export const DEATH_SFX_DETUNE_RANGE = 0;

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

/**
 * A player SAJÁT hangjainak bekötése (suhintás, lépés, ugrás, halál) — mindhárom scene-nek
 * (`Level1Scene`, `Level2Scene`, `BossScene`) SZÓ SZERINT ugyanez kell, hiszen ugyanaz a
 * lovag fut, ugrik és hal meg bennük.
 *
 * A projekt egyébként vállalja a scene-ek közti duplikációt (lásd a `Level2Scene` fejlécét),
 * de ez a blokk a „mechanikus és alacsony kockázatú" kategória: nincs benne scene-specifikus
 * döntés, viszont HÁROM helyen kellene karban tartani a hangerő-konstansokkal együtt — és
 * egy negyedik scene (Boss2Scene) bekötésekor pont ezt lenne a legkönnyebb elfelejteni.
 *
 * A paraméter SZÁNDÉKOSAN `EventEmitter` és nem `Player`: így az `AudioManager` nem függ a
 * `Player`-től (a függés iránya végig entitás -> event -> scene marad).
 */
export function bindPlayerSfx(player: Phaser.Events.EventEmitter, audio: AudioManager): void {
  player.on('sword-swing', () => audio.playSfx(SFX_KEYS.SWORD_SWING));
  player.on('footstep', () => audio.playSfx(SFX_KEYS.PLAYER_FOOTSTEP, { volume: FOOTSTEP_VOLUME }));
  player.on('player-jump', () =>
    audio.playSfx(SFX_KEYS.PLAYER_JUMP, { volume: PLAYER_JUMP_VOLUME })
  );
  player.on('player-death', () =>
    audio.playSfx(SFX_KEYS.PLAYER_DEATH, {
      volume: PLAYER_DEATH_VOLUME,
      detuneRange: DEATH_SFX_DETUNE_RANGE,
    })
  );
}
