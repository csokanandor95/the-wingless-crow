/**
 * A Level 1 (Cathedral Ruins) terrain-csempéinek geometriája, EGYETLEN forrásból.
 *
 * Szándékosan Phaser-mentes — ugyanaz az elv, mint a `Level1Layout.ts`-nél és az animációs
 * moduloknál: a méretek és a belőlük LEVEZETETT elhelyezési konstansok unit-tesztelhetők
 * maradnak, a scene-be pedig magic number nem kerülhet vissza.
 *
 * ## Forrás
 *
 * Minden csempe a **PixelPlatformerSet1 v1.1** csomagból származik (Szadi art) — ez UGYANAZ a
 * csomag, amiből a Level 1 parallax háttere jön (`assets/backgrounds/ruined-city/`), tehát a
 * paletta és a pixelsűrűség garantáltan illeszkedik. Licenc: *"License for Everyone. Public
 * domain and free to use, personal or commercial. Credit is not required but appreciated.
 * You can edit, but not sell the asset pack."*
 *
 * A fájlok SZÁRMAZTATOTT assetek: a forráslapokból kivágott téglalapok, **átméretezés
 * nélkül** (szemben a `boss-arena.png`-nel, ami skálázott is). A forrás-rectek:
 *
 * | fájl                       | forráslap                   | rect (x, y, w, h)   |
 * |----------------------------|-----------------------------|---------------------|
 * | `ground-floor.png`         | `main_lev_build.png`        | 240, 720, 224, 32   |
 * | `ground-edge-left.png`     | `main_lev_build.png`        | 208, 720,  16, 32   |
 * | `ground-edge-right.png`    | `main_lev_build.png`        | 480, 720,  16, 32   |
 * | `platform-mid.png`         | `main_lev_build.png`        | 272, 592,  32, 16   |
 * | `platform-edge-left.png`   | `main_lev_build.png`        | 208, 592,  48, 32   |
 * | `platform-edge-right.png`  | `main_lev_build.png`        | 352, 592,  48, 32   |
 * | `door-gate.png`            | `main_lev_build.png`        | 1088, 240, 64, 128  |
 * | `ladder.png`               | `other_and_decorative.png`  |  64, 144,  32, 16   |
 *
 * A `main_lev_build.png` HÁROM színvariánst tartalmaz egymás alatt (400px-enként); mindegyik
 * terrain-rect a **KÖZÉPSŐ, barna variánsból** való. Ez az egyetlen, ami a háttér meleg
 * vörösbarna tónusához illik (mért átlagszín: padló `(42,33,33)`, platform `(63,51,50)`,
 * a `03-ruins` háttérréteg `(74,45,39)`). Ha valaha új csempe kell, **ugyanabból a sávból
 * vágd** — a felső (zöldes) és az alsó (kékes) variáns kilógna.
 */

// --- Textúra-kulcsok ---------------------------------------------------------

export const TILE_TEXTURES = {
  GROUND_FLOOR: 'tile-ground-floor',
  GROUND_EDGE_LEFT: 'tile-ground-edge-left',
  GROUND_EDGE_RIGHT: 'tile-ground-edge-right',
  PLATFORM_MID: 'tile-platform-mid',
  PLATFORM_EDGE_LEFT: 'tile-platform-edge-left',
  PLATFORM_EDGE_RIGHT: 'tile-platform-edge-right',
  DOOR_GATE: 'tile-door-gate',
  LADDER: 'tile-ladder',
} as const;

// --- Talaj -------------------------------------------------------------------

/** A padló-csempe VÍZSZINTESEN VARRATMENTES (ellenőrizve) -> tileSprite-tal ismételhető. */
export const GROUND_TILE_WIDTH = 224;

/**
 * = a `Level1Layout.GROUND_TOP` és a `GROUND_CENTER_Y` közti távolság kétszerese, tehát a
 * talajsáv PONTOSAN kitölti a 418..450 tartományt. Ha ez valaha változik, a `Level1Layout`
 * `GROUND_CENTER_Y`-ját is újra kell számolni.
 */
export const GROUND_TILE_HEIGHT = 32;

/**
 * A szegmens-végzáró csempe szélessége. A végzárók a szegmensen BELÜL, a pereméhez tapadva
 * rajzolódnak — kifelé lógva hamis járható felületet sugallnának a szakadék fölött.
 */
export const GROUND_EDGE_WIDTH = 16;

// --- Lebegő platform ---------------------------------------------------------

/** A platform-csempe is varratmentes vízszintesen. */
export const PLATFORM_TILE_WIDTH = 32;

/** = a `platform-placeholder` magassága, tehát a `Level1Layout.platformTop()` érvényben marad. */
export const PLATFORM_TILE_HEIGHT = 16;

/**
 * A végzáró 48x32: a FELSŐ 16px a járható lap folytatása, az ALSÓ 16px a lelógó szikla,
 * ami átlósan elfogy balról jobbra (a jobb végzárón tükrözve). A csempe emiatt NEM
 * helyettesíti a lapot, hanem RÁ rajzolódik: előbb megy a teljes szélességű
 * `PLATFORM_MID` tileSprite, és csak utána a két végzáró.
 */
export const PLATFORM_EDGE_WIDTH = 48;
export const PLATFORM_EDGE_HEIGHT = 32;

/**
 * Ennél keskenyebb platformra nem fér el a két végzáró (2 * 48 = 96 > 64), ezért az
 * egycsempés (`tiles: 1`) platformok csak a csempézett lapot kapják. Ez nem hiányosság:
 * vizuálisan pont elválasztja a "lépőkövet" (`C1`, `E1`) a valódi platformoktól.
 */
export const PLATFORM_MIN_WIDTH_FOR_EDGES = 2 * PLATFORM_EDGE_WIDTH;

// --- Boss-ajtó ---------------------------------------------------------------

export const DOOR_TILE_WIDTH = 64;
export const DOOR_TILE_HEIGHT = 128;

/**
 * A csempén MÉRT geometria (a kivágott PNG-n a nyílás `x = 14..51`, `y = 48..108`):
 *
 *   - `DOOR_OPENING_HEIGHT` — a boltív átjárható nyílásának magassága;
 *   - `DOOR_THRESHOLD_PX`   — a nyílás alja és a csempe alja közti küszöb-kő.
 *
 * A kettőből következik az elhelyezés: a képet `origin (0.5, 1)`-gyel
 * `platformTop + DOOR_THRESHOLD_PX`-re rakva **a boltív padlója pontosan a járható
 * felszínre esik** — enélkül a player a kőben állna. A küszöb-kő ilyenkor a platform alá
 * lóg, ezért kell az ajtónak a platform-látványnál HÁTRÉBB lévő depth (`DOOR_DEPTH`).
 */
export const DOOR_OPENING_HEIGHT = 61;
export const DOOR_THRESHOLD_PX = 19;

/** A boltív fölötti tömör kőfal — a három rész együtt adja ki a csempe magasságát. */
export const DOOR_HEADER_HEIGHT = DOOR_TILE_HEIGHT - DOOR_OPENING_HEIGHT - DOOR_THRESHOLD_PX;

// --- Létra -------------------------------------------------------------------

/**
 * A csempe FÜGGŐLEGESEN varratmentes: 16px-enként ismétlődik egy fok (ellenőrizve).
 *
 * A 32px-es csempén belül a rajzolt létra (a két oldalléc külső élétől mérve) ~28px —
 * pont annyi, mint a `Level1Layout.LADDER.width` mászási zónája. Ezért marad a kettő KÜLÖN
 * konstans: a tileSprite a teljes csempeszélességgel rajzol (különben csonkolná a mintát),
 * az interakciós zóna viszont a RAJZOLT létrához igazodik, és így a mászás viselkedése
 * bitre változatlan a placeholder óta.
 */
export const LADDER_TILE_WIDTH = 32;
export const LADDER_TILE_HEIGHT = 16;

// --- Render-rétegek ----------------------------------------------------------

/**
 * A Level 1 depth-rendje. A parallax rétegek (-30..-20) fölött, de minden gameplay-elem
 * (talaj-fizika, player, enemy, HUD — mind 0) alatt:
 *
 *   -30 / -25 / -20   parallax háttér-rétegek
 *   -10               hangulati propok        <- a player/enemy ELŐTTÜK megy el
 *    -6               boss-ajtó               <- a platform MÖGÖTT (küszöb-kő elrejtése)
 *    -5               talaj + platform lap
 *    -1               létra, köztes checkpoint
 *     0               fizika, player, enemy, HUD
 */
export const TERRAIN_DEPTH = -5;
export const DOOR_DEPTH = -6;
export const DECOR_DEPTH = -10;
