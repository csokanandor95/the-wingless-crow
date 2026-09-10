/**
 * TELJESÍTMÉNY — `Project_plan.md` 29. pont.
 *
 * **Két szám, nem öt.** A terv öt lehetséges mérőszámot sorol (FPS, frame time, betöltési idő,
 * memóriahasználat, hosszú játék utáni degradáció); ebből ITT kettő van, és ez tudatos
 * szűkítés: a játék végigjátszása ~20 perc, EGY munkamenetben. A memóriaszivárgás és a „több
 * órás session degradációja" olyan kockázat, ami ennél a scope-nál nem áll fenn — mérni őket
 * ceremónia lenne, nem kockázatcsökkentés.
 *
 * **A küszöbök QA-DÖNTÉSEK, nem spec-idézetek.** A `Project_plan.md` szándékosan nem ad
 * számot („a játék stabilan fusson, és ne legyenek indokolatlan performance regressziók").
 * Az itteni értékek tehát MÉRT alapállapotból, bő ráhagyással készültek, és a szerepük
 * REGRESSZIÓS DRÓT — nem minőségi kapu. Egy CI-runner GPU nélkül fut, tehát egy szoros
 * küszöb csak flaky tesztet adna.
 *
 * A mérés eredménye a teszt kimenetén megjelenik, hogy a `docs/Test-plan.md` számai a
 * tényleges futásokból frissíthetők legyenek.
 */

import { expect, test } from './fixtures/game';

/**
 * A `BootScene` MINDEN assetet előre betölt: 109 fájl, ~23,5 MB, amiből **20,44 MB (87 %) az
 * audio**. Ez a játék legnagyobb, mérhető teljesítmény-tétele, és a lassú kapcsolaton érkező
 * itch.io-játékos ELSŐ élménye — ezért mérjük külön, ahelyett hogy egy FPS-számban elbújna.
 */
const BOOT_BUDGET_MS = 45_000;

/** 30 FPS-nek megfelelő képkocka-idő. A cél 60 (16,7 ms); ez a felezett, „még játszható" határ. */
const FRAME_TIME_P95_BUDGET_MS = 33;

/** Ennyi ideig fut szabadon a pálya a mintavételhez. */
const SAMPLE_MS = 5_000;

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

test.describe('Teljesítmény (Project_plan 29. pont)', () => {
  test('a betöltés a költségkereten belül van', async ({ game }, testInfo) => {
    testInfo.annotations.push({
      type: 'mérés',
      description: `boot (navigáció → első jelenet): ${game.bootMs} ms`,
    });

    expect(game.bootMs, 'boot idő').toBeLessThan(BOOT_BUDGET_MS);
  });

  /**
   * A LEVEL 1 a mérés helye, mert az a legösszetettebb futó jelenet: három parallax réteg,
   * csempézett terrain 6000 px-en, 11 dekor-prop, 9 ellenfél és a player. Ha valahol
   * képkocka-idő gond lesz, itt jön elő először.
   *
   * A mérés SZABADON futó hurkon történik (`switchScene`, nem `gotoScene`) — a léptetett
   * mód épp azt a valós időt kapcsolná ki, ami itt a kérdés.
   */
  test('a Level 1 stabilan fut (p95 képkocka-idő)', async ({ game }, testInfo) => {
    await game.switchScene('Level1Scene');

    const deltas: number[] = await game.page.evaluate(
      (durationMs) =>
        new Promise<number[]>((resolve) => {
          const samples: number[] = [];
          const startedAt = performance.now();

          const tick = () => {
            samples.push(window.game.loop.delta);
            if (performance.now() - startedAt < durationMs) requestAnimationFrame(tick);
            else resolve(samples);
          };

          requestAnimationFrame(tick);
        }),
      SAMPLE_MS
    );

    // Az első néhány képkocka a jelenet felépítése miatt mindig kiugró; a mérés a beállt
    // állapotról szól.
    const steady = deltas.slice(10);
    expect(steady.length, 'mintaszám').toBeGreaterThan(60);

    const p50 = percentile(steady, 0.5);
    const p95 = percentile(steady, 0.95);
    const fps = Math.round(1000 / p50);

    testInfo.annotations.push({
      type: 'mérés',
      description: `Level 1: p50 ${p50.toFixed(1)} ms (~${fps} FPS), p95 ${p95.toFixed(1)} ms, ${steady.length} minta`,
    });

    expect(p95, 'p95 képkocka-idő').toBeLessThan(FRAME_TIME_P95_BUDGET_MS);
  });
});
