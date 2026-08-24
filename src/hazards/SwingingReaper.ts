import Phaser from 'phaser';
import type { SwingingReaperDef } from '../levels/Level1Layout';

/**
 * Lengő kasza (Level 1, F szakasz) — az első MOZGÓ, időzítés-alapú hazard.
 *
 * A mozgás magja szándékosan PURE függvény (`swingAngleAt`), a
 * `ParallaxBackground.tilePositionForScroll()` mintájára: így a lengés Phaser
 * GameObject-ek mockolása nélkül unit-tesztelhető.
 *
 * **Determinisztikus, `Phaser.Math.Between` NÉLKÜL** — ugyanaz az elv, amiért a boss
 * támadás-választása is determinisztikus: a spec kifejezetten megköveteli
 * („Movement is deterministic"), és csak így tanulható meg a minta.
 *
 * A sebzést NEM ez az osztály osztja: a `hitsPlayer()` csak eldönti, hogy a penge eltalálja-e
 * a playert, a sebzést a scene alkalmazza a MEGOSZTOTT `HazardDamageGate`-en át — ugyanaz a
 * delegálási minta, mint a lövedékeknél és a tüskéknél.
 */

/** Egy kasza-találat sebzése. Magasabb, mint a tüskéé (15): ez már nem tutorial. */
export const REAPER_DAMAGE = 20;

/**
 * Találati sugár a penge KÖZÉPPONTJÁTÓL a player középpontjáig. A rajzolt penge ~34px
 * széles, tehát a 24-es sugár nagyjából a grafika kiterjedése — ugyanaz az elv, mint a
 * player kard-hitboxánál: a hitbox az animációból/grafikából származik, nem szabad szám.
 */
export const REAPER_HIT_RADIUS = 24;

/** A lánc vastagsága és színe (placeholder). */
const CHAIN_WIDTH = 3;
const CHAIN_COLOR = 0x4a4450;

/**
 * A penge és a lánc a player ELŐTT rajzolódik (a player depth-je 0). Ez szándékos: a
 * fenyegetésnek akkor is olvashatónak kell lennie, amikor a player épp alatta ugrik át.
 */
const REAPER_DEPTH = 1;

/**
 * A kitérés szöge az eltelt idő függvényében, a függőlegestől mérve (pozitív = JOBBRA).
 *
 *     angle(t) = maxAngle · cos( 2π · (t + phase) / period )
 *
 * A koszinusz miatt `t = 0`-nál a penge a JOBB szélsőállásban áll (nem középen), tehát a
 * pálya betöltésekor a player egy teljes, tiszta lengést lát végig, mielőtt odaérne.
 */
export function swingAngleAt(
  elapsedMs: number,
  periodMs: number,
  maxAngleRad: number,
  phaseMs = 0
): number {
  return maxAngleRad * Math.cos((2 * Math.PI * (elapsedMs + phaseMs)) / periodMs);
}

/** A penge középpontja adott kitérésnél. A kötél a függőlegestől `angle`-lel tér ki. */
export function bladePositionAt(
  def: SwingingReaperDef,
  angleRad: number
): { x: number; y: number } {
  return {
    x: def.anchorX + def.ropeLength * Math.sin(angleRad),
    y: def.anchorY + def.ropeLength * Math.cos(angleRad),
  };
}

export default class SwingingReaper {
  private readonly def: SwingingReaperDef;
  private readonly maxAngleRad: number;
  private readonly chain: Phaser.GameObjects.Graphics;
  private readonly blade: Phaser.GameObjects.Image;

  private elapsedMs = 0;
  private bladeX: number;
  private bladeY: number;

  constructor(scene: Phaser.Scene, def: SwingingReaperDef) {
    this.def = def;
    this.maxAngleRad = (def.maxAngleDeg * Math.PI) / 180;

    scene.add.image(def.anchorX, def.anchorY, 'hazard-anchor-placeholder').setDepth(REAPER_DEPTH);

    this.chain = scene.add.graphics().setDepth(REAPER_DEPTH);
    this.blade = scene.add
      .image(def.anchorX, def.anchorY + def.ropeLength, 'reaper-blade-placeholder')
      .setDepth(REAPER_DEPTH);

    const start = bladePositionAt(def, swingAngleAt(0, def.periodMs, this.maxAngleRad, def.phaseMs));
    this.bladeX = start.x;
    this.bladeY = start.y;
    this.redraw(swingAngleAt(0, def.periodMs, this.maxAngleRad, def.phaseMs));
  }

  /** A scene minden frame-ben meghívja a frame-idővel. */
  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;

    const angle = swingAngleAt(
      this.elapsedMs,
      this.def.periodMs,
      this.maxAngleRad,
      this.def.phaseMs
    );

    const position = bladePositionAt(this.def, angle);
    this.bladeX = position.x;
    this.bladeY = position.y;

    this.redraw(angle);
  }

  private redraw(angleRad: number): void {
    this.chain.clear();
    this.chain.lineStyle(CHAIN_WIDTH, CHAIN_COLOR, 1);
    this.chain.lineBetween(this.def.anchorX, this.def.anchorY, this.bladeX, this.bladeY);

    this.blade.setPosition(this.bladeX, this.bladeY);

    // A Phaser rotation-je az óramutató járásával EGYEZŐ (a képernyő y-a lefelé nő), ezért
    // egy lefelé lógó sprite-ot `-angle`-lel kell forgatni, hogy a kötél irányába álljon:
    // a (0,1) lefelé vektorból `r` forgatás (-sin r, cos r)-t csinál, nekünk pedig
    // (sin angle, cos angle) kell -> r = -angle.
    this.blade.setRotation(-angleRad);
  }

  /**
   * Eltalálja-e a penge a megadott pontot? Sugár-alapú, mint a
   * `CrowHarvester.resolveAttackHit()` és a boss `CHARGE_HIT_RANGE`-e — a projektben ez a
   * bevett közelharci találat-ellenőrzés, nem külön physics body.
   */
  hitsPlayer(playerX: number, playerY: number): boolean {
    return (
      Phaser.Math.Distance.Between(this.bladeX, this.bladeY, playerX, playerY) <=
      REAPER_HIT_RADIUS
    );
  }

  destroy(): void {
    this.chain.destroy();
    this.blade.destroy();
  }
}
