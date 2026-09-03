import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
import CombatHud from '../ui/CombatHud';
import Fireball from '../combat/Projectile';
import MadKing, { KingState } from '../bosses/MadKing';
import {
  DEATH_ANIM_MS as KING_DEATH_ANIM_MS,
  FEET_OFFSET_Y as KING_FEET_OFFSET_Y,
} from '../bosses/MadKingAnimations';
import type { PhysicsOverlapObject } from '../combat/DamageSystem';
import AudioManager, {
  bindPlayerSfx,
  KING_SLAM_VOLUME,
  MUSIC_KEYS,
  SFX_KEYS,
} from '../systems/AudioManager';
import AfterImageTrail from '../systems/AfterImageTrail';
import { hasSeenDialogue, markDialogueSeen } from '../systems/DialogueMemory';
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';
import Dialogue, { type DialogueLine } from '../ui/Dialogue';

// Boss 2 aréna (Project_plan.md 15. pont): fix, egy képernyős pálya — nincs kameragörgetés,
// ugyanaz a felépítés, mint a BossScene-é.
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 450;

/**
 * A rajzolt trónterem-dobogó elülső pereme. MÉRT érték, nem hangolt: a forráskép
 * (`2D helper/level/Mad King background.png`, 1641x959) megvilágított kőpadló-sávja a
 * 770-794. sorban van, a 795-797. sorban pedig éles leesés következik (-4,6 / -7,1 / -3,9)
 * — a fényesség-csúcs tehát a 793-794. sor. A BootScene-ben leírt kivágás (0,36 -> 1641x923)
 * ezt pontosan a 369. sorra viszi: a 800x450-es PNG-n visszamérve a csúcs y=369, alatta
 * y=370-372-nél 27,1 -> 15,0-re esik a fényesség.
 *
 * A Boss 1-nél a képet szintén KIVÁGNI kell (ott a GROUND_TOP-ból jön a kivágás szélessége);
 * itt a kivágás magassága adódik ugyanebből. Ha a háttér valaha újragenerálódik, ezt EGYÜTT
 * kell újramérni.
 */
const GROUND_TOP = 369;
const GROUND_CENTER_Y = GROUND_TOP + 16; // ground-placeholder 64x32, origin 0.5

const PLAYER_SPAWN_X = 90;
const PLAYER_SPAWN_Y = 260;

// A király talpa a sprite.y-tól KING_FEET_OFFSET_Y-ra van (a sprite geometriájából levezetve,
// lásd MadKingAnimations.ts) — így a spawn pontosan a rajzolt kőperemre teszi.
const KING_SPAWN_X = 640;
const KING_SPAWN_Y = GROUND_TOP - KING_FEET_OFFSET_Y;

/**
 * A háttér TINT NÉLKÜL megy be — szemben a BossScene 0xb0b0b0-jával. Ez mérés, nem ízlés: a
 * trónterem nyers fényessége a játéktérben (a forrás 300-770. során mérve) `mean 36.3`, míg a
 * Boss 1 festményének TINTELT eredménye `59.7 * 0.69 = 41.2`. Ez a kép tehát eleve sötétebb,
 * mint amire a Boss 1-et sötétíteni kellett; egy további tint elnyelné a királyt.
 */

/** A festmény legfelső sorának átlagszíne — hogy egy letterbox se villantson feketét. */
const BACKGROUND_COLOR = '#0b0a18';

const BOSS_NAME = 'The Mad King';
const BOSS_SUBTITLE = 'he who would not let go';

const HP_BAR_X = 110;
const HP_BAR_Y = 34;
const HP_BAR_WIDTH = 580;
const HP_BAR_HEIGHT = 16;

/** A death animáció + egy pillanat, amíg a test ott marad a trón előtt. */
const VICTORY_DELAY_MS = KING_DEATH_ANIM_MS + 700;
const DEFEAT_DELAY_MS = 1400;
const FADE_MS = 700;

/**
 * A király legyőzése után NEM közvetlenül a végső ellenfél jön, hanem a **Level 3 – The Beast
 * Dungeon**: a démon falkája őrzi az utolsó kaput.
 *
 * A `sceneExists()` guard megmarad — ugyanaz a minta, amivel ez a scene a még nem létező
 * FinalBossScene-t kezelte —, hogy a lánc egy hiányzó scene esetén se szakadjon meg.
 */
const NEXT_SCENE_KEY = 'Level3Scene';
const FALLBACK_SCENE_KEY = 'Level2Scene';

/**
 * Placeholder lore-párbeszéd: a végleges szöveget a Phase 9 – Lore írja meg, a csere ennek a
 * tömbnek a szerkesztése. A tartalom a Project_plan.md 16. pontjának történetét követi (a
 * király a haldokló felesége miatt paktált a démonnal, és ezzel fogatta el a varjakat).
 *
 * A sorok SZÁNDÉKOSAN rövidek: a panel 2 sorra tördel, ennél hosszabb szöveg kilógna belőle.
 */
const KING_DIALOGUE: DialogueLine[] = [
  { speaker: 'THE MAD KING', text: 'I know you, wingless one. Your crows once circled above my towers.' },
  { speaker: 'LAZAR', text: 'And now they sit in your cage. Let them go.' },
  { speaker: 'THE MAD KING', text: 'Let them go? You kept the gate, and you let it take her.' },
  { speaker: 'LAZAR', text: 'The queen is dead. What you brought back is not her.' },
  { speaker: 'THE MAD KING', text: 'You lie. She sleeps. She sleeps only until order is restored.' },
  { speaker: 'LAZAR', text: 'Then I will lay you down beside her first.' },
];

/**
 * Placeholder lore-narráció a győzelem után — a Phase 9-ben cserélendő. A király FELOLDOZÁST
 * kap (Project_plan.md 16. pont), ezért nem diadal, hanem lezárás.
 */
const KING_VICTORY_NARRATION = [
  'The crown slides from his head and stops on the throne steps.\nThe king does not reach for it.',
  'Further off, in the half-dark, something goes slack.\nWhat lay there in place of the queen finally stops moving.',
  'The throne room floor opens.\nSomething changes, something evil, and it is dark.',
  'The demon is not in the castle.\nIt waits at the gate Lazar was meant to keep.',
];

export default class Boss2Scene extends Phaser.Scene {
  private player!: Player;
  /**
   * SZÁNDÉKOSAN csak a párbeszéd UTÁN jön létre. A PlayerController konstruktora regisztrálja
   * a J/F billentyű- és pointer-listenereket, tehát nem elég az update()-jét kihagyni: a
   * player a dialógus alatt így nem mozoghat, nem támadhat és nem varázsolhat.
   */
  private controller: PlayerController | null = null;
  private king!: MadKing;
  private audio!: AudioManager;
  private lungeTrail!: AfterImageTrail;
  private dialogue: Dialogue | null = null;

  private combatHud!: CombatHud;
  private kingHpBar!: Phaser.GameObjects.Graphics;
  private kingNameText!: Phaser.GameObjects.Text;

  private fireballs: Fireball[] = [];

  private fightStarted = false;
  private outcomeScheduled = false;

  constructor() {
    super('Boss2Scene');
  }

  create(): void {
    // Class field initializerek CSAK a Scene első létrehozásakor futnak le; a scene-be való
    // újbóli belépés (halál -> Level2Scene -> ajtó -> Boss2Scene) ugyanazon a példányon hívja
    // újra a create()-et. Lásd CLAUDE.md "Fontos technikai tanulságok" 3.
    this.fireballs = [];
    this.controller = null;
    this.dialogue = null;
    this.fightStarted = false;
    this.outcomeScheduled = false;

    // Nem kell kézzel takarítani: az AudioManager maga iratkozik fel a scene SHUTDOWN-jára.
    // A zene NEM itt indul, hanem a párbeszéd után, a belépőnél (lásd startEntrance()).
    this.audio = new AudioManager(this);

    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.fadeIn(600);

    this.createBackground();

    const ground = this.physics.add.staticGroup();
    const groundSprite = ground
      .create(ARENA_WIDTH / 2, GROUND_CENTER_Y, 'ground-placeholder')
      .setScale(ARENA_WIDTH / 64, 1)
      .refreshBody() as Phaser.Physics.Arcade.Sprite;
    // A talaj csak ÜTKÖZŐ, nem grafika: a festményen a padlóél alatt a kőperem homlokzata
    // van, ami pont ezt a szerepet tölti be.
    groundSprite.setVisible(false);

    this.player = new Player(this, PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
    this.physics.add.collider(this.player, ground);

    this.king = new MadKing(this, KING_SPAWN_X, KING_SPAWN_Y);
    this.physics.add.collider(this.king, ground);
    // Player és király között SZÁNDÉKOSAN nincs collider: a sebzés a támadás-hitboxokon megy,
    // így nem tolják egymást a pálya szélére (a BossScene azonos döntése).

    // A kitörés sebesség-csíkja. A dash-pózhoz ez adja a lendület érzetét — ugyanaz a modul,
    // amit a Wing-Breaker charge-ja használ.
    this.lungeTrail = new AfterImageTrail(this, this.king);

    this.registerCombatOverlaps(ground);
    this.registerKingEvents();

    this.createHud();

    // Ismételt próbálkozásnál egyenesen a belépőre ugrunk (a BossScene azonos mintája): a
    // "már láttam" tény a REGISTRY-ben él, mert a vereség-ág a Level 2-re tesz vissza, és a
    // player onnan, az ajtón át jön újra.
    if (hasSeenDialogue(this.registry, this.scene.key)) {
      this.startEntrance();
    } else {
      this.startDialogue();
    }
  }

  /**
   * Álló, teljes képernyős háttér — NEM ParallaxBackground: a kamera fix, nincs mit eltolni,
   * és a kép pontosan 800x450, tehát skálázni sem kell. Tint SINCS, lásd a fenti indoklást.
   */
  private createBackground(): void {
    this.add.image(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, BACKGROUND_TEXTURES.BOSS2_ARENA).setDepth(-30);
  }

  /**
   * A párbeszéd a boss entrance ELSŐ fele: a király DORMANT, tehát nem mozog és nem is
   * sebezhető, a player pedig kontroller nélkül áll. A jobbra-nyíl gyorsítja a szöveget;
   * a párbeszéd magától is végigmegy.
   *
   * VÉGIGJÁTSZÁSONKÉNT EGYSZER fut le (a `markDialogueSeen()` a végén) — egy bukott
   * próbálkozás után a harc egyből a cím-kártyával nyit.
   */
  private startDialogue(): void {
    this.dialogue = new Dialogue(
      this,
      KING_DIALOGUE,
      { groundTop: GROUND_TOP, viewportWidth: ARENA_WIDTH },
      () => {
        markDialogueSeen(this.registry, this.scene.key);
        this.startEntrance();
      }
    );

    // A KeyboardPlugin a scene leállásakor magától leiratkoztat, ezért itt nincs kézi
    // takarítás (a NarrationScene azonos mintája).
    this.input.keyboard?.on('keydown-RIGHT', () => this.dialogue?.advance());
  }

  // Boss entrance (Project_plan.md 15. pont): a király DORMANT, amíg a cím be- és kifadel.
  private startEntrance(): void {
    const title = this.add
      .text(ARENA_WIDTH / 2, 150, BOSS_NAME, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#e8d8e8',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    const subtitle = this.add
      .text(ARENA_WIDTH / 2, 186, BOSS_SUBTITLE, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8a7a8a',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    // A zene a PÁRBESZÉD UTÁN indul — nem a create()-ben —, tehát a dialógus végig csendben
    // megy, és a sáv a cím-kártyával EGYÜTT csap be, a harc nyitányaként. Ugyanaz a pont,
    // ahol a BossScene a boss theme-et indítja (Project_plan.md 15.: „a zene a belépőt
    // KÍSÉRI, nem utána indul").
    //
    // Fade-in NINCS külön megadva: a DEFAULT_FADE_IN_MS (800) pont a cím be-fadelésének
    // hossza (700), tehát a kép és a hang együtt jön fel. A pálya-sávok hosszabb fade-inje
    // (2000/4000) ide NEM való — ott az a cél, hogy az ambient észrevétlenül ússzon be.
    this.audio.playMusic(MUSIC_KEYS.BOSS2_THEME);

    this.tweens.add({
      targets: [title, subtitle],
      alpha: 1,
      duration: 700,
      hold: 900,
      yoyo: true,
      onComplete: () => {
        title.destroy();
        subtitle.destroy();
        this.beginFight();
      },
    });
  }

  private beginFight(): void {
    this.fightStarted = true;
    this.kingNameText.setVisible(true);
    // A player IRÁNYÍTÁSA is csak most nyílik meg — lásd a `controller` mező kommentjét.
    this.controller = new PlayerController(this, this.player);
    this.king.activate();
  }

  private registerCombatOverlaps(ground: Phaser.Physics.Arcade.StaticGroup): void {
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.king,
      this.handlePlayerHitKing,
      undefined,
      this
    );

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      this.fireballs.push(new Fireball(this, x, y, direction));
      this.audio.playSfx(SFX_KEYS.FIREBALL_CAST);
    });

    // Suhintás + lépés + ugrás + halál: ugyanaz a lovag mozog, mint a pályákon.
    bindPlayerSfx(this.player, this.audio);

    this.physics.add.overlap(this.fireballs, this.king, this.handleFireballHitKing, undefined, this);

    this.physics.add.collider(this.fireballs, ground, (projectileObj) => {
      const projectile = projectileObj as Fireball;
      if (projectile.active) projectile.onImpact();
    });
  }

  private registerKingEvents(): void {
    // A király csak eventet emittál, a hangot a scene játssza le — a bevett delegálási minta.
    this.king.on('king-slash', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));
    this.king.on('king-lunge-windup', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));

    // A becsapódás a fight legnehezebb ütése: a hang mellé camera shake is jár, hogy a
    // földrengés-érzet meglegyen a placeholder hazard-grafikák nélkül is.
    this.king.on('king-slam', () => {
      this.audio.playSfx(SFX_KEYS.KING_SLAM, { volume: KING_SLAM_VOLUME });
      this.cameras.main.shake(220, 0.010);
    });

    this.king.on('king-phase-change', () => {
      this.cameras.main.shake(400, 0.012);

      const phaseText = this.add
        .text(ARENA_WIDTH / 2, 130, 'PHASE  II', {
          fontFamily: 'monospace',
          fontSize: '34px',
          color: '#ff4433',
        })
        .setOrigin(0.5)
        .setDepth(100);

      this.tweens.add({
        targets: phaseText,
        alpha: 0,
        duration: 1200,
        delay: 700,
        onComplete: () => phaseText.destroy(),
      });
    });
  }

  private createHud(): void {
    this.combatHud = new CombatHud(this);

    this.kingNameText = this.add
      .text(ARENA_WIDTH / 2, HP_BAR_Y - 14, BOSS_NAME, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d8c8d8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.kingHpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  update(_time: number, delta: number): void {
    // A dialógus a scene delta-idejéből ketyeg (nem saját timerből) — így a mag pure marad.
    if (this.dialogue && !this.dialogue.isFinished()) this.dialogue.update(delta);

    this.controller?.update();

    if (this.fightStarted) {
      this.king.update(this.player);
    }

    // A kitörés sebesség-csíkja. A király állapota public, ezért nem kell hozzá külön event.
    this.lungeTrail.update(this.king.kingState === KingState.LUNGE);

    // Az inaktív lövedékek kitakarítása MINDIG helyben, splice()-szal: a tömb referenciája be
    // van kötve a physics.add.overlap-ba, egy filter()-es újra-értékadás elavult tömbre hagyná
    // a collidert (CLAUDE.md "Fontos technikai tanulságok" 2.).
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      if (!this.fireballs[i].active) this.fireballs.splice(i, 1);
    }

    this.combatHud.update(this.player);
    this.drawKingHealthBar();

    if (this.outcomeScheduled) return;

    if (this.king.isDead()) {
      this.scheduleVictory();
    } else if (this.player.isDead()) {
      this.scheduleDefeat();
    }
  }

  private drawKingHealthBar(): void {
    this.kingHpBar.clear();
    if (!this.fightStarted) return;

    const ratio = Math.max(0, this.king.getHP() / this.king.getMaxHP());

    this.kingHpBar.fillStyle(0x000000, 0.6);
    this.kingHpBar.fillRect(HP_BAR_X - 3, HP_BAR_Y - 3, HP_BAR_WIDTH + 6, HP_BAR_HEIGHT + 6);
    this.kingHpBar.fillStyle(0x2a1218, 1);
    this.kingHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this.kingHpBar.fillStyle(this.king.getPhase() === 2 ? 0xff3322 : 0xa02020, 1);
    this.kingHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT);
  }

  private scheduleVictory(): void {
    this.outcomeScheduled = true;
    this.registry.set('kingDefeated', true);
    this.audio.stopMusic();

    this.time.delayedCall(VICTORY_DELAY_MS, () => {
      this.fadeToScene('NarrationScene', {
        lines: KING_VICTORY_NARRATION,
        nextScene: this.sceneExists(NEXT_SCENE_KEY) ? NEXT_SCENE_KEY : FALLBACK_SCENE_KEY,
      });
    });
  }

  /** Biztonsági háló: egy még nem regisztrált cél-scene esetén a lánc a Level 2-re esik vissza. */
  private sceneExists(key: string): boolean {
    return key in this.scene.manager.keys;
  }

  // Vereség: vissza a Level 2-re, ahol a player a saját checkpointján (a boss-ajtónál) éled
  // újra, és E-vel léphet be ismét — a király ilyenkor friss HP-val indul.
  private scheduleDefeat(): void {
    this.outcomeScheduled = true;
    this.audio.stopMusic();

    this.time.delayedCall(DEFEAT_DELAY_MS, () => {
      this.fadeToScene(FALLBACK_SCENE_KEY);
    });
  }

  // A fadeOut(duration, r, g, b, callback) callbackje MINDEN frame-ben lefut a fade alatt —
  // a FADE_OUT_COMPLETE event viszont pontosan egyszer, a végén (CLAUDE.md 4. tanulság).
  private fadeToScene(key: string, data?: object): void {
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  }

  private handlePlayerHitKing(hitbox: PhysicsOverlapObject, kingObj: PhysicsOverlapObject): void {
    const king = kingObj as MadKing;
    if (king.isDead() || this.player.hasHitTarget(king)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    king.takeDamage(damage);
    this.player.registerHit(king);
    this.audio.playSfx(SFX_KEYS.SWORD_IMPACT);
  }

  private handleFireballHitKing(
    fireballObj: PhysicsOverlapObject,
    kingObj: PhysicsOverlapObject
  ): void {
    const fireball = fireballObj as Fireball;
    const king = kingObj as MadKing;
    if (!fireball.active || fireball.hasAlreadyHit() || king.isDead()) return;

    king.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }
}
