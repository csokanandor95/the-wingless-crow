/**
 * VIZUÁLIS ELLENŐRZÉS — `Project_plan.md` 26. pont.
 *
 * **Ez a spec KÉPET RÖGZÍT emberi átnézésre, NEM pixeldiff-kaput ad — és ez mérésen alapuló,
 * tudatos visszalépés.**
 *
 * Elkészült a klasszikus `toHaveScreenshot()`-os baseline-összehasonlítás is (4 baseline,
 * fagyasztott hurok, fix képkocka-léptetés), és a hitelesítő kör KIBUKTATTA:
 *
 * | mérés | eredmény |
 * |---|---|
 * | tiszta futások egymás után | 4-5-ből 1 hamis bukás (~10-25 % flake) |
 * | egy dekor-prop 20 px-es elmozdítása | NEM vette észre |
 * | ugyanaz 400 px-szel (a képernyő közepére) | 3-ból 1-szer vette észre |
 * | `threshold: 0`-val (szigorú per-pixel) | a TISZTA futások is 207-9 327 pixelnyit szórtak |
 *
 * Az ok a rajzolás valódi nem-determinizmusa: a képernyőképeket összevetve a `TutorialHint`
 * felirata futásonként MÁS áttűnési fázisban áll, azonos számú léptetett képkocka után is.
 * Ezt megbízhatóvá tenni csak a tweenek és időzítők teszt-célú befagyasztásával lehetne,
 * vagyis produkciós kódba tett teszt-kapcsolókkal — ez egy 20 perces böngészőjátéknál
 * aránytalan.
 *
 * **Egy 25 %-ban hamisan bukó és a valódi változást elvétő kapu rosszabb, mint a hiánya:**
 * elveszi a bizalmat az EGÉSZ suite-tól, és hamis biztonságot ad. A `Project_plan.md` 26.
 * pontjának CÉLJA viszont teljesíthető máshogy — a felsorolt hibák (eltűnt sprite, rossz
 * sprite-pozíció, hibás UI, elrontott background, rossz kamera, hibás boss aréna,
 * asset-betöltési gond) mind AZONNAL feltűnnek egy embernek, ha lát egy képet:
 *
 *   1. **ez a spec** minden futásban csatolja a négy kulcsjelenet képét a Playwright
 *      riporthoz (CI-ban artifactként letölthető) — így egy PR-nél át lehet nézni őket;
 *   2. a **`scenes.spec.ts`** automatikusan bukik, ha egy jelenet ÜRESEN rajzol (fekete
 *      képernyő) — ez a katasztrofális eset, és az megbízhatóan mérhető;
 *   3. az **`assets.spec.ts`** automatikusan bukik hiányzó textúrán, frame-en vagy
 *      animáción — ez a 26. pont „asset loading probléma" tétele.
 *
 * A részletes indoklás és a mérési napló a `docs/Test-plan.md` „Ismert korlátok" szakaszában.
 */

import { test } from './fixtures/game';

/** Bőven a leghosszabb belépő-fade (700 ms ≈ 42 képkocka) fölött: a jelenet nyugalomban van. */
const SETTLE_FRAMES = 90;

/**
 * A négy jelenet-ARCHETÍPUS: menü (UI festmény fölött), pálya (parallax + terrain + HUD),
 * aréna (fix kamera, boss), szöveges lezárás. A maradék nyolc jelenetet a `scenes.spec.ts`
 * üres-vászon ellenőrzése fedi.
 */
const SCREENS = [
  { key: 'MainMenuScene', name: 'fomenu', why: 'menüpanel kontrasztja a festmény fölött' },
  { key: 'Level1Scene', name: 'level1-start', why: 'parallax, terrain, propok, HUD, player' },
  { key: 'BossScene', name: 'boss1-arena', why: 'fix kamera, aréna-háttér, boss HP-bar' },
  { key: 'CreditsScene', name: 'credits', why: 'tiszta szöveges jelenet' },
] as const;

test.describe('Vizuális ellenőrzés — képrögzítés átnézésre (Project_plan 26. pont)', () => {
  for (const { key, name, why } of SCREENS) {
    test(`${key} — ${why}`, async ({ game }, testInfo) => {
      await game.gotoScene(key, SETTLE_FRAMES);

      // A vászonról, nem a teljes oldalról: a `Scale.FIT` letterboxa így nem kerül bele.
      const screenshot = await game.page.locator('canvas').screenshot();

      await testInfo.attach(`${name}.png`, {
        body: screenshot,
        contentType: 'image/png',
      });

      // Automatikus állítás: a jelenet ténylegesen rajzolt. A „HELYES képet rajzolta-e?"
      // kérdésre a csatolt kép ad választ, embernek.
      await game.expectCanvasNotBlank(key);
    });
  }
});
