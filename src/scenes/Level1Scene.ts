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
import ParallaxBackground, {
  LEVEL1_BACKGROUND_LAYERS,
} from '../systems/ParallaxBackground';
import AudioManager, {
  bindPlayerSfx,
  GRAVECALLER_DEATH_VOLUME,
  HARVESTER_DEATH_VOLUME,
  DEATH_SFX_DETUNE_RANGE,
  LEVEL_MUSIC_FADE_IN_MS,
  LEVEL_MUSIC_VOLUME,
  MUSIC_KEYS,
  SFX_KEYS,
} from '../systems/AudioManager';
import TutorialHint from '../ui/TutorialHint';
import HazardDamageGate from '../hazards/HazardDamage';
import SpikeField, { SPIKE_DAMAGE, SPIKE_KNOCKBACK_Y } from '../hazards/SpikeField';
import SwingingReaper, { REAPER_DAMAGE } from '../hazards/SwingingReaper';
import createDecorProps from '../levels/LevelDecor';
import { createGroundSegments, createPlatforms } from '../levels/LevelTerrain';
import {
  DECOR_PROPS,
  DOOR,
  DOOR_CHECKPOINT,
  ENEMY_SPAWNS,
  enemyChaseBounds,
  enemySpawnOffset,
  enemyType,
  FALL_DEATH_Y,
  FALL_DEPTH,
  GROUND_SEGMENTS,
  GROUND_TOP,
  LADDER,
  LEVEL1_GEOMETRY,
  MID_CHECKPOINT,
  PLATFORMS,
  PLAYER_HALF_HEIGHT,
  REAPERS,
  SPIKE_FIELDS,
  START_X,
  START_Y,
  surfaceSpan,
  TUTORIAL_HINTS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  platformById,
  platformTop,
} from '../levels/Level1Layout';
import {
  DOOR_APERTURE,
  DOOR_DEPTH,
  DOOR_INTERIOR_DEPTH,
  DOOR_THRESHOLD_PX,
  LADDER_TILE_WIDTH,
  TILE_TEXTURES,
} from '../levels/LevelTileset';
import type { Damageable, PhysicsOverlapObject } from '../combat/DamageSystem';

/**
 * Amit a scene EGY enemytől elvár, típustól függetlenül. A CrowHarvester és a Gravecaller
 * strukturálisan kielégíti — nincs közös ősük, és nem is kell: a scene-nek pontosan ennyi
 * kell, és ennyivel a következő enemy típus is ingyen beköthető.
 */
interface LevelEnemy extends Damageable {
  readonly y: number;
  getMaxHP(): number;
  update(player: Player): void;
}

const RESPAWN_DELAY_MS = 1200; // rövid szünet a halál-animáció után, mielőtt visszatér a checkpointra
/** Az ajtó-átmenet hossza. A kamera-fade ÉS a zene kifadelése is ebből dolgozik. */
const TRANSITION_FADE_MS = 500;

/** A köztes checkpoint jelölőjének színe aktiválás előtt / után. */
const CHECKPOINT_TINT_IDLE = 0x4a4452;
const CHECKPOINT_TINT_ACTIVE = 0xffd88a;
const CHECKPOINT_FLASH_HOLD_MS = 1200;

export default class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private playerHpText!: Phaser.GameObjects.Text;
  private background!: ParallaxBackground;
  private audio!: AudioManager;
  private tutorialHint!: TutorialHint;

  private ladderZone!: Phaser.GameObjects.Zone;
  private ladderContact!: LadderContact;

  private checkpoint!: CheckpointSystem;
  private doorZone!: Phaser.GameObjects.Zone;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private checkpointPromptText!: Phaser.GameObjects.Text;
  private isTransitioning = false;
  private respawnScheduled = false;
  /** Egyszeri kapu: enélkül a HURT-lock alatt frame-enként újraindulna a zuhanás-halál. */
  private fallDeathTriggered = false;

  private spikes!: SpikeField;
  private reapers: SwingingReaper[] = [];
  /**
   * KÖZÖS kapu minden környezeti hazardnak (tüskék most, Swinging Reaper a következő
   * iterációban): egy tüskébe esve ne lehessen ugyanabban a pillanatban a kaszától is
   * sebződni. A `Player` HURT-lockja erre nem elég — az csak 150 ms.
   */
  private hazardGate = new HazardDamageGate();

  private midCheckpointZone!: Phaser.GameObjects.Zone;
  private midCheckpointMarker!: Phaser.GameObjects.Image;
  private midCheckpointText!: Phaser.GameObjects.Text;
  private midCheckpointActivated = false;

  private fireballs: Fireball[] = [];
  /** A Gravecallerek lövedékei — külön tömb, mert a PLAYERT sebzik (mint a bossProjectiles). */
  private enemyProjectiles: Fireball[] = [];
  private enemies: CrowHarvester[] = [];
  private gravecallers: Gravecaller[] = [];

  constructor() {
    super('Level1Scene');
  }

  create(): void {
    // A fireballs/enemies mezők class field initializerek — csak a Scene ELSŐ
    // létrehozásakor futnak le. Egy scene-restart (pl. BossScene "R"-je) újra meghívja
    // a create()-et ugyanazon a Scene példányon, ezért itt explicit ki kell üríteni
    // őket — különben a régi, már megsemmisített (destroyed body-jú) CrowHarvester/Fireball
    // objektumok bennmaradnának, és az update() rajtuk hívott setVelocityX stb. elszállna.
    this.fireballs = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.gravecallers = [];
    this.reapers = [];
    this.isTransitioning = false;
    this.respawnScheduled = false;
    this.fallDeathTriggered = false;
    this.midCheckpointActivated = false;
    // A hazardGate class field initializer — az is csak a Scene ELSŐ létrehozásakor fut le
    // (lásd fent), ezért egy scene-restart után örökölné az előző futás i-frame-jeit.
    this.hazardGate.reset();

    // Az ég legfelső sorának színe: a parallax háttér ezt amúgy is teljesen kitakarja,
    // de így egy esetleges letterbox / a create() előtti pillanat sem villant feketét.
    // A main.ts game-szintű backgroundColor-ja (#0a0a0f) változatlan — arra a BossScene épül.
    this.cameras.main.setBackgroundColor('#673838');

    // A FIZIKAI világ mélyebb, mint a canvas: a szakadékba lépő player kizuhan a képből,
    // és a FALL_DEATH_Y-t átlépve hal meg. A KAMERA bounds-a viszont pontosan a canvas
    // magassága marad, tehát nincs függőleges görgetés — a pálya továbbra is egy vízszintes sáv.
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT + FALL_DEPTH);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // A háttér mindent megelőz: a rétegei -30..-20 depth-en ülnek, tehát a scene minden
    // további eleme (létra hátfal -2, létra/ajtó -1, a többi 0) előttük rajzolódik.
    this.background = new ParallaxBackground(this, LEVEL1_BACKGROUND_LAYERS);

    // Zene + SFX. Kézi takarítás nem kell: az AudioManager maga iratkozik fel a scene
    // shutdownjára — és itt ez PONT a kívánt élettartam, mert a zenének az ajtón átlépve
    // (a scene leállásakor) kell véget érnie.
    this.audio = new AudioManager(this);

    // FIGYELEM — a zene NEM itt kezd szólni, hanem az első billentyűlenyomásnál.
    // A Level1Scene közvetlenül az oldalbetöltés után indul, bármilyen user-interakció
    // előtt, tehát az audio context GARANTÁLTAN zárolt: a playMusic() ilyenkor az
    // UNLOCKED eseményre halasztja a lejátszást (böngésző autoplay-policy, nem kerülhető
    // meg). Ez a korábban élhelyzetnek szánt ág itt a FŐ út — nem hiba, ha a betöltés
    // után csend van. Emiatt kap hosszabb (2000ms) fade-int is, hogy ne robbanjon be
    // hirtelen az első leütésre.
    this.audio.playMusic(MUSIC_KEYS.LEVEL1_THEME, {
      volume: LEVEL_MUSIC_VOLUME,
      fadeInMs: LEVEL_MUSIC_FADE_IN_MS,
    });

    this.createDecor();

    // A skin-váltó a `LevelTerrain`-ben van, hogy a két pálya ugyanazt a kódot hívhassa a
    // saját csempekészletével (`'cathedral'` itt, `'gothic-town'` a Level 2-n).
    const ground = createGroundSegments(this, GROUND_SEGMENTS, 'cathedral');
    const platforms = createPlatforms(this, PLATFORMS, 'cathedral');
    this.spikes = new SpikeField(this, SPIKE_FIELDS);
    for (const def of REAPERS) {
      this.reapers.push(new SwingingReaper(this, def));
    }
    this.createLadder();
    this.createDoorZone();
    this.createMidCheckpoint();

    // A checkpoint a registry-ben perzisztál a scene-váltásokon át (pl. BossScene ->
    // vissza Level1Scene-be) — enélkül minden create() nulláról hozná létre, és egy
    // már aktivált checkpoint elveszne, mihelyt visszatérünk a pályára.
    const existingCheckpoint = this.registry.get('checkpoint') as CheckpointSystem | undefined;
    this.checkpoint = existingCheckpoint ?? new CheckpointSystem(START_X, START_Y);
    if (!existingCheckpoint) this.registry.set('checkpoint', this.checkpoint);

    // A player MINDIG a checkpointról indul, nem a pálya elejéről: a boss-arénában
    // elhalálozva ide térünk vissza, és ilyenkor a már aktivált checkpoint (az ajtó)
    // a helyes belépőpont. Friss játékban a CheckpointSystem default-ja a pálya eleje,
    // így az első indítás viselkedése változatlan.
    const spawn = this.checkpoint.getRespawnPoint();
    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms);

    this.spawnEnemies();
    // FIGYELEM: ezek a colliderek az enemy-tömbök REFERENCIÁJÁRA kötődnek, és a Phaser
    // minden physics stepben újraiterálja a tartalmukat. Ezért tudja a resetEnemies() helyben
    // (splice + push) kicserélni a lakóikat anélkül, hogy újra kellene regisztrálni bármit —
    // és ezért TILOS a tömböket új tömbre cserélni (lásd CLAUDE.md 2. tanulság).
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
      this.physics.add.overlap(
        this.fireballs,
        group,
        this.handleFireballHitEnemy,
        undefined,
        this
      );
    }

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      const fireball = new Fireball(this, x, y, direction);
      this.fireballs.push(fireball);
      this.audio.playSfx(SFX_KEYS.FIREBALL_CAST);
    });

    // Suhintás + lépés + ugrás + halál, egy helyről (mindhárom scene ugyanezt köti be).
    bindPlayerSfx(this.player, this.audio);

    // Az enemy-lövedékek a PLAYERT sebzik — ugyanaz a minta, mint a BossScene
    // bossProjectiles × player overlapje.
    this.physics.add.overlap(
      this.enemyProjectiles,
      this.player,
      this.handleEnemyProjectileHitPlayer,
      undefined,
      this
    );

    // Mindkét lövedék-fajta becsapódik a terepbe.
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
    const doorPrompt = this.registry.get('bossDefeated')
      ? 'E: Tovább — The Crowless Quarter'
      : 'E: Checkpoint';
    this.checkpointPromptText = this.add
      .text(400, 400, doorPrompt, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    // A billentyű-súgók CSAK friss játékban jelennek meg. Boss-vereség után a player az
    // ajtó-checkpointon éled újra (x ~5918), ahol mindkét trigger azonnal átlépettnek
    // számítana — értelmetlen lenne ott a mozgás-tutorialt felvillantani.
    const atLevelStart = spawn.x === START_X && spawn.y === START_Y;
    this.tutorialHint = new TutorialHint(this, atLevelStart ? TUTORIAL_HINTS : []);
  }

  private createLadder(): void {
    const upper = platformById('H1');
    const zoneHeight = GROUND_TOP - LADDER.zoneTop;
    const zoneCenterY = LADDER.zoneTop + zoneHeight / 2;

    // Hátfal NINCS (a korábbi `pillar-placeholder` oszlop törölve): a létra egyszerűen a
    // felső platformnak van támasztva, mögötte a parallax háttér látszik át a fokok között.
    //
    // A tileSprite a TELJES csempeszélességgel (32) rajzol, nem a `LADDER.width`-tel (28) —
    // különben a minta csonkolódna. A 28 a RAJZOLT létra szélessége, és az marad a mászási
    // zóna mérete, tehát a mászás viselkedése változatlan (lásd LevelTileset).
    this.add
      .tileSprite(LADDER.x, zoneCenterY, LADDER_TILE_WIDTH, zoneHeight, TILE_TEXTURES.LADDER)
      .setDepth(-1);

    this.ladderZone = this.add.zone(LADDER.x, zoneCenterY, LADDER.width, zoneHeight);
    this.physics.add.existing(this.ladderZone, true);

    // A topY/bottomY a player középpontjának szélsőértékei: fent a lábak pont a felső
    // platform felszínén állnak meg, lent a talajon.
    this.ladderContact = {
      centerX: LADDER.x,
      topY: platformTop(upper) - PLAYER_HALF_HEIGHT,
      bottomY: GROUND_TOP - PLAYER_HALF_HEIGHT,
    };
  }

  private createDecor(): void {
    // A korábbi 5 parallax háttéroszlop (pillar-placeholder, scrollFactor 0.6) törölve:
    // a mélység-illúziót most a ParallaxBackground három valódi rétege adja.

    // Hangulati propok: nem ütköznek, és a DECOR_DEPTH miatt a player/enemyk előttük mennek el.
    createDecorProps(this, DECOR_PROPS, LEVEL1_GEOMETRY);

    // Pálya végi ajtó a felső platform jobb végén — a checkpoint + boss-transition trigger.
    //
    // `origin (0.5, 1)` + `DOOR_THRESHOLD_PX`: a csempén a boltív padlója 19px-szel a kép
    // alja FÖLÖTT van, tehát a képet ennyivel a platform felszíne alá süllyesztve kerül az
    // ív padlója pontosan a járható felületre. A küszöb-kő ilyenkor a platform alá lóg,
    // ezért megy az ajtó a terrainnél HÁTRÉBB (DOOR_DEPTH < TERRAIN_DEPTH) — így a platform
    // takarja ki.
    const upper = platformById('H1');
    const doorBottomY = platformTop(upper) + DOOR_THRESHOLD_PX;

    // A boltív nyílása ÁTLÁTSZÓ a csempén, tehát enélkül a parallax égbolt látszana át rajta.
    // A folyosó-placeholder pontosan az alpha-lyukat fedi be (DOOR_APERTURE), a csempe
    // bal-felső sarkához képest pozicionálva — az ajtó MÖGÖTT (DOOR_INTERIOR_DEPTH), így a
    // boltív kőkerete és a rajzolt belső padló előtte marad.
    this.add
      .image(
        DOOR.x - DOOR.width / 2 + DOOR_APERTURE.left,
        doorBottomY - DOOR.height + DOOR_APERTURE.top,
        'door-interior-placeholder'
      )
      .setOrigin(0, 0)
      .setDepth(DOOR_INTERIOR_DEPTH);

    this.add
      .image(DOOR.x, doorBottomY, TILE_TEXTURES.DOOR_GATE)
      .setOrigin(0.5, 1)
      .setDepth(DOOR_DEPTH);
  }

  /**
   * A trigger a boltív NYÍLÁSÁT fedi le, nem a teljes csempét: a nyílás alja a platform
   * felszíne, a teteje `openingHeight`-tel feljebb. Így az `E` prompt pontosan akkor jelenik
   * meg, amikor a player láthatóan az ajtóban áll.
   */
  private createDoorZone(): void {
    const upper = platformById('H1');
    const zoneY = platformTop(upper) - DOOR.openingHeight / 2;

    this.doorZone = this.add.zone(DOOR.x, zoneY, DOOR.width, DOOR.openingHeight);
    this.physics.add.existing(this.doorZone, true);
  }

  /**
   * Köztes checkpoint a spike-szakasz után. Az ajtóval ellentétben ÉRINTÉSRE aktiválódik,
   * nem E-billentyűre: így nem versenyez az ajtó promptjával, és nem kell új input.
   */
  private createMidCheckpoint(): void {
    const markerHeight = 64;

    this.midCheckpointMarker = this.add
      .image(MID_CHECKPOINT.x, GROUND_TOP - markerHeight / 2, 'checkpoint-placeholder')
      .setTint(CHECKPOINT_TINT_IDLE)
      .setDepth(-1);

    this.midCheckpointZone = this.add.zone(
      MID_CHECKPOINT.x,
      GROUND_TOP - MID_CHECKPOINT.zoneHeight / 2,
      MID_CHECKPOINT.zoneWidth,
      MID_CHECKPOINT.zoneHeight
    );
    this.physics.add.existing(this.midCheckpointZone, true);

    this.midCheckpointText = this.add
      .text(MID_CHECKPOINT.x, GROUND_TOP - markerHeight - 16, 'Checkpoint', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd88a',
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private activateMidCheckpoint(): void {
    this.midCheckpointActivated = true;
    this.checkpoint.activate(MID_CHECKPOINT.x, MID_CHECKPOINT.y);
    this.midCheckpointMarker.setTint(CHECKPOINT_TINT_ACTIVE);

    // hold + yoyo: felvillan, áll, majd ugyanazzal a tweennel elhalványul.
    this.tweens.add({
      targets: this.midCheckpointText,
      alpha: 1,
      duration: 200,
      hold: CHECKPOINT_FLASH_HOLD_MS,
      yoyo: true,
    });
  }

  /**
   * A séta-körzet (`patrolMinX/MaxX`) és az ÜLDÖZÉSI határ két külön dolog: az előbbi az
   * `ENEMY_SPAWNS` adata, az utóbbit az `enemyChaseBounds()` VEZETI LE a felület pereméből
   * és a spike-mezőkből. Így a földi enemy a szakadék szélééig követi a playert (nem ütközik
   * láthatatlan falba a pálya közepén), de nem esik le és nem lép a tüskékre.
   */
  private spawnEnemies(): void {
    for (const def of ENEMY_SPAWNS) {
      const surface = surfaceSpan(def.surfaceId);
      const chase = enemyChaseBounds(def);
      // A séta- és üldözési határok mindkét lénynél ugyanaz az objektum-alak
      // (GravecallerConfig ≡ CrowHarvesterConfig), csak a spawn Y talp-offsetje típusfüggő.
      const bounds = {
        patrolMinX: def.patrolMinX,
        patrolMaxX: def.patrolMaxX,
        chaseMinX: chase.min,
        chaseMaxX: chase.max,
      };
      const spawnY = surface.top - enemySpawnOffset(def);

      if (enemyType(def) === 'gravecaller') {
        const caster = new Gravecaller(this, def.x, spawnY, bounds);

        // A lövedéket a scene hozza létre (mint a player 'fireball-cast'-jánál és a boss
        // 'boss-projectile'-jánál) — a Gravecaller csak a helyet és az irányt emittálja.
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
        // resetEnemies() (ami minden respawnnál mindet megsemmisíti) néma marad.
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

      // Csapás-hang. Távolság-alapú némítás NEM kell: a CrowHarvester csak ATTACK_RANGE-en
      // (42px) belül támad, tehát egy csapkodó lény definíció szerint a player mellett áll,
      // és mindig a képernyőn van.
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

  /**
   * A player halálakor az enemyk is újraélednek (a level1-layout spec szerint) — így egy
   * szakaszt nem lehet ismételt halálokkal "lekoptatni".
   *
   * A tömb IDENTITÁSA nem változhat: a create()-ben regisztrált colliderek/overlapek erre a
   * referenciára kötődnek (CLAUDE.md 2. tanulság), ezért splice + push, sosem új tömb.
   */
  private resetEnemies(): void {
    for (const group of [this.enemies, this.gravecallers]) {
      for (const enemy of group) {
        enemy.destroy();
      }
      group.splice(0, group.length);
    }
    this.spawnEnemies();
  }

  /** Ugyanaz a helyben-csere, mint a resetEnemies()-nél: a lövedék-colliderek is a tömbre kötnek. */
  private clearFireballs(): void {
    for (const projectiles of [this.fireballs, this.enemyProjectiles]) {
      for (const projectile of projectiles) {
        projectile.destroy();
      }
      projectiles.splice(0, projectiles.length);
    }
  }

  update(_time: number, delta: number): void {
    // A kamera scrollX-e a scene update() UTÁN frissül, tehát a háttér 1 frame-et késik.
    // 0.1-0.5-ös parallax faktornál ez legfeljebb ~1.5px — nem észlelhető, ezért nem
    // kell külön PRE_RENDER hook.
    this.background.update(this.cameras.main.scrollX);

    // Szinkron overlap-teszt: azonnal ad eredményt, szemben a physics.add.overlap
    // callbackkel, ami csak a scene update() UTÁN futna le (1 frame késés a mászásban).
    const touchingLadder =
      !this.player.isDead() && this.physics.overlap(this.player, this.ladderZone);
    this.player.setLadderContact(touchingLadder ? this.ladderContact : null);

    this.controller.update();
    this.tutorialHint.update(this.player.x);

    // Debug kijelzés (Phase 8 / ui modul cseréli le): HP + aktuális player state.
    this.playerHpText.setText(
      `HP: ${this.player.getHP()}/${this.player.getMaxHP()} | ${this.player.playerState}`
    );

    this.updateEnemies(this.enemies);
    this.updateEnemies(this.gravecallers);

    // Az inaktív lövedékek kitakarítása MINDIG helyben, splice()-szal: a tömbök referenciája
    // be van kötve a physics.add.overlap-ba (CLAUDE.md 2. tanulság).
    for (const projectiles of [this.fireballs, this.enemyProjectiles]) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) {
          projectiles.splice(i, 1);
        }
      }
    }

    // A kaszák AKKOR IS lengenek, ha a player halott vagy máshol jár: a lengés folyamatos
    // és determinisztikus, tehát a partra érkező player mindig egy futó mintát lát —
    // ezt kell végignéznie, mielőtt ugrik.
    for (const reaper of this.reapers) {
      reaper.update(delta);
    }

    this.checkSpikeContact();
    this.checkReaperContact();

    if (
      !this.midCheckpointActivated &&
      !this.player.isDead() &&
      this.physics.overlap(this.player, this.midCheckpointZone)
    ) {
      this.activateMidCheckpoint();
    }

    const nearDoor = !this.player.isDead() && this.physics.overlap(this.player, this.doorZone);
    this.checkpointPromptText.setVisible(nearDoor && !this.isTransitioning);

    if (nearDoor && !this.isTransitioning && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.activateCheckpointAndTransition();
    }

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
        // Az új élet ne örökölje az előző halál i-frame-jeit — különben a checkpointról
        // épp a tüskékbe visszaéledő player egy ablaknyi ideig sebezhetetlen lenne.
        this.hazardGate.reset();
      });
    }
  }

  /**
   * Egy enemy-csoport frissítése. Típusfüggetlen: a `LevelEnemy` felület pontosan annyit
   * kér, amennyit a scene használ, tehát a következő enemy típus ingyen beköthető.
   */
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

  /**
   * Tüske-érintkezés. Szinkron `physics.overlap()`, mint a létránál és az ajtónál — nem
   * `physics.add.overlap` callback, ami csak a scene update()-je UTÁN futna le.
   *
   * A HP-t a `hazardGate` i-frame ablaka védi, NEM a visszalökés: a `Player` HURT-lockja
   * csak 150 ms, és a velocityhez sem nyúl, tehát a lendület megmarad. A 900 ms-os ablak
   * mellett egy nekifutásból való átkelés (128 px / 200 px/s = 640 ms) PONTOSAN egy
   * találatot ér — a D szakasz tutorial, nem büntetés. Aki viszont MEGÁLL a tüskéken,
   * ablakonként újra sebződik: az már az ő döntése.
   */
  private checkSpikeContact(): void {
    if (this.player.isDead()) return;
    if (!this.hazardGate.canDamage(this.time.now)) return;

    for (const zone of this.spikes.getZones()) {
      if (!this.physics.overlap(this.player, zone)) continue;

      this.hazardGate.register(this.time.now);
      this.player.takeDamage(SPIKE_DAMAGE);

      // CSAK függőleges pop, a takeDamage() UTÁN (az HURT state-re vált, de a velocityhez
      // nem nyúl). Vízszintesen SZÁNDÉKOSAN nem lökünk: a hátrafelé tolás annyival nyújtaná
      // meg a mezőn töltött időt, hogy az i-frame ablak lejárna, és a player egyetlen hibáért
      // kétszer sebződne — lásd a SPIKE_KNOCKBACK_Y kommentjét.
      this.player.setVelocityY(SPIKE_KNOCKBACK_Y);
      return;
    }
  }

  /**
   * Kasza-érintkezés. UGYANAZON a megosztott `hazardGate`-en megy át, mint a tüskék: egy
   * kaszatalálat után a tüskék sem sebezhetnek azonnal, és fordítva.
   *
   * **Visszalökés SZÁNDÉKOSAN nincs.** A penge az `F1` platform fölött söpör, ami egy 400px-es
   * szakadékot hidal át — egy oldalirányú lökés a szakadékba taszítaná a playert, tehát a
   * találat halált okozna, amire nem lehet reagálni. Ez ugyanaz a hiba, amit a tüskéknél a
   * vízszintes lökés okozott (lásd SpikeField). A visszajelzés a `Player` piros villanása és
   * a hurt animációja — ez egyébként konzisztens is: a projektben egyetlen ENEMY-találat sem
   * lök vissza, a tüske függőleges popja a kivétel (ott a hazardból KIEMELÉS a cél).
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

  private activateCheckpointAndTransition(): void {
    this.isTransitioning = true;
    this.checkpoint.activate(DOOR_CHECKPOINT.x, DOOR_CHECKPOINT.y);
    this.checkpointPromptText.setText('Checkpoint mentve...').setVisible(true);

    // A zene a KÉPPEL EGYÜTT halkul el. A scene shutdownja önmagában is elvágná (az
    // AudioManager shutdown-hookja), de fade nélkül, hirtelen — pont a fekete képernyő
    // pillanatában pattanna le. A stopMusicImmediately() idempotens, tehát a két út
    // egymás után is biztonságos.
    this.audio.stopMusic(TRANSITION_FADE_MS);

    // A legyőzött boss után az ajtó már nem az arénába, hanem a következő pályára visz —
    // különben a Level1-re visszatérve újra a (már teljesített) boss fight indulna.
    const nextScene = this.registry.get('bossDefeated') ? 'Level2Scene' : 'BossScene';

    // FADE_OUT_COMPLETE, nem a fadeOut() callbackje: utóbbi a fade MINDEN frame-jén
    // lefutna (camera, progress paraméterekkel), tehát frame-enként újraindítaná a scene-t.
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(nextScene);
    });
    this.cameras.main.fadeOut(TRANSITION_FADE_MS, 0, 0, 0);
  }

  // A két handler MINDKÉT enemy-fajtát kiszolgálja: csak a Damageable felületet használják
  // (+ a GameObject identitást a hasHitTarget/registerHit halmazához), tehát nem kell tudniuk,
  // melyik lényt találták el.
  private handlePlayerHitEnemy(
    hitbox: PhysicsOverlapObject,
    enemyObj: PhysicsOverlapObject
  ): void {
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite & Damageable;
    if (enemy.isDead() || this.player.hasHitTarget(enemy)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    enemy.takeDamage(damage);
    this.player.registerHit(enemy);
    // A fenti hasHitTarget()/isDead() guard miatt ez csapásonként PONTOSAN egyszer szól,
    // akkor is, ha az overlap több frame-en át fennáll.
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

  /** A Gravecaller lövedéke × player — a BossScene.handleBossProjectileHitPlayer mintája. */
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
