import Phaser from 'phaser';
import Player, { LadderContact } from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import CrowHarvester from '../enemies/CrowHarvester';
import CheckpointSystem from '../systems/CheckpointSystem';
import type { PhysicsOverlapObject } from '../combat/DamageSystem';

const WORLD_WIDTH = 3200;
// A WORLD_HEIGHT szándékosan megegyezik a canvas magasságával (main.ts): így a kamera
// csak vízszintesen görget, és a teljes függőleges sáv (talajtól a felső platformig)
// mindig látszik. A létra is belefér ebbe a sávba.
const WORLD_HEIGHT = 450;

const GROUND_CENTER_Y = 434;
const GROUND_TOP = 418; // ground-placeholder 64x32, origin 0.5 -> 434 - 16

const PLAYER_HALF_HEIGHT = 24; // player-placeholder 32x48
const START_X = 100; // pálya eleji kezdőpont = a CheckpointSystem default-ja
const START_Y = 300;
const HARVESTER_SPAWN_OFFSET = 24; // a CrowHarvester talpa a sprite.y + 23-nál van -> 1px ejtés

interface PlatformDef {
  id: string;
  x: number;
  y: number;
  tiles: number;
  /** Alulról átjárható (a létra ezen megy át), felülről szilárd. */
  oneWay?: boolean;
}

// A platform-placeholder 64x16, origin 0.5, setScale(tiles, 1).
// Egyetlen forrás a geometriának: az enemy patrol-határok is ebből származnak.
const PLATFORMS: PlatformDef[] = [
  { id: 'P1', x: 380, y: 350, tiles: 3 }, // első ugrás a talajról
  { id: 'P2', x: 620, y: 292, tiles: 2 }, // magasabb lépés
  { id: 'P3', x: 1000, y: 322, tiles: 3 }, // átvezetés
  { id: 'P4', x: 1360, y: 300, tiles: 5 }, // platform-CrowHarvester A (tágas)
  { id: 'P5', x: 1750, y: 342, tiles: 2 }, // lépcsős emelkedő start
  { id: 'P6', x: 1980, y: 272, tiles: 2 },
  { id: 'P7', x: 2200, y: 202, tiles: 2 }, // csúcspont
  { id: 'P8', x: 2440, y: 272, tiles: 3 }, // platform-CrowHarvester B (szűk)
  { id: 'P9', x: 2900, y: 140, tiles: 6, oneWay: true }, // létra célja
];

const platformTop = (p: PlatformDef): number => p.y - 8;
const platformLeft = (p: PlatformDef): number => p.x - p.tiles * 32;
const platformRight = (p: PlatformDef): number => p.x + p.tiles * 32;

const platformById = (id: string): PlatformDef => {
  const found = PLATFORMS.find((p) => p.id === id);
  if (!found) throw new Error(`Ismeretlen platform id: ${id}`);
  return found;
};

// Létra a pálya végén. Az X úgy van megválasztva, hogy P9 (span 2708-3092) fölé essen,
// így a player alulról átmászik az egyirányú platformon és a tetején köt ki.
const LADDER_X = 2762;
const LADDER_ZONE_TOP = 100;
const LADDER_WIDTH = 28;

// Platformon álló enemy patrol-határainak behúzása a peremtől (a CrowHarvester félszélessége 10px).
const EDGE_INSET = 24;

// Ajtó (checkpoint + boss-transition) a P9 felső platformon, a door-placeholder helyén.
const DOOR_X = 3040;
const DOOR_WIDTH = 48;
const DOOR_HEIGHT = 72;
const CHECKPOINT_X = 3010; // az ajtótól kicsit balra, hogy ne a grafikájában jelenjen meg
const CHECKPOINT_Y = platformTop(platformById('P9')) - PLAYER_HALF_HEIGHT;
const RESPAWN_DELAY_MS = 1200; // rövid szünet a halál-tint után, mielőtt visszatér a checkpointra

export default class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private playerHpText!: Phaser.GameObjects.Text;

  private ladderZone!: Phaser.GameObjects.Zone;
  private ladderContact!: LadderContact;

  private checkpoint!: CheckpointSystem;
  private doorZone!: Phaser.GameObjects.Zone;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private checkpointPromptText!: Phaser.GameObjects.Text;
  private isTransitioning = false;
  private respawnScheduled = false;

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
    this.isTransitioning = false;
    this.respawnScheduled = false;

    this.cameras.main.setBackgroundColor('#0a0a0f');

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createDecor();

    // Folyamatos talaj végig — a respawn megvan, de a PLATFORMS layout még nincs
    // szakadékokra tervezve; a gap bevezetése külön polish-feladat (lásd CLAUDE.md).
    const ground = this.physics.add.staticGroup();
    ground.create(WORLD_WIDTH / 2, GROUND_CENTER_Y, 'ground-placeholder')
      .setScale(WORLD_WIDTH / 64, 1)
      .refreshBody();

    const platforms = this.createPlatforms();
    this.createLadder();
    this.createDoorZone();

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
    });

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
    const upper = platformById('P9');
    const zoneHeight = GROUND_TOP - LADDER_ZONE_TOP;
    const zoneCenterY = LADDER_ZONE_TOP + zoneHeight / 2;

    // Hátfal, hogy a létra ne a semmiben lógjon.
    this.add
      .image(LADDER_X, zoneCenterY, 'pillar-placeholder')
      .setDisplaySize(64, zoneHeight)
      .setDepth(-2);

    this.add
      .tileSprite(LADDER_X, zoneCenterY, LADDER_WIDTH, zoneHeight, 'ladder-placeholder')
      .setDepth(-1);

    this.ladderZone = this.add.zone(LADDER_X, zoneCenterY, LADDER_WIDTH, zoneHeight);
    this.physics.add.existing(this.ladderZone, true);

    // A topY/bottomY a player középpontjának szélsőértékei: fent a lábak pont a felső
    // platform felszínén állnak meg, lent a talajon.
    this.ladderContact = {
      centerX: LADDER_X,
      topY: platformTop(upper) - PLAYER_HALF_HEIGHT,
      bottomY: GROUND_TOP - PLAYER_HALF_HEIGHT,
    };
  }

  private createDecor(): void {
    // Parallax háttéroszlopok — nincs fizikájuk, csak mélységet adnak a pályának.
    for (const x of [250, 900, 1600, 2300, 3000]) {
      this.add
        .image(x, 340, 'pillar-placeholder')
        .setScrollFactor(0.6)
        .setDepth(-10);
    }

    // Pálya végi ajtó a felső platform jobb végén — a checkpoint + boss-transition trigger.
    const upper = platformById('P9');
    this.add
      .image(DOOR_X, platformTop(upper) - DOOR_HEIGHT / 2, 'door-placeholder')
      .setDepth(-1);
  }

  private createDoorZone(): void {
    const upper = platformById('P9');
    const zoneY = platformTop(upper) - DOOR_HEIGHT / 2;

    this.doorZone = this.add.zone(DOOR_X, zoneY, DOOR_WIDTH, DOOR_HEIGHT);
    this.physics.add.existing(this.doorZone, true);
  }

  private spawnEnemies(): void {
    // Földi CrowHarvesterek: default patrol (spawn ±80px), üldözés közben szabadon mozognak.
    this.enemies.push(new CrowHarvester(this, 820, 386));
    this.enemies.push(new CrowHarvester(this, 1850, 386));
    this.enemies.push(new CrowHarvester(this, 2700, 386));

    // Platform-kötött CrowHarvesterek: a patrol range a platform tetejére szorul, és
    // clampChaseToBounds miatt üldözés közben sem sétálnak le a peremről.
    for (const id of ['P4', 'P8']) {
      const p = platformById(id);
      this.enemies.push(
        new CrowHarvester(this, p.x, platformTop(p) - HARVESTER_SPAWN_OFFSET, {
          patrolMinX: platformLeft(p) + EDGE_INSET,
          patrolMaxX: platformRight(p) - EDGE_INSET,
          clampChaseToBounds: true,
        })
      );
    }
  }

  update(): void {
    // Szinkron overlap-teszt: azonnal ad eredményt, szemben a physics.add.overlap
    // callbackkel, ami csak a scene update() UTÁN futna le (1 frame késés a mászásban).
    const touchingLadder =
      !this.player.isDead() && this.physics.overlap(this.player, this.ladderZone);
    this.player.setLadderContact(touchingLadder ? this.ladderContact : null);

    this.controller.update();

    // Debug kijelzés (Phase 8 / ui modul cseréli le): HP + aktuális player state.
    this.playerHpText.setText(
      `HP: ${this.player.getHP()}/${this.player.getMaxHP()} | ${this.player.playerState}`
    );

    for (const enemy of this.enemies) {
      enemy.update(this.player);
    }

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      if (!this.fireballs[i].active) {
        this.fireballs.splice(i, 1);
      }
    }

    const nearDoor = !this.player.isDead() && this.physics.overlap(this.player, this.doorZone);
    this.checkpointPromptText.setVisible(nearDoor && !this.isTransitioning);

    if (nearDoor && !this.isTransitioning && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.activateCheckpointAndTransition();
    }

    if (this.player.isDead() && !this.respawnScheduled) {
      this.respawnScheduled = true;
      this.time.delayedCall(RESPAWN_DELAY_MS, () => {
        const { x, y } = this.checkpoint.getRespawnPoint();
        this.player.respawn(x, y);
        this.respawnScheduled = false;
      });
    }
  }

  private activateCheckpointAndTransition(): void {
    this.isTransitioning = true;
    this.checkpoint.activate(CHECKPOINT_X, CHECKPOINT_Y);
    this.checkpointPromptText.setText('Checkpoint mentve...').setVisible(true);

    // A legyőzött boss után az ajtó már nem az arénába, hanem a következő pályára visz —
    // különben a Level1-re visszatérve újra a (már teljesített) boss fight indulna.
    const nextScene = this.registry.get('bossDefeated') ? 'Level2Scene' : 'BossScene';

    // FADE_OUT_COMPLETE, nem a fadeOut() callbackje: utóbbi a fade MINDEN frame-jén
    // lefutna (camera, progress paraméterekkel), tehát frame-enként újraindítaná a scene-t.
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(nextScene);
    });
    this.cameras.main.fadeOut(500, 0, 0, 0);
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
