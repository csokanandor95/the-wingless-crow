# The Wingless Crow — fejlesztési napló

Ez a fájl a projekt **történetét** tartalmazza: fázisonként és iterációnként, hogy mi
készült el, milyen döntést hoztunk, és — ami a legfontosabb — **miért úgy**.

**A három dokumentum viszonya:**

| Fájl | Mire válaszol | Mikor nézd |
|---|---|---|
| `CLAUDE.md` | **Mi van most?** Rendszerek, fájlok, paraméterek, technikai tanulságok. | Ha folytatod a fejlesztést. |
| `docs/Project_plan.md` | **Mit terveztünk?** Game design, scope, roadmap. | Tervezési vagy scope-kérdésnél. |
| `docs/devlog.md` (ez) | **Hogyan jutottunk ide?** Iterációk, elvetett alternatívák, mérések. | Ha egy döntés indoklása kell, vagy tudni akarod, mit próbáltunk már. |

A dátumozott bejegyzések napra pontosak; a fázis-számozás a `Project_plan.md` 21. pontjának
roadmapjét követi.

---

## A Claude Code előtti szakasz — a chat-fejlesztés lezárása

A chat-beszélgetés közepén, mielőtt Claude Code-ra váltottunk, ez a kérdés függőben maradt, **válasz nélkül**:

> A Project_plan.md 11. pontja az Archer/Caster-t (Enemy 2) és a Beast-et (Enemy 3, opcionális) is felsorolja, de a 21. pont Phase 5 roadmap sora kifejezetten csak "CrowHarvester"-t nevesíti.

Három opció volt feltéve a usernek:
1. Csak CrowHarvester (terv szerint) → mehetünk Phase 6 – Level-re
2. Archer hozzáadása most, mielőtt továbbmegyünk
3. Archer ÉS Beast hozzáadása most

**Ez frissítve lett a Project_plan.md-ben, és az alapján mehetünk tovább a Phase 6 - Level-re. Egy Döntési pont lett beszúrva a Phase 8 - Atmosphere után, ahol eldöntjük majd, hogy mi következik: Többi Enemy típus, Level és Bossok létrehozása VAGY haladunk tovább a Lore, QA irányba és ha mindez megvan, akkor bővítjük csak a többi Enemy, Level és Boss hozzáadásával.**


---

## Step 1 – Phase 7 — az alaplánc kiépülése

Készen: Step 1 (Projekt setup), Phase 2 (Player), Phase 3 (Combat), Phase 4 (Magic), Phase 5 (Enemy) részlegesen — CrowHarvester kész.

**Phase 6 (Level) KÉSZ:** level layout, platforms, environment, checkpoint, transition mind megvan. A pálya végi ajtónál (`door-placeholder`, `H1` platform) **E** billentyűvel aktiválható a checkpoint, ami egyben fade-out után átvált a `BossScene`-re.
*(A Phase 6 ÚJRA MEG LETT NYITVA a Phase 8 közben — lásd lentebb a „Level 1 Redesign" blokkot.
A pálya 3200 → 6000 px, a talaj szegmensekre bomlott, és szakadékok kerültek bele.)*

**Phase 7 (Boss) KÉSZ:** valódi boss (`bosses/GraftedWingBreaker.ts` — *The Grafted
Wing-Breaker*, a Project_plan.md 12. pontja szerinti névvel), fix 800×450-es boss aréna,
boss entrance, HP-bar, két fázis, boss victory. A győzelem után egy adatvezérelt szöveges
átvezető (`NarrationScene`) következik, onnan a `Level2Scene`.
**A teljes lánc végigjátszható:** `Level1 → ajtó (E) → BossScene → NarrationScene →
Level2Scene → ajtó (E) → NarrationScene → Boss2Scene → NarrationScene → (végső boss)`.

## Phase 8 – Atmosphere

### Phase 8 — 1. iteráció: boss music

**Phase 8 (Atmosphere) ELINDULT — 1. iteráció: boss music kész.** `systems/AudioManager.ts`
(egy zenesáv, loop, fade-in/fade-out) + `assets/audio/boss-theme.mp3` (2 MB). A zene a boss
belépőjénél indul, a harc alatt loopol, és elhalkulva leáll, ha a player VAGY a boss meghal.

### Phase 8 — 2. iteráció: player sprite + animációk

**Phase 8 — 2. iteráció: PLAYER SPRITE + ANIMÁCIÓK kész.** A player már nem téglalap, hanem
valódi pixel art (`assets/sprites/knight/`, a *2D_SL_Knight_v1.0* csomagból — "License for
Everyone", kereskedelmi használat és módosítás engedélyezett, credit nem kötelező; a
`license.txt` be van másolva a repóba). Új modul: `player/PlayerAnimations.ts`. Részletek
lentebb, az "Implementált gameplay / Player" és a "Fontos technikai tanulságok" alatt.

### Phase 8 — 3. iteráció: CrowHarvester (Enemy 1) sprite + átnevezés

**Phase 8 — 3. iteráció: CrowHarvester (Enemy 1) SPRITE + ÁTNEVEZÉS kész.** Az Enemy 1
korábbi neve `Hollow` volt; a hozzá választott pixel art egy csuklyás, csőrös, **kaszás**
dögevő, ami sokkal jobban illik a varjú-tematikába, mint egy husk-lovag — ezért a lény
neve **`CrowHarvester`** lett, és az átnevezés végigfut a kódon, a teszteken és mindkét
dokumentumon. A gameplay-paraméterek és a state machine változatlanok. Új modul:
`enemies/CrowHarvesterAnimations.ts`. Részletek lentebb.

### Phase 8 — 4. iteráció: Level 1 parallax háttér

**Phase 8 — 4. iteráció: LEVEL 1 PARALLAX HÁTTÉR kész.** A `Level1Scene` három valódi
háttérrétegű parallaxot kapott (`assets/backgrounds/ruined-city/`, a *PixelPlatformerSet1
v1.1* csomagból — Szadi art, **public domain**, kereskedelmi használat is engedélyezett).
Új modul: `systems/ParallaxBackground.ts`. Az öt korábbi `pillar-placeholder`
dekor-oszlop törölve, a szerepüket a rétegek vették át. A `BossScene` háttere
szándékosan változatlan (külön asset lesz hozzá). Részletek lentebb, a "Level1Scene"
és a "Fontos technikai tanulságok" alatt.

### Phase 8 — 5. iteráció: boss aréna háttér

**Phase 8 — 5. iteráció: BOSS ARÉNA HÁTTÉR kész.** A `BossScene` egyetlen álló, teljes
képernyős festményt kapott (`assets/backgrounds/cathedral/boss-arena.png`): egy romos
gótikus katedrális, ami palettában pontosan illik a Level 1 hátteréhez. **Nem**
`ParallaxBackground` — a kamera fix, nincs mit eltolni. A 3 `pillar-placeholder` +
1 `door-placeholder` dekoráció törölve, a szürke talaj-téglalap pedig láthatatlanná téve
(a fizikája megmarad). Részletek lentebb, a "BossScene" szakaszban.

### Phase 8 — 6. iteráció: boss sprite + Shadow Spell

**Phase 8 — 6. iteráció: BOSS SPRITE + SHADOW SPELL kész.** A *Grafted Wing-Breaker* már
nem placeholder téglalap, hanem valódi pixel art (`assets/sprites/grafted-wing-breaker/`,
a **Bringer of Death** csomagból — Clembod; személyes és kereskedelmi használat + módosítás
engedélyezett, újraértékesítés nem). Új modulok: `bosses/GraftedWingBreakerAnimations.ts`,
`systems/SpriteFacing.ts` (a CrowHarvesterrel MEGOSZTOTT fordulás-kompenzáció),
`systems/AfterImageTrail.ts`.

A csomag egyetlen hiányossága, hogy **nincs dash animációja**. Két irányból oldottuk meg:
- **A charge** egy MEGTARTOTT kitörés-pózt kapott a sheet effekt nélküli változatáról
  (`clean[20]`), plusz egy afterimage-csíkot. A windup (`Attack f16–19`) és a dash póz
  animáció-folytonos: a boss hátrahúzza a kaszát, majd abból lendül előre.
- **Új negyedik támadás: Shadow Spell** (`Cast` + a csomag különálló `Spell` effektje).
  A boss a player AKKORI pozíciójára idéz egy árny-oszlopot, ami 960 ms-ig izzásként lebeg
  a feje fölött, és csak utána csap le → oldalra kilépve kikerülhető. **Mindkét fázisban**
  elérhető (a charge továbbra is csak Phase 2-ben).

A boss `SCALE = 2` (94×112 px látvány), és ezzel együtt a **`SLASH_RANGE` 70 → 138**:
a projekt elve szerint a hitbox az animáció tényleges kiterjedéséből származik, itt a kasza
mért nyúlásából. Ez érdemi balansz-változás — lásd a "Nyitott polish-tételek" alatt.
Az aréna **két lebegő platformja törölve** (user döntés): a charge és a spell elől is tiszta,
akadálymentes padlón kell kitérni.

### Phase 8 — 7. iteráció: kard SFX

**Phase 8 — 7. iteráció: KARD SFX kész.** Az `AudioManager` megkapta a `playSfx()`-et, és
ezzel a projekt első hangeffektjeit: a player kardsuhintását és a kard becsapódását
(`assets/audio/sfx/`, a *Free Fantasy SFX Pack* — TomMusic; a csomag `ReadMe.txt`-je
**nem tartalmaz licencszöveget**, lásd a nyitott jogi tételeket lentebb).
- A **suhintás azonnal, a gombnyomásra** szól, nem a 150ms-os startup után (user döntés):
  az azonnali input-visszajelzés többet ér, mint a képi szinkron.
- A **becsapódás mindkét scene-ben** szól — a CrowHarvesteren ÉS a bosson.
- **±120 cent véletlen detune** hívásonként, hogy a sorozatos csapások ne váljanak gépiessé.

### Phase 8 — 8. iteráció: a maradék harci hangok

**Phase 8 — 8. iteráció: A MARADÉK HARCI HANGOK kész.** Ugyanabból a TomMusic csomagból még
négy hang, új infrastruktúra nélkül (asset + `SFX_KEYS` bejegyzés + egy `playSfx()` hívás):
- **player tűzgolyó** (`fireball-2.wav`) — a `'fireball-cast'` pillanatában, mindkét scene-ben;
- **boss lövedék** (`fireball-3.wav`) — SZÁNDÉKOSAN másik hang, hallani, kié a lövedék;
- **Shadow Spell** (`firebuff-2.wav`) — a hang a **becsapódáskor** indul (`SPELL_IMPACT_MS`,
  1140ms), nem a 960ms-os telegraph alatt: a néma lebegés maga a kitérési ablak;
- **CrowHarvester ÉS boss közelharc** (`sword-attack-3.wav`, közös kulcs) — a **csapás
  pillanatában** (300 / 400ms), nem a windup elején. A CrowHarvester windupja egy mozdulatlan,
  magasba emelt kasza-póz; a suhogás a fehér ívhez tartozik. Új időzítő nem kellett: mindkét
  osztály a meglévő sebzés-`delayedCall`-jában emittál (`'harvester-attack'` / `'boss-slash'`),
  a `DEAD` guard mögött — a windup alatt megölt lény már nem csap hangosan.

Szándékosan **néma marad** (külön SFX-tételek): a tűzgolyók becsapódása, az enemy→player
sebzés (hurt), a charge, valamint az ugrás / halál / checkpoint / léptek.

### Phase 8 — 9. iteráció: Level 1 háttérzene

**Phase 8 — 9. iteráció: LEVEL 1 HÁTTÉRZENE kész.** A pálya megkapta a saját ambient sávját
(`assets/audio/library-of-veles.mp3`, a *Free Dark Fantasy Music* csomag `Library of Veles
(LOOP)`-ja — **licenc fájl nélkül**, lásd a nyitott jogi tételeket). Loopol, amíg a player
az ajtón át nem lép a `BossScene`-re.
- **Új rendszer NEM kellett**: a `Level1Scene`-nek már volt `AudioManager` példánya (7.
  iteráció, SFX-hez), és az `AudioManager` scene-hatóköre itt PONT a kívánt élettartam —
  a scene shutdownja elvágja a zenét. *(A korábbi „level ambienthez game-szintűvé kell
  emelni" megjegyzés csak egy scene-eken ÁTÍVELŐ ambientre igaz, erre a követelményre nem.)*
- **Az ajtó-átmenet explicit kifadeli a zenét** (`stopMusic(TRANSITION_FADE_MS)`), a
  kamera-fade-del EGYÜTT, ugyanabból a konstansból — enélkül a shutdown-hook fade nélkül,
  hirtelen pattintaná le a fekete képernyő pillanatában.
- **Halál/respawn a pályán nem szakítja meg a zenét** (a scene nem indul újra, csak a
  `player.respawn()` fut).
- **Az autoplay-ág mostantól a FŐ út, nem élhelyzet** — lásd lentebb az Audio szakaszban.

### Phase 8 — 10. iteráció: Level 1 terrain

**Phase 8 — 10. iteráció: LEVEL 1 TERRAIN kész.** A talaj, a lebegő platformok, a létra és a
boss-ajtó már nem kódból generált téglalap, hanem valódi pixel art
(`assets/tiles/cathedral/`). A forrás **ugyanaz a PixelPlatformerSet1 v1.1 csomag**
(Szadi art, public domain), amiből a Level 1 parallax háttere jön — ezért illeszkedik a
paletta korrekció nélkül (mért átlagszín: padló `(42,33,33)`, platform `(63,51,50)`, a
`03-ruins` háttérréteg `(74,45,39)`). Új modul: `src/levels/LevelTileset.ts`.
- **A fizika és a látvány KÜLÖN objektum** (mint a `SpikeField`-nél és a létránál): a static
  bodyt vízszintesen skálázzuk, ami a valódi textúrát megnyújtaná, ezért a
  `ground-placeholder` / `platform-placeholder` sprite **`setVisible(false)`**, a látványt
  pedig tileSprite adja. Ezért marad meg mindkét placeholder textúra a `BootScene`-ben.
- **A szegmens-végzárók a szegmensen BELÜL vannak** (16px), nem kifelé lógva: a szakadék fölé
  nyúlva hamis járható felületet sugallnának — pont ott, ahol a player a legpontosabban méri
  fel az ugrást.
- **A platform-végzáró RÁ rajzolódik a lapra, nem helyette**: a 48×32-es csempe felső 16px-e a
  lap folytatása, alsó 16px-e a lelógó szikla, ami átlósan elfogy — a kifutó részen a lap
  látszik át alatta. Fordított sorrendben a lap kitakarná a sziklát. **Egycsempés platformra
  (`C1`, `E1`) nem fér el a két végzáró** (2×48 > 64), és ez nem hiányosság: a csupasz lap
  vizuálisan elválasztja a „lépőkövet" a valódi platformoktól.
- **Az ajtó geometriája MÉRT, nem hangolt**: a 64×128-as csempén a boltív ÁTLÁTSZÓ nyílása
  (`DOOR_APERTURE`) `x = 13..50` (38px), `y = 48..105` (58px). A képet `origin (0.5, 1)`-gyel
  `platformTop + DOOR_THRESHOLD_PX`-re rakva **a boltív padlója pontosan a járható felszínre
  esik** — enélkül a player a kőben állna. A küszöb-kő ilyenkor a platform alá lóg, ezért megy
  az ajtó a terrainnél **hátrébb** (`DOOR_DEPTH = -6` < `TERRAIN_DEPTH = -5`). A trigger-zóna a
  **nyílást** fedi (58px), nem a teljes csempét.
  - **A `DOOR_THRESHOLD_PX` szándékosan 19, nem 22** (= a csempe alja mínusz az alpha-lyuk
    alja): a különbség pont a boltív rajzolt belső padlójának 3 px-e, aminek a járható felszín
    FÖLÖTT kell látszania. A csempe 106–108. sora sötét, de ÁTLÁTSZATLAN — ezért kell az
    alpha-csatornából mérni, nem fényesség alapján.
  - **A nyílás mögé `door-interior-placeholder` kerül** (`DOOR_INTERIOR_DEPTH = -7`, tehát az
    ajtó mögé): enélkül a parallax égbolt látszana át a boltíven, és az ajtó „lyuk a falban"
    lenne, nem átjáró. A textúra pontosan az alpha-lyuk méretű, és soronként sötétedik felfelé.
- **A létra mögötti `pillar-placeholder` hátfal TÖRÖLVE** (user-döntés): a létra egyszerűen a
  `H1` platformnak van támasztva, a fokok között a parallax háttér látszik át. A tileSprite a
  teljes **32px**-es csempeszélességgel rajzol (különben a minta csonkolódna), a mászási zóna
  viszont marad **28** — az a RAJZOLT létra szélessége, tehát a mászás bitre változatlan.
- **Törölt placeholder textúrák**: `ladder-placeholder`, `pillar-placeholder`,
  `door-placeholder`.

### Phase 8 — 11. iteráció: Level 1 hangulati propok

**Phase 8 — 11. iteráció: LEVEL 1 HANGULATI PROPOK kész.** A pálya 11 nem ütköző
háttér-dekorációt kapott (`assets/props/gothic-town/`): utcai lámpa ×3, szekér ×2, kút ×1,
láda ×2, ládahalom ×3. Forrás: **GothicVania Town** (Luis Zuno / @ansimuz) — **public domain**.
Új modul: `src/levels/LevelDecor.ts`.
- **Nincs physics body és nincs osztály**: tiszta díszlet, a gameplay-re nulla hatással. A
  `DECOR_DEPTH = -10` miatt a player és az enemyk **előttük** mennek el.
- **1:1-es méret, skálázás NÉLKÜL**: a csomag karakterei 42–47 px magasak, a mi lovagunk 46 —
  a propok arányai eleve stimmelnek.
- **`origin (0.5, 1)`**: a prop a TALPÁNÁL van pozicionálva, tehát pontosan a felület
  felszínén áll; a magasságát nem kell sehol felezni.
- **KÉT tint, nem egy** (`PROP_ASSETS[...].tint`). A MULTIPLY tint megőrzi a csatorna-arányokat,
  ezért egy közös érték nem tudja mindkét anyagcsoportot kezelni:
  - **fa** (szekér, ládák) nyersen `(77,49,60)`, majdnem meleg → `PROP_TINT_WARM_SOURCE`
    (`0xc0b890`) → `(57,35,33)`;
  - **kő/vas** (lámpa, kút) nyersen `(49,37,63)`, a kék/zöld arány **1.7** → ugyanettől a
    tinttől csak szürke lenne. Ezért kap `PROP_TINT_COOL_SOURCE`-t (`0xffdc71`), ami a
    vöröshöz nem nyúl, a kéket viszont felezi → `(49,31,27)`. **A kettőt ne cseréld fel**:
    a fa propok a hideg tinttől feltűnően telített narancsra váltanának.
  - A cél-sáv mindkettőnél ugyanaz: a talaj `(42,33,33)` és a mögöttük lévő `03-ruins`
    háttérréteg `(74,45,39)` KÖZÖTT — a díszlet legyen sötétebb a gameplay-elemeknél, de ne
    sötétebb a mögötte lévő rétegnél.
  - **HARMADIK tint is van azóta** (`BUILDING_TINT_CATHEDRAL_SOURCE`, a Level 1 háza), és a
    létezése a fenti „két csoport" gondolkodás korrekciója: **a tintet a NYERS ARÁNYBÓL kell
    választani, nem az anyag kategóriájából.** A ház szintén „kő", de nyersen jóval kevésbé
    kék a lámpánál (`R/B` 1,13 vs. 0,77), ezért a hideg tint rajta túllő. Részletek a
    „Finomhangolás, 2. kör" blokkban.
- **Az elhelyezés unit-tesztelt, nem szemre rakott** (`DECOR_PROPS` a `Level1Layout.ts`-ben):
  minden lábnyom egyetlen talaj-szegmensen belül marad, nem metsz spike-mezőt, nem lóg a
  kasza söprési sávjába (ezért van a `G-well` 4790-en és nem 4760-on), nem takarja a létrát
  vagy a köztes checkpointot, és nem ér bele a fölötte lévő platform aljába.
- **A tüskemező (2740–2868) környéke szándékosan ÜRES**: a hazard olvashatósága fontosabb a
  díszletnél. (Egy hangoló körben volt ott lámpa „jelölőnek", de a user kivetette.)
- **A H szakaszban KÉT lámpa fogja közre a létra lábát** (`LADDER.x ± 40`), tehát a felfelé
  vezető út meg van világítva. Unit teszt őrzi, hogy tényleg az egyik balra, a másik jobbra
  van — az „nem takarja a létrát" állítás önmagában megengedné, hogy mindkettő egy oldalra
  kerüljön.

A Phase 8 többi része (a maradék environment sprite-ok, a maradék SFX, particles,
`ui/` modul) még hátravan.

### Phase 8 — 12. iteráció: Level 2 háttérzene

**Phase 8 — 12. iteráció: LEVEL 2 HÁTTÉRZENE kész.** A `Level2Scene` megkapta a saját sávját
(`assets/audio/shadowforge-convergence.mp3` — AlkaKrab, `2. Shadowforge Convergence (Loop)`).
Új infrastruktúra NEM kellett: a scene-nek már volt `AudioManager` példánya (SFX-hez), a
zene-ág pedig pontosan ezt tudja. A változás egy asset + egy `MUSIC_KEYS` bejegyzés + egy
konstans + két hívás.
- **A LOOP-változat kell, nem a csomag `Tracks mp3/` teljes száma**: a `playMusic()`
  `loop: true`-val játszik, tehát a Tracks-verzió intrója minden fordulónál újraszólna.
  Ugyanez az elv, amiért a `boss-theme.mp3` is az `(After Intro & Loop)` változat.
- **A fade-in 4000 ms, kétszerese a Level 1-ének** (`LEVEL2_MUSIC_FADE_IN_MS`), és ennek
  levezetése van: a Level 1-nél az audio context zárolt, tehát a sáv úgyis csak az első
  billentyűleütésnél indul; a Level 2-be viszont már feloldott contexttel érkezünk, ott a
  zene tényleg a `create()` pillanatában szólal meg. User-kérés volt, hogy ne üssön be
  intenzíven. Unit teszt őrzi, hogy a Level 2 fade-inje hosszabb marad.
- **A hangerő NEM változott** (`LEVEL_MUSIC_VOLUME`, 0.35), hogy az „ambient < boss theme <
  SFX" keverési sorrend érvényben maradjon.
- **Mellékeredmény: lezárult egy nyitott jogi tétel.** A `boss-theme.mp3` forrása eddig
  „külön tisztázandó" volt — méréssel kiderült, hogy bitre azonos az AlkaKrab csomag
  `4. Cursed Citadel (After Intro & Loop)`-jával, tehát a Level 2 sávja UGYANONNAN jön, és
  nem nyit új tételt. Részletek a nyitott jogi tételeknél.

### Phase 8 — 13. iteráció: player- és enemy-hangok

**Phase 8 — 13. iteráció: PLAYER- ÉS ENEMY-HANGOK kész.** Öt új SFX, a bevett
esemény→scene minta szerint: **player lépés / ugrás / halál** + a **CrowHarvester és a
Gravecaller haláltusája**. Új modul nem kellett, de három érdemi tanulság született:
- **A lépés a projekt első ISMÉTLŐDŐ hangja** — minden addigi SFX diszkrét eseményre szólt.
  A kadencia levezetett (`FOOTSTEP_INTERVAL_MS = RUN_ANIM_MS / 2 = 285 ms`), és a
  `lastFootstepAt = null` állapot teszi a futás első lépését azonnalivá. Részletek az
  Audio szakaszban.
- **A hangerő hangonként MÉRT**, nem közös: a forrásfájlok csúcsértéke 0.081 és 0.708
  között szór. Lásd a képletet az Audio szakaszban.
- **A halál-eventek a `die()`-ba kerültek, nem a `destroy()`-ba** — utóbbi minden
  respawnnál haláltusa-kórust adna (24. technikai tanulság, unit teszttel őrizve).

**A `Stone` vs. `Stone Chain` kérdésre NEM ugyanaz a válasz a lépésnél és az ugrásnál.**
A csomag minden lépéshangot két változatban ad; a Chain ugyanaz az alapfelvétel, rárétegezett
láncing-csörgéssel (mért HF-arány: lépés 0.121 → 0.165, ugrás 0.267 → 0.501).
- **Lépés: a `Chain` nyert.** A csörgés egy 285 ms-os kadenciában a páncélos lovag
  járásaként olvas.
- **Ugrás: a SIMA változat nyert** — user-visszajelzés kézi tesztről („a hang végén van egy
  csörgő/ciripelő rész, ami zavaró"), amit a mérés meg is nevez: a `Stone Chain Jump`
  borítékja ~300 ms-nál VISSZAEMELKEDIK a csúcs **81 %**-ára, míg a simáé csak **45 %**-ra.
  A hang végén tehát külön csörgő utórezgés ül, ami a levegőben lévő karakter alatt
  indokolatlan. A csúcs gyakorlatilag azonos (0.0811 → 0.0800, 1.4 %), tehát a
  hangerő-kalibráció **nem változott** — de a szabály szerint ilyenkor mindig újra kell
  számolni, és ez az eset épp azért jó példa, mert kijött belőle, hogy nem kell módosítani.

## Döntési pont — eldőlt (2026-08-26)

**DÖNTÉSI PONT — ELDŐLT (2026-08-26).** A Phase 8 utáni döntési ponton (lásd lentebb és a
`Project_plan.md` 21. pontjában) a user a **„Többi Enemy típus, Level2 és 2. Boss létrehozása"**
irányt választotta, a Lore/QA helyett. A sorrend: **Enemy 2 (Caster) → Level 2 → Boss 2**.


### Enemy 2 — Gravecaller (2026-08-26)

**Enemy 2 — GRAVECALLER KÉSZ (a döntési pont 1. iterációja).** A `Project_plan.md` 11.
pontjának *„Archer / Caster"*-e: távolsági ellenfél, egyetlen támadással (árny-tűzgolyó).
Új modulok: `enemies/Gravecaller.ts`, `enemies/GravecallerAnimations.ts`. Az asset a
*Necromancer* csomagból jön (`assets/sprites/gravecaller/`) — **licenc nélkül, új nyitott
jogi tétel.** A Level 1 `E2` platformján álló `E-platform-1` CrowHarvester **le lett
cserélve** erre. Részletek lentebb, az „Enemy 2 — Gravecaller" szakaszban.


### Level 2 — látvány (2026-08-29)

**LEVEL 2 — LÁTVÁNY KÉSZ (2026-08-29).** A pálya geometriája (7200 px, 9 szakasz, mozgó
platformok, hazardok, 14 enemy) korábbi iterációkban elkészült; ez a kör adta meg a
látványát. Forrás: **GothicVania Town** (Luis Zuno / @ansimuz) — **public domain**, UGYANAZ
a csomag, amiből a Level 1 hangulati propjai jönnek, tehát **nem nyílt új jogi tétel**.
Új modulok: `levels/GothicTownTileset.ts`; bővült: `LevelTerrain`, `LevelDecor`,
`LevelGeometry`, `ParallaxBackground`, `MovingPlatform`.

- **ÁTNEVEZÉS: `The Crowless Forest` → `The Crowless Quarter`** (user-döntés). A csomag egy
  alkonyi gótikus VÁROS, nem erdő, és a látvány nyert a `Project_plan.md` 14. pontjával
  szemben — a dokumentum frissítve. A scene-kulcs változatlanul `Level2Scene`, tehát a
  néven semmilyen kód nem függ.
- **A paletta NYERSEN megy be, tint nélkül** (user-döntés). A csomag érezhetően VILÁGOSABB
  a Level 1-nél (égbolt-csúcsfényesség `(190,106,107)` vs. `(103,56,56)`) — ez tudatos
  kontraszt az éjszakai romokhoz képest, nem hiba. A talaj `(42,27,40)` és a fa-palló
  `(58,38,56)` fényessége viszont majdnem pontosan a Level 1-é (`(42,33,33)` / `(63,51,50)`),
  tehát a gameplay-elemek olvashatósága nem változott.
- **KÉT parallax réteg**, mindkettő SZÁRMAZTATOTT, de veszteségmentesen (lásd a 21.
  tanulságot és a `ParallaxBackground.ts` Level 2 blokkját). **Egyik sem nyúlik
  függőlegesen** — szemben a Level 1 egével, ami sima színátmenet.
- **A terrain HÁROM skinre bomlott**: `'cathedral'` (volt `'tiles'`), `'gothic-town'`,
  `'placeholder'`. A Level 1 hívása mechanikusan `'cathedral'`-ra változott.
- **A fa-platformnak KÉT változata van** — állvány (lábak a talajig) és konzol —, és a
  választás **LEVEZETETT**: `platformHasLegs()`. Részletek lentebb, a „Level 2 terrain"
  szakaszban.


### Boss 2 — The Mad King (2026-08-30)

**BOSS 2 — THE MAD KING KÉSZ (2026-08-30).** A lánc bezárult: a Level 2 ajtaja már nem
zsákutca. Az útvonal `Level2Scene → (ajtó, E) → NarrationScene → Boss2Scene[ párbeszéd →
belépő → harc ] → NarrationScene → (végső boss, köv. iteráció)`.
Új modulok: `bosses/MadKing.ts`, `bosses/MadKingAnimations.ts`, `scenes/Boss2Scene.ts`,
`ui/Dialogue.ts`.

- **ELTÉR A `Project_plan.md`-TŐL (user-döntés, a dokumentum frissítve):** a
  **`Level 3 – The Throne of the Damned` külön platforming-pályaként KIMARAD.** A király
  harca közvetlenül a Level 2 után jön, utána pedig rögtön a végső ellenfél. A trónterem-téma
  a Boss 2 arénájában él tovább.
- **A király TISZTÁN KÖZELHARCI** — tudatos kontraszt a Wing-Breakerrel, aki távolsági
  nyomást ad (lövedék + Shadow Spell). Nem az asset hiányossága: a csomagban nincs cast
  animáció, cserébe VAN valódi ugró és valódi kitörés animáció, tehát mindkét mozdulat
  hitelesen ki van rajzolva (a Wing-Breaker dash-éhez képest, ami megtartott póz).
- **Phase 1 = reaktív kardcsapás + ugró becsapódás; Phase 2 (50 %) = + kitörés és gyorsabb
  mozgás.** Pontosan a Boss 1 szerkezete (ott a charge nyílt meg), tehát a rotáció-logika és
  a tesztek 1:1-ben átvihetők voltak.
- **Az ugrás BALLISZTIKÁJA levezetett, nem hangolt**: a `LEAP_RISE_PX` (140) az EGYETLEN
  hangolópont, abból jön a `GRAVITY_Y`-nal a felfelé induló sebesség ÉS a repülési idő, és
  abból a vízszintes sebesség, ami pont a célra viszi. A cél a FELUGRÁS pillanatában rögzül
  (a Shadow Spell elve), tehát oldalra lépve kikerülhető.
- **A háttér TINT NÉLKÜL megy be** — szemben a Boss 1 `0xb0b0b0`-jával, és ez MÉRÉS: a
  trónterem nyers fényessége a játéktérben `mean 36.3`, míg a Boss 1 festményének TINTELT
  eredménye `59.7 × 0.69 = 41.2`. Ez a kép eleve sötétebb annál, amire a Boss 1-et
  sötétíteni kellett.
- **A `GROUND_TOP` a KÉPHEZ igazodik (369), nem fordítva.** A Boss 1-nél a festményt kellett
  KIVÁGNI, mert ott a 418-as padlóvonal már adott volt; itt új scene, tehát a padlóvonalat
  mértük a képhez — így a trónterem vágás nélkül, teljes egészében megmarad.
- **A király NEM fadel ki halálkor** (a Wing-Breaker hamuvá válik): a Death sheet utolsó
  frame-je egy a földön maradó test, és a lore szerint a király FELOLDOZÁST kap — látszania
  kell, hogy ott fekszik a trónja előtt.
- **A `Level2Scene` R debug-billentyűje és a `bossSceneExists()` feltételes promptja
  TÖRÖLVE** — a Boss2Scene innentől létezik. A helyükre ugyanez a minta lépett a Boss2Scene
  győzelmi ágán: amíg a `FinalBossScene` nincs regisztrálva, az átvezető a Level 2-re tesz
  vissza, és a végső aréna elkészültekor magától átvált rá.
- **Zene KÉSZ** (`assets/audio/veil-of-eternal-nightfall.mp3` — AlkaKrab,
  `6. Veil of Eternal Nightfall (Loop)`, UGYANAZ a csomag, mint a boss theme és a Level 2
  sávja, tehát nem nyitott új jogi tételt). A PÁRBESZÉD UTÁN, a belépőnél indul.


### Boss 3 — Ancient Demon, Omen of Crows (2026-08-30)

**BOSS 3 — ANCIENT DEMON, OMEN OF CROWS KÉSZ (2026-08-30). A LÁNC BEZÁRULT.**
`Level 1 → Boss 1 → Level 2 → Boss 2 → átvezető → FinalBossScene → ending → CreditsScene`.
Új modulok: `bosses/AncientDemon.ts`, `bosses/AncientDemonAnimations.ts`,
`bosses/ShadeMinion.ts`, `bosses/ShadeMinionAnimations.ts`, `scenes/FinalBossScene.ts`,
`scenes/CreditsScene.ts`.

- **A boss karaktere egy HIÁNYBÓL nő ki:** a csomagban (*Undead Executioner*, Kronovi-)
  **NINCS járás-animáció**. A démon ezért nem sétál, hanem **LEBEG** (lassan sodródik, az
  idle animációval) és **VILLAN** (teleportál a player mellé). User-döntés, és a hiányból így
  identitás lett: egy ősi, csuklyás lidérc nem gyalogol.
- **NINCS hurt-animáció sem** — de ez nem újdonság: mindkét eddigi boss szándékosan nem
  flinchel, a visszajelzés fehér `TintModes.FILL` villanás.
- **Négy támadás.** *Kaszakombó* (reaktív, KÉT csapás egy mozdulatban, 600 és 1200 ms-nál) ·
  *Árny-hullám* (radiális, mindkét irányba; CSAK ugrással kerülhető ki) · *Villanás*
  (gap-closer, alatta sebezhetetlen) · *Idézés* (CSAK Phase 2, 2 árnyék-lidérc).
- **A ROTÁCIÓ ELŐBB FUT, MINT A REAKTÍV KOMBÓ — fordítva, mint a másik két bossnál.**
  Konkrét oka van: a nova találati sávja (90) FÜGGETLEN levezetésből PONTOSAN a kombó
  hatótávja, tehát ha a kombó előzne, a nova soha nem sülne el ott, ahol egyáltalán találhat
  — a démon a közelharci sávban örökös kaszakombó-gépezet lenne. A cooldownok (nova 4500,
  idézés 7000, villanás 4000) miatt a kombó így is a leggyakoribb támadás marad.
  Regressziós teszt őrzi.
- **A hatótáv-előnye a projekt LEGKISEBBJE:** a player 75-ről üt, a démon 90-ről — 15 px,
  szemben a Wing-Breaker (138) és a Mad King (142) fölényével. Tudatos: a démon nyomása a
  novából és az árnyékokból jön, nem a kaszából.
- **Aréna:** `assets/backgrounds/broken-gate/final-arena.png`, `GROUND_TOP = 369` (MÉRT),
  **tint nélkül** (a három közül a legsötétebb kép). A belépő a Boss 2-ével azonos:
  párbeszéd → cím-kártya. Részletek lentebb, a „FinalBossScene" szakaszban.
- **Zene KÉSZ** (`MUSIC_KEYS.FINAL_BOSS_THEME`): a `2. Shadowforge Convergence (Loop)`
  (AlkaKrab), ami **EREDETILEG a Level 2 ambientje volt** — user-döntés, hogy a végső harcra
  kerüljön át, a Level 2 pedig az `1. Whispers of the Abyss (Loop)`-ot kapja. A PÁRBESZÉD
  UTÁN, a cím-kártyával együtt indul (a Boss 2 mintája). **Az asset FÁJLNEVE változatlan**
  (`shadowforge-convergence.mp3`): a projektben a fájlnév a FORRÁS-számra mutat, nem a
  felhasználás helyére — a csere így tiszta kulcs-átkötés volt, nem fájlmozgatás.
- **Az árny-hullám ÉS az idézés hangja ugyanaz** (`firebuff-2`, a már meglévő
  `SFX_KEYS.BOSS_SPELL_IMPACT`) — user-döntés. Új asset NEM kellett: a fájl bitre azonos a
  Wing-Breaker Shadow Spelljéhez már betöltöttel. Mindkettő a KIOLDÁS pillanatában szól.
  **A villanás továbbra is SZÁNDÉKOSAN néma** (nincs hozzá illő hang a csomagokban).
- **Együtt járó JAVÍTÁS a `Level2Scene`-ben:** az ajtaja eddig MINDIG a `Boss2Scene`-t
  célozta, `kingDefeated` ellenőrzés nélkül — szemben a Level 1-gyel, ami a `bossDefeated`-et
  nézi. Enélkül a démontól kikapva a player újra végig kellett volna verje a Mad Kinget,
  hogy visszajusson. Most a legyőzött király után az ajtó KÖZVETLENÜL a végső arénába visz,
  átvezető nélkül (a Level 1 azonos döntése).


### Level 3 – The Beast Dungeon + Boss 3 – The Beast Master (2026-08-31)

**LEVEL 3 – THE BEAST DUNGEON + BOSS 3 – THE BEAST MASTER KÉSZ (2026-08-31).** A lánc
BŐVÜLT, nem lezárult: `... → Boss 2 (Mad King) → átvezető → **Level 3** → (ajtó, E) →
átvezető → **Boss 3 (Beast Master)** → átvezető → FinalBossScene → ending → credits`.
Új modulok: `levels/Level3Layout.ts`, `levels/ChurchTileset.ts`, `levels/LevelEnemies.ts`,
`scenes/Level3Scene.ts`, `scenes/Boss3Scene.ts`, `bosses/BeastMaster.ts`,
`bosses/BeastMasterAnimations.ts`.

- **ELTÉR a korábbi `Project_plan.md`-döntéstől (a dokumentum frissítve):** a Level 3-at
  2026-08-30-án KIVETTÜK, azzal az indokkal, hogy „a meglévő elemekből csak mennyiségi
  ismétlés lenne". **Pontosan ez változott meg**: időközben elkészült az Enemy 3 (Beast), ami
  egy ÚJ nyomásformát hoz. A pálya erre épül, nem a meglévők ismétlésére. A téma is más:
  nem „Throne of the Damned" (az a Boss 2 arénája maradt), hanem gótikus templom-kripta.
- **A pálya tézise:** *a Beast a sík padlón támad, ami elől fel lehet ugrani a galériákra —
  de ott Gravecallerek tüzelnek.* Minden szám ezt az egy hurkot szolgálja.
- **ÚJ DESIGN-ESZKÖZ: a MENNYEZET.** A Beast rohamát eddig „oldalra lépéssel vagy
  átugrással" lehetett kikerülni. Egy dungeon-folyosóban viszont az oldalra lépés nem létezik
  (a roham MAGA a folyosó), és elfutni sem lehet (`CHARGE_SPEED` 320 > `MOVE_SPEED` 200) —
  **marad az ugrás**. Ettől lesz a galéria alja gameplay-elem, nem díszlet.
- **`GALLERY_RISE = +110` HÁROM független kényszer metszete:** felugorható
  (≤ `MAX_SAFE_RISE` 117), alatta átsétálható (≥ `MIN_WALK_UNDER_RISE` 62), de alatta NEM
  ugorható (< `MIN_JUMP_CLEARANCE_RISE` 218). Ha bármelyik sérül, a pálya elveszti a tézisét.
- **A Gravecaller-szeparáció LEVEZETETT, nem hangolt:** a caster a saját lapján állót
  eltalálja (a bolt-sáv `[T−31, T−15]` a test `[T−46, T]`-jén belül), a padlón állót viszont
  sem el nem találja, sem **ÉSZRE nem veszi** (105 px > `VERTICAL_DETECTION_RANGE` 80).
- **4200 px, 12 ellenfél** (3 Beast + 6 Gravecaller + 3 CrowHarvester) — rövidebb ÉS sűrűbb,
  mint a Level 2 (7200 px, 15 lény). Hat karám, öt 120 px-es gödörrel; a gödör nem kihívás,
  hanem a karám FALA (az `enemyChaseBounds()` a perem előtt megállítja a Beastet).
- **Az `A` előcsarnok SZÁNDÉKOSAN ÜRES** (kézi teszt, 2026-08-31). Eredetileg két
  CrowHarvester állt itt, de a `START_X` 120, a `DETECTION_RANGE` pedig 220: az elsőt már a
  betöltés pillanatában felébresztette a player, és azonnal támadott. A szakasz valódi szerepe
  enélkül állt össze: itt lehet KÖVETKEZMÉNY NÉLKÜL kipróbálni a galériát — a felugrást ÉS
  azt, hogy alatta ugorva a player beveri a fejét. Unit teszt őrzi, hogy a start-pont körül a
  legnagyobb detektálási hatótávon belül ne kerüljön ellenfél.
- **Nincs létra, mozgó platform, lengő kasza.** A kasza konkrétan nem is lehetne: egy penge a
  karám fölött pont a menekülő-ugrásba kényszerítené a playert.
- **A háttér LAPOS SZÍN, parallax NÉLKÜL** — és ez MÉRÉS, nem ízlés. Lásd a 28. tanulságot.
- Zene: `assets/audio/eclipsed-desolation.mp3` (pálya) és `dread-march.mp3` (boss), mindkettő
  az AlkaKrab csomag eddig kihasználatlan loopja → **nem nyitott új jogi tételt**.
- **A `Level3Scene` ajtaja a `beastMasterDefeated` flagtől függ**, a Level 1/2 mintájára: a
  legyőzött Master után KÖZVETLENÜL a végső arénába visz, átvezető nélkül.

**A BEAST MASTER (Boss 3)** ugyanaz a `goatman.png` lap `SCALE = 2`-vel; a `Beast` state
machine-je boss-léptékben, **fázis NÉLKÜL** (user-döntés).
- **A windup 390 → 520, és ez LEVEZETETT**: a kétszeres mérettel a hatótáv 44 → 74 nőtt,
  tehát pontblank helyzetből (38 px) a kikerüléshez 84 px kell — hátralépéssel 230 ms,
  ugrással 174 ms, plusz 250 ms reakcióidő. A padlót a LASSABB válasz adja (480), ezért 520.
  **Így MINDKÉT válasz működik, nem csak az ugrás** — unit teszt őrzi.
- **A FALKA** (user-döntés): `66 % → 1 CrowHarvester`, `33 % → 1 Gravecaller`. Egyszeri,
  küszöbönként pontosan egyszer. A boss csak a TÍPUST emittálja (`beast-master-summon`) —
  **új lény-osztály NEM kellett**.
  - **A spawn-pontot a SCENE számolja, a PLAYERHEZ képest** (kézi teszt-javítás): a boss
    eredetileg a saját pozíciójából adta meg, és a fal mellől hívva a lény a sarokban jelent
    meg — a playertől akár 680 px-re, ami mindkét fajta `DETECTION_RANGE`-én kívül van, tehát
    a falka tétlenül sétálgatott. A `SUMMON_SPAWN_DISTANCE` (180) LEVEZETETT: a
    `CrowHarvester.DETECTION_RANGE` (220) alatt, de a közelharci hatótávja (42) jóval fölött.
  - **A hívott lények mind a NÉGY határt megkapják** (`patrol` ÉS `chase`), az aréna
    szélességére. A `chase` NEM elhagyható, pedig a `setCollideWorldBounds` amúgy is
    megállítaná őket: a `Gravecaller` csak ÁLLÓ helyzetből castol, és az „állok-e?" döntést az
    `applySpacing()` a chase-határból vezeti le — korlátlan határral a falnak nyomott caster
    soha nem sült volna el.
- **Külön `STAGGER` állapot** (a `Beast`-nél nincs): a falnak rohanó roham megtorpanása a
  harc fő punish-ablaka, `STAGGER_MS = 1400` — levezetve két kardcsapásra és a kilépésre.
- **Az aréna háttere SCENE-BEN ÖSSZERAKOTT**, nem egyetlen festmény — ez az egyetlen ilyen a
  négy arénából. A másik háromhoz kész festmény állt rendelkezésre; a church csomag viszont
  csempékből és fal-panelekből építkezik, tehát egy 800×450-es kép pont azt a rétegzést
  duplikálná, amit a pálya amúgy is használ.
- **Az aréna `GROUND_TOP`-ja (369) LEVEZETETT**: a párbeszéd-panel a felszín ALATT ül és
  `Dialogue.PANEL_RESERVE_PX`-et (75) foglal → `369 + 75 = 444 ≤ 450`. **Ez a szám magyarázza
  visszamenőleg a Boss 2 és a végső aréna 369-ét is** — ott a festményből mértük, de a
  kényszer ugyanez volt. *(És 2026-09-01-en ez KÉNYSZERÍTETTE a `BossScene`-t is 418-ról
  369-re, amikor párbeszédet kapott — a hátterét emiatt kellett újragenerálni.)*

**`levels/LevelEnemies.ts` — a `Level2Scene` „Level 3-nál újranézzük" adósságának RÉSZLEGES
törlesztése (user-döntés).** A scene-VÁZ továbbra is másolat (arra nincs unit teszt), de a
`Level1Scene`-ben és a `Level2Scene`-ben SZÓ SZERINT azonos enemy-blokk (spawnolás,
respawn-reset, frissítés, a Gravecallerek boltjai) kikerült egy közös osztályba.
**Mellékhaszon:** a `Level1Scene` eddig NÉMÁN CrowHarvestert szült volna egy oda felvett
`type: 'beast'` sorra, és ezt csak egy unit teszt zárta ki — ez a tiltás (és a tesztje) most
okafogyottá vált, mindkét pálya minden típust ismer.


### Ending + credits (2026-08-30)

**ENDING + CREDITS KÉSZ.** A lezárás **csak szöveg, fekete háttéren** (user-döntés): a
`NarrationScene` VÁLTOZTATÁS NÉLKÜL, a `FinalBossScene` `ENDING_NARRATION` tömbjével. Utána a
**`CreditsScene`** — „THANKS FOR PLAYING" + lassan felfelé görgő szerzői lista, `Space`
gyorsít, a végén **új játék TISZTA registryvel** (a három `*Defeated` flag és mindkét
checkpoint törlésével; enélkül az új játék a Level 1 ajtajánál azonnal a Level 2-re vinne).
**A credits TARTALMA placeholder** — a user egy későbbi iterációban véglegesíti.


## Párbeszéd-rendszer — `src/ui/Dialogue.ts`

**PÁRBESZÉD-RENDSZER (`src/ui/Dialogue.ts`) — ÚJ.** Ez tölti be a `Project_plan.md` 20.
pontjában tervezett `ui/Dialogue.ts` slotot. **A terv korábbi megjegyzése — hogy a
`NarrationScene` valószínűleg kiváltja — MEGDŐLT**, mert a kettő más szerepű:

| | `NarrationScene` | `ui/Dialogue` |
|---|---|---|
| hol | saját, teljes képernyős scene | egy futó scene-en BELÜL |
| mikor | pályák KÖZÖTT | a szereplők előtt, harc előtt |
| léptetés | KÉZZEL (Space/Enter) | MAGÁTÓL; a jobbra-nyíl csak gyorsít |
| beszélő | nincs | van (a panel fejléce) |

- **A mag PURE** (`charsRevealedAt`, `autoAdvanceDue`), és az időt a scene adja
  (`update(deltaMs)`), nem egy `time.addEvent` — a `SwingingReaper` precedense.
- **EGY `update()` LEGFELJEBB EGY sort léptet** (nincs `while` ciklus). Ez szándékos: egy
  frame-akadás vagy egy háttérbe tett fül után a Phaser több száz ms-os deltát ad, ami
  különben átpörgetne több sornyi párbeszédet, mielőtt a player elolvashatná. Unit teszt őrzi.
- **Az `advance()` az EGYETLEN léptető belépési pont** — ugyanaz fut a nyílra és az automata
  továbblépésre. Gépelés közben befejezi a sort (és onnantól a tartás ideje ketyeg, tehát
  nincs külön „skipped" állapot), kész sornál a következőre lép.
- **A panel geometriája LEVEZETETT**: a teteje `GROUND_TOP + 3`, tehát TELJES EGÉSZÉBEN a
  járható felszín ALATT ül — sosem takarja a királyt vagy Lazarust. Következmény: egy
  párbeszéd-sor legfeljebb 2 sorra tördelődhet.
- **A player a párbeszéd alatt TELJESEN befagyasztva**: a `PlayerController` csak a
  `beginFight()`-ban jön létre. Nem elég az `update()`-jét kihagyni — a konstruktora
  regisztrálja a J/F billentyű- és pointer-listenereket, tehát a player különben a
  párbeszéd alatt is támadhatna és varázsolhatna.


## PreScene — a nyitó szentély (2026-09-02)

**PRE-SCENE — A NYITÓ SZENTÉLY KÉSZ (2026-09-02). A LÁNC ELEJE MEGVÁLTOZOTT.**
A játék innentől a **`PreScene`**-nel indul, nem a Level 1-gyel:
`PreScene → Level 1 → Boss 1 → Level 2 → Boss 2 → Level 3 → Boss 3 → Final Boss →
ending → credits`.
Új modulok: `scenes/PreScene.ts`, `levels/PreSceneLayout.ts`, `npc/GoddessAnimations.ts`
(**új mappa: `src/npc/`** — a projekt első NEM HARCOLÓ szereplője).

Lazarus a képernyő tetejéről bezuhan egy romos szentélybe, ahol a háttéren egy **SZÁRNYAS
ANGYALSZOBOR** áll — pontosan az, amit elvesztett. A jobb oldalon **A LÁNGŐRZŐ** várja;
`E`-vel indítható a párbeszéd, majd egy második `E` (`E: Indulás`) viszi a Level 1-re,
**átvezető NÉLKÜL** (user-döntés: a párbeszéd MAGA a felvezetés, egy narráció csak
megismételné). Részletek lentebb, a „PreScene" szakaszban.

- **A `BootScene.START_SCENE` normál értéke `'PreScene'` lett** (a doc-komment is frissítve).
  *Mellékesen: az érték a beszúrás előtt `'BossScene'`-en állt, committolva — tehát a játék
  a Boss 1 arénában indult. Ez most rendeződött.*
- **A `CreditsScene` új játéka is a `PreScene`-re megy**, nem a Level 1-re: különben a
  második végigjátszásból némán kimaradna a nyitány. *(2026-09-03 óta a credits a FŐMENÜBE tesz
  vissza, és az új játékot a menü `Start Game`-je indítja — de a PreScene így is az első
  állomás.)*
- **`DialogueMemory` NEM kell hozzá**: a PreScene végigjátszásonként pontosan egyszer fut le
  (nincs olyan út, ami visszavezetne rá), az új játék pedig úgyis törli a registryt.
- **Együtt járó KOMMENT-JAVÍTÁS a `Level1Scene`-ben**: az „a Level 1 közvetlenül az
  oldalbetöltés után indul, tehát az audio context GARANTÁLTAN zárolt" megjegyzés elavult —
  az autoplay-zárat mostantól a PreScene oldja fel (ott kell `E`-t nyomni). A viselkedés és a
  2000 ms-os fade-in NEM változott. *(2026-09-03 óta a FŐMENÜ oldja fel, még eggyel előrébb.)*


## Főmenü — `MainMenuScene` + `systems/GameProgress.ts` (2026-09-03)

**FŐMENÜ — `MainMenuScene` KÉSZ (2026-09-03). A LÁNC ELEJE ÚJRA MEGVÁLTOZOTT, ÉS BEZÁRULT A
KÖR.** A játékot innentől egy fogadóképernyő nyitja, és a `CreditsScene` ide tér vissza:

```
Boot → MainMenu → (Start Game) → PreScene → … → Final Boss → ending → Credits ─┐
          ↑        (Credits)    → CreditsScene ──────────────────────────────────┤
          └────────────────────────────────────────────────────────────────────┘
                   (Controls)   → IN-SCENE lap, vissza a menübe
```

Új modulok: `scenes/MainMenuScene.ts`, `ui/MainMenuLayout.ts`, `systems/GameProgress.ts`.

- **HÁROM menüpont: `Start Game` · `Controls` · `Credits`. `Exit Game` SZÁNDÉKOSAN NINCS**
  (user-döntés): a böngésző a `window.close()`-t egy sima fülre letiltja, tehát az a gomb vagy
  nem csinálna semmit, vagy csak annyit üzenne, hogy „zárd be a fület". Unit teszt rögzíti a
  hiányát, hogy ne kelljen újratárgyalni.
- **A menüblokk a képernyő JOBB felén ül, és ez MÉRÉS, nem ízlés.** A festményen a koronás
  lovag (`x 196..320`) és a szárnyas szobor (`x 310..385`) áll; a user kérése az volt, hogy a
  menüpontok ne takarják ki őket. A `MENU_PANEL.x = 410` tehát a `PAINTING.statue.right`-ból
  (385) van levezetve, és **három unit teszt őrzi** (a panel a szobortól jobbra, a lovagtól
  jobbra, ÉS a `VIEW_WIDTH / 2` fölött van).
- **A CONTROLS lap SZÁNDÉKOSAN megszegi ezt a korlátot** (x=40, majdnem teljes szélesség), és
  erre is van teszt — hogy egy későbbi „legyen konzisztens" refaktor ne szűkítse le. Az x>385
  szabály a NYUGALMI menüre vonatkozik; a Controls egy kérésre előhívott, modális olvasólap,
  aminek a kilenc soros billentyű-táblázathoz szélesség kell (a menüpanel 318 px-es belső
  szélességébe ~38 karakteres sorok férnének, ami olvashatatlan).
- **A CONTROLS IN-SCENE nézetváltás, NEM külön scene.** Kényszer, nem ízlés: az `AudioManager`
  scene-hatókörű és a SHUTDOWN-on megsemmisül (6. tanulság), tehát egy külön Controls-scene
  minden be- és kilépéskor levágná és elölről indítaná a menüzenét.
- **A panel nem dísz, hanem a kontraszt eszköze.** A blokk a katedrális elé kerül, ami a kép
  legvilágosabb ÉS legrészletgazdagabb eleme (mért csúcs-fényesség 124). A `Dialogue` receptje
  (`0x000000` @ 0,72 + `0x6a5a6a` keret) ezt 34,7-re nyomja le → az arany kijelölés kontrasztja
  **6,6:1**, a törtfehér sorooké **10,9:1**. **Unit teszt SZÁMOLJA VISSZA** a mért
  fényességből, és külön teszt rögzíti, hogy panel NÉLKÜL ugyanez 1,7:1 lenne (tehát megbukna)
  — így egy későbbi „hadd látsszon jobban a kép" alfa-hangolás a CI-ban bukik el.
- **MINDEN szöveg BALRA IGAZÍTOTT, egész x-en** (`setOrigin(0, 0.5)`). Ez a **29. tanulság
  megkerülése FOGALMI szinten**: nincs `setOrigin(0.5)`, tehát nincs mit kerekíteni — erősebb
  javítás a `TutorialHint.centerText()` `Math.round()`-jánál. A kijelölő `▶` is KÜLÖN
  szövegobjektum fix x-en, nem a címke elé fűzött prefix: prefixként minden címke elmozdulna
  vízszintesen a léptetéskor (a klasszikus monospace-menü „imbolygás").
- **Billentyűzet ÉS egér** (user-döntés). A `pointerover`/`pointerdown` LÁTHATATLAN `Zone`-okra
  megy, nem a `Text` saját bounds-ára: a sorok balra igazítottak és eltérő hosszúak, tehát a
  szöveg-bounds egy rövid címkénél bosszantóan kicsi céltábla lenne.
- **`update()` SZÁNDÉKOSAN NINCS** — a projekt egyetlen ilyen scene-je. A menü tisztán
  eseményvezérelt: nincs benne se animáció, se időzítés, amit frame-enként léptetni kellene.
- **A `BootScene.START_SCENE` normál értéke `'MainMenuScene'` lett** (a doc-komment is).
- **A `CreditsScene` már NEM indít új játékot**: a `restartGame()` helyére `returnToMenu()`
  lépett, a súgója `Space: New game` → `Space: Main menu`. Ezzel a credits mindkét irányból
  (menüből megnyitva ÉS a végigjátszás után) ugyanoda visz.

**`systems/GameProgress.ts` — a `PROGRESS_REGISTRY_KEYS` KÖLTÖZÉSE.** A nyolc játékon átívelő
registry-kulcs és az új `resetProgress()` a `CreditsScene`-ből egy Phaser-mentes modulba került
(a `DialogueMemory` precedense: csak a registry `remove` felületét várja strukturálisan).

- **A hívás helye ÉRDEMBEN változott: a menü `Start Game`-je takarít, nem a credits vége.**
  Ott kezdődik ténylegesen egy futás — és a menübe a credits felől IS visszajutunk, tehát a
  reset akkor is lefut, ha a játékos a credits után indít újat.
- A `DIALOGUE_SEEN_REGISTRY_KEY` továbbra is **importtal** kerül a listába, nem beírt
  sztringként: így a kulcs átnevezése nem hagyhatja árván a takarítást.
- **A `CreditsScene`-ből a `DialogueMemory` importját is törölni KELLETT**, nem csak a listát:
  a `tsconfig` `noUnusedLocals: true`, tehát az árván maradt import a CI-t buktatta volna.


## Boss-párbeszéd memória — `systems/DialogueMemory.ts` (2026-09-01)

**BOSS-PÁRBESZÉD MEMÓRIA (`src/systems/DialogueMemory.ts`) — 2026-09-01.** Mind a NÉGY aréna
párbeszéde **végigjátszásonként EGYSZER** fut le: ha a player egy boss-harcot ismételten kezd
újra, egyből a cím-kártya jön (user-kérés). A **vereség utáni ÚTVONAL NEM változott** — a Boss
1/2/3 továbbra is a saját pályájára tesz vissza, a végső boss továbbra is azonnal újraindítja
az arénát.

- **REGISTRY, nem scene-adat.** A `FinalBossScene` eddig `{ skipDialogue: true }` scene-adattal
  oldotta meg, mert ott a vereség UGYANAZT a scene-t indítja újra. A Boss 1/2/3 retry-útja
  viszont **átmegy egy másik scene-en** (halál → a pálya checkpointja → ajtó → aréna), amit a
  scene-adat nem él túl; a registry game-szintű, tehát igen. A `skipDialogue` ezért törölve —
  egy mechanizmus van, mind a négy arénában.
- **EGYETLEN registry-kulcs alatt egy scene-kulcs lista** (`DIALOGUE_SEEN_REGISTRY_KEY`), nem
  bossonként külön bejegyzés: így egy új boss felvétele sem új kulccsal, sem a
  `CreditsScene` takarításának bővítésével nem jár.
- **A jelölés a `Dialogue` `onComplete`-jében történik**, nem a párbeszéd indításakor: a
  dialógusból nincs kilépési út (a `PlayerController` csak a `beginFight()`-ban jön létre),
  tehát ez az egyetlen pont, ahol a szöveg biztosan lement.
- **A modul NEM importál Phasert** (csak a registry `get`/`set` felületét várja
  strukturálisan) — ezért mockolás nélkül unit-tesztelhető, mint a `Level*Layout` adatmodulok.
- **Új játéknál törlődik** (a kulcs importtal kerül a `PROGRESS_REGISTRY_KEYS` listába, ami
  2026-09-03 óta a `systems/GameProgress.ts`-ben él, és a főmenü `Start Game`-je hívja).
  Enélkül egy második végigjátszásból NÉMÁN eltűnne az összes boss-átvezető.
- **HAT háttér-ház** világ-koordinátásan (`BACKDROP_BUILDINGS`, `BUILDING_DEPTH = -15`) és
  **17 hangulati prop** (`DECOR_PROPS`, tint nélkül), mind unit-tesztelt elhelyezéssel.
- Ami a Level 2-n MÉG placeholder: a **létra** és a **boss-ajtó** (a csomagban nincs létra,
  a cathedral `door-gate` geometriája pedig ehhez a PNG-hez van mérve), a hazardok és a
  lövedékek. **A zene azóta KÉSZ** (lásd lentebb); az SFX hátravan.


## Level 1 Redesign (a Phase 8 közé beszúrt, 3 iterációs blokk)

**LEVEL 1 REDESIGN — 1. iteráció KÉSZ (a Phase 8 közé beszúrt, 3 iterációs blokk).**
Az eredeti Level 1 (3200 px, folyamatos talaj, hazard nélkül) pillanatok alatt átugrálható
volt. A user layout-specje (`2D helper/level1-layout.md`) alapján a pálya **6000 px**-re nőtt,
nyolc szakaszra tagolva: `A start + a ház (NPC) · B csendes átvezetés · C első enemy +
platforming + gap · D spike-tutorial · E kombinált kihívás · F Swinging Reaper ·
G záró harc · H boss-ajtó`.
*(Az `A` eredetileg „mozgás/ugrás-tutorial", a `B` pedig „első enemy" volt — mindkettő
2026-09-02-én változott, lásd a finomhangolás 2. körét.)*

- **1. iteráció (KÉSZ):** layout-váz — új `src/levels/Level1Layout.ts` adatmodul, öt
  talaj-szegmens + **négy szakadék**, 13 platform, **8 CrowHarvester**, zuhanás-halál,
  **enemy-respawn**, köztes checkpoint, tutorial feliratok (`src/ui/TutorialHint.ts`).
- **2. iteráció (KÉSZ):** spike-ok a D szakaszban — `src/hazards/HazardDamage.ts`
  (i-frame kapu) + `src/hazards/SpikeField.ts`. Egy 128px-es mező a G3-on (2740–2868),
  15 sebzés, függőleges visszalökés. Részletek lentebb, a „Hazardok" szakaszban.
- **3. iteráció (KÉSZ):** Swinging Reaper az F szakaszban — `src/hazards/SwingingReaper.ts`.
  Determinisztikus inga a gap4 fölött, 20 sebzés, a meglévő megosztott i-frame kapun át.

**A blokk MÉG NYITVA VAN** — a Phase 8-ra visszatérés előtt finomhangolási körök futnak.

**Finomhangolás, 1. kör (KÉSZ)** — két user által jelzett hiba:
- **Az A szakasz nem tanított semmit:** a három platform folyamatos talaj fölött lógott, a
  player alattuk elfutott. Ezért **640 px-es gödör** került alájuk.
  ⚠️ **EZT A 2. KÖR VISSZAVONTA** — lásd lentebb.
- **A földi enemyk láthatatlan falba ütköztek:** az üldözés a szűk patrol-körzetre volt
  clampelve. A `clampChaseToBounds` flag helyett most **külön `chaseMinX`/`chaseMaxX`** van,
  amit az `enemyChaseBounds()` vezet le a felület pereméből + a spike-mezőkből.

**Két viselkedés-változás a korábban dokumentálthoz képest (user-döntés):**
1. **A player halálakor az enemyk is újraélednek** (`Level1Scene.resetEnemies()`). Korábban
   szándékosan CSAK a player állt vissza; egy 6000 px-es pályán viszont az azt jelentené,
   hogy egy nehéz szakaszt ismételt halálokkal „le lehet koptatni".
2. **Van egy KÖZTES checkpoint** (x=3000, a spike-szakasz után), ami **érintésre**
   aktiválódik — nem `E`-re, mint az ajtó, hogy ne versenyezzen annak promptjával.

**Finomhangolás, 2. kör (KÉSZ, 2026-09-02) — az A szakasz VISSZAVÁLT: gödör helyett HÁZ.**
A user döntése alapján az `A1`–`A3` platform és a 640 px-es gödör **törölve**; a helyükön
**folyamatos talaj** van, rajta a pálya egyetlen **háttér-épületével**. Ez a Phase 8 —
Atmosphere folytatása is: a Level 1 első valódi „lakott világ" eleme.

- **A `G1` és a `G2` szegmens EGYETLEN, 0–1660-as szegmenssé olvadt.** A szakadékokat a
  `groundGaps()` a szegmensek KÖZÖTTI hézagokból számítja, tehát a gödör megszüntetése =
  a két szegmens összevonása. **Két, egymáshoz ÉRŐ szegmens nem jó**: a `LevelTerrain` a
  cathedral skinnél minden szegmens BELSŐ peremére kirak egy 16 px-es végzárót, tehát a sík
  talaj közepén két, egymásnak háttal álló szakadék-perem látszana. Az így keletkező
  **id-hézag (`G1`, `G3`, `G4`, …) szándékos**: a `G3`–`G6` minden hivatkozása változatlan
  maradhatott, csak a három `'G2'`-es `surfaceId` (`B-1`, `B-crates`, `B-wagon`) lett `'G1'`.
  A pálya így **5 szegmens / 4 szakadék** (160 / 160 / 130 / 400 px) és **11 platform**.
- **Következmény: az első KÉNYSZERŰ ugrás újra a C szakaszé** (a `gap1`, 1660–1820, 160 px).
  Ezzel megszűnt a `level1-layout.md` spec-eltérése is (az A szakasz megint hazard-mentes).
  *Ismert, elfogadott mellékhatás:* a `movement` súgó („Space / W — ugrás") ~x=800-ig áll,
  tehát a lecke és az első gyakorlat szétcsúszik.
- **A ház (`BACKDROP_BUILDINGS`, `A-house`, x=620)** a `house-a.png` (GothicVania Town,
  168×183), amit a `BootScene` **már betöltött** a Level 2 miatt — **új asset nem kellett**.
  A `createBackdropBuildings()` szerződése adja a user kérésének a lényegét: **nincs physics
  bodyja**, és a `BUILDING_DEPTH` (−15) a parallax rétegek (−30..−20) ELŐTT, de a propok
  (−10) és a terrain (−5) MÖGÖTT van → **a player és az enemyk elmennek előtte**.
- **A `BuildingDef` kapott egy `tint?` mezőt** — a `DecorPropDef.tint` pontos tükörképe, és
  ugyanabból az okból PLACEMENT-szintű: ugyanaz a `house-a` a Level 2-n hazai pályán van, a
  Level 1 cathedral-tónusában viszont korrekciót kíván. Elhagyva `PROP_TINT_NONE`, ami
  MULTIPLY-ban NO-OP → **a Level 2 és a Level 3 viselkedése bitre változatlan**.
- **A tint MÉRT, nem tippelt** — `BUILDING_TINT_CATHEDRAL_SOURCE` (`0xf3e599`), a HARMADIK
  tint a projektben. A nyers `(68,45,60)`-ból `(65,40,36)` lesz: fényességben (46,9) ÉS
  telítettségben (`R/B` 1,80) is pont a hangulati propok `(55,35,32)` és a mögötte lévő
  `03-ruins` réteg `(74,46,40)` FELEZŐPONTJA — vagyis oda esik, ahol a ház a
  mélységsorrendben is ül (−15 a −10 és a −20 között).
  **Ez a második nekifutás, és a tanulság általános:** először a `PROP_TINT_COOL_SOURCE`-t
  kapta, „kő/vakolat" alapon, és kézi teszten TÚL NARANCSOS lett. A mérés meg is nevezte,
  miért — és **nem a fényesség volt a baj** (44,3 rendben lett volna), hanem a
  **TELÍTETTSÉG**: `R/B 2,55`, miközben a pálya képernyőjén minden elfogadott elem az
  **1,25..1,87** sávban van. Az a tint ugyanis a nyersen sokkal KÉKEBB lámpához/kúthoz
  (`R/B 0,77`) van hangolva; a ház már nyersen 1,13, tehát ugyanaz a kékvágás rajta túllő.
  A `PROP_TINT_WARM_SOURCE` viszont ALÁLŐ (fényesség 39,0 — a propoknál is sötétebb, a
  rétegzéssel ellentétesen).
  **A szabály tehát: a tintet a NYERS ARÁNYBÓL kell választani, nem az anyag
  kategóriájából.** Unit teszt őrzi, hogy a tintelt eredmény a sávban marad (a régi
  értékkel bukik).
- **Opcionális párbeszéd `E`-re** (`HOUSE_DIALOGUE`, egyetlen sor, PLACEHOLDER lore):
  valaki kiszól a házból. **A panel a képernyő TETEJÉRE kerül** (`HOUSE_DIALOGUE_PANEL_TOP`),
  és ez KÉNYSZER: a `Dialogue` a horgony ALÁ rajzol `PANEL_RESERVE_PX` (75) px-t, a
  boss-arénák ezért vannak 369-en (`369+75=444 ≤ 450`) — egy PÁLYA padlója viszont **418**,
  és `418+75=493 > 450`. Bármilyen 343 fölötti horgony a player TESTÉT (372..418) takarná ki.
- **A player a párbeszéd alatt TELJESEN befagy** (user-döntés), és ehhez a
  `PlayerController` kapott egy **`setEnabled()`** kapcsolót. Az `update()` kihagyása
  önmagában NEM elég: a konstruktor a `J`/`F`/`pointerdown` listenereket regisztrálja, tehát
  a player különben kardot suhinthatna a monológ alatt. A `Boss2Scene` trükkje („a
  controllert csak a harc előtt hozzuk létre") itt nem alkalmazható, mert a player a
  párbeszéd ELŐTT és UTÁN is sétál; a `PreScene`-é (saját, minimális input) sem, mert ez
  harci pálya. **Mellékhaszon: ezzel lezárult a 17. technikai tanulság nyitott kockázata.**
- **A párbeszéd ISMÉTELHETŐ** (user-döntés): a prompt utána visszatér, mint egy újraolvasható
  tábla — se `DialogueMemory`, se registry-kulcs nem kell. Ebből viszont következik, hogy a
  **`keydown-RIGHT` bekötés a `create()`-ben van, nem a `startHouseDialogue()`-ban**
  (`this.houseDialogue?.advance()` — null-safe): a `PreScene` azért teheti a start-metódusba,
  mert ott a párbeszéd végigjátszásonként egyszer fut, itt viszont minden újraindításkor egy
  új listener gyűlne fel.
- **A `JustDown` élét EGYSZER, a frissítés elején olvassuk ki**, és osztjuk szét a két
  interakciós pont (ház + ajtó) között — a `PreScene` mintája. Két oka van: (1) a második
  hívás ugyanabban a frame-ben már `false`, tehát a ház némán elnyelné az ajtó `E`-jét;
  (2) a párbeszéd ALATT is ki kell olvasni, különben egy türelmetlenül `E`-t nyomkodó player
  leütése „felgyűlne", és a párbeszéd végén azonnal újraindítaná.

**Finomhangolás, 2. kör — kézi teszt utáni javítások (ugyanaznap):**
- **Az `E: Kopogás` prompt VILÁG-koordinátás lett** (`HOUSE_PROMPT_Y`, a player feje fölött
  24 px-szel), nem `setScrollFactor(0)`-s képernyő-felirat. **Ez a boss-ajtóval való
  különbség lényege, és könnyű újra elrontani:** az ajtó promptja azért ülhet a (400, 400)
  képernyő-ponton, mert a pálya VÉGÉN a kamera nekiütközik a jobb bounds-nak (`scrollX`
  5200-nál megáll), tehát a player a képernyő jobb szélére csúszik. A ház viszont x=620-nál
  van, ahol a kamera SZABADON követ — ott a player pontosan a képernyő közepén (400) áll,
  tehát a felirat pont MÖGÉ került. A minta a köztes checkpoint feliratáé.
- **Az első CrowHarvester átkerült a `G1`-ről a `G3`-ra** (`B-1` → **`C-1`**, x 1250 → 2080,
  a `C2`/`C3` lebegő platformok alá). Így a **`gap1` (1660–1820) VÁLASZTJA EL a háztól**: a
  párbeszéd zavartalan beat, a harc pedig külön. A `patrolMinX` (2000) a landolási zónától is
  ~150 px-re van, tehát a szakadékot átugró player nem egy már támadó lény ölébe érkezik.
  **Következmény a szakasz-szerepekre:** a `B` szakasz (960–1660) mostantól ÜRES — az első
  ellenfél a `C`-ben van. Unit teszt őrzi, hogy a ház és az első enemy között tényleg van
  szakadék, nem csak detektálási távolság.
- **A harc-súgó `triggerX`-e 1000 → 1560**, együtt az enemy áthelyezésével. A `HINT_HOLD_MS`
  (4000) alatt `MOVE_SPEED` (200) mellett 800 px tehető meg, tehát a felirat 1560..2360-ig
  van a képen — a `gap1` átugrása ÉS az első harc is ebbe az ablakba esik. **A tesztje
  KÉTOLDALI** (a harc előtt induljon, de még a képen legyen, amikor a harc kezdődik), tehát
  sem az enemy, sem a trigger nem csúszhat el csendben a másiktól.


---

## Fairness-hangolások — kézi teszt után

Mindkét blokk ugyanazt a módszert használja: a nehézség-panasz **mérésre** váltása a player
exportált konstansaiból, majd a levezetett érték rögzítése futtatható unit teszt-invariánsként.
A `CLAUDE.md` a végeredményt és a további hangolási sorrendet tartja; a teljes levezetés itt van.

### Boss 2 – The Mad King (2026-08-30)

A király első verziója **túl nehéz és nem fair** volt: gyorsan és gyakran támadott, a player
rövid hatótávú kardja pedig nem tudott reagálni rá. **A diagnózis MÉRÉS volt, nem érzés.**

A csapás kikerüléséhez a playernek `SLASH_RANGE + 10` = **152 px**-re kell jutnia, pontblank
helyzetből (`HALF_WIDTH` 24 + a player fél testszélessége 14 = **38 px**) indulva. A
`JUMP_VELOCITY` (−500) és a `GRAVITY_Y` (800) mellett:

| windup | csak ugrás | ugrás + hátralépés |
|---|---|---|
| **330 ms (az eredeti)** | 127 px → **ELTALÁLJA** | 160 px → kikerüli |
| **660 ms (a mostani)** | 160 px → kikerüli | 231 px → kikerüli |

Vagyis 330 ms-mal egy **sima ugrás nem volt elég** — ugrani ÉS hátrálni kellett, 330 ms alatt,
amiből ~250 ms az emberi reakcióidő. **660 ms egyben a természetes PLAFON is:** a player
ugrás-apexe 625 ms-nél van, azon túl egy álló ugrás már NEM növel távolságot (550 → 660 ms:
159 → 160 px). **Ne emeld 660 fölé** — csak lomha lesz tőle, kikerülhetőbb nem.

| | volt | most | miért |
|---|---|---|---|
| `SLASH_WINDUP_MS` | 330 | **660** | a fenti mérés; frame-listából számítva |
| `SLAM_RECOVERY_MS` | — (`ACTION_COOLDOWN_MS` 850) | **1500** | a fő punish-ablak, lásd lentebb |
| `ACTION_COOLDOWN_MS` | 850 | **900** | apró; az érdemi javítást a windup adja |
| `SLASH_DAMAGE` | 16 | **12** | a leggyakoribb támadás → a player 8 csapást bír |
| `SLAM_DAMAGE` | 22 | **18** | kikerülhető, ezért fájóbb marad a slashnél |
| `LUNGE_DAMAGE` | 24 | **22** | Phase 2, piros telegraph |
| `MAX_HP` | 300 | **300** | user-döntés: maradjon hosszú, kitartást igénylő harc |

A **`SLAM_RECOVERY_MS` LEVEZETETT**, a player exportált konstansaiból (unit teszt őrzi):
`visszafutás ~300` (`SLAM_HIT_HALF_WIDTH / MOVE_SPEED`) + `két csapás 500`
(`startupDelayMs 150`, majd `cooldownMs 350`) + `menekülés ~310` = **~1110 ms** → 1500,
tartalékkal. Ez a user által kért ritmus: *„2 gyors kardtámadás, majd elugrani"*.

**A `madKing.test.ts` „Fairness-invariánsok" blokkja mindezt futtatható állításként rögzíti** —
a régi értékekkel visszaellenőrizve pontosan három teszt bukik el. Ha valaki később
„felgyorsítja" a királyt, nem a következő kézi végigjátszás fogja megtalálni, hanem a CI.

**Ha még mindig nehéz, a hangolás sorrendje:** `SLAM_RECOVERY_MS` ↑ → `ACTION_COOLDOWN_MS` ↑ →
`SLASH_DAMAGE` ↓. **A `SLASH_WINDUP_MS`-hez ne nyúlj** (lásd a plafont).


### Boss 1 – The Grafted Wing-Breaker (2026-09-01)

A user jelzése: *„amint közel érek hozzá, rögtön megsebez a karddal"*. **A diagnózis MÉRÉS
volt, nem érzés:** a korábbi `SLASH_WINDUP_MS = 400` pontosan annyi, amennyi alatt a player
beér és üt egyet — a találat tehát GARANTÁLT volt, mert **a player a saját támadása alatt
végig lockolva van** (`Player.isLocked()` az ATTACK state-re), se mozogni, se ugrani nem tud.

| lépés | idő |
|---|---|
| belépés a boss hatótávjából (`SLASH_RANGE` 138) a sajátunkéba (91 px, `MOVE_SPEED` 200) | 235 ms |
| EGY kardcsapás, teljes ATTACK-lock (`startupDelayMs` 150 + `activeDurationMs` 180) | 330 ms |
| menekülés 91 → 148 px (`SLASH_RANGE + 10`) **tiszta futással** | 285 ms |
| ugyanez **tiszta ugrással** (`hypot(91, h) > 148` → `h > 116.7`) | 315 ms |

→ 880 ms a lassabb ággal (a másik ág 850), tehát **`SLASH_WINDUP_MS` 400 → 900** (9 slot × 100 ms). Ezzel a
user kérése teljesül: *be, EGY csapás, majd elfutni VAGY elugrani*. **A 91 px a player kardjának
tényleges hatótávja a boss testéhez képest** (`hitboxOffsetX 34 + hitboxWidth/2 25 + HALF_WIDTH 32`),
nem becslés.

- **A windup a FRAME-KOCKÁK ISMÉTLÉSÉBŐL hosszabbodott, nem a slot-idő emeléséből**
  (`SLASH_FRAMES = [16,16,17,17,18,18,19,19,19,20,…25]`, `ATTACK_SLOT_MS` marad 100) — így a
  csapás UTÁNI kikövetkezés tempója változatlan. Ugyanaz a fogás, mint a
  `CrowHarvesterAnimations.ATTACK_FRAMES`-nél és a `MadKingAnimations.SLASH_FRAMES`-nél, és a
  `SLASH_WINDUP_MS` továbbra is SZÁMÍTOTT (`SLASH_FRAMES.indexOf(SLASH_STRIKE_FRAME) * ATTACK_SLOT_MS`).
- **VÁLLALT KORLÁT:** pontblank ölelkezésből (46 px) + 250 ms reakcióidővel a tiszta futás
  (510 ms) NEM fér bele — onnan ugrás + hátralépés kombó visz ki (280 ms). Az ezt is lefedő
  1100 ms-os windupot a user elvetette: 2 s-os slash-ciklussal a boss lomhává válna.
- **A dash (charge) és a Shadow Spell BITRE változatlan** (user-kérés): saját frame-tartomány,
  saját időzítés, a `BLADE_REACH_PX` mérése pedig ugyanarról a `clean[20]` frame-ről jön,
  tehát a `SLASH_RANGE = 138` sem mozdult.
- **Az arany telegraph** (`SLASH_TELEGRAPH_TINT = 0xffd070`, a Mad King ÉRTÉKÉVEL — a jelentés
  bosson átívelő) a windup elején kerül fel, és a CSAPÁS pillanatában tűnik el. A
  `clearTintState()` a hit-villanás után VISSZATESZI, mint a charge pirosát.
- **A `SLASH_DAMAGE` (18) és az `ACTION_COOLDOWN_MS` (900) NEM változott.** Ha kézi teszten
  még mindig nehéz, a hangolás sorrendje: `ACTION_COOLDOWN_MS` ↑ → `SLASH_DAMAGE` ↓ —
  **a winduphoz ne nyúlj**, azt a fenti levezetés köti.
- A `boss.test.ts` **„Fairness-invariánsok"** blokkja mindezt futtatható állításként rögzíti
  (a `madKing.test.ts` azonos blokkjának mintájára, a player exportált konstansaiból számolva):
  a régi 400-zal három teszt bukik.


> **Együtt járó változás:** ugyanebben a körben lett a `BossScene` `GROUND_TOP`-ja
> 418 → **369** (a párbeszéd-panel `PANEL_RESERVE_PX` miatt), és emiatt kellett a
> `boss-arena.png`-t újragenerálni — a korábbi 1467×825-ös kivágás helyett 1663×935,
> tehát KEVESEBBET vág, a szélső romos ívek visszakerültek.

---

## Heavy slash + tűzgolyó-töltetek (2026-09-02)

A harc két okból volt egysíkú: a tűzgolyó korlátlan volt (30 dps *biztonságból*, szemben a
kard 28,6 dps-ével *kockázat mellett*), és egyetlen kardtámadás létezett. A cél **nem egy
erősebb player** volt, hanem változatosabb harc — ezt mindkét szám levezetése rögzíti, és
unit tesztek őrzik.

**TŰZGOLYÓ — 2 töltet, EGYMÁSTÓL FÜGGETLEN visszatöltéssel.**
- `FIREBALL_MAX_CHARGES = 2`, `FIREBALL_RECHARGE_MS = 3000` (`combat/Projectile.ts`).
  A `FIREBALL_CONFIG.cooldownMs` (500) VÁLTOZATLAN: az a lövések közti RITMUS, nem a
  fegyver kapuja. A kettő szándékosan külön él.
- **A modell időbélyeg-sor, NEM `delayedCall`** (`Player.fireballRechargeAt`): minden
  elköltött töltet betesz egy `now + rechargeMs` bejegyzést, ami lejáratkor kikerül. Ebből
  adódik a kért viselkedés — két gyors lövés → egyszerre visszatérő töltetek; egy lövés,
  várakozás, még egy → eltolt visszatérés. **Két oka van, hogy nem timer:** (1) a
  `combat.test.ts` a `delayedCall` regisztrációit SZÁMOLJA és sorrendben lépteti, tehát egy
  új timer minden meglévő támadás-tesztet elmozdítana; (2) így a viselkedés `scene.time.now`
  léptetésével közvetlenül tesztelhető. A sor MAGÁTÓL rendezett marad (a `now` monoton, a
  `rechargeMs` konstans) — a `shift()`-es lejáratás erre épül.
- **A lejáratás az `updateState()`-ben fut** (a per-frame hook, amit a `PlayerController`
  MINDKÉT ága, a `PreScene` és a befagyasztott inputú `Level1Scene` is meghív) **és
  védekezésből a `castFireball()` elején** — így a frissesség nem a hívási sorrenden múlik.
  A getterek tiszta olvasások maradnak.
- **Az 5000 ms LEVEZETETT:** fenntartott sebzés `2×15/5000 = 6 dps` a kard 28,6-jával
  szemben; egy 40 HP-s CrowHarvester 3 tűzgolyót kíván (≈5,5 s), miközben a lény a
  220 px-es `DETECTION_RANGE`-ét ~2,2 s alatt teszi meg → **a tisztán távolsági megölés
  kétszer annyi ideig tart, mint amennyi alatt a lény beér.** Ez az elsődleges hangolópont.
  *(Első nekifutásra 3000 volt; kézi teszten még mindig túl bőkezű volt. A 2 lövéses BURST
  szándékosan változatlan — a nyomásnak a sorozat UTÁN kell jönnie.)*
- A `castFireball()` mostantól **nullázza a `currentAnimKey`-t** (a támadás precedense):
  amíg a lőszer korlátlan volt, az 500 ms-os cooldown mindig hosszabb volt a 260 ms-os
  animációnál; egy két-töltetes sorozatnál viszont a második cast az animáció utolsó
  frame-jén ragadhatna.
- `respawn()`: a tár **tele** éled újra.

**HEAVY SLASH — `AttackType.HEAVY`, K / jobb egérgomb.**
- **A látvány EGY vágott „echo" sprite.** A mérés szerint az `Attacks.png` f17–f19
  frame-jein a félhold-hullám LEVÁLIK a testről (oszlop-hézag: 76..88, 76..94, 76..108) és
  előre halad. Elég tehát ugyanazt az animációt még egyszer lejátszani egy előrébb tolt
  sprite-on, amiről a lovag testét levágjuk — a két ív egyetlen, kétszer olyan messzire érő
  csapásnak olvas. A sprite egyszer jön létre a `Player` konstruktorában (az `attackHitbox`
  mintája), és csak pozíciót/láthatóságot vált.
- **MÉRT geometria:** a test a frame `x 47..76` sávjában van (világ-koordinátában −17..+12),
  a hullám a `+12..+63` sávot tölti ki → **`HEAVY_ECHO_OFFSET_PX = 51`** (`Attack.ts`) és
  **`ARC_CROP_X = 77`** (`PlayerAnimations.ts`). A crop koordinátáit **NEM kell tükrözni**:
  a Phaser 4 `Frame.setCropUVs()` a `flipX`-et magától kezeli.
- **A hitbox a sávhosszal tolódik ki**, nem hangolva: `hitboxWidth = SWORD + 51` (101),
  `hitboxOffsetX = SWORD + 51/2` (59,5) → +9..+110. **Önellenőrző:** a kard látványa +63-ig
  ér az +59-es hitbox mellett (4 px behúzás), a heavyé +114-ig a +110-es mellett — UGYANAZ
  a 4 px. Unit teszt őrzi.
- **A `cooldownMs = 800` LEVEZETETT, és ez biztosítja, hogy a player ne legyen erősebb.**
  A heavy `HEAVY_CHARGE_HITS = 3` BEÉRKEZETT alapcsapásból tölt, tehát a ciklus 3 kard +
  1 heavy; a feltétel `(3·10 + 22)/(3·350 + C) ≤ 10/350` → `C ≥ 770`. Eredmény: **28,1 dps**
  a tiszta kard **28,6**-ja ellenében — a heavy egy hajszálnyi dps-t ad fel HATÓTÁVÉRT.
  Regressziós teszt bukik, ha valaki megemeli a sebzést vagy csökkenti a cooldownt.
- **A töltés a `registerHit()`-ben történik** — ez az egyetlen pont, amit mind a 9 scene-beli
  találat-kezelő már ma is meghív, és csak ténylegesen sebző találatnál. Két megszorítással:
  CSAK `SWORD` tölt (különben a heavy önmagát finanszírozná), és **csapásonként egyszer**
  (`hitTargetsThisAttack.size === 0`), tehát egy több ellenfelet elérő ív sem ad többet — a
  swing számít, nem a célpont. Mindkettőre van teszt.
  *Mellékhatás, ami helyes:* a `Boss3Scene`/`FinalBossScene` a sebezhetőséget a
  `registerHit()` ELŐTT nézi, tehát egy DORMANT/villanó célponton elhasznált csapás nem tölt.
- **Nincs új `PlayerState`** — a heavy is `ATTACK`, csak saját anim kulccsal
  (`PLAYER_ANIMS.ATTACK_HEAVY`: UGYANAZ az öt frame 480 ms alatt, 10,4 fps a kard 15-e
  helyett). Ezért maradt érintetlen az `isLocked()` és a `player.test.ts` lock-táblája.
  Az `animKeyForState(state, attackType?)` bővítés PONTOSAN az, amit a fájl kommentje
  megjósolt; a default paraméter miatt a régi teszt-tábla is változatlan.
- **Az echo a MEGLÉVŐ `startup+active` időzítőn tűnik el**, szándékosan nem egy újon: a
  `performAttack()` `delayedCall`-jainak száma és sorrendje így változatlan. A `die()` is
  elrejti (ne lógjon a hullám, amíg a lovag összerogy), a `respawn()` szintén.
- `respawn()`: a felgyűjtött heavy **ELVÉSZ** (user-döntés) — konzisztens azzal, hogy a
  player halálakor az enemyk is újraélednek.
- **A heavy IZZIK — „spell-kard" (user-kérés).** Mindkét hullám `HEAVY_WAVE_TINT`
  (`0xff7a2a`) színt kap **ADD blenddel**, `HEAVY_WAVE_ALPHA` (0.85) mellett. Az ADD itt
  KÉNYSZER, nem ízlés: a MULTIPLY tint (a projekt szokásos módja) csak SÖTÉTÍTENI tud, tehát
  barnább ívet adna — az ADD viszont hozzáadja a fényt a háttérhez, így a sötét arénákban is
  égő csóvaként olvas. **Ez a 14. és a 26. tanulság kiegészítése:** ha nem elnyelni akarsz,
  hanem világítani, a tint önmagában kevés.
  Ezért van a hullámokból KETTŐ (`HEAVY_WAVE_OFFSETS = [0, HEAVY_ECHO_OFFSET_PX]`): a
  `0`-s a lovag SAJÁT ívére fekszik és felizzítja (a crop miatt a testére nem), a másik a
  második hullám. Enélkül csak a távoli ív égne, a közeli fehér maradna.
- **Hang: NINCS új asset.** A user által kért `Firebuff 2.wav` **bitre azonos** a repóban már
  meglévő `assets/audio/sfx/firebuff-2.wav`-val (md5 `ad78f8af…`), amit eddig a bossok
  varázslatai használtak — ezért lett a kulcs `BOSS_SPELL_IMPACT`-ról **`SPELL_IMPACT`**-ra
  átnevezve (a hang azóta nem boss-specifikus). A `PlaySfxOptions` kapott egy fix `detune`
  mezőt (a véletlen `detuneRange` MELLETT), és a heavy `HEAVY_SLASH_DETUNE = -200` centtel
  szól: ugyanaz a láng, mélyebben — egy kard mögötte, nem egy oltár.
- **VÁLLALT KÖVETKEZMÉNY — a hatótáv a bossokkal szemben.** Player-elérés = 110 + a boss
  félszélessége: *Wing-Breaker* (32) → 142 vs. `SLASH_RANGE` 138, tehát a player **4 px-szel**
  kijjebbről üt (elhanyagolható, és a 3 töltő csapást a boss hatótávján BELÜL kell bevinni);
  *Mad King* (24) → 134 vs. 142, **a király továbbra is kijjebbről üt**; *Ancient Demon* (16)
  → 126 vs. 90, valódi stand-off, de a `NOVA_HIT_RANGE` pont 90 és CSAK ugrással kerülhető
  ki, tehát a nyomása megmarad. Ha kézi teszten mégis soknak bizonyul, a knob a
  `HEAVY.hitboxOffsetX`.


---

## CombatHud — a hét scene duplikációjának felszámolása (2026-09-02)

A `src/ui/CombatHud.ts` **ez a modul váltotta ki a HÉT scene-ben szó szerint duplikált
`playerHpText` blokkot** — pontosan az a költöztetés, amit a `TutorialHint.ts` fejléce a
Phase 8 `ui/` iterációjának feladataként jegyez. A duplikáció megszüntetése nem esztétikai
döntés volt: a heavy slash és a tűzgolyó-töltetek két új mérőjét különben ugyanúgy hétszer
kellett volna bemásolni.

- **A HP-sor formátuma betű szerint a régi** (`HP: 100/100 | IDLE`) — továbbra is debug
  kijelzés, a valódi ikonos HUD külön iteráció.
- **`HUD_DEPTH = 100` egységesen.** Korábban a pályák depth nélkül, a boss arénák 100-zal
  rakták ki; a 100 mindenhol biztonságos, mert ez a projekt legmagasabb használt értéke.

---

## Phase 10 – QA (2026-09-08) — a CI útja a minimális szelettől a teljes pipeline-ig

A `.github/workflows/ci.yml` a `Project_plan.md` 31. pontjában felvázolt pipeline-t **két
lépcsőben** érte el. Az alábbi az EREDETI, minimális mérföldkő leírása, ahogy a `CLAUDE.md`-ben
állt — a Phase 10 ezt bővítette ki integration teszttel, deploy sanity checkkel és Playwright
E2E-vel (a mostani állapot a `CLAUDE.md` „CI" szakaszában, a részletek a `docs/Test-plan.md`-ben):

> `.github/workflows/ci.yml` — a `Project_plan.md` 31. pontjában felvázolt pipeline **első,
> minimális szelete**. Egy job (`ubuntu-latest`, Node 24), és pontosan azt futtatja, ami
> MÁR LÉTEZIK: `npm ci` → `npx tsc --noEmit` → `npm run test` → `npm run build`.
>
> - **Trigger:** `push` szűrő NÉLKÜL (tehát minden branchre) + `pull_request` a `main` felé.
>   A `concurrency: cancel-in-progress` miatt egy ugyanarra a ref-re érkező újabb push
>   megszakítja a még futó, elavult futást.
> - **A typecheck KÜLÖN lépés, és a tesztek ELŐTT fut.** Ez nem redundancia: a `vite build`
>   esbuilddel csak **levágja** a típusokat, nem ellenőrzi őket — egy zöld build tehát
>   önmagában nem bizonyítja, hogy a `tsc` tiszta. A `tsconfig.json` `include`-ja
>   `["src", "tests"]`, tehát ez a lépés a teszt fájlokat is típusellenőrzi.
> - **`npm ci`, nem `npm install`** — a lockfile-hoz determinisztikusan telepít, és elszáll,
>   ha a `package.json` és a `package-lock.json` kicsúszott egymásból.
> - **A build a Linux runneren fut, ami case-sensitive.** A `BootScene` 36 assetet
>   Vite-importtal hoz be, tehát egy elgépelt nagybetű (pl. `idle.png` a `Idle.png` helyett)
>   Windowson észrevétlen, a CI-ban viszont **build-hiba**. Ez a Project_plan 30. pontjának
>   (asset testing) ingyen kapott szelete — de csak addig működik, amíg minden asset
>   committolva van (jelenleg mind a 37 az).
> - **Ami SZÁNDÉKOSAN nincs benne:** integration teszt, Playwright/E2E, visual regression,
>   cross-browser matrix, performance mérés, `dist/` artifact upload, GitHub Pages deploy,
>   branch protection. Mind későbbi mérföldkő (Phase 10/11), és a repóban jelenleg nincs is
>   mit futtatni belőlük — ezért nem is kerültek bele „üresen".
>

**Amit a Phase 10 hozzátett** (2026-09-08):

- **`verify` job:** a `npm ci → typecheck → unit → build` sorba beékelődött az **integration
  teszt** (`tests/integration/`, 2 fájl / 23 eset) és a build UTÁN egy **deploy sanity check**
  (`scripts/check-build.mjs`) — az egyetlen hibaosztály, amit sem a typecheck, sem a teszt, sem
  a build nem fog meg: a root-abszolút asset-útvonalak némán elrontanák az itch.io és a GitHub
  Pages deployt, miközben minden más zöld marad.
- **`e2e` job** (`needs: verify`): Playwright — Chromium teljes (18 eset) + Firefox smoke (5),
  `playwright-report` artifacttal.
- **`performance` job:** on-demand (`workflow_dispatch`), `--workers=1`-gyel. A mérés egyedül
  futtatva érvényes: párhuzamos terhelés mellett a p95 képkocka-idő 16,7 ms-ról 51,7-re ugrott
  — a játék változatlanul.
- **Ami MÉRÉSSEL bukott meg:** a visual regression **pixeldiff-kapuként**. Hamis bukásokat
  adott, ÉS a valódi változást elvetette — helyette képcsatolás emberi átnézésre
  (`tests/e2e/visual.spec.ts`).
- **A WebKit kimaradt a mátrixból:** a Playwright buildjében nincs Web Audio API, tehát a
  játék be sem tölt.

A `Project_plan.md` 33. pontja (QA dokumentáció) is ekkor lett felülvizsgálva: a hét tervezett
dokumentumból **egy** lett (`docs/Test-plan.md`) — a szétbontás egy fejlesztő + egy játék
esetén nem áttekinthetőbbé tesz, hanem karbantartási terhet és elavulást szül.

---

## Licenc-átnézés és lezárás (2026-09)

A fejlesztés nagy részében a `CLAUDE.md` egy futó listát vezetett „NYITOTT JOGI TÉTEL"
címszó alatt: melyik asset-csomaghoz nem került licencszöveg, és mit kell tisztázni a repo
nyilvánossá tétele előtt. **Ez a lista lezárult** — a forrásokat átnéztük, és a
`src/scenes/CreditsScene.ts` `CREDITS` tömbje azóta teljes, névre szóló attribúciót tartalmaz
(karakterek, környezet, zene, hang), a repóban pedig ott a négy bemásolt licencfájl
(`knight`, `goddess`, `mad-king`, `ashen-path`).

Az alábbi a lista **archív állapota**, ahogy a lezárás előtt állt. Az asset-provenance
(melyik fájl melyik csomagból, mi származtatott és hogyan) a `CLAUDE.md` fájlstruktúra-fájának
kommentjeiben él tovább; az attribúció mérvadó forrása a `CreditsScene`.

<details>
<summary>A nyitott jogi tételek archív listája (kattints a kibontáshoz)</summary>

- **NYITOTT JOGI TÉTEL:** a CrowHarvester assethez (`assets/sprites/crow-harvester/`)
  — a knight csomaggal ellentétben — **nem került licenc fájl a repóba**. Ez tudatos,
  elhalasztott döntés. A forrás valószínűleg a `2D helper/Credits.txt`-ben szereplő
  karakter-csomag; **a repo nyilvánossá tétele / GitHub Pages deploy ELŐTT tisztázni kell.**
  Ezért maradt meg az eredeti `enemy04_sheet.png` fájlnév: ez az egyetlen megmaradó
  kapocs a forráscsomaghoz. **Ez a tétel kizárólag a CrowHarvesterre vonatkozik** — a
  knight csomag licence a repóban van, a háttéré (`PixelPlatformerSet1 v1.1`, Szadi art)
  pedig **public domain** (*"License for Everyone. Public domain and free to use, personal
  or commercial. Credit is not required but appreciated."*). A user a licenceket külön
  gyűjti, és a projekt végén másolja be őket — ezért nem került licenc fájl a
  `assets/backgrounds/ruined-city/` mellé, a forráscsomagot a `BootScene` importjainál
  lévő komment köti vissza.
- **NYITOTT JOGI TÉTEL (ÚJ) — a Beast (Enemy 3) sprite-ja.** A `goatman.png` a
  `2D helper/enemy/` **gyökerében** állt, csomag és licencfájl nélkül, és a
  `2D helper/Credits.txt`-ben **sem szerepel** — ugyanaz a kategória, mint a
  `Bossbackground_1.png` vagy a `17. Death Groan (Male).wav`. A forrást nem sikerült
  azonosítani: a 13 színű palettája **nem egyezik** a Necromancerével (Gravecaller), tehát
  nem az `oco.itch.io` csomagból való. Ezért maradt meg az **eredeti fájlnév**
  (`assets/sprites/beast/goatman.png`): ez az egyetlen kapocs a forráshoz. **A repo
  nyilvánossá tétele / GitHub Pages deploy ELŐTT tisztázni kell, és a `Credits.txt`-be fel
  kell venni.**
  *(A Beast HALÁL-HANGJA ezzel szemben NEM nyit új tételt: a `fatmanbossDeath.wav` ugyanabból
  a „Monster Growls Attack and Deaths V.1" csomagból jön, ami a `necro-hurt` /
  `necro-death-2` miatt már nyitott tételként dokumentált — egy sor fedi mindhármat.)*
- **NYITOTT JOGI TÉTEL (ÚJ):** a Gravecaller assethez (`assets/sprites/gravecaller/`) sem
  került licenc a repóba — a forráscsomagban (`2D helper/enemy/Necromancer`) **egyáltalán
  nincs licenc/readme fájl**, és a `2D helper/Credits.txt`-ben **sem szerepel**. Ugyanaz a
  kategória, mint a CrowHarvester: a repo nyilvánossá tétele / GitHub Pages deploy ELŐTT
  tisztázni kell, és a **`Credits.txt`-be fel kell venni**. Ezért maradtak meg az eredeti
  `spr_Necromancer*_strip*.png` fájlnevek: ez az egyetlen kapocs a forráscsomaghoz.
  *Nyom a kereséshez: a `spr_<név>_strip<N>.png` GameMaker-konvenció, és a **penusbmic**
  (itch.io) dark-fantasy csomagjaira jellemző — érdemes ott visszakeresni.*
- **NYITOTT JOGI TÉTEL:** a kard SFX-ek forráscsomagja (*Free Fantasy SFX Pack* by
  **TomMusic**, `2D helper/sounds/...`) `ReadMe.txt`-je **nem tartalmaz licencszöveget**,
  csak a szerző elérhetőségeit (itch.io / gamedevmarket / e-mail). A feltételeket a
  letöltési oldalról kell visszakeresni **a repo nyilvánossá tétele / GitHub Pages deploy
  ELŐTT.** Ezért maradt meg a fájlnevekben a csomagbeli sorszám
  (`sword-attack-2.wav` = "Sword Attack 2", `sword-impact-hit-1.wav` = "Sword Impact
  Hit 1") — ez a kapocs a forráshoz, a `BootScene` importjainál lévő komment mellett.
- **NYITOTT JOGI TÉTEL:** a Level 1 zenéjének forráscsomagja (*Free Dark Fantasy Music*,
  `2D helper/sounds/...`) **egyáltalán nem tartalmaz licenc/readme fájlt** — csak `MP3/`
  és `WAV/` mappát. A feltételeket a letöltési oldalról kell visszakeresni **a repo
  nyilvánossá tétele / GitHub Pages deploy ELŐTT.** Ezért maradt meg a forrás-cím a
  fájlnévben (`library-of-veles.mp3` = `Library of Veles (LOOP)`) — ez a kapocs a
  forráshoz. **Megjegyzés:** a csomag másik sávja (`Elkmire Keep (LOOP).mp3`) jó jelölt
  egy jövőbeli menü- vagy átvezető-zenének (a Level 2 már megkapta a sávját, lásd lentebb).
- **A `boss-theme.mp3` és a `shadowforge-convergence.mp3` forrása AZONOSÍTVA** — ez a
  korábbi „a boss theme forrása külön tisztázandó" tétel LEZÁRÁSA. Mindkettő az **AlkaKrab**
  csomagból való (`2D helper/music/Loops mp3/`):
  - `boss-theme.mp3` = `4. Cursed Citadel (After Intro & Loop).mp3` — **bitre azonos**
    másolat (md5 `29fac9c22b67191a2cfaccff4e6be568`, 2 044 105 bájt, méréssel igazolva);
  - `shadowforge-convergence.mp3` = `2. Shadowforge Convergence (Loop).mp3`;
  - `veil-of-eternal-nightfall.mp3` = `6. Veil of Eternal Nightfall (Loop).mp3` (Boss 2).
  A `2D helper/Credits.txt` az AlkaKrabot a boss theme miatt **már kreditálja**; a
  `02. Shadowforge Convergence (level 2 music)` és a `06. Veil of Eternal Nightfall
  (boss 2 music)` sorokkal kiegészítendő (a user gyűjtése).
  **NEM teljesen lezárt tétel viszont a licenc SZÖVEGE:** a csomaghoz — a TomMusic /
  Free Dark Fantasy esetével ellentétben — **van** dokumentum (`2D helper/music/Loops mp3/
  AlkaKrab Music License Info.pdf`), de a tartalma **nincs átolvasva** (a PDF beágyazott
  szövege tömörített, és nincs `pdftoppm` a gépen). A konkrét feltételeket a repo
  nyilvánossá tétele / GitHub Pages deploy ELŐTT el kell olvasni.
  **A LOOP-változat használata nem esztétikai döntés:** az `AudioManager.playMusic()`
  `loop: true`-val játszik, tehát a csomag `Tracks mp3/` (teljes szám) verziója minden
  loop-fordulónál újrajátszaná az intrót. A csomag `2. Shadowforge Convergence (Intro).mp3`
  + `(Loop).mp3` párja egy intro→loop láncolással jobb lenne, de ahhoz az `AudioManager`
  zene-ágát bővíteni kellene (jelenleg egyetlen, exkluzív sávot kezel) — külön iteráció.
- **NYITOTT JOGI TÉTEL (ÚJ):** az enemy halál-hangok forráscsomagja (*Monster Growls Attack
  and Deaths V.1*, `2D helper/sounds/…`) **nem tartalmaz licencszöveget** — egyetlen
  `Authors1.png` szerző-kép van benne: **Lazy Spartan Games — Michael Edwards, Sole
  Proprietorship Productions**. A csomag a `Credits.txt`-ben **sem szerepel**, tehát oda
  felveendő. A feltételeket a letöltési oldalról kell visszakeresni **a repo nyilvánossá
  tétele / GitHub Pages deploy ELŐTT.** Ezért maradt meg a fájlnevekben a csomagbeli név
  (`necro-hurt` = `necroHurt`, `necro-death-2` = `necroDeath (2)`) — ez a kapocs a forráshoz.
- **NYITOTT JOGI TÉTEL (ÚJ):** a player halál-nyögése (`death-groan-17.wav`) a
  `2D helper/sounds/` **gyökerében** álló, csomag és licenc nélküli fájlból származik
  (`17. Death Groan (Male).wav`) — ugyanaz a kategória, mint a `Bossbackground_1.png`.
  A fájlnévben megtartott sorszám az egyetlen kapocs. *(Megjegyzés: ugyanott van egy
  `01. Death Groan (Male).wav` is — a sorszámozás arra utal, hogy egy nagyobb, azonosítatlan
  hangkészletből származnak.)*
- **NYITOTT JOGI TÉTEL:** a Boss 2 arénájának háttere
  (`assets/backgrounds/throne-room/boss2-arena.png`) 2026-09-01 óta a `2D helper/level/Mad
  King background.png`-ből származik (korábban a `Second boss background.png`-ből), ami — a
  `Bossbackground_1.png`-hez hasonlóan — **önálló fájlként, licenc nélkül érkezett.**
  **NEM új tétel:** ugyanaz a licenc nélküli `2D helper/level/` gyűjtés, amiből mind a négy
  aréna-háttér jön (`Bossbackground_1.png`, `Second boss background.png`,
  `Final boss background.png`, `Mad King background.png`) — egyetlen tisztázás fedi
  mindet, publikálás előtt.
- **NYITOTT JOGI TÉTEL (ÚJ) — de a többinél JOBB helyzetben:** a végső boss és az idézett
  lidércek assetje (`assets/sprites/ancient-demon/`) az *Undead Executioner* csomagból jön
  (`2D helper/enemy/Undead executioner puppet`). A csomag mappájában **NINCS licencfájl**,
  viszont a `2D helper/Credits.txt` **MÁR kreditálja**:
  `https://darkpixel-kronovi.itch.io/undead-executioner (final boss, by Kronovi-)`.
  A forrás tehát AZONOSÍTOTT — csak a licenc SZÖVEGÉT kell visszakeresni a letöltési
  oldalról a publikálás előtt. Az EREDETI fájlnevek megmaradtak (`idle2.png`,
  `attacking.png`, `skill1.png`, `summon.png`, `death.png`, `summonAppear/Idle/Death.png`):
  ez a kapocs a forráshoz.
- **A `2D helper/Credits.txt` IDŐKÖZBEN BŐVÜLT, és több, itt még nyitottként dokumentált
  tételt MEGNEVEZ.** A licencszövegek továbbra is hiányoznak, de a forrás már nem ismeretlen:
  CrowHarvester = `szadiart.itch.io/animated-character-pack`, Gravecaller =
  `oco.itch.io/medieval-fantasy-character-pack-6`, player halál = VoiceBosch
  (`voicebosch.itch.io/death-sounds-male-audio-pack`), szörny-hangok = Lazy Spar7an Games.
  **A `CreditsScene` véglegesítésekor ezt a listát kell végigvezetni** — az az iteráció a
  természetes helye a nyitott jogi tételek lezárásának.
- **A LÁNGŐRZŐ (PreScene NPC) licence RENDBEN VAN, ÉS A REPÓBAN IS.** A forráscsomag
  (`2D helper/enemy/GandalfHardcFREE NPC`, **GandalfHardcore**) `READ ME.txt`-je tartalmaz
  licencszöveget: *"Permitted uses ... incorporating them into commercial and non-commercial
  video games and projects, modifying them as needed ... Restrictions include not reselling,
  repackaging (selling the edited pixel art), or redistributing the assets, using them for AI
  training, incorporating them in game tools, NFT projects, or printed materials."*
  **Ez NEM nyitott jogi tétel** — a szöveg be van másolva
  (`assets/sprites/goddess/license.txt`), a knight és a Mad King mintájára. Credit:
  `https://gandalfhardcore.itch.io/` (a `Credits.txt`-be és a `CreditsScene`-be felvéve).
  *A csomag `.gif` előnézete és a két portré-PNG SZÁNDÉKOSAN nem került be: a projektben
  nincs portré-rendszer.*
- **A PreScene zenéje és a landolás-hangja NEM nyit új jogi tételt.** Az `elkmire-keep.mp3`
  UGYANABBÓL a "Free Dark Fantasy Music" csomagból jön, mint a Level 1 `library-of-veles`-e
  (a csomag hiányzó licencfájlja már dokumentált tétel, lásd feljebb); a
  `stone-chain-land.wav` pedig ugyanabból a TomMusic csomagból, mint a lépés és az ugrás.
- **A PreScene HÁTTERE (`assets/backgrounds/shrine/pre-scene.png`) AI-GENERÁLT** (a user
  ChatGPT-vel készítette). A `CreditsScene` így is nevezi meg. Nem nyitott jogi tétel a fenti
  értelemben, de a publikálás előtti credit-körben érdemes egy sorban rögzíteni a többi
  `2D helper/level/` háttér mellett — azoké viszont TOVÁBBRA IS tisztázatlan.
- **A FŐMENÜ ZENÉJÉNEK licence RENDBEN VAN, ÉS A REPÓBAN IS.** A forráscsomag
  (`2D helper/sounds/Ashfall – Dark_Fantasy_Stream_Pack`, szerző **cloud1789**) `LICENSE.txt`-je:
  *"All music tracks included in this pack are royalty-free. You are allowed to use these tracks
  in: … personal and commercial projects. No additional payment or royalties are required. You
  may NOT: resell the music tracks / redistribute the music files / upload the tracks as
  standalone music content / claim the music as your own work."* Egy játékba beépítve ez a
  megengedett eset. **Ez NEM nyitott jogi tétel** — a licenc be van másolva
  (`assets/audio/ashen-path-license.txt`), a knight/goddess/mad-king mintájára, és a
  `CreditsScene` MUSIC szakasza is kreditálja. **Ez a projekt ELSŐ zene-csomagja, amihez
  egyáltalán van licencszöveg** (a Free Dark Fantasy Musicnak nincs, az AlkaKrab-é olvasatlan
  PDF).
- **NYITOTT JOGI TÉTEL — a FŐMENÜ HÁTTERE** (`assets/backgrounds/menu/main-menu.png`). A forrás
  a `2D helper/level/Menu.png`, ami — a négy boss-aréna hátteréhez hasonlóan — **önálló
  fájlként, szerző és licenc nélkül érkezett**, és 1672x941-es, mint a `Pre-scene.png` meg a
  boss-hátterek. **NEM új tétel**, ugyanaz a licenc nélküli `2D helper/level/` gyűjtés fedi.
  *(Ha kiderül, hogy — a `Pre-scene.png`-hez hasonlóan — AI-generált, akkor a `CreditsScene`-be
  ugyanolyan sor kell, mint amilyet a nyitó szentély kapott. Addig SZÁNDÉKOSAN nincs
  attribúciója: kitalált credit rosszabb a hiánynál.)*
- **A Mad King sprite licence RENDBEN VAN, ÉS A REPÓBAN IS.** A forráscsomag
  (`2D helper/enemy/Medieval King Pack 2`) `License.txt`-je: *"This pack - Medieval King
  Pack 2 is Creative Commons Zero (CC-0). Can be used in commercial and non-commercial
  projects."* **Ez NEM nyitott jogi tétel** — a CC-0 miatt még kreditet sem kíván, és a
  licenc be van másolva (`assets/sprites/mad-king/license.txt`), a knight mintájára.
- **A boss aréna hátterének (`assets/backgrounds/cathedral/boss-arena.png`) licence
  szintén nincs tisztázva** — a forrás a `2D helper/level/Bossbackground_1.png`, ami
  önálló fájlként, licenc nélkül érkezett. A user gyűjtésébe ez is bekerül; publikálás
  előtt ellenőrizni kell. **Megjegyzés:** a `Bossbackground_2.png` (ugyanott, angyal-
  szobros katedrális, nyitott égbolttal) NEM ennek a fázis-variánsa, hanem egy külön aréna.
  Boss 2 jelöltként FELMERÜLT, de a user végül a `Second boss background.png` trónterem
  mellett döntött — a `Bossbackground_2.png` így továbbra is szabad.
- **A boss sprite licence RENDBEN VAN, de a fájl nincs a repóban.** A forráscsomag
  (`2D helper/enemy/Bringer-Of-Death`, Clembod) `License.txt`-je: *"You can use this asset for
  personal and commercial purpose, you can modify this object to your needs. Credit is not
  required but would be appreciated. You can NOT redistribute or resell it."* A user a
  licenceket külön gyűjti, ezért itt sincs licenc fájl; a forrást a `BootScene` importjainál
  lévő komment és az **eredeti fájlnevek** (`Bringer-of-Death-SpritSheet*.png`) kötik vissza.
  A csomagban van egy `Contact.txt` is (Clembod: Twitter/Instagram/itch.io/ArtStation) — a
  credit nem kötelező, de a projekt végén illendő.
- **A Level 1 hangulati propjainak licence RENDBEN VAN** (`assets/props/gothic-town/`): a
  forráscsomag (`2D helper/level/gothicvania-town-files`, Luis Zuno / @ansimuz)
  `public-license.txt`-je *"License for Everyone. Public domain and free to use on whatever
  you want, personal or commercial. Credit is not required but appreciated."*
  **Ez NEM nyitott jogi tétel.** A fájlok VÁLTOZATLAN másolatok, eredeti fájlnéven — ez a
  kapocs a forráshoz, a `BootScene` importjainál lévő komment mellett. *(A csomag zenéje
  külön feltétellel jön — „as long as you give appropriate credit" —, de abból semmit nem
  használunk.)*
- **NYITOTT JOGI TÉTEL (ÚJ) — a Level 3 TELJES látványa** (`assets/tiles/church/`,
  `assets/props/church/`). Forrás: **GothicVania Church** (Luis Zuno / @ansimuz),
  `2D helper/level/gothicvania church files`. A csomagban van licenc-dokumentum, de
  **`public-license.pdf`, és a szövegét NEM sikerült kinyerni** (CID-kódolt betűkészlet,
  hiányos ToUnicode CMap, és nincs `pdftoppm` a gépen — pontosan ugyanaz a helyzet, mint az
  AlkaKrab licenc-PDF-jével).
  **Ez a tétel a többinél JOBB helyzetben van:** a szerző, a sorozat (`GothicVania`) és maga a
  FÁJLNÉV (`public-license`) alapján majdnem biztosan ugyanaz a public domain licenc, mint a
  `GothicVania Town` `public-license.txt`-jéé — amiből a Level 2 terrainje és mindkét pálya
  propjai jönnek. **A szöveget viszont a publikálás előtt el KELL olvasni**, és a
  `Credits.txt`-be fel kell venni (`https://opengameart.org/content/gothicvania-church`).
- **A Level 1 terrainjének licence RENDBEN VAN** (`assets/tiles/cathedral/`): a forráscsomag
  (`2D helper/level/PixelPlatformerSet1v.1.1`, Szadi art) `public-license.txt`-je *"License
  for Everyone. Public domain and free to use, personal or commercial. Credit is not required
  but appreciated. You can edit, but not sell the asset pack."* — ugyanaz a csomag, mint a
  Level 1 hátteréé. **Ez NEM nyitott jogi tétel.** A user a licenceket külön gyűjti, ezért
  itt sincs licenc fájl; a forrást a `BootScene` importjainál lévő komment és a
  `src/levels/LevelTileset.ts` fejlécének forrás-rect táblázata köti vissza

</details>

---

## Phase 11 – Deployment (2026-09-12)

A játék KÉT publikus csatornára került ki, és ezzel a `Project_plan.md` 32. pontja lezárult.

| csatorna | URL | hogyan |
|---|---|---|
| **itch.io** (elsődleges) | `https://bioengineerlabs.itch.io/the-wingless-crow` | kézi feltöltés |
| **GitHub Pages** | `https://csokanandor95.github.io/the-wingless-crow/` | a CI `deploy-pages` jobja |

**Miért itch.io ELŐSZÖR, és Pages csak utána.** Nem sorrendi véletlen: a két csatorna MÁS
szerepet tölt be. Az itch.io **draft** módja adta a valódi beta-UAT-ot (`Test-plan.md` 9.3) —
titkos URL, ismerősök, visszajelzés —, tehát a játék ott már a nyilvános kiadás előtt élt.
Egy Pages-deploynak ilyen módja nincs: nincs draft, nincs titkos URL, nincs visszajelzés-
csatorna. A Pages viszont **automatizálható és a repóhoz kötött**, ezért az lett a CI-ból
deployolt, verziókövetett példány. Röviden: az itch.io a játékosoké, a Pages a bizonyítéké.

**A fázis legfontosabb tanulsága: nem kellett előkészíteni SEMMIT.** A Pages deploy első
próbálkozásra ment, és ez egy KORÁBBI döntés visszafizetése. A `vite.config.ts` `base: './'`-je
(Phase 10) az itch.io generált alútvonala miatt született, a `scripts/check-build.mjs` pedig
ennek az őre lett. A GitHub Pages project-page (`/the-wingless-crow/`) **pontosan ugyanaz a
hibaosztály**: root-abszolút asset-utak mellett a build zöld marad, az élő oldal viszont
fekete. Vagyis az EGYETLEN deploy-célra megírt kapu a másodikat ingyen fedezte — és ez a
`vite.config.ts` kommentjében előre le is volt írva („Ugyanez áll egy GitHub Pages
project-page deployra is").

**Miért AUTOMATIKUS a deploy, ha a README „manual release gate"-et említ.** A kettő nem mond
ellent, mert a kézi kapu **a push ELŐTT** van: a lokális build-teszt. Ami a `main`-re felkerül,
az már átment a kézi ellenőrzésen; onnantól a gépi kapuk döntenek. Így teljesül a 31. pont
„csak sikeres pipeline után történjen production deployment" elve úgy, hogy közben NINCS egy
kézi gomb, amit el lehet felejteni megnyomni.

**Három döntés a `deploy-pages` jobban, amit érdemes indokolni:**

- **`concurrency: pages`, `cancel-in-progress: false`** — a job SZÁNDÉKOSAN nem örökli a
  workflow-szintű `ci-${{ github.ref }}` csoportot, ami `cancel-in-progress: true`. Egy
  megszakított TESZT-futás ártalmatlan (a következő úgyis lefut); egy félbeszakított DEPLOY
  viszont az ÉLŐ oldalt hagyná félkész állapotban. A két dolog kockázata nem azonos, tehát a
  concurrency-beállításuk sem lehet az.
- **A `check:build` MEGISMÉTLŐDIK**, pedig a `verify` már lefuttatta. Nem redundancia: az egy
  MÁSIK job MÁSIK `dist/`-je volt. Ez itt az a példány, ami ténylegesen felkerül — és az R3
  pont akkor fatális, ha a FELTÖLTÖTT buildben van benne.
- **A job ÚJRABUILDEL**, nem a `verify`-tól örökölt artifactot veszi át. A build
  determinisztikus ugyanarról a commitról, és az `e2e` job **már eddig is** újrabuildelt
  (`npm run e2e` = build + Playwright) — tehát ez a meglévő minta, nem új engedmény. Cserébe a
  `verify` jobnak nem kell minden branch-pushon egy 23,5 MB-os artifactot feltöltenie.

**Jogosultságok:** a workflow top-level `permissions`-e marad `contents: read`; a Pages-hez
szükséges `pages: write` + `id-token: write` **job-szinten** áll, tehát a `verify` és az `e2e`
a legkisebb jogosultságon fut tovább.

---

## Függelék — a Project_plan.md revíziós jegyzetei

A tervdokumentumba a fejlesztés során 34 utólagos jegyzet került, blockquote-ként az eredeti
tervező szöveg közé ékelve. A `Project_plan.md` olvashatósága érdekében ezek ott 1–3 mondatos
jegyzetté tömörödtek; **a teljes eredeti szövegük itt van, változtatás nélkül**, a
tervdokumentum pontja szerint csoportosítva. (A valódi terv-eltérések összefoglaló indexe a
`Project_plan.md` 41. pontjában van.)


### 8. Player

*(a Mozgás szakasznál)*

> **Kiegészítés (Phase 6):** a létra-mászás utólag került be, a pálya végi függőleges
> átvezetéshez. Szándékosan minimális: a player egy zárt függőleges "sínen" mozog
> (nincs oldalra mozgás mászás közben, nincs támadás/varázslás létrán), a vízszintes
> input pedig mindig lelép a létráról. Nem tekintjük "komplex movement ability"-nek.


### 11. Ellenfelek

*(az Enemy 1 – CrowHarvester szakasznál)*

> **Névváltás és vizuál (Phase 8, 3. iteráció):** ez az enemy eredetileg *Hollow / Knight*
> néven szerepelt (kardot forgató husk). A hozzá választott pixel art viszont egy
> **csuklyás, csőrös, kaszás dögevő** — ami sokkal jobban illeszkedik a 4–5. pont
> varjú-tematikájához, mint egy általános husk-lovag. Ezért a lény neve
> **CrowHarvester** lett, és az átnevezés végigfut a kódon (`enemies/CrowHarvester.ts`),
> a teszteken és ezen a dokumentumon. **A state machine és minden gameplay-paraméter
> változatlan** — ez tisztán elnevezés- és látvány-döntés.
>
> A fegyver ettől kezdve kasza, nem kard; a támadás telegraph-ja a magasba emelt penge.

*(az Enemy 2 – Archer / Caster szakasznál)*

> **Implementálva (2026-08-26) — a lény neve `Gravecaller`.** A választott archetípus a
> **Caster** (nem az Archer): egyetlen távoli támadása egy árny-tűzgolyó. A név tematikus,
> nem az asset csomagé (*Necromancer*) — a 16. pont lore-ja szerint pont az ilyen lény hívja
> vissza a holtakat, vagyis azt sérti meg, amit Lazar őriz. Ugyanaz a névadási elv, mint a
> `Hollow → CrowHarvester`-nél. Fájlok: `enemies/Gravecaller.ts`,
> `enemies/GravecallerAnimations.ts`. **A fenti öt doboz 1:1 a state machine.**
>
> **A user által megadott követelmények, és hogy melyik szám valósítja meg őket:**
>
> | követelmény | megvalósítás |
> |---|---|
> | „messzebbről vegye észre a playert, mint a CrowHarvester" | `DETECTION_RANGE = 400` (a CrowHarvesteré 220) |
> | „ha kilépünk a range-ből, térjen vissza patrolba" | `LOSE_RANGE = 520`, vízszintes-only hiszterézis — ugyanaz a minta |
> | „próbáljon távolságot tartani" | `RETREAT_RANGE 140` / `PREFERRED_RANGE 300` sáv |
> | „de ne legyen nehéz közel menni és karddal megölni" | `RETREAT_SPEED = 70` ≪ player 200; `MAX_HP = 24` (3 csapás); cast közben ÁLL |
>
> **A legfontosabb tervezési döntés: VÍZSZINTES lövedék + VERTIKÁLIS detektálási kapu.**
> A lövedék — a playeréhez és a bosséhoz hasonlóan — vízszintesen repül (a `Fireball` osztály
> nem változott), ezért a Gravecaller csak nagyjából azonos magasságban lévő playert vesz
> észre ÉS lő (`VERTICAL_DETECTION_RANGE = 80`). Enélkül a Level 1 `E2` platformján álló
> lény a talajon futó playerre is tüzelne, és a lövedék elmenne a feje fölött.
> **A kapu a tüzelésre is érvényes, nem csak a detektálásra:** a sebzés — a CrowHarvesterhez
> hasonlóan — PATROL-ból azonnal ébreszt, tehát egy alulról indított tűzgolyó felkelti;
> kapu nélkül onnantól a végtelenségig lőné a levegőt.
>
> **A MAINTAIN DISTANCE csak akkor valódi állapot, ha a cast ÁLLÓ helyzetet igényel.** Az
> első változat az észlelés pillanatában, mozgás nélkül castolt — a „távolságtartás" tehát
> egyetlen frame-es átjáró volt. A hibát nem kézi végigjátszás találta meg, hanem a unit
> teszt (a „túl közeli player → hátrál" eset `velocity 0`-t kapott). A javítás egyben jobb
> gameplay: a lény előbb lőtávba sétál / hátrál, és csak utána emeli a staffot. Sarokba
> szorítva viszont tüzel, mert a peremen a hátrálás `velocity 0`-t ad — nem válik bábuvá.
>
> **A REPOSITION MAGA a cooldown:** a cast után 1200 ms-ig mozoghat, de nem castolhat —
> nincs külön flag. Két lövés között így 2360 ms telik el.
>
> A közelharci CrowHarvester `ATTACK_RANGE`-éhez hasonlóan itt sincs külön hitbox-zóna: a
> lövedéket a scene hozza létre egy `'gravecaller-projectile'` eventre (ugyanaz a delegálás,
> mint a `Player` `'fireball-cast'`-ja és a boss `'boss-projectile'`-ja).
>
> **Kiegészítés a finomhangolás után — a vízszintes lövedéknek LAYOUT-következménye van.**
> A bolt magassága és a platformok magassága összetartozik: a lövedék sávja
> `[casterY + PROJECTILE_SPAWN_OFFSET_Y ± PROJECTILE_SIZE/2]`, egy `T` tetejű felületen álló
> player teste pedig `[T − PLAYER_BODY_HEIGHT, T]`. Ha a kettő nem fedi egymást, a caster
> **tüzel, de sosem talál** — vagyis a lény némán elveszíti a funkcióját.
>
> Pontosan ez történt kézi teszten az `E1` lépőkövön: a bolt 6 px-szel a player feje fölött
> ment el. A javítás nem a lényen, hanem a PÁLYÁN történt (a platform 24 px-szel feljebb),
> és azóta a `level1Layout.test.ts` egy `CASTER_TARGETS` táblából ellenőrzi casterenként,
> hogy a cél-felületeken álló playert a bolt sávja ténylegesen metszi-e.
>
> **Ismert, elfogadott korlát:** a `VERTICAL_DETECTION_RANGE` (80) tágabb ennél a valódi
> találati sávnál (~±26), tehát létezhet olyan felület, amit a caster észlel, de nem tud
> eltalálni (a Level 1-en az `E3`). User-döntés, hogy egyelőre így marad; a levezetett
> (szigorúbb) kapu képlete a `CLAUDE.md` nyitott polish-tételei között készen áll.


### 12. Boss rendszer

> **Állapot (2026-08-30):** MIND A HÁROM boss kész — a **Grafted Wing-Breaker** (Level 1
> után), a **Mad King** (Level 2 után) és az **Ancient Demon, Omen of Crows** (a végső
> ellenfél). A lánc ezzel bezárult: `Level 1 → Boss 1 → Level 2 → Boss 2 → Final Boss →
> ending → credits`.

*(a Boss – The Grafted Wing-Breaker szakasznál)*

> **Implementációs megjegyzés (Phase 7):** a boss state machine-je
> `DORMANT → APPROACH → SLASH / PROJECTILE / CHARGE_WINDUP → CHARGE → COOLDOWN → DEAD`.
> A `DORMANT` a boss entrance (15. pont) alatt aktív: a boss ilyenkor nem mozog, nem támad
> és **nem is sebezhető**, csak a belépő-animáció végén kapcsol be.
>
> A támadás-választás **szándékosan determinisztikus** (nincs véletlen). Ez egyszerre szolgálja
> a tesztelhetőséget (nem flaky unit teszt) és a játékélményt — a player fel tudja ismerni a
> boss mintáit.
>
> **Kiegészítés (Phase 8): körforgás, nem prioritási sor.** A slash reaktív (közelharci
> távolságon belül mindig ő nyer), a másik három támadás viszont **rotációban** következik:
> `projectile → spell → charge → elölről`. A távolsági feltételek és a cooldownok csak
> *szűrők* a körön belül — a nem elérhető támadást a boss átugorja. A fázisváltás a rotációt
> egyből a roham slotjára állítja, tehát a Phase 2 a szignatúra-mozdulatával nyit.
>
> Ez egy kézi teszten talált hibára válasz: prioritási sorral a Phase 2 `charge → slash`
> hurokra egyszerűsödött. Az ok általánosítható — **ha egy támadás cooldownja ugyanakkor jár
> le, amikor az őt követő állapot-lock, akkor a prioritási sor élén garantáltan monopolizál**,
> mert a döntés pillanatában mindig kész.
>
> A közelharci találat — a CrowHarvester-hoz hasonlóan — nem külön hitbox-zóna, hanem
> távolság-ellenőrzés a windup végén. A charge roham közben legfeljebb **egyszer** sebez,
> és a pálya falának ütközve idő előtt véget ér.

*(a Boss – The Grafted Wing-Breaker szakasznál)*

> **Implementációs megjegyzés (Phase 8, 6. iteráció) — boss sprite + a hiányzó dash:**
>
> A boss megkapta a valódi pixel artját (a *Bringer of Death* csomag, Clembod), és ezzel a
> state machine egy negyedik támadással bővült. A csomagban lévő animációk így oszlanak el:
>
> | boss akció | animáció | megjegyzés |
> |---|---|---|
> | közelítés | walk / idle | |
> | slash | attack (10 frame) | a sebzés a csapás frame-jén |
> | projectile | cast (9 frame) | a lövedék az energia csúcsán születik |
> | **Shadow Spell** | cast + a csomag **különálló spell effektje** | a `Cast` végén varjak röppennek fel — a téma szempontjából ideális |
> | charge windup | attack f16–19, megtartva | + a piros telegraph-tint |
> | **charge (dash)** | a sheet effekt nélküli változatának **megtartott kitörés-póza** + afterimage-csík | lásd lentebb |
> | falnak ütközés | hurt (3 frame) = stagger | a player punish-ablaka |
> | halál | death (10 frame) | |
>
> **A csomagban NINCS dash animáció.** A megoldás nem egy felgyorsított sétaciklus, hanem a
> klasszikus 2D "smear": a támadás-animáció legmélyebb, előredőlt kitörés-pózán megállunk
> (az effekt nélküli sheetről, mert az effektes ugyanezen a frame-en egy hatalmas sötét
> félholdat is rajzol, ami 1,2 mp-en át megtartva statikus folttá válna), és a sebességet
> 50 ms-onként egy halványuló másolat adja hozzá. A windup (hátrahúzott kasza) és a dash póz
> **animáció-folytonos**: a boss összehúzódik, majd ebből a pózból lendül előre.
>
> **A boss NEM flinchel találatra.** A hurt animáció minden ütésnél megszakítaná a
> telegraph-jait, ami bossnál olvashatatlan; a visszajelzés egy fehér sziluett-villanás.
>
> A hatótávok **az animációból származnak, nem kézi hangolásból** (ugyanaz az elv, mint a
> player támadás-hitboxainál): a slash hatótávja a kasza mért nyúlása a csapás frame-jén.
> Ez a placeholderhez képest megduplázta a közelharci hatótávot — a fight ettől nehezebb,
> a hangolás manuális játszás után következik.


### 13. Platforming

> ~~**Megjegyzés (Phase 6):** a `gap` egyelőre NINCS implementálva a Level 1-ben.~~
> ~~Amíg nincs checkpoint/respawn, egy szakadékba esve a player beragadna~~
> ~~(a `Player.die()` letiltja a physics bodyt). A gap-ek a checkpoint-tal együtt jönnek.~~
>
> **LEZÁRVA (Level 1 Redesign, 1. iteráció):** a `gap` implementálva van. A Level 1 talaja
> már nem folyamatos, hanem öt szegmensből áll (`GROUND_SEGMENTS` a
> `src/levels/Level1Layout.ts`-ben); a köztük lévő négy hézag a szakadék. A zuhanás-halált
> nem a világ alja adja, hanem egy `FALL_DEATH_Y` küszöb: a FIZIKAI világ szándékosan
> mélyebb a canvasnál (`WORLD_HEIGHT + FALL_DEPTH`), így a player láthatóan kizuhan a
> képből, mielőtt meghal — a kamera bounds-a viszont a canvas magassága marad, tehát
> továbbra sincs függőleges görgetés.

> **Kiegészítés (Level 1 Redesign, 1. iteráció) — a szakadékok MÉRETEZETTEK, nem szemre rakottak:**
>
> A `Level1Layout.ts` a `Player` exportált `MOVE_SPEED`/`JUMP_VELOCITY`-jéből és a
> `config/physics.ts` `GRAVITY_Y`-jából SZÁMOLJA a fizikai plafont — max ugrásmagasság
> **156 px**, max ugrástáv **250 px** —, és minden szakadék/emelkedés ehhez van tervezve
> (0.7-es, illetve 0.75-ös biztonsági szorzóval). A `horizontalReachForRise()` adja meg,
> hogy egy adott emelkedés mellett mekkora a tényleges vízszintes hatótáv: magasabbra
> ugorva rövidebbet lehet ugrani, és ezt egy szemre tervezett pálya csendben elronthatná.
>
> A `tests/unit/level1Layout.test.ts` ezzel a képlettel **bejárja a pályát** (BFS a start
> szegmensről), és bizonyítja, hogy minden felület elérhető. Ez a spec „All platforms are
> reachable" elfogadási kritériumát futtatható állítássá teszi.


### 14. Pályák

> **Level 1 Redesign (3 iterációs blokk, a Phase 8 közben beszúrva).** Az eredeti Phase 6-os
> Level 1 (3200 px, folyamatos talaj, hazard nélkül) pillanatok alatt átugrálható volt, és a
> 9 platform gyakorlatilag dekoráció maradt. A user írt hozzá egy részletes layout-specet
> (nyolc szakasz, A–H), ami alapján a pálya **6000 px**-re nőtt, és három olyan elemet
> kapott, ami korábban nem volt a kódban: **szakadék + zuhanás-halál**, **spike**, és egy
> **lengő kaszás (Swinging Reaper)** időzítés-alapú hazard.
>
> A szakaszsorrend: `A start + a ház (NPC) · B csendes átvezetés · C első enemy +
> platforming + gap · D spike-tutorial · E kombinált kihívás · F Swinging Reaper ·
> G záró harc · H boss-ajtó`.
>
> **1. iteráció — KÉSZ:** layout-váz, öt talaj-szegmens + négy szakadék, 13 platform,
> 8 CrowHarvester, zuhanás-halál, enemy-respawn, köztes checkpoint, tutorial feliratok.
> **2. iteráció — KÉSZ:** spike-ok (D szakasz), lásd lentebb. **3. iteráció — KÉSZ:**
> Swinging Reaper (F szakasz), lásd lentebb. **A blokk ettől még nyitva marad:** a Phase 8-ra
> visszatérés előtt finomhangolási körök futnak a teljes pályán.
>
> **Finomhangolás, 1. kör — az A szakasz VALÓDI ugrás-tutorial lett.**
> ⚠️ **EZT A DÖNTÉST A 2. KÖR VISSZAVONTA — lásd közvetlenül alább.** Ami történt: az
> eredeti változatban a három lebegő platform folyamatos talaj FÖLÖTT lógott, a player
> alattuk elfutott, tehát a tutorial dekoráció volt; erre került egy 640 px-es szakadék
> (start pad 0–320, talaj újra 960-tól), amit a három platform hidalt át.
>
> **Finomhangolás, 2. kör — az A szakasz mégsem tutorial, hanem HANGULAT (2026-09-02).**
> A gödör és mind a három platform (`A1`–`A3`) TÖRÖLVE; a helyükön **folyamatos talaj** van
> (a `G1` és a `G2` szegmens EGYETLEN, 0–1660-as szegmenssé olvadt), rajta egy **háttérben
> álló házzal** (`house-a.png`, GothicVania Town). A ház előtt **opcionális `E`** indít egy
> egysoros párbeszédet: *„Veszély közeleg. Ne menj tovább, ha jót akarsz...!"* A ház tisztán
> díszlet — nincs physics bodyja, és a `BUILDING_DEPTH` miatt a player **elmegy előtte**.
>
> **Ezzel az 1. kör spec-eltérése MEGSZŰNIK:** a `level1-layout.md` az A szakaszra
> *„No environmental hazards"*-t és *„Player can safely test movement"*-et ír elő, és
> mostantól megint pontosan ez teljesül. **Következmény a szakasz-szerepekre: az első
> platforming-kihívás újra a C szakasz** (a `gap1`, 1660–1820, 160 px) — az A már nem
> mechanikát tanít, hanem a `PreScene` párbeszéde után egy második, opcionális
> figyelmeztetést ad, mielőtt a B szakaszban jön az első ellenfél.
>
> *Ismert, elfogadott mellékhatás:* a `movement` tutorial-felirat („Space / W — ugrás")
> a spawntól 4000 ms-ig áll (~x=800-ig), az első KÉNYSZERŰ ugrás viszont csak x=1660-nál
> jön — a felirat nem hibás (a billentyűt közli), de a lecke és a gyakorlat szétcsúszik.
>
> A párbeszéd alatt a player **teljesen befagy** (user-döntés): ehhez a `PlayerController`
> kapott egy `setEnabled()` kapcsolót — az `update()` kihagyása önmagában nem elég, mert a
> konstruktor a `J`/`F`/`pointerdown` listenereket regisztrálja. A párbeszéd **ismételhető**
> (a prompt utána visszatér), tehát se `DialogueMemory`, se registry-kulcs nem kell.
>
> **Kézi teszt utáni javítások (ugyanaznap):** az `E: Kopogás` prompt VILÁG-koordinátás lett
> (a player feje fölött) — képernyő-fixen a pálya közepén pont a player MÖGÉ került, mert ott
> a kamera szabadon követ; az **első CrowHarvester átkerült a `G1`-ről a `G3`-ra**
> (`B-1` → `C-1`, x 1250 → 2080), tehát a `gap1` VÁLASZTJA EL a háztól — **ezért lett a `B`
> szakasz csendes átvezetés, és az első ellenfél a `C`-é**; a harc-súgó `triggerX`-e pedig
> 1000 → 1560, hogy pont az így áthelyezett harc előtt villanjon fel.
>
> **Finomhangolás, 1. kör — a földi enemyk üldözési modellje.** A Redesign 1. iterációjában
> minden enemy szűk patrol-határt + `clampChaseToBounds`-ot kapott; ez megakadályozta a
> szakadékba sétálást, de a földi lény üldözés közben is a kis sétakörzetébe volt zárva, és
> a pálya közepén láthatatlan falba ütközött. A séta-körzet és az üldözési határ mostantól
> **két külön dolog**: az utóbbi a felület pereméből (és a spike-mezőkből) van levezetve, így
> az enemy a szakadék széléig követi a playert, de nem esik le és nem lép a tüskékre. A
> „lehagyom, kikerülök a detection range-ből, visszatér a körzetébe" viselkedés változatlan.
>
> **Kiegészítés (2. iteráció) — a környezeti hazardok külön sebzés-modellt igényelnek.**
> A `Player.takeDamage()` szándékosan nem néz HURT állapotot, csak DEAD-et: egy enemy-csapás
> diszkrét esemény, ott ez helyes. Egy tüske viszont FOLYAMATOS érintkezés — rajta állva a
> scene minden frame-ben sebezne, és a 100 HP két másodperc alatt elfogyna. Ezért került be
> a `src/hazards/HazardDamage.ts` `HazardDamageGate`-je: egy 900 ms-os, MINDEN környezeti
> hazardra KÖZÖS i-frame ablak. A `Player`-hez nem kellett hozzányúlni.
>
> **Egy tanulság a manuális tesztből, ami a tervben nem látszott:** a tüske-találat eredetileg
> vízszintesen is visszalökte a playert („arra, amerről jött"). Ez ~36 px haladást és ~150 ms-ot
> vett el, amitől a 128 px-es mezőn való átkelés 970 ms-ra nyúlt — túl a 900 ms-os ablakon,
> tehát a player EGYETLEN hibáért kétszer sebződött, és a másodikat a játék saját reakciója
> okozta. Ez sérti a spec „Avoid unavoidable damage" elvét, ezért a visszalökés **csak
> függőleges** maradt. Az átkelés így pontosan egy találat (15 HP) — a D szakasz tutorial,
> nem büntetés.
>
> **Kiegészítés (3. iteráció) — Swinging Reaper, az első MOZGÓ hazard.** A mozgás magja egy
> pure függvény (`swingAngleAt`), determinisztikus, `Phaser.Math.Between` nélkül — a spec
> kifejezetten megköveteli („Movement is deterministic"), és csak így tanulható meg a minta.
> A geometria nem szemre készült, hanem a 250/156-os ugrás-plafonhoz méretezve: a penge a
> szakadékot áthidaló platformot végigsöpri (nem lehet rajta megállni), a két parton viszont
> 155 px-re elkerüli a playert. **Ebből adódik a szakasz megoldása** — a partról végignézni
> egy lengést, és a túloldali szélsőállásnál ugrani. Manuális teszten igazolva: rossz fázisban
> áthaladásonként 20 sebzés, jó fázisban a teljes átkelés 0.
>
> **A visszalökés itt SZÁNDÉKOSAN elmaradt**, a tüske függőleges popjával szemben: a penge egy
> 400 px-es szakadék fölött söpör, tehát bármilyen lökés a mélybe taszítaná a playert — a
> találat halált okozna, amire nem lehet reagálni. Ugyanaz a hibaosztály, mint a tüskék
> vízszintes lökése volt. Konzisztens is: a projektben egyetlen ENEMY-találat sem lök vissza.
>
> **Két döntés, ami ELTÉR a dokumentum korábbi állapotától** (user által jóváhagyva):
>
> 1. **A player halálakor az enemyk is újraélednek.** Korábban szándékos scope-döntés volt,
>    hogy csak a player áll vissza („ne büntessük duplán"). Egy 6000 px-es, szakadékokkal
>    tagolt pályán viszont ez azt jelentené, hogy egy nehéz szakaszt ismételt halálokkal
>    „le lehet koptatni". A `Level1Scene.resetEnemies()` a `CrowHarvester`-eket
>    megsemmisíti és a layout-adatból újraspawnolja.
> 2. **Van egy KÖZTES checkpoint** (a spike-szakasz után, x=3000). A layout-spec csak a pálya
>    végén említett checkpointot; a megnövelt hossznál ez túl büntető lenne. Nem új
>    mechanika — a meglévő `CheckpointSystem` új elhelyezése, azzal a különbséggel, hogy
>    ÉRINTÉSRE aktiválódik (nem `E`-re, mint az ajtó), hogy ne versenyezzen annak promptjával.

> **Kiegészítés (2026-08-26) — Enemy 2 a Level 1-en.** A döntési pont után az első lépés az
> `E-platform-1` CrowHarvester lecserélése **Gravecallerre** (11. pont) az `E2` platformon.
> Ezzel az `E` szakasz platform-lánca (`E1 → E2 → E3`) *ranged-fenyegetettségű útvonallá*
> vált: a talajon végigfutó player biztonságban van, aki viszont felmegy a platformokra,
> azt lövik. A `G5` talaj szándékosan kimarad a lény vertikális hatóköréből — ezt a
> `tests/unit/level1Layout.test.ts` futtatható állításként őrzi (a magasságkülönbségek:
> `E1` 32 px, `E2` 4 px, `E3` 70 px, a talaj **106 px**, a kapu 80).
>
> A pálya többi enemyje változatlan; a Level 1-en így **7 CrowHarvester + 1 Gravecaller** van.

> **Finomhangolás, 2. kör (2026-08-26) — két kézi teszten talált tétel.**
>
> **1. Az `E1` lépőkő 24 px-szel feljebb került (y 352 → 328).** Az `E2`-n álló Gravecaller
> észlelte és lőtte az ott álló playert, de a bolt sávja (`[276, 292]`) 6 px-szel a teste
> (`[298, 344]`) FÖLÖTT ment el. A magasság tehát nem esztétikai szám: a vízszintes lövedék
> miatt ez dönti el, hogy a lény működik-e egyáltalán. Az új magasságnál a bolt sávja
> teljesen a testen belül van. Az ugrás-invariánsok megmaradtak: a `G4 → E1` emelkedés 74-ről
> 98-ra nőtt, a plafon 117.
>
> **2. Az `F` szakasz (Swinging Reaper) ranged nyomást kapott.** Új platform (`F2`, top 332 =
> PONTOSAN az `F1` szintje, a `G6` part fölött lebegve), rajta a második Gravecallerrel
> (`F-caster`). A pozíciót két kényszer fogja közre — balról a kasza söprési sávjának
> biztonsági zónája, jobbról az a követelmény, hogy az EGÉSZ `F1` a caster detektálási
> körében legyen —, és a köztük maradó sáv szűk; mindkét kényszer unit-teszt.
>
> **A bolt szándékosan a LÉZENGÉST bünteti, nem a tiszta átkelést** (jóváhagyott
> user-döntés). A telegraph (felemelt staff) azonnal látszik, amint a player az `F1`-re ér,
> de a 720 ms windup + ~1,2 s repülés miatt a becsapódás ~1,9 s-nál lenne, miközben a kasza
> félperiódusa 1,2 s. **Ez nem hiányosság, hanem ugyanaz az elv, amin a tüskék vízszintes
> visszalökése is elbukott:** `F1` fölött söpör a penge és alatta 400 px szakadék van, tehát
> egy kikerülhetetlen találat ott olyan halált okozna, amire nem lehet reagálni („avoid
> unavoidable damage"). Jól időzített átkelés: 0 sebzés. Ácsorgás: kasza 20 + bolt 10.
>
> A Level 1-en így **7 CrowHarvester + 2 Gravecaller** van, és **14 platform**.

> **Megjegyzés (2026-08-26):** az „Archer" szerepét a **Gravecaller** (Enemy 2, 11. pont)
> tölti be, ami már létezik és a Level 1-en bemutatkozik. A Level 2 lehet az első pálya,
> ahol több példány is szerepel belőle, illetve ahol a magasságkülönbségekre épített
> ranged-fenyegetés a fő tervezési motívum.

> **ÁTNEVEZÉS ÉS TÉMAVÁLTÁS (2026-08-29, user-döntés).** A látvány-iterációban a
> **GothicVania Town** csomag mellett döntöttünk (Luis Zuno / @ansimuz, public domain — ez
> UGYANAZ a csomag, amiből a Level 1 hangulati propjai jönnek). A pálya így nem erdő, hanem
> **alkonyi gótikus városnegyed**, és a név a látványt követte: `The Crowless Quarter`.
> Ez lore-ban is jobban ül: a Level 3 az őrült király romos kastélya, tehát a közte lévő
> pálya logikusan a király városa.
>
> **Ezzel a „sötétebb környezet" pont is kikerült a listából.** A csomag palettája
> érezhetően VILÁGOSABB a Level 1-nél (az égbolt csúcsfényessége `(190,106,107)` a Level 1
> `(103,56,56)`-jával szemben), és a user döntése szerint **tint nélkül, nyersen** megy be:
> az alkonyi városnegyed tudatos vizuális kontraszt a Level 1 éjszakai romjaihoz képest.
> A talaj és a fa-platformok fényessége viszont majdnem pontosan egyezik a Level 1-ével,
> tehát a gameplay-elemek olvashatósága nem változik.
>
> A **kódfüggés a néven nulla** (a scene-kulcs változatlanul `Level2Scene`), tehát egy
> későbbi névváltás egy keresés-csere.

> **KIMARAD KÜLÖN PÁLYAKÉNT (2026-08-30, user-döntés).** A Level 2 után KÖZVETLENÜL a király
> harca következik, utána pedig rögtön a végső ellenfél — nincs közte platforming-pálya.
> A „Throne of the Damned" téma nem vész el: **a Boss 2 arénája MAGA a trónterem**
> (`assets/backgrounds/throne-room/boss2-arena.png`).
>
> Ez a 37. pont scope-fegyelmét követi: a vertical slice-hoz két pálya + három boss elég, és
> egy harmadik pálya a meglévő elemekből (CrowHarvester, Gravecaller, mozgó platform,
> spike, reaper) csak mennyiségi ismétlés lenne. Ha később mégis kell, a `Level2Layout.ts`
> adatmodulja 1:1-ben lemásolható egy `Level3Layout.ts`-be, és a király ajtaja elé
> beilleszthető.

> **MEGVALÓSULT (2026-08-30) — KÜLÖN PLATFORMING-PÁLYA NÉLKÜL, mint a Level 3-nál.**
> A „Broken Gate" a végső boss ARÉNÁJA (`FinalBossScene`, `assets/backgrounds/broken-gate/`),
> nem egy bejárható pálya. Ugyanaz a scope-döntés, ami a `Level 3 – The Throne of the Damned`-et
> is kivette: a Boss 2 után KÖZVETLENÜL a végső ellenfél jön.
>
> A teljes lánc:
> `Level 1 → Boss 1 → Level 2 → Boss 2 → átvezető → Final Boss → ending → credits`.
>
> **FRISSÍTÉS (2026-08-31):** a lánc a `Level 3 – The Beast Dungeon` + `Boss 3 – The Beast
> Master` blokkal BŐVÜLT a Boss 2 után (lásd a Level 3 szakaszt).
> **FRISSÍTÉS (2026-09-02):** a lánc ELEJÉRE bekerült a **`PreScene`** (a nyitó szentély),
> tehát a mai teljes útvonal:
> `PreScene → Level 1 → Boss 1 → Level 2 → Boss 2 → Level 3 → Boss 3 → Final Boss →
> ending → credits`.


### 15. Boss arénák

> **Kiegészítés (Phase 7) — a lánc implementált állapota:**
>
> - **Boss aréna:** fix **800×450**, egy képernyős pálya, nincs kameragörgetés. Így a boss,
>   a player és a boss HP-bar mindig egyszerre látszik, a charge/projectile telegraph mindig
>   olvasható, és a visual regression baseline (26. pont) determinisztikus.
> - **Vereség az arénában:** a player NEM az arénában éled újra, hanem visszatér a
>   `Level1Scene`-re, a `CheckpointSystem` pontjára (a boss-ajtóhoz), és onnan **E**-vel
>   léphet be ismét. Emiatt a `Level1Scene` a playert mindig a checkpointról indítja, nem a
>   pálya elejéről.
> - **Győzelem után:** boss halál → szöveges átvezető (`NarrationScene`) → `Level2Scene`.
> - **Progression:** a `bossDefeated` flag egyelőre a Phaser `registry`-ben él (mint a
>   `checkpoint`), így a legyőzött boss után a Level 1 ajtaja már a Level 2-re visz, nem
>   ismét az arénába. A teljes `systems/GameState.ts` továbbra is későbbi fázis.
> - **Zene:** a boss theme és az átvezető zenéje a Phase 8 – Atmosphere része; a kódban
>   jelenleg csak dokumentált beakasztási pontok (`TODO (Phase 8)`) vannak.

> **Kiegészítés (2026-09-01) — a Boss 1 belépője is KÉT részes lett.** A Wing-Breaker harca
> is **párbeszéddel** nyit (`WING_BREAKER_DIALOGUE`, 4 sor — a többi bossnál 6, mert ez a
> játék ELSŐ harca: itt még nincs mit felidézni), pontosan a Boss 2 szerkezetében:
> `create() → párbeszéd → cím-kártya + zene → harc`. **MIND A NÉGY boss belépője azonos.**
>
> Ennek egy geometriai ára volt: a `ui/Dialogue` panelje a járható felszín ALATT ül és 75 px-t
> foglal, tehát `GROUND_TOP + 75 ≤ 450`. A `BossScene` padlóvonala ezért **418 → 369** lett
> (ugyanoda, ahol a másik három aréna van), és a háttere ehhez ÚJRAGENERÁLÓDOTT a lentebb
> leírt `cropW = FLOOR_SRC_Y * 800 / GROUND_TOP` képlettel — ami mellékesen KEVESEBBET vág a
> festményből, mint a korábbi verzió.

> **Kiegészítés (2026-08-30) — a Boss 2 arénája (`Boss2Scene`):**
>
> Ugyanaz a fix 800×450-es felépítés, üres padlóval. Két érdemi eltérés:
>
> - **A belépő KÉT részből áll: párbeszéd, majd cím-kártya.** A király `DORMANT` a párbeszéd
>   alatt is (nem mozog, nem sebezhető), a player pedig TELJESEN befagyasztva — a
>   `PlayerController` csak a harc kezdetekor jön létre, mert a konstruktora regisztrálja a
>   támadás-billentyűket.
> - **A `GROUND_TOP` a KÉPHEZ igazodik (369), nem fordítva.** Ez a scene mérte ki elsőként a
>   padlóvonalat a festményből, és a többi aréna ehhez igazodott — visszamenőleg a Boss 1 is
>   (2026-09-01, lásd fentebb). **Ez a recept a végső arénára is alkalmazható volt** (a
>   `Final boss background.png` ugyanaz az 1672×941).
> - **A háttér 2026-09-01 óta a `Mad King background.png`** (user-döntés): ugyanaz a romos
>   gótikus trónterem, de a lépcső előtt ott áll a **KIRÁLYNÉ KOPORSÓJA** — pontosan az,
>   amiről a párbeszéd szól („Alszik. Csak addig alszik…"). A `GROUND_TOP` NEM változott vele;
>   a kivágás igazodott a képhez (a rajzolt dobogó-perem a forrás 793. sora).
>
> A vereség/győzelem lánca a Boss 1-ével azonos: vereség → `Level2Scene` a saját
> checkpointjára; győzelem → `kingDefeated` registry-flag + `NarrationScene`. Az átvezető
> célja a `FinalBossScene` LÉTEZÉSÉTŐL függ — amíg nincs regisztrálva, a Level 2-re tesz
> vissza.
>
> **Zene:** `6. Veil of Eternal Nightfall (Loop)` (AlkaKrab — ugyanaz a csomag, mint a Boss 1
> theme-je és a Level 2 sávja). A PÁRBESZÉD UTÁN, a cím-kártyával együtt indul: a dialógus
> szándékosan csendben megy le, és a zene a harc nyitánya.

> **Kiegészítés (2026-08-30) — a végső aréna (`FinalBossScene`):**
>
> A Boss 2 receptje szerint készült, és a jóslat bevált: a `Final boss background.png`
> (1672×941) aspektusa gyakorlatilag azonos a 800×450-ével, tehát **kivágás NÉLKÜL**,
> egyszerű kicsinyítéssel használható. A rajzolt dais-perem a 368-369. sorra esik, tehát a
> `GROUND_TOP` itt is **369** — méréssel, nem a Boss 2-ből átvéve.
>
> **Tint NINCS**, és ez is mérés: a játéktér nyers fényessége `mean 30.1`, szemben a Boss 2
> `36.3`-ával és a Boss 1 TINTELT `40.7`-ével — ez a három közül a legsötétebb kép.
>
> **ÚJ PROBLÉMA, ami az első két arénánál nem merült fel: a boss OLVASHATÓSÁGA.** A démon
> köpenye `rgb(14,12,12)` = 12.7 luminancia, a háttér ott, ahol áll, medián 21.7 — de a
> legsötétebb tizedében 10.0, vagyis a fekete sziluett a kép sötét foltjaiban ELTŰNIK.
> Tinttel ez nem javítható (a MULTIPLY tint csak sötétíteni tud), ezért a démon egy halvány
> ibolya **aurát** kap MAGA MÖGÉ, ami a kontúrját mindenhol elválasztja a háttértől — és
> egyben az „ősi, sötét jelenlét" hangulatát is adja. Egyelőre kódból generált placeholder;
> valódi VFX az `assets/effects/` iterációban.
>
> A belépő a Boss 2-ével azonos: **párbeszéd, majd cím-kártya** (`ui/Dialogue`, a player a
> dialógus alatt teljesen befagyasztva). Vereség → `Level2Scene`; győzelem → `demonDefeated`
> registry-flag + `NarrationScene` (ending) → `CreditsScene`.
>
> **Zene:** `2. Shadowforge Convergence (Loop)` (AlkaKrab), ami EREDETILEG a Level 2
> ambientje volt — user-döntés, hogy a végső harcra kerüljön át; a Level 2 azóta az
> `1. Whispers of the Abyss (Loop)`-ot kapja (ugyanaz a csomag, tehát nem nyílt új jogi
> tétel). A PÁRBESZÉD UTÁN, a cím-kártyával együtt indul.
>
> **SFX:** az árny-hullám ÉS az idézés is a `Firebuff 2` hangot kapja (TomMusic) — ugyanaz,
> amit a Wing-Breaker Shadow Spellje használ, tehát új asset sem kellett. A villanás
> SZÁNDÉKOSAN néma marad.

> **Kiegészítés (Phase 8, 6. iteráció) — az aréna padlója üres lett:**
>
> Az eredetileg betett két alacsony oldalsó platform **törölve**. Indok: a boss valódi
> sprite-jával mindhárom kikerülhető támadás vízszintes mozgást kíván (charge = kitérés vagy
> átugrás, Shadow Spell = oldalra lépés), amihez akadálymentes padló kell; a platformok
> ráadásul beszorították volna a most 108 px magas bosst. Az aréna így egyetlen tiszta
> talajszint, ami a Shadow Spell találat-ellenőrzését is egyszerűvé teszi (csak vízszintes
> távolság).


### 16. Lore

*(a Ending szakasznál)*

> **MEGVALÓSULT (2026-08-30).** A lezárás **CSAK SZÖVEG, fekete háttéren** (user-döntés): a
> meglévő, adatvezérelt `NarrationScene` fut le a `FinalBossScene` `ENDING_NARRATION`
> tömbjével, VÁLTOZTATÁS NÉLKÜL — ugyanaz a modul, ami a két köztes átvezetőt is adja.
> Felmerült egy háttérképes változat (a végső aréna festménye elsötétítve a szöveg mögött),
> de a user a tisztán szöveges lezárást választotta; a képes verzió később egy opcionális
> `backdrop` mezővel bármikor beilleszthető.
>
> Utána a **`CreditsScene`** következik: „THANKS FOR PLAYING" + lassan felfelé görgő lista a
> felhasznált karakter-, környezet-, zene- és hang-assetek szerzőivel. `Space` gyorsít, a
> végén pedig **új játékot indít TISZTA registryvel** (a `bossDefeated` / `kingDefeated` /
> `demonDefeated` flagek és mindkét checkpoint törlésével) — enélkül az új játék a Level 1
> ajtajánál azonnal a Level 2-re vinne.
>
> **A credits TARTALMA egyelőre placeholder** (user: „a részleteit majd egy későbbi
> iterációban"). A lista a `2D helper/Credits.txt` gyűjtéséből indul; ez egyben az a hely,
> ahol a még nyitott licenc-tételeket le kell zárni a publikálás előtt.


### 18. Audio

*(a Sound effects szakasznál)*

> **Implementációs állapot (Phase 8, 1. iteráció) — boss music:**
>
> - **Kész:** `systems/AudioManager.ts` (egy zenesáv, loop, fade-in/fade-out) + a boss theme
>   (`assets/audio/boss-theme.mp3`). A zene a boss belépőjénél indul, a harc alatt loopol, és
>   elhalkulva leáll, ha a player VAGY a boss meghal.
> - **Még nincs:** sound effectek (a fenti lista), level/menü ambient, fázisváltás-sting,
>   narráció alatti zene, globális hangerő/némítás vezérlő.
>
> **Frissítés (2026-08-26):** a fenti „még nincs" lista nagyrészt teljesült (lásd a
> `CLAUDE.md` Audio szakaszát): a teljes harci hangkép és a Level 1 ambient kész. A
> Gravecallerrel egy **harmadik** tűzgolyó-hang is bekerült (`Fireball 1`) — a player
> (`Fireball 2`) és a boss (`Fireball 3`) mellé. **Ez elv, nem véletlen:** ahány lövedék-
> forrás van a pályán, annyi külön hang, hogy hallás után is meg lehessen mondani, kié a
> lövedék — ugyanaz a logika, ami a három különböző lövedék-színt is indokolja.
> - **Betöltés:** a `BootScene.preload()` tölt be minden audiót, egy minimális
>   "Betöltés…" + progress kijelzéssel. Az assetet Vite-import hozza be
>   (nem a `public/` mappából), így a build hash-eli, a base path (32. pont, GitHub Pages)
>   magától helyes lesz, és **hiányzó fájl esetén a build elszáll** néma 404 helyett — ez a
>   30. pont (asset testing) egy szeletét ingyen adja.
> - **Fontos korlát:** a Phaser `SoundManager` **game-szintű**, nem scene-szintű, ezért az
>   `AudioManager` a scene `SHUTDOWN`-jára feliratkozva mindig elvágja a zenét — enélkül a
>   boss arénába újra belépve két loop szólna egymáson. Emiatt az `AudioManager` jelenleg
>   **scene-hatókörű**. Ha később kell scene-eken átívelő zene (pl. folyamatos level-ambient
>   a Level 1 és a boss aréna között), game-szintűvé kell emelni.


### 19. Asset stratégia

> **Implementációs állapot (Phase 8, 2. iteráció) — player sprite:**
>
> - **Eltérés a fenti "lehetőleg AI-generált" iránytól:** a player sprite NEM AI-generált,
>   hanem egy kész, licenc-tiszta pixel art csomag (**2D_SL_Knight_v1.0**, "License for
>   Everyone": kereskedelmi használat, módosítás és továbbadás engedélyezett, credit nem
>   kötelező; a `license.txt` be van másolva az `assets/sprites/knight/` mappába).
>   Indok: a csomag 9 kész, konzisztens animációt hoz (idle, run, jump, 4-féle támadás,
>   hurt, death, climb, item-use), amit AI-val konzisztens art style-ban előállítani a
>   fenti hibalista alapján lényegesen nagyobb QA-teher lett volna. Az AI-assisted út a
>   **többi** asset (enemy, boss, background, tiles, effects) esetében marad a terv.
> - A fenti hibalistából ténylegesen **négy** probléma jött elő, mind a betöltés előtti
>   ellenőrzésen bukott ki (nem futásidőben), ami épp a 30. pont asset-testing feladatát
>   igazolja:
>   - *rossz frame order / duplikáció:* az `Attacks.png` 40 frame-je valójában 20 jobbra
>     néző + ugyanaz 20 tükrözve — a második fele eldobva, a fordulás `setFlipX()`-szel megy;
>   - *hibás animáció:* a `Hurt.png` 4. frame-je teljesen üres;
>   - *rossz sprite méret:* a 128×64-es frame-en belül a karakter csak ~28×46, ezért a
>     physics body kézzel van illesztve (`BODY_*` konstansok), különben a 128px-es frame
>     lenne az ütköző test;
>   - *rendering:* `pixelArt: true` nélkül a Phaser bilineárisan szűrte volna a textúrát.
> - Az assetek **Vite-importtal** jönnek be (mint a `boss-theme.mp3`), nem `public/`-ból:
>   hiányzó fájlnál a build elszáll néma 404 helyett.
> - A leképezés (`animKeyForState`) szándékosan pure függvény, hogy Phaser
>   AnimationManager mockolása nélkül unit-tesztelhető legyen
>   (`tests/unit/playerAnimations.test.ts`).
> - **Ami tudatosan kimaradt:** a csomag Roll / Slide / Crouch / Hanging / Pray /
>   air-attack animációi. Ezekhez nincs state a játékban, és ez a dokumentum sem tervez
>   ilyen mechanikát — bevezetésük külön döntést (és e dokumentum frissítését) igényelné.

> **Implementációs állapot (Phase 8, 3. iteráció) — CrowHarvester (Enemy 1) sprite:**
>
> - Szintén kész, külső pixel art csomag (nem AI-generált), egyetlen 1792×64-es csíkban:
>   `assets/sprites/crow-harvester/enemy04_sheet.png`, 28 db 64×64-es frame.
> - **Nyitott tétel:** ehhez a csomaghoz — a knighttal ellentétben — **nem került licenc
>   fájl a repóba**. Ez tudatos, elhalasztott döntés, nem feledékenység. A forrás
>   valószínűleg a `2D helper/Credits.txt`-ben szereplő karakter-csomag; publikálás
>   (GitHub Pages / repo nyilvánossá tétele) ELŐTT tisztázni kell. Ezért maradt meg az
>   eredeti `enemy04_sheet.png` fájlnév: ez az egyetlen kapocs a forráscsomaghoz.
> - A fenti hibalistából itt **három** dolog jött elő az ellenőrzésen:
>   - *hiányzó animáció:* a csomagban **nincs death animáció** — a halál a hit frame-ekből
>     + egy elhalványuló/megsüllyedő tweenből áll össze;
>   - *rossz sprite méret / pozíció:* a lény a 64×64-es frame **bal oldalán** ül (a teste
>     x≈4–24, a kasza tölti ki a jobb oldalt), ezért egy sima `flipX` 36px-t ugrasztotta
>     volna forduláskor — az origint és a physics body offsetjét együtt kell tükrözni;
>   - *nem megfelelő loop:* a `hit` frame-ekbe be van égetve a fehér villanás, tehát a
>     korábbi tint-alapú visszajelzés feleslegessé vált (az amúgy is no-op volt).
> - A frame-sorrendet nem feltételeztük, hanem **ellenőriztük**: az egyedi PNG-k
>   (idle01.png, walk01.png, …) alpha bounding boxait párosítottuk a sheet frame-jeivel.

> **Implementációs állapot (Phase 8, 4. iteráció) — Level 1 parallax háttér:**
>
> - Harmadszor is **kész, külső pixel art csomag**, nem AI-generált: *PixelPlatformerSet1
>   v1.1* (Szadi art). Három réteg került be az `assets/backgrounds/ruined-city/` alá
>   (ég / hegyek / városrom), mind 426×384-es. A csomag két füves előtér-rétege (04, 05)
>   szándékosan kimaradt: zöld tónusuk ütne a pálya vörösesbarna palettájával.
> - **Licenc: public domain** (*"License for Everyone. Public domain and free to use,
>   personal or commercial. Credit is not required but appreciated."*) — tehát ez NEM
>   nyitott jogi tétel, ellentétben a CrowHarvesterrel. A user a licenceket külön gyűjti
>   és a projekt végén másolja be, ezért licenc fájl most nem került a repóba.
> - A fenti hibalistából itt **kettő** jött elő, mindkettő a betöltés előtti ellenőrzésen:
>   - *rossz sprite méret:* a rétegek 426×384-esek, a canvas 450 magas. Megoldás: az ég
>     (közel egyenletes színátmenet) függőlegesen kifeszítve, a sziluettek 1:1-ben,
>     a képernyő alja alá lógó alsó éllel — így nincs sem torzulás, sem átlátszó rés.
>   - *nem megfelelő loop:* a vízszintes csempézhetőséget nem feltételeztük, hanem
>     **megmértük** (a bal és jobb szélső oszlop alpha-profilja legfeljebb 1–2 sorban tér
>     el mindhárom rétegnél → varratmentes). A csomag `03 background A` változata is
>     megfelelt volna, a `B` lett kiválasztva.
> - Két Phaser 4 specifikus tanulság (részletesen a `CLAUDE.md` 12. és 13. pontjában):
>   a `TileSprite` itt **nem** nyújtja kettőhatványra a nem-POT textúrát (Phaser 3 igen),
>   viszont `pixelArt` mellett a `tilePositionX`-et **kézzel kell kerekíteni**, mert a
>   `roundPixels` csak a GameObject transformját érinti.
> - Új, újrahasználható modul: `src/systems/ParallaxBackground.ts`. A scroll → textúra-
>   eltolás leképezés itt is **pure függvény** (`tilePositionForScroll`), a réteg-terv
>   pedig exportált adattömb — így Phaser GameObject-ek mockolása nélkül unit-tesztelhető
>   (`tests/unit/parallaxBackground.test.ts`).
> - **Ami tudatosan kimaradt:** a `BossScene` háttere ekkor még placeholder maradt —
>   lásd az 5. iterációt lentebb.

> **Implementációs állapot (Phase 8, 5. iteráció) — boss aréna háttér:**
>
> - A `BossScene` egyetlen álló, teljes képernyős festményt kapott (romos gótikus
>   katedrális), `assets/backgrounds/cathedral/boss-arena.png`. **Nem parallax:** a boss
>   aréna kamerája fix (15. pont), tehát nincs mit eltolni — egy `add.image` elég.
> - **Licenc: nyitott tétel.** A forrás (`2D helper/level/Bossbackground_1.png`) önálló
>   fájlként, licenc nélkül érkezett. Bekerül a user licenc-gyűjtésébe; publikálás előtt
>   tisztázni kell. Ugyanott van egy `Bossbackground_2.png` is — külön aréna, nem fázis-
>   variáns; jó jelölt egy jövőbeli Boss #2-höz.
> - A fenti hibalistából itt **kettő** jött elő, mindkettő betöltés előtt:
>   - *rossz sprite méret / pozíció (a legfontosabb tanulság):* a forrás 1672×941, és a
>     rajzolt padló fényes felső pereme `y=767`-nél van. Egy sima arányos 800×450-re
>     kicsinyítés ezt `y=367`-re tenné — a player 51px-szel a rajzolt perem ALATT, a sötét
>     falban állna. Megoldás: **célzott kivágás** (1467×825 a `103, 0` saroktól), ami a
>     padlóélt pontosan a `GROUND_TOP = 418`-ra teszi. **A háttér geometriáját a pálya
>     geometriájához igazítottuk, nem fordítva** — a boss/platform/spawn koordináták
>     változatlanok.
>   - *túl nagy fájlméret:* a forrás 1.71 MB. A kivágott/kicsinyített 800×450-es változat
>     596 KB, és 1:1-ben rajzolódik, tehát `pixelArt: true` mellett sem mosódik el
>     (nincs futásidejű átméretezés).
> - **Olvashatósági döntés:** a festmény `setTint(0xb0b0b0)`-nal 69%-ra sötétítve. A nyers
>   kép elnyomta volna a bosst és különösen a charge **piros** telegraph-ját, ami korábban
>   egy majdnem fekete háttéren villant. Ez gameplay-olvashatóság, nem esztétika.
> - Két placeholder tudatosan MARADT: a két aréna-platform (gameplay-kritikus kitérési
>   pont, az olvashatóság most fontosabb a stílus-egységnél), és a boss maga. A talaj
>   viszont láthatatlanná lett téve — a festményen ott valódi kőfal-homlokzat van.
> - **Nincs hozzá unit teszt**, szándékosan: egyetlen `add.image` hívás, nincs benne
>   logika. (Szemben a 4. iteráció `ParallaxBackground`-jával, ahol a scroll → textúra-
>   eltolás leképezés valódi, elronthatóan viselkedő kód.)

> **Implementációs állapot (2026-08-26) — Gravecaller (Enemy 2) sprite:**
>
> - Negyedszer is **kész, külső pixel art csomag**, nem AI-generált: a *Necromancer* csomag
>   (`2D helper/enemy/Necromancer`). Öt sheet került be az `assets/sprites/gravecaller/`
>   alá (idle 50, walk 10, gethit 9, death 52, attack 47 frame).
> - **Nyitott jogi tétel.** A csomagban **egyáltalán nincs licenc/readme fájl**, és a
>   `2D helper/Credits.txt`-ben **sem szerepel** — ugyanaz a kategória, mint a
>   CrowHarvesteré. Publikálás előtt tisztázni kell, és a `Credits.txt`-be felvenni. Ezért
>   maradtak meg az eredeti `spr_Necromancer*_strip*.png` fájlnevek. *(Nyom: a
>   `spr_<név>_strip<N>.png` GameMaker-konvenció, ami a **penusbmic** itch.io-s
>   dark-fantasy csomagjaira jellemző.)*
> - A 19. pont hibalistájából itt **négy** dolog jött elő, mind a betöltés előtti
>   ellenőrzésen — vagyis a 30. pont (asset testing) ismét megtérült:
>   - *rossz sprite méret (a legfontosabb):* a csomag **kevert frame-méretű** — az
>     idle/walk/hit/death 96×96, az attack (és a nem használt spawn) 128×128. A 128-as
>     frame a 96-osnak PONTOSAN 16 px-es kerettel kipárnázott változata. Két frame-mérettel
>     a fordulás-kompenzáció geometriája (`FacingGeometry`) animációnként MÁS lenne, tehát
>     minden animáció-váltásnál újra kellene alkalmazni — pont az a hibaosztály, amit a
>     `systems/SpriteFacing.ts` megszüntetett. **Megoldás: az attack sheet KIVÁGVA került a
>     repóba** (6016×128 → 4512×96, frame-enként `(16,16,96,96)`). A kivágás
>     **veszteségmentes**: a levágott keretben 0 db nem-üres pixel volt, és a kivágott f0
>     alpha-bounding boxa bitre az idle f0-éval egyezik.
>   - *rossz transparency:* a csomag minden animációjából van `*WithBkg` változat is, ami
>     **teljesen átlátszatlan** (9216/9216 px mérve) — mindig a sima változat kell.
>   - *asset naming / duplikáció:* az attackből három változat van (`Effect` = csak az
>     effekt, `WithEffect`, `WithoutEffect`). A `WithoutEffect` kell, mert a lövedéket
>     amúgy is külön `Fireball` adja — és mellesleg csak az fér bele a kivágásba.
>   - *hiányzó licenc* (lásd fent).
> - **Ami tudatosan kimaradt:** a `Jump` (12 frame — a Gravecaller nem ugrik) és a `Spawn`
>   (20 frame — belépő-effekt, nincs hozzá state) sheet.
> - **A lövedék MARAD placeholder** (mérgeszöld gömb). A csomag cast-effektje mérés szerint
>   egy szétfoszló BECSAPÓDÁS (30→4 px), nem loopolható repülő bolt — valódi lövedék-art az
>   `assets/effects/` iterációban.
> - A leképezés (`animKeyForState`) itt is **pure** függvény, és a geometria/időzítés
>   **levezetett** (talp-offset a body-ból, `CAST_STARTUP_MS` a frame-listából) — mindkettőt
>   unit teszt őrzi (`tests/unit/gravecallerAnimations.test.ts`).


### 20. Javasolt projektstruktúra

> **Pontosítások (Phase 7):**
>
> - A boss fájlneve `bosses/GraftedWingBreaker.ts` (nem `TheGraftedWingBreaker.ts`) —
>   a névelő a megjelenített címben marad, a fájlnévben nem.
> - Új, eredetileg nem tervezett scene: **`scenes/NarrationScene.ts`** — adatvezérelt
>   szöveges átvezető (`{ lines, nextScene, title? }`), typewriter megjelenítéssel. Nem
>   "boss utáni" scene: ugyanez fogja kiszolgálni a 9. pont introját és a tervezett
>   `EndingScene.ts` szerepét is, ezért az külön fájlként valószínűleg már nem lesz szükséges.
>
> **HELYESBÍTÉS (2026-08-30):** a fenti bekezdés eredetileg az **`ui/Dialogue.ts`**-t is a
> `NarrationScene` által kiváltottnak mondta. **Ez tévedésnek bizonyult, és a modul elkészült**
> — mert a kettő más szerepű:
>
> | | `NarrationScene` | `ui/Dialogue` |
> |---|---|---|
> | hol | saját, teljes képernyős scene | egy futó scene-en BELÜL, a szereplők előtt |
> | mikor | pályák/fejezetek KÖZÖTT | egy jeleneten belül (a király harca előtt) |
> | léptetés | KÉZZEL (Space/Enter) | MAGÁTÓL; a jobbra-nyíl csak gyorsít |
> | beszélő | nincs | van (a panel fejléce) |
>
> A `NarrationScene` a világ hangja két jelenet között; a `Dialogue` két szereplő beszélgetése
> egy jeleneten belül. Egy teljes képernyős, kézzel léptetett szövegdoboz a király előtt
> kitakarta volna magát a királyt — pont azt, amiért a jelenet létezik.

> **KIEGÉSZÍTÉS (2026-09-02) — `scenes/PreScene.ts`, a játék nyitó jelenete.**
>
> A tervben nem szereplő, ÚJ scene, ami a `BootScene` és a `Level1Scene` KÖZÉ került: a lánc
> innentől `PreScene → Level 1 → Boss 1 → …`. A `BootScene.START_SCENE` normál értéke ezért
> `'PreScene'`, és a `CreditsScene` új játéka is ide tér vissza.
>
> **Mit csinál:** Lazar a képernyő tetejéről bezuhan egy romos szentélybe (a háttéren egy
> SZÁRNYAS angyalszobor — pontosan az, amit elvesztett), majd a jobb oldalon álló NPC-vel,
> **A LÁNGŐRZŐVEL** kell `E`-vel beszédbe elegyednie. A párbeszédből derül ki, hogy valami
> démoni jött át a kapun, a szárnyai FIZETSÉG voltak, és válaszokért az őrült király várába
> kell eljutnia. A párbeszéd után egy második `E` (`E: Indulás`) viszi a Level 1-re —
> **átvezető nélkül** (user-döntés: a párbeszéd MAGA a felvezetés).
>
> **Miért nem a 9. pont introjának `NarrationScene`-e:** az a világ hangja fekete képernyőn;
> ez egy JÁTSZHATÓ jelenet, ahol a player először mozog és először beszélgetnek vele. A kettő
> nem helyettesíti egymást — ugyanaz a különbség, mint a `NarrationScene` és a `Dialogue`
> között (lásd a fenti táblázatot).
>
> **A projekt első NEM HARCOLÓ szereplője**, ezért nyit új mappát: `src/npc/`. Az NPC-nek
> nincs state machine-je, HP-ja és physics bodyja — egyetlen, 13 frame-es idle loop.
>
> **A jelenet EGYETLEN inputja a séta és az ugrás**, és ez tudatos: `PlayerController` NEM
> jön létre benne. Annak a konstruktora regisztrálja a J/F és pointer listenereket, és nincs
> `destroy()`-a, tehát a `Boss2Scene` „csak a harc előtt hozzuk létre" trükkje itt nem
> alkalmazható (a player a párbeszéd ELŐTT már sétál) — enélkül A LÁNGŐRZŐ monológja alatt
> kardot lehetne suhintani rá. Egy szentélyben amúgy sincs mit ütni és mit égetni.


### 21. Fejlesztési roadmap

*(a Phase 6 – Level szakasznál)*

> **Újranyitva a Phase 8 közben — „Level 1 Redesign", 3 iteráció.** Az eredeti Phase 6-os
> layout túl egyszerű volt (3200 px, folyamatos talaj, hazard nélkül). Az új, nyolc szakaszos
> 6000 px-es pálya részletei a 14. pontnál. Az 1. iteráció (layout-váz + gap + zuhanás-halál
> + enemy-respawn + köztes checkpoint + tutorial feliratok), a 2. iteráció (spike-ok + a
> minden hazardra közös i-frame kapu) és a 3. iteráció (Swinging Reaper) **kész**, ahogy a
> finomhangolás 1. köre is (A szakasz gödre + a földi enemyk üldözési modellje) és a
> 2. köre (2026-09-02: az A szakasz gödre és három platformja TÖRÖLVE, helyette folyamatos
> talaj + egy háttér-ház opcionális `E`-párbeszéddel). A blokk **nyitva marad** további
> hangolásra, mielőtt a Phase 8 folytatódna.

*(a Döntési pont: szakasznál)*

> **ELDŐLT (2026-08-26): a „Többi Enemy típus, Level2 és 2. Boss" irány.** A Lore (Phase 9)
> és a QA (Phase 10) hátrébb csúszik — a QA-ból a CI/CD első mérföldköve már megvan (31.
> pont), és a unit tesztek minden új elemmel együtt bővülnek, tehát a Phase 10 nem áll meg.
>
> A választott irány lépései és állapotuk:
>
> 1. **Enemy 2 – Caster (`Gravecaller`) — KÉSZ.** Lásd a 11. pontot. A Level 1 `E2`
>    platformján áll, a korábbi CrowHarvester helyén (14. pont).
> 2. **Level 2 – The Crowless Quarter — KÉSZ.** Geometria (`Level2Layout.ts`), látvány
>    (GothicVania Town) és zene (`Shadowforge Convergence`) megvan. Hátravan: SFX, és a
>    hazard-/lövedék-/létra-/ajtó-placeholderek cseréje.
> 3. **Boss 2 – The Mad King — KÉSZ (2026-08-30).** Lásd a 12. pontot. A trónterem-aréna
>    (`Second boss background.png`), a párbeszéd-rendszer (`ui/Dialogue.ts`) és a teljes
>    lánc `Level2 → átvezető → király → átvezető` megvan. **Zene még nincs** (user adja hozzá).
>    *(A korábban jelölt `Bossbackground_2.png` végül NEM ez lett — az továbbra is szabad.)*
> 4. **A végső ellenfél — KÉSZ (2026-08-30).** *Ancient Demon, Omen of Crows* (12. pont),
>    a `FinalBossScene` fix 800×450-es arénájában, párbeszéddel és belépővel. Vele jött az
>    **ending** (`NarrationScene`, csak szöveg fekete háttéren — user-döntés) és a
>    **`CreditsScene`** („Thanks for playing" + a felhasznált assetek/zenék szerzői,
>    egyelőre placeholder tartalommal). **A lánc ezzel bezárult**, zenével és SFX-szel együtt.
>
>    **Együtt járó javítás a `Level2Scene`-ben:** az ajtaja eddig MINDIG a `Boss2Scene`-t
>    célozta, `kingDefeated` ellenőrzés nélkül — szemben a Level 1-gyel, ami a
>    `bossDefeated`-et nézi. Enélkül a végső bosstól kikapva a playert ide tesszük vissza,
>    és újra végig kellene vernie a Mad Kinget. Most a legyőzött király után az ajtó
>    KÖZVETLENÜL a végső arénába visz (átvezető nélkül, a Level 1 azonos döntése).
> 5. ~~**Enemy 3 – Beast** — opcionális, a 11. pont szerint is.~~ **KÉSZ (2026-08-31).**
>    A Level 2 UTOLSÓ CrowHarvestere (`H-crow-2`, a boss-ajtó előtti párkányon) lett
>    lecserélve rá — a pálya így egy ÚJ mechanikával (telegrafált roham elől kitérés)
>    zárul, közvetlenül a Mad King előtt. Részletek a 11. pontban.
>
>    **A választott irányból ezzel MINDEN elkészült, az opcionális tétellel együtt.**
>
> **A `Level 3 – The Throne of the Damned` KIMARADT külön pályaként** (14. pont) — a
> trónterem a Boss 2 arénája lett.
>
> A Gravecaller iterációja **általánosította a scene enemy-kezelését** (`LevelEnemy`
> strukturális interfész + `type` mező az `ENEMY_SPAWNS`-ban), és ez a Beastnél BE IS VÁLT:
> az integráció tényleg egy tömb + egy `spawnEnemies()` ág volt. **Egy dolog nem volt ingyen:**
> a `Level1Scene.spawnEnemies()` csak a `gravecaller` ágat ismeri, tehát egy Level 1-re
> felvett `type: 'beast'` NÉMÁN CrowHarvestert szülne. Ezt egy unit teszt zárja ki
> (`level1Layout.test.ts`), nem inert kód.

*(a Phase 10 – QA szakasznál)*

> **Előrehozott lépés (2026-08-25):** a Phase 8 lezárása és a fenti Döntési pont
> között — a „Többi Enemy típus, Level és Bossok" irány választása ELŐTT — elkészült a
> **CI/CD első, minimális mérföldköve**: `.github/workflows/ci.yml`, ami minden pushon
> lefuttatja a typecheck + unit teszt + production build hármast.
>
> **A PHASE 10 LEZÁRVA (2026-09-08).** A fenti nyolc tételből mind megvan, a piramis
> felsőbb rétegei felépültek: integration (2 fájl / 23 teszt), Playwright E2E (5 spec /
> 25 teszt), képrögzítéses vizuális ellenőrzés, cross-browser smoke (Chromium + Firefox),
> teljesítménymérés, és a kibővített CI hat quality gate-tel. **A teljes QA egyetlen
> dokumentumban él: `docs/Test-plan.md`** — stratégia, kockázati térkép, lefedettségi és
> nyomonkövethetőségi mátrix, findings, ismert korlátok. (A 33. pont hét tervezett
> dokumentuma helyett — az indoklás ott olvasható.)
>
> **A fázis legfontosabb eredménye nem a teszt-szám, hanem a lefedettség HELYE:** a
> `src/scenes/` 6 023 sora (a forrás 30 %-a) addig teljesen fedetlen volt, és a projekt
> MINDEN kézi teszten talált hibája oda esett. Ez most E2E-vel fedett.
>
> **Nyitva maradt:** a unit suite auditja (mind a 967 teszt indokolt-e?). *(A deployment
> 2026-09-12-én LEZÁRULT — lásd a „Phase 11 – Deployment" szakaszt.)*


### 31. CI/CD

> **JELENLEGI ÁLLAPOT (2026-09-08, Phase 10) — a pipeline lényegében KÉSZ.**
>
> ```text
> Git push / PR → GitHub Actions (ubuntu-latest, Node 24)
>     │
>     ├─ job: verify
>     │     npm ci → typecheck → unit (34 fájl / 967) → integration (2 / 23)
>     │     → build → deploy sanity check
>     │
>     └─ job: e2e  (needs: verify)
>           Playwright: Chromium teljes (18) + Firefox smoke (5)
>           → playwright-report artifact
>
> workflow_dispatch: teljesítménymérés (külön, --workers=1)
> ```
>
> **Quality gate-ek — a fenti lista, EGY sorral kiegészítve:**
>
> ```text
> Unit tests        PASS
> Integration       PASS   <- új
> Build             PASS
> Deploy sanity     PASS   <- ÚJ: a vite.config `base: './'` őre
> E2E               PASS
> Critical errors   0      <- az E2E fixture minden teszten figyeli
> ```
>
> **Miért kellett a „deploy sanity" gate?** Mert ez az EGYETLEN hibaosztály, amit sem a
> typecheck, sem a teszt, sem a build nem fog meg: ha a `base` visszaáll `'/'`-re, a build
> ZÖLD marad, de a feltöltött itch.io-játék (ami generált alútvonalról szolgál ki) el sem
> indul. Egy pár soros szkript ellenőrzi, hogy a `dist/` hivatkozásai relatívak.
>
> **Ami SZÁNDÉKOSAN kimaradt** (indoklással a `docs/Test-plan.md`-ben): a visual regression
> PIXELDIFF-kapuként (méréssel megbukott — hamis bukások ÉS elvétett valódi változás; helyette
> képrögzítés emberi átnézésre), a WebKit (a Playwright buildjében nincs Web Audio API, így a
> játék be sem tölt — kézi Safari-teszt váltja ki) és a teljesítménymérés (csak egyedül
> futtatva érvényes → on-demand).
>
> **KIEGÉSZÍTÉS (2026-09-12, Phase 11):** a pipeline egy HARMADIK jobot kapott,
> **`deploy-pages`**-t — `needs: [verify, e2e]`, és CSAK a `main`-re érkező pushra fut.
> A GitHub Pages deploy tehát már nem hiányzik a listáról: a kapuk MÖGÜL megy ki.
>
> ---
>
> **Korábbi állapot (2026-08-25) — az ELSŐ, minimális CI mérföldkő.**
>
> A fenti a *végső* pipeline. Ebből ma a `.github/workflows/ci.yml` a következőket
> valósítja meg, **minden pushon** (szűrő nélkül, tehát minden branchre) és a `main` felé
> nyitott PR-eken:
>
> ```text
> Git push → GitHub Actions (ubuntu-latest, Node 24)
>     ↓
> npm ci            (nem `npm install`: lockfile-hű, determinisztikus)
>     ↓
> npx tsc --noEmit  (typecheck — src ÉS tests)
>     ↓
> npm run test      (vitest — akkor 12 fájl / 265 teszt; ma 34 / 967)
>     ↓
> npm run build     (production build)
> ```
>
> **Miért külön lépés a typecheck, ha a build úgyis lefordít?** Mert a `vite build`
> esbuilddel csak **levágja** a típusokat, nem ellenőrzi őket — egy zöld build önmagában
> nem bizonyítaná, hogy a `tsc` tiszta. A `tsconfig.json` `include`-ja `["src", "tests"]`,
> tehát a teszt fájlok is átesnek a `strict` / `noUnusedLocals` ellenőrzésen.
>
> **Amit ez a mérföldkő SZÁNDÉKOSAN nem tartalmaz** (mind későbbi lépés, és a repóban
> jelenleg nincs is mit futtatni belőlük): integration teszt · Playwright/E2E · visual
> regression · cross-browser matrix · performance mérés · `dist/` artifact upload ·
> GitHub Pages deploy (32. pont) · branch protection rule.
>
> **Mellékhaszon:** a CI Linux runneren fut, ami **case-sensitive**. A `BootScene` 36
> assetet Vite-importtal hoz be, tehát egy elgépelt nagybetűs fájlnév Windowson
> észrevétlen, a CI-ban viszont build-hiba — ez a 30. pont (asset testing) egy szeletét
> ingyen adja, amíg minden asset committolva van.


### 32. Deployment

> **MEGVALÓSULT (2026-09-12, Phase 11) — egy eltéréssel: KÉT csatorna, nem egy.**
>
> A tervezett lánc (`Source code → GitHub → GitHub Actions → Production build → GitHub Pages
> → Public URL`) **pontosan így épült fel**, a `.github/workflows/ci.yml` `deploy-pages`
> jobjaként (`needs: [verify, e2e]`, csak `main` pushra).
>
> **Az eltérés:** a terv CSAK a GitHub Pages-t nevezte meg, a tényleges kiadás viszont
> kétcsatornás, és az **itch.io lett az elsődleges**. Az ok a QA-ból jött, nem a tervből: az
> itch.io draft módja adta a beta-UAT-ot (`Test-plan.md` 9.3), aminek egy Pages-deployban
> nincs megfelelője. A Pages ezzel szemben automatizálható és a repóhoz kötött — ezért az lett
> a CI-ból deployolt, verziókövetett példány.
>
> A teljes indoklás és a job három tervezési döntése: „Phase 11 – Deployment" szakasz.


### 33. QA dokumentáció

> **FELÜLVIZSGÁLVA (2026-09-08, Phase 10) — a hét dokumentumból EGY lett.**
>
> Az alábbi, eredetileg tervezett fastruktúra egy TÖBB CSAPATOS szervezet QA-dokumentációját
> írja le. Egy fejlesztő + egy játék esetén a szétbontás nem áttekinthetőbbé tesz, hanem
> karbantartási terhet és elavulást szül. A tényleges struktúra:
>
> ```text
> README.md
>
> docs/
> ├── Project_plan.md       # ez a dokumentum — egyben a game design is
> ├── Test-plan.md          # A TELJES QA: stratégia, scope, kockázatok, lefedettség,
> │                         # nyomonkövethetőség, automatizálás, CI, findings, korlátok
> ├── level1-layout.md      # pálya-specifikációk elfogadási kritériumokkal
> └── level2-layout.md
>
> CLAUDE.md                 # az architektúra és a technikai tanulságok tárháza
> ```
>
> **Miért maradt ki külön fájlként:**
> - **`test-strategy.md`** — a tesztstratégia SZERVEZETI szintű artifact (több csapat, több
>   termék, hosszú távú irány). Itt egyetlen szakasz a test planben; külön fájlként üresen
>   kongana.
> - **`test-cases.md`** — a teszt-kód MAGA a test case. Egy kézzel karbantartott párhuzamos
>   lista hetek alatt elcsúszik a suite-tól, és egy hazudó QA-dokumentum rosszabb a hiányzónál.
> - **`automation.md`**, **`known-issues.md`** — szakaszok a `Test-plan.md`-ben.
> - **`game-design.md`**, **`architecture.md`** — tartalmilag MÁR léteznek: ez a dokumentum,
>   a `level*-layout.md`-k és a `CLAUDE.md`.
>
> *Egy karbantartott dokumentum jobb, mint hét elavuló.*

