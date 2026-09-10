#!/usr/bin/env node
/**
 * DEPLOY SANITY CHECK — a `vite.config.ts` `base: './'` beállításának őre.
 *
 * **Miért van erre külön ellenőrzés?** Mert ez a projekt EGYETLEN olyan hibaosztálya, amit a
 * meglévő kapuk közül EGYIK SEM fog meg:
 *
 * | kapu | miért nem veszi észre |
 * |---|---|
 * | `tsc --noEmit` | a `base` nem típushiba |
 * | `npm run test` | a unit tesztek nem buildelnek |
 * | `npm run build` | ZÖLD marad — a build sikeres, csak MÁS útvonalakat ír bele |
 * | E2E (`vite preview`) | a preview a GYÖKÉRBŐL szolgál ki, ahol a `/assets/...` is működik |
 *
 * A hiba tehát végigmegy a teljes pipeline-on, és csak a FELTÖLTÖTT játékban jön elő — ott
 * viszont azonnal végzetes: az itch.io a HTML5 buildet egy generált alútvonalról szolgálja ki
 * (`html-classic.itch.zone/html/<id>/index.html`), tehát minden root-abszolút `/assets/...`
 * kérés a domain gyökerére menne. Mind 404, a játék EL SEM INDULNA. Ugyanez áll egy GitHub
 * Pages project-page deployra is (`/<repo-név>/` alútvonal).
 *
 * A `vite.config.ts` kommentje ezt a kockázatot szövegben már rögzíti; ez a szkript teszi
 * futtatható állítássá.
 *
 * **Mit néz meg:**
 *   1. a `dist/index.html` minden `src=` / `href=` hivatkozása RELATÍV (nem `/`-rel kezdődik);
 *   2. a lefordított bundle nem tartalmaz root-abszolút `"/assets/..."` sztringliterált.
 *
 * A 2. pont a lényegi különbség: `base: './'` mellett a Vite
 * `new URL('fájl.png', import.meta.url)` alakot generál (a modul saját URL-jéhez képest
 * oldódik fel, tehát bárhová áthelyezhető), `base: '/'` mellett viszont `"/assets/fájl.png"`
 * sztringeket. A kettő megkülönböztethető, és pontosan ez a különbség számít.
 *
 * Használat: `npm run check:build` (a `npm run build` UTÁN).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = 'dist';
const INDEX_HTML = join(DIST_DIR, 'index.html');

/** Egy `src="..."` / `href="..."` érték akkor gyanús, ha a domain gyökeréről indul. */
const ROOT_ABSOLUTE_ATTR = /\b(?:src|href)="(\/[^"]*)"/g;

/**
 * A bundle-ben keresett minta. SZÁNDÉKOSAN az idézőjelet is tartalmazza: enélkül a
 * `new URL()`-es (helyes) alak környezetében előforduló `assets/` szövegre is illeszkedne.
 */
const ROOT_ABSOLUTE_ASSET = /["'`]\/assets\//g;

const errors = [];

if (!existsSync(INDEX_HTML)) {
  console.error(`HIBA: ${INDEX_HTML} nem létezik. Futtasd előbb: npm run build`);
  process.exit(1);
}

// --- 1. index.html -----------------------------------------------------------------------
const html = readFileSync(INDEX_HTML, 'utf8');
const badAttrs = [...html.matchAll(ROOT_ABSOLUTE_ATTR)].map((m) => m[1]);

if (badAttrs.length > 0) {
  errors.push(
    `${INDEX_HTML}: ${badAttrs.length} root-abszolút hivatkozás:\n` +
      badAttrs.map((a) => `    ${a}`).join('\n'),
  );
}

// --- 2. bundle ---------------------------------------------------------------------------
const assetsDir = join(DIST_DIR, 'assets');
const bundles = existsSync(assetsDir)
  ? readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
  : [];

if (bundles.length === 0) {
  errors.push(`${assetsDir}: nem található lefordított .js bundle.`);
}

for (const file of bundles) {
  const code = readFileSync(join(assetsDir, file), 'utf8');
  const hits = [...code.matchAll(ROOT_ABSOLUTE_ASSET)];
  if (hits.length > 0) {
    errors.push(
      `dist/assets/${file}: ${hits.length} root-abszolút "/assets/..." hivatkozás. ` +
        "Ez base: '/'-re utal a vite.config.ts-ben.",
    );
  }
}

// --- eredmény ----------------------------------------------------------------------------
if (errors.length > 0) {
  console.error('\nDEPLOY SANITY CHECK: BUKOTT\n');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    '\nA build útvonalai a domain GYÖKERÉRE mutatnak, tehát az itch.io / GitHub Pages\n' +
      'alútvonalról kiszolgálva a játék el sem indulna.\n' +
      "Javítás: a vite.config.ts-ben `base: './'` legyen.\n",
  );
  process.exit(1);
}

console.log(
  `DEPLOY SANITY CHECK: OK — ${INDEX_HTML} és ${bundles.length} bundle, ` +
    'minden asset-hivatkozás relatív (alútvonalról is kiszolgálható).',
);
