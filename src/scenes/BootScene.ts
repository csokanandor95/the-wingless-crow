import Phaser from 'phaser';
import { MUSIC_KEYS, SFX_KEYS } from '../systems/AudioManager';
import {
  createPlayerAnimations,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  PLAYER_TEXTURES,
} from '../player/PlayerAnimations';
import {
  createCrowHarvesterAnimations,
  FRAME_SIZE as HARVESTER_FRAME_SIZE,
  TEXTURE_KEY as HARVESTER_TEXTURE_KEY,
} from '../enemies/CrowHarvesterAnimations';
import {
  createGraftedWingBreakerAnimations,
  CLEAN_TEXTURE_KEY as BOSS_CLEAN_TEXTURE_KEY,
  FRAME_HEIGHT as BOSS_FRAME_HEIGHT,
  FRAME_WIDTH as BOSS_FRAME_WIDTH,
  TEXTURE_KEY as BOSS_TEXTURE_KEY,
} from '../bosses/GraftedWingBreakerAnimations';
// Vite-on át importálva (nem `public/`-ból): így az asset hash-elve bekerül a buildbe,
// a base path (GitHub Pages) magától helyes lesz, és HIÁNYZÓ fájl esetén a build elszáll
// ahelyett, hogy néma 404 lenne futásidőben.
import bossThemeUrl from '../../assets/audio/boss-theme.mp3';
// Kard SFX: "Free Fantasy SFX Pack" (TomMusic). A csomag ReadMe.txt-je NEM tartalmaz
// licencszöveget, csak elérhetőségeket — publikálás előtt tisztázandó (lásd CLAUDE.md
// nyitott jogi tételek). A fájlnevekben megtartott sorszám (`-2`, `-1`) az egyetlen
// kapocs a forráscsomag `Sword Attack 2` / `Sword Impact Hit 1` fájljaihoz. WAV, nem OGG:
// univerzálisan támogatott, és 2x89 KB elhanyagolható a 2 MB-os boss theme mellett.
import swordSwingUrl from '../../assets/audio/sfx/sword-attack-2.wav';
import swordImpactUrl from '../../assets/audio/sfx/sword-impact-hit-1.wav';
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
// CrowHarvester (Enemy 1): egyetlen 1792x64-es csík, 28 db 64x64-es frame.
import crowHarvesterSheetUrl from '../../assets/sprites/crow-harvester/enemy04_sheet.png';
// Boss (The Grafted Wing-Breaker): a "Bringer of Death" csomag (Clembod — személyes és
// kereskedelmi használat + módosítás engedélyezett, újraértékesítés nem). Mindkét sheet
// 1120x744 = 8x8 db 140x93-as frame, AZONOS elrendezéssel; a `_no-Effect` változatból
// pontosan egy frame kell (a dash póz), lásd GraftedWingBreakerAnimations.DASH_FRAME.
// Az eredeti fájlnevek megmaradtak: ez köti vissza az assetet a forráscsomaghoz.
import bossSheetUrl from '../../assets/sprites/grafted-wing-breaker/Bringer-of-Death-SpritSheet.png';
import bossCleanSheetUrl from '../../assets/sprites/grafted-wing-breaker/Bringer-of-Death-SpritSheet_no-Effect.png';
// Level 1 parallax háttér-rétegek. Forrás: PixelPlatformerSet1 v1.1 (Szadi art) —
// "License for Everyone / public domain, personal or commercial". A fájlok át lettek
// nevezve (`01 background.png` -> `01-sky.png` stb.), mert a Vite-import szóközös
// útvonallal törékeny; a forráscsomagot ez a komment köti vissza.
import bgSkyUrl from '../../assets/backgrounds/ruined-city/01-sky.png';
import bgMountainsUrl from '../../assets/backgrounds/ruined-city/02-mountains.png';
import bgRuinsUrl from '../../assets/backgrounds/ruined-city/03-ruins.png';
// Boss aréna háttere: egyetlen álló, teljes képernyős kép. SZÁRMAZTATOTT asset — a forrás
// a `2D helper/level/Bossbackground_1.png` (1672x941), amiből egy 1467x825-ös kivágás
// (bal-felső sarok: 103, 0) lett 800x450-re kicsinyítve. A kivágás nem esztétikai döntés:
// ez teszi a rajzolt padlóélt PONTOSAN a BossScene GROUND_TOP-jára (418). Lásd CLAUDE.md.
import bossArenaUrl from '../../assets/backgrounds/cathedral/boss-arena.png';
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';

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

const SFX_SOUNDS: Array<{ key: string; url: string }> = [
  { key: SFX_KEYS.SWORD_SWING, url: swordSwingUrl },
  { key: SFX_KEYS.SWORD_IMPACT, url: swordImpactUrl },
];

// Sima képek (nem sprite sheetek): a Level 1 parallax rétegei + a boss aréna álló háttere.
const BACKGROUND_IMAGES: Array<{ key: string; url: string }> = [
  { key: BACKGROUND_TEXTURES.SKY, url: bgSkyUrl },
  { key: BACKGROUND_TEXTURES.MOUNTAINS, url: bgMountainsUrl },
  { key: BACKGROUND_TEXTURES.RUINS, url: bgRuinsUrl },
  { key: BACKGROUND_TEXTURES.BOSS_ARENA, url: bossArenaUrl },
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.createPlaceholderTextures();
    this.createLoadingIndicator();

    this.load.audio(MUSIC_KEYS.BOSS_THEME, bossThemeUrl);

    for (const sfx of SFX_SOUNDS) {
      this.load.audio(sfx.key, sfx.url);
    }

    for (const sheet of PLAYER_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
      });
    }

    this.load.spritesheet(HARVESTER_TEXTURE_KEY, crowHarvesterSheetUrl, {
      frameWidth: HARVESTER_FRAME_SIZE,
      frameHeight: HARVESTER_FRAME_SIZE,
    });

    for (const sheet of [
      { key: BOSS_TEXTURE_KEY, url: bossSheetUrl },
      { key: BOSS_CLEAN_TEXTURE_KEY, url: bossCleanSheetUrl },
    ]) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: BOSS_FRAME_WIDTH,
        frameHeight: BOSS_FRAME_HEIGHT,
      });
    }

    for (const image of BACKGROUND_IMAGES) {
      this.load.image(image.key, image.url);
    }
  }

  create(): void {
    // Az AnimationManager GAME-szintű, nem scene-szintű: elég egyszer, itt létrehozni,
    // és minden későbbi scene (Level1Scene, BossScene) ugyanazt használja.
    createPlayerAnimations(this);
    createCrowHarvesterAnimations(this);
    createGraftedWingBreakerAnimations(this);

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

  // A player, a CrowHarvester és a boss NEM szerepel itt: nekik már valódi sprite
  // sheetjeik vannak.
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

    // Boss lövedék: nagyobb és lilás, hogy egyértelműen elváljon a player tűzgolyójától.
    const bossProjectileGfx = this.make.graphics({ x: 0, y: 0 }, false);
    bossProjectileGfx.fillStyle(0xa855f7, 1);
    bossProjectileGfx.fillCircle(10, 10, 10);
    bossProjectileGfx.generateTexture('boss-projectile-placeholder', 20, 20);
    bossProjectileGfx.destroy();
  }
}