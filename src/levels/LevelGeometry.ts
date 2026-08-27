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
import { GROUND_TILE_HEIGHT, PLATFORM_TILE_HEIGHT } from './LevelTileset';

/**
 * MINDEN pályára érvényes geometria: típusok, világ-konstansok, a `Player`-ből LEVEZETETT
 * ugrás-plafon és a pure helperek.
 *
 * Szándékosan Phaser-mentes — ugyanaz az elv, mint a `LevelTileset.ts`-nél és az animációs
 * moduloknál: a pálya-invariánsok GameObject-mockolás nélkül unit-tesztelhetők maradnak.
 *
 * **Miért külön modul (Level 2, 1. iteráció):** ez a tartalom eredetileg a `Level1Layout.ts`-ben
 * élt, és a hazard-/decor-modulok (`SpikeField`, `SwingingReaper`, `LevelDecor`, `TutorialHint`,
 * `BootScene`) onnan importáltak — tehát a Level 2 nem tudta volna őket használni anélkül,
 * hogy a Level 1 pálya-adatait is magával rántsa. A pályánkénti ADAT (`GROUND_SEGMENTS`,
 * `PLATFORMS`, `ENEMY_SPAWNS`, ...) továbbra is a `LevelNLayout.ts`-ekben van; ide csak az
 * kerül, ami mindkettőre igaz.
 *
 * A pálya-adatot igénylő helperek (`surfaceSpan`, `groundGaps`, `enemyChaseBounds`) egy
 * `LevelGeometry` objektumot kapnak paraméterként. A `Level1Layout.ts` vékony wrappereket
 * exportál hozzájuk, hogy a `Level1Scene` és a `level1Layout.test.ts` hívásai változatlanok
 * maradjanak.
 */

// --- Világ / talaj ----------------------------------------------------------

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

/** A talajsáv 32px magas (LevelTileset), origin 0.5 -> a felszíne a középpont - 16. */
export const GROUND_CENTER_Y = 434;
export const GROUND_TOP = GROUND_CENTER_Y - GROUND_TILE_HEIGHT / 2; // 418

// --- Testek / talp-offsetek -------------------------------------------------

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
 * vízszintes lövedéke eltalálja-e.
 */
export {
  PLAYER_BODY_WIDTH,
  PLAYER_BODY_HEIGHT,
  HARVESTER_BODY_WIDTH,
  GRAVECALLER_BODY_WIDTH,
};
export const HARVESTER_HALF_BODY_WIDTH = HARVESTER_BODY_WIDTH / 2;
export const GRAVECALLER_HALF_BODY_WIDTH = GRAVECALLER_BODY_WIDTH / 2;

// --- Ugrás-plafon (LEVEZETETT, nem hangolt) ---------------------------------
// Minden szakadék-szélesség és platform-emelkedés ezekhez van méretezve. Ha a Player
// MOVE_SPEED/JUMP_VELOCITY-je vagy a GRAVITY_Y változik, a layout-tesztek azonnal
// jeleznek, ha a pálya játszhatatlanná vált.

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
 * **Az ugrás magassága FIX**, és ebből két, könnyen elrontható korlát következik.
 *
 * A `PlayerController.update()` feltétel nélkül hívja a `Player.jump()`-ot, ami mindig a
 * teljes `JUMP_VELOCITY`-t adja: NINCS változó magasságú ugrás, tehát a player nem tud
 * "kis ugrást" csinálni egy alacsony lap alatt. A vízszintes sebességet viszont levegőben is
 * szabadon állítja (`stopMoving()` ott is nullázza a velocityt), tehát a LANDOLÁS pontosan
 * célozható — a magasság az, ami kényszerű.
 *
 *  - `MIN_WALK_UNDER_RISE` alatt a lap ELZÁRJA a talajsávot: nem opcionális perch, hanem
 *    lépcső, amire fel kell mászni.
 *  - `MIN_WALK_UNDER_RISE` és `MIN_JUMP_CLEARANCE_RISE` KÖZÖTT a lap "ugrás-plafon": alatta
 *    el lehet sétálni, de aki ugrik, beveri a fejét és visszaesik oda, ahonnan indult. Egy
 *    tüskemező vagy egy szakadék-perem fölé lógó ilyen lap ezért JÁTSZHATATLANNÁ teszi a
 *    szakaszt — kivéve, ha a lap `oneWay`, mert azon a player alulról átmegy.
 */
export const MIN_WALK_UNDER_RISE = PLAYER_BODY_HEIGHT + PLATFORM_TILE_HEIGHT; // 62
export const MIN_JUMP_CLEARANCE_RISE = MIN_WALK_UNDER_RISE + MAX_JUMP_HEIGHT; // ~218

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
 * A layout-tesztek ezzel járják be a pályát (BFS) és bizonyítják, hogy minden felület
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

/** A platform felszíne (a lap 16px magas, origin 0.5). */
export const platformTop = (p: PlatformDef): number => p.y - PLATFORM_TILE_HEIGHT / 2;
export const platformLeft = (p: PlatformDef): number => p.x - p.tiles * 32;
export const platformRight = (p: PlatformDef): number => p.x + p.tiles * 32;
/** A lap ALJA — az "ugrás-plafon" vizsgálatok ezzel dolgoznak. */
export const platformBottom = (p: PlatformDef): number =>
  platformTop(p) + PLATFORM_TILE_HEIGHT;

// --- Egy pálya geometriai magja ---------------------------------------------

/**
 * Amit a megosztott helpereknek tudniuk kell egy pályáról. A `LevelNLayout.ts`-ek ebből
 * exportálnak egy példányt (`LEVEL1_GEOMETRY`, `LEVEL2_GEOMETRY`).
 *
 * Szándékosan CSAK a felületek és a spike-mezők: pontosan ennyi kell a `surfaceSpan()`-hez,
 * a `groundGaps()`-hez és az `enemyChaseBounds()`-hoz. Az enemyk, kaszák, propok stb. nem
 * szerepelnek — azokat a hívó közvetlenül adja át.
 */
export interface LevelGeometry {
  groundSegments: GroundSegmentDef[];
  platforms: PlatformDef[];
  spikeFields: SpikeFieldDef[];
}

export interface Span {
  left: number;
  right: number;
  top: number;
}

export const platformById = (level: LevelGeometry, id: string): PlatformDef => {
  const found = level.platforms.find((p) => p.id === id);
  if (!found) throw new Error(`Ismeretlen platform id: ${id}`);
  return found;
};

export const groundSegmentById = (level: LevelGeometry, id: string): GroundSegmentDef => {
  const found = level.groundSegments.find((g) => g.id === id);
  if (!found) throw new Error(`Ismeretlen ground szegmens id: ${id}`);
  return found;
};

/**
 * Egységes felület-lekérdezés: az id lehet ground szegmensé VAGY platformé. Ez teszi
 * lehetővé, hogy az enemy-spawnok és a propok egyetlen `surfaceId` mezővel hivatkozzanak
 * arra, amin állnak — a spawn Y-t és a határok érvényességét egyaránt ebből vezetjük le.
 */
export function surfaceSpan(level: LevelGeometry, id: string): Span {
  const ground = level.groundSegments.find((g) => g.id === id);
  if (ground) return { left: ground.startX, right: ground.endX, top: GROUND_TOP };

  const platform = level.platforms.find((p) => p.id === id);
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
export function groundGaps(segments: GroundSegmentDef[]): GapDef[] {
  const gaps: GapDef[] = [];

  for (let i = 1; i < segments.length; i++) {
    const startX = segments[i - 1].endX;
    const endX = segments[i].startX;
    if (endX > startX) gaps.push({ startX, endX, width: endX - startX });
  }

  return gaps;
}

// --- Spike-mezők ------------------------------------------------------------

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

// --- Swinging Reaper --------------------------------------------------------

export interface SwingingReaperDef {
  id: string;
  /** A mennyezeti horgony világ-koordinátái. */
  anchorX: number;
  anchorY: number;
  /** A horgonytól a penge KÖZÉPPONTJÁIG mért kötélhossz. */
  ropeLength: number;
  /** Maximális kitérés a függőlegestől, fokban. */
  maxAngleDeg: number;
  /** Egy TELJES oda-vissza lengés hossza. */
  periodMs: number;
  /** Fázis-eltolás — több egymás melletti kasza ellenfázisba állításához. */
  phaseMs?: number;
}

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
 * Ekkora sávval a söprés KÖRÜL sem állhat enemy — a layout-spec „Enemies are not
 * spawned/placed near the reaper swing" pontja.
 */
export const REAPER_ENEMY_CLEARANCE = 80;

/**
 * A penge KÖZÉPPONTJÁNAK legkisebb távolsága egy adott ponttól a lengés TELJES tartománya
 * alatt. A penge egy `ropeLength` sugarú körív mentén jár, tehát ez tisztán geometria:
 *
 *  - ha a pont IRÁNYA (a horgonytól, a függőlegestől mérve) beleesik a ±`maxAngleDeg`-os
 *    söprésbe, a legközelebbi pont a sugáron van -> `|távolság − ropeLength|`;
 *  - egyébként a közelebbi SZÉLSŐÁLLÁS a legközelebbi pont.
 *
 * **Ez váltja ki a layout-spec „szélsőállásban legalább 150 px a szomszéd platform
 * álló-pozíciójától" szabályát.** Az a szabály a Level 1-en működött (400 px-es szakadék,
 * középen egyetlen platformmal), de a Level 2 `F` szakaszának 120 px-es hézagjainál
 * TELJESÍTHETETLEN: ott a penge geometriailag nem tud 60 px-nél távolabb kerülni a peremtől.
 * A valódi követelmény nem a szélsőállás távolsága, hanem az, hogy a penge SEMMILYEN
 * fázisban ne érje el az álló playert — és pontosan ezt méri ez a függvény.
 */
export function reaperMinDistanceTo(
  def: SwingingReaperDef,
  pointX: number,
  pointY: number
): number {
  const dx = pointX - def.anchorX;
  const dy = pointY - def.anchorY;
  const maxAngleRad = (def.maxAngleDeg * Math.PI) / 180;

  // A penge szöge a FÜGGŐLEGESTŐL, pozitív = jobbra (ugyanaz a konvenció, mint a
  // `swingAngleAt`-nál). A horgony fölötti pontokra |angle| > 90°, tehát automatikusan a
  // szélsőállás-ágra esik.
  const angle = Math.atan2(dx, dy);

  if (Math.abs(angle) <= maxAngleRad) {
    return Math.abs(Math.hypot(dx, dy) - def.ropeLength);
  }

  const sign = angle > 0 ? 1 : -1;
  const extremeX = def.anchorX + sign * def.ropeLength * Math.sin(maxAngleRad);
  const extremeY = def.anchorY + def.ropeLength * Math.cos(maxAngleRad);

  return Math.hypot(pointX - extremeX, pointY - extremeY);
}

// --- Mozgó platform --------------------------------------------------------
//
// A TÍPUS és a tisztán geometriai helperek itt vannak, az IDŐFÜGGŐ mozgásprofil
// (`platformPositionAt`) viszont a `platforms/MovingPlatform.ts`-ben — ugyanaz a
// szétosztás, mint a `SwingingReaperDef`/`reaperSweep` (itt) és a `swingAngleAt`
// (`hazards/SwingingReaper.ts`) párosnál.

export interface MovingPlatformDef {
  id: string;
  /** Az egyik végállás KÖZÉPPONTJA (itt áll `t = 0`-nál). */
  fromX: number;
  fromY: number;
  /** A másik végállás KÖZÉPPONTJA. */
  toX: number;
  toY: number;
  /** px/s. Szándékosan messze a player MOVE_SPEED-je (200) alatt: kiszámítható. */
  speed: number;
  /** Megállás MINDKÉT végponton — enélkül a felugrás pillanata nem gyakorolható. */
  dwellMs: number;
  /** Szélesség 64px-es egységekben — ugyanaz a konvenció, mint a `PlatformDef`-nél. */
  tiles: number;
  /** Fázis-eltolás, ha több platformot kell egymáshoz képest eltolni. */
  phaseMs?: number;
}

/** A vizuális/fizikai magasság = a statikus platformoké, hogy egységesen olvassanak. */
export const MOVING_PLATFORM_HEIGHT = PLATFORM_TILE_HEIGHT;

/** A lap felülete adott középpont mellett — a `Span` alakja azonos a statikus felületekével. */
export function movingPlatformSpan(
  def: MovingPlatformDef,
  x: number,
  y: number
): Span {
  const half = def.tiles * 32;
  return { left: x - half, right: x + half, top: y - MOVING_PLATFORM_HEIGHT / 2 };
}

/**
 * A KÉT VÉGÁLLÁS felülete. Az elérhetőség-BFS ezt használja: a mozgó platform a gráfban két
 * csúcs, mert **minden ugrást a szélsőállásból kell méretezni** — így a player sosem
 * kényszerül „menet közben" célozni, legfeljebb egy ciklust vár.
 */
export function movingPlatformExtremes(def: MovingPlatformDef): [Span, Span] {
  return [
    movingPlatformSpan(def, def.fromX, def.fromY),
    movingPlatformSpan(def, def.toX, def.toY),
  ];
}

/**
 * A platform TELJES pályája egyetlen téglalapként (a lap kiterjedésével együtt) — a
 * „caster bolt-sávja nem metszhet mozgó platform pályát" invariáns ezzel dolgozik. Mozgó
 * platformon ugyanis a player nem tud kitérni, tehát ott egy lövedék kikerülhetetlen
 * sebzés lenne.
 */
export function movingPlatformPathBounds(def: MovingPlatformDef): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const [a, b] = movingPlatformExtremes(def);
  return {
    left: Math.min(a.left, b.left),
    right: Math.max(a.right, b.right),
    top: Math.min(a.top, b.top),
    bottom: Math.max(a.top, b.top) + MOVING_PLATFORM_HEIGHT,
  };
}

// --- Ugrás-folyosó ----------------------------------------------------------

/**
 * Mennyivel a hazard két oldalán TÚL is repül a player, amikor átugorja.
 *
 * LEVEZETETT, nem hangolt: a legszélső felszállópont a mező bal széle mínusz a test
 * félszélessége, és onnan a TEST bal éle még további félszélességgel balra van — tehát
 * összesen egy teljes testszélesség. Ugyanez a landolás oldalán.
 *
 * Ez a sáv az, amiben a player a teljes 156 px-es ugrás-magasságát bejárja, tehát ide nem
 * lóghat be szilárd lap alja (lásd `MIN_JUMP_CLEARANCE_RISE`).
 */
export const JUMP_CORRIDOR_MARGIN = PLAYER_BODY_WIDTH; // 28

// --- Enemyk -----------------------------------------------------------------

/**
 * A platformon álló enemy patrol-határainak behúzása a peremtől (a CrowHarvester
 * félszélessége 10px, a maradék a fékezési ráhagyás).
 */
export const EDGE_INSET = 24;

/**
 * Melyik lény spawnol. Elhagyva `crow-harvester` — így egy új típus bevezetése nem érinti a
 * meglévő spawn-sorokat.
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
 * Az enemy ÜLDÖZÉSI határa: meddig követheti a playert anélkül, hogy leesne vagy hazardba
 * lépne. LEVEZETETT érték, nem kézzel írt szám — egy platform elmozdítása vagy egy új
 * spike-mező automatikusan átméretezi a pórázt.
 *
 * Két korlát metszete:
 *   1. a felület (talaj-szegmens vagy platform) pereme, `EDGE_INSET`-tel behúzva;
 *   2. a spawnját tartalmazó, TÜSKEMENTES szabad sáv — a mezők elvágják a mozgásteret.
 */
export function enemyChaseBounds(
  def: EnemySpawnDef,
  level: LevelGeometry
): { min: number; max: number } {
  const surface = surfaceSpan(level, def.surfaceId);
  let min = surface.left + EDGE_INSET;
  let max = surface.right - EDGE_INSET;

  for (const field of level.spikeFields) {
    if (field.surfaceId !== def.surfaceId) continue;

    if (field.endX <= def.x) {
      min = Math.max(min, field.endX + EDGE_INSET);
    } else if (field.startX >= def.x) {
      max = Math.min(max, field.startX - EDGE_INSET);
    }
  }

  return { min, max };
}

// --- Létra ------------------------------------------------------------------

export interface LadderDef {
  id: string;
  /** A létra (és a mászási zóna) vízszintes középpontja. */
  x: number;
  /** Melyik felületről indul (a talpa itt áll). */
  fromSurfaceId: string;
  /** Melyik felületre vezet (a teteje ennek a felszínén ér véget). */
  toSurfaceId: string;
  /**
   * A MÁSZÁSI zóna szélessége — a RAJZOLT létráé (a két oldalléc külső éle között), nem a
   * 32px-es csempéé. A kettő szándékosan külön konstans, lásd `LevelTileset.LADDER_TILE_WIDTH`.
   */
  width: number;
}

// --- Tutorial feliratok -----------------------------------------------------

export interface TutorialHintDef {
  id: string;
  /** A player ezt az X-et átlépve váltja ki a feliratot (egyszer). */
  triggerX: number;
  text: string;
}

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
 * mert a LÁBNYOM ebből számítódik: a layout-tesztek ezzel bizonyítják, hogy egyetlen prop sem
 * lóg szakadékba, tüskemezőbe vagy a kasza söprési sávjába — GameObject-mock nélkül.
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

/** A prop lábnyoma a talajon — a tesztek és az ütközés-vizsgálatok ebből dolgoznak. */
export function decorPropFootprint(def: DecorPropDef): { left: number; right: number } {
  const half = PROP_ASSETS[def.texture].width / 2;
  return { left: def.x - half, right: def.x + half };
}
