import Phaser from 'phaser';

// A projektterv 8. pontja szerinti player state-ek.
// ATTACK, CAST, HURT, DEAD később, a Combat/Magic fázisban kap logikát.
export enum PlayerState {
  IDLE = 'IDLE',
  RUN = 'RUN',
  JUMP = 'JUMP',
  FALL = 'FALL',
  ATTACK = 'ATTACK',
  CAST = 'CAST',
  HURT = 'HURT',
  DEAD = 'DEAD',
}

const MOVE_SPEED = 200;
const JUMP_VELOCITY = -500;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  // "state" névvel ütközne a Phaser GameObject beépített state property-jével,
  // ezért playerState néven tároljuk.
  public playerState: PlayerState = PlayerState.IDLE;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-placeholder');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
  }

  moveLeft(): void {
    this.setVelocityX(-MOVE_SPEED);
    this.setFlipX(true);
    if (this.isGrounded()) this.playerState = PlayerState.RUN;
  }

  moveRight(): void {
    this.setVelocityX(MOVE_SPEED);
    this.setFlipX(false);
    if (this.isGrounded()) this.playerState = PlayerState.RUN;
  }

  stop(): void {
    this.setVelocityX(0);
    if (this.isGrounded()) this.playerState = PlayerState.IDLE;
  }

  jump(): void {
    if (this.isGrounded()) {
      this.setVelocityY(JUMP_VELOCITY);
      this.playerState = PlayerState.JUMP;
    }
  }

  isGrounded(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  updateState(): void {
    if (!this.isGrounded()) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.playerState = body.velocity.y < 0 ? PlayerState.JUMP : PlayerState.FALL;
    }
  }
}