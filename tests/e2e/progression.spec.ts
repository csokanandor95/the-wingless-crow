/**
 * HALADÁS — „végig lehet-e játszani a játékot?"
 *
 * Ez a `Project_plan.md` 24. pontjának *Checkpoint → Respawn* és 25. pontjának *Checkpoint*
 * folyamata rendszerszinten, plusz a lánc legfontosabb, LEGNEHEZEBBEN észrevehető hibája.
 *
 * **Miért ez a második legfontosabb spec.** A három pálya ajtaja NEM mindig ugyanoda visz: a
 * célpont a legyőzött boss registry-flagjétől függ. Ez a feltétel pontosan egyszer volt
 * elrontva — a `Level2Scene` ajtaja `kingDefeated` ellenőrzés NÉLKÜL mindig a `Boss2Scene`-t
 * célozta —, és a hiba észrevételéhez le kellett győzni a Mad Kinget, majd meghalni a végső
 * bossnál. Egy teljes végigjátszás fél óra; ez a spec fél perc, mert a flageket közvetlenül
 * állítja be.
 *
 * A flag-mátrix `[pálya × flag]` teljes, tehát mindkét ág bizonyított — nem csak az, amit épp
 * kézzel kipróbáltak.
 */

import { expect, test } from './fixtures/game';

/** A `systems/GameProgress.PROGRESS_REGISTRY_KEYS` nyolc kulcsa. */
const PROGRESS_KEYS = [
  'bossDefeated',
  'kingDefeated',
  'beastMasterDefeated',
  'demonDefeated',
  'checkpoint',
  'level2Checkpoint',
  'level3Checkpoint',
  'dialoguesSeen',
] as const;

/**
 * Az ajtók teljes döntési táblája. A `NarrationScene` a Level 2/3-nál szándékos: oda a
 * boss-harc előtt átvezető szöveg ékelődik, a legyőzött boss után viszont KIMARAD.
 */
const DOOR_MATRIX = [
  { level: 'Level1Scene', flag: null, expected: 'BossScene' },
  { level: 'Level1Scene', flag: 'bossDefeated', expected: 'Level2Scene' },
  { level: 'Level2Scene', flag: null, expected: 'NarrationScene' },
  { level: 'Level2Scene', flag: 'kingDefeated', expected: 'Level3Scene' },
  { level: 'Level3Scene', flag: null, expected: 'NarrationScene' },
  { level: 'Level3Scene', flag: 'beastMasterDefeated', expected: 'FinalBossScene' },
] as const;

/**
 * A pálya ajtajának kiváltása. A playert az ajtó-zónába tesszük és ott TARTJUK (gravitáció ki),
 * majd lenyomjuk az `E`-t.
 *
 * A `scene.player` / `scene.doorZone` TypeScriptben privát, futásidőben viszont sima mező —
 * a teszt itt szándékosan a jelenet belsejéhez nyúl, mert a scene-ek nem exportálnak
 * teszt-felületet. Egy átnevezés hangosan elbuktatja ezt a specet, ami elfogadható ár.
 */
async function enterDoor(
  game: { page: import('@playwright/test').Page; stepFrames(n: number): Promise<void> },
  levelKey: string
): Promise<void> {
  await game.page.evaluate((key) => {
    const scene = window.game.scene.getScene(key) as unknown as {
      player: Phaser.Physics.Arcade.Sprite;
      doorZone: Phaser.GameObjects.Zone;
    };
    const body = scene.player.body as Phaser.Physics.Arcade.Body;
    // Gravitáció nélkül a player az ajtó-zónában MARAD, amíg az `E`-t feldolgozza a jelenet.
    body.setAllowGravity(false);
    scene.player.setVelocity(0, 0);
    scene.player.setPosition(scene.doorZone.x, scene.doorZone.y);
  }, levelKey);

  // Néhány frame, hogy az Arcade fizika bejegyezze az átfedést az ajtó-zónával.
  await game.stepFrames(5);

  // `down` + `up` külön, közte léptetéssel: a `JustDown()` egy EGYSZER kiolvasható él, amit a
  // jelenet `update()`-je olvas ki — egy azonnali `press()` esetén a lenyomás és a felengedés
  // ugyanabba a frame-közbe eshetne.
  await game.page.keyboard.down('E');
  await game.stepFrames(5);
  await game.page.keyboard.up('E');

  // A kamera-fade (500-700 ms) alatt fut le a `FADE_OUT_COMPLETE` → `scene.start()`.
  await game.stepFrames(90);
}

test.describe('Az ajtók a haladás állapotától függően váltanak jelenetet', () => {
  test('a teljes flag-mátrix helyes célpontra visz', async ({ game }) => {
    const problems: string[] = [];

    for (const { level, flag, expected } of DOOR_MATRIX) {
      const label = `${level} [${flag ?? 'nincs flag'}]`;

      await test.step(label, async () => {
        const errorsBefore = game.errors.length;

        try {
          // Tiszta lap minden ághoz: a registry GAME-szintű, tehát túlélné az előző lépést.
          await game.page.evaluate((keys) => {
            for (const key of keys) window.game.registry.remove(key);
          }, PROGRESS_KEYS as unknown as string[]);

          if (flag) await game.setRegistry({ [flag]: true });

          await game.gotoScene(level, 30);
          await enterDoor(game, level);

          const active = await game.activeScenes();
          if (!active.includes(expected)) {
            problems.push(`${label}: várt ${expected}, kapott [${active.join(', ')}]`);
          }
        } catch (error) {
          problems.push(`${label}: ${(error as Error).message}`);
        }

        const attributed = game.errors.splice(errorsBefore);
        for (const message of attributed) problems.push(`${label}: ${message}`);
      });
    }

    expect(problems, 'ajtó-célpontok').toEqual([]);
  });
});

test.describe('Új játék tiszta lappal indul', () => {
  /**
   * A registry GAME-szintű, tehát TÚLÉLI a végigjátszást. Enélkül a második nekifutás a
   * Level 1 ajtajánál azonnal a Level 2-re vinne, a player a pálya végén éledne, és egyetlen
   * boss-párbeszéd sem futna le. A takarítást a főmenü „Start Game"-je végzi
   * (`systems/GameProgress.resetProgress`).
   */
  test('a „Start Game" mind a 8 haladás-kulcsot törli', async ({ game }) => {
    await game.gotoScene('MainMenuScene', 10);

    // Egy „végigjátszott" állapot előállítása: mind a nyolc kulcs jelen van.
    await game.setRegistry({
      bossDefeated: true,
      kingDefeated: true,
      beastMasterDefeated: true,
      demonDefeated: true,
      checkpoint: { x: 1, y: 2 },
      level2Checkpoint: { x: 3, y: 4 },
      level3Checkpoint: { x: 5, y: 6 },
      dialoguesSeen: ['BossScene', 'Boss2Scene'],
    });

    const before = await game.registryKeys();
    for (const key of PROGRESS_KEYS) expect(before).toContain(key);

    // A menü alapértelmezett kijelölése a START GAME; a fade alatt fut a `resetProgress()`.
    await game.page.keyboard.press('Enter');
    await game.stepFrames(90);

    const after = await game.registryKeys();
    const leaked = PROGRESS_KEYS.filter((key) => after.includes(key));
    expect(leaked, 'a takarítás után bennmaradt haladás-kulcsok').toEqual([]);
  });
});
