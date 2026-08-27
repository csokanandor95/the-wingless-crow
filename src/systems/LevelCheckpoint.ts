import Phaser from 'phaser';

/**
 * Érintésre aktiválódó köztes checkpoint — a `Level1Scene` egyetlen köztes checkpointjának
 * kiemelt, újrahasznosítható változata. A Level 2-nek HÁROM kell belőle, és három
 * kézzel bemásolt jelölő/zóna/villanás hármas garantáltan elcsúszna egymástól.
 *
 * **Érintésre aktiválódik, nem `E`-re** (szemben a pálya végi ajtóval): így nem versenyez az
 * ajtó promptjával, és nem kell új input a játékosnak.
 *
 * A sebzés-mintát követi: az osztály NEM nyúl a `CheckpointSystem`-hez, csak eldönti, hogy
 * aktiválható-e, és megcsinálja a visszajelzést — a respawn-pont beállítása a scene dolga.
 * Így az osztály nem függ a checkpoint-tárolótól, és a scene marad az egyetlen hely, ahol a
 * pálya állapota változik.
 */

/** A jelölő színe aktiválás előtt / után. */
const TINT_IDLE = 0x4a4452;
const TINT_ACTIVE = 0xffd88a;

const MARKER_HEIGHT = 64;
const FLASH_HOLD_MS = 1200;
const FLASH_FADE_MS = 200;
/** A jelölő és a felirat a terrain ELŐTT, de a gameplay-elemek MÖGÖTT. */
const MARKER_DEPTH = -1;

export interface LevelCheckpointConfig {
  x: number;
  /** Annak a felületnek a felszíne, amin a jelölő áll. */
  surfaceTop: number;
  zoneWidth: number;
  zoneHeight: number;
}

export default class LevelCheckpoint {
  private readonly scene: Phaser.Scene;
  private readonly marker: Phaser.GameObjects.Image;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly label: Phaser.GameObjects.Text;
  private activated = false;

  constructor(scene: Phaser.Scene, config: LevelCheckpointConfig) {
    this.scene = scene;

    this.marker = scene.add
      .image(config.x, config.surfaceTop - MARKER_HEIGHT / 2, 'checkpoint-placeholder')
      .setTint(TINT_IDLE)
      .setDepth(MARKER_DEPTH);

    this.zone = scene.add.zone(
      config.x,
      config.surfaceTop - config.zoneHeight / 2,
      config.zoneWidth,
      config.zoneHeight
    );
    scene.physics.add.existing(this.zone, true);

    this.label = scene.add
      .text(config.x, config.surfaceTop - MARKER_HEIGHT - 16, 'Checkpoint', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd88a',
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  /**
   * A scene SZINKRON `physics.overlap()`-pel teszteli — mint a létrát és az ajtót —, nem
   * `physics.add.overlap` callbackkel, ami csak a scene `update()`-je UTÁN futna le.
   */
  getZone(): Phaser.GameObjects.Zone {
    return this.zone;
  }

  isActivated(): boolean {
    return this.activated;
  }

  /** Egyszer sül el; a visszajelzés a jelölő kivilágosodása + egy rövid felirat. */
  activate(): void {
    if (this.activated) return;
    this.activated = true;

    this.marker.setTint(TINT_ACTIVE);

    // hold + yoyo: felvillan, áll, majd ugyanazzal a tweennel elhalványul — ugyanaz a
    // minta, mint a TutorialHintnél és a boss nevénél.
    this.scene.tweens.add({
      targets: this.label,
      alpha: 1,
      duration: FLASH_FADE_MS,
      hold: FLASH_HOLD_MS,
      yoyo: true,
    });
  }
}
