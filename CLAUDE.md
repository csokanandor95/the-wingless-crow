# CLAUDE.md

## Projekt: The Wingless Crow

2D dark fantasy action platformer, **Phaser 4** + Vite + TypeScript stackkel, AI-assisted / prompt-driven fejlesztési módszerrel épül.

**Ez a fájl a JELENLEGI ÁLLAPOTOT írja le** — mi létezik most, milyen fájlban, milyen
paraméterrel, és milyen technikai csapdákat kerülj el. A projekt dokumentációja három
fájlra oszlik:

| Fájl | Mire válaszol | Mikor nézd |
|---|---|---|
| **`CLAUDE.md`** (ez) | **Mi van most?** Rendszerek, fájlok, paraméterek, technikai tanulságok. | Ha folytatod a fejlesztést. |
| **`docs/Project_plan.md`** | **Mit terveztünk?** Game design, scope, roadmap, QA stratégia. | Tervezési vagy scope-kérdésnél. |
| **`docs/devlog.md`** | **Hogyan jutottunk ide?** Fázisonkénti iterációk, elvetett alternatívák, mérések. | Ha egy döntés indoklása kell, vagy tudni akarod, mit próbáltunk már. |

További dokumentumok: `docs/Test-plan.md` (a teljes QA), `docs/level1-layout.md` és
`docs/level2-layout.md` (pálya-specifikációk elfogadási kritériumokkal).

**MINDIG ellenőrizd a `docs/Project_plan.md`-t referenciaként**, mielőtt bármilyen tervezési
vagy scope-kérdésben döntesz. Ha egy döntés eltér a benne foglaltaktól, jelezd ezt explicit
módon, hogy a user frissíthesse a dokumentumot (a már megtörtént eltérések a terv 41.
pontjában, az „Eltérések az eredeti tervtől" szakaszban vannak összegyűjtve).

## Munkamódszer

- **Step-by-step, guided approach**: egy fázist/lépést fejezünk be egyszerre, manuálisan is tesztelve, mielőtt a következőre lépnénk.
- A `docs/Project_plan.md` 40+ lépéses roadmapjét követjük (lásd 21. pont: Fejlesztési roadmap).
- Kerüld a scope creep-et: NINCS multiplayer, inventory, skill tree, complex RPG system, procedural generation, open world, komplex NPC rendszer, branching story, crafting, online backend (lásd Project_plan.md 37. pont).
- Ha egy tervezési döntés eltér a Project_plan.md-től, jelezd explicit, hogy frissíthető legyen a dokumentum.
- A cél nem a technikai tökély, hanem egy játszható, kis scope-ú vertical slice + valódi QA/CI pipeline.
- A user preferált kommunikációs nyelve: magyar.
- Minden döntés MÉRÉSSEL indokolt, nem érzéssel: a hitboxok az animáció tényleges
  kiterjedéséből, a windup-idők a player exportált konstansaiból, a tintek a nyers
  RGB-arányokból származnak. Ha egy számot hangolni akarsz, előbb keresd meg a levezetését.
- A tuning-konstansok exportáltak, és a fontosabbakat **unit teszt-invariáns őrzi** —
  egy „gyorsítsuk fel a bosst" változást a CI fog megtalálni, nem a következő kézi
  végigjátszás.

## Tech stack

- Phaser 4 (game engine, Arcade Physics) — a `package.json` `phaser: ^4.2.1`-et használ,
  NEM Phaser 3-at. Phaser 3 doksi/példa keresésekor erre figyelj. Két konkrét eltérés, ami
  már okozott típushibát (mindkettő javítva):
  - a physics `gravity` `Vector2Like`, tehát `{ x: 0, y: 800 }` kell, nem `{ y: 800 }`;
  - az `ArcadePhysicsCallback` paramétere NEM `Phaser.GameObjects.GameObject`, hanem egy
    unió (`GameObjectWithBody | Body | StaticBody | Tile`) — erre van a
    `PhysicsOverlapObject` alias a `src/combat/DamageSystem.ts`-ben, azt használd az
    overlap/collider handlerek szignatúrájában.
- `npm run typecheck` (`tsc --noEmit`) jelenleg **teljesen tiszta** — ha hibát látsz, az
  regresszió. A `tsconfig` `noUnusedLocals: true`, tehát egy árván maradt import is bukik.
- Vite (dev szerver / bundler) — `vite.config.ts`, `base: './'` (relatív asset-utak a
  deployhoz; erre való a `npm run check:build` sanity check)
- TypeScript (strict mode)
- Vitest (unit + integration), Playwright (E2E)
- Node.js / npm

## Parancsok

A repo gyökere MAGA a `the-wingless-crow` mappa — nincs almappa, amibe be kellene lépni.

```
npm run dev              # dev szerver, http://localhost:5173
npm run build            # production build
npm run preview          # a build kiszolgálása helyben

npm run typecheck        # tsc --noEmit (a tsconfig include-ja: ["src", "tests"])
npm run test             # vitest unit tesztek, egyszeri futás (tests/unit)
npm run test:watch       # ugyanaz watch módban
npm run test:integration # vitest integration tesztek (tests/integration)
npm run check:build      # deploy sanity check a dist/-en (scripts/check-build.mjs)

npm run e2e              # Playwright: Chromium + Firefox (buildel előtte)
npm run e2e:smoke        # csak a smoke spec
npm run e2e:visual       # a visual spec, Chromiumon
npm run e2e:perf         # teljesítménymérés, --workers=1 (egyedül futtatva érvényes)
npm run e2e:report       # az utolsó Playwright report megnyitása
```

**A CI `verify` jobját lokálisan ez reprodukálja:**

```
npm run typecheck && npm run test && npm run test:integration && npm run build && npm run check:build
```

Ha ez az öt zöld, a CI `verify` jobjának is annak kell lennie. Az E2E réteg külön jobban fut
(`npm run e2e`) — lásd a „CI" szakaszt lentebb.

## CI (GitHub Actions)

`.github/workflows/ci.yml` — a `Project_plan.md` 31. pontjának pipeline-ja, **teljes
állapotában** (a Phase 10 QA zárta le).

```text
Git push / PR → GitHub Actions (ubuntu-latest, Node 24)
    │
    ├─ job: verify
    │     npm ci → typecheck → unit → integration → build → deploy sanity check
    │
    ├─ job: e2e  (needs: verify)
    │     Playwright: Chromium teljes + Firefox smoke
    │     → playwright-report artifact (7 nap)
    │
    └─ job: deploy-pages  (needs: verify + e2e)   ← CSAK main pushra
          npm ci → build → deploy sanity → GitHub Pages

workflow_dispatch → job: performance  (on-demand, --workers=1)
```

**Quality gate-ek:** Unit · Integration · Build · Deploy sanity · E2E · **Critical errors 0**
(az utolsót a Playwright fixture minden teszten figyeli).

- **Trigger:** `push` szűrő NÉLKÜL (tehát minden branchre) + `pull_request` a `main` felé +
  `workflow_dispatch`. A `concurrency: cancel-in-progress` miatt egy ugyanarra a ref-re
  érkező újabb push megszakítja a még futó, elavult futást.
- **A typecheck KÜLÖN lépés, és a tesztek ELŐTT fut.** Ez nem redundancia: a `vite build`
  esbuilddel csak **levágja** a típusokat, nem ellenőrzi őket — egy zöld build tehát
  önmagában nem bizonyítja, hogy a `tsc` tiszta. A `tsconfig.json` `include`-ja
  `["src", "tests"]`, tehát ez a lépés a teszt fájlokat is típusellenőrzi.
- **`npm ci`, nem `npm install`** — a lockfile-hoz determinisztikusan telepít, és elszáll,
  ha a `package.json` és a `package-lock.json` kicsúszott egymásból.
- **A deploy sanity check a build UTÁN fut** (`scripts/check-build.mjs`): ez az egyetlen
  hibaosztály, amit sem a typecheck, sem a teszt, sem a build nem fog meg — a root-abszolút
  asset-útvonalak némán elrontanák az itch.io és a GitHub Pages deployt, miközben minden más
  zöld marad. Ezt szolgálja a `vite.config.ts` `base: './'`-je.
- **A build a Linux runneren fut, ami case-sensitive.** A `BootScene` az assetek nagy részét
  Vite-importtal hozza be, tehát egy elgépelt nagybetű (pl. `idle.png` a `Idle.png` helyett)
  Windowson észrevétlen, a CI-ban viszont **build-hiba**. Ez a Project_plan 30. pontjának
  (asset testing) ingyen kapott szelete — de csak addig működik, amíg minden asset
  committolva van.
- **A Playwright böngészői verzióhoz kötve cache-eltek** (~400 MB): a cache kulcsa a
  `package-lock.json` hash-e, tehát egy Playwright-frissítés automatikusan új cache-t húz.
  Az `npm run e2e` maga futtatja a buildet a Playwright ELŐTT (a `webServer` csak kiszolgál),
  így a build nem versenyezhet a tesztindítással.
- **A `deploy-pages` job CSAK a `main`-re érkező pushra fut** (`needs: [verify, e2e]`), tehát
  a hat quality gate MÖGÜL — egy feature branch zöld pipeline-ja nem írhatja felül az élő
  oldalt, és a `workflow_dispatch` sem deployol. Három döntés, ami nem véletlen:
  - **saját `concurrency: pages` csoport, `cancel-in-progress: false`** — NEM örökli a
    workflow-szintű `ci-${{ github.ref }}`-et. Egy megszakított TESZT-futás ártalmatlan;
    egy félbeszakított DEPLOY az élő oldalt hagyná félkész állapotban;
  - **a `check:build` MEGISMÉTLŐDIK itt** — a `verify`-beli futás egy MÁSIK job MÁSIK
    `dist/`-jét nézte; ez az a példány, ami ténylegesen felkerül;
  - **a job ÚJRABUILDEL** a `verify` artifactja helyett (determinisztikus build ugyanarról a
    commitról, és az `e2e` job már eddig is újrabuildelt) — cserébe nincs 23,5 MB-os
    artifact-forgalom minden branch-pushon.
  A Pages-jogok (`pages: write`, `id-token: write`) **job-szinten** állnak, tehát a `verify`
  és az `e2e` a top-level `contents: read`-en marad.

**Ami SZÁNDÉKOSAN nincs benne, és miért:**

- **visual regression PIXELDIFF-kapuként** — méréssel megbukott: hamis bukásokat adott, ÉS a
  valódi változást elvetette. Helyette képcsatolás emberi átnézésre (`tests/e2e/visual.spec.ts`).
  A baseline-ok ezért NEM build-kimenetek: a `visual.spec.ts-snapshots/` szándékosan nincs
  a `.gitignore`-ban.
- **performance a fő pipeline-ban** — a mérés egyedül futtatva érvényes (párhuzamos terhelés
  mellett a p95 képkocka-idő 16,7 → 51,7 ms ugrott, a játék változatlanul), ezért on-demand.
- **WebKit a cross-browser mátrixban** — a Playwright buildjében nincs Web Audio API, így a
  játék be sem tölt (részletek a `playwright.config.ts`-ben és a `docs/Test-plan.md`-ben).

*A pipeline útja a minimális első szelettől idáig: `docs/devlog.md`, „Phase 10 – QA".*

## Jelenlegi állapot

**A játék végigjátszható, elejétől a creditsig, és KI VAN ADVA** — itch.io (elsődleges) +
GitHub Pages:

| csatorna | URL | hogyan |
|---|---|---|
| **itch.io** | `https://bioengineerlabs.itch.io/the-wingless-crow` | kézi feltöltés |
| **GitHub Pages** | `https://csokanandor95.github.io/the-wingless-crow/` | a CI `deploy-pages` jobja |

Lezárva: Step 1, Phase 2–8, Phase 10 (QA) és **Phase 11 (Deployment)**.

> A fázisonkénti fejlesztési történet — mi mikor készült, milyen alternatívát vetettünk el,
> és **miért úgy** döntöttünk — a **`docs/devlog.md`**-ben él. Ha egy szám vagy egy döntés
> indoklása kell, azt ott keresd; itt csak az van, ami MOST igaz.

### A scene-lánc

```text
BootScene → MainMenuScene
              ├─ Start Game → PreScene → Level1 → Boss1 → Level2 → Boss2 → Level3 → Boss3
              │               → FinalBossScene → ending (NarrationScene) → CreditsScene ─┐
              ├─ Controls   → IN-SCENE lap (nem külön scene), vissza a menübe            │
              └─ Credits    → CreditsScene ───────────────────────────────────────────────┤
              ↑──────────────────────────────────────────────────────────────────────────┘
```

- **Pálya → aréna:** a pálya végi ajtónál `E` → `NarrationScene` → boss aréna →
  `NarrationScene` → következő pálya.
- **A már legyőzött boss ajtaja KÖZVETLENÜL a következő pályára visz**, átvezető nélkül —
  a registry `bossDefeated` / `kingDefeated` / `beastMasterDefeated` flagje dönt.
- **Vereség:** a Boss 1/2/3 a saját pályájára tesz vissza (a player a boss-ajtó
  checkpointján éled); a **végső boss ÖNMAGÁT indítja újra** (különben minden bukás a
  7200 px-es Level 2 újrafutását jelentené).
- **A boss-párbeszédek végigjátszásonként EGYSZER futnak le** (`systems/DialogueMemory.ts`,
  registry-alapú) — ismételt próbálkozásnál egyből a cím-kártya jön.
- **Új játék:** a `MainMenuScene` „Start Game"-je takarít (`systems/GameProgress.ts`
  `resetProgress()`), nem a credits vége.

**`BootScene.START_SCENE = 'MainMenuScene'`** — fejlesztéshez bármelyik scene-kulcsra
átírható (`'Level2Scene'`, `'Boss2Scene'`, …), hogy az adott szakasz a lánc végigjátszása
nélkül tesztelhető legyen, **de commit előtt mindig vissza `'MainMenuScene'`-re.**

### Pályák

| Pálya | Fájlok | Geometria | Ellenfelek | Sajátosság |
|---|---|---|---|---|
| **Level 1 – Cathedral of the Guardian** | `scenes/Level1Scene.ts` + `levels/Level1Layout.ts` | 6000×450; 5 talaj-szegmens / **4 szakadék** (160 / 160 / 130 / 400 px), 11 platform | 9 (7 CrowHarvester + 2 Gravecaller) | tüskemező, Swinging Reaper, létra, köztes checkpoint (x=3000, érintésre), ház `E`-párbeszéddel |
| **Level 2 – The Crowless Quarter** | `scenes/Level2Scene.ts` + `levels/Level2Layout.ts` | 7200×450; 4 talaj-szegmens, 16 platform | 15 (8 CrowHarvester + 6 Gravecaller + 1 Beast) | mozgó platformok, két fa-platform változat (állvány / konzol, `platformHasLegs()`) |
| **Level 3 – The Beast Dungeon** | `scenes/Level3Scene.ts` + `levels/Level3Layout.ts` | 4200×450; 6 „karám", 5 db 120 px-es gödörrel, 10 platform | 12 (3 CrowHarvester + 6 Gravecaller + 3 Beast) | **MENNYEZET mint design-eszköz** (`GALLERY_RISE` +110); LAPOS háttér, parallax NÉLKÜL |

Mindhárom pálya **450 magas** (= a canvas magassága, tehát csak vízszintes kameragörgetés
van), és mindhárom a KÖZÖS `GROUND_TOP = 418`-at használja (`levels/LevelGeometry.ts`).
A geometria **Phaser-mentes adatmodulban** él (`levels/Level*Layout.ts`), ezért
GameObject-mockolás nélkül unit-tesztelhető. **Magic number nem kerülhet a scene-be.**

### Boss arénák

Mind a négy **fix 800×450**, kameragörgetés NÉLKÜL, `GROUND_TOP = 369`, üres padlóval, és
player↔boss collider nélkül (a sebzés a támadás-hitboxokon megy).

> A **369 LEVEZETETT**: a `ui/Dialogue` panelje a járható felszín ALATT ül és
> `PANEL_RESERVE_PX`-et (75) foglal → `369 + 75 = 444 ≤ 450`. Ezért kellett a `BossScene`-t
> is 418-ról 369-re vinni, amikor párbeszédet kapott.

| Boss | Fájlok | HP / fázis | Támadások |
|---|---|---|---|
| **1. The Grafted Wing-Breaker** | `scenes/BossScene.ts` + `bosses/GraftedWingBreaker.ts` | 240, Phase 2 @ 50 % | slash (`SLASH_RANGE` 138, 18 dmg) · lövedék · Shadow Spell · charge (csak Phase 2) |
| **2. The Mad King** | `scenes/Boss2Scene.ts` + `bosses/MadKing.ts` | 300, Phase 2 @ 50 % | **tisztán közelharci**: slash (142, 12) · ugró becsapódás (18) · kitörés (22, csak Phase 2) |
| **3. The Beast Master** (mini) | `scenes/Boss3Scene.ts` + `bosses/BeastMaster.ts` | **fázis NÉLKÜL** | roham + közelharc (windup 520) · külön `STAGGER` állapot (1400 ms) · **falka-hívás** |
| **Végső. Ancient Demon, Omen of Crows** | `scenes/FinalBossScene.ts` + `bosses/AncientDemon.ts` | 340, Phase 2 @ 50 % | kaszakombó (90, 2×12) · árny-hullám (90, 18) · villanás · idézés (`bosses/ShadeMinion.ts`, csak Phase 2) |

### Player és ellenfelek

| | Fájl | Fő számok |
|---|---|---|
| **Player** | `player/Player.ts`, `PlayerAnimations.ts`, `PlayerController.ts` | HP 100 · `MOVE_SPEED` 200 · `JUMP_VELOCITY` −500 · `CLIMB_SPEED` 130 |
| Kard (`J` / bal klikk) | `combat/Attack.ts` | 10 dmg, 350 ms cooldown, 150 ms startup + 180 ms aktív |
| Heavy slash (`K` / jobb klikk) | `combat/Attack.ts` | 22 dmg, 800 ms cooldown; **3 beérkezett alapcsapásból tölt** |
| Tűzgolyó (`F`) | `combat/Projectile.ts` | 15 dmg · **2 töltet**, töltetenként 5000 ms visszatöltés · 500 ms lövés-ritmus |
| **CrowHarvester** (Enemy 1) | `enemies/CrowHarvester.ts` | HP 40 · 8 dmg · detektálás 220 / elvesztés 320 / hatótáv 42 |
| **Gravecaller** (Enemy 2) | `enemies/Gravecaller.ts` | HP 24 · lövedék 10 dmg · **vertikális detektálási kapu 80** · lövés-ciklus 2360 ms |
| **Beast** (Enemy 3) | `enemies/Beast.ts` | HP 50 · közelharc 10 / roham 15 · roham 320 px/s, 2600 ms cooldown |

### Rendszerek (`src/systems/`, `src/ui/`)

| Modul | Szerep |
|---|---|
| `systems/AudioManager.ts` | egy exkluzív zenesáv (loop + fade) + állapot nélküli one-shot SFX. **Scene-hatókörű** |
| `systems/GameProgress.ts` | a 8 játékon átívelő registry-kulcs + `resetProgress()` |
| `systems/DialogueMemory.ts` | „melyik boss párbeszédét látta már?" — registry, Phaser-mentes |
| `systems/CheckpointSystem.ts`, `LevelCheckpoint.ts` | egyetlen aktív respawn-pont + a köztes checkpoint jelölője |
| `systems/ParallaxBackground.ts` | réteges parallax (Level 1: 3 réteg, Level 2: 2 réteg; Level 3: nincs) |
| `systems/SpriteFacing.ts` | off-center sprite fordulás-kompenzáció (CrowHarvester, Gravecaller, boss) |
| `systems/AfterImageTrail.ts` | sebesség-csík gyors mozgáshoz (Wing-Breaker dash, Mad King kitörés) |
| `systems/Fullscreen.ts` | game-szintű teljes képernyő kapcsoló (`main.ts` regisztrálja) |
| `ui/CombatHud.ts` | HP + tűzgolyó-töltetek + heavy slash töltés, mind a 7 harci scene-ben |
| `ui/Dialogue.ts` | in-scene párbeszéd-panel: magától megy, a jobbra-nyíl gyorsítja |
| `ui/TutorialHint.ts` | egyszer megjelenő billentyű-súgó |
| `ui/MainMenuLayout.ts` | a főmenü geometriája/palettája/szövegei, Phaser-MENTESEN |
| `hazards/HazardDamage.ts`, `SpikeField.ts`, `SwingingReaper.ts` | közös i-frame kapu (900 ms) + a két hazard |
| `platforms/MovingPlatform.ts` | Level 2 mozgó lap: pure mozgásprofil + kézi rider-szállítás |
| `levels/LevelTerrain.ts`, `LevelDecor.ts`, `LevelEnemies.ts`, `LevelGeometry.ts` | mind a három pályán KÖZÖS terrain-, díszlet- és enemy-építés |

### Teszt- és CI-állapot

| Réteg | Mennyiség | Parancs |
|---|---|---|
| unit | **34 fájl / 967 eset** | `npm run test` |
| integration | **2 fájl / 23 eset** | `npm run test:integration` |
| E2E (Playwright) | Chromium teljes (18) + Firefox smoke (5) | `npm run e2e` |
| typecheck | tiszta | `npm run typecheck` |

Mind zöld. A QA stratégia, a lefedettség és a korlátok részletesen: **`docs/Test-plan.md`**.

## Teszt-infrastruktúra

Operatív tudás egy új teszt írásához. (A stratégia és a lefedettségi mátrix a
`docs/Test-plan.md`-ben van; a fázisonkénti történet a `docs/devlog.md`-ben.)

- **A `vitest` ZERO-CONFIG fut — nincs `vitest.config.ts`.** A futtatandó könyvtárat az npm
  script adja meg (`vitest run tests/unit`, illetve `tests/integration`), így a két réteg
  külön kapu a CI-ban.

- **A `'phaser'` modult minden teszt fájl egy teljesen önálló fake névtérre cseréli**
  (`tests/unit/helpers/fakePhaser.ts`, `createFakePhaserModule()`) — a valódi Phaser csomag
  már betöltéskor `window is not defined`-del elszáll Node alatt.
- **`vi.mock()` hoisting csapda**: a vitest a `vi.mock()` hívást a fájl IMPORT sorai fölé
  mozgatja, ezért a factory nem hivatkozhat statikusan importált binding-ra (TDZ hiba). Emiatt
  a `createFakePhaserModule` megosztása **dinamikus** `import()`-tal történik a factory
  testén belül:
  ```ts
  vi.mock('phaser', async () => {
    const { createFakePhaserModule } = await import('./helpers/fakePhaser');
    return createFakePhaserModule();
  });
  ```
  Ezt **minden teszt fájl elején meg kell ismételni** — globális `setupFiles`-es próbálkozás
  NEM működött, ugyanezen hoisting miatt.
- **A `fakePhaser` NEM ad `Scene` osztályt**, tehát a `scenes/*.ts` fájlok unit tesztből nem
  importálhatók. Ezért él a pálya-geometria, a nyitó szentély és a főmenü adata külön,
  Phaser-mentes modulban (`levels/Level*Layout.ts`, `levels/PreSceneLayout.ts`,
  `ui/MainMenuLayout.ts`) — azok igen.
- **A `delayedCall`-ok INTERLEAVE-elhetnek** (pl. `CrowHarvester.resolveAttackHit()` a
  `Player.takeDamage()`-en keresztül saját `delayedCall`-t ütemez ugyanazon a mock scene-en).
  Ezért a `tests/unit/helpers/phaserTestUtils.ts` két léptetőt ad:
  - **`createDelayedCallStepper(scene)`** — REGISZTRÁCIÓS sorrendben halad. `.next()` egy
    lépés, `.flushRemaining()` a kurzortól a végéig (újra-tüzelés nélkül). A
    `createDelayedCallStepper(scene, true)` (`skipExisting`) a kurzort a MÁR ütemezett hívások
    mögé állítja — ez kell, ha a teszt előkészítése maga is ütemez callbackeket (pl. a bosst
    Phase 2-be sebezzük, ami hit-villanást ütemez).
  - **`createDelayedCallRunner(scene)`** — a `run(delayMs)` mindig az adott késleltetéssel
    ütemezett, még le nem futtatott ELSŐ callbacket süti el. Akkor kell, ha a regisztrációs
    sorrend túl merev: egy boss-támadás több, KÜLÖNBÖZŐ hosszúságú callbacket is ütemez
    egyszerre (a lövedék 500 ms-os startupját ÉS a 2200 ms-os újratöltését), és pont az a
    kérdés, mi történik, ha az egyik lefutott, a másik nem.
- **A tuning-konstansok EXPORTÁLTAK**, hogy a tesztek ne égessenek be nyers számokat, és
  minden HP-t viselő entitásnak van `getHP()` / `getMaxHP()`-ja. Ez az elv teszi lehetővé a
  **fairness-invariánsokat**: a boss-tesztek a *player* exportált konstansaiból (`MOVE_SPEED`,
  `JUMP_VELOCITY`, `ATTACK_CONFIGS`) SZÁMOLJÁK vissza, hogy egy támadás kikerülhető-e —
  tehát egy „gyorsítsuk fel a bosst" változást a CI fog megtalálni, nem a következő kézi
  végigjátszás.
- **A layout-tesztek nem viselkedést, hanem GEOMETRIÁT bizonyítanak**: BFS-sel bejárják a
  pályát (ballisztikus hatótáv-számítással), hogy minden felület elérhető; hogy egyetlen enemy
  patrol-tartománya sem lóg le a felületéről; hogy a szakadékok átugorhatók; és a Level 3-nál,
  hogy a roham a mennyezet alatt kikerülhető marad. Ez a layout-spec elfogadási kritériumait
  futtatható állítássá teszi.

## Fájlstruktúra (jelenlegi, tényleges állapot)

```
the-wingless-crow/
├── package.json
├── index.html
├── tsconfig.json                 # strict, noUnusedLocals; include: ["src", "tests"]
├── vite.config.ts                # base: './' — relatív asset-utak a deployhoz
├── playwright.config.ts          # E2E: chromium / firefox (smoke) / performance projektek
├── LICENSE
├── README.md
├── .github/
│   └── workflows/
│       └── ci.yml                # verify (typecheck+unit+integration+build+sanity) + e2e
├── scripts/
│   └── check-build.mjs           # deploy sanity check: a dist/ nem tartalmaz root-abszolút utat
├── public/
│   └── favicon.svg
├── docs/
│   ├── Project_plan.md           # a terv + game design (a 41. pont: eltérések az eredetitől)
│   ├── devlog.md                 # a fejlesztés TÖRTÉNETE, fázisonként
│   ├── Test-plan.md              # a TELJES QA: stratégia, lefedettség, automatizálás, korlátok
│   ├── level1-layout.md          # pálya-specifikációk elfogadási kritériumokkal
│   └── level2-layout.md
├── assets/
│   ├── audio/
│   │   ├── elkmire-keep.mp3      # A NYITÓ SZENTÉLY (PreScene) sávja. UGYANAZ a "Free Dark
│   │   │                         # Fantasy Music" csomag, mint a Level 1 ambienté
│   │   ├── boss-theme.mp3        # Vite-importtal jön be (nem public/), lásd lentebb.
│   │   │                         # = AlkaKrab `4. Cursed Citadel (After Intro & Loop)` — BITRE
│   │   │                         # azonos másolat (md5 29fac9c2..., 2 044 105 bájt)
│   │   ├── shadowforge-convergence.mp3
│   │   │                         # A VÉGSŐ ARÉNA (FinalBossScene) theme-je. UGYANAZ az AlkaKrab
│   │   │                         # csomag: `2. Shadowforge Convergence (Loop)`.
│   │   │                         # A projektben a FÁJLNÉV a FORRÁS-számra mutat, nem a
│   │   │                         # felhasználás helyére — ezért nem `final-boss-theme`
│   │   ├── whispers-of-the-abyss.mp3
│   │   │                         # Level 2 ambient. UGYANAZ az AlkaKrab csomag:
│   │   │                         # `1. Whispers of the Abyss (Loop)`
│   │   ├── veil-of-eternal-nightfall.mp3
│   │   │                         # Boss 2 (Mad King) theme. UGYANAZ az AlkaKrab csomag:
│   │   │                         # `6. Veil of Eternal Nightfall (Loop)`
│   │   ├── eclipsed-desolation.mp3
│   │   │                         # Level 3 ambient. UGYANAZ az AlkaKrab csomag:
│   │   │                         # `3. Eclipsed Desolation (Loop)`
│   │   ├── dread-march.mp3       # Boss 3 (Beast Master) theme. UGYANAZ az AlkaKrab csomag:
│   │   │                         # `5. Dread March (Loop)`
│   │   ├── library-of-veles.mp3  # Level 1 ambient. Free Dark Fantasy Music (Lisette Amago)
│   │   ├── ashen-path.mp3        # A FŐMENÜ sávja. "Ashfall – Dark Fantasy Stream Pack"
│   │   │                         # (cloud1789); a licenc be van másolva mellé.
│   │   │                         # SZÁRMAZTATOTT: a nyers sáv 253,18 s / 5,60 MB, és az első
│   │   │                         # ~10 mp-e csak halk zúgás. Itt a t=10,008..130,008 s szelet
│   │   │                         # van, FRAME-HATÁRON vágva = pontosan 5000 MPEG frame /
│   │   │                         # 120,00 s / 2 638 560 bájt (az ID3v2 tag és a Xing fejléc
│   │   │                         # is lemarad). ÚJRAKÓDOLÁS NINCS.
│   │   │                         # A `seek` NEM lett volna elég: a Phaser loop-forrása
│   │   │                         # `offset = marker ? marker.start : 0`-val indul, tehát a
│   │   │                         # 2. fordulótól újra a zúgás szólna
│   │   ├── ashen-path-license.txt # a csomag LICENSE.txt-je, változatlan másolatban
│   │   └── sfx/                  # Free Fantasy SFX Pack (TomMusic), WAV. A WAV azért kell OGG
│   │                             # helyett, mert univerzálisan támogatott böngészőben; ára
│   │                             # ~900 KB a ~250 helyett
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
│   │       ├── stone-chain-land.wav    # a PreScene nyitó becsapódása — itt viszont a CHAIN
│   │                                   # nyert: a két `Land` változat farka MINDKETTŐNÉL a
│   │                                   # csúcs 10 %-a (az ugrásé 81 % volt), tehát az ottani
│   │                                   # kifogás nem áll; a HF-arány 0,901 vs. 0,223
│   │       ├── rock-wall-1.wav         # Mad King becsapódás (Spells/) — 2 mp-es dörej
│   │       ├── necro-hurt.wav          # CrowHarvester halál \ Monster Growls Attack and
│   │       ├── necro-death-2.wav       # Gravecaller halál   | Deaths V.1 (Lazy Spartan Games)
│   │       ├── fatman-death.wav        # Beast halál         / SZÁRMAZTATOTT: a forrás
│   │                                   # `fatmanbossDeath.wav` 2,879 s, és KÉT részből áll
│   │                                   # (haláltusa 0–1,45 s, majd ~0,3 s csend után egy
│   │                                   # külön utórész). Itt a 0–1,55 s + 60 ms fade van.
│   │                                   # A csúcs (0.751) a vágástól NEM változott
│   │       └── death-groan-17.wav      # player halál. SZÁRMAZTATOTT: a forrás
│   │                                   # `17. Death Groan (Male).wav` KÉT külön felvételt
│   │                                   # tartalmaz (50-330ms és 575-950ms, közte csend);
│   │                                   # ebből az ELSŐ van kivágva (0-360ms) + 30ms
│   │                                   # fade-out. Forrás: VoiceBosch, Death Sounds Male
│   ├── backgrounds/
│   │   ├── ruined-city/          # Level 1 parallax rétegek, mind 426x384
│   │   │   ├── 01-sky.png        # RGB, átlátszatlan ég (#673838 -> #724141)
│   │   │   ├── 02-mountains.png  # RGBA sziluett, teteje a forrás y=163..201-nél
│   │   │   └── 03-ruins.png      # RGBA sziluett, teteje a forrás y=193..227-nél
│   │   ├── cathedral/
│   │   │   └── boss-arena.png    # 800x450, ÁTMÉRETEZETT/KIVÁGOTT (1663x935 crop @ 4,0), hogy
│   │   │                         # a rajzolt padlóél a BossScene.GROUND_TOP-jára (369) essen.
│   │   │                         # HA A GROUND_TOP VÁLTOZIK, a képet ÚJRA kell generálni —
│   │   │                         # a képlet a BossScene szakaszban
│   │   ├── broken-gate/
│   │   │   └── final-arena.png   # 800x450, CSAK ÁTMÉRETEZVE (nincs kivágás), a Boss 2 receptje
│   │   │                         # szerint: a forrás 1672x941 aspektusa (1.7768) gyakorlatilag
│   │   │                         # azonos a 800/450-ével (1.7778). A rajzolt dais-perem a 369.
│   │   │                         # sorra esik = FinalBossScene.GROUND_TOP.
│   │   │                         # AI-generált (ChatGPT), mint a másik három aréna háttere
│   │   ├── throne-room/
│   │   │   └── boss2-arena.png   # 800x450. A forrás a `Mad King background.png` (1641x959) —
│   │   │                         # a KIRÁLYNÉ KOPORSÓJÁVAL a lépcső előtt, pontosan amiről a
│   │   │                         # KING_DIALOGUE szól.
│   │   │                         # KIVÁGVA (0,36 -> 1641x923), mert a forrás aspektusa
│   │   │                         # (1.7112) NEM azonos a 800/450-ével: sima átméretezés
│   │   │                         # 3,9 %-ot torzítana függőlegesen. A levágott 36 sor a
│   │   │                         # sötét mennyezet-sáv. A rajzolt dobogó-perem (a forrás
│   │   │                         # 793. sora) a 369.-re esik = Boss2Scene.GROUND_TOP.
│   │   └── gothic-town/          # Level 2 parallax. GothicVania Town (Luis Zuno) — PUBLIC DOMAIN.
│   │       │                     # MINDKETTŐ SZÁRMAZTATOTT, de VESZTESÉGMENTESEN: a forrás alsó
│   │       │                     # sávja bitre azonos sorokból áll, tehát lefelé toldható.
│   │       ├── 01-sky.png        # 384x450 = background.png (384x288) + 162 sor `#71405A`
│   │       └── 02-town.png       # 768x450 = [middleground.png | TÜKRÖZVE] + 162 sor `#392D55`
│   │                             # A tükrözés teszi vízszintesen varratmentessé (a nyers
│   │                             # 384-es réteg bal és jobb éle érdemben eltér).
│   │   └── shrine/
│   │       └── pre-scene.png     # 800x450, a NYITÓ SZENTÉLY (PreScene). Romos gótikus
│   │                             # szentély egy SZÁRNYAS angyalszoborral. AI-generált
│   │                             # (ChatGPT). SZÁRMAZTATOTT: a forrás (1672x941) sima
│   │                             # átméretezése, KIVÁGÁS NÉLKÜL — az aspektus (1.7768)
│   │                             # gyakorlatilag azonos a 800/450-ével (1.7778), pontosan a
│   │                             # final-arena.png receptje. A mozaikpadló lapja a 345-397.
│   │                             # sor (a 398.-ban -21,06 a zuhanás) -> GROUND_TOP = 369
│   │   └── menu/
│   │       └── main-menu.png     # 800x450, a FŐMENÜ háttere. CSAK ÁTMÉRETEZVE (nincs
│   │                             # kivágás), UGYANAZ a recept: a forrás
│   │                             # (`2D helper/level/Menu.png`) szintén 1672x941.
│   │                             # A MÉRT kompozíciója szabja meg a menü geometriáját:
│   │                             # koronás lovag x196..320, szárnyas szobor x310..385 ->
│   │                             # a menüblokk x=410-nél kezdődik (ui/MainMenuLayout.ts
│   │                             # PAINTING). AI-generált (ChatGPT)
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
│   │   └── church/               # Level 3 terrain + a Boss 3 aréna. GothicVania Church
│   │       │                     # (Luis Zuno / @ansimuz). Lásd levels/ChurchTileset.ts
│   │       ├── ground-strip.png        # a járható felszín csempéje
│   │       ├── block-strip.png         # tömör kőfal-sáv \ a karámok és a galériák
│   │       ├── fill-block.png          # kitöltő tömb    /
│   │       ├── balustrade.png          # a galéria pereme
│   │       ├── pillar.png              # oszlop
│   │       ├── arch-gate.png           # a boss-ajtó boltíve
│   │       ├── altar-wall.png          # az aréna hátfal-panelje
│   │       └── wall-cross.png          # fal-dekor csempe
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
│   │   └── church/               # Level 3 díszlet. GothicVania Church (Luis Zuno).
│   │       │                     # A `bg-` előtagúak a fal SÍKJÁBAN ülnek (átlátszatlan,
│   │       │                     # keretes panelek — lásd a 28. technikai tanulságot)
│   │       ├── bg-altar.png  bg-column.png  bg-gargoyle.png
│   │       ├── bg-sconce.png bg-window.png
│   │       └── column.png        # előtér-oszlop
│   └── sprites/
│       ├── knight/               # player sprite sheetek, mind 128x64-es blokkokra vágva
│       │   ├── Idle.png Run.png Jump.png Attacks.png
│       │   ├── Hurt.png Death.png Climb.png Health.png
│       │   └── license.txt       # 2D_SL_Knight_v1.0 licenc (Szadi art), változatlan másolatban
│       ├── goddess/              # A LÁNGŐRZŐ (PreScene NPC) — GandalfHardcore "FREE NPC".
│       │   │                     # A csomag READ ME.txt-jének licencszövege BE VAN MÁSOLVA
│       │   │                     # (a knight mintájára)
│       │   ├── GandalfHardcore-Goddess-NPC.png
│       │   │                     # 832x64 = 13 db 64x64-es frame: f0-4 IDLE, f5-12 JÁRÁS
│       │   │                     # (mérve, lásd lentebb). VÁLTOZATLAN másolat; a fájlnévben csak a
│       │   │                     # SZÓKÖZÖK lettek kötőjelek (a Vite-import szóközzel
│       │   │                     # törékeny — a Mad King `Take-Hit.png` precedense)
│       │   └── license.txt       # a csomag READ ME.txt-jének licencszövege + a forrás linkje
│       ├── crow-harvester/       # Enemy 1 sprite
│       │   └── enemy04_sheet.png # 1792x64 = 28 db 64x64-es frame. Szadi art, Animated
│       │                         # Character Pack. Az EREDETI fájlnév a kapocs a forráshoz
│       ├── beast/               # Enemy 3 sprite (Omni-Machina, Goatman).
│       │   └── goatman.png       # 384x512 = 6x8 db 64x64-es frame (48 cella, 41 rajzolt).
│       │                         # VÁLTOZATLAN másolat, EREDETI fájlnéven: ez az egyetlen
│       │                         # kapocs a forráshoz. A csomagban VAN dedikált,
│       │                         # fejlehajtott roham-animáció (f24-33) — ezért jó egy
│       │                         # chargerhez. Death animáció NINCS
│       ├── gravecaller/          # Enemy 2 sprite (oco, Medieval Fantasy Character Pack 6).
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
│       │                         # darkpixel-kronovi / Kronovi-).
│       │                         # VÁLTOZATLAN másolatok, EREDETI fájlnéven.
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
│       └── mad-king/             # Boss 2 sprite (LuizMelo, Medieval King Pack 2) — CC-0, a
│           │                     # licenc a repóban van. HÉT sheet, MIND 160x111-es frame-mel, a talp
│           │                     # mindegyiken a frame y=105-énél. VÁLTOZATLAN másolatok.
│           ├── Idle.png          # 8 frame \ 1280x111
│           ├── Run.png           # 8 frame /
│           ├── Attack1.png       # 4 frame — SLASH, f2 a csapás (a penge x=151-ig ér)
│           ├── Attack2.png       # 4 frame — LUNGE (Phase 2), f2 a kitörés mozgás-csíkkal
│           ├── Attack3.png       # 4 frame — LEAP: f0-1 guggolás, f2 levegőben, f3 becsapódás
│           ├── Death.png         # 6 frame, f5 = a földön maradó test (NINCS fade utána)
│           ├── Take-Hit.png      # 4 frame — CSAK a falnak rohanó kitörés staggerje.
│           │                     # A szóköz kivéve a névből: a Vite-import azzal törékeny
│           └── license.txt       # CC-0, változatlan másolatban
│           # A csomag Jump.png / Fall.png sheetje SZÁNDÉKOSAN kimaradt (az Attack3 f2 MAGA a
│           # levegőben lévő póz), és a "Take Hit - white silhouette.png" sem kell: a
│           # találat-villanás a bevett setTint + TintModes.FILL úton megy.
├── tests/
│   ├── e2e/                     # Playwright — a részletek: docs/Test-plan.md
│   │   ├── smoke.spec.ts        # betöltés, canvas, kritikus konzol-hibák
│   │   ├── scenes.spec.ts       # scene-váltások és a menü-navigáció
│   │   ├── progression.spec.ts  # a lánc bejárása registry-manipulációval
│   │   ├── assets.spec.ts       # minden asset betöltődik-e (404-figyelés)
│   │   ├── visual.spec.ts       # KÉPCSATOLÁS emberi átnézésre, NEM pixeldiff-kapu
│   │   ├── performance.spec.ts  # on-demand, --workers=1 (egyedül futtatva érvényes)
│   │   └── fixtures/game.ts     # a közös fixture: betöltés-várás + konzol-hibafigyelés
│   ├── integration/
│   │   ├── combat.integration.test.ts          # player -> enemy sebzés-lánc, több modulon át
│   │   └── checkpointRespawn.integration.test.ts # checkpoint -> halál -> respawn -> enemy-reset
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
│       ├── combatHud.test.ts    # a HUD pure pipa-helperei + a rajzolás/életciklus
│       ├── tutorialHint.test.ts # a KEREKÍTETT középre igazítás (a „remegő felirat" ellen)
│       ├── dialogueMemory.test.ts # a „már láttam" registry-emlékezet (Phaser-mock NÉLKÜL)
│       ├── gameProgress.test.ts # az új játék registry-takarítása (resetProgress)
│       ├── mainMenuLayout.test.ts # a főmenü geometriája + a MÉRT kontraszt + a Controls lap
│       ├── preSceneLayout.test.ts # a nyitó szentély geometriája (panel, padló-lap, zuhanás,
│       │                        # az interakciós zóna) + a párbeszéd sorhossza
│       ├── goddessAnimations.test.ts # A Lángőrző LEVEZETETT geometriája + az idle anim
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
│   │   ├── PreSceneLayout.ts     # a nyitó szentély geometriája ÉS párbeszéde, Phaser-MENTESEN
│   │   │                         # (a fakePhaser nem ad Scene osztályt -> a PreScene.ts maga
│   │   │                         #  nem importálható unit tesztből)
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
│   │   ├── Dialogue.ts           # in-scene párbeszéd-panel: MAGÁTÓL megy, nyíllal gyorsítható
│   │   ├── CombatHud.ts          # HP + tűzgolyó-töltetek + heavy slash töltés. KIVÁLTOTTA a
│   │   │                         # 7 scene-ben duplikált playerHpText blokkot
│   │   └── MainMenuLayout.ts     # a FŐMENÜ geometriája/palettája/szövegei, Phaser-MENTESEN
│   │                             # (a fakePhaser nem ad Scene osztályt -> a MainMenuScene.ts
│   │                             #  maga nem importálható unit tesztből). A menüblokk bal
│   │                             #  korlátja a festmény MÉRT kompozíciójából jön (PAINTING)
│   ├── scenes/
│   │   ├── BootScene.ts          # placeholder textúrák + audio betöltés + loading kijelzés
│   │   ├── MainMenuScene.ts      # A FŐMENÜ: Start Game / Controls / Credits. A Controls
│   │   │                         # IN-SCENE lap (külön scene levágná a menüzenét)
│   │   ├── PreScene.ts           # A NYITÓ SZENTÉLY: zuhanás -> séta -> párbeszéd -> Level 1
│   │   ├── Level1Scene.ts        # 6000px pálya; a geometria a levels/Level1Layout.ts-ből jön
│   │   ├── BossScene.ts          # 800x450 fix aréna, boss entrance, HP-bar, victory/defeat ágak
│   │   ├── NarrationScene.ts     # adatvezérelt szöveges átvezető (typewriter), újrahasználható
│   │   ├── Level2Scene.ts        # 7200px pálya; a geometria a levels/Level2Layout.ts-ből jön
│   │   ├── Boss2Scene.ts         # 800x450 fix aréna: párbeszéd -> belépő -> harc
│   │   ├── Level3Scene.ts        # 4200px pálya; LAPOS háttér (nincs parallax), church skin
│   │   ├── Boss3Scene.ts         # 800x450 fix aréna, SCENE-BEN ÖSSZERAKOTT háttérrel
│   │   ├── FinalBossScene.ts     # 800x450 fix aréna: párbeszéd -> belépő -> harc + lidércek
│   │   └── CreditsScene.ts       # "Thanks for playing" + szerzők; a végén vissza a FŐMENÜBE
│   ├── npc/
│   │   └── GoddessAnimations.ts  # A LÁNGŐRZŐ (PreScene): 13 frame-es idle, MÉRT talp-offset.
│   │                             # A projekt első NEM HARCOLÓ szereplője -> új mappa
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
│   │   ├── GameProgress.ts       # a 8 játékon átívelő registry-kulcs + resetProgress().
│   │                             # A CreditsScene-ből költözött ide; a FŐMENÜ Start Game-je
│   │                             # hívja — ott kezdődik ténylegesen egy új futás
│   │   ├── LevelCheckpoint.ts    # a köztes checkpoint jelölője + zónája (mindkét pályán)
│   │   ├── AudioManager.ts       # egy zenesáv (loop + fade) + állapot nélküli one-shot SFX
│   │   ├── DialogueMemory.ts     # „melyik boss párbeszédét látta már?" — registry, Phaser-mentes
│   │   ├── SpriteFacing.ts       # off-center sprite fordulás-kompenzáció (CrowHarvester + boss)
│   │   ├── AfterImageTrail.ts    # afterimage-csík gyors mozgáshoz (a boss dash-éhez)
│   │   ├── Fullscreen.ts         # game-szintű teljes képernyő kapcsoló (a main.ts regisztrálja)
│   │   └── ParallaxBackground.ts # réteges parallax háttér + a Level 1 és Level 2 réteg-terve
│   └── combat/
│       ├── Attack.ts             # AttackType enum (egyetlen tag: SWORD) + ATTACK_CONFIGS (sebzés, cooldown, hitbox méret)
│       ├── Projectile.ts         # Fireball osztály + FIREBALL_CONFIG + ProjectileOptions (boss lövedék)
│       └── DamageSystem.ts       # Damageable interface + PhysicsOverlapObject típus-alias
```

**A `Project_plan.md` 20. pontjában tervezett, de NEM létező modulok** (a szerepüket más
tölti be — a részletes indoklás a terv 41. pontjában):

| Tervezett | Mi lett belőle |
|---|---|
| `enemies/Archer.ts` | `enemies/Gravecaller.ts` (Caster, nem Archer) |
| `systems/GameState.ts` | `systems/GameProgress.ts` — csak annyi, amennyire tényleg szükség volt: az új játék registry-takarítása |
| `MenuScene` | `scenes/MainMenuScene.ts` + `ui/MainMenuLayout.ts` |
| `EndingScene.ts` | a `NarrationScene` — változtatás nélkül, csak más `{ lines, nextScene }` adattal |
| — (nem tervezett) | `scenes/CreditsScene.ts`: a `NarrationScene` typewriter-léptetése nem alkalmas egy hosszú, görgő attribúciós listára |
| — (nem tervezett) | `ui/Dialogue.ts`: MÉGIS kellett, mert más szerepű, mint a `NarrationScene` (in-scene, magától menő, beszélő-névvel vs. teljes képernyős, kézzel léptetett, pályák KÖZÖTT) |

Az `assets/` alatt az **`effects/` mappa sem létezik még** — a hazardok és a három lövedék
ezért kódból generált placeholder textúra.

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
- **Heavy slash (K / jobb egérgomb)** — lásd lentebb a saját szakaszát.
- Fireball: F billentyű, `combat/Projectile.ts` Fireball osztályt hoz létre a Level1Scene-ben
  egy `fireball-cast` eventen keresztül. **KÉT töltete van, független visszatöltéssel** —
  lásd lentebb.

### Heavy slash + tűzgolyó-töltetek

A harc két erőforrás-korlátja. **A cél nem egy erősebb player volt, hanem változatosabb
harc** — ezt mindkét szám levezetése rögzíti, és unit tesztek őrzik.

**TŰZGOLYÓ — 2 töltet, EGYMÁSTÓL FÜGGETLEN visszatöltéssel.**
- `FIREBALL_MAX_CHARGES = 2`, `FIREBALL_RECHARGE_MS = 5000` (`combat/Projectile.ts`).
  A `FIREBALL_CONFIG.cooldownMs` (500) ettől FÜGGETLEN: az a lövések közti RITMUS, nem a
  fegyver kapuja.
- **A modell időbélyeg-sor, NEM `delayedCall`** (`Player.fireballRechargeAt`): minden
  elköltött töltet betesz egy `now + rechargeMs` bejegyzést, ami lejáratkor kikerül. Ebből
  adódik a viselkedés — két gyors lövés → egyszerre visszatérő töltetek; egy lövés,
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
  A 2 lövéses BURST szándékosan marad — a nyomásnak a sorozat UTÁN kell jönnie.
- A `castFireball()` **nullázza a `currentAnimKey`-t** (a támadás precedense): egy
  két-töltetes sorozatnál a második cast különben az animáció utolsó frame-jén ragadna.
- `respawn()`: a tár **tele** éled újra.

**HEAVY SLASH — `AttackType.HEAVY`, K / jobb egérgomb.**
- **A látvány EGY vágott „echo" sprite.** Az `Attacks.png` f17–f19 frame-jein a félhold-hullám
  LEVÁLIK a testről (oszlop-hézag: 76..88, 76..94, 76..108) és előre halad. Elég tehát
  ugyanazt az animációt még egyszer lejátszani egy előrébb tolt sprite-on, amiről a lovag
  testét levágjuk — a két ív egyetlen, kétszer olyan messzire érő csapásnak olvas. A sprite
  egyszer jön létre a `Player` konstruktorában (az `attackHitbox` mintája), és csak pozíciót
  és láthatóságot vált.
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
  találat-kezelő meghív, és csak ténylegesen sebző találatnál. Két megszorítással:
  CSAK `SWORD` tölt (különben a heavy önmagát finanszírozná), és **csapásonként egyszer**
  (`hitTargetsThisAttack.size === 0`), tehát egy több ellenfelet elérő ív sem ad többet — a
  swing számít, nem a célpont. Mindkettőre van teszt.
  *Mellékhatás, ami helyes:* a `Boss3Scene`/`FinalBossScene` a sebezhetőséget a
  `registerHit()` ELŐTT nézi, tehát egy DORMANT/villanó célponton elhasznált csapás nem tölt.
- **Nincs új `PlayerState`** — a heavy is `ATTACK`, csak saját anim kulccsal
  (`PLAYER_ANIMS.ATTACK_HEAVY`: UGYANAZ az öt frame 480 ms alatt, 10,4 fps a kard 15-e
  helyett). Ezért érintetlen az `isLocked()` és a `player.test.ts` lock-táblája. Az
  `animKeyForState(state, attackType?)` default paramétere miatt a régi teszt-tábla is az.
- **Az echo a MEGLÉVŐ `startup+active` időzítőn tűnik el**, szándékosan nem egy újon: a
  `performAttack()` `delayedCall`-jainak száma és sorrendje így változatlan. A `die()` is
  elrejti (ne lógjon a hullám, amíg a lovag összerogy), a `respawn()` szintén.
- `respawn()`: a felgyűjtött heavy **ELVÉSZ** — konzisztens azzal, hogy a player halálakor
  az enemyk is újraélednek.
- **A heavy IZZIK — „spell-kard".** Mindkét hullám `HEAVY_WAVE_TINT` (`0xff7a2a`) színt kap
  **ADD blenddel**, `HEAVY_WAVE_ALPHA` (0.85) mellett. Az ADD itt KÉNYSZER, nem ízlés: a
  MULTIPLY tint (a projekt szokásos módja) csak SÖTÉTÍTENI tud, tehát barnább ívet adna — az
  ADD viszont hozzáadja a fényt a háttérhez, így a sötét arénákban is égő csóvaként olvas.
  **Ez a 14. és a 26. tanulság kiegészítése:** ha nem elnyelni akarsz, hanem világítani, a
  tint önmagában kevés. Ezért van a hullámokból KETTŐ
  (`HEAVY_WAVE_OFFSETS = [0, HEAVY_ECHO_OFFSET_PX]`): a `0`-s a lovag SAJÁT ívére fekszik és
  felizzítja (a crop miatt a testére nem), a másik a második hullám. Enélkül csak a távoli ív
  égne, a közeli fehér maradna.
- **Hang:** a `SFX_KEYS.SPELL_IMPACT` (`firebuff-2`), amit a bossok varázslatai is használnak,
  `HEAVY_SLASH_DETUNE = -200` centtel mélyítve — ugyanaz a láng, egy kard mögötte, nem egy
  oltár. A `PlaySfxOptions` ehhez kapott egy fix `detune` mezőt a véletlen `detuneRange` MELLETT.
- **VÁLLALT KÖVETKEZMÉNY — a hatótáv a bossokkal szemben:** lásd a „Nyitott hangolási és
  polish-tételek" szakaszt.

### HUD (`src/ui/CombatHud.ts`)

A HP-sor + a két erőforrás-mérő. **Ez a modul váltotta ki a HÉT scene-ben szó szerint
duplikált `playerHpText` blokkot** — pontosan az a költöztetés, amit a `TutorialHint.ts`
fejléce a Phase 8 `ui/` iterációjának feladataként jegyez. A duplikáció megszüntetése nem
esztétikai döntés volt: a két új mérőt különben ugyanúgy hétszer kellett volna bemásolni.

- **A HP-sor formátuma betű szerint a régi** (`HP: 100/100 | IDLE`) — továbbra is debug
  kijelzés, a valódi ikonos HUD külön iteráció.
- **`HUD_DEPTH = 100` egységesen** — ez a projekt legmagasabb használt értéke (`Dialogue`
  90/91, `TutorialHint` 50, minden terep/díszlet negatív), tehát mindenhol biztonságos.
  Konstruktor-opció ezért nem kell.
- **Nem importálja a `Player`-t**, hanem a `CombatHudSource` strukturális felületet várja
  (a `LevelEnemy` / `PhysicsOverlapObject` precedense) — így a `ui/` nem függ a `player/`-től,
  és a modul Player-mock nélkül tesztelhető.
- **PURE segédfüggvények** (`fireballPipFill`, `heavySegmentFilled`) a `Dialogue` magjának
  mintájára — ezeken van a teszt súlypontja.
- Színek a projekt meglévő nyelvén: tűzgolyó **narancs** `0xff9a3c` (a lövedék-placeholderé),
  heavy **arany** `0xffd070` (a bossok `SLASH_TELEGRAPH_TINT`-je — az arany a projektben
  következetesen „nagy kardcsapást" jelent), teli állapotban világosabb kerettel.
- A scene-ek `update()`-jében a hívás a `controller.update()` **UTÁN** áll: az lejáratja a
  tűzgolyó-tölteteket, különben a töltés-csík egy frame-et késne.
- **`setVisible()` — a Level 1 ház-párbeszéde alatt a HUD elrejtőzik.** Ez az EGYETLEN
  párbeszéd a játékban, aminek a panelje a képernyő TETEJÉN ül (`HOUSE_DIALOGUE_PANEL_TOP`,
  mert egy PÁLYA padlója 418, és `418 + PANEL_RESERVE_PX > 450`) — pont a HUD helyén,
  ráadásul a HUD magasabb mélységen, tehát belelógna. A négy boss-aréna panelje 369-nél van,
  azokkal nincs ütközés. A player a párbeszéd alatt amúgy is teljesen be van fagyasztva.

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
  - **A kettőt SZÁNDÉKOSAN nem szabad egybemosni:** a szűk patrol-körzetre clampelt üldözés
    azt jelentené, hogy a lény a pálya közepén, láthatatlan falban áll meg, miközben a player
    kisétál belőle. Így a szakadék (vagy a tüskemező) széléig követi.
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
- **A talaj NEM folyamatos:** öt `GROUND_SEGMENTS` szegmens, a köztük lévő **négy hézag
  a szakadék** (160 / 160 / 130 / 400 px). A `groundGaps()` SZÁMÍTJA őket a
  szegmensekből, tehát nincsenek külön felsorolva — egy szegmens elmozdítása automatikusan
  átméretezi a szomszédos szakadékot
- **Az A szakasz SÍK, hazard nélküli, és ott áll a pálya egyetlen HÁZA**
  (`BACKDROP_BUILDINGS`, `A-house`, x=620). A `G1` szegmens 0–1660-ig fut, a szakasz szerepe
  hangulat és felvezetés, nem mechanika-tanítás. Ezzel az első KÉNYSZERŰ ugrás a C szakaszé
  (`gap1`, 160 px). **A szegmens-id-k `G1, G3, G4, G5, G6`** — az id-hézag szándékos, hogy a
  `G3`–`G6` hivatkozásai ne csússzanak el.
  - **A ház a `house-a.png`** (GothicVania Town), amit a `BootScene` a Level 2 miatt már
    betölt. **Nincs physics bodyja**, és a `BUILDING_DEPTH` (−15) a parallax rétegek
    (−30..−20) ELŐTT, de a propok (−10) és a terrain (−5) MÖGÖTT van → a player és az enemyk
    elmennek előtte.
  - **A tintje MÉRT** (`BUILDING_TINT_CATHEDRAL_SOURCE`, `0xf3e599`): a nyers `(68,45,60)`-ból
    `(65,40,36)` lesz — fényességben (46,9) ÉS telítettségben (`R/B` 1,80) is pont a
    hangulati propok `(55,35,32)` és a mögötte lévő `03-ruins` réteg `(74,46,40)` FELEZŐPONTJA,
    vagyis oda esik, ahol a ház a mélységsorrendben is ül. **A tintet a NYERS ARÁNYBÓL kell
    választani, nem az anyag kategóriájából** — a „kő/vakolat" alapon adott
    `PROP_TINT_COOL_SOURCE` telítettségben túllő (`R/B 2,55`, a pálya elfogadott sávja
    1,25..1,87), a `PROP_TINT_WARM_SOURCE` pedig fényességben alálő. Unit teszt őrzi, hogy a
    tintelt eredmény a sávban marad.
  - **Opcionális párbeszéd `E`-re** (`HOUSE_DIALOGUE`): valaki kiszól a házból. **A panel a
    képernyő TETEJÉRE kerül** (`HOUSE_DIALOGUE_PANEL_TOP`), és ez KÉNYSZER: a `Dialogue` a
    horgony ALÁ rajzol `PANEL_RESERVE_PX` (75) px-t, egy PÁLYA padlója viszont 418, és
    `418+75 = 493 > 450`. Bármilyen 343 fölötti horgony a player TESTÉT (372..418) takarná ki.
    A `CombatHud` ezért ilyenkor `setVisible(false)`-ra megy — ez az EGYETLEN párbeszéd, ami
    a HUD helyén ül.
  - **A player a párbeszéd alatt TELJESEN befagy**, és ehhez a `PlayerController`
    **`setEnabled()`**-je kell: az `update()` kihagyása önmagában NEM elég, mert a konstruktor
    a `J`/`K`/`F`/`pointerdown` listenereket regisztrálja, tehát a player különben kardot
    suhinthatna a monológ alatt.
  - **A párbeszéd ISMÉTELHETŐ**, mint egy újraolvasható tábla — se `DialogueMemory`, se
    registry-kulcs nem kell. Ebből következik, hogy a **`keydown-RIGHT` bekötés a `create()`-ben
    van, nem a `startHouseDialogue()`-ban** (`this.houseDialogue?.advance()`, null-safe):
    különben minden újraindításkor egy új listener gyűlne fel.
  - **A `JustDown` élét EGYSZER, a frissítés elején olvassuk ki**, és osztjuk szét a két
    interakciós pont (ház + ajtó) között. Két oka van: (1) a második hívás ugyanabban a
    frame-ben már `false`, tehát a ház némán elnyelné az ajtó `E`-jét; (2) a párbeszéd ALATT
    is ki kell olvasni, különben egy türelmetlenül `E`-t nyomkodó player leütése „felgyűlne",
    és a párbeszéd végén azonnal újraindítaná.
  - **Az `E: Kopogás` prompt VILÁG-koordinátás** (`HOUSE_PROMPT_Y`, a player feje fölött
    24 px-szel), nem `setScrollFactor(0)`-s képernyő-felirat — **és ez a különbség a
    boss-ajtóhoz képest.** Az ajtó promptja azért ülhet a (400, 400) képernyő-ponton, mert a
    pálya VÉGÉN a kamera nekiütközik a jobb bounds-nak (`scrollX` 5200-nál megáll), tehát a
    player a képernyő jobb szélére csúszik. A ház viszont x=620-nál van, ahol a kamera
    SZABADON követ — ott a player pontosan a képernyő közepén (400) áll, tehát egy fix
    felirat pont MÖGÉ kerülne.
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
- **11 platform** a `PLATFORMS` tömbben (adatvezérelt: az enemy patrol-határok ugyanebből a
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
- **Tutorial feliratok** (`src/ui/TutorialHint.ts`): a mozgás-súgó `triggerX: 0`, tehát a
  spawn pillanatában megjelenik, és 4 mp-ig áll. A súgók CSAK friss játékban jelennek meg:
  boss-vereség után az ajtó-checkpointon éledünk újra, ahol mindkét trigger átlépettnek
  számítana.
  A **harc-súgó `triggerX`-e 1560**, és ez az első ellenfélhez (`C-1`, patrol 2000-től) van
  igazítva: 4 mp × 200 px/s = 800 px, tehát a felirat 1560..2360-ig van a képen — a `gap1`
  átugrása ÉS a harc is ebbe esik. **KÉTOLDALI unit teszt őrzi** (a harc előtt induljon, de
  még a képen legyen, amikor a harc kezdődik), hogy az enemy áthelyezése és a trigger ne
  csúszhasson el egymástól.
  **Ismert, elfogadott szétcsúszás a mozgás-súgónál:** lásd a „Nyitott hangolási és
  polish-tételek" szakaszt.
- **Létra** a pálya végén (x=5678): `tileSprite` a vizuál (32px-es csempeszélességgel), külön
  `Zone` statikus bodyval a fizika (28px — a RAJZOLT létra szélessége). A scene `update()`-je
  **szinkron** `this.physics.overlap(player, ladderZone)`-t használ, NEM `physics.add.overlap`
  callbacket — utóbbi csak a scene `update()` UTÁN futna le, ami 1 frame késést okozna a
  mászásban. **Hátfal nincs:** a létra a `H1` platformnak van támasztva, a fokok között a
  parallax háttér látszik át
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
  `player.respawn()` ELŐTT) — enélkül egy nehéz szakaszt ismételt halálokkal „le lehetne
  koptatni" egy 6000 px-es, szakadékokkal tagolt pályán.
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
  - **A projectile-nak NINCS tint-telegraph-ja** — ott az animáció maga a jelzés. A charge
    **piros** (Project_plan 12. pont), a slash **arany** telegraph-ot kap: a 900 ms-os
    winduphoz félreérthetetlen jelzés kell, hogy a player tudja, most van itt az
    ütés-és-kitérés ablaka.
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

#### A kardcsapás windupja — LEVEZETETT, ne hangold

`SLASH_WINDUP_MS = 900` (9 slot × 100 ms). **Ez nem szabadon választott szám**, hanem abból a
mérésből jön, hogy a player a saját támadása alatt végig lockolva van (`Player.isLocked()` az
ATTACK state-re), tehát a boss hatótávjába belépve be kell férnie egy csapásnak ÉS a
menekülésnek is:

| lépés | idő |
|---|---|
| belépés a boss hatótávjából (`SLASH_RANGE` 138) a sajátunkéba (91 px, `MOVE_SPEED` 200) | 235 ms |
| EGY kardcsapás, teljes ATTACK-lock (`startupDelayMs` 150 + `activeDurationMs` 180) | 330 ms |
| menekülés 91 → 148 px (`SLASH_RANGE + 10`) tiszta futással / tiszta ugrással | 285 / 315 ms |

→ **880 ms a lassabb ággal**, tehát 900. A kért ritmus: *be, EGY csapás, majd elfutni VAGY
elugrani*. A 91 px a player kardjának tényleges hatótávja a boss testéhez képest
(`hitboxOffsetX 34 + hitboxWidth/2 25 + HALF_WIDTH 32`), nem becslés.

- **A windup a FRAME-KOCKÁK ISMÉTLÉSÉBŐL áll elő, nem a slot-idő emeléséből**
  (`SLASH_FRAMES = [16,16,17,17,18,18,19,19,19,20,…25]`, `ATTACK_SLOT_MS` marad 100) — így a
  csapás UTÁNI kikövetkezés tempója változatlan. Ugyanaz a fogás, mint a
  `CrowHarvesterAnimations.ATTACK_FRAMES`-nél és a `MadKingAnimations.SLASH_FRAMES`-nél, és a
  `SLASH_WINDUP_MS` SZÁMÍTOTT (`SLASH_FRAMES.indexOf(SLASH_STRIKE_FRAME) * ATTACK_SLOT_MS`).
- **VÁLLALT KORLÁT:** pontblank ölelkezésből (46 px) + 250 ms reakcióidővel a tiszta futás
  (510 ms) NEM fér bele — onnan ugrás + hátralépés kombó visz ki (280 ms). Az ezt is lefedő
  1100 ms-os windupot elvetettük: 2 s-os slash-ciklussal a boss lomhává válna.
- **Az arany telegraph** (`SLASH_TELEGRAPH_TINT = 0xffd070`, a Mad King ÉRTÉKÉVEL — a jelentés
  bosson átívelő) a windup elején kerül fel, és a CSAPÁS pillanatában tűnik el. A
  `clearTintState()` a hit-villanás után VISSZATESZI, mint a charge pirosát.
- **Ha még mindig nehéz, a hangolás sorrendje:** `ACTION_COOLDOWN_MS` (900) ↑ →
  `SLASH_DAMAGE` (18) ↓ — **a winduphoz ne nyúlj**, azt a fenti levezetés köti.
- A `boss.test.ts` **„Fairness-invariánsok"** blokkja mindezt futtatható állításként rögzíti,
  a player exportált konstansaiból számolva.

*A teljes mérés és az odavezető kézi teszt: `docs/devlog.md`, „Fairness-hangolások".*

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
  - `setTint(BACKGROUND_TINT)` = `0xb0b0b0` (69%-os sötétítés). A nyers festmény olyan
    világos és részletgazdag, hogy elnyomná a bosst és különösen a charge **piros**
    telegraph-ját. Ez az egyetlen hangolópont, ha világosabb/sötétebb kell.
  - **A talaj (`ground-placeholder`) `setVisible(false)`** — a body aktív marad, csak nem
    rajzolódik. A háttéren a padlóél alatt a rajzolt kőfal-homlokzat van, ami pont ezt a
    szerepet tölti be; a szürke téglalap kitakarná.
- **`GROUND_TOP = 369`, és ez LEVEZETETT:** a `ui/Dialogue` panelje a járható felszín ALÁ
  ül és `PANEL_RESERVE_PX` (75) px-t foglal, tehát a kényszer `GROUND_TOP + 75 ≤ 450`. Ezért
  **mind a NÉGY aréna padlóvonala 369**. A `GROUND_CENTER_Y` szintén levezetett
  (`GROUND_TOP + 16`), nem beégetett 434, és a `BOSS_SPAWN_Y` is a `GROUND_TOP`-ból jön.
- **A harc PÁRBESZÉDDEL nyit** (`WING_BREAKER_DIALOGUE`, 4 sor — a többi bossnál 6, mert ez a
  játék ELSŐ harca: itt még nincs mit felidézni). A szerkezet betű szerint a `Boss2Scene`-é:
  `create() → startDialogue() → startEntrance() → beginFight()`, a `PlayerController` CSAK a
  `beginFight()`-ban jön létre (a konstruktora regisztrálja a J/F listenereket, tehát nem
  elég az `update()`-jét kihagyni), az `update()` pedig `(_time, delta)`-t vesz, mert a
  párbeszéd a scene delta-idejéből ketyeg.
  **A párbeszéd VÉGIGJÁTSZÁSONKÉNT EGYSZER fut le** (`systems/DialogueMemory.ts`): vereség
  után a Level 1 ajtaján visszalépve egyből a cím-kártya jön.
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

#### A király csapás-windupja — LEVEZETETT, és egyben PLAFON

`SLASH_WINDUP_MS = 660`. A csapás kikerüléséhez a playernek `SLASH_RANGE + 10` = **152 px**-re
kell jutnia, pontblank helyzetből (`HALF_WIDTH` 24 + a player fél testszélessége 14 = **38 px**)
indulva. A `JUMP_VELOCITY` (−500) és a `GRAVITY_Y` (800) mellett:

| windup | csak ugrás | ugrás + hátralépés |
|---|---|---|
| 330 ms | 127 px → **ELTALÁLJA** | 160 px → kikerüli |
| **660 ms** | 160 px → kikerüli | 231 px → kikerüli |

330 ms-mal egy **sima ugrás nem volt elég** — ugrani ÉS hátrálni kellett, 330 ms alatt, amiből
~250 ms az emberi reakcióidő. **660 ms egyben a természetes PLAFON is:** a player ugrás-apexe
625 ms-nél van, azon túl egy álló ugrás már NEM növel távolságot (550 → 660 ms: 159 → 160 px).
**Ne emeld 660 fölé** — csak lomha lesz tőle, kikerülhetőbb nem.

A **`SLAM_RECOVERY_MS` (1500) szintén LEVEZETETT**, a player exportált konstansaiból (unit
teszt őrzi): `visszafutás ~300` (`SLAM_HIT_HALF_WIDTH / MOVE_SPEED`) + `két csapás 500`
(`startupDelayMs 150`, majd `cooldownMs 350`) + `menekülés ~310` = **~1110 ms** → 1500,
tartalékkal. Ez adja a kért ritmust: *2 gyors kardtámadás, majd elugrani*.

**A `madKing.test.ts` „Fairness-invariánsok" blokkja mindezt futtatható állításként rögzíti** —
ha valaki később „felgyorsítja" a királyt, nem a következő kézi végigjátszás fogja megtalálni,
hanem a CI.

**Ha még mindig nehéz, a hangolás sorrendje:** `SLAM_RECOVERY_MS` ↑ → `ACTION_COOLDOWN_MS`
(900) ↑ → `SLASH_DAMAGE` (12) ↓. **A `SLASH_WINDUP_MS`-hez ne nyúlj** (lásd a plafont).

*A teljes mérés, a régi értékek és az odavezető kézi teszt: `docs/devlog.md`,
„Fairness-hangolások".*

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
  ketyeg, nem saját timerből) — ugyanígy a `BossScene`, a `Boss3Scene` és a
  `FinalBossScene`.
- **`GROUND_TOP = 369` — a KÉPHEZ mérve, nem fordítva.** Ez a scene mérte ki elsőként a
  padlóvonalat a festményből, és a többi (Boss 3, végső, majd visszamenőleg a `BossScene`)
  ehhez igazodott. A kényszer mindegyiknél ugyanaz: `GROUND_TOP + PANEL_RESERVE_PX (75) ≤ 450`.
- **A háttér a `Mad King background.png`** (a lépcső előtt a KIRÁLYNÉ KOPORSÓJÁVAL —
  pontosan az, amiről a `KING_DIALOGUE` szól). A rajzolt dobogó-perem a 793. forrás-sor;
  a kivágás magassága ehhez igazodik (lásd a fájlfát és a `BootScene` importját).
- **A háttér TINT NÉLKÜL megy be** — mérés, nem ízlés: a kép nyers fényessége a játéktérben
  (250–369. sor) `mean 22.8`, jóval a Boss 1 TINTELT eredménye (`51.0 × 0.69 = 35.2`) alatt.
  Egy további tint elnyelné a királyt.
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
  újranézni — ezt a **`systems/DialogueMemory`** adja, ugyanaz a registry-alapú emlékezet,
  mint a másik három arénában. **REGISTRY kell hozzá, nem scene-adat:** a Boss 1/2/3
  retry-útja egy PÁLYÁN keresztül vezet, amit a scene-adat nem élne túl.
  A `scene.start()` ugyanazon a példányon fut, tehát a `create()` eleje továbbra is KÖTELEZŐEN
  üríti a tömböket és a flageket (CLAUDE.md 3. tanulság).

### PreScene (`src/scenes/PreScene.ts` + `src/levels/PreSceneLayout.ts`)

A játék nyitó jelenete. Szerkezetileg a boss-arénák rokona (fix 800×450, nincs kameragörgetés,
láthatatlan talaj-ütköző, `ui/Dialogue` a padló alatt), de HARC nincs benne — és ebből
következik minden eltérése.

> **A geometria és a párbeszéd NEM a scene-ben él**, hanem a Phaser-mentes
> `PreSceneLayout.ts`-ben. Konkrét oka van: a `tests/unit/helpers/fakePhaser.ts` **nem ad
> `Scene` osztályt**, tehát a `PreScene.ts` unit tesztből NEM importálható. A layout-modul
> viszont igen — ezért van ott a `GODDESS_DIALOGUE` is, szemben a boss-párbeszédekkel, amik a
> saját scene-jükben laknak.

**NÉGY fázis** (`PreScenePhase`), és az input meg a promptok EBBŐL következnek, nem külön
flagekből: `FALLING → EXPLORE → DIALOGUE → READY`.

- **A zuhanás.** A player `FALL_START_Y = -40`-ről esik be, ~385 px-t, `GRAVITY_Y` (800)
  mellett ~0,98 s alatt. Előtte `FALL_DELAY_MS` (500) a néma szentélyen — enélkül a nyitókép
  elveszne a becsapódás alatt. A `player-fall` animáció `repeat: -1`, tehát a hosszú esés
  magától loopol; **új asset nem kellett**, a knight `Jump.png`-jének `f4–5` szakasza ez.
- **A FIZIKAI világ FELFELÉ nyúlik** (`FALL_BOUNDS_MARGIN = 120`), a kameráé nem — a
  `Level1Scene` zuhanás-halálának a TÜKÖRKÉPE. **KÖTELEZŐ:** a `Player` konstruktora
  `setCollideWorldBounds(true)`-t hív, tehát enélkül a negatív Y-ú playert a Phaser azonnal a
  világ tetejére szorítaná, és nem lenne zuhanás.
- **Landoláskor** kamerarezgés + `SFX_KEYS.PLAYER_LAND` (lásd az Audio szakaszt).
- **A `player.updateState()`-et ITT A SCENE hívja.** A projekt többi jelenetében a
  `PlayerController.update()` intézi; controller nélkül az animáció megfagyna a sheet első
  frame-jén, és a zuhanó póz soha nem indulna el.

**AZ INPUT SZÁNDÉKOSAN NEM `PlayerController` — ez a scene legfontosabb döntése.**
A `PreScene` saját, minimális bemenetet használ (balra/jobbra + ugrás), a `Player` meglévő
`moveLeft()`/`moveRight()`/`stopMoving()`/`jump()`/`updateState()` metódusaira.
- A `PlayerController` KONSTRUKTORA regisztrálja a J/F billentyű- és pointer-listenereket, és
  **nincs `destroy()`-a** (17. tanulság) — tehát a `Boss2Scene` trükkje („csak a harc előtt
  hozzuk létre") itt NEM alkalmazható, mert a player a párbeszéd ELŐTT már sétál.
- Enélkül a player A LÁNGŐRZŐ monológja alatt kardot suhinthatna rá.
- Egy szentélyben amúgy sincs mit ütni és mit égetni: a séta MAGA a helyes eszköztár.
- **Így a `PlayerController.ts`-hez egyáltalán nem kellett hozzányúlni** — a hatókör nulla.

**A `JustDown` MINDEN frame-ben le van kérdezve, a fázistól FÜGGETLENÜL** — és ez hibajavítás,
nem stílus. A `JustDown` egy EGYSZER kiolvasható él: ha a `DIALOGUE` fázisban nem kérdeznénk
le, egy türelmetlenül `E`-t nyomkodó player leütése „felgyűlne", és a párbeszéd végén az első
`updatePrompt()` AZONNAL elindítaná a Level 1-et — anélkül, hogy az `E: Indulás` prompt
egyáltalán megjelent volna.

**Mért geometria** (mind a `PreSceneLayout.ts`-ben, unit teszttel őrizve):
- **`GROUND_TOP = 369`** — a rajzolt mozaikpadló lapja a 345..397. sor (a 398.-ban −21,06 a
  fényesség-zuhanás: ott a lap első pereme). Egyben a `Dialogue` kényszere is:
  `369 + PANEL_RESERVE_PX (75) = 444 ≤ 450`, mint mind a négy boss-arénában.
- **`FLOOR_SPAN = 120..690`** — a lap MÉRT vízszintes kiterjedése; a player becsapódási pontja
  (200) és A LÁNGŐRZŐ (650) is ezen belül van.
- **Az interakciós zóna (110 px) a becsapódási ponttól TÁVOL van.** Unit teszt őrzi: enélkül a
  prompt már a landolás pillanatában felvillanna, és a szakasz elveszítené a „sétálj oda
  hozzá" lépését (a Level 3 azonos elve a start-pont körüli ellenfelekre).

**Háttér:** `assets/backgrounds/shrine/pre-scene.png`, **tint NÉLKÜL**, és ez MÉRÉS: a
játéktér (250..369. sor) nyers fényessége **mean 23,2** — sötétebb, mint a szintén tintelten
mellőzött `boss2-arena` (26,2) és `final-arena` (27,3), és jóval a tintelt Boss 1 eredménye
(54,1 × 0,69 = 37,3) alatt. Egy további sötétítés elnyelné a két szereplőt.

**A LÁNGŐRZŐ (`src/npc/GoddessAnimations.ts`)** — 832×64 = **13 db 64×64-es frame**.
- **A csík KÉT animációt tartalmaz, nem egyet** — és ezt MÉRÉS mutatta meg, nem a fájlnév.
  Az elsőnek hitt „mind a 13 frame egyedi, tehát egyetlen loop" következtetés HIBÁS volt:
  a teljes csíkot loopolva az álló NPC láthatóan **helyben járt** (kézi teszt, 2026-09-02).
  A láb-sávot (`y 50..63`) az f0-hoz hasonlítva a különbség élesen kettéválik:
  **f1–f4: 8/10/23/15** eltérő pixel (csak a láng lobog) · **f5–f12: 143–196** (a szoknya
  kileng, a lábak lépnek). Ezért `IDLE_FRAMES = f0..4`, és a `WALK_FRAMES = f5..12`
  dokumentálva, de **használaton kívül** — a szereplő áll (a knight nem használt
  sheetjeinek elve).
- **Az `IDLE_SLOT_MS` (100) az EGYETLEN hangolópont**, a loop hossza belőle SZÁMÍTÓDIK —
  ezért a frame-tartomány szűkítése (13 → 5) magától rövidítette a ciklust 1300 → 500 ms-ra,
  nem kellett újrahangolni. Unit teszt őrzi, hogy a járás-frame-ek nem kerülnek az idle-be.
- A rajzolt alak **29×46**, gyakorlatilag a lovag mérete (28×46) → **`SCALE = 1`**.
- **Natívan BALRA néz**, és a jobb oldalon áll → pont a beeső player felé fordul, `flipX`
  nélkül.
- Talp a frame y=63-án → `ORIGIN_Y = 0.5` mellett **`FEET_OFFSET_Y = 31`**; ebből jön a
  magassága (`GROUND_TOP − FEET_OFFSET_Y`), a `KING_SPAWN_Y` levezetésének mintájára.
- **Nincs `SpriteFacing`**: a testközép MÉRVE 30,5..31, a frame közepe 32 — 1..1,5 px eltérés,
  nagyságrenddel kevesebb, mint amiért a kompenzáció született (CrowHarvester 18 px, démon
  7 forrás-px). Az NPC amúgy sem fordul meg soha.
- **A helye (`NPC_X = 560`) MÉRT, nem szemre rakott.** A háttéren a padlón álló
  gyertya-csoport az `x 628..690` sávban van: ott a talp körüli (355..375. sor)
  fényesség-csúcs **248,7**, tehát az ott álló szereplő láthatóan A GYERTYÁKON állna — kézi
  teszten pontosan ez jött elő az eredeti 650-nel. Az 560 a környék legtisztább oszlopa
  (talp-sáv 54,7, test-sáv 63,3); az 580..610 azért esett ki, mert ott a HÁTTÉR
  gyertya-csoportja (csúcs 158) esik a felsőteste mögé.
- **Nincs physics bodyja**: tiszta látvány, mint a `LevelDecor` propjai.
- **A licence RENDBEN VAN, és a repóban is** (`assets/sprites/goddess/license.txt`) — **NEM
  nyitott jogi tétel.** Lásd lentebb.

**Zene:** `MUSIC_KEYS.PRESCENE_THEME` (`Elkmire Keep (LOOP)`), a Level 1 sávjával AZONOS
csomagból. **Ez a jelenet oldja fel az audio contextet** (itt kell először `E`-t nyomni),
tehát a böngésző autoplay-zárja mostantól ide esik, nem a Level 1-re.

### CreditsScene (`src/scenes/CreditsScene.ts`)

Thanks for playing + lassan felfelé görgő szerzői lista (karakterek / környezet / zene /
hangok). `Space` a végére ugrik, ott pedig **új játékot indít**.

- **Az új játék TÖRLI a registry-t** (`bossDefeated`, `kingDefeated`, `beastMasterDefeated`,
  `demonDefeated`, `checkpoint`, `level2Checkpoint`, `level3Checkpoint` és a
  `DIALOGUE_SEEN_REGISTRY_KEY`). A registry GAME-szintű, tehát enélkül az új játék a
  Level 1 ajtajánál azonnal a Level 2-re vinne, a player a pálya végén éledne, és **egyetlen
  boss-párbeszéd sem futna le** (mind „már láttam"-ra futna). Az utolsó kulcs IMPORTTAL jön a
  `systems/DialogueMemory`-ból, nem beírt sztringként.
- **Az új játék a `PreScene`-ről indul, NEM a Level 1-ről** — különben a második
  végigjátszásból némán kimaradna a nyitány.
- **A `CREDITS` tömb a projekt MÉRVADÓ attribúciós listája** — négy szakaszban (CHARACTERS ·
  ENVIRONMENT · MUSIC · SOUND), forrásonként szerzővel és csomagnévvel. Ha új asset kerül a
  játékba, ITT kell felvenni. A `docs/devlog.md` „Licenc-átnézés és lezárás" szakasza őrzi,
  hogy melyik csomagnál mi volt a tisztázandó kérdés.
  *(A `CreditsScene.ts` doc-kommentje még „placeholder"-ként hivatkozik a tömbre — ez a
  komment elavult, a tartalom kész.)*

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
  | `SWORD_SWING` | `sword-attack-2` | a player `performAttack()`-jában, AZONNAL a gombnyomásra (CSAK az alapcsapásé — a heavy a `SPELL_IMPACT`-ot kapja) |
  | `SWORD_IMPACT` | `sword-impact-hit-1` | a scene-ek kard-találat kezelőiben (enemy ÉS boss) |
  | `ENEMY_SWING` | `sword-attack-3` | CrowHarvester + boss közelharc, a CSAPÁS pillanatában |
  | `FIREBALL_CAST` | `fireball-2` | a player `'fireball-cast'`-jánál, a lövedék születésekor |
  | `BOSS_PROJECTILE` | `fireball-3` | a `'boss-projectile'`-nél; más hang, mint a playeré |
  | `SPELL_IMPACT` | `firebuff-2` | NÉGY helyen: a Wing-Breaker Shadow Spelljének becsapódásakor (`SPELL_IMPACT_MS`), a démon ÁRNY-HULLÁMÁNÁL + IDÉZÉSÉNÉL, és a **player HEAVY SLASH-énél** (`HEAVY_SLASH_DETUNE = -200` centtel mélyítve) |
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
- **KILENC sáv van** (`MUSIC_KEYS`), és mind a kilenc zenét játszó scene-nek saját kulcsa van:
  `MENU_THEME` (a `MainMenuScene` teljes hosszán), `PRESCENE_THEME`, `LEVEL1..3_THEME`,
  `BOSS_THEME` (a `BossScene` belépőjétől), `BOSS2_THEME` és `BOSS3_THEME`, valamint
  `FINAL_BOSS_THEME` (a `FinalBossScene` belépőjétől — a PÁRBESZÉD UTÁN). Egyszerre sosem szól
  kettő: a
  `playMusic()` hard-stoppolja az előzőt, mindkét pálya már az ajtó-fade alatt felszabadítja a
  sávját, és a Phaser a régi scene SHUTDOWN-ját a következő scene `create()`-je ELŐTT futtatja
- **A KÉT pálya-sáv fade-inje SZÁNDÉKOSAN eltér**, és ez nem ízlés, hanem a két belépés
  különbsége (unit teszt őrzi a sorrendet):
  - `LEVEL_MUSIC_FADE_IN_MS` (2000) — az „ambient" belépő. *Az eredeti indoklása („a Level 1
    közvetlenül az oldalbetöltés után indul") a PreScene, majd a FŐMENÜ beszúrásával elavult;
    a hosszabb fade ettől még helyes, és MOST A MENÜ kapja ugyanezt az értéket, ahol az
    indoklás szó szerint igaz;*
  - `LEVEL2_MUSIC_FADE_IN_MS` (4000) — a Level 2-be a `NarrationScene` felől érkezünk, MÁR
    FELOLDOTT contexttel, tehát a zene tényleg a `create()` pillanatában indul. Itt a
    fade-in az EGYETLEN dolog, ami tompítja a belépést (user-kérés: „ne ilyen intenzíven
    üssön be a zene a kezdéskor")
- **AUTOPLAY: a `sound.locked` ág a FŐMENÜNÉL a FŐ út, nem élhelyzet.** A `MainMenuScene` az
  első scene a Boot után, bármilyen user-interakció előtt — ott az audio context GARANTÁLTAN
  zárolt, tehát a `playMusic()` az `UNLOCKED` eseményre halasztja a lejátszást, és a zene **az
  első billentyűlenyomásnál/kattintásnál** kezd szólni. Ez helyes böngésző-viselkedés, nem
  megkerülhető, és **nem hiba** — ezért kapja a menü-sáv is a hosszabb (2000ms) fade-int, hogy
  ne robbanjon be hirtelen az első leütésre.
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
17. **(RÉSZBEN LEZÁRVA — 2026-09-02: a `PlayerController` kapott `setEnabled()`-et, ami a
    J/F/pointer listenereket is elnémítja, tehát a „párbeszéd alatt is támadhat" ág megszűnt.
    A `destroy()`/leiratkozás továbbra sincs, az alábbi duplikáció-kockázat tehát áll.)**
    A `PlayerController`-nek nincs `destroy()`/leiratkozás metódusa — ha a `Level1Scene` scene-restart miatt újra lefut a `create()`, egy ÚJ `PlayerController` jön létre, ami újra regisztrálja a J/F billentyű- és pointerdown-listenereket. Mivel ezek a handlerek (`attack()`, `castFireball()`) saját maguk cooldown-gate-eltek, a duplikált hívás gyakorlatilag no-op-ra fut (nincs látható hiba), de tisztább lenne egy `destroy()` a régi controlleren scene-leállításkor. Nem blokkoló, de ha valaha furcsa dupla-támadás tünetet észlelsz, ez az első gyanús hely.
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
29. **`setOrigin(0.5)` + `setScrollFactor(0)` + `pixelArt` = REMEGŐ felirat, ha a kamera
    mozog.** A `TutorialHint` harc-súgója kézi teszten láthatóan vibrált, majd „stabilizálódott,
    mielőtt eltűnt volna" — és a kettő között pont az a különbség, hogy a player fut-e még.
    A lánc: a `setScrollFactor(0)` objektum végső pozíciója a
    `TransformMatrix.copyWithScrollFactorFrom()`-ban `scrollX * (1 - scrollFactorX)`
    hozzáadásával, majd a kamera saját eltolásának levonásával áll elő. A `camera.scrollX`
    viszont NINCS kerekítve (a `Camera.preRender()` a nyers, lerpelt lebegőpontos értéket
    írja vissza), tehát a két tag kiejtése lebegőpontos maradékot hagy. A `pixelArt: true`
    bekapcsolja a `roundPixels`-t, ami a VÉGEREDMÉNYT kerekíti — és ha az pontosan fél
    pixelre esik, a maradék frame-enként átbillenti a kerekítést: 1 px-es vízszintes
    remegés. Álló kameránál a maradék frame-enként azonos, tehát a felirat megnyugszik.
    **`origin 0.5` mellett a pozíció `X - displayWidth / 2`, tehát PÁRATLAN
    szövegszélességnél MINDIG fél pixelre esik** — pontosan ezért jött elő, amikor a
    harc-súgó két sorosra bővült (más lett a leghosszabb sor hossza).
    **A javítás nem a kerekítés kikapcsolása, hanem egész origin + kézzel kerekített
    pozíció** (`TutorialHint.centerText()`): a látvány változatlan, a fél pixel viszont
    fogalmilag megszűnik. Unit teszt őrzi.
    **Ez minden `setOrigin(0.5)`-ös, kamerához rögzített feliratra igaz** — az ajtó- és
    checkpoint-promptok csak azért nem remegnek láthatóan, mert álló kamera mellett jelennek
    meg. Ha valamelyik valaha mozgás közben jön elő, ugyanez a javítás kell.

## Placeholder és debug elemek a kódban

Mi az, ami MÉG nem végleges. (A teendő-oldala a „Hátralévő munka" szakaszban van.)

### Kódból generált placeholder textúrák

Mind a `BootScene.createPlaceholderTextures()`-ben, `Graphics.generateTexture()`-rel.

- **A hazardok:** a tüskék, a Swinging Reaper (horgony + penge) és a köztes checkpoint
  jelölője.
- **A három lövedék:** player **narancs**, boss **lila**
  (`boss-projectile-placeholder`), Gravecaller **mérgeszöld** (`gravecaller-projectile-placeholder`,
  világos maggal). A három szín gameplay-információ: három lövedék-forrás van a pályán.
  *(A Wing-Breaker `Cast` animációjának végén **varjak röppennek fel** a kaszáról — egy
  varjú-lövedék tökéletesen illene a témához. A Necromancer csomagban VAN cast-effekt sheet,
  de a mérés szerint az egy szétfoszló BECSAPÓDÁS — 30→4 px —, nem loopolható repülő bolt.)*
- **`door-interior-placeholder`** — függőleges átmenet, ami kitakarja az égboltot a Level 1
  boltívének nyílásában.
- **A Level 2 létrája és boss-ajtaja** (`ladder-placeholder`, `door-placeholder`): a
  GothicVania Town csomagban nincs létra, a cathedral `door-gate` geometriája
  (`DOOR_APERTURE`, `DOOR_THRESHOLD_PX`) pedig ahhoz a konkrét PNG-hez van mérve.
- **`ground-placeholder` / `platform-placeholder`** — ezek MEGMARADNAK, de a pályákon már
  **láthatatlan fizikai testként** (a látványt tileSprite adja). A `ground-placeholder`-t a
  `BossScene` is használja.

Minden más valódi pixel art: mind a hét karakter, mind a hat háttér és mind a három pálya
teljes terrainje.

### Debug-stílusú UI

- **A bal felső HUD-sor** (`ui/CombatHud.ts`) a HP mellett a **player state-et is kiírja**
  (`HP: 100/100 | CLIMB`) — a mászás manuális tesztelését segíti. A szöveges sor cseréje
  valódi, ikonos kijelzőre hátravan.
- **A CrowHarvester felett lebegő HP szöveg.**
- **A boss HP-barja** nyers `Graphics`-szal rajzolt téglalap (`draw*HealthBar()`), mind a négy
  arénában külön — ez a `ui/` modul következő természetes lépése, a `CombatHud` mintájára.
- **A checkpoint-prompt szöveg** („E: Checkpoint" / „Checkpoint mentve…") nyers `add.text`.
- **A `BootScene` „Betöltés…" szövege + progress-sávja** nyers `add.text` / `Graphics`.

### Fejlesztői kapcsolók — COMMIT ELŐTT ELLENŐRIZD

- **`BootScene.START_SCENE`** normál értéke **`'MainMenuScene'`**. Fejlesztéshez bármelyik
  scene-kulcsra átírható (`'Level1Scene'`, `'Level2Scene'`, `'Boss2Scene'`, `'FinalBossScene'`,
  …), hogy az adott szakasz a lánc végigjátszása nélkül tesztelhető legyen — **de commit
  előtt mindig vissza `'MainMenuScene'`-re.** *(Ez a sor azért van itt, mert egyszer már
  `'BossScene'`-en committolódott: a játék a Boss 1 arénában indult.)*
- **`main.ts` `arcade.debug`** — jelenleg **`false`**. `true`-ra állítva kirajzolja a physics
  bodykat és a létra zónáját; a layout hangolásához hasznos, a látvány megítéléséhez zavaró.

### Placeholder SZÖVEG

**Tizenkét lore-szöveg** vár cserére a Phase 9-ben — a teljes lista a „Hátralévő munka"
szakaszban. A `CreditsScene` `CREDITS` listája NEM tartozik ide: az attribúció, és kész.

### Ami SZÁNDÉKOSAN néz ki placeholdernek, de nem az

- **A bossok találat-visszajelzése** csak fehér sziluett-villanás (`TintModes.FILL`), hurt
  animáció nélkül: egy bossnál a minden ütésre bekövetkező flinch megszakítaná a
  telegraph-okat. **Design-döntés** — a `Hurt` frame-ek a falnak ütköző charge/kitörés
  staggerjében szerepelnek.
- **A Level 3 LAPOS háttere**, parallax nélkül — mérés indokolja, lásd a 28. technikai
  tanulságot.
- **A démon villanásának némasága** — nincs hozzá illő hang a csomagokban.

## Hátralévő munka

A `Project_plan.md` 21. pontjának roadmapjéből lezárva: Step 1, Phase 2–8, Phase 10 és
Phase 11. Ami nyitva van:

### Phase 8 maradéka (opcionális)

- **SFX a Level 2-re és a Level 3-ra.** A harci hangkép kész (kard, tűzgolyók, varázslatok,
  enemy közelharc, léptek, ugrás, halálok); hiányzik: a **tűzgolyók becsapódása**, az
  **enemy→player sebzés** (hurt), a **charge**, a **landolás** a pályákon és a **checkpoint**.
  Mindegyik ugyanaz a három lépés: asset + `SFX_KEYS` bejegyzés + egy `playSfx()` hívás (a
  nem-scene helyeken egy event, a bevett minta szerint). A TomMusic csomagban van hozzájuk
  `Spell Impact`, `Doors Gates and Chests` (checkpoint) és `Torch` is.
- **A maradék kódból generált placeholder textúrák** cseréje valódi pixel artra
  (`assets/effects/`): a **hazardok** (tüske, Swinging Reaper, checkpoint-jelölő) és a
  **három lövedék** (player narancs / boss lila / Gravecaller zöld).
- **A Level 2 létrája és boss-ajtaja** még `ladder-placeholder` / `door-placeholder`: a
  GothicVania Town csomagban nincs létra, a cathedral `door-gate` geometriája
  (`DOOR_APERTURE`, `DOOR_THRESHOLD_PX`) pedig ahhoz a konkrét PNG-hez van mérve. Olcsó
  részleges javítás a Level 1 `tile-ladder`-ének újrahasználata (már be van töltve).
- **`ui/` modul:** a player HUD-ja kész (`ui/CombatHud.ts`). Hátravan a **boss HP-bar**
  átköltöztetése a négy aréna `draw*HealthBar()`-jából, a HP-**sor** cseréje valódi, ikonos
  kijelzőre, és a `BootScene` betöltésjelzője.
- **Megmaradt `TODO (Phase 8)` kommentek a kódban:** fázisváltás sting és victory sting
  (`BossScene`), narration ambient (`NarrationScene`), a démon villanásának hangja
  (`FinalBossScene` — szándékosan néma, nincs hozzá illő hang a csomagokban).
- **Zene:** mind a kilenc sáv megvan (menü, nyitó szentély, 3 pálya, 4 aréna). Már csak a
  `NarrationScene` és a `CreditsScene` néma.

### Phase 11 – Deployment — **KÉSZ (2026-09-12)**

*Ez a szakasz már nem teendő, hanem állapot — a teljesség kedvéért marad itt.*

- **itch.io** (elsődleges): `https://bioengineerlabs.itch.io/the-wingless-crow` — **kézi**
  feltöltés, nincs rá automatizmus.
- **GitHub Pages**: `https://csokanandor95.github.io/the-wingless-crow/` — a
  `.github/workflows/ci.yml` **`deploy-pages`** jobja, `needs: [verify, e2e]`, CSAK `main`
  pushra. A részletek a „CI" szakaszban.

**Előkészítés nem kellett:** a `vite.config.ts` `base: './'`-je és a `npm run check:build`
az itch.io alútvonala miatt született (Phase 10), a Pages project-page
(`/the-wingless-crow/`) pedig ugyanaz a hibaosztály — a kapu ingyen fedezte a második
deploy-célt is. A történet: `docs/devlog.md`, „Phase 11 – Deployment".

---

## Nyitott hangolási és polish-tételek

Egyik sem blokkoló. **Ha hozzányúlsz, a levezetéseket tartsd tiszteletben** — több szám nem
szabadon hangolható, hanem unit teszt-invariáns őrzi.

### Level 1 – nehézség-megfigyelések (a finomhangolási kör nyitva van)

- **HP-mérleg a pálya hosszán.** Egy végigfutásban a player ~50–70 HP-val ér az F szakaszhoz.
  A pályán **nincs gyógyulás**, és a boss friss HP-t sem ad — a `BossScene`-be tehát erősen
  sérülten lehet belépni. Hangolható: `CrowHarvester.ATTACK_DAMAGE` (8), `SPIKE_DAMAGE` (15),
  `REAPER_DAMAGE` (20), az `ENEMY_SPAWNS` sűrűsége, vagy egy checkpoint-gyógyulás bevezetése.
- **A Swinging Reaper büntetése.** Az `F1` platformon megállni garantált találat, és
  áthaladásonként 20 sebzés. Elsődleges knob a `periodMs` (2400 — lassabb lengés = szélesebb
  ablak), utána a `REAPER_DAMAGE`.
- **A Gravecaller nehézsége az E és az F szakaszban.** Knobok: `PROJECTILE_DAMAGE` (10) és
  `REPOSITION_MS` (1200). Ha a boss-arénába túl sérülten érkezik a player, az `F-caster` a
  legkönnyebben visszavehető elem (törölhető, vagy a `patrolMaxX` jobbra tolásával kivihető a
  `DETECTION_RANGE`-ből — utóbbit a layout-teszt azonnal jelzi).
- **A köztes checkpoint helye** (x=3000, a spike-szakasz után): a G4/E és az F szakasz így
  egyetlen, hosszú, checkpoint nélküli blokk.
- **ISMERT, ELFOGADOTT SZÉTCSÚSZÁS:** a mozgás-súgó „Space / W — ugrás" fele ~x=800-ig
  látszik, az első KÉNYSZERŰ ugrás viszont csak a `gap1`-nél (x=1660). A felirat nem hibás,
  de a lecke és a gyakorlat nem esik egybe. Javítás, ha zavaró: a `HINT_HOLD_MS` emelése vagy
  egy külön, `triggerX: 1600`-as „ugorj" súgó.
- **`main.ts` `arcade.debug`** — jelenleg `false`. `true`-ra állítva kirajzolja a physics
  bodykat és a létra zónáját; a layout hangolásához hasznos, a látvány megítéléséhez zavaró.

### Boss-balansz

- **Wing-Breaker (Boss 1):** a `SLASH_RANGE` (138) hatótáv-fölényt ad a player kardjához
  (+59) képest. Ezt nem elvettük, hanem IDŐT adtunk mellé: `SLASH_WINDUP_MS` **900**, arany
  telegraph-fal. **A winduphoz ne nyúlj** — levezetés köti (a teljes mérés: `docs/devlog.md`,
  „Fairness-hangolások"). A hangolás sorrendje, ha még mindig nehéz: `ACTION_COOLDOWN_MS`
  (900) ↑ → `SLASH_DAMAGE` (18) ↓. A többi szám (HP 240, a másik két sebzés) továbbra is az
  első, hangolatlan érték.
- **Mad King (Boss 2):** ugyanez a szerkezet. `SLASH_WINDUP_MS` **660** — ez egyben a
  természetes PLAFON is (a player ugrás-apexe 625 ms-nél van, azon túl egy álló ugrás már NEM
  növel távolságot). **Ne emeld 660 fölé.** A hangolás sorrendje: `SLAM_RECOVERY_MS` (1500) ↑
  → `ACTION_COOLDOWN_MS` (900) ↑ → `SLASH_DAMAGE` (12) ↓.
- **A charge sebzése a Wing-Breaker TESTÉHEZ kötött** (`CHARGE_HIT_RANGE = 54` sugár),
  miközben a dash pózban a kasza ~60 világ-pixellel a test előtt jár. 420 px/s mellett ez
  ~143 ms eltérés, gyakorlatilag észrevehetetlen — de ha kézi teszten „átmegy rajtam és nem
  sebez" érzést kelt, egy irányfüggő (előre néző) találat-ellenőrzés a javítás.
- **A Shadow Spell egyetlen nehézség-knobja** a `SPELL_TELEGRAPH_LOOPS` (4 = 960 ms kitérési
  ablak) a `GraftedWingBreakerAnimations.ts`-ben.
- **A heavy slash hatótáv-következménye** a bossokkal szemben: player-elérés 110 + a boss
  félszélessége. Wing-Breaker → 142 vs. 138 (4 px), Mad King → 134 vs. 142 (a király továbbra
  is kijjebbről üt), Ancient Demon → 126 vs. 90 (valódi stand-off, de a `NOVA_HIT_RANGE` pont
  90). Ha kézi teszten soknak bizonyul, a knob a `HEAVY.hitboxOffsetX`.

### Egyéb

- **A Gravecaller `VERTICAL_DETECTION_RANGE`-e (80) tágabb, mint a lövedék tényleges találati
  sávja (~±26)**, ezért az `E3` platformon állva az `E2` casterje tüzel, de a bolt a player
  lába alatt megy el. User-döntés, hogy egyelőre marad. **Ha valaha javítjuk, a levezetés
  készen van** — a kaput nem hangolni kell, hanem származtatni:
  ```
  kapu = PROJECTILE_SIZE/2 (8) + PLAYER_BODY_HEIGHT/2 (23)
       − minimum átfedés (6) − a két lény középpont-magasságának eltérése (5)   = 20
  ```
  (a „középpont-eltérés" = `PLAYER_HALF_HEIGHT` 24 − a Gravecaller `FEET_OFFSET_Y`-ja 19).
  Mellékhatás, amivel számolni kell: 20-as kapunál a caster UGRÁS közben nem indít castot,
  tehát a lövedékeit át lehet ugrani — mint a bossét.
- A knight csomagban van még **landolás** (`Jump.png` `f6–7`), és több nem használt sheet
  (Roll, Slide, crouch, Hanging, Pray, attack_from_air) az eredeti forrásmappában. Ezekhez
  nincs state a játékban, és a `Project_plan.md` sem tervez ilyet — csak akkor kerüljenek be,
  ha külön döntés születik róluk (a `Pray` pl. jó checkpoint-animáció lenne).
- A `2D helper/Sprites/` alatt van még Enemy01/02/03/05 és egy „Gino Character". Ha bármelyik
  enemy-jelöltként bejön, számíts rá, hogy szintén off-center lesz — a `systems/SpriteFacing.ts`
  már készen áll rá (lásd a 16. technikai tanulságot).
- A GothicVania Town csomagból kihasználatlan maradt: a `stairs*` lépcső-készlet (a projektben
  nincs átlós járható elem), a `window`/`roof`/`wall` házépítő csempék, és a
  `Music/rpg_village02_loop` sáv.
