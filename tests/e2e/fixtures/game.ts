/**
 * KÖZÖS E2E FIXTURE — minden spec ezt használja.
 *
 * Két dolgot ad:
 *
 * 1. **Kritikus hiba-figyelés (`Project_plan.md` 28. pont).** Minden teszt alatt figyeli a
 *    console errort, az elkapatlan kivételt és a hibás/404-es kéréseket, és a teszt VÉGÉN
 *    elbukik, ha bármi összegyűlt. Ettől a §28 („a teszt akkor is bukjon el, ha a játék
 *    látszólag működik, de közben kritikus hibát generál") egyetlen helyen, az ÖSSZES tesztre
 *    teljesül — nem kell minden spec-ben emlékezni rá.
 *
 * 2. **Hozzáférés a játék állapotához** a `main.ts` `window.game` teszt-seamjén át. Enélkül egy
 *    böngészőteszt semmit nem tudna állítani: a HUD, a HP és minden felirat a VÁSZONRA
 *    rajzolódik, nem a DOM-ba.
 */

import { test as base, expect, type Page } from '@playwright/test';

/**
 * A `BootScene` a teljes assetkészletet (109 fájl, ~23,5 MB, 87 %-ban audio) előre betölti,
 * és csak utána vált. Ez egy hideg CI-runneren is beleférjen.
 */
const BOOT_TIMEOUT_MS = 90_000;

/**
 * „Fekete képernyő" küszöb: e fölött tekintjük úgy, hogy a jelenet ténylegesen RAJZOLT valamit.
 *
 * **MÉRT érték, nem becsült** (800x450-es PNG, Chromium):
 *
 * | mit | bájt |
 * |---|---:|
 * | tiszta fekete vászon | 2 068 |
 * | a játék háttérszíne (`#0a0a0f`) — ez látszana egy semmit nem rajzoló jelenetnél | 2 073 |
 * | egyszínű + néhány betű | 2 302 |
 * | a LEGRITKÁBB valódi jelenet (`NarrationScene`: fekete alap + gépelt szöveg) | 4 789 |
 *
 * A 3 000 tehát 45 %-kal a „semmi" fölött és 37 %-kal a legritkább valódi tartalom alatt van.
 * (Az első nekifutás 5 000 volt — azon a `NarrationScene` jogosan bukott el.)
 *
 * **Miért nem pixelolvasás?** A WebGL vászon `preserveDrawingBuffer` nélkül üresen adná vissza
 * magát `toDataURL()`-lel, a Phaser `renderer.snapshot()`-ja pedig aszinkron kerülőút. A
 * Playwright képernyőképe a kompozitorból jön, tehát mindhárom böngészőn egyformán működik —
 * és erre a célra („rajzolódott-e EGYÁLTALÁN valami") a méret elegendő és robusztus jelzés.
 * A finomabb kérdést — hogy a HELYES kép rajzolódott-e — a `visual.spec.ts` baseline-jai fedik.
 */
export const BLANK_CANVAS_MAX_BYTES = 3_000;

/**
 * A `console.warn`-ok közül CSAK ezek számítanak hibának.
 *
 * **Miért nem minden figyelmeztetés?** Mert a headless böngésző a saját, a játékhoz semmi
 * köze üzeneteit is ide küldi — a fejlesztés közben konkrétan a Chromium
 * `GL Driver Message (... GPU stall due to ReadPixels)` sorai öntötték el a naplót, amiket
 * épp a képernyőkép-készítésünk vált ki. Ezekre bukni hamis riasztás lenne.
 *
 * A lista viszont NEM óvatosságból rövid: pontosan azokat a mintákat tartalmazza, amikkel a
 * Phaser a `Project_plan.md` 30. pontjának hibáit jelzi — hiányzó textúra, hiányzó frame,
 * hiányzó animáció, dekódolhatatlan hang, elszállt fájlbetöltés —, plusz a jelenet- és
 * renderer-szintű bajokat. A Phaser ezeket SZÁNDÉKOSAN `warn`-nal jelzi, nem `error`-ral,
 * tehát enélkül egy elgépelt kulcs némán, ZÖLD teszt mellett menne át.
 *
 * A forrás a `node_modules/phaser/src` `console.warn` hívásainak átnézése, nem találgatás.
 */
const PHASER_WARNING_PATTERNS: readonly RegExp[] = [
  /Texture .* not found/i,
  /No texture found matching key/i,
  /Frame .* not found in texture/i,
  /Missing animation/i,
  /Animation key already exists/i,
  /Error decoding audio/i,
  /No audio URLs for/i,
  /missing in Sound/i,
  /File failed/i,
  /Failed to process file/i,
  /will result in zero frames/i,
  /Scene key not found/i,
  /Invalid Scene Plugin/i,
  /Core Plugins missing/i,
  /WebGL Context lost/i,
];

function isRelevantWarning(text: string): boolean {
  return PHASER_WARNING_PATTERNS.some((pattern) => pattern.test(text));
}

/** A kritikus hibák szövegesen, hogy a bukó teszt üzenete önmagában érthető legyen. */
export type CriticalError = string;

export interface GameFixture {
  page: Page;
  /** A teszt alatt összegyűlt kritikus hibák. A teardown ezt üresre ellenőrzi. */
  errors: CriticalError[];

  /** A JELENLEG futó jelenetek kulcsai. */
  activeScenes(): Promise<string[]>;
  /** Az összes REGISZTRÁLT jelenet kulcsa (a `main.ts` `scene` listája). */
  registeredScenes(): Promise<string[]>;

  /** A boot (navigáció → az első nem-Boot jelenet) mért hossza ms-ban. */
  bootMs: number;

  /**
   * Jelenetváltás a játék SAJÁT hurkával, fagyasztás NÉLKÜL — a teljesítménymérés ezt
   * használja, mert ott épp a valós idejű képkocka-idő a kérdés.
   */
  switchScene(key: string, data?: Record<string, unknown>): Promise<void>;

  /**
   * Egyetlen jelenetre vált, majd lefuttat néhány frame-et, hogy az `update()` is
   * bizonyítottan fusson. A léptetés FAGYASZT (lásd `stepFrames`).
   */
  gotoScene(key: string, frames?: number): Promise<void>;

  /** Registry-kulcsok beállítása — így állítható elő tetszőleges haladás-állapot. */
  setRegistry(entries: Record<string, unknown>): Promise<void>;
  getRegistry(key: string): Promise<unknown>;
  /** A `MainMenuScene` „Start Game"-je által törölt kulcsok ellenőrzéséhez. */
  registryKeys(): Promise<string[]>;

  /**
   * VALÓS IDEJŰ várakozás egy jelenetre — a játék saját RAF-hurkával, tehát a kamera-fade és
   * minden időzítő normálisan fut. Ezt használd, ha a VALÓDI felhasználói utat vizsgálod
   * (billentyű → átmenet); a `stepFrames()` ilyenkor NEM jó, mert megállítja a hurkot.
   */
  waitForScene(key: string, timeoutMs?: number): Promise<void>;

  /**
   * DETERMINISZTIKUS léptetés: megállítja a RAF-hurkot, és fix deltával lép N képkockát.
   * A `TimeStep.step()` nem néz `running` flaget, tehát ez a hivatalos úton pontos.
   *
   * **FIGYELEM — ez EGYIRÁNYÚ:** az első hívás után a játék saját hurka ÁLL, tehát onnantól
   * minden idő-múlás csak további `stepFrames()`-szel jön. Egy teszt vagy valós idejű
   * (`waitForScene`), vagy léptetett — a kettő keverése némán megakasztaná a várakozást.
   */
  stepFrames(count: number): Promise<void>;

  /** A vászon képernyőképének mérete bájtban — az „üres képernyő" jelzéshez. */
  canvasBytes(): Promise<number>;
  expectCanvasNotBlank(context: string): Promise<void>;
}

async function waitForBoot(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const game = window.game;
      if (!game || !game.scene) return false;
      const active = game.scene.getScenes(true);
      // A `BootScene` a betöltés végén `scene.start(START_SCENE)`-t hív. „Kész a boot" tehát
      // az, hogy fut valami, ami MÁR NEM a Boot. SZÁNDÉKOSAN nem konkrét kulcsra várunk: hogy
      // melyik jelenet jön a boot után, azt a smoke teszt ÁLLÍTJA — ha itt várnánk rá, egy
      // rosszul committolt `START_SCENE` néma időtúllépés lenne, nem beszédes assertion.
      return active.length > 0 && !active.some((scene) => scene.scene.key === 'BootScene');
    },
    { timeout: BOOT_TIMEOUT_MS }
  );
}

export const test = base.extend<{ game: GameFixture }>({
  game: async ({ page }, use) => {
    const errors: CriticalError[] = [];

    page.on('console', (message) => {
      const text = message.text();
      if (message.type() === 'error') errors.push(`console.error: ${text}`);
      // A Phaser a hiányzó textúrát/animációt/hangot `warn`-nal jelzi, NEM hibával — egy
      // elgépelt kulcs enélkül némán, zöld teszt mellett menne át. Szűrve, mert a headless
      // böngésző saját GPU-üzenetei is ide érkeznek (lásd PHASER_WARNING_PATTERNS).
      if (message.type() === 'warning' && isRelevantWarning(text)) {
        errors.push(`console.warn: ${text}`);
      }
    });

    page.on('pageerror', (error) => {
      errors.push(`uncaught exception: ${error.message}`);
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText ?? 'ismeretlen ok';
      errors.push(`kérés meghiúsult: ${request.url()} (${failure})`);
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    // A boot MÉRT hossza: a teljes assetkészlet (~23,5 MB) betöltése + a jelenetváltás.
    // A `performance.spec.ts` ezt jelenti, a többi teszt figyelmen kívül hagyja.
    const bootStartedAt = Date.now();
    await page.goto('/');
    await waitForBoot(page);
    const bootMs = Date.now() - bootStartedAt;

    const fixture: GameFixture = {
      page,
      errors,
      bootMs,

      activeScenes: () =>
        page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key)),

      registeredScenes: () => page.evaluate(() => Object.keys(window.game.scene.keys)),

      async switchScene(key, data) {
        await page.evaluate(
          ({ target, sceneData }) => {
            const game = window.game;
            for (const scene of game.scene.getScenes(true)) {
              game.scene.stop(scene.scene.key);
            }
            game.scene.start(target, sceneData);
          },
          { target: key, sceneData: data }
        );

        await fixture.waitForScene(key);
      },

      /**
       * FAGYASZT, MAJD vált — a sorrend kritikus, és ez hitelesítő körből tanult lecke.
       *
       * Az első változat `switchScene()`-nel indult (valós idejű várakozás a jelenetre), és
       * CSAK UTÁNA fagyasztott. Így a jelenet indulása és a fagyasztás közt VÁLTOZÓ mennyiségű
       * valós idő telt el (a `waitForFunction` lekérdezési üteme), tehát a jelenet minden
       * futásban máshol tartott, mire a determinisztikus léptetés elkezdődött. A vizuális
       * baseline-ok emiatt futásonként néhány száz pixelnyit szórtak — ami egy laza
       * küszöb mellett elbújt, szigorú mellett viszont hamis bukást adott.
       *
       * Előbb megállítjuk a hurkot, és csak azután indítjuk a jelenetet: a `create()` és
       * minden `update()` a MI léptetéseinkben fut le, tehát a képkocka pontosan
       * reprodukálható.
       */
      async gotoScene(key, frames = 60) {
        await page.evaluate((target) => {
          const game = window.game;
          game.loop.stop();
          game.loop.smoothStep = false;

          for (const scene of game.scene.getScenes(true)) {
            game.scene.stop(scene.scene.key);
          }
          game.scene.start(target);
        }, key);

        // A jelenet indítása a SceneManager sorában áll; ezek a lépések futtatják le.
        await fixture.stepFrames(frames);

        await page.waitForFunction((target) => window.game.scene.isActive(target), key, {
          timeout: 15_000,
        });
      },

      setRegistry: (entries) =>
        page.evaluate((data) => {
          for (const [key, value] of Object.entries(data)) {
            window.game.registry.set(key, value);
          }
        }, entries),

      getRegistry: (key) => page.evaluate((k) => window.game.registry.get(k) ?? null, key),

      registryKeys: () => page.evaluate(() => Object.keys(window.game.registry.getAll())),

      async waitForScene(key, timeoutMs = 30_000) {
        await page.waitForFunction((target) => window.game.scene.isActive(target), key, {
          timeout: timeoutMs,
        });
      },

      async stepFrames(count) {
        await page.evaluate((frames) => {
          const loop = window.game.loop;
          loop.stop();
          // A delta-simítás egy múltbeli minta-ablakból átlagol; kikapcsolva minden lépés
          // pontosan ugyanannyit léptet, tehát a képkocka reprodukálható.
          loop.smoothStep = false;

          let time = loop.time;
          for (let i = 0; i < frames; i++) {
            time += 1000 / 60;
            loop.step(time);
          }
        }, count);
      },

      async canvasBytes() {
        const shot = await page.locator('canvas').screenshot();
        return shot.byteLength;
      },

      async expectCanvasNotBlank(context) {
        const bytes = await fixture.canvasBytes();
        expect(
          bytes,
          `${context}: a vászon üresnek látszik (${bytes} bájt <= ${BLANK_CANVAS_MAX_BYTES})`
        ).toBeGreaterThan(BLANK_CANVAS_MAX_BYTES);
      },
    };

    await use(fixture);

    // A teszt VÉGÉN — így akkor is bukik, ha az assertionök átmentek, de közben a játék
    // kritikus hibát generált (Project_plan 28. pont).
    expect(errors, 'kritikus console/runtime hibák a teszt alatt').toEqual([]);
  },
});

export { expect };
