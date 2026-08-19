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

    // Lebegő platform: vékonyabb és világosabb, mint a talaj, hogy vizuálisan elváljon.
    const platformGfx = this.make.graphics({ x: 0, y: 0 }, false);
    platformGfx.fillStyle(0x4a4a52, 1);
    platformGfx.fillRect(0, 0, 64, 16);
    platformGfx.generateTexture('platform-placeholder', 64, 16);
    platformGfx.destroy();

    // Létra-csempe: két függőleges rúd + egy fok. TileSprite-tal ismételjük függőlegesen.
    const ladderGfx = this.make.graphics({ x: 0, y: 0 }, false);
    ladderGfx.fillStyle(0x6b4a2a, 1);
    ladderGfx.fillRect(0, 0, 5, 32);
    ladderGfx.fillRect(23, 0, 5, 32);
    ladderGfx.fillStyle(0x8a6238, 1);
    ladderGfx.fillRect(0, 12, 28, 6);
    ladderGfx.generateTexture('ladder-placeholder', 28, 32);
    ladderGfx.destroy();

    // Háttér-dekoráció (nem ütközik): sötét oszlop.
    const pillarGfx = this.make.graphics({ x: 0, y: 0 }, false);
    pillarGfx.fillStyle(0x16161c, 1);
    pillarGfx.fillRect(0, 0, 40, 160);
    pillarGfx.generateTexture('pillar-placeholder', 40, 160);
    pillarGfx.destroy();

    // Pálya végi "kijárat" jelölő — a jövőbeli checkpoint/transition helye, most csak dísz.
    const doorGfx = this.make.graphics({ x: 0, y: 0 }, false);
    doorGfx.fillStyle(0x2a1e36, 1);
    doorGfx.fillRect(0, 0, 48, 72);
    doorGfx.generateTexture('door-placeholder', 48, 72);
    doorGfx.destroy();

    // Boss (The Grafted Wing-Breaker) placeholder: 64x96, a Hollow-nál jóval nagyobb.
    // A vállnál lévő sötétvörös sáv adja a "hozzávarrt szárnyak" utalást, és egyben
    // láthatóvá teszi a tintelést (támadás-windup, charge telegraph).
    const bossGfx = this.make.graphics({ x: 0, y: 0 }, false);
    bossGfx.fillStyle(0x53304f, 1);
    bossGfx.fillRect(0, 0, 64, 96);
    bossGfx.fillStyle(0x7a2233, 1);
    bossGfx.fillRect(0, 18, 64, 12);
    bossGfx.generateTexture('boss-placeholder', 64, 96);
    bossGfx.destroy();

    // Boss lövedék: nagyobb és lilás, hogy egyértelműen elváljon a player tűzgolyójától.
    const bossProjectileGfx = this.make.graphics({ x: 0, y: 0 }, false);
    bossProjectileGfx.fillStyle(0xa855f7, 1);
    bossProjectileGfx.fillCircle(10, 10, 10);
    bossProjectileGfx.generateTexture('boss-projectile-placeholder', 20, 20);
    bossProjectileGfx.destroy();
  }
}