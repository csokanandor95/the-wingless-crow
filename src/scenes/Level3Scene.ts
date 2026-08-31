import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import CheckpointSystem from '../systems/CheckpointSystem';
import LevelCheckpoint from '../systems/LevelCheckpoint';
import AudioManager, {
  bindPlayerSfx,
  LEVEL2_MUSIC_FADE_IN_MS,
  LEVEL_MUSIC_VOLUME,
  MUSIC_KEYS,
  SFX_KEYS,
} from '../systems/AudioManager';
import HazardDamageGate from '../hazards/HazardDamage';
import SpikeField, { SPIKE_DAMAGE, SPIKE_KNOCKBACK_Y } from '../hazards/SpikeField';
import { createGroundSegments, createPlatforms } from '../levels/LevelTerrain';
import createDecorProps, { createBackdropBuildings } from '../levels/LevelDecor';
import LevelEnemies from '../levels/LevelEnemies';
import {
  BACKDROP_PANELS,
  CHECKPOINTS,
  CHECKPOINT_ZONE,
  DECOR_PROPS,
  DOOR,
  DOOR_CHECKPOINT,
  ENEMY_SPAWNS,
  FALL_DEATH_Y,
  FALL_DEPTH,
  GROUND_SEGMENTS,
  GROUND_TOP,
  LEVEL3_GEOMETRY,
  PLATFORMS,
  SPIKE_FIELDS,
  START_X,
  START_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  checkpointRespawnY,
  surfaceSpan,
} from '../levels/Level3Layout';
import {
  ARCH_APERTURE,
  ARCH_THRESHOLD_PX,
  ARCH_TILE_HEIGHT,
  ARCH_TILE_WIDTH,
  CHURCH_ARCH_SCALE,
  CHURCH_BACKGROUND_COLOR,
  CHURCH_TILE_TEXTURES,
} from '../levels/ChurchTileset';
import { DOOR_DEPTH } from '../levels/LevelTileset';
import type { Damageable, PhysicsOverlapObject } from '../combat/DamageSystem';

/**
 * Level 3 – The Beast Dungeon.
 *
 * A geometria a `levels/Level3Layout.ts`-ben él (Phaser-mentes adatmodul), a terrain-építés a
 * `levels/LevelTerrain.ts` `'church'` skinjében, az enemy-kezelés a KÖZÖS
 * `levels/LevelEnemies.ts`-ben — magic number nem kerülhet ide vissza.
 *
 * **Szándékosan a `Level2Scene` wiringjének adaptált MÁSOLATA** (user-döntés): a scene-váz
 * kiemelését csak kézi végigjátszás validálná, a Level 1/2-re pedig nincs scene-szintű teszt.
 * Ami mechanikus és tesztelhető, az KI VAN emelve — és ebben a körben ki is került az
 * enemy-blokk (`LevelEnemies`), ami eddig a Level 1-ben és a Level 2-ben duplikálva élt.
 *
 * ## Amiben ELTÉR a Level 1/2-től
 *
 *  - **NINCS parallax háttér.** Lapos `#272638` alapszín + világ-koordinátás fal-panelek.
 *    Ez mérés, nem ízlés: a `GothicVania Church` háttér-paneljei TELJESEN ÁTLÁTSZATLANOK,
 *    és mind a négy szélükön pontosan ez a szín a keretük. Lapos alapon tehát varrat nélkül
 *    beleolvadnak; egy csempézett falréteg ELŐTT viszont mindegyik látható világos
 *    téglalapként ülne. A csomag saját példaképei is teljesen sík sötét űrt mutatnak.
 *  - **MENNYEZET mint mechanika.** Minden galéria-lap `GALLERY_RISE` (+110) magasan van, ami
 *    egyszerre felugorható, alatta átsétálható, ÉS alatta ugorhatatlan — lásd `Level3Layout`.
 *  - **Nincs létra, nincs mozgó platform, nincs lengő kasza.** Rövid pálya; az identitása a
 *    Beast és a mennyezet, nem a traverzálás.
 *  - **Az ajtó a PADLÓN áll** (a Level 1/2 magas párkányával szemben): bent vagyunk egy
 *    dungeonben, az ajtón besétálunk.
 *  - **Saját registry-kulcs a checkpointnak**: a Level 1/2 kulcsai MÁS koordinátákra
 *    mutatnak.
 */

/** A registry-kulcs SZÁNDÉKOSAN különbözik a másik két pályáétól. */
const CHECKPOINT_REGISTRY_KEY = 'level3Checkpoint';

const BOSS_SCENE_KEY = 'Boss3Scene';

/**
 * A LEGYŐZÖTT Beast Master után az ajtó már nem az ő arénájába, hanem a végső harcra visz —
 * pontosan úgy, ahogy a Level 1 ajtaja a `bossDefeated` után a Level 2-re. Enélkül a
 * démontól kikapva a playert ide tesszük vissza, és újra végig kellene vernie a Beast
 * Mastert, hogy visszajusson. Az átvezető ilyenkor KIMARAD (a Level 1/2 azonos döntése).
 */
const FINAL_SCENE_KEY = 'FinalBossScene';

const RESPAWN_DELAY_MS = 1200;
/** Az ajtó-átmenet hossza. A kamera-fade ÉS a zene kifadelése is ebből dolgozik. */
const TRANSITION_FADE_MS = 500;

/**
 * Placeholder lore-átvezető a Level 3 és a Beast Master arénája között — a végleges szöveget
 * a Phase 9 – Lore írja meg, a csere ennek a tömbnek a szerkesztése.
 */
const LEVEL3_END_NARRATION = [
  'A folyosó zsákutcába fut, és a zsákutca ajtóban végződik.\nAz ajtó mögül nem csend hallatszik.',
  'A kövön karmolásnyomok. Nem egy állaté —\nsokféléé, egymás fölé rétegezve, évek óta.',
  'Valaki idehordta őket. Valaki etette őket.\nÉs valaki megtanította nekik, mikor kell csendben maradni.',
  'Lazarus leveszi a kezét a kilincsről.\nMár tudja, hogy odabent nem a falka a legnagyobb.',
];

export default class Level3Scene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private playerHpText!: Phaser.GameObjects.Text;
  private audio!: AudioManager;

  private spikes!: SpikeField;
  /**
   * KÖZÖS kapu minden környezeti hazardnak. A Level 3-on jelenleg csak tüskék vannak, de a
   * kapu így is kell: a `Player.takeDamage()` nem néz HURT állapotot, tehát egy mezőn ÁLLVA
   * a scene minden frame-ben sebezne.
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
  /**
   * Az enemyk spawnolása / respawnja / frissítése + a Gravecallerek boltjai. A `create()`-ben
   * jön létre, tehát a tömbjei scene-restartkor automatikusan frissek (CLAUDE.md 3. tanulság).
   */
  private levelEnemies!: LevelEnemies;

  constructor() {
    super('Level3Scene');
  }

  create(): void {
    // A class field initializerek csak a Scene ELSŐ létrehozásakor futnak le; egy
    // scene-restart ugyanazon a példányon hívja újra a create()-et (CLAUDE.md 3. tanulság).
    this.fireballs = [];
    this.levelCheckpoints = [];
    this.isTransitioning = false;
    this.respawnScheduled = false;
    this.fallDeathTriggered = false;
    this.hazardGate.reset();

    // A church csomag MÉRT űr-színe. Parallax réteg SZÁNDÉKOSAN nincs — lásd az osztály
    // fejlécét: a háttér-panelek átlátszatlanok, és pontosan ez a keretük színe.
    this.cameras.main.setBackgroundColor(CHURCH_BACKGROUND_COLOR);
    this.cameras.main.fadeIn(400);

    // A FIZIKAI világ mélyebb, mint a canvas: a gödörbe lépő player kizuhan a képből, és a
    // FALL_DEATH_Y-t átlépve hal meg. A KAMERA bounds-a a canvas magassága marad.
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT + FALL_DEPTH);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.audio = new AudioManager(this);
    // A Level 2-vel AZONOS, hosszú fade-in: ide is a NarrationScene felől érkezünk, tehát
    // már feloldott audio contexttel — a zene tényleg ebben a pillanatban indul.
    this.audio.playMusic(MUSIC_KEYS.LEVEL3_THEME, {
      volume: LEVEL_MUSIC_VOLUME,
      fadeInMs: LEVEL2_MUSIC_FADE_IN_MS,
    });

    // A fal-panelek a terrain ELŐTT jönnek létre, hogy a display listán is mögötte legyenek
    // (a BUILDING_DEPTH ezt amúgy is garantálja, de így a sorrend olvasható).
    createBackdropBuildings(this, BACKDROP_PANELS, LEVEL3_GEOMETRY);

    const ground = createGroundSegments(this, GROUND_SEGMENTS, 'church');
    const platforms = createPlatforms(this, PLATFORMS, 'church', LEVEL3_GEOMETRY);

    createDecorProps(this, DECOR_PROPS, LEVEL3_GEOMETRY);

    this.spikes = new SpikeField(this, SPIKE_FIELDS);

    this.createDoor();
    this.createCheckpoints();

    const existing = this.registry.get(CHECKPOINT_REGISTRY_KEY) as CheckpointSystem | undefined;
    this.checkpoint = existing ?? new CheckpointSystem(START_X, START_Y);
    if (!existing) this.registry.set(CHECKPOINT_REGISTRY_KEY, this.checkpoint);

    const spawn = this.checkpoint.getRespawnPoint();
    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms);

    this.levelEnemies = new LevelEnemies(this, ENEMY_SPAWNS, LEVEL3_GEOMETRY, this.audio);
    this.levelEnemies.spawn();

    // FIGYELEM: ezek a colliderek az enemy-tömbök REFERENCIÁJÁRA kötődnek, és a Phaser minden
    // physics stepben újraiterálja a tartalmukat. Ezért tudja a LevelEnemies.reset() helyben
    // (splice + push) kicserélni a lakóikat — és ezért TILOS a tömböket új tömbre cserélni
    // (CLAUDE.md 2. tanulság).
    for (const group of this.levelEnemies.groups()) {
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

    bindPlayerSfx(this.player, this.audio);

    this.physics.add.overlap(
      this.levelEnemies.projectiles,
      this.player,
      this.handleEnemyProjectileHitPlayer,
      undefined,
      this
    );

    for (const projectiles of [this.fireballs, this.levelEnemies.projectiles]) {
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
      .text(
        400,
        400,
        this.registry.get('beastMasterDefeated') ? 'E: Tovább — The Broken Gate' : 'E: Belépés',
        { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
  }

  /**
   * A boltív `CHURCH_ARCH_SCALE`-lel (2) megy ki: 1:1-ben a nyílása 24 px, a player teste
   * viszont 28 — láthatóan nem férne át rajta.
   *
   * A geometria a `ChurchTileset.ts`-ből jön, hogy a scene-be ne kerüljön magic number:
   * `origin (0.5, 1)`-gyel a `GROUND_TOP + ARCH_THRESHOLD_PX`-re állítva a boltív rajzolt
   * padlója pontosan a járható felszínre esik (a küszöb-kő a felszín ALÁ lóg, ezért kell a
   * terrainnél hátrébb lévő `DOOR_DEPTH`).
   *
   * A Level 1-gyel szemben NINCS mögötte „folyosó" objektum: ott a csempe nyílása ALPHA-lyuk
   * volt, amin átütött az égbolt. Itt a boltív belseje rajzolt, átlátszatlan sötét tégla.
   */
  private createDoor(): void {
    this.add
      .image(DOOR.x, GROUND_TOP + ARCH_THRESHOLD_PX, CHURCH_TILE_TEXTURES.ARCH_GATE)
      .setOrigin(0.5, 1)
      .setScale(CHURCH_ARCH_SCALE)
      .setDepth(DOOR_DEPTH);

    // A trigger-zóna a NYÍLÁST fedi, nem a teljes csempét: a prompt pontosan akkor jöjjön
    // elő, amikor a player láthatóan a boltívben áll.
    const tileLeft = DOOR.x - ARCH_TILE_WIDTH / 2;
    const tileTop = GROUND_TOP + ARCH_THRESHOLD_PX - ARCH_TILE_HEIGHT;

    this.doorZone = this.add.zone(
      tileLeft + ARCH_APERTURE.left + ARCH_APERTURE.width / 2,
      tileTop + ARCH_APERTURE.top + ARCH_APERTURE.height / 2,
      ARCH_APERTURE.width,
      ARCH_APERTURE.height
    );
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

  /** A player tűzgolyói + a Gravecallerek boltjai — mindkettő helyben ürül. */
  private clearFireballs(): void {
    for (const projectile of this.fireballs) {
      projectile.destroy();
    }
    this.fireballs.splice(0, this.fireballs.length);
    this.levelEnemies.clearProjectiles();
  }

  update(): void {
    this.controller.update();

    this.playerHpText.setText(
      `HP: ${this.player.getHP()}/${this.player.getMaxHP()} | ${this.player.playerState}`
    );

    this.levelEnemies.update(this.player);

    for (const projectiles of [this.fireballs, this.levelEnemies.projectiles]) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) projectiles.splice(i, 1);
      }
    }

    this.checkSpikeContact();
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
        this.levelEnemies.reset();
        this.player.respawn(x, y);
        this.respawnScheduled = false;
        this.fallDeathTriggered = false;
        this.hazardGate.reset();
      });
    }
  }

  /**
   * Tüske-érintkezés. Szinkron `physics.overlap()`, mint az ajtónál — nem
   * `physics.add.overlap` callback, ami csak a scene `update()`-je UTÁN futna le.
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

  /** A köztes checkpoint ÉRINTÉSRE aktiválódik — nem versenyez az ajtó promptjával. */
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

    // A zene a KÉPPEL EGYÜTT halkul el, ugyanabból a konstansból, amiből a kamera-fade.
    this.audio.stopMusic(TRANSITION_FADE_MS);

    // FADE_OUT_COMPLETE, nem a fadeOut() callbackje: utóbbi a fade MINDEN frame-jén lefutna
    // (CLAUDE.md 4. tanulság).
    const beastMasterDefeated = Boolean(this.registry.get('beastMasterDefeated'));

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (beastMasterDefeated) {
        this.scene.start(FINAL_SCENE_KEY);
        return;
      }

      this.scene.start('NarrationScene', {
        lines: LEVEL3_END_NARRATION,
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
