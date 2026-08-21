import Phaser from 'phaser';
import type { FacingGeometry } from '../systems/SpriteFacing';
// CSAK típusként — a GraftedWingBreaker.ts ebből a modulból ÉRTÉKEKET importál (időzítések,
// geometria), tehát egy runtime-import visszafelé kört csinálna. A BossState string enum,
// ezért a tagjai literál kulcsokat adnak, és a lentebbi switch enum-hivatkozás nélkül is
// típushelyes.
import type { BossState } from './GraftedWingBreaker';

// --- Sprite sheet geometria -------------------------------------------------
// Bringer-of-Death-SpritSheet.png: 1120x744 = 8x8 db 140x93-as frame.
// A sorrendet az egyedi PNG-k alpha/pixel-hash párosításával ellenőriztem a sheet
// frame-jeivel — hézagmentesen egyezik.

export const FRAME_WIDTH = 140;
export const FRAME_HEIGHT = 93;

/**
 * A rajzolt karakter 1:1-ben csak ~47x56 px (a player 28x46), ami egy bosshoz kevés.
 * A 2 EGÉSZ SZÁM: nearest-neighbour mellett minden forrás-pixel tiszta 2x2-es blokk lesz,
 * tehát a pixel art éles marad. Minden lentebbi *_PX konstans FORRÁS-pixelben van; a
 * világ-koordinátás értékek ebből a SCALE-lel származnak.
 */
export const SCALE = 2;

export const TEXTURE_KEY = 'wing-breaker';
/**
 * Ugyanaz a sheet az energia-effektek nélkül, AZONOS 8x8-as elrendezéssel (a 0-19 frame
 * bitre azonos az effektessel). Pontosan EGY frame kell belőle: a dash póz — lásd DASH_FRAME.
 */
export const CLEAN_TEXTURE_KEY = 'wing-breaker-clean';

// A karakter a frame JOBB oldalán ül: idle sziluett x 81..127, a tömör törzs x 96..123,
// a bal oldalt a kasza nyele tölti ki. A frame közepe 70, a test közepe 106 -> off-center.
export const BODY_WIDTH = 32;
export const BODY_HEIGHT = 54;
export const BODY_OFFSET_X = 90; // 90..122, közepe 106
export const BODY_OFFSET_Y = 37; // 37..91, a talp a frame y=91-nél

/** A sprite.y a body közepén van, mint a placeholder 64x96-os téglalapnál. */
export const ORIGIN_Y = (BODY_OFFSET_Y + BODY_HEIGHT / 2) / FRAME_HEIGHT; // 64/93

/** A talp távolsága a sprite.y-tól VILÁG-pixelben — a BossScene ebből számol spawn Y-t. */
export const FEET_OFFSET_Y = (BODY_HEIGHT / 2) * SCALE; // 54
/** A body félszélessége VILÁG-pixelben. */
export const HALF_WIDTH = (BODY_WIDTH / 2) * SCALE; // 32

/**
 * A kasza hegyének távolsága a testközéptől a CSAPÁS frame-jén (clean[20]: x=37, testközép
 * 106). Ebből származik a SLASH_RANGE — a projekt elve szerint a hitbox az animáció
 * tényleges kiterjedéséből jön, nem szabadon hangolt szám. Ha a DASH_FRAME / a támadás
 * frame-tartománya változik, ezt EGYÜTT kell újraszámolni.
 */
export const BLADE_REACH_PX = 69;

// --- Facing-kompenzáció -----------------------------------------------------
// FIGYELEM: ez a sheet natívan BALRA néz (a CrowHarvester jobbra). A test off-center
// volta miatt egy sima setFlipX() 2 * (70 - 106) = 72px-t ugrasztaná oldalra — a
// kompenzációt a megosztott systems/SpriteFacing.ts végzi.
export const WING_BREAKER_FACING: FacingGeometry = {
  frameWidth: FRAME_WIDTH,
  bodyWidth: BODY_WIDTH,
  bodyOffsetX: BODY_OFFSET_X,
  bodyOffsetY: BODY_OFFSET_Y,
  originY: ORIGIN_Y,
  nativeFacing: 'left',
};

// --- Kulcsok ----------------------------------------------------------------
// A kulcsok szándékosan NEM egyeznek a boss által emittált event-nevekkel
// ('boss-projectile', 'boss-spell', 'boss-charge-windup'), hogy olvasáskor se lehessen
// összekeverni a kettőt.

export const WING_BREAKER_ANIMS = {
  IDLE: 'wing-breaker-idle',
  WALK: 'wing-breaker-walk',
  SLASH: 'wing-breaker-slash',
  CAST: 'wing-breaker-cast',
  CHARGE_WINDUP: 'wing-breaker-charge-windup',
  DASH: 'wing-breaker-dash',
  HURT: 'wing-breaker-hurt',
  DEATH: 'wing-breaker-death',
  /** A becsapódó árny-oszlop. NEM a boss játssza le, hanem a BossScene egy külön sprite-on. */
  SPELL: 'wing-breaker-spell',
} as const;

/** Melyik akció után vagyunk COOLDOWN-ban — ez dönti el, melyik animáció fut tovább. */
export type BossAction = 'SLASH' | 'PROJECTILE' | 'SPELL' | 'CHARGE';

// --- Frame-tartományok ------------------------------------------------------

const IDLE_FRAMES = { start: 0, end: 7 };
const WALK_FRAMES = { start: 8, end: 15 };
const ATTACK_FRAMES = { start: 16, end: 25 };
const HURT_FRAMES = { start: 26, end: 28 };
const DEATH_FRAMES = { start: 29, end: 38 };
const CAST_FRAMES = { start: 39, end: 47 };

/** A charge telegraph: a kasza hátrahúzása. A f19-en MEGÁLL (repeat 0), és onnan lendül
 *  előre a DASH_FRAME-re — a kettő animáció-folytonos. */
const CHARGE_WINDUP_FRAMES = { start: 16, end: 19 };

/**
 * A dash póz a TISZTA sheetről: mély, előredőlt kitörés előrenyújtott kaszával. Az effektes
 * változat ugyanezen a frame-en egy hatalmas sötét félholdat is rajzol, ami 1.2 mp-en át
 * megtartva statikus fekete folttá válna a képernyőn.
 */
export const DASH_FRAME = 20;

// --- Időzítés ---------------------------------------------------------------
// A frameRate SOSEM beégetett: mindig a kívánt hosszból számítódik. A gameplay-időzítéseket
// (SLASH_STARTUP_MS, PROJECTILE_STARTUP_MS) a GraftedWingBreaker.ts INNEN veszi át, hogy az
// animáció és a sebzés pillanata ne tudjon elcsúszni egymástól.

/** Egy slash-frame hossza. */
const ATTACK_SLOT_MS = 100;
/** Az f20 (a csapás) a tartomány 4. slotja után kerül képre. */
const ATTACK_SLOTS_BEFORE_STRIKE = 4;
/** A támadás kezdetétől a csapásig: a GraftedWingBreaker SLASH_STARTUP_MS-e ebből jön. */
export const SLASH_WINDUP_MS = ATTACK_SLOTS_BEFORE_STRIKE * ATTACK_SLOT_MS; // 400

/** Az f45 (az energia csúcsa) a cast 6. slotja után van — ekkor születik a lövedék/spell. */
const CAST_SLOTS_BEFORE_RELEASE = 6;
export const CAST_RELEASE_MS = 500;
const CAST_SLOT_MS = CAST_RELEASE_MS / CAST_SLOTS_BEFORE_RELEASE; // 83.33

/**
 * A kasza hátrahúzása. RÖVIDEBB, mint a boss CHARGE_WINDUP_MS-e (1000): a maradék időt a
 * f19-en megállva tölti — ez az "összehúzódott, mindjárt kilő" póz.
 */
const CHARGE_WINDUP_ANIM_MS = 500;

export const HURT_ANIM_MS = 240;
export const DEATH_ANIM_MS = 1000;
/** A death animáció UTÁNI elhalványulás. Együtt 1300ms, belefér a BossScene 1400ms-ába. */
export const DEATH_FADE_MS = 300;

const IDLE_ANIM_MS = 1000;
const WALK_ANIM_MS = 900;

// --- Shadow Spell (a becsapódó árny-oszlop) ---------------------------------
// A Spell frame-ek KÜLÖNÁLLÓ effekt-sprite-ot rajzolnak, nem a karaktert:
//   f48-51  lebegő izzás (y 35..53)   -> ez a TELEGRAPH, ezt nyújtjuk ki
//   f52-54  leereszkedés
//   f55     az oszlop FÖLDET ÉR       -> itt oldódik fel a sebzés
//   f56-60  az oszlop áll
//   f61-63  szertefoszlik

const SPELL_SLOT_MS = 60;
const SPELL_TELEGRAPH_FRAMES = [48, 49, 50, 51];
/**
 * Hányszor ismételjük a lebegő izzást, hogy legyen idő oldalra kitérni. 4 kör = 960ms:
 * a player MOVE_SPEED-je 200 px/s, a kitéréshez ~46px kell, tehát ~230ms — a maradék a
 * reakcióidőé. Ez a támadás EGYETLEN nehézség-hangolópontja.
 */
const SPELL_TELEGRAPH_LOOPS = 4;
const SPELL_STRIKE_FRAMES = [52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63];
const SPELL_IMPACT_FRAME = 55;

function buildSpellFrames(): number[] {
  const frames: number[] = [];
  for (let i = 0; i < SPELL_TELEGRAPH_LOOPS; i++) frames.push(...SPELL_TELEGRAPH_FRAMES);
  frames.push(...SPELL_STRIKE_FRAMES);
  return frames;
}

const SPELL_FRAMES = buildSpellFrames();

/** Meddig lebeg az izzás a player feje fölött, mielőtt lecsapna. Ez a kitérési ablak. */
export const SPELL_TELEGRAPH_MS =
  SPELL_TELEGRAPH_LOOPS * SPELL_TELEGRAPH_FRAMES.length * SPELL_SLOT_MS; // 960
/** Az effekt megjelenésétől a becsapódásig — a boss ennyi után oldja fel a sebzést. */
export const SPELL_IMPACT_MS = SPELL_FRAMES.indexOf(SPELL_IMPACT_FRAME) * SPELL_SLOT_MS; // 1140
export const SPELL_TOTAL_MS = SPELL_FRAMES.length * SPELL_SLOT_MS; // 1680

// Az oszlop a frame x 52..83 sávjában van, a talpa y=91-nél. Ezzel az originnel a
// becsapódás pontosan a megadott talaj-Y-on ül, az izzás pedig 76..112 világ-pixellel
// FÖLÖTTE lebeg — jóval a 46px magas player feje felett.
export const SPELL_ORIGIN_X = 67.5 / FRAME_WIDTH;
export const SPELL_ORIGIN_Y = 91 / FRAME_HEIGHT;
/** Az oszlop félszélessége FORRÁS-pixelben; a boss ebből számol találati sávot. */
export const SPELL_PILLAR_HALF_PX = 16;

// --- Létrehozás -------------------------------------------------------------

const frameCount = (range: { start: number; end: number }): number =>
  range.end - range.start + 1;

/** A frameRate mindig a kívánt teljes hosszból SZÁMÍTÓDIK, sosem beégetett érték. */
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

/**
 * A boss animációi. A Phaser AnimationManager GAME-szintű, ezért elég egyszer meghívni
 * (BootScene.create()); az `exists()` guard az ismételt hívást is elviseli.
 */
export function createGraftedWingBreakerAnimations(scene: Phaser.Scene): void {
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
    frames: { start: number; end: number },
    durationMs: number,
    repeat: number
  ): void =>
    define(
      key,
      scene.anims.generateFrameNumbers(TEXTURE_KEY, frames),
      fps(frameCount(frames), durationMs),
      repeat
    );

  range(WING_BREAKER_ANIMS.IDLE, IDLE_FRAMES, IDLE_ANIM_MS, -1);
  range(WING_BREAKER_ANIMS.WALK, WALK_FRAMES, WALK_ANIM_MS, -1);
  range(WING_BREAKER_ANIMS.HURT, HURT_FRAMES, HURT_ANIM_MS, 0);
  range(WING_BREAKER_ANIMS.DEATH, DEATH_FRAMES, DEATH_ANIM_MS, 0);
  range(WING_BREAKER_ANIMS.CHARGE_WINDUP, CHARGE_WINDUP_FRAMES, CHARGE_WINDUP_ANIM_MS, 0);

  // A slash és a cast esetén a SLOT-hosszt rögzítjük (nem a teljes animáció hosszát), mert
  // egy-egy konkrét frame-nek kell PONTOS pillanatban képre kerülnie: az f20 (a csapás)
  // SLASH_WINDUP_MS-nél, az f45 (az energia csúcsa) CAST_RELEASE_MS-nél.
  define(
    WING_BREAKER_ANIMS.SLASH,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, ATTACK_FRAMES),
    1000 / ATTACK_SLOT_MS,
    0
  );

  define(
    WING_BREAKER_ANIMS.CAST,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, CAST_FRAMES),
    1000 / CAST_SLOT_MS,
    0
  );

  // Dash: EGYETLEN megtartott póz a tiszta sheetről. A sebesség érzetét az
  // AfterImageTrail adja hozzá (systems/AfterImageTrail.ts).
  define(
    WING_BREAKER_ANIMS.DASH,
    [{ key: CLEAN_TEXTURE_KEY, frame: DASH_FRAME }],
    1,
    -1
  );

  define(
    WING_BREAKER_ANIMS.SPELL,
    scene.anims.generateFrameNumbers(TEXTURE_KEY, { frames: SPELL_FRAMES }),
    1000 / SPELL_SLOT_MS,
    0
  );
}

/**
 * State -> animáció leképezés. Szándékosan PURE függvény, hogy Phaser AnimationManager
 * mockolása nélkül unit-tesztelhető legyen.
 *
 * A COOLDOWN az ELŐZŐ AKCIÓ animációjára képződik le: így a hívó `playAnim()` guardja
 * mellett a 750-1000ms-os támadás-animáció egyben fut végig a rövidebb akció-state és a
 * rákövetkező COOLDOWN párosán, ahelyett hogy a state-váltásnál újraindulna.
 */
export function animKeyForState(
  state: BossState,
  lastAction: BossAction | null,
  isMoving: boolean
): string {
  switch (state) {
    case 'SLASH':
      return WING_BREAKER_ANIMS.SLASH;
    case 'PROJECTILE':
    case 'SPELL':
      return WING_BREAKER_ANIMS.CAST;
    case 'CHARGE_WINDUP':
      return WING_BREAKER_ANIMS.CHARGE_WINDUP;
    case 'CHARGE':
      return WING_BREAKER_ANIMS.DASH;
    case 'DEAD':
      return WING_BREAKER_ANIMS.DEATH;
    case 'COOLDOWN':
      switch (lastAction) {
        case 'SLASH':
          return WING_BREAKER_ANIMS.SLASH;
        case 'PROJECTILE':
        case 'SPELL':
          return WING_BREAKER_ANIMS.CAST;
        default:
          // Charge után (vagy akció nélkül) nincs mit folytatni: kifújja magát.
          return WING_BREAKER_ANIMS.IDLE;
      }
    case 'DORMANT':
      // A belépő alatt áll — a mozgás-flaget itt szándékosan figyelmen kívül hagyjuk.
      return WING_BREAKER_ANIMS.IDLE;
    case 'APPROACH':
    default:
      return isMoving ? WING_BREAKER_ANIMS.WALK : WING_BREAKER_ANIMS.IDLE;
  }
}
