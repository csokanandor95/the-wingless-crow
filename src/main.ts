import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import Level1Scene from './scenes/Level1Scene';
import BossScene from './scenes/BossScene';
import NarrationScene from './scenes/NarrationScene';
import Level2Scene from './scenes/Level2Scene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  physics: {
    default: 'arcade',
    arcade: {
      // Phaser 4-ben a gravity Vector2Like, tehát az x is kötelező (Phaser 3-ban nem volt az).
      gravity: { x: 0, y: 800 },
      debug: true,
    },
  },
  scene: [BootScene, Level1Scene, BossScene, NarrationScene, Level2Scene],
};

new Phaser.Game(config);