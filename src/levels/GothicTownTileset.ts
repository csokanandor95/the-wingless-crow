import { GROUND_TOP } from './LevelGeometry';

/**
 * A Level 2 (Gothic Town) terrain-csempéinek geometriája, EGYETLEN forrásból.
 *
 * A `LevelTileset.ts` (Level 1 / cathedral) párja, ugyanazzal az elvvel: Phaser-mentes, és
 * minden elhelyezési konstans LEVEZETETT, nem szemre hangolt szám — a scene-be így nem
 * kerülhet vissza magic number, a `LevelTerrain.ts` pedig innen dolgozik.
 *
 * ## Forrás
 *
 * Minden csempe a **GothicVania Town** csomagból (Luis Zuno / @ansimuz), a
 * `PNG/environment/layers/sliced-tileset/` mappából. Licenc: *"License for Everyone. Public
 * domain and free to use on whatever you want, personal or commercial. Credit is not
 * required but appreciated."* — UGYANAZ a csomag, amiből a Level 1 hangulati propjai jönnek
 * (`assets/props/gothic-town/`), tehát nem nyílik új jogi tétel.
 *
 * | fájl                    | eredet                                  |
 * |-------------------------|-----------------------------------------|
 * | `ground-strip.png`      | **SZÁRMAZTATOTT**: `[ground-b.png │ ground.png]` egymás mellé |
 * | `top-wood.png`          | változatlan másolat                     |
 * | `top-left-wood.png`     | változatlan másolat                     |
 * | `top-right-wood.png`    | változatlan másolat                     |
 * | `wood-legs.png`         | változatlan másolat                     |
 * | `ground-wood-legs.png`  | változatlan másolat                     |
 *
 * **Miért származtatott a talaj-csempe:** a csomag KÉT talaj-variánst ad (`ground.png` és
 * `ground-b.png`, mindkettő 16×48), és a csomag saját `environment-preview.png`-je
 * VÁLTOGATJA őket 32 px-es periódusban. Mérés (a szomszédos oszlopok átlagos eltérése):
 * `ground-b → ground` = 0.90, `ground → ground-b` = 1.98, míg az önismétlés 2.47 és 4.15.
 * Egy tileSprite viszont csak EGY textúrát tud ismételni — ezért lett a kettőből egyetlen
 * 32 px-es pár, ami így lényegében varratmentes.
 */

// --- Textúra-kulcsok ---------------------------------------------------------

export const TOWN_TILE_TEXTURES = {
  GROUND: 'town-ground',
  PLATFORM_DECK: 'town-platform-deck',
  PLATFORM_CAP_LEFT: 'town-platform-cap-left',
  PLATFORM_CAP_RIGHT: 'town-platform-cap-right',
  PLATFORM_LEGS: 'town-platform-legs',
  PLATFORM_FOOT: 'town-platform-foot',
} as const;

// --- Talaj -------------------------------------------------------------------

/** A származtatott pár szélessége (`ground-b` + `ground`). */
export const TOWN_GROUND_TILE_WIDTH = 32;
export const TOWN_GROUND_TILE_HEIGHT = 48;

/**
 * MÉRT: a csempe felső 9 sora ÁTLÁTSZÓ, a 9–15. sor a világos törmelék-perem (ez a JÁRHATÓ
 * felszín), a 16–47. a sima sötét föld. A rajzot tehát `GROUND_TOP` FÖLÉ kell tolni ennyivel,
 * hogy a perem pontosan a fizikai felszínre essen.
 */
export const TOWN_GROUND_SURFACE_OFFSET_Y = 9;

/**
 * Ahol a talaj-csempe és a platform-lábak TALPAZATA egyaránt kezdődik.
 *
 * A kettő azonos, és ez nem véletlen: a `ground-wood-legs.png` alsó 7 sora BITRE ugyanaz a
 * perem, mint a `ground.png` 9–15. sora. Azonos felső élről indítva tehát a talpazat pereme
 * folytonosan illeszkedik a talaj peremébe, kézi eltolás nélkül.
 */
export const TOWN_TERRAIN_TOP_Y = GROUND_TOP - TOWN_GROUND_SURFACE_OFFSET_Y;

// --- Lebegő platform ---------------------------------------------------------

/**
 * A pallólap csempéje 16×16, de a RAJZOLT deszka csak 13 px vastag (az alsó 3 sor átlátszó).
 * A tileSprite-ot a teljes csempemagassággal rajzoljuk — 16-nál kisebbel a minta csonkolódna,
 * nagyobbal függőlegesen ismétlődne.
 *
 * A 16 egyben a fizikai lap magassága is (`PLATFORM_TILE_HEIGHT`), tehát a látvány teteje
 * pontosan a járható felszínen van, és a 3 px-es rés csak alul, a lap „alatt" jelenik meg.
 */
export const TOWN_DECK_TILE_WIDTH = 16;
export const TOWN_DECK_HEIGHT = 16;

/**
 * A két végzáró 32×32: a felső 13 px a lap folytatása, az alsó 19 px a KÉT LÁB és a köztük
 * futó átlós merevítő. A csempe emiatt — a Level 1 `platform-edge-*`-ához hasonlóan — NEM
 * helyettesíti a lapot, hanem RÁ rajzolódik.
 */
export const TOWN_CAP_SIZE = 32;

/**
 * Ennél keskenyebb platformra nem férne el a két végzáró. A Level 2 legkeskenyebb lapja is
 * `tiles: 1` = 64 px, tehát a gyakorlatban MINDEN platform megkapja mindkettőt — szemben a
 * Level 1-gyel, ahol az egycsempés lépőkövek (`C1`, `E1`) szándékosan csupaszok maradtak.
 */
export const TOWN_PLATFORM_MIN_WIDTH_FOR_CAPS = 2 * TOWN_CAP_SIZE;

/**
 * A láb-csempe (`wood-legs.png`). MIND A 16 SORA AZONOS — ezért rajzolható tetszőleges
 * (nem 16-többszörös) magasságú tileSprite-tal torzítás nélkül: az utolsó, félbevágott
 * ismétlés megkülönböztethetetlen a teljestől.
 */
export const TOWN_LEG_TILE_WIDTH = 32;
export const TOWN_LEG_TILE_HEIGHT = 16;

/** A talpazat (`ground-wood-legs.png`): felső 9 sor láb, alsó 7 a talaj pereme. */
export const TOWN_LEG_FOOT_HEIGHT = 16;

// --- Render-rétegek ----------------------------------------------------------

/**
 * A háttérben álló épületek mélysége. A `LevelTileset.ts` depth-rendjébe illeszkedik, a
 * város-sziluett (−25) ELÉ, de a hangulati propok (−10) MÖGÉ:
 *
 *   -30 / -25   parallax háttér-rétegek (ég, város-sziluett)
 *   -15         háttér-épületek          <- itt
 *   -10         hangulati propok
 *    -5         talaj + platform lap
 */
export const BUILDING_DEPTH = -15;
