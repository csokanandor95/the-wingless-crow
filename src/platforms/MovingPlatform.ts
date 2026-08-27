import type Phaser from 'phaser';
import {
  movingPlatformSpan,
  type MovingPlatformDef,
  type Span,
} from '../levels/LevelGeometry';

/**
 * Mozgó platform (Level 2) — a projekt első ilyen eleme.
 *
 * **ELTÉRÉS a `docs/Project_plan.md` 13. pontjától**, ami a megengedett platforming-elemeket
 * sorolja: a mozgó platform nem szerepel köztük. Kifejezett user-kérésre került be (lásd
 * `docs/level2-layout.md` 4. pont); a Project_plan 13. pontját frissíteni kell.
 *
 * ## Determinizmus
 *
 * A mozgás magja szándékosan PURE függvény (`platformPositionAt`), a
 * `SwingingReaper.swingAngleAt()` mintájára — `Phaser.Math.Between` NÉLKÜL. Ebből két dolog
 * következik ingyen:
 *
 *  - a lengés/mozgás Phaser GameObject-ek mockolása nélkül unit-tesztelhető;
 *  - a **pozíció mindig az eltelt idő függvénye**, nem sebesség-integrálás eredménye —
 *    ezért a player halála/respawnja után a platform magától a helyes fázisban van, és
 *    nem sodródik el több perc játék alatt.
 *
 * Emiatt kap a platform **static bodyt** (`setPosition()` + `refreshBody()` frame-enként),
 * nem sebességgel hajtott dinamikus testet: az Arcade ilyenkor nem integrál, tehát a pure
 * függvény marad az egyetlen igazság.
 *
 * ## Mozgásprofil
 *
 * Trapéz, MEGÁLLÁSSAL mindkét végponton — enélkül a felugrás pillanata nem gyakorolható:
 *
 *     [0, dwell)                        áll a `from` végponton      (progress 0)
 *     [dwell, dwell+travel)             from -> to                  (progress 0 -> 1)
 *     [dwell+travel, 2*dwell+travel)    áll a `to` végponton        (progress 1)
 *     [2*dwell+travel, 2*(dwell+travel)) to -> from                 (progress 1 -> 0)
 *
 * `t = 0`-nál tehát ÁLL a kiindulási végponton — mint a kaszánál, ahol a koszinusz miatt a
 * penge szélsőállásban indul: a player a pálya betöltésekor egy teljes, tiszta ciklust lát.
 */

/**
 * A rider-teszt függőleges tűrése. A player teste a physics-szeparáció után nem PONTOSAN a
 * lap tetején ül (sub-pixel maradék, és süllyedő lapnál egy frame lemaradás), ezért egy
 * szigorú egyenlőség frame-enként ki-be kapcsolná a szállítást.
 */
export const RIDE_TOLERANCE_Y = 6;

/** Világosabb, mint a `platform-placeholder` alap szürkéje: a mozgó lap váljon el a fixtől. */
const MOVING_PLATFORM_TINT = 0x8f9bb3;

/** A teljes út hossza az egyik végponttól a másikig. */
export const platformTravelDistance = (def: MovingPlatformDef): number =>
  Math.hypot(def.toX - def.fromX, def.toY - def.fromY);

/** Mennyi ideig tart egy IRÁNYBA megtenni az utat. */
export const platformTravelMs = (def: MovingPlatformDef): number =>
  (platformTravelDistance(def) / def.speed) * 1000;

/** Egy TELJES oda-vissza ciklus (a két megállással együtt). */
export const platformCycleMs = (def: MovingPlatformDef): number =>
  2 * (platformTravelMs(def) + def.dwellMs);

/**
 * Hol tart a platform az útján? `0` = `from` végpont, `1` = `to` végpont.
 *
 * Pure: se Phaser, se belső állapot — a hívó adja az időt.
 */
export function platformProgressAt(elapsedMs: number, def: MovingPlatformDef): number {
  const travel = platformTravelMs(def);
  const cycle = platformCycleMs(def);

  // Nulla hosszú út (elgépelt def) esetén nincs mit interpolálni — a modulo is NaN lenne.
  if (cycle <= 0 || travel <= 0) return 0;

  // A JS `%`-ja negatív bemenetre negatívat ad; a `+ cycle` a negatív phaseMs-t is kezeli.
  const t = (((elapsedMs + (def.phaseMs ?? 0)) % cycle) + cycle) % cycle;

  if (t < def.dwellMs) return 0;
  if (t < def.dwellMs + travel) return (t - def.dwellMs) / travel;
  if (t < 2 * def.dwellMs + travel) return 1;
  return 1 - (t - (2 * def.dwellMs + travel)) / travel;
}

/** A platform KÖZÉPPONTJA az adott pillanatban. */
export function platformPositionAt(
  elapsedMs: number,
  def: MovingPlatformDef
): { x: number; y: number } {
  const progress = platformProgressAt(elapsedMs, def);

  return {
    x: def.fromX + (def.toX - def.fromX) * progress,
    y: def.fromY + (def.toY - def.fromY) * progress,
  };
}

/**
 * Rajta áll-e a player a lapon?
 *
 * **Nem elég a `body.blocked.down`**: az akkor is igaz, ha a player a talajon áll. A
 * szállítást ezért geometriailag döntjük el — a test alja nagyjából a lap tetején van, és
 * vízszintesen fedésben vannak. Pure, tehát a tűrés viselkedése unit-tesztelhető.
 */
export function isRiding(
  player: { bottom: number; left: number; right: number },
  span: Span
): boolean {
  if (player.right <= span.left || player.left >= span.right) return false;
  return (
    player.bottom >= span.top - RIDE_TOLERANCE_Y && player.bottom <= span.top + RIDE_TOLERANCE_Y
  );
}

export default class MovingPlatform {
  readonly def: MovingPlatformDef;

  private readonly sprite: Phaser.Physics.Arcade.Sprite;
  private elapsedMs = 0;
  private currentX: number;
  private currentY: number;
  /** Az utolsó `update()` elmozdulása — ebből megy a rider-szállítás. */
  private deltaX = 0;
  private deltaY = 0;

  /**
   * A lap a scene statikus platform-groupjába kerül (nem sajátba): így ugyanabba a
   * collider-regisztrációba esik, mint a fix lapok — a player és a lövedékek ütközése
   * egyetlen helyen van bekötve, és a mozgó platform nem igényel új sort a scene-ben.
   */
  constructor(def: MovingPlatformDef, group: Phaser.Physics.Arcade.StaticGroup) {
    this.def = def;

    const start = platformPositionAt(0, def);
    this.currentX = start.x;
    this.currentY = start.y;

    this.sprite = group.create(
      start.x,
      start.y,
      'platform-placeholder'
    ) as Phaser.Physics.Arcade.Sprite;
    this.sprite.setScale(def.tiles, 1).refreshBody();
    // Egyelőre placeholder skin (nincs Level 2 tileset) — a látvány MAGA a fizikai sprite.
    // Enyhén világosabb tint különbözteti meg a statikus lapoktól: a mozgó platform
    // felismerhetősége gameplay-információ, nem dekoráció.
    this.sprite.setTint(MOVING_PLATFORM_TINT);
  }

  /** A scene minden frame-ben meghívja a frame-idővel. */
  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;

    const next = platformPositionAt(this.elapsedMs, this.def);
    this.deltaX = next.x - this.currentX;
    this.deltaY = next.y - this.currentY;
    this.currentX = next.x;
    this.currentY = next.y;

    // Static bodynál a `refreshBody()` KÖTELEZŐ: enélkül a body a régi helyén maradna, és a
    // látvány elcsúszna a fizikától.
    this.sprite.setPosition(next.x, next.y).refreshBody();
  }

  getSpan(): Span {
    return movingPlatformSpan(this.def, this.currentX, this.currentY);
  }

  getDelta(): { x: number; y: number } {
    return { x: this.deltaX, y: this.deltaY };
  }

  /**
   * A rajta álló playert a scene mozgatja ezzel — a `Player`-hez nem nyúlunk.
   *
   * **Az Arcade fizika NEM viszi magával a kinematikus platformon álló testet**, ezért kell
   * a kézi szállítás. A pozíciót toljuk, nem a velocityt: utóbbi elrontaná a leugrás ívét
   * (a player a platform sebességét „örökölné" a levegőben is).
   *
   * A `y` KIZÁRÓLAG süllyedéskor megy át. Emelkedéskor az Arcade szeparáció már megemelte a
   * playert — a delta újbóli hozzáadása kilökné a lapról, és zuhanást okozna. Süllyedéskor
   * viszont a szeparáció nem tud lefelé húzni, tehát nélküle a player frame-enként
   * elszakadna a laptól és remegne.
   */
  carry(player: { x: number; y: number }): void {
    player.x += this.deltaX;
    if (this.deltaY > 0) player.y += this.deltaY;
  }
}
