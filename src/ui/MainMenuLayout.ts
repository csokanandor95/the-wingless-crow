/**
 * A `MainMenuScene` geometriája, palettája és szövegei, Phaser-MENTES adatmodulként.
 *
 * Ugyanaz az elv és ugyanaz a KÉNYSZER, mint a `levels/PreSceneLayout.ts`-nél: a
 * `tests/unit/helpers/fakePhaser.ts` **nem ad `Scene` osztályt**, és a `createMockScene()`-nek
 * nincs `input`/`cameras`/`scale`/`registry`-je — a `MainMenuScene.ts` tehát unit tesztből NEM
 * importálható. Ezért minden, ami elromolhat úgy, hogy egy kézi végigjátszás nem venné észre
 * (a panel elcsúszik a szoborra, egy billentyű-leírás elavul, a kijelölés körbefordulása
 * elszámol), ITT lakik, a scene pedig csak rajzol.
 */

/** = a `main.ts` game config `width`/`height`-ja. */
export const VIEW_WIDTH = 800;
export const VIEW_HEIGHT = 450;

/**
 * A háttérfestmény MÉRT kompozíciója 800x450-es térben — ebből jön a menü geometriája.
 *
 * A user kérése az volt, hogy a menüpontok „ne teljesen a képernyő közepén" legyenek, hanem
 * kissé jobbra, hogy a festményen álló LOVAGOT és a SZOBROT ne takarják ki. A `statue.right`
 * (385) tehát nem díszlet-adat, hanem a menüblokk bal oldali korlátja — unit teszt őrzi.
 */
export const PAINTING = {
  /** A koronás lovag megvilágított teste; a köpenye lefelé y=420-ig ér, de x=400-at sosem lépi át. */
  knight: { left: 196, right: 320, bottom: 420 },
  /** A kereszt-botos szobor a talapzatával együtt. EZ a menüblokk bal oldali korlátja. */
  statue: { left: 310, right: 385, top: 70, bottom: 290 },
  /** A festmény legvilágosabb és leginkább RÉSZLETGAZDAG eleme — a menü e fölött ül. */
  cathedral: { left: 405, right: 670 },
  /** A jobb szél gyakorlatilag fekete: itt a legkevésbé feltűnő a panel kerete. */
  darkRightEdge: { left: 750, right: 800 },
} as const;

/**
 * A menüblokk alá eső sáv (x 420..640, y 160..330) MÉRT fényessége a KÉSZ 800x450-es
 * assetről, Rec.709 súlyozással (`make_menu_bg.py` önellenőrzése).
 *
 * A `max` a lényeg: a rózsaablak és a kivilágított ablakok miatt vannak fényes foltok, tehát a
 * szöveg önmagában, panel nélkül helyenként megbukna. A panel fedése ezt nyomja le — a
 * `mainMenuLayout.test.ts` ebből a számból SZÁMOLJA VISSZA a kontrasztot, hogy egy későbbi
 * „hadd látsszon jobban a kép" alfa-hangolás a CI-ban bukjon el, ne valakinek a monitorán.
 */
export const MENU_REGION_LUMINANCE = { mean: 32.2, p90: 44.5, p99: 53.4, max: 124 } as const;

/** A festmény legfelső sorának átlagszíne — hogy egy letterbox se villantson feketét. */
export const BACKGROUND_COLOR = '#0b0810';

// ---------------------------------------------------------------------------------------
// Panelek
// ---------------------------------------------------------------------------------------

/** A `Dialogue` panel-receptje: a fedés lapítja ki a katedrális rajzolatát a szöveg mögött. */
export const PANEL_FILL_COLOR = 0x000000;
export const PANEL_FILL_ALPHA = 0.72;
export const PANEL_BORDER_COLOR = 0x6a5a6a;
export const PANEL_BORDER_ALPHA = 0.9;
export const PANEL_PADDING = 16;

/**
 * A menüpanel. Minden éle levezetett:
 *  - BAL (410): a `PAINTING.statue.right` (385) fölött 25 px-szel, ÉS a `VIEW_WIDTH / 2` (400)
 *    fölött — így a „kissé jobbra" követelmény nem ízlés kérdése, hanem állítás.
 *  - JOBB (760): `VIEW_WIDTH - 40`, a `Dialogue.PANEL_MARGIN_X` értékével. A keret így a mért
 *    majdnem fekete jobb sávba (750..800) esik, ahol a legkevésbé feltűnő.
 *  - FÜGGŐLEGES: a közepe 223, a viewport közepe 225 — optikailag középen. Az alja 100 px-szel
 *    a képkeret fölött áll meg, hogy a lovag sziluettje a menü ALATT és MELLETTE olvasson,
 *    ne bekerítve.
 */
export const MENU_PANEL = { x: 410, y: 96, width: 350, height: 254 } as const;

/**
 * A Controls oldal panelje SZÁNDÉKOSAN majdnem teljes szélességű, tehát a lovagot és a szobrot
 * IGENIS takarja — és ez nem a fenti szabály megsértése.
 *
 * A `x > statue.right` korlát azért van, hogy a NYUGALMI menü ne üljön a festmény szereplőin.
 * A Controls egy kérésre előhívott, modális olvasólap: a menüpanel 318 px-es belső szélességébe
 * egy kilenc soros billentyű-táblázat ~38 karakteres sorokkal férne csak be, ami olvashatatlan.
 * A fedés viszont ugyanaz, tehát a festmény halványan itt is átdereng — a lap a jelenethez
 * tartozik, nem rátét.
 */
export const CONTROLS_PANEL = { x: 40, y: 34, width: 720, height: 366 } as const;

// ---------------------------------------------------------------------------------------
// Betűméretek és paletta (a projekt meglévő nyelve — lásd CreditsScene / Dialogue / CombatHud)
// ---------------------------------------------------------------------------------------

export const TITLE_FONT_SIZE_PX = 26;
export const ITEM_FONT_SIZE_PX = 18;
export const CONTROLS_FONT_SIZE_PX = 13;
export const HINT_FONT_SIZE_PX = 12;

export const MENU_TITLE_COLOR = '#e8d8e8';
export const MENU_ITEM_COLOR = '#ddd6cc';
/** Arany = „ez a fontos" — a projektben végig ezt jelenti (beszélő-név, credits-szakaszfej). */
export const MENU_SELECTED_COLOR = '#c9a24a';
export const HINT_COLOR = '#5a5560';
export const CONTROLS_LABEL_COLOR = '#c9a24a';
export const CONTROLS_VALUE_COLOR = '#ddd6cc';

// ---------------------------------------------------------------------------------------
// Menü nézet
// ---------------------------------------------------------------------------------------

/**
 * A kijelölő karakter KÜLÖN szövegobjektum, fix x-en — NEM a címke elé fűzött `'▶ '` prefix.
 * Prefixként minden címke vízszintesen ELMOZDULNA a kijelölés léptetésekor (a klasszikus
 * monospace-menü „imbolygás"). A `▶` ugyanabból az Unicode blokkból való, mint a projektben
 * már használt `▼`, tehát ha az megjelenik, ez is.
 */
export const MENU_CARET = '▶';

export const MENU_CARET_X = MENU_PANEL.x + PANEL_PADDING;
/** A címke-oszlop: a kijelölő számára hagyott hézaggal beljebb. */
export const MENU_LABEL_X = MENU_CARET_X + 22;
export const MENU_TITLE_Y = MENU_PANEL.y + 22;
export const MENU_FIRST_ITEM_Y = 192;
export const MENU_ITEM_STEP_Y = 34;
export const MENU_HINT_Y = MENU_PANEL.y + MENU_PANEL.height - PANEL_PADDING - 18;

/** A menüsor középvonala (a sorok `setOrigin(0, 0.5)`-tel készülnek). */
export function menuItemY(index: number): number {
  return MENU_FIRST_ITEM_Y + index * MENU_ITEM_STEP_Y;
}

export const MENU_TITLE = 'THE WINGLESS CROW';
export const MENU_HINT = 'W/S or ↑/↓ · Enter/Space: Select';

export type MainMenuAction = 'start' | 'controls' | 'credits';

export interface MainMenuItem {
  readonly action: MainMenuAction;
  readonly label: string;
}

/**
 * A három menüpont. **`exit` SZÁNDÉKOSAN NINCS** (user-döntés): a böngésző a `window.close()`-t
 * egy sima fülre letiltja, tehát egy „Exit Game" vagy nem csinálna semmit, vagy csak annyit
 * üzenne, hogy „zárd be a fület". Unit teszt rögzíti a hiányát, hogy ne kelljen újratárgyalni.
 */
export const MENU_ITEMS: readonly MainMenuItem[] = [
  { action: 'start', label: 'START GAME' },
  { action: 'controls', label: 'CONTROLS' },
  { action: 'credits', label: 'CREDITS' },
];

// ---------------------------------------------------------------------------------------
// Controls nézet
// ---------------------------------------------------------------------------------------

export const CONTROLS_TITLE = 'CONTROLS';
export const CONTROLS_HINT = 'Esc / Enter / Space: Back';

export const CONTROLS_TITLE_Y = 56;
export const CONTROLS_LABEL_X = CONTROLS_PANEL.x + PANEL_PADDING + 16;
export const CONTROLS_VALUE_X = 232;
export const CONTROLS_FIRST_ROW_Y = 100;
export const CONTROLS_ROW_STEP_Y = 26;
export const CONTROLS_HINT_Y = 362;

export function controlsRowY(index: number): number {
  return CONTROLS_FIRST_ROW_Y + index * CONTROLS_ROW_STEP_Y;
}

export interface ControlRow {
  /** Üres címke = az ELŐZŐ sor folytatása (a scene ilyenkor nem rajzol arany címkét). */
  readonly label: string;
  readonly value: string;
}

/**
 * A tényleges bekötések a `player/PlayerController.ts`-ből, a számok pedig a
 * `combat/Attack.ts` és a `combat/Projectile.ts` konstansaiból.
 *
 * A számok itt SZÖVEGKÉNT állnak, nem importként — így a modul Phaser-mentes marad (a
 * `Projectile.ts` importálja a Phasert). Az elavulás ellen a `mainMenuLayout.test.ts` véd: az
 * a VALÓDI konstansokból építi fel a várt részsztringeket, tehát egy balansz-hangolás nem
 * hagyhatja hazudni ezt a lapot.
 */
export const CONTROLS_ROWS: readonly ControlRow[] = [
  { label: 'Move', value: 'A / ←   ·   D / →' },
  { label: 'Jump', value: 'Space   ·   W / ↑' },
  { label: 'Ladder', value: 'W / ↑ up   ·   S / ↓ down' },
  { label: '', value: 'Space drops off   ·   A / D steps off' },
  { label: 'Interact', value: 'E   —   talk, doors, checkpoints' },
  { label: 'Sword', value: 'J  or left mouse   —   10 dmg, 350 ms cooldown' },
  { label: 'Heavy slash', value: 'K  or right mouse   —   22 dmg, longer reach' },
  { label: '', value: 'Charged by 3 landed sword hits, not a timer' },
  { label: 'Fireball', value: 'F   —   15 dmg, 2 charges, 5 s recharge each' },
];

// ---------------------------------------------------------------------------------------
// Pure logika
// ---------------------------------------------------------------------------------------

/**
 * Körkörös léptetés a menüpontok között. `count <= 0` esetén 0 — védekező ág, hogy egy üres
 * lista se adjon `NaN`-t a `%` operátoron át.
 */
export function wrapSelection(current: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((current + delta) % count) + count) % count;
}
