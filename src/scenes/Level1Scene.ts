import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import type { Damageable } from '../combat/DamageSystem';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 450;

class TrainingDummy extends Phaser.Physics.Arcade.Sprite implements Damageable {
  private hp = 50;
  private readonly maxHp = 50;
  private hpText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dummy-placeholder');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.allowGravity = false;

    this.hpText = scene.add
      .text(x, y - 40, `${this.hp}/${this.maxHp}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }

  takeDamage(amount: number): void {
    if (this.isDead()) return;

    this.hp = Math.max(0, this.hp - amount);
    this.hpText.setText(`${this.hp}/${this.maxHp}`);
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => this.clearTint());

    if (this.hp <= 0) {
      this.setVisible(false);
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
      this.hpText.setVisible(false);
      this.scene.time.delayedCall(2000, () => this.respawn());
    }
  }

  private respawn(): void {
    this.hp = this.maxHp;
    this.hpText.setText(`${this.hp}/${this.maxHp}`);
    this.hpText.setVisible(true);
    this.setVisible(true);
    (this.body as Phaser.Physics.Arcade.Body).enable = true;
  }

  isDead(): boolean {
    return this.hp <= 0;
  }
}

export default class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;
  private dummy!: TrainingDummy;
  private playerHpText!: Phaser.GameObjects.Text;

  // Plain tömb Group helyett — így elkerüljük, hogy a Phaser Arcade Group
  // automatikusan felülírja a fireball sebességét/gravitációját .add()-nál.
  private fireballs: Fireball[] = [];

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

    this.dummy = new TrainingDummy(this, 400, 386);
    this.physics.add.collider(this.dummy, ground);

    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.dummy,
      this.handlePlayerHitDummy,
      undefined,
      this
    );

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      const fireball = new Fireball(this, x, y, direction);
      this.fireballs.push(fireball);
    });

    this.physics.add.overlap(
      this.fireballs,
      this.dummy,
      this.handleFireballHitDummy,
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

    this.input.keyboard?.addKey('H').on('down', () => {
      this.player.takeDamage(20);
    });
  }

  update(): void {
    this.controller.update();
    this.playerHpText.setText(`HP: ${this.player.getHP()}/${this.player.getMaxHP()}`);

    // FONTOS: helyben módosítjuk a tömböt (splice), nem hozunk létre újat (filter),
    // mert a physics.add.overlap/collider a tömb REFERENCIÁJÁT tárolja el létrehozáskor.
    // Egy új tömb visszaírása "leválasztaná" a collidereket az új lövedékekről.
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      if (!this.fireballs[i].active) {
        this.fireballs.splice(i, 1);
      }
    }
  }

  private handlePlayerHitDummy(
    hitbox: Phaser.GameObjects.GameObject,
    dummyObj: Phaser.GameObjects.GameObject
  ): void {
    const dummy = dummyObj as TrainingDummy;
    if (this.player.hasHitTarget(dummy)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    dummy.takeDamage(damage);
    this.player.registerHit(dummy);
  }

  private handleFireballHitDummy(
    fireballObj: Phaser.GameObjects.GameObject,
    dummyObj: Phaser.GameObjects.GameObject
  ): void {
    const fireball = fireballObj as Fireball;
    const dummy = dummyObj as TrainingDummy;
    if (!fireball.active || fireball.hasAlreadyHit() || dummy.isDead()) return;

    dummy.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }
}