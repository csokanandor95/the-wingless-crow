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
  /** A Mad King arénája. A belépőnél indul, a dialógus UTÁN — lásd Boss2Scene. */
  BOSS2_THEME: 'boss2-theme',
  /**
   * A végső aréna (`FinalBossScene`). A sáv a `2. Shadowforge Convergence (Loop)`, ami
   * KORÁBBAN a Level 2 ambientje volt — user-döntés, hogy a végső harcra kerüljön át.
   * Az ASSET FÁJLNEVE változatlanul `shadowforge-convergence.mp3`: a projektben a fájlnév a
   * forrás-számra mutat, nem a felhasználási helyre, tehát a csere csak KULCS-átkötés.
   */
  FINAL_BOSS_THEME: 'final-boss-theme',
  LEVEL1_THEME: 'level1-theme',
  /** A Level 2 sávja `1. Whispers of the Abyss (Loop)` lett (AlkaKrab, ugyanaz a csomag). */
  LEVEL2_THEME: 'level2-theme',
  /**
   * Level 3 – The Beast Dungeon. `3. Eclipsed Desolation (Loop)`, UGYANABBÓL az AlkaKrab
   * csomagból, mint a másik négy sáv — tehát nem nyitott új jogi tételt.
   */
  LEVEL3_THEME: 'level3-theme',
  /**
   * Boss 3 – The Beast Master arénája. `5. Dread March (Loop)`, szintén AlkaKrab. A cím a
   * lény karakterét adja vissza: nehéz, elkötelezett roham, nem varázslás.
   */
  BOSS3_THEME: 'boss3-theme',
  /**
   * A nyitó szentély (`PreScene`). `Elkmire Keep (LOOP)`, UGYANABBÓL a "Free Dark Fantasy
   * Music" csomagból, amiből a Level 1 `Library of Veles`-e jön — tehát nem nyitott új jogi
   * tételt. A csomag másik, addig kihasználatlan sávja.
   */
  PRESCENE_THEME: 'prescene-theme',
  /**
   * A főmenü (`MainMenuScene`). `Ashen Path`, az "Ashfall – Dark Fantasy Stream Pack"-ból
   * (cloud1789) — a projekt ELSŐ zene-csomagja, amihez VAN licencszöveg, és az be is van
   * másolva (`assets/audio/ashen-path-license.txt`).
   *
   * Az asset SZÁRMAZTATOTT: a nyers sáv első ~10 másodperce csak halk zúgás, ezért a fájl
   * frame-határon VÁGVA került a repóba (t=10..130 s). A `seek` itt nem lett volna elég — a
   * Phaser `createAndStartLoopBufferSource()`-a `offset = marker ? marker.start : 0`-val
   * indít, tehát a második loop-fordulótól újra a zúgás szólna. Lásd a BootScene importját.
   */
  MENU_THEME: 'menu-theme',
} as const;

export const SFX_KEYS = {
  SWORD_SWING: 'sfx-sword-swing',
  SWORD_IMPACT: 'sfx-sword-impact',
  /** A player tűzgolyója — a lövedék születésének pillanatában ('fireball-cast'). */
  FIREBALL_CAST: 'sfx-fireball-cast',
  /** A boss lövedéke. SZÁNDÉKOSAN másik hang, mint a playeré: hallani, kié a lövedék. */
  BOSS_PROJECTILE: 'sfx-boss-projectile',
  /**
   * Varázslat becsapódása/kioldása — nem a cast, és nem is a telegraph alatt.
   *
   * NÉGY helyen szól (user-döntések): a Wing-Breaker Shadow Spelljénél, az Ancient Demon
   * ÁRNY-HULLÁMÁNÁL és IDÉZÉSÉNÉL, valamint a **player HEAVY SLASH-énél**. Közös hang, mint
   * az `ENEMY_SWING` a három közelharci lénynél — a detune-szórás miatt a sorozatos
   * megszólalás sem válik gépiessé.
   *
   * A kulcs neve korábban `BOSS_SPELL_IMPACT` volt; a heavy slash bekötésekor lett
   * semleges, mert a hang azóta NEM boss-specifikus. A hangfájl és a betöltés változatlan.
   */
  SPELL_IMPACT: 'sfx-spell-impact',
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
  /**
   * A player becsapódása a `PreScene` nyitó zuhanása után. UGYANAZ a TomMusic lépés-készlet,
   * mint a járásé, de a `Land` változat — és a `Chain` (láncinges) verzió, mint a lépésnél.
   *
   * A `Stone Chain Jump` annak idején azért BUKOTT, mert a farka visszaemelkedett a csúcs
   * 81 %-ára; a két `Land` változat farka viszont MINDKETTŐNÉL a csúcs 10 %-a, tehát az a
   * kifogás itt nem áll. A Chain HF-aránya 0,901 (a sima 0,223) — egy páncélos test kőre
   * csapódásához pont ez a láncing-tartalom kell.
   *
   * SZÁNDÉKOSAN nem szól a Level 1-3 landolásainál: ez egyetlen, dramaturgiai becsapódás,
   * nem általános ugrás-visszajelzés (az külön SFX-tétel maradt).
   */
  PLAYER_LAND: 'sfx-player-land',
  /** A player halála (a zuhanás-halált is beleértve), a `die()`-ból. */
  PLAYER_DEATH: 'sfx-player-death',
  /** A CrowHarvester halála. SZÁNDÉKOSAN más lény-hang, mint a Gravecalleré. */
  HARVESTER_DEATH: 'sfx-harvester-death',
  /** A Gravecaller halála — hosszabb, „elnyújtottabb" haláltusa. */
  GRAVECALLER_DEATH: 'sfx-gravecaller-death',
  /**
   * A Beast halála. UGYANABBÓL a csomagból, mint a másik két lény-hang, de a legnagyobb
   * testű ellenfélhez illő, mély üvöltés — a `die()`-ból, sosem a `destroy()`-ból.
   */
  BEAST_DEATH: 'sfx-beast-death',
  /**
   * A Mad King ugró becsapódása, a FÖLDET ÉRÉS pillanatában. A fight legnehezebb
   * ütése, ezért kap saját, nehéz hangot a közös ENEMY_SWING helyett.
   */
  KING_SLAM: 'sfx-king-slam',
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
 * Ambient sávhoz hosszabb belépő, mint a boss theme 800ms-a.
 *
 * Az eredeti indoklás az volt, hogy a Level 1 közvetlenül az oldalbetöltés után indul, tehát
 * az audio context MINDIG zárolt. **Ez már NEM a Level 1-re igaz**: előbb a `PreScene`, majd
 * 2026-09-03 óta a `MainMenuScene` került a lánc elejére — az autoplay-zárat MOST A FŐMENÜ
 * oldja fel, és ezért kapja ugyanezt a hosszú fade-int (ott a zene tényleg csak az első
 * billentyűleütésnél/kattintásnál szólal meg).
 *
 * A Level 1-en a hosszabb belépő ettől függetlenül helyes: a fekete képernyőből érkező sáv így
 * sem robban be hirtelen.
 */
export const LEVEL_MUSIC_FADE_IN_MS = 2000;
/**
 * A Level 2 belépője SZÁNDÉKOSAN hosszabb a Level 1-énél, és ez nem ízlés kérdése, hanem a
 * két belépés különbsége:
 *  - a Level 1-be a nyitó szentélyen át érkezünk, tehát a sáv ott a hosszú fade-in ELLENÉRE is
 *    viszonylag korán hallható;
 *  - a Level 2-be a NarrationScene felől érkezünk, MÁR FELOLDOTT contexttel, tehát a zene
 *    valóban a create() pillanatában indul. Itt a fade-in az EGYETLEN dolog, ami tompítja
 *    a belépést — a nyers sáv különben teljes intenzitással ütne be a fekete képernyőből.
 *
 * (Az audio contextet a lánc elején a `MainMenuScene` oldja fel — lásd fentebb.)
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
 * | Beast halál         | 0.751        | 100 %               | 0.19   |
 * | player halál        | 0.699        | 130 %               | 0.27   |
 * | király becsapódás   | 0.559        | 130 %               | 0.33   |
 * | nyitó becsapódás    | 0.309        | 130 %               | 0.60   |
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
 * A forrás (`fatmanbossDeath.wav`) a csomag EGYIK LEGHANGOSABB fájlja (csúcs 0.751), ezért
 * kap a többi lény-halálnál jóval kisebb szorzót — az EFFEKTÍV hangereje ugyanaz.
 * A repóban lévő fájl a forrás 0–1,55 s-a (+ 60 ms fade); a vágás a csúcsot nem érintette.
 */
export const BEAST_DEATH_VOLUME = 0.19;
export const KING_SLAM_VOLUME = 0.33;
/**
 * A `PreScene` nyitó becsapódása. A király ugrásával AZONOS cél-arányt (130 %) kap: mindkettő
 * egyszeri, nehéz testtel a kőre — csak a forrásfájl halkabb (0,309 vs. 0,559), ezért nagyobb
 * a szorzó. `1,30 * 0,1435 / 0,309 = 0,60`.
 */
export const PLAYER_LAND_VOLUME = 0.6;

/**
 * A halál-hangok pontos magasságon szólnak. A detune-szórás célja, hogy egy ISMÉTLŐDŐ hang
 * (kardcsapás, lépés) ne váljon gépiessé — egy lény halála viszont egyszeri, drámai
 * esemény, amit egy véletlen elhangolás csak olcsóvá tenne.
 */
export const DEATH_SFX_DETUNE_RANGE = 0;

/**
 * A heavy slash a `SPELL_IMPACT` (Firebuff 2) hangját szólaltatja meg — user-választás, és
 * pont ez teszi „spell-karddá" a csapást: nem suhintás, hanem fellobbanás.
 *
 * **Új asset NEM kellett**: a kért `Firebuff 2.wav` BITRE AZONOS a repóban már meglévő
 * `assets/audio/sfx/firebuff-2.wav`-val (md5 `ad78f8af…`), amit a bossok varázslatai
 * használnak. Ezért lett a kulcs neve `BOSS_SPELL_IMPACT`-ról `SPELL_IMPACT`-ra írva.
 *
 * A -200 cent a bossok varázslatától különbözteti meg: ugyanaz a láng, de mélyebben —
 * egy kard mögötte, nem egy oltár. A szórás mellette megmarad (ismétlődő hang), csak
 * szűkebben: a heavy ritka, nem kell akkora változatosság a gépiesség ellen.
 */
export const HEAVY_SLASH_DETUNE = -200;
export const HEAVY_SLASH_DETUNE_RANGE = 60;

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
  /**
   * FIX hangmagasság-eltolás centben, a véletlen `detuneRange` MELLETT. Arra való, hogy
   * ugyanabból a fájlból két, egymástól megkülönböztethető hang legyen — a heavy slash
   * így kap mélyebb, súlyosabb suhintást a kardéval azonos felvételből, új asset nélkül.
   */
  detune?: number;
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
    const spread = detuneRange === 0 ? 0 : Phaser.Math.Between(-detuneRange, detuneRange);

    this.scene.sound.play(key, {
      volume: options.volume ?? DEFAULT_SFX_VOLUME,
      detune: (options.detune ?? 0) + spread,
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
 * A player SAJÁT hangjainak bekötése (suhintás, heavy, lépés, ugrás, halál) — mindhárom scene-nek
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
  // A heavy NEM suhintás, hanem fellobbanás: a varázslat-hang mélyebbre hangolva.
  // Lásd HEAVY_SLASH_DETUNE.
  player.on('heavy-swing', () =>
    audio.playSfx(SFX_KEYS.SPELL_IMPACT, {
      detune: HEAVY_SLASH_DETUNE,
      detuneRange: HEAVY_SLASH_DETUNE_RANGE,
    })
  );
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
