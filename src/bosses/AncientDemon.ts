import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../player/PlayerAnimations';
import { applyFacing } from '../systems/SpriteFacing';
import {
  ANCIENT_DEMON_ANIMS,
  ANCIENT_DEMON_FACING,
  animKeyForState,
  BLADE_REACH_PX,
  BODY_HEIGHT,
  BODY_WIDTH,
  COMBO_STRIKE1_MS,
  COMBO_STRIKE2_MS,
  COMBO_TOTAL_MS,
  DEATH_ANIM_MS,
  DEMON_TEXTURES,
  FEET_OFFSET_Y,
  HALF_WIDTH,
  NOVA_IMPACT_MS,
  NOVA_RADIUS_PX,
  NOVA_TOP_PX,
  NOVA_TOTAL_MS,
  PLAYER_FEET_OFFSET_Y,
  SCALE,
  SUMMON_RELEASE_MS,
  SUMMON_TOTAL_MS,
  type DemonAction,
} from './AncientDemonAnimations';

// Projektterv 12./16. pont – Boss 3: Ancient Demon, Omen of Crows.
//
// A harmadik boss karaktere abból a HIÁNYBÓL nő ki, hogy a csomagban NINCS járás-animáció:
// a démon nem sétál, hanem LEBEG (lassan sodródik) és VILLAN (teleportál a player mellé).
// Ez nem kényszermegoldás, hanem a lény identitása — egy ősi, csuklyás lidérc nem gyalogol.
//
// A három boss szándékosan HÁROM különböző nyomást ad:
//   Wing-Breaker : távolsági (lövedék + Shadow Spell) + roham
//   Mad King     : tisztán közelharci (csapás, ugró becsapódás, kitörés)
//   Ancient Demon: lassú, de kikerülhetetlen jelenlét — terület-tagadás (nova),
//                  helyzet-visszavétel (blink) és FOLYAMATOS nyomás (idézett árnyékok)
//
// A GEOMETRIÁBÓL SZÁRMAZÓ számokat (hatótáv, hullám-sugár, spawn-offsetek) NEM hangoljuk
// kézzel: az AncientDemonAnimations.ts mért értékeiből számítjuk.
export enum DemonState {
  /** A párbeszéd és a belépő alatt: nem mozog, nem támad, nem sebezhető. */
  DORMANT = 'DORMANT',
  /** A "járás" megfelelője: lebegve sodródik a player felé, az idle animációval. */
  FLOAT = 'FLOAT',
  COMBO = 'COMBO',
  NOVA = 'NOVA',
  SUMMON = 'SUMMON',
  /** Villanás: elhalványul a régi helyén. Ez alatt SEBEZHETETLEN. */
  BLINK_OUT = 'BLINK_OUT',
  /** Villanás: előtűnik az új helyén. Ez alatt is SEBEZHETETLEN. */
  BLINK_IN = 'BLINK_IN',
  COOLDOWN = 'COOLDOWN',
  DEAD = 'DEAD',
}

export const MAX_HP = 340;
export const PHASE2_HP_RATIO = 0.5;

/**
 * A sodródás sebessége. SZÁNDÉKOSAN a projekt leglassúbb boss-mozgása (a Wing-Breaker 70/120,
 * a király 80/130): a démon nem üldöz, hanem KÖZELEDIK — és amikor ez már nem elég, villan.
 */
export const MOVE_SPEED_P1 = 55;
export const MOVE_SPEED_P2 = 85;

// --- Kaszakombó (reaktív, mindkét fázisban) ---------------------------------

/**
 * A kasza tényleges nyúlása a csapás frame-jein, világ-pixelben (45 forrás-px * SCALE).
 * NEM szabadon hangolt szám.
 *
 * FIGYELEM, ez a projekt legfairebb boss-hatótávja: a player kardja a saját középpontjától
 * +59-ig ér, a démon félszélessége 16, tehát a player 75-ről üt — a démon 90-ről. A 15 px-es
 * előny elenyésző a Wing-Breaker (138) és a Mad King (142) fölényéhez képest. Ez tudatos: a
 * démon nyomása nem a hatótávból jön, hanem a novából és az árnyékokból.
 */
export const SLASH_RANGE = BLADE_REACH_PX * SCALE; // 90
/** Csapásonként. A teljes, mindkét felében eltalált kombó tehát 24. */
export const COMBO_DAMAGE = 12;

// --- Árny-hullám (nova, mindkét fázisban) -----------------------------------

/** A rajzolt hullám sugara világ-pixelben (38 forrás-px * SCALE). */
export const NOVA_RADIUS = NOVA_RADIUS_PX * SCALE; // 76
/**
 * A találati sáv: a hullám sugara + a player félszélessége.
 *
 * ÉRDEKES EGYBEESÉS, amit érdemes tudni: ez FÜGGETLEN levezetésből (a hullám mért szélessége)
 * PONTOSAN a SLASH_RANGE-re (a kasza mért nyúlása) esik. Vagyis a közelharci sáv a démoné —
 * hacsak a player nem a LEVEGŐBEN van.
 */
export const NOVA_HIT_RANGE = NOVA_RADIUS + PLAYER_BODY_WIDTH / 2; // 90
/**
 * Ilyen magasra kell ugrani a hullám fölé (47 forrás-px * SCALE). A player 156-os
 * ugrás-plafonjának a 60 %-a, és 231 ms alatt megvan — a 720 ms-os telegraph tehát bőven
 * elég rá (lásd NOVA_IMPACT_MS levezetését az animációs modulban).
 */
export const NOVA_CLEAR_HEIGHT = NOVA_TOP_PX * SCALE; // 94
export const NOVA_DAMAGE = 18;
/**
 * Ennél messzebbről nem kezd bele: a hullám sugara véges, és egy vakon elpazarolt nova
 * ingyen punish-ablak lenne. Kis ráhagyás a HIT_RANGE fölött, hogy a közeledő playert még
 * elkapja.
 */
export const NOVA_MAX_RANGE = NOVA_HIT_RANGE + 30; // 120
export const NOVA_COOLDOWN_MS = 4500;

// --- Villanás (blink) -------------------------------------------------------
// A démon gap-closere. Ez bünteti azt, aki egyszerűen lehagyja a lassú lényt és távolról
// tűzgolyózik: a távolság nem menedék, mert a démon nem megteszi, hanem MEGSZÜNTETI.

/** Ennél messzebbre került player esetén villan. */
export const BLINK_MIN_RANGE = 260;
/**
 * Ilyen távolra érkezik a playertől. SZÁNDÉKOSAN a SLASH_RANGE (90) FÖLÖTT: a megjelenés
 * nem azonnali csapás, marad egy ütem reagálni.
 */
export const BLINK_OFFSET = 110;
export const BLINK_OUT_MS = 220;
export const BLINK_IN_MS = 200;
export const BLINK_COOLDOWN_P1_MS = 4000;
export const BLINK_COOLDOWN_P2_MS = 2800;

// --- Idézés (CSAK Phase 2) --------------------------------------------------

export const SUMMON_COUNT = 2;
/** A két árnyék a démon két oldalán nő ki, a testén kívül. */
export const SUMMON_SPAWN_OFFSET_X = HALF_WIDTH + 30; // 46
/** A démon középpontja fölött — a lidérc lebeg, nem a padlóról kel fel. */
export const SUMMON_SPAWN_RISE = 30;
export const SUMMON_COOLDOWN_MS = 7000;

// --- Közös ------------------------------------------------------------------

/** Rövid kifújás két akció között. */
export const ACTION_COOLDOWN_MS = 900;

/**
 * Ha a player vízszintesen szinte pontosan a démon felett/alatt áll, a "merre induljak"
 * döntés nulla körül minden frame-ben átbillenne. Ugyanaz a védelem, mint a
 * CrowHarvester / Wing-Breaker / Mad King DIRECTION_DEADZONE-ja.
 */
export const DIRECTION_DEADZONE = 6;

/**
 * Az "elkötelezett", cooldownos támadások KÖRFORGÁSA. Miért rotáció és nem prioritási sor:
 * lásd a Wing-Breaker azonos szakaszát (egy prioritási sorban a legelöl álló támadás
 * monopolizálja a fázist, amint a cooldownja a state-lockkal egyszerre jár le).
 */
export const ATTACK_ROTATION = ['NOVA', 'SUMMON', 'BLINK'] as const;
type RotatedAttack = (typeof ATTACK_ROTATION)[number];

/** Exportált, mert a telegraph-védelem tesztje pont EZT a callbacket kell hogy elsüsse. */
export const HIT_FLASH_MS = 100;
const HIT_FLASH_TINT = 0xffffff;

/**
 * A KÉT TELEGRAPH SZÍNE SZÁNDÉKOSAN ELVÁLIK, és itt ez NEM kozmetika, hanem a csomag
 * adottságából következő KÉNYSZER: a kombó és a nova windupja UGYANAZ a mozdulat (a démon
 * a feje fölé emeli a kaszát), tehát pusztán az animációból nem megkülönböztethetők.
 *   arany  = jön a KASZACSAPÁS  -> ugorj VAGY lépj hátra
 *   ibolya = jön az ÁRNY-HULLÁM -> csak az UGRÁS visz ki belőle
 *
 * MIÉRT MŰKÖDIK EGYÁLTALÁN EGY MULTIPLY TINT EGY FEKETE LÉNYEN: a köpeny (14,12,12) felett
 * valóban gyakorlatilag no-op — de a telegraph pillanatában épp a VILÁGOS PENGE (128,123,122)
 * van a magasban, és azon a szorzás tisztán látszik. A tint tehát pont azt a képelemet
 * színezi, ami a telegraph.
 */
export const COMBO_TELEGRAPH_TINT = 0xffd070;
export const NOVA_TELEGRAPH_TINT = 0x9a5cff;

/** Az aréna vízszintes határai a villanáshoz — a scene adja át. */
export interface DemonArenaBounds {
  minX: number;
  maxX: number;
}

const DEFAULT_ARENA_BOUNDS: DemonArenaBounds = { minX: 60, maxX: 740 };

export default class AncientDemon extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public demonState: DemonState = DemonState.DORMANT;

  private phase: 1 | 2 = 1;
  private hp = MAX_HP;

  private readonly arenaBounds: DemonArenaBounds;

  private isActionBusy = false;
  private canNova = true;
  private canSummon = false; // csak Phase 2-ben nyílik meg
  private canBlink = true;

  /** Hol tart a támadás-körforgás. */
  private rotationIndex = 0;

  private playerRef: Player | null = null;

  /** Melyik akcióból értünk COOLDOWN-ba — ez dönti el, melyik animáció fut tovább. */
  private lastAction: DemonAction | null = null;
  /** Az épp lejátszott animáció kulcsa — lásd playAnim(). */
  private currentAnimKey: string | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, bounds = DEFAULT_ARENA_BOUNDS) {
    super(scene, x, y, DEMON_TEXTURES.IDLE, 0);

    this.arenaBounds = bounds;

    scene.add.existing(this);
    // A setScale MÉG a body létrehozása ELŐTT: az Arcade Body a konstruktorában menti el a
    // game object skáláját (_sx), és a body méretét sourceWidth * _sx-ként számolja
    // (15. technikai tanulság).
    this.setScale(SCALE);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // A body a rajzolt köpenyhez igazodik, nem a 100x100-as frame-hez. A méret
    // FORRÁS-pixelben megy: a Phaser a sprite scaleX-ével szorozza.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    this.setFacing(true); // a sheet natívan JOBBRA néz, a démon balra indul (a player felé)

    this.updateAnimation();
  }

  /** A scene a belépő-animáció végén hívja: innentől él a state machine. */
  activate(): void {
    if (this.demonState !== DemonState.DORMANT) return;
    this.demonState = DemonState.FLOAT;
  }

  // A scene minden frame-ben meghívja, átadva a player referenciát.
  update(player: Player): void {
    if (this.demonState === DemonState.DEAD || this.demonState === DemonState.DORMANT) return;

    this.playerRef = player;

    const horizontalDistance = Math.abs(this.x - player.x);
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.demonState) {
      case DemonState.FLOAT:
        this.updateFloat(player, horizontalDistance, distanceToPlayer);
        break;
      case DemonState.COMBO:
        // A kombó egy elkötelezett, kétcsapásos mozdulat: az irány a kezdetén rögzül, tehát
        // a telegraph nem hazudik. Csak megállunk.
        this.setVelocityX(0);
        break;
      case DemonState.NOVA:
      case DemonState.SUMMON:
      case DemonState.COOLDOWN:
        // Ezeket delayedCall-láncok vezérlik; itt csak megállunk és a player felé fordulunk.
        this.setVelocityX(0);
        this.setFacing(player.x < this.x);
        break;
      case DemonState.BLINK_OUT:
      case DemonState.BLINK_IN:
        // A villanás alatt nem mozdul és nem fordul: a helyét a tween onComplete-je állítja.
        this.setVelocityX(0);
        break;
    }

    this.updateAnimation();
  }

  /**
   * Támadás-választás. SZÁNDÉKOSAN determinisztikus (nincs véletlen), hogy a unit tesztek ne
   * legyenek flaky-k, és hogy a player fel tudja ismerni a démon mintáit.
   *
   * FIGYELEM — a sorrend ITT FORDÍTOTT a Wing-Breakerhez és a Mad Kinghez képest: a ROTÁCIÓ
   * fut ELŐBB, és a reaktív kaszakombó csak a fallback. Ennek konkrét oka van: a nova
   * találati sávja (90) PONTOSAN a kombó hatótávja, tehát ha a kombó előzne, a nova soha nem
   * sülne el ott, ahol egyáltalán találhat — a démon a közelharci sávban egy örökös
   * kaszakombó-gépezet lenne. Így viszont a cooldownok (nova 4500, idézés 7000, villanás
   * 4000) miatt a kombó továbbra is a leggyakoribb támadás marad, a nova pedig kb. minden
   * második-harmadik akcióként szakítja meg a ritmust.
   */
  private updateFloat(player: Player, horizontalDistance: number, distanceToPlayer: number): void {
    if (this.isActionBusy) return;

    // 1) A rotációt ott vesszük fel, ahol legutóbb abbahagytuk, és az első ELÉRHETŐT
    // indítjuk. A nem elérhetőket átugorjuk — a mutató csak a ténylegesen elsütött támadás
    // mögé lép, tehát az átugrott a következő körben előbb jön sorra.
    for (let step = 0; step < ATTACK_ROTATION.length; step++) {
      const index = (this.rotationIndex + step) % ATTACK_ROTATION.length;
      const attack = ATTACK_ROTATION[index];

      if (!this.canUse(attack, horizontalDistance, distanceToPlayer)) continue;

      this.rotationIndex = (index + 1) % ATTACK_ROTATION.length;
      this.startRotatedAttack(attack, player);
      return;
    }

    // 2) Reaktív kaszakombó: közelharci távolságon belül ez a fallback.
    if (distanceToPlayer <= SLASH_RANGE) {
      this.startCombo(player);
      return;
    }

    // 3) Vízszintesen (majdnem) egy vonalban lévő, de el nem érhető cél: megállunk, különben
    // az irány frame-enként átbillenne.
    if (horizontalDistance <= DIRECTION_DEADZONE) {
      this.setVelocityX(0);
      return;
    }

    // 4) Sodródás a player felé.
    const direction = player.x < this.x ? -1 : 1;
    this.setVelocityX(this.moveSpeed() * direction);
    this.setFacing(direction < 0);
  }

  /** A rotáció szűrői: távolság + a támadás saját cooldown-kapuja. */
  private canUse(
    attack: RotatedAttack,
    horizontalDistance: number,
    distanceToPlayer: number
  ): boolean {
    switch (attack) {
      case 'NOVA':
        return this.canNova && distanceToPlayer <= NOVA_MAX_RANGE;
      case 'SUMMON':
        return this.phase === 2 && this.canSummon;
      case 'BLINK':
        return this.canBlink && horizontalDistance > BLINK_MIN_RANGE;
    }
  }

  private startRotatedAttack(attack: RotatedAttack, player: Player): void {
    switch (attack) {
      case 'NOVA':
        this.startNova();
        return;
      case 'SUMMON':
        this.startSummon();
        return;
      case 'BLINK':
        this.startBlink(player);
        return;
    }
  }

  // --- Kaszakombó -----------------------------------------------------------

  /**
   * Két csapás egyetlen mozdulatban. A sebzés az animáció két ív-frame-jén oldódik fel; a
   * két időpont az animációs modulból jön, tehát a hang, a kép és a sebzés együtt mozog.
   */
  private startCombo(player: Player): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.lastAction = 'COMBO';
    this.demonState = DemonState.COMBO;
    this.setVelocityX(0);
    // Az irány a mozdulat elején rögzül — a kombó elkötelezett.
    this.setFacing(player.x < this.x);
    this.applyTint(COMBO_TELEGRAPH_TINT);
    this.restartAnimation();

    this.scene.time.delayedCall(COMBO_STRIKE1_MS, () => {
      if (this.demonState === DemonState.DEAD) return;
      this.resolveStrike();
    });

    this.scene.time.delayedCall(COMBO_STRIKE2_MS, () => {
      if (this.demonState === DemonState.DEAD) return;
      // A telegraph a MÁSODIK csapásnál tűnik el, nem az elsőnél: a mozdulat egyben tart.
      // resetTint() és nem clearTintState(): az állapot ekkor még COMBO, tehát utóbbi pont
      // visszatenné az aranyat (a Mad King azonos fogása).
      this.resetTint();
      this.resolveStrike();
    });

    this.scene.time.delayedCall(COMBO_TOTAL_MS, () => {
      if (this.demonState === DemonState.DEAD) return;
      this.enterCooldown(ACTION_COOLDOWN_MS);
    });
  }

  private resolveStrike(): void {
    // A csapás hangja a lecsapás PILLANATÁBAN szól — a bevett delegálási minta: a scene
    // játssza le. A DEAD guard a hívóban van, tehát a windup alatt megölt démon néma.
    this.emit('demon-slash');

    if (!this.playerRef || this.playerRef.isDead()) return;

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.playerRef.x,
      this.playerRef.y
    );

    // Kis tolerancia (+10px), mint a CrowHarvesternél és mindkét eddigi bossnál.
    if (distance <= SLASH_RANGE + 10) {
      this.playerRef.takeDamage(COMBO_DAMAGE);
    }
  }

  // --- Árny-hullám ----------------------------------------------------------

  private startNova(): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canNova = false;
    this.lastAction = 'NOVA';
    this.demonState = DemonState.NOVA;
    this.setVelocityX(0);
    this.applyTint(NOVA_TELEGRAPH_TINT);
    this.restartAnimation();
    this.emit('demon-nova-windup');

    this.scene.time.delayedCall(NOVA_IMPACT_MS, () => {
      if (this.demonState === DemonState.DEAD) return;
      this.resetTint();
      this.resolveNova();
    });

    this.scene.time.delayedCall(NOVA_TOTAL_MS, () => {
      if (this.demonState === DemonState.DEAD) return;
      this.enterCooldown(ACTION_COOLDOWN_MS);
    });

    this.scene.time.delayedCall(NOVA_COOLDOWN_MS, () => {
      this.canNova = true;
    });
  }

  /**
   * A hullám sebzése. KÉT feltétel ÉS-e, és a második a támadás lényege:
   *  - vízszintesen a rajzolt hullámon belül (NOVA_HIT_RANGE),
   *  - ÉS a player talpa a hullám teteje ALATT van (tehát nem ugrott át fölötte).
   *
   * A magasságot a TALPPAL mérjük, nem a középponttal: a hullám egy 10..94 px magas sáv a
   * padló felett, tehát a playernek TELJESEN fölé kell kerülnie ahhoz, hogy kimaradjon.
   */
  private resolveNova(): void {
    this.emit('demon-nova-impact', this.x, this.y + FEET_OFFSET_Y);

    if (!this.playerRef || this.playerRef.isDead()) return;

    if (Math.abs(this.playerRef.x - this.x) > NOVA_HIT_RANGE) return;

    const demonFeetY = this.y + FEET_OFFSET_Y;
    const playerFeetY = this.playerRef.y + PLAYER_FEET_OFFSET_Y;
    if (playerFeetY <= demonFeetY - NOVA_CLEAR_HEIGHT) return;

    this.playerRef.takeDamage(NOVA_DAMAGE);
  }

  // --- Idézés (Phase 2) -----------------------------------------------------

  private startSummon(): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canSummon = false;
    this.lastAction = 'SUMMON';
    this.demonState = DemonState.SUMMON;
    this.setVelocityX(0);
    this.restartAnimation();

    this.scene.time.delayedCall(SUMMON_RELEASE_MS, () => {
      if (this.demonState === DemonState.DEAD) return;
      this.releaseShades();
    });

    this.scene.time.delayedCall(SUMMON_TOTAL_MS, () => {
      if (this.demonState === DemonState.DEAD) return;
      this.enterCooldown(ACTION_COOLDOWN_MS);
    });

    this.scene.time.delayedCall(SUMMON_COOLDOWN_MS, () => {
      this.canSummon = true;
    });
  }

  /**
   * A démon NEM hozza létre a lidérceket, csak eventet emittál a spawn-pontokkal — ugyanaz a
   * delegálási minta, amivel a Wing-Breaker a lövedékét és a Shadow Spelljét adja át a
   * scene-nek. Így a boss osztály nem függ a ShadeMiniontól, és a kibocsátás unit tesztben
   * megfigyelhető.
   */
  private releaseShades(): void {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < SUMMON_COUNT; i++) {
      // Váltakozva a démon két oldalán: 2 árnyék -> egy balra, egy jobbra.
      const side = i % 2 === 0 ? -1 : 1;
      const step = Math.floor(i / 2) + 1;
      points.push({
        x: this.x + side * SUMMON_SPAWN_OFFSET_X * step,
        y: this.y - SUMMON_SPAWN_RISE,
      });
    }

    this.emit('demon-summon', points);
  }

  // --- Villanás -------------------------------------------------------------

  /**
   * Teleport a player mellé. A csomagban nincs hozzá animáció, tehát a mozdulatot az
   * ALPHA-TWEEN közli: elhalványul, majd máshol előtűnik. (AfterImageTrail SZÁNDÉKOSAN nem
   * kerül ide: az a folyamatos gyors mozgás csíkja, egy helyben álló teleportnál csak
   * egymásra pakolná a másolatokat.)
   */
  private startBlink(player: Player): void {
    if (this.isActionBusy) return;

    this.isActionBusy = true;
    this.canBlink = false;
    this.demonState = DemonState.BLINK_OUT;
    this.setVelocityX(0);
    // A lastAction-t SZÁNDÉKOSAN nem írjuk át: a villanás nem támadás, a cooldown alatt az
    // előző akció pózát tartsa meg.
    this.resetTint();
    this.emit('demon-blink-out');

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: BLINK_OUT_MS,
      onComplete: () => this.arriveFromBlink(player),
    });

    this.scene.time.delayedCall(this.blinkCooldown(), () => {
      this.canBlink = true;
    });
  }

  private arriveFromBlink(player: Player): void {
    if (this.demonState === DemonState.DEAD) return;

    this.demonState = DemonState.BLINK_IN;
    this.setPosition(this.blinkDestinationX(player), this.y);
    this.setFacing(player.x < this.x);
    this.emit('demon-blink-in', this.x, this.y);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: BLINK_IN_MS,
      onComplete: () => {
        if (this.demonState === DemonState.DEAD) return;
        this.enterCooldown(ACTION_COOLDOWN_MS);
      },
    });
  }

  /**
   * Melyik oldalára érkezzen a playernek? Arra, amerre TÖBB hely van — így a démon nem
   * szorítja be magát az aréna sarkába, és a playernek is marad hová kitérnie.
   */
  private blinkDestinationX(player: Player): number {
    const center = (this.arenaBounds.minX + this.arenaBounds.maxX) / 2;
    const side = player.x < center ? 1 : -1;
    return Phaser.Math.Clamp(
      player.x + side * BLINK_OFFSET,
      this.arenaBounds.minX,
      this.arenaBounds.maxX
    );
  }

  private blinkCooldown(): number {
    return this.phase === 2 ? BLINK_COOLDOWN_P2_MS : BLINK_COOLDOWN_P1_MS;
  }

  // --- Közös ----------------------------------------------------------------

  private enterCooldown(durationMs: number): void {
    this.demonState = DemonState.COOLDOWN;
    this.setVelocityX(0);
    this.updateAnimation();

    this.scene.time.delayedCall(durationMs, () => {
      this.isActionBusy = false;
      if (this.demonState === DemonState.DEAD) return;
      this.demonState = DemonState.FLOAT;
    });
  }

  takeDamage(amount: number): void {
    if (!this.isVulnerable()) return;

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
   * A villanás alatt SEBEZHETETLEN — enélkül a teleport ingyen punish-ablak lenne, holott
   * pont az a lény menekülő/visszavevő mozdulata. A DORMANT ugyanezért zárt: a fight a
   * párbeszéd és a belépő alatt még el sem kezdődött.
   *
   * A scene is ezt kérdezi a találat-kezelőjében, mielőtt registerHit()-et hívna — különben
   * egy villanó démonra mért csapás elhasználódna anélkül, hogy bármit tenne.
   */
  isVulnerable(): boolean {
    return (
      this.demonState !== DemonState.DEAD &&
      this.demonState !== DemonState.DORMANT &&
      this.demonState !== DemonState.BLINK_OUT &&
      this.demonState !== DemonState.BLINK_IN
    );
  }

  /**
   * Találat-villanás. Phaser 4-ben a setTintFill() törölve van, a sziluett-villanás
   * setTint(szín) + setTintMode(FILL) párossal jön (14. technikai tanulság). Ez a FILL mód
   * a démonnál különösen fontos: a lény majdnem fekete, tehát egy MULTIPLY-villanás
   * láthatatlan lenne.
   *
   * A démon — mindkét eddigi boss elve szerint — SZÁNDÉKOSAN nem flinchel: a csomagban
   * nincs is hurt animáció, és egy megrogyás minden ütésnél megszakítaná a telegraph-jait.
   */
  private flashHit(): void {
    this.setTint(HIT_FLASH_TINT);
    this.setTintMode(Phaser.TintModes.FILL);

    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.demonState === DemonState.DEAD) return;
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
   * A telegraph-okat NEM szabad letörölni egy hit-villanással: a player azokból olvassa ki,
   * hogy melyik windup fut (a kombóé és a nováé UGYANAZ a mozdulat). Ezért a visszaállítás
   * állapotfüggő — enélkül egy jól időzített találat pont a legfontosabb pillanatban
   * vakítaná el a playert.
   */
  private clearTintState(): void {
    if (this.demonState === DemonState.COMBO) {
      this.applyTint(COMBO_TELEGRAPH_TINT);
      return;
    }

    if (this.demonState === DemonState.NOVA) {
      this.applyTint(NOVA_TELEGRAPH_TINT);
      return;
    }

    this.resetTint();
  }

  private enterPhase2(): void {
    this.phase = 2;
    this.canSummon = true;
    // A fázis a szignatúra-mozdulatával nyit: a rotációt egyből az idézés slotjára állítjuk,
    // hogy a "PHASE II" felirat után ne egy újabb nova jöjjön (a Mad King azonos fogása).
    this.rotationIndex = ATTACK_ROTATION.indexOf('SUMMON');
    this.emit('demon-phase-change', 2);
  }

  private die(): void {
    this.demonState = DemonState.DEAD;
    this.setVelocity(0, 0);
    this.resetTint();
    this.setAlpha(1); // ha épp villanás közben ölték meg, a szétfoszlásnak látszania kell
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    this.restartAnimation();

    // FADE NINCS, és test SEM MARAD: a death sheet 18 frame-en át MAGÁTÓL foszlik szét
    // (az utolsó rajzolt frame már csak néhány pixel, az f18-f19 teljesen üres). A démon
    // "visszakerül a pokolba" — nincs mit hátrahagynia (Project_plan.md 16. pont).
    this.emit('demon-death');
  }

  /**
   * Fordulás. A sheet natívan JOBBRA néz, és a test közepe (43) NEM a frame közepe (50),
   * tehát a kompenzáció itt ténylegesen dolgozik — enélkül a démon 28 világ-pixelt ugrana
   * oldalra minden fordulásnál (11./16. technikai tanulság).
   */
  private setFacing(faceLeft: boolean): void {
    applyFacing(this, ANCIENT_DEMON_FACING, faceLeft);
  }

  /**
   * Animáció ÚJRAINDÍTÁSA akkor is, ha a kulcs nem változott. Minden támadás-indításnál
   * KÖTELEZŐ — a COOLDOWN ugyanis az előző akció animációjára képződik le, és a cooldown
   * lejárta után a démon már a KÖVETKEZŐ update()-ben újra támadhat, közben egyetlen frame
   * sem jut az idle-re. A playAnim() guardja így "nem változott a kulcs" alapon kihagyná a
   * lejátszást, és a második kombó a befagyott utolsó frame-en állna (9. tanulság).
   */
  private restartAnimation(): void {
    this.currentAnimKey = null;
    this.updateAnimation();
  }

  private updateAnimation(): void {
    this.playAnim(animKeyForState(this.demonState, this.lastAction));
  }

  /**
   * Csak akkor indít animációt, ha ténylegesen VÁLTOZOTT a kulcs (9. technikai tanulság).
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
    return this.demonState === DemonState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}

/** A halál-animáció hossza — a FinalBossScene ebből méretezi a győzelmi késleltetést. */
export { DEATH_ANIM_MS, ANCIENT_DEMON_ANIMS };
