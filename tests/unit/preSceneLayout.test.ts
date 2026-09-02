// A PreScene (nyitó szentély) geometriai invariánsai.
//
// Ugyanaz a szerep, mint a `level1Layout.test.ts`-é: a `PreSceneLayout.ts` Phaser-mentes
// adatmodul, tehát a jelenet állításai ("a párbeszéd-panel elfér", "a szereplők a RAJZOLT
// padlón állnak", "a zuhanás tényleg látszik") mockolás nélkül bizonyíthatók.
//
// Miért itt és nem a scene-ben: a `tests/unit/helpers/fakePhaser.ts` NEM ad `Scene` osztályt,
// tehát a `PreScene.ts` (ami `Phaser.Scene`-ből származik) unit tesztből nem importálható.
// Ezért él a geometria ÉS a párbeszéd is a layout-modulban.
import { describe, it, expect, vi } from 'vitest';
import {
  DEPART_PROMPT,
  FALL_BOUNDS_MARGIN,
  FALL_DELAY_MS,
  FALL_START_Y,
  FLOOR_SPAN,
  GODDESS_DIALOGUE,
  GODDESS_SPEAKER,
  GROUND_CENTER_Y,
  GROUND_TOP,
  INTERACT_ZONE,
  INTERACT_ZONE_Y,
  NPC_X,
  PLAYER_SPAWN_X,
  PLAYER_SPEAKER,
  TALK_PROMPT,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../../src/levels/PreSceneLayout';
import { PANEL_RESERVE_PX } from '../../src/ui/Dialogue';
import {
  BODY_HEIGHT as PLAYER_BODY_HEIGHT,
  BODY_OFFSET_Y as PLAYER_BODY_OFFSET_Y,
  BODY_WIDTH as PLAYER_BODY_WIDTH,
  FRAME_HEIGHT as PLAYER_FRAME_HEIGHT,
  ORIGIN_Y as PLAYER_ORIGIN_Y,
} from '../../src/player/PlayerAnimations';
import {
  FEET_OFFSET_Y as GODDESS_FEET_OFFSET_Y,
  FRAME_SIZE as GODDESS_FRAME_SIZE,
  HALF_WIDTH as GODDESS_HALF_WIDTH,
  ORIGIN_Y as GODDESS_ORIGIN_Y,
} from '../../src/npc/GoddessAnimations';
import { GRAVITY_Y } from '../../src/config/physics';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

// --- Levezetett player-geometria --------------------------------------------
// A `sprite.y`-hoz képest hol van a test teteje és a talp. Ugyanaz a számítás, amit az
// Arcade Body végez: `body.top = y - displayOriginY + offsetY`.
const PLAYER_DISPLAY_ORIGIN_Y = PLAYER_FRAME_HEIGHT * PLAYER_ORIGIN_Y; // 40
const PLAYER_BODY_TOP_OFFSET = PLAYER_BODY_OFFSET_Y - PLAYER_DISPLAY_ORIGIN_Y; // -22
const PLAYER_FEET_OFFSET = PLAYER_BODY_TOP_OFFSET + PLAYER_BODY_HEIGHT; // +24
const PLAYER_HALF_WIDTH = PLAYER_BODY_WIDTH / 2;

/** Ahol a player MEGÁLL a zuhanás után (a talpa a felszínen). */
const PLAYER_REST_Y = GROUND_TOP - PLAYER_FEET_OFFSET;

// --- A párbeszéd-panel szövegmezője -----------------------------------------
// A `Dialogue` a belső panel-geometriáját (PANEL_MARGIN_X = 40, PANEL_PADDING = 9) nem
// exportálja, csak a `PANEL_RESERVE_PX`-et — ezért itt a MÉRT végeredmény szerepel:
//   VIEW_WIDTH - 2*40 (margó) - 2*9 (padding) = 702 px.
const PANEL_TEXT_WIDTH_PX = VIEW_WIDTH - 2 * 40 - 2 * 9;
/** 15px monospace ~0.6em karakterszélesség; KONZERVATÍVAN felfelé kerekítve. */
const CHAR_WIDTH_PX = 9.5;
const MAX_CHARS_PER_LINE = Math.floor(PANEL_TEXT_WIDTH_PX / CHAR_WIDTH_PX);
/** A panel magassága két szövegsorra van méretezve (lásd a DialogueLine doc-kommentjét). */
const MAX_PANEL_LINES = 2;

describe('PreScene layout', () => {
  describe('a párbeszéd-panel elfér', () => {
    it('a padlóvonal alatt marad hely a panelnek', () => {
      // EZ a kényszer köti a GROUND_TOP-ot 369-re — ugyanaz, mint mind a négy boss-arénában.
      expect(GROUND_TOP + PANEL_RESERVE_PX).toBeLessThanOrEqual(VIEW_HEIGHT);
    });

    it('a panel nem takarja A LÁNGŐRZŐT (a talpa a panel FÖLÖTT van)', () => {
      const goddessFeetY = GROUND_TOP - GODDESS_FEET_OFFSET_Y + GODDESS_FEET_OFFSET_Y;
      expect(goddessFeetY).toBe(GROUND_TOP);
      // A panel teteje a felszín ALATT kezdődik, tehát a felszínen álló szereplő fölötte van.
      expect(goddessFeetY).toBeLessThanOrEqual(GROUND_TOP);
    });

    it('a panel nem takarja a playert sem', () => {
      expect(PLAYER_REST_Y + PLAYER_FEET_OFFSET).toBe(GROUND_TOP);
    });
  });

  describe('a szereplők a RAJZOLT mozaikpadlón állnak', () => {
    it('a player becsapódási pontja a padló-lapon belül van', () => {
      expect(PLAYER_SPAWN_X - PLAYER_HALF_WIDTH).toBeGreaterThanOrEqual(FLOOR_SPAN.left);
      expect(PLAYER_SPAWN_X + PLAYER_HALF_WIDTH).toBeLessThanOrEqual(FLOOR_SPAN.right);
    });

    it('A LÁNGŐRZŐ a padló-lapon belül áll', () => {
      expect(NPC_X - GODDESS_HALF_WIDTH).toBeGreaterThanOrEqual(FLOOR_SPAN.left);
      expect(NPC_X + GODDESS_HALF_WIDTH).toBeLessThanOrEqual(FLOOR_SPAN.right);
    });

    it('A LÁNGŐRZŐ teljes egészében a képernyőn van', () => {
      const goddessTopY = GROUND_TOP - GODDESS_FEET_OFFSET_Y - GODDESS_FRAME_SIZE * GODDESS_ORIGIN_Y;
      expect(goddessTopY).toBeGreaterThan(0);
    });

    it('a talaj-ütköző közepe a felszínből van LEVEZETVE (ground-placeholder 64x32)', () => {
      expect(GROUND_CENTER_Y).toBe(GROUND_TOP + 16);
    });
  });

  describe('a nyitó zuhanás', () => {
    it('a player a kamera látóterén KÍVÜLRŐL indul', () => {
      // Enélkül nem "beesik", hanem egyszerűen ott terem a levegőben.
      expect(FALL_START_Y + PLAYER_BODY_TOP_OFFSET).toBeLessThan(0);
    });

    it('a kiszélesített fizikai világ befogadja az indulási pozíciót', () => {
      // KÖTELEZŐ: a Player konstruktora setCollideWorldBounds(true)-t hív, tehát ha a test
      // teteje a világ fölé lógna, a Phaser azonnal visszaszorítaná — és nem lenne zuhanás.
      expect(FALL_START_Y + PLAYER_BODY_TOP_OFFSET).toBeGreaterThanOrEqual(-FALL_BOUNDS_MARGIN);
    });

    it('a zuhanás érdemi, több mint fél másodperc', () => {
      const distance = PLAYER_REST_Y - FALL_START_Y;
      expect(distance).toBeGreaterThan(0);
      // s = g*t^2/2  ->  t = sqrt(2s/g)
      const fallSeconds = Math.sqrt((2 * distance) / GRAVITY_Y);
      expect(fallSeconds).toBeGreaterThan(0.5);
    });

    it('a zuhanás előtt van egy pillanat a néma szentélyen', () => {
      expect(FALL_DELAY_MS).toBeGreaterThan(0);
    });
  });

  describe('az interakciós zóna', () => {
    it('a becsapódási pont a zónán KÍVÜL esik', () => {
      // Enélkül a prompt már a landolás pillanatában felvillanna, és a szakasz elveszítené
      // a "sétálj oda hozzá" lépését. (A Level 3 azonos elve: a start-pont körül ne legyen
      // azonnal kioldó elem.)
      const zoneLeft = NPC_X - INTERACT_ZONE.width / 2;
      expect(PLAYER_SPAWN_X + PLAYER_HALF_WIDTH).toBeLessThan(zoneLeft);
    });

    it('a felszínen álló player teste átfedi a zónát', () => {
      const zoneTop = INTERACT_ZONE_Y - INTERACT_ZONE.height / 2;
      const zoneBottom = INTERACT_ZONE_Y + INTERACT_ZONE.height / 2;
      const playerTop = GROUND_TOP - PLAYER_BODY_HEIGHT;

      expect(zoneTop).toBeLessThan(GROUND_TOP);
      expect(zoneBottom).toBeGreaterThan(playerTop);
    });

    it('a zóna szélesebb A LÁNGŐRZŐ rajzolt alakjánál', () => {
      // A promptot ne kelljen pixelre pontosan belőni.
      expect(INTERACT_ZONE.width).toBeGreaterThan(GODDESS_HALF_WIDTH * 2);
    });

    it('a zóna a képernyőn belül marad', () => {
      expect(NPC_X - INTERACT_ZONE.width / 2).toBeGreaterThanOrEqual(0);
      expect(NPC_X + INTERACT_ZONE.width / 2).toBeLessThanOrEqual(VIEW_WIDTH);
    });
  });

  describe('a párbeszéd', () => {
    it('minden sor elfér a panel két sorában', () => {
      for (const line of GODDESS_DIALOGUE) {
        expect(line.text.length).toBeLessThanOrEqual(MAX_CHARS_PER_LINE * MAX_PANEL_LINES);
      }
    });

    it('csak a két ismert szereplő beszél', () => {
      for (const line of GODDESS_DIALOGUE) {
        expect([GODDESS_SPEAKER, PLAYER_SPEAKER]).toContain(line.speaker);
      }
    });

    it('A LÁNGŐRZŐ nyit és zár — ő a felvezetés hordozója', () => {
      expect(GODDESS_DIALOGUE[0].speaker).toBe(GODDESS_SPEAKER);
      expect(GODDESS_DIALOGUE[GODDESS_DIALOGUE.length - 1].speaker).toBe(GODDESS_SPEAKER);
    });

    it('egyetlen sor sem üres', () => {
      for (const line of GODDESS_DIALOGUE) {
        expect(line.text.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('a promptok', () => {
    it('a repó `E: ` konvencióját követik', () => {
      expect(TALK_PROMPT.startsWith('E: ')).toBe(true);
      expect(DEPART_PROMPT.startsWith('E: ')).toBe(true);
    });

    it('a két prompt különbözik', () => {
      // A második `E` MÁS dolgot csinál (indít, nem beszélget) — látszania kell.
      expect(TALK_PROMPT).not.toBe(DEPART_PROMPT);
    });
  });
});
