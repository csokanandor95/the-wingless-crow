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

    const fireballGfx = this.make.graphics({ x: 0, y: 0 }, false);
    fireballGfx.fillStyle(0xff7a1a, 1);
    fireballGfx.fillCircle(8, 8, 8);
    fireballGfx.generateTexture('fireball-placeholder', 16, 16);
    fireballGfx.destroy();

    // Hollow (Enemy 1) placeholder: 30x46 sötétzöld téglalap
    const hollowGfx = this.make.graphics({ x: 0, y: 0 }, false);
    hollowGfx.fillStyle(0x4a5a3a, 1);
    hollowGfx.fillRect(0, 0, 30, 46);
    hollowGfx.generateTexture('hollow-placeholder', 30, 46);
    hollowGfx.destroy();
  }
}