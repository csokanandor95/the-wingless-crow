import Phaser from 'phaser';

// --- Sprite sheet geometria -------------------------------------------------
// UGYANABBÓL a csomagból, mint a démon ("Undead Executioner", Kronovi-), de KÜLÖN, 50x50-es
// frame-mérettel — ezért kap saját animációs modult a AncientDemonAnimations mellett (a
// FacingGeometry/frame-méret animációnként nem térhet el, lásd a 19. technikai tanulságot).
//
// A rajzolt lidérc MÉRVE: x 19..28 (10 px), y 18..37 (20 px) minden sheeten. Egy apró,
// piros szemű, füstös uszályú árnyék.

export const FRAME_SIZE = 50;

/**
 * A rajzolt lidérc 1:1-ben csak 10x20 px — a player 28x46-ja mellett az alig látszana.
 * A 2 EGÉSZ SZÁM (mint a bossoknál), tehát a pixel art éles marad: 20x40 világ-pixel.
 */
export const SCALE = 2;

export const SHADE_TEXTURES = {
  /** `summonAppear.png` — 6 frame: egy pontból nő ki. */
  APPEAR: 'shade-minion-appear',
  /** `summonIdle.png` — 4 frame, loop. */
  IDLE: 'shade-minion-idle',
  /** `summonDeath.png` — 6 frame-nyi rács, ebből 5 rajzolt (f5 ÜRES). */
  DEATH: 'shade-minion-death',
} as const;

export const BODY_WIDTH = 10;
export const BODY_HEIGHT = 20;
export const BODY_OFFSET_X = 19; // 19..28
export const BODY_OFFSET_Y = 18; // 18..37

/**
 * A lidérc LEBEG (nincs gravitációja), tehát a sprite.x/y a TESTE KÖZEPE — nem a talpa,
 * mint a talajon álló lényeknél. Mindkét origin a body közepére mutat.
 */
export const ORIGIN_X = (BODY_OFFSET_X + BODY_WIDTH / 2) / FRAME_SIZE; // 24/50
export const ORIGIN_Y = (BODY_OFFSET_Y + BODY_HEIGHT / 2) / FRAME_SIZE; // 28/50

/** Félméretek VILÁG-pixelben — a kontakt-találat ebből számol. */
export const HALF_WIDTH = (BODY_WIDTH / 2) * SCALE; // 10
export const HALF_HEIGHT = (BODY_HEIGHT / 2) * SCALE; // 20

// FIGYELEM: itt NINCS FacingGeometry, és ez nem feledékenység. A lidérc sprite-ja
// FÜGGŐLEGESEN SZIMMETRIKUS és nincs iránya (a két szem középen, az uszály felfelé áll),
// tehát nem kell forduláskompenzáció — a 16. technikai tanulság a rajzolt figurát a frame
// közepétől ELTOLÓ sheetekre vonatkozik. Ha valaha irányfüggő rajzot kap, a
// systems/SpriteFacing.ts készen áll.

export const SHADE_ANIMS = {
  APPEAR: 'shade-minion-anim-appear',
  IDLE: 'shade-minion-anim-idle',
  DEATH: 'shade-minion-anim-death',
} as const;

const APPEAR_FRAMES = { start: 0, end: 5 };
const IDLE_FRAMES = { start: 0, end: 3 };
const DEATH_FRAMES = { start: 0, end: 4 };

/**
 * A megjelenés ideje. Amíg tart, a lidérc NEM sebez és NEM sebezhető: a démon idézése
 * telegraph, nem azonnali csapda — a playernek látnia kell, hol nőnek ki, mielőtt élnek.
 */
export const APPEAR_ANIM_MS = 400;
export const DEATH_ANIM_MS = 280;
const IDLE_ANIM_MS = 600;

const frameCount = (range: { start: number; end: number }): number => range.end - range.start + 1;
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

/**
 * A lidérc animációi. A Phaser AnimationManager GAME-szintű, ezért elég egyszer meghívni
 * (BootScene.create()); az exists() guard az ismételt hívást is elviseli.
 */
export function createShadeMinionAnimations(scene: Phaser.Scene): void {
  const define = (
    key: string,
    texture: string,
    frames: { start: number; end: number },
    durationMs: number,
    repeat: number
  ): void => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texture, frames),
      frameRate: fps(frameCount(frames), durationMs),
      repeat,
    });
  };

  define(SHADE_ANIMS.APPEAR, SHADE_TEXTURES.APPEAR, APPEAR_FRAMES, APPEAR_ANIM_MS, 0);
  define(SHADE_ANIMS.IDLE, SHADE_TEXTURES.IDLE, IDLE_FRAMES, IDLE_ANIM_MS, -1);
  define(SHADE_ANIMS.DEATH, SHADE_TEXTURES.DEATH, DEATH_FRAMES, DEATH_ANIM_MS, 0);
}
