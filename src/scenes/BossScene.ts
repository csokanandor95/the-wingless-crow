import Phaser from 'phaser';

// Minimális stub — a valódi boss tartalom (Warden, Phase 7) még nem létezik.
// Ez a scene teszi végigjátszhatóvá/tesztelhetővé a Level1 checkpoint+transition láncát.
export default class BossScene extends Phaser.Scene {
  constructor() {
    super('BossScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a0505');
    this.cameras.main.fadeIn(500);

    this.add
      .text(400, 200, 'Boss Arena\n(Phase 7 – hamarosan)', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Ideiglenes debug-visszaút a checkpoint/respawn tesztelhetőségéhez — a valódi
    // boss ide nem fog visszaküldeni, ez csak addig kell, amíg a Phase 7 el nem készül.
    this.add
      .text(400, 280, '(R: vissza Level1Scene-re, teszteléshez)', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#888888',
        align: 'center',
      })
      .setOrigin(0.5);

    this.input.keyboard!.addKey('R').on('down', () => {
      this.scene.start('Level1Scene');
    });
  }
}
