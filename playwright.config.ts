import { defineConfig } from '@playwright/test';

/**
 * E2E konfiguráció — `Project_plan.md` 25. pont.
 *
 * **A tesztek a PRODUCTION BUILD ellen futnak** (`npm run build` + `vite preview`), nem a dev
 * szerver ellen. Ez tudatos: az itch.io-ra a `dist/` megy ki, tehát az a build érdekes, amiben
 * a Vite már hash-elte az asseteket és feloldotta a `base: './'`-t. Egy dev-szerveres E2E
 * zöld maradhatna olyan hibáknál, amik csak a bundle-ben jönnek elő.
 */

/** A logikai felbontás (`main.ts` `scale`), hogy a vászon 1:1-ben, letterbox nélkül álljon. */
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 450;

const PORT = 4173;

export default defineConfig({
  testDir: './tests/e2e',

  // A 12 jelenetet végigjáró sweep és a haladás-teszt ugyanazt a `window.game`-et használja,
  // de KÜLÖN böngészőkontextusban (fájlonként új oldal), tehát a párhuzamosítás biztonságos.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // CI-ban egy újrapróbálkozás: a böngésző-indítás és a 23 MB asset betöltése ritkán, de
  // megcsúszhat egy megterhelt runneren. NULLA lokálisan — ott a flaky teszt LÁTSZÓDJON.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  /**
   * A Playwright alapértelmezett 30 s-a ehhez a játékhoz kevés: a `BootScene` MINDEN assetet
   * előre betölt (~23,5 MB, 87 %-ban audio), és a dekódolás párhuzamos workerek mellett
   * önmagában 15-20 s. Ez MÉRT szám, nem óvatosság — a scene sweep első változata pontosan
   * itt bukott el, „timeout while setting up game" üzenettel.
   */
  timeout: 90_000,

  use: {
    baseURL: `http://localhost:${PORT}`,
    // FIX viewport: a `Scale.FIT` a szülő méretéig nagyít, tehát ettől lesz a vászon pontosan
    // 800x450 CSS-pixel, letterbox nélkül — így a rögzített képek futásonként azonos méretűek
    // és 1:1-ben mutatják a logikai felbontást.
    viewport: { width: VIEW_WIDTH, height: VIEW_HEIGHT },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  // `expect.toHaveScreenshot` beállítás NINCS: a vizuális réteg nem pixeldiff-kapu, hanem
  // képcsatolás emberi átnézésre. Az indoklás (méréssel) a tests/e2e/visual.spec.ts fejlécében.

  /**
   * BÖNGÉSZŐ-MÁTRIX — `Project_plan.md` 27. pont.
   *
   * A Firefox SZÁNDÉKOSAN csak a smoke-ot futtatja: a böngésző-specifikus hibák (WebGL
   * kontextus, betöltés, audio-policy, input-kézbesítés) az INDULÁSNÁL jönnek elő, nem a
   * negyvenedik assertionnél. A teljes suite háromszorozása csak futásidőt venne el.
   *
   * **A WEBKIT KIMARADT — és ez MÉRT döntés, nem kényelem.**
   *
   * A Playwright WebKit buildjében **egyáltalán nincs Web Audio API**: az `AudioContext`, a
   * `webkitAudioContext` ÉS az `OfflineAudioContext` is `undefined` (Chromiumban és
   * Firefoxban mindhárom megvan). Emiatt a Phaser a `HTML5AudioSoundManager`-re esik vissza,
   * annak fájlbetöltője pedig a `canplaythrough` eseményre vár — ami ebben a médiaréteg
   * nélküli buildben SOHA nem következik be. Következmény: a `BootScene` véglegesen elakad
   * 91/106 fájlnál (a 15 WAV SFX-en), 0 hibával, üres betöltési sorral. Headed módban
   * ugyanez — tehát nem headless műtermék.
   *
   * **Ez NEM a játék hibája, és NEM Safari-viselkedés:** a valódi Safari 2012 óta támogatja a
   * Web Audiót. A Playwright WebKitje nem Safari, csak a motor egy médiakodekek nélküli
   * buildje. Egy itt bevezetett „javítás" tehát egy törött tesztböngészőre optimalizálna.
   *
   * A Safari-lefedettség ezért a KÉZI charterek közé került (lásd `docs/Test-plan.md`) — a
   * játék amúgy is fent van az itch.io-n, ahol a bétatesztelők valódi Safarin megnyithatják.
   */
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },

      // A teljesitmenymeres kimarad a funkcionalis futasbol (lasd a `performance` projektet).
      // A `visual.spec.ts` viszont BENNE VAN: mar nem pixeldiff-kapu, hanem kepcsatolas,
      // tehat nincs OS-fuggo baseline, es CI-ban is ertelmesen fut.
      testIgnore: [/performance\.spec\.ts/],
    },
    { name: 'firefox', use: { browserName: 'firefox' }, testMatch: /smoke\.spec\.ts/ },

    /**
     * KÜLÖN projekt, mert a mérésnek EGYEDÜL kell futnia (`npm run e2e:perf`, `--workers=1`).
     *
     * **Ez MÉRT tapasztalat, nem elővigyázatosság:** a Level 1 p95 képkocka-ideje egyedül
     * futtatva **16,7 ms** (pontosan 60 FPS, nulla szórás), a teljes suite-tal együtt, hat
     * párhuzamos böngésző mellett viszont **51,7 ms**. A különbséget a tesztgép terhelése
     * adja, nem a játék — egy közös futásban tehát a mérés vagy hamis riasztást adna, vagy
     * (feltornászott küszöbbel) elfedné a valódi regressziót.
     */
    {
      name: 'performance',
      use: { browserName: 'chromium' },
      testMatch: /performance\.spec\.ts/,
    },
  ],

  webServer: {
    /**
     * CSAK kiszolgálás — a `npm run build` KÜLÖN, a Playwright indítása ELŐTT fut (lásd a
     * `package.json` `e2e*` scriptjeit és a CI `E2E` jobját).
     *
     * **Miért nem `build && preview` egy parancsban?** Mert úgy a build és a tesztindítás
     * versenyzett: a Playwright a `url`-t pollozza, és amint az válaszol, INDÍTJA a
     * teszteket — miközben a `dist/` még az ELŐZŐ futás tartalma. A hitelesítő körben ez
     * konkrét, megtévesztő tünetet adott: a beültetett hibás állapot ZÖLD lett, a tiszta
     * pedig PIROS, mert minden futás az előző build-et vizsgálta (egy futással „késett").
     * A `dist/`-et megnézve a bizonyíték egyértelmű volt: a bundle a beültetett értéket
     * tartalmazta, miközben a forrás már vissza volt állítva.
     *
     * Külön lépésként a build BIZTOSAN kész, mielőtt bármi elindul.
     */
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,

    /**
     * SZÁNDÉKOSAN `false`, CI-ban és lokálisan egyaránt — pedig a Playwright alapértelmezése a
     * lokális újrahasználat lenne.
     *
     * **Konkrét eset, ami miatt így van:** a hitelesítő körben beültettem a `Level2Scene`
     * egykori valódi hibáját (az ajtó `kingDefeated` ellenőrzés nélkül), és a teszt ZÖLD
     * maradt. Nem a teszt volt rossz: egy korábbi debug-munkamenetből a porton MARADT egy
     * preview szerver, amit a Playwright újrahasznált — tehát a RÉGI `dist/`-et vizsgálta, a
     * beültetett hiba pedig sosem került buildbe. A szerver leállítása után a teszt azonnal
     * és pontosan elbukott.
     *
     * Egy hamis ZÖLD a legrosszabb, ami egy teszt-suite-tal történhet, és ez itt némán állt
     * elő. A ~10 másodperces újrabuild ehhez képest olcsó ár.
     */
    reuseExistingServer: false,

    // A build + a 23 MB asset feldolgozása lassú runneren is beleférjen.
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
