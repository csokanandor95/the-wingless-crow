import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import Level1Scene from './scenes/Level1Scene';
import BossScene from './scenes/BossScene';
import NarrationScene from './scenes/NarrationScene';
import Level2Scene from './scenes/Level2Scene';
import { GRAVITY_Y } from './config/physics';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  // Kötelező a pixel art sprite-okhoz: enélkül a Phaser bilineárisan szűri a textúrákat,
  // és a knight sheetek elmosódnak.
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      // Phaser 4-ben a gravity Vector2Like, tehát az x is kötelező (Phaser 3-ban nem volt az).
      // Az érték a config/physics.ts-ből jön: a Level1Layout ugyanebből vezeti le a maximális
      // ugrásmagasságot és -távolságot, amikhez a pálya szakadékai méretezve vannak.
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false,
    },
  },
  scene: [BootScene, Level1Scene, BossScene, NarrationScene, Level2Scene],
};

new Phaser.Game(config);