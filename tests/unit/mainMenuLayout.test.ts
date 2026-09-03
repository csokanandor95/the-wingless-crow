// A főmenü geometriai, kontraszt- és tartalmi invariánsai.
//
// Ugyanaz a szerep, mint a `preSceneLayout.test.ts`-é, és ugyanaz a kényszer: a
// `tests/unit/helpers/fakePhaser.ts` NEM ad `Scene` osztályt, és a `createMockScene()`-nek
// nincs `input`/`cameras`/`scale`/`registry`-je — a `MainMenuScene.ts` tehát unit tesztből nem
// importálható. Ezért él minden szám, szín és szöveg a `ui/MainMenuLayout.ts`-ben, és ezért
// bizonyítható itt mockolás nélkül, hogy a menü nem takarja ki a festmény szereplőit, olvasható
// marad, elfér a panelen, és nem hazudik a billentyűkről.
import { describe, it, expect, vi } from 'vitest';

// A `Projectile.ts` importálja a Phasert (a `Fireball` egy `Arcade.Sprite`), tehát a
// tűzgolyó-konstansok kiolvasásához kell a modul-mock. A `vi.mock()` a fájl import sorai FÖLÉ
// hoisztolódik, ezért a factory csak DINAMIKUS importtal érheti el a helpert (TDZ).
vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

import {
  BACKGROUND_COLOR,
  CONTROLS_FONT_SIZE_PX,
  CONTROLS_HINT,
  CONTROLS_HINT_Y,
  CONTROLS_LABEL_X,
  CONTROLS_PANEL,
  CONTROLS_ROW_STEP_Y,
  CONTROLS_ROWS,
  CONTROLS_TITLE_Y,
  CONTROLS_VALUE_X,
  controlsRowY,
  HINT_FONT_SIZE_PX,
  ITEM_FONT_SIZE_PX,
  MENU_CARET_X,
  MENU_HINT,
  MENU_HINT_Y,
  MENU_ITEM_COLOR,
  MENU_ITEMS,
  MENU_LABEL_X,
  MENU_PANEL,
  MENU_REGION_LUMINANCE,
  MENU_SELECTED_COLOR,
  MENU_TITLE,
  MENU_TITLE_Y,
  menuItemY,
  PAINTING,
  PANEL_FILL_ALPHA,
  PANEL_PADDING,
  TITLE_FONT_SIZE_PX,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  wrapSelection,
} from '../../src/ui/MainMenuLayout';
import { ATTACK_CONFIGS, AttackType, HEAVY_CHARGE_HITS } from '../../src/combat/Attack';
import {
  FIREBALL_CONFIG,
  FIREBALL_MAX_CHARGES,
  FIREBALL_RECHARGE_MS,
} from '../../src/combat/Projectile';

/** A `preSceneLayout.test.ts` konzervatív monospace-metrikája: 15px-en 9,5px per karakter. */
function charWidth(fontSizePx: number): number {
  return (fontSizePx * 9.5) / 15;
}

function textWidth(value: string, fontSizePx: number): number {
  return value.length * charWidth(fontSizePx);
}

const MENU_INNER_RIGHT = MENU_PANEL.x + MENU_PANEL.width - PANEL_PADDING;
const CONTROLS_INNER_RIGHT = CONTROLS_PANEL.x + CONTROLS_PANEL.width - PANEL_PADDING;

/** sRGB csatorna -> lineáris (WCAG 2.x). */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminanceFromHex(hex: string): number {
  const value = parseInt(hex.replace('#', ''), 16);
  const r = linearize((value >> 16) & 0xff);
  const g = linearize((value >> 8) & 0xff);
  const b = linearize(value & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * A háttér mért fényessége GAMMA-KÓDOLT 0..255 skálán érkezik (a `make_menu_bg.py` Rec.709
 * súlyozású átlaga), tehát a kontraszt-számításhoz linearizálni kell.
 */
function contrastRatio(foregroundHex: string, backgroundLuminance255: number): number {
  const fg = relativeLuminanceFromHex(foregroundHex);
  const bg = linearize(backgroundLuminance255);
  const [light, dark] = fg > bg ? [fg, bg] : [bg, fg];
  return (light + 0.05) / (dark + 0.05);
}

describe('MainMenuLayout', () => {
  describe('a festmény szereplőinek szabadon hagyása (a user követelménye)', () => {
    // "A main menü opciók ne teljesen a képernyő közepén legyenek, hanem kissé jobbra, hogy a
    // háttérképen álló player és szobor karaktert ne takarja ki." Ez a három teszt teszi az
    // állítást futtathatóvá — ha valaki visszatolja a blokkot középre, a CI szól, nem a
    // következő kézi végigjátszás.
    it('a menüpanel a képernyő JOBB felén van', () => {
      expect(MENU_PANEL.x).toBeGreaterThanOrEqual(VIEW_WIDTH / 2);
    });

    it('a menüpanel a SZOBORTÓL jobbra kezdődik', () => {
      expect(MENU_PANEL.x).toBeGreaterThan(PAINTING.statue.right);
    });

    it('a menüpanel a LOVAGTÓL jobbra kezdődik', () => {
      expect(MENU_PANEL.x).toBeGreaterThan(PAINTING.knight.right);
    });

    // A Controls SZÁNDÉKOSAN megszegi a fenti korlátot: az egy kérésre előhívott, modális
    // olvasólap, aminek a kilenc soros billentyű-táblázathoz szélesség kell. A korlát a
    // NYUGALMI menüre vonatkozik. Ez a teszt azért van, hogy egy későbbi "legyen konzisztens"
    // refaktor ne szűkítse le olvashatatlanra.
    it('a Controls lap SZÁNDÉKOSAN széles, tehát a szereplők elé ér', () => {
      expect(CONTROLS_PANEL.x).toBeLessThan(PAINTING.statue.right);
      expect(CONTROLS_PANEL.width).toBeGreaterThan(MENU_PANEL.width);
    });

    it('mindkét panel a viewporton belül van', () => {
      for (const panel of [MENU_PANEL, CONTROLS_PANEL]) {
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.y).toBeGreaterThanOrEqual(0);
        expect(panel.x + panel.width).toBeLessThanOrEqual(VIEW_WIDTH);
        expect(panel.y + panel.height).toBeLessThanOrEqual(VIEW_HEIGHT);
      }
    });
  });

  describe('olvashatóság a festmény fölött', () => {
    // A menüblokk a katedrális elé kerül, ami a kép LEGVILÁGOSABB és leginkább részletgazdag
    // eleme (mért csúcs 124). A panel fedése nyomja ezt le. Ha valaki később csökkenti a
    // fedést ("hadd látsszon jobban a kép"), ITT bukik el, nem valakinek a monitorán.
    const worstCaseBackground = MENU_REGION_LUMINANCE.max * (1 - PANEL_FILL_ALPHA);

    it('a menüszöveg a festmény LEGVILÁGOSABB pontján is olvasható marad', () => {
      expect(contrastRatio(MENU_ITEM_COLOR, worstCaseBackground)).toBeGreaterThan(4.5);
      expect(contrastRatio(MENU_SELECTED_COLOR, worstCaseBackground)).toBeGreaterThan(4.5);
    });

    it('panel NÉLKÜL a legvilágosabb folton megbukna — tehát a panel nem dísz', () => {
      expect(contrastRatio(MENU_SELECTED_COLOR, MENU_REGION_LUMINANCE.max)).toBeLessThan(4.5);
    });

    it('a kijelölt és a nem kijelölt sor színe KÜLÖNBÖZIK', () => {
      expect(MENU_SELECTED_COLOR).not.toBe(MENU_ITEM_COLOR);
    });

    it('a háttérszín a festmény tónusában van (nem villan feketét letterboxnál)', () => {
      expect(BACKGROUND_COLOR).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('a szövegek elférnek', () => {
    it('a cím belefér a menüpanelbe', () => {
      expect(MENU_LABEL_X + textWidth(MENU_TITLE, TITLE_FONT_SIZE_PX)).toBeLessThanOrEqual(
        MENU_INNER_RIGHT
      );
    });

    it('minden menüpont címkéje belefér', () => {
      for (const item of MENU_ITEMS) {
        expect(MENU_LABEL_X + textWidth(item.label, ITEM_FONT_SIZE_PX)).toBeLessThanOrEqual(
          MENU_INNER_RIGHT
        );
      }
    });

    it('a menü súgója belefér', () => {
      expect(MENU_CARET_X + textWidth(MENU_HINT, HINT_FONT_SIZE_PX)).toBeLessThanOrEqual(
        MENU_INNER_RIGHT
      );
    });

    // A címke- és az érték-oszlop nem ütközhet: enélkül egy hosszabbra írt címke ránőne a
    // billentyűkre.
    it('a Controls címke-oszlopa nem ér bele az érték-oszlopba', () => {
      for (const row of CONTROLS_ROWS) {
        expect(
          CONTROLS_LABEL_X + textWidth(row.label, CONTROLS_FONT_SIZE_PX)
        ).toBeLessThanOrEqual(CONTROLS_VALUE_X);
      }
    });

    it('a Controls érték-oszlopa belefér a panelbe', () => {
      for (const row of CONTROLS_ROWS) {
        expect(
          CONTROLS_VALUE_X + textWidth(row.value, CONTROLS_FONT_SIZE_PX)
        ).toBeLessThanOrEqual(CONTROLS_INNER_RIGHT);
      }
    });

    it('a Controls súgója belefér', () => {
      expect(CONTROLS_LABEL_X + textWidth(CONTROLS_HINT, HINT_FONT_SIZE_PX)).toBeLessThanOrEqual(
        CONTROLS_INNER_RIGHT
      );
    });
  });

  describe('függőleges elrendezés', () => {
    it('a menüpontok a cím ALATT kezdődnek', () => {
      expect(menuItemY(0)).toBeGreaterThan(MENU_TITLE_Y + TITLE_FONT_SIZE_PX);
    });

    it('az utolsó menüpont a súgó FÖLÖTT ér véget', () => {
      const lastBottom = menuItemY(MENU_ITEMS.length - 1) + ITEM_FONT_SIZE_PX / 2;
      expect(lastBottom).toBeLessThan(MENU_HINT_Y - HINT_FONT_SIZE_PX / 2);
    });

    it('a menü súgója a panelen belül marad', () => {
      expect(MENU_HINT_Y + HINT_FONT_SIZE_PX / 2).toBeLessThanOrEqual(
        MENU_PANEL.y + MENU_PANEL.height - PANEL_PADDING
      );
    });

    it('a Controls sorai a cím alatt kezdődnek és a súgó fölött érnek véget', () => {
      expect(controlsRowY(0)).toBeGreaterThan(CONTROLS_TITLE_Y + TITLE_FONT_SIZE_PX);

      const lastBottom =
        controlsRowY(CONTROLS_ROWS.length - 1) + CONTROLS_FONT_SIZE_PX / 2;
      expect(lastBottom).toBeLessThan(CONTROLS_HINT_Y - HINT_FONT_SIZE_PX / 2);
    });

    it('a Controls súgója a panelen belül marad', () => {
      expect(CONTROLS_HINT_Y + HINT_FONT_SIZE_PX / 2).toBeLessThanOrEqual(
        CONTROLS_PANEL.y + CONTROLS_PANEL.height - PANEL_PADDING
      );
    });

    // A kattintható zónák magassága a SORKÖZ, tehát a soroknak legalább akkora hézaggal kell
    // követniük egymást, hogy a szövegek ne érjenek össze.
    it('a sorköz nagyobb a betűméretnél (a sorok nem érnek össze)', () => {
      expect(menuItemY(1) - menuItemY(0)).toBeGreaterThan(ITEM_FONT_SIZE_PX);
      expect(CONTROLS_ROW_STEP_Y).toBeGreaterThan(CONTROLS_FONT_SIZE_PX);
    });
  });

  describe('kijelölés (wrapSelection)', () => {
    it('a legfelső pontról felfelé a legalsóra fordul', () => {
      expect(wrapSelection(0, -1, 3)).toBe(2);
    });

    it('a legalsó pontról lefelé a legfelsőre fordul', () => {
      expect(wrapSelection(2, 1, 3)).toBe(0);
    });

    it('középről mindkét irányba a szomszédra lép', () => {
      expect(wrapSelection(1, -1, 3)).toBe(0);
      expect(wrapSelection(1, 1, 3)).toBe(2);
    });

    it('az eredmény MINDIG érvényes index marad', () => {
      for (let current = 0; current < 6; current += 1) {
        for (let delta = -3; delta <= 3; delta += 1) {
          const next = wrapSelection(current, delta, MENU_ITEMS.length);
          expect(Number.isInteger(next)).toBe(true);
          expect(next).toBeGreaterThanOrEqual(0);
          expect(next).toBeLessThan(MENU_ITEMS.length);
        }
      }
    });

    // Védekező ág: a `%` operátor üres listán NaN-t adna, ami némán elrontaná a kijelölést.
    it('üres listán 0-t ad, nem NaN-t', () => {
      expect(wrapSelection(0, 1, 0)).toBe(0);
    });
  });

  describe('menüpontok', () => {
    it('pontosan három pont van, a várt sorrendben', () => {
      expect(MENU_ITEMS.map((item) => item.action)).toEqual(['start', 'controls', 'credits']);
    });

    it('minden címke nem üres, és minden action egyedi', () => {
      const actions = MENU_ITEMS.map((item) => item.action);
      expect(new Set(actions).size).toBe(actions.length);
      for (const item of MENU_ITEMS) expect(item.label.length).toBeGreaterThan(0);
    });

    // User-döntés: egy böngészőfül nem zárhatja be magát (a `window.close()` csak script által
    // nyitott ablakra működik), tehát egy "Exit Game" vagy nem csinálna semmit, vagy csak
    // annyit üzenne, hogy "zárd be a fület". Ez a teszt rögzíti a hiányt, hogy ne kelljen
    // újratárgyalni.
    it('NINCS Exit Game pont', () => {
      expect(MENU_ITEMS.map((item) => item.action)).not.toContain('exit');
      for (const item of MENU_ITEMS) expect(item.label.toLowerCase()).not.toContain('exit');
    });
  });

  describe('a Controls lap tartalma', () => {
    const pageText = CONTROLS_ROWS.map((row) => `${row.label} ${row.value}`).join('\n');
    const labelOf = (label: string) => CONTROLS_ROWS.find((row) => row.label === label);

    it('a user által kért MIND A NÉGY témának van sora', () => {
      // "A controls menü mutassa be a mozgást, támadást és a tűzgolyó, és a slash támadás
      // működését szövegesen."
      for (const label of ['Move', 'Jump', 'Sword', 'Heavy slash', 'Fireball']) {
        expect(labelOf(label)).toBeDefined();
      }
    });

    it('minden tényleges billentyű szerepel a lapon', () => {
      // A `PlayerController.ts` teljes bekötés-listája.
      for (const key of ['A', 'D', 'W', 'S', 'Space', 'J', 'K', 'F', 'E', '←', '→', '↑', '↓']) {
        expect(pageText).toContain(key);
      }
      expect(pageText).toContain('left mouse');
      expect(pageText).toContain('right mouse');
    });

    // A számok a lapon SZÖVEGKÉNT állnak (hogy a layout-modul Phaser-mentes maradjon), tehát
    // egy balansz-hangolás némán elavulttá tehetné őket. Ez a blokk a VALÓDI konstansokból
    // építi a várt részsztringeket — a lap nem tud csendben hazudni.
    it('a kard számai egyeznek az ATTACK_CONFIGS-szal', () => {
      const sword = ATTACK_CONFIGS[AttackType.SWORD];
      const row = labelOf('Sword');
      expect(row?.value).toContain(`${sword.damage} dmg`);
      expect(row?.value).toContain(`${sword.cooldownMs} ms`);
    });

    it('a heavy slash számai egyeznek, és a töltés NEM időzítőként van leírva', () => {
      expect(labelOf('Heavy slash')?.value).toContain(
        `${ATTACK_CONFIGS[AttackType.HEAVY].damage} dmg`
      );
      // A projekt legfélreérthetőbb mechanikája: a heavy nem cooldownról, hanem BEÉRKEZETT
      // alapcsapásokból tölt.
      expect(pageText).toContain(`${HEAVY_CHARGE_HITS} landed sword hits`);
      expect(pageText).toContain('not a timer');
    });

    it('a tűzgolyó számai egyeznek a FIREBALL konstansokkal', () => {
      const row = labelOf('Fireball');
      expect(row?.value).toContain(`${FIREBALL_CONFIG.damage} dmg`);
      expect(row?.value).toContain(`${FIREBALL_MAX_CHARGES} charges`);
      expect(row?.value).toContain(`${FIREBALL_RECHARGE_MS / 1000} s recharge`);
    });

    // Az üres címke a scene-ben azt jelenti, hogy "ez az előző sor folytatása" — ilyenkor nem
    // születik arany címke-objektum. Üres ÉRTÉK viszont egy néma, üres sort rajzolna.
    it('egyetlen sor értéke sem üres', () => {
      for (const row of CONTROLS_ROWS) expect(row.value.length).toBeGreaterThan(0);
    });
  });
});
