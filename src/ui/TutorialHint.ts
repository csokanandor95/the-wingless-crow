import Phaser from 'phaser';
import type { TutorialHintDef } from '../levels/Level1Layout';

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
      })
      .setOrigin(0.5)
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

  destroy(): void {
    this.activeTween?.stop();
    this.activeTween = null;
  }
}
