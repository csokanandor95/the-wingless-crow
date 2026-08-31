import Phaser from 'phaser';
import type { FacingGeometry } from '../systems/SpriteFacing';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../player/PlayerAnimations';
// CSAK típusként — a Beast.ts ebből a modulból ÉRTÉKEKET importál (geometria, hatótávok,
// időzítések), tehát egy runtime-import visszafelé kört csinálna. A BeastState string enum,
// ezért a tagjai literál kulcsokat adnak, és a lentebbi switch enum-hivatkozás nélkül is
// típushelyes.
import type { BeastState } from './Beast';

// --- Sprite sheet geometria -------------------------------------------------
//
// Forrás: `goatman.png` (2D helper/enemy/) — EGYETLEN 384x512-es lap, 6 oszlop x 8 sor,
// 64x64-es frame-ekkel (48 cella, ebből 41 rajzolt). A rácsot a teljesen ÁTLÁTSZÓ sor- és
// oszlop-futamok igazolják: mind pontosan a 64 többszöröseinél kezdődnek.
//
// A frame-tartományokat alpha-bounding boxokkal + színosztályozással azonosítottam, nem
// találgatással. A csomag NEM ad death animációt (lásd DEATH_FADE_MS lentebb).

export const FRAME_SIZE = 64;
export const SHEET_COLUMNS = 6;
export const TEXTURE_KEY = 'beast';

// A rajzolt figura ~30x50 px (a player 28x46), tehát SKÁLÁZÁS NÉLKÜL is a pálya legnagyobb
// sima ellenfele. Egy nem-egész skálázás pixel arton csak rontana rajta.
//
// A test a frame KÖZEPÉN ül: az álló láb-sáv (y 48..63) mért x-tartománya 22..41, aminek a
// közepe 31,5 — a frame közepe 32. A body ezért 20..44, tehát pontosan központozott.
export const BODY_WIDTH = 24;
export const BODY_HEIGHT = 44;
export const BODY_OFFSET_X = 20; // 20..44, közepe 32
// A body a SZARVAKAT szándékosan kihagyja (azok a frame y=14-ig érnek): vékony dísz, nem
// ütközőfelület. A talp MINDEN animáción a frame y=64-nél van, árnyék nélkül — ezért egyetlen
// talp-offset elég, animációnként nem csúszik.
export const BODY_OFFSET_Y = 20; // 20..64

/** A sprite.y a body közepén — a Gravecaller/boss konvenciója (nem a CrowHarvester talp-alapúja). */
export const ORIGIN_Y = (BODY_OFFSET_Y + BODY_HEIGHT / 2) / FRAME_SIZE; // 42/64 = 0.65625

/** A talp távolsága a sprite.y-tól. LEVEZETETT: a LevelGeometry ebből számol spawn Y-t. */
export const FEET_OFFSET_Y = BODY_HEIGHT / 2; // 22
/** A body félszélessége — a layout-tesztek ebből ellenőrzik a peremeket. */
export const HALF_BODY_WIDTH = BODY_WIDTH / 2; // 12

// --- Hatótávok (MÉRT, nem hangolt) ------------------------------------------
//
// A projekt alapelve: a hitbox az animáció TÉNYLEGES kiterjedéséből származik. Mindkét szám
// a frame jobb széléig (x=62) mért nyúlás, a testközéptől (32) számolva.

/** A csapás-frame (`f9`) fehér ívének jobb széle a testközéptől. */
export const MACE_REACH_PX = 30;
/** A roham vezető éle: a lehajtott fej SZARVA (a buzogány ilyenkor hátul, alul csüng). */
export const HORN_REACH_PX = 30;

/**
 * A közelharc hatótávja — teljes 2D távolság a középpontok között (a CrowHarvester elve:
 * ne lehessen "a padlón át" eltalálni egy másik platformon álló playert).
 */
export const ATTACK_RANGE = MACE_REACH_PX + PLAYER_BODY_WIDTH / 2; // 44

/**
 * A roham találat-sugara. FÜGGETLEN levezetésből esik egybe az `ATTACK_RANGE`-dzsel (mint az
 * AncientDemon 90/90-e) — a rács következménye, nem hangolás.
 *
 * Ez SZÁNDÉKOSAN a szarvak mért nyúlásából jön, nem a testből: pont így kerüli el a
 * Wing-Breaker nyitott polish-tételét ("a charge sebzése a boss TESTÉHEZ kötött, miközben a
 * kasza 60 px-szel előtte jár").
 *
 * Kiéheztetés (27. tanulság) itt NINCS: a közelharc és a roham KIVÁLASZTÁSI sávjai nem fedik
 * egymást (44 vs. CHARGE_MIN_RANGE 180); ez a szám csak a roham közbeni találat-teszté.
 */
export const CHARGE_HIT_RANGE = HORN_REACH_PX + PLAYER_BODY_WIDTH / 2; // 44

// --- Időzítés ---------------------------------------------------------------

/**
 * A támadás kezdetétől a csapás frame-jéig (`f9`) eltelő idő. A Beast `ATTACK_STARTUP_MS`-e
 * ebből származik, hogy a sebzés PONTOSAN a fehér ív megjelenésekor érkezzen.
 *
 * A 390 MÉRT érték, a Mad King fairness-módszerével. Pontblank helyzet:
 * `HALF_BODY_WIDTH (12) + player fél testszélesség (14) = 26 px`; a kikerüléshez
 * `ATTACK_RANGE + 10 = 54 px` kell, tehát 28 px-t kell nyerni:
 *
 *   - hátralépés (`MOVE_SPEED` 200)                                        -> 140 ms
 *   - álló ugrás (47 px emelkedés; a találat 2D távolságot néz)            -> 102 ms
 *   - + emberi reakcióidő                                                  -> 250 ms
 *
 * Vagyis 390 ms mellett MINDKÉT válasz működik, nem csak az ugrás. Lejjebb véve a
 * hátralépés kiesne, és a csapás gyakorlatilag kikerülhetetlenné válna közelről.
 */
export const ATTACK_WINDUP_MS = 390;
/** A találat-reakció hossza; ennyi ideig nem írja felül a walk/idle animáció. */
export const HIT_ANIM_MS = 180;
/**
 * A roham telegraph-ja: a megtámasztott póz (`BRACE`) hossza. Ennyi ideje van a playernek
 * oldalra lépni vagy átugrani, MIELŐTT a Beast elindul.
 */
export const CHARGE_WINDUP_MS = 800;
/** Halál: elhalványulás + enyhe megsüllyedés (a csomagban NINCS death animáció). */
export const DEATH_FADE_MS = 400;
export const DEATH_SINK_PX = 6;

const IDLE_ANIM_MS = 900;
/** A séta és a futás UGYANABBÓL a 10 frame-ből: 55 px/s alatt ne pörögjenek a lábak. */
const WALK_ANIM_MS = 800;
const RUN_ANIM_MS = 560;
const CHARGE_ANIM_MS = 500;
const BRACE_ANIM_MS = CHARGE_WINDUP_MS;

// --- Frame-tartományok ------------------------------------------------------
//
// A tartományok EXPORTÁLTAK: a `bosses/BeastMasterAnimations.ts` UGYANEZT a lapot használja
// (a mini-boss ugyanaz a lény, nagyban), tehát a frame-listáknak egyetlen forrása van.
//
//   sor 0: f0-4   IDLE      (5)  — álló póz, buzogány a vállnál (f5 ÜRES)
//   sor 1: f6-11  ATTACK    (6)  — f6-8 windup, f9 a csapás fehér íve, f10-11 kikövetkezés
//   sor 2-3: f12-21 RUN     (10) — felegyenesedett futás (f22-23 ÜRES)
//   sor 4-5: f24-33 CHARGE  (10) — FEJLEHAJTOTT, szarvakkal előre (f34-35 ÜRES)
//   sor 6: f36-37 HURT      (2)  — hátracsapódó test, fej hátravetve (f38-41 ÜRES)
//   sor 7: f42-44 BRACE     (3)  — leengedett buzogány, megtámasztott állás (f45-47 ÜRES)

export const IDLE_FRAMES = { start: 0, end: 4 };
export const LOCOMOTION_FRAMES = { start: 12, end: 21 };
export const CHARGE_FRAMES = { start: 24, end: 33 };
export const HIT_FRAMES = { start: 36, end: 37 };
export const BRACE_FRAMES = { start: 42, end: 44 };

/**
 * A támadás frame-jei. Ismételni NEM kell (szemben a CrowHarvesterrel, ahol az `f13`-at meg
 * kellett háromszorozni): itt `f6`, `f7`, `f8` három VALÓDI, különböző windup-póz, tehát a
 * csapás (`f9`) magától a 4. slotra esik.
 */
export const ATTACK_FRAMES = { start: 6, end: 11 };
export const ATTACK_SLOTS_BEFORE_STRIKE = 3;
/** A slot-idő a windupból SZÁMÍTÓDIK — így a sebzés és az ív nem tud elcsúszni. */
export const ATTACK_SLOT_MS = ATTACK_WINDUP_MS / ATTACK_SLOTS_BEFORE_STRIKE; // 130
const ATTACK_FRAME_COUNT = ATTACK_FRAMES.end - ATTACK_FRAMES.start + 1;
/** A teljes csapás-animáció hossza — az `ATTACK_COOLDOWN_MS` ehhez van méretezve. */
export const ATTACK_ANIM_MS = ATTACK_FRAME_COUNT * ATTACK_SLOT_MS; // 780

// --- Facing-kompenzáció -----------------------------------------------------
//
// A sheet natívan JOBBRA néz (mind a hat animációban). A test itt PONT a frame közepén ül
// (32 vs. 32), tehát az applyFacing() matematikailag no-op — mint a MadKing-nél. A
// kompenzáció mégis a megosztott systems/SpriteFacing.ts-en megy, hogy egy jövőbeli
// body-eltolás ne okozzon néma elcsúszást (16. tanulság).
export const BEAST_FACING: FacingGeometry = {
  frameWidth: FRAME_SIZE,
  bodyWidth: BODY_WIDTH,
  bodyOffsetX: BODY_OFFSET_X,
  bodyOffsetY: BODY_OFFSET_Y,
  originY: ORIGIN_Y,
  nativeFacing: 'right',
};

// --- Kulcsok ----------------------------------------------------------------

export const BEAST_ANIMS = {
  IDLE: 'beast-idle',
  WALK: 'beast-walk',
  RUN: 'beast-run',
  BRACE: 'beast-brace',
  CHARGE: 'beast-charge',
  ATTACK: 'beast-attack',
  HIT: 'beast-hit',
} as const;

const frameCount = (range: { start: number; end: number }): number =>
  range.end - range.start + 1;

/** A frameRate mindig a kívánt teljes hosszból SZÁMÍTÓDIK, sosem beégetett érték. */
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

/**
 * A Beast animációi. A Phaser AnimationManager GAME-szintű, ezért elég egyszer meghívni
 * (BootScene.create()); az `exists()` guard az ismételt hívást is elviseli.
 */
export function createBeastAnimations(scene: Phaser.Scene): void {
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
    BEAST_ANIMS.IDLE,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, IDLE_FRAMES),
    fps(frameCount(IDLE_FRAMES), IDLE_ANIM_MS),
    -1
  );

  // UGYANAZ a 10 frame két tempóban — lásd WALK_ANIM_MS / RUN_ANIM_MS.
  define(
    BEAST_ANIMS.WALK,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, LOCOMOTION_FRAMES),
    fps(frameCount(LOCOMOTION_FRAMES), WALK_ANIM_MS),
    -1
  );
  define(
    BEAST_ANIMS.RUN,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, LOCOMOTION_FRAMES),
    fps(frameCount(LOCOMOTION_FRAMES), RUN_ANIM_MS),
    -1
  );

  // A telegraph EGYSZER fut le, és a záró pózon áll meg — a windup hossza pont ennyi.
  define(
    BEAST_ANIMS.BRACE,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, BRACE_FRAMES),
    fps(frameCount(BRACE_FRAMES), BRACE_ANIM_MS),
    0
  );

  define(
    BEAST_ANIMS.CHARGE,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, CHARGE_FRAMES),
    fps(frameCount(CHARGE_FRAMES), CHARGE_ANIM_MS),
    -1
  );

  define(
    BEAST_ANIMS.ATTACK,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, ATTACK_FRAMES),
    1000 / ATTACK_SLOT_MS,
    0
  );

  define(
    BEAST_ANIMS.HIT,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, HIT_FRAMES),
    fps(frameCount(HIT_FRAMES), HIT_ANIM_MS),
    0
  );
}

/**
 * State -> animáció leképezés. Szándékosan PURE függvény, hogy Phaser AnimationManager
 * mockolása nélkül unit-tesztelhető legyen.
 *
 * Az ATTACK és a COOLDOWN UGYANARRA a kulcsra képződik le: így a hívó `playAnim()` guardja
 * miatt a 780ms-os támadás-animáció egyben fut végig az állapotpáron, ahelyett hogy a
 * state-váltásnál újraindulna (CrowHarvester-precedens).
 */
export function animKeyForState(state: BeastState, isMoving: boolean): string {
  switch (state) {
    case 'ATTACK':
    case 'COOLDOWN':
      return BEAST_ANIMS.ATTACK;
    case 'CHARGE_WINDUP':
      return BEAST_ANIMS.BRACE;
    case 'CHARGE':
      return BEAST_ANIMS.CHARGE;
    case 'DEAD':
      // A halál első fázisa a hit animáció; az elhalványulást a die() tweenje intézi.
      return BEAST_ANIMS.HIT;
    case 'CHASE':
      return isMoving ? BEAST_ANIMS.RUN : BEAST_ANIMS.IDLE;
    case 'PATROL':
    default:
      return isMoving ? BEAST_ANIMS.WALK : BEAST_ANIMS.IDLE;
  }
}
