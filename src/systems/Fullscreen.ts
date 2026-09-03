import Phaser from 'phaser';

/**
 * Teljes képernyős mód — egyetlen, játék-szintű billentyűvel.
 *
 * **Miért nem menüpont?** A főmenü három pontja (`ui/MainMenuLayout.MENU_ITEMS`) unit teszttel
 * rögzített (`'pontosan három pont van, a várt sorrendben'`), és a teljes képernyő amúgy sem
 * menü-funkció: a játék KÖZBEN is kell. Egy globális billentyű tehát nemcsak a legkisebb, hanem
 * a helyes megoldás is — a `CONTROLS_ROWS` sora teszi felfedezhetővé.
 *
 * **Miért nyers DOM listener, és nem `scene.input.keyboard`?** A `KeyboardPlugin` scene-hatókörű,
 * tehát mind a 12 scene-be be kellene kötni (és minden újba is emlékezni rá). A `window`-ra tett
 * egyetlen listener minden jelenetben él, és NEM nyúl egyetlen scene-hez sem.
 *
 * A `keydown` felhasználói gesztusnak számít, tehát a böngésző Fullscreen API-ja elfogadja —
 * a `toggleFullscreen()` közvetlenül innen hívható.
 */

/**
 * A billentyű a böngészők bevett teljes-képernyő gombja.
 *
 * Ha egy böngésző NEM engedi lekezelni (a Firefox pl. nem mindig hagyja megakadályozni a saját
 * F11-ét), a natív viselkedés lép életbe — és az is helyes eredményt ad: az `index.html`
 * konténere `100vh`/`100vw`, a `Scale.FIT` pedig arányosan kitölti. Vagyis a funkció mindkét
 * ágon működik, csak más gazdával.
 */
const FULLSCREEN_KEY = 'F11';

/**
 * Bekötés a `main.ts`-ből, közvetlenül a `new Phaser.Game()` után.
 *
 * A `fullscreen.available` ellenőrzés miatt egy támogatás nélküli (vagy iframe-ben, engedély
 * nélkül futó) böngészőn a leütés némán no-op — nem dob, és nem is nyeli el a billentyűt.
 */
export function registerFullscreenToggle(game: Phaser.Game): void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== FULLSCREEN_KEY) return;
    if (!game.scale.fullscreen.available) return;

    event.preventDefault();
    // A Scale Manager maga iratkozik fel a `fullscreenchange`-re: a be- ÉS a kilépést (az Esc-et
    // is) követi egy `refresh()`, tehát a letterbox és a pointer-koordináták magukat rendezik.
    game.scale.toggleFullscreen();
  };

  window.addEventListener('keydown', onKeyDown);

  // A játék megsemmisítésekor (HMR, beágyazás) ne maradjon árva listener egy halott `game`-re.
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('keydown', onKeyDown);
  });
}
