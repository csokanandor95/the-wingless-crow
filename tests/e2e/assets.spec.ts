/**
 * ASSET-INTEGRITÁS — `Project_plan.md` 30. pont.
 *
 * A terv követelményei és az, hogy melyiket MI fedi:
 *
 * | követelmény | hol dől el |
 * |---|---|
 * | minden szükséges asset létezik | `vite build` — a hiányzó Vite-import BUILD-hiba |
 * | nincs 404 | a fixture `response` figyelője, MINDEN teszten |
 * | nincs broken asset reference | ITT: minden animáció-frame valódi textúrára mutat |
 * | minden sprite betölthető | ITT: a betöltés 0 hibával zárult, és nincs `__MISSING` |
 * | minden audio betölthető | ITT: mind a 24 hang a cache-ben, valós hosszal |
 * | minden szükséges animation frame létezik | ITT: egyetlen animáció sem 0 frame-es |
 *
 * **Miért nem elég a build?** Mert a build csak a FÁJL meglétét bizonyítja. Egy elgépelt
 * `frameWidth` például sikeresen buildel, és némán NULLA frame-es animációt ad — a Phaser
 * ilyenkor `console.warn`-t ír, amit senki nem néz. Ugyanígy: egy nem dekódolható hang a
 * betöltésnél elbukik, de a játék attól még elindul, csak néma lesz.
 *
 * A `Project_plan.md` 19. pontja külön kiemeli, hogy az AI-generált és vegyes forrású assetek
 * miatt ez a réteg fontos — a projekt már talált így hibás frame-méretet és üres frame-et.
 */

import { expect, test } from './fixtures/game';

/**
 * `BootScene.MUSIC_TRACKS` (9) + `SFX_SOUNDS` (15). A pontos szám szándékos regressziós
 * kapu, a `gameProgress.test.ts` „pontosan 8 kulcs" mintájára: egy némán kieső hangot
 * semmilyen strukturális ellenőrzés nem venne észre, csak a darabszám.
 */
const EXPECTED_AUDIO_COUNT = 24;

/** A `BootScene.createPlaceholderTextures()` futásidőben generált textúrái. */
const GENERATED_TEXTURES = [
  'ground-placeholder',
  'platform-placeholder',
  'ladder-placeholder',
  'door-placeholder',
  'door-interior-placeholder',
  'spike-placeholder',
  'hazard-anchor-placeholder',
  'reaper-blade-placeholder',
  'checkpoint-placeholder',
  'fireball-placeholder',
  'boss-projectile-placeholder',
  'gravecaller-projectile-placeholder',
  'demon-aura-placeholder',
];

test.describe('Asset-integritás (Project_plan 30. pont)', () => {
  test('a betöltés hiba nélkül zárult', async ({ game }) => {
    const load = await game.page.evaluate(() => {
      const boot = window.game.scene.getScene('BootScene');
      return {
        toLoad: boot.load.totalToLoad,
        complete: boot.load.totalComplete,
        failed: boot.load.totalFailed,
      };
    });

    expect(load.failed, 'sikertelen asset-betöltés').toBe(0);
    expect(load.complete).toBe(load.toLoad);
    expect(load.toLoad).toBeGreaterThan(100);
  });

  test('mind a 24 hang betöltődött, valós hosszal', async ({ game }) => {
    const audio = await game.page.evaluate(() => {
      const cache = window.game.cache.audio;
      const keys = cache.getKeys();
      return keys.map((key) => {
        const entry = cache.get(key) as { duration?: number } | undefined;
        return { key, duration: entry?.duration ?? null };
      });
    });

    expect(audio, 'betöltött hangok száma').toHaveLength(EXPECTED_AUDIO_COUNT);

    const silent = audio.filter((a) => a.duration !== null && a.duration <= 0);
    expect(silent, 'nulla hosszú (dekódolatlan) hangok').toEqual([]);
  });

  /**
   * A `BootScene.create()` tíz `create*Animations()` gyárat hív. Ha egy spritesheet
   * `frameWidth`/`frameHeight`-ja elcsúszik, az animáció létrejön, de NULLA vagy hibás
   * frame-mel — a lény ilyenkor láthatatlan vagy egy helyben áll, hibaüzenet nélkül.
   */
  test('minden animáció létezik, van frame-je, és valódi textúrára mutat', async ({ game }) => {
    const anims = await game.page.evaluate(() => {
      const instance = window.game;

      // `toJSON()` a PUBLIKUS felület az összes regisztrált animáció bejárására — az
      // `anims.anims` belső Map `protected`, tehát a tsc joggal utasítaná el.
      return instance.anims.toJSON().anims.map((anim) => {
        const missing = new Set<string>();
        for (const frame of anim.frames ?? []) {
          // A `__MISSING` a Phaser tartalék textúrája: ezt kapja minden ismeretlen kulcs.
          if (!instance.textures.exists(frame.key) || frame.key === '__MISSING') {
            missing.add(frame.key);
          }
        }
        return {
          key: anim.key,
          frames: anim.frames?.length ?? 0,
          missingTextures: [...missing],
        };
      });
    });

    expect(anims.length, 'regisztrált animációk száma').toBeGreaterThan(40);

    const empty = anims.filter((a) => a.frames === 0).map((a) => a.key);
    expect(empty, 'nulla frame-es animációk').toEqual([]);

    const broken = anims
      .filter((a) => a.missingTextures.length > 0)
      .map((a) => `${a.key} -> ${a.missingTextures.join(', ')}`);
    expect(broken, 'hiányzó textúrára mutató animációk').toEqual([]);
  });

  test('a kódból generált placeholder textúrák mind léteznek', async ({ game }) => {
    const missing = await game.page.evaluate((keys) => {
      return keys.filter((key) => !window.game.textures.exists(key));
    }, GENERATED_TEXTURES);

    expect(missing, 'hiányzó generált textúra').toEqual([]);
  });

  /**
   * Egy hiányzó kulcsra a Phaser a `__MISSING` textúrát adja vissza, és a sprite egy zöld
   * kockaként jelenik meg. Ez a jelenetek bejárása UTÁN nézve azt bizonyítja, hogy egyetlen
   * jelenet sem kért nem létező textúrát.
   */
  test('egyetlen megjelenített objektum sem használja a __MISSING textúrát', async ({ game }) => {
    const problems: string[] = [];

    for (const key of ['MainMenuScene', 'PreScene', 'Level1Scene', 'BossScene', 'CreditsScene']) {
      await game.gotoScene(key, 30);

      const missing = await game.page.evaluate((sceneKey) => {
        const scene = window.game.scene.getScene(sceneKey);
        return scene.children.list
          .map((child) => (child as Phaser.GameObjects.Sprite).texture?.key)
          .filter((textureKey) => textureKey === '__MISSING' || textureKey === '__DEFAULT');
      }, key);

      if (missing.length > 0) {
        problems.push(`${key}: ${missing.length} objektum hiányzó textúrával`);
      }
    }

    expect(problems, 'hiányzó textúrát használó jelenetek').toEqual([]);
  });
});
