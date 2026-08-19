import Phaser from 'phaser';

// Placeholder — a Level 2 (The Crowless Forest, Project_plan.md 14. pont) tervezése a
// Phase 7 lezárása után következik. Egyelőre csak azt bizonyítja, hogy a
// Level1 -> Boss -> átvezető -> Level2 lánc végigfut.
export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super('Level2Scene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#08110c');
    this.cameras.main.fadeIn(600);

    const centerX = this.scale.width / 2;

    this.add
      .text(centerX, 190, 'Level 2 — The Crowless Forest', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#cfe0cf',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, 230, '(tervezés alatt)', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6a7a6a',
      })
      .setOrigin(0.5);

    // Ideiglenes debug-visszaút, hogy a teljes lánc manuálisan körbejárható legyen.
    // A valódi Level 2 elkészültekor törlendő.
    this.add
      .text(centerX, 300, '(R: vissza Level1Scene-re, teszteléshez)', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#4a554a',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-R', () => {
      this.scene.start('Level1Scene');
    });
  }
}
