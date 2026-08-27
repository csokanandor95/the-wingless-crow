import {
  GROUND_TOP,
  PLAYER_HALF_HEIGHT,
  enemyChaseBounds as enemyChaseBoundsIn,
  groundGaps as groundGapsIn,
  groundSegmentById as groundSegmentByIdIn,
  platformById as platformByIdIn,
  surfaceSpan as surfaceSpanIn,
  type EnemySpawnDef,
  type GapDef,
  type GroundSegmentDef,
  type LadderDef,
  type LevelGeometry,
  type MovingPlatformDef,
  type PlatformDef,
  type Span,
  type SpikeFieldDef,
  type SwingingReaperDef,
} from './LevelGeometry';

/**
 * Level 2 – The Crowless Forest: a pálya TELJES geometriája, egyetlen forrásból.
 *
 * Ugyanaz a minta, mint a `Level1Layout.ts`-nél: Phaser-mentes adatmodul, hogy az invariánsok
 * (elérhetőség, ugrás-plafon, hazard-folyosók) GameObject-mockolás nélkül unit-tesztelhetők
 * legyenek. A KÖZÖS geometria (típusok, ugrás-plafon, pure helperek) a `LevelGeometry.ts`-ben
 * van; itt csak a Level 2 adata és a hozzá kötött wrapperek.
 *
 * Forrás: `docs/level2-layout.md`. **A dokumentum x-értékei több ponton ÚJRA lettek számolva** —
 * a doksi web-chatben készült, és nem ismerte a projekt két mérhető tényét:
 *
 *  1. **Az ugrás magassága FIX** (`Player.jump()` mindig a teljes `JUMP_VELOCITY`-t adja):
 *     nincs „kis ugrás", tehát egy +62 és +218 KÖZÖTTI szilárd lap ugrás-plafon. A doksi a
 *     `C` és `G` szakasz perch-eit pont a tüskemezők FÖLÉ tette, ami a mezőket
 *     átugorhatatlanná tette volna (a player beveri a fejét és visszaesik a tüskékbe).
 *     Itt a perch-ek a mezők ugrás-FOLYOSÓJÁN KÍVÜL vannak (`JUMP_CORRIDOR_MARGIN`), a `G`
 *     szakaszban pedig a mezők ülnek a felső útvonal HÉZAGAI alatt — így a felső sorról
 *     leesve a player pont a tüskékbe érkezik.
 *  2. **A player teljes légi kontrollal bír** (`stopMoving()` levegőben is nulláz), tehát a
 *     landolás pontosan célozható — a magasság az, ami kényszerű.
 *
 * A további eltérések a helyükön, kommentben vannak indokolva.
 *
 * Kilenc szakasz:
 *
 *   A bemelegítés · B mozgó platform · C tüskeritmus · D emelkedő szakadék caster-tűz alatt
 *   E talajszintű harc + lift · F kettős kaszás szakadék · G záró aréna (két útvonal)
 *   H emelkedés létrákon · I boss-előtér
 */

// --- Megosztott geometria (re-export, hogy a scene egy helyről importálhasson) ---

export {
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
  MOVING_PLATFORM_HEIGHT,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_HALF_HEIGHT,
  REAPER_ENEMY_CLEARANCE,
  SPIKE_TILE_WIDTH,
  WORLD_HEIGHT,
  enemyHalfBodyWidth,
  enemySpawnOffset,
  enemyType,
  horizontalReachForRise,
  movingPlatformExtremes,
  movingPlatformPathBounds,
  movingPlatformSpan,
  platformBottom,
  platformLeft,
  platformRight,
  platformTop,
  reaperMinDistanceTo,
  reaperSweep,
} from './LevelGeometry';

export type {
  EnemySpawnDef,
  GapDef,
  GroundSegmentDef,
  LadderDef,
  MovingPlatformDef,
  PlatformDef,
  ReaperSweep,
  Span,
  SpikeFieldDef,
  SwingingReaperDef,
} from './LevelGeometry';

// --- Világ ------------------------------------------------------------------

export const WORLD_WIDTH = 7200;

/**
 * Friss belépés a pályára = a `CheckpointSystem` default-ja. A `G1` szegmens elején, hogy a
 * bemelegítő szakasz teljes egészében a kezdőképernyőn legyen.
 */
export const START_X = 120;
export const START_Y = 300;

// --- Talaj-szegmensek -------------------------------------------------------

/**
 * NÉGY szegmens, HÁROM szakadékkal. Mindegyik szakadék többszöröse a 250 px-es
 * ugrás-plafonnak, tehát platformmunka nélkül nincs átjutás — ez a Level 1 fő hibájának
 * (át lehet szaladni rajta) az elsődleges ellenszere.
 *
 *   gap B: 900–1700  (800 px) — mozgó platformok
 *   gap D: 2900–3700 (800 px) — mozgó platform + emelkedő lépcső
 *   gap F: 4600–5560 (960 px) — kettős kasza
 */
export const GROUND_SEGMENTS: GroundSegmentDef[] = [
  { id: 'G1', startX: 0, endX: 900 }, // A — bemelegítés
  { id: 'G2', startX: 1700, endX: 2900 }, // C — tüskeritmus
  { id: 'G3', startX: 3700, endX: 4600 }, // E — talajszintű harc + lift
  { id: 'G4', startX: 5560, endX: WORLD_WIDTH }, // G záró aréna + H emelkedés + I boss-előtér
];

// --- Tüskemezők -------------------------------------------------------------

/**
 * A mezők ITT vannak, nem a hazard-iterációban, mert a PLATFORMOK helye ezekhez van
 * megoldva: egyetlen szilárd lap alja sem lóghat egy mező ugrás-folyosójába. A `Level2Scene`
 * a hazard-iterációig egyszerűen nem példányosít belőlük `SpikeField`-et.
 */
export const SPIKE_FIELDS: SpikeFieldDef[] = [
  // --- C: tüskeritmus. Négy mező, köztük 150 px-es biztonságos szigetekkel. ---
  // Egyik sem szélesebb 128-nál: a player TESTÉVEL együtt 156 px-t kell átérni, ami a
  // MAX_SAFE_GAP (175) alatt van, tehát tiszta átkelésnél 0 sebzés.
  { id: 'C-spikes-1', startX: 1850, endX: 1946, surfaceId: 'G2' }, // 96
  { id: 'C-spikes-2', startX: 2096, endX: 2224, surfaceId: 'G2' }, // 128
  { id: 'C-spikes-3', startX: 2374, endX: 2470, surfaceId: 'G2' }, // 96
  { id: 'C-spikes-4', startX: 2620, endX: 2748, surfaceId: 'G2' }, // 128

  // --- E: a lengő kasza alatti mező (a kasza a hazard-iterációban jön) ---
  { id: 'E-spikes-1', startX: 4000, endX: 4128, surfaceId: 'G3' }, // 128

  // --- G: a felső útvonal HÉZAGAI alá esnek, nem a lapjai alá. ---
  // Ez a doksi C/G-hibájának a javítása, és egyben jobb design: a felső sorról leesve a
  // player pont a tüskékbe érkezik, tehát a "biztonságos" útvonalnak is van tétje.
  // Szűkebbek (64), mert a felső sor 128 px-es hézagaiba a folyosójukkal EGYÜTT kell férniük.
  { id: 'G-spikes-1', startX: 6000, endX: 6064, surfaceId: 'G4' }, // 64
  { id: 'G-spikes-2', startX: 6256, endX: 6320, surfaceId: 'G4' }, // 64
];

// --- Platformok -------------------------------------------------------------
//
// Magasság-jelölés a kommentekben: `+N` = a felület teteje N pixellel a talaj (418) fölött.
// A `y` a sprite KÖZÉPPONTJA, tehát `y = 418 - N + 8` (a lap 16 px magas).

export const PLATFORMS: PlatformDef[] = [
  // --- A: bemelegítés (0–900). Opcionális perch-ek, nem kötelező útvonal. ---
  // A1 SZÁNDÉKOSAN +70, nem a doksi +45-je: `MIN_WALK_UNDER_RISE` (62) alatt a lap ELZÁRNÁ
  // a talajsávot, tehát nem opcionális perch lenne, hanem lépcső, amit meg kell mászni.
  { id: 'A1', x: 495, y: 356, tiles: 2 }, // +70
  { id: 'A2', x: 710, y: 306, tiles: 2 }, // +120

  // --- B: mozgó platform bevezetése (gap 900–1700). ---
  // A két mozgó lap KÖZÖTTI szilárd pihenő: a player itt gyakorolhatja a "leszállást" úgy,
  // hogy közben nem kell a következő platform fázisát is figyelnie.
  { id: 'B-pillar', x: 1354, y: 376, tiles: 2 }, // +50

  // --- C: tüskeritmus (1700–2900). ---
  // KÉT perch, nem három (a doksi 3-at kért): a mezők ugrás-folyosóin kívül csak 90 px-es
  // ablakok maradnak, és három perch onnan LÁNCOLHATÓ lenne (a szomszédos ablakok 214 px-re
  // vannak, az ugrás-hatótáv 250) — vagyis pont az az ingyen "skyway" jönne létre, amit a
  // layout-spec 6.5 pontja tilt. Két, egymástól 460 px-re álló lépőkő ezt kizárja.
  // Szerepük fireball-pozíció, nem útvonal.
  { id: 'C1', x: 2021, y: 346, tiles: 1 }, // +80
  { id: 'C2', x: 2545, y: 346, tiles: 1 }, // +80

  // --- D: emelkedő szakadék caster-tűz alatt (gap 2900–3700). ---
  // A lépcső magasságai NEM esztétikaiak: a `D-C1`-en álló Gravecaller lövedék-sávja
  // [216, 232], a `D2`/`D3` tetején álló player teste [217, 263] — 15 px átfedés, tehát a
  // lény TÉNYLEGESEN eltalálja. Ez a szakasz lényege: a lépcsőt tűz alatt kell megmászni.
  { id: 'D1', x: 3320, y: 326, tiles: 2 }, // +100
  { id: 'D2', x: 3500, y: 271, tiles: 2 }, // +155 — lőtt zóna
  { id: 'D3', x: 3660, y: 271, tiles: 1 }, // +155 — lőtt zóna
  { id: 'D-C1', x: 3820, y: 256, tiles: 2 }, // +170 — a caster párkánya

  // --- E: a lift célja (3700–4600 fölött). ---
  // +160 > MAX_SAFE_RISE (117), tehát a talajról NEM ugorható fel: a lift az EGYETLEN út
  // az F szakaszba. A jobb széle (4696) átlóg a gap F fölé — ez a kilövőállás.
  { id: 'E-ledge', x: 4600, y: 266, tiles: 3 }, // +160

  // --- F: kettős kaszás szakadék (gap 4600–5560). ---
  // Mindhárom lap AZONOS magasságban, PONTOSAN 120 px-es hézagokkal: a távolság konstans és
  // megtanulható, a változó egyedül a két kasza fázisa. Az `E-ledge` -> `F1` ugrás is 120.
  { id: 'F1', x: 4880, y: 276, tiles: 2 }, // +150
  { id: 'F2', x: 5128, y: 276, tiles: 2 }, // +150
  { id: 'F3', x: 5376, y: 276, tiles: 2 }, // +150

  // --- G: záró aréna, FELSŐ útvonal (5560–6480). ---
  // A három lap 128 px-es hézagokkal láncolható (a talajról a `G-P1`-re fel lehet jutni,
  // rise 110 <= 117). A hézagok ALÁ esnek a `G-spikes-*` mezők: a felső útvonal így
  // megkerüli a földi harcot ÉS a tüskéket, de egy elvétett ugrás a tüskékbe visz.
  { id: 'G-P1', x: 5904, y: 316, tiles: 2 }, // +110
  { id: 'G-P2', x: 6160, y: 316, tiles: 2 }, // +110
  { id: 'G-P3', x: 6416, y: 316, tiles: 2 }, // +110

  // --- H: emelkedés (6724–7172). ---
  // +190 SZÁNDÉKOSAN a 156 px-es ugrás-magasság FÖLÖTT: a talajról nem lehet felugrani rá,
  // tehát a létra valódi kapu, nem kényelmi útvonal. (A doksi +150-et írt, ami 156 alatt van
  // — azzal a létrát át lehetne ugrani, és a szakasz "kapuőr" jellege elveszne.)
  // A `G-P3`-tól 244 px-re van, ami a +80-as emelkedéshez tartozó 212 px-es hatótáv fölött
  // van: a felső útvonal SEM rövidíti le a létrát.
  // `oneWay`, mert a létra alulról megy át rajta (a Level 1 `H1` mintája).
  { id: 'H-ledge', x: 6948, y: 236, tiles: 7, oneWay: true }, // +190

  // --- I: boss-előtér (6976–7200). ---
  // A pálya legmagasabb felülete (+300 = y 118), a layout-spec 21/7 plafonja. A jobb széle
  // PONTOSAN a pálya széle, mint a Level 1 `H1`-énél: a szakasz valódi végállomásként olvas.
  // Vízszintesen ÁTFED a `H-ledge`-dzsel (6976–7172) — ez KÖTELEZŐ, mert a második létra
  // lába a `H-ledge`-en áll, a teteje pedig ez alatt ér véget. A függőleges távolság
  // (228 - 134 = 94 px) bőven elég, hogy a player alatta elférjen.
  { id: 'boss-ledge', x: 7088, y: 126, tiles: 3.5, oneWay: true }, // +300
];

// --- Mozgó platformok -------------------------------------------------------

/**
 * ÚJ MECHANIKA — eltérés a `docs/Project_plan.md` 13. pontjától (lásd
 * `platforms/MovingPlatform.ts` fejlécét). Négy példány, mind egyenes szakaszon, 0.4 s
 * megállással a végpontokon.
 *
 * **Minden ugrás a SZÉLSŐÁLLÁSBÓL van méretezve** (a `movingPlatformExtremes()` ezt teszi
 * futtatható állítássá): ha a player rossz pillanatban ugrik, legfeljebb egy ciklust vár,
 * de sosem kell „menet közben" célozni.
 */
export const MOVING_PLATFORMS: MovingPlatformDef[] = [
  // --- B: a mechanika bemutatása büntetés-minimalizált kontextusban. ---
  // Enemy és hazard nincs, a respawn a pálya eleje — a hiba ára olcsó. Ugyanaz az elv, mint
  // a Level 1 `A` szakaszának ugrás-gödrénél: a lecke csak akkor tanít, ha a hibának van
  // következménye, de a következmény olcsó.
  //
  // A G1 peremétől (900) a bal szélsőállásig (940) 40 px, +50 emelkedés: a felugrás
  // triviális. A nehézség a LESZÁLLÁSBAN van.
  { id: 'B-mover-1', fromX: 988, fromY: 376, toX: 1128, toY: 376, speed: 70, dwellMs: 400, tiles: 1.5 },
  // Rövidebb út (80 px), tehát gyorsabb ciklus: a második lap már nem tanít, csak ellenőriz.
  { id: 'B-mover-2', fromX: 1488, fromY: 376, toX: 1568, toY: 376, speed: 70, dwellMs: 400, tiles: 1.5 },

  // --- D: a szakadék első harmada. ---
  // SZÁNDÉKOSAN ALACSONYAN (+40) jár: a `D-C1`-en álló caster bolt-sávja [216, 232], a
  // lapon álló player teste [332, 378] — a kettő NEM metszi egymást. Mozgó platformon a
  // player nem tud kitérni, ott egy lövedék kikerülhetetlen sebzés lenne (a layout-spec
  // 19/4 invariánsa). A caster a lapon állót ÉSZLELNI sem tudja (126 px > 80).
  { id: 'D-mover-1', fromX: 3008, fromY: 386, toX: 3128, toY: 386, speed: 60, dwellMs: 400, tiles: 1.5 },

  // --- E: FÜGGŐLEGES lift, az egyetlen út az F szakaszba. ---
  // Alatta VAN talaj, tehát a leesés nem halál: a függőleges mozgás is biztonságos
  // kontextusban debütál. Az amplitúdó (80 px) tudatosan kicsi — nincs függőleges
  // kameragörgetés.
  //
  // Az alsó állás +70. KÉT, egymástól független kényszer hozza ki, és a doksi +20-a
  // MINDKETTŐT sértette:
  //   - a talajon álló `E-caster-1` bolt-sávja [386, 402]; +20-nál a lapon álló player teste
  //     [352, 398] lett volna, tehát a caster a lift alsó szakaszán eltalálta volna — mozgó
  //     platformon pedig a player nem tud kitérni (a layout-spec 19/4 invariánsa). +70-nél a
  //     test [302, 348], hatalmas tartalékkal;
  //   - a lift a TALAJ fölött jár, tehát leérve ÖSSZENYOMNÁ a lap alatt álló playert:
  //     `MIN_WALK_UNDER_RISE` (62) alatt a lap alja a player feje alá kerül. +70-nél a lap
  //     alja 364, a player feje 372 — 8 px tartalék, tehát a lift alatt át lehet sétálni.
  { id: 'E-lift', fromX: 4450, fromY: 356, toX: 4450, toY: 276, speed: 45, dwellMs: 400, tiles: 1.5 },
];

// --- Swinging Reaperek ------------------------------------------------------

/**
 * HÁROM lengő kasza. A geometria LEVEZETETT, nem szemre rakott, és a két csoport
 * SZÁNDÉKOSAN eltérő elven működik — mert más magasságban kell fenyegetniük.
 *
 * A közös alap: a talajon/platformon ÁLLÓ player középpontja `felszín − 24`, egy UGRÓ player
 * pedig ebből 156 px-t emelkedik (a FIX ugrás-magasság). Ebből dől el, hova kell a pengét
 * lógatni.
 *
 * **Ami NEM működött volna:** a `docs/level2-layout.md` mindhárom kaszára a Level 1-es
 * elrendezést írta elő („szélsőállásban ≥150 px a szomszéd platform álló-pozíciójától"). Ez
 * az `F` szakasz 120 px-es hézagjainál teljesíthetetlen: a hézag közepére horgonyzott penge
 * geometriailag nem tud 60 px-nél távolabb kerülni a peremtől. A helyes követelmény nem a
 * szélsőállás távolsága, hanem hogy a penge SEMMILYEN fázisban ne érje el az álló playert —
 * ezt méri a `reaperMinDistanceTo()`, és ezt őrzi a `level2Layout.test.ts`.
 */
export const REAPERS: SwingingReaperDef[] = [
  // --- E: TALAJ-szintű penge az `E-spikes-1` mező fölött. ---
  // A legalsó pontja (150 + 244 = 394) PONTOSAN a talajon álló player középpontja, tehát a
  // mezőn átgyalogló playert eltalálja. A söprése (3961–4167) lefedi a mezőt (4000–4128).
  //
  // A rossz időzítés ára így tüske VAGY kasza — de sosem MINDKETTŐ: a `HazardDamageGate`
  // 900 ms-os ablaka minden környezeti hazardra KÖZÖS. Ettől lesz a kombináció tisztességes,
  // és pontosan ezért lehet itt a kasza "emlékeztető": a hiba ára 20 HP, nem halál.
  //
  // A ±25° azért ilyen szűk, hogy a `G3` mindkét végén maradjon bőven biztonságos
  // megfigyelő-sáv (~3700–3919 és ~4209–4600) — a mintát végig kell tudni nézni ugrás előtt.
  //
  // A söprés (206 px) SZÁNDÉKOSAN szélesebb a mezőnél (128): a penge így pont ott fenyeget,
  // ahol a player a tüske-ugrást időzítené. A szakaszt tehát HÁTRÉBBRŐL kell elkezdeni,
  // nem a mező pereméről — ez a kasza tényleges hozzáadott értéke a tüskék mellé.
  //
  // A periódus ebből SZÁMÍTÓDIK, nem hangolt: a biztonságos sávtól a biztonságos sávig
  // 291 px az út, ami `MOVE_SPEED` (200) mellett ~1455 ms. A félperiódusnak ennél
  // HOSSZABBNAK kell lennie, különben az átkelés közben a penge garantáltan visszaér, és a
  // találat kikerülhetetlen lenne (a layout-spec „avoid unavoidable damage" pontja).
  // 3400 / 2 = 1700 ms, tehát ~245 ms tartalék marad.
  {
    id: 'E-reaper',
    anchorX: 4064,
    anchorY: 150,
    ropeLength: 244,
    maxAngleDeg: 25,
    periodMs: 3400,
  },

  // --- F: KÉT penge ELLENFÁZISBAN, MAGASAN. ---
  // Itt a penge nem a platform szintjén söpör (ott a rajta álló playert érné), hanem a
  // REPÜLÉSI ív magasságában: a legalsó pontja 190, az álló player középpontja 244. Egy
  // platformon álló playertől a penge legkisebb távolsága ~62 px (a 24-es találati sugár
  // két és félszerese), tehát MINDHÁROM lap biztonságos várakozóhely — de aki elugrik, az
  // már ~64 px emelkedés után a penge útjába kerül a perem fölött.
  //
  // A rope (180) és a szög (35°) együtt adja ki, hogy a két söprés (4901–5107 és 5149–5355)
  // NE érjen össze: a horgonyok 248 px-re vannak, tehát a fél-söprés 124 alatt kell maradjon.
  //
  // A `phaseMs` PONTOSAN a félperiódus: a két penge így garantáltan ellenfázisban jár, tehát
  // a két hézagot nem lehet egy lendülettel, ugyanabban a ritmusban átugrani — az `F2`-n meg
  // kell állni és újra időzíteni. Ez a szakasz lényege és a Level 1 egyetlen kaszájához
  // képest a valódi újdonság.
  {
    id: 'F-reaper-1',
    anchorX: 5004, // az F1 -> F2 hézag közepe
    anchorY: 10,
    ropeLength: 180,
    maxAngleDeg: 35,
    periodMs: 2400,
  },
  {
    id: 'F-reaper-2',
    anchorX: 5252, // az F2 -> F3 hézag közepe
    anchorY: 10,
    ropeLength: 180,
    maxAngleDeg: 35,
    periodMs: 2400,
    phaseMs: 1200, // = periodMs / 2 -> ellenfázis
  },
];

// --- A pálya geometriai magja (a megosztott helperekhez) --------------------

export const LEVEL2_GEOMETRY: LevelGeometry = {
  groundSegments: GROUND_SEGMENTS,
  platforms: PLATFORMS,
  spikeFields: SPIKE_FIELDS,
};

/** Vékony wrapperek a `LevelGeometry.ts` pure helperei köré, a Level 2 adatához kötve. */
export const surfaceSpan = (id: string): Span => surfaceSpanIn(LEVEL2_GEOMETRY, id);
export const groundGaps = (): GapDef[] => groundGapsIn(GROUND_SEGMENTS);
export const platformById = (id: string): PlatformDef => platformByIdIn(LEVEL2_GEOMETRY, id);
export const groundSegmentById = (id: string): GroundSegmentDef =>
  groundSegmentByIdIn(LEVEL2_GEOMETRY, id);
export const enemyChaseBounds = (def: EnemySpawnDef): { min: number; max: number } =>
  enemyChaseBoundsIn(def, LEVEL2_GEOMETRY);

// --- Létrák -----------------------------------------------------------------

/**
 * A Level 2 az ELSŐ pálya KÉT létrával, ezért tömb (a Level 1-nek egyetlen `LADDER`
 * konstansa van). A scene minden frame-ben azt a létrát adja át a playernek, amelyikkel épp
 * fedésben van.
 *
 * A `fromSurfaceId`/`toSurfaceId` nem dekoráció: a mászási zóna függőleges kiterjedése és a
 * `LadderContact` `topY`/`bottomY`-ja EBBŐL származik, tehát egy platform elmozdítása
 * automatikusan átméretezi a létrát. Az invariáns, amit a teszt őriz: a két felületnek
 * ÁT KELL FEDNIE a létra x-énél — enélkül a létra a semmiből indulna vagy a semmibe érne.
 */
export const LADDERS: LadderDef[] = [
  // A talajról a párkányra. KÖTELEZŐ útvonal: a +190-es párkány a 156 px-es ugrás-magasság
  // fölött van, tehát nincs alternatíva.
  { id: 'H-ladder-1', x: 6790, fromSurfaceId: 'G4', toSurfaceId: 'H-ledge', width: 28 },
  // A párkányról a boss-előtérbe. KÉNYELMI útvonal: a 110 px-es emelkedés elvileg ugorható
  // is (a `boss-ledge` `oneWay`), de a létra a biztonságos út. Ez a geometria kényszere:
  // a +300-as plafon és a talaj közé nem fér két, egyenként 156 px-nél nagyobb lépés.
  { id: 'H-ladder-2', x: 7060, fromSurfaceId: 'H-ledge', toSurfaceId: 'boss-ledge', width: 28 },
];

// --- Boss-ajtó --------------------------------------------------------------

/**
 * Placeholder geometria: a Level 1 ajtaja a cathedral `door-gate` csempéjéhez van mérve
 * (`DOOR_APERTURE`, `DOOR_THRESHOLD_PX`), ami egy erdő-pályán se nem illik, se nem érvényes.
 * Amíg nincs Level 2 tileset, egy egyszerű téglalap-nyílás áll itt: a trigger-zóna MAGA az
 * ajtó, tehát nincs mit elcsúsztatni.
 */
export const DOOR = {
  x: 7120,
  width: 48,
  height: 72,
} as const;

// --- Checkpointok -----------------------------------------------------------

export interface CheckpointDef {
  id: string;
  x: number;
  /** Ground szegmens VAGY platform id — a respawn Y ennek a felszínéből származik. */
  surfaceId: string;
}

/**
 * HÁROM köztes checkpoint, mind ÉRINTÉSRE aktiválódik (az ajtó `E`-jével szemben, hogy ne
 * versenyezzenek annak promptjával) — a Level 1 köztes checkpointjának mintája.
 *
 * A levezetés szabálya: *checkpoint kerül minden olyan szakasz ELÉ, ami zuhanással tud ölni.*
 * A `B` a kivétel: ott a pálya eleje van 900 px-re, tehát a visszaút amúgy is olcsó.
 *
 * Három sok lehet egy 7200 px-es pályán — a doksi 22/1 pontja szerint az első kézi
 * végigjátszásig maradnak, utána mérés alapján döntünk a `CP-3`-ról.
 */
export const CHECKPOINTS: CheckpointDef[] = [
  { id: 'CP-1', x: 2860, surfaceId: 'G2' }, // a C szakasz vége, a D szakadék ELŐTT
  // A lift TETEJÉN, hogy az F-ben elhalálozó player ne kényszerüljön újra liftezni.
  // 4580, nem 4600: az `E-ledge` átlóg a gap F fölé, és a checkpointnak a szakadék PEREME
  // ELŐTT kell lennie — pont ott, ahol a liftről lelépve a player földet ér.
  { id: 'CP-2', x: 4580, surfaceId: 'E-ledge' },
  { id: 'CP-3', x: 5620, surfaceId: 'G4' }, // közvetlenül az F kasza-szakadék UTÁN
];

/** A respawn-pont: a felszínen álló player középpontja. */
export const checkpointRespawnY = (def: CheckpointDef): number =>
  surfaceSpan(def.surfaceId).top - PLAYER_HALF_HEIGHT;

/**
 * A köztes checkpoint jelölőjének/zónájának mérete — a Level 1-gyel azonos, hogy a két pálya
 * ugyanúgy olvasson.
 */
export const CHECKPOINT_ZONE = { width: 48, height: 72 } as const;

/** A pálya végi (ajtó-)checkpoint: `E`-re aktiválódik, és egyben a boss-átmenet. */
export const DOOR_CHECKPOINT = {
  x: 7060, // az ajtótól balra, hogy ne a grafikájában éledjen újra a player
  y: surfaceSpan('boss-ledge').top - PLAYER_HALF_HEIGHT,
} as const;

// --- Enemyk -----------------------------------------------------------------

/**
 * 10 CrowHarvester + 4 Gravecaller.
 *
 * A `patrolMinX/patrolMaxX` KIZÁRÓLAG a nyugalmi séta-körzet — az ÜLDÖZÉS (illetve a
 * Gravecallernél az ÁTHELYEZKEDÉS) határa ennél tágabb, és nem itt van felsorolva, hanem az
 * `enemyChaseBounds()` SZÁMÍTJA a felület pereméből és a tüskemezőkből. Így egy platform
 * elmozdítása vagy egy új mező automatikusan átméretezi a pórázt.
 *
 * Négy, egymástól független kényszer fogja közre a pozíciókat — mind a négyet unit teszt őrzi:
 *
 *   1. a TEST se a peremen, se tüskemezőn ne lógjon túl;
 *   2. egyetlen patrol se érjen a kaszák söprési sávjának `REAPER_ENEMY_CLEARANCE`-ébe;
 *   3. a tüske-szigeteken a patrol-határ maradjon `ATTACK_RANGE`-en KÍVÜL a sziget peremétől
 *      (különben a szigetre landoló player kikerülhetetlen csapást kapna);
 *   4. a létra KIJÁRATÁNÁL (a felső felületen) ne álljon enemy `LADDER_EXIT_CLEARANCE`-en belül.
 *
 * A `F` szakaszon SZÁNDÉKOSAN nincs enemy: két független kasza-időzítés már önmagában a
 * szakasz leckéje, és egy lövedék vagy közelharci lökés ott olyan halált okozna egy 960 px-es
 * szakadék fölött, amire nem lehet reagálni.
 */
export const ENEMY_SPAWNS: EnemySpawnDef[] = [
  // --- A: bemelegítés. Egyetlen, magányos közelharci ellenfél, tágas sík terepen. ---
  { id: 'A-crow-1', x: 690, surfaceId: 'G1', patrolMinX: 520, patrolMaxX: 860 },

  // --- C: tüskeritmus. A szigetek harctérré válnak. ---
  // A KÖZÉPSŐ szigeten (2224–2374) áll: a mezőt átugró player harcba landol. A patrol
  // mindkét pereme `ATTACK_RANGE`-en (42) kívül van a sziget szélétől (46 és 44 px), tehát a
  // landolás pillanatában még van ideje megfordulni.
  { id: 'C-crow-1', x: 2300, surfaceId: 'G2', patrolMinX: 2280, patrolMaxX: 2320 },
  // A `CP-1` (2860) őre: a checkpointot ki kell érdemelni.
  { id: 'C-crow-2', x: 2835, surfaceId: 'G2', patrolMinX: 2810, patrolMaxX: 2865 },

  // --- D: a lépcsőt lövő caster. ---
  // A patrol SZŰK (30 px), és nem esztétikai döntés: a `D2` (3436–3564) TELJES hosszának a
  // `DETECTION_RANGE`-en (400) belül kell lennie, hogy a lépcsőre lépő playert azonnal
  // észlelje. A legrosszabb eset (patrolMax -> D2 távolabbi pereme) így 374 px.
  //
  // ISMERT, ELFOGADOTT KORLÁT (ugyanaz, mint a Level 1-en): a `D1`-en (+100) álló player a
  // vertikális detektálási sávban van (66 <= 80), tehát a caster TÜZEL rá, de a bolt sávja
  // [216, 232] a teste [272, 318] fölött megy el. Itt ez inkább előny: a lövedékek a fej
  // fölött elhúzva telegrafálják a fenyegetést, MIELŐTT a player felmászna a lőtt zónába.
  {
    id: 'D-caster-1',
    x: 3795,
    surfaceId: 'D-C1',
    patrolMinX: 3780,
    patrolMaxX: 3810,
    type: 'gravecaller',
  },

  // --- E: talajszintű kombinált harc. ---
  // A kasza ELŐTT, a söprési sáv biztonsági zónáján kívül (a teste 3860-ig ér, a zóna 3880.9-től).
  { id: 'E-crow-1', x: 3800, surfaceId: 'G3', patrolMinX: 3760, patrolMaxX: 3850 },

  // A pálya ELSŐ TALAJON álló casterje — tudatos megfordítása a Level 1-es döntésnek, ahol a
  // caster mindig platformon állt, és a futósáv szándékosan kimaradt a hatóköréből. Itt maga
  // a futósáv lőtt terület: a bolt sávja [386, 402], a talajon álló player teste [372, 418].
  //
  // A kasza+tüske szakaszra is rálát (DETECTION_RANGE 400), és ez SZÁNDÉKOS: aki megáll a
  // penge ritmusát számolgatni, azt megbünteti. A bolt viszont VÍZSZINTES, tehát pont az az
  // ugrás kerüli ki, amit a tüskék miatt amúgy is meg kell tenni.
  {
    id: 'E-caster-1',
    x: 4340,
    surfaceId: 'G3',
    patrolMinX: 4300,
    patrolMaxX: 4380,
    type: 'gravecaller',
  },
  // A caster kísérője: távolsági és közelharci nyomás egyszerre. A lift alatt patrolozik, de
  // arra NEM tud felmenni — a liften álló player 70 px-re van fölötte, a CrowHarvester
  // `VERTICAL_DETECTION_RANGE`-e viszont 50, tehát a lift valódi menekülőút.
  { id: 'E-crow-2', x: 4485, surfaceId: 'G3', patrolMinX: 4440, patrolMaxX: 4530 },

  // --- G: záró aréna, HÁROM cella a két tüskemező között. ---
  { id: 'G-crow-1', x: 5775, surfaceId: 'G4', patrolMinX: 5700, patrolMaxX: 5850 },
  // A 2. cella (6064–6256) a pálya legszűkebb harctere: KÉT lény osztozik rajta.
  { id: 'G-crow-2', x: 6140, surfaceId: 'G4', patrolMinX: 6120, patrolMaxX: 6160 },
  { id: 'G-crow-3', x: 6190, surfaceId: 'G4', patrolMinX: 6180, patrolMaxX: 6200 },
  // A 3. cella talajon álló casterje: a második tüskemezőn átkelő playert fogadja.
  {
    id: 'G-caster-1',
    x: 6440,
    surfaceId: 'G4',
    patrolMinX: 6400,
    patrolMaxX: 6480,
    type: 'gravecaller',
  },
  // A FELSŐ útvonal ára. A `G-P3`-on áll, tehát a felső sorral AZONOS magasságban: a bolt
  // sávja [276, 292], az ott álló player teste [262, 308]. A `G-P1` (az első hop) még kívül
  // esik a hatókörén — a nyomás a második hoptól kezdődik, és a `G-P3`-ra felugorva karddal
  // lerendezhető.
  {
    id: 'G-caster-2',
    x: 6415,
    surfaceId: 'G-P3',
    patrolMinX: 6390,
    patrolMaxX: 6440,
    type: 'gravecaller',
  },

  // --- H: a létrát őrző pár. ---
  // A létrán NEM lehet támadni (dokumentált, tudatos korlát), ezért a `H-crow-1`-et a létra
  // ELŐTT le kell rendezni — ettől "kapuőr" a szakasz.
  { id: 'H-crow-1', x: 6630, surfaceId: 'G4', patrolMinX: 6560, patrolMaxX: 6700 },
  // A párkányon, de a létra KIJÁRATÁTÓL (6790) 100 px-re: a felmászó playert ne érje
  // kikerülhetetlen csapás abban a pillanatban, amikor még a létrán áll.
  { id: 'H-crow-2', x: 6940, surfaceId: 'H-ledge', patrolMinX: 6890, patrolMaxX: 6990 },
];

/**
 * A létra KIJÁRATA körüli tiltott sáv. Csak a FELSŐ felületre vonatkozik: a létra TÖVÉNÉL a
 * player normálisan tud harcolni (a `H-crow-1` kifejezetten oda van szánva kapuőrnek), a
 * tetején viszont védtelenül lép ki.
 */
export const LADDER_EXIT_CLEARANCE = 80;

/** A talaj-szint referenciája a scene-nek (a tüskék és a jelölők ide ülnek). */
export const LEVEL2_GROUND_TOP = GROUND_TOP;
