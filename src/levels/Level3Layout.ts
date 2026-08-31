import {
  BUILDING_TEXTURES,
  GROUND_TOP,
  PLAYER_HALF_HEIGHT,
  PROP_TEXTURES,
  PROP_TINT_NONE,
  enemyChaseBounds as enemyChaseBoundsIn,
  groundGaps as groundGapsIn,
  groundSegmentById as groundSegmentByIdIn,
  platformById as platformByIdIn,
  surfaceSpan as surfaceSpanIn,
  type BuildingDef,
  type DecorPropDef,
  type EnemySpawnDef,
  type GapDef,
  type GroundSegmentDef,
  type LevelGeometry,
  type PlatformDef,
  type Span,
  type SpikeFieldDef,
} from './LevelGeometry';
import { CHARGE_MIN_RANGE, CHARGE_SPEED, CHARGE_WINDUP_MS } from '../enemies/Beast';
import { MOVE_SPEED } from '../player/Player';

/**
 * Level 3 – The Beast Dungeon: a pálya TELJES geometriája, egyetlen forrásból.
 *
 * Phaser-mentes adatmodul, a `Level1Layout.ts` / `Level2Layout.ts` mintájára. A KÖZÖS
 * geometria (típusok, ugrás-plafon, pure helperek) a `LevelGeometry.ts`-ben van.
 *
 * ## A pálya tézise
 *
 * **A Beast a sík padlón támad, ami elől fel lehet ugrani a galériákra — de ott
 * Gravecallerek tüzelnek.** Minden szám ezt az egy hurkot szolgálja.
 *
 * Ehhez egy ÚJ design-eszköz kellett, a MENNYEZET. A `Beast` rohamát eddig „oldalra lépéssel
 * vagy átugrással" lehetett kikerülni — egy dungeon-folyosóban viszont az oldalra lépés nem
 * létezik (a roham MAGA a folyosó), a menekülés pedig nem működik (`CHARGE_SPEED` 320 vs. a
 * player `MOVE_SPEED`-je 200). **Marad az ugrás**, és pontosan ettől lesz a galéria alja
 * gameplay-elem, nem díszlet.
 *
 * ## Miért rövidebb és szűkebb
 *
 * 4200 px a Level 1 6000-ével és a Level 2 7200-ával szemben, 12 ellenféllel (a Level 2-n 15
 * volt, két és félszer akkora pályán). A pálya hat „karámra" bomlik, amiket öt rövid gödör
 * választ el — és a gödör itt nem platforming-kihívás, hanem a karám FALA: az
 * `enemyChaseBounds()` a felület peremén megállítja a Beastet, tehát a harc egy zárt cellában
 * zajlik, ahonnan nincs hova elfutni.
 *
 * Hat szakasz:
 *
 *   A előcsarnok · B első karám · C galéria-futam · D kettős karám ·
 *   E kripta-folyosó · F a kapu
 */

// --- Megosztott geometria (re-export, hogy a scene egy helyről importálhasson) ---

export {
  BUILDING_SINK_PX,
  EDGE_INSET,
  FALL_DEATH_Y,
  FALL_DEPTH,
  GRAVECALLER_SPAWN_OFFSET,
  GROUND_CENTER_Y,
  GROUND_TOP,
  HARVESTER_SPAWN_OFFSET,
  JUMP_CORRIDOR_MARGIN,
  MAX_JUMP_DISTANCE,
  MAX_JUMP_HEIGHT,
  MAX_SAFE_GAP,
  MAX_SAFE_RISE,
  MIN_JUMP_CLEARANCE_RISE,
  MIN_WALK_UNDER_RISE,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_HALF_HEIGHT,
  SPIKE_TILE_WIDTH,
  WORLD_HEIGHT,
  buildingFootprint,
  decorPropFootprint,
  enemyHalfBodyWidth,
  enemySpawnOffset,
  enemyType,
  horizontalReachForRise,
  platformBottom,
  platformLeft,
  platformRight,
  platformTop,
} from './LevelGeometry';

export type {
  BuildingDef,
  DecorPropDef,
  EnemySpawnDef,
  GapDef,
  GroundSegmentDef,
  PlatformDef,
  Span,
  SpikeFieldDef,
} from './LevelGeometry';

// --- Világ ------------------------------------------------------------------

export const WORLD_WIDTH = 4200;

/** Friss belépés a pályára = a `CheckpointSystem` default-ja, az `A` előcsarnok elején. */
export const START_X = 120;
export const START_Y = 300;

// --- Talaj-szegmensek -------------------------------------------------------

/**
 * HAT karám, ÖT gödörrel. Minden gödör **120 px** — konstans és megtanulható (a Level 2 `F`
 * szakaszának elve), és jóval a `MAX_SAFE_GAP` (175) alatt: a gödör nem kihívás, hanem
 * SZAKASZHATÁR.
 *
 * A karám-szélességek nem esztétikaiak. A Beast üldözési folyosója a felület pereme
 * `EDGE_INSET`-tel (24) behúzva, tehát:
 *
 *   G2 -> [664, 1216] = 552 px
 *   G4 -> [2204, 2756] = 552 px
 *   G6 -> [3744, 4176] = 432 px   <- a legszűkebb, a finálé
 *
 * Mindhárom bőven a 288 px-es roham-út (`CHARGE_MAX_MS` × `CHARGE_SPEED`) fölött van, tehát a
 * roham elfér — de egyikben sincs 552 px-nél több hely elfutni előle.
 */
export const GROUND_SEGMENTS: GroundSegmentDef[] = [
  { id: 'G1', startX: 0, endX: 520 }, // A — előcsarnok
  { id: 'G2', startX: 640, endX: 1240 }, // B — első karám (Beast #1)
  { id: 'G3', startX: 1360, endX: 2060 }, // C — galéria-futam
  { id: 'G4', startX: 2180, endX: 2780 }, // D — kettős karám (Beast #2)
  { id: 'G5', startX: 2900, endX: 3600 }, // E — kripta-folyosó
  { id: 'G6', startX: 3720, endX: WORLD_WIDTH }, // F — a kapu (Beast #3)
];

// --- A galéria magassága (LEVEZETETT) ---------------------------------------

/**
 * MINDEN galéria-lap ezen a magasságon van, és a szám HÁROM, egymástól független kényszer
 * metszete — nem szemre hangolt érték:
 *
 *   1. `110 <= MAX_SAFE_RISE (117)`          -> a padlóról FELUGORHATÓ (menekülőút);
 *   2. `110 >= MIN_WALK_UNDER_RISE (62)`     -> alatta EL LEHET SÉTÁLNI (48 px fejmagasság);
 *   3. `110 <  MIN_JUMP_CLEARANCE_RISE (218)`-> alatta NEM LEHET UGRANI -> **MENNYEZET**.
 *
 * A 3. pont a pálya lényege: a galéria alja ugyanaz a lap, ami a menekülőút teteje. A player
 * tehát nem tud csak úgy felugrani a roham elől — oda kell érnie egy nyíláshoz.
 */
export const GALLERY_RISE = 110;

/** A lap KÖZÉPPONTJÁNAK y-ja (a lap 16 px magas, origin 0.5). */
export const GALLERY_Y = GROUND_TOP - GALLERY_RISE + 8; // 316

// --- Platformok -------------------------------------------------------------
//
// MINDEN lap `tiles: 1.5` = 96 px, ami PONTOSAN 3 db 32 px-es kőblokk (a `block-strip.png`
// két blokkja 64 px-es periódussal ismétlődik, tehát minden 32 többszöröse egész blokkokra
// jön ki). A 96 px egyben a roham-kikerülhetőség kényszere is: egy lap közepéről a legközelebbi
// szabad oszlop `48 + a player fél teste (14) = 62 px`-re van, bőven a `BEAST_ESCAPE_REACH`
// (110) alatt.

export const PLATFORMS: PlatformDef[] = [
  // --- A: előcsarnok (0–520). EGY lap, biztonságos terepen. ---
  // A pálya a mennyezet-mechanikát itt mutatja be: nincs Beast, tehát a felugrás és a
  // „beverem a fejem" pillanat egyaránt következmény nélkül kipróbálható.
  // A jobb széle (468) a gödör ugrás-folyosója (492) ELŐTT ér véget — lásd lentebb.
  { id: 'A-gallery', x: 420, y: GALLERY_Y, tiles: 1.5 }, // 372..468

  // --- B: első karám (640–1240), Beast #1. ---
  // A két lap a karám két VÉGÉN, de a folyosó peremétől BEHÚZVA: így a karám mindkét sarka
  // szabad ég alatt van, és a sarokba szorult player is tud ugrani.
  { id: 'B-gallery-L', x: 748, y: GALLERY_Y, tiles: 1.5 }, // 700..796
  { id: 'B-gallery-R', x: 1132, y: GALLERY_Y, tiles: 1.5 }, // 1084..1180

  // --- C: galéria-futam (1360–2060). A tézis MEGFORDÍTÁSA. ---
  // Itt nincs Beast: a player MAGA halad végig a galérián, caster-tűz alatt, míg a padlón
  // crow-k járőröznek és két tüskemező várja. A lapok 144 px-es hézagokkal láncolhatók
  // (sík ugrás-hatótáv 250), a hézagok ALÁ pedig pont a tüskemezők esnek — a Level 2 `G`
  // szakaszának elve: aki elvéti a felső utat, a tüskékre érkezik.
  { id: 'C-gallery-1', x: 1488, y: GALLERY_Y, tiles: 1.5 }, // 1440..1536
  { id: 'C-gallery-2', x: 1728, y: GALLERY_Y, tiles: 1.5 }, // 1680..1776
  { id: 'C-gallery-3', x: 1968, y: GALLERY_Y, tiles: 1.5 }, // 1920..2016

  // --- D: kettős karám (2180–2780), Beast #2. A szakasz csúcspontja. ---
  // MINDKÉT menekülő-lapon caster áll: a felugrás innentől nem menedék, hanem csere.
  { id: 'D-gallery-L', x: 2288, y: GALLERY_Y, tiles: 1.5 }, // 2240..2336
  { id: 'D-gallery-R', x: 2672, y: GALLERY_Y, tiles: 1.5 }, // 2624..2720

  // --- E: kripta-folyosó (2900–3600). SZÁNDÉKOSAN nincs lap. ---
  // Ez a levegővétel a `D` csúcspont és a finálé között: egyetlen tüskemező, egyetlen crow,
  // sík padló. Egy galéria itt vagy megkerülné a mezőt (akkor a mező tét nélküli), vagy nem
  // vezetne sehova (akkor díszlet) — a szakasz így őszintébb.

  // --- F: a kapu (3720–4200), Beast #3. A legszűkebb karám. ---
  // A jobb lap SZÁNDÉKOSAN nem ér a boltívig (4052 < 4128): a 128 px magas ajtó teteje (298)
  // a lap alja (324) FÖLÉ nyúlna, és a `TERRAIN_DEPTH` (-5) kitakarná a `DOOR_DEPTH`-en (-6)
  // rajzolt kaput.
  { id: 'F-gallery-L', x: 3820, y: GALLERY_Y, tiles: 1.5 }, // 3772..3868
  { id: 'F-gallery-R', x: 4004, y: GALLERY_Y, tiles: 1.5 }, // 3956..4052
];

// --- Tüskemezők -------------------------------------------------------------

/**
 * KÉT mező, MINDKETTŐ a `C` szakaszban — és nem tetszőleges helyen, hanem a galéria-lapok
 * HÉZAGAI alatt (a Level 2 `G` szakaszának bevált elve).
 *
 * Ebből két dolog következik:
 *  - a felső útvonalnak van TÉTJE: egy elvétett ugrás pont a tüskékre visz;
 *  - a mező ugrás-FOLYOSÓJA (`JUMP_CORRIDOR_MARGIN` = 28 mindkét oldalon) elfér a hézagban,
 *    tehát a padlón haladó player is át tudja ugrani anélkül, hogy a lap aljába verné a fejét.
 *
 * A `D`/`F` karámokban SZÁNDÉKOSAN nincs mező: ott a Beast a lecke, és egy mező az
 * `enemyChaseBounds()`-on át el is vágná a roham-folyosóját.
 */
export const SPIKE_FIELDS: SpikeFieldDef[] = [
  // A `C-gallery-1` -> `C-gallery-2` hézag (1536..1680) alatt. Folyosó: [1544, 1664].
  { id: 'C-spikes-1', startX: 1572, endX: 1636, surfaceId: 'G3' }, // 64
  // A `C-gallery-2` -> `C-gallery-3` hézag (1776..1920) alatt. Folyosó: [1784, 1904].
  { id: 'C-spikes-2', startX: 1812, endX: 1876, surfaceId: 'G3' }, // 64
  // --- E: a kripta-folyosó egyetlen hazardja. ---
  // 128 px: a player TESTÉVEL együtt 156 px-t kell átérni, ami a `MAX_SAFE_GAP` (175) alatt
  // van, tehát tiszta átkelésnél 0 sebzés.
  { id: 'E-spikes-1', startX: 3180, endX: 3308, surfaceId: 'G5' }, // 128
];

// --- A roham kikerülhetősége (LEVEZETETT invariáns) -------------------------

/**
 * Meddig jut a player a roham TELEGRAPH-ja alatt — vagyis milyen messze lehet a legközelebbi
 * szabad (mennyezet nélküli) oszlop ahhoz, hogy a rohamot még ki lehessen ugrani.
 *
 * KONZERVATÍV levezetés: csak a windup idejével számol, a roham REPÜLÉSI idejével nem.
 * A valóságban a player ennél többet kap — a Beast legalább `CHARGE_MIN_RANGE`-ről indul,
 * tehát a becsapódásig még `CHARGE_MIN_RANGE / CHARGE_SPEED` (562 ms) eltelik, ami további
 * ~112 px mozgásteret ad. A szigorúbb számot használjuk, hogy a tartalék MÉRT legyen.
 *
 *     (800 ms windup − 250 ms reakcióidő) × 200 px/s = 110 px
 */
export const BEAST_REACTION_MS = 250;
export const BEAST_ESCAPE_REACH =
  ((CHARGE_WINDUP_MS - BEAST_REACTION_MS) * MOVE_SPEED) / 1000; // 110

/** Csak dokumentáció/teszt: a roham TÉNYLEGES mozgástere a becsapódásig. */
export const BEAST_CHARGE_TRAVEL_MS = (CHARGE_MIN_RANGE / CHARGE_SPEED) * 1000; // 562.5

// --- A pálya geometriai magja (a megosztott helperekhez) --------------------

export const LEVEL3_GEOMETRY: LevelGeometry = {
  groundSegments: GROUND_SEGMENTS,
  platforms: PLATFORMS,
  spikeFields: SPIKE_FIELDS,
};

/** Vékony wrapperek a `LevelGeometry.ts` pure helperei köré, a Level 3 adatához kötve. */
export const surfaceSpan = (id: string): Span => surfaceSpanIn(LEVEL3_GEOMETRY, id);
export const groundGaps = (): GapDef[] => groundGapsIn(GROUND_SEGMENTS);
export const platformById = (id: string): PlatformDef => platformByIdIn(LEVEL3_GEOMETRY, id);
export const groundSegmentById = (id: string): GroundSegmentDef =>
  groundSegmentByIdIn(LEVEL3_GEOMETRY, id);
export const enemyChaseBounds = (def: EnemySpawnDef): { min: number; max: number } =>
  enemyChaseBoundsIn(def, LEVEL3_GEOMETRY);

// --- Boss-ajtó --------------------------------------------------------------

/**
 * A boltív a PADLÓN áll, nem magas párkányon (a Level 1/2 döntésével szemben): bent vagyunk
 * egy dungeonben, az ajtón besétálunk. A geometria (nyílás, küszöb) a `ChurchTileset.ts`-ből
 * jön, hogy a scene-be ne kerüljön magic number.
 *
 * `x = 4160` -> a csempe 4128..4192, tehát a pálya jobb széle (4200) előtt 8 px-szel zár.
 */
export const DOOR = {
  x: 4160,
  surfaceId: 'G6',
} as const;

// --- Checkpointok -----------------------------------------------------------

export interface CheckpointDef {
  id: string;
  x: number;
  /** Ground szegmens VAGY platform id — a respawn Y ennek a felszínéből származik. */
  surfaceId: string;
}

/**
 * EGYETLEN köztes checkpoint (+ a pálya végi ajtó), a Level 2 mintájára — ÉRINTÉSRE
 * aktiválódik, hogy ne versenyezzen az ajtó `E` promptjával.
 *
 * A helye nem szabad: az `E` kripta-folyosó ELEJÉN áll, tehát maga mögött hagyja MINDKÉT
 * Beast-karámot (`B`, `D`) és a `C` galéria-futamot. Aki egyszer megérintette, annak a
 * finálénál (`F`) elhalálozva már csak a tüskemezőt kell újra teljesítenie.
 */
export const CHECKPOINTS: CheckpointDef[] = [{ id: 'CP-1', x: 2950, surfaceId: 'G5' }];

/** A respawn-pont: a felszínen álló player középpontja. */
export const checkpointRespawnY = (def: CheckpointDef): number =>
  surfaceSpan(def.surfaceId).top - PLAYER_HALF_HEIGHT;

/** A jelölő/zóna mérete — a Level 1/2-vel azonos, hogy a három pálya ugyanúgy olvasson. */
export const CHECKPOINT_ZONE = { width: 48, height: 72 } as const;

/** A pálya végi (ajtó-)checkpoint: `E`-re aktiválódik, és egyben a boss-átmenet. */
export const DOOR_CHECKPOINT = {
  x: 4100, // az ajtótól balra, hogy ne a boltív grafikájában éledjen újra a player
  y: surfaceSpan('G6').top - PLAYER_HALF_HEIGHT,
} as const;

// --- Enemyk -----------------------------------------------------------------

/**
 * 3 CrowHarvester + 6 Gravecaller + **3 Beast**. A projektben eddig EGYETLEN Beast volt (a
 * Level 2 utolsó ellenfele); ez a pálya a fajta bemutatója.
 *
 * Az `A` előcsarnok SZÁNDÉKOSAN üres — lásd a lenti indoklást.
 *
 * A `patrolMinX/patrolMaxX` KIZÁRÓLAG a nyugalmi séta-körzet — az üldözés (a Beastnél
 * egyben a roham) határát az `enemyChaseBounds()` SZÁMÍTJA a felület pereméből és a
 * tüskemezőkből.
 *
 * A Gravecallerek MIND galéria-lapon állnak, és ez a pálya legfontosabb enemy-döntése.
 * A lövedék vízszintes, a sávja `[T−31, T−15]` a lap teteje (T) fölött:
 *
 *   - az UGYANAZON a lapon álló player teste `[T−46, T]` -> a sáv teljesen benne van, TALÁL;
 *   - a padlón álló player 110 px-szel lejjebb van -> NEM talál, sőt a caster
 *     `VERTICAL_DETECTION_RANGE`-e (80) miatt (a két középpont 105 px-re van) ÉSZLELNI SEM
 *     tudja.
 *
 * Vagyis: **padló = Beast, galéria = Gravecaller.** Ez levezetés, nem hangolás — a
 * `level3Layout.test.ts` mindkét felét őrzi.
 */
export const ENEMY_SPAWNS: EnemySpawnDef[] = [
  // --- A: előcsarnok. SZÁNDÉKOSAN ÜRES (user-döntés, kézi teszt után). ---
  // Eredetileg két CrowHarvester állt itt (250 és 430), de a `START_X` 120, a
  // `DETECTION_RANGE` pedig 220: az elsőt már a pálya betöltésének pillanatában (130 px-ről)
  // észlelte a player, és azonnal támadott. Egy pálya első másodperce nem kezdődhet egy
  // kikerülhetetlen csapással — a `LADDER_EXIT_CLEARANCE` elvének (a védtelen belépési
  // pontot nem szabad megtámadni) a start-pontra alkalmazott változata.
  //
  // Az üres előcsarnok nem veszteség, hanem a szakasz VALÓDI szerepe: itt lehet
  // következmény nélkül kipróbálni a galériát — a felugrást ÉS azt, hogy alatta ugorva a
  // player bever i a fejét. Ez a pálya egyetlen ilyen helye; a `B` karámtól kezdve minden
  // szakaszban van ellenfél.

  // --- B: első karám. A tézis, a legolcsóbb hibaárral (a respawn a pálya eleje). ---
  { id: 'B-beast-1', x: 940, surfaceId: 'G2', patrolMinX: 860, patrolMaxX: 1020, type: 'beast' },
  // A karám EGYETLEN casterje, a TÁVOLABBI lapon. A balra felugró player így azonnal tűz alá
  // kerül (a `DETECTION_RANGE` 400 átéri a karámot), de a caster maga 336 px-re van: van ideje
  // eldönteni, hogy visszaesik a padlóra, vagy átmegy érte. Ez a pálya tanító pillanata.
  {
    id: 'B-caster-1',
    x: 1132,
    surfaceId: 'B-gallery-R',
    patrolMinX: 1108,
    patrolMaxX: 1156,
    type: 'gravecaller',
  },

  // --- C: galéria-futam. A padlón crow-k és tüskék, fent egyetlen caster. ---
  { id: 'C-crow-1', x: 1450, surfaceId: 'G3', patrolMinX: 1400, patrolMaxX: 1500 },
  { id: 'C-crow-2', x: 1970, surfaceId: 'G3', patrolMinX: 1930, patrolMaxX: 2010 },
  // A KÖZÉPSŐ lapon: mindkét hézag-ugrás az ő tűzsávjában történik.
  {
    id: 'C-caster-1',
    x: 1728,
    surfaceId: 'C-gallery-2',
    patrolMinX: 1704,
    patrolMaxX: 1752,
    type: 'gravecaller',
  },

  // --- D: kettős karám. MINDKÉT menekülő-lapon caster — a felugrás már nem menedék. ---
  { id: 'D-beast-1', x: 2480, surfaceId: 'G4', patrolMinX: 2400, patrolMaxX: 2560, type: 'beast' },
  {
    id: 'D-caster-1',
    x: 2288,
    surfaceId: 'D-gallery-L',
    patrolMinX: 2264,
    patrolMaxX: 2312,
    type: 'gravecaller',
  },
  {
    id: 'D-caster-2',
    x: 2672,
    surfaceId: 'D-gallery-R',
    patrolMinX: 2648,
    patrolMaxX: 2696,
    type: 'gravecaller',
  },

  // --- E: kripta-folyosó. EGYETLEN ellenfél, a tüskemező UTÁN. ---
  // A `enemyChaseBounds()` a mezőnél elvágja a mozgásterét ([3332, 3576]), tehát a mezőn
  // átkelő playert a túlparton fogadja — de nem tud a tüskékbe sétálni.
  { id: 'E-crow-1', x: 3480, surfaceId: 'G5', patrolMinX: 3420, patrolMaxX: 3540 },

  // --- F: a kapu. A legszűkebb karám, mindkét galérián caster. ---
  { id: 'F-beast-1', x: 3950, surfaceId: 'G6', patrolMinX: 3880, patrolMaxX: 4020, type: 'beast' },
  {
    id: 'F-caster-1',
    x: 3820,
    surfaceId: 'F-gallery-L',
    patrolMinX: 3796,
    patrolMaxX: 3844,
    type: 'gravecaller',
  },
  {
    id: 'F-caster-2',
    x: 4004,
    surfaceId: 'F-gallery-R',
    patrolMinX: 3980,
    patrolMaxX: 4028,
    type: 'gravecaller',
  },
];

/** A talaj-szint referenciája a scene-nek (a tüskék és a jelölők ide ülnek). */
export const LEVEL3_GROUND_TOP = GROUND_TOP;

// --- Háttér-panelek ---------------------------------------------------------

/**
 * A `GothicVania Church` `backgrounds.png` öt panelje + a `column.png`, világ-koordinátában,
 * a `BuildingDef` mintájára (`BUILDING_DEPTH` = −15).
 *
 * **Ezek a panelek TELJESEN ÁTLÁTSZATLANOK, és mind a négy szélükön `rgb(39,38,56)` keret
 * van** — pontosan a scene háttérszíne. Ezért ülnek varrat nélkül a lapos háttéren, és ezért
 * NINCS a Level 3-nak parallax rétege: egy csempézett falréteg előtt minden panel látható
 * világos téglalapként ülne.
 *
 * A `BUILDING_SINK_PX` (2) itt észrevehetetlen: a panelek alsó sora maga a háttérszín.
 */
export const BACKDROP_PANELS: BuildingDef[] = [
  // --- A: előcsarnok ---
  { id: 'A-window-1', texture: BUILDING_TEXTURES.CHURCH_WINDOW, x: 180, surfaceId: 'G1' },
  { id: 'A-sconce-1', texture: BUILDING_TEXTURES.CHURCH_SCONCE, x: 470, surfaceId: 'G1' },

  // --- B: első karám ---
  { id: 'B-column-1', texture: BUILDING_TEXTURES.CHURCH_COLUMN, x: 760, surfaceId: 'G2' },
  { id: 'B-altar-1', texture: BUILDING_TEXTURES.CHURCH_ALTAR, x: 1120, surfaceId: 'G2' },

  // --- C: galéria-futam (a tüskemezők KÖZÉ) ---
  { id: 'C-window-1', texture: BUILDING_TEXTURES.CHURCH_WINDOW, x: 1460, surfaceId: 'G3' },
  { id: 'C-column-1', texture: BUILDING_TEXTURES.CHURCH_COLUMN, x: 1730, surfaceId: 'G3' },
  { id: 'C-gargoyle-1', texture: BUILDING_TEXTURES.CHURCH_GARGOYLE, x: 1960, surfaceId: 'G3' },

  // --- D: kettős karám ---
  { id: 'D-altar-1', texture: BUILDING_TEXTURES.CHURCH_ALTAR, x: 2300, surfaceId: 'G4' },
  { id: 'D-column-1', texture: BUILDING_TEXTURES.CHURCH_COLUMN, x: 2650, surfaceId: 'G4' },

  // --- E: kripta-folyosó. A pálya legsűrűbb díszlete: itt nincs galéria, amit takarna. ---
  // A szakaszt a checkpoint-zóna (2926..2974) és a tüskemező (3180..3308) osztja három
  // szabad sávra; a három panel egy-egy sávot kap, átfedés nélkül.
  { id: 'E-window-1', texture: BUILDING_TEXTURES.CHURCH_WINDOW, x: 3070, surfaceId: 'G5' },
  { id: 'E-gargoyle-1', texture: BUILDING_TEXTURES.CHURCH_GARGOYLE, x: 3360, surfaceId: 'G5' },
  { id: 'E-sconce-1', texture: BUILDING_TEXTURES.CHURCH_SCONCE, x: 3520, surfaceId: 'G5' },

  // --- F: a kapu. Az oltár a boltív ELŐTT, hogy a szakasz szentélyként olvasson. ---
  { id: 'F-column-1', texture: BUILDING_TEXTURES.CHURCH_PILLAR, x: 3790, surfaceId: 'G6' },
  { id: 'F-altar-1', texture: BUILDING_TEXTURES.CHURCH_ALTAR, x: 4000, surfaceId: 'G6' },
];

// --- Hangulati propok -------------------------------------------------------

/**
 * A csomag kőkorlátja, karámonként egy. Nincs physics bodyja (a `DECOR_DEPTH` = −10 miatt a
 * player és az enemyk ELŐTTE mennek el), és tint NÉLKÜL megy ki: a Level 3 MAGA ennek a
 * csomagnak a palettája — ugyanaz az érvelés, mint a Level 2 propjainál.
 *
 * A tüskemezők környéke SZÁNDÉKOSAN üres (a Level 1 óta érvényes szabály: a hazard
 * olvashatósága fontosabb a díszletnél).
 */
export const DECOR_PROPS: DecorPropDef[] = [
  { id: 'A-rail-1', texture: PROP_TEXTURES.CHURCH_RAIL, x: 330, surfaceId: 'G1', tint: PROP_TINT_NONE },
  { id: 'B-rail-1', texture: PROP_TEXTURES.CHURCH_RAIL, x: 900, surfaceId: 'G2', tint: PROP_TINT_NONE },
  { id: 'C-rail-1', texture: PROP_TEXTURES.CHURCH_RAIL, x: 1700, surfaceId: 'G3', tint: PROP_TINT_NONE },
  { id: 'D-rail-1', texture: PROP_TEXTURES.CHURCH_RAIL, x: 2480, surfaceId: 'G4', tint: PROP_TINT_NONE },
  { id: 'E-rail-1', texture: PROP_TEXTURES.CHURCH_RAIL, x: 3550, surfaceId: 'G5', tint: PROP_TINT_NONE },
  { id: 'F-rail-1', texture: PROP_TEXTURES.CHURCH_RAIL, x: 3900, surfaceId: 'G6', tint: PROP_TINT_NONE },
];
