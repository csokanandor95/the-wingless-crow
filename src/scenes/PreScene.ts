import Phaser from 'phaser';
import Player from '../player/Player';
import AudioManager, {
  bindPlayerSfx,
  LEVEL_MUSIC_FADE_IN_MS,
  LEVEL_MUSIC_VOLUME,
  MUSIC_KEYS,
  PLAYER_LAND_VOLUME,
  SFX_KEYS,
} from '../systems/AudioManager';
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';
import Dialogue from '../ui/Dialogue';
import {
  DEPART_PROMPT,
  FALL_BOUNDS_MARGIN,
  FALL_DELAY_MS,
  FALL_START_Y,
  GODDESS_DIALOGUE,
  GROUND_CENTER_Y,
  GROUND_TOP,
  INTERACT_ZONE,
  INTERACT_ZONE_Y,
  NPC_X,
  PLAYER_SPAWN_X,
  TALK_PROMPT,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../levels/PreSceneLayout';
import {
  FEET_OFFSET_Y as GODDESS_FEET_OFFSET_Y,
  GODDESS_ANIMS,
  ORIGIN_Y as GODDESS_ORIGIN_Y,
  TEXTURE_KEY as GODDESS_TEXTURE_KEY,
} from '../npc/GoddessAnimations';

/**
 * A játék nyitó jelenete — egy romos szentély, ahová Lazarus felülről beesik.
 *
 * A háttéren egy SZÁRNYAS angyalszobor áll: pontosan az, amit a főhős elvesztett. A jobb
 * oldalon A LÁNGŐRZŐ várja, akitől `E`-vel megtudja, mi történt vele és merre induljon.
 *
 * Szerkezetileg a boss-arénák rokona (fix 800x450, nincs kameragörgetés, láthatatlan
 * talaj-ütköző, `ui/Dialogue` a padló alatt) — de HARC NINCS benne, és ebből következik a
 * legfontosabb eltérése: itt NEM `PlayerController` viszi az inputot. Lásd `applyWalkInput()`.
 */

/** A háttérkép legfelső sorának átlagszíne — hogy egy letterbox se villantson feketét. */
const BACKGROUND_COLOR = '#080709';

const FADE_IN_MS = 600;
const FADE_OUT_MS = 700;

const NEXT_SCENE_KEY = 'Level1Scene';

/** A becsapódás visszajelzése. Rövid és halk: hangsúly, nem földrengés. */
const LAND_SHAKE_MS = 180;
const LAND_SHAKE_INTENSITY = 0.006;

/** A jelenet menete. Az input és a promptok EBBŐL következnek, nem külön flagekből. */
enum PreScenePhase {
  /** A player a képernyő fölött, zuhanás közben (vagy még a `FALL_DELAY_MS` alatt). */
  FALLING = 'FALLING',
  /** Földet ért, sétálhat; A LÁNGŐRZŐ mellett megjelenik a beszélgetés-prompt. */
  EXPLORE = 'EXPLORE',
  /** Fut a párbeszéd — a player teljesen befagyasztva. */
  DIALOGUE = 'DIALOGUE',
  /** A párbeszéd lement; `E`-re indul a Level 1. */
  READY = 'READY',
}

export default class PreScene extends Phaser.Scene {
  private player!: Player;
  private goddess!: Phaser.GameObjects.Sprite;
  private audio!: AudioManager;
  private dialogue: Dialogue | null = null;

  private interactZone!: Phaser.GameObjects.Zone;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private promptText!: Phaser.GameObjects.Text;

  /**
   * A séta-input. SZÁNDÉKOSAN nem `PlayerController`, hanem csak ez a néhány billentyű —
   * lásd `applyWalkInput()`.
   */
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private walkKeys!: { [key: string]: Phaser.Input.Keyboard.Key };

  private phase: PreScenePhase = PreScenePhase.FALLING;
  private isTransitioning = false;

  constructor() {
    super('PreScene');
  }

  create(): void {
    // A class field initializerek CSAK a Scene első létrehozásakor futnak le (CLAUDE.md
    // "Fontos technikai tanulságok" 3.). A főmenü „Start Game"-je ugyanezen a példányon hívja
    // újra a create()-et minden új játéknál, tehát itt explicit alaphelyzet kell.
    this.dialogue = null;
    this.phase = PreScenePhase.FALLING;
    this.isTransitioning = false;

    // Nem kell kézzel takarítani: az AudioManager maga iratkozik fel a scene SHUTDOWN-jára.
    this.audio = new AudioManager(this);

    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    // A FIZIKAI világ FELFELÉ nyúlik, a kameráé nem — a Level1Scene zuhanás-halálának a
    // tükörképe (ott lefelé). KÖTELEZŐ: a Player konstruktora setCollideWorldBounds(true)-t
    // hív, tehát e nélkül a negatív Y-ú player azonnal a világ tetejére lenne szorítva.
    this.physics.world.setBounds(
      0,
      -FALL_BOUNDS_MARGIN,
      VIEW_WIDTH,
      VIEW_HEIGHT + FALL_BOUNDS_MARGIN
    );
    this.cameras.main.setBounds(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.cameras.main.fadeIn(FADE_IN_MS);

    this.createBackground();

    const ground = this.physics.add.staticGroup();
    const groundSprite = ground
      .create(VIEW_WIDTH / 2, GROUND_CENTER_Y, 'ground-placeholder')
      .setScale(VIEW_WIDTH / 64, 1)
      .refreshBody() as Phaser.Physics.Arcade.Sprite;
    // A talaj csak ÜTKÖZŐ, nem grafika: a festményen a mozaikpadló tölti be ezt a szerepet.
    groundSprite.setVisible(false);

    this.createGoddess();

    this.player = new Player(this, PLAYER_SPAWN_X, FALL_START_Y);
    this.physics.add.collider(this.player, ground);
    bindPlayerSfx(this.player, this.audio);

    // Egy pillanat a néma szentélyen, mielőtt a player beesik — enélkül a nyitókép elvész.
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);
    this.time.delayedCall(FALL_DELAY_MS, () => playerBody.setAllowGravity(true));

    this.createInteraction();

    this.audio.playMusic(MUSIC_KEYS.PRESCENE_THEME, {
      volume: LEVEL_MUSIC_VOLUME,
      fadeInMs: LEVEL_MUSIC_FADE_IN_MS,
    });
  }

  /**
   * Álló, teljes képernyős háttér — NEM ParallaxBackground: a kamera fix, és a kép pontosan
   * 800x450, tehát nincs mit eltolni és skálázni sem kell.
   *
   * TINT NINCS, és ez MÉRÉS: a játéktér (250..369. sor) nyers fényessége mean 23,2 — sötétebb,
   * mint a szintén tint nélküli `boss2-arena` (26,2) és `final-arena` (27,3), és jóval a
   * tintelt Boss 1 eredménye (54,1 * 0,69 = 37,3) alatt. Egy további sötétítés elnyelné a
   * két szereplőt.
   */
  private createBackground(): void {
    this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, BACKGROUND_TEXTURES.PRE_SCENE).setDepth(-30);
  }

  /**
   * A LÁNGŐRZŐ: tiszta látvány, physics body NÉLKÜL (nem ütközik, nem sebez, nem mozdul) —
   * ugyanaz az elv, mint a `LevelDecor` propjainál.
   *
   * `flipX` nincs: a sprite natívan BALRA néz, és a jobb oldalon áll, tehát pont a beeső
   * player felé fordul.
   */
  private createGoddess(): void {
    // Az animáció regisztrációja a BootScene dolga (az AnimationManager GAME-szintű), mint
    // minden más lénynél — itt csak lejátsszuk.
    this.goddess = this.add
      .sprite(NPC_X, GROUND_TOP - GODDESS_FEET_OFFSET_Y, GODDESS_TEXTURE_KEY)
      .setOrigin(0.5, GODDESS_ORIGIN_Y);
    this.goddess.play(GODDESS_ANIMS.IDLE);
  }

  private createInteraction(): void {
    this.interactZone = this.add.zone(
      NPC_X,
      INTERACT_ZONE_Y,
      INTERACT_ZONE.width,
      INTERACT_ZONE.height
    );
    this.physics.add.existing(this.interactZone, true);

    this.interactKey = this.input.keyboard!.addKey('E');

    this.promptText = this.add
      .text(400, 400, TALK_PROMPT, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    // A séta-input. A `createCursorKeys()` a SPACE-t is adja, tehát a W/A/D mellé csak ennyi
    // kell — J/F és pointer SZÁNDÉKOSAN nincs (lásd `applyWalkInput()`).
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.walkKeys = this.input.keyboard!.addKeys('W,A,D,SPACE') as {
      [key: string]: Phaser.Input.Keyboard.Key;
    };
  }

  update(_time: number, delta: number): void {
    // A dialógus a scene delta-idejéből ketyeg (nem saját timerből) — így a magja pure marad.
    if (this.dialogue && !this.dialogue.isFinished()) this.dialogue.update(delta);

    // MINDEN frame-ben lekérdezzük, a fázistól FÜGGETLENÜL — és ez nem stílus, hanem hibajavítás.
    // A `JustDown` egy EGYSZER kiolvasható él: ha a párbeszéd alatt nem kérdezzük le, egy
    // türelmetlenül E-t nyomkodó player leütése "felgyűlik", és a dialógus végén az első
    // `updatePrompt()` azonnal elindítaná a Level 1-et — anélkül, hogy az `E: Indulás` prompt
    // egyáltalán megjelent volna.
    const interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);

    switch (this.phase) {
      case PreScenePhase.FALLING:
        this.updateFalling();
        break;
      case PreScenePhase.EXPLORE:
      case PreScenePhase.READY:
        this.applyWalkInput();
        this.updatePrompt(interactPressed);
        break;
      case PreScenePhase.DIALOGUE:
        // Teljes befagyasztás: se input, se lendület. Az `updateState()` viszont KELL, hogy a
        // player az álló pózra váltson, és ne a futó animáción ragadjon.
        this.player.stopMoving();
        this.player.updateState();
        break;
    }
  }

  /**
   * A zuhanás. Az `updateState()`-et ITT A SCENE hívja: a projekt többi jelenetében a
   * `PlayerController.update()` intézi, controller nélkül viszont az animáció megfagyna a
   * sheet első frame-jén, és a `player-fall` loop soha nem indulna el.
   */
  private updateFalling(): void {
    this.player.updateState();

    if (!this.player.isGrounded()) return;

    this.phase = PreScenePhase.EXPLORE;
    this.cameras.main.shake(LAND_SHAKE_MS, LAND_SHAKE_INTENSITY);
    // Detune 0: egyszeri, dramaturgiai becsapódás — a szórás az ISMÉTLŐDŐ hangok (kard, lépés)
    // gépiessége ellen való, itt csak olcsóvá tenné.
    this.audio.playSfx(SFX_KEYS.PLAYER_LAND, { volume: PLAYER_LAND_VOLUME, detuneRange: 0 });
  }

  /**
   * A jelenet EGYETLEN inputja: séta és ugrás. SZÁNDÉKOSAN nem `PlayerController`.
   *
   * A `PlayerController` KONSTRUKTORA regisztrálja a J/F billentyű- és pointer-listenereket,
   * és NINCS `destroy()`-a (CLAUDE.md 17. tanulság) — tehát a `Boss2Scene` trükkje ("csak a
   * harc előtt hozzuk létre") itt nem alkalmazható, mert a player a párbeszéd ELŐTT már
   * sétál. Enélkül a player A LÁNGŐRZŐ monológja alatt kardot suhinthatna rá.
   *
   * Egy szentélyben amúgy sincs mit ütni és mit égetni: a séta MAGA a helyes eszköztár. Így a
   * `PlayerController.ts`-hez egyáltalán nem kellett hozzányúlni.
   */
  private applyWalkInput(): void {
    const left = this.cursors.left.isDown || this.walkKeys.A.isDown;
    const right = this.cursors.right.isDown || this.walkKeys.D.isDown;
    const jump = this.cursors.up.isDown || this.walkKeys.W.isDown || this.walkKeys.SPACE.isDown;

    if (left) {
      this.player.moveLeft();
    } else if (right) {
      this.player.moveRight();
    } else {
      this.player.stopMoving();
    }

    if (jump) this.player.jump();

    this.player.updateState();
  }

  /**
   * A prompt és az `E` kezelése. Szinkron `physics.overlap()`, nem `physics.add.overlap()`
   * callback — utóbbi csak a scene `update()`-je UTÁN futna le, tehát egy frame-et késne
   * (a `Level1Scene` ajtajának és létrájának azonos mintája).
   */
  private updatePrompt(interactPressed: boolean): void {
    const nearGoddess = this.physics.overlap(this.player, this.interactZone);
    this.promptText.setVisible(nearGoddess && !this.isTransitioning);

    if (!nearGoddess || this.isTransitioning) return;
    if (!interactPressed) return;

    if (this.phase === PreScenePhase.EXPLORE) {
      this.startDialogue();
    } else {
      this.departToLevel1();
    }
  }

  private startDialogue(): void {
    this.phase = PreScenePhase.DIALOGUE;
    this.promptText.setVisible(false);
    // A player a párbeszéd alatt nem csúszhat tovább a becsapódás lendületével.
    this.player.stopMoving();

    this.dialogue = new Dialogue(
      this,
      GODDESS_DIALOGUE,
      { groundTop: GROUND_TOP, viewportWidth: VIEW_WIDTH },
      () => {
        this.phase = PreScenePhase.READY;
        this.promptText.setText(DEPART_PROMPT);
      }
    );

    // A KeyboardPlugin a scene leállásakor magától leiratkoztat, ezért itt nincs kézi
    // takarítás (a NarrationScene / boss-arénák azonos mintája).
    this.input.keyboard?.on('keydown-RIGHT', () => this.dialogue?.advance());
  }

  /**
   * Indulás a Level 1-re. Átvezető (`NarrationScene`) SZÁNDÉKOSAN nincs — user-döntés: a
   * párbeszéd MAGA a felvezetés, egy narráció csak megismételné.
   */
  private departToLevel1(): void {
    this.isTransitioning = true;
    this.promptText.setVisible(false);
    this.player.stopMoving();

    // A zene a KÉPPEL EGYÜTT halkul el; a scene shutdownja önmagában is elvágná, de fade
    // nélkül, pont a fekete képernyő pillanatában.
    this.audio.stopMusic(FADE_OUT_MS);

    // FADE_OUT_COMPLETE, nem a fadeOut() callbackje: utóbbi a fade MINDEN frame-jén lefutna
    // (CLAUDE.md 4. tanulság).
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(NEXT_SCENE_KEY);
    });
    this.cameras.main.fadeOut(FADE_OUT_MS, 0, 0, 0);
  }
}
