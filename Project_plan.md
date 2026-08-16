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

- VS Code
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

Nem cél komplex platforming rendszer készítése.

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
DEAD
```

---

# 9. Combat

A combat egyszerű marad.

## Kard

Első verzióban maximum két támadás:

### Light Attack

Gyorsabb, kisebb sebzés.

### Heavy Attack

Lassabb, nagyobb sebzés.

Példa input:

```text
Left Mouse / J → Light Attack
Right Mouse / K → Heavy Attack
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

## Enemy 1 – Hollow / Knight

Közelharcos.

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
- heavy attack
- basic movement

### Phase 2

50% HP alatt:

- gyorsabb mozgás
- új attack pl. ground slam, ami a player által ugrással kivédhető

A cél nem egy Elden Ring szintű boss AI.

A cél egy olyan boss, amely:

- felismerhető támadási mintákkal rendelkezik
- kihívást jelent
- látványos
- jó zenével és arénával emlékezetes

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

A Phaser physics rendszerét használjuk.

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
│   │   └── EndingScene.ts
│   │
│   ├── player/
│   │   ├── Player.ts
│   │   └── PlayerController.ts
│   │
│   ├── enemies/
│   │   ├── Hollow.ts
│   │   ├── Archer.ts
│   │   └── Beast.ts
│   │
│   ├── bosses/
│   │   └── Warden.ts
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
- light attack
- heavy attack
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

- Hollow
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

## Phase 7 – Boss

- boss
- boss HP
- attack patterns
- phase 2
- boss arena
- boss victory

## Phase 8 – Atmosphere

- sprites
- backgrounds
- particles
- lighting-like effects
- music
- sound effects
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

- light attack damage
- heavy attack damage
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