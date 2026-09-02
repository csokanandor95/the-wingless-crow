import Phaser from 'phaser';
import type { TutorialHintDef } from '../levels/LevelGeometry';

/**
 * Rövid, egyszer megjelenő billentyű-súgó a pálya tutorial-szakaszaihoz.
 *
 * A player egy `triggerX`-et átlépve váltja ki; a felirat befadel, kis ideig áll, majd
 * kifadel. Adatvezérelt (`TUTORIAL_HINTS` a Level1Layout.ts-ben), a scene csak annyit tesz,
 * hogy minden frame-ben átadja a player X-ét.
 *
 * Ez a modul nyitja meg a `docs/Project_plan.md` 20. pontjában tervezett `ui/` mappát. A
 * debug HUD-szövegek (HP, player state, checkpoint-prompt) átköltöztetése ide a Phase 8
 * `ui/` iterációjának feladata marad.
 */

export const HINT_FADE_IN_MS = 300;
export const HINT_HOLD_MS = 4000;

/** A felirat a képernyő tetején, a HUD alatt ül — a kamerához rögzítve. */
const HINT_X = 400;
const HINT_Y = 74;
const HINT_DEPTH = 50;

export default class TutorialHint {
  private readonly scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private readonly hints: TutorialHintDef[];
  private readonly shown = new Set<string>();
  private activeTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, hints: TutorialHintDef[]) {
    this.scene = scene;
    this.hints = hints;

    this.text = scene.add
      .text(HINT_X, HINT_Y, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#e8dcc8',
        backgroundColor: '#00000088',
        padding: { x: 10, y: 6 },
        align: 'center',
      })
      // Az origin SZÁNDÉKOSAN (0, 0), nem (0.5, 0.5) — a középre igazítást a `show()`
      // számolja ki EGÉSZ pixelre. Lásd az ott lévő indoklást: fél pixeles pozíció mellett
      // a felirat mozgó kamera alatt remeg.
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(HINT_DEPTH)
      .setAlpha(0);

    // Ugyanaz a takarítási minta, mint a ParallaxBackground/AudioManager esetében: a
    // rendszer maga iratkozik fel a scene shutdownjára, a scene-nek nincs teendője.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** A scene minden frame-ben meghívja a player aktuális X-ével. */
  update(playerX: number): void {
    for (const hint of this.hints) {
      if (this.shown.has(hint.id)) continue;
      if (playerX < hint.triggerX) continue;

      this.shown.add(hint.id);
      this.show(hint.text);
    }
  }

  private show(message: string): void {
    // Ha egy korábbi felirat még fadel, azt elvágjuk — két súgó sosem takarja egymást.
    this.activeTween?.stop();

    this.text.setText(message).setAlpha(0);
    this.centerText();

    // hold + yoyo: befadel, áll, majd ugyanazzal a tweennel kifadel — ugyanaz a minta,
    // mint a BossScene boss-nevénél.
    this.activeTween = this.scene.tweens.add({
      targets: this.text,
      alpha: 1,
      duration: HINT_FADE_IN_MS,
      hold: HINT_HOLD_MS,
      yoyo: true,
    });
  }

  /**
   * A felirat középre igazítása EGÉSZ pixelre — ez a „remegő súgó" javítása.
   *
   * A hiba oka a Phaser kamera-matematikája: a `setScrollFactor(0)` objektum végső
   * pozíciója `copyWithScrollFactorFrom()`-ban `scrollX * (1 - 0)` hozzáadásával, majd a
   * kamera saját eltolásának levonásával áll elő — a kamera `scrollX`-e viszont a
   * `startFollow` lerpje miatt TÖRT szám, és a kettő kiejtése lebegőpontos maradékot hagy.
   * A `pixelArt: true` bekapcsolja a `roundPixels`-t, ami a végeredményt kerekíti: ha az
   * pontosan fél pixelre esik, a maradék frame-enként átbillenti a kerekítést -> 1 px-es
   * vízszintes remegés. Ez akkor áll le, amikor a kamera beáll (a player megáll) — pontosan
   * ezt írta le a kézi teszt.
   *
   * `origin 0.5` mellett a pozíció `HINT_X - displayWidth / 2`, tehát PÁRATLAN
   * szövegszélességnél mindig fél pixelre esik. Egész originnel + kerekített pozícióval a
   * probléma fogalmilag megszűnik, a látvány (középre igazítás) pedig változatlan.
   *
   * **Ugyanez a csapda vár minden `setOrigin(0.5)` + `setScrollFactor(0)` feliratra** — a
   * meglévők (ajtó-/checkpoint-prompt) csak azért nem remegnek láthatóan, mert álló
   * kamera mellett jelennek meg.
   */
  private centerText(): void {
    this.text.setPosition(
      Math.round(HINT_X - this.text.displayWidth / 2),
      Math.round(HINT_Y - this.text.displayHeight / 2)
    );
  }

  destroy(): void {
    this.activeTween?.stop();
    this.activeTween = null;
  }
}
