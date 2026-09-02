import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import AncientDemon from '../bosses/AncientDemon';
import {
  DEATH_ANIM_MS as DEMON_DEATH_ANIM_MS,
  FEET_OFFSET_Y as DEMON_FEET_OFFSET_Y,
} from '../bosses/AncientDemonAnimations';
import ShadeMinion from '../bosses/ShadeMinion';
import type { PhysicsOverlapObject } from '../combat/DamageSystem';
import AudioManager, { bindPlayerSfx, MUSIC_KEYS, SFX_KEYS } from '../systems/AudioManager';
import { hasSeenDialogue, markDialogueSeen } from '../systems/DialogueMemory';
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';
import Dialogue, { type DialogueLine } from '../ui/Dialogue';

// Final boss aréna (Project_plan.md 14./15. pont – "The Broken Gate"): fix, egy képernyős
// pálya, nincs kameragörgetés — ugyanaz a felépítés, mint a BossScene-é és a Boss2Scene-é.
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 450;

/**
 * A rajzolt dais felső pereme. MÉRT érték, nem hangolt: a forráskép
 * (`2D helper/level/Final boss background.png`, 1672x941) 800x450-re kicsinyítve a 368-369.
 * sorban éri el a fényesség-csúcsát (`row mean 39.4`), a 370. sorban pedig -16.5 a zuhanás.
 *
 * A Boss 1-nél a képet KIVÁGNI kellett, mert ott a GROUND_TOP (418) már adott volt. Itt —
 * mint a Boss 2-nél — új scene, tehát a padlóvonalat a KÉPHEZ igazítjuk, és a festmény
 * vágás nélkül, teljes egészében megmarad. Ha a háttér valaha újragenerálódik, ezt EGYÜTT
 * kell újramérni.
 */
const GROUND_TOP = 369;
const GROUND_CENTER_Y = GROUND_TOP + 16; // ground-placeholder 64x32, origin 0.5

const PLAYER_SPAWN_X = 90;
const PLAYER_SPAWN_Y = 260;

// A démon talpa a sprite.y-tól DEMON_FEET_OFFSET_Y-ra van (a sprite geometriájából levezetve,
// lásd AncientDemonAnimations.ts) — így a spawn pontosan a rajzolt kőperemre teszi.
const DEMON_SPAWN_X = 620;
const DEMON_SPAWN_Y = GROUND_TOP - DEMON_FEET_OFFSET_Y;

/**
 * A villanás vízszintes határai. Behúzva az aréna pereméről, hogy a démon soha ne
 * teleportáljon félig a képen kívülre.
 */
const DEMON_ARENA_BOUNDS = { minX: 60, maxX: 740 };

/**
 * A háttér TINT NÉLKÜL megy be — mérés, nem ízlés: a játéktér (a 160-369. sorok) nyers
 * fényessége `mean 30.1`, szemben a Boss 2 trónterem `36.3`-ával és a Boss 1 festményének
 * TINTELT `40.7`-ével. Ez a három aréna közül a legsötétebb kép; egy további sötétítés
 * elnyelné a démont, aki maga is majdnem fekete.
 */

/** A festmény legfelső sorának átlagszíne — hogy egy letterbox se villantson feketét. */
const BACKGROUND_COLOR = '#080817';

const BOSS_NAME = 'Ancient Demon';
const BOSS_SUBTITLE = 'Omen of Crows';

const HP_BAR_X = 110;
const HP_BAR_Y = 34;
const HP_BAR_WIDTH = 580;
const HP_BAR_HEIGHT = 16;

/**
 * A démon AURÁJA — READABILITY-megoldás, nem dísz.
 *
 * MÉRVE: a köpeny luminanciája 12.7 (`rgb(14,12,12)`), a háttéré a démon környékén medián
 * 21.7, de a legsötétebb tizedében 10.0 — vagyis a fekete sziluett a kép sötét foltjaiban
 * ELTŰNIK. Tinttel ez nem javítható: a Phaser MULTIPLY tintje csak sötétíteni tud.
 * Ezért kap a démon egy halvány ibolya derengést MAGA MÖGÉ, ami a kontúrját mindenhol
 * elválasztja a háttértől — és egyben az "ősi, sötét jelenlét" hangulatát is adja.
 *
 * Placeholder (kódból generált radiális textúra); valódi VFX az `assets/effects/` iterációban.
 */
const AURA_DEPTH = -5;
const AURA_ALPHA = 0.28;

/** A death animáció + egy pillanat, amíg a szétfoszlás utolsó pixelei is eltűnnek. */
const VICTORY_DELAY_MS = DEMON_DEATH_ANIM_MS + 700;
const DEFEAT_DELAY_MS = 1400;
const FADE_MS = 700;

/**
 * **A harc kezdete MAGA a checkpoint** (user-döntés, kézi teszt után): vereség esetén nem egy
 * pályára térünk vissza, hanem AZONNAL újraindul az aréna.
 *
 * Ez a végső bossnál más, mint a másik háromnál, és szándékosan: azok ajtaja egy pálya végén
 * van, tehát a visszatérés legfeljebb néhány lépés. Ide viszont a `Level2Scene` boss-ajtaján
 * át vezetett az út, ami egy 7200 px-es pálya TELJES újrafutását jelentette volna minden
 * bukott próbálkozás után — a játék leghosszabb harcánál a legrosszabb helyen.
 *
 * A „checkpoint a harc KEZDETÉN" azt is jelenti, hogy az átvezetőt nem kell újranézni: erről a
 * `systems/DialogueMemory` gondoskodik, ugyanaz a registry-alapú emlékezet, amit a másik három
 * aréna is használ. *(Korábban ez itt scene-adat volt (`{ skipDialogue: true }`) — azt a Boss
 * 1/2/3 retry-útja nem tudta átvinni, mert az egy pályán keresztül vezet.)*
 */
const RETRY_SCENE_KEY = 'FinalBossScene';
const CREDITS_SCENE_KEY = 'CreditsScene';

/**
 * Placeholder lore-párbeszéd: a végleges szöveget a Phase 9 – Lore írja meg, a csere ennek a
 * tömbnek a szerkesztése. A tartalom a Project_plan.md 16. pontjának történetét követi (a
 * démon a királlyal kötött alku ürügyén fogta el a varjakat, és ezzel bontotta meg a rendet
 * az élők és a holtak világa között).
 *
 * A sorok SZÁNDÉKOSAN rövidek: a panel 2 sorra tördel, ennél hosszabb szöveg kilógna belőle.
 */
const DEMON_DIALOGUE: DialogueLine[] = [
  { speaker: 'AZ ŐSI DÉMON', text: 'Hát idáig eljöttél. A király csak a kapu kilincse volt.' },
  { speaker: 'LAZARUS', text: 'A varjakat akarom. Mind a hetvenkettőt.' },
  { speaker: 'AZ ŐSI DÉMON', text: 'A tieid? Ők most az enyémek. Én tartom a kaput, amit te elhagytál.' },
  { speaker: 'LAZARUS', text: 'Nem elhagytam. Elvetted.' },
  { speaker: 'AZ ŐSI DÉMON', text: 'Ugyanaz. Egy őr, aki nem őriz, már csak egy madár szárnyak nélkül.' },
  { speaker: 'LAZARUS', text: 'Akkor ma megtanulod, mire képes egy szárnyatlan varjú.' },
];

/**
 * Placeholder lore-narráció a JÁTÉK VÉGÉN — a Phase 9-ben cserélendő. A Project_plan.md 16.
 * pontjának lezárása: a démon visszakerül a pokolba, Lazarus visszanyeri a szárnyait és a
 * varjakat, és helyreáll a rend az élők és a holtak világa között.
 */
const ENDING_NARRATION = [
  'A csuklya összeesik, mint egy elengedett zászló.\nAmi alatta volt, nem hagy maga után testet.',
  'A kapu kinyílik. Nem a hegy oldalában — mindenütt,\nahol valaki várt rá túl régóta.',
  'Hetvenkét varjú emelkedik ki a törésből.\nEgyik sem néz vissza. Nem is kell.',
  'Lazarus vállán megmozdul valami, ami régóta nem mozdult.\nElőször fáj. Aztán felemeli.',
  'A holtak elindulnak a maguk útján.\nA rend nem visszatér. Megőrzik.',
];

export default class FinalBossScene extends Phaser.Scene {
  private player!: Player;
  /**
   * SZÁNDÉKOSAN csak a párbeszéd UTÁN jön létre. A PlayerController konstruktora regisztrálja
   * a J/F billentyű- és pointer-listenereket, tehát nem elég az update()-jét kihagyni: a
   * player a dialógus alatt így nem mozoghat, nem támadhat és nem varázsolhat.
   * (A Boss2Scene azonos megoldása.)
   */
  private controller: PlayerController | null = null;
  private demon!: AncientDemon;
  private audio!: AudioManager;
  private dialogue: Dialogue | null = null;

  /** A démon mögötti derengés — lásd az AURA_* konstansok kommentjét. */
  private aura!: Phaser.GameObjects.Image;

  private playerHpText!: Phaser.GameObjects.Text;
  private demonHpBar!: Phaser.GameObjects.Graphics;
  private demonNameText!: Phaser.GameObjects.Text;

  private fireballs: Fireball[] = [];
  /**
   * Az idézett árnyékok. Plain tömb, NEM Phaser.Group: a group `add()`-je felülírná a
   * beállított sebességet/gravitációt (1. technikai tanulság). A takarítás mindig helyben,
   * splice()-szal megy — a tömb REFERENCIÁJA be van kötve az overlapekbe (2. tanulság).
   */
  private shades: ShadeMinion[] = [];

  private fightStarted = false;
  private outcomeScheduled = false;

  constructor() {
    super('FinalBossScene');
  }

  create(): void {
    // Class field initializerek CSAK a Scene első létrehozásakor futnak le; a scene-be való
    // újbóli belépés (halál -> Level2Scene -> ajtó -> FinalBossScene) ugyanazon a példányon
    // hívja újra a create()-et. Lásd CLAUDE.md "Fontos technikai tanulságok" 3.
    this.fireballs = [];
    this.shades = [];
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
    // A talaj csak ÜTKÖZŐ, nem grafika: a festményen a dais homlokzata van a padlóél alatt,
    // ami pont ezt a szerepet tölti be (a Boss 1/2 azonos döntése).
    groundSprite.setVisible(false);

    this.player = new Player(this, PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
    this.physics.add.collider(this.player, ground);

    this.demon = new AncientDemon(this, DEMON_SPAWN_X, DEMON_SPAWN_Y, DEMON_ARENA_BOUNDS);
    this.physics.add.collider(this.demon, ground);
    // Player és démon között SZÁNDÉKOSAN nincs collider: a sebzés a támadás-hitboxokon megy,
    // így nem tolják egymást a pálya szélére (a másik két aréna azonos döntése).

    this.aura = this.add
      .image(this.demon.x, this.demon.y, 'demon-aura-placeholder')
      .setDepth(AURA_DEPTH)
      .setAlpha(AURA_ALPHA);

    this.registerCombatOverlaps(ground);
    this.registerDemonEvents();

    this.createHud();

    // Ismételt próbálkozásnál egyenesen a belépőre ugrunk: a checkpoint a harc KEZDETE, tehát
    // az átvezetőt sem kell újranézni (a másik három aréna azonos mintája).
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
    this.add.image(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, BACKGROUND_TEXTURES.FINAL_ARENA).setDepth(-30);
  }

  /**
   * A párbeszéd a boss entrance ELSŐ fele: a démon DORMANT, tehát nem mozog és nem is
   * sebezhető, a player pedig kontroller nélkül áll. A jobbra-nyíl gyorsítja a szöveget;
   * a párbeszéd magától is végigmegy. (A Boss2Scene azonos mintája.)
   *
   * VÉGIGJÁTSZÁSONKÉNT EGYSZER fut le (a `markDialogueSeen()` a végén) — a vereség utáni
   * azonnali újraindítás egyből a cím-kártyával nyit.
   */
  private startDialogue(): void {
    this.dialogue = new Dialogue(
      this,
      DEMON_DIALOGUE,
      { groundTop: GROUND_TOP, viewportWidth: ARENA_WIDTH },
      () => {
        markDialogueSeen(this.registry, this.scene.key);
        this.startEntrance();
      }
    );

    // A KeyboardPlugin a scene leállásakor magától leiratkoztat, ezért itt nincs kézi
    // takarítás (a NarrationScene / Boss2Scene azonos mintája).
    this.input.keyboard?.on('keydown-RIGHT', () => this.dialogue?.advance());
  }

  // Boss entrance (Project_plan.md 15. pont): a démon DORMANT, amíg a cím be- és kifadel.
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
    // megy, és a sáv a cím-kártyával EGYÜTT csap be, a harc nyitányaként. Pontosan a
    // Boss2Scene mintája; a DEFAULT_FADE_IN_MS (800) gyakorlatilag a cím be-fadelésének
    // hossza (700), tehát a kép és a hang együtt jön fel.
    this.audio.playMusic(MUSIC_KEYS.FINAL_BOSS_THEME);

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
    this.demonNameText.setVisible(true);
    // A player IRÁNYÍTÁSA is csak most nyílik meg — lásd a `controller` mező kommentjét.
    this.controller = new PlayerController(this, this.player);
    this.demon.activate();
  }

  private registerCombatOverlaps(ground: Phaser.Physics.Arcade.StaticGroup): void {
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.demon,
      this.handlePlayerHitDemon,
      undefined,
      this
    );

    // A kard az árnyékokat is levágja — ugyanaz a hitbox, egy csapás többet is elérhet
    // (a Player hitTargetsThisAttack halmaza célonként külön számol).
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.shades,
      this.handlePlayerHitShade,
      undefined,
      this
    );

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      this.fireballs.push(new Fireball(this, x, y, direction));
      this.audio.playSfx(SFX_KEYS.FIREBALL_CAST);
    });

    // Suhintás + lépés + ugrás + halál: ugyanaz a lovag mozog, mint a pályákon.
    bindPlayerSfx(this.player, this.audio);

    this.physics.add.overlap(this.fireballs, this.demon, this.handleFireballHitDemon, undefined, this);
    this.physics.add.overlap(this.fireballs, this.shades, this.handleFireballHitShade, undefined, this);

    this.physics.add.collider(this.fireballs, ground, (projectileObj) => {
      const projectile = projectileObj as Fireball;
      if (projectile.active) projectile.onImpact();
    });
  }

  private registerDemonEvents(): void {
    // A démon csak eventet emittál, a hangot a scene játssza le — a bevett delegálási minta.
    this.demon.on('demon-slash', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));

    // Az árny-hullám a BECSAPÓDÁS pillanatában szól (nem a telegraph alatt): a néma emelkedés
    // maga a kitérési ablak. Ugyanaz az elv, mint a Wing-Breaker Shadow Spelljénél — csak itt
    // az időzítést maga a démon adja eventtel, tehát nem kell scene-oldali delayedCall.
    this.demon.on('demon-nova-impact', () => {
      this.audio.playSfx(SFX_KEYS.BOSS_SPELL_IMPACT);
      this.cameras.main.shake(200, 0.008);
    });

    // Az idézés UGYANAZT a varázslat-hangot kapja, mint az árny-hullám (user-döntés): a
    // démon mindkét képessége ugyanabból a sötét energiából jön, és a ±120 cent
    // detune-szórás miatt a két hang sorozatban sem válik gépiessé. A hang a KIOLDÁS
    // pillanatában szól — a 'demon-summon' event pontosan akkor jön, amikor a kasza lecsap
    // és az árnyékok megjelennek.
    //
    // TODO (Phase 8 – SFX): a VILLANÁS ('demon-blink-out' / 'demon-blink-in') továbbra is
    // néma. Szándékosan: egy rossz hang rosszabb, mint a csend.
    this.demon.on('demon-summon', (points: Array<{ x: number; y: number }>) => {
      this.audio.playSfx(SFX_KEYS.BOSS_SPELL_IMPACT);
      for (const point of points) {
        this.shades.push(new ShadeMinion(this, point.x, point.y));
      }
    });

    this.demon.on('demon-phase-change', () => {
      this.cameras.main.shake(400, 0.012);

      const phaseText = this.add
        .text(ARENA_WIDTH / 2, 130, 'PHASE  II', {
          fontFamily: 'monospace',
          fontSize: '34px',
          color: '#9a5cff',
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

    this.demonNameText = this.add
      .text(ARENA_WIDTH / 2, HP_BAR_Y - 14, BOSS_NAME, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d8c8d8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.demonHpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  update(_time: number, delta: number): void {
    // A dialógus a scene delta-idejéből ketyeg (nem saját timerből) — így a mag pure marad.
    if (this.dialogue && !this.dialogue.isFinished()) this.dialogue.update(delta);

    this.controller?.update();

    if (this.fightStarted) {
      this.demon.update(this.player);
    }

    // Az aura a démonnal együtt mozog, és a villanás alatt VELE halványul — enélkül a
    // derengés ott maradna, ahonnan a démon már eltűnt.
    this.aura.setPosition(this.demon.x, this.demon.y);
    this.aura.setAlpha(AURA_ALPHA * this.demon.alpha);
    this.aura.setVisible(!this.demon.isDead());

    this.updateShades();

    // Az inaktív lövedékek kitakarítása MINDIG helyben, splice()-szal: a tömb referenciája be
    // van kötve a physics.add.overlap-ba, egy filter()-es újra-értékadás elavult tömbre hagyná
    // a collidert (CLAUDE.md "Fontos technikai tanulságok" 2.).
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      if (!this.fireballs[i].active) this.fireballs.splice(i, 1);
    }

    this.playerHpText.setText(
      `HP: ${this.player.getHP()}/${this.player.getMaxHP()} | ${this.player.playerState}`
    );
    this.drawDemonHealthBar();

    if (this.outcomeScheduled) return;

    if (this.demon.isDead()) {
      this.scheduleVictory();
    } else if (this.player.isDead()) {
      this.scheduleDefeat();
    }
  }

  /** Ugyanaz a helyben-splice minta, mint a lövedékeknél (2. technikai tanulság). */
  private updateShades(): void {
    for (let i = this.shades.length - 1; i >= 0; i--) {
      const shade = this.shades[i];
      if (!shade.active) {
        this.shades.splice(i, 1);
        continue;
      }
      shade.update(this.player);
    }
  }

  private drawDemonHealthBar(): void {
    this.demonHpBar.clear();
    if (!this.fightStarted) return;

    const ratio = Math.max(0, this.demon.getHP() / this.demon.getMaxHP());

    this.demonHpBar.fillStyle(0x000000, 0.6);
    this.demonHpBar.fillRect(HP_BAR_X - 3, HP_BAR_Y - 3, HP_BAR_WIDTH + 6, HP_BAR_HEIGHT + 6);
    this.demonHpBar.fillStyle(0x1c1030, 1);
    this.demonHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this.demonHpBar.fillStyle(this.demon.getPhase() === 2 ? 0x9a5cff : 0x6a3aa8, 1);
    this.demonHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT);
  }

  /**
   * A JÁTÉK VÉGE. A démonnal együtt az idézett árnyékok is elenyésznek — a gazdájuk nélkül
   * nincs, ami tartsa őket, és a záró beat alatt nem sebezhetik halálra a playert.
   */
  private scheduleVictory(): void {
    this.outcomeScheduled = true;
    this.registry.set('demonDefeated', true);
    this.audio.stopMusic();

    for (const shade of this.shades) shade.destroy();
    this.shades.length = 0;

    this.time.delayedCall(VICTORY_DELAY_MS, () => {
      this.fadeToScene('NarrationScene', {
        lines: ENDING_NARRATION,
        nextScene: CREDITS_SCENE_KEY,
      });
    });
  }

  /**
   * Vereség: AZONNAL újraindul az aréna, a párbeszéd nélkül (lásd `RETRY_SCENE_KEY`).
   *
   * A `scene.start()` ugyanazon a példányon futtatja újra a `create()`-et, tehát a class
   * field initializerek NEM futnak le még egyszer (CLAUDE.md 3. tanulság) — a `create()`
   * eleje ezért üríti ki explicit a `fireballs`/`shades` tömböket és a flageket. A `demon`
   * és a `player` új példányként jön létre, a régieket a scene shutdownja semmisíti meg.
   */
  private scheduleDefeat(): void {
    this.outcomeScheduled = true;
    this.audio.stopMusic();

    this.time.delayedCall(DEFEAT_DELAY_MS, () => {
      this.fadeToScene(RETRY_SCENE_KEY);
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

  private handlePlayerHitDemon(hitbox: PhysicsOverlapObject, demonObj: PhysicsOverlapObject): void {
    const demon = demonObj as AncientDemon;
    // A villanás alatt sebezhetetlen — és a registerHit()-et is ki KELL hagyni, különben a
    // csapás "elhasználódna" egy olyan célponton, amit meg sem sebzett.
    if (!demon.isVulnerable() || this.player.hasHitTarget(demon)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    demon.takeDamage(damage);
    this.player.registerHit(demon);
    this.audio.playSfx(SFX_KEYS.SWORD_IMPACT);
  }

  private handlePlayerHitShade(hitbox: PhysicsOverlapObject, shadeObj: PhysicsOverlapObject): void {
    const shade = shadeObj as ShadeMinion;
    if (shade.isDead() || this.player.hasHitTarget(shade)) return;

    // A lidérc BÁRMEKKORA sebzésbe belehal, de a hitbox sebzését így is átadjuk: az érték
    // forrása maradjon egyetlen helyen (ATTACK_CONFIGS), ne egy itt beírt szám.
    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    shade.takeDamage(damage);
    this.player.registerHit(shade);
    this.audio.playSfx(SFX_KEYS.SWORD_IMPACT);
  }

  private handleFireballHitDemon(
    fireballObj: PhysicsOverlapObject,
    demonObj: PhysicsOverlapObject
  ): void {
    const fireball = fireballObj as Fireball;
    const demon = demonObj as AncientDemon;
    if (!fireball.active || fireball.hasAlreadyHit() || !demon.isVulnerable()) return;

    demon.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }

  private handleFireballHitShade(
    fireballObj: PhysicsOverlapObject,
    shadeObj: PhysicsOverlapObject
  ): void {
    const fireball = fireballObj as Fireball;
    const shade = shadeObj as ShadeMinion;
    if (!fireball.active || fireball.hasAlreadyHit() || shade.isDead()) return;

    shade.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }
}
