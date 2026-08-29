import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';
import {
  BODY_WIDTH as PLAYER_BODY_WIDTH,
} from '../player/PlayerAnimations';
import { applyFacing } from '../systems/SpriteFacing';
import {
  animKeyForState,
  BLADE_REACH_PX,
  BODY_HEIGHT,
  BODY_WIDTH,
  DEATH_ANIM_MS,
  HALF_WIDTH,
  HURT_ANIM_MS,
  KING_TEXTURES,
  LEAP_AIRTIME_MS,
  LEAP_VELOCITY_Y,
  LEAP_WINDUP_MS,
  LUNGE_WINDUP_MS,
  MAD_KING_ANIMS,
  MAD_KING_FACING,
  SCALE,
  SLASH_WINDUP_MS,
  type KingAction,
} from './MadKingAnimations';

// Projektterv 12. pont – Boss 2: The Mad King.
//
// A Grafted Wing-Breaker (Boss 1) párja, de SZÁNDÉKOSAN más karakterű: a Wing-Breaker
// távolsági nyomást ad (lövedék + Shadow Spell), a király viszont TISZTÁN KÖZELHARCI. Ez
// nem az asset csomag hiányossága, hanem ebből következő tervezési döntés — a csomagban
// nincs cast animáció, cserébe van egy valódi UGRÓ és egy valódi KITÖRÉS animáció.
//
// Phase 1: reaktív kardcsapás + ugró becsapódás (ez az egyetlen gap-closer, tehát ez tartja
//          életben a fázist, és ez bünteti a távolról tűzgolyózó playert).
// Phase 2 (50% HP alatt): gyorsabb mozgás + megnyílik a kitörés.
//
// A GEOMETRIÁBÓL SZÁRMAZÓ számokat (hatótáv, ballisztika, spawn-offsetek) NEM hangoljuk
// kézzel: a MadKingAnimations.ts mért értékeiből számítjuk.
export enum KingState {
  /** A dialógus és a belépő alatt: nem mozog, nem támad, nem sebezhető. */
  DORMANT = 'DORMANT',
  APPROACH = 'APPROACH',
  SLASH = 'SLASH',
  LEAP_WINDUP = 'LEAP_WINDUP',
  LEAP_AIR = 'LEAP_AIR',
  LEAP_SLAM = 'LEAP_SLAM',
  LUNGE_WINDUP = 'LUNGE_WINDUP',
  LUNGE = 'LUNGE',
  COOLDOWN = 'COOLDOWN',
  DEAD = 'DEAD',
}

export const MAX_HP = 300;
export const PHASE2_HP_RATIO = 0.5;

export const MOVE_SPEED_P1 = 80;
export const MOVE_SPEED_P2 = 130;

/**
 * A penge tényleges nyúlása a csapás frame-jén, világ-pixelben (71 forrás-px * SCALE).
 * NEM szabadon hangolt szám — ha a támadás frame-tartománya változik az animációs modulban,
 * ez magától együtt mozog.
 */
export const SLASH_RANGE = BLADE_REACH_PX * SCALE; // 142
export const SLASH_DAMAGE = 16;
/** Az ANIMÁCIÓBÓL: pont akkor sebez, amikor a penge íve (f2) képre kerül. */
export const SLASH_STARTUP_MS = SLASH_WINDUP_MS; // 330

// --- Ugró becsapódás (Phase 1-ben ÉS Phase 2-ben) ---------------------------
// A király a player AKKORI x-ére ugrik (a cél a FELUGRÁS pillanatában rögzül, mint a
// Wing-Breaker Shadow Spelljénél), és földet érve sebez egy vízszintes sávban. Az ív végig
// látható, tehát oldalra kilépve kikerülhető.

/**
 * Szándékosan alig a SLASH_RANGE (142) fölött: így a király a közelharci sávon KÍVÜL sem áll
 * tétlenül, hanem azonnal ugrik — enélkül a Phase 1 (ahol a kitörés még zárva van) hosszú
 * séta-szakaszokká esne szét.
 */
export const LEAP_MIN_RANGE = 170;
export const SLAM_DAMAGE = 22;
/** király félszélesség + player félszélesség + a becsapódás lökéshulláma. */
export const SLAM_HIT_HALF_WIDTH = HALF_WIDTH + PLAYER_BODY_WIDTH / 2 + 20; // 58
/** A vízszintes sebesség felső korlátja: ennél messzebbre nem tud pontosan ugrani. */
export const LEAP_MAX_SPEED_X = 300;
export const LEAP_COOLDOWN_MS = 3000;
/** Ha a fizika valamiért nem adna földet érést, a repülés ekkor mindenképp lezárul. */
export const LEAP_MAX_AIR_MS = LEAP_AIRTIME_MS * 2;

// --- Kitörés (CSAK Phase 2) -------------------------------------------------
// A Wing-Breaker charge-ának a mintája, de itt VAN hozzá valódi animáció (Attack2 f2).
export const LUNGE_MIN_RANGE = 160;
export const LUNGE_VERTICAL_TOLERANCE = 60;
export const LUNGE_SPEED = 460;
export const LUNGE_DAMAGE = 24;
/** király félszélesség + player félszélesség + tolerancia. */
export const LUNGE_HIT_RANGE = HALF_WIDTH + PLAYER_BODY_WIDTH / 2 + 8; // 46
export const LUNGE_MAX_MS = 900;
export const LUNGE_COOLDOWN_MS = 3000;

/** Slash/leap utáni rövid pihenő, mielőtt újra dönt. */
export const ACTION_COOLDOWN_MS = 850;

/**
 * Ha a player vízszintesen szinte pontosan a király felett/alatt áll, a "merre induljak"
 * döntés nulla körül minden frame-ben átbillenne, és a király balra-jobbra rezegne.
 * Ugyanaz a védelem, mint a CrowHarvester/Wing-Breaker DIRECTION_DEADZONE-ja.
 */
export const DIRECTION_DEADZONE = 6;

/**
 * A király "elkötelezett" támadásainak KÖRFORGÁSA. A slash szándékosan NEM része: az reaktív,
 * közelharci távolságon belül mindig felülírja a rotációt.
 *
 * Miért rotáció és nem prioritási sor? Lásd a Wing-Breaker azonos szakaszát: egy prioritási
 * sorban a legelöl álló támadás monopolizálja a fázist, amint a cooldownja a state-lockkal
 * egyszerre jár le.
 */
export const ATTACK_ROTATION = ['LEAP', 'LUNGE'] as const;
type RotatedAttack = (typeof ATTACK_ROTATION)[number];

const HIT_FLASH_MS = 100;
const HIT_FLASH_TINT = 0xffffff;
const LUNGE_TELEGRAPH_TINT = 0xff2222;

export default class MadKing extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public kingState: KingState = KingState.DORMANT;

  private phase: 1 | 2 = 1;
  private hp = MAX_HP;

  private isActionBusy = false;
  private canLeap = true;
  private canLunge = false; // csak Phase 2-ben nyílik meg
  private lungeDirection: 1 | -1 = 1;
  private hasHitThisLunge = false;
  /** A becsapódás célpontja — a FELUGRÁS pillanatában rögzül, nem követi a playert. */
  private leapTargetX = 0;

  /** Hol tart a támadás-körforgás. Phase 1 az ugrással nyit (a kitörés még zárva van). */
  private rotationIndex = 0;

  private playerRef: Player | null = null;

  /** Melyik akcióból értünk COOLDOWN-ba — ez dönti el, melyik animáció fut tovább. */
  private lastAction: KingAction | null = null;
  /** Az épp lejátszott animáció kulcsa — lásd playAnim(). */
  private currentAnimKey: string | null = null;
  /** Falnak rohanás utáni stagger: amíg áll, az idle nem írja felül a hurt animációt. */
  private isStaggering = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, KING_TEXTURES.IDLE, 0);

    scene.add.existing(this);
    // A setScale MÉG a body létrehozása ELŐTT: az Arcade Body a konstruktorában menti el a
    // game object skáláját (_sx), és a body méretét sourceWidth * _sx-ként számolja.
    // Utólag skálázva a méret csak a következő physics step-ben állna helyre.
    this.setScale(SCALE);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // A body a rajzolt karakterhez igazodik, nem a 160x111-es frame-hez. Közvetlenül a bodyn
    // hívjuk, mert az Arcade.Sprite-on a Components.Size verziója árnyékolja a GameObject-ét,
    // és a center: false kell, különben a setSize újraközpontozná az utána beállított
    // offsetet. A méret forrás-pixelben megy: a Phaser a sprite scaleX-ével szorozza.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    this.setFacing(true); // a sheet natívan JOBBRA néz, a király balra indul (a player felé)

    this.updateAnimation();
  }

  /** A scene a belépő-animáció végén hívja: innentől él a state machine. */
  activate(): void {
    if (this.kingState !== KingState.DORMANT) return;
    this.kingState = KingState.APPROACH;
  }

  // A scene minden frame-ben meghívja, átadva a player referenciát.
  update(player: Player): void {
    if (this.kingState === KingState.DEAD || this.kingState === KingState.DORMANT) return;

    this.playerRef = player;

    const horizontalDistance = Math.abs(this.x - player.x);
    const verticalDistance = Math.abs(this.y - player.y);
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.kingState) {
      case KingState.APPROACH:
        this.updateApproach(player, horizontalDistance, verticalDistance, distanceToPlayer);
        break;
      case KingState.LEAP_AIR:
        // A REPÜLÉS az egyetlen állapot, ahol NEM nyúlunk a sebességhez: a ballisztikát a
        // felugráskor beállított velocity + a világ gravitációja adja. Egy setVelocityX(0)
        // itt függőlegesen ejtené le a királyt a levegőben.
        this.updateLeapAir();
        break;
      case KingState.LUNGE:
        this.updateLunge(distanceToPlayer);
        break;
      case KingState.SLASH:
      case KingState.LEAP_WINDUP:
      case KingState.LEAP_SLAM:
      case KingState.LUNGE_WINDUP:
      case KingState.COOLDOWN:
        // Ezeket delayedCall-láncok vezérlik; itt csak megállunk és a player felé fordulunk.
        // (A LUNGE_WINDUP és a LEAP_WINDUP alatt az irány már rögzített, ezért ott nem
        // fordulunk utána — különben a telegraph hazudna a roham irányáról.)
        this.setVelocityX(0);
        if (
          this.kingState !== KingState.LUNGE_WINDUP &&
          this.kingState !== KingState.LEAP_WINDUP
        ) {
          this.setFacing(player.x < this.x);
        }
        break;
    }

    this.updateAnimation();
  }

  /**
   * Támadás-választás. SZÁNDÉKOSAN determinisztikus (nincs véletlen), hogy a unit tesztek ne
   * legyenek flaky-k, és hogy a player fel tudja ismerni a király mintáit.
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

    // A rotációt ott vesszük fel, ahol legutóbb abbahagytuk, és az első ELÉRHETŐ támadást
    // indítjuk. A nem elérhetőket átugorjuk — a mutató csak a ténylegesen elsütött támadás
    // mögé lép, tehát az átugrott támadás a következő körben előbb jön sorra.
    for (let step = 0; step < ATTACK_ROTATION.length; step++) {
      const index = (this.rotationIndex + step) % ATTACK_ROTATION.length;
      const attack = ATTACK_ROTATION[index];

      if (!this.canUse(attack, horizontalDistance, verticalDistance, distanceToPlayer)) {
        continue;
      }

      this.rotationIndex = (index + 1) % ATTACK_ROTATION.length;
      this.startRotatedAttack(attack, player);
      return;
    }

    // Vízszintesen (majdnem) egy vonalban lévő, de el nem érhető cél: megállunk, különben az
    // irány frame-enként átbillenne.
    if (horizontalDistance <= DIRECTION_DEADZONE) {
      this.setVelocityX(0);
      return;
    }

    // Nincs kész támadás: közelítünk.
    const direction = player.x < this.x ? -1 : 1;
    this.setVelocityX(this.moveSpeed() * direction);
    this.setFacing(direction < 0);
  }

  /** A rotáció szűrői: távolság + a támadás saját cooldown-kapuja. */
  private canUse(
    attack: RotatedAttack,
    horizontalDistance: number,
    verticalDistance: number,
    distanceToPlayer: number
  ): boolean {
    switch (attack) {
      case 'LEAP':
        return this.canLeap && distanceToPlayer > LEAP_MIN_RANGE;
      case 'LUNGE':
        return (
          this.phase === 2 &&
          this.canLunge &&
          horizontalDistance > LUNGE_MIN_RANGE &&
          verticalDistance <= LUNGE_VERTICAL_TOLERANCE
        );
    }
  }

  private startRotatedAttack(attack: RotatedAttack, player: Player): void {
    switch (attack) {
      case 'LEAP':
        this.startLeapWindup(player);
        return;
      case 'LUNGE':
        this.startLungeWindup(player);
        return;
    }
  }

  // --- Kardcsapás -----------------------------------------------------------

  private startSlash(): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.lastAction = 'SLASH';
    this.kingState = KingState.SLASH;
    this.setVelocityX(0);
    this.restartAnimation();

    this.scene.time.delayedCall(SLASH_STARTUP_MS, () => {
      if (this.kingState === KingState.DEAD) return;
      // A csapás hangja a lecsapás PILLANATÁBAN szól (f2), nem a kar hátrahúzásakor — a
      // bevett delegálási minta: a scene játssza le.
      this.emit('king-slash');
      this.resolveSlashHit();
      this.enterCooldown(ACTION_COOLDOWN_MS);
    });
  }

  private resolveSlashHit(): void {
    if (!this.playerRef || this.playerRef.isDead()) return;

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.playerRef.x,
      this.playerRef.y
    );

    // Kis tolerancia (+10px), mint a CrowHarvesternél és a Wing-Breakernél: ha a player épp
    // kimozdult, még találat.
    if (distance <= SLASH_RANGE + 10) {
      this.playerRef.takeDamage(SLASH_DAMAGE);
    }
  }

  // --- Ugró becsapódás ------------------------------------------------------

  private startLeapWindup(player: Player): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canLeap = false;
    this.lastAction = 'LEAP';
    this.kingState = KingState.LEAP_WINDUP;
    this.setVelocityX(0);
    // A guggolás alatt már a cél felé néz, és ez az irány a becsapódásig nem változik.
    this.setFacing(player.x < this.x);
    this.restartAnimation();
    this.emit('king-leap-windup');

    this.scene.time.delayedCall(LEAP_WINDUP_MS, () => {
      if (this.kingState === KingState.DEAD) return;
      this.beginLeap();
    });
  }

  /**
   * Elrugaszkodás. A cél x ITT rögzül — a windup alatt oldalra lépve a becsapódás
   * kikerülhető, tehát a guggolás valódi információt hordozó telegraph.
   *
   * A vízszintes sebesség LEVEZETETT: a repülési idő a gravitációból és a felfelé induló
   * sebességből adódik (LEAP_AIRTIME_MS), tehát csak el kell osztani vele a megteendő utat.
   */
  private beginLeap(): void {
    this.kingState = KingState.LEAP_AIR;
    this.leapTargetX = this.playerRef ? this.playerRef.x : this.x;

    const travel = this.leapTargetX - this.x;
    const speedX = Phaser.Math.Clamp(
      travel / (LEAP_AIRTIME_MS / 1000),
      -LEAP_MAX_SPEED_X,
      LEAP_MAX_SPEED_X
    );

    this.setVelocityX(speedX);
    this.setVelocityY(-LEAP_VELOCITY_Y);
    this.updateAnimation();

    // Biztonsági háló: ha a földet érés valamiért elmarad (pl. a világ pereme megtartja),
    // a repülés akkor is lezárul, és a király nem ragad be a levegőben.
    this.scene.time.delayedCall(LEAP_MAX_AIR_MS, () => {
      if (this.kingState !== KingState.LEAP_AIR) return;
      this.resolveSlam();
    });
  }

  /** A földet érés a FIZIKÁBÓL derül ki, nem időzítőből — így a becsapódás sosem csúszik el. */
  private updateLeapAir(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
      this.resolveSlam();
    }
  }

  private resolveSlam(): void {
    if (this.kingState === KingState.DEAD) return;

    this.kingState = KingState.LEAP_SLAM;
    this.setVelocityX(0);
    this.restartAnimation();
    this.emit('king-slam', this.x);

    if (
      this.playerRef &&
      !this.playerRef.isDead() &&
      Math.abs(this.playerRef.x - this.x) <= SLAM_HIT_HALF_WIDTH
    ) {
      this.playerRef.takeDamage(SLAM_DAMAGE);
    }

    this.enterCooldown(ACTION_COOLDOWN_MS);
    this.scene.time.delayedCall(LEAP_COOLDOWN_MS, () => {
      this.canLeap = true;
    });
  }

  // --- Kitörés (Phase 2) ----------------------------------------------------

  private startLungeWindup(player: Player): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canLunge = false;
    this.lastAction = 'LUNGE';
    this.kingState = KingState.LUNGE_WINDUP;
    this.setVelocityX(0);
    this.applyTint(LUNGE_TELEGRAPH_TINT); // piros villanás, mint a Wing-Breaker charge-ánál

    // Az irány a windup ELEJÉN rögzül: a kitörés egyenes vonalú, nem követi a playert.
    this.lungeDirection = player.x < this.x ? -1 : 1;
    this.setFacing(this.lungeDirection < 0);
    this.restartAnimation();
    this.emit('king-lunge-windup', this.lungeDirection);

    this.scene.time.delayedCall(LUNGE_WINDUP_MS, () => {
      if (this.kingState === KingState.DEAD) return;
      this.beginLunge();
    });
  }

  private beginLunge(): void {
    this.kingState = KingState.LUNGE;
    this.hasHitThisLunge = false;
    this.setVelocityX(LUNGE_SPEED * this.lungeDirection);
    this.updateAnimation();

    this.scene.time.delayedCall(LUNGE_MAX_MS, () => {
      // Falnak ütközve az updateLunge() már lezárta — akkor ez no-op.
      if (this.kingState !== KingState.LUNGE) return;
      this.endLunge(false);
    });
  }

  private updateLunge(distanceToPlayer: number): void {
    // Roham közben legfeljebb egyszer sebez, különben minden frame-ben újra eltalálná az
    // útjába kerülő playert.
    if (
      !this.hasHitThisLunge &&
      this.playerRef &&
      !this.playerRef.isDead() &&
      distanceToPlayer <= LUNGE_HIT_RANGE
    ) {
      this.hasHitThisLunge = true;
      this.playerRef.takeDamage(LUNGE_DAMAGE);
    }

    // Az aréna falának ütközve a roham idő előtt véget ér — és a király megszédül.
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.left || body.blocked.right) {
      this.endLunge(true);
      return;
    }

    this.setVelocityX(LUNGE_SPEED * this.lungeDirection);
  }

  private endLunge(hitWall: boolean): void {
    this.setVelocityX(0);
    // Itt MINDENKÉPP el kell tűnnie a piros telegraph-nak, ezért a resetTint() megy és nem a
    // clearTintState(): utóbbi állapotfüggő, és a state ebben a pillanatban még LUNGE, tehát
    // pont visszatenné a pirosat.
    this.resetTint();
    this.enterCooldown(LUNGE_COOLDOWN_MS, true);

    // A falnak rohanás megszédíti: ez a player punish-ablaka, és egyben olvasható
    // visszajelzés arról, hogy a roham véget ért.
    if (hitWall) this.playStagger();
  }

  // --- Közös --------------------------------------------------------------

  private enterCooldown(durationMs: number, restoreLunge = false): void {
    this.kingState = KingState.COOLDOWN;
    this.setVelocityX(0);
    this.updateAnimation();

    this.scene.time.delayedCall(durationMs, () => {
      this.isActionBusy = false;
      if (restoreLunge) this.canLunge = true;
      if (this.kingState === KingState.DEAD) return;
      this.kingState = KingState.APPROACH;
    });
  }

  takeDamage(amount: number): void {
    // A dialógus/belépő alatt sebezhetetlen: a fight még el sem kezdődött.
    if (this.kingState === KingState.DEAD || this.kingState === KingState.DORMANT) return;

    this.hp = Math.max(0, this.hp - amount);
    this.flashHit();

    if (this.hp <= 0) {
      this.die();
      return;
    }

    if (this.phase === 1 && this.hp <= MAX_HP * PHASE2_HP_RATIO) {
      this.enterPhase2();
    }
  }

  /**
   * Találat-villanás. FIGYELEM: egy sima setTint(0xffffff) NO-OP, mert a fehér a MULTIPLY mód
   * egységeleme. Phaser 4-ben a setTintFill() törölve van, a sziluett-villanás
   * setTint(szín) + setTintMode(FILL) párossal jön (14. technikai tanulság).
   *
   * A király SZÁNDÉKOSAN nem flinchel (nincs hurt animáció találatra): egy megrogyás minden
   * ütésnél megszakítaná a telegraph-jait, ami bossnál olvashatatlan. A Take Hit frame-ek
   * helye a falnak rohanó kitörés staggerje.
   */
  private flashHit(): void {
    this.setTint(HIT_FLASH_TINT);
    this.setTintMode(Phaser.TintModes.FILL);

    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.kingState === KingState.DEAD) return;
      this.clearTintState();
    });
  }

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
   * A kitörés piros telegraph-ját NEM szabad letörölni egy hit-villanással: a player abból
   * olvassa ki, hogy jön a roham. Ezért a visszaállítás állapotfüggő.
   */
  private clearTintState(): void {
    if (this.kingState === KingState.LUNGE_WINDUP || this.kingState === KingState.LUNGE) {
      this.applyTint(LUNGE_TELEGRAPH_TINT);
      return;
    }

    this.resetTint();
  }

  private enterPhase2(): void {
    this.phase = 2;
    this.canLunge = true;
    // A fázis a szignatúra-mozdulatával nyit: a rotációt egyből a kitörés slotjára állítjuk,
    // hogy a "PHASE II" felirat után ne egy újabb ugrás jöjjön.
    this.rotationIndex = ATTACK_ROTATION.indexOf('LUNGE');
    this.emit('king-phase-change', 2);
  }

  private die(): void {
    this.kingState = KingState.DEAD;
    this.setVelocity(0, 0);
    this.resetTint();
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    this.isStaggering = false;
    this.restartAnimation();

    // FADE NINCS (szemben a Wing-Breakerrel, ami hamuvá válik): a Death sheet utolsó
    // frame-je egy a földön maradó test, és a lore szerint a király FELOLDOZÁST kap —
    // a győzelmi beat alatt látszania kell, hogy ott fekszik a trónja előtt.
    this.emit('king-death');
  }

  /**
   * Fordulás. A sheet natívan JOBBRA néz. A test közepe történetesen pont a frame közepén
   * van, tehát a kompenzáció matematikailag no-op — de a megosztott systems/SpriteFacing.ts-en
   * megy át, hogy egy jövőbeli body-eltolás ne okozzon néma elcsúszást (16. tanulság).
   */
  private setFacing(faceLeft: boolean): void {
    applyFacing(this, MAD_KING_FACING, faceLeft);
  }

  /** Egyszeri stagger-animáció, amit a következő frame-ek idle-je nem írhat felül. */
  private playStagger(): void {
    this.isStaggering = true;
    this.restartAnimation();

    this.scene.time.delayedCall(HURT_ANIM_MS, () => {
      this.isStaggering = false;
    });
  }

  /**
   * Animáció ÚJRAINDÍTÁSA akkor is, ha a kulcs nem változott. Minden támadás-indításnál
   * KÖTELEZŐ — a COOLDOWN ugyanis az előző akció animációjára képződik le, és a cooldown
   * lejárta után a király már a KÖVETKEZŐ update()-ben újra támadhat, közben egyetlen frame
   * sem jut az APPROACH walk/idle animációjára. A playAnim() guardja így "nem változott a
   * kulcs" alapon kihagyná a lejátszást, és a második csapás a befagyott utolsó frame-en
   * állna.
   */
  private restartAnimation(): void {
    this.currentAnimKey = null;
    this.updateAnimation();
  }

  private updateAnimation(): void {
    if (this.isStaggering && this.kingState !== KingState.DEAD) {
      this.playAnim(MAD_KING_ANIMS.HURT);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.playAnim(animKeyForState(this.kingState, this.lastAction, body.velocity.x !== 0));
  }

  /**
   * Csak akkor indít animációt, ha ténylegesen VÁLTOZOTT a kulcs. Enélkül a nem loopoló
   * animációk (slash, death) minden frame-ben újraindulnának: a lejátszás végén a
   * play(key, true) "ignoreIfPlaying" ága már nem fog, mert az animáció ilyenkor épp NEM
   * playing (9. technikai tanulság).
   */
  private playAnim(key: string): void {
    if (this.currentAnimKey === key) return;
    this.currentAnimKey = key;
    this.play(key, true);
  }

  private moveSpeed(): number {
    return this.phase === 2 ? MOVE_SPEED_P2 : MOVE_SPEED_P1;
  }

  getPhase(): 1 | 2 {
    return this.phase;
  }

  isDead(): boolean {
    return this.kingState === KingState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}

/** A halál-animáció hossza — a Boss2Scene ebből méretezi a győzelmi késleltetést. */
export { DEATH_ANIM_MS };
