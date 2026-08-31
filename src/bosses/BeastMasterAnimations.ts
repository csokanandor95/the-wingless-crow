import Phaser from 'phaser';
import type { FacingGeometry } from '../systems/SpriteFacing';
import { JUMP_VELOCITY, MOVE_SPEED } from '../player/Player';
import { GRAVITY_Y } from '../config/physics';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../player/PlayerAnimations';
import {
  ATTACK_FRAMES,
  ATTACK_SLOTS_BEFORE_STRIKE,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  BODY_WIDTH,
  BRACE_FRAMES,
  CHARGE_FRAMES,
  FRAME_SIZE,
  HIT_FRAMES,
  HORN_REACH_PX,
  IDLE_FRAMES,
  LOCOMOTION_FRAMES,
  MACE_REACH_PX,
  ORIGIN_Y,
  TEXTURE_KEY,
} from '../enemies/BeastAnimations';
// CSAK típusként — a BeastMaster.ts ebből a modulból ÉRTÉKEKET importál, tehát egy
// runtime-import visszafelé kört csinálna (a BeastAnimations azonos megoldása).
import type { BeastMasterState } from './BeastMaster';

/**
 * Boss 3 – **The Beast Master** sprite-geometriája és időzítései.
 *
 * ## Ugyanaz a lap, kétszeres méretben
 *
 * A mini-boss UGYANAZ a lény, mint a `Beast` (`goatman.png`), csak nagyobb — ezért ez a modul
 * NEM másolja a frame-listákat, hanem a `BeastAnimations`-ből importálja őket. Ami itt új:
 * a `SCALE`, a belőle LEVEZETETT világ-méretek, és a saját (lassabb) csapás-időzítés.
 *
 * **Saját animáció-kulcsokat kap** (`beast-master-*`), nem a `BEAST_ANIMS`-t használja újra:
 * a frame-listák azonosak, de a slot-idő NEM (lásd `ATTACK_WINDUP_MS`), a Phaser
 * `AnimationManager`-je pedig GAME-szintű — közös kulcsnál a nagyobb lény lassabb csapása
 * felülírná a sima Beastét.
 *
 * ## Skálázás (CLAUDE.md 15. tanulság)
 *
 * Minden `*_PX` konstans FORRÁS-pixelben van; a világ-koordinátás értékek ebből SZÁRMAZNAK a
 * `SCALE`-lel. A `setSize`/`setOffset` viszont SZINTÉN forrás-pixelben megy (az Arcade Body a
 * saját `_sx`-ével szorozza), ezért a `BEAST_MASTER_FACING` a nyers, skálázatlan geometriát
 * kapja — az `applyFacing()` skálafüggetlen.
 */

// --- Méret ------------------------------------------------------------------

/**
 * EGÉSZ szám, tehát minden forrás-pixel tiszta 2x2-es blokk marad (a Wing-Breaker és a Mad
 * King bevett receptje). A rajzolt figura így ~60x100 px, szemben a player 28x46-jával és a
 * sima Beast 30x50-ével — a pálya legnagyobb lénye.
 */
export const SCALE = 2;

/** A talp távolsága a sprite.y-tól, VILÁG-pixelben. A scene ebből számol spawn Y-t. */
export const FEET_OFFSET_Y = (BODY_HEIGHT / 2) * SCALE; // 44
/** A test félszélessége VILÁG-pixelben — a fairness-levezetés ebből indul. */
export const HALF_WIDTH = (BODY_WIDTH / 2) * SCALE; // 24

// --- Hatótávok (a MÉRT forrás-nyúlásokból, SCALE-lel) -----------------------

/** A csapás-frame (`f9`) fehér ívének nyúlása + a player fél testszélessége. */
export const ATTACK_RANGE = MACE_REACH_PX * SCALE + PLAYER_BODY_WIDTH / 2; // 74

/**
 * A roham találat-sugara: a lehajtott fej SZARVÁNAK nyúlása + a player fél teste.
 * A `Beast` elve — a vezető ÉLHEZ kötve, nem a testhez.
 */
export const CHARGE_HIT_RANGE = HORN_REACH_PX * SCALE + PLAYER_BODY_WIDTH / 2; // 74

// --- FAIRNESS: a csapás windupja (LEVEZETETT, nem hangolt) ------------------
//
// A Mad King módszere. A hatótáv a kétszeres mérettel 44 -> 74 nőtt, tehát a `Beast` 390 ms-os
// windupja itt MÁR NEM lenne elég: a nagyobb lény messzebbről ér el, a kikerüléshez pedig
// többet kell mozogni.

/** Pontblank helyzet: a két test épp érintkezik. */
const POINT_BLANK_DISTANCE = HALF_WIDTH + PLAYER_BODY_WIDTH / 2; // 38
/** Ennyire kell jutni, hogy a 2D távolság-ellenőrzés ne találjon (10 px ráhagyással). */
const ESCAPE_DISTANCE = ATTACK_RANGE + 10; // 84

/** Hátralépéssel: a hiányzó vízszintes távolság `MOVE_SPEED`-del. */
export const BACKSTEP_ESCAPE_MS =
  ((ESCAPE_DISTANCE - POINT_BLANK_DISTANCE) / MOVE_SPEED) * 1000; // 230

/**
 * Álló ugrással: a találat 2D távolságot néz, tehát elég FÜGGŐLEGESEN kikerülni. A szükséges
 * emelkedés Pitagorasszal, az idő pedig a ballisztikai pálya EMELKEDŐ ágának gyöke:
 *
 *     y(t) = |JUMP_VELOCITY|·t − ½·g·t²  =  rise
 */
const REQUIRED_RISE = Math.sqrt(ESCAPE_DISTANCE ** 2 - POINT_BLANK_DISTANCE ** 2); // ~74.9
export const JUMP_ESCAPE_MS =
  ((Math.abs(JUMP_VELOCITY) -
    Math.sqrt(JUMP_VELOCITY ** 2 - 2 * GRAVITY_Y * REQUIRED_RISE)) /
    GRAVITY_Y) *
  1000; // ~174

/** Emberi reakcióidő — ugyanaz a szám, amivel a Mad King és a Beast is számol. */
export const REACTION_MS = 250;

/**
 * A csapás windupja. A padlót a LASSABB válasz adja (a hátralépés), hogy a `Beast`-nél
 * kimondott elv itt is álljon: **MINDKÉT válasz működjön, ne csak az ugrás.**
 *
 *   hátralépés 230 + reakció 250 = 480 ms  <- ez a padló
 *   ugrás      174 + reakció 250 = 424 ms
 *
 * 520 ms tehát 40 ms tartalékkal teljesíti mindkettőt. **Lejjebb véve a hátralépés kiesne**
 * — a `beastMaster.test.ts` fairness-blokkja pontosan ezt őrzi.
 */
export const ATTACK_WINDUP_MS = 520;

/** A slot-idő a windupból SZÁMÍTÓDIK — így a sebzés és a fehér ív nem tud elcsúszni. */
export const ATTACK_SLOT_MS = ATTACK_WINDUP_MS / ATTACK_SLOTS_BEFORE_STRIKE; // ~173.3
const ATTACK_FRAME_COUNT = ATTACK_FRAMES.end - ATTACK_FRAMES.start + 1;
/** A teljes csapás-animáció hossza — az `ATTACK_COOLDOWN_MS` ehhez van méretezve. */
export const ATTACK_ANIM_MS = ATTACK_FRAME_COUNT * ATTACK_SLOT_MS; // 1040

// --- Egyéb időzítés ---------------------------------------------------------

export const HIT_ANIM_MS = 180;

/**
 * A roham telegraph-ja. HOSSZABB a sima Beast 800 ms-ánál: a lény nagyobb és gyorsabb
 * (`CHARGE_SPEED` 380 vs. 320), és egy zárt arénában nincs hova kitérni — a nagyobb
 * fenyegetés hosszabb figyelmeztetést kap.
 */
export const CHARGE_WINDUP_MS = 900;

/**
 * A halál: elhalványulás + megsüllyedés (a csomagban NINCS death animáció, a `Beast` receptje).
 * Bossnál LASSABB, hogy a győzelem pillanata kitartson.
 */
export const DEATH_FADE_MS = 900;
export const DEATH_SINK_PX = 10;

const IDLE_ANIM_MS = 1100;
/** Lassabb, nehézkesebb járás, mint a sima Beasté (800): nagyobb test, nagyobb tömeg. */
const WALK_ANIM_MS = 1000;
const RUN_ANIM_MS = 700;
const CHARGE_ANIM_MS = 460;
const BRACE_ANIM_MS = CHARGE_WINDUP_MS;

// --- Facing-kompenzáció -----------------------------------------------------
//
// A geometria NYERS forrás-pixelben megy be: az `applyFacing()` az `originX`-et és a body
// `offsetX`-ét állítja, mindkettő skálafüggetlen (CLAUDE.md 15./16. tanulság). A test itt is
// pont a frame közepén ül, tehát matematikailag no-op — de a megosztott helperen megy, hogy
// egy jövőbeli body-eltolás ne okozzon néma elcsúszást.
export const BEAST_MASTER_FACING: FacingGeometry = {
  frameWidth: FRAME_SIZE,
  bodyWidth: BODY_WIDTH,
  bodyOffsetX: BODY_OFFSET_X,
  bodyOffsetY: BODY_OFFSET_Y,
  originY: ORIGIN_Y,
  nativeFacing: 'right',
};

// --- Kulcsok ----------------------------------------------------------------

/** SAJÁT kulcsok: a frame-listák azonosak a Beastével, az időzítés NEM (lásd a fejlécet). */
export const BEAST_MASTER_ANIMS = {
  IDLE: 'beast-master-idle',
  WALK: 'beast-master-walk',
  RUN: 'beast-master-run',
  BRACE: 'beast-master-brace',
  CHARGE: 'beast-master-charge',
  ATTACK: 'beast-master-attack',
  HIT: 'beast-master-hit',
} as const;

const frameCount = (range: { start: number; end: number }): number =>
  range.end - range.start + 1;

/** A frameRate mindig a kívánt teljes hosszból SZÁMÍTÓDIK, sosem beégetett érték. */
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

export function createBeastMasterAnimations(scene: Phaser.Scene): void {
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
    BEAST_MASTER_ANIMS.IDLE,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, IDLE_FRAMES),
    fps(frameCount(IDLE_FRAMES), IDLE_ANIM_MS),
    -1
  );

  define(
    BEAST_MASTER_ANIMS.WALK,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, LOCOMOTION_FRAMES),
    fps(frameCount(LOCOMOTION_FRAMES), WALK_ANIM_MS),
    -1
  );
  define(
    BEAST_MASTER_ANIMS.RUN,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, LOCOMOTION_FRAMES),
    fps(frameCount(LOCOMOTION_FRAMES), RUN_ANIM_MS),
    -1
  );

  // A telegraph EGYSZER fut le, és a záró pózon áll meg — a windup hossza pont ennyi.
  define(
    BEAST_MASTER_ANIMS.BRACE,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, BRACE_FRAMES),
    fps(frameCount(BRACE_FRAMES), BRACE_ANIM_MS),
    0
  );

  define(
    BEAST_MASTER_ANIMS.CHARGE,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, CHARGE_FRAMES),
    fps(frameCount(CHARGE_FRAMES), CHARGE_ANIM_MS),
    -1
  );

  define(
    BEAST_MASTER_ANIMS.ATTACK,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, ATTACK_FRAMES),
    1000 / ATTACK_SLOT_MS,
    0
  );

  define(
    BEAST_MASTER_ANIMS.HIT,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, HIT_FRAMES),
    fps(frameCount(HIT_FRAMES), HIT_ANIM_MS),
    0
  );
}

/**
 * State -> animáció leképezés. PURE, hogy a Phaser AnimationManager mockolása nélkül
 * unit-tesztelhető legyen.
 *
 * A `DORMANT` az IDLE-re képződik le: a párbeszéd és a belépő alatt a lény ott áll, csak nem
 * mozdul és nem sebezhető.
 */
export function animKeyForState(state: BeastMasterState, isMoving: boolean): string {
  switch (state) {
    case 'ATTACK':
    case 'COOLDOWN':
      return BEAST_MASTER_ANIMS.ATTACK;
    case 'CHARGE_WINDUP':
      return BEAST_MASTER_ANIMS.BRACE;
    case 'CHARGE':
      return BEAST_MASTER_ANIMS.CHARGE;
    case 'STAGGER':
      // A falnak rohanó roham megtorpanása — a `Take-Hit` szerepe a Mad Kingnél.
      return BEAST_MASTER_ANIMS.HIT;
    case 'DEAD':
      return BEAST_MASTER_ANIMS.HIT;
    case 'DORMANT':
      return BEAST_MASTER_ANIMS.IDLE;
    case 'APPROACH':
    default:
      return isMoving ? BEAST_MASTER_ANIMS.RUN : BEAST_MASTER_ANIMS.IDLE;
  }
}
