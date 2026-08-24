# 2D Dark Fantasy Action Platformer – Projekttervezet

## 1. Projekt célja

Egy kis méretű, böngészőben játszható, 2D dark fantasy action platformer játék létrehozása AI-assisted / prompt-driven fejlesztési módszerrel.

A projekt egyszerre három célt szolgál:

1. **Fun hobby projekt:** egy saját, atmoszférikus, játszható dark fantasy játék elkészítése.
2. **AI-assisted development gyakorlása:** a fejlesztés jelentős részét promptolással, AI segítségével végezni.
3. **QA Engineer fejlődés:** a játékhoz valódi tesztelési stratégiát, automatizált teszteket és CI/CD pipeline-t készíteni.

A projektet nem professzionális indie game fejlesztésként, hanem egy **kis scope-ú, de teljes értékű vertical slice / indie prototype** projektként kezeljük.

---

# 2. Technológiai döntés

## Választott framework: Phaser

A korábban vizsgált Three.js helyett végül **Phaser** mellett döntöttünk.

### Miért Phaser?

A játék 2D side-scrolling action platformer, ezért a Phaser természetesebb választás, mint a Three.js.

A Phaser kifejezetten webes 2D játékfejlesztésre készült, és számos olyan funkciót biztosít, amelyre a játékunknak szüksége lesz:

- 2D rendering
- sprite-ok
- sprite animation
- keyboard/mouse input
- gravity
- collision
- platform physics
- projectile-ok
- kamera
- scene-ek
- particle effectek
- audio
- asset loading
- game state kezelés

A cél az, hogy ne saját physics/collision/game engine-t kelljen építeni, hanem a meglévő Phaser rendszereket használjuk.

## Programozási környezet

- VS Code (Claude Code integráció)
- Node.js
- npm
- Phaser
- TypeScript
- Vite fejlesztői szerver
- Chrome/Edge/Firefox a játék futtatására
- Git
- GitHub
- GitHub Actions

A projekt lokálisan futtatható:

```bash
npm run dev
```

majd böngészőben például:

```text
http://localhost:5173
```

A fejlesztési workflow:

```text
VS Code
   ↓
Phaser project
   ↓
Vite development server
   ↓
localhost
   ↓
Browser
   ↓
Játék kipróbálása
   ↓
Visszajelzés / új prompt
   ↓
Következő iteráció
```

---

# 3. AI-assisted / prompt-driven fejlesztési modell

A cél nem az, hogy a fejlesztő minden kódot manuálisan írjon.

A projekt alapvetően ilyen ciklusban készül:

```text
Ötlet / követelmény
        ↓
Prompt
        ↓
AI által generált / módosított kód
        ↓
Projekt futtatása
        ↓
Manuális tesztelés
        ↓
Visszajelzés
        ↓
Hibajavítás / új feature
        ↓
Következő iteráció
```

Az AI feladata lehet többek között:

- projektstruktúra létrehozása
- Phaser kód generálása
- game logic implementálása
- player controller
- combat system
- enemy AI
- boss AI
- level logic
- UI
- audio integration
- particle effects
- game state
- save/checkpoint
- tesztek
- Playwright tesztek
- CI konfiguráció
- dokumentáció

A fejlesztő szerepe elsősorban:

- game designer / product owner
- reviewer
- manuális tester
- QA Engineer
- végső döntéshozó

A fejlesztés során nem cél minden kódot megérteni az első pillanatban, de az AI által létrehozott megoldásokat fokozatosan meg kell érteni és ellenőrizni.

---

# 4. A játék koncepciója

## Munkacím

**The Wingless Crow**

A cím később változtatható.

## Műfaj

**2D Dark Fantasy Action Platformer**

Inspirációk:

- Dark Souls / Elden Ring – dark fantasy hangulat, lore, bossok
- Blasphemous / The Last Faith / Hollow Knight – 2D dark fantasy action platformer jelleg
- általános Soulslike design philosophy

A cél nem egy meglévő játék lemásolása, hanem 1–2 kedvelt core concept saját, kis scope-ú játékba való átültetése.

---

# 5. Játék alapvető koncepciója

A játékos **Lazarus, the Crowmarked**-ot irányítja, aki a föld őrzője a halál és élet közötti kapunál.

Lazarus a varjak segítségével látja az egész világ eseményeit — a varjak a suttogói. Ezáltal tartja fenn a rendet, biztosítva, hogy aki meghal, átjusson az alvilágba, és aki már ott van, ne térhessen vissza.

Az őrült király felesége haldoklik. A király lepaktál egy ősi démonnal, hogy feltámassza a feleségét. A démon teljesíti a kérést, de a saját ördögi célját is véghezviszi: elfogja a varjakat, felborítva az élő és halott világ rendjét, hiszen nincs, aki őrizze a kaput. A démon megpróbálja átvenni az irányítást az élők világa felett. Démoni harcosok törnek elő az alvilágból, miközben a földi halottak nagy része nem tud távozni, vagy rossz helyre távozik.

Lazarust nem sikerül elzárni, de elveszíti a szárnyait — innen a *Wingless Crow* cím.

Lazarus útnak indul, hogy legyőzze a démont és a királyt, és helyreállítsa a varjakat és a két világ közötti rendet.

A végső cél a rend helyreállítása.

A játék végén a főhős **visszanyeri szárnyait**.

---

# 6. Játékidő és scope

## Végső cél

Körülbelül:

**10–30 perc játékidő**

Az első verzió ennél rövidebb is lehet.

## MVP / Vertical Slice

Az első cél nem több pálya elkészítése.

Az első működő verzió:

- 1 pálya
- 1–2 alap enemy
- 1 boss
- kard
- tűzgolyó
- platforming
- checkpoint
- death / respawn
- egyszerű lore
- boss zene
- ending

Ha ez elkészül és játszható, akkor már van egy komplett vertical slice.

Ezután lehet további pályákkal, feature-ökkel és assetekkel (pixelart, zene stb.) bővíteni.

---

# 7. Core gameplay loop

A játék alapvető ciklusa:

```text
Felfedezés
    ↓
Platforming
    ↓
Enemy encounter
    ↓
Combat
    ↓
Továbbhaladás
    ↓
Checkpoint
    ↓
Boss arena
    ↓
Boss fight
    ↓
Victory
    ↓
Következő pálya
```

A játék fő erőssége nem a komplex mechanikai mélység, hanem:

- atmoszféra
- egyszerű, de jól működő combat
- látvány
- zene
- boss encounter
- dark fantasy lore

---

# 8. Player

A játékos **Lazarus, the Crowmarked**, a halál és élet közötti kapu földi őrzője, aki elveszítette szárnyait.

## Mozgás

Alapvető mozgás:

- balra
- jobbra
- ugrás
- létrán mászás (fel/le)

Nem cél komplex platforming rendszer készítése.

> **Kiegészítés (Phase 6):** a létra-mászás utólag került be, a pálya végi függőleges
> átvezetéshez. Szándékosan minimális: a player egy zárt függőleges "sínen" mozog
> (nincs oldalra mozgás mászás közben, nincs támadás/varázslás létrán), a vízszintes
> input pedig mindig lelép a létráról. Nem tekintjük "komplex movement ability"-nek.

Nem szükséges első verzióban:

- wall jump
- double jump
- dash
- grapple
- air dash
- komplex movement ability

## Alapvető player state-ek

```text
IDLE
RUN
JUMP
FALL
ATTACK
CAST
HURT
CLIMB
DEAD
```

---

# 9. Combat

A combat egyszerű marad.

## Kard

A playernek **egyetlen kardtámadása** van:

### Sword Attack

Nagy ívű csapás, közepes tempó. (Korábban a terv két támadást — Light és Heavy — írt le;
a kettő egyetlen támadássá vonódott össze: a nagy ív animációját és hitboxát kapta meg,
a kisebb, "light" sebzéssel és közepes cooldownnal.)

Példa input:

```text
Left Mouse / J → Sword Attack
```

A pontos input később módosítható.

A combatnak rendelkeznie kell:

- attack animationnel
- attack cooldownnal
- hitboxszal
- damage értékkel
- enemy hit detectionnel
- enemy hit reactionnel

---

# 10. Magic

Egyetlen távoli varázstámadás:

## Fireball

A játékos tűzgolyót indít.

Funkciók:

- projectile
- sebesség
- collision
- damage
- enemy hit
- eltűnés / impact effect

Első verzióban nem szükséges:

- több spell
- skill tree
- mana rendszer
- spell crafting

A cél az egyszerűség.

---

# 11. Ellenfelek

Első verzióban 2–3 egyszerű enemy archetype elegendő.

## Enemy 1 – CrowHarvester

Közelharcos.

> **Névváltás és vizuál (Phase 8, 3. iteráció):** ez az enemy eredetileg *Hollow / Knight*
> néven szerepelt (kardot forgató husk). A hozzá választott pixel art viszont egy
> **csuklyás, csőrös, kaszás dögevő** — ami sokkal jobban illeszkedik a 4–5. pont
> varjú-tematikájához, mint egy általános husk-lovag. Ezért a lény neve
> **CrowHarvester** lett, és az átnevezés végigfut a kódon (`enemies/CrowHarvester.ts`),
> a teszteken és ezen a dokumentumon. **A state machine és minden gameplay-paraméter
> változatlan** — ez tisztán elnevezés- és látvány-döntés.
>
> A fegyver ettől kezdve kasza, nem kard; a támadás telegraph-ja a magasba emelt penge.

Egyszerű state machine:

```text
PATROL
   ↓
DETECT PLAYER
   ↓
CHASE
   ↓
ATTACK
   ↓
COOLDOWN
   ↓
CHASE
```

**DETECT PLAYER kiváltói** (implementált):

- a player `DETECTION_RANGE`-en belülre kerül (220px), VAGY
- az enemy sebzést kap PATROL közben (kard vagy tűzgolyó) — így egy távolról
  indított tűzgolyó is felébreszti, nem csak a közelség

Visszaváltás PATROL-ra `LOSE_RANGE`-en (320px) túl — a két külön határ hiszterézist ad,
hogy a state ne pattogjon a detektálási határon.

**Platformon álló CrowHarvester** (Phase 6): a patrol range a platform tetejére korlátozható
(abszolút X-határok), és egy kapcsolóval elérhető, hogy CHASE közben se lépjen ki
ezekből — így nem sétál le a peremről, hanem ott várakozik, amíg a player a közelben van.

## Enemy 2 – Archer / Caster

Távolsági ellenfél.

```text
PATROL
   ↓
DETECT PLAYER
   ↓
MAINTAIN DISTANCE
   ↓
ATTACK
   ↓
REPOSITION
```

## Enemy 3 – Beast

Opcionális.

Gyorsabb, agresszívebb ellenfél.

```text
PATROL
   ↓
DETECT
   ↓
CHARGE
   ↓
ATTACK
   ↓
COOLDOWN
```

Nem cél komplex, adaptív AI létrehozása.

---

# 12. Boss rendszer

Minden nagyobb pálya végén lehet egy boss.

Első vertical slice-ban elég **1 boss**.

## Boss – The Grafted Wing-Breaker

Példa:

- nagyobb sprite
- nagy HP
- nagyobb damage
- nagyobb hitbox
- több attack
- boss arena
- boss music

### Phase 1

- sword slash
- távoli projectile attack, amit a player át tud ugrani
- **Shadow Spell** *(Phase 8-ban hozzáadva)* — a boss a kaszáját a magasba emelve
  árny-oszlopot idéz a player **akkori** pozíciójára. Az oszlop előbb izzásként lebeg a
  player feje fölött (~1 mp), és csak utána csap le, tehát **oldalra kilépve kikerülhető**
  (ugrással nem). A becsapódás helye a castolás pillanatában rögzül, nem követi a playert.
  Mindkét fázisban elérhető, saját 5 mp-es cooldownnal.
- basic movement

### Phase 2

50% HP alatt:

- gyorsabb mozgás
- új attack pl. charge támadás egyenes vonalban. Egy piros villanás jelzi, minimális windup-fázis kb. 1 másodperc. A player át tudja ugrani. A támadás után 3 mp cooldown idő, amíg a boss nem támad.

A cél nem egy Elden Ring szintű boss AI.

A cél egy olyan boss, amely:

- felismerhető támadási mintákkal rendelkezik
- kihívást jelent
- látványos
- jó zenével és arénával emlékezetes

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

---

# 13. Platforming

A platforming egyszerű marad.

Alapvető elemek:

- ground
- platform
- gap
- lépcsős platformok
- magasabb platformok
- egyszerű akadályok
- létra (függőleges átvezetés)
- egyirányú platform (alulról átjárható, felülről szilárd)

A Phaser physics rendszerét használjuk.

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

A játékos rendelkezik:

- gravityvel
- velocityvel
- ground detectionnel
- collisionnel
- jump velocityvel
- movement speeddel

Nem cél precíz platformer fizika létrehozása, mint például Celeste-ben.

---

# 14. Pályák

A végleges játékhoz például 3–5 rövid pálya készülhet.

Lehetséges pályák:

### Level 1 – Cathedral of the Guardian

Félig lerombolt templom.

Főbb elemek:

- tutorial movement
- első enemy
- első combat
- egyszerű platforming
- checkpoint
- boss arena

> **Level 1 Redesign (3 iterációs blokk, a Phase 8 közben beszúrva).** Az eredeti Phase 6-os
> Level 1 (3200 px, folyamatos talaj, hazard nélkül) pillanatok alatt átugrálható volt, és a
> 9 platform gyakorlatilag dekoráció maradt. A user írt hozzá egy részletes layout-specet
> (nyolc szakasz, A–H), ami alapján a pálya **6000 px**-re nőtt, és három olyan elemet
> kapott, ami korábban nem volt a kódban: **szakadék + zuhanás-halál**, **spike**, és egy
> **lengő kaszás (Swinging Reaper)** időzítés-alapú hazard.
>
> A szakaszsorrend: `A start/mozgás-tutorial · B első enemy · C platforming + gap ·
> D spike-tutorial · E kombinált kihívás · F Swinging Reaper · G záró harc · H boss-ajtó`.
>
> **1. iteráció — KÉSZ:** layout-váz, öt talaj-szegmens + négy szakadék, 13 platform,
> 8 CrowHarvester, zuhanás-halál, enemy-respawn, köztes checkpoint, tutorial feliratok.
> **2. iteráció — KÉSZ:** spike-ok (D szakasz), lásd lentebb. **3. iteráció — KÉSZ:**
> Swinging Reaper (F szakasz), lásd lentebb. **A blokk ettől még nyitva marad:** a Phase 8-ra
> visszatérés előtt finomhangolási körök futnak a teljes pályán.
>
> **Finomhangolás, 1. kör — az A szakasz mostantól VALÓDI ugrás-tutorial.** Az eredeti
> változatban a három lebegő platform folyamatos talaj FÖLÖTT lógott, tehát a player
> egyszerűen alattuk elfutott, és a pálya soha nem kényszerítette ugrásra — a tutorial
> dekoráció volt. Most egy 640 px-es szakadék van alattuk (start pad 0–320, talaj újra
> 960-tól), és a három platform hidalja át.
>
> **Ez ELTÉR a `level1-layout.md` specifikációjától**, ami az A szakaszra *„No environmental
> hazards"*-t és *„Player can safely test movement"*-et ír elő. Tudatos user-döntés: a lecke
> csak akkor tanít, ha az elvétett ugrásnak következménye van. A büntetés szándékosan
> minimális — a checkpoint a pálya eleje, tehát egy hibázás ~1,2 mp respawn + ~1,1 mp
> visszafutás. Következmény a spec szakasz-szerepeire: **az első platforming-kihívás
> mostantól az A szakasz**, a C pedig az első SZÉLES, talajszintű szakadék.
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

### Level 2 – The Crowless Forest

Elátkozott erdő.

Új elem:

- Archer
- sötétebb környezet
- több platforming

### Level 3 – The Throne of the Damned

Romos kastély.

Új elem:

- több enemy kombináció
- nehezebb platforming
- lore

### Final Level – The Broken Gate

A végső terület.

Final boss.

Ending.

A pályák száma később változtatható.

---

# 15. Boss arénák

A bossok előtt legyen egyértelmű transition:

```text
Normal level
    ↓
Boss entrance
    ↓
Music transition
    ↓
Boss arena
    ↓
Boss fight
    ↓
Victory
```

A boss belépése és a zene fontos része a játékélménynek.

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

> **Kiegészítés (Phase 8, 6. iteráció) — az aréna padlója üres lett:**
>
> Az eredetileg betett két alacsony oldalsó platform **törölve**. Indok: a boss valódi
> sprite-jával mindhárom kikerülhető támadás vízszintes mozgást kíván (charge = kitérés vagy
> átugrás, Shadow Spell = oldalra lépés), amihez akadálymentes padló kell; a platformok
> ráadásul beszorították volna a most 108 px magas bosst. Az aréna így egyetlen tiszta
> talajszint, ami a Shadow Spell találat-ellenőrzését is egyszerűvé teszi (csak vízszintes
> távolság).

---

# 16. Lore

## Alapkoncepció

Lazarus, the Crowmarked a föld őrzője a halál és élet közötti kapunál. A varjak segítségével látja az egész világ eseményeit — a varjak a suttogói. Ezáltal tartja fenn a rendet: biztosítja, hogy aki meghal, átjusson az alvilágba, és aki már ott van, ne térhessen vissza.

Az őrült király felesége haldoklik. A király lepaktál egy ősi démonnal, hogy feltámassza a feleségét. A démon teljesíti a kérést, de közben a saját ördögi célját is véghezviszi: elfogja a varjakat, felborítva az élő és halott világ rendjét, hiszen nincs, aki őrizze a kaput. A démon megpróbálja átvenni az irányítást az élők világa felett.

Démoni harcosok törnek elő az alvilágból, miközben a földi halottak nagy része nem tud távozni, vagy rossz helyre távozik.

Lazarust nem sikerül elzárni, de elveszíti a szárnyait.

A célja:

> legyőzni a démont és a királyt, hogy visszaállítsa a varjakat és a két világ közötti rendet.

## Ending

A végső boss legyőzése után:

- a király meghal, de feloldozást kap: a feltámasztott királyné már nem az volt, aki korábban, így együtt kerülhetnek nyugovóra és örökké együtt maradhatnak
- a démont legyőzik, és visszakerül a pokolba
- Lazarus visszanyeri szárnyait és a varjakat
- helyreáll a rend az élők és holtak világa között
- rövid narráció jelenik meg

Az ending lehet rövid, 30–60 másodperces.

---

# 17. Vizuális irány

A kívánt stílus:

**dark fantasy / gothic / atmospheric / pixel-art vagy dark illustrated pixel-art**

Főbb vizuális elemek:

- sötét színek
- romos kastélyok
- templomok
- kripták
- köd
- eső / hamu / particle effectek
- gyertyák
- fáklyák
- vér
- romos kőfalak
- gothic architecture
- erős kontraszt

A cél nem a technikailag tökéletes grafika.

A cél:

> **erős, konzisztens atmoszféra.**

---

# 18. Audio

A zene fontos része a játékélménynek.

## Normal gameplay

Dark ambient / medieval dark fantasy.

## Enemy encounter

Feszültebb ambient / combat sound.

## Boss

Eposzi dark fantasy boss theme.

A boss zene legyen látványos és kontrasztos a normál pályákhoz képest.

## Sound effects

Legalább:

- sword swing
- sword hit
- fireball cast
- fireball impact
- player hurt
- enemy hurt
- enemy death
- jump
- landing
- boss attack
- boss hurt
- boss death
- checkpoint
- UI interaction

A hangokat és zenéket lehetőség szerint AI segítségével generáljuk vagy AI-assisted asset pipeline-ban állítjuk elő.

A cél, hogy lehetőleg ne kelljen manuálisan asseteket vadászni és szerkeszteni.

> **Implementációs állapot (Phase 8, 1. iteráció) — boss music:**
>
> - **Kész:** `systems/AudioManager.ts` (egy zenesáv, loop, fade-in/fade-out) + a boss theme
>   (`assets/audio/boss-theme.mp3`). A zene a boss belépőjénél indul, a harc alatt loopol, és
>   elhalkulva leáll, ha a player VAGY a boss meghal.
> - **Még nincs:** sound effectek (a fenti lista), level/menü ambient, fázisváltás-sting,
>   narráció alatti zene, globális hangerő/némítás vezérlő.
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

---

# 19. Asset stratégia

A projekt egyik fontos célja:

> lehetőleg minél több mindent AI segítségével állítsunk elő.

Lehetséges AI-assisted assetek:

- player sprite
- enemy sprite
- boss sprite
- background
- environment
- tiles
- effects
- UI
- music
- sound effects
- lore
- dialogue

Fontos:

Az AI-generated asseteket mindig ellenőrizni kell.

Problémák lehetnek:

- inkonzisztens art style
- rossz sprite méret
- hibás animáció
- rossz transparency
- asset naming
- rossz frame order
- nem megfelelő loop
- túl nagy fájlméret

Ez önmagában is érdekes QA feladat.

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

---

# 20. Javasolt projektstruktúra

A végleges struktúra később változhat, de körülbelül:

```text
the-wingless-crow/
│
├── package.json
├── index.html
├── vite.config.js
├── tsconfig.json
│
├── src/
│   ├── main.ts
│   │
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── Level1Scene.ts
│   │   ├── Level2Scene.ts
│   │   ├── BossScene.ts
│   │   ├── NarrationScene.ts
│   │   └── EndingScene.ts
│   │
│   ├── player/
│   │   ├── Player.ts
│   │   └── PlayerController.ts
│   │
│   ├── enemies/
│   │   ├── CrowHarvester.ts
│   │   ├── Archer.ts
│   │   └── Beast.ts
│   │
│   ├── bosses/
│   │   └── GraftedWingBreaker.ts
│   │
│   ├── combat/
│   │   ├── Attack.ts
│   │   ├── Projectile.ts
│   │   └── DamageSystem.ts
│   │
│   ├── systems/
│   │   ├── GameState.ts
│   │   ├── CheckpointSystem.ts
│   │   └── AudioManager.ts
│   │
│   └── ui/
│       ├── HUD.ts
│       ├── Menu.ts
│       └── Dialogue.ts
│
├── assets/
│   ├── sprites/
│   ├── backgrounds/
│   ├── tiles/
│   ├── effects/
│   ├── audio/
│   └── music/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── README.md
```

Nem szükséges ezt az egész struktúrát az első napon létrehozni.

A struktúrát a projekt fejlődésével együtt alakítjuk.

> **Pontosítások (Phase 7):**
>
> - A boss fájlneve `bosses/GraftedWingBreaker.ts` (nem `TheGraftedWingBreaker.ts`) —
>   a névelő a megjelenített címben marad, a fájlnévben nem.
> - Új, eredetileg nem tervezett scene: **`scenes/NarrationScene.ts`** — adatvezérelt
>   szöveges átvezető (`{ lines, nextScene, title? }`), typewriter megjelenítéssel. Nem
>   "boss utáni" scene: ugyanez fogja kiszolgálni a 9. pont introját és a tervezett
>   `EndingScene.ts` / `ui/Dialogue.ts` szerepét is, ezért azok külön fájlként valószínűleg
>   már nem lesznek szükségesek.

---

# 21. Fejlesztési roadmap

## Phase 0 – Design

- játék koncepció véglegesítése
- core loop
- controls
- art direction
- lore alapjai
- első pálya terve

## Phase 1 – Phaser setup

- Node.js
- npm
- Vite
- Phaser
- VS Code
- localhost
- első Phaser scene

## Phase 2 – Player

- movement
- jump
- gravity
- collision
- camera

## Phase 3 – Combat

- sword
- sword attack
- damage
- hitbox
- player HP
- death

## Phase 4 – Magic

- fireball
- projectile
- collision
- damage

## Phase 5 – Enemy

- CrowHarvester
- enemy state machine
- attack
- damage
- death

## Phase 6 – Level

- level layout
- platforms
- environment
- checkpoint
- transition

> **Újranyitva a Phase 8 közben — „Level 1 Redesign", 3 iteráció.** Az eredeti Phase 6-os
> layout túl egyszerű volt (3200 px, folyamatos talaj, hazard nélkül). Az új, nyolc szakaszos
> 6000 px-es pálya részletei a 14. pontnál. Az 1. iteráció (layout-váz + gap + zuhanás-halál
> + enemy-respawn + köztes checkpoint + tutorial feliratok), a 2. iteráció (spike-ok + a
> minden hazardra közös i-frame kapu) és a 3. iteráció (Swinging Reaper) **kész**, ahogy a
> finomhangolás 1. köre is (A szakasz gödre + a földi enemyk üldözési modellje). A blokk
> **nyitva marad** további hangolásra, mielőtt a Phase 8 folytatódna.

## Phase 7 – Boss

- boss
- boss HP
- attack patterns
- phase 2
- boss arena
- boss victory

## Phase 8 – Atmosphere

- sprites — *részben kész: a **player** (2. iteráció), a **CrowHarvester** (3. iteráció) és a
  **boss** (6. iteráció) valódi pixel artot és animációkat kapott, lásd 19. pont. A **Level 1
  terrainje** (talaj, platformok, létra, boss-ajtó) a 10. iterációban cserélődött le
  (`assets/tiles/cathedral/`). Már csak a **hazardok** (tüske, reaper, checkpoint-jelölő) és a
  **két lövedék** placeholder.*
- backgrounds — ***kész**: a **Level 1** háromrétegű parallax hátteret (4. iteráció), a
  **boss aréna** pedig egy álló festményt kapott (5. iteráció). Lásd 19. pont.*
- particles
- lighting-like effects
- music — *kész: boss theme (1. iteráció) és Level 1 ambient (9. iteráció), lásd 18. pont*
- sound effects — *kész: a teljes harci hangkép (7–8. iteráció). Hiányzik még a
  tűzgolyó-becsapódás, a hurt, a charge, az ugrás/halál/checkpoint/léptek.*
- environment props — ***kész** (11. iteráció): 11 nem ütköző hangulati elem a Level 1-en
  (utcai lámpa ×3, szekér ×2, kút ×1, láda ×2, ládahalom ×3). Forrás: GothicVania Town
  (Luis Zuno) — public domain. Az elhelyezés unit-tesztelt: egyik prop sem takar hazardot,
  checkpointot vagy a létrát.*
- UI

## Döntési pont: 

- Többi Enemy típus, Level és Bossok létrehozása VAGY haladunk tovább a Lore, QA irányba és ha mindez megvan, akkor bővítjük csak a többi Enemy, Level és Boss hozzáadásával.

## Phase 9 – Lore

- intro
- environmental lore
- boss dialogue
- ending

## Phase 10 – QA

- test strategy
- unit tests
- integration tests
- E2E tests
- visual regression
- cross-browser testing
- performance testing
- CI/CD

## Phase 11 – Deployment

- production build
- GitHub repository
- GitHub Actions
- GitHub Pages
- public URL

---

# 22. QA stratégia

A projekt fontos része egy valódi QA/testing workflow létrehozása.

A cél nem pusztán az, hogy a játék „működjön”, hanem hogy demonstráljuk:

> hogyan lehet egy interaktív 2D webes játékot strukturáltan tesztelni.

---

# 23. Unit testing

Tesztelendő komponensek:

## Player

- movement calculation
- health
- damage
- death
- respawn

## Combat

- sword attack damage
- fireball damage
- cooldown
- attack state

## Enemy

- HP
- damage
- death
- state transitions

## Boss

- HP
- phase transition
- attack state
- death

## Game state

- current level
- checkpoint
- progression
- boss defeated state

## Utility logic

- damage calculation
- cooldown
- timers
- state machines

---

# 24. Integration testing

Több komponens együttműködését teszteljük.

Példák:

### Sword → Enemy

```text
Player attacks
↓
Attack hitbox activated
↓
Enemy detected
↓
Damage applied
↓
Enemy HP decreased
```

### Fireball → Enemy

```text
Fireball created
↓
Projectile moves
↓
Collision
↓
Enemy takes damage
↓
Projectile destroyed
```

### Checkpoint → Respawn

```text
Player reaches checkpoint
↓
Checkpoint saved
↓
Player dies
↓
Player respawns
↓
Player appears at checkpoint
```

### Boss

```text
Boss HP reaches 50%
↓
Phase 2 triggered
↓
New attack pattern active
```

---

# 25. End-to-End testing

A játék böngészőből, valódi user flow-kon keresztül legyen tesztelhető.

Elsődleges eszköz:

**Playwright**

Lehetséges E2E tesztek:

## Smoke test

```text
Launch game
↓
Main menu appears
↓
Start game
↓
Level loads
↓
Player appears
```

## Movement

```text
Start game
↓
Press right
↓
Player moves
↓
Press jump
↓
Player leaves ground
↓
Player lands
```

## Combat

```text
Encounter enemy
↓
Attack
↓
Enemy HP decreases
↓
Kill enemy
↓
Enemy disappears
```

## Fireball

```text
Cast fireball
↓
Projectile created
↓
Projectile moves
↓
Enemy hit
↓
Damage applied
```

## Checkpoint

```text
Reach checkpoint
↓
Die
↓
Respawn
↓
Verify checkpoint location
```

## Boss

```text
Reach boss arena
↓
Boss appears
↓
Boss music starts
↓
Fight boss
↓
Boss reaches 50%
↓
Phase 2
↓
Boss defeated
↓
Victory state
```

## Ending

```text
Final boss defeated
↓
Ending scene
↓
Lore text
↓
Final message
```

---

# 26. Visual regression testing

A 2D játék esetén ez különösen hasznos.

Baseline screenshotok készülhetnek például:

- Main Menu
- Level 1 start
- Checkpoint
- Boss arena
- Boss Phase 2
- Death screen
- Victory screen
- Ending

A CI összehasonlíthatja az új build screenshotjait a baseline képekkel.

Ezzel észlelhetők például:

- eltűnt sprite
- rossz sprite pozíció
- hibás UI
- elrontott background
- rossz kamera
- hibás boss arena
- asset loading probléma

---

# 27. Cross-browser testing

Tesztelendő:

- Chromium
- Firefox
- WebKit

Ellenőrzések:

- game loading
- input
- rendering
- audio
- UI
- gameplay
- JavaScript errors

---

# 28. Error / console testing

Az E2E tesztek figyeljék:

- uncaught JavaScript exception
- failed asset loading
- 404 asset
- Phaser runtime error
- kritikus console error

A teszt akkor is bukjon el, ha a játék látszólag működik, de közben kritikus hibát generál.

---

# 29. Performance testing

A játék teljesítményét is vizsgáljuk.

Lehetséges mérőszámok:

- FPS
- frame time
- asset loading time
- memory usage
- hosszabb játék után jelentkező performance degradation

Cél:

A játék normál gameplay során stabilan fusson, és ne legyenek indokolatlan performance regressziók.

---

# 30. Asset testing

Automatikusan ellenőrizhető:

- minden szükséges asset létezik
- nincs broken asset reference
- nincs 404
- minden sprite betölthető
- minden audio betölthető
- minden szükséges animation frame létezik

AI-generated assetek miatt ez különösen fontos.

---

# 31. CI/CD

A végső pipeline körülbelül:

```text
Git push
    ↓
GitHub Actions
    ↓
npm install
    ↓
Unit tests
    ↓
Build
    ↓
Integration / E2E
    ↓
Visual regression
    ↓
Cross-browser tests
    ↓
PASS
    ↓
Deploy
    ↓
GitHub Pages
```

Quality gate-ek például:

```text
Unit tests       PASS
Build             PASS
E2E               PASS
Visual regression PASS
Critical errors   0
```

Csak sikeres pipeline után történjen production deployment.

---

# 32. Deployment

A játék statikus webalkalmazásként készül.

Ezért a végleges játék közzétehető például:

**GitHub Pages**

A várható folyamat:

```text
Source code
↓
GitHub
↓
GitHub Actions
↓
Production build
↓
GitHub Pages
↓
Public URL
```

A játék így telepítés nélkül, böngészőből játszható.

---

# 33. QA dokumentáció

A repositoryban érdemes dokumentálni:

```text
README.md

docs/
├── game-design.md
├── architecture.md
├── test-strategy.md
├── test-plan.md
├── test-cases.md
├── automation.md
└── known-issues.md
```

A README röviden mutassa be:

- játék
- technológiák
- gameplay
- architecture
- testing
- CI/CD
- deployment
- screenshots
- public demo

---

# 34. Becsült fejlesztési idő

AI-assisted fejlesztéssel:

## Teljes játék

Körülbelül:

**27–53 óra**

A becslés erősen függ:

- asset minőségtől
- animációktól
- pályák számától
- boss komplexitásától
- mennyi polish-t szeretnénk

## Első playable vertical slice

Körülbelül:

**15–25 óra**

Tartalma:

- 1 pálya
- player
- movement
- jump
- sword
- fireball
- 1–2 enemy
- checkpoint
- 1 boss
- basic audio
- ending

---

# 35. Becsült QA idő

Egy érdemi QA réteg:

| Terület | Becsült idő |
|---|---:|
| Test strategy | 1–2 óra |
| Test plan / test cases | 2–4 óra |
| Unit tests | 3–5 óra |
| Integration tests | 2–4 óra |
| Playwright E2E | 4–7 óra |
| Visual regression | 2–4 óra |
| Cross-browser | 1–2 óra |
| Performance | 2–3 óra |
| CI/CD | 2–4 óra |
| Stabilizáció / bug fixing | 3–6 óra |
| **Összesen** | **~20–37 óra** |

Nem szükséges mindezt a játék végén elkészíteni. A tesztelés a fejlesztéssel párhuzamosan épülhet.

---

# 36. Első másfél hetes cél

A rendelkezésre álló idő:

**körülbelül 1 óra / nap, másfél héten keresztül.**

Ez körülbelül:

**10–12 óra.**

Ennyi idő alatt nem cél a teljes játék.

A cél:

# PLAYABLE VERTICAL SLICE

A másfél hét végére lehetőleg legyen:

```text
Main Menu
    ↓
Level 1
    ↓
Player movement
    ↓
Jumping
    ↓
Sword
    ↓
Fireball
    ↓
Enemy
    ↓
Checkpoint
    ↓
Boss
    ↓
Boss music
    ↓
Boss defeat
    ↓
Short ending
```

Ha ez működik, a projekt sikeres első mérföldkövet ért el.

---

# 37. Fontos scope szabályok

A projekt során kerülni kell a scope creep-et.

Első verzióban NEM szükséges:

- multiplayer
- inventory
- skill tree
- complex RPG system
- több tucat enemy
- procedural generation
- open world
- komplex NPC rendszer
- branching story
- crafting
- több tucat spell
- komplex equipment system
- online backend

A projekt fő szabálya:

> **Kevés mechanika, de azok legyenek működőképesek, látványosak és jól tesztelhetők.**

---

# 38. Projekt sikerességi kritériumai

A projekt akkor tekinthető sikeresnek, ha:

### Game

- [ ] A játék böngészőben fut.
- [ ] A player mozog.
- [ ] A player ugrik.
- [ ] Platform collision működik.
- [ ] A player karddal tud támadni.
- [ ] A player fireballt tud használni.
- [ ] Legalább 1 enemy működik.
- [ ] Enemy sebződik és meghal.
- [ ] Player sebződik és meghal.
- [ ] Checkpoint működik.
- [ ] Legalább 1 boss működik.
- [ ] Boss fight működik.
- [ ] Boss phase transition működik.
- [ ] Boss death működik.
- [ ] Ending működik.
- [ ] Zene és sound effectek működnek.
- [ ] A játék rendelkezik egységes dark fantasy atmoszférával.

### QA

- [ ] Unit test suite létrejött.
- [ ] Integration tesztek létrejöttek.
- [ ] Playwright E2E tesztek létrejöttek.
- [ ] Visual regression tesztek létrejöttek.
- [ ] Cross-browser tesztelés létrejött.
- [ ] Console/runtime error monitoring működik.
- [ ] Alap performance ellenőrzés létrejött.
- [ ] CI pipeline működik.
- [ ] GitHub Actions futtatja a teszteket.
- [ ] Sikeres pipeline után deployment történik.

### Deployment

- [ ] GitHub repository létrejött.
- [ ] Production build működik.
- [ ] GitHub Pages deployment működik.
- [ ] A játék publikus URL-en elérhető.

---

# 39. Fejlesztési filozófia

A projektet iteratívan kell felépíteni.

Nem előre készítjük el az egész játékot.

Minden iteráció:

```text
1. Kis cél meghatározása
2. Prompt
3. AI implementáció
4. Projekt futtatása
5. Manuális teszt
6. Bugok azonosítása
7. Javítás
8. Automatizált teszt hozzáadása
9. Commit
10. Következő feature
```

A cél:

> **Minden iteráció után működőképesebb játék legyen.**

---

# 40. Következő konkrét lépés

A projektet a következő lépéssel kell elkezdeni:

## Step 1 – Projekt létrehozása

- Node.js ellenőrzése
- npm ellenőrzése
- Phaser + Vite projekt létrehozása
- VS Code megnyitása
- első Phaser scene
- localhost elindítása
- első üres játékablak megjelenítése

Ezután:

## Step 2 – Player prototype

- egyszerű placeholder karakter
- bal/jobb mozgás
- ugrás
- gravitáció
- platform collision

Csak ezután kezdjük el a combatot.

---

# Projekt alapelve egy mondatban

> **Egy kis scope-ú, böngészőben futó, AI-assisted módon fejlesztett 2D dark fantasy action platformer, amelyben a játékélmény mellett egy valódi, automatizált QA és CI/CD pipeline is a projekt szerves része.**