import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';
import { BODY_HEIGHT as PLAYER_BODY_HEIGHT } from '../player/PlayerAnimations';
import { applyFacing } from '../systems/SpriteFacing';
import {
  animKeyForState,
  CAST_RELEASE_MS,
  CAST_TOTAL_MS,
  DEATH_ANIM_MS,
  DEATH_FADE_MS,
  FEET_OFFSET_Y,
  GRAVECALLER_ANIMS,
  GRAVECALLER_FACING,
  GRAVECALLER_TEXTURES,
  HALF_BODY_WIDTH,
  HIT_ANIM_MS,
  BODY_HEIGHT,
  BODY_WIDTH,
} from './GravecallerAnimations';

/**
 * Enemy 2 – Gravecaller (a Project_plan.md 11. pontjának „Archer / Caster"-e).
 *
 * Távolsági ellenfél: nem ér hozzá a playerhez, hanem árny-tűzgolyót lő rá, és közben
 * próbál távolságot tartani. A neve tematikus, nem az asset csomagé: a lore szerint pont
 * az ilyen lény hívja vissza a holtakat — vagyis azt sérti meg, amit Lazarus őriz.
 *
 * A state machine a terv öt dobozának 1:1 leképezése:
 *
 *   PATROL → DETECT PLAYER → MAINTAIN DISTANCE → ATTACK (CAST) → REPOSITION
 *
 * A `CrowHarvester.ts` szerkezetét követi (delayedCall-láncok az időzítéshez, exportált
 * tuning-konstansok, `playAnim()` kulcs-guard, `destroy()` override), de a GEOMETRIÁBÓL
 * SZÁRMAZÓ számokat (hatótávok, spawn-offsetek, startup) itt sem hangoljuk kézzel: a
 * `GravecallerAnimations.ts` mért értékeiből számítjuk.
 */
export enum GravecallerState {
  PATROL = 'PATROL',
  /** DETECT PLAYER után: tartja a távolságot, és innen indítja a castot. */
  MAINTAIN_DISTANCE = 'MAINTAIN_DISTANCE',
  /** ATTACK. A TELJES cast animációt lefedi (windup + kikövetkezés) — közben áll. */
  CAST = 'CAST',
  /** A cast utáni áthelyezkedés. Mozog, de nem tud castolni: ez maga a cooldown. */
  REPOSITION = 'REPOSITION',
  DEAD = 'DEAD',
}

export const MAX_HP = 24; // 3 kardcsapás (10) — szándékosan törékenyebb a CrowHarvesternél (40)

export const PATROL_SPEED = 40; // lassabb a harvesternél (50): ez őrszem, nem járőr
/**
 * A hátrálás sebessége. SZÁNDÉKOSAN messze a player MOVE_SPEED-je (200) alatt: a
 * távolságtartás így késleltetés, nem menekülés — a user kérése szerint közel lehet menni
 * hozzá és karddal megölni.
 */
export const RETREAT_SPEED = 70;
export const ADVANCE_SPEED = 50;
export const PATROL_RANGE = 60;

/** A user kérése: jóval a CrowHarvester 220-a fölött — messziről észreveszi a playert. */
export const DETECTION_RANGE = 400;
/** Hiszterézis, hogy ne pattogjon a határon. VÍZSZINTES-only, mint a CrowHarvesternél. */
export const LOSE_RANGE = 520;

/**
 * Vertikális kapu. A lövedék VÍZSZINTESEN repül, tehát egy jóval lentebb/fentebb lévő
 * playert nem is találna el — enélkül a Gravecaller a levegőbe lőne. A Level 1-en ez pont
 * annyi, hogy az `E1`/`E2`/`E3` platformokon álló player benne van, a `G5` talajon álló
 * viszont nem (a `level1Layout.test.ts` ezt futtatható állításként őrzi).
 */
export const VERTICAL_DETECTION_RANGE = 80;

/** Ez alatt hátrál. */
export const RETREAT_RANGE = 140;
/** E fölött közelít, hogy a lövedéke elérjen. */
export const PREFERRED_RANGE = 300;

/** Az ANIMÁCIÓBÓL: a lövedék pont akkor születik, amikor a staff lecsap (f31). */
export const CAST_STARTUP_MS = CAST_RELEASE_MS; // 720
/** Az ANIMÁCIÓBÓL: a kioldás UTÁNI kikövetkezés — eddig még mindig áll. */
export const CAST_RECOVERY_MS = CAST_TOTAL_MS - CAST_RELEASE_MS; // 440
/** A REPOSITION hossza: ennyi ideig mozoghat, de nem castolhat. */
export const REPOSITION_MS = 1200;

export const PROJECTILE_DAMAGE = 10;
/** Lassabb a playerénél (400) és a bossénál (260): van idő reagálni rá. */
export const PROJECTILE_SPEED = 220;
export const PROJECTILE_SIZE = 16;
/** Épp a testen kívül, hogy ne a lényen belül jelenjen meg. */
export const PROJECTILE_SPAWN_OFFSET_X = HALF_BODY_WIDTH + 8; // 18
/**
 * A lövedék a player MELLMAGASSÁGÁBAN indul — ugyanaz a képlet, mint a bossnál: a lény
 * középpontja a talaj felett FEET_OFFSET_Y-nal van, a player mellkasa a fél testmagasságával.
 */
export const PROJECTILE_SPAWN_OFFSET_Y = FEET_OFFSET_Y - PLAYER_BODY_HEIGHT / 2; // -4

/** Ugyanaz a védelem, mint a CrowHarvester DIRECTION_DEADZONE-ja: ne pörögjön az irány. */
export const DIRECTION_DEADZONE = 4;

/**
 * A debug HP-szöveg magassága. 42, nem 46: a sziluett teteje (a staff gyűrűje) a
 * `sprite.y - 30`-nál van, tehát 42 fölötte marad, de nem lóg feleslegesen magasra.
 */
const HP_TEXT_OFFSET_Y = 42;

/**
 * Szándékosan MEZŐRŐL MEZŐRE azonos a `CrowHarvesterConfig`-gal: a `Level1Scene` így
 * egyetlen objektumot épít az `enemyChaseBounds()`-ból, és típus szerint mindkét lénynek
 * átadhatja. (A két lény ettől függetlenül külön osztály — nincs közös ősük.)
 */
export interface GravecallerConfig {
  /** Abszolút világ-X határok a NYUGALMI sétához. Ha nincs megadva: spawn ± PATROL_RANGE. */
  patrolMinX?: number;
  patrolMaxX?: number;
  /**
   * Abszolút világ-X határok az ÜLDÖZÉSHEZ/áthelyezkedéshez — a felület pereme, behúzva.
   * Ez az, ami miatt a platformon álló Gravecaller SAROKBA SZORÍTHATÓ: a hátrálása a
   * platform szélén véget ér.
   */
  chaseMinX?: number;
  chaseMaxX?: number;
}

export default class Gravecaller extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public gravecallerState: GravecallerState = GravecallerState.PATROL;

  private hp = MAX_HP;
  private readonly maxHp = MAX_HP;
  private hpText: Phaser.GameObjects.Text;

  private readonly patrolMinX: number;
  private readonly patrolMaxX: number;
  private readonly chaseMinX: number;
  private readonly chaseMaxX: number;
  private patrolDirection: 1 | -1 = 1;
  private isCastBusy = false;
  private playerRef: Player | null = null;

  /** Az épp lejátszott animáció kulcsa — lásd playAnim(). */
  private currentAnimKey: string | null = null;
  /** Amíg áll, a találat-animációt nem írja felül az idle/walk. */
  private isReacting = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: GravecallerConfig = {}) {
    super(scene, x, y, GRAVECALLER_TEXTURES.IDLE, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.patrolMinX = config.patrolMinX ?? x - PATROL_RANGE;
    this.patrolMaxX = config.patrolMaxX ?? x + PATROL_RANGE;
    this.chaseMinX = config.chaseMinX ?? Number.NEGATIVE_INFINITY;
    this.chaseMaxX = config.chaseMaxX ?? Number.POSITIVE_INFINITY;

    // A body a köpenyhez igazodik, nem a 96x96-os frame-hez. Közvetlenül a bodyn hívjuk,
    // mert az Arcade.Sprite-on a Components.Size verziója árnyékolja a GameObject-ét, és a
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
    if (this.gravecallerState === GravecallerState.DEAD) return;

    this.playerRef = player;
    this.hpText.setPosition(this.x, this.y - HP_TEXT_OFFSET_Y);

    const horizontalDistance = Math.abs(this.x - player.x);
    const verticalDistance = Math.abs(this.y - player.y);

    switch (this.gravecallerState) {
      case GravecallerState.PATROL:
        this.updatePatrol(horizontalDistance, verticalDistance);
        break;
      case GravecallerState.MAINTAIN_DISTANCE:
        this.updateMaintainDistance(player, horizontalDistance, verticalDistance);
        break;
      case GravecallerState.REPOSITION:
        // Ugyanaz a térközölés, csak a cast kapuja zárva — ez MAGA a cooldown.
        this.applySpacing(player, horizontalDistance);
        break;
      case GravecallerState.CAST:
        // A cast időzítését delayedCall vezérli; itt csak állunk és a player felé nézünk.
        this.setVelocityX(0);
        this.setFacing(player.x < this.x);
        break;
    }

    this.updateAnimation();
  }

  private updatePatrol(horizontalDistance: number, verticalDistance: number): void {
    // DETECT PLAYER: vízszintesen ÉS nagyjából azonos magasságban is közel kell lennie.
    if (
      horizontalDistance <= DETECTION_RANGE &&
      verticalDistance <= VERTICAL_DETECTION_RANGE
    ) {
      this.gravecallerState = GravecallerState.MAINTAIN_DISTANCE;
      return;
    }

    if (this.x <= this.patrolMinX) this.patrolDirection = 1;
    if (this.x >= this.patrolMaxX) this.patrolDirection = -1;

    this.setVelocityX(PATROL_SPEED * this.patrolDirection);
    this.setFacing(this.patrolDirection < 0);
  }

  private updateMaintainDistance(
    player: Player,
    horizontalDistance: number,
    verticalDistance: number
  ): void {
    // A LOSE_RANGE szándékosan vízszintes-only (mint a CrowHarvesternél): ez tartja meg a
    // sebzés-alapú ébresztést egy más szinten álló player esetén is.
    if (horizontalDistance > LOSE_RANGE) {
      this.gravecallerState = GravecallerState.PATROL;
      return;
    }

    const isHolding = this.applySpacing(player, horizontalDistance);

    // CSAK ÁLLÓ HELYZETBŐL castol. Ez teszi a MAINTAIN DISTANCE-t valódi állapottá: a lény
    // előbb rendezi a térközt (hátrál vagy közelít), és csak utána emeli a staffot.
    // Gameplay-ben ez két dolgot ad ingyen:
    //   - a túl messziről érkező playerre nem lő vakon, hanem előbb lőtávba sétál;
    //   - a rárohanó player elől előbb hátrál, tehát a közelharc első pillanatai csendesek.
    // Sarokba szorítva viszont továbbra is tüzel: a peremen a hátrálás velocity 0-t ad,
    // tehát a lény "áll" — nem válik ártalmatlan bábuvá.
    if (isHolding && this.canCast(horizontalDistance, verticalDistance)) {
      this.startCast();
    }
  }

  /**
   * MAINTAIN DISTANCE: túl közel -> hátrál, túl messze -> közelít, a köztes sávban megáll.
   * A hátrálás a `chaseMinX/MaxX` peremén véget ér, tehát egy platformon álló Gravecaller
   * sarokba szorítható — ez a „ne legyen nehéz megközelíteni" követelmény geometriai fele.
   *
   * A lény MINDIG a player felé néz, akkor is, ha hátrafelé lép: a staffja végig a playeren
   * marad, és így a következő cast iránya sem ugrik meg.
   *
   * @returns igaz, ha a lény ÁLL (rendben van a térköz, sarokba szorult, vagy a deadzone-ban
   *          van) — a cast kapuja ez.
   */
  private applySpacing(player: Player, horizontalDistance: number): boolean {
    // Ha (majdnem) pontosan egy vonalban van vízszintesen, ne villogjon az irány.
    if (horizontalDistance <= DIRECTION_DEADZONE) {
      this.setVelocityX(0);
      return true;
    }

    const towardPlayer: 1 | -1 = player.x < this.x ? -1 : 1;
    this.setFacing(towardPlayer < 0);

    let direction: 1 | -1;
    let speed: number;

    if (horizontalDistance < RETREAT_RANGE) {
      direction = towardPlayer === 1 ? -1 : 1;
      speed = RETREAT_SPEED;
    } else if (horizontalDistance > PREFERRED_RANGE) {
      direction = towardPlayer;
      speed = ADVANCE_SPEED;
    } else {
      this.setVelocityX(0);
      return true;
    }

    // A felület peremén megáll: nem lép le a platformról / a szakadékba.
    if (
      (direction < 0 && this.x <= this.chaseMinX) ||
      (direction > 0 && this.x >= this.chaseMaxX)
    ) {
      this.setVelocityX(0);
      return true;
    }

    this.setVelocityX(speed * direction);
    return false;
  }

  /**
   * A vertikális kapu a TÜZELÉSRE is érvényes, nem csak a detektálásra. A `takeDamage()`
   * PATROL-ból azonnal ébreszt (egy távoli tűzgolyó is felkelti), de egy alulról
   * fireballozott Gravecaller enélkül a végtelenségig lőné a levegőt a player feje fölött.
   */
  private canCast(horizontalDistance: number, verticalDistance: number): boolean {
    return (
      horizontalDistance <= DETECTION_RANGE &&
      verticalDistance <= VERTICAL_DETECTION_RANGE
    );
  }

  /**
   * ATTACK. A lövedéket a Gravecaller NEM hozza létre, csak eventet emittál — ugyanaz a
   * minta, mint a `Player.castFireball()` 'fireball-cast'-ja és a boss 'boss-projectile'-ja.
   * Így az osztály nem függ a Fireball/scene implementációtól, és az emisszió unit tesztben
   * közvetlenül megfigyelhető.
   *
   * Az irány a cast ELEJÉN rögzül, nem a kioldáskor: a windup alatt a player mögé kerülve
   * a lövedék így kikerülhető — a telegraph tehát tényleges információt hordoz.
   */
  private startCast(): void {
    if (this.isCastBusy) return;

    this.isCastBusy = true;
    this.gravecallerState = GravecallerState.CAST;
    this.setVelocityX(0);

    const direction: 1 | -1 = this.playerRef && this.playerRef.x < this.x ? -1 : 1;
    this.setFacing(direction < 0);

    // currentAnimKey = null KELL: két cast között a lény idle/walk animációra válthatott,
    // de ha nem (pl. végig a deadzone-ban állt), a playAnim() guardja „ugyanaz a kulcs"
    // alapon átugraná az újraindítást, és a staff a befagyott utolsó frame-en maradna.
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.time.delayedCall(CAST_STARTUP_MS, () => {
      if (this.gravecallerState === GravecallerState.DEAD) return;

      // A hangot — a többi lényhez hasonlóan — a scene játssza le erre az eventre.
      this.emit(
        'gravecaller-projectile',
        this.x + direction * PROJECTILE_SPAWN_OFFSET_X,
        this.y + PROJECTILE_SPAWN_OFFSET_Y,
        direction
      );

      // A kikövetkezés alatt még áll: ez a punish-ablak második fele.
      this.scene.time.delayedCall(CAST_RECOVERY_MS, () => {
        if (this.gravecallerState === GravecallerState.DEAD) return;
        this.gravecallerState = GravecallerState.REPOSITION;

        this.scene.time.delayedCall(REPOSITION_MS, () => {
          this.isCastBusy = false;
          if (this.gravecallerState === GravecallerState.DEAD) return;
          this.gravecallerState = GravecallerState.MAINTAIN_DISTANCE;
        });
      });
    });
  }

  takeDamage(amount: number): void {
    if (this.gravecallerState === GravecallerState.DEAD) return;

    // Bármilyen sebzés (pl. tűzgolyó) PATROL alatt azonnali észlelést vált ki, akkor is,
    // ha a player még a DETECTION_RANGE-en kívül van — mint a CrowHarvesternél.
    if (this.gravecallerState === GravecallerState.PATROL) {
      this.gravecallerState = GravecallerState.MAINTAIN_DISTANCE;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hpText.setText(`${this.hp}/${this.maxHp}`);

    if (this.hp <= 0) {
      this.die();
      return;
    }

    // A találat-visszajelzés maga az animáció: a GetHit sheet f1/f3 frame-jeibe BE VAN
    // ÉGETVE a fehér villanás (mint a CrowHarvesternél), ezért itt sincs tint.
    this.playHitReaction();
  }

  private playHitReaction(): void {
    // A cast telegraph-ját NEM szakítjuk meg: ha a windup közben ér találat, a player
    // továbbra is lássa, hogy jön a lövedék. (A HP-szám és a hang így is visszajelez.)
    if (this.gravecallerState === GravecallerState.CAST) return;

    this.isReacting = true;
    this.currentAnimKey = null; // két gyors találat között is induljon újra a villanás
    this.updateAnimation();

    this.scene.time.delayedCall(HIT_ANIM_MS, () => {
      this.isReacting = false;
    });
  }

  /**
   * A csomagban VAN valódi death animáció (a CrowHarvesternél nem volt), ezért itt a halál
   * a teljes 52 frame-es összeesés, és csak UTÁNA jön az elhalványulás — a lény a földön
   * maradó lapos maradványból foszlik szét.
   */
  private die(): void {
    this.gravecallerState = GravecallerState.DEAD;
    this.setVelocity(0, 0);
    this.hpText.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    this.isReacting = false;
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: DEATH_ANIM_MS,
      duration: DEATH_FADE_MS,
      onComplete: () => this.setVisible(false),
    });
  }

  /**
   * Fordulás. A sheet natívan JOBBRA néz, és a test majdnem központozott (közepe x=47, a
   * frame közepe 48) — a kompenzáció mégis a megosztott `systems/SpriteFacing.ts`-en megy,
   * hogy a lény ne váljon kivétellé, ha a body valaha eltolódik.
   */
  private setFacing(faceLeft: boolean): void {
    applyFacing(this, GRAVECALLER_FACING, faceLeft);
  }

  private updateAnimation(): void {
    if (this.isReacting) {
      this.playAnim(GRAVECALLER_ANIMS.HIT);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.playAnim(animKeyForState(this.gravecallerState, body.velocity.x !== 0));
  }

  /**
   * Csak akkor indít animációt, ha ténylegesen VÁLTOZOTT a kulcs — enélkül a nem loopoló
   * animációk (cast, hit, death) minden frame-ben újraindulnának. Emiatt minden hely, ami
   * UGYANARRA a kulcsra akar újraindítást (startCast, playHitReaction, die), köteles előbb
   * `currentAnimKey = null`-t írni.
   */
  private playAnim(key: string): void {
    if (this.currentAnimKey === key) return;
    this.currentAnimKey = key;
    this.play(key, true);
  }

  /**
   * A `Level1Scene` a player halálakor MEGSEMMISÍTI és újraspawnolja az összes enemyt
   * (`resetEnemies()`), akár CAST KÖZBEN is. A `DEAD` state beállítása KÖTELEZŐ a
   * `super.destroy()` ELŐTT: ez teszi inertté az összes függőben lévő `delayedCall`-t
   * (cast startup / recovery / reposition, hit-reakció), amelyek mind `DEAD` guarddal
   * indulnak. Enélkül egy windup közben megsemmisített lény MÉG MINDIG kilőné a lövedékét.
   */
  override destroy(fromScene?: boolean): void {
    this.gravecallerState = GravecallerState.DEAD;
    this.playerRef = null;

    // A die() elhalványító tweenje futhat még rajtunk; a destroy után az onComplete
    // (setVisible) egy megsemmisített objektumon hívódna meg.
    this.scene?.tweens.killTweensOf(this);

    this.hpText.destroy();

    super.destroy(fromScene);
  }

  isDead(): boolean {
    return this.gravecallerState === GravecallerState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }
}
