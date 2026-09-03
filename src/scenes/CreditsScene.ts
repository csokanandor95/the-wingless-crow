import Phaser from 'phaser';

/**
 * A játék záró képernyője: köszönet + a felhasznált assetek és zenék szerzői.
 *
 * A TARTALOM EGYELŐRE PLACEHOLDER (user-döntés: "a részleteit majd egy későbbi iterációban").
 * A lista a `2D helper/Credits.txt` gyűjtéséből indul; a végleges szöveg — és a még nyitott
 * licenc-tételek lezárása — külön kör. A csere ennek az egyetlen tömbnek a szerkesztése.
 *
 * Ez a scene zárja a lánccal a kört is: a végén a `Space` a FŐMENÜBE tesz vissza. **Új játékot
 * innen már NEM indítunk**, és a registryt sem ez takarítja: mindkettő a `MainMenuScene`
 * „Start Game"-jének a dolga (`systems/GameProgress.ts`) — ott kezdődik ténylegesen egy futás,
 * és a menübe a credits felől is, a menüből indítva is ugyanaz az út vezet.
 */

const SCROLL_SPEED_PX_PER_SEC = 26;
const FADE_MS = 700;
const TITLE_FONT_SIZE = '26px';
const LINE_FONT_SIZE = '14px';
const SECTION_FONT_SIZE = '13px';

interface CreditLine {
  /** Szakasz-fejléc (kiemelt), vagy sima sor. */
  section?: boolean;
  text: string;
}

const CREDITS: CreditLine[] = [
  { text: 'Thank you for playing.' },
  { text: '' },
  { text: 'THE WINGLESS CROW' },
  { text: '' },
  { text: '' },
  { section: true, text: 'CHARACTERS' },
  { text: 'Lazar, the Crowmarked — Szadi art (2D Soulslike Character)' },
  { text: 'The Flamekeeper — GandalfHardcore (FREE NPC: Goddess)' },
  { text: 'Crow Harvester — Szadi art (Animated Character Pack)' },
  { text: 'Gravecaller — oco (Medieval Fantasy Character Pack 6)' },
  { text: 'Beast / The Beast Master — Omni-Machina (Goatman)' },
  { text: 'The Grafted Wing-Breaker — Clembod (Bringer of Death)' },
  { text: 'The Mad King — LuizMelo (Medieval King Pack 2)' },
  { text: 'Ancient Demon — Kronovi- (Undead Executioner)' },
  { text: '' },
  { section: true, text: 'ENVIRONMENT' },
  { text: 'Level 1 — Szadi art (Pixel Platformer: Castle)' },
  { text: 'Level 2 — Luis Zuno / @ansimuz (GothicVania Town)' },
  { text: 'Level 3 — Luis Zuno / @ansimuz (GothicVania Church)' },
  { text: 'Ambient props — Luis Zuno / @ansimuz (GothicVania Town)' },
  { text: 'Opening shrine — AI-generated background painting (ChatGPT)' },
  // A NÉGY boss-aréna háttere SZÁNDÉKOSAN hiányzik innen: azok a képek önálló fájlként,
  // szerző és licenc nélkül érkeztek (nyitott jogi tétel, lásd CLAUDE.md). Ide csak akkor
  // kerülhet sor, ha a forrásuk tisztázódott — kitalált attribúció rosszabb a hiánynál.
  { text: '' },
  { section: true, text: 'MUSIC' },
  { text: 'Ashen Path — cloud1789 (Ashfall: Dark Fantasy Stream Pack)' },
  { text: 'Elkmire Keep — Lisette Amago (Free Dark Fantasy Music)' },
  { text: 'Library of Veles — Lisette Amago (Free Dark Fantasy Music)' },
  { text: 'Whispers of the Abyss — AlkaKrab' },
  { text: 'Eclipsed Desolation — AlkaKrab' },
  { text: 'Shadowforge Convergence — AlkaKrab' },
  { text: 'Cursed Citadel — AlkaKrab' },
  { text: 'Dread March — AlkaKrab' },
  { text: 'Veil of Eternal Nightfall — AlkaKrab' },
  { text: '' },
  { section: true, text: 'SOUND' },
  { text: 'Combat and movement SFX — TomMusic (Free Fantasy SFX Pack)' },
  { text: 'Player death — VoiceBosch (Death Sounds Male)' },
  { text: 'Monster vocals — Lazy Spartan Games' },
  { text: '' },
  { section: true, text: 'MADE BY' },
  { text: 'Csóka Nándor' },
  { text: 'Phaser 4 · Vite · TypeScript' },
];

export default class CreditsScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private hintText!: Phaser.GameObjects.Text;

  /** Ameddig a görgetés tart — ennél a pozíciónál áll meg a lista. */
  private scrollEndY = 0;
  private finished = false;

  constructor() {
    super('CreditsScene');
  }

  create(): void {
    // A class field initializerek csak az első létrehozáskor futnak — minden újbóli
    // belépésnél explicit alaphelyzet kell (CLAUDE.md "Fontos technikai tanulságok" 3.).
    this.finished = false;
    this.scrollEndY = 0;

    this.cameras.main.setBackgroundColor('#07070a');
    this.cameras.main.fadeIn(FADE_MS);

    const centerX = this.scale.width / 2;
    const height = this.scale.height;

    this.content = this.add.container(centerX, height);

    let cursorY = 0;
    this.content.add(
      this.add
        .text(0, cursorY, 'THANKS FOR PLAYING', {
          fontFamily: 'monospace',
          fontSize: TITLE_FONT_SIZE,
          color: '#e8d8e8',
        })
        .setOrigin(0.5, 0)
    );
    cursorY += 56;

    for (const line of CREDITS) {
      if (line.text.length > 0) {
        this.content.add(
          this.add
            .text(0, cursorY, line.text, {
              fontFamily: 'monospace',
              fontSize: line.section ? SECTION_FONT_SIZE : LINE_FONT_SIZE,
              color: line.section ? '#c9a24a' : '#ddd6cc',
              align: 'center',
            })
            .setOrigin(0.5, 0)
        );
      }
      cursorY += line.section ? 30 : 22;
    }

    // A lista addig görög, amíg az UTOLSÓ sora a képernyő közepe fölé nem ér — ott áll meg,
    // hogy az „új játék" súgó mellett a záró blokk olvasható maradjon.
    this.scrollEndY = height / 2 - cursorY + 40;

    this.hintText = this.add
      .text(centerX, height - 34, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#5a5560',
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: this.hintText, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
    this.hintText.setText('▼  Space: Speed up');

    const keyboard = this.input.keyboard;
    if (keyboard) {
      // A KeyboardPlugin a scene leállásakor magától leiratkoztat (a NarrationScene mintája).
      keyboard.on('keydown-SPACE', () => this.advance());
      keyboard.on('keydown-ENTER', () => this.advance());
      keyboard.on('keydown-ESC', () => this.skipToEnd());
    }
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    this.content.y -= (SCROLL_SPEED_PX_PER_SEC * delta) / 1000;
    if (this.content.y <= this.scrollEndY) this.skipToEnd();
  }

  /** Space/Enter: görgetés közben a végére ugrik, a végén a főmenübe tesz vissza. */
  private advance(): void {
    if (!this.finished) {
      this.skipToEnd();
      return;
    }
    this.returnToMenu();
  }

  private skipToEnd(): void {
    if (this.finished) return;
    this.finished = true;
    this.content.y = this.scrollEndY;
    this.hintText.setText('Space: Main menu');
  }

  /**
   * Vissza a főmenübe — akkor is, ha a játékos a menüből nyitotta meg a creditset, és akkor is,
   * ha a végigjátszás után jutott ide. Az ÚJ JÁTÉK (és vele a registry takarítása) onnan indul,
   * a `Start Game`-mel.
   */
  private returnToMenu(): void {
    // FADE_OUT_COMPLETE, nem a fadeOut() callbackje: utóbbi a fade MINDEN frame-jén lefutna
    // (CLAUDE.md 4. tanulság).
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MainMenuScene');
    });
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  }
}
