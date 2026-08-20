// Parallax háttér tesztek (Phase 8 – Atmosphere, Level 1 háttér iteráció).
//
// A ParallaxBackground osztályt itt NEM példányosítjuk (az Phaser GameObject factory-t
// igényelne); a tesztek a modul tiszta részét fedik: a scroll -> tilePositionX
// leképezést, és a Level 1 réteg-tervének azon invariánsait, amiket egy jövőbeli
// hangolás (pl. a horizont eltolása) csendben elronthatna.
import { describe, it, expect, vi } from 'vitest';
import {
  BACKGROUND_TEXTURES,
  LEVEL1_BACKGROUND_LAYERS,
  SOURCE_HEIGHT,
  tilePositionForScroll,
  VIEWPORT_HEIGHT,
} from '../../src/systems/ParallaxBackground';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

describe('tilePositionForScroll', () => {
  it('a scrollX-et a réteg parallax faktorával skálázza', () => {
    expect(tilePositionForScroll(1000, 0.3)).toBe(300);
    expect(tilePositionForScroll(1000, 0.5)).toBe(500);
  });

  it('a pálya elején nem tol el semmit', () => {
    expect(tilePositionForScroll(0, 0.5)).toBe(0);
  });

  it('egészre kerekít — pixelArt módban a tört offset ugráló oszlopokat okozna', () => {
    // A startFollow lerpje miatt a scrollX gyakorlatilag mindig tört szám.
    expect(tilePositionForScroll(100, 0.3)).toBe(30);
    expect(tilePositionForScroll(101, 0.3)).toBe(30); // 30.3 -> 30
    expect(tilePositionForScroll(105, 0.3)).toBe(32); // 31.5 -> 32
    expect(Number.isInteger(tilePositionForScroll(1234.567, 0.1))).toBe(true);
  });
});

describe('LEVEL1_BACKGROUND_LAYERS', () => {
  it('a három tervezett réteget tartalmazza, hátulról előre', () => {
    expect(LEVEL1_BACKGROUND_LAYERS.map((l) => l.texture)).toEqual([
      BACKGROUND_TEXTURES.SKY,
      BACKGROUND_TEXTURES.MOUNTAINS,
      BACKGROUND_TEXTURES.RUINS,
    ]);
  });

  it('a scrollFactor és a depth EGYÜTT nő: a távolabbi réteg lassabb ÉS hátrébb van', () => {
    for (let i = 1; i < LEVEL1_BACKGROUND_LAYERS.length; i++) {
      const prev = LEVEL1_BACKGROUND_LAYERS[i - 1];
      const curr = LEVEL1_BACKGROUND_LAYERS[i];
      expect(curr.scrollFactor).toBeGreaterThan(prev.scrollFactor);
      expect(curr.depth).toBeGreaterThan(prev.depth);
    }
  });

  it('minden réteg a Level1Scene összes eleme MÖGÖTT van', () => {
    // A legelöl lévő scene-elem a létra hátfala (-2), de a legkisebb használt érték a
    // korábbi dekor-oszlopoké volt (-10); a háttér ez alatt marad.
    for (const layer of LEVEL1_BACKGROUND_LAYERS) {
      expect(layer.depth).toBeLessThan(-10);
    }
  });

  it('egyik réteg alsó éle sem csúszik a viewport alja fölé', () => {
    // Regressziós védelem: ha a SILHOUETTE_BOTTOM_Y elállítódik, a sziluett alja ne
    // hagyjon átlátszó rést a talaj mögött.
    for (const layer of LEVEL1_BACKGROUND_LAYERS) {
      expect(layer.top + layer.height).toBeGreaterThanOrEqual(VIEWPORT_HEIGHT);
    }
  });

  it('az ég a teljes viewportot lefedi (a sziluettek felül szándékosan átlátszóak)', () => {
    const sky = LEVEL1_BACKGROUND_LAYERS[0];
    expect(sky.texture).toBe(BACKGROUND_TEXTURES.SKY);
    expect(sky.top).toBeLessThanOrEqual(0);
  });

  it('csak az ég nyúlik, és pontosan egy függőleges ismétlésre', () => {
    const [sky, ...silhouettes] = LEVEL1_BACKGROUND_LAYERS;

    expect(sky.stretch).toBe(true);
    expect(sky.height).toBe(VIEWPORT_HEIGHT);

    // A sziluettek 1:1-ben, hogy a peremük éles maradjon.
    for (const layer of silhouettes) {
      expect(layer.stretch).toBe(false);
      expect(layer.height).toBe(SOURCE_HEIGHT);
    }
  });
});
