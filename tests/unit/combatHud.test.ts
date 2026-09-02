// A harci HUD tesztjei (Project_plan.md §20 `ui/` modul).
//
// Két rétege van, ugyanaz a bontás, mint a `ui/Dialogue` tesztjénél:
//   1. a PURE segédfüggvények (`fireballPipFill`, `heavySegmentFilled`) — Phaser nélkül;
//   2. a `CombatHud` maga: a HP-sor formátuma, a rajzolás és az életciklus.
//
// A scene-ek HUD-blokkját ez a modul váltotta ki mind a HÉT helyen, tehát ez az első
// tesztje egy olyan viselkedésnek, ami korábban hétszer, tesztelhetetlenül volt bemásolva.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import CombatHud, {
  fireballPipFill,
  heavySegmentFilled,
  HUD_DEPTH,
  type CombatHudSource,
} from '../../src/ui/CombatHud';
import {
  createMockScene,
  createMockGraphics,
  type MockScene,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

describe('fireballPipFill', () => {
  // Két töltet, egy elköltve, a visszatöltés félúton.
  it('az elérhető töltetek pipái teljesek', () => {
    expect(fireballPipFill(0, 1, 0.5)).toBe(1);
  });

  it('az ÉPP TÖLTŐDŐ pipa a visszatöltés állapotát mutatja', () => {
    expect(fireballPipFill(1, 1, 0.5)).toBe(0.5);
  });

  it('a mögötte lévő pipák üresek', () => {
    expect(fireballPipFill(2, 1, 0.5)).toBe(0);
  });

  it('teli tárnál minden pipa teljes', () => {
    expect(fireballPipFill(0, 2, 1)).toBe(1);
    expect(fireballPipFill(1, 2, 1)).toBe(1);
  });

  it('a sávon kívüli progress értékek nem lógnak ki a pipából', () => {
    expect(fireballPipFill(0, 0, -0.5)).toBe(0);
    expect(fireballPipFill(0, 0, 1.5)).toBe(1);
  });
});

describe('heavySegmentFilled', () => {
  it('a töltés alatti szegmensek tele vannak', () => {
    expect(heavySegmentFilled(0, 2)).toBe(true);
    expect(heavySegmentFilled(1, 2)).toBe(true);
  });

  it('a töltésen túli szegmensek üresek', () => {
    expect(heavySegmentFilled(2, 2)).toBe(false);
  });

  it('nulla töltésnél egyik sem', () => {
    expect(heavySegmentFilled(0, 0)).toBe(false);
  });
});

describe('CombatHud', () => {
  let scene: MockScene;
  let hud: CombatHud;
  let source: CombatHudSource;

  /**
   * A HUD SZÁNDÉKOSAN nem a `Player`-t várja, hanem ezt a strukturális felületet — ezért
   * elég egy sima objektum, Player-mock nélkül. Ez a teszt egyben ennek a bizonyítéka is.
   */
  function makeSource(overrides: Partial<CombatHudSource> = {}): CombatHudSource {
    return {
      getHP: () => 100,
      getMaxHP: () => 100,
      playerState: 'IDLE',
      getFireballCharges: () => 2,
      getFireballMaxCharges: () => 2,
      getFireballRechargeProgress: () => 1,
      getHeavyCharge: () => 0,
      getHeavyChargeMax: () => 3,
      ...overrides,
    };
  }

  /** A HUD egyetlen Graphicsot hoz létre; azon rajzol minden mérőt. */
  function meters(): ReturnType<typeof createMockGraphics> {
    return scene.add.graphics.mock.results[0].value as ReturnType<typeof createMockGraphics>;
  }

  function hpText() {
    return scene.add.text.mock.results[0].value;
  }

  beforeEach(() => {
    scene = createMockScene();
    hud = new CombatHud(scene as unknown as Phaser.Scene);
    source = makeSource();
  });

  it('a HP-sor formátuma VÁLTOZATLAN a korábbi debug-szöveghez képest', () => {
    hud.update(makeSource({ getHP: () => 73, playerState: 'RUN' }));

    expect(hpText().setText).toHaveBeenCalledWith('HP: 73/100 | RUN');
  });

  it('minden elem a kamerához van rögzítve, egységes mélységen', () => {
    // A HUD nem görgethet a pályával, és minden más UI fölött kell lennie (Dialogue 90/91).
    expect(hpText().setScrollFactor).toHaveBeenCalledWith(0);
    expect(hpText().setDepth).toHaveBeenCalledWith(HUD_DEPTH);
    expect(meters().depth).toBe(HUD_DEPTH);
  });

  it('minden frissítés ELŐBB törli a mérőket — nem rajzol egymásra', () => {
    hud.update(source);
    hud.update(source);

    expect(meters().clear).toHaveBeenCalledTimes(2);
  });

  it('annyi pipát rajzol, amennyit a forrás mond — nincs beégetett darabszám', () => {
    hud.update(makeSource({ getFireballMaxCharges: () => 4, getHeavyChargeMax: () => 5 }));

    // Pipánként PONTOSAN egy keret, kitöltöttségtől függetlenül.
    expect(meters().strokeRect).toHaveBeenCalledTimes(9);
  });

  it('az üres pipa csak hátteret kap, a teli kitöltést is', () => {
    hud.update(
      makeSource({
        getFireballCharges: () => 0,
        getFireballMaxCharges: () => 1,
        getFireballRechargeProgress: () => 0,
        getHeavyCharge: () => 0,
        getHeavyChargeMax: () => 1,
      })
    );
    const emptyFills = meters().fillRect.mock.calls.length;

    meters().fillRect.mockClear();
    hud.update(
      makeSource({
        getFireballCharges: () => 1,
        getFireballMaxCharges: () => 1,
        getHeavyCharge: () => 1,
        getHeavyChargeMax: () => 1,
      })
    );

    expect(emptyFills).toBe(2); // 2 pipa háttere
    expect(meters().fillRect.mock.calls.length).toBe(4); // + 2 kitöltés
  });

  it('a részlegesen töltődő pipa ARÁNYOSAN keskenyebb', () => {
    hud.update(
      makeSource({
        getFireballCharges: () => 0,
        getFireballMaxCharges: () => 1,
        getFireballRechargeProgress: () => 0.5,
        getHeavyChargeMax: () => 0,
      })
    );

    const calls = meters().fillRect.mock.calls as Array<[number, number, number, number]>;
    const [background, fill] = calls;
    expect(fill[2]).toBeCloseTo(background[2] / 2);
  });

  // A Level 1 ház-párbeszéde az EGYETLEN, aminek a panelje a képernyő TETEJÉN van (a pálya
  // padlója 418, ami nem fér el a panellel) — pont a HUD helyén, ráadásul alacsonyabb
  // mélységen. A négy boss-aréna panelje 369-nél van, azzal nincs ütközés.
  describe('setVisible — a felső panelű párbeszéd alatt elrejtve', () => {
    it('minden elemet elrejt, majd visszahoz', () => {
      hud.setVisible(false);
      expect(hpText().visible).toBe(false);
      expect(meters().visible).toBe(false);

      hud.setVisible(true);
      expect(hpText().visible).toBe(true);
      expect(meters().visible).toBe(true);
    });

    it('a feliratokat is elrejti, nem csak a HP-sort és a pipákat', () => {
      hud.setVisible(false);

      const labels = scene.add.text.mock.results.slice(1);
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        expect((label.value as { visible: boolean }).visible).toBe(false);
      }
    });
  });

  it('a scene shutdownjára maga takarít', () => {
    // Ugyanaz a minta, mint a TutorialHint/AudioManager esetében: a scene-nek nincs teendője.
    expect(scene.events.once).toHaveBeenCalled();

    hud.destroy();

    expect(hpText().destroyed).toBe(true);
    expect(meters().destroyed).toBe(true);
  });

  it('destroy() után az update() már nem rajzol', () => {
    hud.destroy();
    hud.update(source);

    expect(meters().clear).not.toHaveBeenCalled();
  });
});
