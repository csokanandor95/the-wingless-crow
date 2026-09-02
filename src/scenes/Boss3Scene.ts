import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
import CombatHud from '../ui/CombatHud';
import Fireball from '../combat/Projectile';
import CrowHarvester from '../enemies/CrowHarvester';
import Gravecaller, {
  PROJECTILE_DAMAGE as GRAVECALLER_PROJECTILE_DAMAGE,
  PROJECTILE_SIZE as GRAVECALLER_PROJECTILE_SIZE,
  PROJECTILE_SPEED as GRAVECALLER_PROJECTILE_SPEED,
} from '../enemies/Gravecaller';
import BeastMaster, {
  BeastMasterState,
  SUMMON_SPAWN_DISTANCE,
  type SummonType,
} from '../bosses/BeastMaster';
import {
  DEATH_FADE_MS as MASTER_DEATH_FADE_MS,
  FEET_OFFSET_Y as MASTER_FEET_OFFSET_Y,
} from '../bosses/BeastMasterAnimations';
import type { Damageable, PhysicsOverlapObject } from '../combat/DamageSystem';
import AudioManager, {
  bindPlayerSfx,
  BEAST_DEATH_VOLUME,
  DEATH_SFX_DETUNE_RANGE,
  GRAVECALLER_DEATH_VOLUME,
  HARVESTER_DEATH_VOLUME,
  KING_SLAM_VOLUME,
  MUSIC_KEYS,
  SFX_KEYS,
} from '../systems/AudioManager';
import AfterImageTrail from '../systems/AfterImageTrail';
import { hasSeenDialogue, markDialogueSeen } from '../systems/DialogueMemory';
import Dialogue, { type DialogueLine } from '../ui/Dialogue';
import {
  ARENA_GROUND_TOP,
  CHURCH_BACKGROUND_COLOR,
  CHURCH_GROUND_SURFACE_OFFSET_Y,
  CHURCH_GROUND_TILE_HEIGHT,
  CHURCH_TILE_TEXTURES,
} from '../levels/ChurchTileset';
import { DECOR_DEPTH, TERRAIN_DEPTH } from '../levels/LevelTileset';
import { BUILDING_DEPTH } from '../levels/GothicTownTileset';
import {
  BUILDING_TEXTURES,
  GRAVECALLER_SPAWN_OFFSET,
  HARVESTER_SPAWN_OFFSET,
} from '../levels/LevelGeometry';

/**
 * Boss 3 – **The Beast Master** arénája.
 *
 * A `Boss2Scene` szerkezetének párja: fix 800x450, nincs kameragörgetés, üres padló,
 * player<->boss collider nélkül, párbeszéd -> cím-kártya -> harc, HP-bar. Ami MÁS:
 *
 *  - **A háttér SCENE-BEN ÖSSZERAKOTT, nem egyetlen festmény.** Ez az egyetlen ilyen aréna a
 *    négyből, és nem kényelmi döntés: a másik háromhoz kész festmény állt rendelkezésre, a
 *    GothicVania Church viszont csempékből és fal-panelekből építkezik. Egy 800x450-es kép
 *    legenerálása pontosan azt a rétegzést duplikálná, amit a Level 3 amúgy is használ.
 *  - **NINCS fázis és nincs „PHASE II" felirat** (user-döntés). A harc ritmusát a FALKA adja:
 *    a Master 66 %-nál egy CrowHarvestert, 33 %-nál egy Gravecallert hív.
 *  - **A falka lényeit a SCENE hozza létre**, a boss csak `beast-master-summon` eventet
 *    emittál — a démon `demon-summon`-jának delegálási mintája. Új enemy-osztály NEM kellett.
 */

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 450;

/** A padlóvonal LEVEZETETT — az indoklás a `ChurchTileset.ARENA_GROUND_TOP`-nál. */
const GROUND_TOP = ARENA_GROUND_TOP;
const GROUND_CENTER_Y = GROUND_TOP + 16; // ground-placeholder 64x32, origin 0.5

const PLAYER_SPAWN_X = 90;
const PLAYER_SPAWN_Y = 260;

const MASTER_SPAWN_X = 620;
const MASTER_SPAWN_Y = GROUND_TOP - MASTER_FEET_OFFSET_Y;

/** A hívott lények spawn-pontja az arénán belülre szorítva. */
const SUMMON_MARGIN_X = 60;

const BOSS_NAME = 'The Beast Master';
const BOSS_SUBTITLE = 'who fed the pack';

const HP_BAR_X = 110;
const HP_BAR_Y = 34;
const HP_BAR_WIDTH = 580;
const HP_BAR_HEIGHT = 16;

const VICTORY_DELAY_MS = MASTER_DEATH_FADE_MS + 700;
const DEFEAT_DELAY_MS = 1400;
const FADE_MS = 700;

const NEXT_SCENE_KEY = 'FinalBossScene';
const FALLBACK_SCENE_KEY = 'Level3Scene';

/**
 * Placeholder lore-párbeszéd — a végleges szöveget a Phase 9 – Lore írja meg, a csere ennek a
 * tömbnek a szerkesztése. A sorok SZÁNDÉKOSAN rövidek: a panel 2 sorra tördel.
 */
const MASTER_DIALOGUE: DialogueLine[] = [
  { speaker: 'THE BEAST MASTER', text: 'I heard you coming. So did they. They have not eaten for days.' },
  { speaker: 'LAZAR', text: 'You keep them on a chain. That is not loyalty.' },
  { speaker: 'THE BEAST MASTER', text: 'There is no chain, wingless one. Only hunger and habit. Like yours.' },
  { speaker: 'LAZAR', text: 'I never fed the demon.' },
  { speaker: 'THE BEAST MASTER', text: 'No. You only opened the gate for it, and turned away.' },
  { speaker: 'LAZAR', text: 'Then I will close it now.' },
];

/**
 * Placeholder lore-narráció a győzelem után — a Phase 9-ben cserélendő. A kapu innen már
 * közvetlenül a végső ellenfélhez vezet.
 */
const MASTER_VICTORY_NARRATION = [
  'The pack does not attack again. It does not flee — it only stands\nand watches the body that used to feed it.',
  'Then, one by one, they slip away into the dark of the corridors.\nNot toward Lazar.',
  'At the end of the dungeon the last gate opens on its own.\nBehind it there is no stone, and no earth either.',
  'The demon knows he is coming. And it is not hiding any more.',
];

export default class Boss3Scene extends Phaser.Scene {
  private player!: Player;
  /**
   * SZÁNDÉKOSAN csak a párbeszéd UTÁN jön létre: a konstruktora regisztrálja a J/F billentyű-
   * és pointer-listenereket, tehát nem elég az update()-jét kihagyni (a Boss2Scene elve).
   */
  private controller: PlayerController | null = null;
  private master!: BeastMaster;
  private audio!: AudioManager;
  private chargeTrail!: AfterImageTrail;
  private dialogue: Dialogue | null = null;

  private combatHud!: CombatHud;
  private masterHpBar!: Phaser.GameObjects.Graphics;
  private masterNameText!: Phaser.GameObjects.Text;

  private fireballs: Fireball[] = [];
  /**
   * A hívott lények és a boltjaik. PLAIN tömbök, nem Phaser Group: a group `add()`-je
   * felülírná a beállított sebességet/gravitációt (CLAUDE.md 1. tanulság), a takarítás pedig
   * mindig helyben, `splice()`-szal megy (2. tanulság).
   */
  private summons: Array<Phaser.Physics.Arcade.Sprite & Damageable> = [];
  private summonProjectiles: Fireball[] = [];

  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private fightStarted = false;
  private outcomeScheduled = false;

  constructor() {
    super('Boss3Scene');
  }

  create(): void {
    // Class field initializerek CSAK a Scene első létrehozásakor futnak le (CLAUDE.md 3.).
    this.fireballs = [];
    this.summons = [];
    this.summonProjectiles = [];
    this.controller = null;
    this.dialogue = null;
    this.fightStarted = false;
    this.outcomeScheduled = false;

    this.audio = new AudioManager(this);

    this.cameras.main.setBackgroundColor(CHURCH_BACKGROUND_COLOR);
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.fadeIn(600);

    this.createBackground();

    this.ground = this.physics.add.staticGroup();
    const groundSprite = this.ground
      .create(ARENA_WIDTH / 2, GROUND_CENTER_Y, 'ground-placeholder')
      .setScale(ARENA_WIDTH / 64, 1)
      .refreshBody() as Phaser.Physics.Arcade.Sprite;
    // A talaj csak ÜTKÖZŐ, nem grafika: a látványt a church csempék adják (lásd
    // createBackground()).
    groundSprite.setVisible(false);

    this.player = new Player(this, PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
    this.physics.add.collider(this.player, this.ground);

    this.master = new BeastMaster(this, MASTER_SPAWN_X, MASTER_SPAWN_Y);
    this.physics.add.collider(this.master, this.ground);
    // Player és Master között SZÁNDÉKOSAN nincs collider: a sebzés a támadás-hitboxokon megy
    // (a másik három aréna azonos döntése).

    // A roham sebesség-csíkja. Ugyanaz a modul, amit a Wing-Breaker charge-a és a Mad King
    // kitörése használ — itt VALÓDI rohanó animációra rakódik rá, nem megtartott pózra.
    this.chargeTrail = new AfterImageTrail(this, this.master);

    this.registerCombatOverlaps();
    this.registerMasterEvents();

    this.createHud();

    // Ismételt próbálkozásnál egyenesen a belépőre ugrunk (a BossScene azonos mintája): a
    // "már láttam" tény a REGISTRY-ben él, mert a vereség-ág a Level 3-ra tesz vissza, és a
    // player onnan, az ajtón át jön újra.
    if (hasSeenDialogue(this.registry, this.scene.key)) {
      this.startEntrance();
    } else {
      this.startDialogue();
    }
  }

  /**
   * A háttér csempékből és fal-panelekből áll össze — a Level 3 rétegzésével azonos módon:
   *
   *   (háttérszín)  #272638
   *   -15           fal-panelek (átlátszatlanok, a keretük PONT a háttérszín)
   *   -10           korlát (előtér-dísz)
   *    -5           talaj + a padló alatti kitöltés
   *
   * A panelek 192 px magasak, a talpuk a padlóvonalon; a köztük maradó rések a háttérszínt
   * mutatják, ami a paneleik keretével azonos — tehát varratmentes falként olvas.
   */
  private createBackground(): void {
    const panels: Array<{ texture: string; x: number }> = [
      { texture: BUILDING_TEXTURES.CHURCH_SCONCE, x: 44 },
      { texture: BUILDING_TEXTURES.CHURCH_COLUMN, x: 200 },
      { texture: BUILDING_TEXTURES.CHURCH_ALTAR, x: 400 },
      { texture: BUILDING_TEXTURES.CHURCH_COLUMN, x: 600 },
      { texture: BUILDING_TEXTURES.CHURCH_SCONCE, x: 756 },
    ];

    for (const panel of panels) {
      this.add
        .image(panel.x, GROUND_TOP, panel.texture)
        .setOrigin(0.5, 1)
        .setDepth(BUILDING_DEPTH);
    }

    // A padló: a 48 px-es csempe a felszín FÖLÉ tolva, alatta a maradék sávot a cap NÉLKÜLI
    // `fill-block` tölti ki. A talaj-csempe függőlegesen NEM ismételhető (a felső 8 sora
    // átlátszó, alatta a világos perem) — egy magasabb tileSprite a fal közepén rajzolna egy
    // második járható peremet.
    const terrainTop = GROUND_TOP - CHURCH_GROUND_SURFACE_OFFSET_Y;
    this.add
      .tileSprite(0, terrainTop, ARENA_WIDTH, CHURCH_GROUND_TILE_HEIGHT, CHURCH_TILE_TEXTURES.GROUND)
      .setOrigin(0, 0)
      .setDepth(TERRAIN_DEPTH);

    const fillTop = terrainTop + CHURCH_GROUND_TILE_HEIGHT;
    if (fillTop < ARENA_HEIGHT) {
      this.add
        .tileSprite(
          0,
          fillTop,
          ARENA_WIDTH,
          ARENA_HEIGHT - fillTop,
          CHURCH_TILE_TEXTURES.FILL_BLOCK
        )
        .setOrigin(0, 0)
        .setDepth(TERRAIN_DEPTH);
    }

    // Két kőkorlát az aréna szélein: előtér-dísz, ami keretet ad a harctérnek anélkül, hogy a
    // középső sávot takarná. Nincs physics bodyjuk.
    for (const x of [90, 710]) {
      this.add
        .image(x, GROUND_TOP, CHURCH_TILE_TEXTURES.BALUSTRADE)
        .setOrigin(0.5, 1)
        .setDepth(DECOR_DEPTH);
    }
  }

  /**
   * A párbeszéd a belépő ELSŐ fele: a Master DORMANT, a player pedig kontroller nélkül áll.
   * VÉGIGJÁTSZÁSONKÉNT EGYSZER fut le (a `markDialogueSeen()` a végén) — egy bukott
   * próbálkozás után a harc egyből a cím-kártyával nyit.
   */
  private startDialogue(): void {
    this.dialogue = new Dialogue(
      this,
      MASTER_DIALOGUE,
      { groundTop: GROUND_TOP, viewportWidth: ARENA_WIDTH },
      () => {
        markDialogueSeen(this.registry, this.scene.key);
        this.startEntrance();
      }
    );

    this.input.keyboard?.on('keydown-RIGHT', () => this.dialogue?.advance());
  }

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

    // A zene a PÁRBESZÉD UTÁN indul, a cím-kártyával EGYÜTT — a Boss2Scene mintája.
    this.audio.playMusic(MUSIC_KEYS.BOSS3_THEME);

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
    this.masterNameText.setVisible(true);
    this.controller = new PlayerController(this, this.player);
    this.master.activate();
  }

  private registerCombatOverlaps(): void {
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.master,
      this.handlePlayerHitMaster,
      undefined,
      this
    );

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      this.fireballs.push(new Fireball(this, x, y, direction));
      this.audio.playSfx(SFX_KEYS.FIREBALL_CAST);
    });

    bindPlayerSfx(this.player, this.audio);

    this.physics.add.overlap(this.fireballs, this.master, this.handleFireballHitMaster, undefined, this);

    // A FALKA. A tömbök a create()-ben üresek, de a Phaser minden physics stepben
    // újraiterálja őket — a menet közben `push`-olt lények tehát azonnal élnek (2. tanulság).
    this.physics.add.collider(this.summons, this.ground);
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.summons,
      this.handlePlayerHitSummon,
      undefined,
      this
    );
    this.physics.add.overlap(this.fireballs, this.summons, this.handleFireballHitSummon, undefined, this);
    this.physics.add.overlap(
      this.summonProjectiles,
      this.player,
      this.handleSummonProjectileHitPlayer,
      undefined,
      this
    );

    for (const projectiles of [this.fireballs, this.summonProjectiles]) {
      this.physics.add.collider(projectiles, this.ground, (projectileObj) => {
        const projectile = projectileObj as Fireball;
        if (projectile.active) projectile.onImpact();
      });
    }
  }

  private registerMasterEvents(): void {
    // A Master csak eventet emittál, a hangot a scene játssza le — a bevett delegálási minta.
    this.master.on('beast-master-attack', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));
    this.master.on('beast-master-charge-windup', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));

    // A falnak rohanás a harc fő punish-ablaka: a dörej + a rázkódás jelzi, hogy MOST kell
    // odamenni. Ugyanaz a hang, mint a Mad King becsapódásánál.
    this.master.on('beast-master-wall-hit', () => {
      this.audio.playSfx(SFX_KEYS.KING_SLAM, { volume: KING_SLAM_VOLUME });
      this.cameras.main.shake(240, 0.011);
    });

    this.master.on('beast-master-death', () =>
      this.audio.playSfx(SFX_KEYS.BEAST_DEATH, {
        volume: BEAST_DEATH_VOLUME,
        detuneRange: DEATH_SFX_DETUNE_RANGE,
      })
    );

    this.master.on('beast-master-summon', (type: SummonType) => {
      this.spawnSummon(type);
      // A hívás hangja: ugyanaz a varázslat-becsapódás, amit a démon idézése is használ.
      this.audio.playSfx(SFX_KEYS.SPELL_IMPACT);
      this.cameras.main.shake(300, 0.008);
    });
  }

  /**
   * Hol jelenjen meg a hívott lény?
   *
   * **A PLAYERHEZ képest, nem a Masterhez** (kézi teszt, 2026-08-31). A boss korábban a saját
   * pozíciójából számolta, és ha a falszélen hívott, a lény a sarokban jelent meg — a player
   * pedig a túloldalon, akár 680 px-re. Az mindkét fajta `DETECTION_RANGE`-én kívül van
   * (crow 220, caster 400), tehát a falka ott sétálgatott, és a hívás tét nélkül maradt.
   *
   * A `SUMMON_SPAWN_DISTANCE` levezetése (a hívott lények konstansaiból) a `BeastMaster`-ben
   * van, mert az nem aréna-tudás; a CLAMPELÉS viszont igen, ezért az itt.
   *
   * A KÖZÉP FELÉ spawnol, tehát a clamp gyakorlatilag sosem harap: a player bármelyik falnál
   * áll, a 180 px befelé mutat.
   */
  private summonSpawnX(): number {
    const towardCenter = this.player.x < ARENA_WIDTH / 2 ? 1 : -1;

    return Phaser.Math.Clamp(
      this.player.x + towardCenter * SUMMON_SPAWN_DISTANCE,
      SUMMON_MARGIN_X,
      ARENA_WIDTH - SUMMON_MARGIN_X
    );
  }

  /**
   * A falka egy tagja. A MEGLÉVŐ enemy-osztályokból jön létre, változtatás nélkül; új
   * lény-osztály nem kellett. A spawn Y a típus talp-offsetjéből származik — ugyanaz a
   * levezetés, mint a pályákon.
   *
   * **MIND A NÉGY határ az EGÉSZ arénát fedi le**, nem a defaultjuk — és mindkettőnek külön
   * oka van:
   *
   *  - **`patrolMinX/MaxX`** (default: `spawn ± PATROL_RANGE`, crow 80 / caster 60): enélkül
   *    egy lény, ami elveszíti a playert (`LOSE_RANGE`), egy 120-160 px-es zsebbe ragadna
   *    vissza — ugyanaz a „csak ott sétálgat" tünet, amit a `summonSpawnX()` a spawn
   *    OLDALÁRÓL old meg.
   *  - **`chaseMinX/MaxX`** (default: korlátlan): ez NEM elhagyható, pedig a
   *    `setCollideWorldBounds` fizikailag amúgy is megállítaná őket. A `Gravecaller` ugyanis
   *    **csak ÁLLÓ helyzetből castol**, és az „állok-e?" döntést az `applySpacing()` a
   *    chase-határból vezeti le, nem a tényleges sebességből. Korlátlan határral a falnak
   *    nyomott caster végig `velocity != 0`-t tartana, tehát SOHA nem sülne el — egy
   *    ártalmatlan bábu lenne. A határral viszont a dokumentált „sarokba szorítva VISZONT
   *    tüzel" ág fut le.
   */
  private spawnSummon(type: SummonType): void {
    const spawnX = this.summonSpawnX();
    const bounds = {
      patrolMinX: SUMMON_MARGIN_X,
      patrolMaxX: ARENA_WIDTH - SUMMON_MARGIN_X,
      chaseMinX: SUMMON_MARGIN_X,
      chaseMaxX: ARENA_WIDTH - SUMMON_MARGIN_X,
    };

    if (type === 'gravecaller') {
      const caster = new Gravecaller(
        this,
        spawnX,
        GROUND_TOP - GRAVECALLER_SPAWN_OFFSET,
        bounds
      );

      caster.on('gravecaller-projectile', (px: number, py: number, direction: number) => {
        this.summonProjectiles.push(
          new Fireball(this, px, py, direction, {
            texture: 'gravecaller-projectile-placeholder',
            damage: GRAVECALLER_PROJECTILE_DAMAGE,
            speed: GRAVECALLER_PROJECTILE_SPEED,
            size: GRAVECALLER_PROJECTILE_SIZE,
          })
        );
        this.audio.playSfx(SFX_KEYS.GRAVECALLER_CAST);
      });
      caster.on('gravecaller-death', () =>
        this.audio.playSfx(SFX_KEYS.GRAVECALLER_DEATH, {
          volume: GRAVECALLER_DEATH_VOLUME,
          detuneRange: DEATH_SFX_DETUNE_RANGE,
        })
      );

      // Collider NEM kell külön: a `summons` tömbre a create()-ben regisztrált collider a
      // menet közben push-olt lényekre is érvényes — a Phaser minden physics stepben
      // újraiterálja a tömböt (CLAUDE.md 2. tanulság).
      this.summons.push(caster);
      return;
    }

    const harvester = new CrowHarvester(this, spawnX, GROUND_TOP - HARVESTER_SPAWN_OFFSET, bounds);
    harvester.on('harvester-attack', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));
    harvester.on('harvester-death', () =>
      this.audio.playSfx(SFX_KEYS.HARVESTER_DEATH, {
        volume: HARVESTER_DEATH_VOLUME,
        detuneRange: DEATH_SFX_DETUNE_RANGE,
      })
    );

    this.summons.push(harvester);
  }

  private createHud(): void {
    this.combatHud = new CombatHud(this);

    this.masterNameText = this.add
      .text(ARENA_WIDTH / 2, HP_BAR_Y - 14, BOSS_NAME, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d8c8d8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.masterHpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  update(_time: number, delta: number): void {
    // A dialógus a scene delta-idejéből ketyeg (nem saját timerből) — így a mag pure marad.
    if (this.dialogue && !this.dialogue.isFinished()) this.dialogue.update(delta);

    this.controller?.update();

    if (this.fightStarted) {
      this.master.update(this.player);
      for (const summon of this.summons) {
        if (!summon.isDead()) summon.update(this.player);
      }
    }

    // A roham sebesség-csíkja. A Master állapota public, ezért nem kell hozzá külön event.
    this.chargeTrail.update(this.master.masterState === BeastMasterState.CHARGE);

    for (const projectiles of [this.fireballs, this.summonProjectiles]) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) projectiles.splice(i, 1);
      }
    }

    this.combatHud.update(this.player);
    this.drawMasterHealthBar();

    if (this.outcomeScheduled) return;

    if (this.master.isDead()) {
      this.scheduleVictory();
    } else if (this.player.isDead()) {
      this.scheduleDefeat();
    }
  }

  /** NINCS fázis-szín: a Masternek nincs fázisa (user-döntés). */
  private drawMasterHealthBar(): void {
    this.masterHpBar.clear();
    if (!this.fightStarted) return;

    const ratio = Math.max(0, this.master.getHP() / this.master.getMaxHP());

    this.masterHpBar.fillStyle(0x000000, 0.6);
    this.masterHpBar.fillRect(HP_BAR_X - 3, HP_BAR_Y - 3, HP_BAR_WIDTH + 6, HP_BAR_HEIGHT + 6);
    this.masterHpBar.fillStyle(0x2a1218, 1);
    this.masterHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this.masterHpBar.fillStyle(0xa02020, 1);
    this.masterHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT);
  }

  private scheduleVictory(): void {
    this.outcomeScheduled = true;
    this.registry.set('beastMasterDefeated', true);
    this.audio.stopMusic();

    // A gazdája nélkül nincs, ami a falkát tartsa — és a záró beat alatt nem sebezhetik
    // halálra a playert (a végső boss lidérceinek azonos döntése).
    for (const summon of this.summons) {
      summon.destroy();
    }
    this.summons.splice(0, this.summons.length);

    this.time.delayedCall(VICTORY_DELAY_MS, () => {
      this.fadeToScene('NarrationScene', {
        lines: MASTER_VICTORY_NARRATION,
        nextScene: this.sceneExists(NEXT_SCENE_KEY) ? NEXT_SCENE_KEY : FALLBACK_SCENE_KEY,
      });
    });
  }

  private sceneExists(key: string): boolean {
    return key in this.scene.manager.keys;
  }

  // Vereség: vissza a Level 3-ra, ahol a player a saját checkpointján (az ajtónál) éled újra.
  private scheduleDefeat(): void {
    this.outcomeScheduled = true;
    this.audio.stopMusic();

    this.time.delayedCall(DEFEAT_DELAY_MS, () => {
      this.fadeToScene(FALLBACK_SCENE_KEY);
    });
  }

  // FADE_OUT_COMPLETE, nem a fadeOut() callbackje (CLAUDE.md 4. tanulság).
  private fadeToScene(key: string, data?: object): void {
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  }

  private handlePlayerHitMaster(
    hitbox: PhysicsOverlapObject,
    masterObj: PhysicsOverlapObject
  ): void {
    const master = masterObj as BeastMaster;
    // A sebezhetőség a `registerHit()` ELŐTT: enélkül a csapás elhasználódna egy DORMANT
    // célponton, amit meg sem sebzett (a végső boss villanásának azonos döntése).
    if (!master.isVulnerable() || this.player.hasHitTarget(master)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    master.takeDamage(damage);
    this.player.registerHit(master);
    this.audio.playSfx(SFX_KEYS.SWORD_IMPACT);
  }

  private handleFireballHitMaster(
    fireballObj: PhysicsOverlapObject,
    masterObj: PhysicsOverlapObject
  ): void {
    const fireball = fireballObj as Fireball;
    const master = masterObj as BeastMaster;
    if (!fireball.active || fireball.hasAlreadyHit() || !master.isVulnerable()) return;

    master.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }

  private handlePlayerHitSummon(
    hitbox: PhysicsOverlapObject,
    summonObj: PhysicsOverlapObject
  ): void {
    const summon = summonObj as Phaser.Physics.Arcade.Sprite & Damageable;
    if (summon.isDead() || this.player.hasHitTarget(summon)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    summon.takeDamage(damage);
    this.player.registerHit(summon);
    this.audio.playSfx(SFX_KEYS.SWORD_IMPACT);
  }

  private handleFireballHitSummon(
    fireballObj: PhysicsOverlapObject,
    summonObj: PhysicsOverlapObject
  ): void {
    const fireball = fireballObj as Fireball;
    const summon = summonObj as Phaser.Physics.Arcade.Sprite & Damageable;
    if (!fireball.active || fireball.hasAlreadyHit() || summon.isDead()) return;

    summon.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }

  private handleSummonProjectileHitPlayer(
    projectileObj: PhysicsOverlapObject,
    playerObj: PhysicsOverlapObject
  ): void {
    const projectile = projectileObj as Fireball;
    const player = playerObj as Player;
    if (!projectile.active || projectile.hasAlreadyHit() || player.isDead()) return;

    player.takeDamage(projectile.getDamage());
    projectile.onImpact();
  }
}
