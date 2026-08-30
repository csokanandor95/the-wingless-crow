import Phaser from 'phaser';
import Player, { LadderContact } from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import CrowHarvester from '../enemies/CrowHarvester';
import Gravecaller, {
  PROJECTILE_DAMAGE as GRAVECALLER_PROJECTILE_DAMAGE,
  PROJECTILE_SIZE as GRAVECALLER_PROJECTILE_SIZE,
  PROJECTILE_SPEED as GRAVECALLER_PROJECTILE_SPEED,
} from '../enemies/Gravecaller';
import CheckpointSystem from '../systems/CheckpointSystem';
import LevelCheckpoint from '../systems/LevelCheckpoint';
import AudioManager, {
  bindPlayerSfx,
  DEATH_SFX_DETUNE_RANGE,
  GRAVECALLER_DEATH_VOLUME,
  HARVESTER_DEATH_VOLUME,
  LEVEL2_MUSIC_FADE_IN_MS,
  LEVEL_MUSIC_VOLUME,
  MUSIC_KEYS,
  SFX_KEYS,
} from '../systems/AudioManager';
import MovingPlatform, { isRiding } from '../platforms/MovingPlatform';
import HazardDamageGate from '../hazards/HazardDamage';
import SpikeField, { SPIKE_DAMAGE, SPIKE_KNOCKBACK_Y } from '../hazards/SpikeField';
import SwingingReaper, { REAPER_DAMAGE } from '../hazards/SwingingReaper';
import ParallaxBackground, { LEVEL2_BACKGROUND_LAYERS } from '../systems/ParallaxBackground';
import { createGroundSegments, createPlatforms } from '../levels/LevelTerrain';
import createDecorProps, { createBackdropBuildings } from '../levels/LevelDecor';
import {
  BACKDROP_BUILDINGS,
  CHECKPOINTS,
  CHECKPOINT_ZONE,
  DECOR_PROPS,
  DOOR,
  DOOR_CHECKPOINT,
  ENEMY_SPAWNS,
  FALL_DEATH_Y,
  FALL_DEPTH,
  GROUND_SEGMENTS,
  LADDERS,
  LEVEL2_GEOMETRY,
  MOVING_PLATFORMS,
  PLATFORMS,
  PLAYER_HALF_HEIGHT,
  REAPERS,
  SPIKE_FIELDS,
  START_X,
  START_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  checkpointRespawnY,
  enemyChaseBounds,
  enemySpawnOffset,
  enemyType,
  platformById,
  platformTop,
  surfaceSpan,
} from '../levels/Level2Layout';
import { LADDER_TILE_WIDTH } from '../levels/LevelTileset';
import type { Damageable, PhysicsOverlapObject } from '../combat/DamageSystem';

/**
 * Level 2 – The Crowless Quarter (korábban „The Crowless Forest", lásd `Level2Layout.ts`).
 *
 * A geometria a `levels/Level2Layout.ts`-ben él (Phaser-mentes adatmodul), a terrain-építés a
 * `levels/LevelTerrain.ts`-ben, a mozgó platform mechanikája a `platforms/MovingPlatform.ts`-ben
 * — magic number nem kerülhet ide vissza.
 *
 * **Szándékosan a `Level1Scene` wiringjének adaptált MÁSOLATA**, nem közös ősosztály (user-döntés):
 * a `Level1Scene`-re nincs scene-szintű unit teszt, egy `BaseLevelScene` kiemelését csak kézi
 * végigjátszás validálná. A duplikáció vállalt adósság; Level 3-nál újranézzük. Ami mechanikus és
 * alacsony kockázatú, az KI VAN emelve (`LevelTerrain`, `LevelCheckpoint`, `LevelGeometry`).
 *
 * ## Amiben ELTÉR a Level 1-től
 *
 *  - **Saját látvány-készlet**: GothicVania Town — kétrétegű parallax
 *    (`LEVEL2_BACKGROUND_LAYERS`), `'gothic-town'` terrain-skin, világ-koordinátás
 *    háttér-épületek. A paletta SZÁNDÉKOSAN világosabb a Level 1-nél (alkonyi városnegyed
 *    az éjszakai romok után), ezért a propok itt tint NÉLKÜL mennek ki.
 *  - **Mozgó platformok** (4 db), a rajtuk álló player kézi szállításával.
 *  - **Két létra** (a Level 1-nek egy van) -> tömb + a fedésben lévő kiválasztása frame-enként.
 *  - **Három köztes checkpoint** (a Level 1-nek egy) -> `LevelCheckpoint` példányok.
 *  - **Nincs tutorial-felirat**: a Level 1 megtanította az irányítást.
 *  - **Saját zenesáv** (`Shadowforge Convergence`), a Level 1-énél HOSSZABB fade-innel —
 *    ide már feloldott audio contexttel érkezünk, lásd `LEVEL2_MUSIC_FADE_IN_MS`.
 *  - **Saját registry-kulcs a checkpointnak**: a Level 1 `'checkpoint'`-ja MÁS koordinátákra
 *    mutat — közös kulcsnál a Level 2-re belépő player a Level 1 respawn-pontját örökölné.
 */

/** A registry-kulcs SZÁNDÉKOSAN különbözik a Level 1 `'checkpoint'`-jától (lásd fent). */
const CHECKPOINT_REGISTRY_KEY = 'level2Checkpoint';

/**
 * A boss-ajtó VÉGSŐ célja. Nem közvetlenül ide megyünk: előbb a `NarrationScene` fut le a
 * `LEVEL2_END_NARRATION`-nel — ugyanaz a szerkezet, mint a Boss 1 győzelme után, csak itt az
 * átvezető a harc ELŐTT áll (a trónterembe érkezés).
 */
const BOSS_SCENE_KEY = 'Boss2Scene';

/**
 * A LEGYŐZÖTT király után az ajtó már nem a trónterembe, hanem a végső arénába visz —
 * pontosan úgy, ahogy a Level 1 ajtaja a `bossDefeated` után a Level 2-re (lásd
 * Level1Scene.activateCheckpointAndTransition). Enélkül a végső bosstól kikapva a playert
 * ide tesszük vissza, és újra végig kellene vernie a Mad Kinget, hogy visszajusson.
 *
 * Az átvezető ilyenkor KIMARAD (a Level 1 azonos döntése): a `LEVEL2_END_NARRATION` a
 * trónterembe ÉRKEZÉSRŐL szól, ami másodjára már nem igaz — és a player úgyis látta.
 */
const FINAL_SCENE_KEY = 'FinalBossScene';

/**
 * Placeholder lore-átvezető a Level 2 és a király arénája között — a végleges szöveget a
 * Phase 9 – Lore írja meg, a csere ennek a tömbnek a szerkesztése. (A BossScene
 * BOSS_VICTORY_NARRATION-jével azonos minta: a narrációs adat annál a scene-nél él, ahonnan
 * az átvezető indul.)
 */
const LEVEL2_END_NARRATION = [
  'A negyed véget ér. A macskaköves út egy kapuban fut ki,\nés a kapu mögött nincs több utca.',
  'A kastély áll. Egyetlen ablakában sem ég fény —\ncsak a tróntermében, ahol soha nem alszik ki.',
  'Odabent valaki beszél. Nem hozzá,\nhanem valakihez, aki már nem válaszol.',
];

const RESPAWN_DELAY_MS = 1200;
/** Az ajtó-átmenet hossza. */
const TRANSITION_FADE_MS = 500;

/**
 * = a `bg-town-sky` legfelső képsorának színe. A parallax réteg amúgy is kitakarja, de így
 * sem egy letterbox, sem a `create()` előtti pillanat nem villant oda nem illő színt —
 * ugyanaz az indok, mint a Level 1 `#673838`-ánál.
 */
const BACKGROUND_COLOR = '#854a62';

/**
 * Mennyivel a cél-felület FÖLÉ nyúlik a mászási zóna. Enélkül a létra tetején álló player
 * kicsúszna a zónából, és nem tudna visszamászni.
 */
const LADDER_ZONE_HEAD_ROOM = 32;

/** Amit a scene EGY enemytől elvár, típustól függetlenül (a `Level1Scene` mintája). */
interface LevelEnemy extends Damageable {
  readonly y: number;
  getMaxHP(): number;
  update(player: Player): void;
}

/** Egy létra fizikai zónája és a hozzá tartozó „sín", amit a player megkap. */
interface LadderInstance {
  zone: Phaser.GameObjects.Zone;
  contact: LadderContact;
}

export default class Level2Scene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private playerHpText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  private background!: ParallaxBackground;
  private ladders: LadderInstance[] = [];
  private movingPlatforms: MovingPlatform[] = [];

  private spikes!: SpikeField;
  private reapers: SwingingReaper[] = [];
  /**
   * KÖZÖS kapu minden környezeti hazardnak. Ez teszi tisztességessé az `E` szakaszt, ahol a
   * kasza PONT a tüskemező fölött söpör: a rossz időzítés ára tüske VAGY kasza, de sosem
   * mindkettő. A `Player` HURT-lockja erre nem elég — az csak 150 ms.
   */
  private hazardGate = new HazardDamageGate();

  private checkpoint!: CheckpointSystem;
  private levelCheckpoints: LevelCheckpoint[] = [];
  private doorZone!: Phaser.GameObjects.Zone;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private doorPromptText!: Phaser.GameObjects.Text;
  private isTransitioning = false;
  private respawnScheduled = false;
  /** Egyszeri kapu: enélkül a HURT-lock alatt frame-enként újraindulna a zuhanás-halál. */
  private fallDeathTriggered = false;

  private fireballs: Fireball[] = [];
  private enemyProjectiles: Fireball[] = [];
  private enemies: CrowHarvester[] = [];
  private gravecallers: Gravecaller[] = [];

  constructor() {
    super('Level2Scene');
  }

  create(): void {
    // A class field initializerek csak a Scene ELSŐ létrehozásakor futnak le; egy
    // scene-restart ugyanazon a példányon hívja újra a create()-et, ezért itt explicit ki
    // kell üríteni őket (CLAUDE.md 3. tanulság).
    this.fireballs = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.gravecallers = [];
    this.ladders = [];
    this.movingPlatforms = [];
    this.reapers = [];
    this.levelCheckpoints = [];
    this.isTransitioning = false;
    this.respawnScheduled = false;
    this.fallDeathTriggered = false;
    // A hazardGate is class field initializer — scene-restartkor nem épül újra, tehát
    // örökölné az előző futás i-frame-jeit (CLAUDE.md 3. tanulság).
    this.hazardGate.reset();

    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.cameras.main.fadeIn(400);

    // A legelső dolog, ami a display listára kerül — a rétegek `setScrollFactor(0)`-val a
    // kamerához vannak rögzítve, a mozgást az `update()` adja a `tilePositionX`-en át.
    this.background = new ParallaxBackground(this, LEVEL2_BACKGROUND_LAYERS);

    // A FIZIKAI világ mélyebb, mint a canvas: a szakadékba lépő player kizuhan a képből, és
    // a FALL_DEATH_Y-t átlépve hal meg. A KAMERA bounds-a a canvas magassága marad, tehát
    // nincs függőleges görgetés — a pálya egy vízszintes sáv.
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT + FALL_DEPTH);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Zene + SFX. Kézi takarítás nincs: az AudioManager maga iratkozik fel a scene
    // shutdownjára — és itt ez PONT a kívánt élettartam (a sáv az ajtón átlépve ér véget).
    this.audio = new AudioManager(this);

    // A Level 1-nél HOSSZABB fade-in, mert ide már feloldott audio contexttel érkezünk (a
    // NarrationScene felől), tehát a zene tényleg ebben a pillanatban indul — lásd a
    // LEVEL2_MUSIC_FADE_IN_MS kommentjét. A hangerő ugyanaz a level-ambient szint, mint a
    // Level 1-en: a keverési sorrend (ambient < boss theme < SFX) így marad érvényes.
    this.audio.playMusic(MUSIC_KEYS.LEVEL2_THEME, {
      volume: LEVEL_MUSIC_VOLUME,
      fadeInMs: LEVEL2_MUSIC_FADE_IN_MS,
    });

    // A háttér-épületek a terrain ELŐTT jönnek létre, hogy a display listán is mögötte
    // legyenek — a `BUILDING_DEPTH` (-15) ezt amúgy is garantálja, de így a sorrend olvasható.
    createBackdropBuildings(this, BACKDROP_BUILDINGS, LEVEL2_GEOMETRY);

    // A `LEVEL2_GEOMETRY` a platformoknak kell: az állvány/konzol változat a pálya TELJES
    // geometriájából származik (van-e alatta talaj, van-e alatta másik lap), nem a lap
    // saját adatából — lásd `platformHasLegs()`.
    const ground = createGroundSegments(this, GROUND_SEGMENTS, 'gothic-town');
    const platforms = createPlatforms(this, PLATFORMS, 'gothic-town', LEVEL2_GEOMETRY);

    createDecorProps(this, DECOR_PROPS, LEVEL2_GEOMETRY);

    // A mozgó lapok UGYANABBA a static groupba kerülnek, mint a fix platformok: így egyetlen
    // collider-regisztráció fedi mindkettőt, és a lövedékek is becsapódnak beléjük.
    for (const def of MOVING_PLATFORMS) {
      this.movingPlatforms.push(new MovingPlatform(def, platforms, this, 'gothic-town'));
    }

    this.spikes = new SpikeField(this, SPIKE_FIELDS);
    for (const def of REAPERS) {
      this.reapers.push(new SwingingReaper(this, def));
    }

    this.createLadders();
    this.createDoor();
    this.createCheckpoints();

    // A checkpoint a registry-ben perzisztál a scene-váltásokon át (pl. Boss2Scene -> vissza).
    const existing = this.registry.get(CHECKPOINT_REGISTRY_KEY) as CheckpointSystem | undefined;
    this.checkpoint = existing ?? new CheckpointSystem(START_X, START_Y);
    if (!existing) this.registry.set(CHECKPOINT_REGISTRY_KEY, this.checkpoint);

    const spawn = this.checkpoint.getRespawnPoint();
    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms);

    this.spawnEnemies();

    // FIGYELEM: ezek a colliderek az enemy-tömbök REFERENCIÁJÁRA kötődnek, és a Phaser minden
    // physics stepben újraiterálja a tartalmukat. Ezért tudja a resetEnemies() helyben
    // (splice + push) kicserélni a lakóikat — és ezért TILOS a tömböket új tömbre cserélni
    // (CLAUDE.md 2. tanulság).
    //
    // A két enemy-fajta ugyanazt a négy regisztrációt kapja: a handlerek csak a Damageable
    // felületet használják, tehát típusfüggetlenek.
    const enemyGroups: Phaser.Physics.Arcade.Sprite[][] = [this.enemies, this.gravecallers];
    for (const group of enemyGroups) {
      this.physics.add.collider(group, ground);
      this.physics.add.collider(group, platforms);
      this.physics.add.overlap(
        this.player.getAttackHitbox(),
        group,
        this.handlePlayerHitEnemy,
        undefined,
        this
      );
      this.physics.add.overlap(this.fireballs, group, this.handleFireballHitEnemy, undefined, this);
    }

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      this.fireballs.push(new Fireball(this, x, y, direction));
      this.audio.playSfx(SFX_KEYS.FIREBALL_CAST);
    });

    // Suhintás + lépés + ugrás + halál, egy helyről (mindhárom scene ugyanezt köti be).
    bindPlayerSfx(this.player, this.audio);

    this.physics.add.overlap(
      this.enemyProjectiles,
      this.player,
      this.handleEnemyProjectileHitPlayer,
      undefined,
      this
    );

    for (const projectiles of [this.fireballs, this.enemyProjectiles]) {
      for (const surface of [ground, platforms]) {
        this.physics.add.collider(projectiles, surface, (projectileObj) => {
          const projectile = projectileObj as Fireball;
          if (projectile.active) projectile.onImpact();
        });
      }
    }

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.controller = new PlayerController(this, this.player);

    this.playerHpText = this.add
      .text(10, 10, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
      .setScrollFactor(0);

    this.interactKey = this.input.keyboard!.addKey('E');
    this.doorPromptText = this.add
      .text(400, 400, this.registry.get('kingDefeated') ? 'E: Tovább — The Broken Gate' : 'E: Belépés', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
  }

  /**
   * A Level 2 az ELSŐ pálya két létrával. A `LadderContact` `topY`/`bottomY`-ja a két
   * felület felszínéből SZÁRMAZIK, nem kézzel írt szám: egy platform elmozdítása így
   * automatikusan átméretezi a létrát.
   */
  private createLadders(): void {
    for (const def of LADDERS) {
      const from = surfaceSpan(def.fromSurfaceId);
      const to = surfaceSpan(def.toSurfaceId);

      const zoneTop = to.top - LADDER_ZONE_HEAD_ROOM;
      const zoneHeight = from.top - zoneTop;
      const zoneCenterY = zoneTop + zoneHeight / 2;

      // A tileSprite a TELJES csempeszélességgel rajzol (különben a minta csonkolódna); a
      // mászási zóna ennél keskenyebb, mert az a RAJZOLT létra szélessége — ugyanaz a
      // szétválasztás, mint a Level 1-en.
      this.add
        .tileSprite(def.x, zoneCenterY, LADDER_TILE_WIDTH, zoneHeight, 'ladder-placeholder')
        .setDepth(-1);

      const zone = this.add.zone(def.x, zoneCenterY, def.width, zoneHeight);
      this.physics.add.existing(zone, true);

      this.ladders.push({
        zone,
        // A topY/bottomY a player KÖZÉPPONTJÁNAK szélsőértékei: fent a lábak pont a cél
        // felszínén állnak meg, lent a kiindulási felületen.
        contact: {
          centerX: def.x,
          topY: to.top - PLAYER_HALF_HEIGHT,
          bottomY: from.top - PLAYER_HALF_HEIGHT,
        },
      });
    }
  }

  private createDoor(): void {
    const ledgeTop = platformTop(platformById('boss-ledge'));

    // A placeholder ajtónak nincs küszöb-köve (szemben a cathedral csempével), tehát
    // `origin (0.5, 1)`-gyel a párkány felszínére állítva pontosan a járható felületen áll.
    this.add.image(DOOR.x, ledgeTop, 'door-placeholder').setOrigin(0.5, 1).setDepth(-1);

    this.doorZone = this.add.zone(DOOR.x, ledgeTop - DOOR.height / 2, DOOR.width, DOOR.height);
    this.physics.add.existing(this.doorZone, true);
  }

  private createCheckpoints(): void {
    for (const def of CHECKPOINTS) {
      this.levelCheckpoints.push(
        new LevelCheckpoint(this, {
          x: def.x,
          surfaceTop: surfaceSpan(def.surfaceId).top,
          zoneWidth: CHECKPOINT_ZONE.width,
          zoneHeight: CHECKPOINT_ZONE.height,
        })
      );
    }
  }

  /**
   * A séta-körzet (`patrolMinX/MaxX`) és az ÜLDÖZÉSI határ két külön dolog: az előbbi az
   * `ENEMY_SPAWNS` adata, az utóbbit az `enemyChaseBounds()` VEZETI LE a felület pereméből és
   * a spike-mezőkből.
   */
  private spawnEnemies(): void {
    for (const def of ENEMY_SPAWNS) {
      const surface = surfaceSpan(def.surfaceId);
      const chase = enemyChaseBounds(def);
      const bounds = {
        patrolMinX: def.patrolMinX,
        patrolMaxX: def.patrolMaxX,
        chaseMinX: chase.min,
        chaseMaxX: chase.max,
      };
      const spawnY = surface.top - enemySpawnOffset(def);

      if (enemyType(def) === 'gravecaller') {
        const caster = new Gravecaller(this, def.x, spawnY, bounds);

        caster.on('gravecaller-projectile', (x: number, y: number, direction: number) => {
          this.enemyProjectiles.push(
            new Fireball(this, x, y, direction, {
              texture: 'gravecaller-projectile-placeholder',
              damage: GRAVECALLER_PROJECTILE_DAMAGE,
              speed: GRAVECALLER_PROJECTILE_SPEED,
              size: GRAVECALLER_PROJECTILE_SIZE,
            })
          );
          this.audio.playSfx(SFX_KEYS.GRAVECALLER_CAST);
        });

        // A haláltusa a `die()`-ból jön, NEM a `destroy()`-ból — így az alábbi
        // resetEnemies() (ami minden respawnnál mind a 14 lényt megsemmisíti) néma marad.
        caster.on('gravecaller-death', () =>
          this.audio.playSfx(SFX_KEYS.GRAVECALLER_DEATH, {
            volume: GRAVECALLER_DEATH_VOLUME,
            detuneRange: DEATH_SFX_DETUNE_RANGE,
          })
        );

        this.gravecallers.push(caster);
        continue;
      }

      const enemy = new CrowHarvester(this, def.x, spawnY, bounds);
      enemy.on('harvester-attack', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));
      enemy.on('harvester-death', () =>
        this.audio.playSfx(SFX_KEYS.HARVESTER_DEATH, {
          volume: HARVESTER_DEATH_VOLUME,
          detuneRange: DEATH_SFX_DETUNE_RANGE,
        })
      );
      this.enemies.push(enemy);
    }
  }

  /** A tömb IDENTITÁSA nem változhat: splice + push, sosem új tömb (CLAUDE.md 2. tanulság). */
  private resetEnemies(): void {
    for (const group of [this.enemies, this.gravecallers]) {
      for (const enemy of group) {
        enemy.destroy();
      }
      group.splice(0, group.length);
    }
    this.spawnEnemies();
  }

  private clearFireballs(): void {
    for (const projectiles of [this.fireballs, this.enemyProjectiles]) {
      for (const projectile of projectiles) {
        projectile.destroy();
      }
      projectiles.splice(0, projectiles.length);
    }
  }

  update(_time: number, delta: number): void {
    this.background.update(this.cameras.main.scrollX);

    this.updateMovingPlatforms(delta);

    // Szinkron overlap-teszt (mint a Level 1-en): azonnal ad eredményt, szemben a
    // physics.add.overlap callbackkel, ami csak a scene update() UTÁN futna le.
    this.player.setLadderContact(this.findLadderContact());

    this.controller.update();

    this.playerHpText.setText(
      `HP: ${this.player.getHP()}/${this.player.getMaxHP()} | ${this.player.playerState}`
    );

    this.updateEnemies(this.enemies);
    this.updateEnemies(this.gravecallers);

    for (const projectiles of [this.fireballs, this.enemyProjectiles]) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) projectiles.splice(i, 1);
      }
    }

    // A kaszák AKKOR IS lengenek, ha a player halott vagy máshol jár: a lengés folyamatos és
    // determinisztikus, tehát a partra érkező player mindig egy futó mintát lát — pont azt
    // kell végignéznie, mielőtt ugrik.
    for (const reaper of this.reapers) {
      reaper.update(delta);
    }

    this.checkSpikeContact();
    this.checkReaperContact();

    this.checkCheckpointContact();
    this.checkDoor();

    // Zuhanás-halál. A flag KELL: a takeDamage() HURT-lockja alatt (150ms) a player még
    // zuhan, tehát flag nélkül minden frame újra sebezne és új delayedCall-t ütemezne.
    if (!this.player.isDead() && !this.fallDeathTriggered && this.player.y > FALL_DEATH_Y) {
      this.fallDeathTriggered = true;
      this.player.takeDamage(this.player.getHP());
    }

    if (this.player.isDead() && !this.respawnScheduled) {
      this.respawnScheduled = true;
      this.time.delayedCall(RESPAWN_DELAY_MS, () => {
        const { x, y } = this.checkpoint.getRespawnPoint();
        this.clearFireballs();
        this.resetEnemies();
        this.player.respawn(x, y);
        this.respawnScheduled = false;
        this.fallDeathTriggered = false;
        // Az új élet ne örökölje az előző halál i-frame-jeit — különben a checkpointról épp
        // a hazardba visszaéledő player egy ablaknyi ideig sebezhetetlen lenne.
        this.hazardGate.reset();
      });
    }
  }

  /**
   * Tüske-érintkezés. Szinkron `physics.overlap()`, mint a létránál és az ajtónál — nem
   * `physics.add.overlap` callback, ami csak a scene `update()`-je UTÁN futna le.
   *
   * A HP-t a `hazardGate` i-frame ablaka védi, NEM a visszalökés. A visszalökés CSAK
   * függőleges: a vízszintes összetevő annyival nyújtaná meg a mezőn töltött időt, hogy az
   * ablak lejárna, és a player egyetlen hibáért kétszer sebződne (lásd `SpikeField`).
   */
  private checkSpikeContact(): void {
    if (this.player.isDead()) return;
    if (!this.hazardGate.canDamage(this.time.now)) return;

    for (const zone of this.spikes.getZones()) {
      if (!this.physics.overlap(this.player, zone)) continue;

      this.hazardGate.register(this.time.now);
      this.player.takeDamage(SPIKE_DAMAGE);
      this.player.setVelocityY(SPIKE_KNOCKBACK_Y);
      return;
    }
  }

  /**
   * Kasza-érintkezés. UGYANAZON a megosztott `hazardGate`-en megy át, mint a tüskék — ez
   * teszi tisztességessé az `E` szakaszt, ahol a penge PONT a tüskemező fölött söpör.
   *
   * **Visszalökés SZÁNDÉKOSAN nincs.** Az `F` két pengéje egy 960 px-es szakadék fölött
   * söpör: egy oldalirányú lökés a szakadékba taszítaná a playert, tehát a találat halált
   * okozna, amire nem lehet reagálni. A visszajelzés a `Player` piros villanása és a hurt
   * animációja.
   */
  private checkReaperContact(): void {
    if (this.player.isDead()) return;
    if (!this.hazardGate.canDamage(this.time.now)) return;

    for (const reaper of this.reapers) {
      if (!reaper.hitsPlayer(this.player.x, this.player.y)) continue;

      this.hazardGate.register(this.time.now);
      this.player.takeDamage(REAPER_DAMAGE);
      return;
    }
  }

  /**
   * A mozgó platformok léptetése + a rajtuk álló player szállítása.
   *
   * **A „rajta áll-e?" döntés a MOZGÁS ELŐTTI állapotból származik**: a player `body`-ja az
   * előző physics stepből való, tehát a lap RÉGI felületéhez képest van a helyén. A lap
   * elmozdítása után döntve egy gyorsabb platform egy frame-re elveszítené az utasát.
   */
  private updateMovingPlatforms(delta: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const rider = { bottom: body.bottom, left: body.left, right: body.right };
    const alive = !this.player.isDead();

    for (const platform of this.movingPlatforms) {
      const wasRiding = alive && isRiding(rider, platform.getSpan());
      platform.update(delta);
      if (wasRiding) platform.carry(this.player);
    }
  }

  /** Melyik létrával van fedésben a player? (Kettő sosem fed át, de az első találat nyer.) */
  private findLadderContact(): LadderContact | null {
    if (this.player.isDead()) return null;

    for (const ladder of this.ladders) {
      if (this.physics.overlap(this.player, ladder.zone)) return ladder.contact;
    }

    return null;
  }

  private updateEnemies(enemies: LevelEnemy[]): void {
    for (const enemy of enemies) {
      // Biztosíték: a patrol-határok ezt elvileg kizárják, de egy szakadékba került enemy
      // enélkül némán "patrolozna" a világ alján, a képernyőn kívül.
      if (!enemy.isDead() && enemy.y > FALL_DEATH_Y) {
        enemy.takeDamage(enemy.getMaxHP());
        continue;
      }
      enemy.update(this.player);
    }
  }

  /** A köztes checkpointok ÉRINTÉSRE aktiválódnak — nem versenyeznek az ajtó promptjával. */
  private checkCheckpointContact(): void {
    if (this.player.isDead()) return;

    for (const [index, checkpoint] of this.levelCheckpoints.entries()) {
      if (checkpoint.isActivated()) continue;
      if (!this.physics.overlap(this.player, checkpoint.getZone())) continue;

      checkpoint.activate();
      const def = CHECKPOINTS[index];
      this.checkpoint.activate(def.x, checkpointRespawnY(def));
      return;
    }
  }

  private checkDoor(): void {
    const nearDoor = !this.player.isDead() && this.physics.overlap(this.player, this.doorZone);
    this.doorPromptText.setVisible(nearDoor && !this.isTransitioning);

    if (!nearDoor || this.isTransitioning) return;
    if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return;

    this.checkpoint.activate(DOOR_CHECKPOINT.x, DOOR_CHECKPOINT.y);

    this.isTransitioning = true;
    this.doorPromptText.setText('Checkpoint mentve...').setVisible(true);

    // A zene a KÉPPEL EGYÜTT halkul el, ugyanabból a konstansból, amiből a kamera-fade. A
    // scene shutdownja önmagában is elvágná (az AudioManager hookja), de fade nélkül —
    // pont a fekete képernyő pillanatában pattanna le.
    // (A Level1Scene.activateCheckpointAndTransition() mintája.)
    this.audio.stopMusic(TRANSITION_FADE_MS);

    // FADE_OUT_COMPLETE, nem a fadeOut() callbackje: utóbbi a fade MINDEN frame-jén lefutna,
    // tehát frame-enként újraindítaná a cél scene-t (CLAUDE.md 4. tanulság).
    // A trónterembe NEM közvetlenül lépünk be: előbb a szöveges átvezető fut le, és az
    // indítja a boss arénát (a NarrationScene adatvezérelt, lásd NarrationData).
    const kingDefeated = Boolean(this.registry.get('kingDefeated'));

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (kingDefeated) {
        this.scene.start(FINAL_SCENE_KEY);
        return;
      }

      this.scene.start('NarrationScene', {
        lines: LEVEL2_END_NARRATION,
        nextScene: BOSS_SCENE_KEY,
      });
    });
    this.cameras.main.fadeOut(TRANSITION_FADE_MS, 0, 0, 0);
  }

  private handlePlayerHitEnemy(
    hitbox: PhysicsOverlapObject,
    enemyObj: PhysicsOverlapObject
  ): void {
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite & Damageable;
    if (enemy.isDead() || this.player.hasHitTarget(enemy)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    enemy.takeDamage(damage);
    this.player.registerHit(enemy);
    this.audio.playSfx(SFX_KEYS.SWORD_IMPACT);
  }

  private handleFireballHitEnemy(
    fireballObj: PhysicsOverlapObject,
    enemyObj: PhysicsOverlapObject
  ): void {
    const fireball = fireballObj as Fireball;
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite & Damageable;
    if (!fireball.active || fireball.hasAlreadyHit() || enemy.isDead()) return;

    enemy.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }

  private handleEnemyProjectileHitPlayer(
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
