import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 450;

export default class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private controller!: PlayerController;

  constructor() {
    super('Level1Scene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a0f');

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const ground = this.physics.add.staticGroup();
    ground.create(WORLD_WIDTH / 2, 434, 'ground-placeholder')
      .setScale(WORLD_WIDTH / 64, 1)
      .refreshBody();

    const platforms = this.physics.add.staticGroup();
    platforms.create(600, 320, 'ground-placeholder').setScale(3, 1).refreshBody();
    platforms.create(1100, 280, 'ground-placeholder').setScale(4, 1).refreshBody();

    this.player = new Player(this, 100, 300);

    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.controller = new PlayerController(this, this.player);
  }

  update(): void {
    this.controller.update();
  }
}