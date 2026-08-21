import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';
import {
  BODY_WIDTH as PLAYER_BODY_WIDTH,
  BODY_HEIGHT as PLAYER_BODY_HEIGHT,
} from '../player/PlayerAnimations';
import { applyFacing } from '../systems/SpriteFacing';
import {
  animKeyForState,
  BLADE_REACH_PX,
  BODY_HEIGHT,
  BODY_WIDTH,
  CAST_RELEASE_MS,
  DEATH_ANIM_MS,
  DEATH_FADE_MS,
  FEET_OFFSET_Y,
  HALF_WIDTH,
  HURT_ANIM_MS,
  SCALE,
  SLASH_WINDUP_MS,
  SPELL_IMPACT_MS,
  SPELL_PILLAR_HALF_PX,
  TEXTURE_KEY,
  WING_BREAKER_ANIMS,
  WING_BREAKER_FACING,
  type BossAction,
} from './GraftedWingBreakerAnimations';

// Projektterv 12. pont – Boss: The Grafted Wing-Breaker.
//
// Phase 1: sword slash + távoli projectile (a player át tudja ugrani) + Shadow Spell
//          (a player fölé idézett árny-oszlop, oldalra kitéréssel kerülhető) + basic movement.
// Phase 2 (50% HP alatt): gyorsabb mozgás + charge támadás egyenes vonalban, piros
//          villanásos telegraph-fal (~1s windup), utána 3 mp csend.
//
// A CrowHarvester.ts mintáját követi: state machine + delayedCall-láncok az időzítéshez, és
// minden hangolható szám exportált konstans, hogy a unit tesztek ne égessenek be
// nyers értékeket. A GEOMETRIÁBÓL SZÁRMAZÓ számokat (hatótáv, spawn-offsetek) viszont nem
// hangoljuk kézzel: a GraftedWingBreakerAnimations.ts mért értékeiből számítjuk.
export enum BossState {
  /** Belépő (boss entrance) alatt: nem mozog, nem támad, nem sebezhető. */
  DORMANT = 'DORMANT',
  APPROACH = 'APPROACH',
  SLASH = 'SLASH',
  PROJECTILE = 'PROJECTILE',
  SPELL = 'SPELL',
  CHARGE_WINDUP = 'CHARGE_WINDUP',
  CHARGE = 'CHARGE',
  COOLDOWN = 'COOLDOWN',
  DEAD = 'DEAD',
}

export const MAX_HP = 240;
export const PHASE2_HP_RATIO = 0.5;

export const MOVE_SPEED_P1 = 70;
export const MOVE_SPEED_P2 = 120;

/**
 * A kasza tényleges nyúlása a csapás frame-jén, világ-pixelben (69 forrás-px * SCALE).
 * NEM szabadon hangolt szám — ha a támadás frame-tartománya változik az animációs modulban,
 * ez magától együtt mozog.
 */
export const SLASH_RANGE = BLADE_REACH_PX * SCALE; // 138
export const SLASH_DAMAGE = 18;
/** Az ANIMÁCIÓBÓL: pont akkor sebez, amikor a kasza íve (f20) képre kerül. */
export const SLASH_STARTUP_MS = SLASH_WINDUP_MS;

export const PROJECTILE_MIN_RANGE = 160;
/** Az ANIMÁCIÓBÓL: a lövedék a cast energia-csúcsán (f45) születik. */
export const PROJECTILE_STARTUP_MS = CAST_RELEASE_MS;
export const PROJECTILE_COOLDOWN_MS = 2200;
export const PROJECTILE_DAMAGE = 15;
export const PROJECTILE_SPEED = 260;
/** Épp a body szélén kívül, hogy ne a bosson belül jelenjen meg. */
export const PROJECTILE_SPAWN_OFFSET_X = HALF_WIDTH + 12; // 44
/**
 * A lövedék a player MELLMAGASSÁGÁBAN indul (a boss közepe a talaj felett FEET_OFFSET_Y-nal
 * van, a player mellkasa a talaj felett a fél testmagasságával) — így át lehet ugrani,
 * ahogy a Project_plan 12. pontja megköveteli.
 */
export const PROJECTILE_SPAWN_OFFSET_Y = FEET_OFFSET_Y - PLAYER_BODY_HEIGHT / 2; // 31

// --- Shadow Spell (Phase 1-ben ÉS Phase 2-ben) ------------------------------
// A boss a kaszáját a magasba emelve árny-oszlopot idéz a player AKKORI pozíciójára.
// Az oszlop előbb izzásként lebeg a player feje fölött (SPELL_TELEGRAPH_MS), és csak
// utána csap le — tehát oldalra kilépve kikerülhető. A becsapódás helye a cast pillanatában
// RÖGZÜL, nem követi a playert.
export const SPELL_MIN_RANGE = 160;
export const SPELL_DAMAGE = 20;
export const SPELL_COOLDOWN_MS = 5000;
/** Az ANIMÁCIÓBÓL: a cast energia-csúcsa — ekkor rögzül a célpont. */
export const SPELL_CAST_MS = CAST_RELEASE_MS;
/** Az oszlop félszélessége + a player félszélessége: ennyire kell oldalra lépni. */
export const SPELL_HIT_HALF_WIDTH = SPELL_PILLAR_HALF_PX * SCALE + PLAYER_BODY_WIDTH / 2; // 46

export const CHARGE_MIN_RANGE = 200;
export const CHARGE_VERTICAL_TOLERANCE = 60;
export const CHARGE_WINDUP_MS = 1000;
export const CHARGE_SPEED = 420;
export const CHARGE_DAMAGE = 25;
/** boss félszélesség + player félszélesség + tolerancia. */
export const CHARGE_HIT_RANGE = HALF_WIDTH + PLAYER_BODY_WIDTH / 2 + 8; // 54
export const CHARGE_MAX_MS = 1200;
export const CHARGE_COOLDOWN_MS = 3000; // Project_plan 12. pont: a charge után 3 mp-ig nem támad

/** Slash/projectile/spell utáni rövid pihenő, mielőtt újra dönt. */
export const ACTION_COOLDOWN_MS = 900;

/**
 * Ha a player vízszintesen szinte pontosan a boss felett/alatt áll, a "merre induljak"
 * döntés nulla körül minden frame-ben átbillenne, és a boss balra-jobbra rezegne.
 * Ugyanaz a védelem, mint a CrowHarvester DIRECTION_DEADZONE-ja.
 */
export const DIRECTION_DEADZONE = 6;

const HIT_FLASH_MS = 100;
const HIT_FLASH_TINT = 0xffffff;
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
  private canSpell = true;
  private canCharge = false; // csak Phase 2-ben nyílik meg
  private chargeDirection: 1 | -1 = 1;
  private hasHitThisCharge = false;

  private playerRef: Player | null = null;

  /** Melyik akcióból értünk COOLDOWN-ba — ez dönti el, melyik animáció fut tovább. */
  private lastAction: BossAction | null = null;
  /** Az épp lejátszott animáció kulcsa — lásd playAnim(). */
  private currentAnimKey: string | null = null;
  /** Falnak rohanás utáni stagger: amíg áll, az idle nem írja felül a hurt animációt. */
  private isStaggering = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURE_KEY, 0);

    scene.add.existing(this);
    // A setScale MÉG a body létrehozása ELŐTT: az Arcade Body a konstruktorában menti el a
    // game object skáláját (`_sx`), és a body méretét `sourceWidth * _sx`-ként számolja.
    // Utólag skálázva a méret csak a következő physics step-ben állna helyre.
    this.setScale(SCALE);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // A body a rajzolt karakterhez igazodik, nem a 140x93-as frame-hez. Közvetlenül a
    // bodyn hívjuk, mert az Arcade.Sprite-on a Components.Size verziója árnyékolja a
    // GameObject-ét, és a center: false kell, különben a setSize újraközpontozná az utána
    // beállított offsetet. A méret forrás-pixelben megy: a Phaser a sprite scaleX-ével
    // szorozza (Body.js `sourceWidth * this._sx`).
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    this.setFacing(true); // a sheet natívan balra néz

    this.updateAnimation();
  }

  /** A scene a belépő-animáció végén hívja: innentől él a state machine. */
  activate(): void {
    if (this.bossState !== BossState.DORMANT) return;
    this.bossState = BossState.APPROACH;
  }

  // A scene minden frame-ben meghívja, átadva a player referenciát (CrowHarvester.update mintája).
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
      case BossState.SPELL:
      case BossState.CHARGE_WINDUP:
      case BossState.COOLDOWN:
        // Ezeket delayedCall-láncok vezérlik; itt csak megállunk és a player felé fordulunk.
        // (CHARGE_WINDUP alatt az irány már rögzített, ezért ott nem fordulunk utána.)
        this.setVelocityX(0);
        if (this.bossState !== BossState.CHARGE_WINDUP) this.setFacing(player.x < this.x);
        break;
    }

    this.updateAnimation();
  }

  /**
   * Támadás-választás. SZÁNDÉKOSAN determinisztikus (nincs véletlen), hogy a unit tesztek
   * ne legyenek flaky-k, és hogy a player fel tudja ismerni a boss mintáit.
   *
   * A spell a projectile MÖGÖTT áll a sorban: így a projectile 2.2 mp-es cooldownja alatt
   * a spell tölti ki a ritmust (~5 mp-enként), a boss pedig nem áll be egyetlen mintába.
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

    if (this.canSpell && distanceToPlayer > SPELL_MIN_RANGE) {
      this.startSpell();
      return;
    }

    // Vízszintesen (majdnem) egy vonalban lévő, de el nem érhető cél: megállunk,
    // különben az irány frame-enként átbillenne.
    if (horizontalDistance <= DIRECTION_DEADZONE) {
      this.setVelocityX(0);
      return;
    }

    // Nincs kész támadás: közelítünk. A projectile/spell/charge saját cooldownja miatt a boss
    // a támadások között ténylegesen elindul a player felé, nem áll távolról tüzelve.
    const direction = player.x < this.x ? -1 : 1;
    this.setVelocityX(this.moveSpeed() * direction);
    this.setFacing(direction < 0);
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

    // Az aréna falának ütközve a roham idő előtt véget ér — és a boss megszédül.
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.left || body.blocked.right) {
      this.endCharge(true);
      return;
    }

    this.setVelocityX(CHARGE_SPEED * this.chargeDirection);
  }

  private startSlash(): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.lastAction = 'SLASH';
    this.bossState = BossState.SLASH;
    this.setVelocityX(0);
    // A korábbi sárga windup-tint elmaradt: a telegraph most maga az animáció
    // (a hátrahúzott, majd lecsapó kasza).
    this.restartAnimation();

    this.scene.time.delayedCall(SLASH_STARTUP_MS, () => {
      if (this.bossState === BossState.DEAD) return;
      this.resolveSlashHit();
      this.enterCooldown(ACTION_COOLDOWN_MS);
    });
  }

  private resolveSlashHit(): void {
    if (!this.playerRef || this.playerRef.isDead()) return;

    const distance = Phaser.Math.Distance.Between(
      this.x, this.y, this.playerRef.x, this.playerRef.y
    );

    // Kis tolerancia (+10px), mint a CrowHarvesternél: ha a player épp kimozdult, még találat.
    if (distance <= SLASH_RANGE + 10) {
      this.playerRef.takeDamage(SLASH_DAMAGE);
    }
  }

  // A boss NEM hozza létre a lövedéket, csak eventet emittál — ugyanaz a minta, mint a
  // Player.castFireball() 'fireball-cast'-ja. Így a boss osztály nem függ a Fireball/scene
  // implementációtól, és unit tesztben az emisszió közvetlenül megfigyelhető.
  private startProjectile(): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canShoot = false;
    this.lastAction = 'PROJECTILE';
    this.bossState = BossState.PROJECTILE;
    this.setVelocityX(0);

    const direction: 1 | -1 = this.playerRef && this.playerRef.x < this.x ? -1 : 1;
    this.setFacing(direction < 0);
    this.restartAnimation();

    this.scene.time.delayedCall(PROJECTILE_STARTUP_MS, () => {
      if (this.bossState === BossState.DEAD) return;
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

  /**
   * Shadow Spell. Ugyanaz a delegálási minta, mint a lövedéknél: a boss csak a CÉLPONTOT
   * emittálja, az árny-oszlop sprite-ját a BossScene rakja ki. A SEBZÉS viszont itt marad
   * (mint a resolveSlashHit), hogy unit-tesztelhető legyen.
   */
  private startSpell(): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canSpell = false;
    this.lastAction = 'SPELL';
    this.bossState = BossState.SPELL;
    this.setVelocityX(0);
    if (this.playerRef) this.setFacing(this.playerRef.x < this.x);
    this.restartAnimation();

    this.scene.time.delayedCall(SPELL_CAST_MS, () => {
      if (this.bossState === BossState.DEAD) return;

      // A célpont a cast PILLANATÁBAN rögzül — ez teszi kikerülhetővé.
      const targetX = this.playerRef ? this.playerRef.x : this.x;
      this.emit('boss-spell', targetX, this.y + FEET_OFFSET_Y);

      this.scene.time.delayedCall(SPELL_IMPACT_MS, () => this.resolveSpellHit(targetX));
      this.enterCooldown(ACTION_COOLDOWN_MS);
    });

    this.scene.time.delayedCall(SPELL_COOLDOWN_MS, () => {
      this.canSpell = true;
    });
  }

  /**
   * A becsapódás CSAK vízszintes távolságot néz: az oszlop 112 világ-pixel magas, és az
   * arénában (a lebegő platformok törlése óta) egyetlen talajszint van, tehát a magasság
   * nem hordoz információt. Következmény: ugrással nem, csak oldalra lépve kerülhető ki.
   */
  private resolveSpellHit(targetX: number): void {
    // A boss halálával a már megidézett oszlop is elenyészik — a győzelem után ne
    // ölhesse meg a playert egy "utolsó" találat.
    if (this.bossState === BossState.DEAD) return;
    if (!this.playerRef || this.playerRef.isDead()) return;

    if (Math.abs(this.playerRef.x - targetX) <= SPELL_HIT_HALF_WIDTH) {
      this.playerRef.takeDamage(SPELL_DAMAGE);
    }
  }

  private startChargeWindup(player: Player): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canCharge = false;
    this.lastAction = 'CHARGE';
    this.bossState = BossState.CHARGE_WINDUP;
    this.setVelocityX(0);
    this.applyTint(CHARGE_TELEGRAPH_TINT); // piros villanás (Project_plan 12. pont)

    // Az irány a windup ELEJÉN rögzül: a roham egyenes vonalú, nem követi a playert.
    this.chargeDirection = player.x < this.x ? -1 : 1;
    this.setFacing(this.chargeDirection < 0);
    this.restartAnimation();
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
    // A windup utolsó frame-je (hátrahúzott kasza) és a dash póz animáció-folytonos.
    this.updateAnimation();

    this.scene.time.delayedCall(CHARGE_MAX_MS, () => {
      // Falnak ütközve az updateCharge() már lezárta — akkor ez no-op.
      if (this.bossState !== BossState.CHARGE) return;
      this.endCharge(false);
    });
  }

  private endCharge(hitWall: boolean): void {
    this.setVelocityX(0);
    // Itt MINDENKÉPP el kell tűnnie a piros telegraph-nak, ezért a resetTint() megy és nem
    // a clearTintState(): utóbbi állapotfüggő, és a state ebben a pillanatban még CHARGE,
    // tehát pont visszatenné a pirosat.
    this.resetTint();
    this.enterCooldown(CHARGE_COOLDOWN_MS, true);

    // A falnak rohanás megszédíti: ez a player punish-ablaka, és egyben olvasható
    // visszajelzés arról, hogy a roham véget ért.
    if (hitWall) this.playStagger();
  }

  private enterCooldown(durationMs: number, restoreCharge = false): void {
    this.bossState = BossState.COOLDOWN;
    this.setVelocityX(0);
    this.updateAnimation();

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
   * Találat-villanás. FIGYELEM: egy sima `setTint(0xffffff)` NO-OP, mert a fehér a
   * MULTIPLY mód egységeleme — a bossnak korábban emiatt egyáltalán nem volt látható
   * hit-visszajelzése. Phaser 4-ben a `setTintFill()` törölve van, a sziluett-villanás
   * `setTint(szín) + setTintMode(FILL)` párossal jön.
   *
   * A boss SZÁNDÉKOSAN nem flinchel (nincs hurt animáció találatra): egy 3 frame-es
   * megrogyás minden ütésnél megszakítaná a telegraph-jait, ami bossnál olvashatatlan.
   */
  private flashHit(): void {
    this.setTint(HIT_FLASH_TINT);
    this.setTintMode(Phaser.TintModes.FILL);

    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.bossState === BossState.DEAD) return;
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
   * A charge piros telegraph-ját NEM szabad letörölni egy hit-villanással: a player abból
   * olvassa ki, hogy jön a roham. Ezért a visszaállítás állapotfüggő.
   */
  private clearTintState(): void {
    if (
      this.bossState === BossState.CHARGE_WINDUP ||
      this.bossState === BossState.CHARGE
    ) {
      this.applyTint(CHARGE_TELEGRAPH_TINT);
      return;
    }

    this.resetTint();
  }

  private enterPhase2(): void {
    this.phase = 2;
    this.canCharge = true;
    this.emit('boss-phase-change', 2);
  }

  private die(): void {
    this.bossState = BossState.DEAD;
    this.setVelocity(0, 0);
    // Nincs sötétítő tint: az elszenesedés/szertefoszlás magába a death animációba van rajzolva.
    this.resetTint();
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    this.isStaggering = false;
    this.restartAnimation();

    // A halál-animáció végigfut, majd a maradék elhalványul. Együtt DEATH_ANIM_MS +
    // DEATH_FADE_MS = 1300ms, ami belefér a BossScene VICTORY_DELAY_MS-ébe (1400).
    this.scene.time.delayedCall(DEATH_ANIM_MS, () => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: DEATH_FADE_MS,
        onComplete: () => this.setVisible(false),
      });
    });

    this.emit('boss-death');
  }

  /**
   * Fordulás. A sheet natívan BALRA néz, és a karakter a 140px-es frame JOBB oldalán ül
   * (közepe x=106), ezért egy sima setFlipX() 72px-t ugrasztaná oldalra. A kompenzációt
   * (origin + body offset együttes tükrözése) a megosztott systems/SpriteFacing.ts végzi.
   */
  private setFacing(faceLeft: boolean): void {
    applyFacing(this, WING_BREAKER_FACING, faceLeft);
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
   * Animáció ÚJRAINDÍTÁSA akkor is, ha a kulcs nem változott.
   *
   * Ez minden támadás-indításnál KÖTELEZŐ. A COOLDOWN ugyanis az előző akció animációjára
   * képződik le, és a cooldown lejárta után a boss már a KÖVETKEZŐ update()-ben újra
   * támadhat (pl. a player végig közelharci távolságban áll) — közben egyetlen frame sem
   * jut az APPROACH walk/idle animációjára. A playAnim() guardja így „nem változott a
   * kulcs" alapon kihagyná a lejátszást, és a második csapás a befagyott utolsó frame-en
   * állna.
   */
  private restartAnimation(): void {
    this.currentAnimKey = null;
    this.updateAnimation();
  }

  private updateAnimation(): void {
    if (this.isStaggering && this.bossState !== BossState.DEAD) {
      this.playAnim(WING_BREAKER_ANIMS.HURT);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.playAnim(animKeyForState(this.bossState, this.lastAction, body.velocity.x !== 0));
  }

  /**
   * Csak akkor indít animációt, ha ténylegesen VÁLTOZOTT a kulcs. Enélkül a nem loopoló
   * animációk (slash, cast, death) minden frame-ben újraindulnának: a lejátszás végén a
   * `play(key, true)` „ignoreIfPlaying" ága már nem fog, mert az animáció ilyenkor épp
   * NEM playing. Emiatt minden hely, ami UGYANARRA a kulcsra akar újraindítást
   * (playStagger, die), köteles előbb `currentAnimKey = null`-t írni.
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
    return this.bossState === BossState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}
