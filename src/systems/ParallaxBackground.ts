import Phaser from 'phaser';
import { GROUND_TOP } from '../levels/LevelGeometry';

// --- Forrás-geometria -------------------------------------------------------
// Mindhárom réteg ugyanabból a csomagból jön (PixelPlatformerSet1 v1.1 / Szadi art),
// és mind 426x384-es. A 01 réteg RGB (átlátszatlan ég), a 02/03 RGBA (sziluett, felül
// átlátszó). Mindhárom VÍZSZINTESEN VARRATMENTESEN csempézhető (a bal és a jobb szél
// alpha-profilja legfeljebb 1-2 sorban tér el).

export const SOURCE_WIDTH = 426;
export const SOURCE_HEIGHT = 384;

/**
 * = a main.ts `height`-je. A rétegek `scrollFactor(0)`-val a KAMERÁHOZ vannak rögzítve,
 * tehát a viewport magassága a mérvadó, nem a Level1Scene WORLD_HEIGHT-ja (a kettő
 * jelenleg egyébként megegyezik).
 */
export const VIEWPORT_HEIGHT = 450;

export const BACKGROUND_TEXTURES = {
  SKY: 'bg-sky',
  MOUNTAINS: 'bg-mountains',
  RUINS: 'bg-ruins',
  /**
   * A boss aréna háttere — NEM parallax réteg, hanem egyetlen álló, teljes képernyős kép
   * (a BossScene kamerája fix, nincs mit eltolni). Csak azért él itt, hogy a háttér-textúra
   * kulcsoknak egyetlen forrása legyen, amit a BootScene betölthet.
   */
  BOSS_ARENA: 'bg-boss-arena',
  /** Boss 2 aréna (trónterem) — szintén egyetlen álló kép, lásd Boss2Scene. */
  BOSS2_ARENA: 'bg-boss2-arena',
  /** Final boss aréna (The Broken Gate) — szintén egyetlen álló kép, lásd FinalBossScene. */
  FINAL_ARENA: 'bg-final-arena',
  /**
   * A nyitó szentély (`PreScene`) — szintén egyetlen álló kép, fix kamerával. A háttéren egy
   * SZÁRNYAS angyalszobor: pont az, amit Lazarus elvesztett.
   */
  PRE_SCENE: 'bg-pre-scene',
  /** Level 2 (GothicVania Town) — lásd `LEVEL2_BACKGROUND_LAYERS`. */
  TOWN_SKY: 'bg-town-sky',
  TOWN: 'bg-town',
} as const;

// --- Réteg-definíció --------------------------------------------------------

export interface ParallaxLayerDef {
  texture: string;
  /** 0 = együtt áll a kamerával, 1 = együtt mozog a világgal. */
  scrollFactor: number;
  depth: number;
  /** A réteg felső éle a viewportban (a kamerához képest, nem világkoordináta). */
  top: number;
  height: number;
  /**
   * true -> a 384px-es forrás függőlegesen a `height`-re nyúlik. Csak az égnél
   * használjuk: az egy közel egyenletes színátmenet (#673838 -> #724141), amin a
   * nyújtás nem látszik. A sziluetteket 1:1-ben hagyjuk, hogy a peremük éles maradjon.
   */
  stretch: boolean;
}

// --- Level 1 réteg-terv -----------------------------------------------------
// A sziluettek alsó éle szándékosan a képernyő alja ALÁ lóg: így a horizont lejjebb
// kerül, és a városrom tömör alsó része (ami a forráson a kép 40%-a) nagyrészt a talaj
// mögé esik ahelyett, hogy nagy sima sávot tenne a játéktér mögé.
//
// Ebből adódó képernyő-koordináták: hegycsúcsok ~289, városrom teteje ~319, a sima sáv
// a talajig (Level1Scene GROUND_TOP = 418) csak ~65px.
const SILHOUETTE_BOTTOM_Y = 510;
const SILHOUETTE_TOP = SILHOUETTE_BOTTOM_Y - SOURCE_HEIGHT; // 126

/**
 * A kamera 0..2400-ig görget a Level 1-en, tehát a városrom ~2.8x, a hegyek ~1.7x,
 * az ég ~0.6x ismétlődik végig — egyik minta sem válik feltűnővé.
 *
 * A `depth` és a `scrollFactor` EGYÜTT nő: a távolabbi réteg lassabb ÉS hátrébb van.
 * A legközelebbi háttér-réteg is -20-on marad, ami minden meglévő Level1Scene elem
 * (létra hátfal -2, létra/ajtó -1, talaj/platform/player/enemy/HUD 0) alatt van.
 */
export const LEVEL1_BACKGROUND_LAYERS: ParallaxLayerDef[] = [
  {
    texture: BACKGROUND_TEXTURES.SKY,
    scrollFactor: 0.1,
    depth: -30,
    top: 0,
    height: VIEWPORT_HEIGHT,
    stretch: true,
  },
  {
    texture: BACKGROUND_TEXTURES.MOUNTAINS,
    scrollFactor: 0.3,
    depth: -25,
    top: SILHOUETTE_TOP,
    height: SOURCE_HEIGHT,
    stretch: false,
  },
  {
    texture: BACKGROUND_TEXTURES.RUINS,
    scrollFactor: 0.5,
    depth: -20,
    top: SILHOUETTE_TOP,
    height: SOURCE_HEIGHT,
    stretch: false,
  },
];

// --- Level 2 réteg-terv -----------------------------------------------------
//
// A Level 1-től eltérően EGYIK réteg sem nyúlik függőlegesen. A forráscsomag
// (GothicVania Town) rétegei 384x288-asok, és felhőket + hegygerincet tartalmaznak, amiken
// egy 288 -> 450-es (1.5625x) nyújtás láthatóan torzítana. Helyette a KÉT PNG már
// származtatva 450 magas: a forrás alsó sávja mindkettőn BITRE AZONOS sorokból áll
// (`background.png` 186-287 = `#71405A`, `middleground.png` 236-287 = `#392D55`), tehát a
// lefelé toldás pixelre pontos, és a pixelsűrűség 1:1 marad a karakterekével.
//
// A város-sziluett textúrája 768 széles: [forrás | vízszintesen tükrözött forrás]. A nyers
// 384-es réteg NEM varratmentes (a bal él sziluett-teteje 55-100, a jobbé 117), a tükrözés
// viszont mindkét átmenetet duplázott oszlopra viszi -> láthatatlan. Az ára egy
// tükör-szimmetria, ami egy 0.3-as scrollFactorú, távoli sziluetten nem tűnik fel.

/** MÉRT: a város-sziluett első TELJESEN átlátszatlan sora a forrásban. */
const TOWN_SOLID_ROW = 176;

/**
 * A sziluett TÖMÖR alapja ennyivel a talaj fölött kezdődik.
 *
 * **Ez a Level 2 EGYETLEN hangolópontja a horizontra** — a Level 1 `SILHOUETTE_BOTTOM_Y`-jának
 * megfelelője. Az érték a Level 1 arányaiból jön (ott a városrom sziluettje ~99 px-szel a
 * talaj fölött válik tömörré), és ebből adódik a képernyő-kompozíció:
 *
 *     0-135    felhők
 *     136-175  hegygerinc
 *     175-318  város-sziluett a világos égsáv előtt
 *     318-418  tömör sötét alapsáv   <- ezt töltik ki a világ-koordinátás házak
 *     418-450  talaj
 */
const TOWN_SOLID_BAND_PX = 100;

/** LEVEZETETT: a sziluett-réteg felső éle a viewportban. */
export const TOWN_TOP = GROUND_TOP - TOWN_SOLID_BAND_PX - TOWN_SOLID_ROW;

export const LEVEL2_BACKGROUND_LAYERS: ParallaxLayerDef[] = [
  {
    texture: BACKGROUND_TEXTURES.TOWN_SKY,
    scrollFactor: 0.1,
    depth: -30,
    top: 0,
    height: VIEWPORT_HEIGHT,
    stretch: false,
  },
  {
    texture: BACKGROUND_TEXTURES.TOWN,
    scrollFactor: 0.3,
    depth: -25,
    top: TOWN_TOP,
    height: VIEWPORT_HEIGHT - TOWN_TOP,
    stretch: false,
  },
];

/**
 * A réteg textúra-eltolása a kamera scrollX-éből. Szándékosan PURE, hogy Phaser
 * GameObject-ek mockolása nélkül unit-tesztelhető legyen.
 *
 * A `Math.round()` KÖTELEZŐ: pixelArt módban a tört `tilePositionX` a nearest-neighbor
 * mintavétel miatt frame-enként ugráló oszlopokat okoz a sziluettek peremén — a
 * `startFollow` lerpje miatt pedig a `scrollX` gyakorlatilag mindig tört. A
 * `pixelArt: true` `roundPixels`-e ezt NEM fedi le: az csak a GameObject transformját
 * kerekíti, a `tilePositionX` viszont shader-oldali textúra-offset.
 */
export function tilePositionForScroll(scrollX: number, scrollFactor: number): number {
  return Math.round(scrollX * scrollFactor);
}

interface ActiveLayer {
  sprite: Phaser.GameObjects.TileSprite;
  scrollFactor: number;
}

/**
 * Réteges parallax háttér. A rétegek `scrollFactor(0)`-val a kamerához vannak rögzítve,
 * a mozgást a `tilePositionX` adja — NEM világméretű tileSprite + `setScrollFactor(f)`.
 * Így a réteg mindig pontosan kitölti a képernyőt, függetlenül attól, milyen széles a
 * pálya, és nem kell a WORLD_WIDTH-hez méretezni.
 *
 * A hívó scene minden frame-ben meghívja az `update(camera.scrollX)`-et.
 */
export default class ParallaxBackground {
  private layers: ActiveLayer[] = [];

  constructor(scene: Phaser.Scene, defs: ParallaxLayerDef[]) {
    const camera = scene.cameras.main;

    for (const def of defs) {
      const sprite = scene.add
        .tileSprite(0, def.top, camera.width, def.height, def.texture)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(def.depth)
        .setTileScale(1, def.stretch ? def.height / SOURCE_HEIGHT : 1);

      this.layers.push({ sprite, scrollFactor: def.scrollFactor });
    }

    // A Phaser a scene leállásakor amúgy is megsemmisíti a display listát; ez csak a
    // saját referenciáinkat ejti el, hogy egy scene-restart után ne maradjon élő
    // hivatkozás már megsemmisített GameObject-ekre (lásd CLAUDE.md 3. tanulság).
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  update(scrollX: number): void {
    for (const layer of this.layers) {
      layer.sprite.tilePositionX = tilePositionForScroll(scrollX, layer.scrollFactor);
    }
  }

  destroy(): void {
    this.layers = [];
  }
}
