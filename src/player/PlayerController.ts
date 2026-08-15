import Phaser from 'phaser';
import Player from './Player';

export default class PlayerController {
  private player: Player;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: { [key: string]: Phaser.Input.Keyboard.Key };

  constructor(scene: Phaser.Scene, player: Player) {
    this.player = player;

    if (!scene.input.keyboard) {
      throw new Error('Keyboard input plugin nem elérhető.');
    }

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE,J,K') as {
      [key: string]: Phaser.Input.Keyboard.Key;
    };

    // Left Mouse / J → Light Attack, Right Mouse / K → Heavy Attack (projektterv 9. pont)
    this.keys.J.on('down', () => this.player.attackLight());
    this.keys.K.on('down', () => this.player.attackHeavy());

    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.player.attackLight();
      if (pointer.rightButtonDown()) this.player.attackHeavy();
    });
  }

  update(): void {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const jump = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;

    if (left) {
      this.player.moveLeft();
    } else if (right) {
      this.player.moveRight();
    } else {
      this.player.stop();
    }

    if (jump) {
      this.player.jump();
    }

    this.player.updateState();
  }
}