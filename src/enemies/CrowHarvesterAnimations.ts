import Phaser from 'phaser';
import type { FacingGeometry } from '../systems/SpriteFacing';
// CSAK típusként — a CrowHarvester.ts ebből a modulból ÉRTÉKEKET importál, tehát egy
// runtime-import visszafelé kört csinálna. A CrowHarvesterState string enum, ezért a
// tagjai literál kulcsokat adnak, és az alábbi switch enum-hivatkozás nélkül is típushelyes.
import type { CrowHarvesterState } from './CrowHarvester';

// --- Sprite sheet geometria -------------------------------------------------
// Az enemy04_sheet.png egyetlen 1792x64-es csík: 28 db 64x64-es frame.

export const FRAME_SIZE = 64;
export const TEXTURE_KEY = 'crow-harvester';

// A lény NEM a frame közepén áll: a köpeny x 4..24 (a sűrű rész), a csőr x 20..28,
// a kasza nyele pedig x 24..47-ig tölti ki a jobb oldalt (támadáskor x=54-ig). A test
// közepe így a frame x=14-nél van, nem 32-nél — lásd a facing-kompenzációt lentebb.
export const BODY_WIDTH = 20;
export const BODY_HEIGHT = 40;
export const BODY_OFFSET_X = 4;
export const BODY_OFFSET_Y = 24;

/**
 * A talp a `sprite.y + 23`-nál — pontosan ott, ahol a korábbi 30x46-os placeholderé volt.
 * Ezért marad érvényben a Level1Scene `HARVESTER_SPAWN_OFFSET = 24` konstansa.
 */
export const ORIGIN_Y = (FRAME_SIZE - 23) / FRAME_SIZE; // 0.640625

// --- Facing-kompenzáció -----------------------------------------------------
// A sprite natívan JOBBRA néz. Mivel a test a frame bal oldalán ül (közepe x=14), egy sima
// setFlipX() a testet 2 * (32 - 14) = 36px-t ugrasztaná oldalra minden fordulásnál — a flipX
// ugyanis a FRAME közepére tükröz, nem az originre. A kompenzációt (origin + body offset
// EGYÜTTES tükrözése) a megosztott `systems/SpriteFacing.ts` végzi, mert a boss sheetje
// ugyanezt igényli, csak fordított natív iránnyal.
//
//   jobbra: quad bal széle x-14, body x-10..x+10, az art köpenye (frame 4..24) ugyanide esik
//   balra:  quad bal széle x-50, body x-10..x+10, a tükrözött art (quad-lokális 40..60) is
export const CROW_HARVESTER_FACING: FacingGeometry = {
  frameWidth: FRAME_SIZE,
  bodyWidth: BODY_WIDTH,
  bodyOffsetX: BODY_OFFSET_X,
  bodyOffsetY: BODY_OFFSET_Y,
  originY: ORIGIN_Y,
  nativeFacing: 'right',
};

// --- Kulcsok ----------------------------------------------------------------

export const CROW_HARVESTER_ANIMS = {
  IDLE: 'crow-harvester-idle',
  WALK: 'crow-harvester-walk',
  ATTACK: 'crow-harvester-attack',
  HIT: 'crow-harvester-hit',
} as const;

// --- Időzítés ---------------------------------------------------------------

/**
 * A támadás kezdetétől a csapás frame-jéig eltelő idő. A CrowHarvester
 * `ATTACK_STARTUP_MS`-e ebből származik, hogy a sebzés PONTOSAN akkor érkezzen, amikor
 * a kasza fehér íve megjelenik.
 */
export const ATTACK_WINDUP_MS = 300;
/** A találat-reakció hossza; ennyi ideig nem írja felül az idle/walk animáció. */
export const HIT_ANIM_MS = 180;
/** Halál: elhalványulás + enyhe megsüllyedés (a csomagban nincs death animáció). */
export const DEATH_FADE_MS = 400;
export const DEATH_SINK_PX = 6;

const IDLE_ANIM_MS = 800;
const WALK_ANIM_MS = 600;

// --- Frame-tartományok ------------------------------------------------------
// A sorrendet az egyedi PNG-k (idle01.png, walk01.png, ...) alpha bounding boxainak a
// sheet frame-jeivel való párosításával ellenőriztem — hézagmentesen egyeznek.

const IDLE_FRAMES = { start: 0, end: 6 };
const WALK_FRAMES = { start: 7, end: 12 };
const HIT_FRAMES = { start: 25, end: 27 };
// A 20-24 (jump_mid + jump_landing) szándékosan kimarad: a CrowHarvester nem ugrik.

// A támadás nyers frame-jei: f13 = kasza a magasba emelve (TELEGRAPH), f14 = a csapás
// nagy fehér íve, f15-f19 = kikövetkezés. A f13-at háromszor ismételjük, hogy a windup
// olvasható maradjon, ÉS hogy a f14 pontosan ATTACK_WINDUP_MS-nél kerüljön képre.
const ATTACK_FRAMES = [13, 13, 13, 14, 15, 16, 17, 18, 19];
const ATTACK_SLOTS_BEFORE_STRIKE = 3;
const ATTACK_SLOT_MS = ATTACK_WINDUP_MS / ATTACK_SLOTS_BEFORE_STRIKE;

const frameCount = (range: { start: number; end: number }): number =>
  range.end - range.start + 1;

/** A frameRate mindig a kívánt teljes hosszból SZÁMÍTÓDIK, sosem beégetett érték. */
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

/**
 * A CrowHarvester animációi. A Phaser AnimationManager GAME-szintű, ezért elég egyszer
 * meghívni (BootScene.create()); az `exists()` guard az ismételt hívást is elviseli.
 */
export function createCrowHarvesterAnimations(scene: Phaser.Scene): void {
  const define = (
    key: string,
    frames: Phaser.Types.Animations.AnimationFrame[],
    frameRate: number,
    repeat: number
  ): void => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames, frameRate, repeat });
  };

  define(
    CROW_HARVESTER_ANIMS.IDLE,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, IDLE_FRAMES),
    fps(frameCount(IDLE_FRAMES), IDLE_ANIM_MS),
    -1
  );

  define(
    CROW_HARVESTER_ANIMS.WALK,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, WALK_FRAMES),
    fps(frameCount(WALK_FRAMES), WALK_ANIM_MS),
    -1
  );

  define(
    CROW_HARVESTER_ANIMS.ATTACK,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, { frames: ATTACK_FRAMES }),
    1000 / ATTACK_SLOT_MS,
    0
  );

  define(
    CROW_HARVESTER_ANIMS.HIT,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, HIT_FRAMES),
    fps(frameCount(HIT_FRAMES), HIT_ANIM_MS),
    0
  );
}

/**
 * State -> animáció leképezés. Szándékosan PURE függvény, hogy Phaser
 * AnimationManager mockolása nélkül unit-tesztelhető legyen.
 *
 * Az ATTACK és a COOLDOWN UGYANARRA a kulcsra képződik le: így a hívó `playAnim()`
 * guardja miatt a 900ms-os támadás-animáció egyben fut végig a 300ms ATTACK +
 * 900ms COOLDOWN állapotpáron, ahelyett hogy a state-váltásnál újraindulna.
 */
export function animKeyForState(state: CrowHarvesterState, isMoving: boolean): string {
  switch (state) {
    case 'ATTACK':
    case 'COOLDOWN':
      return CROW_HARVESTER_ANIMS.ATTACK;
    case 'DEAD':
      // A halál első fázisa a hit animáció; az elhalványulást a die() tweenje intézi.
      return CROW_HARVESTER_ANIMS.HIT;
    case 'PATROL':
    case 'CHASE':
    default:
      return isMoving ? CROW_HARVESTER_ANIMS.WALK : CROW_HARVESTER_ANIMS.IDLE;
  }
}
