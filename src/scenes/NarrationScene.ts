import Phaser from 'phaser';

/**
 * Adatvezérelt szöveges átvezető. Szándékosan NEM "boss utáni" scene: ugyanez kell majd
 * a Phase 9 introhoz és az endinghez is, ezért a tartalmat a hívó adja át
 * `scene.start('NarrationScene', { ... })`-szel.
 */
export interface NarrationData {
  /** Egy "képernyőnyi" szöveg soronként; a `\n` a bekezdésen belüli tördelés. */
  lines: string[];
  /** Melyik scene induljon az utolsó sor után. */
  nextScene: string;
  /** Opcionális fejléc (pl. fejezetcím) a szöveg felett. */
  title?: string;
}

const DEFAULT_DATA: NarrationData = {
  lines: ['...'],
  nextScene: 'Level1Scene',
};

const TYPE_SPEED_MS = 32;
const FADE_MS = 700;
const TEXT_WRAP_WIDTH = 620;

export default class NarrationScene extends Phaser.Scene {
  private narration: NarrationData = DEFAULT_DATA;

  private bodyText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  private currentLine = 0;
  private revealedChars = 0;
  private typeEvent?: Phaser.Time.TimerEvent;
  private isFinishing = false;

  constructor() {
    super('NarrationScene');
  }

  // Védekező default: közvetlen (adat nélküli) indításnál se szálljon el a scene.
  init(data?: Partial<NarrationData>): void {
    this.narration = {
      lines: data?.lines?.length ? data.lines : DEFAULT_DATA.lines,
      nextScene: data?.nextScene ?? DEFAULT_DATA.nextScene,
      title: data?.title,
    };
  }

  create(): void {
    // A class field initializerek csak az első létrehozáskor futnak — minden újbóli
    // belépésnél explicit alaphelyzet kell (CLAUDE.md "Fontos technikai tanulságok" 3.).
    this.currentLine = 0;
    this.revealedChars = 0;
    this.typeEvent = undefined;
    this.isFinishing = false;

    this.cameras.main.setBackgroundColor('#07070a');
    this.cameras.main.fadeIn(FADE_MS);

    const centerX = this.scale.width / 2;

    if (this.narration.title) {
      this.add
        .text(centerX, 90, this.narration.title, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#6a5a6a',
        })
        .setOrigin(0.5);
    }

    this.bodyText = this.add
      .text(centerX, this.scale.height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ddd6cc',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: TEXT_WRAP_WIDTH },
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(centerX, this.scale.height - 46, '▼  Space: Continue   ·   Esc: Skip', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#5a5560',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.tweens.add({
      targets: this.hintText,
      alpha: 0.35,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    const keyboard = this.input.keyboard;
    if (keyboard) {
      // A KeyboardPlugin a scene leállásakor magától leiratkoztat, ezért itt nem kell
      // kézzel takarítani (nem duplikálódnak a listenerek újbóli belépéskor sem).
      keyboard.on('keydown-SPACE', () => this.advance());
      keyboard.on('keydown-ENTER', () => this.advance());
      keyboard.on('keydown-ESC', () => this.finish());
    }

    // TODO (Phase 8): narration ambient — halk, lecsengő zene az átvezető alatt.
    this.showLine(0);
  }

  private showLine(index: number): void {
    this.currentLine = index;
    this.revealedChars = 0;
    this.bodyText.setText('');
    this.hintText.setVisible(false);

    this.typeEvent?.remove();
    this.typeEvent = this.time.addEvent({
      delay: TYPE_SPEED_MS,
      loop: true,
      callback: () => this.revealNextChar(),
    });
  }

  private revealNextChar(): void {
    const line = this.narration.lines[this.currentLine];
    this.revealedChars++;
    this.bodyText.setText(line.slice(0, this.revealedChars));

    if (this.revealedChars >= line.length) this.completeLine();
  }

  private completeLine(): void {
    this.typeEvent?.remove();
    this.typeEvent = undefined;
    this.bodyText.setText(this.narration.lines[this.currentLine]);
    this.hintText.setVisible(true);
  }

  /** Space/Enter: gépelés közben azonnal teljes sor, kész sornál a következő sor. */
  private advance(): void {
    if (this.isFinishing) return;

    if (this.typeEvent) {
      this.completeLine();
      return;
    }

    if (this.currentLine + 1 < this.narration.lines.length) {
      this.showLine(this.currentLine + 1);
      return;
    }

    this.finish();
  }

  private finish(): void {
    if (this.isFinishing) return;
    this.isFinishing = true;

    this.typeEvent?.remove();
    this.typeEvent = undefined;

    // FADE_OUT_COMPLETE, nem a fadeOut callbackje: utóbbi a fade MINDEN frame-jén lefutna.
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(this.narration.nextScene);
    });
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  }
}
