// CrowHarvester animáció-tesztek (Phase 8 – Atmosphere, Enemy 1 sprite iteráció).
//
// A legfontosabb blokk itt a FACING-KOMPENZÁCIÓ. A sprite lapján a lény teste a 64px-es
// frame BAL oldalán ül (közepe x=14), ezért egy sima setFlipX() 36px-t ugrasztaná oldalra,
// hiszen a flipX a FRAME közepére tükröz, nem az originre. A CrowHarvester ezt úgy oldja
// meg, hogy forduláskor az origint ÉS a body offsetjét együtt tükrözi — ez a teszt pont
// azt őrzi, hogy a kettő ne csússzon szét egy jövőbeli módosításnál.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import CrowHarvester, {
  CrowHarvesterState,
  MAX_HP,
  PATROL_RANGE,
} from '../../src/enemies/CrowHarvester';
import {
  animKeyForState,
  BODY_WIDTH,
  CROW_HARVESTER_ANIMS,
  FRAME_SIZE,
} from '../../src/enemies/CrowHarvesterAnimations';
import Player from '../../src/player/Player';
import {
  createMockScene,
  getBody,
  flushAllDelayedCalls,
  type MockScene,
  type MockTweenConfig,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

const HARVESTER_X = 500;
const HARVESTER_Y = 400;

interface MockAnims {
  currentKey: string | null;
  playedKeys: string[];
}

function anims(sprite: CrowHarvester): MockAnims {
  return sprite.anims as unknown as MockAnims;
}

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

/**
 * A physics body VILÁGKOORDINÁTÁS közepe. A Phaser a body-t a game object bal felső
 * sarkától (`x - originX * frameWidth`) méri, ehhez adódik a body offsetje. Ez a képlet
 * teszi mérhetővé, hogy a fordulás tényleg nem mozdítja el a testet.
 */
function bodyCenterX(sprite: CrowHarvester): number {
  const setOffset = getBody(sprite).setOffset as unknown as {
    mock: { calls: Array<[number, number]> };
  };
  const calls = setOffset.mock.calls;
  const offsetX = calls[calls.length - 1][0];
  const spriteWithOrigin = sprite as unknown as { originX: number };
  return sprite.x - spriteWithOrigin.originX * FRAME_SIZE + offsetX + BODY_WIDTH / 2;
}

describe('animKeyForState', () => {
  it('PATROL és CHASE a mozgás szerint vált walk és idle között', () => {
    expect(animKeyForState(CrowHarvesterState.PATROL, true)).toBe(CROW_HARVESTER_ANIMS.WALK);
    expect(animKeyForState(CrowHarvesterState.PATROL, false)).toBe(CROW_HARVESTER_ANIMS.IDLE);
    expect(animKeyForState(CrowHarvesterState.CHASE, true)).toBe(CROW_HARVESTER_ANIMS.WALK);
    expect(animKeyForState(CrowHarvesterState.CHASE, false)).toBe(CROW_HARVESTER_ANIMS.IDLE);
  });

  it('ATTACK és COOLDOWN UGYANARRA a kulcsra képződik le', () => {
    // Ez teszi lehetővé, hogy a playAnim() guardja mellett a 900ms-os támadás-animáció
    // egyben fusson végig a 300ms ATTACK + 900ms COOLDOWN állapotpáron.
    expect(animKeyForState(CrowHarvesterState.ATTACK, false)).toBe(CROW_HARVESTER_ANIMS.ATTACK);
    expect(animKeyForState(CrowHarvesterState.COOLDOWN, false)).toBe(CROW_HARVESTER_ANIMS.ATTACK);
  });

  it('DEAD a hit animációt adja (a fade-et a die() tweenje intézi)', () => {
    expect(animKeyForState(CrowHarvesterState.DEAD, false)).toBe(CROW_HARVESTER_ANIMS.HIT);
  });
});

describe('CrowHarvester animáció-vezérlés', () => {
  let scene: MockScene;
  let harvester: CrowHarvester;
  let farPlayer: Player;

  beforeEach(() => {
    scene = createMockScene();
    harvester = new CrowHarvester(scene as unknown as Phaser.Scene, HARVESTER_X, HARVESTER_Y);
    // Elég messze ahhoz, hogy soha ne váltson ki detektálást — így tiszta PATROL marad.
    farPlayer = createPlayerAt(scene, HARVESTER_X + 5000, HARVESTER_Y);
  });

  describe('facing-kompenzáció', () => {
    it('a test világkoordinátás közepe forduláskor NEM mozdul', () => {
      harvester.update(farPlayer); // patrol jobbra
      expect(harvester.flipX).toBe(false);
      const facingRight = bodyCenterX(harvester);

      // Elérte a jobb oldali patrol-határt -> megfordul balra.
      harvester.x = HARVESTER_X + PATROL_RANGE;
      harvester.update(farPlayer);
      expect(harvester.flipX).toBe(true);
      const facingLeft = bodyCenterX(harvester);

      // A sprite közben PATROL_RANGE-nyit lépett, ezért a saját x-éhez viszonyítunk:
      // mindkét irányban a sprite.x-en kell lennie a test közepének.
      expect(facingRight).toBeCloseTo(HARVESTER_X, 5);
      expect(facingLeft).toBeCloseTo(HARVESTER_X + PATROL_RANGE, 5);
    });

    it('az origin és a body offset EGYÜTT tükröződik', () => {
      const spriteWithOrigin = harvester as unknown as { originX: number };
      const originRight = spriteWithOrigin.originX;

      harvester.x = HARVESTER_X + PATROL_RANGE;
      harvester.update(farPlayer);
      const originLeft = spriteWithOrigin.originX;

      // A két origin egymás tükörképe a frame közepére.
      expect(originRight + originLeft).toBeCloseTo(1, 5);
    });
  });

  it('patrol közben walk, megállva idle', () => {
    harvester.update(farPlayer);
    expect(anims(harvester).currentKey).toBe(CROW_HARVESTER_ANIMS.WALK);

    // Peremre szorított példány üldözés közben megáll -> idle.
    getBody(harvester).velocity.x = 0;
    harvester.crowHarvesterState = CrowHarvesterState.CHASE;
    const unreachable = createPlayerAt(scene, HARVESTER_X + 1, HARVESTER_Y - 300);
    harvester.update(unreachable);
    expect(anims(harvester).currentKey).toBe(CROW_HARVESTER_ANIMS.IDLE);
  });

  it('a támadás a saját animációját indítja, és COOLDOWN-ban NEM indul újra', () => {
    const near = createPlayerAt(scene, HARVESTER_X + 20, HARVESTER_Y);
    harvester.crowHarvesterState = CrowHarvesterState.CHASE;
    harvester.update(near);

    expect(harvester.crowHarvesterState).toBe(CrowHarvesterState.ATTACK);
    expect(anims(harvester).currentKey).toBe(CROW_HARVESTER_ANIMS.ATTACK);

    const playsAfterAttackStart = anims(harvester).playedKeys.length;
    harvester.update(near); // még ATTACK
    expect(anims(harvester).playedKeys.length).toBe(playsAfterAttackStart);
  });

  it('két egymást követő támadás MINDKÉTSZER újraindítja az animációt', () => {
    // Regresszió: a COOLDOWN ugyanarra az anim kulcsra képződik le, mint az ATTACK, és a
    // cooldown lejárta után a lény már a következő update()-ben újra csaphat, ha a player
    // végig hatótávon belül maradt — közben egyetlen frame sem jut a walk/idle-re. A
    // playAnim() guardja emiatt kihagyná a második lejátszást, és a csapás a befagyott
    // utolsó frame-en állna.
    const near = createPlayerAt(scene, HARVESTER_X + 20, HARVESTER_Y);
    harvester.crowHarvesterState = CrowHarvesterState.CHASE;

    harvester.update(near);
    const playsAfterFirst = anims(harvester).playedKeys.length;

    flushAllDelayedCalls(scene); // startup -> találat -> cooldown -> CHASE
    expect(harvester.crowHarvesterState).toBe(CrowHarvesterState.CHASE);

    harvester.update(near); // azonnal új támadás, walk/idle frame nélkül

    expect(harvester.crowHarvesterState).toBe(CrowHarvesterState.ATTACK);
    expect(anims(harvester).playedKeys.length).toBe(playsAfterFirst + 1);
  });

  it('sebzésre lejátszik egy hit animációt, ami a következő frame-eken sem íródik felül', () => {
    harvester.takeDamage(5);
    expect(anims(harvester).currentKey).toBe(CROW_HARVESTER_ANIMS.HIT);

    // Amíg a reakció tart, a patrol walk animációja nem veheti át.
    harvester.update(farPlayer);
    expect(anims(harvester).currentKey).toBe(CROW_HARVESTER_ANIMS.HIT);

    // A HIT_ANIM_MS delayedCall lejárta után viszont igen.
    flushAllDelayedCalls(scene);
    harvester.update(farPlayer);
    expect(anims(harvester).currentKey).toBe(CROW_HARVESTER_ANIMS.WALK);
  });

  it('két gyors találat között újraindul a hit animáció', () => {
    harvester.takeDamage(5);
    const playsAfterFirst = anims(harvester).playedKeys.length;

    harvester.takeDamage(5);
    expect(anims(harvester).playedKeys.length).toBe(playsAfterFirst + 1);
  });

  it('halálkor hit animáció + elhalványuló tween indul', () => {
    harvester.takeDamage(MAX_HP);

    expect(harvester.isDead()).toBe(true);
    expect(anims(harvester).currentKey).toBe(CROW_HARVESTER_ANIMS.HIT);

    const tweenCalls = scene.tweens.add.mock.calls;
    const tweenConfig = tweenCalls[tweenCalls.length - 1][0] as MockTweenConfig;
    expect(tweenConfig.targets).toBe(harvester);
    expect(tweenConfig.alpha).toBe(0);
  });

  it('halál után az update() no-op, tehát az animáció sem íródik felül', () => {
    harvester.takeDamage(MAX_HP);
    const playsAfterDeath = anims(harvester).playedKeys.length;

    harvester.update(farPlayer);
    harvester.update(farPlayer);

    expect(anims(harvester).playedKeys.length).toBe(playsAfterDeath);
  });
});
