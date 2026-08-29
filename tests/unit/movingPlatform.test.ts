// A mozgó platform mozgásprofilja és rider-szállítása.
//
// A mag PURE (`platformProgressAt` / `platformPositionAt`), a `SwingingReaper.swingAngleAt()`
// mintájára — ezért a lényegi állítások Phaser-mock nélkül bizonyíthatók. A `phaser` modult
// mégis mockolni kell, mert a `LevelGeometry` a `Player` konstansait importálja, az pedig
// futásidőben Phasert használ.
//
// Két dolgot őriz, amit könnyű elrontani:
//   1. a pozíció az IDŐ függvénye, nem sebesség-integrálás — ezért van a platform respawn
//      után magától a helyes fázisban, és nem sodródik el hosszú játék alatt;
//   2. a rider-szállítás `y`-t CSAK süllyedéskor visz át (emelkedéskor a physics-szeparáció
//      már megemelte a playert — a delta újbóli hozzáadása kilökné a lapról).
import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

import MovingPlatform, {
  isRiding,
  platformCycleMs,
  platformPositionAt,
  platformProgressAt,
  platformTravelDistance,
  platformTravelMs,
  RIDE_TOLERANCE_Y,
} from '../../src/platforms/MovingPlatform';
import {
  MOVING_PLATFORM_HEIGHT,
  movingPlatformExtremes,
  movingPlatformPathBounds,
  movingPlatformSpan,
  type MovingPlatformDef,
} from '../../src/levels/LevelGeometry';
import { createMockScene, createMockStaticGroup } from './helpers/phaserTestUtils';
import {
  TOWN_CAP_SIZE,
  TOWN_TILE_TEXTURES,
} from '../../src/levels/GothicTownTileset';

/** Vízszintes: 200 px út 100 px/s-mal = 2000 ms, 500 ms megállással -> 5000 ms ciklus. */
const HORIZONTAL: MovingPlatformDef = {
  id: 'test-h',
  fromX: 1000,
  fromY: 300,
  toX: 1200,
  toY: 300,
  speed: 100,
  dwellMs: 500,
  tiles: 1.5,
};

/** Függőleges: 100 px út 50 px/s-mal = 2000 ms. */
const VERTICAL: MovingPlatformDef = {
  id: 'test-v',
  fromX: 4450,
  fromY: 376,
  toX: 4450,
  toY: 276,
  speed: 50,
  dwellMs: 400,
  tiles: 1.5,
};

// --- Levezetett időzítés ----------------------------------------------------

describe('a ciklus időzítése a sebességből származik', () => {
  it('a menetidő az út hossza / a sebesség', () => {
    expect(platformTravelDistance(HORIZONTAL)).toBe(200);
    expect(platformTravelMs(HORIZONTAL)).toBe(2000);

    expect(platformTravelDistance(VERTICAL)).toBe(100);
    expect(platformTravelMs(VERTICAL)).toBe(2000);
  });

  it('egy teljes ciklus KÉT menet + KÉT megállás', () => {
    expect(platformCycleMs(HORIZONTAL)).toBe(2 * (2000 + 500));
    expect(platformCycleMs(VERTICAL)).toBe(2 * (2000 + 400));
  });
});

// --- A mozgásprofil ---------------------------------------------------------

describe('platformProgressAt', () => {
  it('t=0-nál a KIINDULÁSI végponton ÁLL — a player egy teljes ciklust lát végig', () => {
    // Ugyanaz az elv, mint a kaszánál (koszinusz -> szélsőállásban indul): a pálya
    // betöltésekor a minta olvasható, nem menet közben kell belekapaszkodni.
    expect(platformProgressAt(0, HORIZONTAL)).toBe(0);
    expect(platformProgressAt(250, HORIZONTAL)).toBe(0);
    expect(platformProgressAt(499, HORIZONTAL)).toBe(0);
  });

  it('a megállás UTÁN indul, és lineárisan halad', () => {
    expect(platformProgressAt(500, HORIZONTAL)).toBe(0);
    expect(platformProgressAt(1500, HORIZONTAL)).toBeCloseTo(0.5, 6);
    expect(platformProgressAt(2500, HORIZONTAL)).toBe(1);
  });

  it('a TÚLSÓ végponton is megáll — mindkét felugrás gyakorolható', () => {
    // Ez a `dwellMs` létezésének az oka: megállás nélkül a felugrás pillanata nem
    // gyakorolható, és minden ugrást "menet közben" kellene célozni.
    expect(platformProgressAt(2500, HORIZONTAL)).toBe(1);
    expect(platformProgressAt(2750, HORIZONTAL)).toBe(1);
    expect(platformProgressAt(2999, HORIZONTAL)).toBe(1);
  });

  it('visszafelé is lineárisan halad', () => {
    expect(platformProgressAt(3000, HORIZONTAL)).toBe(1);
    expect(platformProgressAt(4000, HORIZONTAL)).toBeCloseTo(0.5, 6);
    expect(platformProgressAt(4999, HORIZONTAL)).toBeCloseTo(0.0005, 4);
  });

  it('a ciklus ismétlődik — a pozíció az IDŐ függvénye, nem integrálásé', () => {
    // Ez a respawn-ígéret magja: a scene-idő ugyanoda hozza vissza a platformot, tehát a
    // player halála után nem kell semmit visszaállítani.
    const cycle = platformCycleMs(HORIZONTAL);

    for (const t of [0, 750, 1500, 2600, 3900]) {
      expect(platformProgressAt(t + cycle, HORIZONTAL)).toBeCloseTo(
        platformProgressAt(t, HORIZONTAL),
        9
      );
      expect(platformProgressAt(t + 17 * cycle, HORIZONTAL)).toBeCloseTo(
        platformProgressAt(t, HORIZONTAL),
        9
      );
    }
  });

  it('determinisztikus: ugyanaz a bemenet mindig ugyanazt adja', () => {
    // NINCS `Phaser.Math.Between` — ugyanaz az elv, amiért a kasza lengése és a boss
    // támadás-választása is determinisztikus: csak így tanulható meg a minta.
    for (let t = 0; t < 6000; t += 137) {
      expect(platformProgressAt(t, HORIZONTAL)).toBe(platformProgressAt(t, HORIZONTAL));
    }
  });

  it('a phaseMs eltolja a ciklust, negatív értékre is', () => {
    const cycle = platformCycleMs(HORIZONTAL);
    const shifted: MovingPlatformDef = { ...HORIZONTAL, phaseMs: 1500 };

    expect(platformProgressAt(0, shifted)).toBeCloseTo(platformProgressAt(1500, HORIZONTAL), 9);

    // A JS `%`-ja negatív bemenetre negatívat ad — enélkül a negatív fázis kilógna a
    // ciklusból, és a profil ágai rossz sorrendben tüzelnének.
    const negative: MovingPlatformDef = { ...HORIZONTAL, phaseMs: -1000 };
    const p = platformProgressAt(0, negative);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeCloseTo(platformProgressAt(cycle - 1000, HORIZONTAL), 9);
  });

  it('elfajult (nulla hosszú) útnál nem NaN-ol', () => {
    const degenerate: MovingPlatformDef = { ...HORIZONTAL, toX: HORIZONTAL.fromX };
    expect(platformProgressAt(1234, degenerate)).toBe(0);
  });
});

// --- Pozíció ----------------------------------------------------------------

describe('platformPositionAt', () => {
  it('vízszintesen a két végpont között interpolál', () => {
    expect(platformPositionAt(0, HORIZONTAL)).toEqual({ x: 1000, y: 300 });
    expect(platformPositionAt(1500, HORIZONTAL).x).toBeCloseTo(1100, 6);
    expect(platformPositionAt(2500, HORIZONTAL)).toEqual({ x: 1200, y: 300 });
  });

  it('függőlegesen csak az y változik', () => {
    expect(platformPositionAt(0, VERTICAL)).toEqual({ x: 4450, y: 376 });
    expect(platformPositionAt(1400, VERTICAL).y).toBeCloseTo(326, 6);
    expect(platformPositionAt(2400, VERTICAL)).toEqual({ x: 4450, y: 276 });

    for (let t = 0; t < 6000; t += 111) {
      expect(platformPositionAt(t, VERTICAL).x).toBe(4450);
    }
  });

  it('SOSEM megy túl a két végponton', () => {
    for (let t = 0; t < 20000; t += 73) {
      const { x } = platformPositionAt(t, HORIZONTAL);
      expect(x).toBeGreaterThanOrEqual(HORIZONTAL.fromX);
      expect(x).toBeLessThanOrEqual(HORIZONTAL.toX);
    }
  });
});

// --- Geometria (a layout-teszt ezekre épül) ---------------------------------

describe('geometria', () => {
  it('a span a `tiles` konvencióját követi (64 px / csempe)', () => {
    const span = movingPlatformSpan(HORIZONTAL, 1000, 300);
    expect(span.right - span.left).toBe(HORIZONTAL.tiles * 64);
    expect(span.top).toBe(300 - MOVING_PLATFORM_HEIGHT / 2);
  });

  it('a két végállás a MOZGÁS két szélsőértéke', () => {
    const [from, to] = movingPlatformExtremes(HORIZONTAL);
    expect(from.left).toBe(1000 - 48);
    expect(to.right).toBe(1200 + 48);
  });

  it('a pálya-téglalap MINDEN köztes pozíciót tartalmaz', () => {
    // Erre épül a „caster bolt-sávja nem metszhet mozgó platform pályát" invariáns: ha a
    // téglalap nem fedné le a teljes utat, az ellenőrzés hamis biztonságot adna.
    const bounds = movingPlatformPathBounds(VERTICAL);

    for (let t = 0; t < 10000; t += 53) {
      const { x, y } = platformPositionAt(t, VERTICAL);
      const span = movingPlatformSpan(VERTICAL, x, y);
      expect(span.left).toBeGreaterThanOrEqual(bounds.left);
      expect(span.right).toBeLessThanOrEqual(bounds.right);
      expect(span.top).toBeGreaterThanOrEqual(bounds.top);
      expect(span.top + MOVING_PLATFORM_HEIGHT).toBeLessThanOrEqual(bounds.bottom);
    }
  });
});

// --- Rider-teszt ------------------------------------------------------------

describe('isRiding', () => {
  const span = { left: 1000, right: 1096, top: 300 };

  it('igaz, ha a test alja a lap tetején van és vízszintesen fed', () => {
    expect(isRiding({ bottom: 300, left: 1030, right: 1058 }, span)).toBe(true);
  });

  it('tűr némi eltérést — a szeparáció nem hagyja PONTOSAN a lap tetején a testet', () => {
    expect(isRiding({ bottom: 300 - RIDE_TOLERANCE_Y, left: 1030, right: 1058 }, span)).toBe(true);
    expect(isRiding({ bottom: 300 + RIDE_TOLERANCE_Y, left: 1030, right: 1058 }, span)).toBe(true);
  });

  it('hamis, ha a player a levegőben van vagy a lap alatt', () => {
    expect(isRiding({ bottom: 200, left: 1030, right: 1058 }, span)).toBe(false);
    expect(isRiding({ bottom: 400, left: 1030, right: 1058 }, span)).toBe(false);
  });

  it('hamis, ha vízszintesen nem fedi a lapot', () => {
    // A `body.blocked.down` erre nem elég: az akkor is igaz, ha a player a TALAJON áll
    // pontosan a lap magasságában. A szállítást ezért geometriailag döntjük el.
    expect(isRiding({ bottom: 300, left: 900, right: 928 }, span)).toBe(false);
    expect(isRiding({ bottom: 300, left: 1200, right: 1228 }, span)).toBe(false);
  });

  it('a peremen ÁLLVA még igaz, elhagyva már nem', () => {
    expect(isRiding({ bottom: 300, left: 990, right: 1002 }, span)).toBe(true);
    expect(isRiding({ bottom: 300, left: 972, right: 1000 }, span)).toBe(false);
  });
});

// --- Az osztály -------------------------------------------------------------

describe('MovingPlatform', () => {
  it('a kiindulási végponton jön létre, a `tiles` szerint skálázva', () => {
    const group = createMockStaticGroup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new MovingPlatform(HORIZONTAL, group as any);

    expect(group.created).toHaveLength(1);
    expect(group.created[0].x).toBe(1000);
    expect(group.created[0].y).toBe(300);
    expect(group.created[0].scaleX).toBe(1.5);
    // Enyhe tint: a mozgó lap felismerhetősége gameplay-információ, nem dekoráció.
    expect(group.created[0].tint).not.toBeNull();
  });

  it('minden update() után FRISSÍTI a static bodyt', () => {
    // Static bodynál a `refreshBody()` KÖTELEZŐ: enélkül a látvány elmozdulna, a fizika
    // viszont a régi helyén maradna — a player a semmin állna.
    const group = createMockStaticGroup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new MovingPlatform(HORIZONTAL, group as any);
    const before = group.created[0].refreshCount;

    platform.update(16);
    platform.update(16);

    expect(group.created[0].refreshCount).toBe(before + 2);
  });

  it('az akkumulált idő ugyanoda viszi, mint a pure függvény', () => {
    const group = createMockStaticGroup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new MovingPlatform(HORIZONTAL, group as any);

    let elapsed = 0;
    for (let i = 0; i < 100; i++) {
      platform.update(16);
      elapsed += 16;
    }

    const expected = platformPositionAt(elapsed, HORIZONTAL);
    expect(group.created[0].x).toBeCloseTo(expected.x, 6);
    expect(platform.getSpan().left).toBeCloseTo(expected.x - 48, 6);
  });

  it('a delta a KÉT frame közti tényleges elmozdulás', () => {
    const group = createMockStaticGroup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new MovingPlatform(HORIZONTAL, group as any);

    // Az első megállás alatt nem mozdul.
    platform.update(400);
    expect(platform.getDelta()).toEqual({ x: 0, y: 0 });

    // A menet közepén 100 px/s -> 16 ms alatt 1.6 px.
    platform.update(1100); // t = 1500, a menet közepe
    platform.update(16);
    expect(platform.getDelta().x).toBeCloseTo(1.6, 4);
    expect(platform.getDelta().y).toBe(0);
  });

  it('vízszintesen MINDIG szállít, függőlegesen csak SÜLLYEDÉSKOR', () => {
    // Emelkedéskor az Arcade-szeparáció már megemelte a playert; a delta újbóli
    // hozzáadása kilökné a lapról, és zuhanást okozna. Süllyedéskor viszont a szeparáció
    // nem tud lefelé húzni — nélküle a player frame-enként elszakadna a laptól és remegne.
    const group = createMockStaticGroup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lift = new MovingPlatform(VERTICAL, group as any);

    // A `to` végpont FELJEBB van (376 -> 276), tehát az odaút EMELKEDÉS.
    lift.update(400); // megállás vége
    lift.update(100); // emelkedik
    expect(lift.getDelta().y).toBeLessThan(0);

    const rising = { x: 4450, y: 200 };
    lift.carry(rising);
    expect(rising.y, 'emelkedéskor NEM szabad az y-t átvinni').toBe(200);
    expect(rising.x).toBeCloseTo(4450 + lift.getDelta().x, 6);

    // Vissza a `from` felé: ez SÜLLYEDÉS. A ciklus: 400 megállás, 2000 emelkedés,
    // 400 megállás a tetején, 2000 süllyedés -> t=3000 már a süllyedő ágon van.
    lift.update(2500); // t = 3000
    lift.update(16);
    expect(lift.getDelta().y).toBeGreaterThan(0);

    const sinking = { x: 4450, y: 200 };
    const delta = lift.getDelta();
    lift.carry(sinking);
    expect(sinking.y, 'süllyedéskor át KELL vinni az y-t').toBeCloseTo(200 + delta.y, 6);
  });
});

// --- A fa-látvány (Level 2 / gothic-town skin) -------------------------------
//
// A valódi csempekészletnél a LÁTVÁNY és a FIZIKA külön objektum (a static spriteot
// vízszintesen skálázzuk, ami egy valódi textúrát megnyújtana). Egy mozgó lapnál ebből egy
// új hibalehetőség születik, ami a statikus platformoknál nem létezik: a látvány
// ELCSÚSZHAT a testtől. Ezek a tesztek pontosan ezt zárják ki.

describe('MovingPlatform — gothic-town látvány', () => {
  function createWooden(def: MovingPlatformDef = HORIZONTAL) {
    const group = createMockStaticGroup();
    const scene = createMockScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new MovingPlatform(def, group as any, scene as any, 'gothic-town');
    return { group, scene, platform };
  }

  it('a fizikai sprite LÁTHATATLAN, a látványt a három fa-csempe adja', () => {
    const { group, scene } = createWooden();

    expect(group.created[0].visible).toBe(false);
    expect(scene.add.tileSprite).toHaveBeenCalledTimes(1); // a pallólap
    expect(scene.add.image).toHaveBeenCalledTimes(2); // a két végzáró

    const textures = scene.add.image.mock.calls.map((call) => call[2]);
    expect(textures).toEqual([
      TOWN_TILE_TEXTURES.PLATFORM_CAP_LEFT,
      TOWN_TILE_TEXTURES.PLATFORM_CAP_RIGHT,
    ]);
  });

  it('LÁBA SOSINCS — a mozgó lapok mind szakadék fölött járnak', () => {
    const { scene } = createWooden();

    const textures = [
      ...scene.add.image.mock.calls.map((call) => call[2]),
      ...scene.add.tileSprite.mock.calls.map((call) => call[4]),
    ];
    expect(textures).not.toContain(TOWN_TILE_TEXTURES.PLATFORM_LEGS);
    expect(textures).not.toContain(TOWN_TILE_TEXTURES.PLATFORM_FOOT);
  });

  it('a látvány a testtel EGYÜTT mozdul, minden frame-ben', () => {
    // Ez a valódi kockázat: ha a syncVisuals() kimarad az update()-ből, a deszkalap a
    // kiindulási végponton ragad, miközben a player egy láthatatlan testen utazik.
    const { group, scene, platform } = createWooden();
    const deck = scene.add.tileSprite.mock.results[0].value;
    const [capLeft, capRight] = scene.add.image.mock.results.map((r) => r.value);
    const halfWidth = HORIZONTAL.tiles * 32;

    for (const step of [400, 250, 16, 1000]) {
      platform.update(step);

      const body = group.created[0];
      expect(deck.x).toBeCloseTo(body.x - halfWidth, 6);
      expect(capLeft.x).toBeCloseTo(body.x - halfWidth, 6);
      expect(capRight.x).toBeCloseTo(body.x + halfWidth - TOWN_CAP_SIZE, 6);
      expect(deck.y).toBeCloseTo(body.y - MOVING_PLATFORM_HEIGHT / 2, 6);
    }
  });

  it('a függőleges lift látványa is követi a testet', () => {
    const { group, scene, platform } = createWooden(VERTICAL);
    const deck = scene.add.tileSprite.mock.results[0].value;

    platform.update(400);
    platform.update(1000);

    expect(group.created[0].y).toBeLessThan(VERTICAL.fromY);
    expect(deck.y).toBeCloseTo(group.created[0].y - MOVING_PLATFORM_HEIGHT / 2, 6);
  });

  it('skin nélkül a régi viselkedés marad: látható, tintelt fizikai sprite', () => {
    const group = createMockStaticGroup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new MovingPlatform(HORIZONTAL, group as any);

    expect(group.created[0].visible).not.toBe(false);
    expect(group.created[0].tint).not.toBeNull();
  });
});
