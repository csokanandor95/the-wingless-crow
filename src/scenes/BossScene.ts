import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import GraftedWingBreaker, {
  PROJECTILE_DAMAGE,
  PROJECTILE_SPEED,
} from '../bosses/GraftedWingBreaker';
import type { PhysicsOverlapObject } from '../combat/DamageSystem';

// Boss aréna (Project_plan.md 15. pont): fix, egy képernyős pálya — nincs kameragörgetés,
// így a boss, a player és a HP-bar mindig egyszerre látszik, és a charge/projectile
// telegraph mindig olvasható marad.
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 450;

const GROUND_CENTER_Y = 434;
const GROUND_TOP = 418; // ground-placeholder 64x32, origin 0.5 -> 434 - 16

// A spawn X szándékosan a bal oldali platform (x >= 126) BAL oldalán van, hogy a player
// ne akadhasson fel a platform sarkára belépéskor, hanem szabadon a talajra essen.
const PLAYER_SPAWN_X = 80;
const PLAYER_SPAWN_Y = 300;

const BOSS_HALF_HEIGHT = 48; // boss-placeholder 64x96
const BOSS_SPAWN_X = 620;
const BOSS_SPAWN_Y = GROUND_TOP - BOSS_HALF_HEIGHT;

// Két alacsony oldalsó platform: kitérési lehetőség a charge elől, és magaslat, ahonnan
// a player leugorva támadhat. Elég alacsonyak ahhoz, hogy egy ugrással elérhetők legyenek.
const ARENA_PLATFORMS = [
  { x: 190, y: 290, tiles: 2 },
  { x: 610, y: 290, tiles: 2 },
];

const BOSS_NAME = 'The Grafted Wing-Breaker';

const HP_BAR_X = 110;
const HP_BAR_Y = 34;
const HP_BAR_WIDTH = 580;
const HP_BAR_HEIGHT = 16;

const VICTORY_DELAY_MS = 1400;
const DEFEAT_DELAY_MS = 1400;
const FADE_MS = 700;

// Placeholder lore-szöveg: a végleges narrációt a Phase 9 – Lore írja meg,
// a csere ennek a tömbnek a szerkesztése.
const BOSS_VICTORY_NARRATION = [
  'A Wing-Breaker térdre rogy. A testéhez varrt szárnyak\nutoljára megrándulnak, majd hamuvá válnak.',
  'A hamuból egyetlen varjú emelkedik ki.\nNem szól — csak kelet felé fordul.',
  'Lazarus utánanéz. A háta még mindig üres,\nde most már tudja, hol keresse a többit.',
  'A kapu nyitva marad.\nValaki másnak kell bezárnia.',
];

export default class BossScene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private boss!: GraftedWingBreaker;

  private playerHpText!: Phaser.GameObjects.Text;
  private bossHpBar!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;

  private fireballs: Fireball[] = [];
  private bossProjectiles: Fireball[] = [];

  private fightStarted = false;
  private outcomeScheduled = false;

  constructor() {
    super('BossScene');
  }

  create(): void {
    // Class field initializerek CSAK a Scene első létrehozásakor futnak le; a scene-be
    // való újbóli belépés (halál -> Level1Scene -> ajtó -> BossScene) ugyanazon a
    // példányon hívja újra a create()-et. Lásd CLAUDE.md "Fontos technikai tanulságok" 3.
    this.fireballs = [];
    this.bossProjectiles = [];
    this.fightStarted = false;
    this.outcomeScheduled = false;

    this.cameras.main.setBackgroundColor('#100810');
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.fadeIn(600);

    this.createDecor();

    const ground = this.physics.add.staticGroup();
    ground.create(ARENA_WIDTH / 2, GROUND_CENTER_Y, 'ground-placeholder')
      .setScale(ARENA_WIDTH / 64, 1)
      .refreshBody();

    const platforms = this.createPlatforms();

    this.player = new Player(this, PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms);

    this.boss = new GraftedWingBreaker(this, BOSS_SPAWN_X, BOSS_SPAWN_Y);
    this.physics.add.collider(this.boss, ground);
    this.physics.add.collider(this.boss, platforms);
    // Player és boss között SZÁNDÉKOSAN nincs collider: a sebzés a támadás-hitboxokon
    // keresztül megy, így nem tolják egymást a pálya szélére.

    this.registerCombatOverlaps(ground, platforms);
    this.registerBossEvents();

    this.controller = new PlayerController(this, this.player);
    this.createHud();
    this.startEntrance();
  }

  private createPlatforms(): Phaser.Physics.Arcade.StaticGroup {
    const platforms = this.physics.add.staticGroup();

    for (const def of ARENA_PLATFORMS) {
      const sprite = platforms.create(
        def.x,
        def.y,
        'platform-placeholder'
      ) as Phaser.Physics.Arcade.Sprite;
      sprite.setScale(def.tiles, 1).refreshBody();
    }

    return platforms;
  }

  private createDecor(): void {
    for (const x of [80, 400, 720]) {
      this.add.image(x, 300, 'pillar-placeholder').setDepth(-10);
    }
    // Az aréna hátsó "kapuja" — a Level1 ajtajának párja, csak dísz.
    this.add.image(ARENA_WIDTH / 2, GROUND_TOP - 36, 'door-placeholder').setDepth(-5);
  }

  private registerCombatOverlaps(
    ground: Phaser.Physics.Arcade.StaticGroup,
    platforms: Phaser.Physics.Arcade.StaticGroup
  ): void {
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.boss,
      this.handlePlayerHitBoss,
      undefined,
      this
    );

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      this.fireballs.push(new Fireball(this, x, y, direction));
    });

    this.physics.add.overlap(this.fireballs, this.boss, this.handleFireballHitBoss, undefined, this);
    this.physics.add.overlap(
      this.bossProjectiles,
      this.player,
      this.handleBossProjectileHitPlayer,
      undefined,
      this
    );

    // Mindkét lövedék-fajta becsapódik a geometriába.
    for (const projectiles of [this.fireballs, this.bossProjectiles]) {
      for (const solid of [ground, platforms]) {
        this.physics.add.collider(projectiles, solid, (projectileObj) => {
          const projectile = projectileObj as Fireball;
          if (projectile.active) projectile.onImpact();
        });
      }
    }
  }

  private registerBossEvents(): void {
    // A boss csak eventet emittál, a lövedéket a scene hozza létre (ugyanaz a minta,
    // mint a Player 'fireball-cast'-ja) — így a boss osztály nem függ a Fireball-tól.
    this.boss.on('boss-projectile', (x: number, y: number, direction: number) => {
      this.bossProjectiles.push(
        new Fireball(this, x, y, direction, {
          texture: 'boss-projectile-placeholder',
          damage: PROJECTILE_DAMAGE,
          speed: PROJECTILE_SPEED,
          size: 20,
        })
      );
    });

    this.boss.on('boss-phase-change', () => {
      // TODO (Phase 8): fázisváltás sting + zene váltása intenzívebb loopra.
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

    this.bossNameText = this.add
      .text(ARENA_WIDTH / 2, HP_BAR_Y - 14, BOSS_NAME, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d8c8d8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.bossHpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  // Boss entrance (Project_plan.md 15. pont): a boss DORMANT, amíg a cím be- és
  // kifadel — csak utána indul a fight.
  private startEntrance(): void {
    const title = this.add
      .text(ARENA_WIDTH / 2, 190, BOSS_NAME, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#e8d8e8',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    const subtitle = this.add
      .text(ARENA_WIDTH / 2, 226, 'a varjak fogvatartója', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8a7a8a',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    // TODO (Phase 8): boss music cue — itt indul majd az AudioManager boss theme-je.
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
    this.bossNameText.setVisible(true);
    this.boss.activate();
  }

  update(): void {
    this.controller.update();

    if (this.fightStarted) {
      this.boss.update(this.player);
    }

    // Az inaktív lövedékek kitakarítása MINDIG helyben, splice()-szal: a tömbök
    // referenciája be van kötve a physics.add.overlap-ba, egy filter()-es újra-értékadás
    // elavult tömbre hagyná a collidert (CLAUDE.md "Fontos technikai tanulságok" 2.).
    for (const projectiles of [this.fireballs, this.bossProjectiles]) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) projectiles.splice(i, 1);
      }
    }

    this.playerHpText.setText(
      `HP: ${this.player.getHP()}/${this.player.getMaxHP()} | ${this.player.playerState}`
    );
    this.drawBossHealthBar();

    if (this.outcomeScheduled) return;

    if (this.boss.isDead()) {
      this.scheduleVictory();
    } else if (this.player.isDead()) {
      this.scheduleDefeat();
    }
  }

  private drawBossHealthBar(): void {
    this.bossHpBar.clear();
    if (!this.fightStarted) return;

    const ratio = Math.max(0, this.boss.getHP() / this.boss.getMaxHP());

    this.bossHpBar.fillStyle(0x000000, 0.6);
    this.bossHpBar.fillRect(HP_BAR_X - 3, HP_BAR_Y - 3, HP_BAR_WIDTH + 6, HP_BAR_HEIGHT + 6);
    this.bossHpBar.fillStyle(0x2a1218, 1);
    this.bossHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this.bossHpBar.fillStyle(this.boss.getPhase() === 2 ? 0xff3322 : 0xa02020, 1);
    this.bossHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT);
  }

  private scheduleVictory(): void {
    this.outcomeScheduled = true;
    this.registry.set('bossDefeated', true);
    // TODO (Phase 8): boss theme leállítása + victory sting.

    this.time.delayedCall(VICTORY_DELAY_MS, () => {
      this.fadeToScene('NarrationScene', {
        lines: BOSS_VICTORY_NARRATION,
        nextScene: 'Level2Scene',
      });
    });
  }

  // Vereség: vissza a Level1-re, ahol a player a CheckpointSystem pontján (a boss-ajtónál)
  // éled újra, és E-vel léphet be ismét — a boss ilyenkor friss HP-val indul.
  private scheduleDefeat(): void {
    this.outcomeScheduled = true;

    this.time.delayedCall(DEFEAT_DELAY_MS, () => {
      this.fadeToScene('Level1Scene');
    });
  }

  // A fadeOut(duration, r, g, b, callback) callbackje MINDEN frame-ben lefut a fade alatt
  // (camera, progress paraméterekkel) — a FADE_OUT_COMPLETE event viszont pontosan egyszer,
  // a végén. Ezért váltunk scene-t innen, nem a fadeOut callbackjéből.
  private fadeToScene(key: string, data?: object): void {
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  }

  private handlePlayerHitBoss(
    hitbox: PhysicsOverlapObject,
    bossObj: PhysicsOverlapObject
  ): void {
    const boss = bossObj as GraftedWingBreaker;
    if (boss.isDead() || this.player.hasHitTarget(boss)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    boss.takeDamage(damage);
    this.player.registerHit(boss);
  }

  private handleFireballHitBoss(
    fireballObj: PhysicsOverlapObject,
    bossObj: PhysicsOverlapObject
  ): void {
    const fireball = fireballObj as Fireball;
    const boss = bossObj as GraftedWingBreaker;
    if (!fireball.active || fireball.hasAlreadyHit() || boss.isDead()) return;

    boss.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }

  private handleBossProjectileHitPlayer(
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
