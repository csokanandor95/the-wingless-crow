import Phaser from 'phaser';
import type { FacingGeometry } from '../systems/SpriteFacing';
import {
  FRAME_HEIGHT as PLAYER_FRAME_HEIGHT,
  ORIGIN_Y as PLAYER_ORIGIN_Y,
} from '../player/PlayerAnimations';
// CSAK típusként — az AncientDemon.ts ebből a modulból ÉRTÉKEKET importál (időzítés,
// geometria), tehát egy runtime-import visszafelé kört csinálna. A DemonState string enum,
// ezért a tagjai literál kulcsokat adnak, és a lentebbi switch enum-hivatkozás nélkül is
// típushelyes. (A MadKingAnimations azonos megoldása.)
import type { DemonState } from './AncientDemon';

// --- Sprite sheet geometria -------------------------------------------------
// "Undead Executioner" (darkpixel-kronovi / Kronovi-). ÖT külön sheet a bosshoz, mind
// AZONOS 100x100-as frame-mel — a knight, a Gravecaller és a Mad King mintájára, nem egyetlen
// atlasz. A Phaser animációi (textúra, frame) párokat tárolnak, tehát a play() magától átvált.
//
// A csomag KÉT dolgot NEM ad, és mindkettő tervezési következménnyel jár:
//  - NINCS járás/futás animáció -> a démon nem sétál, hanem LEBEG (az idle fut mozgás közben
//    is) és VILLAN (blink). Ez lett a boss karaktere, lásd AncientDemon.ts.
//  - NINCS hurt animáció -> a találat-visszajelzés fehér TintModes.FILL villanás. Ez amúgy is
//    a projekt bevett boss-megoldása: egy flinch megszakítaná a telegraph-okat.
//
// A frame-tartományok és a geometria MÉRVE (alpha bounding box + oszlop-sűrűség), nem becsülve.

export const FRAME_WIDTH = 100;
export const FRAME_HEIGHT = 100;

/**
 * A rajzolt lidérc 1:1-ben ~45x62 px. A 2 EGÉSZ SZÁM: nearest-neighbour mellett minden
 * forrás-pixel tiszta 2x2-es blokk, tehát a pixel art éles marad. UGYANAZ a skála, mint a
 * Grafted Wing-Breakeré és a Mad Kingé, tehát a három boss tömege összemérhető — a démon
 * 124 px-es látványmagasságával így a legmagasabb a háromból (112 / 108 mellett).
 *
 * Minden lentebbi *_PX konstans FORRÁS-pixelben van; a világ-koordinátás értékek ebből
 * a SCALE-lel származnak.
 */
export const SCALE = 2;

export const DEMON_TEXTURES = {
  /**
   * `idle2.png` — 8 frame. Az `idle.png` SZÁNDÉKOSAN kimarad: ugyanaz a lebegés gyorsabban,
   * ráadásul üres záró frame-mel. Egy sheettel kevesebb, egy kivétellel kevesebb.
   */
  IDLE: 'ancient-demon-idle',
  /** `attacking.png` — 18 frame-nyi rács, ebből 13 rajzolt (f13-f17 ÜRES). KÉT csapás. */
  COMBO: 'ancient-demon-combo',
  /** `skill1.png` — 12 frame: az árny-hullám a talajon, MINDKÉT irányba. */
  NOVA: 'ancient-demon-nova',
  /** `summon.png` — 8 frame-nyi rács, ebből 5 rajzolt (f5-f7 ÜRES). */
  SUMMON: 'ancient-demon-summon',
  /** `death.png` — 20 frame-nyi rács, ebből 18 rajzolt (f18-f19 ÜRES). */
  DEATH: 'ancient-demon-death',
} as const;

// A tömör köpeny az idle f0 oszlop-sűrűségéből: x 35..51 (>=16 rajzolt sor oszloponként).
// Az x >= 52 sáv már a kasza nyele (6 sor/oszlop), az nem tartozik a testhez.
export const BODY_WIDTH = 16;
export const BODY_HEIGHT = 52;
export const BODY_OFFSET_X = 35; // 35..51, közepe 43
export const BODY_OFFSET_Y = 30; // 30..82, a talp a frame y=82-nél

/** A sprite.y a body közepén van, mint mindkét eddigi bossnál. */
export const ORIGIN_Y = (BODY_OFFSET_Y + BODY_HEIGHT / 2) / FRAME_HEIGHT; // 56/100

/** A talp távolsága a sprite.y-tól VILÁG-pixelben — a FinalBossScene ebből számol spawn Y-t. */
export const FEET_OFFSET_Y = (BODY_HEIGHT / 2) * SCALE; // 52
/** A body félszélessége VILÁG-pixelben. */
export const HALF_WIDTH = (BODY_WIDTH / 2) * SCALE; // 16

/**
 * A kasza hegyének távolsága a testközéptől a CSAPÁS frame-jein (a COMBO f2 ÉS f9 esetén
 * egyaránt: a világos penge-pixelek x=88-ig érnek, a testközép 43). Ebből származik a
 * SLASH_RANGE — a projekt elve szerint a hitbox az animáció tényleges kiterjedéséből jön,
 * nem szabadon hangolt szám. Ha a COMBO_STRIKE_FRAMES változik, ezt EGYÜTT kell újramérni.
 */
export const BLADE_REACH_PX = 45;

/**
 * Az árny-hullám geometriája, MÉRVE — a nova a boss egyetlen terület-támadása, és a
 * hitboxának pontosan a rajzolt hullámot kell fednie.
 *
 * A hullám a skill1 f5-f9 frame-jein terjed, és SZIMMETRIKUS: a legszélesebb állásban
 * (f7) x=5..81, aminek a közepe 43 — PONTOSAN a body-ból levezetett testközép. A két,
 * egymástól FÜGGETLEN mérés (oszlop-sűrűség vs. hullám-szimmetria) tehát ugyanazt adja.
 */
export const NOVA_RADIUS_PX = 38; // 81 - 43
/**
 * A hullám teteje a talp FÖLÖTT (az f7 új pixelei y=35..77-ig érnek, a talp y=82). Ez az a
 * magasság, ami fölé a playernek UGRANIA kell, hogy elkerülje.
 */
export const NOVA_TOP_PX = 47; // 82 - 35

/**
 * A player talpának távolsága a sprite.y-jától — a nova ugrás-kapujához kell.
 * LEVEZETETT, nem beírt 24: a knight originje a 64-es frame 0.625-énél van.
 */
export const PLAYER_FEET_OFFSET_Y = PLAYER_FRAME_HEIGHT * (1 - PLAYER_ORIGIN_Y); // 24

// --- Facing-kompenzáció -----------------------------------------------------
// A sheet natívan JOBBRA néz: a piros szempár a csuklya JOBB szélén ül (x=47..49, miközben
// a csuklya x=42..50), és a köpeny uszálya balra-hátra lobog.
//
// A test közepe (35 + 8 = 43) NEM a frame közepe (50), tehát itt a kompenzáció ténylegesen
// dolgozik: egy sima setFlipX() 2 * (50 - 43) = 14 forrás-px-t (28 világ-px-t) ugrasztana a
// testen. Lásd a 11./16. technikai tanulságot.
export const ANCIENT_DEMON_FACING: FacingGeometry = {
  frameWidth: FRAME_WIDTH,
  bodyWidth: BODY_WIDTH,
  bodyOffsetX: BODY_OFFSET_X,
  bodyOffsetY: BODY_OFFSET_Y,
  originY: ORIGIN_Y,
  nativeFacing: 'right',
};

// --- Kulcsok ----------------------------------------------------------------
// A kulcsok szándékosan NEM egyeznek a démon által emittált event-nevekkel
// (demon-slash, demon-nova, demon-summon), hogy olvasáskor se lehessen összekeverni.

export const ANCIENT_DEMON_ANIMS = {
  IDLE: 'ancient-demon-anim-idle',
  COMBO: 'ancient-demon-anim-combo',
  NOVA: 'ancient-demon-anim-nova',
  SUMMON: 'ancient-demon-anim-summon',
  DEATH: 'ancient-demon-anim-death',
} as const;

/** Melyik akció után vagyunk COOLDOWN-ban — ez dönti el, melyik animáció fut tovább. */
export type DemonAction = 'COMBO' | 'NOVA' | 'SUMMON';

// --- Frame-tartományok ------------------------------------------------------

const IDLE_FRAMES = { start: 0, end: 7 };
const DEATH_FRAMES = { start: 0, end: 17 };

/**
 * A kaszakombó. A sheet 13 rajzolt frame-je KÉT teljes csapást tartalmaz:
 *   f0      idle-póz (innen indul, tehát az átmenet varratmentes)
 *   f1      windup: a kasza a fej fölé emelve — EZ a telegraph, ezért kap 6 slotot
 *   f2      ELSŐ CSAPÁS (nagy ív, a penge x=88-ig)
 *   f3-f4   kifutás
 *   f5-f8   a kasza visszaemelése = a MÁSODIK windup
 *   f9      MÁSODIK CSAPÁS (körbesöprő ív)
 *   f10-f12 kifutás
 *
 * A windup-kockák ismétlése ugyanaz a fogás, mint a CrowHarvester ATTACK_FRAMES-énél és a
 * Mad King SLASH_FRAMES-énél: a csapásnak PONTOS pillanatban kell képre kerülnie, mert ott
 * fut a resolveStrike().
 */
const COMBO_FRAMES = [0, 0, 1, 1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 10, 11, 12, 12];
const COMBO_STRIKE_FRAMES = [2, 9] as const;

/**
 * Az árny-hullám. f0 idle, f1-f3 a kasza felemelése (telegraph), f4 közvetlenül a kitörés
 * előtt, f5-f6 a hullám terjed, f7 a LEGSZÉLESEBB állás (itt sebez), f8-f9 összehúzódik,
 * f10-f11 kifutás. Az f1/f2 duplázva: az a legolvashatóbb "mindjárt jön" póz.
 */
const NOVA_FRAMES = [0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const NOVA_IMPACT_FRAME = 7;

/**
 * Az idézés: f0 idle, f1-f2 a kasza a magasba (f2 a csúcs, y=10-ig), f3 lecsapja — EKKOR
 * jelennek meg az árnyékok —, f4 visszaáll.
 */
const SUMMON_FRAMES = [0, 1, 2, 2, 3, 4];
const SUMMON_RELEASE_FRAME = 3;

// --- Időzítés ---------------------------------------------------------------
// A frameRate SOSEM beégetett: mindig a kívánt hosszból számítódik. A gameplay-időzítéseket
// az AncientDemon.ts INNEN veszi át, hogy az animáció és a sebzés pillanata ne csúszhasson el.

const IDLE_ANIM_MS = 1400;
export const DEATH_ANIM_MS = 1600;

/** Egy kombó-frame hossza. */
const COMBO_SLOT_MS = 75;
/** Egy nova-frame hossza. */
const NOVA_SLOT_MS = 80;
/** Egy idézés-frame hossza. */
const SUMMON_SLOT_MS = 160;

const slotTime = (frames: readonly number[], frame: number, slotMs: number): number =>
  frames.indexOf(frame) * slotMs;

/**
 * A KÉT CSAPÁS IDŐZÍTÉSE MÉRT, NEM ÍZLÉS — a Mad King fairness-levezetésének a mintája.
 *
 * Pontblank helyzetből (a két test félszélessége 16 + 14 = 30 px) a playernek
 * SLASH_RANGE + 10 = 100 px-re kell jutnia. A MOVE_SPEED (200), a JUMP_VELOCITY (-500)
 * és a GRAVITY_Y (800) mellett:
 *
 *   | válasz     | mihez kell eljutni       | idő    | + 250 ms reakció |
 *   |------------|--------------------------|--------|------------------|
 *   | hátralépés | dx > 100 (tehát +70 px)  | 350 ms | 600 ms           |
 *   | ugrás      | dy > 95 (67 px emelkedés)| 154 ms | 404 ms           |
 *
 * Tehát 600 ms az a windup, amivel MINDKÉT válasz működik — a rövidebb kizárná a
 * hátralépést, és a csapás csak ugrással lenne kikerülhető. A második csapás pontosan
 * ugyanennyivel később jön, tehát az elsőre adott válasz után marad idő a másodikra
 * reagálni.
 *
 * SZÁMÍTVA, nem beírva: ha a COMBO_FRAMES lista változik, ezek magától követik.
 */
export const COMBO_STRIKE1_MS = slotTime(COMBO_FRAMES, COMBO_STRIKE_FRAMES[0], COMBO_SLOT_MS); // 600
export const COMBO_STRIKE2_MS = slotTime(COMBO_FRAMES, COMBO_STRIKE_FRAMES[1], COMBO_SLOT_MS); // 1200
export const COMBO_TOTAL_MS = COMBO_FRAMES.length * COMBO_SLOT_MS; // 1575

/**
 * A hullám becsapódása. A kikerüléshez a playernek NOVA_CLEAR_HEIGHT (94 px) magasra kell
 * ugrania, ami 231 ms — plusz ~250 ms emberi reakcióidő = 481 ms a minimum. A 720 ms ezen
 * felül tartalékot ad, és a player 231-1020 ms között VÉGIG a hullám fölött van, tehát az
 * ablak 789 ms széles: bőven eltalálható, de nem ingyen.
 */
export const NOVA_IMPACT_MS = slotTime(NOVA_FRAMES, NOVA_IMPACT_FRAME, NOVA_SLOT_MS); // 720
export const NOVA_TOTAL_MS = NOVA_FRAMES.length * NOVA_SLOT_MS; // 1120

/** Az árnyékok EKKOR jelennek meg: amikor a kasza lecsap (f3). */
export const SUMMON_RELEASE_MS = slotTime(SUMMON_FRAMES, SUMMON_RELEASE_FRAME, SUMMON_SLOT_MS); // 640
export const SUMMON_TOTAL_MS = SUMMON_FRAMES.length * SUMMON_SLOT_MS; // 960

// --- Létrehozás -------------------------------------------------------------

const frameCount = (range: { start: number; end: number }): number => range.end - range.start + 1;

/** A frameRate mindig a kívánt teljes hosszból SZÁMÍTÓDIK, sosem beégetett érték. */
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

/**
 * A démon animációi. A Phaser AnimationManager GAME-szintű, ezért elég egyszer meghívni
 * (BootScene.create()); az exists() guard az ismételt hívást is elviseli.
 */
export function createAncientDemonAnimations(scene: Phaser.Scene): void {
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

  range(ANCIENT_DEMON_ANIMS.IDLE, DEMON_TEXTURES.IDLE, IDLE_FRAMES, IDLE_ANIM_MS, -1);
  // A halál-sheet utolsó rajzolt frame-je már majdnem üres, az f18-f19 pedig teljesen az —
  // a lény tehát MAGÁTÓL foszlik szét. Ezért NEM kell fade-tween (szemben a CrowHarvesterrel
  // és a Wing-Breakerrel), és nem is marad test (szemben a Mad Kinggel).
  range(ANCIENT_DEMON_ANIMS.DEATH, DEMON_TEXTURES.DEATH, DEATH_FRAMES, DEATH_ANIM_MS, 0);

  // Mind a három támadás slot-alapú (nem teljes-hossz alapú), mert a sebző frame-nek
  // PONTOS pillanatban kell képre kerülnie — ott, ahol a megfelelő resolve*() fut.
  list(ANCIENT_DEMON_ANIMS.COMBO, DEMON_TEXTURES.COMBO, COMBO_FRAMES, COMBO_SLOT_MS, 0);
  list(ANCIENT_DEMON_ANIMS.NOVA, DEMON_TEXTURES.NOVA, NOVA_FRAMES, NOVA_SLOT_MS, 0);
  list(ANCIENT_DEMON_ANIMS.SUMMON, DEMON_TEXTURES.SUMMON, SUMMON_FRAMES, SUMMON_SLOT_MS, 0);
}

/**
 * State -> animáció leképezés. Szándékosan PURE függvény, hogy Phaser AnimationManager
 * mockolása nélkül unit-tesztelhető legyen.
 *
 * FIGYELEM: a FLOAT és a két BLINK állapot is IDLE-re képződik le, és ez nem hiányosság,
 * hanem a csomag adottsága — nincs járás- és nincs teleport-animáció. A mozgást a velocityX,
 * a villanást pedig az alpha-tween közli; a lebegő, láb nélküli köpeny mindkettőt hitelesen
 * viseli.
 *
 * A COOLDOWN az ELŐZŐ AKCIÓ záró pózára képződik le (a Mad King azonos elve): így a kifutás
 * képe áll a cooldown alatt, ahelyett hogy a démon azonnal idle-be pattanna.
 */
export function animKeyForState(state: DemonState, lastAction: DemonAction | null): string {
  switch (state) {
    case 'COMBO':
      return ANCIENT_DEMON_ANIMS.COMBO;
    case 'NOVA':
      return ANCIENT_DEMON_ANIMS.NOVA;
    case 'SUMMON':
      return ANCIENT_DEMON_ANIMS.SUMMON;
    case 'DEAD':
      return ANCIENT_DEMON_ANIMS.DEATH;
    case 'COOLDOWN':
      switch (lastAction) {
        case 'COMBO':
          return ANCIENT_DEMON_ANIMS.COMBO;
        case 'NOVA':
          return ANCIENT_DEMON_ANIMS.NOVA;
        case 'SUMMON':
          return ANCIENT_DEMON_ANIMS.SUMMON;
        default:
          return ANCIENT_DEMON_ANIMS.IDLE;
      }
    case 'DORMANT':
    case 'FLOAT':
    case 'BLINK_OUT':
    case 'BLINK_IN':
    default:
      return ANCIENT_DEMON_ANIMS.IDLE;
  }
}
