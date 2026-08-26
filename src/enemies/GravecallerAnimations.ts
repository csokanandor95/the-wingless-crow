import Phaser from 'phaser';
import type { FacingGeometry } from '../systems/SpriteFacing';
// CSAK típusként — a Gravecaller.ts ebből a modulból ÉRTÉKEKET importál (időzítések,
// geometria), tehát egy runtime-import visszafelé kört csinálna. A GravecallerState string
// enum, ezért a tagjai literál kulcsokat adnak, és a lentebbi switch enum-hivatkozás nélkül
// is típushelyes.
import type { GravecallerState } from './Gravecaller';

// --- Sprite sheet geometria -------------------------------------------------
//
// Forrás: a "Necromancer" csomag (2D helper/enemy/Necromancer). ÖT külön sheet, nem egy
// csík — ezért öt textúra-kulcs, a knight (PLAYER_TEXTURES) mintájára. A Phaser animációi
// (textúra, frame) párokat tárolnak, tehát a `play()` magától átvált a másik textúrára.
//
// FIGYELEM — a csomag frame-mérete KEVERT: az idle/walk/hit/death 96x96, az attack (és a
// nem használt spawn) 128x128. A 128-as frame a 96-osnak PONTOSAN 16px-es kerettel
// kipárnázott változata (mindkét tengelyen ellenőrizve). Az attack sheet ezért a repóba
// már KIVÁGVA került be (6016x128 -> 4512x96, frame-enként (16,16,96,96)) — így minden
// animáció egyetlen FacingGeometry-t használ. Ha animációnként más frame-méret lenne, az
// origint és a body offsetet ANIMÁCIÓNKÉNT kellene újraszámolni, ami pont az a hibaosztály,
// amit a systems/SpriteFacing.ts megszüntetett.

export const FRAME_SIZE = 96;

export const GRAVECALLER_TEXTURES = {
  IDLE: 'gravecaller-idle',
  WALK: 'gravecaller-walk',
  CAST: 'gravecaller-cast',
  HIT: 'gravecaller-hit',
  DEATH: 'gravecaller-death',
} as const;

// A rajzolt alak a 96x96-os frame-en: a staff GYŰRŰJE y 15..26, a csuklyás test y 27..63,
// és a TALP a frame y=64-nél van (az alsó 32 sor teljesen üres). Vízszintesen a köpeny
// x 38..56, a staff nyele x=58 — a TEST közepe tehát x=47, a frame közepe 48.
export const BODY_WIDTH = 20;
export const BODY_HEIGHT = 38;
export const BODY_OFFSET_X = 37; // 37..57, közepe 47
export const BODY_OFFSET_Y = 26; // 26..64, a talp a frame y=64-nél

/** A sprite.y a body közepén — a boss konvenciója (nem a CrowHarvester talp-alapúja). */
export const ORIGIN_Y = (BODY_OFFSET_Y + BODY_HEIGHT / 2) / FRAME_SIZE; // 45/96

/** A talp távolsága a sprite.y-tól. LEVEZETETT érték: a Level1Layout ebből számol spawn Y-t. */
export const FEET_OFFSET_Y = BODY_HEIGHT / 2; // 19
/** A body félszélessége — a layout-tesztek ebből ellenőrzik a peremeket. */
export const HALF_BODY_WIDTH = BODY_WIDTH / 2; // 10

// --- Facing-kompenzáció -----------------------------------------------------
// A sheet natívan JOBBRA néz (ellenőrizve: az attack- ÉS a spawn-effekt is jobbra halad,
// x 53 -> 123). A test itt majdnem központozott (47 vs. 48), tehát a flip-ugrás mindössze
// 2px lenne — de a kompenzáció így is a megosztott helperen megy, hogy a lény ne váljon
// kivétellé, ha a body valaha eltolódik.
export const GRAVECALLER_FACING: FacingGeometry = {
  frameWidth: FRAME_SIZE,
  bodyWidth: BODY_WIDTH,
  bodyOffsetX: BODY_OFFSET_X,
  bodyOffsetY: BODY_OFFSET_Y,
  originY: ORIGIN_Y,
  nativeFacing: 'right',
};

// --- Kulcsok ----------------------------------------------------------------
// A kulcsok szándékosan NEM egyeznek a Gravecaller által emittált event-névvel
// ('gravecaller-projectile'), hogy olvasáskor se lehessen összekeverni a kettőt.

export const GRAVECALLER_ANIMS = {
  IDLE: 'gravecaller-anim-idle',
  WALK: 'gravecaller-anim-walk',
  CAST: 'gravecaller-anim-cast',
  HIT: 'gravecaller-anim-hit',
  DEATH: 'gravecaller-anim-death',
} as const;

// --- Frame-tartományok ------------------------------------------------------

const IDLE_FRAMES = { start: 0, end: 49 };
const WALK_FRAMES = { start: 0, end: 9 };
/** A GetHit sheet f0-ja és f5..f8-a már a nyugalmi póz; a valódi reakció az f1..f4. */
const HIT_FRAMES = { start: 1, end: 4 };
const DEATH_FRAMES = { start: 0, end: 51 };

// A 47 frame-es cast szakaszai (a kivágott sheeten, változatlan indexekkel):
//   f0-12   nyugalmi póz, a staff hegyén növekvő szikra
//   f13-14  hátrahúzás (a test balra tolódik)
//   f15-22  gyülekező izzás, statikus tartókockák
//   f23-30  a staff a magasba emelkedik — EZ A TELEGRAPH (a sziluett teteje y=5-ig kúszik)
//   f31     KIOLDÁS (a kar leejt, az effektes változaton itt indul a burst)
//   f32-46  kikövetkezés vissza a nyugalmi pózba
//
// A statikus tartókockákat ritkítjuk: a nyers 47 frame lejátszása vagy túl lassú lenne
// (olvashatatlanul hosszú telegraph), vagy 20ms/frame-es, feleslegesen sűrű animációt adna.
const CAST_WINDUP_FRAMES = [
  0, 3, 6, 9, 12, // a szikra növekedése
  13, 14, // hátrahúzás
  16, 19, 22, // gyülekezés
  23, 24, 25, 26, 27, 28, 29, 30, // a staff felemelése — ITT sűrű, ez a telegraph
];
const CAST_RECOVERY_FRAMES = [31, 32, 33, 34, 35, 36, 38, 40, 42, 44, 46];
const CAST_FRAMES = [...CAST_WINDUP_FRAMES, ...CAST_RECOVERY_FRAMES];

// --- Időzítés ---------------------------------------------------------------
// A frameRate SOSEM beégetett: mindig a kívánt hosszból számítódik. A gameplay-időzítéseket
// (CAST_STARTUP_MS, CAST_DURATION_MS) a Gravecaller.ts INNEN veszi át, hogy a lövedék
// születése és a látvány ne tudjon elcsúszni egymástól.

/**
 * Egy cast-frame hossza. A CAST-nál a SLOT-időt rögzítjük (nem a teljes hosszt), mert egy
 * KONKRÉT frame-nek (f31, a kioldás) pontos pillanatban kell képre kerülnie — ugyanaz az
 * elv, mint a boss SLASH/CAST animációjánál.
 */
const CAST_SLOT_MS = 40;

/** A cast kezdetétől a kioldásig: a Gravecaller CAST_STARTUP_MS-e ebből jön. */
export const CAST_RELEASE_MS = CAST_WINDUP_FRAMES.length * CAST_SLOT_MS; // 720
/** A teljes cast animáció (windup + kikövetkezés) — ennyi ideig áll a lény. */
export const CAST_TOTAL_MS = CAST_FRAMES.length * CAST_SLOT_MS; // 1160

/** A találat-reakció hossza; ennyi ideig nem írja felül az idle/walk animáció. */
export const HIT_ANIM_MS = 200;

/**
 * A csomagban VAN valódi death animáció (a CrowHarvesternél nem volt): a lény összeesik,
 * és a végén (f45-51) egy lapos maradvány marad a talajon. Azt fadeljük ki utána.
 */
export const DEATH_ANIM_MS = 1400;
export const DEATH_FADE_MS = 400;

const IDLE_ANIM_MS = 2500;
const WALK_ANIM_MS = 600;

// --- Létrehozás -------------------------------------------------------------

const frameCount = (range: { start: number; end: number }): number =>
  range.end - range.start + 1;

/** A frameRate mindig a kívánt teljes hosszból SZÁMÍTÓDIK, sosem beégetett érték. */
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

/**
 * A Gravecaller animációi. A Phaser AnimationManager GAME-szintű, ezért elég egyszer
 * meghívni (BootScene.create()); az `exists()` guard az ismételt hívást is elviseli.
 */
export function createGravecallerAnimations(scene: Phaser.Scene): void {
  const define = (
    key: string,
    frames: Phaser.Types.Animations.AnimationFrame[],
    frameRate: number,
    repeat: number
  ): void => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames, frameRate, repeat });
  };

  const range = (
    key: string,
    texture: string,
    frames: { start: number; end: number },
    durationMs: number,
    repeat: number
  ): void =>
    define(
      key,
      scene.anims.generateFrameNumbers(texture, frames),
      fps(frameCount(frames), durationMs),
      repeat
    );

  range(GRAVECALLER_ANIMS.IDLE, GRAVECALLER_TEXTURES.IDLE, IDLE_FRAMES, IDLE_ANIM_MS, -1);
  range(GRAVECALLER_ANIMS.WALK, GRAVECALLER_TEXTURES.WALK, WALK_FRAMES, WALK_ANIM_MS, -1);
  range(GRAVECALLER_ANIMS.HIT, GRAVECALLER_TEXTURES.HIT, HIT_FRAMES, HIT_ANIM_MS, 0);
  range(
    GRAVECALLER_ANIMS.DEATH,
    GRAVECALLER_TEXTURES.DEATH,
    DEATH_FRAMES,
    DEATH_ANIM_MS,
    0
  );

  define(
    GRAVECALLER_ANIMS.CAST,
    scene.anims.generateFrameNumbers(GRAVECALLER_TEXTURES.CAST, { frames: CAST_FRAMES }),
    1000 / CAST_SLOT_MS,
    0
  );
}

/**
 * State -> animáció leképezés. Szándékosan PURE függvény, hogy Phaser AnimationManager
 * mockolása nélkül unit-tesztelhető legyen.
 *
 * A CAST state a TELJES animációt lefedi (windup + kikövetkezés), ezért — a CrowHarvester
 * ATTACK/COOLDOWN párosával ellentétben — itt nincs szükség arra, hogy a rákövetkező
 * állapot is a cast kulcsra képződjön: a REPOSITION alatt a lény már ténylegesen mozog,
 * tehát ott a walk/idle a helyes látvány.
 */
export function animKeyForState(state: GravecallerState, isMoving: boolean): string {
  switch (state) {
    case 'CAST':
      return GRAVECALLER_ANIMS.CAST;
    case 'DEAD':
      return GRAVECALLER_ANIMS.DEATH;
    case 'PATROL':
    case 'MAINTAIN_DISTANCE':
    case 'REPOSITION':
    default:
      return isMoving ? GRAVECALLER_ANIMS.WALK : GRAVECALLER_ANIMS.IDLE;
  }
}
