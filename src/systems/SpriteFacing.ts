import type Phaser from 'phaser';

/**
 * Off-center sprite sheetek fordulás-kompenzációja.
 *
 * A `flipX` a FRAME közepére tükröz, nem az originre. Ha a rajzolt figura nem a frame
 * közepén ül (a pixel art csomagokban ez inkább szabály, mint kivétel — a fegyver kitölti
 * az egyik oldalt), akkor egy sima `setFlipX()` a testet `2 * (frameWidth/2 - bodyCenterX)`
 * pixellel oldalra ugrasztja.
 *
 * A javítás: forduláskor az **originX-et ÉS a physics body offsetjét EGYÜTT** tükrözzük, így
 * a body világkoordinátás közepe mindkét irányban pontosan a `sprite.x`-en marad. A képlet
 * skálafüggetlen: a Phaser Arcade a body pozícióját
 * `x + scaleX * (offset.x - displayOriginX)`-ként számolja, tehát a `scaleX` egyenletes
 * szorzó (lásd `node_modules/phaser/src/physics/arcade/Body.js` `updateFromGameObject`).
 *
 * Ezt a modult a CrowHarvester (natívan JOBBRA néz) és a GraftedWingBreaker (natívan BALRA)
 * is használja — a `nativeFacing` miatt ugyanaz a kód szolgál ki mindkettőt.
 */
export interface FacingGeometry {
  /** A sprite sheet egy frame-jének szélessége (NEM a skálázott megjelenítési méret). */
  frameWidth: number;
  /** A physics body szélessége forrás-pixelben. */
  bodyWidth: number;
  /** A body vízszintes offsetje a NEM tükrözött (natív) frame-en belül. */
  bodyOffsetX: number;
  /** A body függőleges offsetje — fordulás nem érinti, de itt tartjuk egyben a geometriát. */
  bodyOffsetY: number;
  /** A függőleges origin (a talp pozícióját állítja be). */
  originY: number;
  /** A sheet natív nézési iránya. */
  nativeFacing: 'left' | 'right';
}

/** A rajzolt test közepe a natív frame-en belül — mindig a body-ból LEVEZETVE. */
export function bodyCenterX(geom: FacingGeometry): number {
  return geom.bodyOffsetX + geom.bodyWidth / 2;
}

/**
 * Kell-e `flipX` ahhoz, hogy a kívánt irányba nézzen? Jobbra néző sheetnél a balra fordulás
 * igényel tükrözést, balra néző sheetnél pont fordítva.
 */
export function isFlipped(geom: FacingGeometry, faceLeft: boolean): boolean {
  return geom.nativeFacing === 'right' ? faceLeft : !faceLeft;
}

export function originXFor(geom: FacingGeometry, faceLeft: boolean): number {
  const base = bodyCenterX(geom) / geom.frameWidth;
  return isFlipped(geom, faceLeft) ? 1 - base : base;
}

export function bodyOffsetXFor(geom: FacingGeometry, faceLeft: boolean): number {
  return isFlipped(geom, faceLeft)
    ? geom.frameWidth - geom.bodyOffsetX - geom.bodyWidth
    : geom.bodyOffsetX;
}

/**
 * A fordulás három lépése egyben. Mindhármat EGYÜTT kell alkalmazni — ha bármelyik
 * kimarad, a test elcsúszik a sprite.x-től.
 */
export function applyFacing(
  sprite: Phaser.Physics.Arcade.Sprite,
  geom: FacingGeometry,
  faceLeft: boolean
): void {
  sprite.setFlipX(isFlipped(geom, faceLeft));
  sprite.setOrigin(originXFor(geom, faceLeft), geom.originY);
  (sprite.body as Phaser.Physics.Arcade.Body).setOffset(
    bodyOffsetXFor(geom, faceLeft),
    geom.bodyOffsetY
  );
}
