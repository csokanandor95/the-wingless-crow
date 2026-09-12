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

A játékos **Lazar, the Crowmarked**-ot irányítja, aki a föld őrzője a halál és élet közötti kapunál.

Lazar a varjak segítségével látja az egész világ eseményeit — a varjak a suttogói. Ezáltal tartja fenn a rendet, biztosítva, hogy aki meghal, átjusson az alvilágba, és aki már ott van, ne térhessen vissza.

Az őrült király felesége haldoklik. A király lepaktál egy ősi démonnal, hogy feltámassza a feleségét. A démon teljesíti a kérést, de a saját ördögi célját is véghezviszi: elfogja a varjakat, felborítva az élő és halott világ rendjét, hiszen nincs, aki őrizze a kaput. A démon megpróbálja átvenni az irányítást az élők világa felett. Démoni harcosok törnek elő az alvilágból, miközben a földi halottak nagy része nem tud távozni, vagy rossz helyre távozik.

Lazart nem sikerül elzárni, de elveszíti a szárnyait — innen a *Wingless Crow* cím.

Lazar útnak indul, hogy legyőzze a démont és a királyt, és helyreállítsa a varjakat és a két világ közötti rendet.

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

A játékos **Lazar, the Crowmarked**, a halál és élet közötti kapu földi őrzője, aki elveszítette szárnyait.

## Mozgás

Alapvető mozgás:

- balra
- jobbra
- ugrás
- létrán mászás (fel/le)

Nem cél komplex platforming rendszer készítése.

> **Megvalósítva (Phase 6).** A létra-mászás utólag került be, a pálya végi függőleges
> átvezetéshez, és szándékosan minimális: zárt függőleges „sín", nincs oldalra mozgás,
> támadás vagy varázslás mászás közben, a vízszintes input pedig mindig lelép róla. Nem
> tekintjük „komplex movement ability"-nek.

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

> **Eltérés a tervtől.** Az enemy eredetileg *Hollow / Knight* néven szerepelt (kardot
> forgató husk); a hozzá választott pixel art viszont egy csuklyás, csőrös, **kaszás**
> dögevő, ami jobban illik a 4–5. pont varjú-tematikájához. Ezért a neve **CrowHarvester**
> lett, a fegyvere kasza, a támadás telegraph-ja a magasba emelt penge — **a state machine és
> minden gameplay-paraméter változatlan**. Részletek: `docs/devlog.md`.

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

> **Eltérés a tervtől: a választott archetípus a CASTER, nem az Archer** (`Gravecaller`,
> `enemies/Gravecaller.ts`). Egyetlen távoli támadása egy árny-tűzgolyó; **a fenti öt doboz
> 1:1 a state machine.** A legfontosabb tervezési döntés a **VÍZSZINTES lövedék + VERTIKÁLIS
> detektálási kapu** (`VERTICAL_DETECTION_RANGE = 80`): a lövedék vízszintesen repül, tehát a
> lény csak nagyjából azonos magasságban lévő playert vesz észre ÉS lő — enélkül egy
> platformon álló caster a talajon futóra is tüzelne, a bolt pedig elmenne a feje fölött.
> Ennek **layout-következménye** van (a platform-magasságok és a bolt sávja összetartoznak),
> ezt a `level1Layout.test.ts` `CASTER_TARGETS` táblája őrzi.
>
> A számok, a követelmény→megvalósítás tábla és a unit teszt által talált tervezési hiba
> (a MAINTAIN DISTANCE eredetileg egyetlen frame-es átjáró volt): `CLAUDE.md`,
> „Enemy 2 — Gravecaller"; a döntés története: `docs/devlog.md`.

## Enemy 3 – Beast

**MEGVALÓSÍTVA** (`src/enemies/Beast.ts`, `BeastAnimations.ts`). Az eredetileg opcionális
lény elkészült; a Level 2 UTOLSÓ ellenfele (`H-beast-1`, a boss-ajtó előtti párkányon),
a korábbi `H-crow-2` CrowHarvester helyén.

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

**A megvalósítás követi a fenti diagramot** — nincs benne új doboz. A `CHASE` a „DETECT"
utáni közelítő állapot, a roham két fázisa (`CHARGE_WINDUP` + `CHARGE`) pedig a `CHARGE`
doboz kifejtése.

**A ROHAM AZ ELSŐDLEGES TÁMADÁS**, a közelharc csak közvetlen közelben (user-kérés). Ehhez
kellett egy nem-nyilvánvaló kiegészítés, ami nem külön állapot, hanem a `CHASE` egyik ága:
ha a roham KÉSZ, de a player túl közel van, a Beast **HÁTRÁL**, hogy nekifutást nyerjen.
Enélkül az első roham után a lény a player MELLETT áll, onnan a `CHARGE_MIN_RANGE`
elérhetetlen, tehát örökre közelharci gépezetté válna. A `chaseMinX/MaxX` peremén a hátrálás
megáll, tehát a Beast **sarokba szorítható** — ilyenkor közelharcra vált (a Gravecaller
azonos döntése: „sarokba szorítva viszont tüzel").

| | érték | megjegyzés |
|---|---|---|
| HP | 50 | 5 kardcsapás — a pálya legkeményebb sima ellenfele |
| közelharc | 10 sebzés, 44 hatótáv | a hatótáv a buzogány MÉRT nyúlásából + a player fél teste |
| roham | 15 sebzés, 320 px/s, 900 ms | 800 ms piros telegraph; az irány a windup ELEJÉN rögzül |
| sebesség | patrol 55 · üldözés 130 · hátrálás 90 | az üldözés a player 200-a ALATT marad |

**A közelharci windup (390 ms) MÉRT érték**, a Mad King fairness-módszerével: pontblank
helyzetből a kikerüléshez 28 px-t kell nyerni, ami hátralépéssel 140 ms, ugrással 102 ms —
plusz 250 ms reakcióidő. Vagyis MINDKÉT válasz működik, nem csak az ugrás.

**A rohamot a felület PEREME is megállítja**, nem csak a fal. Ez a Beast valódi eltérése a
bossoktól: azok arénája fallal zárt, egy párkányon álló Beast viszont enélkül leszaladna.

**Asset:** `goatman.png` — 384×512, 6×8 db 64×64-es frame. A csomagban VAN dedikált,
fejlehajtott, szarvakkal előre rohanó animáció (10 frame), tehát a roham valódi rajzolt
mozdulat — szemben a Wing-Breaker charge-ával, ahol egy megtartott pózt kellett használni.
Death animáció NINCS (a CrowHarvester fade-receptje). **Licenc: nyitott jogi tétel**, lásd
a `CLAUDE.md`-t.

---

# 12. Boss rendszer

Minden nagyobb pálya végén lehet egy boss.

Első vertical slice-ban elég **1 boss**.

> **Megvalósítva — NÉGY boss van, nem egy.** *The Grafted Wing-Breaker* (Level 1 után),
> *The Mad King* (Level 2 után), *The Beast Master* (Level 3 után, mini-boss) és a végső
> *Ancient Demon, Omen of Crows*. Az aktuális lánc a 21. pontban.

## Boss – Ancient Demon, Omen of Crows

A végső ellenfél (16. pont: az ősi démon, aki elfogta a varjakat). Asset: *Undead Executioner*
(darkpixel-kronovi / Kronovi-).

**A karaktere egy HIÁNYBÓL nő ki, és ez tudatos döntés:** a csomagban NINCS járás-animáció.
A démon ezért nem sétál, hanem **LEBEG** (lassan sodródik, az idle animációval) és **VILLAN**
(teleportál a player mellé, alpha-tweennel). Egy ősi, csuklyás lidérc nem gyalogol — a hiányból
így identitás lett, nem kompromisszum.

A három boss SZÁNDÉKOSAN három különböző nyomást ad:

| | Wing-Breaker | Mad King | Ancient Demon |
|---|---|---|---|
| jelleg | távolsági + roham | tisztán közelharci | terület-tagadás + idézés |
| mozgás | sétál | sétál, ugrik | **lebeg és villan** |
| gap-closer | charge | ugró becsapódás | **villanás** |
| Phase 2 | + charge | + kitörés | **+ árnyék-idézés** |

**Támadások:**

- **Kaszakombó** (reaktív, közelharc): KÉT csapás egyetlen mozdulatban, 600 és 1200 ms-nál.
- **Árny-hullám (nova)**: radiális, MINDKÉT irányba terjedő talajhullám. **Csak UGRÁSSAL
  kerülhető ki** — a hatótávja (90 px) pontosan a kaszáé, tehát a közelharci sáv a démoné,
  hacsak a player nincs a levegőben.
- **Villanás**: a player mellé teleportál. Ez bünteti azt, aki lehagyja a lassú lényt és
  távolról tűzgolyózik. A villanás alatt SEBEZHETETLEN.
- **Idézés (Phase 2)**: 2 árnyék-lidérc, akik a player felé sodródnak, érintésre sebeznek
  (8) és azzal el is pusztulnak; egy csapásra halnak, ~8 mp után maguktól elenyésznek.

**A hatótáv-előnye a projekt LEGKISEBBJE:** a player kardja 75-ről, a démon kaszája 90-ről ér
el — 15 px, szemben a Wing-Breaker (138) és a Mad King (142) fölényével. Ez tudatos: a démon
nyomása nem a hatótávból jön, hanem a novából és az árnyékokból.

**A hitboxok itt is MÉRTEK:** a kasza nyúlása (45 forrás-px) és a hullám sugara (38 forrás-px)
egyaránt az animáció tényleges kiterjedéséből származik. A hullám szimmetria-középpontja
(x=43) FÜGGETLENÜL ugyanazt adja, mint a köpeny oszlop-sűrűségéből mért testközép — a két
mérés hitelesíti egymást.

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

> **Megvalósítva (Phase 7–8).** A state machine
> `DORMANT → APPROACH → SLASH / PROJECTILE / SPELL / CHARGE_WINDUP → CHARGE → COOLDOWN → DEAD`;
> a `DORMANT` a boss entrance ideje (nem mozog, nem támad, **nem is sebezhető**). A
> támadás-választás **szándékosan determinisztikus** — ez egyszerre szolgálja a
> tesztelhetőséget (nem flaky unit teszt) és a játékélményt (a player felismeri a mintákat).
>
> **Eltérés a tervtől: KÖRFORGÁS, nem prioritási sor.** A slash reaktív, a másik három
> támadás rotációban következik. Az ok általánosítható, és a `CLAUDE.md` technikai tanulságai
> között él: **ha egy támadás cooldownja ugyanakkor jár le, mint az őt követő állapot-lock,
> akkor a prioritási sor élén garantáltan monopolizál** — a Phase 2 emiatt egyszerűsödött
> `charge → slash` hurokra. Részletek: `docs/devlog.md`.

> **Megvalósítva (Phase 8) — boss sprite + egy NEGYEDIK támadás.** A *Bringer of Death*
> csomagban **nincs dash animáció**, és ebből a hiányból két dolog nőtt ki: a charge egy
> MEGTARTOTT kitörés-pózt kapott (az effekt nélküli sheetről) + afterimage-csíkot, a boss
> pedig egy új távolsági támadást, a **Shadow Spellt**. A hatótávok **az animációból
> származnak, nem kézi hangolásból** — a slash hatótávja a kasza mért nyúlása a csapás
> frame-jén, ami a placeholderhez képest megduplázta a közelharci hatótávot (a
> fairness-hangolás ezt idővel, nem hatótáv-csökkentéssel ellensúlyozta).
>
> Az animáció-kiosztás táblája és a „miért nem flinchel a boss" indoklás: `docs/devlog.md`;
> az aktuális számok: `CLAUDE.md`, „Boss — The Grafted Wing-Breaker".


## Boss 2 – The Mad King *(Phase: a döntési pont 3. iterációja, 2026-08-30)*

Az őrült király (16. pont): a haldokló felesége miatt paktált a démonnal, és ezzel ő fogatta
el a varjakat. A Level 2 (`The Crowless Quarter`) után, a saját tróntermében várja Lazart.

**A harc előtt PÁRBESZÉD van** (`ui/Dialogue.ts`) — magától lemegy, a jobbra-nyíl gyorsítja.
Ez a projekt első valódi dialógusa; a részletek a 20. pont helyesbítésénél.

**Szándékosan TISZTÁN KÖZELHARCI**, kontrasztként a Wing-Breaker távolsági nyomásához:

| akció | animáció | megjegyzés |
|---|---|---|
| kardcsapás | `Attack1` (4 frame) | reaktív: `≤ SLASH_RANGE` (142) belül mindig ez jön |
| ugró becsapódás | `Attack3` (4 frame) | a Phase 1 gap-closere; a cél a felugráskor rögzül |
| kitörés | `Attack2` (4 frame) | **CSAK Phase 2**; piros telegraph, egyenes vonalú roham |

50 % HP alatt: gyorsabb mozgás + megnyílik a kitörés — pontosan a Wing-Breaker szerkezete
(ott a charge nyílt meg).

**Az ugrás a lény lényege**: ez az egyetlen dolog, ami a távolról tűzgolyózó playert bünteti,
és ez tartja életben a Phase 1-et (ahol a kitörés még zárva van). A ballisztikája a
`GRAVITY_Y`-ból LEVEZETETT, egyetlen hangolóponttal (`LEAP_RISE_PX`); a cél a felugrás
pillanatában rögzül, tehát a guggolás alatt oldalra lépve kikerülhető — ugyanaz a
telegraph-elv, mint a Shadow Spellnél.

### Fairness-hangolás (2026-08-30, kézi teszt után)

Az első verzió túl nehéz volt: a király gyorsan és gyakran támadott, a player rövid hatótávú
kardja pedig nem tudott reagálni rá. **A javítás nem könnyítés, hanem MEGTANULHATÓSÁG** — a
kihívás (és a 300 HP) megmaradt.

A diagnózis mérés: a csapás kikerüléséhez a playernek 152 px-re kell jutnia, pontblank 38
px-ről; a `JUMP_VELOCITY`/`GRAVITY_Y` mellett egy ÁLLÓ ugrás ezt 475 ms-nél éri el. A korábbi
**330 ms**-os windup alatt tehát a sima ugrás NEM volt elég (csak 127 px-ig vitt) — ugrani ÉS
hátrálni kellett, 330 ms alatt, amiből ~250 ms a reakcióidő.

- **`SLASH_WINDUP_MS` 330 → 660** (a frame-listából számítva; 660 az ugrás-apex miatt egyben
  a természetes plafon is — fölötte már nem javít a kikerülhetőségen).
- **Új `SLAM_RECOVERY_MS` (1500)** a becsapódás után, a közös `ACTION_COOLDOWN_MS` helyett:
  ez a harc fő punish-ablaka. LEVEZETETT a player konstansaiból (visszafutás + két kardcsapás
  + menekülés ≈ 1110 ms).
- **Sebzés:** slash 16 → 12, becsapódás 22 → 18, kitörés 24 → 22.
- **Arany slash-telegraph** (`0xffd070`) a piros kitörés-telegraph mellé: a két jelzés más
  választ kíván (ugorj / térj ki oldalra), ezért nem oszthatnak színt.

Mindezt a `madKing.test.ts` „Fairness-invariánsok" blokkja **futtatható állításként** rögzíti,
a player exportált konstansaiból levezetve — ugyanaz az elv, amivel a `level1Layout.test.ts` a
pálya-specet teszi ellenőrizhetővé.

**Asset:** *Medieval King Pack 2* — **CC-0**, a licenc a repóban van. A csomagban nincs cast
animáció (innen a tisztán közelharci karakter), viszont van valódi ugró ÉS valódi dash
animáció — a Wing-Breakernél mindkettőt megtartott pózzal kellett pótolni.


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

> **Megvalósítva (Level 1 Redesign).** A `gap` implementálva van: a Level 1 talaja öt
> szegmensből áll (`GROUND_SEGMENTS` a `src/levels/Level1Layout.ts`-ben), a köztük lévő négy
> hézag a szakadék. A zuhanás-halált nem a világ alja adja, hanem egy `FALL_DEATH_Y` küszöb —
> a FIZIKAI világ szándékosan mélyebb a canvasnál, így a player láthatóan kizuhan a képből,
> mielőtt meghal, a kamera bounds-a viszont a canvas magassága marad (nincs függőleges
> görgetés).

> **A szakadékok MÉRETEZETTEK, nem szemre rakottak.** A `Level1Layout.ts` a `Player`
> exportált `MOVE_SPEED`/`JUMP_VELOCITY`-jéből és a `config/physics.ts` `GRAVITY_Y`-jából
> SZÁMOLJA a fizikai plafont (max ugrásmagasság **156 px**, max ugrástáv **250 px**), és
> minden szakadék ehhez van tervezve. A `tests/unit/level1Layout.test.ts` ezzel a képlettel
> **bejárja a pályát** (BFS a start szegmensről) — ez a spec „All platforms are reachable"
> elfogadási kritériumát futtatható állítássá teszi.

A játékos rendelkezik:

- gravityvel
- velocityvel
- ground detectionnel
- collisionnel
- jump velocityvel
- movement speeddel

Nem cél precíz platformer fizika létrehozása, mint például Celeste-ben.

---

## Boss 3 (mini-boss) – The Beast Master *(2026-08-31)*

A `Level 3 – The Beast Dungeon` záró harca, a Mad King és a végső ellenfél KÖZÖTT. Fix
képernyős aréna (`Boss3Scene`), a Boss 2 szerkezetével: párbeszéd → cím-kártya → harc.

**Ugyanaz a lény, mint az Enemy 3 (Beast), csak nagyobb** — ugyanaz a `goatman.png` lap
`SCALE = 2`-vel, tehát a látvány ~60×100 px (a player 28×46). **NINCS fázisa** (user-döntés):
a harc ritmusát nem fázisváltás adja, hanem a FALKA.

| | érték | miért |
|---|---|---|
| `MAX_HP` | 180 | mini-boss: a Beast (50) fölött, a Wing-Breaker (240) alatt |
| `ATTACK_RANGE` / `CHARGE_HIT_RANGE` | 74 | a MÉRT forrás-nyúlások × SCALE + a player fél teste |
| `ATTACK_WINDUP_MS` | 520 | **LEVEZETETT** — lásd lentebb |
| `CHARGE_SPEED` / `CHARGE_MAX_MS` | 380 / 1800 | 684 px út: átszeli a 800 px-es arénát |
| `MOVE_SPEED` | 110 | SZÁNDÉKOSAN lassabb a Beastnél (130): nagyobb, nehezebb test |

**A windup fairness-levezetése** (a Mad King módszere). A kétszeres mérettel a hatótáv
44 → 74 nőtt, tehát a Beast 390 ms-a itt már NEM lenne elég. Pontblank helyzetből
(`24 + 14 = 38 px`) a kikerüléshez 84 px-re kell jutni:

- hátralépés (46 px @ 200 px/s) → 230 ms
- álló ugrás (√(84²−38²) = 75 px emelkedés) → 174 ms
- \+ emberi reakcióidő → 250 ms

A padlót a LASSABB válasz adja: **480 ms**. Ezért 520 — így **MINDKÉT válasz** működik, nem
csak az ugrás. Unit teszt őrzi.

**A FALKA** (user-döntés): HP-küszöbhöz kötött, egyszeri esemény, nem fázis.
**66 %-nál egy CrowHarvester, 33 %-nál egy Gravecaller.** A boss nem hozza létre őket, csak
`beast-master-summon` eventet emittál — a démon idézésének delegálási mintája, tehát ÚJ
lény-osztály nem kellett.

**A falnak rohanó roham a harc fő punish-ablaka** (`STAGGER_MS = 1400`, a Mad King
`SLAM_RECOVERY_MS`-ének szerepe): a levezetés szerint elég két kardcsapásra és a kilépésre.

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

> **Eltérés a tervtől: a Level 1-et a Phase 8 közben ÚJRANYITOTTUK („Level 1 Redesign").**
> Az eredeti Phase 6-os layout (3200 px, folyamatos talaj, hazard nélkül) pillanatok alatt
> átugrálható volt. Az új pálya **6000 px**, nyolc szakaszra tagolva (`A`–`H`), öt
> talaj-szegmenssel és négy szakadékkal, plusz két új hazard-típussal: **tüskemező** (a
> D szakaszban) és **Swinging Reaper** (az F szakaszban, az első MOZGÓ hazard,
> determinisztikus lengéssel). A geometria a `src/levels/Level1Layout.ts` Phaser-mentes
> adatmoduljában él, és unit teszt bizonyítja az elérhetőségét.
>
> **Két hazard-tanulság, ami a tervben nem látszott:**
> - a környezeti veszélyek FOLYAMATOS érintkezésűek, ezért közös **i-frame kapu** kellett
>   (`hazards/HazardDamage.ts`, 900 ms) — enélkül egy tüskén állva 60×/s sebződne a player;
> - **visszalökés csak függőlegesen** van, vízszintesen nem: a vízszintes lökés maga okozott
>   egy második találatot, illetve a kasza esetében a szakadékba taszított volna — pont az,
>   amit a layout-spec „avoid unavoidable damage" pontja tilt.
>
> **Két viselkedés-változás a korábbi tervhez képest:** a player halálakor az **enemyk is
> újraélednek** (különben egy nehéz szakaszt ismételt halálokkal le lehetne koptatni), és van
> egy **köztes checkpoint** (x=3000), ami ÉRINTÉSRE aktiválódik — nem `E`-re, hogy ne
> versenyezzen az ajtó promptjával.
>
> **Az A szakasz kétszer változott, és végül hangulat lett belőle:** ma sík, hazard nélküli
> talaj egy háttér-házzal, opcionális `E`-párbeszéddel; az első kényszerű ugrás a C szakaszé.
> Az iterációk teljes története (a gödrös tutorial-változat, a földi enemyk üldözési
> modellje, a kézi teszten talált javítások): `docs/devlog.md`, „Level 1 Redesign".
> Az aktuális geometria és minden szám: `CLAUDE.md`, „Level1Scene".

> **Megvalósítva (2026-08-26) — Enemy 2 a Level 1-en.** Az `E2` platformon álló
> CrowHarvester le lett cserélve **Gravecallerre**, és később a Swinging Reaper utáni `F2`
> párkány is kapott egyet. A magasságkülönbség a lény lényege: az emeli a saját sávjába, és
> veszi ki belőle a talajon futó playert.

> **Kézi teszten talált két tétel (2026-08-26).** (1) Az `E1` lépőkő 24 px-szel feljebb
> került (y 352 → 328): az `E2`-n álló caster észlelte és lőtte az ott állót, de a bolt a
> feje fölött ment el. (2) Az `F` szakasz ranged nyomást kapott (`F2` párkány + `F-caster`),
> úgy hangolva, hogy **a bolt a LÉZENGÉST büntesse, ne a tiszta átkelést** — `F1` fölött
> söpör a penge és alatta 400 px szakadék van, ott egy kikerülhetetlen találat igazságtalan
> halál lenne. Mindkét kényszert unit teszt őrzi. Részletek: `docs/devlog.md`.

### Level 2 – The Crowless Quarter

Elhagyott gótikus városnegyed alkonyatkor. *(Korábban „The Crowless Forest / elátkozott
erdő" — lásd az átnevezésről szóló megjegyzést lentebb.)*

Új elem:

- Archer
- több platforming
- mozgó platformok

> **Megvalósítva.** Az „Archer" szerepét a **Gravecaller** (Enemy 2, 11. pont) tölti be.

> **Eltérés a tervtől: `The Crowless Forest` → `The Crowless Quarter` (2026-08-29).** A
> látvány-iterációban a **GothicVania Town** csomag mellett döntöttünk (Luis Zuno / @ansimuz,
> public domain — ugyanaz, amiből a Level 1 hangulati propjai jönnek), ami egy **alkonyi
> gótikus városnegyed**, nem erdő; a név a látványt követte. Ezzel a „sötétebb környezet" pont
> is kikerült a listából: a csomag palettája érezhetően VILÁGOSABB a Level 1-nél, és ez
> tudatos kontraszt az éjszakai romokhoz képest. Részletek: `docs/devlog.md`.

### Level 3 – The Throne of the Damned

Romos kastély.

Új elem:

- több enemy kombináció
- nehezebb platforming
- lore

> **Eltérés a tervtől: KIMARAD külön pályaként (2026-08-30).** A Level 2 után KÖZVETLENÜL a
> király harca jön; a trónterem-téma a Boss 2 arénájában él tovább. *(A `Level 3` cím később
> mégis felszabadult egy MÁSIK pályára — lásd lentebb a Beast Dungeont.)*

### Level 3 – The Beast Dungeon *(2026-08-31, user-döntés — a fenti helyére)*

**A harmadik pálya MÉGIS elkészült, de NEM a „Throne of the Damned" tartalmával.** A fenti
kihagyás indoka az volt, hogy egy harmadik pálya a meglévő elemekből csak *mennyiségi*
ismétlés lenne — és pontosan ez változott meg: időközben elkészült az **Enemy 3 (Beast)**,
ami egy ÚJ nyomásformát hoz (elkötelezett, telegrafált roham). A Level 3 erre épül, nem a
meglévők ismétlésére.

Gótikus templom-kripta belső (**GothicVania Church**, Luis Zuno), **4200 px** — érdemben
rövidebb a Level 1-nél (6000) és a Level 2-nél (7200), cserébe SŰRŰBB: 14 ellenfél.

**A pálya tézise:** *a Beast a sík padlón támad, ami elől fel lehet ugrani a galériákra — de
ott Gravecallerek tüzelnek.*

Ehhez egy ÚJ design-eszköz kellett, a **MENNYEZET**. A Beast rohamát eddig „oldalra lépéssel
vagy átugrással" lehetett kikerülni; egy dungeon-folyosóban viszont az oldalra lépés nem
létezik (a roham MAGA a folyosó), a menekülés pedig nem működik (roham 320 px/s vs. player
200). **Marad az ugrás** — ettől lesz a galéria alja gameplay-elem, nem díszlet.

A galéria magassága (`GALLERY_RISE = +110`) három, egymástól független kényszer metszete:
felugorható (≤ 117), alatta átsétálható (≥ 62), de alatta NEM ugorható (< 218).

Hat „karám", öt 120 px-es gödörrel elválasztva; a gödör nem kihívás, hanem a karám FALA (az
`enemyChaseBounds()` a perem előtt megállítja a Beastet). Szakaszok:

  A előcsarnok · B első karám (Beast #1) · C galéria-futam (tüskék a lap-hézagok alatt) ·
  D kettős karám (Beast #2, MINDKÉT menekülő-lapon caster) · E kripta-folyosó (levegővétel +
  tüskemező, itt a köztes checkpoint) · F a kapu (Beast #3, a legszűkebb karám)

**Nincs létra, mozgó platform és lengő kasza** — rövid pálya, az identitása a Beast és a
mennyezet, nem a traverzálás. (Kasza konkrétan nem is lehetne: egy penge a karám fölött pont
a menekülő-ugrásba kényszerítené a playert.)

### Final Level – The Broken Gate

A végső terület.

Final boss.

Ending.

A pályák száma később változtatható.

> **Megvalósítva (2026-08-30) — külön platforming-pálya nélkül.** A végső aréna a
> `FinalBossScene` fix 800×450-es terme, párbeszéddel és belépővel.
>
> **A lánc azóta kétszer bővült:** 2026-08-31-én a `Level 3 – The Beast Dungeon` +
> `Boss 3 – The Beast Master` a Boss 2 UTÁN, 2026-09-02/03-án pedig a lánc ELEJÉRE a
> **`PreScene`** (nyitó szentély), majd a **`MainMenuScene`**. Az aktuális teljes lánc a
> 21. pontban és a `CLAUDE.md` „Jelenlegi állapot" szakaszában.

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

> **Megvalósítva (Phase 7).** A boss aréna fix **800×450**, egy képernyős, kameragörgetés
> nélkül — így a boss, a player és a HP-bar mindig egyszerre látszik, a telegraph mindig
> olvasható, és a visual regression baseline (26. pont) determinisztikus. **Vereség esetén** a
> player nem az arénában éled újra, hanem a pálya `CheckpointSystem`-pontján (a boss-ajtónál),
> és onnan `E`-vel léphet be ismét. **Győzelem után** szöveges átvezető (`NarrationScene`),
> majd a következő pálya; a `bossDefeated` flag a Phaser `registry`-ben él, tehát a legyőzött
> boss ajtaja már továbbvisz.

> **Megvalósítva (2026-09-01) — MIND A NÉGY boss belépője azonos:**
> `create() → párbeszéd → cím-kártya + zene → harc`. Ennek egy geometriai ára volt: a
> `ui/Dialogue` panelje a járható felszín ALATT ül és 75 px-t foglal, tehát
> `GROUND_TOP + 75 ≤ 450` — a `BossScene` padlóvonala ezért **418 → 369** lett (ugyanoda,
> ahol a másik három aréna van), és a háttere ehhez újragenerálódott.

> **Megvalósítva (2026-08-30) — a Boss 2 arénája (`Boss2Scene`).** Trónterem, a királyné
> koporsójával a lépcső előtt — pontosan az, amiről a `KING_DIALOGUE` szól.
> `GROUND_TOP = 369`, a háttér **tint NÉLKÜL** (mérés: a kép nyers fényessége már eleve
> sötétebb, mint amire a Boss 1 festményét sötétíteni kellett). A zene a PÁRBESZÉD UTÁN, a
> cím-kártyával EGYÜTT indul. Részletek: `CLAUDE.md`, „Boss2Scene"; a mérések:
> `docs/devlog.md`.

> **Megvalósítva (2026-08-30) — a végső aréna (`FinalBossScene`).** `GROUND_TOP = 369`, a
> háttér **tint nélkül** (a négy közül a legsötétebb kép).
>
> **Új probléma, ami az első két arénánál nem merült fel: a boss OLVASHATÓSÁGA.** A démon
> köpenye gyakorlatilag fekete, és a sötét háttérfoltokban eltűnt. **Tinttel ez nem
> javítható** (a MULTIPLY tint csak sötétíteni tud), ezért a démon egy halvány ibolya AURÁT
> kapott MAGA MÖGÉ, ami a villanás alatt VELE halványul. Részletek: `docs/devlog.md`.

> **Eltérés a tervtől (Phase 8): az aréna padlója ÜRES lett** — a két lebegő platform
> törölve. A charge és a Shadow Spell elől is akadálymentes padlón kell kitérni, és így a
> 108 px magas boss sem akadhat platformba.

---

# 16. Lore

## Alapkoncepció

Lazar, the Crowmarked a föld őrzője a halál és élet közötti kapunál. A varjak segítségével látja az egész világ eseményeit — a varjak a suttogói. Ezáltal tartja fenn a rendet: biztosítja, hogy aki meghal, átjusson az alvilágba, és aki már ott van, ne térhessen vissza.

Az őrült király felesége haldoklik. A király lepaktál egy ősi démonnal, hogy feltámassza a feleségét. A démon teljesíti a kérést, de közben a saját ördögi célját is véghezviszi: elfogja a varjakat, felborítva az élő és halott világ rendjét, hiszen nincs, aki őrizze a kaput. A démon megpróbálja átvenni az irányítást az élők világa felett.

Démoni harcosok törnek elő az alvilágból, miközben a földi halottak nagy része nem tud távozni, vagy rossz helyre távozik.

Lazart nem sikerül elzárni, de elveszíti a szárnyait.

A célja:

> legyőzni a démont és a királyt, hogy visszaállítsa a varjakat és a két világ közötti rendet.

## Ending

A végső boss legyőzése után:

- a király meghal, de feloldozást kap: a feltámasztott királyné már nem az volt, aki korábban, így együtt kerülhetnek nyugovóra és örökké együtt maradhatnak
- a démont legyőzik, és visszakerül a pokolba
- Lazar visszanyeri szárnyait és a varjakat
- helyreáll a rend az élők és holtak világa között
- rövid narráció jelenik meg

Az ending lehet rövid, 30–60 másodperces.

> **Megvalósítva (2026-08-30).** A lezárás **CSAK SZÖVEG, fekete háttéren**: a
> `NarrationScene` változtatás nélkül, a `FinalBossScene` `ENDING_NARRATION` tömbjével —
> tehát a tervezett `EndingScene.ts` külön fájlként nem kellett. Utána a **`CreditsScene`**
> („THANKS FOR PLAYING" + görgő szerzői lista). *(A credits tartalma azóta VÉGLEGES: a
> `CREDITS` tömb a projekt mérvadó attribúciós listája.)*

A szöveg maga placeholder — a végleges lore a Phase 9 dolga (négy helyett most **hat**
placeholder lore-szöveg van a kódban: a két boss-győzelmi narráció, a Level 2 átvezetője,
a Boss 1 és a Boss 2 párbeszéde, valamint a Boss 3 párbeszéde + endingje).

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

> **Megvalósítva — mind a kilenc sáv megvan** (`systems/AudioManager.ts`): főmenü, nyitó
> szentély, három pálya és négy boss aréna. Az `AudioManager` **scene-hatókörű** (a scene
> shutdownja elvágja a zenét) — ez a pálya-zenéknél előny, és ez a fő oka annak, hogy a menü
> Controls lapja IN-SCENE nézetváltás, nem külön scene. Egy scene-eken ÁTÍVELŐ sávhoz
> game-szintűvé kellene emelni. A teljes SFX-tábla és a keverési hierarchia: `CLAUDE.md`,
> „Audio".

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

> **Megvalósítva (Phase 8) — player sprite.** A player valódi pixel artot kapott
> (*2D_SL_Knight_v1.0*), új modullal: `player/PlayerAnimations.ts`. Két elv, ami innentől az
> ÖSSZES karakterre érvényes: a `frameRate` mindig **SZÁMÍTÓDIK**
> (`frames * 1000 / durationMs`), sosem beégetett — így az animáció és a gameplay-lock nem tud
> elcsúszni; és a **hitbox mérete is az animációból van levezetve**, nem szabadon hangolt
> szám. Részletek: `CLAUDE.md`, „Player"; a csomag-specifikus tanulságok: `docs/devlog.md`.

> **Megvalósítva (Phase 8) — CrowHarvester sprite** (`enemies/CrowHarvesterAnimations.ts`).
> Innen jött a projekt egyik legfontosabb technikai tanulsága: **off-center sprite + `flipX`
> = a karakter oldalra UGRIK forduláskor**, mert a `flipX` a FRAME közepére tükröz, nem az
> originre. A javítás (`originX` + body-offset EGYÜTT tükrözve) azóta megosztott modul:
> `systems/SpriteFacing.ts`. Lásd a `CLAUDE.md` 11. és 16. technikai tanulságát.

> **Megvalósítva (Phase 8) — Level 1 parallax háttér** (`systems/ParallaxBackground.ts`,
> három réteg). A rétegek `setScrollFactor(0)`-val a KAMERÁHOZ vannak rögzítve, a mozgást a
> `tilePositionX` adja — így a réteg mindig pontosan kitölti a képernyőt. Két Phaser 4
> specifikus tanulság született belőle (a `CLAUDE.md` 12. és 13. pontja): a Phaser 4
> `TileSprite` NEM nyújt kettőhatványra (a Phaser 3 igen), és `pixelArt: true` mellett a
> `tilePositionX`-et KÉZZEL kell kerekíteni.

> **Megvalósítva (Phase 8) — boss aréna háttér.** Egyetlen álló, teljes képernyős festmény,
> `ParallaxBackground` NÉLKÜL (a kamera fix, nincs mit eltolni). **A kép SZÁRMAZTATOTT
> asset:** a forrás egy mért kivágásból lett 800×450-re kicsinyítve, hogy a rajzolt padlóél
> pontosan a `GROUND_TOP`-ra essen — a képlet és a következménye (`GROUND_TOP` változásakor a
> képet ÚJRA kell generálni) a `CLAUDE.md` „BossScene" szakaszában van.

> **Megvalósítva (2026-08-26) — Gravecaller sprite.** Innen jött a **19. technikai
> tanulság**: kevert frame-méretű csomagnál a frame-eket NORMALIZÁLNI kell (kivágni), nem
> animációnkénti geometriát írni — különben az `applyFacing()`-et minden animáció-váltásnál
> más geometriával kellene futtatni. Az attack sheet ezért kivágva került a repóba, és a
> kivágás **veszteségmentes** (a levágott keretben 0 db nem-üres pixel volt). Részletek:
> `docs/devlog.md`.

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
│   │   ├── PreScene.ts        # -> ÚJ (2026-09-02): a nyitó szentély, a lánc első jelenete
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
│   ├── npc/                   # -> ÚJ (2026-09-02): nem harcoló szereplők
│   │   └── GoddessAnimations.ts   # A Lángőrző (PreScene)
│   │
│   ├── enemies/
│   │   ├── CrowHarvester.ts
│   │   ├── Archer.ts          # -> ténylegesen: Gravecaller.ts (Caster, lásd 11. pont)
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

> **Pontosítások (Phase 7 / 2026-08-30).**
>
> - A boss fájlneve `bosses/GraftedWingBreaker.ts` (nem `TheGraftedWingBreaker.ts`) — a névelő
>   a megjelenített címben marad, a fájlnévben nem.
> - Új, eredetileg nem tervezett scene: **`scenes/NarrationScene.ts`** — adatvezérelt szöveges
>   átvezető (`{ lines, nextScene, title? }`), typewriter megjelenítéssel. **Ez váltotta ki a
>   tervezett `EndingScene.ts`-t.**
> - **Az `ui/Dialogue.ts`-re viszont MÉGIS szükség lett** (korábbi jóslat: a `NarrationScene`
>   kiváltja). A kettő más szerepű: a `NarrationScene` a világ hangja két jelenet KÖZÖTT,
>   teljes képernyőn, kézzel léptetve; a `Dialogue` két szereplő beszélgetése egy jeleneten
>   BELÜL, magától menve, beszélő-névvel. Egy teljes képernyős szövegdoboz a király előtt
>   kitakarta volna magát a királyt — pont azt, amiért a jelenet létezik. Az összehasonlító
>   tábla: `docs/devlog.md`.

> **Eltérés a tervtől (2026-09-02) — `scenes/PreScene.ts`, a játék nyitó jelenete.** ÚJ, a
> tervben nem szereplő scene a `BootScene` és a `Level1Scene` KÖZÉ. Lazar a képernyő tetejéről
> bezuhan egy romos szentélybe (a háttéren egy SZÁRNYAS angyalszobor — pontosan az, amit
> elvesztett), majd `E`-vel beszédbe elegyedik **A LÁNGŐRZŐVEL**; a párbeszéd MAGA a
> felvezetés, ezért nincs utána átvezető.
>
> **Miért nem a 9. pont introjának `NarrationScene`-e:** az a világ hangja fekete képernyőn,
> ez viszont egy JÁTSZHATÓ jelenet. **A projekt első NEM HARCOLÓ szereplője**, ezért nyit új
> mappát: `src/npc/`. A jelenet EGYETLEN inputja a séta és az ugrás — `PlayerController` NEM
> jön létre benne, különben A LÁNGŐRZŐ monológja alatt kardot lehetne suhintani rá.
> Részletek: `CLAUDE.md`, „PreScene".

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

> **Újranyitva a Phase 8 közben — „Level 1 Redesign", 3 iteráció + két finomhangolási kör.**
> Az eredeti Phase 6-os layout túl egyszerű volt (3200 px, folyamatos talaj, hazard nélkül);
> az új, nyolc szakaszos 6000 px-es pálya részletei a 14. pontnál. A blokk **nyitva marad**
> további hangolásra (a nyitott tételek: `CLAUDE.md`, „Nyitott hangolási és polish-tételek").

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
  **három lövedék** placeholder.*
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

> **ELDŐLT (2026-08-26): a „Többi Enemy típus, Level2 és 2. Boss" irány.** A választott irány
> **teljes egészében elkészült, az opcionális tétellel együtt**: Enemy 2 (`Gravecaller`),
> Level 2 (*The Crowless Quarter*), Boss 2 (*The Mad King*), a végső ellenfél
> (*Ancient Demon, Omen of Crows*) az endinggel és a `CreditsScene`-nel, valamint Enemy 3
> (`Beast`). **A lánc ezzel bezárult**, majd 2026-08-31-én tovább bővült a Level 3-mal és a
> Beast Masterrel.
>
> **A Gravecaller iterációja általánosította a scene enemy-kezelését** (`LevelEnemy`
> strukturális interfész + `type` mező az `ENEMY_SPAWNS`-ban), és ez a Beastnél be is vált:
> az integráció egy tömb + egy `spawnEnemies()` ág volt. A Level 3-mal a spawnolás közös
> modulba is kikerült (`levels/LevelEnemies.ts`), tehát mindhárom pálya minden típust ismer.
>
> Az iterációk teljes menete: `docs/devlog.md`.

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

> **A PHASE 10 LEZÁRVA (2026-09-08).** A CI/CD először egy minimális mérföldkőként indult
> (typecheck + unit teszt + build, 2026-08-25), majd a Phase 10-ben felépültek a piramis
> felsőbb rétegei: **integration** (2 fájl / 23 teszt), **Playwright E2E** (5 spec / 25 teszt),
> képrögzítéses vizuális ellenőrzés, cross-browser smoke (Chromium + Firefox),
> teljesítménymérés, és a kibővített CI **hat quality gate-tel**.
>
> **A teljes QA egyetlen dokumentumban él: `docs/Test-plan.md`** — stratégia, kockázati
> térkép, lefedettségi és nyomonkövethetőségi mátrix, findings, ismert korlátok. (A 33. pont
> hét tervezett dokumentuma helyett; az indoklás ott olvasható.)
>
> **A fázis legfontosabb eredménye nem a teszt-szám, hanem a lefedettség HELYE:** a
> `src/scenes/` 6 023 sora (a forrás 30 %-a) addig teljesen fedetlen volt, és a projekt MINDEN
> kézi teszten talált hibája oda esett. Ez most E2E-vel fedett.
>
> **Nyitva maradt:** a unit suite auditja (mind a 967 teszt indokolt-e?). *(A deployment
> azóta LEZÁRULT — lásd a Phase 11 szakaszt közvetlenül alább.)*

## Phase 11 – Deployment

- production build
- GitHub repository
- GitHub Actions
- GitHub Pages
- public URL

> **LEZÁRVA (2026-09-12) — a játék KÉT publikus csatornán fut.**
>
> | csatorna | URL | hogyan kerül ki |
> |---|---|---|
> | **itch.io** (elsődleges) | `https://bioengineerlabs.itch.io/the-wingless-crow` | kézi feltöltés |
> | **GitHub Pages** | `https://csokanandor95.github.io/the-wingless-crow/` | AUTOMATIKUS, a CI `deploy-pages` jobja |
>
> A fenti öt tétel mind megvan. A Pages deploy a `.github/workflows/ci.yml` **`deploy-pages`**
> jobja: `needs: [verify, e2e]`, és CSAK a `main`-re érkező pushra fut — tehát a hat quality
> gate MÖGÜL, a 31. pont „csak sikeres pipeline után deployment" elve szerint. A kézi kiadási
> kapu a push ELŐTT van (lokális build-teszt).
>
> **Előkészítés nem kellett:** a `vite.config.ts` `base: './'`-je (Phase 10) már az alútvonalas
> kiszolgálásra készült, a Pages project-page (`/the-wingless-crow/`) pedig ugyanaz a
> hibaosztály, mint az itch.io generált alútvonala. Részletek: `docs/devlog.md`,
> „Phase 11 – Deployment".

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

> **JELENLEGI ÁLLAPOT (2026-09-08, Phase 10) — a pipeline KÉSZ.**
>
> ```text
> Git push / PR → GitHub Actions (ubuntu-latest, Node 24)
>     ├─ job: verify   npm ci → typecheck → unit → integration → build → deploy sanity
>     └─ job: e2e      Playwright: Chromium teljes + Firefox smoke → report artifact
>           └─ job: deploy-pages   CSAK main pushra → GitHub Pages
> workflow_dispatch → job: performance (on-demand, --workers=1)
> ```
>
> **Quality gate-ek:** Unit · Integration · Build · **Deploy sanity** · E2E ·
> **Critical errors 0**. A deploy sanity check (`scripts/check-build.mjs`) az egyetlen
> hibaosztályt fogja meg, amit sem a typecheck, sem a teszt, sem a build nem: a root-abszolút
> asset-útvonalak némán elrontanák a deployt, miközben minden más zöld marad.
>
> **Ami MÉRÉSSEL bukott meg, és ezért NINCS a pipeline-ban:** a visual regression
> **pixeldiff-kapuként** (hamis bukásokat adott, ÉS a valódi változást elvetette — helyette
> képcsatolás emberi átnézésre), a **WebKit** (a Playwright buildjében nincs Web Audio API,
> a játék be sem tölt), és a **performance a fő pipeline-ban** (a mérés csak egyedül futtatva
> érvényes).
>
> **A GitHub Pages deploy 2026-09-12-én elkészült** (Phase 11): a `deploy-pages` job a
> `verify` és az `e2e` MÖGÖTT, CSAK a `main`-re érkező pushra fut. Részletek a 32. pontban.
>
> Részletek: `CLAUDE.md` „CI" szakasza és `docs/Test-plan.md`; a bővítés története:
> `docs/devlog.md`.

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

> **JELENLEGI ÁLLAPOT (2026-09-12, Phase 11) — a lánc MEGVALÓSULT, egy eltéréssel.**
>
> A fenti `Source → GitHub → Actions → build → Pages → Public URL` lánc pontosan így épült
> fel, a `.github/workflows/ci.yml` **`deploy-pages`** jobjaként (`needs: [verify, e2e]`,
> csak `main` pushra).
>
> **Az eltérés: KÉT csatorna lett, nem egy** — és az **itch.io az elsődleges**:
>
> | csatorna | URL |
> |---|---|
> | itch.io (kézi feltöltés) | `https://bioengineerlabs.itch.io/the-wingless-crow` |
> | GitHub Pages (CI-ból) | `https://csokanandor95.github.io/the-wingless-crow/` |
>
> Az ok a QA-ból jött: az itch.io **draft** módja adta a valódi beta-UAT-ot
> (`Test-plan.md` 9.3), aminek egy Pages-deployban nincs megfelelője. A Pages viszont
> automatizálható és a repóhoz kötött, ezért az a CI-ból deployolt, verziókövetett példány.
>
> **Mindkét cél ALÚTVONALRÓL szolgál ki**, ezért kritikus a `vite.config.ts` `base: './'`-je
> és a `scripts/check-build.mjs` őr — a 31. pont „deploy sanity" gate-je.

---

# 33. QA dokumentáció

> **FELÜLVIZSGÁLVA (2026-09-08, Phase 10) — a hét dokumentumból EGY lett.**
>
> Az alábbi, eredetileg tervezett fastruktúra egy TÖBB CSAPATOS szervezet QA-dokumentációját
> írja le. Egy fejlesztő + egy játék esetén a szétbontás nem áttekinthetőbbé tesz, hanem
> karbantartási terhet és elavulást szül. A tényleges struktúra: `docs/Test-plan.md` (a
> TELJES QA), `docs/Project_plan.md` (ez a dokumentum — egyben a game design),
> `docs/devlog.md` (a fejlesztés története), `docs/level*-layout.md` (pálya-specifikációk) és
> a `CLAUDE.md` (az architektúra és a technikai tanulságok).
>
> **A `test-cases.md` kimaradásának külön oka van: a teszt-kód MAGA a test case.** Egy kézzel
> karbantartott párhuzamos lista hetek alatt elcsúszik a suite-tól, és **egy hazudó
> QA-dokumentum rosszabb a hiányzónál.** Ugyanígy: a `test-strategy.md` szervezeti szintű
> artifact (itt egyetlen szakasz a test planben), az `automation.md` és a `known-issues.md`
> szakaszok, a `game-design.md` és az `architecture.md` pedig tartalmilag MÁR léteznek.
>
> *Egy karbantartott dokumentum jobb, mint hét elavuló.*

Az EREDETILEG tervezett struktúra (a fenti indoklással felülvizsgálva):

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

- [x] A játék böngészőben fut.
- [x] A player mozog.
- [x] A player ugrik.
- [x] Platform collision működik.
- [x] A player karddal tud támadni.
- [x] A player fireballt tud használni.
- [x] Legalább 1 enemy működik.
- [x] Enemy sebződik és meghal.
- [x] Player sebződik és meghal.
- [x] Checkpoint működik.
- [x] Legalább 1 boss működik.
- [x] Boss fight működik.
- [x] Boss phase transition működik.
- [x] Boss death működik.
- [x] Ending működik. *(2026-08-30 óta: `FinalBossScene.ENDING_NARRATION` → `CreditsScene`)*
- [x] Zene és sound effectek működnek.
- [x] A játék rendelkezik egységes dark fantasy atmoszférával.

### QA

- [x] Unit test suite létrejött. *(34 fájl / 967 teszt)*
- [x] Integration tesztek létrejöttek. *(2 fájl / 23 teszt — a 24. pont Sword→Enemy,
      Fireball→Enemy és Checkpoint→Respawn folyamatai)*
- [x] Playwright E2E tesztek létrejöttek. *(5 spec / 25 teszt: smoke, scene sweep, haladás,
      asset-integritás, képrögzítés)*
- [x] Visual regression tesztek létrejöttek. *(KÉPRÖGZÍTÉS emberi átnézésre, NEM pixeldiff-kapu
      — a pixeldiff mérésen megbukott, lásd `Test-plan.md` 10.2)*
- [x] Cross-browser tesztelés létrejött. *(Chromium teljes + Firefox smoke automatizálva;
      a Safari kézi, mert a Playwright WebKitjében nincs Web Audio API — `Test-plan.md` 7.1)*
- [x] Console/runtime error monitoring működik. *(az E2E fixture MINDEN teszten figyeli a
      console errort, az elkapatlan kivételt és a 404-eket)*
- [x] Alap performance ellenőrzés létrejött. *(betöltési idő + Level 1 p95 képkocka-idő)*
- [x] CI pipeline működik. *(typecheck + unit + integration + build + deploy sanity + E2E)*
- [x] GitHub Actions futtatja a teszteket.
- [x] Sikeres pipeline után deployment történik. *(a `deploy-pages` job: `needs: [verify,
      e2e]`, és csak a `main`-re érkező pushra fut — mind a hat quality gate mögül)*

### Deployment

- [x] GitHub repository létrejött.
- [x] Production build működik.
- [x] Itch.io deploy. *(publikus: `https://bioengineerlabs.itch.io/the-wingless-crow`)*
- [x] GitHub Pages deployment működik. *(a CI `deploy-pages` jobja, minden zöld main pushra:
      `https://csokanandor95.github.io/the-wingless-crow/`)*
- [x] A játék publikus URL-en elérhető. *Mindkét csatornán — a titkos URL-es, draft módú
      beta-szakasz ezzel lezárult.*

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

> **Megvalósítva.** Mindkét step lefutott (Step 1: projekt setup; Step 2: player prototype).
> Az aktuális állapot a `CLAUDE.md` „Jelenlegi állapot" szakaszában, a hátralévő munka az
> ottani „Hátralévő munka" szakaszban van.

---

# 41. Eltérések az eredeti tervtől

Ez a szakasz azt gyűjti össze, **hol tér el a megvalósult játék a fenti tervtől** — nem azt,
ami egyszerűen elkészült. A dokumentum pontjainál álló blockquote-jegyzetek ugyanezt jelzik
helyben, `> **Eltérés a tervtől.**` felvezetéssel.

Az eltérések teljes indoklása és története: **`docs/devlog.md`** (a „Függelék — a
Project_plan.md revíziós jegyzetei" szakaszban a jegyzetek eredeti, teljes szövege is
megvan). A megvalósult rendszerek aktuális paraméterei: **`CLAUDE.md`**.

| Terv-pont | Eltérés | Miért | Mikor |
|---|---|---|---|
| **11.** Ellenfelek | Enemy 1 neve `Hollow / Knight` → **`CrowHarvester`**, fegyvere kasza | a választott pixel art csuklyás, csőrös, kaszás dögevő — jobban illik a varjú-tematikához. Gameplay-paraméterek változatlanok | Phase 8 |
| **11.** Ellenfelek | Enemy 2: az „Archer / Caster" párosból a **Caster** valósult meg (`Gravecaller`) | egyetlen árny-tűzgolyó, VÍZSZINTES lövedékkel és VERTIKÁLIS detektálási kapuval; `enemies/Archer.ts` nem létezik | 2026-08-26 |
| **12.** Boss rendszer | **Négy** boss lett, nem egy (a vertical slice-ban tervezett minimum) | a döntési pont a „több enemy / level / boss" irányt választotta | 2026-08-30 … 08-31 |
| **12.** Boss rendszer | A támadás-választás **körforgás**, nem prioritási sor | prioritási sorral a Phase 2 `charge → slash` hurokra egyszerűsödött: egy támadás monopolizált | Phase 8 |
| **13.** Platforming | A Boss 1 arénájából a **két lebegő platform törölve** | a charge és a Shadow Spell elől akadálymentes padlón kell kitérni | Phase 8 |
| **14.** Pályák | A Level 1 **újranyitva** a Phase 8 közben: 3200 → **6000 px**, szakadékokkal és két hazard-típussal | az eredeti layout pillanatok alatt átugrálható volt | Phase 8 |
| **14.** Pályák | `Level 2 – The Crowless Forest` → **`The Crowless Quarter`** | a választott csomag alkonyi gótikus VÁROS, nem erdő; a név a látványt követte. Ezzel a „sötétebb környezet" pont is kikerült | 2026-08-29 |
| **14.** Pályák | `Level 3 – The Throne of the Damned` **kimarad külön pályaként** | a trónterem a Boss 2 arénája lett | 2026-08-30 |
| **14.** Pályák | ÚJ, nem tervezett pálya: **`Level 3 – The Beast Dungeon`** + `Boss 3 – The Beast Master` | az Enemy 3 (`Beast`) egy ÚJ nyomásformát hozott, amire pályát lehetett építeni — nem a meglévők ismétlése | 2026-08-31 |
| **14./15.** | A lánc ELEJÉRE két ÚJ scene került: **`PreScene`** (nyitó szentély), majd **`MainMenuScene`** | a nyitány JÁTSZHATÓ jelenet, nem narráció; a menü fogadóképernyő + az új játék takarítási pontja | 2026-09-02 / 09-03 |
| **15.** Boss arénák | Minden aréna padlóvonala **`GROUND_TOP = 369`** (a `BossScene` 418-ról jött le) | a `ui/Dialogue` panelje a felszín ALATT ül és 75 px-t foglal: `369 + 75 = 444 ≤ 450` | 2026-09-01 |
| **16.** Lore | Az ending **csak szöveg, fekete háttéren** — nem külön `EndingScene` | a `NarrationScene` változtatás nélkül kiszolgálja | 2026-08-30 |
| **20.** Struktúra | **`systems/GameState.ts` nem készült el** | csak annyi kellett belőle, amennyit a `systems/GameProgress.ts` ad: az új játék registry-takarítása | 2026-09-03 |
| **20.** Struktúra | **`EndingScene.ts` nem kellett**, viszont **`ui/Dialogue.ts` MÉGIS** (a terv szerint a `NarrationScene` kiváltotta volna) | a kettő más szerepű: teljes képernyős, kézzel léptetett, pályák KÖZÖTT vs. in-scene, magától menő, beszélő-névvel | 2026-08-30 |
| **20.** Struktúra | ÚJ, nem tervezett modulok: `scenes/NarrationScene.ts`, `scenes/CreditsScene.ts`, `src/npc/`, `systems/SpriteFacing.ts`, `systems/AfterImageTrail.ts`, `hazards/`, `platforms/` | mind konkrét, menet közben felmerült igényből | folyamatos |
| **26.** Visual regression | **Nem pixeldiff-kapu**, hanem képcsatolás emberi átnézésre | méréssel megbukott: hamis bukásokat adott, ÉS a valódi változást elvetette | 2026-09-08 |
| **27.** Cross-browser | **WebKit kimarad** a mátrixból | a Playwright buildjében nincs Web Audio API, a játék be sem tölt | 2026-09-08 |
| **29.** Performance | **On-demand**, nem a fő pipeline része | a mérés csak egyedül futtatva érvényes (párhuzamosan a p95 képkocka-idő 16,7 → 51,7 ms) | 2026-09-08 |
| **33.** QA dokumentáció | **Hét tervezett dokumentum → egy** (`docs/Test-plan.md`) | egy fejlesztő + egy játék esetén a szétbontás elavulást szül; a teszt-kód MAGA a test case | 2026-09-08 |

**Ami a tervből NEM valósult meg, és nyitva is maradt:** a Phase 9 (Lore) placeholder
szövegei. *(A Phase 11 – Deployment 2026-09-12-én lezárult: itch.io + GitHub Pages.)*
Részletesen: `CLAUDE.md`, „Hátralévő munka".

---

# Projekt alapelve egy mondatban

> **Egy kis scope-ú, böngészőben futó, AI-assisted módon fejlesztett 2D dark fantasy action platformer, amelyben a játékélmény mellett egy valódi, automatizált QA és CI/CD pipeline is a projekt szerves része.**