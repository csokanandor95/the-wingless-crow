import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import Level1Scene from './scenes/Level1Scene';
import BossScene from './scenes/BossScene';
import NarrationScene from './scenes/NarrationScene';
import Level2Scene from './scenes/Level2Scene';
import Boss2Scene from './scenes/Boss2Scene';
import Level3Scene from './scenes/Level3Scene';
import Boss3Scene from './scenes/Boss3Scene';
import FinalBossScene from './scenes/FinalBossScene';
import CreditsScene from './scenes/CreditsScene';
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
  // A lánc sorrendben: Level 1 -> Boss 1 -> Level 2 -> Boss 2 -> Level 3 -> Boss 3 ->
  // Final -> ending -> credits. A regisztráció ÉLESÍTI a korábbi scene-ek feltételes
  // ágait: a Boss2Scene győzelme a Level3Scene-t keresi, a Level3Scene ajtaja a
  // Boss3Scene-t, a Boss3Scene győzelme pedig a FinalBossScene-t.
  scene: [
    BootScene,
    Level1Scene,
    BossScene,
    NarrationScene,
    Level2Scene,
    Boss2Scene,
    Level3Scene,
    Boss3Scene,
    FinalBossScene,
    CreditsScene,
  ],
};

new Phaser.Game(config);