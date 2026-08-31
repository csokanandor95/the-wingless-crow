// Level 3 layout invariánsok — The Beast Dungeon.
//
// Ugyanaz a szerep, mint a `level1Layout.test.ts` / `level2Layout.test.ts`-nél: a
// `Level3Layout.ts` Phaser-mentes adatmodul, ezért itt NINCS GameObject-mock — a tesztek
// magát a pálya-geometriát bizonyítják.
//
// A Level 1/2-höz képest KÉT ÚJ invariáns-család van, és mindkettő ennek a pályának a
// tézisét („padló = Beast, galéria = Gravecaller") teszi futtatható állítássá:
//
//   1. **A ROHAM KIKERÜLHETŐSÉGE.** A galéria-lapok alja MENNYEZET (a FIX ugrásmagasság
//      miatt alattuk nem lehet ugrani). Mivel egy dungeon-folyosóban a roham elől sem
//      oldalra lépni, sem elfutni nem lehet, az UGRÁS az egyetlen válasz — tehát a
//      mennyezet nem takarhat el akkora sávot, amiből a telegraph alatt nem lehet kiérni.
//   2. **GALÉRIA-SZEPARÁCIÓ.** Minden caster a saját lapján állót eltalálja, a padlón állót
//      viszont sem el nem találja, sem ÉSZRE nem veszi.
//
// Plusz egy harmadik, ami a Level 1/2-n azért nem merült fel, mert ott nem volt a szakadékok
// fölé lógó mennyezet: **szilárd lap nem lóghat egy GÖDÖR ugrás-folyosójába.** Egy 120 px-es
// gödröt 48 px emelkedés után fejjel a lapba ütközve nem lehet átugrani (a számítás ott van a
// teszt mellett) — a player egyszerűen beleesne.
import { describe, it, expect, vi } from 'vitest';
import {
  BACKDROP_PANELS,
  BEAST_CHARGE_TRAVEL_MS,
  BEAST_ESCAPE_REACH,
  BEAST_REACTION_MS,
  CHECKPOINTS,
  CHECKPOINT_ZONE,
  DECOR_PROPS,
  DOOR,
  DOOR_CHECKPOINT,
  ENEMY_SPAWNS,
  GALLERY_RISE,
  GALLERY_Y,
  GRAVECALLER_SPAWN_OFFSET,
  GROUND_SEGMENTS,
  GROUND_TOP,
  JUMP_CORRIDOR_MARGIN,
  MAX_SAFE_GAP,
  MAX_SAFE_RISE,
  MIN_JUMP_CLEARANCE_RISE,
  MIN_WALK_UNDER_RISE,
  PLATFORMS,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_HALF_HEIGHT,
  SPIKE_FIELDS,
  SPIKE_TILE_WIDTH,
  START_X,
  WORLD_WIDTH,
  buildingFootprint,
  checkpointRespawnY,
  decorPropFootprint,
  enemyChaseBounds,
  enemyHalfBodyWidth,
  enemySpawnOffset,
  enemyType,
  groundGaps,
  horizontalReachForRise,
  platformBottom,
  platformLeft,
  platformRight,
  platformTop,
  surfaceSpan,
  type PlatformDef,
  type Span,
} from '../../src/levels/Level3Layout';
import { MOVE_SPEED } from '../../src/player/Player';
import {
  CHARGE_MAX_MS as BEAST_CHARGE_MAX_MS,
  CHARGE_MIN_RANGE as BEAST_CHARGE_MIN_RANGE,
  CHARGE_SPEED as BEAST_CHARGE_SPEED,
  CHARGE_WINDUP_MS as BEAST_CHARGE_WINDUP_MS,
} from '../../src/enemies/Beast';
import {
  DETECTION_RANGE as GRAVECALLER_DETECTION_RANGE,
  PROJECTILE_SIZE as GRAVECALLER_PROJECTILE_SIZE,
  PROJECTILE_SPAWN_OFFSET_Y as GRAVECALLER_PROJECTILE_OFFSET_Y,
  VERTICAL_DETECTION_RANGE as GRAVECALLER_VERTICAL_RANGE,
} from '../../src/enemies/Gravecaller';
import { PLATFORM_TILE_HEIGHT } from '../../src/levels/LevelTileset';
import {
  ARCH_APERTURE,
  ARCH_TILE_WIDTH,
  CHURCH_BLOCK_TILE_HEIGHT,
} from '../../src/levels/ChurchTileset';
import { BUILDING_ASSETS, PROP_ASSETS, PROP_TINT_NONE } from '../../src/levels/LevelGeometry';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

// --- Segédfüggvények --------------------------------------------------------

/** Két vízszintes sáv távolsága; 0, ha átfedik egymást. */
function horizontalDistance(a: Span, b: Span): number {
  if (a.right >= b.left && b.right >= a.left) return 0;
  return a.right < b.left ? b.left - a.right : a.left - b.right;
}

function platformSpan(p: PlatformDef): Span {
  return { left: platformLeft(p), right: platformRight(p), top: platformTop(p) };
}

/** Át lehet-e ugrani az `from` felületről a `to`-ra? */
function canJump(from: Span, to: Span): boolean {
  const rise = from.top - to.top;
  if (rise > MAX_SAFE_RISE) return false;
  return horizontalDistance(from, to) <= horizontalReachForRise(rise);
}

function allSurfaces(): Map<string, Span> {
  const surfaces = new Map<string, Span>();
  for (const g of GROUND_SEGMENTS) surfaces.set(g.id, surfaceSpan(g.id));
  for (const p of PLATFORMS) surfaces.set(p.id, platformSpan(p));
  return surfaces;
}

/** Átfed-e két vízszintes sáv? (Érintkezés — közös perem — még NEM átfedés.) */
function overlaps(a: { left: number; right: number }, b: { left: number; right: number }): boolean {
  return a.left < b.right && b.left < a.right;
}

/**
 * A tüskemezők `startX`/`endX`-szel írják le magukat, a többi sáv `left`/`right`-tal. A
 * konverzió KÖTELEZŐEN explicit: egy `SpikeFieldDef`-et közvetlenül az `overlaps()`-ba adva
 * a hiányzó mezők `undefined`-ok lennének, és MINDEN összehasonlítás némán `false`-t adna —
 * vagyis a tesztek átmennének anélkül, hogy bármit ellenőriztek volna. (Pontosan ez történt
 * az első változatban; a `tsc` fogta meg, nem a vitest.)
 */
function fieldSpan(f: { startX: number; endX: number }): { left: number; right: number } {
  return { left: f.startX, right: f.endX };
}

/**
 * A hazard (tüskemező VAGY gödör) ugrás-FOLYOSÓJA: az a vízszintes sáv, amiben a player a
 * teljes ugrás-magasságát bejárja, miközben átugorja.
 */
function jumpCorridor(field: { startX: number; endX: number }): { left: number; right: number } {
  return {
    left: field.startX - JUMP_CORRIDOR_MARGIN,
    right: field.endX + JUMP_CORRIDOR_MARGIN,
  };
}

/** MENNYEZET-e a lap a talajszinten haladó player szempontjából? */
function isCeilingOverGround(p: PlatformDef): boolean {
  const rise = GROUND_TOP - platformTop(p);
  return rise >= MIN_WALK_UNDER_RISE && rise < MIN_JUMP_CLEARANCE_RISE;
}

/**
 * Azok a vízszintes sávok, ahol a padlón álló player NEM tud teljes ugrást csinálni (a
 * TESTÉVEL együtt beleérne egy mennyezetbe). Az egymást átfedő sávok összevonva.
 */
function ceilingIntervals(): Array<{ left: number; right: number }> {
  const half = PLAYER_BODY_WIDTH / 2;
  const raw = PLATFORMS.filter(isCeilingOverGround)
    .map((p) => ({ left: platformLeft(p) - half, right: platformRight(p) + half }))
    .sort((a, b) => a.left - b.left);

  const merged: Array<{ left: number; right: number }> = [];
  for (const interval of raw) {
    const last = merged[merged.length - 1];
    if (last && interval.left <= last.right) {
      last.right = Math.max(last.right, interval.right);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

// --- Világ ------------------------------------------------------------------

describe('világ', () => {
  it('érdemben rövidebb a Level 1-nél és a Level 2-nél', () => {
    // A user kérése: „legyen hosszra rövidebb, mint a Level1 vagy Level 2".
    expect(WORLD_WIDTH).toBeLessThan(6000); // Level 1
    expect(WORLD_WIDTH).toBeLessThan(7200); // Level 2
  });
});

describe('GROUND_SEGMENTS', () => {
  it('rendezettek, nem fedik egymást, és lefedik a pálya két végét', () => {
    expect(GROUND_SEGMENTS[0].startX).toBe(0);
    expect(GROUND_SEGMENTS[GROUND_SEGMENTS.length - 1].endX).toBe(WORLD_WIDTH);

    for (let i = 1; i < GROUND_SEGMENTS.length; i++) {
      expect(GROUND_SEGMENTS[i].startX).toBeGreaterThan(GROUND_SEGMENTS[i - 1].endX);
    }
  });

  it('a szegmens-id-k egyediek', () => {
    const ids = GROUND_SEGMENTS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a player a legelső szegmensen kezd', () => {
    const first = GROUND_SEGMENTS[0];
    expect(START_X).toBeGreaterThan(first.startX);
    expect(START_X).toBeLessThan(first.endX);
  });
});

describe('gödrök', () => {
  it('ÖT van, mind azonos szélességű, és mind biztonságosan átugorható', () => {
    const gaps = groundGaps();
    expect(gaps).toHaveLength(5);

    // A gödör itt nem kihívás, hanem SZAKASZHATÁR: konstans és megtanulható távolság.
    const widths = new Set(gaps.map((g) => g.width));
    expect(widths.size, 'a gödrök szélessége nem egységes').toBe(1);

    for (const gap of gaps) {
      expect(gap.width, `gap ${gap.startX}`).toBeLessThanOrEqual(MAX_SAFE_GAP);
    }
  });

  it('a gödrök TÉNYLEGESEN a karámok falai — az üldözési tér a szegmensre korlátozódik', () => {
    // Ez a pálya alapötlete: az `enemyChaseBounds()` a felület peremén megállítja a lényt,
    // tehát a Beast nem tud átjönni a szomszéd karámba a player után.
    for (const spawn of ENEMY_SPAWNS.filter((e) => enemyType(e) === 'beast')) {
      const surface = surfaceSpan(spawn.surfaceId);
      const chase = enemyChaseBounds(spawn);

      expect(chase.min).toBeGreaterThanOrEqual(surface.left);
      expect(chase.max).toBeLessThanOrEqual(surface.right);
    }
  });
});

// --- A galéria magassága (LEVEZETETT) ---------------------------------------

describe('GALLERY_RISE — a mennyezet és a menekülőút ugyanaz', () => {
  it('a padlóról FELUGORHATÓ', () => {
    expect(GALLERY_RISE).toBeLessThanOrEqual(MAX_SAFE_RISE);
  });

  it('alatta EL LEHET SÉTÁLNI', () => {
    expect(GALLERY_RISE).toBeGreaterThanOrEqual(MIN_WALK_UNDER_RISE);
  });

  it('alatta NEM lehet ugrani — ettől MENNYEZET, nem díszlet', () => {
    // Ha ez a három feltétel bármelyike sérül, a pálya elveszti a tézisét: vagy nem lehet
    // felmenekülni a roham elől (1.), vagy nem lehet a galéria alatt közlekedni (2.), vagy
    // a mennyezet nem korlátoz semmit (3.).
    expect(GALLERY_RISE).toBeLessThan(MIN_JUMP_CLEARANCE_RISE);
  });

  it('a lap y-ja a magasságból SZÁMÍTÓDIK, nem beégetett', () => {
    expect(GALLERY_Y).toBe(GROUND_TOP - GALLERY_RISE + PLATFORM_TILE_HEIGHT / 2);
  });
});

// --- Platformok -------------------------------------------------------------

describe('PLATFORMS', () => {
  it('az id-k egyediek', () => {
    const ids = PLATFORMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('MIND a galéria magasságában van — a pálya egyetlen felső szintje', () => {
    for (const p of PLATFORMS) {
      expect(p.y, p.id).toBe(GALLERY_Y);
    }
  });

  it('mind a talaj FÖLÖTT vannak, és mennyezetnek számítanak', () => {
    for (const p of PLATFORMS) {
      expect(platformTop(p), p.id).toBeLessThan(GROUND_TOP);
      expect(isCeilingOverGround(p), `${p.id} nem mennyezet`).toBe(true);
    }
  });

  it('minden lap szélessége EGÉSZ kőblokkokra jön ki', () => {
    // A `block-strip.png` két 32 px-es blokk; egy nem-32-többszörös lap az utolsó blokkot
    // félbevágná, ami a kemény falazat-élek miatt látható csonk lenne.
    const BLOCK = CHURCH_BLOCK_TILE_HEIGHT; // 32 — a blokk négyzetes
    for (const p of PLATFORMS) {
      const width = platformRight(p) - platformLeft(p);
      expect(width % BLOCK, `${p.id} szélessége ${width}`).toBe(0);
    }
  });

  it('egyetlen lap sem lóg GÖDÖR ugrás-folyosójába', () => {
    // A pálya-specifikus ÚJ invariáns. Egy 120 px-es gödör fölé lógó, +110-es lap alatt a
    // player 48 px emelkedés után beveri a fejét; onnan a teljes repülési idő ~451 ms, ami
    // `MOVE_SPEED` mellett ~90 px — KEVESEBB a 120 px-es gödörnél. A player tehát
    // egyszerűen beleesne, és a szakasz járhatatlan lenne.
    for (const gap of groundGaps()) {
      const corridor = jumpCorridor(gap);
      for (const p of PLATFORMS) {
        expect(
          overlaps({ left: platformLeft(p), right: platformRight(p) }, corridor),
          `${p.id} a ${gap.startX}..${gap.endX} gödör ugrás-folyosójába lóg`
        ).toBe(false);
      }
    }
  });

  it('egyetlen lap sem lóg tüskemező ugrás-folyosójába', () => {
    for (const field of SPIKE_FIELDS) {
      const corridor = jumpCorridor(field);
      for (const p of PLATFORMS) {
        expect(
          overlaps({ left: platformLeft(p), right: platformRight(p) }, corridor),
          `${p.id} a ${field.id} ugrás-folyosójába lóg`
        ).toBe(false);
      }
    }
  });

  it('a lapok nem fedik egymást', () => {
    for (let i = 0; i < PLATFORMS.length; i++) {
      for (let j = i + 1; j < PLATFORMS.length; j++) {
        expect(
          overlaps(
            { left: platformLeft(PLATFORMS[i]), right: platformRight(PLATFORMS[i]) },
            { left: platformLeft(PLATFORMS[j]), right: platformRight(PLATFORMS[j]) }
          ),
          `${PLATFORMS[i].id} és ${PLATFORMS[j].id} átfed`
        ).toBe(false);
      }
    }
  });
});

// --- Elérhetőség ------------------------------------------------------------

describe('elérhetőség', () => {
  it('a pálya MINDEN felülete elérhető a startról', () => {
    const surfaces = allSurfaces();
    const startId = GROUND_SEGMENTS[0].id;
    const reached = new Set<string>([startId]);
    const queue = [startId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = surfaces.get(currentId)!;

      for (const [nextId, next] of surfaces) {
        if (reached.has(nextId)) continue;
        if (!canJump(current, next)) continue;
        reached.add(nextId);
        queue.push(nextId);
      }
    }

    const unreachable = [...surfaces.keys()].filter((id) => !reached.has(id));
    expect(unreachable, `elérhetetlen felületek: ${unreachable.join(', ')}`).toEqual([]);
  });

  it('a galériák NEM láncolhatók végig — nincs ingyen „skyway"', () => {
    // A `C` szakasz galériái szándékosan láncolhatók (az a szakasz lényege), de a
    // Beast-karámokban a két lap KÖZÖTT nincs átjárás: a player nem tudja a padlót
    // megkerülve átvitorlázni a karámon.
    for (const pen of [
      ['B-gallery-L', 'B-gallery-R'],
      ['D-gallery-L', 'D-gallery-R'],
    ]) {
      const from = platformSpan(PLATFORMS.find((p) => p.id === pen[0])!);
      const to = platformSpan(PLATFORMS.find((p) => p.id === pen[1])!);
      expect(canJump(from, to), `${pen[0]} -> ${pen[1]} átugorható`).toBe(false);
    }
  });

  it('a C szakasz galériái VISZONT láncolhatók — ez a szakasz útvonala', () => {
    const chain = ['C-gallery-1', 'C-gallery-2', 'C-gallery-3'];
    for (let i = 1; i < chain.length; i++) {
      const from = platformSpan(PLATFORMS.find((p) => p.id === chain[i - 1])!);
      const to = platformSpan(PLATFORMS.find((p) => p.id === chain[i])!);
      expect(canJump(from, to), `${chain[i - 1]} -> ${chain[i]}`).toBe(true);
    }
  });
});

// --- A ROHAM KIKERÜLHETŐSÉGE (ÚJ invariáns-család) --------------------------

describe('a Beast rohama MINDIG kikerülhető', () => {
  const beasts = ENEMY_SPAWNS.filter((e) => enemyType(e) === 'beast');

  it('HÁROM Beast van — a pálya a fajta bemutatója', () => {
    expect(beasts).toHaveLength(3);
  });

  it('a menekülési hatótáv a Beast konstansaiból SZÁMÍTÓDIK', () => {
    expect(BEAST_ESCAPE_REACH).toBe(
      ((BEAST_CHARGE_WINDUP_MS - BEAST_REACTION_MS) * MOVE_SPEED) / 1000
    );
    // A levezetés KONZERVATÍV: a roham repülési idejét (~562 ms, +112 px mozgástér) nem
    // számoljuk bele. Ez a tartalék MÉRT, nem remélt.
    expect(BEAST_CHARGE_TRAVEL_MS).toBeCloseTo(
      (BEAST_CHARGE_MIN_RANGE / BEAST_CHARGE_SPEED) * 1000
    );
    expect(BEAST_CHARGE_TRAVEL_MS).toBeGreaterThan(0);
  });

  it('egyetlen mennyezet-sáv sem szélesebb a menekülési hatótáv kétszeresénél', () => {
    // A pálya legfontosabb fairness-invariánsa. A mennyezet alatt a player nem tud ugrani,
    // és a rohamot ELFUTNI sem lehet (CHARGE_SPEED 320 > MOVE_SPEED 200), oldalra lépni
    // pedig egy 1D-s folyosóban nincs hova. Marad a nyíláshoz futás — a legrosszabb eset
    // egy sáv KÖZEPE, onnan a fél sávszélességet kell megtenni.
    for (const interval of ceilingIntervals()) {
      const width = interval.right - interval.left;
      expect(
        width / 2,
        `a ${interval.left}..${interval.right} mennyezet-sáv közepéről nem lehet kiérni`
      ).toBeLessThanOrEqual(BEAST_ESCAPE_REACH);
    }
  });

  it('minden Beast-karámban van szabad ég a folyosó MINDKÉT végén', () => {
    // Enélkül a sarokba szorított player a mennyezet alatt kapná a rohamot, és a fenti
    // sáv-szabály önmagában megengedné (a menekülés a sarok FELÉ mutatna, ahol a Beast áll).
    const ceilings = ceilingIntervals();
    const covered = (x: number): boolean =>
      ceilings.some((c) => c.left <= x && x <= c.right);

    for (const beast of beasts) {
      const chase = enemyChaseBounds(beast);
      expect(covered(chase.min), `${beast.id}: a folyosó BAL vége mennyezet alatt van`).toBe(false);
      expect(covered(chase.max), `${beast.id}: a folyosó JOBB vége mennyezet alatt van`).toBe(false);
    }
  });

  it('minden Beast-karám elég hosszú a rohamhoz, de nincs benne hova elfutni', () => {
    const chargeDistance = (BEAST_CHARGE_MAX_MS * BEAST_CHARGE_SPEED) / 1000; // 288

    for (const beast of beasts) {
      const chase = enemyChaseBounds(beast);
      const corridor = chase.max - chase.min;

      // Elfér a roham...
      expect(corridor, `${beast.id}: a folyosó rövidebb a rohamnál`).toBeGreaterThan(
        chargeDistance
      );
      // ...és a lény el is tudja indítani (a `CHARGE_MIN_RANGE`-nyi távolság megvan).
      expect(corridor, `${beast.id}`).toBeGreaterThan(BEAST_CHARGE_MIN_RANGE);
      // ...de a karám ZÁRT: nincs benne 600 px-nyi menekülő-folyosó.
      expect(corridor, `${beast.id}: a karám túl tágas, el lehet futni a roham elől`).toBeLessThan(
        600
      );
    }
  });

  it('a Beastek a PADLÓN állnak, nem galérián — a galéria a playeré', () => {
    for (const beast of beasts) {
      expect(
        GROUND_SEGMENTS.some((g) => g.id === beast.surfaceId),
        `${beast.id} nem talaj-szegmensen áll`
      ).toBe(true);
    }
  });
});

// --- GALÉRIA-SZEPARÁCIÓ (ÚJ invariáns-család) -------------------------------

describe('galéria-szeparáció: padló = Beast, galéria = Gravecaller', () => {
  const casters = ENEMY_SPAWNS.filter((e) => enemyType(e) === 'gravecaller');

  const casterCenterY = (surfaceId: string): number =>
    surfaceSpan(surfaceId).top - GRAVECALLER_SPAWN_OFFSET;

  const projectileBand = (surfaceId: string) => {
    const center = casterCenterY(surfaceId) + GRAVECALLER_PROJECTILE_OFFSET_Y;
    return {
      top: center - GRAVECALLER_PROJECTILE_SIZE / 2,
      bottom: center + GRAVECALLER_PROJECTILE_SIZE / 2,
    };
  };

  /** A `top` tetejű felületen álló player teste. */
  const standingBody = (top: number) => ({ top: top - PLAYER_BODY_HEIGHT, bottom: top });

  const bandOverlap = (
    a: { top: number; bottom: number },
    b: { top: number; bottom: number }
  ): number => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

  it('MINDEN caster galéria-lapon áll', () => {
    expect(casters.length).toBeGreaterThan(0);
    for (const caster of casters) {
      expect(
        PLATFORMS.some((p) => p.id === caster.surfaceId),
        `${caster.id} nem galérián áll (${caster.surfaceId})`
      ).toBe(true);
    }
  });

  it('a bolt ELTALÁLJA a SAJÁT lapján álló playert', () => {
    for (const caster of casters) {
      const bolt = projectileBand(caster.surfaceId);
      const body = standingBody(surfaceSpan(caster.surfaceId).top);

      expect(
        bandOverlap(bolt, body),
        `${caster.id}: a bolt elmegy a saját lapján álló player mellett`
      ).toBeGreaterThan(0);
    }
  });

  it('a bolt NEM találja el a PADLÓN álló playert', () => {
    for (const caster of casters) {
      const bolt = projectileBand(caster.surfaceId);
      const body = standingBody(GROUND_TOP);

      expect(
        bandOverlap(bolt, body),
        `${caster.id}: a bolt a padlón álló playert is eltalálja`
      ).toBeLessThanOrEqual(0);
    }
  });

  it('a caster ÉSZRE SEM veszi a padlón álló playert', () => {
    // Ez az erősebb állítás: nem elég, hogy a bolt elmegy mellette — a lény el se kezdjen
    // castolni. Enélkül a galériákról folyamatos, sosem találó tűz zúdulna a padlóra, ami
    // hamis fenyegetés lenne (a Level 1 `E2`-hibájának osztálya).
    const floorPlayerCenterY = GROUND_TOP - PLAYER_HALF_HEIGHT;

    for (const caster of casters) {
      const distance = Math.abs(casterCenterY(caster.surfaceId) - floorPlayerCenterY);
      expect(
        distance,
        `${caster.id}: a padlón álló player a vertikális detektálási sávjában van`
      ).toBeGreaterThan(GRAVECALLER_VERTICAL_RANGE);
    }
  });

  it('minden caster a SAJÁT lapja teljes hosszát tűz alatt tartja', () => {
    // A galériára felugró playernek AZONNAL számítania kell a tűzre — a lap nem lehet
    // részben biztonságos.
    for (const caster of casters) {
      const span = surfaceSpan(caster.surfaceId);
      const worstCase = Math.max(
        Math.abs(caster.patrolMaxX - span.left),
        Math.abs(caster.patrolMinX - span.right)
      );

      expect(worstCase, `${caster.id}: a saját lapja végét nem éri el`).toBeLessThanOrEqual(
        GRAVECALLER_DETECTION_RANGE
      );
    }
  });
});

// --- Tüskemezők -------------------------------------------------------------

describe('SPIKE_FIELDS', () => {
  it('az id-k egyediek, és minden mező egész csempékből áll', () => {
    const ids = SPIKE_FIELDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const field of SPIKE_FIELDS) {
      expect((field.endX - field.startX) % SPIKE_TILE_WIDTH, field.id).toBe(0);
    }
  });

  it('minden mező a saját talaj-szegmensén BELÜL van', () => {
    for (const field of SPIKE_FIELDS) {
      const surface = surfaceSpan(field.surfaceId);
      expect(field.startX, field.id).toBeGreaterThanOrEqual(surface.left);
      expect(field.endX, field.id).toBeLessThanOrEqual(surface.right);
    }
  });

  it('mindegyik ÁTUGORHATÓ — a player TESTÉNEK is át kell érnie', () => {
    for (const field of SPIKE_FIELDS) {
      const span = field.endX - field.startX + PLAYER_BODY_WIDTH;
      expect(span, field.id).toBeLessThanOrEqual(MAX_SAFE_GAP);
    }
  });

  it('a C szakasz mezői a galéria-lapok HÉZAGAI alatt vannak', () => {
    // A Level 2 `G` szakaszának elve: a felső útvonalnak legyen TÉTJE. Egy elvétett
    // hézag-ugrás pont a tüskékre visz, nem üres padlóra.
    const cGalleries = PLATFORMS.filter((p) => p.id.startsWith('C-gallery')).sort(
      (a, b) => a.x - b.x
    );
    const gaps: Array<{ left: number; right: number }> = [];
    for (let i = 1; i < cGalleries.length; i++) {
      gaps.push({
        left: platformRight(cGalleries[i - 1]),
        right: platformLeft(cGalleries[i]),
      });
    }

    for (const field of SPIKE_FIELDS.filter((f) => f.id.startsWith('C-'))) {
      const corridor = jumpCorridor(field);
      const inside = gaps.some((g) => g.left <= corridor.left && corridor.right <= g.right);
      expect(inside, `${field.id} nem fér el egyetlen galéria-hézag alatt sem`).toBe(true);
    }
  });

  it('a Beast-karámokban NINCS tüskemező', () => {
    // Egy mező az `enemyChaseBounds()`-on át elvágná a roham-folyosót, és a karám elveszítené
    // a lényegét. A hazard a `C`/`E` szakaszoké, a Beast a `B`/`D`/`F`-é.
    const beastSurfaces = new Set(
      ENEMY_SPAWNS.filter((e) => enemyType(e) === 'beast').map((e) => e.surfaceId)
    );
    for (const field of SPIKE_FIELDS) {
      expect(beastSurfaces.has(field.surfaceId), `${field.id} Beast-karámban van`).toBe(false);
    }
  });
});

// --- Enemyk -----------------------------------------------------------------

describe('ENEMY_SPAWNS', () => {
  it('az id-k egyediek, és a spawn a patrol-tartományon belül van', () => {
    const ids = ENEMY_SPAWNS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const enemy of ENEMY_SPAWNS) {
      expect(enemy.patrolMinX, enemy.id).toBeLessThan(enemy.patrolMaxX);
      expect(enemy.x, enemy.id).toBeGreaterThanOrEqual(enemy.patrolMinX);
      expect(enemy.x, enemy.id).toBeLessThanOrEqual(enemy.patrolMaxX);
    }
  });

  it('5 CrowHarvester + 6 Gravecaller + 3 Beast', () => {
    const byType = (t: string) => ENEMY_SPAWNS.filter((e) => enemyType(e) === t).length;
    expect(byType('crow-harvester')).toBe(5);
    expect(byType('gravecaller')).toBe(6);
    expect(byType('beast')).toBe(3);
  });

  it('sűrűbb, mint a Level 2 — rövidebb pálya, több ellenfél/px', () => {
    // Level 2: 15 lény / 7200 px. A user kérése szerint a Level 3 „sűrűbb".
    expect(ENEMY_SPAWNS.length / WORLD_WIDTH).toBeGreaterThan(15 / 7200);
  });

  it('egyetlen patrol-tartomány sem lóg le a felületéről (a TESTTEL együtt)', () => {
    for (const enemy of ENEMY_SPAWNS) {
      const surface = surfaceSpan(enemy.surfaceId);
      const half = enemyHalfBodyWidth(enemy);

      expect(enemy.patrolMinX - half, `${enemy.id} bal`).toBeGreaterThanOrEqual(surface.left);
      expect(enemy.patrolMaxX + half, `${enemy.id} jobb`).toBeLessThanOrEqual(surface.right);
    }
  });

  it('az üldözési határ TARTALMAZZA a patrolt, és a felületen BELÜL marad', () => {
    for (const enemy of ENEMY_SPAWNS) {
      const surface = surfaceSpan(enemy.surfaceId);
      const chase = enemyChaseBounds(enemy);

      expect(chase.min, `${enemy.id}`).toBeLessThanOrEqual(enemy.patrolMinX);
      expect(chase.max, `${enemy.id}`).toBeGreaterThanOrEqual(enemy.patrolMaxX);
      expect(chase.min, `${enemy.id}`).toBeGreaterThanOrEqual(surface.left);
      expect(chase.max, `${enemy.id}`).toBeLessThanOrEqual(surface.right);
    }
  });

  it('sem a patrol, sem az ÜLDÖZÉS nem enged tüskébe lépni', () => {
    for (const enemy of ENEMY_SPAWNS) {
      const chase = enemyChaseBounds(enemy);
      const half = enemyHalfBodyWidth(enemy);

      for (const field of SPIKE_FIELDS) {
        if (field.surfaceId !== enemy.surfaceId) continue;
        expect(
          overlaps({ left: chase.min - half, right: chase.max + half }, fieldSpan(field)),
          `${enemy.id} beleér a(z) ${field.id} mezőbe`
        ).toBe(false);
      }
    }
  });

  it('a spawn Y a felület felszínéből és a típus talp-offsetjéből származik', () => {
    for (const enemy of ENEMY_SPAWNS) {
      const offset = enemySpawnOffset(enemy);
      expect(offset, enemy.id).toBeGreaterThan(0);
      // A spawn a felszín FÖLÉ kerül, nem alá.
      expect(surfaceSpan(enemy.surfaceId).top - offset, enemy.id).toBeLessThan(
        surfaceSpan(enemy.surfaceId).top
      );
    }
  });
});

// --- Checkpointok -----------------------------------------------------------

describe('CHECKPOINTS', () => {
  it('EGYETLEN köztes checkpoint van, létező felületen', () => {
    expect(CHECKPOINTS).toHaveLength(1);

    for (const cp of CHECKPOINTS) {
      const surface = surfaceSpan(cp.surfaceId);
      const half = CHECKPOINT_ZONE.width / 2;
      expect(cp.x - half, cp.id).toBeGreaterThanOrEqual(surface.left);
      expect(cp.x + half, cp.id).toBeLessThanOrEqual(surface.right);
      expect(checkpointRespawnY(cp)).toBe(surface.top - PLAYER_HALF_HEIGHT);
    }
  });

  it('nem tüskemezőn éled újra', () => {
    for (const cp of CHECKPOINTS) {
      const half = CHECKPOINT_ZONE.width / 2;
      for (const field of SPIKE_FIELDS) {
        if (field.surfaceId !== cp.surfaceId) continue;
        expect(
          overlaps({ left: cp.x - half, right: cp.x + half }, fieldSpan(field)),
          `${cp.id} a ${field.id} mezőn áll`
        ).toBe(false);
      }
    }
  });

  it('MINDKÉT korábbi Beast-karámot maga mögött hagyja', () => {
    // A checkpoint helye nem szabad: ez az EGYETLEN köztes mentés, tehát oda kell tenni,
    // ahol a legtöbb teljesített szakaszt bankolja.
    const cp = CHECKPOINTS[0];
    const beastsBefore = ENEMY_SPAWNS.filter(
      (e) => enemyType(e) === 'beast' && e.x < cp.x
    );
    expect(beastsBefore.map((b) => b.id)).toEqual(['B-beast-1', 'D-beast-1']);
  });
});

// --- Boss-ajtó --------------------------------------------------------------

describe('boss-ajtó', () => {
  const left = DOOR.x - ARCH_TILE_WIDTH / 2;
  const right = DOOR.x + ARCH_TILE_WIDTH / 2;

  it('a PADLÓN áll, az utolsó szegmens jobb végén', () => {
    const surface = surfaceSpan(DOOR.surfaceId);
    expect(GROUND_SEGMENTS.some((g) => g.id === DOOR.surfaceId)).toBe(true);
    expect(left).toBeGreaterThanOrEqual(surface.left);
    expect(right).toBeLessThanOrEqual(surface.right);
    expect(right).toBeLessThanOrEqual(WORLD_WIDTH);
  });

  it('a nyílásán átfér a player', () => {
    expect(ARCH_APERTURE.width).toBeGreaterThan(PLAYER_BODY_WIDTH);
    expect(ARCH_APERTURE.height).toBeGreaterThan(PLAYER_BODY_HEIGHT);
  });

  it('egyetlen galéria-lap sem takarja a boltívet', () => {
    // A 128 px magas kapu teteje a galéria-lapok alja FÖLÉ nyúlik, a lap viszont
    // TERRAIN_DEPTH-en (-5) van, az ajtó DOOR_DEPTH-en (-6) — tehát a lap kitakarná.
    for (const p of PLATFORMS) {
      expect(
        overlaps({ left: platformLeft(p), right: platformRight(p) }, { left, right }),
        `${p.id} takarja a boltívet`
      ).toBe(false);
    }
  });

  it('az ajtó-checkpointon a player a padlón áll, az ajtón KÍVÜL', () => {
    expect(DOOR_CHECKPOINT.y).toBe(surfaceSpan(DOOR.surfaceId).top - PLAYER_HALF_HEIGHT);
    expect(DOOR_CHECKPOINT.x).toBeLessThan(left);
  });
});

// --- Díszlet ----------------------------------------------------------------

describe('BACKDROP_PANELS', () => {
  it('minden id egyedi', () => {
    const ids = BACKDROP_PANELS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('minden panel EGYETLEN talaj-szegmensen belül áll', () => {
    for (const panel of BACKDROP_PANELS) {
      const surface = surfaceSpan(panel.surfaceId);
      const { left, right } = buildingFootprint(panel);
      expect(left, panel.id).toBeGreaterThanOrEqual(surface.left);
      expect(right, panel.id).toBeLessThanOrEqual(surface.right);
    }
  });

  it('egyetlen panel sem takar tüskemezőt', () => {
    for (const panel of BACKDROP_PANELS) {
      const footprint = buildingFootprint(panel);
      for (const field of SPIKE_FIELDS) {
        expect(
          overlaps(footprint, fieldSpan(field)),
          `${panel.id} takarja a(z) ${field.id} mezőt`
        ).toBe(false);
      }
    }
  });

  it('egyetlen panel sem takarja a checkpointot vagy az ajtót', () => {
    const blockers = [
      ...CHECKPOINTS.map((cp) => ({
        id: cp.id,
        left: cp.x - CHECKPOINT_ZONE.width / 2,
        right: cp.x + CHECKPOINT_ZONE.width / 2,
      })),
      {
        id: 'DOOR',
        left: DOOR.x - ARCH_TILE_WIDTH / 2,
        right: DOOR.x + ARCH_TILE_WIDTH / 2,
      },
    ];

    for (const panel of BACKDROP_PANELS) {
      const footprint = buildingFootprint(panel);
      for (const blocker of blockers) {
        expect(overlaps(footprint, blocker), `${panel.id} takarja: ${blocker.id}`).toBe(false);
      }
    }
  });

  it('a panelek NEM fedik egymást', () => {
    // A Level 2 házaival szemben ezek a panelek TELJESEN ÁTLÁTSZATLANOK (a keretük a
    // háttérszín), tehát két egymásra csúszó panel közül az egyik egyszerűen eltűnne — nem
    // rétegződne, mint két sziluett.
    for (let i = 0; i < BACKDROP_PANELS.length; i++) {
      for (let j = i + 1; j < BACKDROP_PANELS.length; j++) {
        expect(
          overlaps(buildingFootprint(BACKDROP_PANELS[i]), buildingFootprint(BACKDROP_PANELS[j])),
          `${BACKDROP_PANELS[i].id} és ${BACKDROP_PANELS[j].id} átfed`
        ).toBe(false);
      }
    }
  });

  it('mind a `backgrounds.png` 192 px-es panel-magasságát használja (a `column.png` kivételével)', () => {
    for (const panel of BACKDROP_PANELS) {
      const asset = BUILDING_ASSETS[panel.texture];
      expect(asset.height, panel.id).toBeGreaterThanOrEqual(190);
      expect(asset.height, panel.id).toBeLessThanOrEqual(192);
    }
  });
});

describe('DECOR_PROPS', () => {
  it('minden id egyedi, és minden prop a SAJÁT felületén belül áll', () => {
    const ids = DECOR_PROPS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const prop of DECOR_PROPS) {
      const surface = surfaceSpan(prop.surfaceId);
      const { left, right } = decorPropFootprint(prop);
      expect(left, prop.id).toBeGreaterThanOrEqual(surface.left);
      expect(right, prop.id).toBeLessThanOrEqual(surface.right);
    }
  });

  it('minden prop tint NÉLKÜL megy ki — a Level 3 a saját csomagjuk palettája', () => {
    for (const prop of DECOR_PROPS) {
      expect(prop.tint, prop.id).toBe(PROP_TINT_NONE);
    }
  });

  it('egyetlen prop sem takar tüskemezőt', () => {
    for (const prop of DECOR_PROPS) {
      const footprint = decorPropFootprint(prop);
      for (const field of SPIKE_FIELDS) {
        expect(overlaps(footprint, fieldSpan(field)), `${prop.id} takarja: ${field.id}`).toBe(false);
      }
    }
  });

  it('egyetlen prop sem nő bele a fölötte lévő galéria aljába', () => {
    for (const prop of DECOR_PROPS) {
      const footprint = decorPropFootprint(prop);
      const propTop = surfaceSpan(prop.surfaceId).top - PROP_ASSETS[prop.texture].height;

      for (const platform of PLATFORMS) {
        const overlapsX = overlaps(footprint, {
          left: platformLeft(platform),
          right: platformRight(platform),
        });
        if (!overlapsX) continue;

        expect(
          propTop,
          `${prop.id} belenő a(z) ${platform.id} aljába`
        ).toBeGreaterThanOrEqual(platformBottom(platform));
      }
    }
  });
});
