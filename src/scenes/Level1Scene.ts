import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import Hollow from '../enemies/Hollow';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 450;

export default class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private playerHpText!: Phaser.GameObjects.Text;

  private fireballs: Fireball[] = [];
  private enemies: Hollow[] = [];

  constructor() {
    super('Level1Scene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a0f');

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const ground = this.physics.add.staticGroup();
    ground.create(WORLD_WIDTH / 2, 434, 'ground-placeholder')
      .setScale(WORLD_WIDTH / 64, 1)
      .refreshBody();

    const platforms = this.physics.add.staticGroup();
    platforms.create(600, 320, 'ground-placeholder').setScale(3, 1).refreshBody();
    platforms.create(1100, 280, 'ground-placeholder').setScale(4, 1).refreshBody();

    this.player = new Player(this, 100, 300);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms);

    // Két Hollow a state machine (patrol / chase / attack) teszteléséhez.
    this.enemies.push(new Hollow(this, 450, 386));
    this.enemies.push(new Hollow(this, 900, 386));

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
  }

  update(): void {
    this.controller.update();
    this.playerHpText.setText(`HP: ${this.player.getHP()}/${this.player.getMaxHP()}`);

    for (const enemy of this.enemies) {
      enemy.update(this.player);
    }

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      if (!this.fireballs[i].active) {
        this.fireballs.splice(i, 1);
      }
    }
  }

  private handlePlayerHitEnemy(
    hitbox: Phaser.GameObjects.GameObject,
    enemyObj: Phaser.GameObjects.GameObject
  ): void {
    const enemy = enemyObj as Hollow;
    if (enemy.isDead() || this.player.hasHitTarget(enemy)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    enemy.takeDamage(damage);
    this.player.registerHit(enemy);
  }

  private handleFireballHitEnemy(
    fireballObj: Phaser.GameObjects.GameObject,
    enemyObj: Phaser.GameObjects.GameObject
  ): void {
    const fireball = fireballObj as Fireball;
    const enemy = enemyObj as Hollow;
    if (!fireball.active || fireball.hasAlreadyHit() || enemy.isDead()) return;

    enemy.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }
}