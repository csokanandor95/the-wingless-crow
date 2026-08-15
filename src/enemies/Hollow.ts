import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';

// Projektterv 11. pont – Enemy 1 (Hollow/Knight) state machine:
// PATROL → DETECT PLAYER → CHASE → ATTACK → COOLDOWN → CHASE
export enum HollowState {
  PATROL = 'PATROL',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  COOLDOWN = 'COOLDOWN',
  DEAD = 'DEAD',
}

const MAX_HP = 40;
const PATROL_SPEED = 50;
const CHASE_SPEED = 100;
const PATROL_RANGE = 80;
const DETECTION_RANGE = 220;
const LOSE_RANGE = 320; // hiszterézis, hogy ne pattogjon PATROL/CHASE között
const ATTACK_RANGE = 42;
const ATTACK_DAMAGE = 8;
const ATTACK_STARTUP_MS = 300;
const ATTACK_COOLDOWN_MS = 900;

export default class Hollow extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public hollowState: HollowState = HollowState.PATROL;

  private hp = MAX_HP;
  private readonly maxHp = MAX_HP;
  private hpText: Phaser.GameObjects.Text;

  private readonly patrolOriginX: number;
  private patrolDirection: 1 | -1 = 1;
  private isAttackBusy = false;
  private playerRef: Player | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'hollow-placeholder');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.patrolOriginX = x;

    this.hpText = scene.add
      .text(x, y - 36, `${this.hp}/${this.maxHp}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }

  // A scene minden frame-ben meghívja, átadva a player referenciát.
  update(player: Player): void {
    if (this.hollowState === HollowState.DEAD) return;

    this.playerRef = player;
    this.hpText.setPosition(this.x, this.y - 36);

    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.hollowState) {
      case HollowState.PATROL:
        this.updatePatrol(distanceToPlayer);
        break;
      case HollowState.CHASE:
        this.updateChase(player, distanceToPlayer);
        break;
      case HollowState.ATTACK:
      case HollowState.COOLDOWN:
        // Az attack/cooldown időzítését delayedCall vezérli, itt csak a player felé fordulunk.
        this.setVelocityX(0);
        this.setFlipX(player.x < this.x);
        break;
    }
  }

  private updatePatrol(distanceToPlayer: number): void {
    // DETECT PLAYER esemény: azonnali átváltás CHASE-re.
    if (distanceToPlayer <= DETECTION_RANGE) {
      this.hollowState = HollowState.CHASE;
      return;
    }

    const leftBound = this.patrolOriginX - PATROL_RANGE;
    const rightBound = this.patrolOriginX + PATROL_RANGE;

    if (this.x <= leftBound) this.patrolDirection = 1;
    if (this.x >= rightBound) this.patrolDirection = -1;

    this.setVelocityX(PATROL_SPEED * this.patrolDirection);
    this.setFlipX(this.patrolDirection < 0);
  }

  private updateChase(player: Player, distanceToPlayer: number): void {
    if (distanceToPlayer > LOSE_RANGE) {
      this.hollowState = HollowState.PATROL;
      return;
    }

    if (distanceToPlayer <= ATTACK_RANGE) {
      this.startAttack();
      return;
    }

    const direction = player.x < this.x ? -1 : 1;
    this.setVelocityX(CHASE_SPEED * direction);
    this.setFlipX(direction < 0);
  }

  private startAttack(): void {
    if (this.isAttackBusy) return;

    this.isAttackBusy = true;
    this.hollowState = HollowState.ATTACK;
    this.setVelocityX(0);
    this.setTint(0xff9955);

    this.scene.time.delayedCall(ATTACK_STARTUP_MS, () => {
      if (this.hollowState === HollowState.DEAD) return;
      this.clearTint();
      this.resolveAttackHit();

      this.hollowState = HollowState.COOLDOWN;
      this.scene.time.delayedCall(ATTACK_COOLDOWN_MS, () => {
        this.isAttackBusy = false;
        if (this.hollowState === HollowState.DEAD) return;
        this.hollowState = HollowState.CHASE;
      });
    });
  }

  private resolveAttackHit(): void {
    if (!this.playerRef || this.playerRef.isDead()) return;

    const distance = Phaser.Math.Distance.Between(
      this.x, this.y, this.playerRef.x, this.playerRef.y
    );

    // Kis tolerancia (+10px), hogy ha a player időközben kicsit kimozdult, még számítson találatnak.
    if (distance <= ATTACK_RANGE + 10) {
      this.playerRef.takeDamage(ATTACK_DAMAGE);
    }
  }

  takeDamage(amount: number): void {
    if (this.hollowState === HollowState.DEAD) return;

    this.hp = Math.max(0, this.hp - amount);
    this.hpText.setText(`${this.hp}/${this.maxHp}`);
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.hollowState !== HollowState.DEAD) this.clearTint();
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.hollowState = HollowState.DEAD;
    this.setVelocity(0, 0);
    this.setTint(0x333333);
    this.hpText.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
  }

  isDead(): boolean {
    return this.hollowState === HollowState.DEAD;
  }
}