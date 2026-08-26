import { GRAVITY_Y } from '../config/physics';
import { JUMP_VELOCITY, MOVE_SPEED } from '../player/Player';
import {
  BODY_HEIGHT as PLAYER_BODY_HEIGHT,
  BODY_WIDTH as PLAYER_BODY_WIDTH,
} from '../player/PlayerAnimations';
import { BODY_WIDTH as HARVESTER_BODY_WIDTH } from '../enemies/CrowHarvesterAnimations';
import {
  BODY_WIDTH as GRAVECALLER_BODY_WIDTH,
  FEET_OFFSET_Y as GRAVECALLER_FEET_OFFSET_Y,
} from '../enemies/GravecallerAnimations';
import {
  DOOR_APERTURE,
  DOOR_TILE_HEIGHT,
  DOOR_TILE_WIDTH,
  GROUND_TILE_HEIGHT,
  PLATFORM_TILE_HEIGHT,
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
 * A pálya nyolc szakaszra tagolódik (a `docs/Project_plan.md` 14. pontja és a hozzá tartozó
 * layout-spec szerint):
 *
 *   A start/mozgás-tutorial · B első enemy · C platforming + gap · D spike-tutorial
 *   E kombinált kihívás · F Swinging Reaper · G záró harc · H boss-ajtó
 */

// --- Világ ------------------------------------------------------------------

export const WORLD_WIDTH = 6000;

/**
 * = a canvas magassága (main.ts). A KAMERA bounds-a ekkora marad, tehát nincs függőleges
 * görgetés. A FIZIKAI világ ennél mélyebb (`WORLD_HEIGHT + FALL_DEPTH`), hogy a szakadékba
 * lépő player láthatóan kizuhanjon a képből, mielőtt a `FALL_DEATH_Y`-t átlépve meghal.
 */
export const WORLD_HEIGHT = 450;
export const FALL_DEPTH = 250;

/** Ezt átlépve a player zuhanás-halált hal. A képernyő alja (450) alatt van, tehát a
 *  halál pillanatában a player már nem látszik. */
export const FALL_DEATH_Y = 520;

// --- Talaj / player geometria -----------------------------------------------

/** A talajsáv 32px magas (LevelTileset), origin 0.5 -> a felszíne a középpont - 16. */
export const GROUND_CENTER_Y = 434;
export const GROUND_TOP = GROUND_CENTER_Y - GROUND_TILE_HEIGHT / 2; // 418

/**
 * A player talpa a `sprite.y + 24`-nél van (PlayerAnimations.ORIGIN_Y). Minden "álló player
 * középpontja egy felületen" számítás ebből dolgozik (létra topY/bottomY, checkpointok).
 */
export const PLAYER_HALF_HEIGHT = 24;

/** A CrowHarvester talpa a `sprite.y + 23`-nál van -> 24 egy 1px-es ejtést ad spawnkor. */
export const HARVESTER_SPAWN_OFFSET = 24;

/**
 * Ugyanaz a Gravecallerre, csak LEVEZETVE: a talpa a `sprite.y + FEET_OFFSET_Y`-nál van
 * (19), a +1 pedig ugyanaz az 1px-es ejtés, mint fent. Egy jövőbeli sprite-csere így nem
 * hagyhatja itt a régi számot.
 */
export const GRAVECALLER_SPAWN_OFFSET = GRAVECALLER_FEET_OFFSET_Y + 1; // 20

/**
 * A TESTEK mérete — nem csak a középpontokkal kell tervezni. Az ugrás-számítások és a
 * patrol-határok is ezekre támaszkodnak: egy szakadékot a player TESTÉNEK kell átérnie, és
 * egy enemy TESTE sem lóghat le a peremen. Az animációs modulokból jönnek, hogy egy
 * sprite-csere ne hagyja itt a régi számot.
 *
 * A `PLAYER_BODY_HEIGHT` egy harmadik szerepet is betölt: egy `T` tetejű felületen álló
 * player teste PONTOSAN `[T - PLAYER_BODY_HEIGHT, T]` — ebből dől el, hogy a Gravecaller
 * vízszintes lövedéke eltalálja-e (lásd az E1 magasságát és a level1Layout.test.ts-t).
 */
export {
  PLAYER_BODY_WIDTH,
  PLAYER_BODY_HEIGHT,
  HARVESTER_BODY_WIDTH,
  GRAVECALLER_BODY_WIDTH,
};
export const HARVESTER_HALF_BODY_WIDTH = HARVESTER_BODY_WIDTH / 2;
export const GRAVECALLER_HALF_BODY_WIDTH = GRAVECALLER_BODY_WIDTH / 2;

/** Friss játék kezdőpontja = a CheckpointSystem default-ja. */
export const START_X = 100;
export const START_Y = 300;

// --- Ugrás-plafon (LEVEZETETT, nem hangolt) ---------------------------------
// Minden szakadék-szélesség és platform-emelkedés ezekhez van méretezve. Ha a Player
// MOVE_SPEED/JUMP_VELOCITY-je vagy a GRAVITY_Y változik, a level1Layout.test.ts azonnal
// jelez, ha a pálya játszhatatlanná vált.

/** v² / 2g — meddig emelkedik a player egy teljes ugrásból (156.25 px). */
export const MAX_JUMP_HEIGHT = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY_Y);

/** A teljes ugrás légideje azonos magasságra visszaérkezve (1.25 s). */
export const MAX_JUMP_AIRTIME_MS = (2 * Math.abs(JUMP_VELOCITY) * 1000) / GRAVITY_Y;

/** Meddig jut vízszintesen egy teljes ugrás azonos magasságon (250 px). */
export const MAX_JUMP_DISTANCE = (MOVE_SPEED * MAX_JUMP_AIRTIME_MS) / 1000;

/**
 * Biztonsági szorzók. A player nem a perem legszélén ugrik el, nem mindig tartja a
 * maximális vízszintes sebességet, és az ugrásgombot sem a tökéletes pillanatban nyomja —
 * ezért a tervezés SOSEM a matematikai plafonra megy.
 */
export const GAP_SAFETY_FACTOR = 0.7; // 175 px
export const RISE_SAFETY_FACTOR = 0.75; // 117 px

export const MAX_SAFE_GAP = MAX_JUMP_DISTANCE * GAP_SAFETY_FACTOR;
export const MAX_SAFE_RISE = MAX_JUMP_HEIGHT * RISE_SAFETY_FACTOR;

/**
 * Meddig jut a player VÍZSZINTESEN egy teljes ugrással, ha közben `rise` pixelt EMELKEDNIE
 * is kell (negatív `rise` = ereszkedés, ilyenkor tovább repül).
 *
 * A ballisztikai pálya lefelé pozitív y-nal: `y(t) = JUMP_VELOCITY·t + ½·g·t²`. A landolás
 * a `y(t) = -rise` egyenlet KÉSŐBBI (ereszkedő ágon lévő) gyöke:
 *
 *     t = ( -JUMP_VELOCITY + √(JUMP_VELOCITY² - 2·g·rise) ) / g
 *
 * Ha a gyök alatti kifejezés negatív, az emelkedés egyszerűen nem teljesíthető -> 0.
 * A `level1Layout.test.ts` ezzel járja be a pályát és bizonyítja, hogy minden felület
 * elérhető a startról.
 */
export function horizontalReachForRise(rise: number): number {
  const discriminant = JUMP_VELOCITY * JUMP_VELOCITY - 2 * GRAVITY_Y * rise;
  if (discriminant < 0) return 0;

  const landingTimeSec = (Math.abs(JUMP_VELOCITY) + Math.sqrt(discriminant)) / GRAVITY_Y;
  return MOVE_SPEED * landingTimeSec;
}

// --- Talaj-szegmensek -------------------------------------------------------

export interface GroundSegmentDef {
  id: string;
  /** Bal él (világ-X), inkluzív. */
  startX: number;
  /** Jobb él (világ-X), exkluzív értelemben: itt már a szakadék kezdődik. */
  endX: number;
}

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

export interface PlatformDef {
  id: string;
  /** A sprite középpontja. */
  x: number;
  y: number;
  /** Szélesség 64px-es egységekben (a fizikai test 64x16-os, setScale(tiles, 1)). */
  tiles: number;
  /** Alulról átjárható (a létra ezen megy át), felülről szilárd. */
  oneWay?: boolean;
}

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

// --- Geometria-helperek -----------------------------------------------------

/** A platform felszíne (a lap 16px magas, origin 0.5). */
export const platformTop = (p: PlatformDef): number => p.y - PLATFORM_TILE_HEIGHT / 2;
export const platformLeft = (p: PlatformDef): number => p.x - p.tiles * 32;
export const platformRight = (p: PlatformDef): number => p.x + p.tiles * 32;

export const platformById = (id: string): PlatformDef => {
  const found = PLATFORMS.find((p) => p.id === id);
  if (!found) throw new Error(`Ismeretlen platform id: ${id}`);
  return found;
};

export const groundSegmentById = (id: string): GroundSegmentDef => {
  const found = GROUND_SEGMENTS.find((g) => g.id === id);
  if (!found) throw new Error(`Ismeretlen ground szegmens id: ${id}`);
  return found;
};

export interface Span {
  left: number;
  right: number;
  top: number;
}

/**
 * Egységes felület-lekérdezés: az id lehet ground szegmensé VAGY platformé. Ez teszi
 * lehetővé, hogy az enemy-spawnok egyetlen `surfaceId` mezővel hivatkozzanak arra, amin
 * állnak — a spawn Y-t és a patrol-határok érvényességét egyaránt ebből vezetjük le.
 */
export function surfaceSpan(id: string): Span {
  const ground = GROUND_SEGMENTS.find((g) => g.id === id);
  if (ground) return { left: ground.startX, right: ground.endX, top: GROUND_TOP };

  const platform = PLATFORMS.find((p) => p.id === id);
  if (platform) {
    return {
      left: platformLeft(platform),
      right: platformRight(platform),
      top: platformTop(platform),
    };
  }

  throw new Error(`Ismeretlen felület id: ${id}`);
}

export interface GapDef {
  /** A bal oldali talaj-szegmens jobb éle. */
  startX: number;
  /** A jobb oldali talaj-szegmens bal éle. */
  endX: number;
  width: number;
}

/**
 * A szakadékok a talaj-szegmensek KÖZÖTTI hézagok — nincsenek külön felsorolva, hogy ne
 * lehessen a kettőt elrontani egymáshoz képest.
 */
export function groundGaps(): GapDef[] {
  const gaps: GapDef[] = [];

  for (let i = 1; i < GROUND_SEGMENTS.length; i++) {
    const startX = GROUND_SEGMENTS[i - 1].endX;
    const endX = GROUND_SEGMENTS[i].startX;
    if (endX > startX) gaps.push({ startX, endX, width: endX - startX });
  }

  return gaps;
}

// --- Spike-mezők (D szakasz) ------------------------------------------------

/** A spike-placeholder textúra mérete (BootScene). A mezők ennek többszörösei. */
export const SPIKE_TILE_WIDTH = 32;
export const SPIKE_HEIGHT = 16;

/**
 * A találati zóna vízszintes behúzása a mező RAJZOLT széléhez képest. A mező pereménél
 * landolást megbocsátjuk — a tüskék legkülső 4px-e csak grafika. Enélkül a "pont a szélén
 * álltam meg" pillanatok igazságtalannak hatnának.
 *
 * FONTOS: ez a MEZŐ egészére vonatkozik, nem csempénként — csempénkénti behúzás sebezhetetlen
 * réseket nyitna a tüskék KÖZÖTT, ahol a player büntetlenül megállhatna.
 */
export const SPIKE_HITBOX_INSET_X = 4;

export interface SpikeFieldDef {
  id: string;
  /** A rajzolt mező bal éle (világ-X). */
  startX: number;
  /** A rajzolt mező jobb éle (világ-X). */
  endX: number;
  /** Melyik talaj-szegmensen ül — a felszínére kerül, unit teszt őrzi. */
  surfaceId: string;
}

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

// --- Swinging Reaper (F szakasz) --------------------------------------------

export interface SwingingReaperDef {
  id: string;
  /** A mennyezeti horgony világ-koordinátái. */
  anchorX: number;
  anchorY: number;
  /** A horgonytól a penge KÖZÉPPONTJÁIG mért kötélhossz. */
  ropeLength: number;
  /** Maximális kitérés a függőlegestől, fokban (a spec ±45°-ot ír elő). */
  maxAngleDeg: number;
  /** Egy TELJES oda-vissza lengés hossza. */
  periodMs: number;
  /** Fázis-eltolás, ha valaha több reaper lóg egymás mellett. */
  phaseMs?: number;
}

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

export interface ReaperSweep {
  /** A penge középpontjának szélső X-ei (a ±maxAngle állásokban). */
  left: number;
  right: number;
  /** A legalsó pont (0°-nál) és a legfelső (a szélsőállásokban). */
  lowestY: number;
  highestY: number;
}

/** A penge söprési tartománya — a tesztek és az enemy-távolságtartás ebből dolgoznak. */
export function reaperSweep(def: SwingingReaperDef): ReaperSweep {
  const maxAngleRad = (def.maxAngleDeg * Math.PI) / 180;
  const halfWidth = def.ropeLength * Math.sin(maxAngleRad);

  return {
    left: def.anchorX - halfWidth,
    right: def.anchorX + halfWidth,
    lowestY: def.anchorY + def.ropeLength,
    highestY: def.anchorY + def.ropeLength * Math.cos(maxAngleRad),
  };
}

/**
 * Ekkora sávval a söprés KÖRÜL sem állhat enemy — a spec „Enemies are not spawned/placed
 * near the reaper swing" pontja. A gyakorlatban a gap4 amúgy is kizárja őket (nincs talaj
 * 4300 és 4700 között), de a teszt így egy jövőbeli, `F1`-re rakott enemyt is elkapna.
 */
export const REAPER_ENEMY_CLEARANCE = 80;

// --- Enemyk -----------------------------------------------------------------

/**
 * A platformon álló enemy patrol-határainak behúzása a peremtől (a CrowHarvester
 * félszélessége 10px, a maradék a fékezési ráhagyás).
 */
export const EDGE_INSET = 24;

/**
 * Melyik lény spawnol. Elhagyva `crow-harvester` — így a Gravecaller bevezetése nem
 * érintette a többi hét spawn sorát.
 */
export type EnemyType = 'crow-harvester' | 'gravecaller';

export interface EnemySpawnDef {
  id: string;
  /** Spawn X. A spawn Y a `surfaceId` felszínéből és a típus talp-offsetjéből számítódik. */
  x: number;
  /** Ground szegmens VAGY platform id — lásd `surfaceSpan()`. */
  surfaceId: string;
  patrolMinX: number;
  patrolMaxX: number;
  /** Default: `crow-harvester`. */
  type?: EnemyType;
}

export const enemyType = (def: EnemySpawnDef): EnemyType => def.type ?? 'crow-harvester';

/**
 * A lény TESTÉNEK félszélessége — a peremeket ezzel együtt kell vizsgálni (egy enemy teste
 * sem lóghat le a felületről). Típusfüggő, hogy egy jövőbeli, szélesebb lény ne csendben
 * örökölje a CrowHarvester számát.
 */
export const enemyHalfBodyWidth = (def: EnemySpawnDef): number =>
  enemyType(def) === 'gravecaller' ? GRAVECALLER_HALF_BODY_WIDTH : HARVESTER_HALF_BODY_WIDTH;

/** A spawn Y a felület felszínéből: a lény talpa (majdnem) pontosan a felszínre kerül. */
export const enemySpawnOffset = (def: EnemySpawnDef): number =>
  enemyType(def) === 'gravecaller' ? GRAVECALLER_SPAWN_OFFSET : HARVESTER_SPAWN_OFFSET;

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

/**
 * Az enemy ÜLDÖZÉSI határa: meddig követheti a playert anélkül, hogy leesne vagy hazardba
 * lépne. LEVEZETETT érték, nem kézzel írt szám — egy platform elmozdítása vagy egy új
 * spike-mező automatikusan átméretezi a pórázt.
 *
 * Két korlát metszete:
 *   1. a felület (talaj-szegmens vagy platform) pereme, `EDGE_INSET`-tel behúzva;
 *   2. a spawnját tartalmazó, TÜSKEMENTES szabad sáv — a mezők elvágják a mozgásteret.
 *
 * A platformon állóknál ez pontosan a régi, kézzel írt patrol-határt adja vissza, tehát az
 * ő viselkedésük bitre változatlan.
 */
export function enemyChaseBounds(def: EnemySpawnDef): { min: number; max: number } {
  const surface = surfaceSpan(def.surfaceId);
  let min = surface.left + EDGE_INSET;
  let max = surface.right - EDGE_INSET;

  for (const field of SPIKE_FIELDS) {
    if (field.surfaceId !== def.surfaceId) continue;

    if (field.endX <= def.x) {
      min = Math.max(min, field.endX + EDGE_INSET);
    } else if (field.startX >= def.x) {
      max = Math.min(max, field.startX - EDGE_INSET);
    }
  }

  return { min, max };
}

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

export interface TutorialHintDef {
  id: string;
  /** A player ezt az X-et átlépve váltja ki a feliratot (egyszer). */
  triggerX: number;
  text: string;
}

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
 * Nem ütköző háttér-dekoráció: a `DECOR_DEPTH` (-10) miatt a player és az enemyk ELŐTTÜK
 * mennek el, és nincs physics bodyjuk sem, tehát a pálya járhatóságát nem érintik.
 *
 * Forrás: **GothicVania Town** (Luis Zuno / @ansimuz) — public domain. A csomag karakterei
 * 42–47 px magasak, a mi lovagunk 46 — ezért a propok 1:1-ben, SKÁLÁZÁS NÉLKÜL használhatók.
 * A fájlnevek eredetiek; ez a kapocs a forráscsomaghoz.
 */
export const PROP_TEXTURES = {
  STREET_LAMP: 'prop-street-lamp',
  WAGON: 'prop-wagon',
  WELL: 'prop-well',
  CRATE: 'prop-crate',
  CRATE_STACK: 'prop-crate-stack',
} as const;

export type PropTexture = (typeof PROP_TEXTURES)[keyof typeof PROP_TEXTURES];

/**
 * Színkorrekció a FA propokhoz (szekér, ládák). Ezek nyersen már közel melegek
 * (`(77,49,60)`: a kék alig erősebb a zöldnél), tehát elég visszavenni őket, hogy a
 * gameplay-elemek mögé süllyedjenek: `(57,35,33)` — pont a talaj `(42,33,33)` és a mögöttük
 * lévő `03-ruins` háttérréteg `(74,45,39)` KÖZÖTT.
 */
export const PROP_TINT_WARM_SOURCE = 0xc0b890;

/**
 * Színkorrekció a KŐ/VAS propokhoz (utcai lámpa, kút). Ezek nyersen erősen kékesek
 * (`(49,37,63)` — a kék/zöld arány 1.7), és sötétebbek is a faanyagnál. Ugyanaz a mérsékelt
 * tint, ami a fát rendbe teszi, itt csak szürkévé mosná őket: a MULTIPLY tint megőrzi a
 * csatorna-arányokat, tehát a lilás beütés megmaradna.
 *
 * Ezért kapnak külön, ERŐSEN kékvágó tintet, ami a vörös csatornához nem nyúl:
 * `(49,31,27)` — meleg, sötét vas/kő. **Ne cseréld le a fa tintjére**, és fordítva sem: a
 * fa propok ettől a tinttől feltűnően telített narancsra váltanának.
 */
export const PROP_TINT_COOL_SOURCE = 0xffdc71;

/**
 * A PNG-k tényleges mérete + a hozzájuk tartozó tint. Azért itt van, és nem a render-oldalon,
 * mert a LÁBNYOM ebből számítódik: a `level1Layout.test.ts` ezzel bizonyítja, hogy egyetlen
 * prop sem lóg szakadékba, tüskemezőbe vagy a kasza söprési sávjába — GameObject-mock nélkül.
 *
 * A `tint` szándékosan KÖTELEZŐ mező, nincs default: a két csoport (fa / kő-vas) érdemben más
 * korrekciót kíván, és egy hallgatólagos default mellett egy új prop némán a rossz csoportba
 * kerülne.
 */
export const PROP_ASSETS: Record<
  PropTexture,
  { width: number; height: number; tint: number }
> = {
  [PROP_TEXTURES.STREET_LAMP]: { width: 35, height: 108, tint: PROP_TINT_COOL_SOURCE },
  [PROP_TEXTURES.WELL]: { width: 65, height: 65, tint: PROP_TINT_COOL_SOURCE },
  [PROP_TEXTURES.WAGON]: { width: 93, height: 75, tint: PROP_TINT_WARM_SOURCE },
  [PROP_TEXTURES.CRATE]: { width: 39, height: 35, tint: PROP_TINT_WARM_SOURCE },
  [PROP_TEXTURES.CRATE_STACK]: { width: 73, height: 68, tint: PROP_TINT_WARM_SOURCE },
};

export interface DecorPropDef {
  id: string;
  texture: PropTexture;
  /** A prop VÍZSZINTES középpontja; a talpa a `surfaceId` felszínére kerül. */
  x: number;
  /** Ground szegmens VAGY platform id — lásd `surfaceSpan()`. */
  surfaceId: string;
  /** Vízszintes tükrözés — ugyanabból a textúrából ad változatosságot. */
  flipX?: boolean;
}

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

/** A prop lábnyoma a talajon — a tesztek és az ütközés-vizsgálatok ebből dolgoznak. */
export function decorPropFootprint(def: DecorPropDef): { left: number; right: number } {
  const half = PROP_ASSETS[def.texture].width / 2;
  return { left: def.x - half, right: def.x + half };
}
