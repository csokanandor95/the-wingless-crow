import type Phaser from 'phaser';
import {
  GROUND_CENTER_Y,
  GROUND_TOP,
  platformHasLegs,
  platformLeft,
  platformRight,
  platformTop,
  type GroundSegmentDef,
  type LevelGeometry,
  type PlatformDef,
} from './LevelGeometry';
import {
  GROUND_EDGE_WIDTH,
  GROUND_TILE_HEIGHT,
  PLATFORM_EDGE_WIDTH,
  PLATFORM_MIN_WIDTH_FOR_EDGES,
  PLATFORM_TILE_HEIGHT,
  TERRAIN_DEPTH,
  TILE_TEXTURES,
} from './LevelTileset';
import {
  TOWN_CAP_SIZE,
  TOWN_DECK_HEIGHT,
  TOWN_GROUND_TILE_HEIGHT,
  TOWN_LEG_TILE_WIDTH,
  TOWN_TERRAIN_TOP_Y,
  TOWN_TILE_TEXTURES,
} from './GothicTownTileset';
import {
  CHURCH_BLOCK_TILE_HEIGHT,
  CHURCH_GROUND_TILE_HEIGHT,
  CHURCH_TERRAIN_TOP_Y,
  CHURCH_TILE_TEXTURES,
} from './ChurchTileset';

/**
 * A talaj-szegmensek és a lebegő platformok felépítése — a `Level1Scene`-ből kiemelve, hogy a
 * Level 2 ugyanezt használhassa.
 *
 * ## A három skin
 *
 * - **`'cathedral'`** — a Level 1. A FIZIKA és a LÁTVÁNY külön objektum: a static spriteot
 *   vízszintesen skálázzuk (ami egy valódi csempe textúráját MEGNYÚJTANÁ), ezért az
 *   LÁTHATATLAN marad, és a látványt egy tileSprite + a két végzáró kép adja.
 * - **`'gothic-town'`** — a Level 2. Ugyanaz a szétválasztás, de más csempegeometriával, és
 *   a platformoknak KÉT változatuk van (állvány / konzol) — lásd `createTownPlatformVisual`.
 * - **`'church'`** — a Level 3, és a három közül a LEGEGYSZERŰBB: se végzáró, se láb, se
 *   szakadék-perem. Nem hiányosság, hanem a csempekészlet természete — lásd
 *   `createChurchPlatformVisual`.
 * - **`'placeholder'`** — tileset nélküli fallback. A fizikai sprite egyszerűen LÁTHATÓ
 *   marad, és nincs mellette külön látvány-objektum. Ez nem hanyagság: a placeholder textúra
 *   egyszínű téglalap, amit a vízszintes skálázás nem tud torzítani — tehát pont az a
 *   probléma nincs meg, ami miatt a szétválasztás létezik.
 *
 * *(A `'cathedral'` korábban `'tiles'` volt. A név akkor vált félrevezetővé, amikor a Level 2
 * megkapta a saját, szintén valódi csempekészletét.)*
 */
export type TerrainSkin = 'cathedral' | 'gothic-town' | 'church' | 'placeholder';

/**
 * A LÁTHATATLAN fizikai testek csempemérete (`ground-placeholder` 64x32,
 * `platform-placeholder` 64x16) — a static bodyk ehhez skálázódnak. A LÁTVÁNY a valódi
 * skineknél külön tileSprite, a `LevelTileset` / `GothicTownTileset` méreteivel; a kettőt ne
 * keverd össze.
 */
const PHYSICS_TILE_WIDTH = 64;

/**
 * A talaj NEM folyamatos: a szegmensek közötti hézagok a szakadékok. Minden szegmens
 * egyetlen, vízszintesen felskálázott static sprite.
 */
export function createGroundSegments(
  scene: Phaser.Scene,
  segments: GroundSegmentDef[],
  skin: TerrainSkin
): Phaser.Physics.Arcade.StaticGroup {
  const ground = scene.physics.add.staticGroup();

  for (const segment of segments) {
    const width = segment.endX - segment.startX;
    const sprite = ground.create(
      segment.startX + width / 2,
      GROUND_CENTER_Y,
      'ground-placeholder'
    ) as Phaser.Physics.Arcade.Sprite;
    sprite.setScale(width / PHYSICS_TILE_WIDTH, 1).refreshBody();

    if (skin === 'placeholder') continue;

    sprite.setVisible(false);

    if (skin === 'gothic-town') {
      createTownGroundVisual(scene, segment, width);
      continue;
    }

    if (skin === 'church') {
      createChurchGroundVisual(scene, segment, width);
      continue;
    }

    scene.add
      .tileSprite(segment.startX, GROUND_TOP, width, GROUND_TILE_HEIGHT, TILE_TEXTURES.GROUND_FLOOR)
      .setOrigin(0, 0)
      .setDepth(TERRAIN_DEPTH);

    // Végzárók a szegmensen BELÜL, a peremére tapadva. Kifelé lógva a szakadék fölé
    // nyúlnának, és hamis járható felületet sugallnának — pont ott, ahol a player a
    // legpontosabban méri fel az ugrást.
    scene.add
      .image(segment.startX, GROUND_TOP, TILE_TEXTURES.GROUND_EDGE_LEFT)
      .setOrigin(0, 0)
      .setDepth(TERRAIN_DEPTH);
    scene.add
      .image(segment.endX - GROUND_EDGE_WIDTH, GROUND_TOP, TILE_TEXTURES.GROUND_EDGE_RIGHT)
      .setOrigin(0, 0)
      .setDepth(TERRAIN_DEPTH);
  }

  return ground;
}

/**
 * A gothic-town talaj. **Végzáró NINCS, és ez nem hiányosság:** a GothicVania Town csomagban
 * nem létezik szakadék-perem csempe (a saját preview-jának talaja végig folyamatos), a
 * csempe peremE ALATTI teste viszont sima sötét föld — a nyers függőleges vágás tehát tiszta
 * földfalként olvas. A Level 1-nél azért kellettek végzárók, mert ANNAK a csempéjének
 * díszített, világos oldala van.
 *
 * A rajz `TOWN_GROUND_SURFACE_OFFSET_Y`-nal a `GROUND_TOP` FÖLÉ kerül, hogy a csempe
 * törmelék-pereme pontosan a fizikai felszínre essen.
 */
function createTownGroundVisual(
  scene: Phaser.Scene,
  segment: GroundSegmentDef,
  width: number
): void {
  scene.add
    .tileSprite(
      segment.startX,
      TOWN_TERRAIN_TOP_Y,
      width,
      TOWN_GROUND_TILE_HEIGHT,
      TOWN_TILE_TEXTURES.GROUND
    )
    .setOrigin(0, 0)
    .setDepth(TERRAIN_DEPTH);
}

/**
 * A church talaj. **Szakadék-végzáró NINCS**, ugyanabból az okból, mint a `gothic-town`-nál:
 * a csomagban nem létezik ilyen csempe (a saját `example_2/3`-jának talaja végig folyamatos),
 * a perem alatti test viszont sima sötét kő — a nyers függőleges vágás tehát tiszta kőfalként
 * olvas. A Level 1-nél azért kellett végzáró, mert ANNAK a csempéjének díszített, világos
 * oldala van.
 *
 * A rajz `CHURCH_GROUND_SURFACE_OFFSET_Y`-nal a `GROUND_TOP` FÖLÉ kerül, hogy a csempe
 * törmelék-pereme pontosan a fizikai felszínre essen.
 */
function createChurchGroundVisual(
  scene: Phaser.Scene,
  segment: GroundSegmentDef,
  width: number
): void {
  scene.add
    .tileSprite(
      segment.startX,
      CHURCH_TERRAIN_TOP_Y,
      width,
      CHURCH_GROUND_TILE_HEIGHT,
      CHURCH_TILE_TEXTURES.GROUND
    )
    .setOrigin(0, 0)
    .setDepth(TERRAIN_DEPTH);
}

export function createPlatforms(
  scene: Phaser.Scene,
  defs: PlatformDef[],
  skin: TerrainSkin,
  level?: LevelGeometry
): Phaser.Physics.Arcade.StaticGroup {
  const platforms = scene.physics.add.staticGroup();

  for (const def of defs) {
    const sprite = platforms.create(
      def.x,
      def.y,
      'platform-placeholder'
    ) as Phaser.Physics.Arcade.Sprite;
    sprite.setScale(def.tiles, 1).refreshBody();

    if (def.oneWay) {
      // A lenti oldalon nincs ütközés -> a player a létrán alulról átmászhat rajta.
      (sprite.body as Phaser.Physics.Arcade.StaticBody).checkCollision.down = false;
    }

    if (skin === 'placeholder') continue;

    sprite.setVisible(false);

    if (skin === 'gothic-town') {
      // A `level` csak itt kell: az állvány/konzol döntés a pálya TELJES geometriájából
      // származik (van-e alatta talaj, van-e alatta másik lap), nem a lap saját adatából.
      createTownPlatformVisual(scene, def, level ? platformHasLegs(def, level) : false);
      continue;
    }

    if (skin === 'church') {
      createChurchPlatformVisual(scene, def);
      continue;
    }

    createPlatformVisual(scene, def);
  }

  return platforms;
}

/**
 * Előbb a teljes szélességű lap, UTÁNA a két végzáró — ebben a sorrendben. A végzáró
 * ugyanis nem helyettesíti a lapot, hanem RÁ rajzolódik: a felső 16px-e a lap folytatása,
 * az alsó 16px-e a lelógó szikla, ami átlósan elfogy, és a kifutó részen a lap látszik át
 * alatta. Fordított sorrendben a lap kitakarná a sziklát.
 */
function createPlatformVisual(scene: Phaser.Scene, def: PlatformDef): void {
  const left = platformLeft(def);
  const top = platformTop(def);
  const width = platformRight(def) - left;

  scene.add
    .tileSprite(left, top, width, PLATFORM_TILE_HEIGHT, TILE_TEXTURES.PLATFORM_MID)
    .setOrigin(0, 0)
    .setDepth(TERRAIN_DEPTH);

  // Egycsempés platformon (C1, E1) nem fér el a két 48px-es végzáró, és ez nem hiányosság:
  // a csupasz lap vizuálisan elválasztja a "lépőkövet" a valódi platformoktól.
  if (width < PLATFORM_MIN_WIDTH_FOR_EDGES) return;

  for (const [x, texture] of [
    [left, TILE_TEXTURES.PLATFORM_EDGE_LEFT],
    [platformRight(def) - PLATFORM_EDGE_WIDTH, TILE_TEXTURES.PLATFORM_EDGE_RIGHT],
  ] as const) {
    scene.add.image(x, top, texture).setOrigin(0, 0).setDepth(TERRAIN_DEPTH);
  }
}

/**
 * A gothic-town fa-platform, a csomag saját preview-jának felépítése szerint:
 *
 *     top-left-wood(32) + N×top-wood(16) + top-right-wood(32)     <- pallólap
 *             │                                    │
 *        wood-legs(32×16, ismételve)          wood-legs            <- CSAK állványnál
 *             │                                    │
 *      ground-wood-legs(32×16)              ground-wood-legs       <- talpazat a talajon
 *
 * A `hasLegs` a KÉT változatot választja szét:
 *  - **állvány** — a lábak a talajig futnak (a preview esete);
 *  - **konzol** — csak a lap és a végzárók lelógó 19 px-e. Szakadék fölött ez az egyetlen
 *    lehetséges, és pontosan a Level 1 `platform-edge-*`-ának a szerepe.
 *
 * Sorrend a `createPlatformVisual`-lal AZONOS okból: a végzáró RÁ rajzolódik a lapra.
 * A lábak viszont a végzárók ELŐTT mennek ki, hogy a végzáró átlós merevítője takarja az
 * illesztést, ne fordítva.
 */
function createTownPlatformVisual(
  scene: Phaser.Scene,
  def: PlatformDef,
  hasLegs: boolean
): void {
  const left = platformLeft(def);
  const right = platformRight(def);
  const top = platformTop(def);

  scene.add
    .tileSprite(left, top, right - left, TOWN_DECK_HEIGHT, TOWN_TILE_TEXTURES.PLATFORM_DECK)
    .setOrigin(0, 0)
    .setDepth(TERRAIN_DEPTH);

  const legColumnX = [left, right - TOWN_LEG_TILE_WIDTH];

  if (hasLegs) {
    // A láb a végzáró ALJÁTÓL indul (a végzáró maga is 32 magas), és a talpazat felső éléig
    // tart. A `wood-legs` mind a 16 sora azonos, ezért a nem-16-többszörös magasság sem
    // csonkolja láthatóan a mintát.
    const legTop = top + TOWN_CAP_SIZE;
    const legHeight = TOWN_TERRAIN_TOP_Y - legTop;

    for (const x of legColumnX) {
      if (legHeight > 0) {
        scene.add
          .tileSprite(x, legTop, TOWN_LEG_TILE_WIDTH, legHeight, TOWN_TILE_TEXTURES.PLATFORM_LEGS)
          .setOrigin(0, 0)
          .setDepth(TERRAIN_DEPTH);
      }
      // A talpazat a talaj-csempével AZONOS felső élről indul: az alsó 7 sora bitre ugyanaz
      // a törmelék-perem, tehát folytonosan illeszkedik a talajba.
      scene.add
        .image(x, TOWN_TERRAIN_TOP_Y, TOWN_TILE_TEXTURES.PLATFORM_FOOT)
        .setOrigin(0, 0)
        .setDepth(TERRAIN_DEPTH);
    }
  }

  for (const [x, texture] of [
    [legColumnX[0], TOWN_TILE_TEXTURES.PLATFORM_CAP_LEFT],
    [legColumnX[1], TOWN_TILE_TEXTURES.PLATFORM_CAP_RIGHT],
  ] as const) {
    scene.add.image(x, top, texture).setOrigin(0, 0).setDepth(TERRAIN_DEPTH);
  }
}

/**
 * A church lebegő platform: egyetlen tileSprite-nyi kőblokk-sor, **végzáró és láb NÉLKÜL**.
 *
 * Ez a három skin közül a legegyszerűbb, és nem hanyagságból:
 *
 *  - **végzáró nem kell** — a 32×32-es blokk éle MAGA a rajzolt falazat-perem (a mért
 *    oszlop-eltérés a blokkhatáron 167, a blokkon belül 18), tehát a lap két vége ugyanúgy
 *    zár, mint a belseje. A Level 1/2 végzárói ott a lap SIMA vágását takarták el;
 *  - **láb nem kell** — a csomag `example_2/3`-ja a blokkokat szabadon lebegve rakja ki, és
 *    a Level 3 minden lapja galéria a szabad tér fölött, nem egy talajon álló állvány.
 *
 * A rajz a `platformTop()`-tól INDUL és 32 px magas, míg a fizikai lap 16 — az alsó 16 px
 * tehát a lap alatt lóg. Ez szándékos: a blokk így tömbnek látszik, nem papírlapnak, és a
 * járható felszín a világos cap tetején van.
 */
function createChurchPlatformVisual(scene: Phaser.Scene, def: PlatformDef): void {
  const left = platformLeft(def);

  scene.add
    .tileSprite(
      left,
      platformTop(def),
      platformRight(def) - left,
      CHURCH_BLOCK_TILE_HEIGHT,
      CHURCH_TILE_TEXTURES.PLATFORM_BLOCK
    )
    .setOrigin(0, 0)
    .setDepth(TERRAIN_DEPTH);
}
