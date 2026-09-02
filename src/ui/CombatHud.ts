import Phaser from 'phaser';

/**
 * A player harci HUD-ja: HP + a két erőforrás-mérő (tűzgolyó-töltetek, heavy slash).
 *
 * Ez a modul váltja ki a HÉT scene-ben szó szerint duplikált `playerHpText` blokkot —
 * pontosan az a költöztetés, amit a `TutorialHint.ts` fejléce a Phase 8 `ui/`
 * iterációjának feladataként jegyez. A duplikáció megszüntetése itt nem esztétikai
 * kérdés volt: a két új mérőt különben ugyanúgy hétszer kellett volna bemásolni.
 *
 * A HP-sor FORMÁTUMA szándékosan betű szerint a régi (`HP: 100/100 | IDLE`): ez továbbra is
 * debug-kijelzés, a valódi, ikonos HUD külön iteráció.
 */

/**
 * A HUD MINDEN scene-ben ugyanazon a mélységen ül. Korábban a pályák depth nélkül, a boss
 * arénák 100-zal rakták ki a HP-szöveget; a 100 mindkét helyen biztonságos, mert a
 * projektben ez a legmagasabb használt érték (a `Dialogue` 90/91, a `TutorialHint` 50,
 * minden más terep/díszlet negatív).
 */
export const HUD_DEPTH = 100;

const HUD_X = 10;
const HP_Y = 10;

/** A mérők pipái egy oszlopba igazodnak, a feliratuktól jobbra. */
const METER_PIP_X = 62;
const FIREBALL_ROW_Y = 33;
const HEAVY_ROW_Y = 48;

const PIP_HEIGHT = 9;
const PIP_GAP = 4;
const FIREBALL_PIP_WIDTH = 16;
const HEAVY_PIP_WIDTH = 12;

/** A tűzgolyó-placeholder narancsa — a pipa és a lövedék így ugyanazt a nyelvet beszéli. */
const FIREBALL_COLOR = 0xff9a3c;
/**
 * A heavy aranya UGYANAZ az érték, mint a bossok `SLASH_TELEGRAPH_TINT`-je: a projektben az
 * arany következetesen azt jelenti, hogy „nagy kardcsapás". Telinél világosabb keret jelzi,
 * hogy a csapás elérhető.
 */
const HEAVY_COLOR = 0xffd070;
const HEAVY_READY_COLOR = 0xfff0c0;

const PIP_EMPTY_COLOR = 0x000000;
const PIP_EMPTY_ALPHA = 0.45;
const PIP_STROKE_ALPHA = 0.85;

/**
 * Amit a HUD a playerről tudni akar. SZÁNDÉKOSAN strukturális interfész, nem a `Player`
 * importja: így a `ui/` nem függ a `player/`-től (ugyanaz az irány, amiért a
 * `bindPlayerSfx()` is `EventEmitter`-t vesz), és a modul Player-mock nélkül tesztelhető.
 */
export interface CombatHudSource {
  getHP(): number;
  getMaxHP(): number;
  playerState: string;
  getFireballCharges(): number;
  getFireballMaxCharges(): number;
  getFireballRechargeProgress(): number;
  getHeavyCharge(): number;
  getHeavyChargeMax(): number;
}

/**
 * Egy tűzgolyó-pipa kitöltöttsége (0..1). PURE — a `Dialogue` magjának mintájára külön
 * tesztelhető, Phaser nélkül.
 *
 * A `charges` alatti pipák teljesek, a `charges`-edik a ÉPP TÖLTŐDŐ (részlegesen kitöltve),
 * a többi üres. Így a player látja, melyik töltet mikor tér vissza — ez a lényege annak,
 * hogy a töltetek egymástól függetlenül töltődnek.
 */
export function fireballPipFill(index: number, charges: number, progress: number): number {
  if (index < charges) return 1;
  if (index > charges) return 0;
  return progress < 0 ? 0 : progress > 1 ? 1 : progress;
}

/** Egy heavy-szegmens tele van-e. PURE. */
export function heavySegmentFilled(index: number, charge: number): boolean {
  return index < charge;
}

export default class CombatHud {
  private hpText: Phaser.GameObjects.Text;
  private fireballLabel: Phaser.GameObjects.Text;
  private heavyLabel: Phaser.GameObjects.Text;
  private meters: Phaser.GameObjects.Graphics;
  private destroyed = false;

  constructor(scene: Phaser.Scene) {
    this.hpText = scene.add
      .text(HUD_X, HP_Y, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.fireballLabel = this.createMeterLabel(scene, 'F', FIREBALL_ROW_Y);
    this.heavyLabel = this.createMeterLabel(scene, 'K/RMB', HEAVY_ROW_Y);

    this.meters = scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH);

    // Ugyanaz a takarítási minta, mint a TutorialHint/AudioManager esetében: a rendszer
    // maga iratkozik fel a scene shutdownjára, a scene-nek nincs teendője.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private createMeterLabel(
    scene: Phaser.Scene,
    label: string,
    rowY: number
  ): Phaser.GameObjects.Text {
    return scene.add
      .text(HUD_X, rowY - 3, label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9a9088',
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);
  }

  /**
   * A HUD ideiglenes elrejtése.
   *
   * A `Level1Scene` ház-párbeszéde az EGYETLEN a játékban, ami a képernyő TETEJÉRE rakja a
   * panelt (a pálya padlója 418, és `418 + PANEL_RESERVE_PX > 450`) — pont oda, ahol a HUD
   * ül, ráadásul a HUD magasabb mélységen. A négy boss-aréna panelje 369-nél van, azzal
   * nincs ütközés. A párbeszéd alatt a player amúgy is teljesen be van fagyasztva, tehát
   * nincs mit leolvasni a mérőkről.
   */
  setVisible(visible: boolean): void {
    if (this.destroyed) return;

    this.hpText.setVisible(visible);
    this.fireballLabel.setVisible(visible);
    this.heavyLabel.setVisible(visible);
    this.meters.setVisible(visible);
  }

  /** A scene minden frame-ben meghívja — a playert a hívó adja át, a HUD nem tárolja el. */
  update(source: CombatHudSource): void {
    if (this.destroyed) return;

    this.hpText.setText(
      `HP: ${source.getHP()}/${source.getMaxHP()} | ${source.playerState}`
    );

    this.meters.clear();
    this.drawFireballMeter(source);
    this.drawHeavyMeter(source);
  }

  private drawFireballMeter(source: CombatHudSource): void {
    const charges = source.getFireballCharges();
    const progress = source.getFireballRechargeProgress();
    const max = source.getFireballMaxCharges();

    for (let i = 0; i < max; i++) {
      const x = METER_PIP_X + i * (FIREBALL_PIP_WIDTH + PIP_GAP);
      this.drawPip(
        x,
        FIREBALL_ROW_Y,
        FIREBALL_PIP_WIDTH,
        fireballPipFill(i, charges, progress),
        FIREBALL_COLOR
      );
    }
  }

  private drawHeavyMeter(source: CombatHudSource): void {
    const charge = source.getHeavyCharge();
    const max = source.getHeavyChargeMax();
    const color = charge >= max ? HEAVY_READY_COLOR : HEAVY_COLOR;

    for (let i = 0; i < max; i++) {
      const x = METER_PIP_X + i * (HEAVY_PIP_WIDTH + PIP_GAP);
      this.drawPip(x, HEAVY_ROW_Y, HEAVY_PIP_WIDTH, heavySegmentFilled(i, charge) ? 1 : 0, color);
    }
  }

  private drawPip(x: number, y: number, width: number, fill: number, color: number): void {
    this.meters.fillStyle(PIP_EMPTY_COLOR, PIP_EMPTY_ALPHA);
    this.meters.fillRect(x, y, width, PIP_HEIGHT);

    if (fill > 0) {
      this.meters.fillStyle(color, 1);
      this.meters.fillRect(x, y, width * fill, PIP_HEIGHT);
    }

    // A fél pixeles eltolás nélkül a 1px-es keret a pixel-határra esne, és a pixel art
    // nearest-neighbor mintavétele mellett hol 1, hol 2 pixel vastagnak látszana.
    this.meters.lineStyle(1, color, PIP_STROKE_ALPHA);
    this.meters.strokeRect(x + 0.5, y + 0.5, width - 1, PIP_HEIGHT - 1);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.hpText.destroy();
    this.fireballLabel.destroy();
    this.heavyLabel.destroy();
    this.meters.destroy();
  }
}
