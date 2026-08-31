import Phaser from 'phaser';
import { MUSIC_KEYS, SFX_KEYS } from '../systems/AudioManager';
import {
  createPlayerAnimations,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  PLAYER_TEXTURES,
} from '../player/PlayerAnimations';
import {
  createCrowHarvesterAnimations,
  FRAME_SIZE as HARVESTER_FRAME_SIZE,
  TEXTURE_KEY as HARVESTER_TEXTURE_KEY,
} from '../enemies/CrowHarvesterAnimations';
import {
  createGravecallerAnimations,
  FRAME_SIZE as GRAVECALLER_FRAME_SIZE,
  GRAVECALLER_TEXTURES,
} from '../enemies/GravecallerAnimations';
import {
  createBeastAnimations,
  FRAME_SIZE as BEAST_FRAME_SIZE,
  TEXTURE_KEY as BEAST_TEXTURE_KEY,
} from '../enemies/BeastAnimations';
// A Beast Master UGYANAZT a `goatman.png` lapot használja, mint a Beast — új textúra tehát
// nem kell, csak saját (lassabb) időzítésű animáció-kulcsok.
import { createBeastMasterAnimations } from '../bosses/BeastMasterAnimations';
import {
  createMadKingAnimations,
  FRAME_HEIGHT as KING_FRAME_HEIGHT,
  FRAME_WIDTH as KING_FRAME_WIDTH,
  KING_TEXTURES,
} from '../bosses/MadKingAnimations';
import {
  createAncientDemonAnimations,
  FRAME_HEIGHT as DEMON_FRAME_HEIGHT,
  FRAME_WIDTH as DEMON_FRAME_WIDTH,
  DEMON_TEXTURES,
} from '../bosses/AncientDemonAnimations';
import {
  createShadeMinionAnimations,
  FRAME_SIZE as SHADE_FRAME_SIZE,
  SHADE_TEXTURES,
} from '../bosses/ShadeMinionAnimations';
import {
  createGraftedWingBreakerAnimations,
  CLEAN_TEXTURE_KEY as BOSS_CLEAN_TEXTURE_KEY,
  FRAME_HEIGHT as BOSS_FRAME_HEIGHT,
  FRAME_WIDTH as BOSS_FRAME_WIDTH,
  TEXTURE_KEY as BOSS_TEXTURE_KEY,
} from '../bosses/GraftedWingBreakerAnimations';
// Vite-on át importálva (nem `public/`-ból): így az asset hash-elve bekerül a buildbe,
// a base path (GitHub Pages) magától helyes lesz, és HIÁNYZÓ fájl esetén a build elszáll
// ahelyett, hogy néma 404 lenne futásidőben.
import bossThemeUrl from '../../assets/audio/boss-theme.mp3';
// Level 1 ambient: "Free Dark Fantasy Music" csomag, `Library of Veles (LOOP)`. A csomagban
// EGYÁLTALÁN nincs licenc/readme fájl — publikálás előtt tisztázandó (lásd CLAUDE.md nyitott
// jogi tételek). A forrás-cím megtartása a fájlnévben az egyetlen kapocs a csomaghoz.
import level1ThemeUrl from '../../assets/audio/library-of-veles.mp3';
// Level 2 ambient: AlkaKrab csomag, `2. Shadowforge Convergence (Loop)`. UGYANAZ a csomag,
// amiből a `boss-theme.mp3` jön (`4. Cursed Citadel (After Intro & Loop)` — bitre azonos
// másolat, md5 29fac9c2...). A LOOP-ra vágott változat kell, nem a `Tracks mp3/` teljes szám:
// az AudioManager `loop: true`-val játszik, tehát a Tracks-verzió intrója minden fordulónál
// újraszólna. A csomaghoz VAN licenc-dokumentum (`2D helper/music/Loops mp3/AlkaKrab Music
// License Info.pdf`), de a szövege nincs átolvasva — publikálás előtt tisztázandó
// (lásd CLAUDE.md nyitott jogi tételek). A forrás-cím a fájlnévben a kapocs a csomaghoz.
//
// FIGYELEM: ez a sáv 2026-08-30 óta a VÉGSŐ ARÉNÁÉ, nem a Level 2-é (user-döntés). A fájlnév
// SZÁNDÉKOSAN változatlan: a projektben a fájlnév a FORRÁS-számra mutat, nem a felhasználás
// helyére — a csere tehát csak kulcs-átkötés volt.
import finalBossThemeUrl from '../../assets/audio/shadowforge-convergence.mp3';
// Level 2 ambient: UGYANAZ az AlkaKrab csomag, `1. Whispers of the Abyss (Loop)`. A LOOP-ra
// vágott változat kell, nem a `Tracks mp3/` teljes szám: az AudioManager `loop: true`-val
// játszik, tehát a Tracks-verzió intrója minden fordulónál újraszólna.
import level2ThemeUrl from '../../assets/audio/whispers-of-the-abyss.mp3';
// Level 3 (`3. Eclipsed Desolation (Loop)`) és a Beast Master arénája
// (`5. Dread March (Loop)`) — UGYANAZ az AlkaKrab csomag, tehát nem nyit új jogi tételt.
// Mindkettő a LOOP-változat: a playMusic() `loop: true`-val játszik, tehát a teljes szám
// intrója minden fordulónál újraszólna.
import level3ThemeUrl from '../../assets/audio/eclipsed-desolation.mp3';
import boss3ThemeUrl from '../../assets/audio/dread-march.mp3';
// Boss 2 (Mad King) theme: UGYANAZ az AlkaKrab csomag, `6. Veil of Eternal Nightfall (Loop)`.
// Nem nyit új jogi tételt — ugyanaz a `2D helper/music/Loops mp3/` mappa, amiből a boss theme
// és a Level 2 sávja is jön (a licenc-PDF átolvasása továbbra is nyitott, lásd CLAUDE.md).
// A LOOP-változat kell: az AudioManager `loop: true`-val játszik.
import boss2ThemeUrl from '../../assets/audio/veil-of-eternal-nightfall.mp3';
// Harci SFX: "Free Fantasy SFX Pack" (TomMusic), a csomag `Attacks/` és `Spells/`
// almappáiból. A csomag ReadMe.txt-je NEM tartalmaz licencszöveget, csak elérhetőségeket —
// publikálás előtt tisztázandó (lásd CLAUDE.md nyitott jogi tételek). A fájlnevekben
// megtartott sorszám az egyetlen kapocs a forráscsomag fájljaihoz (`Sword Attack 2`,
// `Sword Impact Hit 1`, `Fireball 2`, `Fireball 3`, `Firebuff 2`, `Sword Attack 3`).
// WAV, nem OGG: univerzálisan támogatott böngészőben.
import swordSwingUrl from '../../assets/audio/sfx/sword-attack-2.wav';
import swordImpactUrl from '../../assets/audio/sfx/sword-impact-hit-1.wav';
import enemySwingUrl from '../../assets/audio/sfx/sword-attack-3.wav';
import fireballCastUrl from '../../assets/audio/sfx/fireball-2.wav';
import bossProjectileUrl from '../../assets/audio/sfx/fireball-3.wav';
import bossSpellImpactUrl from '../../assets/audio/sfx/firebuff-2.wav';
import gravecallerCastUrl from '../../assets/audio/sfx/fireball-1.wav';
// Player léptek + ugrás: UGYANEZ a TomMusic csomag, a `Footsteps/Stone/` almappából.
// A csomag minden lépéshangot KÉT változatban ad: `Stone X` és `Stone Chain X`. A kettő
// alapfelvétele azonos csúcsú és időzítésű, a Chain-en viszont rá van rétegezve egy
// láncing-csörgés (mérve: magasfrekvenciás energia-arány run 0.121 -> 0.165, jump
// 0.267 -> 0.501).
//
// A KETTŐ KÖZÜL NEM UGYANAZ NYER — és ez kézi teszten dőlt el, nem elvből:
//  - a LÉPÉS a `Chain` változat: a csörgés egy 285ms-os kadenciában a páncélos lovag
//    járásaként olvas;
//  - az UGRÁS viszont a SIMA változat. A Chain-jump borítékja ~300ms-nál VISSZAEMELKEDIK
//    a csúcs 81%-ára (a simánál csak 45%), tehát a hang VÉGÉN külön csörgő/ciripelő
//    utórezgés ül — a levegőben lévő karakter alatt ez indokolatlan és zavaró.
// Ha valaha visszacserélnéd: a hangerőt ÚJRA KELL SZÁMOLNI a mért csúcsból (lásd az
// AudioManager hangerő-tábláját). Itt a csere nem járt vele: 0.0811 -> 0.0800, 1.4%.
import playerFootstepUrl from '../../assets/audio/sfx/stone-chain-run-5.wav';
import playerJumpUrl from '../../assets/audio/sfx/stone-jump.wav';
// Enemy halál-hangok: "Monster Growls Attack and Deaths V.1". A csomagban NINCS
// licencszöveg, csak egy `Authors1.png` szerző-kép (Lazy Spartan Games / Michael Edwards) —
// nyitott jogi tétel, publikálás előtt tisztázandó (lásd CLAUDE.md). Az eredeti fájlnevek
// megtartva (`necroHurt` / `necroDeath (2)`): ez a kapocs a forráscsomaghoz.
// (A `*SfxUrl` utótag KELL: a `gravecallerDeathUrl` nevet már a Necromancer DEATH SPRITE
// sheet importja foglalja lentebb.)
import harvesterDeathSfxUrl from '../../assets/audio/sfx/necro-hurt.wav';
import gravecallerDeathSfxUrl from '../../assets/audio/sfx/necro-death-2.wav';
// A Beast (Enemy 3) haláltusája UGYANEBBŐL a csomagból (`fatmanbossDeath.wav`), tehát nem
// nyit új jogi tételt. SZÁRMAZTATOTT asset: a forrás 2,879 s hosszú, és KÉT részből áll — a
// valódi haláltusa 0–1,45 s-ig tart, majd ~0,3 s csend után egy külön, halkabb utórész
// következik. A repóban a fájl a forrás 0–1,55 s-a + 60 ms fade-out (a `death-groan-17`
// receptje). A csúcs (0.751) a vágástól nem változott, tehát a BEAST_DEATH_VOLUME is áll.
import beastDeathSfxUrl from '../../assets/audio/sfx/fatman-death.wav';
// A Mad King ugró becsapódása: UGYANAZ a TomMusic csomag (`Spells/Rock Wall 1.wav`), tehát
// nem nyit új jogi tételt. A kardsuhintásnál nehezebb, 2 mp-es dörej — a fight legnagyobb
// ütése. A fájlnévben megtartott csomagbeli név a kapocs a forráshoz.
import kingSlamUrl from '../../assets/audio/sfx/rock-wall-1.wav';
// Player halál. SZÁRMAZTATOTT asset: a forrás `2D helper/sounds/17. Death Groan (Male).wav`
// KÉT külön felvételt tartalmaz egy fájlban (50-330ms és 575-950ms, közte csend). Egyetlen
// halálhoz egy nyögés kell, ezért az ELSŐ szakasz van kivágva (0-360ms) + 30ms fade-out a
// vágás kattanása ellen. Így a hang a 1200ms-os respawn ELŐTT véget ér. A fájl csomag és
// licenc nélkül érkezett — nyitott jogi tétel (lásd CLAUDE.md).
import playerDeathUrl from '../../assets/audio/sfx/death-groan-17.wav';
// Player sprite sheetek (2D_SL_Knight_v1.0, lásd assets/sprites/knight/license.txt).
// Mind 128x64-es blokkokra van vágva.
import knightIdleUrl from '../../assets/sprites/knight/Idle.png';
import knightRunUrl from '../../assets/sprites/knight/Run.png';
import knightJumpUrl from '../../assets/sprites/knight/Jump.png';
import knightAttacksUrl from '../../assets/sprites/knight/Attacks.png';
import knightHurtUrl from '../../assets/sprites/knight/Hurt.png';
import knightDeathUrl from '../../assets/sprites/knight/Death.png';
import knightClimbUrl from '../../assets/sprites/knight/Climb.png';
import knightCastUrl from '../../assets/sprites/knight/Health.png';
// CrowHarvester (Enemy 1): egyetlen 1792x64-es csík, 28 db 64x64-es frame.
import crowHarvesterSheetUrl from '../../assets/sprites/crow-harvester/enemy04_sheet.png';
// Beast (Enemy 3): egyetlen 384x512-es lap = 6x8 db 64x64-es frame (48 cella, 41 rajzolt).
// A fájl a `2D helper/enemy/` GYÖKERÉBEN állt, csomag és licenc nélkül, és a
// `2D helper/Credits.txt`-ben sem szerepel — nyitott jogi tétel, publikálás előtt
// tisztázandó (lásd CLAUDE.md). Ezért maradt meg az EREDETI fájlnév: ez az egyetlen kapocs
// a forráshoz. A frame-tartományokat lásd a BeastAnimations.ts fejlécében.
import beastSheetUrl from '../../assets/sprites/beast/goatman.png';
// Gravecaller (Enemy 2): a "Necromancer" csomag, ÖT külön sheet, mind 96x96-os frame-ekkel.
// NINCS mellette licenc, és a `2D helper/Credits.txt`-ben sem szerepel — nyitott jogi tétel,
// publikálás előtt tisztázandó (lásd CLAUDE.md). Ezért maradtak meg az EREDETI fájlnevek:
// ez az egyetlen kapocs a forráscsomaghoz.
//
// Az Attack sheet SZÁRMAZTATOTT asset: a forrás 6016x128-as (128x128-as frame-ekkel), abból
// lett frame-enként (16,16,96,96) kivágással 4512x96. A 128-as frame ugyanis a 96-osnak
// pontosan 16px-es kerettel kipárnázott változata, és két frame-mérettel a FacingGeometry
// animációnként más lenne. A kivágás veszteségmentes (0 nem-üres levágott pixel).
import gravecallerIdleUrl from '../../assets/sprites/gravecaller/spr_NecromancerIdle_strip50.png';
import gravecallerWalkUrl from '../../assets/sprites/gravecaller/spr_NecromancerWalk_strip10.png';
import gravecallerCastSheetUrl from '../../assets/sprites/gravecaller/spr_NecromancerAttackWithoutEffect_strip47.png';
import gravecallerHitUrl from '../../assets/sprites/gravecaller/spr_NecromancerGetHit_strip9.png';
import gravecallerDeathUrl from '../../assets/sprites/gravecaller/spr_NecromancerDeath_strip52.png';
// Boss (The Grafted Wing-Breaker): a "Bringer of Death" csomag (Clembod — személyes és
// kereskedelmi használat + módosítás engedélyezett, újraértékesítés nem). Mindkét sheet
// 1120x744 = 8x8 db 140x93-as frame, AZONOS elrendezéssel; a `_no-Effect` változatból
// pontosan egy frame kell (a dash póz), lásd GraftedWingBreakerAnimations.DASH_FRAME.
// Az eredeti fájlnevek megmaradtak: ez köti vissza az assetet a forráscsomaghoz.
import bossSheetUrl from '../../assets/sprites/grafted-wing-breaker/Bringer-of-Death-SpritSheet.png';
import bossCleanSheetUrl from '../../assets/sprites/grafted-wing-breaker/Bringer-of-Death-SpritSheet_no-Effect.png';
// Boss 2 (The Mad King): a "Medieval King Pack 2" csomag — **CC-0**, tehát NEM nyitott jogi
// tétel (a License.txt be van másolva: assets/sprites/mad-king/license.txt). HÉT külön sheet,
// mind AZONOS 160x111-es frame-mel, VÁLTOZATLAN másolatként, eredeti fájlnéven. Egyetlen
// kivétel a `Take Hit.png` -> `Take-Hit.png` átnevezés: a Vite-import szóközös útvonallal
// törékeny (ugyanaz az ok, amiért a háttér-rétegek is át lettek nevezve).
//
// A csomag `Jump.png` / `Fall.png` sheetje SZÁNDÉKOSAN kimarad: az ugró becsapódás levegőben
// lévő pózát maga az `Attack3.png` f2 frame-je adja. A `Take Hit - white silhouette.png` sem
// kell — a találat-villanás a bevett setTint + TintModes.FILL úton megy.
import kingIdleUrl from '../../assets/sprites/mad-king/Idle.png';
import kingRunUrl from '../../assets/sprites/mad-king/Run.png';
import kingSlashUrl from '../../assets/sprites/mad-king/Attack1.png';
import kingLungeUrl from '../../assets/sprites/mad-king/Attack2.png';
import kingLeapUrl from '../../assets/sprites/mad-king/Attack3.png';
import kingDeathUrl from '../../assets/sprites/mad-king/Death.png';
import kingHitUrl from '../../assets/sprites/mad-king/Take-Hit.png';
// Boss 3 (Ancient Demon, Omen of Crows): az "Undead Executioner" csomag (darkpixel-kronovi /
// Kronovi-), amit a `2D helper/Credits.txt` MÁR kreditál ("final boss, by Kronovi-"). A csomag
// mappájában viszont NINCS licencfájl — a licenc SZÖVEGE nyitott tétel, publikálás előtt
// tisztázandó (lásd CLAUDE.md). Az EREDETI fájlnevek megmaradtak: ez a kapocs a forráshoz.
//
// ÖT sheet a bosshoz, mind AZONOS 100x100-as frame-mel. Az `idle.png` SZÁNDÉKOSAN kimarad:
// ugyanazt a lebegést adja gyorsabban, ráadásul üres záró frame-mel (lásd DEMON_TEXTURES).
// A csomagban NINCS járás- és NINCS hurt-animáció — ebből lett a démon karaktere (lebeg és
// villan), lásd AncientDemonAnimations.ts.
import demonIdleUrl from '../../assets/sprites/ancient-demon/idle2.png';
import demonComboUrl from '../../assets/sprites/ancient-demon/attacking.png';
import demonNovaUrl from '../../assets/sprites/ancient-demon/skill1.png';
import demonSummonUrl from '../../assets/sprites/ancient-demon/summon.png';
import demonDeathUrl from '../../assets/sprites/ancient-demon/death.png';
// Az idézett árnyék-lidércek — UGYANABBÓL a csomagból, de 50x50-es frame-mel, ezért külön
// animációs modullal (a frame-méret animációnként nem térhet el, lásd a 19. tanulságot).
import shadeAppearUrl from '../../assets/sprites/ancient-demon/summonAppear.png';
import shadeIdleUrl from '../../assets/sprites/ancient-demon/summonIdle.png';
import shadeDeathUrl from '../../assets/sprites/ancient-demon/summonDeath.png';
// Level 1 parallax háttér-rétegek. Forrás: PixelPlatformerSet1 v1.1 (Szadi art) —
// "License for Everyone / public domain, personal or commercial". A fájlok át lettek
// nevezve (`01 background.png` -> `01-sky.png` stb.), mert a Vite-import szóközös
// útvonallal törékeny; a forráscsomagot ez a komment köti vissza.
import bgSkyUrl from '../../assets/backgrounds/ruined-city/01-sky.png';
import bgMountainsUrl from '../../assets/backgrounds/ruined-city/02-mountains.png';
import bgRuinsUrl from '../../assets/backgrounds/ruined-city/03-ruins.png';
// Boss aréna háttere: egyetlen álló, teljes képernyős kép. SZÁRMAZTATOTT asset — a forrás
// a `2D helper/level/Bossbackground_1.png` (1672x941), amiből egy 1467x825-ös kivágás
// (bal-felső sarok: 103, 0) lett 800x450-re kicsinyítve. A kivágás nem esztétikai döntés:
// ez teszi a rajzolt padlóélt PONTOSAN a BossScene GROUND_TOP-jára (418). Lásd CLAUDE.md.
import bossArenaUrl from '../../assets/backgrounds/cathedral/boss-arena.png';
// Boss 2 aréna háttere: romos gótikus trónterem. SZÁRMAZTATOTT asset — a forrás a
// `2D helper/level/Second boss background.png` (1672x941), amiből egy sima 800x450-es
// KICSINYÍTÉS lett, KIVÁGÁS NÉLKÜL. A boss 1-nél azért kellett vágni, mert ott a GROUND_TOP
// (418) már adott volt; itt új scene, tehát a padlóvonalat igazítottuk a képhez
// (Boss2Scene.GROUND_TOP = 369). A forrás licenc nélkül érkezett — nyitott jogi tétel
// (lásd CLAUDE.md), mint a Bossbackground_1.png esetében.
import boss2ArenaUrl from '../../assets/backgrounds/throne-room/boss2-arena.png';
// Final boss aréna háttere: a "The Broken Gate" romos katedrális-trónterme. SZÁRMAZTATOTT
// asset — a forrás a `2D helper/level/Final boss background.png` (1672x941), amiből sima
// 800x450-es KICSINYÍTÉS lett, KIVÁGÁS NÉLKÜL: a forrás aspektusa (1.7768) gyakorlatilag
// azonos a 800/450-ével (1.7778). A rajzolt dais-perem így a 369. sorra esik =
// FinalBossScene.GROUND_TOP. A forrás licenc nélkül érkezett — nyitott jogi tétel
// (lásd CLAUDE.md), mint a másik két boss-háttér esetében.
import finalArenaUrl from '../../assets/backgrounds/broken-gate/final-arena.png';
// Level 2 parallax háttér-rétegek. Forrás: GothicVania Town (Luis Zuno / @ansimuz) —
// public domain, UGYANAZ a csomag, amiből a hangulati propok jönnek.
// MINDKETTŐ SZÁRMAZTATOTT, és a származtatás VESZTESÉGMENTES:
//   01-sky.png (384x450) = `layers/background.png` (384x288) + 162 sor tömör `#71405A`.
//     A forrás 186-287. sora BITRE AZONOS ezzel a színnel, tehát a toldás pixelre pontos —
//     így NEM kell függőlegesen nyújtani (a felhőkön és a hegygerincen az látszana).
//   02-town.png (768x450) = [`layers/middleground.png` | ugyanaz vízszintesen TÜKRÖZVE],
//     + 162 sor tömör `#392D55` (a forrás 236-287. sora). A tükrözés teszi vízszintesen
//     varratmentessé: a nyers réteg bal és jobb éle érdemben eltér (sziluett-tető 55-100
//     vs. 117), tükrözve viszont mindkét átmenet duplázott oszlopra esik.
import bgTownSkyUrl from '../../assets/backgrounds/gothic-town/01-sky.png';
import bgTownUrl from '../../assets/backgrounds/gothic-town/02-town.png';
// Level 1 terrain-csempék. Forrás: UGYANAZ a PixelPlatformerSet1 v1.1 csomag (Szadi art,
// public domain), amiből a fenti parallax háttér is jön — ezért illeszkedik a paletta
// korrekció nélkül. Származtatott assetek: kivágások a csomag `main_lev_build.png` és
// `other_and_decorative.png` lapjairól, ÁTMÉRETEZÉS NÉLKÜL. A forrás-rectek táblázata a
// `src/levels/LevelTileset.ts` fejlécében van.
import groundFloorUrl from '../../assets/tiles/cathedral/ground-floor.png';
import groundEdgeLeftUrl from '../../assets/tiles/cathedral/ground-edge-left.png';
import groundEdgeRightUrl from '../../assets/tiles/cathedral/ground-edge-right.png';
import platformMidUrl from '../../assets/tiles/cathedral/platform-mid.png';
import platformEdgeLeftUrl from '../../assets/tiles/cathedral/platform-edge-left.png';
import platformEdgeRightUrl from '../../assets/tiles/cathedral/platform-edge-right.png';
import doorGateUrl from '../../assets/tiles/cathedral/door-gate.png';
import ladderUrl from '../../assets/tiles/cathedral/ladder.png';
// Level 2 terrain-csempék, a GothicVania Town `PNG/environment/layers/sliced-tileset/`
// mappájából. Öt VÁLTOZATLAN másolat, eredeti fájlnéven; a `ground-strip.png` az egyetlen
// származtatott: `[ground-b.png | ground.png]` egymás mellé, mert a csomag saját preview-ja
// 32 px-es periódusban váltogatja a két talaj-variánst, egy tileSprite viszont csak egyet
// tud ismételni. A geometria a `src/levels/GothicTownTileset.ts` fejlécében van.
import townGroundUrl from '../../assets/tiles/gothic-town/ground-strip.png';
import townDeckUrl from '../../assets/tiles/gothic-town/top-wood.png';
import townCapLeftUrl from '../../assets/tiles/gothic-town/top-left-wood.png';
import townCapRightUrl from '../../assets/tiles/gothic-town/top-right-wood.png';
import townLegsUrl from '../../assets/tiles/gothic-town/wood-legs.png';
import townFootUrl from '../../assets/tiles/gothic-town/ground-wood-legs.png';
// Hangulati propok. Forrás: GothicVania Town (Luis Zuno / @ansimuz) — "License for Everyone.
// Public domain and free to use on whatever you want, personal or commercial." A csomag
// `PNG/environment/props-sliced/` mappájából VÁLTOZATLANUL másolva, eredeti fájlnéven (ez a
// kapocs a forráshoz). A lilás-hideg palettát a `PROP_TINT` korrigálja futásidőben.
import streetLampUrl from '../../assets/props/gothic-town/street-lamp.png';
import wagonUrl from '../../assets/props/gothic-town/wagon.png';
import wellUrl from '../../assets/props/gothic-town/well.png';
import crateUrl from '../../assets/props/gothic-town/crate.png';
import crateStackUrl from '../../assets/props/gothic-town/crate-stack.png';
// A Level 2-vel bejött két további prop és a három háttér-ház — UGYANABBÓL a csomagból,
// szintén változatlan másolatok, eredeti fájlnéven.
import barrelUrl from '../../assets/props/gothic-town/barrel.png';
import signUrl from '../../assets/props/gothic-town/sign.png';
import houseAUrl from '../../assets/props/gothic-town/house-a.png';
import houseBUrl from '../../assets/props/gothic-town/house-b.png';
import houseCUrl from '../../assets/props/gothic-town/house-c.png';
// Level 3 terrain-csempék. Forrás: GothicVania Church (Luis Zuno / @ansimuz), az
// `Assets/ENVIRONMENT/tileset.png` 336x224-es lapjáról kivágva, ÁTMÉRETEZÉS NÉLKÜL. A
// `ground-strip.png` és a `block-strip.png` SZÁRMAZTATOTT (variánsokat fűz egy csíkba, mert
// egy tileSprite csak egy textúrát tud ismételni) — a forrás-rectek és az indoklás a
// `src/levels/ChurchTileset.ts` fejlécében. FIGYELEM: a csomag licence PDF-ben van, és a
// szövege NEM olvasható ki — publikálás előtt tisztázandó (lásd ugyanott).
import churchGroundUrl from '../../assets/tiles/church/ground-strip.png';
import churchBlockUrl from '../../assets/tiles/church/block-strip.png';
import churchArchUrl from '../../assets/tiles/church/arch-gate.png';
import churchPillarUrl from '../../assets/tiles/church/pillar.png';
import churchBalustradeUrl from '../../assets/tiles/church/balustrade.png';
import churchAltarWallUrl from '../../assets/tiles/church/altar-wall.png';
import churchWallCrossUrl from '../../assets/tiles/church/wall-cross.png';
import churchFillBlockUrl from '../../assets/tiles/church/fill-block.png';
// A Level 3 háttér-paneljei: a csomag `backgrounds.png`-jének öt szelete + a `column.png`.
// Mind ÁTLÁTSZATLAN, `rgb(39,38,56)` kerettel — pontosan a scene háttérszíne, ezért ülnek
// varrat nélkül a lapos háttéren (és ezért nincs a pályának parallax rétege).
import churchBgWindowUrl from '../../assets/props/church/bg-window.png';
import churchBgColumnUrl from '../../assets/props/church/bg-column.png';
import churchBgAltarUrl from '../../assets/props/church/bg-altar.png';
import churchBgGargoyleUrl from '../../assets/props/church/bg-gargoyle.png';
import churchBgSconceUrl from '../../assets/props/church/bg-sconce.png';
import churchColumnUrl from '../../assets/props/church/column.png';
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';
import {
  BUILDING_TEXTURES,
  PROP_TEXTURES,
  SPIKE_HEIGHT,
  SPIKE_TILE_WIDTH,
} from '../levels/LevelGeometry';
import { DOOR_APERTURE, TILE_TEXTURES } from '../levels/LevelTileset';
import { TOWN_TILE_TEXTURES } from '../levels/GothicTownTileset';
import { CHURCH_TILE_TEXTURES } from '../levels/ChurchTileset';

/**
 * Az Ancient Demon mögötti derengés mérete és színe. A szélesség/magasság a démon látvány-
 * méretéből (90x124 világ-px) van felnagyítva, hogy a kontúrt körben elhagyja.
 */
const AURA_WIDTH = 150;
const AURA_HEIGHT = 200;
const AURA_COLOR = 0x6a3aa8;
const AURA_STEPS = 24;

const LOADING_BAR_WIDTH = 320;
const LOADING_BAR_HEIGHT = 14;

/**
 * Melyik pályán induljon a játék a betöltés után.
 *
 * NORMÁL érték: `'Level1Scene'`. A `'Level2Scene'`-re átírva a Level 2 KÖZVETLENÜL
 * tesztelhető, anélkül hogy végig kellene játszani a Level1 -> Boss -> átvezető láncot —
 * fejlesztés közben ez a leggyorsabb út az új szakaszokhoz. **Commit előtt mindig állítsd
 * vissza `'Level1Scene'`-re.**
 */
const START_SCENE = 'Level3Scene';

/**
 * A boss-ajtó mögötti folyosó két végpontja (R, G, B) — a küszöbnél még megcsillanó kőé és a
 * folyosó mélyéé. A kettő közt soronként interpolálunk, így az átjáró mélységet sugall.
 * A meleg árnyalat szándékos: a hideg feketétől lyuknak látszana, nem térnek.
 */
const DOOR_INTERIOR_NEAR = [0x2a, 0x1f, 0x24] as const;
const DOOR_INTERIOR_FAR = [0x0d, 0x09, 0x0c] as const;

/**
 * A Level 2 placeholder létra- és ajtó-textúrája. A méretek a `Level2Layout` `LADDERS`
 * `width`-jével és `DOOR`-jával tartoznak össze: a létra csempéje 32 széles (a mászási zóna
 * 28 — a RAJZOLT létra szélessége, mint a Level 1-en), az ajtó pedig 48x72.
 */
const LADDER_PLACEHOLDER_WIDTH = 32;
const LADDER_PLACEHOLDER_HEIGHT = 16;
const DOOR_PLACEHOLDER_WIDTH = 48;
const DOOR_PLACEHOLDER_HEIGHT = 72;

const PLAYER_SHEETS: Array<{ key: string; url: string }> = [
  { key: PLAYER_TEXTURES.IDLE, url: knightIdleUrl },
  { key: PLAYER_TEXTURES.RUN, url: knightRunUrl },
  { key: PLAYER_TEXTURES.JUMP, url: knightJumpUrl },
  { key: PLAYER_TEXTURES.ATTACK, url: knightAttacksUrl },
  { key: PLAYER_TEXTURES.HURT, url: knightHurtUrl },
  { key: PLAYER_TEXTURES.DEATH, url: knightDeathUrl },
  { key: PLAYER_TEXTURES.CLIMB, url: knightClimbUrl },
  // A Health.png a cast animáció forrása — a csomagban nincs magic anim, ez áll
  // legközelebb hozzá (felemelt piros izzó gömb + szikrák).
  { key: PLAYER_TEXTURES.CAST, url: knightCastUrl },
];

const MUSIC_TRACKS: Array<{ key: string; url: string }> = [
  { key: MUSIC_KEYS.BOSS_THEME, url: bossThemeUrl },
  { key: MUSIC_KEYS.BOSS2_THEME, url: boss2ThemeUrl },
  { key: MUSIC_KEYS.LEVEL1_THEME, url: level1ThemeUrl },
  { key: MUSIC_KEYS.LEVEL2_THEME, url: level2ThemeUrl },
  { key: MUSIC_KEYS.FINAL_BOSS_THEME, url: finalBossThemeUrl },
  { key: MUSIC_KEYS.LEVEL3_THEME, url: level3ThemeUrl },
  { key: MUSIC_KEYS.BOSS3_THEME, url: boss3ThemeUrl },
];

const SFX_SOUNDS: Array<{ key: string; url: string }> = [
  { key: SFX_KEYS.SWORD_SWING, url: swordSwingUrl },
  { key: SFX_KEYS.SWORD_IMPACT, url: swordImpactUrl },
  { key: SFX_KEYS.ENEMY_SWING, url: enemySwingUrl },
  { key: SFX_KEYS.FIREBALL_CAST, url: fireballCastUrl },
  { key: SFX_KEYS.BOSS_PROJECTILE, url: bossProjectileUrl },
  { key: SFX_KEYS.BOSS_SPELL_IMPACT, url: bossSpellImpactUrl },
  { key: SFX_KEYS.GRAVECALLER_CAST, url: gravecallerCastUrl },
  { key: SFX_KEYS.PLAYER_FOOTSTEP, url: playerFootstepUrl },
  { key: SFX_KEYS.PLAYER_JUMP, url: playerJumpUrl },
  { key: SFX_KEYS.PLAYER_DEATH, url: playerDeathUrl },
  { key: SFX_KEYS.HARVESTER_DEATH, url: harvesterDeathSfxUrl },
  { key: SFX_KEYS.GRAVECALLER_DEATH, url: gravecallerDeathSfxUrl },
  { key: SFX_KEYS.BEAST_DEATH, url: beastDeathSfxUrl },
  { key: SFX_KEYS.KING_SLAM, url: kingSlamUrl },
];

// Gravecaller (Enemy 2): öt külön sheet, mind 96x96-os frame-ekkel — a knight
// (PLAYER_SHEETS) mintájára. A Phaser animációi (textúra, frame) párokat tárolnak, tehát a
// `play()` magától átvált a megfelelő textúrára.
const GRAVECALLER_SHEETS: Array<{ key: string; url: string }> = [
  { key: GRAVECALLER_TEXTURES.IDLE, url: gravecallerIdleUrl },
  { key: GRAVECALLER_TEXTURES.WALK, url: gravecallerWalkUrl },
  { key: GRAVECALLER_TEXTURES.CAST, url: gravecallerCastSheetUrl },
  { key: GRAVECALLER_TEXTURES.HIT, url: gravecallerHitUrl },
  { key: GRAVECALLER_TEXTURES.DEATH, url: gravecallerDeathUrl },
];

// Mad King (Boss 2): hét külön sheet, mind 160x111-es frame-ekkel — a knight
// (PLAYER_SHEETS) és a Gravecaller mintájára.
const MAD_KING_SHEETS: Array<{ key: string; url: string }> = [
  { key: KING_TEXTURES.IDLE, url: kingIdleUrl },
  { key: KING_TEXTURES.RUN, url: kingRunUrl },
  { key: KING_TEXTURES.SLASH, url: kingSlashUrl },
  { key: KING_TEXTURES.LUNGE, url: kingLungeUrl },
  { key: KING_TEXTURES.LEAP, url: kingLeapUrl },
  { key: KING_TEXTURES.DEATH, url: kingDeathUrl },
  { key: KING_TEXTURES.HIT, url: kingHitUrl },
];

// Ancient Demon (Boss 3): öt külön sheet, mind 100x100-as frame-ekkel — a knight, a
// Gravecaller és a Mad King mintájára.
const ANCIENT_DEMON_SHEETS: Array<{ key: string; url: string }> = [
  { key: DEMON_TEXTURES.IDLE, url: demonIdleUrl },
  { key: DEMON_TEXTURES.COMBO, url: demonComboUrl },
  { key: DEMON_TEXTURES.NOVA, url: demonNovaUrl },
  { key: DEMON_TEXTURES.SUMMON, url: demonSummonUrl },
  { key: DEMON_TEXTURES.DEATH, url: demonDeathUrl },
];

// Az idézett árnyékok: három sheet, mind 50x50-as frame-ekkel.
const SHADE_MINION_SHEETS: Array<{ key: string; url: string }> = [
  { key: SHADE_TEXTURES.APPEAR, url: shadeAppearUrl },
  { key: SHADE_TEXTURES.IDLE, url: shadeIdleUrl },
  { key: SHADE_TEXTURES.DEATH, url: shadeDeathUrl },
];

// Sima képek (nem sprite sheetek): a Level 1 parallax rétegei + a boss arénák álló háttere.
const BACKGROUND_IMAGES: Array<{ key: string; url: string }> = [
  { key: BACKGROUND_TEXTURES.SKY, url: bgSkyUrl },
  { key: BACKGROUND_TEXTURES.MOUNTAINS, url: bgMountainsUrl },
  { key: BACKGROUND_TEXTURES.RUINS, url: bgRuinsUrl },
  { key: BACKGROUND_TEXTURES.BOSS_ARENA, url: bossArenaUrl },
  { key: BACKGROUND_TEXTURES.BOSS2_ARENA, url: boss2ArenaUrl },
  { key: BACKGROUND_TEXTURES.FINAL_ARENA, url: finalArenaUrl },
  { key: BACKGROUND_TEXTURES.TOWN_SKY, url: bgTownSkyUrl },
  { key: BACKGROUND_TEXTURES.TOWN, url: bgTownUrl },
];

// Level 1 terrain. A `GROUND_FLOOR`, a `PLATFORM_MID` és a `LADDER` tileSprite-ként
// ismétlődik (az első kettő vízszintesen, a létra függőlegesen); a többi egyszeri kép.
const TILE_IMAGES: Array<{ key: string; url: string }> = [
  { key: TILE_TEXTURES.GROUND_FLOOR, url: groundFloorUrl },
  { key: TILE_TEXTURES.GROUND_EDGE_LEFT, url: groundEdgeLeftUrl },
  { key: TILE_TEXTURES.GROUND_EDGE_RIGHT, url: groundEdgeRightUrl },
  { key: TILE_TEXTURES.PLATFORM_MID, url: platformMidUrl },
  { key: TILE_TEXTURES.PLATFORM_EDGE_LEFT, url: platformEdgeLeftUrl },
  { key: TILE_TEXTURES.PLATFORM_EDGE_RIGHT, url: platformEdgeRightUrl },
  { key: TILE_TEXTURES.DOOR_GATE, url: doorGateUrl },
  { key: TILE_TEXTURES.LADDER, url: ladderUrl },
];

// Level 2 terrain. A `GROUND`, a `PLATFORM_DECK` és a `PLATFORM_LEGS` tileSprite-ként
// ismétlődik (az első kettő vízszintesen, a lábak függőlegesen); a többi egyszeri kép.
const TOWN_TILE_IMAGES: Array<{ key: string; url: string }> = [
  { key: TOWN_TILE_TEXTURES.GROUND, url: townGroundUrl },
  { key: TOWN_TILE_TEXTURES.PLATFORM_DECK, url: townDeckUrl },
  { key: TOWN_TILE_TEXTURES.PLATFORM_CAP_LEFT, url: townCapLeftUrl },
  { key: TOWN_TILE_TEXTURES.PLATFORM_CAP_RIGHT, url: townCapRightUrl },
  { key: TOWN_TILE_TEXTURES.PLATFORM_LEGS, url: townLegsUrl },
  { key: TOWN_TILE_TEXTURES.PLATFORM_FOOT, url: townFootUrl },
];

// Level 3 terrain. A `GROUND` és a `PLATFORM_BLOCK` tileSprite-ként ismétlődik vízszintesen;
// a többi egyszeri kép (az `ARCH_GATE` a boss-ajtó, SCALE 2-vel kirakva).
const CHURCH_TILE_IMAGES: Array<{ key: string; url: string }> = [
  { key: CHURCH_TILE_TEXTURES.GROUND, url: churchGroundUrl },
  { key: CHURCH_TILE_TEXTURES.PLATFORM_BLOCK, url: churchBlockUrl },
  { key: CHURCH_TILE_TEXTURES.ARCH_GATE, url: churchArchUrl },
  { key: CHURCH_TILE_TEXTURES.PILLAR, url: churchPillarUrl },
  { key: CHURCH_TILE_TEXTURES.BALUSTRADE, url: churchBalustradeUrl },
  { key: CHURCH_TILE_TEXTURES.ALTAR_WALL, url: churchAltarWallUrl },
  { key: CHURCH_TILE_TEXTURES.WALL_CROSS, url: churchWallCrossUrl },
  { key: CHURCH_TILE_TEXTURES.FILL_BLOCK, url: churchFillBlockUrl },
];

// Level 2 háttér-épületek — világ-koordinátás díszlet (lásd src/levels/LevelDecor.ts).
const BUILDING_IMAGES: Array<{ key: string; url: string }> = [
  { key: BUILDING_TEXTURES.HOUSE_A, url: houseAUrl },
  { key: BUILDING_TEXTURES.HOUSE_B, url: houseBUrl },
  { key: BUILDING_TEXTURES.HOUSE_C, url: houseCUrl },
  // Level 3 — a church fal-panelek. Ugyanaz a SZEREP (világ-koordinátás háttér-tömeg a
  // BUILDING_DEPTH-en), de átlátszatlan falszakaszok, nem sziluettek.
  { key: BUILDING_TEXTURES.CHURCH_WINDOW, url: churchBgWindowUrl },
  { key: BUILDING_TEXTURES.CHURCH_COLUMN, url: churchBgColumnUrl },
  { key: BUILDING_TEXTURES.CHURCH_ALTAR, url: churchBgAltarUrl },
  { key: BUILDING_TEXTURES.CHURCH_GARGOYLE, url: churchBgGargoyleUrl },
  { key: BUILDING_TEXTURES.CHURCH_SCONCE, url: churchBgSconceUrl },
  { key: BUILDING_TEXTURES.CHURCH_PILLAR, url: churchColumnUrl },
];

// Hangulati propok — nem ütköző háttér-dekoráció (lásd src/levels/LevelDecor.ts). Az első
// öt a Level 1-en debütált, a `barrel`/`sign` a Level 2-vel jött; MINDET mindkét pálya
// használhatja, csak más tinttel (a Level 2 nyersen, lásd PROP_TINT_NONE).
const PROP_IMAGES: Array<{ key: string; url: string }> = [
  { key: PROP_TEXTURES.STREET_LAMP, url: streetLampUrl },
  { key: PROP_TEXTURES.WAGON, url: wagonUrl },
  { key: PROP_TEXTURES.WELL, url: wellUrl },
  { key: PROP_TEXTURES.CRATE, url: crateUrl },
  { key: PROP_TEXTURES.CRATE_STACK, url: crateStackUrl },
  { key: PROP_TEXTURES.BARREL, url: barrelUrl },
  { key: PROP_TEXTURES.SIGN, url: signUrl },
  // Level 3 — a church kőkorlát. MÁSIK csomagból jön, ezért kap a Level 3 minden propja
  // PROP_TINT_NONE-t (ott ez a hazai paletta).
  { key: PROP_TEXTURES.CHURCH_RAIL, url: churchBalustradeUrl },
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.createPlaceholderTextures();
    this.createLoadingIndicator();

    for (const track of MUSIC_TRACKS) {
      this.load.audio(track.key, track.url);
    }

    for (const sfx of SFX_SOUNDS) {
      this.load.audio(sfx.key, sfx.url);
    }

    for (const sheet of PLAYER_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
      });
    }

    this.load.spritesheet(HARVESTER_TEXTURE_KEY, crowHarvesterSheetUrl, {
      frameWidth: HARVESTER_FRAME_SIZE,
      frameHeight: HARVESTER_FRAME_SIZE,
    });

    // A goatman lap 6 oszlop x 8 sor; a Phaser a frame-eket sorfolytonosan indexeli, tehát a
    // BeastAnimations frame-számai közvetlenül használhatók.
    this.load.spritesheet(BEAST_TEXTURE_KEY, beastSheetUrl, {
      frameWidth: BEAST_FRAME_SIZE,
      frameHeight: BEAST_FRAME_SIZE,
    });

    for (const sheet of GRAVECALLER_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: GRAVECALLER_FRAME_SIZE,
        frameHeight: GRAVECALLER_FRAME_SIZE,
      });
    }

    for (const sheet of MAD_KING_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: KING_FRAME_WIDTH,
        frameHeight: KING_FRAME_HEIGHT,
      });
    }

    for (const sheet of ANCIENT_DEMON_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: DEMON_FRAME_WIDTH,
        frameHeight: DEMON_FRAME_HEIGHT,
      });
    }

    for (const sheet of SHADE_MINION_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: SHADE_FRAME_SIZE,
        frameHeight: SHADE_FRAME_SIZE,
      });
    }

    for (const sheet of [
      { key: BOSS_TEXTURE_KEY, url: bossSheetUrl },
      { key: BOSS_CLEAN_TEXTURE_KEY, url: bossCleanSheetUrl },
    ]) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: BOSS_FRAME_WIDTH,
        frameHeight: BOSS_FRAME_HEIGHT,
      });
    }

    for (const image of [
      ...BACKGROUND_IMAGES,
      ...TILE_IMAGES,
      ...TOWN_TILE_IMAGES,
      ...CHURCH_TILE_IMAGES,
      ...PROP_IMAGES,
      ...BUILDING_IMAGES,
    ]) {
      this.load.image(image.key, image.url);
    }
  }

  create(): void {
    // Az AnimationManager GAME-szintű, nem scene-szintű: elég egyszer, itt létrehozni,
    // és minden későbbi scene (Level1Scene, BossScene) ugyanazt használja.
    createPlayerAnimations(this);
    createCrowHarvesterAnimations(this);
    createGravecallerAnimations(this);
    createBeastAnimations(this);
    createBeastMasterAnimations(this);
    createGraftedWingBreakerAnimations(this);
    createMadKingAnimations(this);
    createAncientDemonAnimations(this);
    createShadeMinionAnimations(this);

    this.scene.start(START_SCENE);
  }

  // Ideiglenes, minimális betöltésjelző — a boss theme ~2 MB, ami első betöltéskor
  // (főleg deployolva) látható szünet. Phase 8 további iterációiban, több asset mellett
  // ez kaphat valódi UI-t a `ui/` modulban.
  private createLoadingIndicator(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 30, 'Betöltés...', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8a7a8a',
      })
      .setOrigin(0.5);

    const barX = centerX - LOADING_BAR_WIDTH / 2;
    const bar = this.add.graphics();

    this.load.on('progress', (progress: number) => {
      bar.clear();
      bar.fillStyle(0x2a1e2a, 1);
      bar.fillRect(barX, centerY, LOADING_BAR_WIDTH, LOADING_BAR_HEIGHT);
      bar.fillStyle(0xa02020, 1);
      bar.fillRect(barX, centerY, LOADING_BAR_WIDTH * progress, LOADING_BAR_HEIGHT);
    });
  }

  // A player, a CrowHarvester, a boss, valamint a Level 1 talaja/platformjai/létrája/ajtaja
  // NEM szerepel itt: nekik már valódi pixel art assetjük van.
  private createPlaceholderTextures(): void {
    // A `ground-placeholder` és a `platform-placeholder` MEGMARAD, de a Level 1-en már csak
    // LÁTHATATLAN FIZIKAI TESTKÉNT: a static bodyt vízszintesen skálázzuk (ami a textúrát
    // megnyújtaná), a látványt pedig külön tileSprite adja. Ugyanaz a szétválasztás, mint a
    // SpikeFieldnél és a létránál. A `ground-placeholder` ezen felül a BossScene-ben is él.
    const groundGfx = this.make.graphics({ x: 0, y: 0 }, false);
    groundGfx.fillStyle(0x3a3a3a, 1);
    groundGfx.fillRect(0, 0, 64, 32);
    groundGfx.generateTexture('ground-placeholder', 64, 32);
    groundGfx.destroy();

    const fireballGfx = this.make.graphics({ x: 0, y: 0 }, false);
    fireballGfx.fillStyle(0xff7a1a, 1);
    fireballGfx.fillCircle(8, 8, 8);
    fireballGfx.generateTexture('fireball-placeholder', 16, 16);
    fireballGfx.destroy();

    // Lebegő platform — szintén csak láthatatlan fizikai test (lásd fent).
    const platformGfx = this.make.graphics({ x: 0, y: 0 }, false);
    platformGfx.fillStyle(0x4a4a52, 1);
    platformGfx.fillRect(0, 0, 64, 16);
    platformGfx.generateTexture('platform-placeholder', 64, 16);
    platformGfx.destroy();

    // A `pillar-placeholder` TÖRÖLVE (a Level 1 létrája a lebegő platformnak van támasztva,
    // a mélység-illúziót pedig a parallax rétegek adják).
    //
    // A `ladder-placeholder` és a `door-placeholder` VISSZAKERÜLT a Level 2 miatt, és a
    // gothic-town tileset megérkezése után is KELL: a GothicVania Town csomagban NINCS
    // létra, a cathedral `door-gate` csempéje pedig se nem illik oda, se nem érvényes —
    // annak a geometriája (DOOR_APERTURE, DOOR_THRESHOLD_PX) ehhez a konkrét PNG-hez van
    // mérve. A Level 2 terrainje egyébként már valódi csempékből áll (TOWN_TILE_IMAGES).

    // Létra: FÜGGŐLEGESEN varratmentes csempe (két oldalléc + egy fok), hogy a tileSprite a
    // létra teljes hosszában ismételhesse — ugyanaz a szerep, mint a `tile-ladder`-é.
    const ladderGfx = this.make.graphics({ x: 0, y: 0 }, false);
    ladderGfx.fillStyle(0x53422f, 1);
    ladderGfx.fillRect(2, 0, 6, LADDER_PLACEHOLDER_HEIGHT); // bal oldalléc
    ladderGfx.fillRect(24, 0, 6, LADDER_PLACEHOLDER_HEIGHT); // jobb oldalléc
    ladderGfx.fillStyle(0x6d5a41, 1);
    ladderGfx.fillRect(2, 5, 28, 5); // fok
    ladderGfx.generateTexture(
      'ladder-placeholder',
      LADDER_PLACEHOLDER_WIDTH,
      LADDER_PLACEHOLDER_HEIGHT
    );
    ladderGfx.destroy();

    // Boss-ajtó: egyszerű, sötét boltív-nyílás kőkerettel. A trigger-zóna MAGA az ajtó
    // (nincs külön alpha-lyuk, mint a cathedral csempénél), tehát nincs mit elcsúsztatni.
    const doorGfx = this.make.graphics({ x: 0, y: 0 }, false);
    doorGfx.fillStyle(0x3b3326, 1);
    doorGfx.fillRect(0, 0, DOOR_PLACEHOLDER_WIDTH, DOOR_PLACEHOLDER_HEIGHT); // kőkeret
    doorGfx.fillStyle(0x120e12, 1);
    doorGfx.fillRect(6, 8, DOOR_PLACEHOLDER_WIDTH - 12, DOOR_PLACEHOLDER_HEIGHT - 8); // nyílás
    doorGfx.fillStyle(0x1d1820, 1);
    doorGfx.fillRect(6, 8, DOOR_PLACEHOLDER_WIDTH - 12, 6); // szemöldökfa
    doorGfx.generateTexture(
      'door-placeholder',
      DOOR_PLACEHOLDER_WIDTH,
      DOOR_PLACEHOLDER_HEIGHT
    );
    doorGfx.destroy();

    // A boss-ajtó mögötti folyosó. A `door-gate` csempe boltíve ÁTLÁTSZÓ, tehát nélküle a
    // parallax égbolt látszik át rajta: az ajtó "lyuk a falban" lenne, nem átjáró. A textúra
    // pontosan az alpha-lyuk méretű (lásd DOOR_APERTURE), és soronként sötétedik felfelé —
    // így mélységet sugall, nem lapos fekete foltot. Valódi asset az `assets/effects/`
    // iterációban jöhet a helyére.
    const doorInteriorGfx = this.make.graphics({ x: 0, y: 0 }, false);
    for (let row = 0; row < DOOR_APERTURE.height; row++) {
      // 1 = a nyílás teteje (a folyosó mélye), 0 = a küszöb (ide még jut fény)
      const depth = 1 - row / (DOOR_APERTURE.height - 1);
      const channel = (near: number, far: number) => Math.round(near + (far - near) * depth);
      const color =
        (channel(DOOR_INTERIOR_NEAR[0], DOOR_INTERIOR_FAR[0]) << 16) |
        (channel(DOOR_INTERIOR_NEAR[1], DOOR_INTERIOR_FAR[1]) << 8) |
        channel(DOOR_INTERIOR_NEAR[2], DOOR_INTERIOR_FAR[2]);

      doorInteriorGfx.fillStyle(color, 1);
      doorInteriorGfx.fillRect(0, row, DOOR_APERTURE.width, 1);
    }
    doorInteriorGfx.generateTexture(
      'door-interior-placeholder',
      DOOR_APERTURE.width,
      DOOR_APERTURE.height
    );
    doorInteriorGfx.destroy();

    // Tüskék (Level 1, D szakasz). Egyetlen 32x16-os csempe, amit a SpikeField tileSprite-tal
    // ismétel a mező hosszában. A világos csont-szín szándékos: a spec megköveteli, hogy a
    // hazard egyértelműen felismerhető legyen, a talaj (0x3a3a3a) és a poros vörös háttér
    // előtt pedig ez a legerősebb kontraszt.
    const spikeGfx = this.make.graphics({ x: 0, y: 0 }, false);
    spikeGfx.fillStyle(0x2e2a30, 1);
    spikeGfx.fillRect(0, 12, SPIKE_TILE_WIDTH, 4); // talapzat
    spikeGfx.fillStyle(0xc8c2b0, 1);
    for (let i = 0; i < 4; i++) {
      const x = i * 8;
      spikeGfx.fillTriangle(x, 14, x + 4, 0, x + 8, 14);
    }
    spikeGfx.generateTexture('spike-placeholder', SPIKE_TILE_WIDTH, SPIKE_HEIGHT);
    spikeGfx.destroy();

    // Swinging Reaper (Level 1, F szakasz) — a mennyezeti horgony: egy gerenda, amiről a
    // lánc lóg. Vízszintes elem, hogy a lengés tengelye egyértelmű legyen.
    const anchorGfx = this.make.graphics({ x: 0, y: 0 }, false);
    anchorGfx.fillStyle(0x1a1620, 1);
    anchorGfx.fillRect(0, 0, 48, 12);
    anchorGfx.fillStyle(0x4a4450, 1);
    anchorGfx.fillRect(0, 0, 48, 3); // felső él-fény
    anchorGfx.fillRect(21, 10, 6, 4); // a lánc befogása
    anchorGfx.generateTexture('hazard-anchor-placeholder', 48, 14);
    anchorGfx.destroy();

    // A lengő penge. A rajzolt alak nagyjából a 36x36-os textúra közepére van igazítva, mert
    // a sprite originje (0.5, 0.5) EGYBEESIK a találati kör középpontjával — a hitbox így a
    // grafika tényleges kiterjedéséből származik, nem szabadon hangolt szám.
    const bladeGfx = this.make.graphics({ x: 0, y: 0 }, false);
    bladeGfx.fillStyle(0x2e2a30, 1);
    bladeGfx.fillRect(15, 0, 6, 14); // nyél-csonk: ide fut be a lánc
    bladeGfx.fillStyle(0xc8c2b0, 1);
    bladeGfx.fillTriangle(18, 10, 1, 26, 35, 26); // penge felső éle
    bladeGfx.fillTriangle(1, 26, 35, 26, 18, 35); // lefelé futó hegy
    bladeGfx.fillStyle(0x8f8a80, 1);
    bladeGfx.fillTriangle(18, 10, 1, 26, 12, 26); // árnyékos belső él
    bladeGfx.generateTexture('reaper-blade-placeholder', 36, 36);
    bladeGfx.destroy();

    // Köztes checkpoint jelölő (Level 1, a spike-szakasz után): egy alacsony talapzat +
    // egy karcsú oszlop. Aktiválatlanul sötét; aktiváláskor a scene setTint()-tel
    // világítja ki, ezért a textúra szándékosan világosszürke alapon készül.
    const checkpointGfx = this.make.graphics({ x: 0, y: 0 }, false);
    checkpointGfx.fillStyle(0x9a9aa8, 1);
    checkpointGfx.fillRect(0, 56, 24, 8); // talapzat
    checkpointGfx.fillRect(8, 8, 8, 48); // oszlop
    checkpointGfx.fillStyle(0xd8d0c0, 1);
    checkpointGfx.fillRect(4, 0, 16, 10); // tálca a láng helyén
    checkpointGfx.generateTexture('checkpoint-placeholder', 24, 64);
    checkpointGfx.destroy();

    // Boss lövedék: nagyobb és lilás, hogy egyértelműen elváljon a player tűzgolyójától.
    const bossProjectileGfx = this.make.graphics({ x: 0, y: 0 }, false);
    bossProjectileGfx.fillStyle(0xa855f7, 1);
    bossProjectileGfx.fillCircle(10, 10, 10);
    bossProjectileGfx.generateTexture('boss-projectile-placeholder', 20, 20);
    bossProjectileGfx.destroy();

    // Az Ancient Demon AURÁJA — READABILITY-eszköz, nem dísz.
    //
    // MÉRVE: a démon köpenye rgb(14,12,12) = 12.7 luminancia, a final aréna háttere ott,
    // ahol áll, medián 21.7 — de a legsötétebb tizedében 10.0. A fekete sziluett tehát a
    // kép sötét foltjaiban ELTŰNIK. Tinttel ez nem javítható: a MULTIPLY tint csak
    // sötétíteni tud. Ezért kap a démon egy halvány derengést MAGA MÖGÉ.
    //
    // Radiális átmenet koncentrikus ellipszisekből: kívülről befelé haladva nő az alfa,
    // tehát a szél lágyan elfogy, és nem lesz látható korongja. Az ellipszis SZÁNDÉKOSAN
    // magasabb, mint amilyen széles: a lény is az.
    const auraGfx = this.make.graphics({ x: 0, y: 0 }, false);
    for (let step = AURA_STEPS; step > 0; step--) {
      const ratio = step / AURA_STEPS;
      auraGfx.fillStyle(AURA_COLOR, (1 - ratio) ** 2);
      auraGfx.fillEllipse(
        AURA_WIDTH / 2,
        AURA_HEIGHT / 2,
        AURA_WIDTH * ratio,
        AURA_HEIGHT * ratio
      );
    }
    auraGfx.generateTexture('demon-aura-placeholder', AURA_WIDTH, AURA_HEIGHT);
    auraGfx.destroy();

    // Gravecaller lövedék: HARMADIK szín, mert három lövedék-forrás van a pályán. A player
    // narancs (0xff7a1a), a bossé lila (0xa855f7) — ez mérgeszöld, ami a Level 1 vörösesbarna
    // palettáján a legerősebben elválik mindkettőtől. Méretben a playeréhez igazodik (16px),
    // hogy „normál enemy lövedék"-ként olvasson, ne bossosan.
    const gravecallerProjectileGfx = this.make.graphics({ x: 0, y: 0 }, false);
    gravecallerProjectileGfx.fillStyle(0x3e7d4f, 1);
    gravecallerProjectileGfx.fillCircle(8, 8, 8);
    gravecallerProjectileGfx.fillStyle(0x8ef2a8, 1);
    gravecallerProjectileGfx.fillCircle(8, 8, 4); // világos mag: a sötét háttér előtt is látszik
    gravecallerProjectileGfx.generateTexture('gravecaller-projectile-placeholder', 16, 16);
    gravecallerProjectileGfx.destroy();
  }
}