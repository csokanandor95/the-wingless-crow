/**
 * INTEGRATION — `Project_plan.md` 24. pont: *Checkpoint → Respawn*.
 *
 * ```
 * Player reaches checkpoint → Checkpoint saved → Player dies → Player respawns
 *                                                            → Player appears at checkpoint
 * ```
 *
 * **Miért érdemel saját réteget?** A halál-lánc HÁROM, egymást nem ismerő modulból áll össze:
 * a `CheckpointSystem` tárolja a pontot, a `Player` visszaáll rá, a `LevelEnemies` pedig
 * újraéleszti a lényeket. Unit szinten mindhárom külön-külön triviális; a hibák a
 * találkozásukban laknak — a projekt egyik dokumentált crash-osztálya (`CLAUDE.md` 2.
 * tanulság) pontosan az, hogy a `reset()` ÚJ tömböt adna a colliderekhez kötött régi helyett.
 *
 * A pálya ADATA valódi (`Level1Layout`), tehát a teszt a tényleges 9 ellenfelet spawnolja.
 *
 * **VÁLLALT KORLÁT:** a halál kiváltását (zuhanás-küszöb, hazard-overlap) és a respawn
 * ÜTEMEZÉSÉT a scene végzi — azt E2E fedi. Itt a lánc állapotátmenetei a tárgy.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('../unit/helpers/fakePhaser');
  return createFakePhaserModule();
});

import {
  createMockScene,
  flushAllDelayedCalls,
  type MockScene,
} from '../unit/helpers/phaserTestUtils';

import Player, { MAX_HP as PLAYER_MAX_HP } from '../../src/player/Player';
import CheckpointSystem from '../../src/systems/CheckpointSystem';
import LevelEnemies from '../../src/levels/LevelEnemies';
import AudioManager from '../../src/systems/AudioManager';
import { AttackType, ATTACK_CONFIGS, HEAVY_CHARGE_HITS } from '../../src/combat/Attack';
import {
  ENEMY_SPAWNS,
  LEVEL1_GEOMETRY,
  MID_CHECKPOINT,
  START_X,
  START_Y,
} from '../../src/levels/Level1Layout';

/**
 * A `Level1Scene.update()` halál-ága, sűrítve (`Level1Scene.ts:536` és a respawn-blokk):
 * a lényeket és a lövedékeket ELŐBB állítja vissza, a playert utána.
 */
function respawnAtCheckpoint(
  player: Player,
  checkpoint: CheckpointSystem,
  enemies: LevelEnemies
): void {
  enemies.reset();
  enemies.clearProjectiles();

  const point = checkpoint.getRespawnPoint();
  player.respawn(point.x, point.y);
}

/** A player halálra sebzése + a HURT→DEAD lánc lefuttatása. */
function killPlayer(scene: MockScene, player: Player): void {
  player.takeDamage(player.getHP());
  flushAllDelayedCalls(scene);
}

describe('Checkpoint → Respawn (Project_plan 24. pont)', () => {
  let scene: MockScene;
  let player: Player;
  let checkpoint: CheckpointSystem;
  let enemies: LevelEnemies;

  beforeEach(() => {
    scene = createMockScene();
    player = new Player(scene as unknown as Phaser.Scene, START_X, START_Y);
    checkpoint = new CheckpointSystem(START_X, START_Y);
    enemies = new LevelEnemies(
      scene as unknown as Phaser.Scene,
      ENEMY_SPAWNS,
      LEVEL1_GEOMETRY,
      new AudioManager(scene as unknown as Phaser.Scene)
    );
    enemies.spawn();
  });

  it('friss játékban a respawn-pont a pálya eleje', () => {
    killPlayer(scene, player);
    respawnAtCheckpoint(player, checkpoint, enemies);

    expect(player.x).toBe(START_X);
    expect(player.y).toBe(START_Y);
  });

  it('a köztes checkpoint aktiválása után ODA éled újra a player', () => {
    checkpoint.activate(MID_CHECKPOINT.x, MID_CHECKPOINT.y);

    killPlayer(scene, player);
    expect(player.isDead()).toBe(true);

    respawnAtCheckpoint(player, checkpoint, enemies);

    expect(player.isDead()).toBe(false);
    expect(player.x).toBe(MID_CHECKPOINT.x);
    expect(player.y).toBe(MID_CHECKPOINT.y);
  });

  it('a respawn TELI HP-t és teli tűzgolyó-tárat ad', () => {
    player.castFireball();
    expect(player.getFireballCharges()).toBeLessThan(player.getFireballMaxCharges());

    killPlayer(scene, player);
    expect(player.getHP()).toBe(0);

    respawnAtCheckpoint(player, checkpoint, enemies);

    expect(player.getHP()).toBe(PLAYER_MAX_HP);
    expect(player.getFireballCharges()).toBe(player.getFireballMaxCharges());
  });

  it('a felgyűjtött heavy-töltés ELVÉSZ — a halál visszaállít, nem továbbvisz', () => {
    const target = enemies.harvesters[0];
    for (let i = 0; i < HEAVY_CHARGE_HITS; i++) {
      player.attack();
      // A scene találat-szabályának a lényege: a töltés BEÉRKEZETT csapáshoz kötött.
      target.takeDamage(ATTACK_CONFIGS[AttackType.SWORD].damage);
      player.registerHit(target);
      flushAllDelayedCalls(scene);
    }
    expect(player.isHeavyReady()).toBe(true);

    killPlayer(scene, player);
    respawnAtCheckpoint(player, checkpoint, enemies);

    expect(player.getHeavyCharge()).toBe(0);
    expect(player.isHeavyReady()).toBe(false);
  });

  it('a player halálakor MINDEN ellenfél újraéled, teljes HP-val', () => {
    const before = enemies.harvesters.length + enemies.gravecallers.length;
    expect(before).toBeGreaterThan(0);

    for (const enemy of enemies.harvesters) enemy.takeDamage(enemy.getMaxHP());
    flushAllDelayedCalls(scene);
    expect(enemies.harvesters.every((e) => e.isDead())).toBe(true);

    killPlayer(scene, player);
    respawnAtCheckpoint(player, checkpoint, enemies);

    expect(enemies.harvesters.length + enemies.gravecallers.length).toBe(before);
    expect(enemies.harvesters.every((e) => !e.isDead())).toBe(true);
    expect(enemies.harvesters.every((e) => e.getHP() === e.getMaxHP())).toBe(true);
  });

  /**
   * REGRESSZIÓS TESZT a `CLAUDE.md` 2. tanulságára. A scene a `create()`-ben regisztrálja a
   * collidereket/overlapeket a `groups()` TÖMBJEIRE; ha a `reset()` új tömböt rendelne
   * hozzájuk (pl. `filter()` eredményét), a fizika némán a régi, megsemmisített lényekre
   * maradna kötve — a friss ellenfelek pedig sebezhetetlenek lennének.
   */
  it('a reset MEGŐRZI a tömbök identitását (a colliderek erre a referenciára kötnek)', () => {
    const harvesterArray = enemies.harvesters;
    const gravecallerArray = enemies.gravecallers;
    const beastArray = enemies.beasts;
    const projectileArray = enemies.projectiles;

    enemies.reset();
    enemies.clearProjectiles();

    expect(enemies.harvesters).toBe(harvesterArray);
    expect(enemies.gravecallers).toBe(gravecallerArray);
    expect(enemies.beasts).toBe(beastArray);
    expect(enemies.projectiles).toBe(projectileArray);
  });

  it('a reset a RÉGI példányokat megsemmisíti, nem hagyja őket a tömbben', () => {
    const stale = enemies.harvesters[0];

    enemies.reset();

    expect(enemies.harvesters).not.toContain(stale);
    // A `destroy()` override a `super.destroy()` ELŐTT DEAD-re állít, hogy a lény függő
    // `delayedCall`-jai inertté váljanak (`CLAUDE.md` 18. tanulság).
    expect(stale.isDead()).toBe(true);
  });

  it('a respawn után a player újra tud támadni és castolni', () => {
    killPlayer(scene, player);
    respawnAtCheckpoint(player, checkpoint, enemies);

    const target = enemies.harvesters[0];
    const hpBefore = target.getHP();

    const scheduledBefore = scene.time.delayedCall.mock.calls.length;
    player.attack();
    expect(scene.time.delayedCall.mock.calls.length).toBeGreaterThan(scheduledBefore);

    target.takeDamage(ATTACK_CONFIGS[AttackType.SWORD].damage);
    expect(target.getHP()).toBeLessThan(hpBefore);
    expect(player.getFireballCharges()).toBe(player.getFireballMaxCharges());
  });
});
