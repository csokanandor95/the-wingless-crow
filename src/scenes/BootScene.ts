import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.createPlaceholderTextures();
  }

  create(): void {
    this.scene.start('Level1Scene');
  }

  private createPlaceholderTextures(): void {
    const playerGfx = this.make.graphics({ x: 0, y: 0 }, false);
    playerGfx.fillStyle(0xb33a3a, 1);
    playerGfx.fillRect(0, 0, 32, 48);
    playerGfx.generateTexture('player-placeholder', 32, 48);
    playerGfx.destroy();

    const groundGfx = this.make.graphics({ x: 0, y: 0 }, false);
    groundGfx.fillStyle(0x3a3a3a, 1);
    groundGfx.fillRect(0, 0, 64, 32);
    groundGfx.generateTexture('ground-placeholder', 64, 32);
    groundGfx.destroy();

    // Ideiglenes: training dummy teszt-célponthoz (Phase 3 combat teszteléséhez).
    const dummyGfx = this.make.graphics({ x: 0, y: 0 }, false);
    dummyGfx.fillStyle(0x6a4a8a, 1);
    dummyGfx.fillRect(0, 0, 32, 48);
    dummyGfx.generateTexture('dummy-placeholder', 32, 48);
    dummyGfx.destroy();
  }
}