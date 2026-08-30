import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
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
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';
import Dialogue, { type DialogueLine } from '../ui/Dialogue';

// Boss 2 aréna (Project_plan.md 15. pont): fix, egy képernyős pálya — nincs kameragörgetés,
// ugyanaz a felépítés, mint a BossScene-é.
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 450;

/**
 * A rajzolt trónterem-padló felső pereme. MÉRT érték, nem hangolt: a forráskép
 * (`2D helper/level/Second boss background.png`, 1672x941) megvilágított padlóéle a
 * 771-773. sorban van, ami a 800x450-re kicsinyített képen a 369. sorra esik (a
 * lekicsinyített PNG-n visszamérve: a fényesség-csúcs y=369, a leesés y=370-371).
 *
 * A Boss 1-nél a képet KIVÁGNI kellett, mert ott a GROUND_TOP (418) már adott volt. Itt új
 * scene, tehát a padlóvonalat a KÉPHEZ igazítjuk: a festmény így vágás nélkül, teljes
 * egészében megmarad. Ha a háttér valaha újragenerálódik, ezt EGYÜTT kell újramérni.
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
const BACKGROUND_COLOR = '#0e0c17';

const BOSS_NAME = 'The Mad King';
const BOSS_SUBTITLE = 'aki nem engedte el';

const HP_BAR_X = 110;
const HP_BAR_Y = 34;
const HP_BAR_WIDTH = 580;
const HP_BAR_HEIGHT = 16;

/** A death animáció + egy pillanat, amíg a test ott marad a trón előtt. */
const VICTORY_DELAY_MS = KING_DEATH_ANIM_MS + 700;
const DEFEAT_DELAY_MS = 1400;
const FADE_MS = 700;

/**
 * A király a végső ellenfél felé nyit kaput. Amíg a `FinalBossScene` nincs regisztrálva,
 * visszatérünk a Level 2-re — ugyanaz a minta, amivel a Level2Scene kezelte a még nem létező
 * Boss2Scene-t, tehát a végső aréna elkészültekor ez magától él majd.
 */
const FINAL_SCENE_KEY = 'FinalBossScene';
const FALLBACK_SCENE_KEY = 'Level2Scene';

/**
 * Placeholder lore-párbeszéd: a végleges szöveget a Phase 9 – Lore írja meg, a csere ennek a
 * tömbnek a szerkesztése. A tartalom a Project_plan.md 16. pontjának történetét követi (a
 * király a haldokló felesége miatt paktált a démonnal, és ezzel fogatta el a varjakat).
 *
 * A sorok SZÁNDÉKOSAN rövidek: a panel 2 sorra tördel, ennél hosszabb szöveg kilógna belőle.
 */
const KING_DIALOGUE: DialogueLine[] = [
  { speaker: 'AZ ŐRÜLT KIRÁLY', text: 'Ismerlek, szárnyatlan. A varjaid egykor az én tornyaim felett köröztek.' },
  { speaker: 'LAZARUS', text: 'És most a te ketrecedben ülnek. Engedd el őket.' },
  { speaker: 'AZ ŐRÜLT KIRÁLY', text: 'Elengedni? Te őrizted a kaput, és hagytad, hogy elvigye őt.' },
  { speaker: 'LAZARUS', text: 'A királyné meghalt. Amit visszahoztál, az nem ő.' },
  { speaker: 'AZ ŐRÜLT KIRÁLY', text: 'Hazudsz. Alszik. Csak addig alszik, amíg a rend helyre nem áll.' },
  { speaker: 'LAZARUS', text: 'Akkor előbb téged fektetlek le mellé.' },
];

/**
 * Placeholder lore-narráció a győzelem után — a Phase 9-ben cserélendő. A király FELOLDOZÁST
 * kap (Project_plan.md 16. pont), ezért nem diadal, hanem lezárás.
 */
const KING_VICTORY_NARRATION = [
  'A korona lecsúszik a fejéről, és megáll a trón lépcsőjén.\nA király nem nyúl utána.',
  'Odébb, a félhomályban, valami elernyed.\nAmi a királyné helyett feküdt ott, végre nem mozdul.',
  'A trónterem mennyezete megnyílik.\nNem az égre — valami mélyebbre.',
  'A démon nem a kastélyban van.\nA kapunál vár, amit Lazarusnak kellett volna őriznie.',
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

  private playerHpText!: Phaser.GameObjects.Text;
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
    this.startDialogue();
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
   */
  private startDialogue(): void {
    this.dialogue = new Dialogue(
      this,
      KING_DIALOGUE,
      { groundTop: GROUND_TOP, viewportWidth: ARENA_WIDTH },
      () => this.startEntrance()
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
    this.playerHpText = this.add
      .text(10, 10, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100);

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

    this.playerHpText.setText(
      `HP: ${this.player.getHP()}/${this.player.getMaxHP()} | ${this.player.playerState}`
    );
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
        nextScene: this.finalSceneExists() ? FINAL_SCENE_KEY : FALLBACK_SCENE_KEY,
      });
    });
  }

  /**
   * A végső aréna még nem létezik. Amíg nincs regisztrálva, a győzelmi átvezető a Level 2-re
   * tesz vissza — a `FinalBossScene` regisztrálásakor ez magától átvált rá.
   */
  private finalSceneExists(): boolean {
    return FINAL_SCENE_KEY in this.scene.manager.keys;
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
