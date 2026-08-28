// Level 2 layout invariánsok (Level 2, 1. iteráció — járható váz).
//
// Ugyanaz a szerep, mint a `level1Layout.test.ts`-nél: a `Level2Layout.ts` Phaser-mentes
// adatmodul, ezért itt NINCS GameObject-mock — a tesztek magát a pálya-geometriát bizonyítják.
// Ez a pálya "fordítója": a `docs/level2-layout.md` elfogadási kritériumai itt válnak
// futtatható állítássá, nem manuális végigjátszás kérdésévé.
//
// A Level 1-hez képest HÁROM új invariáns-család van, és mindhárom egy-egy konkrét, a
// layout-tervben talált hibát őriz meg javítva:
//
//   1. ugrás-plafon: szilárd lap nem lóghat hazard ugrás-folyosójába (a FIX ugrásmagasság
//      miatt a player nem tud "kis ugrást" csinálni alatta);
//   2. mozgó platform: a végállásai a gráf csúcsai, tehát minden ugrás szélsőállásból megy;
//   3. létra: a kiindulási és a cél felületnek ÁT KELL FEDNIE a létra x-énél.
import { describe, it, expect, vi } from 'vitest';
import {
  CHECKPOINTS,
  checkpointRespawnY,
  CHECKPOINT_ZONE,
  DOOR,
  DOOR_CHECKPOINT,
  ENEMY_SPAWNS,
  GRAVECALLER_SPAWN_OFFSET,
  GROUND_SEGMENTS,
  GROUND_TOP,
  JUMP_CORRIDOR_MARGIN,
  LADDERS,
  LADDER_EXIT_CLEARANCE,
  MAX_JUMP_HEIGHT,
  MAX_SAFE_GAP,
  MAX_SAFE_RISE,
  MIN_JUMP_CLEARANCE_RISE,
  MIN_WALK_UNDER_RISE,
  MOVING_PLATFORMS,
  PLATFORMS,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_HALF_HEIGHT,
  REAPERS,
  REAPER_ENEMY_CLEARANCE,
  SPIKE_FIELDS,
  SPIKE_TILE_WIDTH,
  START_X,
  WORLD_WIDTH,
  enemyChaseBounds,
  enemyHalfBodyWidth,
  enemyType,
  groundGaps,
  horizontalReachForRise,
  movingPlatformExtremes,
  movingPlatformPathBounds,
  platformBottom,
  platformById,
  platformLeft,
  platformRight,
  platformTop,
  reaperMinDistanceTo,
  reaperSweep,
  surfaceSpan,
  type PlatformDef,
  type Span,
} from '../../src/levels/Level2Layout';
import { REAPER_HIT_RADIUS } from '../../src/hazards/SwingingReaper';
import { MOVE_SPEED } from '../../src/player/Player';
import { ATTACK_RANGE as HARVESTER_ATTACK_RANGE } from '../../src/enemies/CrowHarvester';
import {
  DETECTION_RANGE as GRAVECALLER_DETECTION_RANGE,
  PROJECTILE_SIZE as GRAVECALLER_PROJECTILE_SIZE,
  PROJECTILE_SPAWN_OFFSET_Y as GRAVECALLER_PROJECTILE_OFFSET_Y,
  VERTICAL_DETECTION_RANGE as GRAVECALLER_VERTICAL_RANGE,
} from '../../src/enemies/Gravecaller';
import { LADDER_TILE_WIDTH, PLATFORM_TILE_HEIGHT } from '../../src/levels/LevelTileset';

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

/**
 * Át lehet-e ugrani az `from` felületről a `to`-ra? Az emelkedést a biztonsági plafon
 * korlátozza, a vízszintes távolságot pedig az ADOTT emelkedéshez tartozó ballisztikai
 * hatótáv — magasabbra ugorva rövidebbet lehet ugrani.
 */
function canJump(from: Span, to: Span): boolean {
  const rise = from.top - to.top;
  if (rise > MAX_SAFE_RISE) return false;
  return horizontalDistance(from, to) <= horizontalReachForRise(rise);
}

/**
 * MINDEN járható felület a gráf csúcsaként. A mozgó platform KÉT csúcs (a két szélsőállása) —
 * ez teszi futtatható állítássá, hogy a player sosem kényszerül "menet közben" célozni.
 */
function allSurfaces(): Map<string, Span> {
  const surfaces = new Map<string, Span>();
  for (const g of GROUND_SEGMENTS) surfaces.set(g.id, surfaceSpan(g.id));
  for (const p of PLATFORMS) surfaces.set(p.id, platformSpan(p));

  for (const mover of MOVING_PLATFORMS) {
    const [from, to] = movingPlatformExtremes(mover);
    surfaces.set(`${mover.id}@from`, from);
    surfaces.set(`${mover.id}@to`, to);
  }

  return surfaces;
}

function groundSegmentIdAt(x: number): string {
  const segment = GROUND_SEGMENTS.find((g) => x >= g.startX && x <= g.endX);
  if (!segment) throw new Error(`Nincs talaj-szegmens az x=${x} pontban`);
  return segment.id;
}

/**
 * A hazard ugrás-FOLYOSÓJA: az a vízszintes sáv, amiben a player a teljes ugrás-magasságát
 * bejárja, miközben átugorja. A margó levezetett (`JUMP_CORRIDOR_MARGIN` = a test szélessége).
 */
function jumpCorridor(field: { startX: number; endX: number }): { left: number; right: number } {
  return {
    left: field.startX - JUMP_CORRIDOR_MARGIN,
    right: field.endX + JUMP_CORRIDOR_MARGIN,
  };
}

// --- A FIX ugrásmagasságból levezetett korlátok -----------------------------

describe('ugrás-plafon (a Player konstansaiból levezetve)', () => {
  it('a walk-under és a jump-clearance küszöb a várt érték', () => {
    // PLAYER_BODY_HEIGHT 46 + PLATFORM_TILE_HEIGHT 16
    expect(MIN_WALK_UNDER_RISE).toBe(62);
    // + a teljes ugrás magassága (156.25)
    expect(MIN_JUMP_CLEARANCE_RISE).toBeCloseTo(218.25, 2);
    expect(MIN_JUMP_CLEARANCE_RISE).toBe(MIN_WALK_UNDER_RISE + MAX_JUMP_HEIGHT);
  });

  it('a folyosó-margó a player TESTSZÉLESSÉGE, nem hangolt szám', () => {
    expect(JUMP_CORRIDOR_MARGIN).toBe(PLAYER_BODY_WIDTH);
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
    expect(() => groundSegmentIdAt(START_X)).not.toThrow();
    expect(groundSegmentIdAt(START_X)).toBe(GROUND_SEGMENTS[0].id);
  });
});

describe('szakadékok', () => {
  it('HÁROM van, és egyik sem ugorható át közvetlenül', () => {
    // Ez a Level 2 létezésének fő indoka: a Level 1-en át lehetett szaladni. Ha egy szakadék
    // a MAX_SAFE_GAP alá csúszna, a szakasz platformmunkája megkerülhetővé válna.
    const gaps = groundGaps();
    expect(gaps.length).toBe(3);

    for (const gap of gaps) {
      expect(gap.width, `a ${gap.startX}–${gap.endX} szakadék átugorható`).toBeGreaterThan(
        MAX_SAFE_GAP
      );
    }
  });

  it('a B és a D szakadék a TALAJ pereméről indulva átjutható', () => {
    // Ez a két szakadék talajszintről kezdődik: a player kisétál a peremig, és onnan
    // ugrál végig a lapokon. (Az F szándékosan MÁS — lásd a következő tesztet.)
    const gaps = groundGaps();
    for (const gap of [gaps[0], gaps[1]]) {
      expect(
        crossesGapFrom({ left: gap.startX - 1, right: gap.startX, top: GROUND_TOP }, gap),
        `a ${gap.width}px-es szakadék (${gap.startX}–${gap.endX}) nem jutható át a talajról`
      ).toBe(true);
    }
  });

  it('az F szakadék CSAK az E-párkányról jutható át — a lift az egyetlen bejárat', () => {
    // A szakasz design-szándéka futtatható állításként. Az `E-ledge` +160-on van, ami a
    // MAX_SAFE_RISE (117) fölött van, tehát a talajról nem ugorható fel: az `E-lift` az
    // egyetlen út oda, és onnan az egyetlen út tovább. Ha valaki lejjebb viszi az
    // `E-ledge`-et, ez a teszt jelzi, hogy a lift megkerülhetővé vált.
    const gapF = groundGaps()[2];
    const groundBank: Span = { left: gapF.startX - 1, right: gapF.startX, top: GROUND_TOP };

    expect(crossesGapFrom(groundBank, gapF), 'az F szakadék a talajról is átjutható').toBe(
      false
    );
    expect(
      crossesGapFrom(platformSpan(platformById('E-ledge')), gapF),
      'az F szakadék az E-párkányról sem jutható át'
    ).toBe(true);
  });
});

/** Át lehet-e jutni a szakadékon a megadott kiindulási felületről, a benne álló lapok láncán? */
function crossesGapFrom(start: Span, gap: { startX: number; endX: number }): boolean {
  const rightBank: Span = { left: gap.endX, right: gap.endX + 1, top: GROUND_TOP };
  const stones = [...allSurfaces().values()].filter(
    (span) => span !== start && span.right > gap.startX && span.left < gap.endX && span.top < GROUND_TOP
  );

  const reached: Span[] = [start];
  const queue: Span[] = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (canJump(current, rightBank)) return true;

    for (const stone of stones) {
      if (reached.includes(stone) || !canJump(current, stone)) continue;
      reached.push(stone);
      queue.push(stone);
    }
  }

  return false;
}

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

  it('egyetlen felület sem magasabb +300-nál — nincs függőleges kameragörgetés', () => {
    // A layout-spec 19/9 pontja: a teljes pálya belefér a 450 px-es sávba.
    const MAX_RISE = 300;
    for (const p of PLATFORMS) {
      expect(GROUND_TOP - platformTop(p), `${p.id} túl magas`).toBeLessThanOrEqual(MAX_RISE);
    }
    for (const mover of MOVING_PLATFORMS) {
      const path = movingPlatformPathBounds(mover);
      expect(GROUND_TOP - path.top, `${mover.id} túl magasra megy`).toBeLessThanOrEqual(MAX_RISE);
    }
  });

  it('ahol két lap vízszintesen átfed, ott a player ELFÉR alattuk', () => {
    // A `H-ledge` és a `boss-ledge` SZÁNDÉKOSAN átfed: a második létra lába az egyiken áll, a
    // teteje a másik alatt ér véget — átfedés nélkül a létra nem létezhetne. Amit viszont
    // tilos: hogy a felső lap alja a mászási/járási térbe lógjon.
    for (let i = 0; i < PLATFORMS.length; i++) {
      for (let j = i + 1; j < PLATFORMS.length; j++) {
        const a = PLATFORMS[i];
        const b = PLATFORMS[j];
        if (horizontalDistance(platformSpan(a), platformSpan(b)) > 0) continue;

        const [upper, lower] = platformTop(a) < platformTop(b) ? [a, b] : [b, a];
        expect(
          platformTop(lower) - platformBottom(upper),
          `${upper.id} és ${lower.id} között nem fér el a player`
        ).toBeGreaterThanOrEqual(PLAYER_BODY_HEIGHT);
      }
    }
  });

  it('a TALAJ fölött lógó lapok alatt el lehet sétálni (nem falazzák el a sávot)', () => {
    // MIN_WALK_UNDER_RISE alatt a lap nem opcionális perch, hanem lépcső — a doksi `A1`-e
    // (+45) pont ebbe futott bele. Szakadék fölött ez nem értelmezett, ezért csak a talaj
    // fölötti lapokra vizsgáljuk.
    for (const p of PLATFORMS) {
      if (!overlapsGround({ left: platformLeft(p), right: platformRight(p) })) continue;

      expect(
        GROUND_TOP - platformTop(p),
        `${p.id} elfalazza a talajsávot (walk-under küszöb ${MIN_WALK_UNDER_RISE})`
      ).toBeGreaterThanOrEqual(MIN_WALK_UNDER_RISE);
    }
  });

  it('a TALAJ fölött járó MOZGÓ lap leérve sem nyomja össze a player-t', () => {
    // Ez a legkeményebb következménye a `MIN_WALK_UNDER_RISE`-nak, és statikus lapnál nem
    // fordulhat elő: egy talaj fölé ereszkedő mozgó lap alsó állásában a lap alja a player
    // feje ALÁ kerülhet, és a static body szeparációja a talaj ÉS a lap közé szorítja.
    // A doksi `E-lift`-je (+20 alsó állás) pontosan ebbe futott volna bele.
    for (const mover of MOVING_PLATFORMS) {
      const path = movingPlatformPathBounds(mover);
      if (!overlapsGround(path)) continue;

      const lowestTop = Math.max(...movingPlatformExtremes(mover).map((s) => s.top));
      expect(
        GROUND_TOP - lowestTop,
        `${mover.id} leérve összenyomja a talajon álló playert`
      ).toBeGreaterThanOrEqual(MIN_WALK_UNDER_RISE);
    }
  });
});

/** Van-e TALAJ a megadott vízszintes sáv alatt? (Szakadék fölött a walk-under nem értelmezett.) */
function overlapsGround(span: { left: number; right: number }): boolean {
  return GROUND_SEGMENTS.some((g) => span.right > g.startX && span.left < g.endX);
}

// --- Ugrás-plafon a hazardok fölött (a layout-terv 1. hibája) ---------------

describe('hazard ugrás-folyosók', () => {
  it('egyetlen SZILÁRD lap sem lóg tüskemező ugrás-folyosójába', () => {
    // REGRESSZIÓ a `docs/level2-layout.md` ellen: ott a `C1`–`C3` és a `G-P1`/`G-P2` pont a
    // tüskemezők fölött lógtak. Mivel az ugrás magassága FIX (156 px), a player feje már
    // 18–48 px emelkedés után beverődött volna a lap aljába, és visszaesett volna a
    // tüskékbe — vagyis a mezők ÁTUGORHATATLANOK lettek volna.
    //
    // A `oneWay` lapok kivételek: azokon a player alulról átmegy, tehát nem plafonok.
    for (const field of SPIKE_FIELDS) {
      const corridor = jumpCorridor(field);

      for (const p of PLATFORMS) {
        if (p.oneWay) continue;
        if (GROUND_TOP - platformTop(p) >= MIN_JUMP_CLEARANCE_RISE) continue;
        if (platformRight(p) <= corridor.left || platformLeft(p) >= corridor.right) continue;

        expect.fail(
          `${p.id} (+${GROUND_TOP - platformTop(p)}) a(z) ${field.id} ugrás-folyosójába lóg ` +
            `[${corridor.left}, ${corridor.right}] — a mező nem ugorható át`
        );
      }
    }
  });

  it('egyetlen MOZGÓ lap pályája sem lóg tüskemező ugrás-folyosójába', () => {
    for (const field of SPIKE_FIELDS) {
      const corridor = jumpCorridor(field);

      for (const mover of MOVING_PLATFORMS) {
        const path = movingPlatformPathBounds(mover);
        if (GROUND_TOP - path.top >= MIN_JUMP_CLEARANCE_RISE) continue;

        const overlaps = path.right > corridor.left && path.left < corridor.right;
        expect(overlaps, `${mover.id} a(z) ${field.id} ugrás-folyosójába lóg`).toBe(false);
      }
    }
  });
});

// --- Elérhetőség ------------------------------------------------------------

describe('elérhetőség', () => {
  it('a pálya MINDEN felülete elérhető a startról', () => {
    const surfaces = allSurfaces();

    // A létra a gráf ÉLE: a `to` felület általában szándékosan ugrással elérhetetlen.
    const ladderEdges = LADDERS.map((l) => ({ from: l.fromSurfaceId, to: l.toSurfaceId }));

    const startId = GROUND_SEGMENTS[0].id;
    const reached = new Set<string>([startId]);
    const queue = [startId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = surfaces.get(currentId)!;

      for (const [nextId, next] of surfaces) {
        if (reached.has(nextId)) continue;

        const viaLadder = ladderEdges.some(
          (edge) => edge.to === nextId && edge.from === currentId
        );
        if (!viaLadder && !canJump(current, next)) continue;

        reached.add(nextId);
        queue.push(nextId);
      }
    }

    const unreachable = [...surfaces.keys()].filter((id) => !reached.has(id));
    expect(unreachable, `elérhetetlen felületek: ${unreachable.join(', ')}`).toEqual([]);
  });

  it('a H-párkány CSAK létrával érhető el — a létra valódi kapu', () => {
    // Ez a `docs/level2-layout.md` +150-es értékének a javítása: 150 < 156 (a FIX
    // ugrás-magasság), tehát a párkányt át lehetett volna ugrani, és a szakasz "kapuőr"
    // jellege elveszett volna. A felső útvonal vége (`G-P3`) felől is ellenőrizzük.
    const ledge = platformSpan(platformById('H-ledge'));
    const ground = surfaceSpan('G4');
    const upperRouteEnd = platformSpan(platformById('G-P3'));

    expect(canJump(ground, ledge), 'a talajról fel lehet ugrani a H-párkányra').toBe(false);
    expect(canJump(upperRouteEnd, ledge), 'a felső útvonal megkerüli a létrát').toBe(false);
  });
});

// --- Mozgó platformok -------------------------------------------------------

describe('MOVING_PLATFORMS', () => {
  it('az id-k egyediek, és mindegyik valódi mozgás', () => {
    const ids = MOVING_PLATFORMS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const mover of MOVING_PLATFORMS) {
      expect(mover.speed, `${mover.id}`).toBeGreaterThan(0);
      expect(mover.dwellMs, `${mover.id}: nincs megállás a végpontokon`).toBeGreaterThan(0);
      expect(
        Math.hypot(mover.toX - mover.fromX, mover.toY - mover.fromY),
        `${mover.id} nem mozdul el`
      ).toBeGreaterThan(0);
    }
  });

  it('mind lassabbak a playernél — kiszámíthatók, nem lehagyhatatlanok', () => {
    const PLAYER_MOVE_SPEED = 200;
    for (const mover of MOVING_PLATFORMS) {
      expect(mover.speed, `${mover.id} túl gyors`).toBeLessThan(PLAYER_MOVE_SPEED / 2);
    }
  });

  it('egyetlen mozgó lap pályája sem metszi egy STATIKUS lap testét', () => {
    // Egymásba érő static bodyk esetén a mozgó lap "beleolvadna" a fixbe, és a player
    // ütközése kiszámíthatatlanná válna a találkozási pontnál.
    for (const mover of MOVING_PLATFORMS) {
      const path = movingPlatformPathBounds(mover);

      for (const p of PLATFORMS) {
        const horizontal = path.right > platformLeft(p) && path.left < platformRight(p);
        const vertical = path.bottom > platformTop(p) && path.top < platformBottom(p);
        expect(horizontal && vertical, `${mover.id} beleér a(z) ${p.id} lapba`).toBe(false);
      }
    }
  });

  it('a mozgó lapok pályája a szakadékok/talaj FÖLÖTT van, nem a világon kívül', () => {
    for (const mover of MOVING_PLATFORMS) {
      const path = movingPlatformPathBounds(mover);
      expect(path.left, `${mover.id} kilóg balra`).toBeGreaterThanOrEqual(0);
      expect(path.right, `${mover.id} kilóg jobbra`).toBeLessThanOrEqual(WORLD_WIDTH);
      expect(path.bottom, `${mover.id} a talaj alá megy`).toBeLessThanOrEqual(GROUND_TOP);
    }
  });
});

// --- Tüskemezők -------------------------------------------------------------

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
      expect(surface.top, `${field.id} nem talajon ül`).toBe(GROUND_TOP);
    }
  });

  it('mindegyik ÁTUGORHATÓ — a player TESTÉNEK is át kell érnie', () => {
    for (const field of SPIKE_FIELDS) {
      const clearance = field.endX - field.startX + PLAYER_BODY_WIDTH;
      expect(clearance, `${field.id} nem ugorható át`).toBeLessThanOrEqual(MAX_SAFE_GAP);
    }
  });

  it('minden mező mellett van legalább 120 px biztonságos sáv', () => {
    // A megosztott i-frame ablak (900 ms) miatt két egymáshoz túl közeli mező találata
    // összeolvadna, és a player nem kapna esélyt a következő ugrás előkészítésére.
    const SAFE_BAND = 120;
    const bySurface = new Map<string, typeof SPIKE_FIELDS>();
    for (const field of SPIKE_FIELDS) {
      bySurface.set(field.surfaceId, [...(bySurface.get(field.surfaceId) ?? []), field]);
    }

    for (const [surfaceId, fields] of bySurface) {
      const surface = surfaceSpan(surfaceId);
      const sorted = [...fields].sort((a, b) => a.startX - b.startX);

      // KIVÉTEL: ha a mező PONTOSAN a szegmens peremén kezdődik, akkor szándékosan nincs
      // landolósáv előtte — a playernek a szakadékon túlról, egyenesen át kell ugrania rajta
      // (lásd a `C-spikes-1`-et és a következő tesztet, ami ezt bizonyítja is).
      if (sorted[0].startX > surface.left) {
        expect(
          sorted[0].startX - surface.left,
          `${sorted[0].id} előtt nincs elég talaj`
        ).toBeGreaterThanOrEqual(SAFE_BAND);
      }
      expect(
        surface.right - sorted[sorted.length - 1].endX,
        `${sorted[sorted.length - 1].id} után nincs elég talaj`
      ).toBeGreaterThanOrEqual(SAFE_BAND);

      for (let i = 1; i < sorted.length; i++) {
        expect(
          sorted[i].startX - sorted[i - 1].endX,
          `${sorted[i - 1].id} és ${sorted[i].id} között nincs biztonságos sáv`
        ).toBeGreaterThanOrEqual(SAFE_BAND);
      }
    }
  });

  it('a szegmens PEREMÉN kezdődő mező CSAK a mozgó lap közelebbi végállásából ugorható át', () => {
    // A `C-spikes-1` design-szándéka futtatható állításként (user-döntés): a mező előtt nincs
    // biztonságos landolósáv, tehát a `B-mover-2`-ről egyenesen át kell ugrani rajta — és ez
    // CSAK a lap jobb szélsőállásából megy. Két állítás, mert az egyik önmagában semmit nem
    // érne: ha a távolabbi állásból is menne, a mozgó platform időzítése lényegtelen lenne.
    const edgeFields = SPIKE_FIELDS.filter(
      (f) => f.startX === surfaceSpan(f.surfaceId).left
    );
    expect(edgeFields.length).toBeGreaterThan(0);

    for (const field of edgeFields) {
      // A szakadékon túli mozgó lap két végállása; a "közelebbi" a jobb szélső.
      const extremes = MOVING_PLATFORMS.flatMap(movingPlatformExtremes)
        .filter((span) => span.right < field.startX)
        .sort((a, b) => a.right - b.right);
      expect(extremes.length, `${field.id} elé nincs kilövőállás`).toBeGreaterThan(0);

      const landing = field.endX + PLAYER_BODY_WIDTH / 2;
      const jumpFrom = (span: Span): { distance: number; reach: number } => ({
        distance: landing - (span.right - PLAYER_BODY_WIDTH / 2),
        reach: horizontalReachForRise(span.top - GROUND_TOP),
      });

      const near = jumpFrom(extremes[extremes.length - 1]);
      expect(
        near.distance,
        `${field.id} a közelebbi végállásból sem ugorható át`
      ).toBeLessThanOrEqual(near.reach);

      const far = jumpFrom(extremes[0]);
      expect(
        far.distance,
        `${field.id} a TÁVOLABBI végállásból is átugorható — a mover időzítése lényegtelenné válik`
      ).toBeGreaterThan(far.reach);
    }
  });

  it('a G szakasz mezői a FELSŐ útvonal hézagai alatt vannak', () => {
    // A két útvonal design-szándéka futtatható állításként: a felső sorról leesve a player
    // pont a tüskékbe érkezik, tehát a "biztonságos" útvonalnak is van tétje.
    const upperRoute = ['G-P1', 'G-P2', 'G-P3'].map((id) => platformSpan(platformById(id)));

    for (const field of SPIKE_FIELDS.filter((f) => f.id.startsWith('G-'))) {
      for (const span of upperRoute) {
        const overlaps = field.endX > span.left && field.startX < span.right;
        expect(overlaps, `${field.id} egy felső lap ALATT van, nem a hézagban`).toBe(false);
      }

      // ...és tényleg a sor kiterjedésén BELÜL, nem mellette.
      expect(field.startX).toBeGreaterThan(upperRoute[0].left);
      expect(field.endX).toBeLessThan(upperRoute[upperRoute.length - 1].right);
    }
  });
});

// --- Swinging Reaperek ------------------------------------------------------
//
// Ez a blokk váltja ki a `docs/level2-layout.md` „szélsőállásban ≥150 px a szomszéd platform
// álló-pozíciójától" szabályát, ami az `F` szakasz 120 px-es hézagjainál geometriailag
// teljesíthetetlen (a hézag közepére horgonyzott penge nem tud 60 px-nél távolabb kerülni a
// peremtől). A VALÓDI követelmény: a penge egyetlen fázisban se érje el az álló playert,
// és mindkét oldalon legyen hely a minta végignézésére.

describe('REAPERS', () => {
  /**
   * "Biztonságos" álló-pozíció: a penge középpontja a találati sugár KÉTSZERESÉNÉL is
   * távolabb marad. Levezetett, nem hangolt szám — a hitbox a grafika kiterjedéséből jön,
   * a kétszerese pedig azt fejezi ki, hogy a hely nem "épp csak" biztonságos.
   */
  const STANDING_CLEARANCE = 2 * REAPER_HIT_RADIUS;
  /** Ekkora összefüggő biztonságos sáv kell a minta végignézéséhez, mindkét oldalon. */
  const OBSERVATION_BAND = 64;

  /**
   * A design SZÁNDÉKA: mely felületeken kell a penge alatt TELJESEN biztonságosan állni.
   * Kézzel karbantartott tábla (a Level 1 `CASTER_TARGETS`-ének mintája): a szándékot
   * rögzíti, nem a jelenlegi számokból vezeti le — különben tautológia lenne.
   *
   * Az `E-reaper` listája SZÁNDÉKOSAN üres: az a penge TALAJ-szinten söpör, tehát a söprése
   * alatt állni halálos — ott a biztonságos hely a söprésen KÍVÜL van (lásd a következő
   * tesztet).
   */
  const REAPER_SAFE_SURFACES: Record<string, string[]> = {
    'E-reaper': [],
    'F-reaper-1': ['F1', 'F2'],
    'F-reaper-2': ['F2', 'F3'],
  };

  const standingY = (surfaceId: string): number =>
    surfaceSpan(surfaceId).top - PLAYER_HALF_HEIGHT;

  it('az id-k egyediek, és minden lengés valódi', () => {
    const ids = REAPERS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const def of REAPERS) {
      expect(def.maxAngleDeg).toBeGreaterThan(0);
      expect(def.maxAngleDeg).toBeLessThanOrEqual(90);
      expect(def.periodMs).toBeGreaterThan(0);
      expect(def.ropeLength).toBeGreaterThan(0);
      expect(REAPER_SAFE_SURFACES[def.id], `${def.id}: nincs deklarált szándék`).toBeDefined();
    }
  });

  it('MINDEN penge a saját hazardja fölött söpör (szakadék vagy tüskemező)', () => {
    // Enélkül egy elmozdított horgony némán "üres levegőt" söpörne, és a szakasz elveszítené
    // a tétjét.
    const gaps = groundGaps();

    for (const def of REAPERS) {
      const overGap = gaps.some((g) => def.anchorX > g.startX && def.anchorX < g.endX);
      const overSpikes = SPIKE_FIELDS.some(
        (f) => def.anchorX > f.startX && def.anchorX < f.endX
      );

      expect(overGap || overSpikes, `${def.id} nem hazard fölött van`).toBe(true);
    }
  });

  it('a deklarált felületeken a penge SEHOL nem éri el az álló playert', () => {
    // Az `F` szakasz lényege: mindhárom lap biztonságos VÁRAKOZÓHELY, tehát a pengék
    // magasan járnak — a fenyegetés az ugrás ívében van, nem a platform szintjén.
    for (const def of REAPERS) {
      for (const surfaceId of REAPER_SAFE_SURFACES[def.id]) {
        const span = surfaceSpan(surfaceId);
        const y = standingY(surfaceId);

        for (let x = span.left; x <= span.right; x += 2) {
          const distance = reaperMinDistanceTo(def, x, y);
          expect(
            distance,
            `${def.id}: a(z) ${surfaceId} x=${x} pontján álló player nincs biztonságban ` +
              `(${distance.toFixed(1)} px)`
          ).toBeGreaterThan(STANDING_CLEARANCE);
        }
      }
    }
  });

  it('MINDEN pengéhez van megfigyelő-állás MINDKÉT oldalon', () => {
    // A layout-spec „Player must be able to observe the pattern before committing to the
    // jump" pontja, geometriából levezetve. Az `F` pengéinél ezt a platformok adják, az
    // `E`-nél a söprésen kívüli talaj.
    for (const def of REAPERS) {
      const left = longestSafeBand(def, STANDING_CLEARANCE, (x) => x < def.anchorX);
      const right = longestSafeBand(def, STANDING_CLEARANCE, (x) => x > def.anchorX);

      expect(left, `${def.id}: nincs biztonságos megfigyelő-állás BALRA`).toBeGreaterThanOrEqual(
        OBSERVATION_BAND
      );
      expect(
        right,
        `${def.id}: nincs biztonságos megfigyelő-állás JOBBRA`
      ).toBeGreaterThanOrEqual(OBSERVATION_BAND);
    }
  });

  it('az E-penge a TALAJON GYALOGLÓ playert találja el', () => {
    // A legalsó pontja pontosan a talajon álló player középpontja. Ha valaki megrövidíti a
    // kötelet, a penge a fej fölött menne el, és a szakasz ártalmatlanná válna — ugyanaz a
    // hibaosztály, mint a Level 1-es `E1`-nél a caster lövedéke.
    const def = REAPERS.find((r) => r.id === 'E-reaper')!;
    const walkingY = GROUND_TOP - PLAYER_HALF_HEIGHT;

    expect(reaperMinDistanceTo(def, def.anchorX, walkingY)).toBeLessThan(REAPER_HIT_RADIUS);
  });

  it('az E-penge söprése lefedi a tüskemezőjét', () => {
    // Ettől lesz a rossz időzítés ára tüske VAGY kasza — a megosztott i-frame ablak miatt
    // sosem mindkettő.
    const def = REAPERS.find((r) => r.id === 'E-reaper')!;
    const sweep = reaperSweep(def);
    const field = SPIKE_FIELDS.find((f) => f.id === 'E-spikes-1')!;

    expect(sweep.left).toBeLessThanOrEqual(field.startX);
    expect(sweep.right).toBeGreaterThanOrEqual(field.endX);
  });

  it('a TALAJ-szintű penge alatt az átkelés BELEFÉR a félperiódusba', () => {
    // A layout-spec „avoid unavoidable damage" pontja, geometriából levezetve. Ha a penge
    // félperiódusa rövidebb, mint a biztonságos sávtól a biztonságos sávig tartó út ideje,
    // akkor a penge az átkelés közben garantáltan visszaér — a találat kikerülhetetlen
    // lenne, akármilyen jól időzít a player. (Az `E-reaper` eredeti 2600 ms-os periódusa
    // pontosan ebbe futott bele: 1300 ms félperiódus vs. ~1455 ms átkelés.)
    const walkingY = GROUND_TOP - PLAYER_HALF_HEIGHT;

    for (const def of REAPERS) {
      const danger = groundDangerSpan(def, STANDING_CLEARANCE, walkingY);
      if (!danger) continue; // ez a penge nem fenyegeti a talajon gyalogló playert

      const traverseMs = ((danger.right - danger.left) / MOVE_SPEED) * 1000;
      expect(
        def.periodMs / 2,
        `${def.id}: az átkelés (${traverseMs.toFixed(0)} ms) nem fér bele a félperiódusba`
      ).toBeGreaterThan(traverseMs);
    }
  });

  it('az F két pengéje PONTOSAN ellenfázisban jár', () => {
    // Ez a szakasz lényege: a két hézagot nem lehet egy lendülettel, ugyanabban a ritmusban
    // átugrani — az F2-n meg kell állni és újra időzíteni.
    const first = REAPERS.find((r) => r.id === 'F-reaper-1')!;
    const second = REAPERS.find((r) => r.id === 'F-reaper-2')!;

    expect(second.periodMs).toBe(first.periodMs);
    expect((second.phaseMs ?? 0) - (first.phaseMs ?? 0)).toBe(first.periodMs / 2);
  });

  it('az F két söprése NEM ér össze', () => {
    // Összeérő söprésnél a két penge ellenfázisban egymásba lógna — olvashatatlan látvány.
    const first = reaperSweep(REAPERS.find((r) => r.id === 'F-reaper-1')!);
    const second = reaperSweep(REAPERS.find((r) => r.id === 'F-reaper-2')!);

    expect(first.right).toBeLessThan(second.left);
  });

  it('az F pengéi a REPÜLÉSI ívben járnak: az álló player fölött, az apex alatt', () => {
    // A fenyegetés helye. A legalsó pont az álló player középpontja (244) FÖLÖTT van (tehát
    // állva biztonságos), de az ugrás apexe (244 - 156 = 88) ALATT — tehát aki elugrik,
    // annak az útjába esik.
    const standing = platformTop(platformById('F1')) - PLAYER_HALF_HEIGHT;
    const apex = standing - MAX_JUMP_HEIGHT;

    for (const def of REAPERS.filter((r) => r.id.startsWith('F-'))) {
      const sweep = reaperSweep(def);
      expect(sweep.lowestY, `${def.id} a platform szintjén söpör`).toBeLessThan(standing);
      expect(sweep.lowestY, `${def.id} az apex fölött söpör — sosem találna`).toBeGreaterThan(
        apex
      );
    }
  });
});

/**
 * A TALAJON az a vízszintes sáv, ahol a gyalogló player nincs biztonságban a pengétől.
 * `null`, ha a penge egyáltalán nem fenyegeti a talajszintet (az `F` pengéi ilyenek).
 */
function groundDangerSpan(
  def: (typeof REAPERS)[number],
  clearance: number,
  walkingY: number
): { left: number; right: number } | null {
  const STEP = 2;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;

  for (const segment of GROUND_SEGMENTS) {
    for (let x = segment.startX; x <= segment.endX; x += STEP) {
      if (reaperMinDistanceTo(def, x, walkingY) > clearance) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }

  return right >= left ? { left, right } : null;
}

/**
 * A leghosszabb ÖSSZEFÜGGŐ sáv egy szilárd felületen, ahol az álló player biztonságban van a
 * pengétől. A `filter` választja ki, hogy a horgonytól balra vagy jobbra keresünk.
 */
function longestSafeBand(
  def: (typeof REAPERS)[number],
  clearance: number,
  filter: (x: number) => boolean
): number {
  const STEP = 2;
  let best = 0;

  for (const surfaceId of [...GROUND_SEGMENTS.map((g) => g.id), ...PLATFORMS.map((p) => p.id)]) {
    const span = surfaceSpan(surfaceId);
    const y = span.top - PLAYER_HALF_HEIGHT;
    let run = 0;

    for (let x = span.left; x <= span.right; x += STEP) {
      const safe = filter(x) && reaperMinDistanceTo(def, x, y) > clearance;
      run = safe ? run + STEP : 0;
      best = Math.max(best, run);
    }
  }

  return best;
}

// --- Létrák -----------------------------------------------------------------

describe('LADDERS', () => {
  it('az id-k egyediek, és a rajzolt létra elfér a csempéjén', () => {
    const ids = LADDERS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const ladder of LADDERS) {
      expect(ladder.width).toBeLessThanOrEqual(LADDER_TILE_WIDTH);
      expect(ladder.width).toBeGreaterThan(PLAYER_BODY_WIDTH / 2);
    }
  });

  it('a kiindulási ÉS a cél felület is átfedi a létrát az x-énél', () => {
    // REGRESSZIÓ a `docs/level2-layout.md` ellen: ott a `H-ladder-2` (x=6820) a `H-ledge`-en
    // KÍVÜL volt (6520–6760), és a `H-ledge` a `boss-ledge`-dzsel sem fedett át — vagyis az
    // a létra nem létezhetett volna. Egy létra lába az `A` felületen áll, a teteje a `B` alá
    // ér, tehát MINDKETTŐNEK tartalmaznia kell a létra x-ét.
    for (const ladder of LADDERS) {
      for (const [role, id] of [
        ['kiindulási', ladder.fromSurfaceId],
        ['cél', ladder.toSurfaceId],
      ] as const) {
        const span = surfaceSpan(id);
        expect(
          ladder.x - ladder.width / 2,
          `${ladder.id}: a ${role} felület (${id}) nem éri el balról`
        ).toBeGreaterThanOrEqual(span.left);
        expect(
          ladder.x + ladder.width / 2,
          `${ladder.id}: a ${role} felület (${id}) nem éri el jobbról`
        ).toBeLessThanOrEqual(span.right);
      }
    }
  });

  it('a cél felület FELJEBB van, és `oneWay` — a létra alulról megy át rajta', () => {
    for (const ladder of LADDERS) {
      const from = surfaceSpan(ladder.fromSurfaceId);
      const to = surfaceSpan(ladder.toSurfaceId);
      expect(to.top, `${ladder.id} nem felfelé vezet`).toBeLessThan(from.top);

      const target = PLATFORMS.find((p) => p.id === ladder.toSurfaceId);
      expect(target, `${ladder.id} célja nem platform`).toBeDefined();
      expect(target!.oneWay, `${ladder.id} célja nem oneWay — a létra nem menne át rajta`).toBe(
        true
      );
    }
  });
});

// --- Enemyk -----------------------------------------------------------------

describe('ENEMY_SPAWNS', () => {
  it('az id-k egyediek, és a spawn a patrol-tartományon belül van', () => {
    const ids = ENEMY_SPAWNS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const enemy of ENEMY_SPAWNS) {
      expect(enemy.patrolMaxX, `${enemy.id}`).toBeGreaterThan(enemy.patrolMinX);
      expect(enemy.x, `${enemy.id} spawn a patrolon kívül`).toBeGreaterThanOrEqual(
        enemy.patrolMinX
      );
      expect(enemy.x, `${enemy.id} spawn a patrolon kívül`).toBeLessThanOrEqual(enemy.patrolMaxX);
    }
  });

  it('9 CrowHarvester + 6 Gravecaller', () => {
    // A doksi 10 + 4-et írt; a hangoló kör KÉT casterrel bővítette (a `B-pillar` őre) és
    // eggyel átsorolta (a `G` 2. cellájában a második crow -> caster), hogy a szűk cellában
    // NE két azonos szerep álljon egymás mellett.
    const crows = ENEMY_SPAWNS.filter((e) => enemyType(e) === 'crow-harvester');
    const casters = ENEMY_SPAWNS.filter((e) => enemyType(e) === 'gravecaller');
    expect(crows).toHaveLength(9);
    expect(casters).toHaveLength(6);
  });

  it('EGYETLEN enemy sem áll mozgó platformon', () => {
    // A layout-spec 19/7 pontja. A mozgó lapok nincsenek is a `surfaceSpan()`-ban, tehát egy
    // ilyen próbálkozás amúgy is dobna — de a szándékot rögzítjük.
    const moverIds = new Set(MOVING_PLATFORMS.map((m) => m.id));
    for (const enemy of ENEMY_SPAWNS) {
      expect(moverIds.has(enemy.surfaceId), `${enemy.id} mozgó platformon áll`).toBe(false);
    }
  });

  it('egyetlen patrol-tartomány sem lóg le a felületéről (a TESTTEL együtt)', () => {
    for (const enemy of ENEMY_SPAWNS) {
      const surface = surfaceSpan(enemy.surfaceId);
      expect(
        enemy.patrolMinX - enemyHalfBodyWidth(enemy),
        `${enemy.id} balra lelóg a(z) ${enemy.surfaceId} peremén`
      ).toBeGreaterThanOrEqual(surface.left);
      expect(
        enemy.patrolMaxX + enemyHalfBodyWidth(enemy),
        `${enemy.id} jobbra lelóg a(z) ${enemy.surfaceId} peremén`
      ).toBeLessThanOrEqual(surface.right);
    }
  });

  it('az üldözési határ TARTALMAZZA a patrolt, és a felületen BELÜL marad', () => {
    // Ha szűkebb lenne, az enemy a saját sétakörzetében ütközne láthatatlan falba — pont az
    // a hiba, amit a Level 1 finomhangolásának 1. köre javított.
    for (const enemy of ENEMY_SPAWNS) {
      const chase = enemyChaseBounds(enemy);
      const surface = surfaceSpan(enemy.surfaceId);
      const half = enemyHalfBodyWidth(enemy);

      expect(chase.min, `${enemy.id} üldözése balra szűkebb a patrolnál`).toBeLessThanOrEqual(
        enemy.patrolMinX
      );
      expect(chase.max, `${enemy.id} üldözése jobbra szűkebb a patrolnál`).toBeGreaterThanOrEqual(
        enemy.patrolMaxX
      );
      expect(chase.min - half, `${enemy.id} üldözés közben lelép balra`).toBeGreaterThanOrEqual(
        surface.left
      );
      expect(chase.max + half, `${enemy.id} üldözés közben lelép jobbra`).toBeLessThanOrEqual(
        surface.right
      );
    }
  });

  it('sem a patrol, sem az ÜLDÖZÉS nem enged tüskébe lépni', () => {
    for (const enemy of ENEMY_SPAWNS) {
      const chase = enemyChaseBounds(enemy);
      const half = enemyHalfBodyWidth(enemy);

      for (const field of SPIKE_FIELDS) {
        for (const [label, min, max] of [
          ['patrol', enemy.patrolMinX, enemy.patrolMaxX],
          ['üldözés', chase.min, chase.max],
        ] as const) {
          const overlaps = max + half > field.startX && min - half < field.endX;
          expect(overlaps, `${enemy.id} ${label} közben belesétál a(z) ${field.id} mezőbe`).toBe(
            false
          );
        }
      }
    }
  });

  it('a tüske-szigeteken a patrol-határ a landolópont ATTACK_RANGE-én KÍVÜL marad', () => {
    // A layout-spec `C-crow-1`-re megfogalmazott követelménye, általánosítva: aki átugorja a
    // mezőt, annak legyen ideje megfordulni a landolás után. Enélkül a szigetre érkezés
    // kikerülhetetlen csapást jelentene.
    for (const enemy of ENEMY_SPAWNS) {
      const half = enemyHalfBodyWidth(enemy);

      for (const field of SPIKE_FIELDS) {
        if (field.surfaceId !== enemy.surfaceId) continue;

        // A mező JOBB széle mögé landoló player, illetve a BAL széle elé érkező.
        if (field.endX <= enemy.patrolMinX) {
          expect(
            enemy.patrolMinX - half - field.endX,
            `${enemy.id} túl közel áll a(z) ${field.id} utáni landolóponthoz`
          ).toBeGreaterThanOrEqual(HARVESTER_ATTACK_RANGE);
        }
        if (field.startX >= enemy.patrolMaxX) {
          expect(
            field.startX - (enemy.patrolMaxX + half),
            `${enemy.id} túl közel áll a(z) ${field.id} előtti landolóponthoz`
          ).toBeGreaterThanOrEqual(HARVESTER_ATTACK_RANGE);
        }
      }
    }
  });

  it('EGYETLEN enemy sem áll kasza söprési sávjában', () => {
    for (const def of REAPERS) {
      const sweep = reaperSweep(def);
      const dangerLeft = sweep.left - REAPER_ENEMY_CLEARANCE;
      const dangerRight = sweep.right + REAPER_ENEMY_CLEARANCE;

      for (const enemy of ENEMY_SPAWNS) {
        const half = enemyHalfBodyWidth(enemy);
        const overlaps =
          enemy.patrolMaxX + half > dangerLeft && enemy.patrolMinX - half < dangerRight;
        expect(overlaps, `${enemy.id} a(z) ${def.id} söprési sávjában van`).toBe(false);
      }
    }
  });

  it('az F szakaszon NINCS enemy', () => {
    // A layout-spec explicit követelménye: két független kasza-időzítés már önmagában a
    // szakasz leckéje, egy lövedék vagy lökés ott kikerülhetetlen halált okozna.
    const gapF = groundGaps()[2];
    const fSurfaces = new Set(
      PLATFORMS.filter(
        (p) => platformRight(p) > gapF.startX && platformLeft(p) < gapF.endX
      ).map((p) => p.id)
    );

    for (const enemy of ENEMY_SPAWNS) {
      expect(fSurfaces.has(enemy.surfaceId), `${enemy.id} az F szakaszon áll`).toBe(false);
    }
  });

  it('a létra KIJÁRATÁNÁL nincs enemy attack range-en belül', () => {
    // Csak a FELSŐ felületre: a létra tövénél a player normálisan tud harcolni (a
    // `H-crow-1` kifejezetten oda van szánva kapuőrnek), a tetején viszont védtelenül lép ki.
    for (const ladder of LADDERS) {
      for (const enemy of ENEMY_SPAWNS) {
        if (enemy.surfaceId !== ladder.toSurfaceId) continue;

        const half = enemyHalfBodyWidth(enemy);
        const distance = Math.max(
          ladder.x - (enemy.patrolMaxX + half),
          enemy.patrolMinX - half - ladder.x
        );
        expect(
          distance,
          `${enemy.id} túl közel van a(z) ${ladder.id} kijáratához`
        ).toBeGreaterThanOrEqual(LADDER_EXIT_CLEARANCE);
      }
    }
  });

  it('a FÖLDI enemyk üldözési tere érdemben tágabb a patroljuknál', () => {
    const groundEnemies = ENEMY_SPAWNS.filter((e) =>
      GROUND_SEGMENTS.some((g) => g.id === e.surfaceId)
    );
    expect(groundEnemies.length).toBeGreaterThan(0);

    for (const enemy of groundEnemies) {
      const chase = enemyChaseBounds(enemy);
      expect(
        chase.max - chase.min,
        `${enemy.id} üldözési tere nem tágabb a patroljánál`
      ).toBeGreaterThan(enemy.patrolMaxX - enemy.patrolMinX);
    }
  });
});

// --- Gravecallerek elhelyezése ----------------------------------------------
//
// A legfontosabb állítás itt is az, ami a Level 1-en kézi teszten bukott ki: az, hogy egy
// caster ÉSZLEL egy playert, még nem jelenti, hogy EL IS TALÁLJA. A vízszintes lövedék csak
// egy szűk magasság-sávot ér el, ezért a cél-felületeknél a TÉNYLEGES sáv-átfedést nézzük.

describe('Gravecallerek (Enemy 2) elhelyezése', () => {
  const casters = ENEMY_SPAWNS.filter((e) => enemyType(e) === 'gravecaller');

  /**
   * A design SZÁNDÉKA: melyik casternek mely felületeken álló playert kell eltalálnia.
   * Kézzel karbantartott tábla — pont ez a lényege: a szándékot rögzíti, nem a jelenlegi
   * számokból vezeti le (különben tautológia lenne).
   *
   * A `G-caster-2`-nél a `G-P1` SZÁNDÉKOSAN hiányzik: a felső útvonal ELSŐ hopja még a
   * hatókörén kívül esik, a nyomás csak a másodiktól kezdődik.
   */
  const CASTER_TARGETS: Record<string, string[]> = {
    // A `B-mover-*` MOZGÓ platform, és ez SZÁNDÉKOS kivétel a 19/4 invariáns alól: a pillér
    // pontosan a moverek szintjén van, tehát a bolt a rajtuk állót éri. A deklaráció maga a
    // kivétel — ami NINCS itt felsorolva, azt a lenti negatív teszt továbbra is bukja.
    'B-caster-1': ['B-mover-1', 'B-mover-2'],
    'D-caster-1': ['D2', 'D3'],
    'E-caster-1': ['G3'],
    'G-caster-1': ['G4'],
    'G-caster-2': ['G4'],
    'G-caster-3': ['G-P2', 'G-P3'],
  };

  const casterCenterY = (surfaceId: string): number =>
    surfaceSpan(surfaceId).top - GRAVECALLER_SPAWN_OFFSET;

  /**
   * Egy cél-id feloldása arra a sávra, amit a rajta ÁLLÓ player teste elfoglal. A cél lehet
   * talaj-szegmens, statikus platform VAGY mozgó lap; utóbbinál a mozgás minden állását
   * lefedő UNIÓT adjuk (a `B-mover-*` két végállása azonos magasságú, tehát ott pontos).
   */
  const targetBand = (id: string): { top: number; bottom: number } => {
    const mover = MOVING_PLATFORMS.find((m) => m.id === id);
    if (mover) {
      const tops = movingPlatformExtremes(mover).map((s) => s.top);
      return { top: Math.min(...tops) - PLAYER_BODY_HEIGHT, bottom: Math.max(...tops) };
    }
    const top = surfaceSpan(id).top;
    return { top: top - PLAYER_BODY_HEIGHT, bottom: top };
  };

  /** A cél-felületen álló player KÖZÉPPONTJA (mozgó lapnál a legtávolabbi állás). */
  const targetCenterYs = (id: string): number[] => {
    const mover = MOVING_PLATFORMS.find((m) => m.id === id);
    const tops = mover
      ? movingPlatformExtremes(mover).map((s) => s.top)
      : [surfaceSpan(id).top];
    return tops.map((top) => top - PLAYER_HALF_HEIGHT);
  };

  /** A kilőtt lövedék függőleges sávja (a physics body 16x16, origin 0.5). */
  const projectileBand = (caster: (typeof casters)[number]) => {
    const center = casterCenterY(caster.surfaceId) + GRAVECALLER_PROJECTILE_OFFSET_Y;
    return {
      top: center - GRAVECALLER_PROJECTILE_SIZE / 2,
      bottom: center + GRAVECALLER_PROJECTILE_SIZE / 2,
    };
  };

  it('mindegyikhez tartozik deklarált cél-felület', () => {
    expect(casters.length).toBeGreaterThan(0);
    for (const caster of casters) {
      expect(CASTER_TARGETS[caster.id], `${caster.id}: nincs cél-felület deklarálva`).toBeDefined();
      expect(CASTER_TARGETS[caster.id].length).toBeGreaterThan(0);
    }
  });

  it('HÁROM a TALAJON áll — tudatos megfordítása a Level 1-es döntésnek', () => {
    // A Level 1-en minden caster platformon állt, és a futósáv szándékosan kimaradt a
    // hatókörükből. Itt maga a futósáv lőtt terület, és ez az egyik oka, hogy a Level 2-n
    // nem lehet átszaladni.
    const onGround = casters.filter((c) => GROUND_SEGMENTS.some((g) => g.id === c.surfaceId));
    expect(onGround.map((c) => c.id).sort()).toEqual([
      'E-caster-1',
      'G-caster-1',
      'G-caster-2',
    ]);
  });

  it('a lövedék ELTALÁLJA a cél-felületeken álló playert', () => {
    // REGRESSZIÓ a Level 1-es `E1`-hiba osztálya ellen: ott a bolt 6 px-szel a fej fölött
    // ment el, tehát a caster tüzelt, de sosem talált. Nem elég detektálni — a két sávnak
    // fednie kell egymást.
    for (const caster of casters) {
      const bolt = projectileBand(caster);

      for (const targetId of CASTER_TARGETS[caster.id]) {
        const body = targetBand(targetId);
        const overlap = Math.min(bolt.bottom, body.bottom) - Math.max(bolt.top, body.top);

        expect(
          overlap,
          `${caster.id}: a lövedék elmegy a(z) ${targetId}-n álló player mellett`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('a cél-felületek a VERTIKÁLIS detektálási sávon belül vannak', () => {
    for (const caster of casters) {
      const casterY = casterCenterY(caster.surfaceId);

      for (const targetId of CASTER_TARGETS[caster.id]) {
        for (const centerY of targetCenterYs(targetId)) {
          expect(
            Math.abs(centerY - casterY),
            `${caster.id}: nem venné észre a(z) ${targetId}-n álló playert`
          ).toBeLessThanOrEqual(GRAVECALLER_VERTICAL_RANGE);
        }
      }
    }
  });

  it('a PLATFORM cél-felületek TELJES hosszukban a vízszintes hatókörön belül vannak', () => {
    // A legrosszabb eset: a caster a patroljának TÁVOLABBI végén jár, a player pedig a
    // cél-felület átellenes peremén áll. Ez a kényszer szűkíti a `D-caster-1` patrolját
    // 30 px-re: a `D2` teljes hosszának a hatókörén belül kell lennie.
    //
    // CSAK platformokra: egy platform zárt, elkötelezett terep — oda felugorva a playernek
    // AZONNAL számítania kell a tűzre. Egy 900–1640 px-es TALAJSZEGMENSNÉL ez értelmetlen
    // követelmény lenne (a `DETECTION_RANGE` 400), és a ground caster nem is a teljes
    // szegmenst uralja, hanem a saját celláját. Ott a lényegi állítás a sáv-átfedés, amit a
    // fenti teszt bizonyít.
    for (const caster of casters) {
      for (const surfaceId of CASTER_TARGETS[caster.id]) {
        if (!PLATFORMS.some((p) => p.id === surfaceId)) continue;

        const span = surfaceSpan(surfaceId);
        const worstCase = Math.max(
          Math.abs(caster.patrolMaxX - span.left),
          Math.abs(caster.patrolMinX - span.right)
        );

        expect(
          worstCase,
          `${caster.id}: a(z) ${surfaceId} nem fér bele a detektálási körébe`
        ).toBeLessThanOrEqual(GRAVECALLER_DETECTION_RANGE);
      }
    }
  });

  it('a TALAJON álló casterek látják a cellájuk BEJÁRATÁT', () => {
    // A ground caster megfelelője a fenti platform-tesztnek, a lényegi állításra szűkítve.
    //
    // A player MINDIG balról érkezik, tehát az számít, hogy a caster már a cella bal végén
    // észlelje — "amint kijössz a tüskékből, ő már tüzel". A cella JOBB vége szándékosan nincs
    // állítva: a `G-caster-1` cellája a szegmens végéig (7176) tart, ami a `DETECTION_RANGE`
    // (400) kétszerese — a mögötte lévő létra-szakaszt nem is kell uralnia.
    for (const caster of casters) {
      if (!GROUND_SEGMENTS.some((g) => g.id === caster.surfaceId)) continue;

      const cell = enemyChaseBounds(caster);
      const reachLeft = caster.patrolMinX - GRAVECALLER_DETECTION_RANGE;

      expect(reachLeft, `${caster.id} nem látja a cellája bejáratát`).toBeLessThanOrEqual(
        cell.min
      );
    }
  });

  it('EGYETLEN bolt-sáv sem metszi mozgó platform pályáját', () => {
    // A layout-spec 19/4 invariánsa: mozgó platformon a player nem tud kitérni, ott egy
    // lövedék kikerülhetetlen sebzés lenne. Pontosan ez a kényszer emelte az `E-lift` alsó
    // állását +20-ról +70-re.
    //
    // A vízszintes hatókört is nézni KELL: a bolt-sáv magassága önmagában hamis riasztást
    // adna olyan platformokra, amik a pálya túlsó végén vannak.
    for (const caster of casters) {
      const bolt = projectileBand(caster);
      const reachLeft = caster.patrolMinX - GRAVECALLER_DETECTION_RANGE;
      const reachRight = caster.patrolMaxX + GRAVECALLER_DETECTION_RANGE;

      for (const mover of MOVING_PLATFORMS) {
        // A DEKLARÁLT célok kivételek: a `B-caster-1` szándékosan lövi a moverjeit (lásd a
        // CASTER_TARGETS kommentjét). Ami nincs deklarálva, az továbbra is hiba.
        if (CASTER_TARGETS[caster.id].includes(mover.id)) continue;

        const path = movingPlatformPathBounds(mover);
        if (path.right < reachLeft || path.left > reachRight) continue;

        // A lapon álló player teste, a mozgás MINDEN állásában.
        const tops = movingPlatformExtremes(mover).map((s) => s.top);
        const body = { top: Math.min(...tops) - PLAYER_BODY_HEIGHT, bottom: Math.max(...tops) };
        const overlap = Math.min(bolt.bottom, body.bottom) - Math.max(bolt.top, body.top);

        expect(
          overlap,
          `${caster.id} lövi a(z) ${mover.id} mozgó platformon állót — ott nincs kitérés`
        ).toBeLessThanOrEqual(0);
      }
    }
  });
});

// --- Checkpointok -----------------------------------------------------------

describe('CHECKPOINTS', () => {
  it('az id-k egyediek, és balról jobbra haladnak', () => {
    const ids = CHECKPOINTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (let i = 1; i < CHECKPOINTS.length; i++) {
      expect(CHECKPOINTS[i].x).toBeGreaterThan(CHECKPOINTS[i - 1].x);
    }
  });

  it('mind létező felületen állnak, a zónájukkal együtt', () => {
    for (const checkpoint of CHECKPOINTS) {
      const surface = surfaceSpan(checkpoint.surfaceId);
      expect(
        checkpoint.x - CHECKPOINT_ZONE.width / 2,
        `${checkpoint.id} kilóg balra`
      ).toBeGreaterThanOrEqual(surface.left);
      expect(
        checkpoint.x + CHECKPOINT_ZONE.width / 2,
        `${checkpoint.id} kilóg jobbra`
      ).toBeLessThanOrEqual(surface.right);

      expect(checkpointRespawnY(checkpoint)).toBe(surface.top - PLAYER_HALF_HEIGHT);
    }
  });

  it('egyik sem tüskemezőn éled újra', () => {
    for (const checkpoint of CHECKPOINTS) {
      for (const field of SPIKE_FIELDS) {
        if (field.surfaceId !== checkpoint.surfaceId) continue;
        const left = checkpoint.x - CHECKPOINT_ZONE.width / 2;
        const right = checkpoint.x + CHECKPOINT_ZONE.width / 2;
        expect(right > field.startX && left < field.endX, `${checkpoint.id} a(z) ${field.id}-n`).toBe(
          false
        );
      }
    }
  });

  it('az EGYETLEN köztes checkpoint a leghosszabb szakadék ELŐTT áll', () => {
    // A doksi eredeti szabálya („checkpoint minden zuhanással ölő szakasz elé") a `CP-1` és a
    // `CP-3` törlésével (user-döntés) érvényét vesztette. Ami HELYETTE igaz, és amit el lehet
    // rontani: egyetlen mentési pontnál annak a LEGDRÁGÁBB szakasz elé kell kerülnie.
    expect(CHECKPOINTS).toHaveLength(1);

    const gaps = groundGaps();
    const longest = gaps.reduce((a, b) => (b.width > a.width ? b : a));

    expect(
      CHECKPOINTS[0].x,
      'a checkpoint nem a leghosszabb szakadék előtt van'
    ).toBeLessThanOrEqual(longest.startX);
  });

  it('a köztes checkpoint MÖGÖTT hagyja az összes többi szakadékot', () => {
    // Ez adja a helyének a valódi értékét: aki megérintette, annak sem a mozgó platformokat
    // (gap B), sem a caster-tűz alatti lépcsőt (gap D) nem kell újra teljesítenie. Ha valaki
    // balra tolná, egy `F`-beli halál a `D` újrajátszását is jelentené.
    const gaps = groundGaps();
    const longest = gaps.reduce((a, b) => (b.width > a.width ? b : a));

    for (const gap of gaps) {
      if (gap === longest) continue;
      expect(
        gap.endX,
        `a ${gap.startX}–${gap.endX} szakadék a checkpoint UTÁN van — újra kellene játszani`
      ).toBeLessThanOrEqual(CHECKPOINTS[0].x);
    }
  });
});

// --- Boss-ajtó --------------------------------------------------------------

describe('boss-ajtó', () => {
  const ledge = platformById('boss-ledge');

  it('a boss-előtér párkányán áll', () => {
    expect(DOOR.x - DOOR.width / 2).toBeGreaterThanOrEqual(platformLeft(ledge));
    expect(DOOR.x + DOOR.width / 2).toBeLessThanOrEqual(platformRight(ledge));
  });

  it('a nyílásán átfér a player', () => {
    expect(DOOR.width).toBeGreaterThan(PLAYER_BODY_WIDTH);
    expect(DOOR.height).toBeGreaterThan(PLAYER_BODY_HEIGHT);
  });

  it('a párkány jobb széle PONTOSAN a pálya széle', () => {
    // Ugyanaz a szándékos design-tény, mint a Level 1 `H1`-énél: a szakasz valódi
    // végállomásként olvas, nem egy lebegő lapként, ami mögött még marad hely.
    expect(platformRight(ledge)).toBe(WORLD_WIDTH);
  });

  it('az ajtó-checkpointon a player a párkány felszínén áll, az ajtón kívül', () => {
    expect(DOOR_CHECKPOINT.y).toBe(platformTop(ledge) - PLAYER_HALF_HEIGHT);
    expect(DOOR_CHECKPOINT.x).toBeGreaterThanOrEqual(platformLeft(ledge));
    expect(DOOR_CHECKPOINT.x).toBeLessThan(DOOR.x - DOOR.width / 2);
  });

  it('az I szakasz hazard-mentes — a boss előtti utolsó pont mindig biztonságos', () => {
    for (const field of SPIKE_FIELDS) {
      expect(field.startX, `${field.id} a boss-előtérben van`).toBeLessThan(
        platformLeft(ledge)
      );
    }
  });
});

// --- Konzisztencia a rendereléssel ------------------------------------------

describe('a layout és a csempe-geometria összhangja', () => {
  it('a platformok magassága a csempe magassága — a platformTop/Bottom erre épül', () => {
    for (const p of PLATFORMS) {
      expect(platformBottom(p) - platformTop(p)).toBe(PLATFORM_TILE_HEIGHT);
    }
  });
});
