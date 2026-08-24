// Level 1 layout invariánsok (Level 1 Redesign, 1. iteráció).
//
// A Level1Layout.ts szándékosan Phaser-mentes adatmodul, ezért itt NINCS GameObject-mock:
// a tesztek magát a pálya-geometriát bizonyítják. Ez a pálya "fordítója" — a layout-spec
// elfogadási kritériumai ("All platforms are reachable", "no enemy walks into a hazard")
// itt válnak futtatható állítássá, nem manuális végigjátszás kérdésévé.
//
// Ha egy jövőbeli hangolás (platform elmozdítása, szakadék szélesítése, Player
// JUMP_VELOCITY/MOVE_SPEED változtatása) játszhatatlanná tenné a pályát, ezek a tesztek
// buknak — ugyanaz a szerep, mint a parallaxBackground.test.ts réteg-invariánsainál.
import { describe, it, expect, vi } from 'vitest';
import {
  DOOR,
  DOOR_CHECKPOINT,
  ENEMY_SPAWNS,
  enemyChaseBounds,
  FALL_DEATH_Y,
  FALL_DEPTH,
  GROUND_SEGMENTS,
  GROUND_TOP,
  groundGaps,
  HARVESTER_HALF_BODY_WIDTH,
  horizontalReachForRise,
  LADDER,
  MAX_JUMP_DISTANCE,
  MAX_JUMP_HEIGHT,
  MAX_SAFE_GAP,
  MAX_SAFE_RISE,
  MID_CHECKPOINT,
  PLATFORMS,
  PLAYER_BODY_WIDTH,
  PLAYER_HALF_HEIGHT,
  platformById,
  platformLeft,
  platformRight,
  platformTop,
  REAPER_ENEMY_CLEARANCE,
  REAPERS,
  reaperSweep,
  SPIKE_FIELDS,
  SPIKE_TILE_WIDTH,
  START_X,
  surfaceSpan,
  TUTORIAL_HINTS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type PlatformDef,
  type Span,
} from '../../src/levels/Level1Layout';
import {
  DOOR_HEADER_HEIGHT,
  DOOR_OPENING_HEIGHT,
  DOOR_THRESHOLD_PX,
  DOOR_TILE_HEIGHT,
  GROUND_EDGE_WIDTH,
  LADDER_TILE_WIDTH,
  PLATFORM_TILE_HEIGHT,
} from '../../src/levels/LevelTileset';

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

/** Egy platform vagy talaj-szegmens felülete egységes alakban. */
function platformSpan(p: PlatformDef): Span {
  return { left: platformLeft(p), right: platformRight(p), top: platformTop(p) };
}

function allSurfaces(): Map<string, Span> {
  const surfaces = new Map<string, Span>();
  for (const g of GROUND_SEGMENTS) surfaces.set(g.id, surfaceSpan(g.id));
  for (const p of PLATFORMS) surfaces.set(p.id, platformSpan(p));
  return surfaces;
}

/**
 * Át lehet-e ugrani az `from` felületről a `to` felületre? Az emelkedést a biztonsági
 * plafon (MAX_SAFE_RISE) korlátozza, a vízszintes távolságot pedig az ADOTT emelkedéshez
 * tartozó tényleges ballisztikai hatótáv — magasabbra ugorva rövidebbet lehet ugrani.
 */
function canJump(from: Span, to: Span): boolean {
  const rise = from.top - to.top; // pozitív: a cél FELJEBB van
  if (rise > MAX_SAFE_RISE) return false;
  return horizontalDistance(from, to) <= horizontalReachForRise(rise);
}

// --- Levezetett fizikai plafon ----------------------------------------------

describe('ugrás-plafon (a Player konstansaiból levezetve)', () => {
  it('a max ugrásmagasság és -távolság a várt érték', () => {
    // JUMP_VELOCITY -500, GRAVITY_Y 800, MOVE_SPEED 200
    expect(MAX_JUMP_HEIGHT).toBeCloseTo(156.25, 2);
    expect(MAX_JUMP_DISTANCE).toBeCloseTo(250, 2);
  });

  it('horizontalReachForRise: emelkedés nélkül a teljes ugrástáv', () => {
    expect(horizontalReachForRise(0)).toBeCloseTo(MAX_JUMP_DISTANCE, 2);
  });

  it('horizontalReachForRise: minél magasabbra kell ugrani, annál rövidebbet lehet', () => {
    expect(horizontalReachForRise(80)).toBeLessThan(horizontalReachForRise(0));
    expect(horizontalReachForRise(150)).toBeLessThan(horizontalReachForRise(80));
  });

  it('horizontalReachForRise: ereszkedve tovább repül', () => {
    expect(horizontalReachForRise(-100)).toBeGreaterThan(MAX_JUMP_DISTANCE);
  });

  it('horizontalReachForRise: a teljesíthetetlen emelkedés 0', () => {
    expect(horizontalReachForRise(MAX_JUMP_HEIGHT + 50)).toBe(0);
  });
});

// --- Talaj-szegmensek és szakadékok -----------------------------------------

describe('GROUND_SEGMENTS', () => {
  it('rendezettek, nem fedik egymást, és lefedik a pálya két végét', () => {
    expect(GROUND_SEGMENTS[0].startX).toBe(0);
    expect(GROUND_SEGMENTS[GROUND_SEGMENTS.length - 1].endX).toBe(WORLD_WIDTH);

    for (let i = 0; i < GROUND_SEGMENTS.length; i++) {
      expect(GROUND_SEGMENTS[i].endX).toBeGreaterThan(GROUND_SEGMENTS[i].startX);
      if (i > 0) {
        expect(GROUND_SEGMENTS[i].startX).toBeGreaterThan(GROUND_SEGMENTS[i - 1].endX);
      }
    }
  });

  it('a szegmens-id-k egyediek', () => {
    const ids = GROUND_SEGMENTS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a player a legelső szegmensen kezd', () => {
    const first = GROUND_SEGMENTS[0];
    expect(START_X).toBeGreaterThanOrEqual(first.startX);
    expect(START_X).toBeLessThanOrEqual(first.endX);
  });

  it('mindegyik szegmensre elfér a két végzáró csempe', () => {
    // A scene a szegmens BELSŐ peremére rajzolja a 16px-es végzárókat. Egy ennél keskenyebb
    // szegmensen a kettő egymásra csúszna, és a szakadék pereme rosszul olvasna.
    for (const segment of GROUND_SEGMENTS) {
      expect(
        segment.endX - segment.startX,
        `${segment.id} keskenyebb a két végzárónál`
      ).toBeGreaterThanOrEqual(2 * GROUND_EDGE_WIDTH);
    }
  });
});

describe('szakadékok', () => {
  it('a szegmensek közötti hézagokból származnak', () => {
    const gaps = groundGaps();
    expect(gaps.length).toBe(GROUND_SEGMENTS.length - 1);

    for (const gap of gaps) {
      expect(gap.width).toBe(gap.endX - gap.startX);
      expect(gap.width).toBeGreaterThan(0);
    }
  });

  it('mindegyik átjutható — közvetlen ugrással vagy a benne álló platformok LÁNCÁN', () => {
    for (const gap of groundGaps()) {
      if (gap.width <= MAX_SAFE_GAP) continue;

      // Szélesebb szakadék CSAK akkor megengedett, ha a benne álló platformokon
      // VÉGIG lehet jutni a bal partról a jobbra. Nem elég EGY áthidaló platform: az
      // A szakasz 640px-es tutorial-gödrét három platform lánca hidalja át (A1->A2->A3),
      // a gap4-et a Swinging Reaper alatt viszont egyetlen (F1).
      const leftBank: Span = { left: gap.startX - 1, right: gap.startX, top: GROUND_TOP };
      const rightBank: Span = { left: gap.endX, right: gap.endX + 1, top: GROUND_TOP };
      const stones = PLATFORMS.map(platformSpan).filter(
        (span) => span.right > gap.startX && span.left < gap.endX
      );

      const reached: Span[] = [leftBank];
      const queue: Span[] = [leftBank];
      let crossed = false;

      while (queue.length > 0 && !crossed) {
        const current = queue.shift()!;
        if (canJump(current, rightBank)) {
          crossed = true;
          break;
        }
        for (const stone of stones) {
          if (reached.includes(stone) || !canJump(current, stone)) continue;
          reached.push(stone);
          queue.push(stone);
        }
      }

      expect(
        crossed,
        `a ${gap.width}px-es szakadék (${gap.startX}–${gap.endX}) nem jutható át`
      ).toBe(true);
    }
  });
});

// --- Platformok -------------------------------------------------------------

describe('PLATFORMS', () => {
  it('az id-k egyediek', () => {
    const ids = PLATFORMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mind a talaj FÖLÖTT vannak', () => {
    for (const p of PLATFORMS) {
      expect(platformTop(p), `${p.id} nem a talaj fölött van`).toBeLessThan(GROUND_TOP);
    }
  });

  it('egyetlen két platform sávja sem fedi egymást', () => {
    for (let i = 0; i < PLATFORMS.length; i++) {
      for (let j = i + 1; j < PLATFORMS.length; j++) {
        const a = platformSpan(PLATFORMS[i]);
        const b = platformSpan(PLATFORMS[j]);
        expect(
          horizontalDistance(a, b),
          `${PLATFORMS[i].id} és ${PLATFORMS[j].id} átfedi egymást`
        ).toBeGreaterThan(0);
      }
    }
  });
});

// --- Elérhetőség (a spec elfogadási kritériuma) -----------------------------

describe('elérhetőség', () => {
  it('a pálya MINDEN felülete elérhető a startról', () => {
    const surfaces = allSurfaces();
    const ladderTarget = platformById('H1').id;

    const reached = new Set<string>([GROUND_SEGMENTS[0].id]);
    const queue = [GROUND_SEGMENTS[0].id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = surfaces.get(currentId)!;

      for (const [nextId, next] of surfaces) {
        if (reached.has(nextId)) continue;

        // A H1 (felső, egyirányú) platform szándékosan ugrással NEM érhető el — a létra
        // vezet rá. A létra alja azon a talaj-szegmensen áll, amiről indulunk.
        const viaLadder =
          nextId === ladderTarget &&
          currentId === groundSegmentIdAt(LADDER.x);

        if (!viaLadder && !canJump(current, next)) continue;

        reached.add(nextId);
        queue.push(nextId);
      }
    }

    const unreachable = [...surfaces.keys()].filter((id) => !reached.has(id));
    expect(unreachable, `elérhetetlen felületek: ${unreachable.join(', ')}`).toEqual([]);
  });
});

function groundSegmentIdAt(x: number): string {
  const segment = GROUND_SEGMENTS.find((g) => x >= g.startX && x <= g.endX);
  if (!segment) throw new Error(`Nincs talaj-szegmens az x=${x} pontban`);
  return segment.id;
}

// --- Enemyk -----------------------------------------------------------------

describe('ENEMY_SPAWNS', () => {
  it('az id-k egyediek', () => {
    const ids = ENEMY_SPAWNS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('minden enemy a saját felületén spawnol, a patrol-tartományán belül', () => {
    for (const enemy of ENEMY_SPAWNS) {
      expect(enemy.patrolMaxX, `${enemy.id}`).toBeGreaterThan(enemy.patrolMinX);
      expect(enemy.x, `${enemy.id} spawn a patrol-tartományon kívül`).toBeGreaterThanOrEqual(
        enemy.patrolMinX
      );
      expect(enemy.x, `${enemy.id} spawn a patrol-tartományon kívül`).toBeLessThanOrEqual(
        enemy.patrolMaxX
      );
    }
  });

  it('az üldözési határ TARTALMAZZA a patrol-körzetet', () => {
    // Ha szűkebb lenne, az enemy a saját sétakörzetében ütközne láthatatlan falba.
    for (const enemy of ENEMY_SPAWNS) {
      const chase = enemyChaseBounds(enemy);
      expect(chase.min, `${enemy.id} üldözési határa balra szűkebb a patrolnál`).toBeLessThanOrEqual(
        enemy.patrolMinX
      );
      expect(
        chase.max,
        `${enemy.id} üldözési határa jobbra szűkebb a patrolnál`
      ).toBeGreaterThanOrEqual(enemy.patrolMaxX);
    }
  });

  it('az üldözési határ a felületen BELÜL marad (a testével együtt)', () => {
    for (const enemy of ENEMY_SPAWNS) {
      const surface = surfaceSpan(enemy.surfaceId);
      const chase = enemyChaseBounds(enemy);

      expect(
        chase.min - HARVESTER_HALF_BODY_WIDTH,
        `${enemy.id} üldözés közben balra lelép a peremről`
      ).toBeGreaterThanOrEqual(surface.left);
      expect(
        chase.max + HARVESTER_HALF_BODY_WIDTH,
        `${enemy.id} üldözés közben jobbra lelép a peremről`
      ).toBeLessThanOrEqual(surface.right);
    }
  });

  it('az üldözési határ SEM engedi tüskébe lépni', () => {
    // Ez a 2. iteráció óta a spec követelménye ("does not walk into spikes"), és az
    // üldözés kitágítása után is állnia kell — a chase-határt a spike-mezők elvágják.
    for (const enemy of ENEMY_SPAWNS) {
      const chase = enemyChaseBounds(enemy);

      for (const field of SPIKE_FIELDS) {
        const reachesLeft = chase.min - HARVESTER_HALF_BODY_WIDTH;
        const reachesRight = chase.max + HARVESTER_HALF_BODY_WIDTH;
        const overlaps = reachesRight > field.startX && reachesLeft < field.endX;

        expect(overlaps, `${enemy.id} üldözés közben belesétál a(z) ${field.id} mezőbe`).toBe(
          false
        );
      }
    }
  });

  it('a FÖLDI enemyk üldözési határa érdemben tágabb a patroljuknál', () => {
    // Ez a finomhangolás lényege: a földi enemy ne a szűk sétakörében ütközzön falba,
    // hanem a szakadék peremééig kövesse a playert. (A platformon állóknál a kettő
    // szándékosan egybeesik — ott a platform pereme MAGA a patrol-határ.)
    const groundEnemies = ENEMY_SPAWNS.filter((e) =>
      GROUND_SEGMENTS.some((g) => g.id === e.surfaceId)
    );
    expect(groundEnemies.length).toBeGreaterThan(0);

    for (const enemy of groundEnemies) {
      const chase = enemyChaseBounds(enemy);
      const patrolWidth = enemy.patrolMaxX - enemy.patrolMinX;
      expect(
        chase.max - chase.min,
        `${enemy.id} üldözési tere nem tágabb a patroljánál`
      ).toBeGreaterThan(patrolWidth);
    }
  });

  it('EGYETLEN enemy patrol-tartománya sem lóg le a felületéről (nem sétál szakadékba)', () => {
    // A CrowHarvester TESTÉNEK is a felületen kell maradnia, nem csak a középpontjának.
    for (const enemy of ENEMY_SPAWNS) {
      const surface = surfaceSpan(enemy.surfaceId);
      expect(
        enemy.patrolMinX - HARVESTER_HALF_BODY_WIDTH,
        `${enemy.id} balra lelóg a(z) ${enemy.surfaceId} peremén`
      ).toBeGreaterThanOrEqual(surface.left);
      expect(
        enemy.patrolMaxX + HARVESTER_HALF_BODY_WIDTH,
        `${enemy.id} jobbra lelóg a(z) ${enemy.surfaceId} peremén`
      ).toBeLessThanOrEqual(surface.right);
    }
  });
});

// --- Spike-mezők (D szakasz) ------------------------------------------------

describe('SPIKE_FIELDS', () => {
  it('az id-k egyediek, és minden mező egész csempékből áll', () => {
    const ids = SPIKE_FIELDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const field of SPIKE_FIELDS) {
      const width = field.endX - field.startX;
      expect(width, `${field.id} szélessége nem csempe-többszörös`).toBe(
        Math.round(width / SPIKE_TILE_WIDTH) * SPIKE_TILE_WIDTH
      );
    }
  });

  it('minden mező a saját talaj-szegmensén BELÜL van', () => {
    for (const field of SPIKE_FIELDS) {
      const surface = surfaceSpan(field.surfaceId);
      expect(field.startX, `${field.id} kilóg balra`).toBeGreaterThanOrEqual(surface.left);
      expect(field.endX, `${field.id} kilóg jobbra`).toBeLessThanOrEqual(surface.right);
      // Talajon kell ülnie, nem platformon: a tüskék a padlón állnak.
      expect(surface.top).toBe(GROUND_TOP);
    }
  });

  it('minden mező ÁTUGORHATÓ — a player TESTÉNEK is át kell érnie', () => {
    for (const field of SPIKE_FIELDS) {
      const clearance = field.endX - field.startX + PLAYER_BODY_WIDTH;
      expect(clearance, `${field.id} nem ugorható át`).toBeLessThanOrEqual(MAX_SAFE_GAP);
    }
  });

  it('mindkét oldalán van biztonságos talaj (a spec "safe platform before and after"-je)', () => {
    const SAFE_MARGIN = 64;

    for (const field of SPIKE_FIELDS) {
      const surface = surfaceSpan(field.surfaceId);
      expect(field.startX - surface.left, `${field.id} előtt nincs elég talaj`).toBeGreaterThanOrEqual(
        SAFE_MARGIN
      );
      expect(surface.right - field.endX, `${field.id} után nincs elég talaj`).toBeGreaterThanOrEqual(
        SAFE_MARGIN
      );
    }
  });

  it('EGYETLEN enemy patrol-tartománya sem éri el a tüskéket', () => {
    // A spec követelménye: "CrowHarvester enemy does not walk into or jump over spikes".
    // Ez tisztán LAYOUT-kérdés — az enemy kódjában nincs hazard-tudat, és nem is kell.
    for (const enemy of ENEMY_SPAWNS) {
      for (const field of SPIKE_FIELDS) {
        const reachesLeft = enemy.patrolMinX - HARVESTER_HALF_BODY_WIDTH;
        const reachesRight = enemy.patrolMaxX + HARVESTER_HALF_BODY_WIDTH;
        const overlaps = reachesRight > field.startX && reachesLeft < field.endX;

        expect(overlaps, `${enemy.id} belesétál a(z) ${field.id} mezőbe`).toBe(false);
      }
    }
  });

  it('a köztes checkpoint a tüskék UTÁN van — a szakasz teljesítését jutalmazza', () => {
    for (const field of SPIKE_FIELDS) {
      expect(MID_CHECKPOINT.x).toBeGreaterThan(field.endX);
    }
  });
});

// --- Swinging Reaper (F szakasz) --------------------------------------------

describe('REAPERS', () => {
  it('az id-k egyediek, és minden lengés valódi (pozitív amplitúdó és periódus)', () => {
    const ids = REAPERS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const def of REAPERS) {
      expect(def.maxAngleDeg).toBeGreaterThan(0);
      expect(def.maxAngleDeg).toBeLessThanOrEqual(90);
      expect(def.periodMs).toBeGreaterThan(0);
      expect(def.ropeLength).toBeGreaterThan(0);
    }
  });

  it('a penge egy platform fölött söpör — van hova landolni alatta', () => {
    for (const def of REAPERS) {
      const sweep = reaperSweep(def);
      const bridge = PLATFORMS.map(platformSpan).find(
        (span) => span.left < def.anchorX && span.right > def.anchorX
      );

      expect(bridge, `a(z) ${def.id} alatt nincs platform`).toBeDefined();
      // A penge legalsó pontja a platform FÖLÖTT marad (nem a kőbe lóg bele),
      // de elég alacsonyan ahhoz, hogy a rajta álló playert elérje.
      expect(sweep.lowestY).toBeLessThan(bridge!.top);
    }
  });

  it('a penge a szakadék fölött leng, nem a talaj fölött', () => {
    // Ez adja a szakasz tétjét: a találat helye egyben az egyetlen átjutási útvonal.
    const gaps = groundGaps();

    for (const def of REAPERS) {
      const overGap = gaps.some((gap) => def.anchorX > gap.startX && def.anchorX < gap.endX);
      expect(overGap, `a(z) ${def.id} nem szakadék fölött van`).toBe(true);
    }
  });

  it('EGYETLEN enemy sem áll a penge söprési sávjában', () => {
    // A spec követelménye: "Enemies are not spawned/placed near the reaper swing".
    for (const def of REAPERS) {
      const sweep = reaperSweep(def);
      const dangerLeft = sweep.left - REAPER_ENEMY_CLEARANCE;
      const dangerRight = sweep.right + REAPER_ENEMY_CLEARANCE;

      for (const enemy of ENEMY_SPAWNS) {
        const reachesLeft = enemy.patrolMinX - HARVESTER_HALF_BODY_WIDTH;
        const reachesRight = enemy.patrolMaxX + HARVESTER_HALF_BODY_WIDTH;
        const overlaps = reachesRight > dangerLeft && reachesLeft < dangerRight;

        expect(overlaps, `${enemy.id} a(z) ${def.id} söprési sávjában van`).toBe(false);
      }
    }
  });
});

// --- Létra, ajtó, checkpointok ----------------------------------------------

describe('létra és boss-ajtó', () => {
  const upper = platformById('H1');

  it('a felső platform egyirányú — a létra alulról megy át rajta', () => {
    expect(upper.oneWay).toBe(true);
  });

  it('a létra teljes szélességében a felső platform alatt van', () => {
    expect(LADDER.x - LADDER.width / 2).toBeGreaterThanOrEqual(platformLeft(upper));
    expect(LADDER.x + LADDER.width / 2).toBeLessThanOrEqual(platformRight(upper));
  });

  it('a létra alja talajon áll', () => {
    expect(() => groundSegmentIdAt(LADDER.x)).not.toThrow();
  });

  it('a rajzolt létra elfér a csempéjén — a mászási zóna nem lóg túl a grafikán', () => {
    expect(LADDER.width).toBeLessThanOrEqual(LADDER_TILE_WIDTH);
  });

  it('az ajtó a felső platformon áll', () => {
    expect(DOOR.x - DOOR.width / 2).toBeGreaterThanOrEqual(platformLeft(upper));
    expect(DOOR.x + DOOR.width / 2).toBeLessThanOrEqual(platformRight(upper));
  });

  // A csempén a boltív nyílása NEM ér le a kép aljáig: alatta egy küszöb-kő van. A scene
  // ezzel a 19px-szel süllyeszti a képet a platform felszíne alá, hogy az ív padlója a
  // járható felületre essen. Ha valaki átméretezi az ajtót anélkül, hogy a küszöböt
  // újraszámolná, a player a kőben állna — ezt fogja meg ez a három állítás.
  it('az ajtó magassága a három mért rész összege (küszöb + nyílás + felső kőfal)', () => {
    expect(DOOR_THRESHOLD_PX + DOOR_OPENING_HEIGHT + DOOR_HEADER_HEIGHT).toBe(DOOR_TILE_HEIGHT);
    expect(DOOR.height).toBe(DOOR_TILE_HEIGHT);
  });

  it('a boltív nyílása magasabb a playernél — át lehet menni rajta', () => {
    expect(DOOR.openingHeight).toBeGreaterThan(2 * PLAYER_HALF_HEIGHT);
  });

  it('a küszöb-kő elbújik a platform mögött — nem lóg le alóla észrevehetően', () => {
    // A platform 16px vastag; a 19px-es küszöbből legfeljebb néhány px látszik ki alul,
    // ami lépcsőnek olvasható. Ha a küszöb ennél sokkal mélyebb lenne, a platform alatt
    // lebegő kőtömbként lógna ki.
    expect(DOOR_THRESHOLD_PX - PLATFORM_TILE_HEIGHT).toBeLessThanOrEqual(4);
  });

  it('az ajtó-checkpointon a player a felső platform felszínén áll', () => {
    expect(DOOR_CHECKPOINT.y).toBe(platformTop(upper) - PLAYER_HALF_HEIGHT);
    expect(DOOR_CHECKPOINT.x).toBeGreaterThanOrEqual(platformLeft(upper));
    expect(DOOR_CHECKPOINT.x).toBeLessThanOrEqual(platformRight(upper));
  });
});

describe('köztes checkpoint', () => {
  it('talajon áll, és a player a felszínén éled újra', () => {
    expect(() => groundSegmentIdAt(MID_CHECKPOINT.x)).not.toThrow();
    expect(MID_CHECKPOINT.y).toBe(GROUND_TOP - PLAYER_HALF_HEIGHT);
  });

  it('a pálya közepe táján van — nem a start és nem a vég közelében', () => {
    expect(MID_CHECKPOINT.x).toBeGreaterThan(WORLD_WIDTH * 0.25);
    expect(MID_CHECKPOINT.x).toBeLessThan(WORLD_WIDTH * 0.75);
  });
});

// --- Zuhanás-halál ----------------------------------------------------------

describe('zuhanás-halál', () => {
  it('a küszöb a képernyő ALATT van — a player már nem látszik, amikor meghal', () => {
    expect(FALL_DEATH_Y).toBeGreaterThan(WORLD_HEIGHT);
  });

  it('a küszöb a fizikai világon BELÜL van — különben a world bounds fogná meg előbb', () => {
    expect(FALL_DEATH_Y).toBeLessThan(WORLD_HEIGHT + FALL_DEPTH);
  });
});

// --- Tutorial feliratok -----------------------------------------------------

describe('TUTORIAL_HINTS', () => {
  it('az id-k egyediek és a triggerek növekvő sorrendben állnak', () => {
    const ids = TUTORIAL_HINTS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (let i = 1; i < TUTORIAL_HINTS.length; i++) {
      expect(TUTORIAL_HINTS[i].triggerX).toBeGreaterThan(TUTORIAL_HINTS[i - 1].triggerX);
    }
  });

  it('mind SZILÁRD TALAJON váltódnak ki — nem a levegőben, zuhanás közben', () => {
    // A trigger a player X-ére néz, függetlenül attól, hol van függőlegesen: egy szakadék
    // fölé tett trigger a beleesés pillanatában villanna fel.
    for (const hint of TUTORIAL_HINTS) {
      expect(() => groundSegmentIdAt(hint.triggerX), `${hint.id} szakadék fölött van`).not.toThrow();
    }
  });

  it('mind az első valódi HAZARD (spike-mező) előtt vannak', () => {
    // Korábban ez "az első szakadék előtt"-et állított, de az A szakasz tutorial-gödrének
    // bevezetése óta a legelső szakadék MAGA a tutorial — a harc-súgó szükségszerűen
    // mögötte van. Az állítás eredeti SZÁNDÉKA (a súgók a bevezetőben szólnak, nem harc
    // vagy hazard közben) így a spike-mezőhöz van kötve.
    const firstHazardX = Math.min(...SPIKE_FIELDS.map((f) => f.startX));
    for (const hint of TUTORIAL_HINTS) {
      expect(hint.triggerX, `${hint.id} túl későn jelenik meg`).toBeLessThan(firstHazardX);
    }
  });
});
