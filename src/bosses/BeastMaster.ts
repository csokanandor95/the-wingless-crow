import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';
import {
  animKeyForState,
  ATTACK_RANGE as ANIM_ATTACK_RANGE,
  ATTACK_WINDUP_MS,
  BEAST_MASTER_ANIMS,
  BEAST_MASTER_FACING,
  CHARGE_HIT_RANGE as ANIM_CHARGE_HIT_RANGE,
  CHARGE_WINDUP_MS as ANIM_CHARGE_WINDUP_MS,
  DEATH_FADE_MS,
  DEATH_SINK_PX,
  HIT_ANIM_MS,
  SCALE,
} from './BeastMasterAnimations';
import { BODY_HEIGHT, BODY_WIDTH, TEXTURE_KEY } from '../enemies/BeastAnimations';
import { applyFacing } from '../systems/SpriteFacing';

/**
 * Boss 3 – **The Beast Master**.
 *
 * A `Beast` state machine-je boss-léptékben. A `MadKing`/`GraftedWingBreaker` szerkezeti
 * elveit követi (DORMANT belépő, exportált tuning-konstansok, geometriából LEVEZETETT
 * hatótávok, a hangok eventtel mennek), de **NINCS FÁZISA** — user-döntés.
 *
 * ## Miben MÁS, mint a sima Beast
 *
 *  - **`SCALE = 2`** -> a hatótávok kétszereződnek (44 -> 74), ezért a csapás windupja is
 *    hosszabb (390 -> 520). A `BeastMasterAnimations` fairness-blokkja levezeti, miért.
 *  - **`DORMANT`**: a párbeszéd és a belépő ideje. Nem mozog, nem támad, és nem sebezhető.
 *  - **NINCS `PATROL`**: zárt arénában áll, a player mindig ott van. Az `APPROACH` a
 *    `Beast.CHASE` megfelelője.
 *  - **NINCS `chaseMinX/MaxX`**: az arénát fal zárja, tehát a rohamot a `body.blocked` és a
 *    világ-perem állítja meg — a `Beast`-nél azért kellett a póráz, mert az egy nyílt
 *    párkányon áll.
 *  - **Külön `STAGGER` állapot**: a falnak rohanó roham megtorpanása látható, hosszabb
 *    punish-ablak (a Mad King `Take-Hit`-jének szerepe). A `Beast` ezt a `COOLDOWN`-ba
 *    olvasztotta.
 *  - **Falka**: két HP-küszöbön egy-egy segítséget hív. Nem fázis — egyszeri, scriptelt beat.
 *  - **NINCS HP-szöveg**: a HP-bart a scene rajzolja (a másik három boss elve). Ez tartja a
 *    lényt unit-tesztelhetőnek a `fakePhaser` minimális felületén.
 */

// Project_plan.md 11. pont (Beast) doboz-listája, boss-változatban:
// DORMANT → APPROACH → ATTACK / CHARGE_WINDUP → CHARGE → STAGGER → COOLDOWN → DEAD
export enum BeastMasterState {
  DORMANT = 'DORMANT',
  APPROACH = 'APPROACH',
  ATTACK = 'ATTACK',
  CHARGE_WINDUP = 'CHARGE_WINDUP',
  CHARGE = 'CHARGE',
  STAGGER = 'STAGGER',
  COOLDOWN = 'COOLDOWN',
  DEAD = 'DEAD',
}

/**
 * A projekt HP-létrája: Beast 50 · **Beast Master 180** · Wing-Breaker 240 · Mad King 300 ·
 * Ancient Demon 340. Mini-boss, tehát tudatosan a három „nagy" boss ALATT — a nyomás az
 * arénából jön (nincs hova elfutni a roham elől), nem a hosszból.
 */
export const MAX_HP = 180;

/**
 * SZÁNDÉKOSAN lassabb a sima Beastnél (130): nagyobb és nehezebb test. A fenyegetés a
 * rohamból jön, nem a közelítésből — ez adja a lénynek a „nehéz, elkötelezett" karakterét.
 */
export const MOVE_SPEED = 110;
export const CHARGE_SPEED = 380;
export const BACKOFF_SPEED = 100;

export const DIRECTION_DEADZONE = 6;

/** Az ANIMÁCIÓBÓL: a buzogány mért nyúlása × SCALE + a player fél testszélessége. */
export const ATTACK_RANGE = ANIM_ATTACK_RANGE; // 74
export const ATTACK_DAMAGE = 16;
/** Az ANIMÁCIÓBÓL, a fairness-levezetéssel együtt (lásd BeastMasterAnimations). */
export const ATTACK_STARTUP_MS = ATTACK_WINDUP_MS; // 520
/**
 * A csapás utáni csend. Az alsó korlátja NEM ízlés: a teljes ciklusnak
 * (`ATTACK_STARTUP_MS + ATTACK_COOLDOWN_MS`) le kell fednie az 1040 ms-os animációt,
 * különben a következő ütés a még futó animáció közepén indulna újra. Unit teszt őrzi.
 */
export const ATTACK_COOLDOWN_MS = 750;

/**
 * A roham MINIMÁLIS indítási távolsága. Jóval az `ATTACK_RANGE` (74) FÖLÖTT, tehát a két
 * támadás kiválasztási sávja nem fedi egymást — nincs holt sáv, és nincs kiéheztetés sem
 * (CLAUDE.md 27. tanulság).
 */
export const CHARGE_MIN_RANGE = 220;
export const CHARGE_VERTICAL_TOLERANCE = 60;
export const CHARGE_WINDUP_MS = ANIM_CHARGE_WINDUP_MS; // 900
export const CHARGE_DAMAGE = 24;
/** Az ANIMÁCIÓBÓL: a lehajtott fej SZARVÁNAK nyúlása × SCALE + a player fél teste. */
export const CHARGE_HIT_RANGE = ANIM_CHARGE_HIT_RANGE; // 74
/**
 * 1800 ms × 380 px/s = 684 px út — a 800 px-es aréna nagy részét átszeli, tehát a rohamot
 * NEM lehet kifutni, csak átugrani vagy hagyni, hogy falnak menjen.
 */
export const CHARGE_MAX_MS = 1800;
export const CHARGE_COOLDOWN_MS = 2400;

/**
 * A falnak rohanás utáni megtorpanás — a harc FŐ punish-ablaka (a Mad King
 * `SLAM_RECOVERY_MS`-ének szerepe). SZÁNDÉKOSAN hosszabb a `HIT_ANIM_MS`-nél: itt a stagger
 * saját állapot, tehát a lény nem kezd támadás-animációba a maradék idő alatt.
 *
 * LEVEZETETT, a player exportált konstansaiból (unit teszt őrzi): odafutás a falhoz
 * (~`CHARGE_HIT_RANGE / player MOVE_SPEED` = 370 ms) + két kardcsapás (150 startup + 350
 * cooldown = 500 ms) + kilépés (~370 ms) ≈ 1240 ms.
 */
export const STAGGER_MS = 1400;

/** A roham utáni sima (nem falba futó) megtorpanás — rövid, hogy a lény ne álljon bénán. */
export const CHARGE_RECOVERY_MS = HIT_ANIM_MS; // 180

/** A roham telegraph-ja. A projekt bevett „jön a roham" jele. */
export const CHARGE_TELEGRAPH_TINT = 0xff2222;

export const HIT_FLASH_MS = 100;
const HIT_FLASH_TINT = 0xffffff;

/** A falka tagjai — a meglévő enemy-osztályokból, új lény-osztály nélkül. */
export type SummonType = 'crow-harvester' | 'gravecaller';

/**
 * A FALKA. Egyszeri, HP-küszöbhöz kötött esemény — NEM fázis (a user kérése: „nem kell
 * Phase 2"). A lény nem hozza létre a segítséget, csak `'beast-master-summon'` eventet
 * emittál a TÍPUSSAL; a példányosítás ÉS az elhelyezés a scene dolga (a démon
 * `demon-summon`-jának delegálási mintája).
 *
 * **A spawn-pontot SZÁNDÉKOSAN nem a boss adja meg** (kézi teszt, 2026-08-31). Eredetileg a
 * saját pozíciójából számolta (`this.x ± SUMMON_OFFSET_X`), és ez elromlott, amikor a Master
 * az aréna szélén hívott: a lény a sarokban jelent meg, a player pedig a túloldalon — 680 px
 * távolságra, ami MINDKÉT lény `DETECTION_RANGE`-én kívül van (crow 220, caster 400). A
 * falka ilyenkor egyszerűen ott sétálgatott, és a hívás tét nélkül maradt.
 *
 * A boss nem is TUDHATJA a helyes pozíciót: nem ismeri sem az aréna határait, sem azt, milyen
 * távolság tisztességes a playertől. Ez scene-szintű információ — lásd `Boss3Scene`.
 *
 * A két küszöb SZÁNDÉKOSAN eltérő típust hív: előbb egy közelharci CrowHarvester (nyomás,
 * amíg a Master rohamra készül), majd egy távolsági Gravecaller (a levegőbe menekülést
 * bünteti — pont azt, amivel a rohamot ki lehet kerülni).
 */
export const SUMMON_THRESHOLDS: ReadonlyArray<{ hpRatio: number; type: SummonType }> = [
  { hpRatio: 0.66, type: 'crow-harvester' },
  { hpRatio: 0.33, type: 'gravecaller' },
];

/**
 * Milyen messze a PLAYERTŐL éledjen a falka egy tagja.
 *
 * A POZÍCIÓT a scene számolja (az arénát csak ő ismeri), de a TÁVOLSÁG a hívott lények
 * konstansaiból következik, tehát ide tartozik — és így unit-tesztelhető is:
 *
 *  - **felülről** a szűkebb detektálási hatótáv (`CrowHarvester.DETECTION_RANGE` = 220): a
 *    lénynek AZONNAL észre kell vennie a playert, különben a hívás tét nélkül marad;
 *  - **alulról** a tisztesség: jóval a `CrowHarvester.ATTACK_RANGE` (42) fölött, tehát a lény
 *    nem a player nyakán éled újra. Ez ugyanaz az elv, amiért a Level 3 `A` szakaszáról
 *    kikerült a két kezdő CrowHarvester.
 *
 * A Gravecallerre is jó: 180 a `RETREAT_RANGE` (140) fölött, de a `PREFERRED_RANGE` (300)
 * alatt van — vagyis pont a „megáll és castol" sávban éled, nem hátrálva vagy közelítve.
 */
export const SUMMON_SPAWN_DISTANCE = 180;

export default class BeastMaster extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public masterState: BeastMasterState = BeastMasterState.DORMANT;

  private hp = MAX_HP;

  private isAttackBusy = false;
  private canCharge = true;
  private chargeDirection: 1 | -1 = 1;
  private hasHitThisCharge = false;
  /** Küszöbönként EGYSZER sül el; az index a `SUMMON_THRESHOLDS`-ba mutat. */
  private summonsFired = new Set<number>();

  private playerRef: Player | null = null;

  private currentAnimKey: string | null = null;
  private isReacting = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURE_KEY, 0);

    scene.add.existing(this);
    // A setScale MÉG a body létrehozása ELŐTT: az Arcade Body a konstruktorában menti el a
    // game object skáláját (_sx), és a body méretét sourceWidth * _sx-ként számolja
    // (CLAUDE.md 15. tanulság).
    this.setScale(SCALE);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // A méret FORRÁS-pixelben megy: a Phaser a sprite scaleX-ével szorozza.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    this.setFacing(true); // a sheet natívan JOBBRA néz, a Master balra indul (a player felé)

    this.updateAnimation();
  }

  /** A scene a belépő-animáció végén hívja: innentől mozog, támad és sebezhető. */
  activate(): void {
    if (this.masterState !== BeastMasterState.DORMANT) return;
    this.masterState = BeastMasterState.APPROACH;
  }

  update(player: Player): void {
    if (this.masterState === BeastMasterState.DEAD) return;
    if (this.masterState === BeastMasterState.DORMANT) {
      this.setVelocityX(0);
      return;
    }

    this.playerRef = player;

    const horizontalDistance = Math.abs(this.x - player.x);
    const verticalDistance = Math.abs(this.y - player.y);
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.masterState) {
      case BeastMasterState.APPROACH:
        this.updateApproach(player, horizontalDistance, verticalDistance, distanceToPlayer);
        break;
      case BeastMasterState.CHARGE:
        this.updateCharge(distanceToPlayer);
        break;
      case BeastMasterState.CHARGE_WINDUP:
        // Az irány a windup ELEJÉN rögzült, ezért itt már NEM fordulunk a player után —
        // pont ez teszi a rohamot kikerülhetővé.
        this.setVelocityX(0);
        break;
      case BeastMasterState.STAGGER:
      case BeastMasterState.ATTACK:
      case BeastMasterState.COOLDOWN:
        // Az időzítést delayedCall vezérli; a STAGGER alatt még fordulni sem fordul — az a
        // punish-ablak lényege.
        this.setVelocityX(0);
        if (this.masterState !== BeastMasterState.STAGGER) {
          this.setFacing(player.x < this.x);
        }
        break;
    }

    this.updateAnimation();
  }

  /**
   * A ROHAM AZ ELSŐDLEGES TÁMADÁS, a közelharc csak közvetlen közelben — a `Beast` sorrendje,
   * változatlanul:
   *
   *   1. `<= ATTACK_RANGE` -> közelharc. A player MELLETT állva a roham fogalmilag sem
   *      indulhat, tehát ez nem éhezteti ki (a két sáv, 74 vs. 220, nem fedi egymást).
   *   2. Roham, ha kész és van elég hely.
   *   3. Egyébként pozicionálás.
   */
  private updateApproach(
    player: Player,
    horizontalDistance: number,
    verticalDistance: number,
    distanceToPlayer: number
  ): void {
    if (distanceToPlayer <= ATTACK_RANGE) {
      this.startAttack();
      return;
    }

    if (this.canStartCharge(horizontalDistance, verticalDistance)) {
      this.startChargeWindup(player);
      return;
    }

    this.applyPositioning(player, horizontalDistance, verticalDistance);
  }

  private canStartCharge(horizontalDistance: number, verticalDistance: number): boolean {
    return (
      this.canCharge &&
      horizontalDistance >= CHARGE_MIN_RANGE &&
      verticalDistance <= CHARGE_VERTICAL_TOLERANCE
    );
  }

  /**
   * A pozicionáló ág — ez teszi a rohamot ELSŐDLEGESSÉ (a `Beast.applyChasePositioning()`
   * elve): ha a roham kész, de a player túl közel van, a Master HÁTRÁL, hogy nekifutást
   * nyerjen. Ebből lesz az olvasható ritmus: roham -> közelharc -> hátrálás -> roham.
   *
   * Póráz NINCS: az arénát fal zárja, tehát a `setCollideWorldBounds` magától megállítja a
   * peremen — és ott, sarokba szorítva, egyszerűen közelharcra vált.
   */
  private applyPositioning(
    player: Player,
    horizontalDistance: number,
    verticalDistance: number
  ): void {
    if (horizontalDistance <= DIRECTION_DEADZONE) {
      this.setVelocityX(0);
      return;
    }

    const towardPlayer: 1 | -1 = player.x < this.x ? -1 : 1;
    this.setFacing(towardPlayer < 0);

    const wantsRunway =
      this.canCharge &&
      horizontalDistance < CHARGE_MIN_RANGE &&
      verticalDistance <= CHARGE_VERTICAL_TOLERANCE;

    const direction: 1 | -1 = wantsRunway ? ((towardPlayer * -1) as 1 | -1) : towardPlayer;
    this.setVelocityX((wantsRunway ? BACKOFF_SPEED : MOVE_SPEED) * direction);
  }

  // --- Közelharc --------------------------------------------------------------

  private startAttack(): void {
    if (this.isAttackBusy) return;

    this.isAttackBusy = true;
    this.masterState = BeastMasterState.ATTACK;
    this.setVelocityX(0);
    // A telegraph maga a magasba emelt buzogány, nem tint — a piros SZÍN a projektben a
    // rohamot jelenti, azt itt nem szabad elhasználni.
    //
    // currentAnimKey = null KELL: a COOLDOWN ugyanerre a kulcsra képződik le (9. tanulság).
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.time.delayedCall(ATTACK_STARTUP_MS, () => {
      if (this.masterState === BeastMasterState.DEAD) return;
      this.emit('beast-master-attack');
      this.resolveAttackHit();

      this.masterState = BeastMasterState.COOLDOWN;
      this.scene.time.delayedCall(ATTACK_COOLDOWN_MS, () => {
        this.isAttackBusy = false;
        if (this.masterState === BeastMasterState.DEAD) return;
        this.masterState = BeastMasterState.APPROACH;
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

    // Kis tolerancia (+10px) — a fairness-számítás is ezzel a küszöbbel dolgozik.
    if (distance <= ATTACK_RANGE + 10) {
      this.playerRef.takeDamage(ATTACK_DAMAGE);
    }
  }

  // --- Roham ------------------------------------------------------------------

  /**
   * Az irány a windup ELEJÉN rögzül, és a roham EGYENES VONALÚ — a Wing-Breaker, a Mad King
   * és a Beast közös elve: pont ettől kerülhető ki átugrással, tehát a 900 ms-os telegraph
   * tényleges információt hordoz.
   */
  private startChargeWindup(player: Player): void {
    this.canCharge = false;
    this.masterState = BeastMasterState.CHARGE_WINDUP;
    this.setVelocityX(0);

    this.chargeDirection = player.x < this.x ? -1 : 1;
    this.setFacing(this.chargeDirection < 0);
    this.applyTint(CHARGE_TELEGRAPH_TINT);

    this.currentAnimKey = null; // a BRACE animáció minden rohamnál induljon elölről
    this.updateAnimation();

    this.emit('beast-master-charge-windup', this.chargeDirection);

    this.scene.time.delayedCall(CHARGE_WINDUP_MS, () => {
      if (this.masterState !== BeastMasterState.CHARGE_WINDUP) return;
      this.beginCharge();
    });
  }

  private beginCharge(): void {
    this.masterState = BeastMasterState.CHARGE;
    this.hasHitThisCharge = false;
    this.setVelocityX(CHARGE_SPEED * this.chargeDirection);

    this.scene.time.delayedCall(CHARGE_MAX_MS, () => {
      if (this.masterState !== BeastMasterState.CHARGE) return;
      this.endCharge(false);
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

    // Az aréna fallal zárt, ezért — a `Beast`-tel szemben — NEM kell perem-ellenőrzés: elég
    // a `body.blocked`. A falnak rohanás a harc fő punish-ablakát nyitja meg.
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.left || body.blocked.right) {
      this.endCharge(true);
      return;
    }

    this.setVelocityX(CHARGE_SPEED * this.chargeDirection);
  }

  /**
   * A roham lezárása. A `resetTint()` KELL az állapotfüggő `clearTintState()` helyett: az
   * utóbbi a state alapján döntene, a state pedig ebben a pillanatban még CHARGE, tehát a
   * piros telegraph bennragadna.
   *
   * `hitWall` esetén HOSSZABB (`STAGGER_MS`) a megtorpanás: ez a jutalom azért, hogy a player
   * jól időzítve kitért a roham elől. Egy magától kifutó roham után elég a rövid recovery.
   */
  private endCharge(hitWall: boolean): void {
    this.setVelocityX(0);
    this.resetTint();

    this.scene.time.delayedCall(CHARGE_COOLDOWN_MS, () => {
      this.canCharge = true;
    });

    if (hitWall) {
      this.masterState = BeastMasterState.STAGGER;
      this.emit('beast-master-wall-hit');
      this.currentAnimKey = null;
      this.updateAnimation();

      this.scene.time.delayedCall(STAGGER_MS, () => {
        if (this.masterState !== BeastMasterState.STAGGER) return;
        this.masterState = BeastMasterState.APPROACH;
      });
      return;
    }

    this.masterState = BeastMasterState.COOLDOWN;
    this.playHitReaction();

    this.scene.time.delayedCall(CHARGE_RECOVERY_MS, () => {
      if (this.masterState !== BeastMasterState.COOLDOWN) return;
      this.masterState = BeastMasterState.APPROACH;
    });
  }

  // --- Sebzés / halál ---------------------------------------------------------

  takeDamage(amount: number): void {
    if (this.masterState === BeastMasterState.DEAD) return;
    // DORMANT alatt (párbeszéd + belépő) nem sebezhető — a másik három boss elve.
    if (this.masterState === BeastMasterState.DORMANT) return;

    this.hp = Math.max(0, this.hp - amount);

    if (this.hp <= 0) {
      this.die();
      return;
    }

    this.checkSummons();
    this.playHitReaction();
  }

  /**
   * A falka. Küszöbönként PONTOSAN egyszer sül el (a `summonsFired` halmaz őrzi), és a lény
   * CSAK a típust emittálja — az elhelyezés a scene dolga (lásd `SUMMON_THRESHOLDS`).
   */
  private checkSummons(): void {
    const ratio = this.hp / MAX_HP;

    for (const [index, threshold] of SUMMON_THRESHOLDS.entries()) {
      if (this.summonsFired.has(index)) continue;
      if (ratio > threshold.hpRatio) continue;

      this.summonsFired.add(index);
      this.emit('beast-master-summon', threshold.type);
    }
  }

  private playHitReaction(): void {
    this.isReacting = true;
    this.currentAnimKey = null;
    this.updateAnimation();
    this.flashHit();

    this.scene.time.delayedCall(HIT_ANIM_MS, () => {
      this.isReacting = false;
    });
  }

  /**
   * Fehér sziluett-villanás, a bossok mintájára. A roham alatt a PÓZ marad (az animációt az
   * `updateAnimation()` védi), a villanás viszont ott is szól.
   */
  private flashHit(): void {
    this.setTint(HIT_FLASH_TINT);
    this.setTintMode(Phaser.TintModes.FILL);

    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.masterState === BeastMasterState.DEAD) return;
      this.clearTintState();
    });
  }

  // A csomagban NINCS death animáció (a `Beast` receptje): hit frame + elhalványuló,
  // megsüllyedő tween. Bossnál lassabban, hogy a győzelem pillanata kitartson.
  private die(): void {
    this.masterState = BeastMasterState.DEAD;
    this.setVelocity(0, 0);
    this.resetTint(); // a roham piros telegraph-ja ne ragadjon a tetemre
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    // A haláltusa hangja — a scene játssza le. KIZÁRÓLAG ide kerülhet, a destroy()-ba SOHA
    // (CLAUDE.md 24. tanulság).
    this.emit('beast-master-death');

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

  private applyTint(color: number): void {
    this.setTint(color);
    this.setTintMode(Phaser.TintModes.MULTIPLY);
  }

  private resetTint(): void {
    this.clearTint();
    this.setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /**
   * A hit-villanás UTÁNI állapot. Állapotfüggő: a roham piros telegraph-ját VISSZA kell
   * tenni, különben egy jól időzített találat pont a legfontosabb pillanatban törölné le a
   * player egyetlen figyelmeztetését (a Mad King és a Beast azonos döntése).
   */
  private clearTintState(): void {
    if (
      this.masterState === BeastMasterState.CHARGE_WINDUP ||
      this.masterState === BeastMasterState.CHARGE
    ) {
      this.applyTint(CHARGE_TELEGRAPH_TINT);
      return;
    }

    this.resetTint();
  }

  private setFacing(faceLeft: boolean): void {
    applyFacing(this, BEAST_MASTER_FACING, faceLeft);
  }

  private updateAnimation(): void {
    // A találat-reakció NEM írhatja felül a roham két fázisát és a staggert: a telegraph-ot,
    // a rohanó pózt és a punish-ablakot látni kell.
    if (
      this.isReacting &&
      this.masterState !== BeastMasterState.CHARGE_WINDUP &&
      this.masterState !== BeastMasterState.CHARGE &&
      this.masterState !== BeastMasterState.STAGGER
    ) {
      this.playAnim(BEAST_MASTER_ANIMS.HIT);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.playAnim(animKeyForState(this.masterState, body.velocity.x !== 0));
  }

  private playAnim(key: string): void {
    if (this.currentAnimKey === key) return;
    this.currentAnimKey = key;
    this.play(key, true);
  }

  isDead(): boolean {
    return this.masterState === BeastMasterState.DEAD;
  }

  isVulnerable(): boolean {
    return (
      this.masterState !== BeastMasterState.DORMANT &&
      this.masterState !== BeastMasterState.DEAD
    );
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}
