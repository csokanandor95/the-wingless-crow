import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a0f');

    this.add.text(400, 280, 'THE WINGLESS CROW', {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      color: '#c9a86a',
    }).setOrigin(0.5);

    this.add.text(400, 320, 'Phaser project initialized', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5);
  }
}