import Phaser from 'phaser';

/**
 * A LÁNGŐRZŐ — a `PreScene` NPC-je.
 *
 * A projekt ELSŐ nem harcoló szereplője, ezért nyit új mappát (`src/npc/`): nincs state
 * machine-je, nincs HP-ja és nincs physics bodyja. Egyetlen dolgot csinál: áll, és lobog a
 * kezében a láng.
 *
 * Forrás: `GandalfHardcore — FREE NPC (Goddess)`, lásd
 * `assets/sprites/goddess/license.txt`. Ez NEM nyitott jogi tétel: a csomag `READ ME.txt`-je
 * tartalmaz licencszöveget, és az be van másolva a repóba (a knight és a Mad King mintájára).
 */

// --- Sprite sheet geometria -------------------------------------------------
// A lap 832x64 = 13 db 64x64-es frame. Mind a 13 EGYEDI (md5), de ez NEM jelenti azt, hogy
// egyetlen animáció lenne: a csík valójában KÉT animációt tartalmaz egymás után.
//
// A rajzolt alak MÉRVE (alpha bounding box, minden frame-en gyakorlatilag azonos):
//   x 16..45  (29 px szélesség)
//   y 17..63  (46-47 px magasság)
// Ez gyakorlatilag a lovag mérete (28x46), ezért SCALE nincs: 1:1-ben megy be.

export const TEXTURE_KEY = 'goddess';
export const FRAME_SIZE = 64;

/** 832 / 64. A lap SZÉLESSÉGÉBŐL adódik, nem szabadon választott szám. */
export const FRAME_COUNT = 13;

/**
 * A talp a frame y=63-án van (az alsó rajzolt sor), tehát az alak gyakorlatilag a frame
 * aljára van ültetve. `ORIGIN_Y = 0.5` mellett a `sprite.y` a frame KÖZEPE (32), így a
 * talp `sprite.y + 31`-nél van.
 *
 * Ebből jön a `PreScene` NPC-magassága: `GROUND_TOP - FEET_OFFSET_Y` — ugyanaz a levezetés,
 * mint a `Boss2Scene` `KING_SPAWN_Y`-jánál.
 */
export const ORIGIN_Y = 0.5;
export const FEET_OFFSET_Y = 31; // = a talp sora (63) - a frame közepe (32)

/** A rajzolt alak MÉRT félszélessége — az interakciós zóna ebből indul, nem találgatásból. */
export const HALF_WIDTH = 15; // (45 - 16 + 1) / 2, felfelé kerekítve

// FIGYELEM: itt NINCS FacingGeometry, és ez nem feledékenység — két okból:
//  1. az NPC SOSEM fordul meg (áll egy helyben, a párbeszéd alatt is);
//  2. a testközép MÉRVE 30,5..31, a frame közepe 32 — tehát 1..1,5 px eltérés. Nagyságrenddel
//     kevesebb, mint amiért a kompenzáció született (a CrowHarvester teste 18 px-szel, a
//     démoné 7 forrás-px-szel van eltolva), tehát az `applyFacing()` itt no-op lenne.
// A sprite natívan BALRA néz, és a `PreScene`-ben a jobb oldalon áll, tehát pont a beeső
// player felé fordul — `flipX` nélkül. Ha valaha a bal oldalra kerülne, a `setFlipX(true)`
// önmagában elég (a 11./16. tanulság az off-center sheetekre vonatkozik, ez nem az).

export const GODDESS_ANIMS = {
  IDLE: 'goddess-idle',
} as const;

/**
 * A csík KÉT animációra bomlik, és ezt MÉRÉS mutatta meg, nem a fájlnév.
 *
 * A láb-sávot (`y 50..63`) frame-enként az f0-hoz hasonlítva a különbség élesen kettéválik:
 *   f1-f4:  8, 10, 23, 15 eltérő pixel  -> gyakorlatilag AZONOS láb, csak a láng lobog
 *   f5-f12: 151, 196, 162, 143, 182, 164, 159, 148  -> nagyságrenddel több
 * Az `f5..f12` frame-eken a szoknya kileng és a lábak lépnek — az egy 8 frame-es JÁRÁS.
 *
 * KÉZI TESZTEN pontosan ez jött elő: a teljes 13 frame-es loopot lejátszva az NPC „helyben
 * járt". A `PreScene` szereplője ÁLL, tehát csak az idle szakasz kell.
 */
export const IDLE_FRAMES = { start: 0, end: 4 } as const;

/**
 * A járás-szakasz. SZÁNDÉKOSAN nincs belőle animáció: A LÁNGŐRZŐ egy helyben álló NPC, nincs
 * olyan állapota, amiben menne. Itt dokumentálva marad, hogy egy jövőbeli mozgó NPC ne
 * kelljen újra kimérje — ugyanaz az elv, mint a knight csomag nem használt sheetjeinél.
 */
export const WALK_FRAMES = { start: 5, end: 12 } as const;

/**
 * Egy frame ideje. Ez az EGYETLEN hangolópont — a loop hossza belőle SZÁMÍTÓDIK, tehát a
 * frame-tartomány szűkítése (13 -> 5) magától rövidítette a ciklust, nem kellett újrahangolni.
 * 100 ms nyugodt láng-lobogás: a szereplő mozdulatlan, csak a kezében ég a tűz.
 */
export const IDLE_SLOT_MS = 100;

const frameCount = (range: { start: number; end: number }): number => range.end - range.start + 1;
const fps = (frames: number, durationMs: number): number => (frames * 1000) / durationMs;

/** A teljes idle loop hossza — LEVEZETETT, nem beírt szám. */
export const IDLE_ANIM_MS = frameCount(IDLE_FRAMES) * IDLE_SLOT_MS;

/**
 * A Phaser AnimationManager GAME-szintű, ezért elég egyszer meghívni (BootScene.create());
 * az `exists()` guard az ismételt hívást is elviseli.
 */
export function createGoddessAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists(GODDESS_ANIMS.IDLE)) return;

  scene.anims.create({
    key: GODDESS_ANIMS.IDLE,
    frames: scene.anims.generateFrameNumbers(TEXTURE_KEY, IDLE_FRAMES),
    // SZÁMÍTOTT, sosem beégetett — ha az IDLE_SLOT_MS vagy a frame-tartomány változik, a
    // tempó magától követi.
    frameRate: fps(frameCount(IDLE_FRAMES), IDLE_ANIM_MS),
    repeat: -1,
  });
}
