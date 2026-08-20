import Phaser from 'phaser';
import { MUSIC_KEYS } from '../systems/AudioManager';
import {
  createPlayerAnimations,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  PLAYER_TEXTURES,
} from '../player/PlayerAnimations';
// Vite-on át importálva (nem `public/`-ból): így az asset hash-elve bekerül a buildbe,
// a base path (GitHub Pages) magától helyes lesz, és HIÁNYZÓ fájl esetén a build elszáll
// ahelyett, hogy néma 404 lenne futásidőben.
import bossThemeUrl from '../../assets/audio/boss-theme.mp3';
// Player sprite sheetek (2D_SL_Knight_v1.0, lásd assets/sprites/knight/license.txt).
// Mind 128x64-es blokkokra van vágva.
import knightIdleUrl from '../../assets/sprites/knight/Idle.png';
import knightRunUrl from '../../assets/sprites/knight/Run.png';
import knightJumpUrl from '../../assets/sprites/knight/Jump.png';
import knightAttacksUrl from '../../assets/sprites/knight/Attacks.png';
import knightHurtUrl from '../../assets/sprites/knight/Hurt.png';
import knightDeathUrl from '../../assets/sprites/knight/Death.png';
import knightClimbUrl from '../../assets/sprites/knight/Climb.png';
import knightCastUrl from '../../assets/sprites/knight/Health.png';

const LOADING_BAR_WIDTH = 320;
const LOADING_BAR_HEIGHT = 14;

const PLAYER_SHEETS: Array<{ key: string; url: string }> = [
  { key: PLAYER_TEXTURES.IDLE, url: knightIdleUrl },
  { key: PLAYER_TEXTURES.RUN, url: knightRunUrl },
  { key: PLAYER_TEXTURES.JUMP, url: knightJumpUrl },
  { key: PLAYER_TEXTURES.ATTACK, url: knightAttacksUrl },
  { key: PLAYER_TEXTURES.HURT, url: knightHurtUrl },
  { key: PLAYER_TEXTURES.DEATH, url: knightDeathUrl },
  { key: PLAYER_TEXTURES.CLIMB, url: knightClimbUrl },
  // A Health.png a cast animáció forrása — a csomagban nincs magic anim, ez áll
  // legközelebb hozzá (felemelt piros izzó gömb + szikrák).
  { key: PLAYER_TEXTURES.CAST, url: knightCastUrl },
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.createPlaceholderTextures();
    this.createLoadingIndicator();

    this.load.audio(MUSIC_KEYS.BOSS_THEME, bossThemeUrl);

    for (const sheet of PLAYER_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
      });
    }
  }

  create(): void {
    // Az AnimationManager GAME-szintű, nem scene-szintű: elég egyszer, itt létrehozni,
    // és minden későbbi scene (Level1Scene, BossScene) ugyanazt használja.
    createPlayerAnimations(this);

    this.scene.start('Level1Scene');
  }

  // Ideiglenes, minimális betöltésjelző — a boss theme ~2 MB, ami első betöltéskor
  // (főleg deployolva) látható szünet. Phase 8 további iterációiban, több asset mellett
  // ez kaphat valódi UI-t a `ui/` modulban.
  private createLoadingIndicator(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 30, 'Betöltés...', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8a7a8a',
      })
      .setOrigin(0.5);

    const barX = centerX - LOADING_BAR_WIDTH / 2;
    const bar = this.add.graphics();

    this.load.on('progress', (progress: number) => {
      bar.clear();
      bar.fillStyle(0x2a1e2a, 1);
      bar.fillRect(barX, centerY, LOADING_BAR_WIDTH, LOADING_BAR_HEIGHT);
      bar.fillStyle(0xa02020, 1);
      bar.fillRect(barX, centerY, LOADING_BAR_WIDTH * progress, LOADING_BAR_HEIGHT);
    });
  }

  // A player NEM szerepel itt: neki már valódi sprite sheetjei vannak (lásd PLAYER_SHEETS).
  private createPlaceholderTextures(): void {
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