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
import {
  GROUND_TOP,
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
