import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';
import {
  animKeyForState,
  ATTACK_RANGE as ANIM_ATTACK_RANGE,
  ATTACK_WINDUP_MS,
  BEAST_ANIMS,
  BEAST_FACING,
  BODY_HEIGHT,
  BODY_WIDTH,
  CHARGE_HIT_RANGE as ANIM_CHARGE_HIT_RANGE,
  CHARGE_WINDUP_MS as ANIM_CHARGE_WINDUP_MS,
  DEATH_FADE_MS,
  DEATH_SINK_PX,
  HIT_ANIM_MS,
  TEXTURE_KEY,
} from './BeastAnimations';
import { applyFacing } from '../systems/SpriteFacing';

// Projektterv 11. pont – Enemy 3 (Beast) state machine:
// PATROL → DETECT PLAYER → CHARGE → ATTACK → COOLDOWN
//
// A terv doboz-listája VÁLTOZATLANUL érvényes: a `CHASE` a „DETECT PLAYER" utáni közelítő
// állapot, a roham két fázisa (windup + rohanás) pedig a `CHARGE` doboz kifejtése. A
// visszahátrálás NEM külön állapot, hanem a `CHASE` egyik ága — lásd `applyChasePositioning()`.
export enum BeastState {
  PATROL = 'PATROL',
  CHASE = 'CHASE',
  CHARGE_WINDUP = 'CHARGE_WINDUP',
  CHARGE = 'CHARGE',
  ATTACK = 'ATTACK',
  COOLDOWN = 'COOLDOWN',
  DEAD = 'DEAD',
}

export const MAX_HP = 50;

export const PATROL_SPEED = 55;
/** > CrowHarvester CHASE_SPEED (100): a Beast a terv szerint „gyorsabb, agresszívebb". */
export const CHASE_SPEED = 130;
/**
 * A visszahátrálás tempója. SZÁNDÉKOSAN jóval a player `MOVE_SPEED`-je (200) alatt: a
 * távolság-visszanyerés KÉSLELTETÉS, nem menekülés — ugyanaz az elv, mint a Gravecaller
 * `RETREAT_SPEED`-jénél. Aki rátapad, az megakadályozhatja a következő rohamot.
 */
export const BACKOFF_SPEED = 90;
export const CHARGE_SPEED = 320;

export const PATROL_RANGE = 80;
export const DETECTION_RANGE = 260;
export const LOSE_RANGE = 360; // hiszterézis, hogy ne pattogjon PATROL/CHASE között
export const VERTICAL_DETECTION_RANGE = 50;
export const DIRECTION_DEADZONE = 4;

/** Az ANIMÁCIÓBÓL: a buzogány mért nyúlása a csapás frame-jén + a player fél testszélessége. */
export const ATTACK_RANGE = ANIM_ATTACK_RANGE; // 44
export const ATTACK_DAMAGE = 10;
/** Az ANIMÁCIÓBÓL: a csapás pont a fehér ív megjelenésekor érkezik. */
export const ATTACK_STARTUP_MS = ATTACK_WINDUP_MS; // 390
/**
 * A csapás utáni csend. SZÁNDÉKOSAN rövidebb a CrowHarvester 900ms-ánál (agresszívebb lény).
 *
 * Az alsó korlátja viszont NEM ízlés kérdése: a csapás teljes ciklusa
 * `ATTACK_STARTUP_MS + ATTACK_COOLDOWN_MS` (1090ms), aminek le kell fednie a 780ms-os
 * animációt — különben a következő ütés a még futó animáció közepén indulna újra. Unit teszt
 * őrzi az `ATTACK_ANIM_MS`-hez képest.
 */
export const ATTACK_COOLDOWN_MS = 700;

/**
 * A roham MINIMÁLIS indítási távolsága. Jóval az `ATTACK_RANGE` (44) FÖLÖTT, tehát a két
 * támadás kiválasztási sávja nem fedi egymást — nincs „holt sáv", és nincs kiéheztetés sem
 * (27. tanulság).
 */
export const CHARGE_MIN_RANGE = 180;
/** Ne rohamozzon egy másik platformon álló playerre. */
export const CHARGE_VERTICAL_TOLERANCE = 50;
export const CHARGE_WINDUP_MS = ANIM_CHARGE_WINDUP_MS; // 800
export const CHARGE_DAMAGE = 15;
/** Az ANIMÁCIÓBÓL: a lehajtott fej SZARVÁNAK mért nyúlása + a player fél testszélessége. */
export const CHARGE_HIT_RANGE = ANIM_CHARGE_HIT_RANGE; // 44
/** 900ms * 320px/s = 288px út — befér a legszűkebb üldözési folyosóba is (H-ledge: 400px). */
export const CHARGE_MAX_MS = 900;
export const CHARGE_COOLDOWN_MS = 2600;
/**
 * A roham utáni megtorpanás: ennyi ideig áll a lény, mielőtt visszatér `CHASE`-be.
 *
 * SZÁNDÉKOSAN AZONOS a `HIT_ANIM_MS`-szel, és ez nem véletlen egybeesés: a megtorpanás
 * látványát a HIT frame-ek adják (a Mad King `Take-Hit`-jének szerepe), és a `COOLDOWN`
 * állapot a támadás-animációra képződik le. Ha a megtorpanás HOSSZABB lenne a
 * stagger-animációnál, a Beast a maradék időben buzogányt lendítene a levegőbe.
 *
 * A valódi punish-ablak nem ez, hanem a `CHARGE_COOLDOWN_MS`: az alatt a Beast mozoghat és
 * közelharcolhat, de rohamozni nem tud.
 */
export const CHARGE_RECOVERY_MS = HIT_ANIM_MS; // 180

/** A roham telegraph-ja. A projekt bevett „jön a roham" jele (Wing-Breaker, Mad King lunge). */
export const CHARGE_TELEGRAPH_TINT = 0xff2222;

/**
 * Találat-villanás. A CrowHarvester és a Gravecaller hit-frame-jeibe BE VAN ÉGETVE egy fehér
 * villanás, a goatman lapjába viszont NINCS — ott a `f36–37` csak egy testtartás-változás.
 * Ezért kap a Beast a bossok mintájára `TintModes.FILL` villanást: enélkül a találat-
 * visszajelzése érezhetően gyengébb lenne, mint a másik két lényé.
 */
export const HIT_FLASH_MS = 100;
const HIT_FLASH_TINT = 0xffffff;

// A debug HP-szöveg magassága. 54, nem 46: a Beast magasabb a CrowHarvesternél (a body 44,
// a szarvak még 6px-szel fölé érnek), tehát alacsonyabban a szöveg belelógna a fejébe.
const HP_TEXT_OFFSET_Y = 54;

/** Alakra AZONOS a `CrowHarvesterConfig`-gal — a scene ugyanazt az objektumot adja át. */
export interface BeastConfig {
  /** Abszolút világ-X határok a NYUGALMI sétához. Ha nincs megadva: spawn ± PATROL_RANGE. */
  patrolMinX?: number;
  patrolMaxX?: number;
  /**
   * Abszolút világ-X határok az ÜLDÖZÉSHEZ (és a ROHAMHOZ) — jellemzően a felület pereme,
   * behúzva. Megadás nélkül korlátlan.
   *
   * A Beastnél ez TÖBB, mint a CrowHarvesternél: a rohamot IS ez állítja meg. A bossok
   * arénája fallal zárt, ezért ott elég a `body.blocked` — egy párkányon álló Beast viszont
   * enélkül egyszerűen leszaladna a peremen.
   */
  chaseMinX?: number;
  chaseMaxX?: number;
}

export default class Beast extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public beastState: BeastState = BeastState.PATROL;

  private hp = MAX_HP;
  private readonly maxHp = MAX_HP;
  private hpText: Phaser.GameObjects.Text;

  private readonly patrolMinX: number;
  private readonly patrolMaxX: number;
  private readonly chaseMinX: number;
  private readonly chaseMaxX: number;
  private patrolDirection: 1 | -1 = 1;

  private isAttackBusy = false;
  private canCharge = true;
  private chargeDirection: 1 | -1 = 1;
  private hasHitThisCharge = false;

  private playerRef: Player | null = null;

  /** Az épp lejátszott animáció kulcsa — lásd playAnim(). */
  private currentAnimKey: string | null = null;
  /** Amíg áll, a találat-animációt nem írja felül a walk/idle. */
  private isReacting = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BeastConfig = {}) {
    super(scene, x, y, TEXTURE_KEY, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.patrolMinX = config.patrolMinX ?? x - PATROL_RANGE;
    this.patrolMaxX = config.patrolMaxX ?? x + PATROL_RANGE;
    this.chaseMinX = config.chaseMinX ?? Number.NEGATIVE_INFINITY;
    this.chaseMaxX = config.chaseMaxX ?? Number.POSITIVE_INFINITY;

    // A body a testhez igazodik, nem a 64x64-es frame-hez. Közvetlenül a bodyn hívjuk, mert
    // az Arcade.Sprite-on a Components.Size verziója árnyékolja a GameObject-ét, és a
    // center: false kell, különben a setSize újraközpontozná az utána beállított offsetet.
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
    if (this.beastState === BeastState.DEAD) return;

    this.playerRef = player;
    this.hpText.setPosition(this.x, this.y - HP_TEXT_OFFSET_Y);

    const horizontalDistance = Math.abs(this.x - player.x);
    const verticalDistance = Math.abs(this.y - player.y);
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.beastState) {
      case BeastState.PATROL:
        this.updatePatrol(horizontalDistance, verticalDistance);
        break;
      case BeastState.CHASE:
        this.updateChase(player, horizontalDistance, verticalDistance, distanceToPlayer);
        break;
      case BeastState.CHARGE:
        this.updateCharge(distanceToPlayer);
        break;
      case BeastState.CHARGE_WINDUP:
        // Az irány a windup ELEJÉN rögzült, ezért itt már NEM fordulunk a player után —
        // pont ez teszi a rohamot kikerülhetővé.
        this.setVelocityX(0);
        break;
      case BeastState.ATTACK:
      case BeastState.COOLDOWN:
        // Az attack/cooldown időzítését delayedCall vezérli; itt csak a player felé fordulunk.
        this.setVelocityX(0);
        this.setFacing(player.x < this.x);
        break;
    }

    this.updateAnimation();
  }

  private updatePatrol(horizontalDistance: number, verticalDistance: number): void {
    // DETECT PLAYER: vízszintesen ÉS nagyjából azonos magasságban is közel kell lennie —
    // enélkül egy közvetlenül fent/lent álló player is „közelinek" számítana.
    if (horizontalDistance <= DETECTION_RANGE && verticalDistance <= VERTICAL_DETECTION_RANGE) {
      this.beastState = BeastState.CHASE;
      return;
    }

    if (this.x <= this.patrolMinX) this.patrolDirection = 1;
    if (this.x >= this.patrolMaxX) this.patrolDirection = -1;

    this.setVelocityX(PATROL_SPEED * this.patrolDirection);
    this.setFacing(this.patrolDirection < 0);
  }

  /**
   * A ROHAM AZ ELSŐDLEGES TÁMADÁS, a közelharc csak közvetlen közelben — a sorrend itt
   * kritikus, és nem véletlen:
   *
   *   1. `<= ATTACK_RANGE` -> közelharc. A player MELLETT állva a roham fogalmilag sem
   *      indulhat (nincs nekifutás), tehát ez nem éhezteti ki a rohamot (27. tanulság):
   *      a két sáv (44 vs. 180) nem fedi egymást.
   *   2. Roham, ha kész és van elég hely.
   *   3. Egyébként pozicionálás — lásd `applyChasePositioning()`.
   */
  private updateChase(
    player: Player,
    horizontalDistance: number,
    verticalDistance: number,
    distanceToPlayer: number
  ): void {
    // A LOSE_RANGE SZÁNDÉKOSAN vízszintes-only (a CrowHarvester elve): ez tartja meg a
    // sebzés-alapú ébresztést egy más szinten álló player esetén is.
    if (horizontalDistance > LOSE_RANGE) {
      this.beastState = BeastState.PATROL;
      return;
    }

    if (distanceToPlayer <= ATTACK_RANGE) {
      this.startAttack();
      return;
    }

    if (this.canStartCharge(horizontalDistance, verticalDistance)) {
      this.startChargeWindup(player);
      return;
    }

    this.applyChasePositioning(player, horizontalDistance, verticalDistance);
  }

  private canStartCharge(horizontalDistance: number, verticalDistance: number): boolean {
    return (
      this.canCharge &&
      horizontalDistance >= CHARGE_MIN_RANGE &&
      verticalDistance <= CHARGE_VERTICAL_TOLERANCE
    );
  }

  /**
   * A `CHASE` pozicionáló ága — ez teszi a rohamot ELSŐDLEGESSÉ.
   *
   * A naiv „mindig közelíts" viselkedés ugyanis pont az ellenkezőjét adná: az első roham után
   * a Beast a player MELLETT áll, onnan a `CHARGE_MIN_RANGE` elérhetetlen, tehát örökre
   * közelharci gépezetté válna. (Ez a 27. tanulság rokona: egy „mindig igaz" feltétel
   * kiéhezteti a fő támadást.)
   *
   * Ezért: ha a roham KÉSZ, de a player túl közel van, a Beast HÁTRÁL, hogy nekifutást
   * nyerjen. Ebből egy olvasható ritmus lesz: roham -> közelharc -> hátrálás -> roham.
   *
   * A hátrálás a `chaseMinX/MaxX` peremén véget ér (`velocity 0`), tehát a Beast SAROKBA
   * SZORÍTHATÓ — ilyenkor egyszerűen közelharcra vált, nem válik bábuvá. Ugyanaz a döntés,
   * mint a Gravecallernél („sarokba szorítva viszont tüzel").
   *
   * A lény MINDIG a player felé néz, akkor is, ha hátrafelé lép.
   */
  private applyChasePositioning(
    player: Player,
    horizontalDistance: number,
    verticalDistance: number
  ): void {
    // Ha (majdnem) pontosan egy vonalban van vízszintesen, de nem érhető el (pl. vertikálisan
    // elválasztva egy tűzgolyós ébresztés után), ne villogjon az irány.
    if (horizontalDistance <= DIRECTION_DEADZONE) {
      this.setVelocityX(0);
      return;
    }

    const towardPlayer: 1 | -1 = player.x < this.x ? -1 : 1;
    this.setFacing(towardPlayer < 0);

    // Hátrálás CSAK akkor, ha a roham tényleg elsülhetne, amint megvan a hely. Ha a roham
    // cooldownon van, vagy a player egy másik szinten áll (ahová úgysem rohamozna), a Beast
    // egyszerűen közelít és közelharcol.
    const wantsRunway =
      this.canCharge &&
      horizontalDistance < CHARGE_MIN_RANGE &&
      verticalDistance <= CHARGE_VERTICAL_TOLERANCE;

    const direction: 1 | -1 = wantsRunway ? ((towardPlayer * -1) as 1 | -1) : towardPlayer;
    const speed = wantsRunway ? BACKOFF_SPEED : CHASE_SPEED;

    // A felület peremén megáll: a szakadék (vagy a tüskemező) szélééig követi a playert, de
    // nem lép le. Hátrálásnál ez a „sarokba szorítható" ág.
    if (this.isAtChaseBound(direction)) {
      this.setVelocityX(0);
      return;
    }

    this.setVelocityX(speed * direction);
  }

  private isAtChaseBound(direction: 1 | -1): boolean {
    return (
      (direction < 0 && this.x <= this.chaseMinX) || (direction > 0 && this.x >= this.chaseMaxX)
    );
  }

  // --- Közelharc --------------------------------------------------------------

  private startAttack(): void {
    if (this.isAttackBusy) return;

    this.isAttackBusy = true;
    this.beastState = BeastState.ATTACK;
    this.setVelocityX(0);
    // A telegraph maga a magasba emelt buzogány (f6-8), nem tint — a piros SZÍN a projektben
    // a rohamot jelenti, azt itt nem szabad elhasználni.
    //
    // currentAnimKey = null KELL: a COOLDOWN ugyanerre az anim kulcsra képződik le, és a
    // cooldown lejárta után a lény már a KÖVETKEZŐ update()-ben újra támadhat — közben
    // egyetlen frame sem jut a walk/idle-re, tehát a playAnim() guardja kihagyná az
    // újraindítást, és a második csapás a befagyott utolsó frame-en állna (9. tanulság).
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.time.delayedCall(ATTACK_STARTUP_MS, () => {
      if (this.beastState === BeastState.DEAD) return;
      // A csapás hangját a scene játssza le (a 'harvester-attack' mintájára), PONTOSAN a
      // windup végén — a suhogás a fehér ívhez (f9) tartozik. A DEAD guard mögött van, tehát
      // a windup alatt megölt lény már nem csap hangosan.
      this.emit('beast-attack');
      this.resolveAttackHit();

      this.beastState = BeastState.COOLDOWN;
      this.scene.time.delayedCall(ATTACK_COOLDOWN_MS, () => {
        this.isAttackBusy = false;
        if (this.beastState === BeastState.DEAD) return;
        this.beastState = BeastState.CHASE;
      });
    });
  }

  private resolveAttackHit(): void {
    if (!this.playerRef || this.playerRef.isDead()) return;

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.playerRef.x,
      this.playerRef.y
    );

    // Kis tolerancia (+10px), hogy ha a player időközben kicsit kimozdult, még találat legyen.
    // A fairness-számítás (ATTACK_WINDUP_MS) is ezzel a küszöbbel dolgozik.
    if (distance <= ATTACK_RANGE + 10) {
      this.playerRef.takeDamage(ATTACK_DAMAGE);
    }
  }

  // --- Roham ------------------------------------------------------------------

  /**
   * Az irány a windup ELEJÉN rögzül, és a roham EGYENES VONALÚ — nem követi a playert. Ez a
   * Wing-Breaker és a Mad King közös elve: pont ettől kerülhető ki oldalra lépéssel vagy
   * átugrással, tehát a 800ms-os telegraph tényleges információt hordoz.
   */
  private startChargeWindup(player: Player): void {
    this.canCharge = false;
    this.beastState = BeastState.CHARGE_WINDUP;
    this.setVelocityX(0);

    this.chargeDirection = player.x < this.x ? -1 : 1;
    this.setFacing(this.chargeDirection < 0);
    this.applyTint(CHARGE_TELEGRAPH_TINT);

    this.currentAnimKey = null; // a BRACE animáció minden rohamnál induljon elölről
    this.updateAnimation();

    this.emit('beast-charge-windup', this.chargeDirection);

    this.scene.time.delayedCall(CHARGE_WINDUP_MS, () => {
      if (this.beastState !== BeastState.CHARGE_WINDUP) return;
      this.beginCharge();
    });
  }

  private beginCharge(): void {
    this.beastState = BeastState.CHARGE;
    this.hasHitThisCharge = false;
    this.setVelocityX(CHARGE_SPEED * this.chargeDirection);

    this.scene.time.delayedCall(CHARGE_MAX_MS, () => {
      if (this.beastState !== BeastState.CHARGE) return;
      this.endCharge();
    });
  }

  private updateCharge(distanceToPlayer: number): void {
    // Roham közben legfeljebb egyszer sebez, különben minden frame-ben újra találna.
    if (
      this.playerRef &&
      !this.hasHitThisCharge &&
      !this.playerRef.isDead() &&
      distanceToPlayer <= CHARGE_HIT_RANGE
    ) {
      this.hasHitThisCharge = true;
      this.playerRef.takeDamage(CHARGE_DAMAGE);
    }

    // A roham VÉGE — itt tér el a Beast a bossoktól. A boss arénája fallal zárt, ezért ott a
    // `body.blocked` elég; egy 448px-es párkányon álló Beast viszont enélkül leszaladna a
    // peremen. A két feltétel EGYÜTT kell: fal ÉS perem.
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.left || body.blocked.right || this.isAtChaseBound(this.chargeDirection)) {
      this.endCharge();
      return;
    }

    this.setVelocityX(CHARGE_SPEED * this.chargeDirection);
  }

  /**
   * A roham lezárása. A `resetTint()` KELL az állapotfüggő `clearTintState()` helyett: az
   * utóbbi a state alapján döntene, a state pedig ebben a pillanatban még CHARGE, tehát a
   * piros telegraph bennragadna.
   *
   * A megtorpanás látványát a HIT frame-ek adják (a Mad King `Take-Hit`-jének szerepe a
   * falnak rohanó kitörésnél) — a `playHitReaction()` nélkül a Beast némán állna meg.
   */
  private endCharge(): void {
    this.setVelocityX(0);
    this.resetTint();

    this.beastState = BeastState.COOLDOWN;
    this.playHitReaction();

    this.scene.time.delayedCall(CHARGE_COOLDOWN_MS, () => {
      this.canCharge = true;
    });

    // A COOLDOWN-ból a CHASE-be visszavezető ág SZÁNDÉKOSAN sokkal rövidebb a charge
    // cooldownnál: a Beast közben mozoghat és közelharcolhat, csak rohamozni nem tud.
    // Enélkül 2,6 mp-ig bénán állna a player előtt.
    this.scene.time.delayedCall(CHARGE_RECOVERY_MS, () => {
      if (this.beastState !== BeastState.COOLDOWN) return;
      this.beastState = BeastState.CHASE;
    });
  }

  // --- Sebzés / halál ---------------------------------------------------------

  takeDamage(amount: number): void {
    if (this.beastState === BeastState.DEAD) return;

    // Bármilyen sebzés (pl. tűzgolyó) PATROL alatt azonnali észlelést vált ki, akkor is, ha a
    // player még a DETECTION_RANGE-en kívül van.
    if (this.beastState === BeastState.PATROL) {
      this.beastState = BeastState.CHASE;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hpText.setText(`${this.hp}/${this.maxHp}`);

    if (this.hp <= 0) {
      this.die();
      return;
    }

    this.playHitReaction();
  }

  /**
   * A hit animáció egyszeri lejátszása. Az `isReacting` flag tartja életben: amíg áll, az
   * updateAnimation() nem írja vissza a walk/idle animációt a következő frame-eken.
   */
  private playHitReaction(): void {
    this.isReacting = true;
    this.currentAnimKey = null; // két gyors találat között is induljon újra
    this.updateAnimation();
    this.flashHit();

    this.scene.time.delayedCall(HIT_ANIM_MS, () => {
      this.isReacting = false;
    });
  }

  /**
   * Fehér sziluett-villanás, a bossok mintájára. A roham alatt a PÓZ marad (az animációt az
   * `updateAnimation()` védi), a villanás viszont ott is szól — így a találat mindig
   * visszajelzést ad, anélkül hogy a telegraph-ot megtörné.
   */
  private flashHit(): void {
    this.setTint(HIT_FLASH_TINT);
    this.setTintMode(Phaser.TintModes.FILL);

    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.beastState === BeastState.DEAD) return;
      this.clearTintState();
    });
  }

  // A csomagban NINCS death animáció, ezért a halál a hit animációból + egy elhalványuló,
  // enyhén megsüllyedő tweenből áll össze — a CrowHarvester bevált receptje.
  private die(): void {
    this.beastState = BeastState.DEAD;
    this.setVelocity(0, 0);
    this.resetTint(); // a roham piros telegraph-ja ne ragadjon a tetemre
    this.hpText.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    // A haláltusa hangja — a scene játssza le. KIZÁRÓLAG ide kerülhet, a destroy()-ba SOHA:
    // a destroy() a state-et közvetlenül DEAD-re állítja die() nélkül, a scene
    // resetEnemies()-e pedig a player minden halálakor az ÖSSZES lényt megsemmisíti — onnan
    // emittálva minden respawn egy haláltusa-kórussal indulna (24. tanulság).
    this.emit('beast-death');

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

  // --- Megjelenítés -----------------------------------------------------------

  /**
   * Phaser 4-ben a tint SZÍNE és MÓDJA KÜLÖN beállítás, és a `setTintFill()` törölve van
   * (14. tanulság) — ezért kell mindkét helyen explicit módot is állítani. A roham piros
   * telegraph-ja MULTIPLY: a goatman világos bőrén és a kék buzogányán tisztán látszik.
   */
  private applyTint(color: number): void {
    this.setTint(color);
    this.setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Tint teljes törlése, a módot is visszaállítva az alapértelmezett MULTIPLY-ra. */
  private resetTint(): void {
    this.clearTint();
    this.setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /**
   * A hit-villanás UTÁNI állapot. Állapotfüggő: a roham piros telegraph-ját VISSZA kell
   * tenni, különben egy jól időzített találat pont a legfontosabb pillanatban törölné le a
   * player egyetlen figyelmeztetését (a Mad King azonos döntése).
   */
  private clearTintState(): void {
    if (
      this.beastState === BeastState.CHARGE_WINDUP ||
      this.beastState === BeastState.CHARGE
    ) {
      this.applyTint(CHARGE_TELEGRAPH_TINT);
      return;
    }

    this.resetTint();
  }

  /**
   * Fordulás. A sprite natívan JOBBRA néz, és a teste PONT a frame közepén ül, tehát a
   * kompenzáció itt matematikailag no-op — mégis a megosztott `systems/SpriteFacing.ts`-en
   * megy, hogy egy jövőbeli body-eltolás ne okozzon néma elcsúszást (16. tanulság).
   */
  private setFacing(faceLeft: boolean): void {
    applyFacing(this, BEAST_FACING, faceLeft);
  }

  private updateAnimation(): void {
    // A találat-reakció NEM írhatja felül a roham két fázisát: a windup telegraph-ját és a
    // rohanó pózt látni kell, különben a player elveszti a legfontosabb információt.
    if (
      this.isReacting &&
      this.beastState !== BeastState.CHARGE_WINDUP &&
      this.beastState !== BeastState.CHARGE
    ) {
      this.playAnim(BEAST_ANIMS.HIT);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.playAnim(animKeyForState(this.beastState, body.velocity.x !== 0));
  }

  /**
   * Csak akkor indít animációt, ha ténylegesen VÁLTOZOTT a kulcs. Enélkül a nem loopoló
   * animációk (attack, brace, hit) minden frame-ben újraindulnának: a lejátszás végén a
   * `play(key, true)` „ignoreIfPlaying" ága már nem fog, mert az animáció ilyenkor épp NEM
   * playing (9. tanulság). Emiatt minden hely, ami UGYANARRA a kulcsra akar újraindítást,
   * köteles előbb `currentAnimKey = null`-t írni.
   */
  private playAnim(key: string): void {
    if (this.currentAnimKey === key) return;
    this.currentAnimKey = key;
    this.play(key, true);
  }

  /**
   * A scene a player halálakor MEGSEMMISÍTI és újraspawnolja az összes enemyt
   * (`resetEnemies()`), tehát a destroy() a játék közben is lefut, élő — akár épp rohamozó —
   * lényen.
   *
   * A `DEAD` state beállítása KÖTELEZŐ a `super.destroy()` ELŐTT: ez teszi inertté az összes
   * függőben lévő `delayedCall`-t (attack startup/cooldown, charge windup/max/cooldown,
   * playHitReaction). Enélkül egy windup közben megsemmisített lény callbackje MÉG MINDIG
   * megsebezné a playert egy már nem létező buzogánnyal (18. tanulság).
   */
  override destroy(fromScene?: boolean): void {
    this.beastState = BeastState.DEAD;
    this.playerRef = null;

    // A die() elhalványító tweenje futhat még rajtunk; a destroy után az onComplete
    // (setVisible) egy megsemmisített objektumon hívódna meg.
    this.scene?.tweens.killTweensOf(this);

    // A die() csak elrejti a HP-szöveget — a scene-shutdown eddig amúgy is felszabadította,
    // az in-scene reset viszont nem.
    this.hpText.destroy();

    super.destroy(fromScene);
  }

  isDead(): boolean {
    return this.beastState === BeastState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}
