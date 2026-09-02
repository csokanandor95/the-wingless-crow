# CLAUDE.md

## Projekt: The Wingless Crow

2D dark fantasy action platformer, Phaser 3 + Vite + TypeScript stackkel, AI-assisted / prompt-driven fejlesztési módszerrel épül.

**Részletes tervdokumentum:** `docs/Project_plan.md` — MINDIG ellenőrizd ezt referenciaként, mielőtt bármilyen tervezési vagy scope-kérdésben döntesz. Ha egy döntés eltér a benne foglaltaktól, jelezd ezt explicit módon, hogy a user frissíthesse a dokumentumot.

## Munkamódszer

- **Step-by-step, guided approach**: egy fázist/lépést fejezünk be egyszerre, manuálisan is tesztelve, mielőtt a következőre lépnénk.
- A `docs/Project_plan.md` 40+ lépéses roadmapjét követjük (lásd 21. pont: Fejlesztési roadmap).
- Kerüld a scope creep-et: NINCS multiplayer, inventory, skill tree, complex RPG system, procedural generation, open world, komplex NPC rendszer, branching story, crafting, online backend (lásd Project_plan.md 37. pont).
- Ha egy tervezési döntés eltér a Project_plan.md-től, jelezd explicit, hogy frissíthető legyen a dokumentum.
- A cél nem a technikai tökély, hanem egy játszható, kis scope-ú vertical slice + valódi QA/CI pipeline.
- A user preferált kommunikációs nyelve: magyar.
- Eddig a fejlesztés chatben, manuális copy-paste-tel zajlott VS Code-ba. Mostantól Claude Code-nak közvetlen fájlrendszer-hozzáférése van — nincs szükség copy-paste blokkokra, a fájlokat közvetlenül szerkesztheted.

## Tech stack

- Phaser 4 (game engine, Arcade Physics) — a `package.json` `phaser: ^4.2.1`-et használ,
  NEM Phaser 3-at. Phaser 3 doksi/példa keresésekor erre figyelj. Két konkrét eltérés, ami
  már okozott típushibát (mindkettő javítva):
  - a physics `gravity` `Vector2Like`, tehát `{ x: 0, y: 800 }` kell, nem `{ y: 800 }`;
  - az `ArcadePhysicsCallback` paramétere NEM `Phaser.GameObjects.GameObject`, hanem egy
    unió (`GameObjectWithBody | Body | StaticBody | Tile`) — erre van a
    `PhysicsOverlapObject` alias a `src/combat/DamageSystem.ts`-ben, azt használd az
    overlap/collider handlerek szignatúrájában.
- `npx tsc --noEmit` jelenleg **teljesen tiszta** — ha hibát látsz, az regresszió.
- Vite (dev szerver / bundler)
- TypeScript (strict mode)
- Node.js / npm

## Parancsok

```
# a repo gyökere MAGA a the-wingless-crow mappa — nincs almappa, amibe be kellene lépni
npm run dev      # dev szerver, http://localhost:5173
npm run build    # production build (Phase 7-ben lefutott, működik)
npm run test     # vitest unit tesztek (egyszeri futás)
npx tsc --noEmit # típusellenőrzés (nincs külön npm script)
```

**A CI ebből a hármat futtatja minden pushnál** (`npx tsc --noEmit` → `npm run test` →
`npm run build`, ebben a sorrendben) — lásd a „CI” szakaszt lentebb. Ha lokálisan mind a
három zöld, a CI-nak is annak kell lennie.

## CI (GitHub Actions)

`.github/workflows/ci.yml` — a `Project_plan.md` 31. pontjában felvázolt pipeline **első,
minimális szelete**. Egy job (`ubuntu-latest`, Node 24), és pontosan azt futtatja, ami
MÁR LÉTEZIK: `npm ci` → `npx tsc --noEmit` → `npm run test` → `npm run build`.

- **Trigger:** `push` szűrő NÉLKÜL (tehát minden branchre) + `pull_request` a `main` felé.
  A `concurrency: cancel-in-progress` miatt egy ugyanarra a ref-re érkező újabb push
  megszakítja a még futó, elavult futást.
- **A typecheck KÜLÖN lépés, és a tesztek ELŐTT fut.** Ez nem redundancia: a `vite build`
  esbuilddel csak **levágja** a típusokat, nem ellenőrzi őket — egy zöld build tehát
  önmagában nem bizonyítja, hogy a `tsc` tiszta. A `tsconfig.json` `include`-ja
  `["src", "tests"]`, tehát ez a lépés a teszt fájlokat is típusellenőrzi.
- **`npm ci`, nem `npm install`** — a lockfile-hoz determinisztikusan telepít, és elszáll,
  ha a `package.json` és a `package-lock.json` kicsúszott egymásból.
- **A build a Linux runneren fut, ami case-sensitive.** A `BootScene` 36 assetet
  Vite-importtal hoz be, tehát egy elgépelt nagybetű (pl. `idle.png` a `Idle.png` helyett)
  Windowson észrevétlen, a CI-ban viszont **build-hiba**. Ez a Project_plan 30. pontjának
  (asset testing) ingyen kapott szelete — de csak addig működik, amíg minden asset
  committolva van (jelenleg mind a 37 az).
- **Ami SZÁNDÉKOSAN nincs benne:** integration teszt, Playwright/E2E, visual regression,
  cross-browser matrix, performance mérés, `dist/` artifact upload, GitHub Pages deploy,
  branch protection. Mind későbbi mérföldkő (Phase 10/11), és a repóban jelenleg nincs is
  mit futtatni belőlük — ezért nem is kerültek bele „üresen".

## Itt fejeztük be a Chat-szintű fejlesztést

A chat-beszélgetés közepén, mielőtt Claude Code-ra váltottunk, ez a kérdés függőben maradt, **válasz nélkül**:

> A Project_plan.md 11. pontja az Archer/Caster-t (Enemy 2) és a Beast-et (Enemy 3, opcionális) is felsorolja, de a 21. pont Phase 5 roadmap sora kifejezetten csak "CrowHarvester"-t nevesíti.

Három opció volt feltéve a usernek:
1. Csak CrowHarvester (terv szerint) → mehetünk Phase 6 – Level-re
2. Archer hozzáadása most, mielőtt továbbmegyünk
3. Archer ÉS Beast hozzáadása most

**Ez frissítve lett a Project_plan.md-ben, és az alapján mehetünk tovább a Phase 6 - Level-re. Egy Döntési pont lett beszúrva a Phase 8 - Atmosphere után, ahol eldöntjük majd, hogy mi következik: Többi Enemy típus, Level és Bossok létrehozása VAGY haladunk tovább a Lore, QA irányba és ha mindez megvan, akkor bővítjük csak a többi Enemy, Level és Boss hozzáadásával.**

## Jelenlegi állapot

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

**Phase 8 (Atmosphere) ELINDULT — 1. iteráció: boss music kész.** `systems/AudioManager.ts`
(egy zenesáv, loop, fade-in/fade-out) + `assets/audio/boss-theme.mp3` (2 MB). A zene a boss
belépőjénél indul, a harc alatt loopol, és elhalkulva leáll, ha a player VAGY a boss meghal.

**Phase 8 — 2. iteráció: PLAYER SPRITE + ANIMÁCIÓK kész.** A player már nem téglalap, hanem
valódi pixel art (`assets/sprites/knight/`, a *2D_SL_Knight_v1.0* csomagból — "License for
Everyone", kereskedelmi használat és módosítás engedélyezett, credit nem kötelező; a
`license.txt` be van másolva a repóba). Új modul: `player/PlayerAnimations.ts`. Részletek
lentebb, az "Implementált gameplay / Player" és a "Fontos technikai tanulságok" alatt.

**Phase 8 — 3. iteráció: CrowHarvester (Enemy 1) SPRITE + ÁTNEVEZÉS kész.** Az Enemy 1
korábbi neve `Hollow` volt; a hozzá választott pixel art egy csuklyás, csőrös, **kaszás**
dögevő, ami sokkal jobban illik a varjú-tematikába, mint egy husk-lovag — ezért a lény
neve **`CrowHarvester`** lett, és az átnevezés végigfut a kódon, a teszteken és mindkét
dokumentumon. A gameplay-paraméterek és a state machine változatlanok. Új modul:
`enemies/CrowHarvesterAnimations.ts`. Részletek lentebb.

**Phase 8 — 4. iteráció: LEVEL 1 PARALLAX HÁTTÉR kész.** A `Level1Scene` három valódi
háttérrétegű parallaxot kapott (`assets/backgrounds/ruined-city/`, a *PixelPlatformerSet1
v1.1* csomagból — Szadi art, **public domain**, kereskedelmi használat is engedélyezett).
Új modul: `systems/ParallaxBackground.ts`. Az öt korábbi `pillar-placeholder`
dekor-oszlop törölve, a szerepüket a rétegek vették át. A `BossScene` háttere
szándékosan változatlan (külön asset lesz hozzá). Részletek lentebb, a "Level1Scene"
és a "Fontos technikai tanulságok" alatt.

**Phase 8 — 5. iteráció: BOSS ARÉNA HÁTTÉR kész.** A `BossScene` egyetlen álló, teljes
képernyős festményt kapott (`assets/backgrounds/cathedral/boss-arena.png`): egy romos
gótikus katedrális, ami palettában pontosan illik a Level 1 hátteréhez. **Nem**
`ParallaxBackground` — a kamera fix, nincs mit eltolni. A 3 `pillar-placeholder` +
1 `door-placeholder` dekoráció törölve, a szürke talaj-téglalap pedig láthatatlanná téve
(a fizikája megmarad). Részletek lentebb, a "BossScene" szakaszban.

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

**Phase 8 — 7. iteráció: KARD SFX kész.** Az `AudioManager` megkapta a `playSfx()`-et, és
ezzel a projekt első hangeffektjeit: a player kardsuhintását és a kard becsapódását
(`assets/audio/sfx/`, a *Free Fantasy SFX Pack* — TomMusic; a csomag `ReadMe.txt`-je
**nem tartalmaz licencszöveget**, lásd a nyitott jogi tételeket lentebb).
- A **suhintás azonnal, a gombnyomásra** szól, nem a 150ms-os startup után (user döntés):
  az azonnali input-visszajelzés többet ér, mint a képi szinkron.
- A **becsapódás mindkét scene-ben** szól — a CrowHarvesteren ÉS a bosson.
- **±120 cent véletlen detune** hívásonként, hogy a sorozatos csapások ne váljanak gépiessé.

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

**DÖNTÉSI PONT — ELDŐLT (2026-08-26).** A Phase 8 utáni döntési ponton (lásd lentebb és a
`Project_plan.md` 21. pontjában) a user a **„Többi Enemy típus, Level2 és 2. Boss létrehozása"**
irányt választotta, a Lore/QA helyett. A sorrend: **Enemy 2 (Caster) → Level 2 → Boss 2**.

**Enemy 2 — GRAVECALLER KÉSZ (a döntési pont 1. iterációja).** A `Project_plan.md` 11.
pontjának *„Archer / Caster"*-e: távolsági ellenfél, egyetlen támadással (árny-tűzgolyó).
Új modulok: `enemies/Gravecaller.ts`, `enemies/GravecallerAnimations.ts`. Az asset a
*Necromancer* csomagból jön (`assets/sprites/gravecaller/`) — **licenc nélkül, új nyitott
jogi tétel.** A Level 1 `E2` platformján álló `E-platform-1` CrowHarvester **le lett
cserélve** erre. Részletek lentebb, az „Enemy 2 — Gravecaller" szakaszban.

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

**ENDING + CREDITS KÉSZ.** A lezárás **csak szöveg, fekete háttéren** (user-döntés): a
`NarrationScene` VÁLTOZTATÁS NÉLKÜL, a `FinalBossScene` `ENDING_NARRATION` tömbjével. Utána a
**`CreditsScene`** — „THANKS FOR PLAYING" + lassan felfelé görgő szerzői lista, `Space`
gyorsít, a végén **új játék TISZTA registryvel** (a három `*Defeated` flag és mindkét
checkpoint törlésével; enélkül az új játék a Level 1 ajtajánál azonnal a Level 2-re vinne).
**A credits TARTALMA placeholder** — a user egy későbbi iterációban véglegesíti.

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
- **A `CreditsScene` új játéknál törli** (a kulcs importtal kerül a `PROGRESS_REGISTRY_KEYS`
  listába). Enélkül egy második végigjátszásból NÉMÁN eltűnne az összes boss-átvezető.
- **HAT háttér-ház** világ-koordinátásan (`BACKDROP_BUILDINGS`, `BUILDING_DEPTH = -15`) és
  **17 hangulati prop** (`DECOR_PROPS`, tint nélkül), mind unit-tesztelt elhelyezéssel.
- Ami a Level 2-n MÉG placeholder: a **létra** és a **boss-ajtó** (a csomagban nincs létra,
  a cathedral `door-gate` geometriája pedig ehhez a PNG-hez van mérve), a hazardok és a
  lövedékek. **A zene azóta KÉSZ** (lásd lentebb); az SFX hátravan.

**LEVEL 1 REDESIGN — 1. iteráció KÉSZ (a Phase 8 közé beszúrt, 3 iterációs blokk).**
Az eredeti Level 1 (3200 px, folyamatos talaj, hazard nélkül) pillanatok alatt átugrálható
volt. A user layout-specje (`2D helper/level1-layout.md`) alapján a pálya **6000 px**-re nőtt,
nyolc szakaszra tagolva: `A start/mozgás-tutorial · B első enemy · C platforming + gap ·
D spike-tutorial · E kombinált kihívás · F Swinging Reaper · G záró harc · H boss-ajtó`.

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
  player alattuk elfutott. Most **640 px-es gödör** van alattuk (lásd a Level1Scene szakaszt).
- **A földi enemyk láthatatlan falba ütköztek:** az üldözés a szűk patrol-körzetre volt
  clampelve. A `clampChaseToBounds` flag helyett most **külön `chaseMinX`/`chaseMaxX`** van,
  amit az `enemyChaseBounds()` vezet le a felület pereméből + a spike-mezőkből.

**Két viselkedés-változás a korábban dokumentálthoz képest (user-döntés):**
1. **A player halálakor az enemyk is újraélednek** (`Level1Scene.resetEnemies()`). Korábban
   szándékosan CSAK a player állt vissza; egy 6000 px-es pályán viszont az azt jelentené,
   hogy egy nehéz szakaszt ismételt halálokkal „le lehet koptatni".
2. **Van egy KÖZTES checkpoint** (x=3000, a spike-szakasz után), ami **érintésre**
   aktiválódik — nem `E`-re, mint az ajtó, hogy ne versenyezzen annak promptjával.

**Phase 10 (QA) elindult:** unit teszt infra (`vitest`, `npm run test`, zero-config — nincs `vitest.config.ts`), a Player + Combat + Enemy (CrowHarvester, **Gravecaller**, **Beast**) + **mind a NÉGY Boss** le van fedve a Project_plan.md §23 bontása szerint (**28 fájl, 808 teszt** — ebből 11 az animáció-/háttér-/VFX-vezérlést, 3 a **pálya-geometriát** (Level 1–3), 1 a **mozgó platformot**, 1 a **hazardokat**, 2 a **párbeszéd-rendszert** (a pure mag + a „már láttam" memória), 1 pedig a **végső boss idézett lidérceit** fedi). Game state / Utility logic unit tesztek még hátravannak. **A CI/CD első mérföldköve KÉSZ** — lásd a „CI” szakaszt lentebb.
- A `level1Layout.test.ts` külön eset: nem viselkedést tesztel, hanem **pálya-geometriát**. A `Level1Layout.ts` Phaser-mentes adatmodul, ezért mockolás nélkül bizonyítható vele, hogy minden felület elérhető (BFS a start szegmensről, ballisztikus hatótáv-számítással), egyetlen enemy patrol-tartománya sem lóg le a felületéről, és a szakadékok átugorhatók. Ez a layout-spec elfogadási kritériumait futtatható állítássá teszi. A `Player.ts`, `CrowHarvester.ts` és `GraftedWingBreaker.ts` tuning-konstansai exportáltak, hogy a tesztek ne nyers számokat égessenek be (`Player`: `MOVE_SPEED, JUMP_VELOCITY, MAX_HP, CLIMB_SPEED, CAST_DELAY_MS`; `CrowHarvester`: `MAX_HP, PATROL_SPEED, CHASE_SPEED, PATROL_RANGE, DETECTION_RANGE, LOSE_RANGE, ATTACK_RANGE, ATTACK_DAMAGE, ATTACK_STARTUP_MS, ATTACK_COOLDOWN_MS, VERTICAL_DETECTION_RANGE, DIRECTION_DEADZONE`; `GraftedWingBreaker`: `MAX_HP, PHASE2_HP_RATIO, MOVE_SPEED_P1/P2, SLASH_*, PROJECTILE_*, SPELL_*, CHARGE_*, ACTION_COOLDOWN_MS, DIRECTION_DEADZONE, ATTACK_ROTATION`), és mindháromnak van `getHP()`/`getMaxHP()`-ja.
- A `'phaser'` modult minden teszt fájl egy teljesen önálló fake névtérre cseréli (`tests/unit/helpers/fakePhaser.ts` `createFakePhaserModule()`) — a valódi Phaser csomag már betöltéskor `window is not defined`-del elszáll Node alatt.
- **`vi.mock()` hoisting csapda**: a vitest a `vi.mock()` hívást a fájl IMPORT sorai fölé mozgatja, ezért a factory nem hivatkozhat statikusan importált binding-ra (TDZ hiba). Emiatt a `createFakePhaserModule` megosztása **dinamikus** `import()`-tal történik a factory testén belül: `vi.mock('phaser', async () => { const { createFakePhaserModule } = await import('./helpers/fakePhaser'); return createFakePhaserModule(); });` — ezt minden teszt fájl elején meg kell ismételni (globális `setupFiles`-es próbálkozás NEM működött, ugyanezen hoisting-ok miatt).
- A `CrowHarvester`/`Player`/`GraftedWingBreaker` `scene.time.delayedCall`-jai **interleave-elhetnek** (pl. `CrowHarvester.resolveAttackHit()` a `Player.takeDamage()`-en keresztül saját delayedCallt ütemez ugyanazon a mock scene-en) — ezért a `createDelayedCallStepper` helper (`tests/unit/helpers/phaserTestUtils.ts`) `.next()` (egy lépés) ÉS `.flushRemaining()` (a kurzortól a végéig, újra-tüzelés nélkül) metódust is ad. A `createDelayedCallStepper(scene, true)` (`skipExisting`) a kurzort a MÁR ütemezett hívások mögé állítja — ez kell, ha a teszt előkészítése maga is ütemez callbackeket (pl. a bosst Phase 2-be sebezzük, ami hit-villanást ütemez).
- A stepper viszont REGISZTRÁCIÓS sorrendben halad, ami néha túl merev: a boss egy támadásnál több, KÜLÖNBÖZŐ hosszúságú callbacket is ütemez egyszerre (a lövedék 500ms-os startupját ÉS a 2200ms-os újratöltését), és pont az a kérdés, mi történik, ha az egyik lefutott, a másik nem — így jut el a boss a lövedékről a Shadow Spellre. Erre való a `createDelayedCallRunner(scene)`: a `run(delayMs)` mindig az adott késleltetéssel ütemezett, még le nem futtatott ELSŐ callbacket süti el.

## Fájlstruktúra (jelenlegi, tényleges állapot)

```
the-wingless-crow/
├── package.json
├── index.html
├── tsconfig.json                 # megj.: vite.config.js NINCS, a projekt Vite defaultokon fut
├── .github/
│   └── workflows/
│       └── ci.yml                # minimális CI: typecheck + unit teszt + build, minden pushon
├── docs/
│   └── Project_plan.md
├── assets/
│   ├── audio/
│   │   ├── boss-theme.mp3        # Vite-importtal jön be (nem public/), lásd lentebb.
│   │   │                         # = AlkaKrab `4. Cursed Citadel (After Intro & Loop)` — BITRE
│   │   │                         # azonos másolat (md5 29fac9c2..., 2 044 105 bájt)
│   │   ├── shadowforge-convergence.mp3
│   │   │                         # A VÉGSŐ ARÉNA (FinalBossScene) theme-je. UGYANAZ az AlkaKrab
│   │   │                         # csomag: `2. Shadowforge Convergence (Loop)`.
│   │   │                         # FIGYELEM: ez a sáv EREDETILEG a Level 2 ambientje volt, és
│   │   │                         # 2026-08-30-án került át ide (user-döntés). A FÁJLNÉV
│   │   │                         # SZÁNDÉKOSAN változatlan: a projektben a fájlnév a FORRÁS-
│   │   │                         # számra mutat, nem a felhasználás helyére
│   │   ├── whispers-of-the-abyss.mp3
│   │   │                         # Level 2 ambient (az előző sáv helyén). UGYANAZ az AlkaKrab
│   │   │                         # csomag: `1. Whispers of the Abyss (Loop)`
│   │   ├── veil-of-eternal-nightfall.mp3
│   │   │                         # Boss 2 (Mad King) theme. UGYANAZ az AlkaKrab csomag:
│   │   │                         # `6. Veil of Eternal Nightfall (Loop)`
│   │   ├── eclipsed-desolation.mp3
│   │   │                         # Level 3 ambient. UGYANAZ az AlkaKrab csomag:
│   │   │                         # `3. Eclipsed Desolation (Loop)`
│   │   ├── dread-march.mp3       # Boss 3 (Beast Master) theme. UGYANAZ az AlkaKrab csomag:
│   │   │                         # `5. Dread March (Loop)`
│   │   ├── library-of-veles.mp3  # Level 1 ambient (Free Dark Fantasy Music) — licenc TISZTÁZANDÓ
│   │   └── sfx/                  # Free Fantasy SFX Pack (TomMusic), WAV — licenc TISZTÁZANDÓ
│   │       ├── sword-attack-2.wav      # player kardsuhintás (a sorszám a kapocs a csomaghoz)
│   │       ├── sword-attack-3.wav      # CrowHarvester + boss közelharc (közös hang)
│   │       ├── sword-impact-hit-1.wav  # a player kardjának becsapódása
│   │       ├── fireball-1.wav          # Gravecaller lövedék (Spells/)
│   │       ├── fireball-2.wav          # player tűzgolyó   (Spells/)
│   │       ├── fireball-3.wav          # boss lövedék      (Spells/)
│   │       ├── firebuff-2.wav          # boss varázslat-becsapódás (Spells/) — HÁROM helyen:
│       │                           # Wing-Breaker Shadow Spell + démon árny-hullám ÉS idézés
│   │       ├── stone-chain-run-5.wav   # player lépés — a "Chain" (láncing-csörgős) változat
│   │       ├── stone-jump.wav          # player ugrás — a SIMA változat, SZÁNDÉKOSAN nem a
│   │                                   # Chain: annak a végén külön csörgő utórezgés ül
│   │       ├── rock-wall-1.wav         # Mad King becsapódás (Spells/) — 2 mp-es dörej
│   │       ├── necro-hurt.wav          # CrowHarvester halál \ Monster Growls Attack and
│   │       ├── necro-death-2.wav       # Gravecaller halál   | Deaths V.1 — licenc TISZTÁZANDÓ
│   │       ├── fatman-death.wav        # Beast halál         / SZÁRMAZTATOTT: a forrás
│   │                                   # `fatmanbossDeath.wav` 2,879 s, és KÉT részből áll
│   │                                   # (haláltusa 0–1,45 s, majd ~0,3 s csend után egy
│   │                                   # külön utórész). Itt a 0–1,55 s + 60 ms fade van.
│   │                                   # A csúcs (0.751) a vágástól NEM változott
│   │       └── death-groan-17.wav      # player halál. SZÁRMAZTATOTT: a forrás
│   │                                   # `17. Death Groan (Male).wav` KÉT külön felvételt
│   │                                   # tartalmaz (50-330ms és 575-950ms, közte csend);
│   │                                   # ebből az ELSŐ van kivágva (0-360ms) + 30ms
│   │                                   # fade-out. Licenc nélküli fájl — TISZTÁZANDÓ
│   ├── backgrounds/
│   │   ├── ruined-city/          # Level 1 parallax rétegek, mind 426x384
│   │   │   ├── 01-sky.png        # RGB, átlátszatlan ég (#673838 -> #724141)
│   │   │   ├── 02-mountains.png  # RGBA sziluett, teteje a forrás y=163..201-nél
│   │   │   └── 03-ruins.png      # RGBA sziluett, teteje a forrás y=193..227-nél
│   │   ├── cathedral/
│   │   │   └── boss-arena.png    # 800x450, ÁTMÉRETEZETT/KIVÁGOTT (1663x935 crop @ 4,0) —
│   │   │                         # ÚJRAGENERÁLVA 2026-09-01-én, amikor a BossScene
│   │   │                         # GROUND_TOP-ja 418 -> 369 lett. Lásd BossScene alább
│   │   ├── broken-gate/
│   │   │   └── final-arena.png   # 800x450, CSAK ÁTMÉRETEZVE (nincs kivágás), a Boss 2 receptje
│   │   │                         # szerint: a forrás 1672x941 aspektusa (1.7768) gyakorlatilag
│   │   │                         # azonos a 800/450-ével (1.7778). A rajzolt dais-perem a 369.
│   │   │                         # sorra esik = FinalBossScene.GROUND_TOP. Licenc nélkül
│   │   │                         # érkezett -> nyitott jogi tétel
│   │   ├── throne-room/
│   │   │   └── boss2-arena.png   # 800x450. A forrás 2026-09-01 óta a `Mad King
│   │   │                         # background.png` (1641x959) — a KIRÁLYNÉ KOPORSÓJÁVAL a
│   │   │                         # lépcső előtt, pontosan amiről a KING_DIALOGUE szól.
│   │   │                         # KIVÁGVA (0,36 -> 1641x923), mert a forrás aspektusa
│   │   │                         # (1.7112) NEM azonos a 800/450-ével: sima átméretezés
│   │   │                         # 3,9 %-ot torzítana függőlegesen. A levágott 36 sor a
│   │   │                         # sötét mennyezet-sáv. A rajzolt dobogó-perem (a forrás
│   │   │                         # 793. sora) a 369.-re esik = Boss2Scene.GROUND_TOP.
│   │   │                         # (A korábbi kép a `Second boss background.png` volt.)
│   │   └── gothic-town/          # Level 2 parallax. GothicVania Town (Luis Zuno) — PUBLIC DOMAIN.
│   │       │                     # MINDKETTŐ SZÁRMAZTATOTT, de VESZTESÉGMENTESEN: a forrás alsó
│   │       │                     # sávja bitre azonos sorokból áll, tehát lefelé toldható.
│   │       ├── 01-sky.png        # 384x450 = background.png (384x288) + 162 sor `#71405A`
│   │       └── 02-town.png       # 768x450 = [middleground.png | TÜKRÖZVE] + 162 sor `#392D55`
│   │                             # A tükrözés teszi vízszintesen varratmentessé (a nyers
│   │                             # 384-es réteg bal és jobb éle érdemben eltér).
│   ├── tiles/
│   │   └── cathedral/            # Level 1 terrain. PixelPlatformerSet1 v1.1 (Szadi art) —
│   │       │                     # PUBLIC DOMAIN. Kivágások, ÁTMÉRETEZÉS NÉLKÜL; a
│   │       │                     # forrás-rectek a src/levels/LevelTileset.ts fejlécében.
│   │       ├── ground-floor.png        # 224x32, vízszintesen VARRATMENTES
│   │       ├── ground-edge-left.png    # 16x32  \ szegmens-végzárók (a szegmensen BELÜL)
│   │       ├── ground-edge-right.png   # 16x32  /
│   │       ├── platform-mid.png        # 32x16, vízszintesen VARRATMENTES
│   │       ├── platform-edge-left.png  # 48x32 \ felső 16 = lap, alsó 16 = lelógó szikla
│   │       ├── platform-edge-right.png # 48x32 /
│   │   │   ├── door-gate.png           # 64x128, boltív; nyílás x=14..51, y=48..108
│   │   │   └── ladder.png              # 32x16, függőlegesen VARRATMENTES (16px fok-osztás)
│   │   └── gothic-town/          # Level 2 terrain. GothicVania Town — PUBLIC DOMAIN.
│   │       │                     # Öt VÁLTOZATLAN másolat + egy származtatott.
│   │       ├── ground-strip.png        # 32x48 SZÁRMAZTATOTT: [ground-b.png | ground.png].
│   │       │                           # A felső 9 sor ÁTLÁTSZÓ, a 9-15. a járható perem.
│   │       ├── top-wood.png            # 16x16 pallólap (13 px rajzolt), vízszintesen VARRATMENTES
│   │       ├── top-left-wood.png       # 32x32 \ végzáró: felső 13 lap, alsó 19 láb + merevítő
│   │       ├── top-right-wood.png      # 32x32 /
│   │       ├── wood-legs.png           # 32x16, MIND A 16 SORA AZONOS -> tetszőleges magasság
│   │       └── ground-wood-legs.png    # 32x16 talpazat: alsó 7 sora = a talaj pereme
│   ├── props/
│   │   └── gothic-town/          # Hangulati propok + háttér-házak. GothicVania Town (Luis
│   │       │                     # Zuno) — PUBLIC DOMAIN. VÁLTOZATLAN másolatok, eredeti
│   │       │                     # fájlnéven. A tint PLACEMENT-szintű: a Level 1 korrigál,
│   │       │                     # a Level 2 PROP_TINT_NONE-t ad (ott ez a hazai paletta).
│   │       ├── street-lamp.png   # 35x108 \ kő/vas: PROP_TINT_COOL_SOURCE (a Level 1-en)
│   │       ├── well.png          # 65x65  /
│   │       ├── wagon.png         # 93x75  \
│   │       ├── crate.png         # 39x35   > fa: PROP_TINT_WARM_SOURCE (a Level 1-en)
│   │       ├── crate-stack.png   # 73x68  /
│   │       ├── barrel.png        # 24x30  \ a Level 2-vel jöttek, egyelőre csak ott
│   │       ├── sign.png          # 37x45  /
│   │       ├── house-a.png       # 168x183 \ HÁTTÉR-ÉPÜLETEK (BUILDING_TEXTURES): lapos talpúak,
│   │       ├── house-b.png       # 210x244  > BUILDING_DEPTH (-15), tint NÉLKÜL, és a talpuk
│   │       └── house-c.png       # 221x183 /  BUILDING_SINK_PX-szel a felszín ALÁ kerül
│   └── sprites/
│       ├── knight/               # player sprite sheetek, mind 128x64-es blokkokra vágva
│       │   ├── Idle.png Run.png Jump.png Attacks.png
│       │   ├── Hurt.png Death.png Climb.png Health.png
│       │   └── license.txt       # 2D_SL_Knight_v1.0 licenc, a repo dokumentálja a jogi státuszt
│       ├── crow-harvester/       # Enemy 1 sprite
│       │   └── enemy04_sheet.png # 1792x64 = 28 db 64x64-es frame. NINCS mellette licenc (lásd lentebb)
│       ├── beast/               # Enemy 3 sprite. NINCS licenc, és a Credits.txt-ben SEM
│       │   │                     # szerepel — új nyitott jogi tétel (lásd lentebb).
│       │   └── goatman.png       # 384x512 = 6x8 db 64x64-es frame (48 cella, 41 rajzolt).
│       │                         # VÁLTOZATLAN másolat, EREDETI fájlnéven: ez az egyetlen
│       │                         # kapocs a forráshoz. A csomagban VAN dedikált,
│       │                         # fejlehajtott roham-animáció (f24-33) — ezért jó egy
│       │                         # chargerhez. Death animáció NINCS
│       ├── gravecaller/          # Enemy 2 sprite (Necromancer csomag) — NINCS licenc (lásd lentebb).
│       │   │                     # ÖT külön sheet, MIND 96x96-os frame-mel, eredeti fájlnéven.
│       │   ├── spr_NecromancerIdle_strip50.png    # 4800x96 = 50 frame
│       │   ├── spr_NecromancerWalk_strip10.png    #  960x96 = 10 frame
│       │   ├── spr_NecromancerGetHit_strip9.png   #  864x96 =  9 frame (f1/f3-ba égetett fehér villanás)
│       │   ├── spr_NecromancerDeath_strip52.png   # 4992x96 = 52 frame (VALÓDI death animáció)
│       │   └── spr_NecromancerAttackWithoutEffect_strip47.png
│       │                         # 4512x96 = 47 frame — SZÁRMAZTATOTT: a forrás 6016x128
│       │                         # (128x128-as frame), abból frame-enként (16,16,96,96)
│       │                         # kivágással. Lásd a 19. technikai tanulságot.
│       ├── grafted-wing-breaker/ # Boss 1 sprite, eredeti fájlnéven (Bringer of Death, Clembod)
│       │   ├── Bringer-of-Death-SpritSheet.png          # 1120x744 = 8x8 db 140x93-as frame
│       │   └── Bringer-of-Death-SpritSheet_no-Effect.png # ugyanaz effektek nélkül; 1 frame kell belőle
│       ├── ancient-demon/        # Boss 3 sprite + az idézett lidércek (Undead Executioner,
│       │                         # darkpixel-kronovi / Kronovi-). A Credits.txt MÁR kreditálja,
│       │                         # de a csomagban NINCS licencfájl — a licenc SZÖVEGE nyitott
│       │                         # tétel. VÁLTOZATLAN másolatok, EREDETI fájlnéven.
│       │                         # ÖT sheet a bosshoz, mind 100x100-as frame-mel:
│       │   ├── idle2.png         #  400x200 =  8 frame (lebegés). Az `idle.png` KIMARADT:
│       │   │                     #  ugyanez gyorsabban, ráadásul üres záró frame-mel
│       │   ├── attacking.png     #  600x300 = 18 frame-nyi rács, ebből 13 rajzolt (f13-17 ÜRES).
│       │   │                     #  KÉT csapás: f2 és f9 az ív-frame
│       │   ├── skill1.png        #  600x200 = 12 frame — az árny-hullám, f7-nél a legszélesebb
│       │   ├── summon.png        #  400x200 =  8 frame-nyi rács, ebből 5 rajzolt (f5-7 ÜRES)
│       │   ├── death.png         # 1000x200 = 20 frame-nyi rács, ebből 18 rajzolt; a lény
│       │   │                     #  MAGÁTÓL foszlik szét -> nem kell fade, és test sem marad
│       │                         # HÁROM sheet a lidércekhez, mind 50x50-as frame-mel:
│       │   ├── summonAppear.png  # 150x100 = 6 frame (egy pontból nő ki)
│       │   ├── summonIdle.png    # 200x50  = 4 frame, loop
│       │   └── summonDeath.png   # 150x100 = 6 frame-nyi rács, ebből 5 rajzolt (f5 ÜRES)
│       └── mad-king/             # Boss 2 sprite (Medieval King Pack 2) — CC-0, a licenc a
│           │                     # repóban van. HÉT sheet, MIND 160x111-es frame-mel, a talp
│           │                     # mindegyiken a frame y=105-énél. VÁLTOZATLAN másolatok.
│           ├── Idle.png          # 8 frame \ 1280x111
│           ├── Run.png           # 8 frame /
│           ├── Attack1.png       # 4 frame — SLASH, f2 a csapás (a penge x=151-ig ér)
│           ├── Attack2.png       # 4 frame — LUNGE (Phase 2), f2 a kitörés mozgás-csíkkal
│           ├── Attack3.png       # 4 frame — LEAP: f0-1 guggolás, f2 levegőben, f3 becsapódás
│           ├── Death.png         # 6 frame, f5 = a földön maradó test (NINCS fade utána)
│           ├── Take-Hit.png      # 4 frame — CSAK a falnak rohanó kitörés staggerje.
│           │                     # A szóköz kivéve a névből: a Vite-import azzal törékeny
│           └── license.txt       # CC-0 — ez NEM nyitott jogi tétel
│           # A csomag Jump.png / Fall.png sheetje SZÁNDÉKOSAN kimaradt (az Attack3 f2 MAGA a
│           # levegőben lévő póz), és a "Take Hit - white silhouette.png" sem kell: a
│           # találat-villanás a bevett setTint + TintModes.FILL úton megy.
├── tests/
│   └── unit/
│       ├── player.test.ts       # Project_plan.md §23 Player scope
│       ├── combat.test.ts       # §23 Combat scope (ATTACK_CONFIGS, Player attack, Fireball + ProjectileOptions)
│       ├── crowHarvester.test.ts # §23 Enemy scope (CrowHarvester HP/damage/death/state transitions)
│       ├── gravecaller.test.ts  # §23 Enemy scope (Gravecaller — vertikális kapu, kite, cast->reposition)
│       ├── beast.test.ts        # §23 Enemy scope, Enemy 3 (roham, a CHASE hátráló ága,
│       │                        # perem-leállás) + FAIRNESS-invariánsok
│       ├── boss.test.ts         # §23 Boss scope (HP, phase transition, slash/projectile/spell/charge, death)
│       ├── madKing.test.ts      # §23 Boss scope, Boss 2 (HP, fázis, slash/leap/lunge, death)
│       ├── ancientDemon.test.ts # §23 Boss scope, Boss 3 (HP, fázis, kombó/nova/villanás/idézés,
│       │                        # death) + FAIRNESS-invariánsok
│       ├── ancientDemonAnimations.test.ts # state->anim, facing, ÉS a két független
│       │                        # testközép-mérés egyezése (köpeny vs. hullám-szimmetria)
│       ├── shadeMinion.test.ts  # a lidérc: sodródás, EGYSZERI kontakt-sebzés, lejárat, destroy()
│       ├── dialogue.test.ts     # a párbeszéd pure magja + a léptetés (nyíl vs. automatikus)
│       ├── dialogueMemory.test.ts # a „már láttam" registry-emlékezet (Phaser-mock NÉLKÜL)
│       ├── audio.test.ts        # §23 Utility logic (AudioManager életciklus, fade, shutdown, SFX)
│       ├── level1Layout.test.ts # a Level 1 geometria invariánsai (elérhetőség-BFS, gapek, enemy-bounds, spike-ok)
│       ├── beastMaster.test.ts  # §23 Boss scope, Boss 3 (mini): HP, roham, STAGGER, FALKA
│       │                        # + FAIRNESS-invariánsok (a windup MINDKÉT választ engedi)
│       ├── beastMasterAnimations.test.ts # a SCALE-ből levezetett geometria + anim-kulcs ütközés
│       ├── level3Layout.test.ts # a Level 3 geometriája + KÉT ÚJ invariáns-család:
│       │                        # roham-kikerülhetőség (mennyezet) és galéria-szeparáció
│       ├── level2Layout.test.ts # ugyanaz a Level 2-re + ugrás-plafon, mozgó platform, létrák,
│       │                        # állvány/konzol (platformHasLegs), házak és propok elhelyezése
│       ├── movingPlatform.test.ts # a mozgásprofil (pure), a rider-szállítás és a fa-látvány szinkronja
│       ├── hazards.test.ts      # HazardDamageGate + SpikeField geometria + SwingingReaper lengés
│       ├── playerAnimations.test.ts       # state->anim leképezés + a Player animáció-vezérlése
│       ├── crowHarvesterAnimations.test.ts # state->anim + a facing-kompenzáció regressziós tesztje
│       ├── beastAnimations.test.ts # a LEVEZETETT geometria/hatótávok, a roham két fázisának
│       │                        # animációja, és hogy a találat NEM írja felül a telegraph-ot
│       ├── gravecallerAnimations.test.ts   # state->anim, facing, LEVEZETETT geometria/cast-időzítés
│       ├── bossAnimations.test.ts         # state->anim, facing-kompenzáció SCALE-lel, levezetett konstansok
│       ├── madKingAnimations.test.ts      # state->anim, facing, ÉS a leap ballisztikájának levezetése
│       ├── afterImageTrail.test.ts        # a dash sebesség-csíkja: throttle + geometria-másolás
│       ├── parallaxBackground.test.ts     # scroll->tilePositionX + a Level 1 ÉS Level 2 réteg-terv
│       └── helpers/
│           ├── fakePhaser.ts        # a 'phaser' modul önálló fake névtere (createFakePhaserModule)
│           └── phaserTestUtils.ts   # megosztott mock scene/body/delayedCall-stepper helperek
├── src/
│   ├── main.ts
│   ├── vite-env.d.ts             # /// <reference types="vite/client" /> — az *.mp3 import típusa
│   ├── config/
│   │   └── physics.ts            # GRAVITY_Y — a main.ts ÉS a Level1Layout ugrás-számítása ebből dolgozik
│   ├── levels/
│   │   ├── LevelGeometry.ts      # MINDEN pályára érvényes: típusok, ugrás-plafon, pure helperek
│   │   │                         # (surfaceSpan, groundGaps, enemyChaseBounds, platformHasLegs,
│   │   │                         #  PROP_/BUILDING_ASSETS). A pályánkénti ADAT a LevelNLayoutban.
│   │   ├── Level1Layout.ts       # a Level 1 TELJES geometriája, Phaser-mentes adatmodulként
│   │   ├── Level2Layout.ts       # ugyanaz a Level 2-re (7200px, 9 szakasz) + a díszlet-adat
│   │   ├── LevelTileset.ts       # Level 1 (cathedral) csempe-méretek/forrás-rectek + a depth-rend
│   │   ├── GothicTownTileset.ts  # Level 2 (gothic-town) csempe-geometria + BUILDING_DEPTH
│   │   ├── Level3Layout.ts       # ugyanaz a Level 3-ra (4200px, 6 „karám") + a MENNYEZET-invariáns
│   │   ├── ChurchTileset.ts      # Level 3 (church) csempe-geometria, a boltív + az aréna padlóvonala
│   │   ├── LevelTerrain.ts       # talaj + platform építés, NÉGY skinnel (cathedral/gothic-town/church/placeholder)
│   │   ├── LevelEnemies.ts       # KÖZÖS enemy-spawn/reset/update + a Gravecallerek boltjai
│   │   └── LevelDecor.ts         # propok (createDecorProps) és háttér-házak (createBackdropBuildings)
│   ├── platforms/
│   │   └── MovingPlatform.ts     # Level 2 mozgó lap: pure mozgásprofil + kézi rider-szállítás
│   ├── hazards/
│   │   ├── HazardDamage.ts       # HazardDamageGate — KÖZÖS i-frame ablak minden hazardnak
│   │   ├── SpikeField.ts         # statikus tüskemezők (látvány tileSprite + külön hitbox Zone)
│   │   └── SwingingReaper.ts     # determinisztikus lengő kasza (pure swingAngleAt mag)
│   ├── ui/
│   │   ├── TutorialHint.ts       # egyszer megjelenő billentyű-súgó (ez nyitja meg az ui/ mappát)
│   │   └── Dialogue.ts           # in-scene párbeszéd-panel: MAGÁTÓL megy, nyíllal gyorsítható
│   ├── scenes/
│   │   ├── BootScene.ts          # placeholder textúrák + audio betöltés + loading kijelzés
│   │   ├── Level1Scene.ts        # 6000px pálya; a geometria a levels/Level1Layout.ts-ből jön
│   │   ├── BossScene.ts          # 800x450 fix aréna, boss entrance, HP-bar, victory/defeat ágak
│   │   ├── NarrationScene.ts     # adatvezérelt szöveges átvezető (typewriter), újrahasználható
│   │   ├── Level2Scene.ts        # 7200px pálya; a geometria a levels/Level2Layout.ts-ből jön
│   │   ├── Boss2Scene.ts         # 800x450 fix aréna: párbeszéd -> belépő -> harc
│   │   ├── Level3Scene.ts        # 4200px pálya; LAPOS háttér (nincs parallax), church skin
│   │   ├── Boss3Scene.ts         # 800x450 fix aréna, SCENE-BEN ÖSSZERAKOTT háttérrel
│   │   ├── FinalBossScene.ts     # 800x450 fix aréna: párbeszéd -> belépő -> harc + lidércek
│   │   └── CreditsScene.ts       # "Thanks for playing" + szerzők; a végén ÚJ JÁTÉK tiszta registryvel
│   ├── player/
│   │   ├── Player.ts             # + CLIMB state, LadderContact interface, respawn()
│   │   ├── PlayerAnimations.ts   # sprite geometria, anim kulcsok/frame-tartományok, animKeyForState()
│   │   └── PlayerController.ts   # + létra-input ág
│   ├── enemies/
│   │   ├── CrowHarvester.ts      # Enemy 1, state machine + CrowHarvesterConfig (patrol határok)
│   │   ├── CrowHarvesterAnimations.ts # sheet geometria, anim kulcsok, facing-kompenzáció, animKeyForState()
│   │   ├── Gravecaller.ts        # Enemy 2 (távolsági), MAINTAIN_DISTANCE / CAST / REPOSITION
│   │   ├── GravecallerAnimations.ts   # 5 textúra egy 96x96-os geometriával, a cast-időzítés forrása
│   │   ├── Beast.ts              # Enemy 3 (charger), CHARGE_WINDUP / CHARGE + a CHASE hátráló ága
│   │   └── BeastAnimations.ts    # 64x64-es geometria, a MÉRT hatótávok és időzítések forrása
│   ├── bosses/
│   │   ├── GraftedWingBreaker.ts # Boss 1, két fázis, slash / projectile / spell / charge
│   │   ├── GraftedWingBreakerAnimations.ts # sheet geometria, anim kulcsok, időzítések forrása
│   │   ├── MadKing.ts            # Boss 2, két fázis, slash / leap-slam / lunge (tisztán közelharci)
│   │   ├── MadKingAnimations.ts  # sheet geometria, anim kulcsok, időzítés ÉS a leap ballisztikája
│   │   ├── BeastMaster.ts        # Boss 3 (mini), a Beast SCALE 2-vel, fázis NÉLKÜL + falka
│   │   ├── BeastMasterAnimations.ts # a BeastAnimations-ből LEVEZETVE; saját anim-kulcsok
│   │   ├── AncientDemon.ts       # VÉGSŐ boss, két fázis, kombó / nova / villanás / idézés
│   │   ├── AncientDemonAnimations.ts # sheet geometria + a hatótávok/időzítések FORRÁSA
│   │   ├── ShadeMinion.ts        # a Phase 2-ben idézett árnyék-lidérc (lebeg, kontakt-sebzés)
│   │   └── ShadeMinionAnimations.ts  # 50x50-as geometria (KÜLÖN modul: más frame-méret)
│   ├── systems/
│   │   ├── CheckpointSystem.ts   # egyetlen aktív respawn-pont tárolása
│   │   ├── LevelCheckpoint.ts    # a köztes checkpoint jelölője + zónája (mindkét pályán)
│   │   ├── AudioManager.ts       # egy zenesáv (loop + fade) + állapot nélküli one-shot SFX
│   │   ├── DialogueMemory.ts     # „melyik boss párbeszédét látta már?" — registry, Phaser-mentes
│   │   ├── SpriteFacing.ts       # off-center sprite fordulás-kompenzáció (CrowHarvester + boss)
│   │   ├── AfterImageTrail.ts    # afterimage-csík gyors mozgáshoz (a boss dash-éhez)
│   │   └── ParallaxBackground.ts # réteges parallax háttér + a Level 1 réteg-terve
│   └── combat/
│       ├── Attack.ts             # AttackType enum (egyetlen tag: SWORD) + ATTACK_CONFIGS (sebzés, cooldown, hitbox méret)
│       ├── Projectile.ts         # Fireball osztály + FIREBALL_CONFIG + ProjectileOptions (boss lövedék)
│       └── DamageSystem.ts       # Damageable interface + PhysicsOverlapObject típus-alias
```

Még NEM létezik (a Project_plan.md 20. pontjában tervezett, de nem implementált): `MenuScene`, `enemies/Archer.ts`, `systems/GameState.ts`, és az `assets/` alatt az `effects/` mappa. *(Az `Archer.ts` szerepét a `Gravecaller.ts`, a tervezett `Beast.ts`-ét pedig a `Beast.ts` tölti be — utóbbi 2026-08-31 óta KÉSZ.)* Az `ui/` mappában megvan a `TutorialHint.ts` és a `Dialogue.ts`, de a **valódi HUD** és a **Menu** még hátravan.

> **A tervezett `EndingScene.ts` szerepét TÉNYLEG a `NarrationScene` töltötte be** (a korábbi
> jóslat bevált): a játék záró narrációja ugyanaz az adatvezérelt scene, változtatás nélkül,
> csak más `{ lines, nextScene }` adattal. **Az `ui/Dialogue.ts`-re viszont MÉGIS szükség
> lett** — a két modul más szerepű (teljes képernyős, kézzel léptetett, pályák KÖZÖTT vs.
> in-scene, magától menő, beszélő-névvel); lásd a „PÁRBESZÉD-RENDSZER" szakaszt.
>
> A `CreditsScene` ehhez képest ÚJ, a tervben nem szereplő scene: a `NarrationScene`
> typewriter-léptetése nem alkalmas egy hosszú, görgő attribúciós listára.

## Implementált gameplay

### Player (`src/player/Player.ts`, `PlayerAnimations.ts`, `PlayerController.ts`)
- Mozgás: balra/jobbra (nyilak vagy A/D), ugrás (fel/W/Space)
- State-ek: IDLE, RUN, JUMP, FALL, ATTACK, CAST, HURT, CLIMB, DEAD
- **Sprite + animációk (Phase 8):** minden state-hez tartozik animáció; a leképezést a
  `PlayerAnimations.ts` **pure** `animKeyForState(state)` függvénye adja,
  a `Player.updateAnimation()` pedig ezt szinkronizálja minden frame-ben. A sheetek 128×64-es
  frame-ekből állnak, a rajzolt karakter ~28×46 ezen belül:
  - `ORIGIN_Y = 0.625` → a **talp pontosan a `sprite.y + 24`-nél** van, ezért a
    `Level1Scene` `PLAYER_HALF_HEIGHT = 24` konstansa (létra `topY`/`bottomY`, `CHECKPOINT_Y`)
    a placeholder óta változatlanul érvényes. **Ha valaha más karakter-sheetre cserélsz,
    ezt a hármast (`ORIGIN_Y`, `BODY_*`, `PLAYER_HALF_HEIGHT`) együtt kell újraszámolni.**
  - Az `Attacks.png` 40 frame-je valójában **20 jobbra néző + ugyanaz 20 tükrözve**; a
    20–39 tartományt eldobjuk, a fordulást továbbra is a `setFlipX()` intézi. A kardtámadás
    `ATTACK_FRAMES = f15–19` (nagy dupla félhold). A `Hurt.png` 4. frame-je ÜRES
    (csak `f0–2` használható).
  - **A `frameRate` mindig SZÁMÍTÓDIK** (`frames * 1000 / durationMs`), sosem beégetett:
    a támadás-animáció hossza az `ATTACK_CONFIGS[type].startupDelayMs + activeDurationMs`,
    a cast/hurt lock pedig a `CAST_ANIM_MS` / `HURT_ANIM_MS`-ból származik
    (`CAST_DELAY_MS = CAST_ANIM_MS`). Így az animáció és a gameplay-lock nem tud elcsúszni.
  - **A hitbox MÉRETE is az animációból van levezetve**, nem szabadon hangolt szám: az
    `ATTACK_CONFIGS[type].hitboxWidth/hitboxOffsetX` a támadás AKTÍV frame-jeinek
    (`f17–19`) tényleges kiterjedéséhez igazodik: az ív +63px-ig ér → hitbox +9..+59.
    **Ha a támadás frame-tartománya változik a `PlayerAnimations.ts`-ben, a hitboxot
    EGYÜTT kell újraszámolni** — különben a kard láthatóan a levegőt találja el (pontosan
    ez volt a hiba az első verzióban: a hitbox 18px-szel tovább ért, mint ameddig a kard).
    Következmény, amivel számolni kell: a támadás effektív hatótávja (+59, plusz az enemy
    félszélessége) kényelmesen a CrowHarvester `ATTACK_RANGE = 42`-je fölött van, tehát a
    közelharc a saját sebzésük vétele nélkül is vívható.
  - **Nincs magic animáció a csomagban** — a CAST a `Health.png` "gyógyital" anim `f0–4`
    szakaszát használja (a lovag piros izzó gömböt emel, ami szikrákra pattan). A fireball
    pont a szikrák pillanatában születik, a kéz magasságában (`FIREBALL_SPAWN_OFFSET_Y`).
  - **Tint már csak a sebzésnél van** (piros villanás, mert 3 frame-es hurt animáció önmagában
    harc közben nem elég olvasható). A korábbi sárga attack- / kék cast- / szürke death-tint
    törölve: azokat most az animáció közli.
  - CLIMB alatt, ha `body.velocity.y === 0`, az animáció `pause()`-ol (a létrán állva ne
    pörögjön), mozgásnál `resume()`.
  - `main.ts`-ben **`pixelArt: true`** kötelező — enélkül a Phaser bilineárisan szűri
    a textúrákat, és a pixel art elmosódik.
- **Létramászás (CLIMB)**: a scene minden frame-ben átad egy `LadderContact`-ot
  (`setLadderContact()`), ha a player fedésben van a létra zónájával. Mászás közben:
  gravitáció ki, `body.checkCollision.down = false` (hogy az egyirányú felső platformon
  át lehessen mászni), a pozíció pedig a `topY`/`bottomY` közé clampelve — ez a clamp
  helyettesíti a kikapcsolt talaj-ütközést. Létrán nincs támadás/varázslás; sebzés
  és halál automatikusan lelöki róla. Vezérlés: Fel/W = fel, Le/S = le, Space = leugrás,
  Bal/Jobb = lelépés (a vízszintes input MINDIG kilép, hogy ne lehessen beragadni).
- HP: 100, `takeDamage()`, halálnál lefagy (body disabled, szürke tint). `respawn(x, y)` a
  `die()` ellentéte: HP-t, pozíciót, minden lock-flaget (attack/cast cooldown, mászás,
  ladder-kontaktus) és a physics bodyt visszaállítja — a `Level1Scene` hívja a
  `CheckpointSystem`-től kapott ponttal
- Kard: **egyetlen** Sword Attack (J / bal klikk), `player.attack()`. A cooldown/damage/hitbox
  a `combat/Attack.ts` `ATTACK_CONFIGS[AttackType.SWORD]`-jából jön: 10 sebzés, 350ms cooldown,
  150ms startup + 180ms aktív. A cooldown SZÁNDÉKOSAN nem rövidebb a 330ms-os animációnál,
  hogy a valódi kapu a cooldown legyen, ne az ATTACK state-lock. A `performAttack()` a
  guardok MÖGÖTT **`'sword-swing'` eventet emittál** (a suhintás SFX-ét a scene játssza le,
  lásd az Audio szakaszt), így blokkolt csapásra nincs hang. Emiatt viszont a
  `performAttack()` **nullázza a `currentAnimKey`-t**: 20ms rés mellett a state-reset és a
  cooldown lejárta ugyanabba a frame-közbe eshet, és a `playAnim()` guardja "ugyanaz a kulcs"
  alapon átugorná az animáció újraindítását (a kard a csapás utolsó frame-jén ragadna).
  **A korábbi Light/Heavy pár megszűnt** (az `AttackType` enum egyetlen taggal marad, hogy
  egy jövőbeli bővítés egy tag + egy `ATTACK_CONFIGS` bejegyzés legyen); a K billentyű és a
  jobb egérgomb már nem támad
- Fireball: F billentyű, `combat/Projectile.ts` Fireball osztályt hoz létre a Level1Scene-ben egy `fireball-cast` eventen keresztül

### Enemy — CrowHarvester (`src/enemies/CrowHarvester.ts`, `CrowHarvesterAnimations.ts`)
> Korábbi neve **`Hollow`** volt. A Phase 8 3. iterációjában átnevezve, mert a hozzá
> választott pixel art egy csuklyás, csőrös, kaszás dögevő (varjú-tematika), nem husk-lovag.
> Az átnevezés tisztán névváltás: a state machine és minden szám változatlan.

- State machine: PATROL → DETECT PLAYER → CHASE → ATTACK → COOLDOWN → CHASE (Project_plan.md 11. pont szerint)
- HP: 40, kard és fireball is sebzi
- **Sprite + animációk (Phase 8):** egyetlen 1792×64-es csík (`enemy04_sheet.png`),
  28 db 64×64-es frame. A sorrend ELLENŐRIZVE (az egyedi PNG-k alpha bounding boxai a
  sheet frame-jeivel párosítva): `idle 0–6`, `walk 7–12`, `attack 13–19`,
  `jump_mid 20–23`, `jump_landing 24`, `hit 25–27`. A jump frame-ek **nem kellenek**.
  - **A lény a frame BAL oldalán ül** (teste x≈4–24, a kasza tölti ki a jobb oldalt,
    támadáskor x=54-ig), a teste közepe frame-x **14**, nem 32. Emiatt van a
    `setFacing()` **flip-kompenzáció** — lásd a "Fontos technikai tanulságok" 11. pontját.
  - `ORIGIN_Y = 0.640625` → a talp a `sprite.y + 23`-nál, pontosan ott, ahol a régi
    30×46-os placeholderé volt. Ezért maradt érvényben a `Level1Scene`
    `HARVESTER_SPAWN_OFFSET = 24`.
  - **A támadás-animáció a state machine-hez van illesztve**, nem fordítva: az
    `ATTACK_FRAMES = [13,13,13,14,15,16,17,18,19]` explicit lista a windup frame-et
    megháromszorozza, hogy a csapás (`f14`, a fehér ív) pontosan `ATTACK_STARTUP_MS`-nél
    kerüljön képre — ott, ahol a `resolveAttackHit()` fut. Az `ATTACK_STARTUP_MS` maga is
    az animációs modul `ATTACK_WINDUP_MS`-éből származik. Az `ATTACK` és a `COOLDOWN`
    UGYANARRA az anim kulcsra képződik le, így a 900ms-os animáció egyben fut végig a
    300+900ms-os állapotpáron ahelyett, hogy a state-váltásnál újraindulna.
  - **Nincs tint sehol.** A hit frame-ekbe **be van égetve** a fehér villanás; a korábbi
    `setTint(0xffffff)` amúgy is **no-op volt** (fehér tint = azonosság), tehát a
    Hollow-nak sosem volt látható találat-visszajelzése. A támadás narancs windup-tintjét
    a magasba emelt kasza váltotta ki.
  - **A csomagban NINCS death animáció:** a `die()` a hit animációt játssza le, majd egy
    tween `alpha: 0` + 6px süllyedés, végül `setVisible(false)`.
  - A találat-reakciót egy `isReacting` flag védi (`HIT_ANIM_MS` = 180ms), hogy a walk/idle
    ne írja felül a következő frame-en.
- Közelharci támadás: nem külön hitbox-zónával, hanem távolság-ellenőrzéssel a támadás windup végén (implementációs egyszerűsítés, nem terveltérés)
- Patrol range: spawn ponttól ±80px (felülírható), detection range: 220px, lose range: 320px (hiszterézis)
- **DETECT PLAYER kiváltói**: közelség VAGY sebzés PATROL közben — a `takeDamage()` PATROL
  állapotban azonnal CHASE-re vált, így egy távolról indított tűzgolyó is felébreszti
- **A passzív detektálás (PATROL→CHASE) vízszintes ÉS vertikális küszöböt is megkövetel**
  (`DETECTION_RANGE` 220px vízszintesen, `VERTICAL_DETECTION_RANGE` 50px függőlegesen) —
  enélkül egy közvetlenül fent/lent, más platformon álló player is "közelinek" számítana,
  hiszen ilyenkor pont a vízszintes távolság kicsi. A `LOSE_RANGE` (CHASE→PATROL) szándékosan
  **marad vízszintes-only**: ez tartja meg a tűzgolyós cross-level ébresztést (lásd fent) —
  ha itt is vertikális kaput tennénk, a sebzés-alapú kényszerített CHASE azonnal
  visszaváltana PATROL-ra egy magasan lévő platform-enemy esetén. Az `ATTACK_RANGE` és a
  tényleges találat (`resolveAttackHit`) **teljes 2D távolságot** használ, hogy ne lehessen
  "a padlón át" eltalálni egy másik platformon álló playert. A `DIRECTION_DEADZONE` (4px)
  megakadályozza, hogy egy vertikálisan elérhetetlen, de vízszintesen majdnem egy vonalban
  lévő cél felé az enemy balra-jobbra pörögjön (irány-flip minden frame-ben nulla körül)
- **`CrowHarvesterConfig`** (opcionális 4. konstruktor-paraméter): **KÉT, EGYMÁSTÓL FÜGGETLEN
  határpár.** A `patrolMinX`/`patrolMaxX` a nyugalmi séta-körzet; a `chaseMinX`/`chaseMaxX`
  az ÜLDÖZÉS pereme, és szándékosan jóval tágabb — jellemzően a felület (talaj-szegmens vagy
  platform) széle, behúzva. Megadás nélkül mindkettő „nincs korlát" (`∓Infinity`), ezért
  külön „van-e határ?" flag nem kell.
  - **Ez a kettő korábban EGYBE volt mosva** (`clampChaseToBounds: true` a patrol-határokra
    clampelt), és az hibás volt: a földi enemy a saját, szűk sétakörzetének peremén állt meg
    a pálya közepén — a player egyszerűen kisétált belőle, és a lény láthatatlan falba
    ütközött. Most a szakadék (vagy a tüskemező) széléig követi a playert.
  - A **PATROL érintetlen**: a `updatePatrol()` továbbra is a `patrolMinX/MaxX`-hez képest
    állítja az irányt, tehát a körzetén kívülről magától visszasétál, ha a player lehagyta
    (`LOSE_RANGE`). A gyakorlatban ez a valódi póráz: a player 200 px/s-mal lehagyja a
    100 px/s-os üldözőt, és 320 px után az üldözés megszakad — a szegmens hossza így ritkán
    számít.

### Enemy 2 — Gravecaller (`src/enemies/Gravecaller.ts`, `GravecallerAnimations.ts`)

A `Project_plan.md` 11. pontjának **„Archer / Caster"**-e. A név tematikus, nem az asset
csomagé (*Necromancer*): a lore szerint pont az ilyen lény hívja vissza a holtakat — azt
sérti meg, amit Lazarus őriz. Ugyanaz a névadási elv, mint a `Hollow → CrowHarvester`-nél.

- **State machine**, a terv öt dobozának 1:1 leképezése:
  `PATROL → DETECT PLAYER → MAINTAIN_DISTANCE → CAST → REPOSITION` (+ `DEAD`).
- **EGYETLEN támadás:** árny-tűzgolyó. Nincs közelharca — sarokba szorítva is csak castol.
- **A LÖVEDÉK VÍZSZINTES**, mint a playeré és a bossé; a `Fireball`/`ProjectileOptions`
  NEM változott, csak egy új textúra + számhármas.
- **Ebből következik a VERTIKÁLIS KAPU** (`VERTICAL_DETECTION_RANGE = 80`), és ez a lény
  legfontosabb tervezési döntése: a Gravecaller csak nagyjából azonos magasságban lévő
  playert vesz észre ÉS lő. Egy platformon álló caster enélkül a talajon futó playerre is
  tüzelne — a lövedék pedig elmenne a feje fölött. **A kapu a `canCast()`-ban IS ott van,
  nem csak a detektálásban**: a `takeDamage()` — a CrowHarvesterhez hasonlóan — PATROL-ból
  azonnal ébreszt, tehát egy alulról indított tűzgolyó felkelti; kapu nélkül onnantól a
  végtelenségig lőné a levegőt.
- **MAINTAIN DISTANCE:** `< RETREAT_RANGE (140)` → hátrál `RETREAT_SPEED (70)`-nel,
  `> PREFERRED_RANGE (300)` → közelít `ADVANCE_SPEED (50)`-nel, köztes sávban megáll.
  A hátrálás a `chaseMinX/MaxX` peremén (ugyanaz a `enemyChaseBounds()`, mint a
  CrowHarvesternél) **véget ér** → a platformon álló lény **sarokba szorítható**.
- **CSAK ÁLLÓ HELYZETBŐL castol.** Ez teszi a MAINTAIN DISTANCE-t valódi állapottá, és
  nem kozmetika: enélkül a lény az észlelés pillanatában, MOZGÁS NÉLKÜL castolt volna,
  tehát a „távolságtartás" sosem futott volna le (a unit teszt pont ezt találta meg).
  Gameplay-ben két dolgot ad: a túl messziről érkező playerre nem lő vakon, hanem előbb
  lőtávba sétál; a rárohanó player elől pedig előbb hátrál. **Sarokba szorítva viszont
  tüzel**, mert a peremen a hátrálás `velocity 0`-t ad, tehát „áll" — nem válik bábuvá.
- **A hátrálás SZÁNDÉKOSAN lassabb a playernél** (70 ≪ `MOVE_SPEED` 200): a távolságtartás
  késleltetés, nem menekülés. Ez + a `MAX_HP = 24` (3 kardcsapás) a user kérésének a
  megvalósítása: „ne legyen nehéz közel menni hozzá és karddal megölni".
- **CAST = a TELJES animáció** (windup + kikövetkezés, 1160 ms), és végig ÁLL: ez a
  punish-ablak. A lövedék `CAST_STARTUP_MS`-nél (720) születik. Ezután `REPOSITION`
  (1200 ms), ahol MOZOG, de nem castolhat — vagyis **a cooldown maga az állapot**, nincs
  külön `canCast` flag. Két lövés között így 2360 ms telik el.
- **Az irány a cast ELEJÉN rögzül**, nem a kioldáskor: a windup alatt mögé kerülve a
  lövedék kikerülhető, tehát a telegraph tényleges információt hordoz.
- **A lövedéket NEM a Gravecaller hozza létre**, csak `'gravecaller-projectile'` eventet
  emittál (x, y, irány) — ugyanaz a minta, mint a `Player.'fireball-cast'`-ja és a boss
  `'boss-projectile'`-ja. A `Level1Scene` készíti el a `Fireball`-t és játssza le a hangot.
- **Sprite + animációk:** ÖT külön textúra (`GRAVECALLER_TEXTURES`), a knight mintájára —
  a Phaser animációi (textúra, frame) párokat tárolnak, tehát a `play()` magától átvált.
  - **A csomag frame-mérete KEVERT volt** (96×96 vs. 128×128); az attack sheet ezért
    KIVÁGVA került a repóba. Lásd a **19. technikai tanulságot**.
  - Natívan **JOBBRA néz** (mint a CrowHarvester); a test majdnem központozott (közepe
    x=47, a frame közepe 48), a kompenzáció mégis a megosztott `systems/SpriteFacing.ts`-en
    megy — hogy a lény ne váljon kivétellé egy jövőbeli body-eltolásnál.
  - `BODY 20×38` a köpenyhez igazítva; `ORIGIN_Y = 45/96`, `FEET_OFFSET_Y = BODY_HEIGHT/2`
    (19) — **levezetett**, ebből jön a layout `GRAVECALLER_SPAWN_OFFSET`-je (20).
  - **VAN valódi death animáció** (52 frame) — a CrowHarvesternél nem volt. Ezért a fade
    `delay: DEATH_ANIM_MS`-szel indul: enélkül a lény összeesés közben tűnne el.
  - A `GetHit` sheet f1/f3 frame-jeibe **be van égetve a fehér villanás** (mint a
    CrowHarvesternél), tehát **tint sehol nincs**.
  - **A CAST telegraph-ját a találat NEM szakítja meg** (ugyanaz az elv, mint a bossnál):
    a windup közben eltalált lény lövedéke ettől még megérkezik, tehát látszania kell.
  - **A CAST slot-alapú** (40 ms/slot), mint a boss SLASH/CAST-ja: nem a teljes hosszt
    rögzítjük, hanem a slot-időt, mert a kioldás frame-jének (`f31`) pontos pillanatban
    kell képre kerülnie. A 47 frame-ből a statikus tartókockák ki vannak ritkítva; a
    staff FELEMELÉSE (`f23–30`) viszont sűrűn megy — az a telegraph.
- **Elhelyezés a Level 1-en: KÉT példány**, mindkettő platformon (a magasságkülönbség a lény
  lényege — az emeli a saját sávjába, és veszi ki belőle a talajon futó playert):
  - `E-platform-1` az **`E2`**-n, a korábbi CrowHarvester helyén (patrol/chase határok bitre
    változatlanok, a testszélessége is 20);
  - `F-caster` az **`F2`**-n, a Swinging Reaper után — lásd a Level1Scene szakaszt.
- **A LÖVEDÉK MAGASSÁGA ÉS A PLATFORMOK MAGASSÁGA ÖSSZETARTOZIK.** A bolt vízszintesen
  repül, a sávja `[casterY + PROJECTILE_SPAWN_OFFSET_Y ± PROJECTILE_SIZE/2]`, a `T` tetejű
  felületen álló player teste pedig `[T − PLAYER_BODY_HEIGHT, T]`. **Ha a kettő nem fedi
  egymást, a caster tüzel, de sosem talál** — ez a hiba jött elő az `E1`-en (lásd ott).
  Ezért van a `level1Layout.test.ts`-ben egy `CASTER_TARGETS` tábla: casterenként felsorolja,
  MELY felületeken álló playert kell eltalálnia, és a tényleges sáv-átfedést ellenőrzi.
  **Egy platform elmozdítása után ezt kell először megnézni.**
- **ISMERT, ELFOGADOTT KORLÁT:** a `VERTICAL_DETECTION_RANGE` (80) tágabb, mint az a sáv,
  amit a lövedék ténylegesen elér (~±26). Emiatt az `E3` platformon (top 242, 66 px-szel az
  `E2` fölött) állva az `E2` casterje ÉSZLEL és TÜZEL, de a bolt ~34 px-szel a player lába
  ALATT megy el. **User-döntés, hogy ez így marad** (a szigorítás megváltoztatná az `E2`
  caster feelingjét). A javítás iránya, ha valaha előkerül, lentebb a nyitott
  polish-tételek között van.

### Enemy 3 — Beast (`src/enemies/Beast.ts`, `BeastAnimations.ts`)

A `Project_plan.md` 11. pontjának utolsó, **eredetileg opcionális** lénye: *„gyorsabb,
agresszívebb"*, `PATROL → DETECT → CHARGE → ATTACK → COOLDOWN`. A pályán EGY példány áll, a
Level 2 legvégén (`H-beast-1`, a boss-ajtó előtti párkányon) — a korábbi `H-crow-2`
CrowHarvester helyén.

- **Miért pont oda:** a Level 2 addig tisztán „közelharci sétáló + álló lövő" párosra épül.
  A Beast egy harmadik nyomásformát hoz — **elkötelezett, telegrafált roham**, ami elől ki
  kell térni —, tehát a pálya egy ÚJ mechanikával zárul, közvetlenül a Mad King előtt.
- **A terv doboz-listája VÁLTOZATLANUL érvényes**, nincs benne új állapot: a `CHASE` a
  „DETECT" utáni közelítő állapot, a roham két fázisa (`CHARGE_WINDUP` + `CHARGE`) pedig a
  `CHARGE` doboz kifejtése.

**A ROHAM AZ ELSŐDLEGES TÁMADÁS, a közelharc csak közvetlen közelben** (user-kérés). Ez nem
adódik magától, és ez a lény legfontosabb tervezési döntése:

- A naiv „mindig közelíts" viselkedés pont az ellenkezőjét adná: az első roham után a Beast a
  player MELLETT áll, onnan a `CHARGE_MIN_RANGE` (180) elérhetetlen, tehát örökre közelharci
  gépezetté válna. **Ez a 27. tanulság rokona** — egy „mindig igaz" feltétel kiéhezteti a fő
  támadást.
- Ezért kapott a `CHASE` egy **pozicionáló ágat** (`applyChasePositioning()`), pontosan a
  `Gravecaller.applySpacing()` mintájára: ha a roham KÉSZ, de a player túl közel van, a Beast
  **HÁTRÁL**, hogy nekifutást nyerjen. Ebből egy olvasható ritmus áll össze:
  **roham → közelharc → hátrálás → roham**.
- **Hátrálni csak akkor hátrál, ha a roham tényleg elsülhetne**: cooldown alatt, vagy egy
  másik szinten álló playernél (ahová úgysem rohamozna) egyszerűen közelít és közelharcol.
  Enélkül 2,6 mp-ig menekülne a player elől. Regressziós teszt őrzi.
- **Sarokba szorítható:** a `chaseMinX/MaxX` peremén a hátrálás megáll (`velocity 0`), és a
  lény közelharcra vált — nem válik bábuvá. Szó szerint a Gravecaller döntése („sarokba
  szorítva viszont tüzel").

**A roham részletei:**
- Az **irány a windup ELEJÉN rögzül**, a roham EGYENES VONALÚ (a Wing-Breaker és a Mad King
  közös elve) — pont ettől kerülhető ki oldalra lépéssel vagy átugrással, tehát a 800 ms-os
  telegraph tényleges információt hordoz.
- **Piros telegraph-tint** (`0xff2222`), a projekt bevett „jön a roham" jele.
- `hasHitThisCharge` → rohamonként legfeljebb EGY sebzés. Visszalökés nincs (a projektben
  egyetlen enemy-találat sem lök vissza, és egy párkány szélén az kikerülhetetlen halált
  okozna).
- **A rohamot a felület PEREME is megállítja, nem csak a fal — ez a Beast valódi eltérése a
  bossoktól.** Azok arénája fallal zárt, ezért ott a `body.blocked` elég; egy 448 px-es
  párkányon álló Beast viszont enélkül leszaladna. A megtorpanás látványát a HIT frame-ek
  adják (a Mad King `Take-Hit`-jének szerepe).
- A `CHARGE_RECOVERY_MS` SZÁNDÉKOSAN azonos a `HIT_ANIM_MS`-szel (180): a `COOLDOWN` a
  támadás-animációra képződik le, tehát ha a megtorpanás hosszabb lenne a
  stagger-animációnál, a Beast a maradék időben buzogányt lendítene a levegőbe. A valódi
  punish-ablak nem ez, hanem a 2,6 mp-es `CHARGE_COOLDOWN_MS` — alatta a lény mozoghat és
  közelharcolhat, csak rohamozni nem tud.

**A közelharci windup (390 ms) MÉRT érték**, a Mad King fairness-módszerével. Pontblank
helyzetből (`HALF_BODY_WIDTH` 12 + a player fél teste 14 = 26 px) a kikerüléshez
`ATTACK_RANGE + 10 = 54 px` kell, tehát 28 px-t kell nyerni:

| válasz | idő |
|---|---|
| hátralépés (`MOVE_SPEED` 200) | 140 ms |
| álló ugrás (47 px emelkedés; a találat 2D távolságot néz) | 102 ms |
| + emberi reakcióidő | 250 ms |

Vagyis 390 ms mellett **MINDKÉT válasz** működik, nem csak az ugrás. **Lejjebb véve a
hátralépés kiesne** — unit teszt őrzi.

**Számok** (mind exportált, hogy a tesztek ne égessenek be nyers értéket):
`MAX_HP` 50 · `ATTACK_DAMAGE` 10 · `CHARGE_DAMAGE` 15 · `PATROL_SPEED` 55 ·
`CHASE_SPEED` 130 (> CrowHarvester 100) · `BACKOFF_SPEED` 90 · `CHARGE_SPEED` 320 ·
`CHARGE_MIN_RANGE` 180 · `CHARGE_MAX_MS` 900 (= 288 px út) · `CHARGE_COOLDOWN_MS` 2600 ·
`ATTACK_COOLDOWN_MS` 700 · `DETECTION_RANGE` 260 · `LOSE_RANGE` 360 ·
`VERTICAL_DETECTION_RANGE` 50.

**Sprite + animációk:** egyetlen 384×512-es lap (`goatman.png`), **6 oszlop × 8 sor,
64×64-es frame** (48 cella, ebből 41 rajzolt). A rácsot a teljesen átlátszó sor-/oszlop-
futamok igazolják; a frame-tartományokat alpha-bounding boxokkal és színosztályozással
azonosítottam, nem találgatással.

| animáció | frame-ek | tartalom |
|---|---|---|
| IDLE | `0–4` | álló póz, buzogány a vállnál |
| ATTACK | `6–11` | `f6–8` windup · **`f9` a csapás fehér íve** · `f10–11` kikövetkezés |
| RUN / WALK | `12–21` | felegyenesedett futás — UGYANAZ a 10 frame két tempóban |
| CHARGE | `24–33` | **fejlehajtott, szarvakkal előre rohanás**, buzogány hátul csüng |
| HURT | `36–37` | hátracsapódó test, fej hátravetve |
| BRACE | `42–44` | leengedett buzogány, megtámasztott állás → a roham telegraph-ja |

- **A csomagban VAN dedikált roham-animáció**, és pont ezért jó választás egy chargerhez: a
  Wing-Breakernél egy MEGTARTOTT pózt + afterimage-csíkot kellett használni, itt a gore-futás
  valódi rajzolt mozdulat. **A vezető él a SZARV** (a `CHARGE` frame-eken a jobb szélső
  oszlopok, x 56–62, sötétkék szarv-színűek; a világos acél buzogányfej ilyenkor hátul, alul
  van) — ezért a `CHARGE_HIT_RANGE` is a szarvak mért nyúlásából jön. **Ezzel elkerüli a
  Wing-Breaker nyitott polish-tételét** („a charge sebzése a boss TESTÉHEZ kötött, miközben a
  kasza 60 px-szel előtte jár").
- **NINCS death animáció** → a CrowHarvester bevált receptje (hit frame + `alpha: 0` tween +
  6 px süllyedés).
- **A hit-frame-ekbe NINCS beleégetve fehér villanás** — szemben a CrowHarvesterrel és a
  Gravecallerrel, ahol pont ez tette feleslegessé a tintet. A `f36–37` itt csak
  testtartás-változás, ezért a Beast a BOSSOK mintáját követi: 100 ms-os fehér
  `TintModes.FILL` villanás. A roham alatt a PÓZ marad (az animációt az `updateAnimation()`
  védi), a villanás viszont ott is szól — a `clearTintState()` pedig utána VISSZATESZI a
  piros telegraph-ot, különben egy jól időzített találat pont a legfontosabb pillanatban
  törölné le a player egyetlen figyelmeztetését (a Mad King azonos döntése). Unit teszt őrzi,
  a tint MÓDJÁVAL együtt (14. tanulság).
- **`SCALE = 1`, skálázás nélkül:** a rajzolt figura ~30×50 px (a player 28×46), tehát így is
  a pálya legnagyobb sima ellenfele; egy nem-egész skálázás pixel arton csak rontana.
- **A talp MINDEN animáción a frame y=64-nél van, árnyék nélkül** — ezért egyetlen
  talp-offset elég, animációnként nem csúszik. `FEET_OFFSET_Y = BODY_HEIGHT / 2` (22), és
  ebből jön a layout `BEAST_SPAWN_OFFSET`-je (23).
- **A test PONT a frame közepén ül** (az álló láb-sáv mért közepe 31,5, a body 20..44 →
  közepe 32), tehát az `applyFacing()` itt matematikailag no-op — mint a Mad Kingnél. Mégis a
  megosztott `systems/SpriteFacing.ts`-en megy (16. tanulság).
- **AZ EGYETLEN ÉRTELMEZÉSI DÖNTÉS:** hogy `f36–37` a HURT és `f42–44` a roham-brace, nem
  fordítva. Az `f36–37`-en a test hátracsapódik és a fej hátravetődik (találat-recoil), az
  `f42–44` leengedett buzogányú, megtámasztott állás. Ha kézi teszten rosszul olvas, a csere
  egy soros — vagy a windup a `CHARGE` első frame-jének (`f24`, már lehajtott fej)
  megtartására váltható.

**A `H-beast-1` elhelyezése ellenőrzött, nem örökölt.** A patrol-számok a korábbi
`H-crow-2`-től változatlanok (6890–6990), és ez kiszámolt: a Beast félszélessége 12 (a crow-é
10), de a `H-ledge` (6724–7172) peremétől 154, illetve 170 px-re marad, a `H-ladder-1`
kijáratától (6790) pedig 88 px-re — tehát a 80 px-es `LADDER_EXIT_CLEARANCE` továbbra is
teljesül. Az üldözési (= roham-) folyosó `[6748, 7148]` = **400 px**, bőven a 288 px-es
rohamút fölött; unit teszt őrzi.

**FIGYELEM — a Level 1 NEM támogatja a Beastet.** A `Level1Scene.spawnEnemies()` csak a
`gravecaller` ágat ismeri, tehát egy oda felvett `type: 'beast'` **NÉMÁN CrowHarvestert
szülne** (se a `tsc`, se a build nem szólna). Ezt egy unit teszt zárja ki
(`level1Layout.test.ts`), nem inert kód: ha a Level 1 valaha Beastet kap, ELŐSZÖR a scene-t
kell bővíteni a `Level2Scene` mintájára.

### Level1Scene (`src/scenes/Level1Scene.ts` + `src/levels/Level1Layout.ts`)

> **A geometria NEM a scene-ben él.** A `Level1Layout.ts` egy szándékosan Phaser-mentes
> adatmodul: `GROUND_SEGMENTS`, `PLATFORMS`, `ENEMY_SPAWNS`, `LADDER`, `DOOR`,
> `MID_CHECKPOINT`, `TUTORIAL_HINTS` + a geometria-helperek. Így a pálya invariánsai
> GameObject-mockolás nélkül unit-tesztelhetők (`tests/unit/level1Layout.test.ts`) —
> ugyanaz az elv, mint a `ParallaxBackground` pure `tilePositionForScroll()`-jánál.
> **Magic number nem kerülhet vissza a scene-be.**

- **6000×450-es pálya** (a magasság szándékosan = canvas magasság, így csak vízszintes
  kameragörgetés van; a létra is belefér a sávba). Nyolc szakasz: A–H, lásd fentebb
- **A talaj NEM folyamatos:** hat `GROUND_SEGMENTS` szegmens, a köztük lévő **öt hézag
  a szakadék** (640 / 160 / 160 / 130 / 400 px). A `groundGaps()` SZÁMÍTJA őket a
  szegmensekből, tehát nincsenek külön felsorolva — egy szegmens elmozdítása automatikusan
  átméretezi a szomszédos szakadékot
- **Az A szakasz gödre (320–960) a mozgás-tutorial lényege.** A start pad SZÁNDÉKOSAN rövid
  (0–320): a gödör és a három tutorial-platform belefér a kezdőképernyőbe, tehát a player
  egy pillantásra érti a feladatot, nem egy váratlan lyukba sétál. Eredetileg mind a három
  platform folyamatos talaj FÖLÖTT lógott — a player alattuk elfutott, és sosem kényszerült
  ugrani, vagyis a tutorial dekoráció volt. Az `A3` (846–974) 14 px-t **átlóg a `G2` fölé**,
  így a szakasz végén nem kell egy negyedik ugrás: a peremén lelépve biztonságosan ér földet.
  *Ez ELTÉR a layout-spectől* („Section A: no environmental hazards") — tudatos user-döntés,
  a `Project_plan.md` 14. pontja frissítve
- **Zuhanás-halál:** a FIZIKAI világ mélyebb a canvasnál (`WORLD_HEIGHT + FALL_DEPTH`),
  a KAMERA bounds-a viszont 450 marad → nincs függőleges görgetés, de a player láthatóan
  kizuhan a képből. A `FALL_DEATH_Y` (520) átlépésekor `takeDamage(getHP())` — nincs új
  Player-API, a meglévő HURT→`die()` lánc fut. **A `fallDeathTriggered` flag KÖTELEZŐ:**
  a HURT-lock 150 ms-a alatt a player még zuhan, tehát enélkül minden frame újra sebezne
  és új `delayedCall`-t ütemezne
- **A szakadékok MÉRETEZETTEK, nem szemre rakottak.** A layout a `Player` exportált
  `MOVE_SPEED`/`JUMP_VELOCITY`-jéből és a `config/physics.ts` `GRAVITY_Y`-jából számol:
  `MAX_JUMP_HEIGHT = 156`, `MAX_JUMP_DISTANCE = 250`. A `horizontalReachForRise(rise)`
  adja a tényleges hatótávot adott emelkedéshez (magasabbra ugorva rövidebbet lehet
  ugrani). A teszt ezzel **bejárja a pályát** (BFS a start szegmensről) és bizonyítja,
  hogy minden felület elérhető
- **14 platform** a `PLATFORMS` tömbben (adatvezérelt: az enemy patrol-határok ugyanebből a
  forrásból származnak, `platformTop/Left/Right` helperekkel). `H1` `oneWay: true` →
  `checkCollision.down = false`, a létra ezen megy át
- **KÉT platform magassága NEM szabadon hangolható**, mert egy Gravecaller lő rájuk (a
  bolt vízszintesen repül, tehát a magasság dönti el, hogy talál-e):
  - **`E1` (a gap3 lépőköve) `y = 328`, nem 352.** Az eredeti magassággal az `E2`-n álló
    caster ÉSZLELTE és lőtte az ott álló playert, a bolt sávja (`[276, 292]`) viszont
    6 px-szel a teste (`[298, 344]`) FÖLÖTT ment el — kézi teszten talált hiba. 328-cal a
    test `[274, 320]`, amiben a bolt sávja teljesen benne van.
  - **`F2` (a kasza utáni párkány) `y = 340` — PONTOSAN az `F1` szintje.** Lásd lentebb.
  - A `level1Layout.test.ts` „a lövedék ELTALÁLJA a cél-felületeken álló playert" tesztje
    ezt őrzi: az `E1` visszaállításával azonnal bukik.
- **9 enemy: 7 CrowHarvester + 2 Gravecaller** (az `E2` és az `F2` platformon — lásd az
  Enemy 2 szakaszt). A típust az `ENEMY_SPAWNS` opcionális `type` mezője adja, aminek a
  default-ja `'crow-harvester'` — ezért nem kellett a többi sorhoz hozzányúlni. A séta-körzetük
  (`patrolMinX/MaxX`) az `ENEMY_SPAWNS` adata, az ÜLDÖZÉSI (illetve a Gravecallernél
  ÁTHELYEZKEDÉSI) határuk viszont **levezetett**: az `enemyChaseBounds()` a felület
  pereméből (`EDGE_INSET`-tel behúzva) számítja, majd **elvágja a spike-mezőkkel**. Így egy
  platform elmozdítása vagy egy új tüskemező automatikusan átméretezi a pórázt, és nem lehet
  elrontani. A platformon állóknál a kettő egybeesik (a platform pereme MAGA a patrol-határ)
- **Az `F` szakasz (Swinging Reaper) ranged nyomást is kapott.** A kaszától jobbra, a
  `G6` part fölött lebeg az **`F2`** párkány (4736..4864, top **332** = pontosan az `F1`
  szintje), rajta az **`F-caster`** Gravecallerrel. A pozícióját két kényszer fogja közre,
  és a köztük lévő sáv szűk — ezért van mindkettőre unit teszt:
  - **balról** a kasza söprési sávja + `REAPER_ENEMY_CLEARANCE` (80) → a patrol bal széle a
    testtel együtt ≥ 4739,8; a `patrolMinX = 4770` ezt 20 px-szel teljesíti;
  - **jobbról** az a követelmény, hogy az EGÉSZ `F1` a caster `DETECTION_RANGE`-én belül
    legyen (tüzeljen, amint a player odaugrik) → `4810 − 4436 = 374 ≤ 400`.
  - **A bolt a LÉZENGÉST bünteti, nem a tiszta átkelést** (user-döntés): 720 ms windup +
    ~1,2 s repülés = ~1,9 s a landolástól, miközben a kasza félperiódusa 1,2 s. A telegraph
    (felemelt staff) viszont AZONNAL látszik, tehát a nyomás megvan. **Ez szándékos, nem
    hiányosság:** `F1` fölött söpör a penge és alatta 400 px szakadék van — egy kikerülhetetlen
    találat ott igazságtalan halál lenne (a layout-spec „avoid unavoidable damage" elve, amin
    a tüskék vízszintes visszalökése is elbukott).
  - Az `F2` az `F1`-ről 172 px-es ugrással (épp a `MAX_SAFE_GAP` 175 alatt) VAGY a `G6`
    talajról felugorva érhető el — utóbbi a kényelmes út a caster megöléséhez.
  - A `G-well` dekor emiatt költözött **4790 → 4960**: a régi helyén az `F2` ALÁ esett volna,
    és a kút teteje (353) 5 px-re maradt volna a lap aljától (348).
- **A két enemy-fajta KÉT KÜLÖN tömbben él** (`enemies`, `gravecallers`), de UGYANAZT a négy
  regisztrációt kapja egy ciklusban (talaj-, platform-collider + kard- és tűzgolyó-overlap).
  A handlerek csak a `Damageable` felületet használják, tehát típusfüggetlenek; a frissítést
  a `LevelEnemy` interfészre írt `updateEnemies()` végzi. **Nem közös ős, hanem strukturális
  tipizálás** — a következő enemy típus így egy tömb + egy `spawnEnemies()` ág
- **A Gravecaller lövedékei külön tömbben** (`enemyProjectiles`), mert a PLAYERT sebzik —
  ugyanaz a minta, mint a `BossScene.bossProjectiles`-e (overlap a playerrel, collider a
  terepre, helyben-splice takarítás). A `clearFireballs()` respawnkor ezt is üríti
- **Enemy-respawn:** a player halálakor a `resetEnemies()` megsemmisíti és a layout-adatból
  újraspawnolja az összes lényt (a `clearFireballs()` mindkét lövedék-tömböt is). **A tömbök
  IDENTITÁSA nem változhat** (splice + push, sosem új tömb): a `create()`-ben regisztrált
  colliderek/overlapek erre a referenciára kötődnek, és a Phaser minden physics stepben
  újraiterálja a tartalmát (lásd 2. tanulság). Ehhez kellett a `CrowHarvester.destroy()` és a
  `Gravecaller.destroy()` override — lásd a 18. tanulságot
- **Két checkpoint:** a pálya végi ajtó (**E** billentyű) és egy **köztes** (x=3000, a
  spike-szakasz után), ami **ÉRINTÉSRE** aktiválódik. Utóbbi szándékosan más input, hogy ne
  versenyezzen az ajtó promptjával; a visszajelzés a jelölő kivilágosodása + egy rövid felirat
- **Tutorial feliratok** (`src/ui/TutorialHint.ts`): a mozgás-súgó `triggerX: 140`, tehát
  gyakorlatilag azonnal megjelenik (a player `START_X = 100`-on éled), és 4 mp-ig áll — a
  gödör pereméig (320) csak ~1,1 mp, tehát a `Space / W — ugrás` MÉG A KÉPERNYŐN VAN, amikor
  a player odaér. Ezért nem kell külön „ugorj" felirat a peremre. A súgók CSAK friss
  játékban jelennek meg: boss-vereség után az ajtó-checkpointon éledünk újra, ahol mindkét
  trigger átlépettnek számítana
- **Létra** a pálya végén (x=5678): `tileSprite` a vizuál (32px-es csempeszélességgel), külön
  `Zone` statikus bodyval a fizika (28px — a RAJZOLT létra szélessége). A scene `update()`-je
  **szinkron** `this.physics.overlap(player, ladderZone)`-t használ, NEM `physics.add.overlap`
  callbacket — utóbbi csak a scene `update()` UTÁN futna le, ami 1 frame késést okozna a
  mászásban. **Hátfal nincs** (a `pillar-placeholder` oszlop törölve): a létra a `H1`
  platformnak van támasztva, a fokok között a parallax háttér látszik át
- **Checkpoint-ajtó** (x=5948, `H1` jobb vége): ugyanaz a szinkron `physics.overlap()` minta,
  mint a létránál (`doorZone`). A zóna a boltív **nyílását** fedi (64×61), nem a teljes
  csempét — így a prompt pontosan akkor jön elő, amikor a player láthatóan az ajtóban áll.
  Közelben **E**-re: `checkpoint.activate()` + 500ms
  `cameras.main.fadeOut()` + scene-váltás. A prompt-szöveg csak akkor látszik, ha a player
  a zónában van és még nincs folyamatban a transition (`isTransitioning` flag)
- **Az ajtó célja a `bossDefeated` registry-flagtől függ**: ha a boss még él → `BossScene`,
  ha már legyőzték → `Level2Scene` (a prompt szövege is ehhez igazodik). Enélkül a Level 1-re
  visszatérve újra a már teljesített boss fight indulna
- **A player MINDIG a checkpointról spawnol**, nem a beégetett pálya-elejéről: a boss-arénában
  elhalálozva ide térünk vissza, és ilyenkor az aktivált checkpoint (az ajtó) a helyes
  belépőpont. Friss játékban a `CheckpointSystem` default-ja a pálya eleje (`START_X/START_Y`),
  így az első indítás viselkedése változatlan
- **Respawn**: az `update()` minden frame-ben nézi `player.isDead()`-et; ha igen és még
  nincs ütemezve respawn (`respawnScheduled` flag), `RESPAWN_DELAY_MS` (1200ms) után
  lekéri a `CheckpointSystem`-től az aktuális respawn-pontot és meghívja `player.respawn(x,y)`-t.
  **Az enemyk és a lövedékek IS visszaállnak** (`resetEnemies()` + `clearFireballs()`, a
  `player.respawn()` ELŐTT). *Ez VÁLTOZÁS: korábban szándékosan csak a player állt vissza
  („ne büntesd duplán"), de a 6000 px-es, szakadékokkal tagolt pályán az azt jelentené, hogy
  egy nehéz szakaszt ismételt halálokkal le lehet koptatni. User-döntés, a Project_plan.md
  14. pontja frissítve.*
- **A `checkpoint` a Phaser `registry`-ben perzisztál** (`this.registry.get/set('checkpoint', ...)`),
  NEM sima `Level1Scene` mezőként — mivel az ajtónál az E lenyomása egyszerre aktiválja a
  checkpointot ÉS azonnal átvált a `BossScene`-re, egy sima mezőben tárolt checkpoint minden
  `create()` újrafutáskor (pl. `BossScene`-ből visszatéréskor) nulláról jönne létre és
  elveszne. A registry ezt túléli, mert Game-szintű, nem scene-szintű adattár.
- **Parallax háttér (Phase 8)**: három réteg a `systems/ParallaxBackground.ts`
  `LEVEL1_BACKGROUND_LAYERS` adattömbjéből, a `create()` legelején létrehozva, az
  `update()` első sorában frissítve (`background.update(cameras.main.scrollX)`):

  | réteg | textúra | scrollFactor | depth | elhelyezés |
  |---|---|---|---|---|
  | ég | `bg-sky` | 0.10 | −30 | 0..450, függőlegesen kifeszítve (`tileScaleY = 450/384`) |
  | hegyek | `bg-mountains` | 0.30 | −25 | top 126, 1:1 |
  | városrom | `bg-ruins` | 0.50 | −20 | top 126, 1:1 |

  - **A rétegek `setScrollFactor(0)`-val a KAMERÁHOZ vannak rögzítve**, a mozgást a
    `tilePositionX` adja — NEM világméretű tileSprite `setScrollFactor(f)`-fel. Így a
    réteg mindig pontosan kitölti a képernyőt, és nem kell a `WORLD_WIDTH`-hez méretezni.
  - **A sziluettek alja szándékosan a képernyő alá lóg**: `SILHOUETTE_BOTTOM_Y = 510`,
    tehát `top = 510 - 384 = 126`. Ez viszi le a horizontot (hegycsúcsok ~289, városrom
    teteje ~319), és tolja a városrom tömör alsó részét nagyrészt a talaj mögé — különben
    ~125px sima sötét sáv állna a játéktér mögött. **Ez az egyetlen hangolópont, ha a
    horizontot mozgatni kell.**
  - Csak az ég nyúlik függőlegesen (közel egyenletes színátmenet, nem látszik rajta);
    a sziluettek 1:1-ben maradnak, hogy a peremük éles legyen.
  - `setBackgroundColor('#673838')` = az ég legfelső sorának színe. A háttér amúgy is
    kitakarja, de így egy letterbox / a `create()` előtti pillanat sem villant feketét.
    A `main.ts` game-szintű `#0a0a0f`-je változatlan — arra a `BossScene` épül.
- **Terrain (Phase 8, 10. iteráció)**: a talaj, a platformok, a létra és az ajtó valódi
  csempéket kapott (`assets/tiles/cathedral/`, lásd `src/levels/LevelTileset.ts`). A fizikai
  static sprite-ok `setVisible(false)`-ok, a látvány külön tileSprite + végzáró képek.
  *(Az 5 korábbi `pillar-placeholder` parallax oszlopot a valódi háttérrétegek váltották ki,
  a létra hátfal-oszlopát pedig a 10. iteráció törölte.)*
- **Hangulati propok (Phase 8, 11. iteráció)**: 11 nem ütköző háttér-dekoráció
  (`DECOR_PROPS` a layoutban, `createDecorProps()` a `LevelDecor.ts`-ben). Nincs physics
  bodyjuk, és a `DECOR_DEPTH = -10` miatt a player/enemyk előttük mennek el
- Kódból generált placeholder már csak a hazardoké (tüske, reaper, checkpoint-jelölő) és a
  lövedékeké — `BootScene.ts` `createPlaceholderTextures()`

### Boss — The Grafted Wing-Breaker (`src/bosses/GraftedWingBreaker.ts`, `GraftedWingBreakerAnimations.ts`)
- State machine: `DORMANT → APPROACH → SLASH / PROJECTILE / SPELL / CHARGE_WINDUP → CHARGE → COOLDOWN → DEAD`
- **Sprite + animációk (Phase 8):** két 1120×744-es sheet (effektes + `_no-Effect`), mindkettő
  **8×8 db 140×93-as frame, AZONOS indexeléssel**: `idle 0–7`, `walk 8–15`, `attack 16–25`,
  `hurt 26–28`, `death 29–38`, `cast 39–47`, `spell 48–63`. A sorrend ellenőrizve (az egyedi
  PNG-k pixel-hash-e párosítva a sheet frame-jeivel). A `_no-Effect` sheetből **pontosan egy
  frame** kell: a `clean[20]` dash póz.
  - **`SCALE = 2`** — a rajzolt karakter 1:1-ben csak 47×56 px (a player 28×46), ami bosshoz
    kevés. Egész szám, tehát minden forrás-pixel tiszta 2×2-es blokk, a pixel art éles marad.
    Minden `*_PX` konstans FORRÁS-pixelben van, a világ-koordinátás értékek ebből származnak.
  - **Natívan BALRA néz** (a CrowHarvester jobbra), és a karakter a frame **jobb** oldalán ül
    (közepe x=106, a frame közepe 70) → dupla off-center probléma. A kompenzációt a
    **megosztott `systems/SpriteFacing.ts`** végzi, `nativeFacing: 'left'`-tel.
  - `ORIGIN_Y = 64/93` → a talp a `sprite.y + 54`-nél (`FEET_OFFSET_Y`), tehát a `BossScene`
    `BOSS_SPAWN_Y`-ja is ebből számol, nem beégetett félmagasságból.
  - **A hatótávok és az időzítések LEVEZETETTEK:** `SLASH_RANGE = BLADE_REACH_PX(69) * SCALE`
    (a kasza mért nyúlása a csapás frame-jén), `SLASH_STARTUP_MS = SLASH_WINDUP_MS`,
    `PROJECTILE_STARTUP_MS = CAST_RELEASE_MS`, `CHARGE_HIT_RANGE = HALF_WIDTH + player fél + 8`,
    `PROJECTILE_SPAWN_OFFSET_Y = FEET_OFFSET_Y − player fél testmagasság`. **Az animációs modul
    az időzítések forrása** — a boss osztály importál belőle, sosem fordítva (körkörös import).
  - **A boss NEM flinchel** találatra: a hurt animáció megszakítaná a telegraph-jait. A
    `Hurt` frame-ek helye a **falnak ütköző charge staggerje** — ott érdemelt, és megmutatja
    a player-nek a punish-ablakot.
  - A projectile lila windup-tintje **törölve** (a telegraph ott az animáció).
    A **piros charge-telegraph marad** (Project_plan 12. pont), és **2026-09-01 óta a slash
    is kapott ARANY telegraph-ot** — lásd lentebb a fairness-hangolást. *(A korábbi
    „a slash sárga windup-tintje törölve" döntés tehát VISSZAVONVA: a 400 ms-os windupnál az
    animáció önmagában sem adott elég időt, a 900 ms-osnál pedig félreérthetetlen jelzés kell
    ahhoz, hogy a player tudja, most van itt az ütés-és-kitérés ablaka.)*
- **`DORMANT`** = a boss entrance ideje: nem mozog, nem támad, és **nem is sebezhető**.
  A scene a belépő-animáció végén hívja az `activate()`-et
- HP: 240 (`MAX_HP`). **Phase 2 a 50%-nál** (`PHASE2_HP_RATIO`): gyorsabb mozgás
  (`MOVE_SPEED_P1` 70 → `MOVE_SPEED_P2` 120) + megnyílik a charge támadás. A váltás egyszer
  emittál `'boss-phase-change'`-t, a scene erre rak "PHASE II" szöveget + camera shake-et
- **Támadás-választás determinisztikus** (NINCS `Phaser.Math.Between`): reaktív slash +
  körforgás a többi támadáson — a részleteket lásd lentebb. Ez egyszerre teszi nem-flaky-vá a
  unit teszteket és felismerhetővé a boss mintáit
- A **projectile és a charge saját cooldownnal** rendelkezik — enélkül a boss távolról
  végtelenül tüzelne, és soha nem indulna el a player felé
- **A boss nem hozza létre a lövedéket**, hanem `'boss-projectile'` eventet emittál (x, y, irány),
  a `BossScene` készíti el a `Fireball`-t — ugyanaz a minta, mint a `Player` `'fireball-cast'`-ja.
  Így a boss osztály nem függ a `Fireball`-tól, és unit tesztben az emisszió megfigyelhető
- Lövedék-magasság: `PROJECTILE_SPAWN_OFFSET_Y = 31` a boss középpontjához képest — ez pont a
  player mellmagassága, tehát **át lehet ugrani** (Project_plan.md 12. pont követelménye).
  Következmény, amivel élni kell: mivel a boss 2,4×-e a playernek, a lövedék az ő
  térdmagasságából indul, nem a felemelt kaszából
- **Shadow Spell (Phase 8, Phase 1-ben ÉS Phase 2-ben)**: a boss a `Cast` animációval a player
  AKKORI x-ére idéz egy árny-oszlopot (`SPELL_CAST_MS = 500` után rögzül a célpont). Az oszlop
  előbb izzásként lebeg 76–112 px-szel a talaj felett (`SPELL_TELEGRAPH_MS = 960`), és csak
  `SPELL_IMPACT_MS = 1140` után csap le → **oldalra kilépve kikerülhető**, ugrással NEM
  (a becsapódás csak vízszintes távolságot néz, mert az arénában egyetlen talajszint van).
  Sebzés 20, cooldown 5 mp. A boss — a lövedékhez hasonlóan — csak a `'boss-spell'` eventet
  emittálja (célpont x + talaj y), a sprite-ot a `BossScene` rakja ki; a **sebzés viszont a
  boss osztályban marad**, hogy unit-tesztelhető legyen
- **A támadás-választás KÖRFORGÁS, nem prioritási sor.** A slash reaktív: `≤ SLASH_RANGE`
  (138) távolságon belül mindig ő nyer, és **nem forgatja** a rotációt. A másik három,
  „elkötelezett" támadás az `ATTACK_ROTATION = ['PROJECTILE', 'SPELL', 'CHARGE']` körön megy
  végig: a boss ott veszi fel, ahol legutóbb abbahagyta, és az első ELÉRHETŐT indítja. A
  cooldown-kapuk (`canShoot`, `canSpell`, `canCharge`) és a távolsági feltételek
  (`>160`, `>160`, `>200` vízszintesen + Phase 2) csak **szűrők** a rotáción belül. A nem
  elérhető támadást átugorja, és a mutató **csak a ténylegesen elsütött** támadás mögé lép,
  tehát az átugrott a következő körben előbb jön sorra
- **Az `enterPhase2()` a rotációt a charge slotjára állítja**: a „PHASE II" felirat után
  azonnal a fázis szignatúra-mozdulata jön, nem egy lövedék
- **Miért nem prioritási sor (fontos tanulság):** eredetileg az volt, és Phase 2-ben a boss
  KIZÁRÓLAG charge-ot és slash-t használt. A `canCharge` ugyanis pontosan abban a
  `delayedCall`-ban áll vissza `true`-ra, ami a bosst `COOLDOWN`-ból `APPROACH`-ba viszi —
  vagyis a 3 mp-es „charge cooldown" **maga az állapot-lock**, nem külön kapu, tehát a döntés
  pillanatában a charge mindig kész volt. A sor élén álló támadás így monopolizálta a fázist,
  a projectile/spell pedig csak a 160–200 px-es sávban tudott volna elsülni — ahová a roham
  után soha nem került a boss. **Ha egy támadás cooldownja a state-lockkal egyszerre jár le,
  prioritási sorban garantáltan monopolizál**
- Charge: `CHARGE_WINDUP_MS` (1000ms) piros telegraph-tint, az **irány a windup ELEJÉN rögzül**
  (egyenes vonalú roham, nem követi a playert), roham közben `hasHitThisCharge` miatt
  legfeljebb egyszer sebez, falnak ütközve (`body.blocked.left/right`) idő előtt véget ér,
  utána 3 mp `CHARGE_COOLDOWN_MS` csend
- **A dash látványa** (a csomagban nincs dash animáció): a `CHARGE_WINDUP` az `Attack f16–19`
  hátrahúzott-kasza pózán áll meg, a `CHARGE` pedig a tiszta sheet **megtartott** `clean[20]`
  kitörés-pózán — a kettő animáció-folytonos. A sebesség érzetét a `systems/AfterImageTrail.ts`
  adja hozzá (50 ms-onként egy halványuló másolat). A csíkot a **scene** vezérli
  (`chargeTrail.update(boss.bossState === BossState.CHARGE)`), nem a boss osztály — így az
  továbbra sem hoz létre scene-objektumot
- A `takeDamage()` hit-villanása **szándékosan nem törli a telegraph-okat** (sem a charge
  pirosát, sem a slash aranyát) — a player azokból olvassa ki, hogy mi jön. Az `endCharge()`
  és a slash csapás-pillanata viszont mindenképp törli (ott `resetTint()` megy, nem az
  állapotfüggő `clearTintState()`, mert a state ekkor még CHARGE, illetve SLASH)
- `DIRECTION_DEADZONE` (6px), ugyanaz a védelem, mint a CrowHarvesternél: a boss ne pörögjön
  balra-jobbra, ha a player pont felette áll az aréna platformján
- UI **nincs** az osztályban (se HP-szöveg, se bar) — azt a scene rajzolja. Ez tartja a
  boss unit-tesztelhetőnek a `fakePhaser` minimális `MockSprite` felületén

#### FAIRNESS-HANGOLÁS — a kardcsapás windupja (2026-09-01, kézi teszt után)

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

### BossScene (`src/scenes/BossScene.ts`)
- **Fix 800×450-es aréna, NINCS kameragörgetés** (`startFollow` sincs): a boss, a player és a
  HP-bar mindig egyszerre látszik, a telegraph mindig olvasható, és a jövőbeli visual
  regression baseline determinisztikus
- **Háttér (Phase 8)**: egyetlen `add.image(400, 225, 'bg-boss-arena').setDepth(-30)`,
  romos gótikus katedrális. **Szándékosan NEM `ParallaxBackground`**: a kamera fix,
  nincs mit eltolni, és a kép pontosan 800×450, tehát skálázni sem kell.
  - **A PNG származtatott asset, nem másolat.** A forrás
    `2D helper/level/Bossbackground_1.png` (1672×941). A rajzolt padló fényes felső pereme
    a forráson `y=767`-nél van (méréssel igazolva: a 768–769. sor a fényesség-csúcs, +53 és
    +18 ugrással); egy sima arányos 800×450-re kicsinyítés ezt `y=367`-re tenné, tehát a
    player a rajzolt perem ALATT, a sötét falban állna. Ezért a kép egy **1663×935-ös
    kivágásból** (bal-felső sarok `4, 0`) lett 800×450-re kicsinyítve — így a padlóél
    pontosan a `GROUND_TOP = 369`-re esik. **Ha a `GROUND_TOP` valaha változik, a képet
    ÚJRA kell generálni** — a képlet: `cropW = FLOOR_SRC_Y * 800 / GROUND_TOP`,
    `cropH = cropW * 450 / 800`, `cropY = 0`.
  - **A kép ÚJRAGENERÁLÓDOTT 2026-09-01-én**, amikor a `GROUND_TOP` 418 → **369** lett (lásd
    lentebb, a párbeszéd miatt). A korábbi változat egy 1467×825-ös kivágás volt, oldalanként
    103px-et dobva a szimmetrikus képből — az új crop tehát **KEVESEBBET vág**, a szélső
    romos ívek visszakerültek.
  - `setTint(BACKGROUND_TINT)` = `0xb0b0b0` (69%-os sötétítés). A nyers festmény olyan
    világos és részletgazdag, hogy elnyomná a bosst és különösen a charge **piros**
    telegraph-ját — ami korábban egy majdnem fekete (`#100810`) háttéren villant.
    Ez az egyetlen hangolópont, ha világosabb/sötétebb kell.
  - **A talaj (`ground-placeholder`) `setVisible(false)`** — a body aktív marad, csak nem
    rajzolódik. A háttéren a padlóél alatt a rajzolt kőfal-homlokzat van, ami pont ezt a
    szerepet tölti be; a szürke téglalap kitakarná.
- **`GROUND_TOP = 369` — 418 VOLT (2026-09-01-ig).** A változás oka a párbeszéd: a
  `ui/Dialogue` panelje a járható felszín ALÁ ül és `PANEL_RESERVE_PX` (75) px-t foglal,
  tehát `GROUND_TOP + 75 ≤ 450` a kényszer — 418-cal a panel kilógott volna a képből.
  Ezzel **mind a NÉGY párbeszédes aréna padlóvonala 369**. A `GROUND_CENTER_Y` innentől
  LEVEZETETT (`GROUND_TOP + 16`), nem beégetett 434, és a `BOSS_SPAWN_Y` már eddig is a
  `GROUND_TOP`-ból jött, tehát magától követte.
- **A harc PÁRBESZÉDDEL nyit** (`WING_BREAKER_DIALOGUE`, 4 sor — a többi bossnál 6, mert ez a
  játék ELSŐ harca: itt még nincs mit felidézni). A szerkezet betű szerint a `Boss2Scene`-é:
  `create() → startDialogue() → startEntrance() → beginFight()`, a `PlayerController` CSAK a
  `beginFight()`-ban jön létre (a konstruktora regisztrálja a J/F listenereket, tehát nem
  elég az `update()`-jét kihagyni), az `update()` pedig `(_time, delta)`-t vesz, mert a
  párbeszéd a scene delta-idejéből ketyeg.
  **A párbeszéd VÉGIGJÁTSZÁSONKÉNT EGYSZER fut le** (2026-09-01): vereség után a Level 1
  ajtaján visszalépve egyből a cím-kártya jön — lásd a „BOSS-PÁRBESZÉD MEMÓRIA" blokkot.
  *(Korábban minden bukott próbálkozás után elölről végigment.)*
  - A 3 `pillar-placeholder` + 1 `door-placeholder` dekoráció **törölve** (a festményen
    valódi oszlopok és oltár van). A `createDecor()` helyére `createBackground()` lépett.
  - **A két aréna-platform TÖRÖLVE** (Phase 8, 6. iteráció — user döntés). Az aréna padlója
    teljesen üres: a charge elől vízszintesen kitérve vagy a roham fölött átugorva, a Shadow
    Spell elől oldalra lépve lehet menekülni — mindkettőhöz akadálymentes padló kell, és így
    a 108px magas boss sem akadhat platformba. Ezzel a `platform-placeholder` teljesen
    kikerült a `BossScene`-ből.
- Folyamatos, akadálymentes talaj (nincs lebegő platform)
- **Player és boss között SZÁNDÉKOSAN nincs collider**: a sebzés a támadás-hitboxokon megy,
  így nem tolják egymást a pálya szélére
- Belépő: `fadeIn` + a boss neve be/kifadel (tween `hold` + `yoyo`), utána `boss.activate()`
- **Győzelem**: `registry.set('bossDefeated', true)` → `NarrationScene` (a `BOSS_VICTORY_NARRATION`
  szöveggel) → `Level2Scene`
- **Vereség**: fade → `Level1Scene`, ahol a player a checkpointon (az ajtónál) éled újra és
  **E**-vel léphet be ismét; a boss ilyenkor friss HP-val indul

### Hazardok (`src/hazards/`)

Környezeti veszélyek — az enemyktől eltérően **folyamatos érintkezésűek**, és ez az egyetlen
lényeges különbség, amiből minden más következik.

**`HazardDamage.ts` — a közös i-frame kapu.**
- `HAZARD_INVULNERABILITY_MS = 900` + a pure `HazardDamageGate` (`canDamage(now)` /
  `register(now)` / `reset()`). Phaser-mentes, ezért mockolás nélkül tesztelhető.
- **Miért kell:** a `Player.takeDamage()` szándékosan NEM néz HURT állapotot, csak DEAD-et —
  egy enemy-csapásnál ez helyes, mert az diszkrét esemény. Egy tüskén ÁLLVA viszont a scene
  minden frame-ben (60×/s) sebezne, és a 100 HP két másodperc alatt elfogyna. A playernek
  nincs általános sebezhetetlenségi rendszere; ez a kapu a legkisebb változtatás, ami ezt
  megoldja anélkül, hogy a `Player`-hez hozzányúlnánk.
- **EGYETLEN, MEGOSZTOTT példány** a `Level1Scene`-ben minden hazardra (tüske most, reaper
  a 3. iterációban): egy tüskébe esve ne lehessen ugyanabban a pillanatban a kaszától is
  sebződni. A `create()`-ben ÉS respawnkor is `reset()`-elni kell (class field initializer,
  tehát scene-restartkor nem épül újra — lásd 3. tanulság).
- A 900 ms-nak **gameplay-jelentése van**: a 128px-es mezőn `MOVE_SPEED` (200 px/s) mellett
  640 ms átkelni, tehát egy nekifutás PONTOSAN egy találatot ér. Unit teszt őrzi, hogy az
  ablak a 640 ms fölött marad.

**`SpikeField.ts` — statikus tüskemezők (D szakasz).**
- **A látvány és a hitbox KÜLÖN objektum**, a létra mintájára: egy `tileSprite` csempézi a
  grafikát a mező hosszában, a sebzést egyetlen static bodys `Zone` adja.
  **Ez nem stílus-kérdés:** a `SPIKE_HITBOX_INSET_X` (4px) behúzás így a MEZŐ két szélére
  vonatkozik. Csempénkénti bodyk mellett a behúzások **sebezhetetlen réseket nyitnának a
  tüskék KÖZÖTT**, ahol a player büntetlenül megállhatna. Unit teszt őrzi.
- A mezők NEM ütköznek (csak overlap): át lehet gyalogolni rajtuk, sebzés árán. A scene
  **szinkron** `physics.overlap()`-pel teszteli őket, mint a létrát és az ajtót.
- **A visszalökés CSAK FÜGGŐLEGES** (`SPIKE_KNOCKBACK_Y = -260`). Volt vízszintes összetevő
  is („tolja vissza, amerről jött"), de manuális teszten kiderült, hogy **saját magának okoz
  egy második találatot**: a hátrafelé tolás ~36px haladást és ~150ms-ot vesz el, amitől az
  átkelés 970 ms-ra nyúlik — túl a 900 ms-os ablakon. A player egyetlen hibáért kétszer
  fizetett, és a másodikat a JÁTÉK REAKCIÓJA okozta: pont az, amit a layout-spec
  „avoid unavoidable damage" pontja tilt. Vízszintes lökés nélkül a lendület megmarad (a
  HURT-lock nem nyúl a velocityhez), és az átkelés egy találat. Aki MEGÁLL a tüskéken,
  ablakonként újra sebződik — az már az ő döntése.
- **Az enemyk nem sétálnak a tüskékbe, és ehhez NINCS enemy-kód.** Tisztán layout-kérdés: a
  `D-1` CrowHarvester patrol-határa (2460–2700) nem éri el a mezőt (2740–2868). Unit teszt
  őrzi, hogy egyetlen enemy patrol-tartománya se metsszen spike-mezőt.

**`SwingingReaper.ts` — lengő kasza (F szakasz), az első MOZGÓ hazard.**
- A mag egy **pure** függvény, a `ParallaxBackground.tilePositionForScroll()` mintájára:
  `swingAngleAt(t, period, maxAngle, phase) = maxAngle · cos(2π(t+phase)/period)`, mellette a
  szintén pure `bladePositionAt(def, angle)`. **Determinisztikus, `Phaser.Math.Between`
  NÉLKÜL** — ugyanaz az elv, amiért a boss támadás-választása is az; a spec kifejezetten
  megköveteli („Movement is deterministic"), és csak így tanulható meg a minta.
- **Koszinusz, nem szinusz:** `t = 0`-nál a penge a szélsőállásban indul, nem középen — így a
  pálya betöltésekor egy teljes, tiszta lengés látszik.
- Az osztály `update(deltaMs)`-sel akkumulálja az időt, frame-enként újrarajzolja a láncot
  (`Graphics`) és mozgatja/forgatja a penge-sprite-ot. **A forgatás `-angle`:** a Phaser
  rotationje az óramutatóval egyező (a képernyő y-a lefelé nő), tehát egy lefelé lógó
  sprite a kötél irányába `-angle`-lel áll be.
- **A lengés a scene indulásától fut, és halál/respawn NEM állítja vissza a fázist.** Ez
  szándékos: az inga folyamatos, a player a partra érve mindig egy futó mintát lát — pont
  azt kell végignéznie, mielőtt ugrik.
- **Visszalökés SZÁNDÉKOSAN nincs** (szemben a tüske függőleges popjával). A penge egy 400px-es
  szakadékot áthidaló platform fölött söpör; egy oldalirányú lökés a szakadékba taszítaná a
  playert, tehát a találat halált okozna, amire nem lehet reagálni — ugyanaz a hiba, mint a
  tüskék vízszintes lökésénél. Konzisztens is: a projektben egyetlen ENEMY-találat sem lök vissza.
- **A geometria a 250/156-os ugrás-plafonhoz van méretezve** (`REAPERS` a `Level1Layout.ts`-ben):
  horgony (4500, 84), kötélhossz 226, ±45°, periódus 2400 ms.
  - a penge alsó pontja (4500, **310**) — az `F1` teteje 332, a rajta álló player középpontja
    308 → a penge végigsöpri a platformot, **nem lehet rajta megállni**;
  - a ±45°-os szélsőállások (4340/4660, y=**244**) a talajszinten álló playertől (y≈394)
    155 px-re → **a két part biztonságos**.
  - Ebből adódik a megoldás: a partról végignézni egy lengést, és a TÚLOLDALI szélsőállásnál
    ugrani, mert onnan a penge elfelé indul. **Manuális teszten igazolva:** rossz fázisban
    áthaladásonként 20 sebzés, jó fázisban a teljes átkelés 0.
- A sebzést — a tüskékhez hasonlóan — a **scene** alkalmazza a megosztott `hazardGate`-en át;
  az osztály csak a `hitsPlayer(x, y)` sugár-alapú döntést adja (mint a
  `CrowHarvester.resolveAttackHit()` és a boss `CHARGE_HIT_RANGE`-e).

### Level 2 látvány (`levels/GothicTownTileset.ts`, `LevelTerrain.ts`, `LevelDecor.ts`)

> A pálya GEOMETRIÁJA a `levels/Level2Layout.ts`-ben él (Phaser-mentes adatmodul, mint a
> Level 1-nél); ez a szakasz csak a LÁTVÁNYRÓL szól. Forrás: **GothicVania Town**
> (`PNG/environment`), public domain.

**Parallax — KÉT réteg** (`LEVEL2_BACKGROUND_LAYERS`), a Level 1 három rétegével szemben:

| réteg | textúra | scrollFactor | depth | top | height |
|---|---|---|---|---|---|
| ég + hegyek | `bg-town-sky` (384×450) | 0.10 | −30 | 0 | 450 |
| város-sziluett | `bg-town` (768×450) | 0.30 | −25 | `TOWN_TOP` (142) | 308 |

- **EGYIK SEM nyúlik függőlegesen** (`stretch: false`). A Level 1 ege sima színátmenet, azon
  a nyújtás nem látszik; ezek viszont felhőket és hegygerincet tartalmaznak, amiken egy
  288 → 450-es (1.5625×) nyújtás láthatóan torzítana. Helyette **a PNG-k már 450 magasak**,
  a forrás egyszínű alsó sávjának veszteségmentes toldásával — lásd a 21. tanulságot.
- **A `TOWN_TOP` LEVEZETETT**, egyetlen hangolóponttal (`TOWN_SOLID_BAND_PX = 100`, a Level 1
  `SILHOUETTE_BOTTOM_Y`-jának megfelelője): a sziluett tömör alapja (a forrás 176. sora)
  ennyivel a talaj fölött kezdődjön. Ebből a kompozíció: felhők 0–135 · hegygerinc 136–175 ·
  város-sziluett 175–318 · tömör sötét alapsáv 318–418 · talaj 418–450.
- **A tömör alapsávot a világ-koordinátás HÁZAK töltik ki** (183–244 px magasak a talajról) —
  ezért nem elég egy távoli, ismétlődő ház-réteg, és ezért állnak a házak világ-térben.

**Talaj.** A csempe felső 9 sora ÁTLÁTSZÓ, a 9–15. a világos törmelék-perem (= a járható
felszín), a 16–47. sima sötét föld. Ezért van a `TOWN_TERRAIN_TOP_Y = GROUND_TOP − 9`: a
tileSprite ennyivel a fizikai felszín FÖLÉ kerül.
- **Szakadék-végzáró NINCS, és nem is hiányzik.** A csomagban nem létezik ilyen csempe (a
  saját preview-jának talaja végig folyamatos), a perem alatti test viszont sima sötét föld,
  tehát a nyers függőleges vágás tiszta földfalként olvas. A Level 1-nél azért kellett
  végzáró, mert ANNAK a csempéjének díszített, világos oldala van.

**Lebegő platform — KÉT változat.** A felépítés a csomag saját preview-jából van visszafejtve:
`top-left-wood(32) + N×top-wood(16) + top-right-wood(32)`, alatta opcionálisan
`wood-legs(32×16)` függőlegesen ismételve és `ground-wood-legs` talpazat.
- **állvány (`legs`)** — a lábak a talajig futnak;
- **konzol (`bracket`)** — csak a lap és a végzárók lelógó 19 px-e. Szakadék fölött ez az
  egyetlen lehetséges, és pontosan a Level 1 `platform-edge-*`-ának a szerepe.
- **A választás LEVEZETETT, nem adat** (`platformHasLegs()`), két feltétel ÉS-e:
  (1) EGYETLEN talaj-szegmens tartalmazza a teljes lapot; (2) a két láb-oszlopban nincs
  MÁSIK platform a lap alatt. A jelenlegi layouton **állvány:** `C1`, `C2`, `D-C1`, `G-P1`,
  `G-P2`, `G-P3`, `H-ledge`; minden más konzol. A `boss-ledge` a (2) miatt konzol — alatta
  végigfut a `H-ledge`; az `E-ledge` az (1) miatt, mert átlóg a `G3` peremén.
- **A talpazat és a talaj-csempe TETEJE azonos** (`TOWN_TERRAIN_TOP_Y`): a
  `ground-wood-legs.png` alsó 7 sora BITRE ugyanaz a perem, mint a `ground.png` 9–15. sora,
  tehát azonos felső élről indítva folytonosan illeszkedik. Nincs mit kézzel eltolni.
- **A `wood-legs` mind a 16 sora AZONOS** → a láb tetszőleges (nem 16-többszörös) magasságú
  tileSprite-tal rajzolható, az utolsó félbevágott ismétlés nem látszik.
- A lábak a VÉGZÁRÓK ELŐTT mennek ki a display listára, hogy a végzáró átlós merevítője
  takarja az illesztést, ne fordítva.

**Mozgó platform.** Ugyanaz a három csempe, **láb nélkül** (mind szakadék fölött jár), és a
látvány külön objektum, amit a `MovingPlatform.syncVisuals()` a bodyval EGYÜTT mozgat minden
frame-ben. Nem `Container`: a konténer gyerekeinek a depth-je a konténeréhez kötődne, a
lapnak viszont a többi terrain-elemmel azonos `TERRAIN_DEPTH`-en kell lennie.
A megkülönböztető tint MEGMARADT (a felismerhetőség gameplay-információ), de fára hangolva:
`MOVING_PLATFORM_WOOD_TINT = 0xffc890` — MULTIPLY tint csak sötétíteni tud, tehát világosítás
helyett MELEGÍTÉS `(58,38,56)` → `(58,30,31)`.

**Díszlet.** `BACKDROP_BUILDINGS` (6 ház, `BUILDING_DEPTH = −15`) és `DECOR_PROPS` (17 prop,
`DECOR_DEPTH = −10`) — a mélységsor tehát: sziluett → ház → prop → terrain → player.
- **A házak talpa `BUILDING_SINK_PX = 2`-vel a felszín ALÁ kerül.** MÉRT érték a csomag
  preview-jából (a házak talpa ott 251, a felszín 249): ettől „a földben áll" a ház, nem rá
  van ragasztva.
- **A propok tintje PLACEMENT-szintű** (`DecorPropDef.tint`), nem textúra-szintű: ugyanaz a
  lámpa a Level 1 cathedral-tónusában korrekciót kíván, a Level 2-n viszont hazai pályán van
  (`PROP_TINT_NONE = 0xffffff`, ami MULTIPLY-ban NO-OP).
- **A ház-invariánsok 2D-ben vizsgálódnak, nem csak vízszintesen** (`boxesOverlap`). A pálya
  emeletes: egy talajon álló láda és egy fölötte lévő párkányon álló checkpoint lehet azonos
  x-en, 160 px függőleges távolsággal — egy pusztán vízszintes tiltás ott hamis riasztást
  adna, amit a következő karbantartó jogosan gyengítene fel. *(A teszt írása közben pontosan
  ez történt: az `E-crate-1` bukott a `CP-2`-n.)*
- **A „ne nőj bele a fölötted lévő platform aljába" szabály CSAK a propokra vonatkozik.** A
  házak a `BUILDING_DEPTH`-en hátrébb vannak a terrainnél, tehát egy előttük álló állvány
  takarja őket — pontosan a forrás preview rétegzése.

### Boss 2 — The Mad King (`src/bosses/MadKing.ts`, `MadKingAnimations.ts`)

A `GraftedWingBreaker` szerkezetét követi (state machine + `delayedCall`-láncok, exportált
tuning-konstansok, geometriából LEVEZETETT hatótávok), de a karaktere szándékosan ellentétes:
**tisztán közelharci**. Nincs lövedéke és nincs varázslata — a távolról tűzgolyózó playert az
UGRÁSA bünteti, nem egy saját bolt.

- **State machine:**
  `DORMANT → APPROACH → SLASH / LEAP_WINDUP → LEAP_AIR → LEAP_SLAM / LUNGE_WINDUP → LUNGE → COOLDOWN → DEAD`
- **`DORMANT`** = a párbeszéd ÉS a belépő ideje: nem mozog, nem támad, és **nem is sebezhető**.
  A scene a belépő-animáció végén hívja az `activate()`-et.
- HP: 300 (`MAX_HP`). **Phase 2 a 50 %-nál**: gyorsabb mozgás (`MOVE_SPEED_P1` 80 →
  `MOVE_SPEED_P2` 130) + **megnyílik a kitörés**. Ugyanaz a szerkezet, mint a Boss 1-nél
  (ott a charge nyílt meg), tehát a rotáció-logika 1:1-ben átvihető volt.
- **`ATTACK_ROTATION = ['LEAP', 'LUNGE']`**, a `LUNGE` `phase === 2` szűrővel. A **slash
  reaktív**: `≤ SLASH_RANGE` (142) belül mindig ő nyer, és NEM forgatja a rotációt. Az
  `enterPhase2()` a rotációt a `LUNGE` slotjára állítja, hogy a fázis a szignatúrájával nyisson.
- **SLASH** (`Attack1`, 4 frame): a sebzés a csapás frame-jén (`f2`) oldódik fel. A
  `SLASH_STARTUP_MS` az ANIMÁCIÓS modul `SLASH_WINDUP_MS`-éből jön, ami maga is SZÁMÍTOTT
  (`SLASH_FRAMES.indexOf(2) * SLASH_SLOT_MS` = **660**) — a frame-lista átírása magával viszi.
  A windup-kockák ezért vannak megismételve (`[0,0,0,1,1,1,2,3]`): „felhúz… CSATT" ritmus.
  **A 660 ms MÉRT érték** — lásd lentebb a fairness-hangolás blokkot. Sebzés 12.
- **LEAP** (`Attack3`): a Phase 1 EGYETLEN gap-closere, ezért `LEAP_MIN_RANGE = 170`, épp a
  `SLASH_RANGE` (142) fölött — így nincs „holt sáv", ahol a király csak sétálna. A cél x a
  **FELUGRÁS pillanatában rögzül** (a Shadow Spell elve), tehát a guggolás alatt oldalra
  lépve kikerülhető. A becsapódás a **fizikából** derül ki (`body.blocked.down`), nem
  időzítőből — így sosem csúszhat el a látványtól. Sebzés 18, sáv `SLAM_HIT_HALF_WIDTH` (58).
  - **A becsapódás után `SLAM_RECOVERY_MS` (1500) jön, NEM a közös `ACTION_COOLDOWN_MS`** —
    ez a harc fő PUNISH-ABLAKA (a király kirántja a kardját a kőből). Lásd a
    fairness-hangolás blokkot.
  - **A ballisztika LEVEZETETT**, egyetlen hangolóponttal (`LEAP_RISE_PX = 140`):
    ```
    LEAP_VELOCITY_Y = sqrt(2 * GRAVITY_Y * LEAP_RISE_PX)     // config/physics.ts-ből
    LEAP_AIRTIME_MS = 2000 * LEAP_VELOCITY_Y / GRAVITY_Y
    vx              = clamp((targetX - x) / airtime, ±LEAP_MAX_SPEED_X)
    ```
    Unit teszt őrzi, hogy a becsapódás helye tényleg a célra esik, és hogy a tényleges
    emelkedés (`v² / 2g`) a `LEAP_RISE_PX`.
  - **A `LEAP_AIR` az EGYETLEN állapot, ahol az `update()` NEM nyúl a `velocityX`-hez.** Egy
    ott elhelyezett `setVelocityX(0)` függőlegesen ejtené le a királyt a levegőben. Explicit
    regressziós teszt van rá.
  - **A `LEAP_SLAM` állapot ÁTMENETI**: a `resolveSlam()` ugyanabban a hívásban cooldownba
    lép. A becsapódás PÓZÁT a `COOLDOWN → lastAction` anim-leképezés tartja a képen — ugyanaz
    a minta, amivel a Boss 1 a slash animációját folytatja a cooldown alatt.
- **LUNGE** (`Attack2`, CSAK Phase 2): a Boss 1 charge-ának a mintája — piros telegraph-tint,
  az irány a windup ELEJÉN rögzül, `hasHitThisLunge` miatt rohamonként egy találat, falnak
  ütközve idő előtt vége + `Take Hit` stagger. **Itt VAN valódi dash animáció** (a Boss 1-nél
  megtartott pózt kellett használni); a lendület érzetét ugyanaz az `AfterImageTrail` egészíti ki.
- **A király NEM flinchel találatra** (a Boss 1 elve): fehér `TintModes.FILL` villanás. A
  `Take Hit` frame-ek helye a falnak rohanó kitörés staggerje.
- **KÉT telegraph-szín, SZÁNDÉKOSAN elválasztva** (mindkettő exportált, unit teszt őrzi, hogy
  különböznek): **arany** (`SLASH_TELEGRAPH_TINT`, `0xffd070`) = jön a kardcsapás → UGORJ;
  **piros** (`LUNGE_TELEGRAPH_TINT`, `0xff2222`) = jön a roham → TÉRJ KI oldalra.
  A `clearTintState()` MINDKETTŐT visszateszi a hit-villanás után — enélkül egy jól időzített
  találat pont a legfontosabb pillanatban vakítaná el a playert.
  *(A Boss 1-nél a sárga slash-windup tintet szándékosan töröltük — ott a támadás 10 frame-es.
  A királynak csak 4 frame-e van, tehát az animáció önmagában kevesebbet közöl.)*
- **Halálkor NINCS fade** (a Wing-Breaker hamuvá válik): a `Death` sheet utolsó frame-je egy a
  földön maradó test, és a lore szerint a király FELOLDOZÁST kap — látszania kell.
- **Minden hang eventtel megy** (`'king-slash'`, `'king-slam'`, `'king-lunge-windup'`), a
  `playSfx()`-et a scene hívja — a bevett delegálási minta.
- **Geometria (MÉRT):** frame 160×111, body 24×54 a `(68, 51)` offseten, a talp a frame
  y=105-énél, `SCALE = 2` → `FEET_OFFSET_Y = 54`, `HALF_WIDTH = 24`. A `SLASH_RANGE` a mért
  penge-nyúlásból (`BLADE_REACH_PX = 71`) × `SCALE`.
  **A test közepe (80) PONT a frame közepe (160/2)**, tehát az `applyFacing()` itt
  matematikailag no-op — a megosztott `systems/SpriteFacing.ts`-en mégis átmegy, hogy egy
  jövőbeli body-eltolás ne okozzon néma elcsúszást (16. tanulság).

#### FAIRNESS-HANGOLÁS (2026-08-30, kézi teszt után)

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

### Boss2Scene (`src/scenes/Boss2Scene.ts`)

A `BossScene` szerkezetének a párja (fix 800×450-es aréna, nincs kameragörgetés, üres padló,
player↔boss collider nélkül, HP-bar + „PHASE II" felirat). Ami MÁS:

- **A belépő KÉT részből áll: párbeszéd, majd cím-kártya.** `create()` → `startDialogue()` →
  (a `Dialogue` `onComplete`-je) → `startEntrance()` → `beginFight()`. **Ismételt
  próbálkozásnál a `create()` egyenesen a `startEntrance()`-re ugrik** — lásd a
  „BOSS-PÁRBESZÉD MEMÓRIA" blokkot. *(A `Boss3Scene` szerkezete ugyanez.)*
- **A player a párbeszéd alatt TELJESEN befagyasztva**: a `PlayerController` csak a
  `beginFight()`-ban jön létre, ezért a mező típusa `PlayerController | null`, és az `update()`
  `this.controller?.update()`-et hív. **Nem elég az `update()`-et kihagyni** — a controller
  KONSTRUKTORA regisztrálja a J/F billentyű- és pointer-listenereket, tehát a player különben
  a párbeszéd alatt is támadhatna és varázsolhatna.
- **`update(_time, delta)`** — a `delta` kell a `Dialogue`-nak (a párbeszéd a scene idejéből
  ketyeg, nem saját timerből). *(A `BossScene`-é 2026-09-01 óta szintén ilyen.)*
- **`GROUND_TOP = 369` — a KÉPHEZ mérve, nem fordítva.** Ez a scene mérte ki elsőként a
  padlóvonalat a festményből, és a többi (Boss 3, végső, majd visszamenőleg a `BossScene`)
  ehhez igazodott. A kényszer mindegyiknél ugyanaz: `GROUND_TOP + PANEL_RESERVE_PX (75) ≤ 450`.
- **A háttér 2026-09-01 óta a `Mad King background.png`** (a lépcső előtt a KIRÁLYNÉ
  KOPORSÓJÁVAL — pontosan az, amiről a `KING_DIALOGUE` szól). A `GROUND_TOP` NEM változott
  vele: a kivágás magassága igazodott hozzá (lásd a fájlfát és a `BootScene` importját).
  A rajzolt dobogó-perem a 793. forrás-sor.
- **A háttér TINT NÉLKÜL megy be** — mérés, nem ízlés: az ÚJ kép nyers fényessége a
  játéktérben (250–369. sor) `mean 22.8` — a réginél (`29.0`) is sötétebb, és jóval a Boss 1
  TINTELT eredménye (`51.0 × 0.69 = 35.2`) alatt. Egy további tint elnyelné a királyt.
- **A zene a PÁRBESZÉD UTÁN indul**, a `startEntrance()`-ben — nem a `create()`-ben. Így a
  dialógus végig csendben megy, és a sáv a cím-kártyával EGYÜTT csap be, a harc nyitányaként
  (`MUSIC_KEYS.BOSS2_THEME` = `Veil of Eternal Nightfall`). Fade-in nincs külön megadva: a
  `DEFAULT_FADE_IN_MS` (800) gyakorlatilag a cím be-fadelésének hossza (700), tehát a kép és a
  hang együtt jön fel. A győzelem ÉS a vereség ága is `stopMusic()`-kal zár.
- **Győzelem:** `registry.set('kingDefeated', true)` → `NarrationScene`. A cél a
  `finalSceneExists()`-től függ (`'FinalBossScene' in this.scene.manager.keys`): amíg a végső
  aréna nincs regisztrálva, a Level 2-re tesz vissza. **Ez ugyanaz a minta, amit a
  `Level2Scene` használt a még nem létező `Boss2Scene`-re** — a scene felvételekor magától él majd.
- **Vereség:** fade → `Level2Scene`, ahol a player a SAJÁT checkpoint-registry pontján (a
  boss-ajtónál) éled újra.

### Boss 3 — Ancient Demon, Omen of Crows (`src/bosses/AncientDemon.ts`, `AncientDemonAnimations.ts`)

A végső ellenfél. Ugyanaz a szerkezet, mint a másik két bossnál (state machine +
`delayedCall`-láncok, exportált tuning-konstansok, geometriából LEVEZETETT hatótávok), de a
karaktere szándékosan a harmadik irány: **terület-tagadás és folyamatos nyomás**, nem
hatótáv-fölény.

- **State machine:**
  `DORMANT -> FLOAT -> COMBO / NOVA / SUMMON / BLINK_OUT -> BLINK_IN -> COOLDOWN -> DEAD`
- **`DORMANT`** = a párbeszéd ÉS a belépő ideje: nem mozog, nem támad, nem sebezhető.
- HP: **340** (a projekt legmagasabbja). **Phase 2 a 50 %-nál**: gyorsabb lebegés (55 -> 85)
  + **megnyílik az idézés** + rövidebb villanás-cooldown.
- **LEBEG, NEM SÉTÁL** (`MOVE_SPEED_P1 = 55` — a projekt leglassúbb boss-mozgása). Nincs
  járás-animáció a csomagban, tehát az idle fut mozgás közben is; a lény láb nélküli köpenye
  ezt hitelesen viseli. **Gravitáció MARAD bekapcsolva** + ground collider, mint a másik két
  bossnál: a lebegés tisztán a rajz dolga, nincs külön y-kezelés.

- **KASZAKOMBÓ** (reaktív, `<= SLASH_RANGE` 90): **KÉT csapás egyetlen mozdulatban**, 600 és
  1200 ms-nál. Mindkét időpont a frame-listából SZÁMÍTÓDIK
  (`COMBO_FRAMES.indexOf(strike) * COMBO_SLOT_MS`). Csapásonként 12 sebzés.
  - **A 600 ms MÉRT érték**, a Mad King levezetésének mintájára: pontblank helyzetből
    (16 + 14 = 30 px) a playernek 100 px-re kell jutnia, ami hátralépéssel 350 ms + 250 ms
    reakcióidő. Ugrással 404 ms elég lenne — 600 ms tehát az, amivel **MINDKÉT válasz**
    működik, nem csak az ugrás.
  - A két csapás közt PONT ugyanennyi idő telik el, tehát az elsőre adott válasz után marad
    idő a másodikra is reagálni.
- **ÁRNY-HULLÁM (nova)**: radiális, MINDKÉT irányba terjedő talajhullám. A hitbox MÉRT: a
  hullám f7-en x=5..81, sugara **38 forrás-px** -> `NOVA_RADIUS = 76`,
  `NOVA_HIT_RANGE = 76 + 14 = 90`. Sebzés 18, becsapódás 720 ms-nál (a hullám legszélesebb
  frame-jén).
  - **A kikerülés CSAK UGRÁS**: `NOVA_CLEAR_HEIGHT = 94` (a hullám mért teteje a talp felett,
    47 forrás-px * SCALE) — a player ugrás-plafonjának 60 %-a, 231 ms alatt megvan, és
    231-1020 ms között végig fölötte van. A kapu a player TALPÁT nézi, nem a középpontját:
    a hullám egy 10..94 px magas sáv, tehát TELJESEN fölé kell kerülni.
  - **`NOVA_HIT_RANGE` == `SLASH_RANGE` (90), FÜGGETLEN levezetésekből.** Nem hangolás, hanem
    egybeesés — és pont ettől olvasható a harc: a közelharci sáv a démoné, hacsak nem vagy a
    levegőben.
- **VILLANÁS (blink)**: a gap-closer. `alpha 1->0` (220 ms) -> áthelyezés a player mellé
  (`BLINK_OFFSET = 110`, tehát a `SLASH_RANGE` FÖLÖTT: marad egy ütem reagálni) ->
  `alpha 0->1` (200 ms). **A villanás alatt SEBEZHETETLEN** (`isVulnerable()`), különben a
  teleport ingyen punish-ablak lenne. A scene is ezt kérdezi a találat-kezelőjében, **a
  `registerHit()` ELŐTT** — enélkül a csapás elhasználódna egy olyan célponton, amit meg sem
  sebzett.
  - Az érkezési oldal LEVEZETETT: arra, amerre TÖBB hely van (az aréna közepéhez képest),
    majd a határokra clampelve — így a démon nem szorítja be magát a sarokba.
  - **`AfterImageTrail` SZÁNDÉKOSAN nincs**: az a folyamatos gyors mozgás csíkja, egy helyben
    álló teleportnál csak egymásra pakolná a másolatokat.
- **IDÉZÉS (CSAK Phase 2)**: 2 árnyék-lidérc a démon két oldalán, a testén kívül, a
  középpontja fölött. A démon **nem hozza létre őket**, csak `demon-summon` eventet emittál a
  spawn-pontokkal — ugyanaz a delegálási minta, mint a Wing-Breaker lövedékénél.
- **A ROTÁCIÓ ELŐBB FUT, MINT A REAKTÍV KOMBÓ.** `ATTACK_ROTATION = [NOVA, SUMMON, BLINK]`.
  **Ez FORDÍTOTT a másik két bosshoz képest, és konkrét oka van** (regressziós teszt őrzi): a
  nova találati sávja pontosan a kombó hatótávja, tehát kombó-elsőbbség mellett a nova soha
  nem sülne el ott, ahol egyáltalán találhat — a démon a közelharci sávban örökös
  kaszakombó-gépezet lenne. A cooldownok (nova 4500, idézés 7000, villanás 4000) miatt a
  kombó így is a leggyakoribb támadás marad.
- **KÉT TELEGRAPH-SZÍN, és itt ez KÉNYSZER, nem kozmetika**: a kombó és a nova windupja
  UGYANAZ a mozdulat (a démon a feje fölé emeli a kaszát), tehát az animációból nem
  megkülönböztethetők. Arany = kaszacsapás (ugorj VAGY lépj hátra), ibolya = hullám (CSAK az
  ugrás visz ki). Unit teszt őrzi, hogy különböznek, és hogy a hit-villanás nem törli őket.
- **Halálkor NINCS fade és NEM marad test**: a death sheet 18 frame-en át magától foszlik szét
  (az utolsó rajzolt frame már csak néhány pixel). A démon visszakerül a pokolba — nincs mit
  hátrahagynia. *(A Wing-Breaker fade-elt, a Mad King teste ott marad.)*
- **Geometria (MÉRT):** frame 100x100, body 16x52 a (35, 30) offseten, a talp a frame
  y=82-nél, `SCALE = 2` -> `FEET_OFFSET_Y = 52`, `HALF_WIDTH = 16`, látvány 90x124 (a
  legmagasabb a három bossból). **A testközép (43) NEM a frame közepe (50)**, tehát az
  `applyFacing()` itt ténylegesen dolgozik: kompenzáció nélkül a démon 28 világ-pixelt ugrana
  oldalra minden fordulásnál.

### Árnyék-lidérc (`src/bosses/ShadeMinion.ts`, `ShadeMinionAnimations.ts`)

A démon Phase 2 idézésének terméke. **Szándékosan nagyon egyszerű lény, nem egy harmadik
enemy-típus**: nincs state machine-je (csak `APPEARING / ALIVE / DEAD`), és nincs
támadás-animációja.

- **Miért létezik egyáltalán:** a démon a projekt leglassúbb bossa, tehát önmagában nem tud
  folyamatos nyomást tartani. A lidércek pótolják azt — a player nem állhat meg tölteni, mert
  közben rásodródnak.
- **LEBEG** (`allowGravity = false`), és **2D-ben** sodródik a player felé (`SHADE_SPEED = 70`,
  jóval a player 200-a alatt): a felugrás önmagában nem menedék előlük.
- **ÉRINTÉSRE sebez (8), és azzal EL IS PUSZTUL.** Ezért **nem kell `HazardDamageGate`**
  (szemben a tüskékkel és a kaszával): a lidérc a saját találatát nem éli túl, tehát a
  folyamatos érintkezésből származó frame-enkénti sebzés fogalmilag lehetetlen.
- **BÁRMEKKORA sebzés megöli** (egy kardcsapás vagy egy tűzgolyó), és `SHADE_LIFETIME_MS`
  (8000) után magától elenyészik — enélkül egy elfutó player mögött végtelen sorban gyűlnének.
- **A megjelenés-animáció alatt (400 ms) nem sebez és nem sebezhető**: az idézés telegraph,
  nem azonnali csapda.
- **NINCS `flipX`, és ez nem feledékenység**: a sprite függőlegesen szimmetrikus és nincs
  iránya (két szem középen, az uszály felfelé). A 16. tanulság a rajzolt figurát a frame
  közepétől ELTOLÓ sheetekre vonatkozik.
- **`destroy()` override** (18. tanulság) + a halál-event a `die()`-ban, sosem a
  `destroy()`-ban (24. tanulság) — mindkettőre explicit regressziós teszt van.

### FinalBossScene (`src/scenes/FinalBossScene.ts`)

A `Boss2Scene` szerkezetének a párja (fix 800x450 aréna, párbeszéd -> cím-kártya -> harc,
üres padló, player-boss collider nélkül, HP-bar + PHASE II felirat). Ami MÁS:

- **`GROUND_TOP = 369` — a KÉPHEZ mérve** (a rajzolt dais-perem fényesség-csúcsa a 368-369.
  sor, a 370.-ben -16.5 a zuhanás). A forrás aspektusa (1.7768) gyakorlatilag azonos a
  800/450-ével, tehát **kivágás NEM kellett** — a Boss 2-nél megjósolt recept bevált.
- **A háttér TINT NÉLKÜL megy be** — mérés: a játéktér nyers fényessége `mean 30.1`, szemben a
  Boss 2 `36.3`-ával és a Boss 1 TINTELT `40.7`-ével. Ez a három közül a legsötétebb kép.
- **ÚJ PROBLÉMA, ami az első két arénánál nem merült fel: a boss OLVASHATÓSÁGA.** A démon
  köpenye `rgb(14,12,12)` = 12.7 luminancia, a háttér ott, ahol áll, medián 21.7 — de a
  legsötétebb tizedében 10.0, tehát a fekete sziluett a sötét foltokban ELTŰNIK. **Tinttel ez
  nem javítható** (a MULTIPLY tint csak sötétíteni tud), ezért a démon egy halvány ibolya
  **AURÁT** kap MAGA MÖGÉ (`demon-aura-placeholder`, kódból generált radiális textúra,
  `depth -5`, alpha 0.28). A scene a démon pozíciójára szinkronizálja, és **a villanás alatt
  VELE halványul** (`AURA_ALPHA * demon.alpha`) — enélkül a derengés ott maradna, ahonnan a
  démon már eltűnt.
- **Az árnyékok plain tömbben élnek** (`shades`), mint a lövedékek: a Phaser Group `add()`-je
  felülírná a beállított sebességet/gravitációt (1. tanulság), a takarítás pedig mindig
  helyben, `splice()`-szal megy (2. tanulság). Négy overlap-regisztráció: kard->démon,
  kard->lidérc, tűzgolyó->démon, tűzgolyó->lidérc.
- **A győzelem az ÖSSZES lidércet megsemmisíti**: a gazdájuk nélkül nincs, ami tartsa őket, és
  a záró beat alatt nem sebezhetik halálra a playert.
- **Győzelem:** `demonDefeated` registry-flag -> `NarrationScene` (ending) -> `CreditsScene`.
- **Vereség: a scene ÖNMAGÁT indítja újra**, nem egy pályára tesz vissza. **Ez a végső bossnál
  MÁS, mint a másik háromnál, és user-döntés (kézi teszt után):** azok ajtaja egy pálya végén
  van, tehát a visszatérés néhány lépés — ide viszont a Level 2 boss-ajtaján át vezetett az út,
  ami minden bukott próbálkozás után egy 7200 px-es pálya TELJES újrafutását jelentette, a
  játék leghosszabb harcánál.
  A **„checkpoint a harc KEZDETÉN"** pontosan azt jelenti, hogy az átvezetőt sem kell
  újranézni — ezt 2026-09-01 óta a **`systems/DialogueMemory`** adja, ugyanaz a registry-alapú
  emlékezet, mint a másik három arénában (lásd a „BOSS-PÁRBESZÉD MEMÓRIA" blokkot).
  *(Korábban ez itt `{ skipDialogue: true }` scene-DATA volt. Azt a Boss 1/2/3 nem tudta
  átvenni: náluk a retry-út egy PÁLYÁN keresztül vezet, amit a scene-adat nem él túl.)*
  A `scene.start()` ugyanazon a példányon fut, tehát a `create()` eleje továbbra is KÖTELEZŐEN
  üríti a tömböket és a flageket (CLAUDE.md 3. tanulság).

### CreditsScene (`src/scenes/CreditsScene.ts`)

Thanks for playing + lassan felfelé görgő szerzői lista (karakterek / környezet / zene /
hangok). `Space` a végére ugrik, ott pedig **új játékot indít**.

- **Az új játék TÖRLI a registry-t** (`bossDefeated`, `kingDefeated`, `beastMasterDefeated`,
  `demonDefeated`, `checkpoint`, `level2Checkpoint`, `level3Checkpoint` és a
  `DIALOGUE_SEEN_REGISTRY_KEY`). A registry GAME-szintű, tehát enélkül az új játék a
  Level 1 ajtajánál azonnal a Level 2-re vinne, a player a pálya végén éledne, és **egyetlen
  boss-párbeszéd sem futna le** (mind „már láttam"-ra futna). Az utolsó kulcs IMPORTTAL jön a
  `systems/DialogueMemory`-ból, nem beírt sztringként.
- **A TARTALOM PLACEHOLDER** (user: a részleteit majd egy későbbi iterációban). A lista a
  `2D helper/Credits.txt` gyűjtéséből indul — és ez egyben az a hely, ahol a még nyitott
  licenc-tételeket le kell zárni a publikálás előtt.

### Párbeszéd (`src/ui/Dialogue.ts`)

In-scene szövegmező beszélő-névvel: **magától lemegy**, a **jobbra-nyíl** gyorsítja.
A részletes indoklás (miért nem váltja ki a `NarrationScene`, mi a pure mag, miért léptet egy
`update()` legfeljebb egy sort, hogyan levezetett a panel geometriája) fentebb, a
**„PÁRBESZÉD-RENDSZER"** blokkban van.

### NarrationScene (`src/scenes/NarrationScene.ts`)
- Adatvezérelt, újrahasználható szöveges átvezető: `scene.start('NarrationScene', { lines, nextScene, title? })`
- Typewriter reveal; **Space/Enter** = gépelés közben teljes sor, kész sornál a következő sor;
  **Esc** = teljes átugrás. Az utolsó sor után fade → `nextScene`
- A mező neve `narration`, **NEM `data`** — a `Phaser.Scene`-nek már van `data` property-je
  (`DataManager`), az ütközés típushibát ad
- A narrációs szöveg placeholder (a `BossScene.ts` tetején, `BOSS_VICTORY_NARRATION`) —
  a végleges lore a Phase 9-ben készül, a csere egy tömb-szerkesztés

### Audio (`src/systems/AudioManager.ts`)

Két, **szándékosan eltérő felépítésű** ág él egymás mellett, és nem nyúlnak egymáshoz:
a ZENE exkluzív, élettartam-kezelt és fade-elt; az SFX állapot nélküli one-shot.

**SFX ág (Phase 8, 7. iteráció):**
- `playSfx(key, { volume?, detuneRange? })`. Exportált konstansok: `SFX_KEYS`,
  `DEFAULT_SFX_VOLUME` (0.5), `DEFAULT_SFX_DETUNE_RANGE` (120)
- **`SFX_KEYS` — mi mikor szól** (a kulcsok egyediségét unit teszt őrzi):

  | kulcs | asset | mikor |
  |---|---|---|
  | `SWORD_SWING` | `sword-attack-2` | a player `performAttack()`-jában, AZONNAL a gombnyomásra |
  | `SWORD_IMPACT` | `sword-impact-hit-1` | a scene-ek kard-találat kezelőiben (enemy ÉS boss) |
  | `ENEMY_SWING` | `sword-attack-3` | CrowHarvester + boss közelharc, a CSAPÁS pillanatában |
  | `FIREBALL_CAST` | `fireball-2` | a player `'fireball-cast'`-jánál, a lövedék születésekor |
  | `BOSS_PROJECTILE` | `fireball-3` | a `'boss-projectile'`-nél; más hang, mint a playeré |
  | `BOSS_SPELL_IMPACT` | `firebuff-2` | HÁROM helyen: a Wing-Breaker Shadow Spelljének becsapódásakor (`SPELL_IMPACT_MS`), és a démon ÁRNY-HULLÁMÁNÁL + IDÉZÉSÉNÉL (a kioldás pillanatában) |
  | `GRAVECALLER_CAST` | `fireball-1` | a `'gravecaller-projectile'`-nél; HARMADIK tűzgolyó-hang |
  | `PLAYER_FOOTSTEP` | `stone-chain-run-5` | futás közben, `FOOTSTEP_INTERVAL_MS`-enként |
  | `PLAYER_JUMP` | `stone-jump` | a `jump()` grounded-guardja mögül |
  | `PLAYER_DEATH` | `death-groan-17` | a `die()`-ból (a zuhanás-halált is beleértve) |
  | `HARVESTER_DEATH` | `necro-hurt` | a CrowHarvester `die()`-jából |
  | `GRAVECALLER_DEATH` | `necro-death-2` | a Gravecaller `die()`-jából |
  | `BEAST_DEATH` | `fatman-death` | a Beast `die()`-jából; a legnagyobb testű lény mély üvöltése |
  | `KING_SLAM` | `rock-wall-1` | a Mad King ugrása, a FÖLDET ÉRÉS pillanatában |
- **A PLAYER LÉPÉSE A PROJEKT EGYETLEN ISMÉTLŐDŐ SFX-e.** Minden más hang diszkrét eseményre
  szól; ez a `Player.updateFootsteps()` kadenciájára ismétlődik, amíg a player fut.
  - A kadencia **LEVEZETETT**: `FOOTSTEP_INTERVAL_MS = RUN_ANIM_MS / RUN_FOOTFALLS`
    (570 / 2 = **285 ms**) a `PlayerAnimations.ts`-ben — egy 8 frame-es futóciklus két
    talajfogást tartalmaz. Ha a `RUN_ANIM_MS` változik, a lépések vele mozdulnak; a
    `RUN_FOOTFALLS` az egyetlen hangolópont.
  - A `lastFootstepAt = null` állapot **kettős szerepű**: azt is jelenti, hogy a player nem
    fut, és azt is, hogy a következő lépés AZONNAL esedékes. Enélkül a futás indulása egy
    teljes intervallumig néma lenne — pont a legsúlyosabb pillanat. A `die()` és a
    `respawn()` is nullázza.
  - Külön guard a CLIMB / ATTACK / CAST / HURT / JUMP / FALL state-ekre **nem kell**:
    egyikük sem `RUN`, tehát mind a `null`-ágon némul el.
- **A PER-HANG HANGERŐ MÉRT, NEM HANGOLT.** A forráscsomagok nincsenek egymáshoz
  normalizálva: a hullámformák csúcsértéke **0.081 és 0.708** között szór (majdnem 19 dB),
  tehát közös `DEFAULT_SFX_VOLUME` mellett a lépés hallhatatlan lenne, a halál-nyögés pedig
  kiabálna. Referencia a bevált kardsuhintás (`sword-attack-2` csúcs 0.287 × 0.5 = **0.1435
  effektív**), a képlet pedig `volume = (cél-arány × 0.1435) / a forrás mért csúcsa`.
  A levezetett értékek az `AudioManager.ts`-ben állnak, kommentált táblázattal.
  **Asset-cserénél a hangerőt ÚJRA KELL SZÁMOLNI** — a régi szám az adott fájl csúcsához
  tartozott, nem a szerephez. Unit teszt őrzi, hogy a lépés a kard alatt, a player halála
  pedig fölötte maradjon.
- **A halál-hangok `DEATH_SFX_DETUNE_RANGE = 0`-t kapnak.** A detune-szórás ISMÉTLŐDŐ hangok
  gépiessége ellen való (kard, lépés); egy halál egyszeri, drámai esemény, amit egy véletlen
  elhangolás csak olcsóvá tenne.
- **A player saját hangjait a `bindPlayerSfx(player, audio)` helper köti be**, nem
  scene-enként kézzel. A projekt egyébként vállalja a scene-duplikációt, de ez a blokk
  („mechanikus és alacsony kockázatú") HÁROM scene-ben szó szerint azonos — és egy negyedik
  (`Boss2Scene`) bekötésekor pont ezt lenne a legkönnyebb elfelejteni. A paramétere
  `Phaser.Events.EventEmitter`, nem `Player`: így az `AudioManager` nem függ a `Player`-től.
- **`scene.sound.play(key, config)`, NEM `sound.add()`** — a SoundManager `play()`-e olyan
  one-shot hangot hoz létre, ami a lejátszás végén magától felszabadul. Ezért az SFX-hez
  nincs `this.music`-szerű élettartam-kezelés, **nem exkluzív** (több csapás hangja
  átfedhet), és a `stopMusic()` / `destroy()` / shutdown-hook logikája **nem változott**
- **Zárolt audio contextnél az SFX-et ELDOBJUK, nem halasztjuk** (szemben a zenével, ami
  az `UNLOCKED` eseményre vár): egy másodpercekkel később elsülő kardsuhintás rosszabb,
  mint a néma csapás
- `DEFAULT_SFX_VOLUME` (0.5) szándékosan a `DEFAULT_MUSIC_VOLUME` (0.45) **fölött** van,
  hogy a boss theme alatt is átvágjon
- **Detune-szórás**: hívásonként ±`detuneRange` cent véletlen elhangolás
  (`Phaser.Math.Between`), így egyetlen fájlból is változatos a sorozat. A default a hívó
  oldalán elhagyható; `{ detuneRange: 0 }` ad pontos lejátszást
- **Bekötés — MINDIG event + scene, sosem közvetlen hanghívás az entitásban.** A `Player`, a
  `CrowHarvester`, a `Gravecaller` és a boss csak eventet emittál (`'sword-swing'`,
  `'harvester-attack'`, `'gravecaller-projectile'`,
  `'boss-slash'`, `'fireball-cast'`, `'boss-projectile'`, `'boss-spell'`), a `playSfx()`-et a
  scene hívja — ugyanaz a delegálási minta, mint a lövedékek létrehozásánál. Így az entitások
  nem függnek az `AudioManager`-től, és a kibocsátás unit-tesztben megfigyelhető.
  **A `Level1Scene` emiatt kapott saját `AudioManager` példányt — zenét NEM indít, csak
  SFX-hez kell.**
- **Az emitek a guardok MÖGÖTT vannak**: a cooldownnal blokkolt player-csapás és a windup
  alatt megölt CrowHarvester/boss nem ad hangot
- A kard becsapódása a scene-ek találat-kezelőiben szól
  (`Level1Scene.handlePlayerHitEnemy()`, `BossScene.handlePlayerHitBoss()`), ahol a meglévő
  `hasHitTarget()` guard csapásonként pontosan egyre korlátozza
- **A Shadow Spell hangját a `BossScene` ütemezi**, nem a boss: a `'boss-spell'` handlerben
  egy `delayedCall(SPELL_IMPACT_MS)`. A konstans az ANIMÁCIÓS modulból jön, tehát a hang nem
  csúszhat el a látványtól, ha a `SPELL_TELEGRAPH_LOOPS` változik. Nincs "boss meghalt"
  guard (az oszlop ilyenkor is láthatóan lecsap, csak sebzés nélkül), scene-shutdownnál
  viszont a Phaser törli a függő `delayedCall`-okat — a győzelmi fade alá nem szól be
- **Távolság-alapú némítás nincs, és nem is kell**: a CrowHarvester csak `ATTACK_RANGE`
  (42px) belül támad, tehát egy csapkodó lény definíció szerint a player mellett áll. Ez
  újra kérdés lesz, ha valaha távolsági enemy típus jön

**Zene ág:**
- **Egyetlen zenesáv** kezelése: `playMusic(key, { volume?, fadeInMs? })`, `stopMusic(fadeOutMs?)`,
  `getCurrentMusicKey()`, `destroy()`. Exportált konstansok: `MUSIC_KEYS`,
  `DEFAULT_MUSIC_VOLUME` (0.45), `DEFAULT_FADE_IN_MS` (800), `DEFAULT_FADE_OUT_MS` (1500),
  `LEVEL_MUSIC_VOLUME` (0.35), `LEVEL_MUSIC_FADE_IN_MS` (2000)
- **A hangkeverési hierarchiát unit teszt őrzi**: `LEVEL_MUSIC_VOLUME (0.35) <
  DEFAULT_MUSIC_VOLUME (0.45) < DEFAULT_SFX_VOLUME (0.5)`. A level-zene több percen át
  szól, ezért marad háttérben; a boss theme érezhetően felerősödik hozzá képest; az SFX
  mindkettő fölött átvág. Egy „csak feljebb veszem egy kicsit" hangolás nem fordíthatja
  meg észrevétlenül a sorrendet
- **ÖT sáv van** (`MUSIC_KEYS`): `BOSS_THEME` (a `BossScene` belépőjétől), `BOSS2_THEME`
  (a `Boss2Scene` belépőjétől — a PÁRBESZÉD UTÁN), `FINAL_BOSS_THEME` (a `FinalBossScene`
  belépőjétől — szintén a párbeszéd után), `LEVEL1_THEME` (a `Level1Scene` teljes hosszán) és
  `LEVEL2_THEME` (a `Level2Scene` teljes hosszán). Egyszerre sosem szól kettő: a
  `playMusic()` hard-stoppolja az előzőt, mindkét pálya már az ajtó-fade alatt felszabadítja a
  sávját, és a Phaser a régi scene SHUTDOWN-ját a következő scene `create()`-je ELŐTT futtatja
- **A KÉT pálya-sáv fade-inje SZÁNDÉKOSAN eltér**, és ez nem ízlés, hanem a két belépés
  különbsége (unit teszt őrzi a sorrendet):
  - `LEVEL_MUSIC_FADE_IN_MS` (2000) — a Level 1 közvetlenül az oldalbetöltés után indul,
    tehát az audio context ZÁROLT, és a sáv úgyis csak az első billentyűleütésnél szólal meg;
  - `LEVEL2_MUSIC_FADE_IN_MS` (4000) — a Level 2-be a `NarrationScene` felől érkezünk, MÁR
    FELOLDOTT contexttel, tehát a zene tényleg a `create()` pillanatában indul. Itt a
    fade-in az EGYETLEN dolog, ami tompítja a belépést (user-kérés: „ne ilyen intenzíven
    üssön be a zene a kezdéskor")
- **AUTOPLAY: a `sound.locked` ág a Level 1-nél a FŐ út, nem élhelyzet.** A `Level1Scene`
  közvetlenül az oldalbetöltés után indul, bármilyen user-interakció előtt — ott az audio
  context GARANTÁLTAN zárolt, tehát a `playMusic()` az `UNLOCKED` eseményre halasztja a
  lejátszást, és a zene **az első billentyűlenyomásnál** kezd szólni. Ez helyes
  böngésző-viselkedés, nem megkerülhető, és **nem hiba** — ezért kapott a level-sáv
  hosszabb (2000ms) fade-int, hogy ne robbanjon be hirtelen az első leütésre
- **Az `AudioManager` scene-hatókörű, és ez a Level 1-nél ELŐNY**: a zenének pont a scene
  leállásakor (az ajtón átlépve) kell véget érnie. Game-szintűvé emelni csak akkor kell,
  ha valaha scene-eken ÁTÍVELŐ ambient (pl. menü → pálya) lesz
- A hang **némán** jön létre (`volume: 0`), a hangerőt egy tween viszi fel — a `stopMusic()`
  a futó fade-in tweent leállítja, hogy a kifadelés az AKTUÁLIS hangerőről induljon
- `playMusic()` mindig hard-stoppolja az előző sávot → **nem lehet két loop egyszerre**
- `stopMusic()` kétszer hívva no-op (`isStopping` flag)
- **Autoplay policy**: ha `scene.sound.locked`, a lejátszás a `Phaser.Sound.Events.UNLOCKED`
  eseményre halasztódik. A gyakorlatban ez sosem kell — a Phaser `WebAudioSoundManager`
  **`keydown`-ra is felold**, a player pedig végigjátssza a Level 1-et, mire ide ér
- **Minden hang-asset Vite-importtal jön** (`import bossThemeUrl from
  '../../assets/audio/boss-theme.mp3'`, ugyanígy a két SFX WAV), NEM a `public/` mappából.
  Így a build hash-eli, a GitHub Pages base path magától jó lesz, és **hiányzó fájlnál a
  build elszáll** néma 404 helyett. Ehhez kell a `src/vite-env.d.ts`
- **Az SFX WAV, nem OGG** (a csomagban mindkettő megvan): a WAV univerzálisan támogatott
  böngészőben (a Vorbis Safariban történetileg bizonytalan). Ára: a 6 hang együtt ~900 KB,
  szemben az OGG ~250 KB-jával. Ha valaha a build-méret szempont lesz, az OGG-re váltás
  hat import-csere
- Bekötés a `BossScene`-ben: `create()` → `new AudioManager(this)`, `startEntrance()` →
  `playMusic(MUSIC_KEYS.BOSS_THEME)`, `scheduleVictory()`/`scheduleDefeat()` → `stopMusic()`.
  Kézi takarítás **nincs** — az `AudioManager` maga iratkozik fel a scene shutdownjára
- Bekötés a `Level1Scene`-ben: `create()` → `playMusic(MUSIC_KEYS.LEVEL1_THEME, {...})`,
  `activateCheckpointAndTransition()` → `stopMusic(TRANSITION_FADE_MS)`. A `TRANSITION_FADE_MS`
  (500) **ugyanaz a konstans, amiből a kamera-fade dolgozik** — a kép és a hang együtt
  halkul el. Halál/respawn nem szakítja meg (a scene nem indul újra); boss-vereség után
  visszatérve viszont a `create()` újrafut, tehát a sáv az elejéről indul
- Bekötés a `Level2Scene`-ben: UGYANEZ a minta, `MUSIC_KEYS.LEVEL2_THEME`-mel és
  `LEVEL2_MUSIC_FADE_IN_MS`-szel; a `stopMusic(TRANSITION_FADE_MS)` a `checkDoor()`-ban van.
  **A hívás sorrendje ott számít:** a `bossSceneExists()` korai `return`-ág UTÁN kell állnia
  (amikor a Boss 2 aréna még nem létezik, csak checkpoint mentődik és a pálya megy tovább —
  ott a zenének szólnia kell). A debug `R` billentyű azonnal vált, tehát ott a shutdown-hook
  vágja el fade nélkül; debug úton ez rendben van

## Fontos technikai tanulságok (ne ismételd meg ezeket a hibákat!)

1. **Phaser Arcade Physics Group `.add()` felülírja a body sebességét/gravitációját.** Ha egy már konfigurált (velocity/gravity beállított) physics objektumot egy `Phaser.Physics.Arcade.Group`-hoz adsz hozzá, a group visszaállítja azokat az alapértékekre. Ezért a fireballokat és enemyket **plain TypeScript tömbben** tároljuk (`Fireball[]`, `CrowHarvester[]`), nem Phaser Group-ban.
2. **Ne rendelj hozzá ÚJ tömböt egy már `physics.add.overlap`/`collider`-hez kötött referenciához.** A `filter()` új tömböt hoz létre — ha ezt visszaírod a property-be, a collider a régi (elavult) tömbre marad kötve. Élő elemek eltávolításához mindig `splice()`-t használj helyben (lásd `Level1Scene.update()` a fireballok takarításánál).
3. **Scene-restart (`scene.start(kulcsSajátMaga)`) NEM hívja újra a class field initializereket.** A Phaser Scene példány egyszer jön létre; `scene.start()` csak a lifecycle-t (init/preload/create) futtatja újra UGYANAZON a példányon. A `private enemies: CrowHarvester[] = [];`-szerű mezők csak a LEGELSŐ konstruáláskor inicializálódnak — ha a `create()` nem üríti ki őket explicit módon, a régi (a scene leállásakor Phaser által már megsemmisített body-jú) objektumok bennmaradnak, és az `update()` rajtuk hívott metódusai (`setVelocityX` stb.) `undefined`-on szállnak el. Ez okozta, hogy a `BossScene` "R: vissza Level1Scene-re" debug-gombja "nem csinált semmit" — valójában lefutott a scene-váltás, csak utána azonnal crashelt. **Minden scene, aminek van saját magára mutató restart-útja, a `create()` elején explicit nullázza a class-field tömbjeit/flag-jeit** (lásd `Level1Scene.create()` teteje: `this.fireballs = []; this.enemies = []; this.isTransitioning = false; this.respawnScheduled = false;`).
4. **A `camera.fadeOut(duration, r, g, b, callback)` ötödik paramétere a fade MINDEN frame-jén lefut**, nem csak a végén — a szignatúrája `(camera, progress)`. Ha abból hívsz `scene.start()`-ot, az frame-enként újraindítja a cél scene-t. Helyette mindig:
   ```ts
   this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key));
   this.cameras.main.fadeOut(500, 0, 0, 0);
   ```
   (A `Level1Scene.activateCheckpointAndTransition()` eredetileg a callback-es formát használta; Phase 7-ben át lett írva erre.)
5. **A `Phaser.Scene`-nek már van `data` property-je** (a `DataManager`). Ha egy saját scene-ben `private data: ValamiSajat`-ot deklarálsz, a strict typecheck elszáll. Nevezd el másnak (lásd `NarrationScene.narration`).
6. **A Phaser `SoundManager` GAME-szintű, nem scene-szintű.** Egy scene-ben elindított loop **túléli a scene leállását**, és a scene-be újra belépve két példány szól egymáson. Minden hangot indító osztálynak fel KELL iratkoznia a scene shutdownjára:
   ```ts
   scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
   ```
   (Az `AudioManager` ezt megteszi, ezért a scene-eknek nem kell kézzel takarítaniuk.)
7. **A `Phaser.Sound.BaseSound` típusán NINCS `volume`/`setVolume`** — csak a konkrét implementációkon (`WebAudioSound`, `HTML5AudioSound`, `NoAudioSound`). Mivel `sound.add()` `BaseSound`-ot ad vissza, a volume-tweeneléshez (fade) szűkíteni kell rá — lásd a `PlayableSound` uniót az `AudioManager.ts`-ben.
8. **A `vi.fn()` paramétertípus nélkül üres tuple-ként (`[]`) tipizálja a `mock.calls`-t.** Ha a teszt ki akarja olvasni a hívás argumentumait (pl. a tween konfigját), a mocknak explicit paramétertípust kell adni: `vi.fn((_config: MockTweenConfig) => ...)`. A tesztek futottak, de a `tsc --noEmit` elszállt tőle.
9. **Egy nem loopoló animációt NEM elég `play(key, true)`-val „ignoreIfPlaying" módban indítani.** Amint a lejátszás véget ér, az animáció már nem „playing", tehát a következő frame `play(key, true)`-ja ÚJRAINDÍTJA — a halál-animáció így vég nélkül loopolna. Ezért van a `Player.playAnim()` `currentAnimKey` guardja: csak akkor hív `play()`-t, ha a kulcs ténylegesen VÁLTOZOTT. Következmény: minden olyan hely, ami „ugyanarra" a state-re akar animációt ÚJRAINDÍTANI (pl. `respawn()`), köteles előbb `currentAnimKey = null`-t írni.
10. **`Phaser.Physics.Arcade.Sprite`-on a `setSize()`/`setOffset()` KÉT különböző dolgot jelenthet.** A `Components.Size` (physics body) verziója árnyékolja a GameObject logikai-méret verzióját, és a kettő mást csinál. A félreértés elkerülésére a `Player` konstruktora közvetlenül a bodyn hívja őket: `body.setSize(w, h, false)` + `body.setOffset(x, y)`. A `center: false` KELL — különben a `setSize` újraközpontozza és felülírja az utána beállított offsetet.
11. **Off-center sprite + `flipX` = a karakter oldalra UGRIK forduláskor.** A `flipX` a FRAME közepére tükröz, nem az originre. Ha a rajzolt figura nem a frame közepén van (a `CrowHarvester` teste a 64px-es frame x=14-énél ül, mert a kasza tölti ki a jobb oldalt), akkor egy sima `setFlipX()` a testet `2 * (32 - 14) = 36px`-t ugrasztja. A javítás: forduláskor az **`originX`-et ÉS a physics body offsetjét EGYÜTT** tükrözni (`CrowHarvester.setFacing()`): `originX ↔ 1 - originX`, `offsetX ↔ frameWidth - offsetX - bodyWidth`. A `tests/unit/crowHarvesterAnimations.test.ts` pont ezt a párost őrzi (a body világkoordinátás közepének nem szabad elmozdulnia). **Ez a tétel LEZÁRVA:** a boss sheetje volt a második ilyen eset, ezért a kompenzáció átkerült a megosztott `systems/SpriteFacing.ts`-be — lásd a 16. pontot.
12. **A Phaser 4 `TileSprite` NEM nyújtja kettőhatványra a textúrát — a Phaser 3 igen.**
    Phaser 3-ban a `TileSprite` a forrás frame-et a következő kettőhatvány méretű canvasra
    rajzolta *átméretezve* (426×384 → 512×512), tehát minden nem-POT háttér torzult. Phaser
    4-ben a WebGL út shaderben csomagolja a UV-t (`TexCoordFrameWrap`,
    `BatchHandlerTileSprite.js`), a canvas út pedig pontos frame-méretű
    `createPattern(..., 'repeat')`-et használ — a 426×384-es háttérrétegek torzításmentesen
    csempéződnek. **Ha Phaser 3-as tutorialt követsz, ez a lépés (a háttér POT-ra vágása)
    nálunk felesleges.**
13. **`pixelArt: true` mellett a `tilePositionX`-et KÉZZEL kell kerekíteni.** A
    `pixelArt: true` bekapcsolja a `roundPixels`-t, de az csak a **GameObject transformját**
    kerekíti — a `tilePositionX` shader-oldali textúra-offset, arra nem hat. Tört
    `tilePositionX` + nearest-neighbor mintavétel = frame-enként ugráló oszlopok a sziluettek
    peremén, és a `startFollow` lerpje miatt a `camera.scrollX` gyakorlatilag mindig tört.
    Ezért van a `ParallaxBackground.tilePositionForScroll()`-ban a `Math.round()` — a
    `tests/unit/parallaxBackground.test.ts` ezt őrzi.
14. **A `setTintFill()` Phaser 4-ben TÖRÖLVE van** — a hívása csak egy `console.error`-t ír ki
    és nem csinál semmit (`Tint.js`). Helyette:
    `sprite.setTint(color).setTintMode(Phaser.TintModes.FILL)`, visszaállításnál pedig
    `clearTint()` **ÉS** `setTintMode(Phaser.TintModes.MULTIPLY)` — Phaser 4-ben a tint SZÍNE
    és MÓDJA külön beállítás, a `clearTint()` a módot nem állítja vissza.
    Ebből következik a másik csapda: **a `setTint(0xffffff)` MULTIPLY módban NO-OP**, mert a
    fehér a szorzás egységeleme. A bossnak (és korábban a Hollow-nak) emiatt éveken át
    egyáltalán nem volt látható találat-visszajelzése, pedig a kód "villantott".
15. **A `body.setSize()` a sprite `scale`-jével SZORZÓDIK, és a Body a skálát a
    KONSTRUKTORÁBAN menti el.** Az Arcade `Body.setSize(w, h)` a `sourceWidth`-et állítja, a
    tényleges méret `sourceWidth * this._sx` (`Body.js:1506`), a body pozíciója pedig
    `x + scaleX * (offset.x - displayOriginX)`. Ezért:
    - a `setScale()`-nek a `physics.add.existing()` **ELŐTT** kell lefutnia, különben a body
      egy frame-ig rossz méretű (a `_sx` csak a következő physics step-ben frissül);
    - a `setSize`/`setOffset` értékei **forrás-pixelben** mennek, nem világ-pixelben;
    - a fordulás-kompenzáció képlete emiatt **skálafüggetlen** (a `scaleX` egyenletes szorzó).
16. **Az off-center fordulás-kompenzáció közös helperbe került** (`systems/SpriteFacing.ts`),
    mert a boss sheetje a második ilyen eset — és ellentétes natív iránnyal
    (`nativeFacing: 'left'` vs. a CrowHarvester `'right'`-ja). Az `applyFacing()` három dolgot
    állít EGYSZERRE: `flipX`, `originX` és a body `offsetX`. Ha bármelyik kimarad, a test
    elcsúszik a `sprite.x`-től. A `bodyCenterX` **levezetett** érték
    (`bodyOffsetX + bodyWidth / 2`), nem külön hangolható konstans. Ezt a
    `crowHarvesterAnimations.test.ts` és a `bossAnimations.test.ts` egyaránt őrzi.
17. **(Ismert, még nem javított apró kockázat)** A `PlayerController`-nek nincs `destroy()`/leiratkozás metódusa — ha a `Level1Scene` scene-restart miatt újra lefut a `create()`, egy ÚJ `PlayerController` jön létre, ami újra regisztrálja a J/F billentyű- és pointerdown-listenereket. Mivel ezek a handlerek (`attack()`, `castFireball()`) saját maguk cooldown-gate-eltek, a duplikált hívás gyakorlatilag no-op-ra fut (nincs látható hiba), de tisztább lenne egy `destroy()` a régi controlleren scene-leállításkor. Nem blokkoló, de ha valaha furcsa dupla-támadás tünetet észlelsz, ez az első gyanús hely.
18. **Egy élő entitás `destroy()`-a önmagában NEM állítja le a függő `delayedCall`-jait.**
    A `Level1Scene.resetEnemies()` menet közben, akár TÁMADÁS KÖZBEN semmisít meg egy
    `CrowHarvester`-t. A `startAttack()` `delayedCall`-ja viszont ettől még lefut, és a
    `resolveAttackHit()` MEGSEBEZTE volna a playert egy már nem létező kaszával. A megoldás
    nem külön timer-nyilvántartás, hanem az, hogy a `destroy()` override a `super.destroy()`
    ELŐTT `DEAD`-re állítja a state-et — az összes callback már eleve `state === DEAD`
    guarddal indul, tehát mind inertté válik. **Minden olyan entitásnál, amit a scene menet
    közben megsemmisíthet, ez a minta kell.** Ugyanitt kell felszabadítani a saját
    scene-objektumait is (a `hpText`-et eddig csak a scene-shutdown takarította) és leállítani
    a rá futó tweeneket (`scene?.tweens.killTweensOf(this)`) — a halál-fade `onComplete`-je
    egyébként egy megsemmisített objektumon hívódna meg. A `GameObject.destroy()` maga
    idempotens (`!this.scene` guard), tehát a kézi + a shutdown-hívás párosa biztonságos.
19. **Kevert frame-méretű sprite csomagnál a frame-eket NORMALIZÁLD (vágd ki), ne írj
    animációnkénti geometriát.** A Necromancer (Gravecaller) csomag idle/walk/hit/death
    sheetjei 96×96-osak, az attack (és a nem használt spawn) viszont 128×128 — a 128-as
    frame a 96-osnak PONTOSAN 16 px-es kerettel kipárnázott változata (mindkét tengelyen
    mérve). Két frame-mérettel a `FacingGeometry` minden mezője (`frameWidth`,
    `bodyOffsetX/Y`, `originY`) ANIMÁCIÓNKÉNT más lenne, tehát az `applyFacing()`-et minden
    animáció-váltásnál újra kellene futtatni más geometriával — pont az a hibaosztály, amit
    a 11./16. tanulság megszüntetett. Ehelyett az attack sheet **kivágva** került a repóba
    (6016×128 → 4512×96), és ez **veszteségmentes**: a levágott keretben 0 db nem-üres
    pixel volt (a `WithoutEffect` változatot használjuk, az effektes kilógna). Ellenőrzés:
    a kivágott f0 alpha-bounding boxa bitre az idle f0-éval egyezik (`x 38..65, y 15..63`).
    **Mielőtt animációnkénti geometriát írnál, nézd meg, nem egyszerű padding-e az eltérés.**
20. **A unit teszt tervezési hibát is talál, nem csak regressziót.** A Gravecaller első
    változata az észlelés pillanatában, MOZGÁS NÉLKÜL castolt, tehát a `MAINTAIN_DISTANCE`
    állapot egyetlen frame-es átjáró volt — a „távolságtartás" sosem futott le. Ez kézi
    végigjátszáson „működőnek" látszott volna (a lény lő, a player megöli); a hiba abból
    derült ki, hogy a *„túl közeli player → hátrál"* teszt `velocity 0`-t kapott. A javítás
    (`applySpacing()` visszaadja, hogy ÁLL-e, és a cast kapuja ez) egyben jobb gameplay is.
21. **Mielőtt egy háttérréteget FÜGGŐLEGESEN NYÚJTANÁL, nézd meg, nem toldható-e.** A
    GothicVania Town rétegei 288 magasak, a viewportunk 450. A `stretch: true` (a Level 1
    egének útja) itt torzított volna, mert ezeken felhő és hegygerinc van — a Level 1 ege
    viszont sima színátmenet, azon nem látszik. Mérés helyettesítette a kompromisszumot: a
    `background.png` **186–287. sora**, illetve a `middleground.png` **236–287. sora** BITRE
    AZONOS, egyszínű sorokból áll (`#71405A` / `#392D55`). A hiányzó 162 sort tehát egyszerűen
    hozzá lehetett tenni — a réteg 1:1 marad, a pixelsűrűség változatlan. **Egy nem-egész
    skálázás (1.5625×) pixel arton mindig rosszabb, mint egy mért toldás.**
22. **Nem varratmentes háttérréteget TÜKÖR-CSEMPÉZÉSSEL lehet ismételhetővé tenni.** A
    `middleground.png` bal és jobb éle érdemben eltér (a sziluett teteje 55–100 vs. 117, 90
    sor tér el >8-cal), tehát sima csempézésnél 384 px-enként függőleges lépcső látszana.
    A `[forrás | vízszintesen tükrözött forrás]` 768-as textúrában viszont a bal él `mg[0]`,
    a jobb él szintén `mg[0]`, a belső varrat pedig `mg[383]`↔`mg[383]` — mindkét átmenet
    duplázott oszlopra esik, tehát láthatatlan. Ára egy tükör-szimmetria, ami egy 0.3-as
    scrollFactorú, távoli sziluetten nem tűnik fel. **Ellenőrizd MÉRÉSSEL, hogy egy réteg
    varratmentes-e** (a wrap-seam eltérése ne legyen nagyobb a képen belüli szomszéd-oszlopok
    eltérésénél) — a `background.png` átment ezen (1.06 vs. 0.85), a `middleground.png` nem.
23. **Egy asset-csomag SAJÁT preview-képe a leghitelesebb dokumentáció.** A GothicVania Town
    `environment-preview.png`-jét template-matcheléssel visszafejtve derült ki minden, amit
    a fájlnevek nem árulnak el: hogy a KÉT talaj-variánst 32 px-es periódusban VÁLTOGATNI
    kell (`ground-b` @0,64,96…, `ground` @48,80,112…), hogy a fa-állvány pontosan hogyan épül
    fel, és hogy a házak talpa 2 px-rel a felszín ALÁ kerül. Egyik sem volt kitalálható —
    és a `ground-corner`/`ground-wall` csempéket enélkül simán szakadék-peremnek néztem
    volna, holott azok a preview kézzel épített kőházának az alapzata.
24. **Halál-eventet a `die()`-ba emitts, SOHA a `destroy()`-ba.** A `CrowHarvester` és a
    `Gravecaller` `destroy()` override-ja a state-et KÖZVETLENÜL `DEAD`-re állítja, `die()`
    hívása NÉLKÜL (lásd a 18. tanulságot) — a scene-ek `resetEnemies()`-e pedig a player
    MINDEN halálakor az összes lényt megsemmisíti. A `destroy()`-ból emittálva tehát minden
    egyes respawn egy 9 (Level 1), illetve 15 (Level 2) hangos haláltusa-kórussal indulna.
    Ez kézi teszten alattomos: könnyű a „sok enemy van a pályán" számlájára írni. Mindkét
    enemy-tesztben van rá explicit regressziós eset.
25. **Egy hangfájl formátumát MÉRD, ne feltételezd — a WAV `fmt ` chunk mezősorrendje
    könnyen elcsúszik.** A csatornaszám a chunk adat-kezdetétől **+2 bájtra** van
    (`audioFormat` (2) → `numChannels` (2) → `sampleRate` (4)); a `+0`-t olvasva az
    `audioFormat` értéke (PCM esetén `1`) mono-nak látszik. Ez a projektben konkrét hibát
    okozott: a sztereó fájlok hosszát **kétszeresnek** mértem, ami miatt a `17. Death Groan`
    4,5 s-nak, a `necroDeath (2)` pedig 1,8 s-nak látszott (valójában 2,3 s és 0,9 s), és a
    hangerő-kalibráció referenciacsúcsa is elcsúszott (0.49 vs. a valós 0.287). **Ellenőrző
    fogás:** a `byteRate` legyen `sampleRate × numChannels × bits/8`, a `blockAlign` pedig
    `numChannels × bits/8` — ha nem jön ki, rossz offszetről olvasol. A csomagok ráadásul
    KEVERTEK: a TomMusic SFX-ek sztereók (és `JUNK` chunkkal kezdődnek, tehát a `fmt ` nem
    a 12. bájton van), a `necroHurt` viszont 16 kHz mono.
26. **MULTIPLY telegraph-tint egy FEKETE lényen: a testen no-op, a KEZÉBEN lévő világos
    tárgyon viszont látszik — és pont az a telegraph.** Az Ancient Demon köpenye
    `rgb(14,12,12)`; bármilyen MULTIPLY tinttel szorozva gyakorlatilag ugyanaz marad, tehát
    a Mad King arany/piros telegraph-receptje itt elvileg használhatatlan lett volna. A
    telegraph PILLANATÁBAN viszont épp a VILÁGOS PENGE (`rgb(128,123,122)`) van a magasban,
    amin a szorzás tisztán látszik — a tint tehát pontosan azt a képelemet színezi, ami az
    információt hordozza. **Mielőtt elvetnél egy tint-telegraph-ot „túl sötét a sprite"
    alapon, nézd meg, mi van a KEZÉBEN a windup alatt.** (Ugyanez fordítva: a HIT-villanás
    itt kötelezően `TintModes.FILL`, mert egy MULTIPLY-villanás a fekete testen tényleg
    láthatatlan lenne — lásd a 14. tanulságot.)
27. **Ha egy terület-támadás hatótávja EGYBEESIK a reaktív közelharcéval, a reaktív ág
    kiéhezteti a rotációt.** Az Ancient Demon árny-hulláma (`NOVA_HIT_RANGE = 90`)
    független levezetésből pontosan a kaszakombó hatótávjára (`SLASH_RANGE = 90`) esett. A
    Wing-Breaker/Mad King mintáját követve (reaktív közelharc ELŐBB, rotáció utána) a nova
    így SOHA nem sült volna el ott, ahol egyáltalán találhat: a démon a közelharci sávban
    örökös kombó-gépezet lett volna, a fő támadása pedig halott kód. A javítás a SORREND
    megfordítása — a rotáció fut előbb, a reaktív kombó a fallback —, és mivel a rotáció
    tagjainak van saját cooldownjuk, a kombó továbbra is a leggyakoribb támadás marad.
    **Ez a 2. tanulság rokona:** ott a prioritási sor élén álló támadás monopolizált, itt a
    reaktív ág éheztet ki mindent — mindkét esetben egy „mindig igaz" feltétel a hibás.
28. **ÁTLÁTSZATLAN, keretes háttér-panel elé NE tegyél csempézett réteget.** A GothicVania
    Church `backgrounds.png`-jének öt panelje TELJESEN átlátszatlan, és mind a négy szélükön
    `rgb(39,38,56)` a keretük. Ez elsőre hátránynak tűnik, valójában ajándék: **lapos, pont
    ilyen színű háttér előtt varrat nélkül beleolvadnak**, tehát a Level 3-nak nem kell
    parallax rétege — a világ-koordinátás panelek MAGUK a fal.
    Kipróbáltam a fordítottját is (a mért módon mindkét irányban varratmentes `wall-brick`
    csempe a teljes háttéren), és a render egyértelmű: **a panelek látható sötét
    téglalapként ülnek a téglafal előtt.** A keret színe (39,38,56) és a tégla átlaga
    (28,27,63) között ugyan csak ~11 egység a különbség, de a tégla MINTÁS — egy sima folt
    azonnal „javítatlan textúrának" olvas.
    **Általánosítva:** mielőtt egy réteget beteszel egy díszlet MÖGÉ, nézd meg, hogy a díszlet
    átlátszó-e ott, ahol nincs rajta rajz. Ha nem az, a réteg nem mögé kerül, hanem KERETET
    rajzol köré. *(A Level 1/2 sziluettjei alpha-kivágottak, ezért ott a kérdés fel sem merült
    — ez a csomag más felépítésű.)*

## Ideiglenes/debug elemek a kódban (Phase 8 – Atmosphere-ben cserélendők)

- A Level 1-en már **csak a hazardok, a lövedékek és az ajtó mögötti folyosó** kódból generált
  (`generateTexture`): a tüskék, a Swinging Reaper (horgony + penge), a köztes checkpoint
  jelölője, a `door-interior-placeholder` (függőleges átmenet, ami kitakarja az égboltot a
  boltív nyílásában), valamint a player és a boss lövedéke. A három karakter, mindkét háttér és a
  teljes terrain (talaj, platformok, létra, ajtó) valódi pixel art.
  A `ground-placeholder` / `platform-placeholder` textúra megmarad, de a Level 1-en már
  **láthatatlan fizikai testként** (a `ground-placeholder`-t a `BossScene` is használja)
- CrowHarvester felett lebegő HP szöveg (debug célra, valódi HUD a `ui/` modulban készül majd)
- A bal felső sarki HUD szöveg a HP mellett a **player state-et is kiírja** (`HP: 100/100 | CLIMB`) — a mászás manuális tesztelését segíti, Phase 8-ban cserélendő
- A boss találat-visszajelzése **szándékosan** csak fehér sziluett-villanás (`TintModes.FILL`),
  nincs hurt animáció: egy bossnál a minden ütésre bekövetkező flinch megszakítaná a
  telegraph-okat. NEM placeholder, hanem design-döntés — a `Hurt` frame-ek a falnak ütköző
  charge staggerjében szerepelnek
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
- A checkpoint-prompt szöveg ("E: Checkpoint" / "Checkpoint mentve...") debug-stílusú `add.text`, a `playerHpText`-hez hasonlóan — valódi UI a `ui/` modulban készül majd
- A `BossScene` HP-barja nyers `Graphics`-szal rajzolt téglalap (`drawBossHealthBar()`), és a player HP-ja ott is a debug `add.text` — mindkettő a `ui/` modulba költözik Phase 8-ban
- A boss lövedéke (`boss-projectile-placeholder`) még lila kör. A `Cast` animáció végén
  **varjak röppennek fel** a kaszáról — egy varjú-lövedék tökéletesen illene a témához,
  de az az `assets/effects/` iteráció dolga
- A Gravecaller lövedéke (`gravecaller-projectile-placeholder`) mérgeszöld kör, világos
  maggal. **Három lövedék-forrás van a pályán**, ezért három szín: player narancs, boss
  lila, Gravecaller zöld. *(A Necromancer csomagban VAN cast-effekt sheet, de a mérés
  szerint az egy szétfoszló BECSAPÓDÁS — 30→4 px —, nem loopolható repülő bolt, ezért
  maradt a placeholder; valódi asset az `assets/effects/` iterációban.)*
- A Level 2 **létrája (`ladder-placeholder`) és boss-ajtaja (`door-placeholder`)** még kódból generált: a GothicVania Town csomagban nincs létra, a cathedral `door-gate` geometriája (`DOOR_APERTURE`, `DOOR_THRESHOLD_PX`) pedig ahhoz a konkrét PNG-hez van mérve. Olcsó részleges javítás a Level 1 `tile-ladder`-ének újrahasználata (már be van töltve)
- A `BootScene.START_SCENE` jelenleg a NORMÁL `'Level1Scene'` értéken áll. Fejlesztéshez bármelyik pálya/aréna kulcsára átírható (`'Level2Scene'`, `'Boss2Scene'`, `'FinalBossScene'`, ...), hogy az adott szakasz a lánc végigjátszása nélkül tesztelhető legyen — **de commit előtt mindig vissza `'Level1Scene'`-re**
- **HÉT placeholder lore-szöveg** van a kódban, mind a Phase 9 – Lore-ban cserélendő (mindegyik egy tömb-szerkesztés): a `BossScene` `WING_BREAKER_DIALOGUE`-ja és `BOSS_VICTORY_NARRATION`-ja, a `Level2Scene.LEVEL2_END_NARRATION`, a `Boss2Scene` `KING_DIALOGUE`-ja és `KING_VICTORY_NARRATION`-ja, valamint a `FinalBossScene` `DEMON_DIALOGUE`-ja és `ENDING_NARRATION`-ja (utóbbi a JÁTÉK ZÁRÓ SZÖVEGE). A `CreditsScene` `CREDITS` listája szintén placeholder, de az nem lore, hanem attribúció
- A `BootScene` "Betöltés..." szövege + progress-sávja nyers `add.text` / `Graphics` — a `ui/` modulba költözik, amint több asset (sprite-ok) is betöltendő lesz
- `main.ts`-ben `arcade.debug` — jelenleg **`false`**. `true`-ra állítva kirajzolja a physics
  bodykat és a létra zónáját; a layout hangolásához hasznos, a látvány megítéléséhez zavaró
- A training dummy és a régi 'H' debug billentyű (self-damage teszteléshez) már törölve lett, miután a CrowHarvester valódi sebzésforrássá vált

## Következő lépés

**A DÖNTÉSI PONT ELDŐLT: „Többi Enemy típus, Level2 és 2. Boss".** Ebből az
**Enemy 2 (Gravecaller), a Level 2 és a Boss 2 (The Mad King) is KÉSZ** — lásd fentebb.
Ami a választott irányból még hátravan:

1. **Level 2 – The Crowless Quarter.** A geometria (`Level2Layout.ts`, 7200 px, 9 szakasz,
   mozgó platformok, hazardok, 8 CrowHarvester + 6 Gravecaller + 1 Beast) és a LÁTVÁNY is KÉSZ.
   A **zene is KÉSZ** (`Shadowforge Convergence`, AlkaKrab — lásd az Audio szakaszt).
   Hátravan: **SFX**, és a hazard-/lövedék-/létra-/ajtó-placeholderek cseréje.
2. ~~**Boss 2.**~~ **KÉSZ** — *The Mad King*, lásd fentebb. Zene még nincs (user adja hozzá).
3. ~~**A VÉGSŐ ELLENFÉL (a démon).**~~ **KÉSZ (2026-08-30)** — *Ancient Demon, Omen of
   Crows*, lásd fentebb. Vele jött az **ending** és a **`CreditsScene`**, tehát
   **A LÁNC BEZÁRULT**: `Level 1 → Boss 1 → Level 2 → Boss 2 → Final Boss → ending →
   credits`.
4. ~~**Enemy 3 – Beast** (opcionális, a terv szerint is)~~ **KÉSZ (2026-08-31)** — lásd az
   „Enemy 3 — Beast" szakaszt fentebb. A Level 2 utolsó CrowHarvestere (`H-crow-2`) lett
   lecserélve rá, tehát a pálya egy ÚJ mechanikával zárul a Mad King előtt.

**A választott irányból MINDEN kész — az opcionális Beasttel együtt —, és 2026-08-31-én
BŐVÜLT a lánc egy negyedik játszható blokkal (Level 3 + Beast Master).** Ami a játék
egészéből hátravan:

- **A `CreditsScene` TARTALMA** (user: későbbi iteráció) — és ugyanott a nyitott
  licenc-tételek lezárása. **A church csomag PDF-licence új tétel**, lásd lentebb.
- **Phase 9 – Lore:** immár **KILENC** placeholder szöveg cseréje (a Level 3 ajtó-átvezetője,
  a Beast Master párbeszéde + győzelmi narrációja, majd a Wing-Breaker
  `WING_BREAKER_DIALOGUE`-ja jött hozzá).
- **Phase 8 maradéka:** a Level 2 **és a Level 3** SFX-ei, a hazard-/lövedék-placeholderek,
  a Level 2 létra/ajtó grafikája, az `ui/` modul (valódi HUD).

Hasznos, hogy a Gravecaller iterációja **általánosította a scene enemy-kezelését**: a
`LevelEnemy` interfész + a `type` mező az `ENEMY_SPAWNS`-ban — és ez a Beastnél **be is
vált**: az integráció tényleg egy tömb + egy `spawnEnemies()` ág volt.
*A Level 3-mal ez a szál LEZÁRULT: a spawnolás kikerült a közös `levels/LevelEnemies.ts`-be,
tehát mindhárom pálya minden típust ismer, és a „Level 1 nem ismeri a Beastet" tiltás (meg a
tesztje) okafogyottá vált.*

---

**LEVEL 1 FINOMHANGOLÁS — 2. kör (továbbra is NYITVA).** Az 1. kör (A szakasz gödre +
földi enemy üldözés) KÉSZ, lásd fentebb. **A blokk addig nyitva marad**, amíg a user
elégedett nem lesz a pályával. Új hangolópont a Gravecaller érkezésével:

- **A Gravecaller nehézsége az E és az F szakaszban.** A `PROJECTILE_DAMAGE` (10) és a
  `REPOSITION_MS` (1200) a két elsődleges knob; a lövés-ciklus jelenleg 2360 ms. Ha túl
  ártalmatlannak bizonyul, a `RETREAT_SPEED` (70) emelése vagy a `MAX_HP` (24) növelése a
  következő lépés — de mindkettő SZÁNDÉKOSAN alacsony (a user kérése: legyen könnyű
  megközelíteni és karddal megölni).
- **HP-mérleg: a MÁSODIK caster (`F-caster`) új nyomást tesz az F szakaszra**, ami eddig
  tisztán időzítés volt. Ha a boss-arénába túl sérülten érkezik a player, itt az `F-caster`
  a legkönnyebben visszavehető elem (törölhető, vagy a `patrolMaxX` jobbra tolásával
  kivihető a `DETECTION_RANGE`-ből — utóbbit a layout-teszt azonnal jelzi).

A hangolás a user vezetésével történik. Amit az eddigi végigjátszások FELVETETTEK
(megfigyelés, nem javaslat — a döntés a useré):

- **HP-mérleg a pálya hosszán.** Egy végigfutásban a player ~50–70 HP-val ért az F szakaszhoz
  (enemy-csapások 8-anként + egy tüske 15). A pályán **nincs gyógyulás**, és a boss friss
  HP-t sem ad — a `BossScene`-be tehát erősen sérülten lehet belépni. Hangolható pontok:
  `CrowHarvester.ATTACK_DAMAGE` (8), `SPIKE_DAMAGE` (15), `REAPER_DAMAGE` (20), az enemyk
  száma/sűrűsége (`ENEMY_SPAWNS`), vagy egy checkpoint-gyógyulás bevezetése.
- **A Swinging Reaper büntetése.** Az `F1` platformon megállni garantált találat (a penge
  végigsöpri), és áthaladásonként 20 sebzés. Ha ez soknak bizonyul, az elsődleges
  nehézség-hangolópont a `periodMs` (2400, lassabb lengés = szélesebb ablak), utána a
  `REAPER_DAMAGE`.
- **A `main.ts` `arcade.debug`** minden hitboxot kirajzol, ami a layout vizuális megítélését
  érdemben rontja. Jelenleg `false`; egy geometria-hangoló körhöz kapcsold vissza.
- **Tutorial feliratok hossza** (`HINT_HOLD_MS` = 4000) és pozíciója.
- **A köztes checkpoint helye** (x=3000, a spike-szakasz után) — a G4/E szakasz és az F
  szakasz így egyetlen, hosszú, checkpoint nélküli blokk.

**Phase 8 – Atmosphere folyamatban.** Az 1. iteráció (boss music) kész; ami még hátravan:
- **A maradék sound effectek** (Project_plan.md 18. pont listája). A **teljes harci hangkép
  KÉSZ** (7–8. iteráció): kardsuhintás + becsapódás, mindkét tűzgolyó, a Shadow Spell és az
  enemy/boss közelharc. A **13. iteráció** hozzátette a **player léptek / ugrás / halál**
  hangját és **mindkét enemy haláltusáját**. Ami még hiányzik: a **tűzgolyók becsapódása**,
  az **enemy→player sebzés** (hurt), a **charge**, a **landolás** (a TomMusic csomagban ott
  a `Stone Chain Land.wav`, közvetlenül a lépés mellett) és a **checkpoint**. Mindegyik
  ugyanaz a három lépés: asset + `SFX_KEYS` bejegyzés + egy `playSfx()` hívás (a nem-scene
  helyeken egy event a bevett minta szerint). A TomMusic csomagban van hozzájuk
  `Spell Impact`, `Doors Gates and Chests` (checkpoint) és `Torch` is.
- **Environment sprite-ok** — a player (2. it.), a CrowHarvester (3. it.), a Level 1 háttere
  (4. it.), a boss aréna háttere (5. it.), a boss (6. it.), a Level 1 terrainje (10. it.) és
  a TELJES Level 2 látvány kész; **már csak a hazardok** (tüske, reaper, checkpoint-jelölő),
  a **HÁROM lövedék**, valamint a **Level 2 létrája és boss-ajtaja** placeholder.
  A `2D helper/Sprites/` alatt van még Enemy01/02/03/05 és egy "Gino Character" — ha
  bármelyik enemy-jelöltként bejön, számíts rá, hogy szintén off-center lesz; a
  `systems/SpriteFacing.ts` már készen áll rá (lásd a 16. technikai tanulságot).
- **Hangulati propok a Level 1-re (11. iteráció) — KÉSZ**, lásd fentebb. **A GothicVania Town
  csomag ÚJ a projektben → a user `2D helper/Credits.txt`-jébe felveendő**
  (`https://opengameart.org/content/gothicvania-town`). **A Level 2 látvány-iterációja
  ugyanennek a csomagnak az `environment` mappáját használja fel** (parallax rétegek, talaj,
  fa-platformok, házak, `barrel`, `sign`) — egy credit-sor tehát mindkettőt lefedi.
  A csomagban ezután is maradt kihasználatlan elem: a `stairs*` lépcső-készlet (16×32-es
  fokok — a projektben nincs átlós járható elem), a `window`/`roof`/`wall` házépítő csempék,
  és a `Music/rpg_village02_loop` sáv.
- **Menü / átvezető ambient.** MIND AZ ÖT sáv KÉSZ: Level 1, Level 2 és mind a három boss
  aréna. Már csak a `NarrationScene` és a `CreditsScene` néma. Figyelem: az `AudioManager`
  **scene-hatókörű** (a scene shutdownja elvágja) — ez a pálya-zenéknél előny, de egy
  scene-eken ÁTÍVELŐ sávhoz (pl. menü → pálya megszakítás nélkül) game-szintűvé kell emelni.
- Megmaradt `TODO (Phase 8)` kommentek a kódban: fázisváltás sting (`BossScene.registerBossEvents()`),
  narration ambient (`NarrationScene.create()`), victory sting (`BossScene.scheduleVictory()`).
- A maradék kódból generált placeholder téglalapok cseréje valódi pixel art sprite-okra
  (`assets/effects/`): a hazardok (tüske, reaper, checkpoint-jelölő) és a három lövedék.
  **Mindkét háttér, mind a három karakter és a Level 1 terrainje kész.**
- `ui/` modul: valódi HUD a debug `add.text`-ek helyett, és a boss HP-bar átköltöztetése
  a `BossScene.drawBossHealthBar()`-ból. Ide kerülhet a `BootScene` betöltésjelzője is.

**Phase 8 után jön a Döntési pont** (lásd fentebb és a Project_plan.md 21. pontjában):
többi Enemy típus + Level + Bossok, VAGY tovább a Lore (Phase 9) / QA (Phase 10) irányba.

Nyitott, nem blokkoló polish-tételek:
- ~~Szakadékok (gap) bevezetése a Level 1 layoutjába (Project_plan.md 13. pont).~~
  **KÉSZ** — Level 1 Redesign, 1. iteráció: négy szakadék + zuhanás-halál.
- **A Gravecaller `VERTICAL_DETECTION_RANGE`-e (80) tágabb, mint a lövedék tényleges
  találati sávja**, ezért az `E3` platformon állva az `E2` casterje tüzel, de a bolt a
  player lába alatt megy el (lásd az Enemy 2 szakaszt). User-döntés, hogy egyelőre marad.
  **Ha valaha javítjuk, a levezetés készen van** — a kaput nem hangolni kell, hanem
  származtatni:
  ```
  kapu = PROJECTILE_SIZE/2 (8) + PLAYER_BODY_HEIGHT/2 (23)
       − minimum átfedés (6) − a két lény középpont-magasságának eltérése (5)   = 20
  ```
  (a „középpont-eltérés" = `PLAYER_HALF_HEIGHT` 24 − a Gravecaller `FEET_OFFSET_Y`-ja 19).
  Mellékhatás, amivel számolni kell: 20-as kapunál a caster UGRÁS közben nem indít castot,
  tehát a lövedékeit át lehet ugrani — mint a bossét.
- A knight csomagban van még **landolás** (`Jump.png` `f6–7`), és több nem használt sheet
  (Roll, Slide, crouch, Hanging, Pray, attack_from_air) az eredeti forrásmappában. Ezekhez
  nincs state a játékban, és a Project_plan.md sem tervez ilyet — csak akkor kerüljenek be,
  ha külön döntés születik róluk (a `Pray` pl. jó checkpoint-animáció lenne).
- **A boss balanszát újra kell nézni a sprite-csere után.** A `SLASH_RANGE` 70 → **138**,
  mert a hitboxot a projekt elve szerint az animációból vezetjük le (a kasza mért nyúlása
  2×-es skálán). A boss így 70–138 px között is slashelhet, ahol a player még nem éri el
  (a player kardja +59-ig ér a saját középpontjától) — a fight ettől érdemben nehezebb.
  **RÉSZBEN LEZÁRVA (2026-09-01):** a hatótáv-fölényt nem elvettük, hanem IDŐT adtunk mellé —
  `SLASH_WINDUP_MS` 400 → **900**, arany telegraph-fal (lásd a „FAIRNESS-HANGOLÁS" blokkot a
  boss szakaszában). A következő knobok, ha még mindig nehéz: `ACTION_COOLDOWN_MS` (900) ↑,
  utána `SLASH_DAMAGE` (18) ↓ — a winduphoz ne nyúlj, azt levezetés köti.
  A többi boss-szám (HP 240, a másik két sebzés, cooldownok) továbbra is az első,
  hangolatlan érték.
- **A charge sebzése a boss TESTÉHEZ kötött** (`CHARGE_HIT_RANGE = 54` sugár), miközben a
  dash pózban a kasza ~60 világ-pixellel a test előtt jár. 420 px/s mellett ez ~143 ms
  eltérés, gyakorlatilag észrevehetetlen — de ha kézi teszten mégis "átmegy rajtam és nem
  sebez" érzést kelt, egy irányfüggő (előre néző) találat-ellenőrzés a javítás.
- **A Shadow Spell egyetlen nehézség-hangolópontja** a `SPELL_TELEGRAPH_LOOPS` (jelenleg 4 =
  960 ms kitérési ablak) a `GraftedWingBreakerAnimations.ts`-ben. A becsapódó oszlop sötét,
  a tintelt katedrális-háttér előtt lehet, hogy kevésbé olvasható — ilyenkor a `BACKGROUND_TINT`
  vagy egy világító particle a következő lépés.