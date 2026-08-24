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
// Level 1 ambient: "Free Dark Fantasy Music" csomag, `Library of Veles (LOOP)`. A csomagban
// EGYÁLTALÁN nincs licenc/readme fájl — publikálás előtt tisztázandó (lásd CLAUDE.md nyitott
// jogi tételek). A forrás-cím megtartása a fájlnévben az egyetlen kapocs a csomaghoz.
import level1ThemeUrl from '../../assets/audio/library-of-veles.mp3';
// Harci SFX: "Free Fantasy SFX Pack" (TomMusic), a csomag `Attacks/` és `Spells/`
// almappáiból. A csomag ReadMe.txt-je NEM tartalmaz licencszöveget, csak elérhetőségeket —
// publikálás előtt tisztázandó (lásd CLAUDE.md nyitott jogi tételek). A fájlnevekben
// megtartott sorszám az egyetlen kapocs a forráscsomag fájljaihoz (`Sword Attack 2`,
// `Sword Impact Hit 1`, `Fireball 2`, `Fireball 3`, `Firebuff 2`, `Sword Attack 3`).
// WAV, nem OGG: univerzálisan támogatott böngészőben.
import swordSwingUrl from '../../assets/audio/sfx/sword-attack-2.wav';
import swordImpactUrl from '../../assets/audio/sfx/sword-impact-hit-1.wav';
import enemySwingUrl from '../../assets/audio/sfx/sword-attack-3.wav';
import fireballCastUrl from '../../assets/audio/sfx/fireball-2.wav';
import bossProjectileUrl from '../../assets/audio/sfx/fireball-3.wav';
import bossSpellImpactUrl from '../../assets/audio/sfx/firebuff-2.wav';
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
// Level 1 terrain-csempék. Forrás: UGYANAZ a PixelPlatformerSet1 v1.1 csomag (Szadi art,
// public domain), amiből a fenti parallax háttér is jön — ezért illeszkedik a paletta
// korrekció nélkül. Származtatott assetek: kivágások a csomag `main_lev_build.png` és
// `other_and_decorative.png` lapjairól, ÁTMÉRETEZÉS NÉLKÜL. A forrás-rectek táblázata a
// `src/levels/LevelTileset.ts` fejlécében van.
import groundFloorUrl from '../../assets/tiles/cathedral/ground-floor.png';
import groundEdgeLeftUrl from '../../assets/tiles/cathedral/ground-edge-left.png';
import groundEdgeRightUrl from '../../assets/tiles/cathedral/ground-edge-right.png';
import platformMidUrl from '../../assets/tiles/cathedral/platform-mid.png';
import platformEdgeLeftUrl from '../../assets/tiles/cathedral/platform-edge-left.png';
import platformEdgeRightUrl from '../../assets/tiles/cathedral/platform-edge-right.png';
import doorGateUrl from '../../assets/tiles/cathedral/door-gate.png';
import ladderUrl from '../../assets/tiles/cathedral/ladder.png';
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';
import { SPIKE_HEIGHT, SPIKE_TILE_WIDTH } from '../levels/Level1Layout';
import { TILE_TEXTURES } from '../levels/LevelTileset';

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

const MUSIC_TRACKS: Array<{ key: string; url: string }> = [
  { key: MUSIC_KEYS.BOSS_THEME, url: bossThemeUrl },
  { key: MUSIC_KEYS.LEVEL1_THEME, url: level1ThemeUrl },
];

const SFX_SOUNDS: Array<{ key: string; url: string }> = [
  { key: SFX_KEYS.SWORD_SWING, url: swordSwingUrl },
  { key: SFX_KEYS.SWORD_IMPACT, url: swordImpactUrl },
  { key: SFX_KEYS.ENEMY_SWING, url: enemySwingUrl },
  { key: SFX_KEYS.FIREBALL_CAST, url: fireballCastUrl },
  { key: SFX_KEYS.BOSS_PROJECTILE, url: bossProjectileUrl },
  { key: SFX_KEYS.BOSS_SPELL_IMPACT, url: bossSpellImpactUrl },
];

// Sima képek (nem sprite sheetek): a Level 1 parallax rétegei + a boss aréna álló háttere.
const BACKGROUND_IMAGES: Array<{ key: string; url: string }> = [
  { key: BACKGROUND_TEXTURES.SKY, url: bgSkyUrl },
  { key: BACKGROUND_TEXTURES.MOUNTAINS, url: bgMountainsUrl },
  { key: BACKGROUND_TEXTURES.RUINS, url: bgRuinsUrl },
  { key: BACKGROUND_TEXTURES.BOSS_ARENA, url: bossArenaUrl },
];

// Level 1 terrain. A `GROUND_FLOOR`, a `PLATFORM_MID` és a `LADDER` tileSprite-ként
// ismétlődik (az első kettő vízszintesen, a létra függőlegesen); a többi egyszeri kép.
const TILE_IMAGES: Array<{ key: string; url: string }> = [
  { key: TILE_TEXTURES.GROUND_FLOOR, url: groundFloorUrl },
  { key: TILE_TEXTURES.GROUND_EDGE_LEFT, url: groundEdgeLeftUrl },
  { key: TILE_TEXTURES.GROUND_EDGE_RIGHT, url: groundEdgeRightUrl },
  { key: TILE_TEXTURES.PLATFORM_MID, url: platformMidUrl },
  { key: TILE_TEXTURES.PLATFORM_EDGE_LEFT, url: platformEdgeLeftUrl },
  { key: TILE_TEXTURES.PLATFORM_EDGE_RIGHT, url: platformEdgeRightUrl },
  { key: TILE_TEXTURES.DOOR_GATE, url: doorGateUrl },
  { key: TILE_TEXTURES.LADDER, url: ladderUrl },
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.createPlaceholderTextures();
    this.createLoadingIndicator();

    for (const track of MUSIC_TRACKS) {
      this.load.audio(track.key, track.url);
    }

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

    for (const image of [...BACKGROUND_IMAGES, ...TILE_IMAGES]) {
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

  // A player, a CrowHarvester, a boss, valamint a Level 1 talaja/platformjai/létrája/ajtaja
  // NEM szerepel itt: nekik már valódi pixel art assetjük van.
  private createPlaceholderTextures(): void {
    // A `ground-placeholder` és a `platform-placeholder` MEGMARAD, de a Level 1-en már csak
    // LÁTHATATLAN FIZIKAI TESTKÉNT: a static bodyt vízszintesen skálázzuk (ami a textúrát
    // megnyújtaná), a látványt pedig külön tileSprite adja. Ugyanaz a szétválasztás, mint a
    // SpikeFieldnél és a létránál. A `ground-placeholder` ezen felül a BossScene-ben is él.
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

    // Lebegő platform — szintén csak láthatatlan fizikai test (lásd fent).
    const platformGfx = this.make.graphics({ x: 0, y: 0 }, false);
    platformGfx.fillStyle(0x4a4a52, 1);
    platformGfx.fillRect(0, 0, 64, 16);
    platformGfx.generateTexture('platform-placeholder', 64, 16);
    platformGfx.destroy();

    // A `ladder-placeholder`, a `pillar-placeholder` és a `door-placeholder` TÖRÖLVE:
    // a létra és az ajtó valódi csempét kapott (TILE_IMAGES), a létra mögötti hátfal-oszlop
    // pedig szándékosan megszűnt — a létra a lebegő platformnak van támasztva.

    // Tüskék (Level 1, D szakasz). Egyetlen 32x16-os csempe, amit a SpikeField tileSprite-tal
    // ismétel a mező hosszában. A világos csont-szín szándékos: a spec megköveteli, hogy a
    // hazard egyértelműen felismerhető legyen, a talaj (0x3a3a3a) és a poros vörös háttér
    // előtt pedig ez a legerősebb kontraszt.
    const spikeGfx = this.make.graphics({ x: 0, y: 0 }, false);
    spikeGfx.fillStyle(0x2e2a30, 1);
    spikeGfx.fillRect(0, 12, SPIKE_TILE_WIDTH, 4); // talapzat
    spikeGfx.fillStyle(0xc8c2b0, 1);
    for (let i = 0; i < 4; i++) {
      const x = i * 8;
      spikeGfx.fillTriangle(x, 14, x + 4, 0, x + 8, 14);
    }
    spikeGfx.generateTexture('spike-placeholder', SPIKE_TILE_WIDTH, SPIKE_HEIGHT);
    spikeGfx.destroy();

    // Swinging Reaper (Level 1, F szakasz) — a mennyezeti horgony: egy gerenda, amiről a
    // lánc lóg. Vízszintes elem, hogy a lengés tengelye egyértelmű legyen.
    const anchorGfx = this.make.graphics({ x: 0, y: 0 }, false);
    anchorGfx.fillStyle(0x1a1620, 1);
    anchorGfx.fillRect(0, 0, 48, 12);
    anchorGfx.fillStyle(0x4a4450, 1);
    anchorGfx.fillRect(0, 0, 48, 3); // felső él-fény
    anchorGfx.fillRect(21, 10, 6, 4); // a lánc befogása
    anchorGfx.generateTexture('hazard-anchor-placeholder', 48, 14);
    anchorGfx.destroy();

    // A lengő penge. A rajzolt alak nagyjából a 36x36-os textúra közepére van igazítva, mert
    // a sprite originje (0.5, 0.5) EGYBEESIK a találati kör középpontjával — a hitbox így a
    // grafika tényleges kiterjedéséből származik, nem szabadon hangolt szám.
    const bladeGfx = this.make.graphics({ x: 0, y: 0 }, false);
    bladeGfx.fillStyle(0x2e2a30, 1);
    bladeGfx.fillRect(15, 0, 6, 14); // nyél-csonk: ide fut be a lánc
    bladeGfx.fillStyle(0xc8c2b0, 1);
    bladeGfx.fillTriangle(18, 10, 1, 26, 35, 26); // penge felső éle
    bladeGfx.fillTriangle(1, 26, 35, 26, 18, 35); // lefelé futó hegy
    bladeGfx.fillStyle(0x8f8a80, 1);
    bladeGfx.fillTriangle(18, 10, 1, 26, 12, 26); // árnyékos belső él
    bladeGfx.generateTexture('reaper-blade-placeholder', 36, 36);
    bladeGfx.destroy();

    // Köztes checkpoint jelölő (Level 1, a spike-szakasz után): egy alacsony talapzat +
    // egy karcsú oszlop. Aktiválatlanul sötét; aktiváláskor a scene setTint()-tel
    // világítja ki, ezért a textúra szándékosan világosszürke alapon készül.
    const checkpointGfx = this.make.graphics({ x: 0, y: 0 }, false);
    checkpointGfx.fillStyle(0x9a9aa8, 1);
    checkpointGfx.fillRect(0, 56, 24, 8); // talapzat
    checkpointGfx.fillRect(8, 8, 8, 48); // oszlop
    checkpointGfx.fillStyle(0xd8d0c0, 1);
    checkpointGfx.fillRect(4, 0, 16, 10); // tálca a láng helyén
    checkpointGfx.generateTexture('checkpoint-placeholder', 24, 64);
    checkpointGfx.destroy();

    // Boss lövedék: nagyobb és lilás, hogy egyértelműen elváljon a player tűzgolyójától.
    const bossProjectileGfx = this.make.graphics({ x: 0, y: 0 }, false);
    bossProjectileGfx.fillStyle(0xa855f7, 1);
    bossProjectileGfx.fillCircle(10, 10, 10);
    bossProjectileGfx.generateTexture('boss-projectile-placeholder', 20, 20);
    bossProjectileGfx.destroy();
  }
}