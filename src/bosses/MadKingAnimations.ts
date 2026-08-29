import Phaser from 'phaser';
import type { FacingGeometry } from '../systems/SpriteFacing';
import { GRAVITY_Y } from '../config/physics';
// CSAK típusként — a MadKing.ts ebből a modulból ÉRTÉKEKET importál (időzítés, geometria),
// tehát egy runtime-import visszafelé kört csinálna. A KingState string enum, ezért a tagjai
// literál kulcsokat adnak, és a lentebbi switch enum-hivatkozás nélkül is típushelyes.
import type { KingState } from './MadKing';

// --- Sprite sheet geometria -------------------------------------------------
// Medieval King Pack 2 (CC-0). HÉT külön sheet — a knight és a Gravecaller mintájára, nem
// egyetlen atlasz —, mind AZONOS 160x111-es frame-mel. A Phaser animációi (textúra, frame)
// párokat tárolnak, tehát a play() magától átvált a megfelelő textúrára.
//
// Az alpha bounding boxok mérve; a talp MINDEN sheeten a frame y=105-énél van.

export const FRAME_WIDTH = 160;
export const FRAME_HEIGHT = 111;

/**
 * A rajzolt király 1:1-ben csak ~31x54 px (a player 28x46), ami egy bosshoz kevés. A 2 EGÉSZ
 * SZÁM: nearest-neighbour mellett minden forrás-pixel tiszta 2x2-es blokk, tehát a pixel art
 * éles marad. Minden lentebbi *_PX konstans FORRÁS-pixelben van; a világ-koordinátás értékek
 * ebből a SCALE-lel származnak. (Ugyanaz a 2-es skála, mint a Grafted Wing-Breakernél, tehát
 * a két boss tömege összemérhető.)
 */
export const SCALE = 2;

export const KING_TEXTURES = {
  IDLE: 'mad-king-idle',
  RUN: 'mad-king-run',
  /** Attack1 — a földi kardcsapás. */
  SLASH: 'mad-king-slash',
  /** Attack2 — a kitörés (Phase 2). */
  LUNGE: 'mad-king-lunge',
  /** Attack3 — az ugró becsapódás. */
  LEAP: 'mad-king-leap',
  DEATH: 'mad-king-death',
  HIT: 'mad-king-hit',
} as const;

// A tömör törzs az idle f0 oszlop-sűrűségéből: x 68..92. Az x 64..67 sáv a hátrafelé lobogó
// köpeny (2-15 opak pixel oszloponként), az nem tartozik a testhez.
export const BODY_WIDTH = 24;
export const BODY_HEIGHT = 54;
export const BODY_OFFSET_X = 68; // 68..92, közepe 80
export const BODY_OFFSET_Y = 51; // 51..105, a talp a frame y=105-nél

/** A sprite.y a body közepén van, mint a Grafted Wing-Breakernél. */
export const ORIGIN_Y = (BODY_OFFSET_Y + BODY_HEIGHT / 2) / FRAME_HEIGHT; // 78/111

/** A talp távolsága a sprite.y-tól VILÁG-pixelben — a Boss2Scene ebből számol spawn Y-t. */
export const FEET_OFFSET_Y = (BODY_HEIGHT / 2) * SCALE; // 54
/** A body félszélessége VILÁG-pixelben. */
export const HALF_WIDTH = (BODY_WIDTH / 2) * SCALE; // 24

/**
 * A penge hegyének távolsága a testközéptől a CSAPÁS frame-jén (Attack1 f2: a bbox x=151-ig
 * ér, a testközép 80). Ebből származik a SLASH_RANGE — a projekt elve szerint a hitbox az
 * animáció tényleges kiterjedéséből jön, nem szabadon hangolt szám. Ha a SLASH_STRIKE_FRAME
 * változik, ezt EGYÜTT kell újraszámolni.
 */
export const BLADE_REACH_PX = 71;

// --- Facing-kompenzáció -----------------------------------------------------
// A sheet natívan JOBBRA néz (a korona és a hátrafelé lobogó köpeny alapján mérve).
//
// FIGYELEM: a test közepe (68 + 12 = 80) PONTOSAN a frame közepe (160/2), tehát az
// applyFacing() itt matematikailag NO-OP. Ez NEM ok arra, hogy kihagyjuk: a 16. technikai
// tanulság szerint minden sheet ezen a közös úton megy, különben egy jövőbeli body-eltolás
// (más törzs-mérés, más sheet) néma elcsúszást okozna.
export const MAD_KING_FACING: FacingGeometry = {
  frameWidth: FRAME_WIDTH,
  bodyWidth: BODY_WIDTH,
  bodyOffsetX: BODY_OFFSET_X,
  bodyOffsetY: BODY_OFFSET_Y,
  originY: ORIGIN_Y,
  nativeFacing: 'right',
};

// --- Kulcsok ----------------------------------------------------------------
// A kulcsok szándékosan NEM egyeznek a király által emittált event-nevekkel
// ('king-slash', 'king-slam', 'king-lunge-windup'), hogy olvasáskor se lehessen
// összekeverni a kettőt.

export const MAD_KING_ANIMS = {
  IDLE: 'mad-king-anim-idle',
  WALK: 'mad-king-anim-walk',
  SLASH: 'mad-king-anim-slash',
  LEAP_WINDUP: 'mad-king-anim-leap-windup',
  LEAP_AIR: 'mad-king-anim-leap-air',
  LEAP_SLAM: 'mad-king-anim-leap-slam',
  LUNGE_WINDUP: 'mad-king-anim-lunge-windup',
  LUNGE_DASH: 'mad-king-anim-lunge-dash',
  HURT: 'mad-king-anim-hurt',
  DEATH: 'mad-king-anim-death',
} as const;

/** Melyik akció után vagyunk COOLDOWN-ban — ez dönti el, melyik animáció fut tovább. */
export type KingAction = 'SLASH' | 'LEAP' | 'LUNGE';

// --- Frame-tartományok ------------------------------------------------------
// Mind a három támadás-sheet CSAK 4 frame-es, tehát a windup-kockákat explicit listával
// ismételjük, hogy a csapás pontos pillanatban kerüljön képre (a CrowHarvester
// ATTACK_FRAMES-ének a mintája). A "megtartott" pózok (LEAP_AIR, LEAP_SLAM, LUNGE_DASH)
// egyetlen frame-es, végtelenül loopoló animációk — a boss 1 DASH_FRAME-jének a mintája:
// a hosszukat a FIZIKA szabja meg (repülési idő, roham-időtartam), nem egy frameRate.

const IDLE_FRAMES = { start: 0, end: 7 };
const WALK_FRAMES = { start: 0, end: 7 };
const HURT_FRAMES = { start: 0, end: 3 };
const DEATH_FRAMES = { start: 0, end: 5 };

/** Attack1: f0 kar hátra, f1 penge magasan, f2 A CSAPÁS (ív x=151-ig), f3 kifutás. */
const SLASH_FRAMES = [0, 0, 1, 2, 3];
const SLASH_STRIKE_FRAME = 2;
/** Attack3: f0-f1 a földi guggolás, f2 a levegőben, f3 a becsapódás. */
const LEAP_WINDUP_FRAMES = [0, 0, 1, 1];
const LEAP_AIR_FRAME = 2;
const LEAP_SLAM_FRAME = 3;
/** Attack2: f0 alsó gárda, f1 előredőlés, f2 A KITÖRÉS (mozgás-csíkkal), f3 kifutás. */
const LUNGE_WINDUP_FRAMES = [0, 1];
const LUNGE_DASH_FRAME = 2;

// --- Időzítés ---------------------------------------------------------------
// A frameRate SOSEM beégetett: mindig a kívánt hosszból számítódik. A gameplay-időzítéseket
// (SLASH_STARTUP_MS, LEAP_WINDUP_MS, LUNGE_WINDUP_MS) a MadKing.ts INNEN veszi át, hogy az
// animáció és a sebzés pillanata ne tudjon elcsúszni egymástól.

/** Egy slash-frame hossza. */
const SLASH_SLOT_MS = 110;
/**
 * A támadás kezdetétől a csapásig: a SLASH_FRAMES listában az f2 a 3. slot (index 3), tehát
 * 330 ms. SZÁMÍTVA, nem beírva — ha a lista változik, ez magától követi.
 */
export const SLASH_WINDUP_MS = SLASH_FRAMES.indexOf(SLASH_STRIKE_FRAME) * SLASH_SLOT_MS; // 330
export const SLASH_TOTAL_MS = SLASH_FRAMES.length * SLASH_SLOT_MS; // 550

/** A guggolás, ami után elrugaszkodik. A cél x ENNEK a végén rögzül. */
export const LEAP_WINDUP_MS = 520;
/** Az előredőlés a kitörés előtt — ez a piros telegraph ideje. */
export const LUNGE_WINDUP_MS = 700;

export const HURT_ANIM_MS = 260;
export const DEATH_ANIM_MS = 900;

const IDLE_ANIM_MS = 1000;
const WALK_ANIM_MS = 800;

// --- Ballisztika ------------------------------------------------------------
// Az ugrás LEVEZETETT, nem hangolt: a GRAVITY_Y-ból (config/physics.ts) számoljuk, ugyanúgy,
// ahogy a Level1Layout a szakadék-hosszakat a player ugrás-paramétereiből. Egyetlen
// hangolópont van, a LEAP_RISE_PX — ha az változik, a sebesség ÉS a repülési idő vele mozdul.

/** Milyen magasra emelkedik a király a becsapódás előtt. AZ EGYETLEN hangolópont. */
export const LEAP_RISE_PX = 140;
/** v = sqrt(2*g*h) — a felfelé induló sebesség, ami pont LEAP_RISE_PX-ig visz. */
export const LEAP_VELOCITY_Y = Math.sqrt(2 * GRAVITY_Y * LEAP_RISE_PX); // ~473.3
/** Fel + le, ugyanarra a magasságra visszaérve: t = 2v/g. Ebből jön a vízszintes sebesség. */
export const LEAP_AIRTIME_MS = (2000 * LEAP_VELOCITY_Y) / GRAVITY_Y; // ~1183

// --- Létrehozás -------------------------------------------------------------

const frameCount = (range: { start: number; end: number }): number =>
  range.end - range.start + 1;

/** A frameRate mindig a kívánt teljes hosszból SZÁMÍTÓDIK, sosem beégetett érték. */
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

/**
 * A király animációi. A Phaser AnimationManager GAME-szintű, ezért elég egyszer meghívni
 * (BootScene.create()); az exists() guard az ismételt hívást is elviseli.
 */
export function createMadKingAnimations(scene: Phaser.Scene): void {
  const define = (
    key: string,
    frames: Phaser.Types.Animations.AnimationFrame[],
    frameRate: number,
    repeat: number
  ): void => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames, frameRate, repeat });
  };

  const range = (
    key: string,
    texture: string,
    frames: { start: number; end: number },
    durationMs: number,
    repeat: number
  ): void =>
    define(
      key,
      scene.anims.generateFrameNumbers(texture, frames),
      fps(frameCount(frames), durationMs),
      repeat
    );

  /** Explicit frame-lista EGY textúrán belül — a windup-kockák ismétléséhez. */
  const list = (
    key: string,
    texture: string,
    frames: number[],
    slotMs: number,
    repeat: number
  ): void =>
    define(key, scene.anims.generateFrameNumbers(texture, { frames }), 1000 / slotMs, repeat);

  /** MEGTARTOTT egyetlen póz: a hosszát a fizika szabja meg, nem a frameRate. */
  const hold = (key: string, texture: string, frame: number): void =>
    define(key, [{ key: texture, frame }], 1, -1);

  range(MAD_KING_ANIMS.IDLE, KING_TEXTURES.IDLE, IDLE_FRAMES, IDLE_ANIM_MS, -1);
  range(MAD_KING_ANIMS.WALK, KING_TEXTURES.RUN, WALK_FRAMES, WALK_ANIM_MS, -1);
  range(MAD_KING_ANIMS.HURT, KING_TEXTURES.HIT, HURT_FRAMES, HURT_ANIM_MS, 0);
  range(MAD_KING_ANIMS.DEATH, KING_TEXTURES.DEATH, DEATH_FRAMES, DEATH_ANIM_MS, 0);

  // A slash slot-alapú (nem teljes-hossz alapú), mert az f2-nek PONTOSAN SLASH_WINDUP_MS-nél
  // kell képre kerülnie — ott, ahol a MadKing.resolveSlashHit() fut.
  list(MAD_KING_ANIMS.SLASH, KING_TEXTURES.SLASH, SLASH_FRAMES, SLASH_SLOT_MS, 0);

  list(
    MAD_KING_ANIMS.LEAP_WINDUP,
    KING_TEXTURES.LEAP,
    LEAP_WINDUP_FRAMES,
    LEAP_WINDUP_MS / LEAP_WINDUP_FRAMES.length,
    0
  );
  list(
    MAD_KING_ANIMS.LUNGE_WINDUP,
    KING_TEXTURES.LUNGE,
    LUNGE_WINDUP_FRAMES,
    LUNGE_WINDUP_MS / LUNGE_WINDUP_FRAMES.length,
    0
  );

  hold(MAD_KING_ANIMS.LEAP_AIR, KING_TEXTURES.LEAP, LEAP_AIR_FRAME);
  hold(MAD_KING_ANIMS.LEAP_SLAM, KING_TEXTURES.LEAP, LEAP_SLAM_FRAME);
  hold(MAD_KING_ANIMS.LUNGE_DASH, KING_TEXTURES.LUNGE, LUNGE_DASH_FRAME);
}

/**
 * State -> animáció leképezés. Szándékosan PURE függvény, hogy Phaser AnimationManager
 * mockolása nélkül unit-tesztelhető legyen.
 *
 * A COOLDOWN az ELŐZŐ AKCIÓ záró pózára képződik le: a hívó playAnim() guardja mellett így a
 * becsapódás/kifutás képe áll a cooldown alatt, ahelyett hogy a király azonnal idle-be
 * pattanna. (A boss 1-nél ugyanez az elv, ott a támadás-animáció folytatásával.)
 */
export function animKeyForState(
  state: KingState,
  lastAction: KingAction | null,
  isMoving: boolean
): string {
  switch (state) {
    case 'SLASH':
      return MAD_KING_ANIMS.SLASH;
    case 'LEAP_WINDUP':
      return MAD_KING_ANIMS.LEAP_WINDUP;
    case 'LEAP_AIR':
      return MAD_KING_ANIMS.LEAP_AIR;
    case 'LEAP_SLAM':
      return MAD_KING_ANIMS.LEAP_SLAM;
    case 'LUNGE_WINDUP':
      return MAD_KING_ANIMS.LUNGE_WINDUP;
    case 'LUNGE':
      return MAD_KING_ANIMS.LUNGE_DASH;
    case 'DEAD':
      return MAD_KING_ANIMS.DEATH;
    case 'COOLDOWN':
      switch (lastAction) {
        case 'SLASH':
          return MAD_KING_ANIMS.SLASH;
        case 'LEAP':
          return MAD_KING_ANIMS.LEAP_SLAM;
        default:
          // Kitörés után (vagy akció nélkül) nincs mit megtartani: kifújja magát.
          return MAD_KING_ANIMS.IDLE;
      }
    case 'DORMANT':
      // A dialógus és a belépő alatt áll — a mozgás-flaget itt szándékosan figyelmen
      // kívül hagyjuk.
      return MAD_KING_ANIMS.IDLE;
    case 'APPROACH':
    default:
      return isMoving ? MAD_KING_ANIMS.WALK : MAD_KING_ANIMS.IDLE;
  }
}
