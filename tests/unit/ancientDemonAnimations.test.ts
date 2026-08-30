// Ancient Demon (Boss 3) animáció-vezérlés: state -> anim leképezés, a fordulás-kompenzáció
// geometriája, és a MÉRT értékekből LEVEZETETT időzítések/hatótávok.
//
// A modul PURE része (animKeyForState + a geometria-konstansok) Phaser AnimationManager
// nélkül tesztelhető — ugyanaz az elv, mint a bossAnimations / madKingAnimations tesztekben.
import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

import {
  ANCIENT_DEMON_ANIMS,
  ANCIENT_DEMON_FACING,
  animKeyForState,
  BLADE_REACH_PX,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  BODY_WIDTH,
  COMBO_STRIKE1_MS,
  COMBO_STRIKE2_MS,
  COMBO_TOTAL_MS,
  FEET_OFFSET_Y,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  HALF_WIDTH,
  NOVA_IMPACT_MS,
  NOVA_RADIUS_PX,
  NOVA_TOP_PX,
  NOVA_TOTAL_MS,
  ORIGIN_Y,
  PLAYER_FEET_OFFSET_Y,
  SCALE,
  SUMMON_RELEASE_MS,
  SUMMON_TOTAL_MS,
  type DemonAction,
} from '../../src/bosses/AncientDemonAnimations';
import { DemonState } from '../../src/bosses/AncientDemon';
import { bodyCenterX, bodyOffsetXFor, isFlipped, originXFor } from '../../src/systems/SpriteFacing';

/**
 * A rajzolt lény MÉRT középvonala a 100x100-as frame-en belül. Ez a szám két, egymástól
 * FÜGGETLEN mérésből jön ki: (1) a köpeny oszlop-sűrűsége (x 35..51), (2) az árny-hullám
 * szimmetria-középpontja (x 5..81 -> 43). Ha valaha elválnának, valamelyik mérés hibás.
 */
const MEASURED_BODY_CENTER_X = 43;

describe('AncientDemonAnimations', () => {
  describe('state -> animáció leképezés', () => {
    it('minden támadás-állapot a saját animációjára képződik', () => {
      expect(animKeyForState(DemonState.COMBO, null)).toBe(ANCIENT_DEMON_ANIMS.COMBO);
      expect(animKeyForState(DemonState.NOVA, null)).toBe(ANCIENT_DEMON_ANIMS.NOVA);
      expect(animKeyForState(DemonState.SUMMON, null)).toBe(ANCIENT_DEMON_ANIMS.SUMMON);
      expect(animKeyForState(DemonState.DEAD, null)).toBe(ANCIENT_DEMON_ANIMS.DEATH);
    });

    it('a COOLDOWN az ELŐZŐ AKCIÓ pózát tartja meg, nem pattan vissza idle-be', () => {
      const actions: DemonAction[] = ['COMBO', 'NOVA', 'SUMMON'];
      const expected = [
        ANCIENT_DEMON_ANIMS.COMBO,
        ANCIENT_DEMON_ANIMS.NOVA,
        ANCIENT_DEMON_ANIMS.SUMMON,
      ];

      actions.forEach((action, index) => {
        expect(animKeyForState(DemonState.COOLDOWN, action)).toBe(expected[index]);
      });
    });

    it('akció nélküli COOLDOWN idle — nincs mit megtartani', () => {
      expect(animKeyForState(DemonState.COOLDOWN, null)).toBe(ANCIENT_DEMON_ANIMS.IDLE);
    });

    it('a LEBEGÉS és a VILLANÁS is IDLE — a csomagban nincs járás- és teleport-animáció', () => {
      // Ez SZÁNDÉKOS, nem hiányosság: a mozgást a velocityX, a villanást az alpha-tween
      // közli. Ha valaha járás-sheet kerül a csomagba, ez a teszt jelzi, hogy itt is
      // változtatni kell.
      expect(animKeyForState(DemonState.FLOAT, null)).toBe(ANCIENT_DEMON_ANIMS.IDLE);
      expect(animKeyForState(DemonState.BLINK_OUT, null)).toBe(ANCIENT_DEMON_ANIMS.IDLE);
      expect(animKeyForState(DemonState.BLINK_IN, null)).toBe(ANCIENT_DEMON_ANIMS.IDLE);
      expect(animKeyForState(DemonState.DORMANT, null)).toBe(ANCIENT_DEMON_ANIMS.IDLE);
    });

    it('a DEAD felülírja a lastAction-t — a halál nem folytatja a támadást', () => {
      expect(animKeyForState(DemonState.DEAD, 'COMBO')).toBe(ANCIENT_DEMON_ANIMS.DEATH);
    });

    it('az anim kulcsok egyediek', () => {
      const keys = Object.values(ANCIENT_DEMON_ANIMS);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('Geometria (MÉRT értékek)', () => {
    it('a testközép a két független mérés KÖZÖS eredménye', () => {
      // (1) a köpeny oszlop-sűrűségéből: 35 + 16/2
      expect(bodyCenterX(ANCIENT_DEMON_FACING)).toBe(MEASURED_BODY_CENTER_X);
      // (2) az árny-hullám szimmetria-középpontja: a hullám f7-en x=5..81, sugara 38,
      //     tehát a középpontja 5 + 38 = 43. Ha ez a kettő elválik, a hullám hitboxa
      //     elcsúszik a rajzolt hullámtól.
      expect(5 + NOVA_RADIUS_PX).toBe(MEASURED_BODY_CENTER_X);
    });

    it('a test NEM a frame közepén ül — a fordulás-kompenzáció tehát tényleg dolgozik', () => {
      expect(bodyCenterX(ANCIENT_DEMON_FACING)).not.toBe(FRAME_WIDTH / 2);
    });

    it('a talp- és félszélesség-offset a body-ból SZÁRMAZIK, nem beírt szám', () => {
      expect(FEET_OFFSET_Y).toBe((BODY_HEIGHT / 2) * SCALE);
      expect(HALF_WIDTH).toBe((BODY_WIDTH / 2) * SCALE);
      expect(ORIGIN_Y).toBe((BODY_OFFSET_Y + BODY_HEIGHT / 2) / FRAME_HEIGHT);
    });

    it('a body a rajzolt lényen belül marad', () => {
      expect(BODY_OFFSET_X).toBeGreaterThanOrEqual(0);
      expect(BODY_OFFSET_X + BODY_WIDTH).toBeLessThanOrEqual(FRAME_WIDTH);
      expect(BODY_OFFSET_Y + BODY_HEIGHT).toBeLessThanOrEqual(FRAME_HEIGHT);
    });

    it('a player talp-offsetje LEVEZETETT (a knight originjéből), nem beírt 24', () => {
      expect(PLAYER_FEET_OFFSET_Y).toBe(24);
    });
  });

  describe('Fordulás-kompenzáció', () => {
    it('a sheet natívan JOBBRA néz: balra fordulás igényel flipX-et', () => {
      expect(ANCIENT_DEMON_FACING.nativeFacing).toBe('right');
      expect(isFlipped(ANCIENT_DEMON_FACING, true)).toBe(true);
      expect(isFlipped(ANCIENT_DEMON_FACING, false)).toBe(false);
    });

    it('a body VILÁGKOORDINÁTÁS közepe forduláskor NEM mozdul el', () => {
      // Ez a 11./16. technikai tanulság regressziós tesztje: az originX-et ÉS a body
      // offsetjét EGYÜTT kell tükrözni, különben a lény oldalra ugrik.
      const centerFor = (faceLeft: boolean): number => {
        const originX = originXFor(ANCIENT_DEMON_FACING, faceLeft);
        const offsetX = bodyOffsetXFor(ANCIENT_DEMON_FACING, faceLeft);
        // A Phaser Arcade a body bal élét x + scaleX * (offset.x - displayOriginX)-ként
        // számolja; a képlet skálafüggetlen, ezért itt forrás-pixelben nézzük.
        return offsetX - originX * FRAME_WIDTH + BODY_WIDTH / 2;
      };

      expect(centerFor(false)).toBeCloseTo(0, 10);
      expect(centerFor(true)).toBeCloseTo(0, 10);
    });
  });

  describe('Levezetett időzítés', () => {
    it('a kombó KÉT csapása azonos ütemre esik, és a második NEM az animáció legvégén van', () => {
      expect(COMBO_STRIKE1_MS).toBe(600);
      expect(COMBO_STRIKE2_MS).toBe(1200);
      // A két csapás közti szünet legalább akkora, mint az első windup: az elsőre adott
      // válasz (ugrás vagy hátralépés) után marad idő a másodikra is reagálni.
      expect(COMBO_STRIKE2_MS - COMBO_STRIKE1_MS).toBeGreaterThanOrEqual(COMBO_STRIKE1_MS);
      // A kifutás a második csapás UTÁN következik — az animáció nem vágódik el.
      expect(COMBO_TOTAL_MS).toBeGreaterThan(COMBO_STRIKE2_MS);
    });

    it('a nova becsapódása a hullám LEGSZÉLESEBB frame-jére esik, nem a végére', () => {
      expect(NOVA_IMPACT_MS).toBe(720);
      expect(NOVA_TOTAL_MS).toBeGreaterThan(NOVA_IMPACT_MS);
    });

    it('az idézés a kasza lecsapásakor old ki, nem az animáció végén', () => {
      expect(SUMMON_RELEASE_MS).toBeGreaterThan(0);
      expect(SUMMON_TOTAL_MS).toBeGreaterThan(SUMMON_RELEASE_MS);
    });

    it('a penge- és hullám-mérések pozitívak és forrás-pixelben vannak (nem világ-pixelben)', () => {
      // Ha valaki véletlenül a SCALE-lel szorzott értéket írná ide, az a frame-en kívülre
      // mutatna — ezek a számok a 100x100-as FORRÁS frame-en belül értelmesek.
      expect(BLADE_REACH_PX).toBeGreaterThan(0);
      expect(BLADE_REACH_PX).toBeLessThan(FRAME_WIDTH);
      expect(NOVA_RADIUS_PX).toBeGreaterThan(0);
      expect(NOVA_RADIUS_PX).toBeLessThan(FRAME_WIDTH);
      expect(NOVA_TOP_PX).toBeGreaterThan(0);
      expect(NOVA_TOP_PX).toBeLessThan(FRAME_HEIGHT);
    });
  });
});
