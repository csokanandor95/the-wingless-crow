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

export const MAX_HP = 40;
export const PATROL_SPEED = 50;
export const CHASE_SPEED = 100;
export const PATROL_RANGE = 80;
export const DETECTION_RANGE = 220;
export const LOSE_RANGE = 320; // hiszterézis, hogy ne pattogjon PATROL/CHASE között
export const ATTACK_RANGE = 42;
export const ATTACK_DAMAGE = 8;
export const ATTACK_STARTUP_MS = 300;
export const ATTACK_COOLDOWN_MS = 900;
export const VERTICAL_DETECTION_RANGE = 50; // csak nagyjából azonos szinten lévő playert észlel PATROL-ból
export const DIRECTION_DEADZONE = 4; // ha vízszintesen szinte egy vonalban van, ne pattogjon az irány

export interface HollowConfig {
  /** Abszolút világ-X határok a patrol mozgáshoz. Ha nincs megadva: spawn ± PATROL_RANGE. */
  patrolMinX?: number;
  patrolMaxX?: number;
  /** Ha true, CHASE közben sem lép ki a határokon (platformon álló enemy nem esik le). */
  clampChaseToBounds?: boolean;
}

export default class Hollow extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public hollowState: HollowState = HollowState.PATROL;

  private hp = MAX_HP;
  private readonly maxHp = MAX_HP;
  private hpText: Phaser.GameObjects.Text;

  private readonly patrolMinX: number;
  private readonly patrolMaxX: number;
  private readonly clampChaseToBounds: boolean;
  private patrolDirection: 1 | -1 = 1;
  private isAttackBusy = false;
  private playerRef: Player | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: HollowConfig = {}) {
    super(scene, x, y, 'hollow-placeholder');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.patrolMinX = config.patrolMinX ?? x - PATROL_RANGE;
    this.patrolMaxX = config.patrolMaxX ?? x + PATROL_RANGE;
    this.clampChaseToBounds = config.clampChaseToBounds ?? false;

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

    // A passzív detektálás (PATROL -> CHASE) vízszintes ÉS vertikális küszöböt is megkövetel —
    // enélkül egy közvetlenül fent/lent (más platformon) álló player is "közelinek" számítana,
    // hiszen ilyenkor pont a vízszintes távolság a kicsi. A közelharci támadás (ATTACK_RANGE,
    // resolveAttackHit) viszont marad teljes 2D távolság, hogy ne lehessen "a padlón át"
    // eltalálni egy másik platformon álló playert.
    const horizontalDistance = Math.abs(this.x - player.x);
    const verticalDistance = Math.abs(this.y - player.y);
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.hollowState) {
      case HollowState.PATROL:
        this.updatePatrol(horizontalDistance, verticalDistance);
        break;
      case HollowState.CHASE:
        this.updateChase(player, horizontalDistance, distanceToPlayer);
        break;
      case HollowState.ATTACK:
      case HollowState.COOLDOWN:
        // Az attack/cooldown időzítését delayedCall vezérli, itt csak a player felé fordulunk.
        this.setVelocityX(0);
        this.setFlipX(player.x < this.x);
        break;
    }
  }

  private updatePatrol(horizontalDistance: number, verticalDistance: number): void {
    // DETECT PLAYER: csak akkor, ha vízszintesen ÉS nagyjából azonos magasságban van a player.
    if (horizontalDistance <= DETECTION_RANGE && verticalDistance <= VERTICAL_DETECTION_RANGE) {
      this.hollowState = HollowState.CHASE;
      return;
    }

    if (this.x <= this.patrolMinX) this.patrolDirection = 1;
    if (this.x >= this.patrolMaxX) this.patrolDirection = -1;

    this.setVelocityX(PATROL_SPEED * this.patrolDirection);
    this.setFlipX(this.patrolDirection < 0);
  }

  private updateChase(player: Player, horizontalDistance: number, distanceToPlayer: number): void {
    if (horizontalDistance > LOSE_RANGE) {
      this.hollowState = HollowState.PATROL;
      return;
    }

    if (distanceToPlayer <= ATTACK_RANGE) {
      this.startAttack();
      return;
    }

    // Ha (majdnem) pontosan egy vonalban van vízszintesen, de nem érhető el (pl. vertikálisan
    // elválasztva egy tűzgolyós ébresztés után), ne villogjon az irány — egyszerűen megáll,
    // ahelyett hogy 1px-enként balra-jobbra pattogna a célpont X-koordinátája körül.
    if (horizontalDistance <= DIRECTION_DEADZONE) {
      this.setVelocityX(0);
      return;
    }

    const direction = player.x < this.x ? -1 : 1;

    // Platformon álló enemy: a peremnél megáll üldözés közben is, nem sétál le.
    if (
      this.clampChaseToBounds &&
      ((direction < 0 && this.x <= this.patrolMinX) ||
        (direction > 0 && this.x >= this.patrolMaxX))
    ) {
      this.setVelocityX(0);
      this.setFlipX(direction < 0);
      return;
    }

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

    // Bármilyen sebzés (pl. tűzgolyó) PATROL alatt azonnali észlelést vált ki,
    // akkor is, ha a player még a DETECTION_RANGE-en kívül van.
    if (this.hollowState === HollowState.PATROL) {
      this.hollowState = HollowState.CHASE;
    }

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

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}