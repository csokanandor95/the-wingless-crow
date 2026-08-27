import type Phaser from 'phaser';
import { DECOR_DEPTH } from './LevelTileset';
import {
  PROP_ASSETS,
  surfaceSpan,
  type DecorPropDef,
  type LevelGeometry,
} from './LevelGeometry';

/**
 * Hangulati propok kirakása — nem ütköző háttér-dekoráció.
 *
 * Szándékosan NINCS physics body és NINCS saját osztály: ezek a propok tisztán díszletek,
 * a gameplay-re nulla hatással. A `SpikeField`-del ellentétben tehát nem kell életciklust
 * kezelni sem; a Phaser a scene shutdownjakor amúgy is megsemmisíti a display listát.
 *
 * A helper létezésének egyetlen oka, hogy a HÁROM együtt érvényes render-szabály
 * (`origin`, `depth`, `tint`) egy helyen legyen, és minden pályán ugyanúgy érvényesüljön.
 * A `level` paraméter ezért kell: a prop a `surfaceId`-je felszínére kerül, és azt a
 * megosztott `surfaceSpan()` az ADOTT pálya geometriájából oldja fel:
 *
 *  - **`origin (0.5, 1)`** — a prop a TALPÁNÁL van pozicionálva, tehát pontosan a felület
 *    felszínén áll. Középpontos originnél minden propnál kézzel kellene felezni a magasságot.
 *  - **`DECOR_DEPTH` (-10)** — a parallax rétegek (-30..-20) ELŐTT, de a terrain (-5) és
 *    minden gameplay-elem (0) MÖGÖTT: a player és az enemyk elmennek előttük.
 *  - **tint** — meleg + sötétítő korrekció, TEXTÚRÁNKÉNT (`PROP_ASSETS[...].tint`): a fa és a
 *    kő/vas propok nyers palettája érdemben eltér, lásd `Level1Layout.PROP_TINT_*`.
 *
 * A `Phaser` import szándékosan `import type`: ez a modul egyetlen Phaser futásidejű
 * szimbólumot sem használ, csak a kapott scene `add` factoryját.
 */
export default function createDecorProps(
  scene: Phaser.Scene,
  defs: DecorPropDef[],
  level: LevelGeometry
): Phaser.GameObjects.Image[] {
  return defs.map((def) => {
    const surface = surfaceSpan(level, def.surfaceId);

    return scene.add
      .image(def.x, surface.top, def.texture)
      .setOrigin(0.5, 1)
      .setFlipX(def.flipX === true)
      .setTint(PROP_ASSETS[def.texture].tint)
      .setDepth(DECOR_DEPTH);
  });
}
