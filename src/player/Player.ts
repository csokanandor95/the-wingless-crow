import Phaser from 'phaser';
import { AttackType, ATTACK_CONFIGS, AttackConfig } from '../combat/Attack';
import { FIREBALL_CONFIG } from '../combat/Projectile';
import type { Damageable } from '../combat/DamageSystem';
import {
  animKeyForState,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  BODY_WIDTH,
  CAST_ANIM_MS,
  HURT_ANIM_MS,
  ORIGIN_Y,
  PLAYER_TEXTURES,
} from './PlayerAnimations';

export enum PlayerState {
  IDLE = 'IDLE',
  RUN = 'RUN',
  JUMP = 'JUMP',
  FALL = 'FALL',
  ATTACK = 'ATTACK',
  CAST = 'CAST',
  HURT = 'HURT',
  CLIMB = 'CLIMB',
  DEAD = 'DEAD',
}

/**
 * Egy létra "sínje", amit a scene ad át a playernek minden frame-ben.
 * A topY/bottomY a player KÖZÉPPONTJÁNAK megengedett szélsőértékei, nem a létra grafikájáé.
 */
export interface LadderContact {
  centerX: number;
  topY: number;
  bottomY: number;
}

export const MOVE_SPEED = 200;
export const JUMP_VELOCITY = -500;
export const MAX_HP = 100;
// A cast- és a hurt-lock hossza az ANIMÁCIÓK hosszából jön (PlayerAnimations.ts), hogy a
// kettő ne csúszhasson el egymástól: a fireball pont akkor születik, amikor a lovag kezében
// szikrákra pattan a gömb, és a HURT state pont a hurt animáció végéig tart.
export const CAST_DELAY_MS = CAST_ANIM_MS;
export const HURT_LOCK_MS = HURT_ANIM_MS;
export const CLIMB_SPEED = 130;
/** A fireball a lovag felemelt keze magasságában szülessen, ne a sprite közepén. */
const FIREBALL_SPAWN_OFFSET_Y = -8;

export default class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public playerState: PlayerState = PlayerState.IDLE;

  private hp = MAX_HP;
  private isAttacking = false;
  private canAttack = true;
  private isCasting = false;
  private canCastFireball = true;

  private ladder: LadderContact | null = null;
  private climbing = false;

  private attackHitbox: Phaser.GameObjects.Zone;
  private attackHitboxBody: Phaser.Physics.Arcade.Body;
  private hitTargetsThisAttack: Set<Phaser.GameObjects.GameObject> = new Set();

  /** Az épp lejátszott animáció kulcsa — lásd playAnim(). */
  private currentAnimKey: string | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_TEXTURES.IDLE, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // A sprite frame-je 128x64, de a rajzolt karakter csak ~28x46 ezen belül. Az origin
    // úgy van megválasztva, hogy a TALP a sprite.y + 24-nél legyen (lásd ORIGIN_Y).
    this.setOrigin(0.5, ORIGIN_Y);

    // Közvetlenül a body-n, NEM a sprite setSize()/setOffset()-jén: az Arcade.Sprite-on a
    // Components.Size verziója árnyékolja a GameObject-ét, és a kettő mást csinál
    // (logikai megjelenítési méret vs. physics body). A setSize center paramétere false,
    // különben újraközpontozná — és felülírná — az utána beállított offsetet.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    body.setOffset(BODY_OFFSET_X, BODY_OFFSET_Y);

    this.attackHitbox = scene.add.zone(x, y, 10, 10);
    scene.physics.add.existing(this.attackHitbox);
    this.attackHitboxBody = this.attackHitbox.body as Phaser.Physics.Arcade.Body;
    this.attackHitboxBody.setAllowGravity(false);
    this.attackHitboxBody.enable = false;

    // Enélkül a player a legelső updateState()-ig a sheet 0. frame-jén állna mozdulatlanul.
    this.updateAnimation();
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

  // Korábban `stop()` volt, ami elfedte a Phaser Sprite.stop()-ját (az animációt állítja
  // meg). Amíg nem volt valódi animáció, ez ártalmatlan volt; a Phase 8 sprite-jaival
  // viszont már ütközne, ezért kapott saját nevet.
  stopMoving(): void {
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

  // --- Létra / mászás ---------------------------------------------------
  // A scene minden frame-ben átadja, hogy a player épp létrával fedésben van-e.
  // A mászás egy zárt "sín": a topY/bottomY közé clampeljük a pozíciót, mert
  // climb közben a body.checkCollision.down ki van kapcsolva (hogy az egyirányú
  // felső platformon át lehessen mászni), így a talaj sem fogná meg lefelé.

  setLadderContact(contact: LadderContact | null): void {
    this.ladder = contact;
    if (!contact && this.climbing) this.exitLadder();
  }

  isOnLadder(): boolean {
    return this.ladder !== null;
  }

  isClimbing(): boolean {
    return this.climbing;
  }

  climb(direction: -1 | 1): void {
    if (this.isLocked() || !this.ladder) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (!this.climbing) {
      this.climbing = true;
      body.setAllowGravity(false);
      body.checkCollision.down = false;
    }

    this.playerState = PlayerState.CLIMB;
    this.setVelocityX(0);
    // Lágy rásnapelés a létra közepére, hogy ne lógjon félig mellette.
    this.x = Phaser.Math.Linear(this.x, this.ladder.centerX, 0.4);

    this.setVelocityY(direction * CLIMB_SPEED);

    if (direction < 0 && this.y <= this.ladder.topY) {
      this.y = this.ladder.topY;
      this.setVelocityY(0);
    } else if (direction > 0 && this.y >= this.ladder.bottomY) {
      this.y = this.ladder.bottomY;
      this.setVelocityY(0);
    }
  }

  /** Létrán lógás: nincs függőleges input, de a gravitáció továbbra is ki van kapcsolva. */
  climbIdle(): void {
    if (!this.climbing) return;
    this.setVelocity(0, 0);
    this.playerState = PlayerState.CLIMB;
  }

  exitLadder(): void {
    if (!this.climbing) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.climbing = false;
    body.setAllowGravity(true);
    body.checkCollision.down = true;

    if (this.playerState === PlayerState.CLIMB) {
      this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
    }
  }

  jumpOffLadder(): void {
    if (!this.climbing) return;
    this.exitLadder();
    this.setVelocityY(JUMP_VELOCITY);
    this.playerState = PlayerState.JUMP;
  }

  // ----------------------------------------------------------------------

  /** A player egyetlen kardtámadása (J / bal egérgomb). */
  attack(): void {
    this.performAttack(AttackType.SWORD);
  }

  // Paraméteres marad, hogy egy jövőbeli második támadás-típus bekötése egy hívás legyen.
  private performAttack(type: AttackType): void {
    if (this.isLocked() || this.climbing || !this.canAttack) return;

    const config = ATTACK_CONFIGS[type];
    this.isAttacking = true;
    this.canAttack = false;
    this.playerState = PlayerState.ATTACK;
    this.hitTargetsThisAttack.clear();
    this.setVelocityX(0);

    // A korábbi sárga attack-tint elmaradt: a támadás-animáció önmagában közli az infót.
    // Nullázás a playAnim() guardja miatt: két gyors csapás között a kulcs nem változna.
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.time.delayedCall(config.startupDelayMs, () => {
      if (this.playerState === PlayerState.DEAD) return;
      this.enableHitbox(config);

      this.scene.time.delayedCall(config.activeDurationMs, () => {
        this.disableHitbox();
      });
    });

    this.scene.time.delayedCall(config.startupDelayMs + config.activeDurationMs, () => {
      this.isAttacking = false;
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
    if (this.isLocked() || this.climbing || !this.canCastFireball) return;

    this.isCasting = true;
    this.canCastFireball = false;
    this.playerState = PlayerState.CAST;
    this.setVelocityX(0);
    // A korábbi kék cast-tint elmaradt: a cast-animáció (felemelt izzó gömb + szikrák)
    // maga a visszajelzés.
    this.updateAnimation();

    this.scene.time.delayedCall(CAST_DELAY_MS, () => {
      this.isCasting = false;

      if (this.playerState === PlayerState.DEAD) return;

      const direction = this.flipX ? -1 : 1;
      this.emit(
        'fireball-cast',
        this.x + direction * 20,
        this.y + FIREBALL_SPAWN_OFFSET_Y,
        direction
      );

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

    // Sebzés lelöki a létráról — különben HURT után kikapcsolt gravitációval lebegne.
    this.exitLadder();

    this.hp = Math.max(0, this.hp - amount);
    this.playerState = PlayerState.HURT;
    // A piros villanás MARAD az animáció mellett is: a sebzés-visszajelzésnek egy
    // 3 frame-es hurt animációnál erősebbnek kell lennie, hogy harc közben is olvasható legyen.
    this.setTint(0xff0000);
    // Nullázás a playAnim() guardja miatt: két gyors találat között a state végig HURT
    // marad, tehát a kulcs nem változna — a második ütésre nem indulna újra az animáció.
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.time.delayedCall(HURT_LOCK_MS, () => {
      this.clearTint();
      if (this.hp <= 0) {
        this.die();
      } else if (this.playerState === PlayerState.HURT) {
        this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
      }
    });
  }

  private die(): void {
    this.exitLadder();
    this.playerState = PlayerState.DEAD;
    this.setVelocity(0, 0);
    this.disableHitbox();
    // A korábbi szürke tint elmaradt: a Death animáció (a lovag összerogy, majd
    // fekve marad az utolsó frame-en) önmagában közli a halált.
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.updateAnimation();
  }

  // A die() ellentéte: visszaállítja a playert élő, harcra kész állapotba a megadott
  // pozíción. Minden olyan flaget visszaállít, amit a die() "befagyaszt", vagy ami a
  // halál pillanatában épp mászás/támadás-cooldown közben ragadhatott volna.
  respawn(x: number, y: number): void {
    this.hp = MAX_HP;
    this.x = x;
    this.y = y;
    this.setVelocity(0, 0);
    this.clearTint();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(true);
    body.checkCollision.down = true;

    this.isAttacking = false;
    this.canAttack = true;
    this.isCasting = false;
    this.canCastFireball = true;
    this.climbing = false;
    this.ladder = null;
    this.hitTargetsThisAttack.clear();
    this.disableHitbox();

    this.playerState = PlayerState.IDLE;
    // Nullázni KELL: a playAnim() guardja miatt egy „ugyanaz a kulcs” egyébként átugorná
    // az újraindítást, és a halál animáció utolsó (fekvő) frame-jén ragadna a sprite.
    this.currentAnimKey = null;
    this.updateAnimation();
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
    this.applyAirborneState();
    // MINDIG lefut, az applyAirborneState() korai return-jeitől függetlenül — különben
    // pont a lockolt state-ek (ATTACK, HURT, DEAD) és a mászás maradnának animáció nélkül.
    this.updateAnimation();
  }

  private applyAirborneState(): void {
    // Mászás közben nem szabad JUMP/FALL-ra váltani — a CLIMB state-et a climb() vezérli.
    if (this.climbing) return;
    if (this.isLocked() || this.isAttacking || this.isCasting) return;

    if (!this.isGrounded()) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.playerState = body.velocity.y < 0 ? PlayerState.JUMP : PlayerState.FALL;
    }
  }

  private updateAnimation(): void {
    this.playAnim(animKeyForState(this.playerState));

    // Létrán állva (nincs függőleges input) a mászás-animáció fagyjon ki, ne pörögjön
    // a helyben álló lovag alatt.
    if (this.playerState === PlayerState.CLIMB) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y === 0) {
        this.anims.pause();
      } else {
        this.anims.resume();
      }
    }
  }

  /**
   * Csak akkor indít animációt, ha ténylegesen VÁLTOZOTT a kulcs. Enélkül a nem loopoló
   * animációk (DEAD, ATTACK, HURT, CAST) minden frame-ben újraindulnának: a lejátszás
   * végén a `play(key, true)` „ignoreIfPlaying” ága már nem fogna, mert az animáció
   * ilyenkor épp NEM playing — a halál animáció így vég nélkül loopolna.
   */
  private playAnim(key: string): void {
    if (this.currentAnimKey === key) return;
    this.currentAnimKey = key;
    this.play(key, true);
  }
}