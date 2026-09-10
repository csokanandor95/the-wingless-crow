/**
 * SMOKE — `Project_plan.md` 25. pont.
 *
 * ```
 * Launch game → Main menu appears → Start game → Level loads → Player appears
 * ```
 *
 * Ez a suite legfontosabb fájlja, és az EGYETLEN, ami **mind a három böngészőn** lefut
 * (`playwright.config.ts` `testMatch`). Oka: a böngésző-specifikus hibák — hiányzó WebGL
 * kontextus, betöltési különbség, audio-policy — az INDULÁSNÁL jönnek elő, nem a negyvenedik
 * assertionnél. A teljes suite háromszori futtatása ehhez képest csak időt venne el.
 *
 * A fixture minden itteni teszten figyeli a console errort és az elkapatlan kivételt, tehát a
 * „fut, de közben hibát köpköd" eset is bukás (`Project_plan.md` 28. pont).
 */

import { expect, test } from './fixtures/game';

/** A `main.ts` `scene` listája — a lánc minden állomásának regisztrálva kell lennie. */
const REGISTERED_SCENES = [
  'BootScene',
  'MainMenuScene',
  'PreScene',
  'Level1Scene',
  'BossScene',
  'NarrationScene',
  'Level2Scene',
  'Boss2Scene',
  'Level3Scene',
  'Boss3Scene',
  'FinalBossScene',
  'CreditsScene',
];

const PLAYER_IDLE_TEXTURE = 'knight-idle';

test.describe('Smoke — elindul-e egyáltalán a játék?', () => {
  /**
   * REGRESSZIÓS TESZT egy MÁR MEGTÖRTÉNT hibára: a `BootScene.START_SCENE` fejlesztés közben
   * bármelyik jelenetre átírható, hogy az adott szakasz a lánc végigjátszása nélkül
   * tesztelhető legyen — és egyszer `'BossScene'`-en maradva lett committolva, tehát a játék
   * a Boss 1 arénában indult. Sem a typecheck, sem a build, sem a 967 unit teszt nem szól
   * érte; egyedül az indítás mutatja meg.
   */
  test('a boot után a FŐMENÜ az aktív jelenet (START_SCENE őre)', async ({ game }) => {
    expect(await game.activeScenes()).toEqual(['MainMenuScene']);
  });

  test('a lánc mind a 12 jelenete regisztrálva van', async ({ game }) => {
    const registered = await game.registeredScenes();
    expect(registered.sort()).toEqual([...REGISTERED_SCENES].sort());
  });

  test('a főmenü ténylegesen kirajzolódik (nem fekete képernyő)', async ({ game }) => {
    await game.expectCanvasNotBlank('MainMenuScene');
  });

  /**
   * A VALÓDI felhasználói út: billentyűzet → menüpont → jelenetváltás. Szándékosan valós
   * időben fut (nem léptetve), mert épp az a kérdés, hogy a böngésző kézbesíti-e a
   * billentyűt a Phasernek, és lemegy-e a 700 ms-os kamera-fade.
   */
  test('a „Start Game" elindítja a játékot, és a nyitó jelenet betölt', async ({ game }) => {
    // A menü alapértelmezett kijelölése az első pont (START GAME), tehát elég megerősíteni.
    await game.page.keyboard.press('Enter');

    await game.waitForScene('PreScene');
    expect(await game.activeScenes()).toEqual(['PreScene']);
    await game.expectCanvasNotBlank('PreScene');
  });

  /**
   * „Player appears" — a `Player` a jelenet PRIVÁT mezője, tehát a megjelenését a
   * display listán keresztül állítjuk: a lovag idle textúrájú sprite-ját keressük.
   */
  test('a pályán megjelenik a player, élő fizikai testtel', async ({ game }) => {
    await game.gotoScene('Level1Scene');

    const player = await game.page.evaluate((texture) => {
      const scene = window.game.scene.getScene('Level1Scene');
      const sprite = scene.children.list.find(
        (child) =>
          (child as Phaser.GameObjects.Sprite).texture?.key === texture
      ) as Phaser.Physics.Arcade.Sprite | undefined;

      if (!sprite) return null;
      return {
        x: Math.round(sprite.x),
        y: Math.round(sprite.y),
        visible: sprite.visible,
        hasBody: Boolean(sprite.body),
      };
    }, PLAYER_IDLE_TEXTURE);

    expect(player, 'a player sprite nem található a Level 1 display listáján').not.toBeNull();
    expect(player?.visible).toBe(true);
    expect(player?.hasBody).toBe(true);
    await game.expectCanvasNotBlank('Level1Scene');
  });
});
