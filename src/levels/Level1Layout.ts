import { GRAVITY_Y } from '../config/physics';
import { JUMP_VELOCITY, MOVE_SPEED } from '../player/Player';
import { BODY_WIDTH as PLAYER_BODY_WIDTH } from '../player/PlayerAnimations';
import { BODY_WIDTH as HARVESTER_BODY_WIDTH } from '../enemies/CrowHarvesterAnimations';

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

/** A ground-placeholder 64x32, origin 0.5 -> a felszíne a középpont - 16. */
export const GROUND_CENTER_Y = 434;
export const GROUND_TOP = GROUND_CENTER_Y - 16; // 418
export const GROUND_TILE_HEIGHT = 32;

/**
 * A player talpa a `sprite.y + 24`-nél van (PlayerAnimations.ORIGIN_Y). Minden "álló player
 * középpontja egy felületen" számítás ebből dolgozik (létra topY/bottomY, checkpointok).
 */
export const PLAYER_HALF_HEIGHT = 24;

/** A CrowHarvester talpa a `sprite.y + 23`-nál van -> 24 egy 1px-es ejtést ad spawnkor. */
export const HARVESTER_SPAWN_OFFSET = 24;

/**
 * A TESTEK szélessége — nem csak a középpontokkal kell tervezni. Az ugrás-számítások és a
 * patrol-határok is ezekre támaszkodnak: egy szakadékot a player TESTÉNEK kell átérnie, és
 * egy enemy TESTE sem lóghat le a peremen. Az animációs modulokból jönnek, hogy egy
 * sprite-csere ne hagyja itt a régi számot.
 */
export { PLAYER_BODY_WIDTH, HARVESTER_BODY_WIDTH };
export const HARVESTER_HALF_BODY_WIDTH = HARVESTER_BODY_WIDTH / 2;

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
  { id: 'G1', startX: 0, endX: 1660 }, // A (start) + B (első enemy)
  { id: 'G2', startX: 1820, endX: 2260 }, // C — gap1 mögött
  { id: 'G3', startX: 2420, endX: 3120 }, // D (spike-tutorial) + köztes checkpoint
  { id: 'G4', startX: 3250, endX: 4300 }, // E (kombinált kihívás)
  { id: 'G5', startX: 4700, endX: WORLD_WIDTH }, // F vége + G (záró harc) + H (boss-ajtó)
];

// --- Platformok -------------------------------------------------------------

export interface PlatformDef {
  id: string;
  /** A sprite középpontja. */
  x: number;
  y: number;
  /** Szélesség 64px-es csempékben (platform-placeholder 64x16, setScale(tiles, 1)). */
  tiles: number;
  /** Alulról átjárható (a létra ezen megy át), felülről szilárd. */
  oneWay?: boolean;
}

export const PLATFORMS: PlatformDef[] = [
  // --- A: mozgás-tutorial (veszélytelen) ---
  { id: 'A1', x: 380, y: 350, tiles: 3 }, // első ugrás a talajról
  { id: 'A2', x: 620, y: 292, tiles: 2 }, // magasabb lépés
  { id: 'A3', x: 830, y: 340, tiles: 2 }, // visszalépcső a talajra

  // --- C: első platforming-kihívás ---
  { id: 'C1', x: 1740, y: 356, tiles: 1 }, // lépőkő a gap1-ben (alternatív útvonal)
  { id: 'C2', x: 1960, y: 330, tiles: 2 },
  { id: 'C3', x: 2140, y: 268, tiles: 2 }, // a szakasz csúcspontja

  // --- E: kombinált kihívás (harc + platforming) ---
  { id: 'E1', x: 3190, y: 352, tiles: 1 }, // lépőkő a gap3-ban
  { id: 'E2', x: 3420, y: 316, tiles: 3 }, // platform-enemy
  { id: 'E3', x: 3700, y: 250, tiles: 2 },
  { id: 'E4', x: 3960, y: 210, tiles: 3 }, // elevated platform, platform-enemy
  { id: 'E5', x: 4180, y: 300, tiles: 2 }, // ereszkedés a gap4 elé

  // --- F: a Swinging Reaper alatti középső platform (a 400px-es gap4 áthidalása) ---
  { id: 'F1', x: 4500, y: 340, tiles: 2 },

  // --- H: boss-ajtó ---
  { id: 'H1', x: 5700, y: 140, tiles: 6, oneWay: true }, // a létra célja, az ajtó ezen áll
];

// --- Geometria-helperek -----------------------------------------------------

/** A platform felszíne (a placeholder 16px magas, origin 0.5). */
export const platformTop = (p: PlatformDef): number => p.y - 8;
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
  { id: 'D-spikes', startX: 2740, endX: 2868, surfaceId: 'G3' },
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

export interface EnemySpawnDef {
  id: string;
  /** Spawn X. A spawn Y a `surfaceId` felszínéből számítódik. */
  x: number;
  /** Ground szegmens VAGY platform id — lásd `surfaceSpan()`. */
  surfaceId: string;
  patrolMinX: number;
  patrolMaxX: number;
}

/**
 * MINDEN enemy explicit patrol-határt kap (és a scene mindnek `clampChaseToBounds: true`-t
 * ad) — nem csak a platformon állók, mint a szakadékok bevezetése előtt. Enélkül egy üldöző
 * földi enemy lesétálna a szakadék peremén, a D szakaszban pedig belesétálna a tüskékbe.
 */
export const ENEMY_SPAWNS: EnemySpawnDef[] = [
  // B — az első, magányos enemy: tágas, sík terep a harc megtanulásához.
  { id: 'B-1', x: 1250, surfaceId: 'G1', patrolMinX: 1120, patrolMaxX: 1400 },

  // D — a spike-mező ELŐTT áll, a határa nem éri el a tüskéket (lásd SPIKE_FIELDS,
  // 2. iteráció): így a spec "CrowHarvester does not walk into spikes" pontja
  // enemy-kódváltozás nélkül teljesül.
  { id: 'D-1', x: 2560, surfaceId: 'G3', patrolMinX: 2460, patrolMaxX: 2700 },

  // E — kombinált kihívás: két földi + két platformon álló.
  { id: 'E-ground-1', x: 3350, surfaceId: 'G4', patrolMinX: 3280, patrolMaxX: 3460 },
  { id: 'E-platform-1', x: 3420, surfaceId: 'E2', patrolMinX: 3348, patrolMaxX: 3492 },
  { id: 'E-platform-2', x: 3960, surfaceId: 'E4', patrolMinX: 3888, patrolMaxX: 4032 },
  { id: 'E-ground-2', x: 4120, surfaceId: 'G4', patrolMinX: 4030, patrolMaxX: 4210 },

  // G — a létrát őrző pár, a boss-ajtó előtti utolsó harc.
  { id: 'G-1', x: 5050, surfaceId: 'G5', patrolMinX: 4930, patrolMaxX: 5170 },
  { id: 'G-2', x: 5350, surfaceId: 'G5', patrolMinX: 5230, patrolMaxX: 5470 },
];

// --- Létra / ajtó / checkpointok --------------------------------------------

export const LADDER = {
  x: 5570, // a H1 (oneWay) platform bal fele alatt: a player alulról átmászik rajta
  zoneTop: 100,
  width: 28,
} as const;

export const DOOR = {
  x: 5840,
  width: 48,
  height: 72,
} as const;

/** A pálya végi (ajtó-)checkpoint: E-re aktiválódik, és egyben a boss-átmenet. */
export const DOOR_CHECKPOINT = {
  x: 5810, // az ajtótól kicsit balra, hogy ne a grafikájában éledjen újra a player
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
