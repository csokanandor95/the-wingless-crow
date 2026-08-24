// Környezeti hazard tesztek (Level 1 Redesign, 2. iteráció — spike-ok).
//
// Két külön dolgot fed le:
//
// 1. A `HazardDamageGate` i-frame ablakát. Ez a projekt EGYETLEN védelme az ellen, hogy a
//    folyamatos érintkezésű hazardok frame-enként (60x/s) sebezzenek — a Player.takeDamage()
//    ugyanis szándékosan nem néz HURT állapotot. Ha ez a kapu elromlik, a tüskén állva a
//    100 HP két másodperc alatt elfogy, és ez a hiba manuális teszten könnyen betudható
//    lenne "nehéz a pálya"-ként.
//
// 2. A `SpikeField` geometriáját: hogy a sebző zóna a talaj felszínén ül, és hogy a
//    behúzás a MEZŐ egészére vonatkozik — csempénkénti behúzás sebezhetetlen réseket
//    nyitna a tüskék között.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import HazardDamageGate, { HAZARD_INVULNERABILITY_MS } from '../../src/hazards/HazardDamage';
import SpikeField from '../../src/hazards/SpikeField';
import SwingingReaper, {
  bladePositionAt,
  REAPER_HIT_RADIUS,
  swingAngleAt,
} from '../../src/hazards/SwingingReaper';
import {
  GROUND_TOP,
  REAPERS,
  SPIKE_HEIGHT,
  SPIKE_HITBOX_INSET_X,
  type SpikeFieldDef,
} from '../../src/levels/Level1Layout';
import { createMockScene, type MockScene } from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

describe('HazardDamageGate', () => {
  let gate: HazardDamageGate;

  beforeEach(() => {
    gate = new HazardDamageGate();
  });

  it('az első érintkezés mindig sebez', () => {
    expect(gate.canDamage(0)).toBe(true);
    // A 0-s időpont sem lehet kivétel: a scene órája 0-ról indul.
    expect(gate.canDamage(12_345)).toBe(true);
  });

  it('a regisztrált találat után az ablakon BELÜL nem sebez újra', () => {
    gate.register(1000);

    expect(gate.canDamage(1000)).toBe(false);
    expect(gate.canDamage(1000 + HAZARD_INVULNERABILITY_MS - 1)).toBe(false);
  });

  it('az ablak leteltével újra sebez', () => {
    gate.register(1000);

    expect(gate.canDamage(1000 + HAZARD_INVULNERABILITY_MS)).toBe(true);
    expect(gate.canDamage(1000 + HAZARD_INVULNERABILITY_MS + 500)).toBe(true);
  });

  it('minden találat ÚJRAINDÍTJA az ablakot', () => {
    gate.register(1000);
    gate.register(1500);

    // Az első találattól számítva már letelne, a másodiktól nem.
    expect(gate.canDamage(1000 + HAZARD_INVULNERABILITY_MS)).toBe(false);
    expect(gate.canDamage(1500 + HAZARD_INVULNERABILITY_MS)).toBe(true);
  });

  it('reset(): az új élet nem örökli az előző halál i-frame-jeit', () => {
    gate.register(1000);
    expect(gate.canDamage(1100)).toBe(false);

    gate.reset();
    expect(gate.canDamage(1100)).toBe(true);
  });

  it('az ablak elég hosszú, hogy a spike-mező átgyaloglása EGY találatot érjen', () => {
    // 128px mező / 200 px-es MOVE_SPEED = 640ms. Ha az ablak ez alá csúszna, a tutorial
    // szakasz csendben büntetővé válna.
    expect(HAZARD_INVULNERABILITY_MS).toBeGreaterThan(640);
  });
});

describe('SpikeField', () => {
  let scene: MockScene;

  const FIELD: SpikeFieldDef = {
    id: 'test-spikes',
    startX: 1000,
    endX: 1128, // 128 px = 4 csempe
    surfaceId: 'G1',
  };

  beforeEach(() => {
    scene = createMockScene();
  });

  it('mezőnként PONTOSAN egy sebző zónát hoz létre', () => {
    new SpikeField(scene as unknown as Phaser.Scene, [FIELD, { ...FIELD, id: 'second' }]);

    expect(scene.add.zone).toHaveBeenCalledTimes(2);
    expect(scene.physics.add.existing).toHaveBeenCalledTimes(2);
  });

  it('a zóna a mező közepén, a talaj FELSZÍNÉN ül', () => {
    new SpikeField(scene as unknown as Phaser.Scene, [FIELD]);

    const [x, y, , height] = scene.add.zone.mock.calls[0] as number[];
    expect(x).toBe(1064); // (1000 + 1128) / 2
    // A tüskék a talajon állnak: az aljuk pontosan a GROUND_TOP-on.
    expect(y + height / 2).toBe(GROUND_TOP);
    expect(height).toBe(SPIKE_HEIGHT);
  });

  it('a behúzás a MEZŐ egészére vonatkozik, nem csempénként', () => {
    new SpikeField(scene as unknown as Phaser.Scene, [FIELD]);

    const [, , width] = scene.add.zone.mock.calls[0] as number[];

    // 128 - 2*4 = 120: a mező két SZÉLÉN veszünk el 4-4 px-t, összesen 8-at.
    // Ha valaha csempénként húznánk be (4 csempe x 8px = 32), a hitbox 96 lenne — és a
    // tüskék KÖZÖTT sebezhetetlen rések nyílnának, ahol a player büntetlenül megállhat.
    expect(width).toBe(FIELD.endX - FIELD.startX - 2 * SPIKE_HITBOX_INSET_X);
    expect(width).toBe(120);
  });

  it('a látvány a mező TELJES hosszát lefedi — csak a hitbox van behúzva', () => {
    new SpikeField(scene as unknown as Phaser.Scene, [FIELD]);

    const [, , visualWidth] = scene.add.tileSprite.mock.calls[0] as number[];
    expect(visualWidth).toBe(FIELD.endX - FIELD.startX);
  });

  it('getZones(): a létrehozott zónákat adja vissza', () => {
    const spikes = new SpikeField(scene as unknown as Phaser.Scene, [FIELD]);
    expect(spikes.getZones()).toHaveLength(1);
  });
});

// --- Swinging Reaper --------------------------------------------------------

describe('swingAngleAt', () => {
  const PERIOD = 2400;
  const MAX = Math.PI / 4; // 45°

  it('t=0-nál a JOBB szélsőállásban indul', () => {
    // Koszinusz, nem szinusz: így a pálya betöltésekor a player egy teljes, tiszta
    // lengést lát végig, nem a középpontból induló félmozdulatot.
    expect(swingAngleAt(0, PERIOD, MAX)).toBeCloseTo(MAX, 10);
  });

  it('a periódus felénél a BAL szélsőállásban van', () => {
    expect(swingAngleAt(PERIOD / 2, PERIOD, MAX)).toBeCloseTo(-MAX, 10);
  });

  it('a periódus negyedénél és háromnegyedénél átmegy a függőlegesen', () => {
    expect(swingAngleAt(PERIOD / 4, PERIOD, MAX)).toBeCloseTo(0, 10);
    expect(swingAngleAt((3 * PERIOD) / 4, PERIOD, MAX)).toBeCloseTo(0, 10);
  });

  it('egy teljes periódus után visszatér a kiindulásba', () => {
    expect(swingAngleAt(PERIOD, PERIOD, MAX)).toBeCloseTo(MAX, 10);
  });

  it('SOSEM lépi túl az amplitúdót', () => {
    for (let t = 0; t <= 3 * PERIOD; t += 17) {
      expect(Math.abs(swingAngleAt(t, PERIOD, MAX))).toBeLessThanOrEqual(MAX + 1e-9);
    }
  });

  it('DETERMINISZTIKUS: azonos bemenetre azonos kimenet', () => {
    // A spec követelménye ("Movement is deterministic") — nincs Phaser.Math.Between,
    // tehát a minta minden végigjátszáskor ugyanaz és megtanulható.
    for (const t of [0, 137, 600, 1234, 2399]) {
      expect(swingAngleAt(t, PERIOD, MAX)).toBe(swingAngleAt(t, PERIOD, MAX));
    }
  });

  it('a fázis-eltolás időben tolja el a lengést', () => {
    expect(swingAngleAt(0, PERIOD, MAX, PERIOD / 2)).toBeCloseTo(-MAX, 10);
  });
});

describe('a Level 1 reaper geometriája', () => {
  const def = REAPERS[0];
  const maxAngleRad = (def.maxAngleDeg * Math.PI) / 180;

  it('a legalsó ponton végigsöpri az F1 platformot (a rajta álló playert eltalálja)', () => {
    const bottom = bladePositionAt(def, 0);
    // Az F1 teteje 332, a rajta álló player középpontja 332 - 24 = 308.
    const playerOnPlatformY = 308;

    expect(bottom.x).toBeCloseTo(4500, 6);
    expect(Math.abs(bottom.y - playerOnPlatformY)).toBeLessThan(REAPER_HIT_RADIUS);
  });

  it('a szélsőállásokban a parton álló player BIZTONSÁGBAN van', () => {
    // Ez adja a szakasz megoldását: a partról végig lehet nézni a lengést.
    const groundPlayerY = GROUND_TOP - 24; // 394

    for (const angle of [maxAngleRad, -maxAngleRad]) {
      const blade = bladePositionAt(def, angle);
      const bankX = angle > 0 ? 4700 : 4300; // a gap4 két partja
      const distance = Math.hypot(blade.x - bankX, blade.y - groundPlayerY);

      expect(distance).toBeGreaterThan(REAPER_HIT_RADIUS * 3);
    }
  });
});

describe('SwingingReaper', () => {
  let scene: MockScene;
  const def = REAPERS[0];

  beforeEach(() => {
    scene = createMockScene();
  });

  it('a pengét a kiinduló szögnek megfelelő helyre teszi', () => {
    const reaper = new SwingingReaper(scene as unknown as Phaser.Scene, def);
    const expected = bladePositionAt(def, (def.maxAngleDeg * Math.PI) / 180);

    // A player a jobb szélsőállás alatt, a talajon: nem éri el.
    expect(reaper.hitsPlayer(expected.x, expected.y)).toBe(true);
    expect(reaper.hitsPlayer(expected.x + REAPER_HIT_RADIUS + 1, expected.y)).toBe(false);
  });

  it('update(): a felhalmozott idő szerint mozgatja a pengét', () => {
    const reaper = new SwingingReaper(scene as unknown as Phaser.Scene, def);

    // Fél periódus -> a másik szélsőállás.
    reaper.update(def.periodMs / 2);
    const opposite = bladePositionAt(def, -(def.maxAngleDeg * Math.PI) / 180);

    expect(reaper.hitsPlayer(opposite.x, opposite.y)).toBe(true);
  });

  it('update(): a delta AKKUMULÁLÓDIK — több kis lépés = egy nagy lépés', () => {
    const stepped = new SwingingReaper(scene as unknown as Phaser.Scene, def);
    for (let i = 0; i < 60; i++) stepped.update(def.periodMs / 120); // 60 x fél periódus/60

    const single = new SwingingReaper(scene as unknown as Phaser.Scene, def);
    single.update(def.periodMs / 2);

    const opposite = bladePositionAt(def, -(def.maxAngleDeg * Math.PI) / 180);
    expect(stepped.hitsPlayer(opposite.x, opposite.y)).toBe(
      single.hitsPlayer(opposite.x, opposite.y)
    );
  });

  it('a láncot a horgonytól a penge AKTUÁLIS pozíciójáig rajzolja', () => {
    const reaper = new SwingingReaper(scene as unknown as Phaser.Scene, def);
    reaper.update(def.periodMs / 4); // függőleges állás

    const graphics = scene.add.graphics.mock.results[0].value as {
      lineBetween: { mock: { calls: number[][] } };
    };
    const calls = graphics.lineBetween.mock.calls;
    const [x1, y1, x2, y2] = calls[calls.length - 1];

    expect(x1).toBe(def.anchorX);
    expect(y1).toBe(def.anchorY);
    // Függőleges állásban a penge pontosan a horgony alatt, kötélhossznyira lóg.
    expect(x2).toBeCloseTo(def.anchorX, 6);
    expect(y2).toBeCloseTo(def.anchorY + def.ropeLength, 6);
  });

  it('a penge a player ELŐTT rajzolódik, hogy a fenyegetés olvasható legyen', () => {
    new SwingingReaper(scene as unknown as Phaser.Scene, def);

    // A player depth-je 0; a lánc és a penge is efölött van.
    const graphics = scene.add.graphics.mock.results[0].value as { depth: number };
    expect(graphics.depth).toBeGreaterThan(0);
  });
});
