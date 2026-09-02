// A LÁNGŐRZŐ (PreScene NPC) sprite-geometriája és animációja.
//
// A `*Animations.test.ts` konvenció szerint: a modul a MÉRT geometria egyetlen forrása, tehát
// itt az a kérdés, hogy a levezetések konzisztensek maradnak-e — nem az, hogy a Phaser
// lejátssza-e az animációt.
//
// Miért kell rá teszt egy ilyen egyszerű, egy-animációs NPC-nél: a `FEET_OFFSET_Y`-ból jön a
// `PreScene` NPC-magassága (`GROUND_TOP - FEET_OFFSET_Y`), tehát egy elrontott origin/talp
// pár némán a padló ALÁ vagy FÖLÉ ültetné — pont az a hibaosztály, amit a 11./16. technikai
// tanulság megszüntetett a harcoló lényeknél.
import { describe, it, expect, vi } from 'vitest';
import {
  createGoddessAnimations,
  FEET_OFFSET_Y,
  FRAME_COUNT,
  FRAME_SIZE,
  GODDESS_ANIMS,
  HALF_WIDTH,
  IDLE_ANIM_MS,
  IDLE_FRAMES,
  IDLE_SLOT_MS,
  ORIGIN_Y,
  TEXTURE_KEY,
  WALK_FRAMES,
} from '../../src/npc/GoddessAnimations';
import { PLAYER_ANIMS } from '../../src/player/PlayerAnimations';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

// --- MÉRT értékek a forrás lapról -------------------------------------------
// `assets/sprites/goddess/GandalfHardcore-Goddess-NPC.png`, alpha bounding boxokkal mérve.
const SHEET_WIDTH = 832;
/** Az alak alsó rajzolt sora a frame-en belül (minden frame-en azonos). */
const DRAWN_BOTTOM_ROW = 63;
/** Az alak vízszintes kiterjedése a frame-en belül. */
const DRAWN_LEFT = 16;
const DRAWN_RIGHT = 45;

interface MockAnimConfig {
  key: string;
  frames: unknown;
  frameRate: number;
  repeat: number;
}

function createAnimScene() {
  const created: MockAnimConfig[] = [];
  const scene = {
    anims: {
      exists: (key: string) => created.some((def) => def.key === key),
      create: (config: MockAnimConfig) => created.push(config),
      generateFrameNumbers: (texture: string, range: { start: number; end: number }) => ({
        texture,
        range,
      }),
    },
  };
  return { scene, created };
}

describe('GoddessAnimations', () => {
  describe('sheet-geometria', () => {
    it('a FRAME_COUNT a lap SZÉLESSÉGÉBŐL jön, nem választott szám', () => {
      expect(FRAME_COUNT).toBe(SHEET_WIDTH / FRAME_SIZE);
    });

    it('az idle és a járás szakasz LEFEDI a lapot, átfedés nélkül', () => {
      // A csík KÉT animációt tartalmaz (mérés: a láb-sáv eltérése f5-től ugrik meg).
      // Ha egy jövőbeli újravágás elcsúsztatja a határt, itt derül ki.
      expect(IDLE_FRAMES.start).toBe(0);
      expect(WALK_FRAMES.start).toBe(IDLE_FRAMES.end + 1);
      expect(WALK_FRAMES.end).toBe(FRAME_COUNT - 1);
    });

    it('a FEET_OFFSET_Y konzisztens az ORIGIN_Y-nal és a MÉRT talp-sorral', () => {
      // sprite.y = frame teteje + FRAME_SIZE * ORIGIN_Y, a talp pedig a DRAWN_BOTTOM_ROW-n.
      expect(FEET_OFFSET_Y).toBe(DRAWN_BOTTOM_ROW - FRAME_SIZE * ORIGIN_Y);
    });

    it('a HALF_WIDTH a MÉRT alak félszélessége', () => {
      const drawnWidth = DRAWN_RIGHT - DRAWN_LEFT + 1;
      expect(HALF_WIDTH).toBe(Math.ceil(drawnWidth / 2));
    });

    it('az alak gyakorlatilag központozott — ezért nincs FacingGeometry', () => {
      // MÉRT eltérés: a testközép 30,5..31, a frame közepe 32 -> 1..1,5 px. Ez nagyságrenddel
      // kisebb, mint amiért a 16. technikai tanulság (a megosztott SpriteFacing) született:
      // a CrowHarvester teste 18 px-szel, a démoné 7 forrás-px-szel van eltolva. Egy 1,5 px-es
      // kompenzáció itt gyakorlatilag no-op — és az NPC amúgy sem fordul meg soha.
      const bodyCenterX = (DRAWN_LEFT + DRAWN_RIGHT) / 2;
      expect(Math.abs(bodyCenterX - FRAME_SIZE / 2)).toBeLessThanOrEqual(2);
    });
  });

  describe('createGoddessAnimations', () => {
    it('egyetlen, loopoló idle animációt hoz létre — CSAK az idle frame-ekből', () => {
      const { scene, created } = createAnimScene();
      createGoddessAnimations(scene as never);

      expect(created).toHaveLength(1);
      expect(created[0].key).toBe(GODDESS_ANIMS.IDLE);
      expect(created[0].repeat).toBe(-1);
      expect(created[0].frames).toEqual({ texture: TEXTURE_KEY, range: IDLE_FRAMES });
    });

    it('a járás-frame-ek NEM kerülnek az idle loopba', () => {
      // REGRESSZIÓ: az első verzió a teljes 13 frame-es csíkot loopolta, amitől az álló NPC
      // láthatóan "helyben járt" (kézi teszten jött elő).
      const { scene, created } = createAnimScene();
      createGoddessAnimations(scene as never);

      const range = (created[0].frames as { range: { start: number; end: number } }).range;
      expect(range.end).toBeLessThan(WALK_FRAMES.start);
    });

    it('a frameRate SZÁMÍTOTT, nem beégetett', () => {
      const { scene, created } = createAnimScene();
      createGoddessAnimations(scene as never);

      const idleFrames = IDLE_FRAMES.end - IDLE_FRAMES.start + 1;
      expect(created[0].frameRate).toBeCloseTo((idleFrames * 1000) / IDLE_ANIM_MS, 6);
      // A slot-idő az EGYETLEN hangolópont: a loop hossza belőle származik.
      expect(IDLE_ANIM_MS).toBe(idleFrames * IDLE_SLOT_MS);
    });

    it('ismételt hívásra nem duplikál (az AnimationManager GAME-szintű)', () => {
      const { scene, created } = createAnimScene();
      createGoddessAnimations(scene as never);
      createGoddessAnimations(scene as never);

      expect(created).toHaveLength(1);
    });
  });

  describe('kulcs-ütközés', () => {
    it('az idle kulcs nem ütközik a player animációival', () => {
      expect(Object.values(PLAYER_ANIMS)).not.toContain(GODDESS_ANIMS.IDLE as string);
    });

    it('a textúra-kulcs nem ütközik az anim-kulccsal', () => {
      expect(TEXTURE_KEY).not.toBe(GODDESS_ANIMS.IDLE);
    });
  });
});
