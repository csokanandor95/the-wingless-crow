import Phaser from 'phaser';
import Player, { LadderContact } from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import CrowHarvester from '../enemies/CrowHarvester';
import CheckpointSystem from '../systems/CheckpointSystem';
import ParallaxBackground, {
  LEVEL1_BACKGROUND_LAYERS,
} from '../systems/ParallaxBackground';
import AudioManager, {
  LEVEL_MUSIC_FADE_IN_MS,
  LEVEL_MUSIC_VOLUME,
  MUSIC_KEYS,
  SFX_KEYS,
} from '../systems/AudioManager';
import TutorialHint from '../ui/TutorialHint';
import HazardDamageGate from '../hazards/HazardDamage';
import SpikeField, { SPIKE_DAMAGE, SPIKE_KNOCKBACK_Y } from '../hazards/SpikeField';
import SwingingReaper, { REAPER_DAMAGE } from '../hazards/SwingingReaper';
import {
  DOOR,
  DOOR_CHECKPOINT,
  ENEMY_SPAWNS,
  FALL_DEATH_Y,
  FALL_DEPTH,
  GROUND_CENTER_Y,
  GROUND_SEGMENTS,
  GROUND_TOP,
  HARVESTER_SPAWN_OFFSET,
  LADDER,
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
import type { PhysicsOverlapObject } from '../combat/DamageSystem';

/** A ground-placeholder csempe szélessége — a szegmensek ehhez skálázódnak. */
const GROUND_TILE_WIDTH = 64;

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
  private enemies: CrowHarvester[] = [];

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
    this.enemies = [];
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

    const ground = this.createGround();
    const platforms = this.createPlatforms();
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
    // FIGYELEM: ezek a colliderek a this.enemies tömb REFERENCIÁJÁRA kötődnek, és a Phaser
    // minden physics stepben újraiterálja a tartalmát. Ezért tudja a resetEnemies() helyben
    // (splice + push) kicserélni a lakóit anélkül, hogy újra kellene regisztrálni bármit —
    // és ezért TILOS a tömböt új tömbre cserélni (lásd CLAUDE.md 2. tanulság).
    this.physics.add.collider(this.enemies, ground);
    this.physics.add.collider(this.enemies, platforms);

    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.enemies,
      this.handlePlayerHitEnemy,
      undefined,
      this
    );

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      const fireball = new Fireball(this, x, y, direction);
      this.fireballs.push(fireball);
      this.audio.playSfx(SFX_KEYS.FIREBALL_CAST);
    });

    this.player.on('sword-swing', () => this.audio.playSfx(SFX_KEYS.SWORD_SWING));

    this.physics.add.overlap(
      this.fireballs,
      this.enemies,
      this.handleFireballHitEnemy,
      undefined,
      this
    );

    this.physics.add.collider(this.fireballs, ground, (fireballObj) => {
      const fireball = fireballObj as Fireball;
      if (fireball.active) fireball.onImpact();
    });
    this.physics.add.collider(this.fireballs, platforms, (fireballObj) => {
      const fireball = fireballObj as Fireball;
      if (fireball.active) fireball.onImpact();
    });

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.controller = new PlayerController(this, this.player);

    this.playerHpText = this.add
      .text(10, 10, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
      .setScrollFactor(0);

    this.interactKey = this.input.keyboard!.addKey('E');
    const doorPrompt = this.registry.get('bossDefeated')
      ? 'E: Tovább — The Crowless Forest'
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
    // ajtó-checkpointon éled újra (x ~5810), ahol mindkét trigger azonnal átlépettnek
    // számítana — értelmetlen lenne ott a mozgás-tutorialt felvillantani.
    const atLevelStart = spawn.x === START_X && spawn.y === START_Y;
    this.tutorialHint = new TutorialHint(this, atLevelStart ? TUTORIAL_HINTS : []);
  }

  /**
   * A talaj NEM folyamatos: a GROUND_SEGMENTS közötti hézagok a szakadékok. Minden szegmens
   * egyetlen, vízszintesen felskálázott static sprite — ugyanaz a minta, mint a korábbi
   * egyetlen, teljes pálya szélességű talajnál, csak most szegmensenként.
   */
  private createGround(): Phaser.Physics.Arcade.StaticGroup {
    const ground = this.physics.add.staticGroup();

    for (const segment of GROUND_SEGMENTS) {
      const width = segment.endX - segment.startX;
      const sprite = ground.create(
        segment.startX + width / 2,
        GROUND_CENTER_Y,
        'ground-placeholder'
      ) as Phaser.Physics.Arcade.Sprite;
      sprite.setScale(width / GROUND_TILE_WIDTH, 1).refreshBody();
    }

    return ground;
  }

  private createPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    const platforms = this.physics.add.staticGroup();

    for (const def of PLATFORMS) {
      const sprite = platforms.create(
        def.x,
        def.y,
        'platform-placeholder'
      ) as Phaser.Physics.Arcade.Sprite;
      sprite.setScale(def.tiles, 1).refreshBody();

      if (def.oneWay) {
        // A lenti oldalon nincs ütközés -> a player a létrán alulról átmászhat rajta.
        (sprite.body as Phaser.Physics.Arcade.StaticBody).checkCollision.down = false;
      }
    }

    return platforms;
  }

  private createLadder(): void {
    const upper = platformById('H1');
    const zoneHeight = GROUND_TOP - LADDER.zoneTop;
    const zoneCenterY = LADDER.zoneTop + zoneHeight / 2;

    // Hátfal, hogy a létra ne a semmiben lógjon.
    this.add
      .image(LADDER.x, zoneCenterY, 'pillar-placeholder')
      .setDisplaySize(64, zoneHeight)
      .setDepth(-2);

    this.add
      .tileSprite(LADDER.x, zoneCenterY, LADDER.width, zoneHeight, 'ladder-placeholder')
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
    // a mélység-illúziót most a ParallaxBackground három valódi rétege adja. A létra
    // mögötti hátfal-oszlop megmarad (createLadder()), az funkcionális.

    // Pálya végi ajtó a felső platform jobb végén — a checkpoint + boss-transition trigger.
    const upper = platformById('H1');
    this.add
      .image(DOOR.x, platformTop(upper) - DOOR.height / 2, 'door-placeholder')
      .setDepth(-1);
  }

  private createDoorZone(): void {
    const upper = platformById('H1');
    const zoneY = platformTop(upper) - DOOR.height / 2;

    this.doorZone = this.add.zone(DOOR.x, zoneY, DOOR.width, DOOR.height);
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
   * MINDEN enemy explicit patrol-határt és `clampChaseToBounds`-ot kap (a szakadékok
   * bevezetése előtt ez csak a platformon állókra volt igaz): enélkül egy üldöző földi
   * enemy lesétálna a szakadék peremén, és a D szakaszban belesétálna a tüskékbe.
   * A határok a Level1Layout ENEMY_SPAWNS adattömbjéből jönnek, ahol unit teszt őrzi,
   * hogy mindegyik a saját felületén belül marad.
   */
  private spawnEnemies(): void {
    for (const def of ENEMY_SPAWNS) {
      const surface = surfaceSpan(def.surfaceId);
      const enemy = new CrowHarvester(
        this,
        def.x,
        surface.top - HARVESTER_SPAWN_OFFSET,
        {
          patrolMinX: def.patrolMinX,
          patrolMaxX: def.patrolMaxX,
          clampChaseToBounds: true,
        }
      );

      // Csapás-hang. Távolság-alapú némítás NEM kell: a CrowHarvester csak ATTACK_RANGE-en
      // (42px) belül támad, tehát egy csapkodó lény definíció szerint a player mellett áll,
      // és mindig a képernyőn van.
      enemy.on('harvester-attack', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));

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
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies.splice(0, this.enemies.length);
    this.spawnEnemies();
  }

  /** Ugyanaz a helyben-csere, mint a resetEnemies()-nél: a fireball-colliderek is a tömbre kötnek. */
  private clearFireballs(): void {
    for (const fireball of this.fireballs) {
      fireball.destroy();
    }
    this.fireballs.splice(0, this.fireballs.length);
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

    for (const enemy of this.enemies) {
      // Biztosíték: a patrol-határok ezt elvileg kizárják, de egy szakadékba került enemy
      // enélkül némán "patrolozna" a világ alján, a képernyőn kívül.
      if (!enemy.isDead() && enemy.y > FALL_DEATH_Y) {
        enemy.takeDamage(enemy.getMaxHP());
        continue;
      }
      enemy.update(this.player);
    }

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      if (!this.fireballs[i].active) {
        this.fireballs.splice(i, 1);
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

  private handlePlayerHitEnemy(
    hitbox: PhysicsOverlapObject,
    enemyObj: PhysicsOverlapObject
  ): void {
    const enemy = enemyObj as CrowHarvester;
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
    const enemy = enemyObj as CrowHarvester;
    if (!fireball.active || fireball.hasAlreadyHit() || enemy.isDead()) return;

    enemy.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }
}
