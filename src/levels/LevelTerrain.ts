import type Phaser from 'phaser';
import {
  GROUND_CENTER_Y,
  GROUND_TOP,
  platformLeft,
  platformRight,
  platformTop,
  type GroundSegmentDef,
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

/**
 * A talaj-szegmensek és a lebegő platformok felépítése — a `Level1Scene`-ből kiemelve, hogy a
 * Level 2 ugyanezt használhassa.
 *
 * ## A két skin
 *
 * - **`'tiles'`** — a Level 1 mai viselkedése. A FIZIKA és a LÁTVÁNY külön objektum: a static
 *   spriteot vízszintesen skálázzuk (ami egy valódi csempe textúráját MEGNYÚJTANÁ), ezért az
 *   LÁTHATATLAN marad, és a látványt egy tileSprite + a két végzáró kép adja.
 * - **`'placeholder'`** — a Level 2 jelenlegi állapota, amíg nincs erdő-tileset. A fizikai
 *   sprite egyszerűen LÁTHATÓ marad, és nincs mellette külön látvány-objektum. Ez itt nem
 *   hanyagság: a placeholder textúra egyszínű téglalap, amit a vízszintes skálázás nem tud
 *   torzítani — tehát pont az a probléma nincs meg, ami miatt a szétválasztás létezik.
 *
 * Az erdő-tileset megérkezésekor a Level 2 `'tiles'`-ra vált, és ez a modul nem változik.
 */
export type TerrainSkin = 'tiles' | 'placeholder';

/**
 * A LÁTHATATLAN fizikai testek csempemérete (`ground-placeholder` 64x32,
 * `platform-placeholder` 64x16) — a static bodyk ehhez skálázódnak. A LÁTVÁNY a
 * `'tiles'` skinnél külön tileSprite, a `LevelTileset` méreteivel; a kettőt ne keverd össze.
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

export function createPlatforms(
  scene: Phaser.Scene,
  defs: PlatformDef[],
  skin: TerrainSkin
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
