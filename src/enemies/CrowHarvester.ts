import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';
import {
  animKeyForState,
  ATTACK_WINDUP_MS,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_OFFSET_X_FLIPPED,
  BODY_OFFSET_Y,
  BODY_WIDTH,
  CROW_HARVESTER_ANIMS,
  DEATH_FADE_MS,
  DEATH_SINK_PX,
  HIT_ANIM_MS,
  ORIGIN_X,
  ORIGIN_X_FLIPPED,
  ORIGIN_Y,
  TEXTURE_KEY,
} from './CrowHarvesterAnimations';

// Projektterv 11. pont – Enemy 1 (CrowHarvester) state machine:
// PATROL → DETECT PLAYER → CHASE → ATTACK → COOLDOWN → CHASE
export enum CrowHarvesterState {
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
// Az ANIMÁCIÓBÓL származik: pont annyi, amennyi idő alatt a kasza a magasból lecsap
// (a fehér ív frame-je). Így a sebzés és a látvány nem tud elcsúszni egymástól.
export const ATTACK_STARTUP_MS = ATTACK_WINDUP_MS;
export const ATTACK_COOLDOWN_MS = 900;
export const VERTICAL_DETECTION_RANGE = 50; // csak nagyjából azonos szinten lévő playert észlel PATROL-ból
export const DIRECTION_DEADZONE = 4; // ha vízszintesen szinte egy vonalban van, ne pattogjon az irány

// A debug HP-szöveg magassága. 46, nem 36: a támadás windupján a magasba emelt kasza
// pont y-36-ig ér, tehát alacsonyabban a szöveg átfedné.
const HP_TEXT_OFFSET_Y = 46;

export interface CrowHarvesterConfig {
  /** Abszolút világ-X határok a patrol mozgáshoz. Ha nincs megadva: spawn ± PATROL_RANGE. */
  patrolMinX?: number;
  patrolMaxX?: number;
  /** Ha true, CHASE közben sem lép ki a határokon (platformon álló enemy nem esik le). */
  clampChaseToBounds?: boolean;
}

export default class CrowHarvester extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public crowHarvesterState: CrowHarvesterState = CrowHarvesterState.PATROL;

  private hp = MAX_HP;
  private readonly maxHp = MAX_HP;
  private hpText: Phaser.GameObjects.Text;

  private readonly patrolMinX: number;
  private readonly patrolMaxX: number;
  private readonly clampChaseToBounds: boolean;
  private patrolDirection: 1 | -1 = 1;
  private isAttackBusy = false;
  private playerRef: Player | null = null;

  /** Az épp lejátszott animáció kulcsa — lásd playAnim(). */
  private currentAnimKey: string | null = null;
  /** Amíg áll, a találat-animációt nem írja felül az idle/walk. */
  private isReacting = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: CrowHarvesterConfig = {}) {
    super(scene, x, y, TEXTURE_KEY, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.patrolMinX = config.patrolMinX ?? x - PATROL_RANGE;
    this.patrolMaxX = config.patrolMaxX ?? x + PATROL_RANGE;
    this.clampChaseToBounds = config.clampChaseToBounds ?? false;

    // A body a köpenyhez igazodik, nem a 64x64-es frame-hez. Közvetlenül a bodyn hívjuk,
    // mert az Arcade.Sprite-on a Components.Size verziója árnyékolja a GameObject-ét
    // (logikai megjelenítési méret vs. physics body), és a center: false kell, különben
    // a setSize újraközpontozná az utána beállított offsetet.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    this.setFacing(false);

    this.hpText = scene.add
      .text(x, y - HP_TEXT_OFFSET_Y, `${this.hp}/${this.maxHp}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.updateAnimation();
  }

  // A scene minden frame-ben meghívja, átadva a player referenciát.
  update(player: Player): void {
    if (this.crowHarvesterState === CrowHarvesterState.DEAD) return;

    this.playerRef = player;
    this.hpText.setPosition(this.x, this.y - HP_TEXT_OFFSET_Y);

    // A passzív detektálás (PATROL -> CHASE) vízszintes ÉS vertikális küszöböt is megkövetel —
    // enélkül egy közvetlenül fent/lent (más platformon) álló player is "közelinek" számítana,
    // hiszen ilyenkor pont a vízszintes távolság a kicsi. A közelharci támadás (ATTACK_RANGE,
    // resolveAttackHit) viszont marad teljes 2D távolság, hogy ne lehessen "a padlón át"
    // eltalálni egy másik platformon álló playert.
    const horizontalDistance = Math.abs(this.x - player.x);
    const verticalDistance = Math.abs(this.y - player.y);
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.crowHarvesterState) {
      case CrowHarvesterState.PATROL:
        this.updatePatrol(horizontalDistance, verticalDistance);
        break;
      case CrowHarvesterState.CHASE:
        this.updateChase(player, horizontalDistance, distanceToPlayer);
        break;
      case CrowHarvesterState.ATTACK:
      case CrowHarvesterState.COOLDOWN:
        // Az attack/cooldown időzítését delayedCall vezérli, itt csak a player felé fordulunk.
        this.setVelocityX(0);
        this.setFacing(player.x < this.x);
        break;
    }

    this.updateAnimation();
  }

  private updatePatrol(horizontalDistance: number, verticalDistance: number): void {
    // DETECT PLAYER: csak akkor, ha vízszintesen ÉS nagyjából azonos magasságban van a player.
    if (horizontalDistance <= DETECTION_RANGE && verticalDistance <= VERTICAL_DETECTION_RANGE) {
      this.crowHarvesterState = CrowHarvesterState.CHASE;
      return;
    }

    if (this.x <= this.patrolMinX) this.patrolDirection = 1;
    if (this.x >= this.patrolMaxX) this.patrolDirection = -1;

    this.setVelocityX(PATROL_SPEED * this.patrolDirection);
    this.setFacing(this.patrolDirection < 0);
  }

  private updateChase(player: Player, horizontalDistance: number, distanceToPlayer: number): void {
    if (horizontalDistance > LOSE_RANGE) {
      this.crowHarvesterState = CrowHarvesterState.PATROL;
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
      this.setFacing(direction < 0);
      return;
    }

    this.setVelocityX(CHASE_SPEED * direction);
    this.setFacing(direction < 0);
  }

  private startAttack(): void {
    if (this.isAttackBusy) return;

    this.isAttackBusy = true;
    this.crowHarvesterState = CrowHarvesterState.ATTACK;
    this.setVelocityX(0);
    // A korábbi narancs windup-tint elmaradt: a telegraph most a magasba emelt kasza,
    // ami olvashatóbb (a sebzés akkor érkezik, amikor a fehér ív megjelenik).
    this.updateAnimation();

    this.scene.time.delayedCall(ATTACK_STARTUP_MS, () => {
      if (this.crowHarvesterState === CrowHarvesterState.DEAD) return;
      this.resolveAttackHit();

      this.crowHarvesterState = CrowHarvesterState.COOLDOWN;
      this.scene.time.delayedCall(ATTACK_COOLDOWN_MS, () => {
        this.isAttackBusy = false;
        if (this.crowHarvesterState === CrowHarvesterState.DEAD) return;
        this.crowHarvesterState = CrowHarvesterState.CHASE;
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
    if (this.crowHarvesterState === CrowHarvesterState.DEAD) return;

    // Bármilyen sebzés (pl. tűzgolyó) PATROL alatt azonnali észlelést vált ki,
    // akkor is, ha a player még a DETECTION_RANGE-en kívül van.
    if (this.crowHarvesterState === CrowHarvesterState.PATROL) {
      this.crowHarvesterState = CrowHarvesterState.CHASE;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hpText.setText(`${this.hp}/${this.maxHp}`);

    if (this.hp <= 0) {
      this.die();
      return;
    }

    // A találat-visszajelzés maga az animáció: a hit frame-ekbe BE VAN ÉGETVE egy fehér
    // villanás, ezért itt nincs tint. (A korábbi setTint(0xffffff) amúgy is no-op volt:
    // a fehér tint azonosság, tehát a Hollow-nak sosem volt látható hit-reakciója.)
    this.playHitReaction();
  }

  /**
   * A hit animáció egyszeri lejátszása. Az `isReacting` flag tartja életben: amíg áll, az
   * updateAnimation() nem írja vissza az idle/walk animációt a következő frame-eken.
   */
  private playHitReaction(): void {
    this.isReacting = true;
    this.currentAnimKey = null; // két gyors találat között is induljon újra a villanás
    this.updateAnimation();

    this.scene.time.delayedCall(HIT_ANIM_MS, () => {
      this.isReacting = false;
    });
  }

  // A csomagban NINCS death animáció, ezért a halál a hit animációból + egy elhalványuló,
  // enyhén megsüllyedő tweenből áll össze — a "kiszipolyozott burok szertefoszlik" képhez.
  private die(): void {
    this.crowHarvesterState = CrowHarvesterState.DEAD;
    this.setVelocity(0, 0);
    this.hpText.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    this.isReacting = false;
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y + DEATH_SINK_PX,
      duration: DEATH_FADE_MS,
      onComplete: () => this.setVisible(false),
    });
  }

  /**
   * Fordulás. A sprite natívan JOBBRA néz, és a lény teste a 64px-es frame BAL oldalán ül
   * (közepe x=14), ezért egy sima setFlipX() 36px-t ugrasztaná oldalra — a flipX ugyanis a
   * FRAME közepére tükröz, nem az originre. Ezt úgy kompenzáljuk, hogy az origint ÉS a
   * body offsetjét együtt tükrözzük: így a test mindkét irányban a sprite.x-en marad.
   */
  private setFacing(faceLeft: boolean): void {
    this.setFlipX(faceLeft);
    this.setOrigin(faceLeft ? ORIGIN_X_FLIPPED : ORIGIN_X, ORIGIN_Y);
    (this.body as Phaser.Physics.Arcade.Body).setOffset(
      faceLeft ? BODY_OFFSET_X_FLIPPED : BODY_OFFSET_X,
      BODY_OFFSET_Y
    );
  }

  private updateAnimation(): void {
    if (this.isReacting) {
      this.playAnim(CROW_HARVESTER_ANIMS.HIT);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.playAnim(animKeyForState(this.crowHarvesterState, body.velocity.x !== 0));
  }

  /**
   * Csak akkor indít animációt, ha ténylegesen VÁLTOZOTT a kulcs. Enélkül a nem loopoló
   * animációk (attack, hit) minden frame-ben újraindulnának: a lejátszás végén a
   * `play(key, true)` „ignoreIfPlaying" ága már nem fog, mert az animáció ilyenkor épp
   * NEM playing. Emiatt minden hely, ami UGYANARRA a kulcsra akar újraindítást
   * (playHitReaction, die), köteles előbb `currentAnimKey = null`-t írni.
   */
  private playAnim(key: string): void {
    if (this.currentAnimKey === key) return;
    this.currentAnimKey = key;
    this.play(key, true);
  }

  isDead(): boolean {
    return this.crowHarvesterState === CrowHarvesterState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}