import {
  GROUND_TOP,
  PLAYER_HALF_HEIGHT,
  PROP_TEXTURES,
  enemyChaseBounds as enemyChaseBoundsIn,
  groundGaps as groundGapsIn,
  groundSegmentById as groundSegmentByIdIn,
  platformById as platformByIdIn,
  platformTop,
  surfaceSpan as surfaceSpanIn,
  type DecorPropDef,
  type EnemySpawnDef,
  type GapDef,
  type GroundSegmentDef,
  type LevelGeometry,
  type PlatformDef,
  type Span,
  type SpikeFieldDef,
  type SwingingReaperDef,
  type TutorialHintDef,
} from './LevelGeometry';
import {
  DOOR_APERTURE,
  DOOR_TILE_HEIGHT,
  DOOR_TILE_WIDTH,
} from './LevelTileset';

/**
 * Level 1 – Cathedral Ruins: a pálya TELJES geometriája, egyetlen forrásból.
 *
 * Szándékosan Phaser-mentes, tiszta adatmodul: így a layout invariánsai (elérhetőség,
 * enemyk nem sétálnak szakadékba, spike-mezők a talajon vannak) GameObject-mockolás nélkül
 * unit-tesztelhetők — ugyanaz az elv, mint a `systems/ParallaxBackground.ts` pure
 * `tilePositionForScroll()`-jánál.
 *
 * A `Level1Scene` innen importál mindent; magic number nem kerülhet vissza a scene-be.
 *
 * **Ami MINDEN pályára igaz** (típusok, világ-konstansok, az ugrás-plafon, a pure helperek),
 * az a `LevelGeometry.ts`-ben él — ez a modul csak a Level 1 ADATÁT tartja, plusz vékony,
 * a saját geometriájához kötött wrappereket a megosztott helperekhez. A re-exportok miatt a
 * `Level1Scene` és a `level1Layout.test.ts` importlistája változatlan maradhatott.
 *
 * A pálya nyolc szakaszra tagolódik (a `docs/Project_plan.md` 14. pontja és a hozzá tartozó
 * layout-spec szerint):
 *
 *   A start/mozgás-tutorial · B első enemy · C platforming + gap · D spike-tutorial
 *   E kombinált kihívás · F Swinging Reaper · G záró harc · H boss-ajtó
 */

// --- Megosztott geometria (re-export, hogy a hívók importlistája ne törjön) ---

export {
  EDGE_INSET,
  FALL_DEATH_Y,
  FALL_DEPTH,
  GAP_SAFETY_FACTOR,
  GRAVECALLER_BODY_WIDTH,
  GRAVECALLER_HALF_BODY_WIDTH,
  GRAVECALLER_SPAWN_OFFSET,
  GROUND_CENTER_Y,
  GROUND_TOP,
  HARVESTER_BODY_WIDTH,
  HARVESTER_HALF_BODY_WIDTH,
  HARVESTER_SPAWN_OFFSET,
  MAX_JUMP_AIRTIME_MS,
  MAX_JUMP_DISTANCE,
  MAX_JUMP_HEIGHT,
  MAX_SAFE_GAP,
  MAX_SAFE_RISE,
  MIN_JUMP_CLEARANCE_RISE,
  MIN_WALK_UNDER_RISE,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_HALF_HEIGHT,
  PROP_ASSETS,
  PROP_TEXTURES,
  PROP_TINT_COOL_SOURCE,
  PROP_TINT_WARM_SOURCE,
  REAPER_ENEMY_CLEARANCE,
  RISE_SAFETY_FACTOR,
  SPIKE_HEIGHT,
  SPIKE_HITBOX_INSET_X,
  SPIKE_TILE_WIDTH,
  WORLD_HEIGHT,
  decorPropFootprint,
  enemyHalfBodyWidth,
  enemySpawnOffset,
  enemyType,
  horizontalReachForRise,
  platformBottom,
  platformLeft,
  platformRight,
  platformTop,
  reaperSweep,
} from './LevelGeometry';

export type {
  DecorPropDef,
  EnemySpawnDef,
  EnemyType,
  GapDef,
  GroundSegmentDef,
  PlatformDef,
  PropTexture,
  ReaperSweep,
  Span,
  SpikeFieldDef,
  SwingingReaperDef,
  TutorialHintDef,
} from './LevelGeometry';

// --- Világ ------------------------------------------------------------------

export const WORLD_WIDTH = 6000;

/** Friss játék kezdőpontja = a CheckpointSystem default-ja. */
export const START_X = 100;
export const START_Y = 300;

// --- Talaj-szegmensek -------------------------------------------------------

/**
 * A talaj NEM folyamatos többé: a szegmensek közötti hézagok a szakadékok. A `groundGaps()`
 * ezekből SZÁMÍTJA a gapeket, tehát a szakadékok nincsenek külön felsorolva — egy szegmens
 * elmozdítása automatikusan átméretezi a szomszédos szakadékot.
 */
export const GROUND_SEGMENTS: GroundSegmentDef[] = [
  // A start pad SZÁNDÉKOSAN rövid: a mögötte nyíló gödör és mind a három tutorial-platform
  // belefér a kezdőképernyőbe (a kamera x=0..800-at mutat), tehát a player egy pillantásra
  // érti a feladatot — nem egy váratlan lyukba sétál bele.
  { id: 'G1', startX: 0, endX: 320 }, // A — start pad (mozgás-tutorial)
  { id: 'G2', startX: 960, endX: 1660 }, // A vége + B (első enemy) — gapA mögött
  { id: 'G3', startX: 1820, endX: 2260 }, // C
  { id: 'G4', startX: 2420, endX: 3120 }, // D (spike-tutorial) + köztes checkpoint
  { id: 'G5', startX: 3250, endX: 4300 }, // E (kombinált kihívás)
  { id: 'G6', startX: 4700, endX: WORLD_WIDTH }, // F vége + G (záró harc) + H (boss-ajtó)
];

// --- Platformok -------------------------------------------------------------

export const PLATFORMS: PlatformDef[] = [
  // --- A: mozgás- és UGRÁS-tutorial ---
  // A három platform a `gapA` (320–960) fölött lóg, tehát nem lehet alattuk elfutni: a
  // player kénytelen végigugrálni rajtuk. Minden ugrás bőven a hatótávon belül van (lásd
  // a level1Layout.test.ts elérhetőség-BFS-ét) — itt a KÉNYSZERÍTÉS a cél, nem a nehézség.
  { id: 'A1', x: 460, y: 350, tiles: 3 }, // széles, megbocsátó első célpont (+76)
  { id: 'A2', x: 700, y: 292, tiles: 2 }, // magasabb lépés (+58)
  { id: 'A3', x: 910, y: 340, tiles: 2 }, // 14px-t ÁTLÓG a G2 fölé -> biztonságos kilépés

  // --- C: első platforming-kihívás ---
  { id: 'C1', x: 1740, y: 356, tiles: 1 }, // lépőkő a gap1-ben (alternatív útvonal)
  { id: 'C2', x: 1960, y: 330, tiles: 2 },
  { id: 'C3', x: 2140, y: 268, tiles: 2 }, // a szakasz csúcspontja

  // --- E: kombinált kihívás (harc + platforming) ---
  // Az E1 magassága NEM esztétikai döntés: az E2-n álló Gravecaller lövedéke VÍZSZINTESEN
  // repül, a sávja pedig [276, 292] (= E2.top - GRAVECALLER_SPAWN_OFFSET
  // + PROJECTILE_SPAWN_OFFSET_Y, ± PROJECTILE_SIZE/2). A korábbi 352-es y mellett a lapon
  // álló player teste [298, 344] volt, tehát a bolt 6 px-szel a FEJE FÖLÖTT ment el — a
  // caster tüzelt, de sosem talált. 328-cal a test [274, 320], amiben a lövedék sávja
  // TELJESEN benne van. A `level1Layout.test.ts` ezt őrzi.
  { id: 'E1', x: 3190, y: 328, tiles: 1 }, // lépőkő a gap3-ban
  { id: 'E2', x: 3420, y: 316, tiles: 3 }, // platform-enemy
  { id: 'E3', x: 3700, y: 250, tiles: 2 },
  { id: 'E4', x: 3960, y: 210, tiles: 3 }, // elevated platform, platform-enemy
  { id: 'E5', x: 4180, y: 300, tiles: 2 }, // ereszkedés a gap4 elé

  // --- F: a Swinging Reaper alatti középső platform (a 400px-es gap4 áthidalása) ---
  { id: 'F1', x: 4500, y: 340, tiles: 2 },

  // A kaszán TÚLI part fölé lebegő párkány, PONTOSAN az F1 szintjén (top 332) — ezért van
  // ugyanaz az y. Egy Gravecaller áll rajta, ami az F1-re érkező playert lövi: a szakasz
  // így nem csak időzítés, hanem ranged nyomás is. A magasság-egyezés KÖTELEZŐ, nem
  // véletlen: a vízszintes lövedék csak nagyjából azonos szintű célpontot ér el.
  //
  // A pozíciót két kényszer fogja közre (mindkettőt unit teszt őrzi):
  //   - balról a kasza söprési sávja + REAPER_ENEMY_CLEARANCE -> a patrol 4739.8 fölött;
  //   - jobbról a user kérése, hogy az EGÉSZ F1 a caster DETECTION_RANGE-én belül legyen.
  { id: 'F2', x: 4800, y: 340, tiles: 2 },

  // --- H: boss-ajtó ---
  // A jobb széle PONTOSAN a pálya széle (5808 + 6*32 = 6000): a szakasz így valódi
  // végállomásként olvas, nem egy lebegő lapként, ami mögött még marad hely.
  { id: 'H1', x: 5808, y: 140, tiles: 6, oneWay: true }, // a létra célja, az ajtó ezen áll
];

// --- Spike-mezők (D szakasz) ------------------------------------------------

/**
 * D szakasz — spike-tutorial. Egyetlen, 4 csempés (128 px) mező a G3 közepén, előtte és
 * utána bőven biztonságos talajjal.
 *
 * A szélesség NEM önkényes: az átugráshoz a player TESTÉNEK (28 px) is át kell érnie, tehát
 * 128 + 28 = 156 px-t kell megtenni — ez a `MAX_SAFE_GAP` (175) alatt van, de már érezhető
 * ugrás. A `level1Layout.test.ts` ezt őrzi.
 */
export const SPIKE_FIELDS: SpikeFieldDef[] = [
  { id: 'D-spikes', startX: 2740, endX: 2868, surfaceId: 'G4' },
];

// --- A pálya geometriai magja (a megosztott helperekhez) --------------------

export const LEVEL1_GEOMETRY: LevelGeometry = {
  groundSegments: GROUND_SEGMENTS,
  platforms: PLATFORMS,
  spikeFields: SPIKE_FIELDS,
};

/**
 * Vékony wrapperek a `LevelGeometry.ts` pure helperei köré, a Level 1 adatához kötve. Ezért
 * maradhattak a hívások (`surfaceSpan('G4')`, `groundGaps()`, `enemyChaseBounds(def)`)
 * bitre változatlanok a kiemelés után.
 */
export const surfaceSpan = (id: string): Span => surfaceSpanIn(LEVEL1_GEOMETRY, id);
export const groundGaps = (): GapDef[] => groundGapsIn(GROUND_SEGMENTS);
export const platformById = (id: string): PlatformDef => platformByIdIn(LEVEL1_GEOMETRY, id);
export const groundSegmentById = (id: string): GroundSegmentDef =>
  groundSegmentByIdIn(LEVEL1_GEOMETRY, id);
export const enemyChaseBounds = (def: EnemySpawnDef): { min: number; max: number } =>
  enemyChaseBoundsIn(def, LEVEL1_GEOMETRY);

// --- Swinging Reaper (F szakasz) --------------------------------------------

/**
 * F szakasz — a gap4 (4300–4700) fölött lengő kasza, pont az azt áthidaló `F1` platform
 * fölött. A számok NEM szemre vannak rakva, hanem a 250/156-os ugrás-plafonhoz méretezve:
 *
 *   - a penge alsó pontja (0°):  (4500, 310) — az `F1` teteje 332, a rajta álló player
 *     középpontja 308, tehát a penge végigsöpri a platformot → TALÁL;
 *   - a ±45°-os szélsőállások:   (4340, 244) és (4660, 244) — a talajszinten álló playertől
 *     (y≈394) 155 px-re, tehát a KÉT PARTON biztonságos.
 *
 * Ebből adódik a szakasz megoldása: a player a partról végignéz egy teljes lengést, és a
 * TÚLOLDALI szélsőállásnál ugrik — ekkor a penge tőle ELFELÉ indul. Ez a spec „Player must
 * be able to observe the pattern before committing to the jump" pontja, geometriából levezetve.
 */
export const REAPERS: SwingingReaperDef[] = [
  {
    id: 'F-reaper',
    anchorX: 4500,
    anchorY: 84,
    ropeLength: 226,
    maxAngleDeg: 45,
    periodMs: 2400,
  },
];

// --- Enemyk -----------------------------------------------------------------

/**
 * A `patrolMinX/patrolMaxX` KIZÁRÓLAG a nyugalmi séta-körzet — az ÜLDÖZÉS határa ennél
 * jóval tágabb, és nem itt van felsorolva, hanem az `enemyChaseBounds()` számítja a
 * felületből. Így az enemy a szakadék peremééig követi a playert, de a körzete kicsi marad,
 * és a player lehagyásakor oda tér vissza.
 */
export const ENEMY_SPAWNS: EnemySpawnDef[] = [
  // B — az első, magányos enemy: tágas, sík terep a harc megtanulásához.
  { id: 'B-1', x: 1250, surfaceId: 'G2', patrolMinX: 1120, patrolMaxX: 1400 },

  // D — a spike-mező ELŐTT áll. Az üldözési határát az enemyChaseBounds() vágja el a
  // tüskéknél, így a spec "CrowHarvester does not walk into spikes" pontja akkor is
  // teljesül, hogy az üldözés a teljes szegmensre kiterjed.
  { id: 'D-1', x: 2560, surfaceId: 'G4', patrolMinX: 2460, patrolMaxX: 2700 },

  // E — kombinált kihívás: két földi + két platformon álló.
  { id: 'E-ground-1', x: 3350, surfaceId: 'G5', patrolMinX: 3280, patrolMaxX: 3460 },

  // A pálya EGYETLEN távolsági ellenfele (Enemy 2). Az E2 platformon áll, tehát a
  // platform-lánc (E1 -> E2 -> E3) mostantól ranged-fenyegetettségű útvonal — a talajon
  // futó playert a VERTICAL_DETECTION_RANGE miatt nem lövi (a vízszintes lövedék amúgy is
  // elvétené). A patrol/chase határok VÁLTOZATLANOK a korábbi CrowHarvesteréhez képest:
  // a testszélessége is 20, tehát az enemyChaseBounds() levezetése ugyanazt adja.
  {
    id: 'E-platform-1',
    x: 3420,
    surfaceId: 'E2',
    patrolMinX: 3348,
    patrolMaxX: 3492,
    type: 'gravecaller',
  },
  { id: 'E-platform-2', x: 3960, surfaceId: 'E4', patrolMinX: 3888, patrolMaxX: 4032 },
  { id: 'E-ground-2', x: 4120, surfaceId: 'G5', patrolMinX: 4030, patrolMaxX: 4210 },

  // F — a kaszán túli párkányon álló távolsági őr. A patrol SZŰK (40px), és mindkét
  // pereme számít: balra a kasza söprési sávja, jobbra a DETECTION_RANGE határolja.
  // Az áthelyezkedési tere ennél tágabb (enemyChaseBounds -> 4760..4840), tehát ha a
  // player felugrik hozzá, van hova hátrálnia — de a párkány végén sarokba szorul.
  {
    id: 'F-caster',
    x: 4790,
    surfaceId: 'F2',
    patrolMinX: 4770,
    patrolMaxX: 4810,
    type: 'gravecaller',
  },

  // G — a létrát őrző pár, a boss-ajtó előtti utolsó harc.
  { id: 'G-1', x: 5050, surfaceId: 'G6', patrolMinX: 4930, patrolMaxX: 5170 },
  { id: 'G-2', x: 5350, surfaceId: 'G6', patrolMinX: 5230, patrolMaxX: 5470 },
];

// --- Létra / ajtó / checkpointok --------------------------------------------

export const LADDER = {
  x: 5678, // a H1 (oneWay) platform bal fele alatt: a player alulról átmászik rajta
  zoneTop: 100,
  /**
   * A MÁSZÁSI zóna szélessége — a RAJZOLT létráé (a két oldalléc külső éle között), nem a
   * 32px-es csempéé. A kettő szándékosan külön konstans, lásd `LevelTileset.LADDER_TILE_WIDTH`.
   */
  width: 28,
} as const;

/**
 * A méretek a csempéből jönnek, nem szemre hangolt számok: a `width`/`height` a `door-gate`
 * PNG mérete, az `openingHeight` pedig a boltív átjárható nyílásáé — a trigger-zóna ehhez
 * igazodik, hogy pontosan ott aktiválódjon, ahol a player ténylegesen az ajtóban áll.
 */
export const DOOR = {
  x: 5948,
  width: DOOR_TILE_WIDTH,
  height: DOOR_TILE_HEIGHT,
  openingHeight: DOOR_APERTURE.height,
} as const;

/** A pálya végi (ajtó-)checkpoint: E-re aktiválódik, és egyben a boss-átmenet. */
export const DOOR_CHECKPOINT = {
  x: 5918, // az ajtótól kicsit balra, hogy ne a grafikájában éledjen újra a player
  y: platformTop(platformById('H1')) - PLAYER_HALF_HEIGHT,
} as const;

/**
 * Köztes checkpoint a G3-on, közvetlenül a spike-mező után — a pálya ~6000px-es hosszánál
 * a startra visszadobás túl büntető lenne.
 *
 * Az ajtóval ellentétben ÉRINTÉSRE aktiválódik, nem E-billentyűre: így nem ütközik az ajtó
 * promptjával, és nem kell új input a játékosnak.
 */
export const MID_CHECKPOINT = {
  x: 3000,
  y: GROUND_TOP - PLAYER_HALF_HEIGHT,
  zoneWidth: 48,
  zoneHeight: 72,
} as const;

// --- Tutorial feliratok -----------------------------------------------------

/**
 * A spec 3. és 4. pontja: a mozgás- és a harc-billentyűk rövid időre megjelennek. Csak az
 * A és a B szakaszban — utána a játék már nem magyaráz.
 */
export const TUTORIAL_HINTS: TutorialHintDef[] = [
  // triggerX 0 = AZONNAL, a spawn pillanatában. A START_X (100) fölötti küszöb csapda
  // lenne: a mozgás-súgó csak azután jelenne meg, hogy a játékos magától már elindult —
  // pont akkor, amikor már nincs rá szüksége.
  { id: 'movement', triggerX: 0, text: '← → / A D  — mozgás      Space / W  — ugrás' },
  { id: 'combat', triggerX: 1000, text: 'J / bal klikk  — kard      F  — tűzgolyó' },
];

// --- Hangulati propok -------------------------------------------------------

/**
 * 11 elem a 6000px-es pályán (kb. 550 px-enként egy), hogy a díszlet ne váljon zsúfolttá.
 *
 * Az elhelyezés NEM szabad: a `level1Layout.test.ts` őrzi, hogy minden lábnyom egyetlen
 * talaj-szegmensen BELÜL marad, és nem takarja a hazardokat (tüskemező, kasza-söprés) sem a
 * két checkpointot. Konkrétan ezért van a `G-well` 4790-en és nem 4760-on: ott még a kasza
 * `REAPER_ENEMY_CLEARANCE`-es biztonsági sávjába lógna.
 */
export const DECOR_PROPS: DecorPropDef[] = [
  // A — start: a lámpa a spawntól balra keretezi a pálya elejét.
  { id: 'A-lamp', texture: PROP_TEXTURES.STREET_LAMP, x: 52, surfaceId: 'G1' },

  // B — első enemy: tágas, sík terep. A szekér a szegmens KÖZEPÉN ((960+1660)/2), nem a
  // peremén: a nagy sziluett így nem a szakadék-átmenetre esik.
  { id: 'B-crates', texture: PROP_TEXTURES.CRATE_STACK, x: 1010, surfaceId: 'G2' },
  { id: 'B-wagon', texture: PROP_TEXTURES.WAGON, x: 1310, surfaceId: 'G2' },

  // D — spike-tutorial. A tüskemező (2740–2868) KÖRNYÉKE szándékosan üres, hogy a hazard
  // tisztán olvasható legyen; a láda a mező ELŐTT, a láda-halom UTÁNA, a köztes
  // checkpoint (3000) elé.
  { id: 'D-crate', texture: PROP_TEXTURES.CRATE, x: 2445, surfaceId: 'G4' },
  { id: 'D-crates', texture: PROP_TEXTURES.CRATE_STACK, x: 2920, surfaceId: 'G4', flipX: true },

  // E — kombinált kihívás. A szekér az E4 (legmagasabb) platform ALATT áll: annak az alja
  // 218, a szekér teteje 343, tehát bőven elfér.
  { id: 'E-crate', texture: PROP_TEXTURES.CRATE, x: 3600, surfaceId: 'G5' },
  { id: 'E-wagon', texture: PROP_TEXTURES.WAGON, x: 3960, surfaceId: 'G5', flipX: true },

  // G — a kasza utáni partot a kút jelöli meg ("átértél"), majd a záró harc díszlete.
  // 4960, nem 4790: a régi helyén az F2 párkány ALÁ esne, és a kút teteje (353) mindössze
  // 5 px-re maradna a lap aljától (348) — ütközés-artefaktnak nézne ki. Balra egyébként sem
  // mehet: 4772 alatt már a kasza söprési sávjának biztonsági zónájába lógna.
  { id: 'G-well', texture: PROP_TEXTURES.WELL, x: 4960, surfaceId: 'G6' },
  { id: 'G-crates', texture: PROP_TEXTURES.CRATE_STACK, x: 5195, surfaceId: 'G6' },

  // H — a két lámpa KÖZREFOGJA a létra lábát (LADDER.x ± 40), tehát a felfelé vezető út
  // meg van világítva. A mászási zóna 5664..5692, a lámpák lábnyoma mindkét oldalon
  // ~8 px-re marad tőle.
  { id: 'H-lamp-left', texture: PROP_TEXTURES.STREET_LAMP, x: 5638, surfaceId: 'G6' },
  { id: 'H-lamp-right', texture: PROP_TEXTURES.STREET_LAMP, x: 5718, surfaceId: 'G6' },
];
