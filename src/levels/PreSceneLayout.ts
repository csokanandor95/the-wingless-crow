import type { DialogueLine } from '../ui/Dialogue';

/**
 * A `PreScene` geometriája és párbeszéde, Phaser-MENTES adatmodulként.
 *
 * Ugyanaz az elv, mint a `Level*Layout.ts`-eknél: a számok itt élnek, a scene csak felhasználja
 * őket — így a jelenet invariánsai (a párbeszéd-panel elfér, a szereplők a rajzolt padlón
 * állnak, a zuhanás látható) GameObject-mockolás nélkül bizonyíthatók.
 *
 * ITT KONKRÉT KÉNYSZER IS VAN: a `tests/unit/helpers/fakePhaser.ts` **nem ad `Scene`
 * osztályt**, tehát a `PreScene.ts` (ami `Phaser.Scene`-ből származik) unit tesztből NEM
 * importálható. Ez az oka annak is, hogy a `GODDESS_DIALOGUE` itt van, és nem a scene-ben,
 * mint a boss-párbeszédek: csak így tesztelhető, hogy minden sor elfér a panelen.
 *
 * A `DialogueLine` import SZÁNDÉKOSAN `import type` — a típus fordításkor eltűnik, tehát a
 * modul futásidőben tényleg nem húzza be a Phasert.
 */

export const VIEW_WIDTH = 800;
export const VIEW_HEIGHT = 450;

/**
 * A járható felszín Y-ja — MÉRT érték, nem hangolt.
 *
 * A háttér 800x450-es változatán a mozaikpadló lapja a 345..397. sor, az első pereme a 398.
 * (ott -21,06 a fényesség-zuhanás). A 369 tehát a lapon belül van, elöl ~28 px mozaikkal.
 *
 * Ez EGYBEN a `Dialogue` kényszere is: `369 + PANEL_RESERVE_PX (75) = 444 <= 450`. Ezért van
 * mind az öt párbeszédes jeleneté 369-en.
 */
export const GROUND_TOP = 369;

/** A `ground-placeholder` 64x32, origin 0.5 — a static body közepe LEVEZETETT, nem beírt. */
export const GROUND_CENTER_Y = GROUND_TOP + 16;

/** A rajzolt mozaiklap MÉRT vízszintes kiterjedése. Minden szereplőnek ezen belül a helye. */
export const FLOOR_SPAN = { left: 120, right: 690 } as const;

/** Ide zuhan be a player: a padló bal harmadában, jó messze A LÁNGŐRZŐTŐL. */
export const PLAYER_SPAWN_X = 200;

/**
 * A képernyő FÖLÖTT — a player onnan esik be. A kamera bounds-a (0..450) változatlan, tehát
 * a felső él fölött még nem látszik; a zuhanás ~385 px, GRAVITY_Y (800) mellett ~0,98 s.
 */
export const FALL_START_Y = -40;

/**
 * Ennyivel nyúlik FELFELÉ a FIZIKAI világ (a kameráé nem). A `Level1Scene` zuhanás-halál
 * trükkjének a tükörképe, ott lefelé.
 *
 * KÖTELEZŐ: a `Player` konstruktora `setCollideWorldBounds(true)`-t hív, tehát e nélkül a
 * negatív Y-ú player azonnal a világ tetejére (y=0) lenne szorítva, és nem zuhanna sehonnan.
 */
export const FALL_BOUNDS_MARGIN = 120;

/** Egy pillanat a néma szentélyen, mielőtt a player beesik — enélkül a nyitókép elvész. */
export const FALL_DELAY_MS = 500;

/**
 * A LÁNGŐRZŐ helye a jobb oldalon — MÉRT érték, nem szemre rakott.
 *
 * A háttéren a padlón álló gyertya-csoport az `x 628..690` sávban van: ott a talp körüli
 * (355..375. sor) fényesség-csúcs **248,7**, tehát az ott álló szereplő láthatóan A
 * GYERTYÁKON állna (kézi teszten pontosan ez jött elő az eredeti 650-nel).
 *
 * Az 560 a környék legtisztább oszlopa: a talp-sávban 54,7, a test-sávban (323..369) 63,3 a
 * csúcs. Az 580..610 azért esett ki, mert ott a HÁTTÉR gyertya-csoportja (csúcs 158) esik a
 * felsőteste mögé.
 */
export const NPC_X = 560;

/**
 * Az interakciós zóna. A szélessége bőven a rajzolt alak fölött van (29 px), hogy a promptot
 * ne kelljen pixelre pontosan belőni — de messze a player becsapódási pontjától, tehát
 * landoláskor nem villan fel azonnal.
 */
export const INTERACT_ZONE = { width: 110, height: 60 } as const;

/**
 * A player teste [GROUND_TOP-46, GROUND_TOP] között van; a zóna közepe ennek a közepére néz,
 * hogy az ugráló player is kiváltsa.
 */
export const INTERACT_ZONE_Y = GROUND_TOP - INTERACT_ZONE.height / 2 + 7;

/**
 * PLACEHOLDER lore (Phase 9-ben cserélendő) — de a meglévő szálakra van felfűzve: a KAPU,
 * amit Lazarusnak kellett volna őriznie, az ŐRÜLT KIRÁLY, a VARJAK és a „szárnyatlan"
 * megszólítás mind visszaköszön a későbbi boss-párbeszédekben.
 *
 * A beszélő neve NAGYBETŰS, mint mindenhol máshol; a player oldalán `LAZARUS`.
 */
export const GODDESS_SPEAKER = 'A LÁNGŐRZŐ';
export const PLAYER_SPEAKER = 'LAZARUS';

export const GODDESS_DIALOGUE: DialogueLine[] = [
  { speaker: GODDESS_SPEAKER, text: 'Felébredtél. Pedig aki innen zuhan, az ritkán ébred fel.' },
  { speaker: PLAYER_SPEAKER, text: 'Hol vagyok? És mi történt velem?' },
  { speaker: GODDESS_SPEAKER, text: 'A hátad üres, szárnyatlan. Valaki elvette, ami a tiéd volt.' },
  { speaker: PLAYER_SPEAKER, text: 'Ki?' },
  { speaker: GODDESS_SPEAKER, text: 'Nem „ki". Ami a kapun átjött, annak nincs neve — csak éhsége.' },
  {
    speaker: GODDESS_SPEAKER,
    text: 'A szárnyaid nem törtek le. Fizetség voltak, és nem te fizettél velük.',
  },
  { speaker: PLAYER_SPEAKER, text: 'Akkor megkeresem azt, aki fizetett.' },
  {
    speaker: GODDESS_SPEAKER,
    text: 'Az őrült király tudja. Menj a várába, amíg még emlékszik a saját nevére.',
  },
  { speaker: PLAYER_SPEAKER, text: 'És te? Miért segítesz?' },
  {
    speaker: GODDESS_SPEAKER,
    text: 'Én csak a lángot őrzöm. Te vagy az, aki visszahozhatja, amit elvettek.',
  },
];

/** A prompt-szövegek. A repó összes interakciós promptja magyar és `E: `-vel kezdődik. */
export const TALK_PROMPT = 'E: Beszélgetés';
export const DEPART_PROMPT = 'E: Indulás';
