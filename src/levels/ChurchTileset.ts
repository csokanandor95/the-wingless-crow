import { GROUND_TOP } from './LevelGeometry';
import { PANEL_RESERVE_PX } from '../ui/Dialogue';

/**
 * A Level 3 (The Beast Dungeon) terrain-csempéinek geometriája, EGYETLEN forrásból.
 *
 * A `LevelTileset.ts` (Level 1 / cathedral) és a `GothicTownTileset.ts` (Level 2) párja,
 * ugyanazzal az elvvel: Phaser-mentes, és minden elhelyezési konstans LEVEZETETT, nem szemre
 * hangolt szám.
 *
 * ## Forrás
 *
 * Minden csempe a **GothicVania Church** csomagból (Luis Zuno / @ansimuz),
 * `Assets/ENVIRONMENT/tileset.png` (336×224, 16 px-es rács). UGYANAZ a szerző és sorozat,
 * mint a `GothicVania Town`-é, amiből a Level 2 terrainje és mindkét pálya propjai jönnek.
 *
 * **JOGI TÉTEL:** a csomag `public-license.pdf`-jének szövegét NEM sikerült kinyerni
 * (CID-kódolt betűkészlet, hiányos ToUnicode CMap, és nincs `pdftoppm` a gépen — ugyanaz a
 * helyzet, mint az AlkaKrab licenc-PDF-jével). A szerző, a sorozat és a fájlnév alapján
 * majdnem biztosan ugyanaz a public domain licenc, mint a Town csomag
 * `public-license.txt`-jéé, de **a szöveget a publikálás előtt el kell olvasni**, és a
 * `Credits.txt`-be fel kell venni.
 *
 * | fájl                | eredet                                                    |
 * |---------------------|-----------------------------------------------------------|
 * | `ground-strip.png`  | **SZÁRMAZTATOTT**: `[ (0,160) │ (64,160) │ (128,160) ]`, 3× 48×48 |
 * | `block-strip.png`   | **SZÁRMAZTATOTT**: `[ (16,112) │ (64,112) ]`, 2× 32×32     |
 * | `arch-gate.png`     | `(288,16,32,64)` változatlan                               |
 * | `pillar.png`        | `(112,64,32,80)` változatlan                               |
 * | `balustrade.png`    | `(192,80,80,64)` változatlan                               |
 * | `altar-wall.png`    | `(192,16,32,64)` változatlan                               |
 * | `wall-cross.png`    | `(240,32,32,48)` változatlan                               |
 * | `fill-block.png`    | `(288,96,32,32)` változatlan                               |
 *
 * ## Miért SZÁRMAZTATOTT a talaj és a platform is
 *
 * Egy `tileSprite` csak EGY textúrát tud ismételni, a csomag viszont VARIÁNSOKAT ad — és a
 * variánsok váltogatása itt nem esztétikai finomítás, hanem szükséglet:
 *
 *  - **talaj:** a három 48×48-as lap egyike sem varratmentes (a szomszédos oszlopok mért
 *    eltérése 73–86, szemben a lapon BELÜLI 13–18-as alapszinttel). Az `AAAA` önismétlés
 *    ezért láthatóan gépies; az `A→B→C` rotációban viszont ugyanaz a „varrat" REPEDÉSKÉNT
 *    olvas a törött kőpadlóban. Egyetlen 144 px-es csíkba fűzve a rotáció automatikus.
 *  - **platform:** a 32×32-es blokkok éle KEMÉNY (seam 167 vs. 18-as belső alapszint) — de
 *    MINDEN 32 px-en azonosan, a csík wrap-jénél is. Nem artifact tehát, hanem a falazat
 *    rajzolt éle; a csomag saját `example_2/3`-ja pontosan így rakja ki őket.
 */

// --- Textúra-kulcsok ---------------------------------------------------------

export const CHURCH_TILE_TEXTURES = {
  GROUND: 'church-ground',
  PLATFORM_BLOCK: 'church-platform-block',
  ARCH_GATE: 'church-arch-gate',
  PILLAR: 'church-pillar',
  BALUSTRADE: 'church-balustrade',
  ALTAR_WALL: 'church-altar-wall',
  WALL_CROSS: 'church-wall-cross',
  FILL_BLOCK: 'church-fill-block',
} as const;

// --- Talaj -------------------------------------------------------------------

/** A származtatott csík szélessége (3 × 48) — ennyi a rotáció periódusa. */
export const CHURCH_GROUND_TILE_WIDTH = 144;
export const CHURCH_GROUND_TILE_HEIGHT = 48;

/**
 * MÉRT: a csempe felső 7–8 sora ÁTLÁTSZÓ, alatta kezdődik a világos törmelék-perem, ami a
 * JÁRHATÓ felszín. (Az `A` lapon 8–9, a `B`/`C`-n 7–8 — az 1 px-es szórás maga a törött
 * kőperem, nem hiba.) A rajzot ennyivel a `GROUND_TOP` FÖLÉ kell tolni.
 */
export const CHURCH_GROUND_SURFACE_OFFSET_Y = 8;

/** Ahol a talaj-csempe rajza kezdődik — a `TOWN_TERRAIN_TOP_Y` megfelelője. */
export const CHURCH_TERRAIN_TOP_Y = GROUND_TOP - CHURCH_GROUND_SURFACE_OFFSET_Y;

// --- Lebegő platform ---------------------------------------------------------

/**
 * A blokk-csík (2 × 32). Egy `tiles: N` platform szélessége `64 × N`, tehát PONTOSAN N
 * ismétlés — a `PlatformDef.tiles` 64 px-es egysége és a csík szélessége szándékosan azonos.
 */
export const CHURCH_BLOCK_TILE_WIDTH = 64;

/**
 * A blokk 32 px magas, a FIZIKAI lap viszont 16 (`PLATFORM_TILE_HEIGHT`). A rajz a
 * `platformTop()`-tól INDUL, tehát az alsó 16 px a lap ALATT lóg — ez a blokk alsó fele,
 * pontosan a csomag `example_3`-ának a látványa.
 *
 * A világos cap a csík felső 3 sora, tehát a járható felszín a rajz tetején van: nincs mit
 * eltolni, szemben a talajjal.
 */
export const CHURCH_BLOCK_TILE_HEIGHT = 32;

// --- Boss-ajtó ---------------------------------------------------------------

/**
 * A boltív `SCALE = 2`-vel megy ki. Nem kozmetika: 1:1-ben a nyílása 24 px széles, a player
 * teste viszont 28 — a lovag láthatóan NEM férne át rajta. A 2× EGÉSZ szám, tehát minden
 * forrás-pixel tiszta 2×2-es blokk marad (a bossok `SCALE`-jének bevett receptje), és a
 * kapott 64×128 PONT a Level 1 `door-gate`-jének a lábnyoma.
 */
export const CHURCH_ARCH_SCALE = 2;
export const ARCH_TILE_WIDTH = 32 * CHURCH_ARCH_SCALE; // 64
export const ARCH_TILE_HEIGHT = 64 * CHURCH_ARCH_SCALE; // 128

/**
 * A boltív SÖTÉT nyílása a csempén belül, FORRÁS-pixelben mérve (luminancia < 32):
 * `x = 4..27` (24 px), `y = 8..59` (52 px).
 *
 * **A Level 1 ajtajával szemben ez a nyílás ÁTLÁTSZATLAN** — a boltív belseje sötét téglából
 * van rajzolva, nem alpha-lyuk. Ezért itt NEM kell a `door-interior-placeholder` megfelelője:
 * nincs mögötte átlátszó rész, amin az égbolt (itt: a lapos háttérszín) átütne.
 *
 * A `left`/`top` a csempe bal-felső sarkához képest, VILÁG-pixelben (a `SCALE`-lel szorozva).
 */
export const ARCH_APERTURE = {
  left: 4 * CHURCH_ARCH_SCALE, // 8
  top: 8 * CHURCH_ARCH_SCALE, // 16
  width: 24 * CHURCH_ARCH_SCALE, // 48
  height: 52 * CHURCH_ARCH_SCALE, // 104
} as const;

/**
 * A nyílás alja és a csempe alja közti küszöb-kő (forrásban 4 px). A képet `origin (0.5, 1)`-gyel
 * `GROUND_TOP + ARCH_THRESHOLD_PX`-re rakva a boltív padlója pontosan a járható felszínre esik
 * — a Level 1 `DOOR_THRESHOLD_PX`-ének a szerepe.
 */
export const ARCH_THRESHOLD_PX = 4 * CHURCH_ARCH_SCALE; // 8

// --- Boss aréna --------------------------------------------------------------

/** A Boss 3 arénájának magassága (= a canvas magassága, main.ts). */
export const ARENA_HEIGHT = 450;

/**
 * A `Boss3Scene` padlóvonala. **LEVEZETETT, nem másolt szám.**
 *
 * A párbeszéd-panel a `groundTop` ALATT ül és `PANEL_RESERVE_PX`-et (75) foglal, tehát a
 * padlóvonal legfeljebb `450 − 75 = 375` lehet — enélkül a panel kilógna a képből. Ugyanez a
 * kényszer teszi a Boss 2 és a végső aréna padlóvonalát is 369-re; ott a háttérfestményből
 * MÉRTÜK, itt a szerkesztett háttér miatt szabadon választható, tehát a panel dönt.
 *
 * A 369 a plafon alatt marad 6 px-szel, és ezzel a három párbeszédes aréna padlóvonala
 * azonos — a player minden bossnál ugyanabban a magasságban áll.
 */
export const ARENA_GROUND_TOP = 369;

/** A fenti korlát, hogy a teszt ne nyers számmal dolgozzon. */
export const ARENA_GROUND_TOP_MAX = ARENA_HEIGHT - PANEL_RESERVE_PX; // 375

// --- Render-rétegek ----------------------------------------------------------

/**
 * A Level 3 depth-rendje. Parallax réteg NINCS (lásd `Level3Scene`), a legtávolabbi elem a
 * lapos háttérszín maga:
 *
 *   (háttérszín)      #272638 — a csomag MÉRT űr-színe
 *   -15               fal-panelek, oszlopok   <- BUILDING_DEPTH (LevelGeometry)
 *   -10               hangulati propok        <- DECOR_DEPTH
 *    -6               boss-ajtó
 *    -5               talaj + platform
 *     0               fizika, player, enemy, HUD
 */
export const CHURCH_BACKGROUND_COLOR = '#272638';
