import Phaser from 'phaser';
import { AttackType, ATTACK_CONFIGS } from '../combat/Attack';
// CSAK típusként importálva, hogy ne keletkezzen körkörös runtime-import
// (a Player.ts ebből a modulból értékeket importál). A PlayerState string enum, ezért a
// tagjai literál kulcsokat adnak — így a lentebbi Record<PlayerState, string> kielégíthető
// sima objektum-literállal, PlayerState.IDLE-szerű ÉRTÉK-hivatkozás nélkül.
import type { PlayerState } from './Player';

// --- Sprite sheet geometria -------------------------------------------------
// A 2D_SL_Knight csomag minden sheetje 128x64-es blokkokra van vágva (lásd a csomag
// _Info.txt-jét). A rajzolt karakter ezen belül ~27x47 px, a talpa a frame aljára ül.

export const FRAME_WIDTH = 128;
export const FRAME_HEIGHT = 64;

// A physics body a rajzolt karakter tényleges kiterjedéséhez igazodik (a frame-ek
// alpha bounding boxából mérve: x 49-75, y 17-63), nem a 128x64-es frame-hez.
export const BODY_WIDTH = 28;
export const BODY_HEIGHT = 46;
export const BODY_OFFSET_X = 48;
export const BODY_OFFSET_Y = 18;

// ORIGIN_Y = (64 - 24) / 64. Ezzel a karakter TALPA pontosan a sprite.y + 24-nél lesz,
// tehát a Level1Scene PLAYER_HALF_HEIGHT = 24 konstansa (és minden, ami ráépül: a létra
// topY/bottomY-ja, a CHECKPOINT_Y) a placeholder óta VÁLTOZATLANUL érvényes marad.
export const ORIGIN_Y = 0.625;

// --- Kulcsok ----------------------------------------------------------------

export const PLAYER_TEXTURES = {
  IDLE: 'knight-idle',
  RUN: 'knight-run',
  JUMP: 'knight-jump',
  ATTACK: 'knight-attacks',
  HURT: 'knight-hurt',
  DEATH: 'knight-death',
  CLIMB: 'knight-climb',
  CAST: 'knight-cast',
} as const;

export const PLAYER_ANIMS = {
  IDLE: 'player-idle',
  RUN: 'player-run',
  JUMP: 'player-jump',
  FALL: 'player-fall',
  ATTACK: 'player-attack',
  CAST: 'player-cast',
  HURT: 'player-hurt',
  CLIMB: 'player-climb',
  DEAD: 'player-dead',
} as const;

// --- Időzítés ---------------------------------------------------------------
// Ezeket a Player importálja vissza (CAST_DELAY_MS = CAST_ANIM_MS), hogy az animáció
// hossza és a gameplay-lock hossza SOSE csúszhasson el egymástól.

/** A cast startup-ja = a Health animáció f0-f4 szakaszának hossza. */
export const CAST_ANIM_MS = 260;
/** A HURT lock hossza = a Hurt animáció hossza. */
export const HURT_ANIM_MS = 150;

const IDLE_ANIM_MS = 1000;
const RUN_ANIM_MS = 570;
const JUMP_ANIM_MS = 330;
const FALL_ANIM_MS = 250;
const CLIMB_ANIM_MS = 600;
const DEATH_ANIM_MS = 520;

// --- Frame-tartományok ------------------------------------------------------
// Az Attacks.png 40 frame-je valójában 20 JOBBRA néző + ugyanaz 20 TÜKRÖZVE. A player
// setFlipX()-szel fordul, ezért a 20-39 tartomány nem kell. A 0-19-en belül négy külön
// csapás van; a playernek egyetlen kardtámadása van, ehhez a leglátványosabbat használjuk.
const ATTACK_FRAMES = { start: 15, end: 19 }; // nagy dupla félhold
// A Health.png "gyógyital" animációja: a lovag piros izzó gömböt emel (f0-f2), ami
// szikrákra pattan (f3-f4). A csomagban nincs magic animáció, ez áll legközelebb a
// fireball castoláshoz — a maradék f5-f7 (elhaló szikrák) már nem kell.
const CAST_FRAMES = { start: 0, end: 4 };
const HURT_FRAMES = { start: 0, end: 2 }; // a sheet 4. frame-je ÜRES
const JUMP_RISE_FRAMES = { start: 0, end: 3 };
const JUMP_FALL_FRAMES = { start: 4, end: 5 };

const frameCount = (range: { start: number; end: number }): number =>
  range.end - range.start + 1;

/** A frameRate mindig a kívánt teljes hosszból SZÁMÍTÓDIK, sosem beégetett érték. */
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

interface AnimDef {
  key: string;
  texture: string;
  frames: { start: number; end: number };
  durationMs: number;
  repeat: number;
}

const SWORD = ATTACK_CONFIGS[AttackType.SWORD];

const ANIM_DEFS: AnimDef[] = [
  {
    key: PLAYER_ANIMS.IDLE,
    texture: PLAYER_TEXTURES.IDLE,
    frames: { start: 0, end: 7 },
    durationMs: IDLE_ANIM_MS,
    repeat: -1,
  },
  {
    key: PLAYER_ANIMS.RUN,
    texture: PLAYER_TEXTURES.RUN,
    frames: { start: 0, end: 7 },
    durationMs: RUN_ANIM_MS,
    repeat: -1,
  },
  {
    key: PLAYER_ANIMS.JUMP,
    texture: PLAYER_TEXTURES.JUMP,
    frames: JUMP_RISE_FRAMES,
    durationMs: JUMP_ANIM_MS,
    repeat: 0,
  },
  {
    key: PLAYER_ANIMS.FALL,
    texture: PLAYER_TEXTURES.JUMP,
    frames: JUMP_FALL_FRAMES,
    durationMs: FALL_ANIM_MS,
    repeat: -1,
  },
  // A támadás-animáció hossza a támadás TELJES aktív szakasza (startup + active), így a
  // kard a hitbox kinyílásának pillanatában van a lendület csúcsán.
  {
    key: PLAYER_ANIMS.ATTACK,
    texture: PLAYER_TEXTURES.ATTACK,
    frames: ATTACK_FRAMES,
    durationMs: SWORD.startupDelayMs + SWORD.activeDurationMs,
    repeat: 0,
  },
  {
    key: PLAYER_ANIMS.CAST,
    texture: PLAYER_TEXTURES.CAST,
    frames: CAST_FRAMES,
    durationMs: CAST_ANIM_MS,
    repeat: 0,
  },
  {
    key: PLAYER_ANIMS.HURT,
    texture: PLAYER_TEXTURES.HURT,
    frames: HURT_FRAMES,
    durationMs: HURT_ANIM_MS,
    repeat: 0,
  },
  {
    key: PLAYER_ANIMS.CLIMB,
    texture: PLAYER_TEXTURES.CLIMB,
    frames: { start: 0, end: 5 },
    durationMs: CLIMB_ANIM_MS,
    repeat: -1,
  },
  {
    key: PLAYER_ANIMS.DEAD,
    texture: PLAYER_TEXTURES.DEATH,
    frames: { start: 0, end: 3 },
    durationMs: DEATH_ANIM_MS,
    repeat: 0,
  },
];

/**
 * Létrehozza a player animációkat. A Phaser AnimationManager GAME-szintű, ezért elég
 * egyszer meghívni (BootScene.create()); az `exists()` guard viszont biztonságossá teszi
 * az esetleges ismételt hívást is (scene-restart, teszt).
 */
export function createPlayerAnimations(scene: Phaser.Scene): void {
  for (const def of ANIM_DEFS) {
    if (scene.anims.exists(def.key)) continue;

    scene.anims.create({
      key: def.key,
      frames: scene.anims.generateFrameNumbers(def.texture, def.frames),
      frameRate: fps(frameCount(def.frames), def.durationMs),
      repeat: def.repeat,
    });
  }
}

/**
 * A state -> animáció leképezés. Szándékosan PURE függvény (nem a Player metódusa), hogy
 * a leképezés Phaser AnimationManager mockolása nélkül unit-tesztelhető legyen.
 */
export function animKeyForState(state: PlayerState): string {
  switch (state) {
    case 'RUN':
      return PLAYER_ANIMS.RUN;
    case 'JUMP':
      return PLAYER_ANIMS.JUMP;
    case 'FALL':
      return PLAYER_ANIMS.FALL;
    case 'ATTACK':
      // Egyetlen kardtámadás van. Ha a repertoár bővül, itt egy támadás-típus paraméter
      // szerinti elágazás a következő lépés (ATTACK_CONFIGS már most is Record).
      return PLAYER_ANIMS.ATTACK;
    case 'CAST':
      return PLAYER_ANIMS.CAST;
    case 'HURT':
      return PLAYER_ANIMS.HURT;
    case 'CLIMB':
      return PLAYER_ANIMS.CLIMB;
    case 'DEAD':
      return PLAYER_ANIMS.DEAD;
    case 'IDLE':
    default:
      return PLAYER_ANIMS.IDLE;
  }
}
