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
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE,J,K,F') as {
      [key: string]: Phaser.Input.Keyboard.Key;
    };

    this.keys.J.on('down', () => this.player.attackLight());
    this.keys.K.on('down', () => this.player.attackHeavy());
    this.keys.F.on('down', () => this.player.castFireball());

    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.player.attackLight();
      if (pointer.rightButtonDown()) this.player.attackHeavy();
    });
  }

  update(): void {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const jumpKey = this.keys.SPACE.isDown;

    // Létra-ág: akkor aktív, ha a player létrával fedésben van ÉS mászni akar
    // (vagy már mászik). Így a felső platformon állva – ahol még fedésben van a
    // létrával – a normál mozgás működik tovább.
    if (this.player.isOnLadder() && (up || down || this.player.isClimbing())) {
      // Vízszintes input MINDIG kilép a létráról, így nem lehet beragadni
      // (pl. a létra alján, talajon állva, lefelé nyomva).
      if (left) {
        this.player.exitLadder();
        this.player.moveLeft();
      } else if (right) {
        this.player.exitLadder();
        this.player.moveRight();
      } else if (jumpKey) {
        this.player.jumpOffLadder();
      } else if (up) {
        this.player.climb(-1);
      } else if (down) {
        this.player.climb(1);
      } else {
        this.player.climbIdle();
      }

      this.player.updateState();
      return;
    }

    if (left) {
      this.player.moveLeft();
    } else if (right) {
      this.player.moveRight();
    } else {
      this.player.stopMoving();
    }

    if (up || jumpKey) {
      this.player.jump();
    }

    this.player.updateState();
  }
}