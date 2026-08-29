import type Phaser from 'phaser';
import { DECOR_DEPTH } from './LevelTileset';
import { BUILDING_DEPTH } from './GothicTownTileset';
import {
  BUILDING_SINK_PX,
  decorPropTint,
  surfaceSpan,
  type BuildingDef,
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
 *  - **`DECOR_DEPTH` (-10)** — a parallax rétegek (-30..-20) és a háttér-épületek (-15) ELŐTT,
 *    de a terrain (-5) és minden gameplay-elem (0) MÖGÖTT: a player és az enemyk elmennek
 *    előttük.
 *  - **tint** — `decorPropTint()`: alapból a textúráé (`PROP_ASSETS`), de a placement
 *    felülírhatja. Erre azért van szükség, mert ugyanaz a prop két pályán két palettába
 *    kerül: a Level 1 cathedral-tónusában korrekciót kíván, a Level 2-n viszont — ami MAGA
 *    a propok forráscsomagja — a nyers szín a helyes (`PROP_TINT_NONE`).
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
      .setTint(decorPropTint(def))
      .setDepth(DECOR_DEPTH);
  });
}

/**
 * Háttér-épületek (Level 2) — ugyanaz a „tisztán díszlet" szerződés, mint a propoknál
 * (nincs body, nincs osztály, nincs életciklus), három eltéréssel, amiért külön factory:
 *
 *  - **`BUILDING_DEPTH` (-15)** — a város-sziluett (-25) ELŐTT, de a hangulati propok (-10)
 *    MÖGÖTT. Ettől áll össze a mélységsor: sziluett -> ház -> szekér/láda -> player.
 *  - **`BUILDING_SINK_PX`** — a ház talpa 2 px-rel a felszín ALÁ kerül. MÉRT érték a csomag
 *    saját preview-jából; ettől "a földben áll" a ház, nem rá van ragasztva.
 *  - **tint NINCS** — a Level 2 a házak natív palettája.
 *
 * A `flipX` három textúrából hatféle sziluettet ad, ami egy 7200 px-es pályán érezhető.
 */
export function createBackdropBuildings(
  scene: Phaser.Scene,
  defs: BuildingDef[],
  level: LevelGeometry
): Phaser.GameObjects.Image[] {
  return defs.map((def) => {
    const surface = surfaceSpan(level, def.surfaceId);

    return scene.add
      .image(def.x, surface.top + BUILDING_SINK_PX, def.texture)
      .setOrigin(0.5, 1)
      .setFlipX(def.flipX === true)
      .setDepth(BUILDING_DEPTH);
  });
}
