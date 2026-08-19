import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';

// Projektterv 12. pont – Boss: The Grafted Wing-Breaker.
//
// Phase 1: sword slash + távoli projectile (a player át tudja ugrani) + basic movement.
// Phase 2 (50% HP alatt): gyorsabb mozgás + charge támadás egyenes vonalban, piros
// villanásos telegraph-fal (~1s windup), utána 3 mp csend.
//
// A Hollow.ts mintáját követi: state machine + delayedCall-láncok az időzítéshez, és
// minden hangolható szám exportált konstans, hogy a unit tesztek ne égessenek be
// nyers értékeket.
export enum BossState {
  /** Belépő (boss entrance) alatt: nem mozog, nem támad, nem sebezhető. */
  DORMANT = 'DORMANT',
  APPROACH = 'APPROACH',
  SLASH = 'SLASH',
  PROJECTILE = 'PROJECTILE',
  CHARGE_WINDUP = 'CHARGE_WINDUP',
  CHARGE = 'CHARGE',
  COOLDOWN = 'COOLDOWN',
  DEAD = 'DEAD',
}

export const MAX_HP = 240;
export const PHASE2_HP_RATIO = 0.5;

export const MOVE_SPEED_P1 = 70;
export const MOVE_SPEED_P2 = 120;

export const SLASH_RANGE = 70;
export const SLASH_DAMAGE = 18;
export const SLASH_STARTUP_MS = 400;

export const PROJECTILE_MIN_RANGE = 160;
export const PROJECTILE_STARTUP_MS = 500;
export const PROJECTILE_COOLDOWN_MS = 2200;
export const PROJECTILE_DAMAGE = 15;
export const PROJECTILE_SPEED = 260;
/** A lövedék a boss ALSÓ felénél indul, kb. a player mellmagasságában — így át lehet ugrani. */
export const PROJECTILE_SPAWN_OFFSET_X = 44;
export const PROJECTILE_SPAWN_OFFSET_Y = 30;

export const CHARGE_MIN_RANGE = 200;
export const CHARGE_VERTICAL_TOLERANCE = 60;
export const CHARGE_WINDUP_MS = 1000;
export const CHARGE_SPEED = 420;
export const CHARGE_DAMAGE = 25;
export const CHARGE_HIT_RANGE = 52; // boss félszélesség (32) + player félszélesség (16) + tolerancia
export const CHARGE_MAX_MS = 1200;
export const CHARGE_COOLDOWN_MS = 3000; // Project_plan 12. pont: a charge után 3 mp-ig nem támad

/** Slash/projectile utáni rövid pihenő, mielőtt újra dönt. */
export const ACTION_COOLDOWN_MS = 900;

/**
 * Ha a player vízszintesen szinte pontosan a boss felett/alatt áll (pl. az aréna
 * platformján), a "merre induljak" döntés nulla körül minden frame-ben átbillenne, és a
 * boss balra-jobbra rezegne. Ugyanaz a védelem, mint a Hollow DIRECTION_DEADZONE-ja.
 */
export const DIRECTION_DEADZONE = 6;

const HIT_FLASH_MS = 100;
const CHARGE_TELEGRAPH_TINT = 0xff2222;

export default class GraftedWingBreaker
  extends Phaser.Physics.Arcade.Sprite
  implements Damageable
{
  public bossState: BossState = BossState.DORMANT;

  private phase: 1 | 2 = 1;
  private hp = MAX_HP;

  private isActionBusy = false;
  private canShoot = true;
  private canCharge = false; // csak Phase 2-ben nyílik meg
  private chargeDirection: 1 | -1 = 1;
  private hasHitThisCharge = false;

  private playerRef: Player | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss-placeholder');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
  }

  /** A scene a belépő-animáció végén hívja: innentől él a state machine. */
  activate(): void {
    if (this.bossState !== BossState.DORMANT) return;
    this.bossState = BossState.APPROACH;
  }

  // A scene minden frame-ben meghívja, átadva a player referenciát (Hollow.update mintája).
  update(player: Player): void {
    if (this.bossState === BossState.DEAD || this.bossState === BossState.DORMANT) return;

    this.playerRef = player;

    const horizontalDistance = Math.abs(this.x - player.x);
    const verticalDistance = Math.abs(this.y - player.y);
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.bossState) {
      case BossState.APPROACH:
        this.updateApproach(player, horizontalDistance, verticalDistance, distanceToPlayer);
        break;
      case BossState.CHARGE:
        this.updateCharge(distanceToPlayer);
        break;
      case BossState.SLASH:
      case BossState.PROJECTILE:
      case BossState.CHARGE_WINDUP:
      case BossState.COOLDOWN:
        // Ezeket delayedCall-láncok vezérlik; itt csak megállunk és a player felé fordulunk.
        // (CHARGE_WINDUP alatt az irány már rögzített, ezért ott nem fordulunk utána.)
        this.setVelocityX(0);
        if (this.bossState !== BossState.CHARGE_WINDUP) this.setFlipX(player.x < this.x);
        break;
    }
  }

  /**
   * Támadás-választás. SZÁNDÉKOSAN determinisztikus (nincs véletlen), hogy a unit tesztek
   * ne legyenek flaky-k, és hogy a player fel tudja ismerni a boss mintáit.
   */
  private updateApproach(
    player: Player,
    horizontalDistance: number,
    verticalDistance: number,
    distanceToPlayer: number
  ): void {
    if (this.isActionBusy) return;

    if (distanceToPlayer <= SLASH_RANGE) {
      this.startSlash();
      return;
    }

    if (
      this.phase === 2 &&
      this.canCharge &&
      horizontalDistance > CHARGE_MIN_RANGE &&
      verticalDistance <= CHARGE_VERTICAL_TOLERANCE
    ) {
      this.startChargeWindup(player);
      return;
    }

    if (this.canShoot && distanceToPlayer > PROJECTILE_MIN_RANGE) {
      this.startProjectile();
      return;
    }

    // Vízszintesen (majdnem) egy vonalban lévő, de el nem érhető cél: megállunk,
    // különben az irány frame-enként átbillenne.
    if (horizontalDistance <= DIRECTION_DEADZONE) {
      this.setVelocityX(0);
      return;
    }

    // Nincs kész támadás: közelítünk. A projectile/charge saját cooldownja miatt a boss
    // a lövések között ténylegesen elindul a player felé, nem áll távolról tüzelve.
    const direction = player.x < this.x ? -1 : 1;
    this.setVelocityX(this.moveSpeed() * direction);
    this.setFlipX(direction < 0);
  }

  private updateCharge(distanceToPlayer: number): void {
    // Roham közben legfeljebb egyszer sebez (hasHitThisCharge), különben minden frame-ben
    // újra eltalálná az útjába kerülő playert.
    if (
      !this.hasHitThisCharge &&
      this.playerRef &&
      !this.playerRef.isDead() &&
      distanceToPlayer <= CHARGE_HIT_RANGE
    ) {
      this.hasHitThisCharge = true;
      this.playerRef.takeDamage(CHARGE_DAMAGE);
    }

    // Az aréna falának ütközve a roham idő előtt véget ér.
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.left || body.blocked.right) {
      this.endCharge();
      return;
    }

    this.setVelocityX(CHARGE_SPEED * this.chargeDirection);
  }

  private startSlash(): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.bossState = BossState.SLASH;
    this.setVelocityX(0);
    this.setTint(0xffcc66);

    this.scene.time.delayedCall(SLASH_STARTUP_MS, () => {
      if (this.bossState === BossState.DEAD) return;
      this.clearTint();
      this.resolveSlashHit();
      this.enterCooldown(ACTION_COOLDOWN_MS);
    });
  }

  private resolveSlashHit(): void {
    if (!this.playerRef || this.playerRef.isDead()) return;

    const distance = Phaser.Math.Distance.Between(
      this.x, this.y, this.playerRef.x, this.playerRef.y
    );

    // Kis tolerancia (+10px), mint a Hollow-nál: ha a player épp kimozdult, még találat.
    if (distance <= SLASH_RANGE + 10) {
      this.playerRef.takeDamage(SLASH_DAMAGE);
    }
  }

  // A boss NEM hozza létre a lövedéket, csak eventet emittál — ugyanaz a minta, mint a
  // Player.castFireball() 'fireball-cast'-ja. Így a boss nem függ a Fireball/scene
  // implementációtól, és unit tesztben az emisszió közvetlenül megfigyelhető.
  private startProjectile(): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canShoot = false;
    this.bossState = BossState.PROJECTILE;
    this.setVelocityX(0);
    this.setTint(0x9955ff);

    const direction: 1 | -1 = this.playerRef && this.playerRef.x < this.x ? -1 : 1;
    this.setFlipX(direction < 0);

    this.scene.time.delayedCall(PROJECTILE_STARTUP_MS, () => {
      if (this.bossState === BossState.DEAD) return;
      this.clearTint();
      this.emit(
        'boss-projectile',
        this.x + direction * PROJECTILE_SPAWN_OFFSET_X,
        this.y + PROJECTILE_SPAWN_OFFSET_Y,
        direction
      );
      this.enterCooldown(ACTION_COOLDOWN_MS);
    });

    this.scene.time.delayedCall(PROJECTILE_COOLDOWN_MS, () => {
      this.canShoot = true;
    });
  }

  private startChargeWindup(player: Player): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canCharge = false;
    this.bossState = BossState.CHARGE_WINDUP;
    this.setVelocityX(0);
    this.setTint(CHARGE_TELEGRAPH_TINT); // piros villanás (Project_plan 12. pont)

    // Az irány a windup ELEJÉN rögzül: a roham egyenes vonalú, nem követi a playert.
    this.chargeDirection = player.x < this.x ? -1 : 1;
    this.setFlipX(this.chargeDirection < 0);
    this.emit('boss-charge-windup', this.chargeDirection);

    this.scene.time.delayedCall(CHARGE_WINDUP_MS, () => {
      if (this.bossState === BossState.DEAD) return;
      this.beginCharge();
    });
  }

  private beginCharge(): void {
    this.bossState = BossState.CHARGE;
    this.hasHitThisCharge = false;
    this.setVelocityX(CHARGE_SPEED * this.chargeDirection);

    this.scene.time.delayedCall(CHARGE_MAX_MS, () => {
      // Falnak ütközve az updateCharge() már lezárta — akkor ez no-op.
      if (this.bossState !== BossState.CHARGE) return;
      this.endCharge();
    });
  }

  private endCharge(): void {
    this.clearTint();
    this.setVelocityX(0);
    this.enterCooldown(CHARGE_COOLDOWN_MS, true);
  }

  private enterCooldown(durationMs: number, restoreCharge = false): void {
    this.bossState = BossState.COOLDOWN;
    this.setVelocityX(0);

    this.scene.time.delayedCall(durationMs, () => {
      this.isActionBusy = false;
      if (restoreCharge) this.canCharge = true;
      if (this.bossState === BossState.DEAD) return;
      this.bossState = BossState.APPROACH;
    });
  }

  takeDamage(amount: number): void {
    // A belépő alatt sebezhetetlen: a fight még el sem kezdődött.
    if (this.bossState === BossState.DEAD || this.bossState === BossState.DORMANT) return;

    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xffffff);

    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.bossState === BossState.DEAD) return;
      // A charge piros telegraph-ját nem szabad letörölni egy hit-villanással: a player
      // ebből olvassa ki, hogy jön a roham.
      if (this.bossState === BossState.CHARGE_WINDUP) {
        this.setTint(CHARGE_TELEGRAPH_TINT);
        return;
      }
      this.clearTint();
    });

    if (this.hp <= 0) {
      this.die();
      return;
    }

    if (this.phase === 1 && this.hp <= MAX_HP * PHASE2_HP_RATIO) {
      this.enterPhase2();
    }
  }

  private enterPhase2(): void {
    this.phase = 2;
    this.canCharge = true;
    this.emit('boss-phase-change', 2);
  }

  private die(): void {
    this.bossState = BossState.DEAD;
    this.setVelocity(0, 0);
    this.setTint(0x332233);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.emit('boss-death');
  }

  private moveSpeed(): number {
    return this.phase === 2 ? MOVE_SPEED_P2 : MOVE_SPEED_P1;
  }

  getPhase(): 1 | 2 {
    return this.phase;
  }

  isDead(): boolean {
    return this.bossState === BossState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}
