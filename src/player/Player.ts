import Phaser from 'phaser';
import { AttackType, ATTACK_CONFIGS, AttackConfig } from '../combat/Attack';
import { FIREBALL_CONFIG } from '../combat/Projectile';
import type { Damageable } from '../combat/DamageSystem';

export enum PlayerState {
  IDLE = 'IDLE',
  RUN = 'RUN',
  JUMP = 'JUMP',
  FALL = 'FALL',
  ATTACK = 'ATTACK',
  CAST = 'CAST',
  HURT = 'HURT',
  DEAD = 'DEAD',
}

const MOVE_SPEED = 200;
const JUMP_VELOCITY = -500;
const MAX_HP = 100;
const CAST_DELAY_MS = 120;

export default class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public playerState: PlayerState = PlayerState.IDLE;

  private hp = MAX_HP;
  private isAttacking = false;
  private canAttack = true;
  private isCasting = false;
  private canCastFireball = true;

  private attackHitbox: Phaser.GameObjects.Zone;
  private attackHitboxBody: Phaser.Physics.Arcade.Body;
  private hitTargetsThisAttack: Set<Phaser.GameObjects.GameObject> = new Set();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-placeholder');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.attackHitbox = scene.add.zone(x, y, 10, 10);
    scene.physics.add.existing(this.attackHitbox);
    this.attackHitboxBody = this.attackHitbox.body as Phaser.Physics.Arcade.Body;
    this.attackHitboxBody.setAllowGravity(false);
    this.attackHitboxBody.enable = false;
  }

  getAttackHitbox(): Phaser.GameObjects.Zone {
    return this.attackHitbox;
  }

  moveLeft(): void {
    if (this.isLocked()) return;
    this.setVelocityX(-MOVE_SPEED);
    this.setFlipX(true);
    if (this.isGrounded()) this.playerState = PlayerState.RUN;
  }

  moveRight(): void {
    if (this.isLocked()) return;
    this.setVelocityX(MOVE_SPEED);
    this.setFlipX(false);
    if (this.isGrounded()) this.playerState = PlayerState.RUN;
  }

  stop(): void {
    if (this.isLocked()) return;
    this.setVelocityX(0);
    if (this.isGrounded()) this.playerState = PlayerState.IDLE;
  }

  jump(): void {
    if (this.isLocked()) return;
    if (this.isGrounded()) {
      this.setVelocityY(JUMP_VELOCITY);
      this.playerState = PlayerState.JUMP;
    }
  }

  attackLight(): void {
    this.performAttack(AttackType.LIGHT);
  }

  attackHeavy(): void {
    this.performAttack(AttackType.HEAVY);
  }

  private performAttack(type: AttackType): void {
    if (this.isLocked() || !this.canAttack) return;

    const config = ATTACK_CONFIGS[type];
    this.isAttacking = true;
    this.canAttack = false;
    this.playerState = PlayerState.ATTACK;
    this.hitTargetsThisAttack.clear();
    this.setVelocityX(0);

    this.setTint(0xffcc66);

    this.scene.time.delayedCall(config.startupDelayMs, () => {
      if (this.playerState === PlayerState.DEAD) return;
      this.enableHitbox(config);

      this.scene.time.delayedCall(config.activeDurationMs, () => {
        this.disableHitbox();
      });
    });

    this.scene.time.delayedCall(config.startupDelayMs + config.activeDurationMs, () => {
      this.isAttacking = false;
      this.clearTint();
      if (this.playerState === PlayerState.ATTACK) {
        this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
      }
    });

    this.scene.time.delayedCall(config.cooldownMs, () => {
      this.canAttack = true;
    });
  }

  private enableHitbox(config: AttackConfig): void {
    const direction = this.flipX ? -1 : 1;
    const offsetX = config.hitboxOffsetX * direction;

    this.attackHitboxBody.setSize(config.hitboxWidth, config.hitboxHeight);
    this.attackHitboxBody.reset(this.x + offsetX, this.y);
    this.attackHitboxBody.enable = true;
    this.attackHitbox.setData('damage', config.damage);
  }

  private disableHitbox(): void {
    this.attackHitboxBody.enable = false;
  }

  hasHitTarget(target: Phaser.GameObjects.GameObject): boolean {
    return this.hitTargetsThisAttack.has(target);
  }

  registerHit(target: Phaser.GameObjects.GameObject): void {
    this.hitTargetsThisAttack.add(target);
  }

  // Fireball castolás: elindítja a CAST state-et, majd egy rövid startup delay után
  // 'fireball-cast' eventet emittál — a scene ezt figyeli és hozza létre a Fireballt.
  // A Player így nem függ közvetlenül a Fireball/scene projectile-group implementációtól.
  castFireball(): void {
    if (this.isLocked() || !this.canCastFireball) return;

    this.isCasting = true;
    this.canCastFireball = false;
    this.playerState = PlayerState.CAST;
    this.setVelocityX(0);
    this.setTint(0x66aaff);

    this.scene.time.delayedCall(CAST_DELAY_MS, () => {
      this.isCasting = false;
      this.clearTint();

      if (this.playerState === PlayerState.DEAD) return;

      const direction = this.flipX ? -1 : 1;
      this.emit('fireball-cast', this.x + direction * 20, this.y, direction);

      if (this.playerState === PlayerState.CAST) {
        this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
      }
    });

    this.scene.time.delayedCall(FIREBALL_CONFIG.cooldownMs, () => {
      this.canCastFireball = true;
    });
  }

  takeDamage(amount: number): void {
    if (this.playerState === PlayerState.DEAD) return;

    this.hp = Math.max(0, this.hp - amount);
    this.playerState = PlayerState.HURT;
    this.setTint(0xff0000);

    this.scene.time.delayedCall(150, () => {
      this.clearTint();
      if (this.hp <= 0) {
        this.die();
      } else if (this.playerState === PlayerState.HURT) {
        this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
      }
    });
  }

  private die(): void {
    this.playerState = PlayerState.DEAD;
    this.setVelocity(0, 0);
    this.disableHitbox();
    this.setTint(0x555555);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
  }

  isDead(): boolean {
    return this.playerState === PlayerState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }

  private isLocked(): boolean {
    return (
      this.playerState === PlayerState.DEAD ||
      this.playerState === PlayerState.HURT ||
      this.playerState === PlayerState.ATTACK ||
      this.playerState === PlayerState.CAST
    );
  }

  isGrounded(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  updateState(): void {
    if (this.isLocked() || this.isAttacking || this.isCasting) return;

    if (!this.isGrounded()) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.playerState = body.velocity.y < 0 ? PlayerState.JUMP : PlayerState.FALL;
    }
  }
}