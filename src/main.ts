import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import Level1Scene from './scenes/Level1Scene';
import BossScene from './scenes/BossScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: true,
    },
  },
  scene: [BootScene, Level1Scene, BossScene],
};

new Phaser.Game(config);