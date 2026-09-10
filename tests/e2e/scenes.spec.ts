/**
 * SCENE SWEEP — a suite legnagyobb kockázatcsökkentése, egyetlen olcsó fájlban.
 *
 * **Miért ez a legfontosabb teszt a projektben?** A `src/scenes/` 12 fájlja **6 023 sor**, a
 * teljes forrás 30 %-a, és a 967 unit tesztből EGY SEM érinti — nem hanyagságból, hanem mert
 * a `tests/unit/helpers/fakePhaser.ts` szándékosan nem ad `Phaser.Scene` osztályt. Egy olyan
 * fake, ami el tudná indítani a `Level1Scene.create()`-et (`add.tileSprite`,
 * `physics.add.staticGroup`, `cameras.main`, `input.keyboard`, `sound`, `tweens`, `registry`,
 * `scene.start`), lényegében a Phaser újraírása lenne — pontosan az az over-engineering,
 * amit ez a QA-terv kerül.
 *
 * A jelenetek helyes szintje tehát a VALÓDI böngésző. És a projekt eddigi, kézi teszten talált
 * hibái mind ide estek: a `Level2Scene` ajtaja `kingDefeated` ellenőrzés nélkül, a
 * committolt `START_SCENE = 'BossScene'`, a scene-restartkor újra nem inicializálódó
 * class-field (`CLAUDE.md` 3. tanulság — az konkrétan crashelt a `create()` után).
 *
 * Minden jelenetre ugyanaz a három állítás:
 *   1. a `create()` lefut, és a jelenet ténylegesen AKTÍV lesz;
 *   2. 60 léptetett frame `update()` sem dob kivételt (ez már a futó gameplay);
 *   3. a vászonra rajzolódik is valami — nem fekete képernyő.
 *
 * **Miért EGY teszt, `test.step()`-ekkel, és nem jelenetenként külön teszt?** Mert minden
 * teszt új oldalt kap, az pedig ÚJRA végigtöltené a 23,5 MB-ot — 15 teszt = 15 boot. Az első
 * változat pontosan ettől futott időtúllépésbe. Így egyszer bootolunk, és a hibákat
 * jelenetenként GYŰJTJÜK, tehát egy futásból kiderül MINDEN törött jelenet, nem csak az első.
 */

import { BLANK_CANVAS_MAX_BYTES, expect, test } from './fixtures/game';

/**
 * A `main.ts` `scene` tömbjének SORRENDJE, a `BootScene` nélkül — az már lefutott, mire a
 * fixture átadja a vezérlést, és újraindítani a teljes betöltést jelentené.
 *
 * A `NarrationScene` ADATVEZÉRELT: `{ lines, nextScene }` nélkül üres szöveget kapna, ezért
 * kap saját, reprezentatív adatot — így a `title`-ág és a typewriter is lefut.
 */
const SCENES: ReadonlyArray<{ key: string; data?: Record<string, unknown> }> = [
  { key: 'MainMenuScene' },
  { key: 'PreScene' },
  { key: 'Level1Scene' },
  { key: 'BossScene' },
  {
    key: 'NarrationScene',
    data: { title: 'E2E', lines: ['Sor egy.', 'Sor kettő.'], nextScene: 'MainMenuScene' },
  },
  { key: 'Level2Scene' },
  { key: 'Boss2Scene' },
  { key: 'Level3Scene' },
  { key: 'Boss3Scene' },
  { key: 'FinalBossScene' },
  { key: 'CreditsScene' },
];

/** ~1 másodpercnyi gameplay: a `create()` UTÁNI `update()` is bizonyítottan fusson. */
const FRAMES_PER_SCENE = 60;

test('minden jelenet elindul, fut és rajzol', async ({ game }) => {
  const problems: string[] = [];

  for (const { key, data } of SCENES) {
    await test.step(key, async () => {
      // A jelenet ELŐTT gyűlt hibákat már más lépéshez soroltuk; innentől ami jön, az ezé.
      const errorsBefore = game.errors.length;

      await game.page.evaluate(
        ({ target, sceneData }) => {
          const instance = window.game;
          for (const scene of instance.scene.getScenes(true)) {
            instance.scene.stop(scene.scene.key);
          }
          instance.scene.start(target, sceneData);
        },
        { target: key, sceneData: data }
      );

      try {
        await game.waitForScene(key, 15_000);
        await game.stepFrames(FRAMES_PER_SCENE);

        // A léptetés UTÁN is aktívnak kell lennie: egy `update()`-ben dobó kivétel a hurkot
        // állítaná meg, nem a jelenetet — azt a fixture `pageerror` figyelője fogja meg.
        if (!(await game.activeScenes()).includes(key)) {
          problems.push(`${key}: a jelenet nem maradt aktív a ${FRAMES_PER_SCENE} frame után`);
        }

        const bytes = await game.canvasBytes();
        if (bytes <= BLANK_CANVAS_MAX_BYTES) {
          problems.push(`${key}: üres vászon (${bytes} bájt képernyőkép)`);
        }
      } catch (error) {
        problems.push(`${key}: ${(error as Error).message}`);
      }

      // A jelenethez tartozó hibákat KIVESSZÜK a közös listából, és ide soroljuk — így a
      // bukás megnevezi a felelős jelenetet, a teardown pedig nem jelenti be újra ugyanazt.
      const attributed = game.errors.splice(errorsBefore);
      for (const message of attributed) problems.push(`${key}: ${message}`);
    });
  }

  expect(problems, 'törött jelenetek').toEqual([]);
});

/**
 * A négy aréna belépője `create() → párbeszéd → cím-kártya → harc`, és a párbeszéd
 * VÉGIGJÁTSZÁSONKÉNT EGYSZER fut (`systems/DialogueMemory`). A második belépésnek tehát
 * ugyanúgy hiba nélkül kell lefutnia — csak a párbeszéd marad ki.
 *
 * Ez egyben a `CLAUDE.md` 3. tanulságának regressziós tesztje: a `scene.start()` UGYANAZON a
 * példányon futtatja újra a `create()`-et, tehát a class-field tömböket/flageket a
 * `create()`-nek explicit ürítenie kell — enélkül a második belépés a megsemmisített
 * objektumokon szállna el.
 */
test('a boss-arénákba MÁSODSZOR is be lehet lépni (scene-restart)', async ({ game }) => {
  const problems: string[] = [];

  for (const arena of ['BossScene', 'Boss2Scene', 'Boss3Scene', 'FinalBossScene']) {
    await test.step(arena, async () => {
      const errorsBefore = game.errors.length;

      try {
        await game.gotoScene(arena, 30);
        await game.gotoScene(arena, 30);

        if (!(await game.activeScenes()).includes(arena)) {
          problems.push(`${arena}: a második belépés után nem aktív`);
        }
      } catch (error) {
        problems.push(`${arena}: ${(error as Error).message}`);
      }

      const attributed = game.errors.splice(errorsBefore);
      for (const message of attributed) problems.push(`${arena}: ${message}`);
    });
  }

  expect(problems, 'az arénák ismételt belépése').toEqual([]);
});
