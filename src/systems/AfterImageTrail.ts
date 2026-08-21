import Phaser from 'phaser';

/**
 * Afterimage („smear") csík egy gyorsan mozgó sprite mögé.
 *
 * Miért kell: a boss charge-jához nincs dedikált dash animáció a sprite csomagban. Helyette
 * egy MEGTARTOTT kitörés-pózt használunk, a sebesség érzetét pedig ez a csík adja hozzá —
 * ez a klasszikus 2D megoldás, és jobban is olvasható, mint egy felgyorsított sétaciklus.
 *
 * SZÁNDÉKOSAN a scene birtokolja, nem a boss: így a GraftedWingBreaker osztály továbbra sem
 * hoz létre scene-objektumot (ugyanaz az elv, mint a lövedéknél és a HP-barnál), és a
 * unit tesztek minimális MockSprite felülete elég marad hozzá.
 *
 * Takarítás: a másolatok saját tweenjük végén destroy-olják magukat; ami a scene
 * leállásakor még él, azt a Phaser a display listtel együtt megsemmisíti.
 */
export interface AfterImageOptions {
  /** Két másolat között eltelt minimális idő. */
  intervalMs?: number;
  /** Egy másolat elhalványulásának hossza. */
  fadeMs?: number;
  /** A másolat kezdő átlátszatlansága. */
  alpha?: number;
  /** Sötét lilás árnyalat, hogy a csík árnyéknak látsszon, ne második bossnak. */
  tint?: number;
}

export const DEFAULT_INTERVAL_MS = 50;
export const DEFAULT_FADE_MS = 250;
export const DEFAULT_ALPHA = 0.45;
export const DEFAULT_TINT = 0x2a0a3a;

export default class AfterImageTrail {
  private readonly intervalMs: number;
  private readonly fadeMs: number;
  private readonly alpha: number;
  private readonly tint: number;

  /** `null` = még nem spawnoltunk ebben az aktív szakaszban. */
  private lastSpawnAt: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly source: Phaser.GameObjects.Sprite,
    options: AfterImageOptions = {}
  ) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.fadeMs = options.fadeMs ?? DEFAULT_FADE_MS;
    this.alpha = options.alpha ?? DEFAULT_ALPHA;
    this.tint = options.tint ?? DEFAULT_TINT;
  }

  /**
   * A scene update()-jéből hívandó. `active === false` esetén no-op, és a következő aktív
   * szakasz AZONNAL indul egy másolattal (nem kell megvárni az intervallumot).
   */
  update(active: boolean): void {
    if (!active) {
      this.lastSpawnAt = null;
      return;
    }

    const now = this.scene.time.now;
    if (this.lastSpawnAt !== null && now - this.lastSpawnAt < this.intervalMs) return;

    this.lastSpawnAt = now;
    this.spawn();
  }

  private spawn(): void {
    const source = this.source;

    // A forrás AKTUÁLIS frame-je, originje és tükrözése együtt kell — enélkül az off-center
    // sprite másolatai oldalra csúsznának a valódihoz képest.
    const ghost = this.scene.add.image(source.x, source.y, source.texture.key, source.frame.name);

    ghost.setOrigin(source.originX, source.originY);
    ghost.setFlipX(source.flipX);
    ghost.setScale(source.scaleX, source.scaleY);
    ghost.setDepth(source.depth - 1);
    ghost.setAlpha(this.alpha);
    ghost.setTint(this.tint);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: this.fadeMs,
      onComplete: () => ghost.destroy(),
    });
  }
}
