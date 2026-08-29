import Phaser from 'phaser';

/**
 * In-scene párbeszéd-szövegmező.
 *
 * Ez a modul tölti be a `docs/Project_plan.md` 20. pontjában tervezett `ui/Dialogue.ts`
 * slotot. FIGYELEM: a terv egy korábbi megjegyzése szerint a `NarrationScene` valószínűleg
 * kiváltotta volna — nem váltotta ki, mert a kettő MÁS:
 *
 *  - `NarrationScene`: teljes képernyős, saját scene, KÉZZEL léptetett (Space/Enter), a
 *    pályák KÖZÖTT fut. Nincs beszélő, nincs látvány mögötte.
 *  - `Dialogue` (ez): egy futó scene-en BELÜL, a szereplők előtt, beszélő-névvel, és
 *    MAGÁTÓL megy le — a nyíl csak gyorsít rajta.
 *
 * A modul input-független: a billentyűt a hívó scene köti az `advance()`-re. Az időt is a
 * scene adja (`update(deltaMs)`), nem egy `time.addEvent` — így a `SwingingReaper` mintájára
 * a mag PURE és mockolás nélkül unit-tesztelhető.
 */

export interface DialogueLine {
  /** Ki beszél (a panel fejléce). */
  speaker: string;
  /** A sor szövege. Legfeljebb 2 sorra tördelődhet a panel wrap-szélességén. */
  text: string;
}

/** Egy karakter megjelenítési ideje. */
export const TYPE_SPEED_MS = 28;
/** Meddig áll a KÉSZ sor, mielőtt magától továbblép. */
export const LINE_HOLD_MS = 1800;

// --- Pure mag ---------------------------------------------------------------
// A ParallaxBackground.tilePositionForScroll() és a SwingingReaper.swingAngleAt() precedense:
// a döntés-logika Phaser-mentes függvény, tehát mockolás nélkül bizonyítható.

/** Hány karakter látszik a sor kezdete óta eltelt idő alapján. */
export function charsRevealedAt(elapsedMs: number, typeSpeedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / typeSpeedMs);
}

/**
 * Lejárt-e a KÉSZ sor tartási ideje? A gépelés hossza `textLength * typeSpeedMs`, a tartás
 * ezután indul — tehát a kettő ÖSSZEGÉT nézzük, nem külön akkumulátort. Így a sorra fordított
 * teljes idő egyetlen `elapsedMs`-ből leolvasható, és a `skip`-elt (azonnal késszé tett) sor
 * kezelése is ugyanez a képlet, csak más kezdőértékkel.
 */
export function autoAdvanceDue(
  elapsedMs: number,
  textLength: number,
  typeSpeedMs: number,
  holdMs: number
): boolean {
  return elapsedMs >= textLength * typeSpeedMs + holdMs;
}

// --- Panel-geometria --------------------------------------------------------
// A panel LEVEZETETT, nem szemre rakott: a teteje a járható felszín ALATT van, tehát sosem
// takarja a beszélőket. A hívó adja a felszín Y-t (a Boss2Scene GROUND_TOP-ja).

const PANEL_MARGIN_X = 40;
const PANEL_GAP_ABOVE = 3;
const PANEL_HEIGHT = 72;
const PANEL_PADDING = 9;
const PANEL_DEPTH = 90;

const SPEAKER_FONT_SIZE = '12px';
const BODY_FONT_SIZE = '15px';
const HINT_FONT_SIZE = '11px';

export interface DialogueOptions {
  /** A járható felszín Y-ja; a panel EZ ALÁ kerül. */
  groundTop: number;
  /** A viewport szélessége (a panel ehhez igazodik). */
  viewportWidth: number;
}

export default class Dialogue {
  private readonly lines: DialogueLine[];
  private readonly onComplete: () => void;

  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly speakerText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;

  private lineIndex = 0;
  /** A JELENLEGI sor kezdete óta eltelt idő — ebből jön a gépelés ÉS az automata léptetés. */
  private elapsedMs = 0;
  private finished = false;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    lines: DialogueLine[],
    options: DialogueOptions,
    onComplete: () => void
  ) {
    this.lines = lines;
    this.onComplete = onComplete;

    const panelTop = options.groundTop + PANEL_GAP_ABOVE;
    const panelWidth = options.viewportWidth - PANEL_MARGIN_X * 2;

    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(PANEL_DEPTH);
    this.panel.fillStyle(0x000000, 0.72);
    this.panel.fillRect(PANEL_MARGIN_X, panelTop, panelWidth, PANEL_HEIGHT);
    this.panel.lineStyle(1, 0x6a5a6a, 0.9);
    this.panel.strokeRect(PANEL_MARGIN_X, panelTop, panelWidth, PANEL_HEIGHT);

    this.speakerText = scene.add
      .text(PANEL_MARGIN_X + PANEL_PADDING, panelTop + PANEL_PADDING - 2, '', {
        fontFamily: 'monospace',
        fontSize: SPEAKER_FONT_SIZE,
        color: '#c9a24a',
      })
      .setScrollFactor(0)
      .setDepth(PANEL_DEPTH + 1);

    this.bodyText = scene.add
      .text(PANEL_MARGIN_X + PANEL_PADDING, panelTop + PANEL_PADDING + 16, '', {
        fontFamily: 'monospace',
        fontSize: BODY_FONT_SIZE,
        color: '#ddd6cc',
        lineSpacing: 4,
        wordWrap: { width: panelWidth - PANEL_PADDING * 2 },
      })
      .setScrollFactor(0)
      .setDepth(PANEL_DEPTH + 1);

    this.hintText = scene.add
      .text(
        options.viewportWidth - PANEL_MARGIN_X - PANEL_PADDING,
        // A BESZÉLŐ SORÁBAN, jobbra zárva — NEM a panel alján. Ott ugyanis a szöveg második
        // (tördelt) sorába lógna bele: a body 15px-es sorai + a 4px lineSpacing a panel
        // aljáig érnek, a súgó pedig jobbra zárt, tehát egy hosszú második sor alá csúszna.
        panelTop + PANEL_PADDING - 2,
        '→  gyorsítás',
        {
          fontFamily: 'monospace',
          fontSize: HINT_FONT_SIZE,
          color: '#6a6270',
        }
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(PANEL_DEPTH + 1);

    // Ugyanaz a takarítási minta, mint a TutorialHint / AudioManager / ParallaxBackground
    // esetében: a rendszer maga iratkozik fel a scene shutdownjára, a scene-nek nincs teendője.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());

    this.renderCurrentLine();
  }

  /**
   * A scene minden frame-ben meghívja a delta-idővel.
   *
   * EGY hívás LEGFELJEBB EGY sort léptet — a `step()` nullázza az `elapsedMs`-t, és nincs
   * `while` ciklus. Ez szándékos: egy frame-akadás vagy egy háttérbe tett fül után a Phaser
   * több száz ms-os deltát ad, ami különben ÁTPÖRGETNE több sornyi párbeszédet, mielőtt a
   * player elolvashatná. A maradék idő ilyenkor "elvész", de a párbeszéd olvasható marad —
   * és ez a helyes csere.
   */
  update(deltaMs: number): void {
    if (this.finished || this.destroyed) return;

    this.elapsedMs += deltaMs;
    this.renderCurrentLine();

    const line = this.lines[this.lineIndex];
    if (autoAdvanceDue(this.elapsedMs, line.text.length, TYPE_SPEED_MS, LINE_HOLD_MS)) {
      this.step();
    }
  }

  /**
   * A nyíl-billentyű belépési pontja. Gépelés közben BEFEJEZI a sort, kész sornál a
   * KÖVETKEZŐRE lép — tehát nyomogatva végig lehet pörgetni a párbeszédet.
   */
  advance(): void {
    if (this.finished || this.destroyed) return;

    const line = this.lines[this.lineIndex];
    const typedChars = charsRevealedAt(this.elapsedMs, TYPE_SPEED_MS);

    if (typedChars < line.text.length) {
      // Ugrás a gépelés végére: onnantól a tartás ideje ketyeg, mint egy magától
      // végiggépelt sornál — nincs külön "skipped" állapot.
      this.elapsedMs = line.text.length * TYPE_SPEED_MS;
      this.renderCurrentLine();
      return;
    }

    this.step();
  }

  isFinished(): boolean {
    return this.finished;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.panel.destroy();
    this.speakerText.destroy();
    this.bodyText.destroy();
    this.hintText.destroy();
  }

  /** Következő sor, vagy a párbeszéd vége. */
  private step(): void {
    if (this.lineIndex + 1 < this.lines.length) {
      this.lineIndex++;
      this.elapsedMs = 0;
      this.renderCurrentLine();
      return;
    }

    // A finished flag ELŐBB áll be, mint ahogy az onComplete lefut: a callback tipikusan
    // scene-t vált vagy destroy()-t hív, és ilyenkor egy még futó update() sem léptethet.
    this.finished = true;
    this.destroy();
    this.onComplete();
  }

  private renderCurrentLine(): void {
    if (this.destroyed) return;

    const line = this.lines[this.lineIndex];
    const revealed = Math.min(charsRevealedAt(this.elapsedMs, TYPE_SPEED_MS), line.text.length);

    this.speakerText.setText(line.speaker);
    this.bodyText.setText(line.text.slice(0, revealed));
  }
}
