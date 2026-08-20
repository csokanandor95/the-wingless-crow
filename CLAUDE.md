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
cd the-wingless-crow
npm run dev      # dev szerver, http://localhost:5173
npm run build    # production build (Phase 7-ben lefutott, működik)
npm run test     # vitest unit tesztek (egyszeri futás)
npx tsc --noEmit # típusellenőrzés (nincs külön npm script)
```

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

**Phase 6 (Level) KÉSZ:** level layout, platforms, environment, checkpoint, transition mind megvan. A pálya végi ajtónál (`door-placeholder`, P9 platform) **E** billentyűvel aktiválható a checkpoint, ami egyben fade-out után átvált a `BossScene`-re.

**Phase 7 (Boss) KÉSZ:** valódi boss (`bosses/GraftedWingBreaker.ts` — *The Grafted
Wing-Breaker*, a Project_plan.md 12. pontja szerinti névvel), fix 800×450-es boss aréna,
boss entrance, HP-bar, két fázis, boss victory. A győzelem után egy adatvezérelt szöveges
átvezető (`NarrationScene`) következik, onnan a (placeholder) `Level2Scene`.
**A teljes lánc végigjátszható:** `Level1 → ajtó (E) → BossScene → NarrationScene → Level2Scene`.

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

A Phase 8 többi része (boss/environment sprite-ok, SFX, particles, level ambient,
`ui/` modul) még hátravan.

**Phase 10 (QA) elindult:** unit teszt infra (`vitest`, `npm run test`, zero-config — nincs `vitest.config.ts`), a Player + Combat + Enemy (CrowHarvester) + **Boss** le van fedve a Project_plan.md §23 bontása szerint (7 fájl, 114 teszt — ebből 2 az animáció-vezérlést fedi). Game state / Utility logic unit tesztek még hátravannak. A `Player.ts`, `CrowHarvester.ts` és `GraftedWingBreaker.ts` tuning-konstansai exportáltak, hogy a tesztek ne nyers számokat égessenek be (`Player`: `MOVE_SPEED, JUMP_VELOCITY, MAX_HP, CLIMB_SPEED, CAST_DELAY_MS`; `CrowHarvester`: `MAX_HP, PATROL_SPEED, CHASE_SPEED, PATROL_RANGE, DETECTION_RANGE, LOSE_RANGE, ATTACK_RANGE, ATTACK_DAMAGE, ATTACK_STARTUP_MS, ATTACK_COOLDOWN_MS, VERTICAL_DETECTION_RANGE, DIRECTION_DEADZONE`; `GraftedWingBreaker`: `MAX_HP, PHASE2_HP_RATIO, MOVE_SPEED_P1/P2, SLASH_*, PROJECTILE_*, CHARGE_*, ACTION_COOLDOWN_MS, DIRECTION_DEADZONE`), és mindháromnak van `getHP()`/`getMaxHP()`-ja.
- A `'phaser'` modult minden teszt fájl egy teljesen önálló fake névtérre cseréli (`tests/unit/helpers/fakePhaser.ts` `createFakePhaserModule()`) — a valódi Phaser csomag már betöltéskor `window is not defined`-del elszáll Node alatt.
- **`vi.mock()` hoisting csapda**: a vitest a `vi.mock()` hívást a fájl IMPORT sorai fölé mozgatja, ezért a factory nem hivatkozhat statikusan importált binding-ra (TDZ hiba). Emiatt a `createFakePhaserModule` megosztása **dinamikus** `import()`-tal történik a factory testén belül: `vi.mock('phaser', async () => { const { createFakePhaserModule } = await import('./helpers/fakePhaser'); return createFakePhaserModule(); });` — ezt minden teszt fájl elején meg kell ismételni (globális `setupFiles`-es próbálkozás NEM működött, ugyanezen hoisting-ok miatt).
- A `CrowHarvester`/`Player`/`GraftedWingBreaker` `scene.time.delayedCall`-jai **interleave-elhetnek** (pl. `CrowHarvester.resolveAttackHit()` a `Player.takeDamage()`-en keresztül saját delayedCallt ütemez ugyanazon a mock scene-en) — ezért a `createDelayedCallStepper` helper (`tests/unit/helpers/phaserTestUtils.ts`) `.next()` (egy lépés) ÉS `.flushRemaining()` (a kurzortól a végéig, újra-tüzelés nélkül) metódust is ad. A `createDelayedCallStepper(scene, true)` (`skipExisting`) a kurzort a MÁR ütemezett hívások mögé állítja — ez kell, ha a teszt előkészítése maga is ütemez callbackeket (pl. a bosst Phase 2-be sebezzük, ami hit-villanást ütemez).

## Fájlstruktúra (jelenlegi, tényleges állapot)

```
the-wingless-crow/
├── package.json
├── index.html
├── tsconfig.json                 # megj.: vite.config.js NINCS, a projekt Vite defaultokon fut
├── docs/
│   └── Project_plan.md
├── assets/
│   ├── audio/
│   │   └── boss-theme.mp3        # Vite-importtal jön be (nem public/), lásd lentebb
│   └── sprites/
│       ├── knight/               # player sprite sheetek, mind 128x64-es blokkokra vágva
│       │   ├── Idle.png Run.png Jump.png Attacks.png
│       │   ├── Hurt.png Death.png Climb.png Health.png
│       │   └── license.txt       # 2D_SL_Knight_v1.0 licenc, a repo dokumentálja a jogi státuszt
│       └── crow-harvester/       # Enemy 1 sprite
│           └── enemy04_sheet.png # 1792x64 = 28 db 64x64-es frame. NINCS mellette licenc (lásd lentebb)
├── tests/
│   └── unit/
│       ├── player.test.ts       # Project_plan.md §23 Player scope
│       ├── combat.test.ts       # §23 Combat scope (ATTACK_CONFIGS, Player attack, Fireball + ProjectileOptions)
│       ├── crowHarvester.test.ts # §23 Enemy scope (CrowHarvester HP/damage/death/state transitions)
│       ├── boss.test.ts         # §23 Boss scope (HP, phase transition, attack state, death)
│       ├── audio.test.ts        # §23 Utility logic (AudioManager életciklus, fade, shutdown)
│       ├── playerAnimations.test.ts       # state->anim leképezés + a Player animáció-vezérlése
│       ├── crowHarvesterAnimations.test.ts # state->anim + a facing-kompenzáció regressziós tesztje
│       └── helpers/
│           ├── fakePhaser.ts        # a 'phaser' modul önálló fake névtere (createFakePhaserModule)
│           └── phaserTestUtils.ts   # megosztott mock scene/body/delayedCall-stepper helperek
├── src/
│   ├── main.ts
│   ├── vite-env.d.ts             # /// <reference types="vite/client" /> — az *.mp3 import típusa
│   ├── scenes/
│   │   ├── BootScene.ts          # placeholder textúrák + audio betöltés + loading kijelzés
│   │   ├── Level1Scene.ts        # 3200px pálya, PLATFORMS adattömb, létra, 5 CrowHarvester, checkpoint-ajtó
│   │   ├── BossScene.ts          # 800x450 fix aréna, boss entrance, HP-bar, victory/defeat ágak
│   │   ├── NarrationScene.ts     # adatvezérelt szöveges átvezető (typewriter), újrahasználható
│   │   └── Level2Scene.ts        # placeholder — a Level 2 tervezése még hátravan
│   ├── player/
│   │   ├── Player.ts             # + CLIMB state, LadderContact interface, respawn()
│   │   ├── PlayerAnimations.ts   # sprite geometria, anim kulcsok/frame-tartományok, animKeyForState()
│   │   └── PlayerController.ts   # + létra-input ág
│   ├── enemies/
│   │   ├── CrowHarvester.ts      # Enemy 1, state machine + CrowHarvesterConfig (patrol határok)
│   │   └── CrowHarvesterAnimations.ts # sheet geometria, anim kulcsok, facing-kompenzáció, animKeyForState()
│   ├── bosses/
│   │   └── GraftedWingBreaker.ts # Boss 1, két fázis, slash / projectile / charge
│   ├── systems/
│   │   ├── CheckpointSystem.ts   # egyetlen aktív respawn-pont tárolása
│   │   └── AudioManager.ts       # egy zenesáv: loop + fade-in/out, scene-shutdown hookkal
│   └── combat/
│       ├── Attack.ts             # AttackType enum + ATTACK_CONFIGS (light/heavy sebzés, cooldown, hitbox méret)
│       ├── Projectile.ts         # Fireball osztály + FIREBALL_CONFIG + ProjectileOptions (boss lövedék)
│       └── DamageSystem.ts       # Damageable interface + PhysicsOverlapObject típus-alias
```

Még NEM létezik (a Project_plan.md 20. pontjában tervezett, de nem implementált): `MenuScene`, `EndingScene`, `enemies/Archer.ts`, `enemies/Beast.ts`, `systems/GameState.ts`, `ui/` mappa (HUD, Menu, Dialogue), és az `assets/` alatt a `sprites/ backgrounds/ tiles/ effects/` mappák (egyelőre csak `audio/` van).

> A tervezett `EndingScene.ts` és `ui/Dialogue.ts` szerepét várhatóan a `NarrationScene`
> fogja betölteni (adatvezérelt: `{ lines, nextScene, title? }`), ezért azok külön fájlként
> valószínűleg már nem kellenek.

## Implementált gameplay

### Player (`src/player/Player.ts`, `PlayerAnimations.ts`, `PlayerController.ts`)
- Mozgás: balra/jobbra (nyilak vagy A/D), ugrás (fel/W/Space)
- State-ek: IDLE, RUN, JUMP, FALL, ATTACK, CAST, HURT, CLIMB, DEAD
- **Sprite + animációk (Phase 8):** minden state-hez tartozik animáció; a leképezést a
  `PlayerAnimations.ts` **pure** `animKeyForState(state, lastAttackType)` függvénye adja,
  a `Player.updateAnimation()` pedig ezt szinkronizálja minden frame-ben. A sheetek 128×64-es
  frame-ekből állnak, a rajzolt karakter ~28×46 ezen belül:
  - `ORIGIN_Y = 0.625` → a **talp pontosan a `sprite.y + 24`-nél** van, ezért a
    `Level1Scene` `PLAYER_HALF_HEIGHT = 24` konstansa (létra `topY`/`bottomY`, `CHECKPOINT_Y`)
    a placeholder óta változatlanul érvényes. **Ha valaha más karakter-sheetre cserélsz,
    ezt a hármast (`ORIGIN_Y`, `BODY_*`, `PLAYER_HALF_HEIGHT`) együtt kell újraszámolni.**
  - Az `Attacks.png` 40 frame-je valójában **20 jobbra néző + ugyanaz 20 tükrözve**; a
    20–39 tartományt eldobjuk, a fordulást továbbra is a `setFlipX()` intézi. LIGHT = `f0–6`,
    HEAVY = `f15–19`. A `Hurt.png` 4. frame-je ÜRES (csak `f0–2` használható).
  - **A `frameRate` mindig SZÁMÍTÓDIK** (`frames * 1000 / durationMs`), sosem beégetett:
    a támadás-animációk hossza az `ATTACK_CONFIGS[type].startupDelayMs + activeDurationMs`,
    a cast/hurt lock pedig a `CAST_ANIM_MS` / `HURT_ANIM_MS`-ból származik
    (`CAST_DELAY_MS = CAST_ANIM_MS`). Így az animáció és a gameplay-lock nem tud elcsúszni.
  - **A hitbox MÉRETE is az animációból van levezetve**, nem szabadon hangolt szám: az
    `ATTACK_CONFIGS[type].hitboxWidth/hitboxOffsetX` az adott támadás AKTÍV frame-jeinek
    tényleges kiterjedéséhez igazodik (LIGHT: az ív +32px-ig ér → hitbox +6..+30; HEAVY:
    +63px → +9..+59). **Ha a támadás frame-tartománya változik a `PlayerAnimations.ts`-ben,
    a hitboxot EGYÜTT kell újraszámolni** — különben a kard láthatóan a levegőt találja el
    (pontosan ez volt a hiba az első verzióban: a light hitbox 18px-szel tovább ért, mint
    ameddig a kard elér). Következmény, amivel számolni kell: a light attack effektív
    hatótávja (+30, plusz az enemy félszélessége) alig van a CrowHarvester `ATTACK_RANGE = 42`-je
    fölött — a light így szándékosan közelharci, a heavy a biztonságos távolságú opció.
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
- Kard: Light Attack (J / bal klikk) és Heavy Attack (K / jobb klikk), külön cooldown/damage/hitbox méret (`combat/Attack.ts` konfigból)
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
- **`CrowHarvesterConfig`** (opcionális 4. konstruktor-paraméter): `patrolMinX` / `patrolMaxX`
  abszolút világ-X határok, és `clampChaseToBounds` — utóbbi hatására CHASE közben sem
  lép ki a határokon. Ez teszi lehetővé a platformon álló enemyt, ami nem sétál le a
  peremről. A flag nélkül (default false) a földi enemyk szabadon üldöznek — ez fontos,
  különben ±80px-be szorulnának.

### Level1Scene (`src/scenes/Level1Scene.ts`)
- **3200×450-es pálya** (a magasság szándékosan = canvas magasság, így csak vízszintes kameragörgetés van; a létra is belefér a sávba)
- **Folyamatos talaj, NINCS szakadék** — amíg nincs checkpoint/respawn, egy pit soft-lockot okozna
- **9 platform** a modul-szintű `PLATFORMS` tömbben (adatvezérelt: az enemy patrol-határok
  ugyanebből a forrásból származnak, `platformTop/Left/Right` helper függvényekkel — ne
  duplikálj magic numbereket). P9 `oneWay: true` → `checkCollision.down = false`, a létra
  ezen megy át
- **5 CrowHarvester**: 3 földi (820, 1850, 2700) + 2 platformon álló (P4 tágas, P8 szűk)
- **Létra** a pálya végén (x=2762): `tileSprite` a vizuál, külön `Zone` statikus bodyval
  a fizika. A scene `update()`-je **szinkron** `this.physics.overlap(player, ladderZone)`-t
  használ, NEM `physics.add.overlap` callbacket — utóbbi csak a scene `update()` UTÁN
  futna le, ami 1 frame késést okozna a mászásban
- **Checkpoint-ajtó** (x=3040, P9 jobb vége): ugyanaz a szinkron `physics.overlap()` minta,
  mint a létránál (`doorZone`). Közelben **E**-re: `checkpoint.activate()` + 500ms
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
  **Csak a playert állítja vissza** — az enemyk HP/állapota változatlan marad (szándékos
  scope-döntés, nem terveltérés: az egyszerűbb, "ne büntesd duplán a playert" viselkedést
  választottuk a teljes pálya-reset helyett)
- **A `checkpoint` a Phaser `registry`-ben perzisztál** (`this.registry.get/set('checkpoint', ...)`),
  NEM sima `Level1Scene` mezőként — mivel az ajtónál az E lenyomása egyszerre aktiválja a
  checkpointot ÉS azonnal átvált a `BossScene`-re, egy sima mezőben tárolt checkpoint minden
  `create()` újrafutáskor (pl. `BossScene`-ből visszatéréskor) nulláról jönne létre és
  elveszne. A registry ezt túléli, mert Game-szintű, nem scene-szintű adattár.
- Dekoráció: parallax háttéroszlopok (`scrollFactor 0.6`), létra-hátfal
- Placeholder grafikák kódból generálva (`BootScene.ts` `createPlaceholderTextures()`), nem valódi sprite-ok

### Boss — The Grafted Wing-Breaker (`src/bosses/GraftedWingBreaker.ts`)
- State machine: `DORMANT → APPROACH → SLASH / PROJECTILE / CHARGE_WINDUP → CHARGE → COOLDOWN → DEAD`
- **`DORMANT`** = a boss entrance ideje: nem mozog, nem támad, és **nem is sebezhető**.
  A scene a belépő-animáció végén hívja az `activate()`-et
- HP: 240 (`MAX_HP`). **Phase 2 a 50%-nál** (`PHASE2_HP_RATIO`): gyorsabb mozgás
  (`MOVE_SPEED_P1` 70 → `MOVE_SPEED_P2` 120) + megnyílik a charge támadás. A váltás egyszer
  emittál `'boss-phase-change'`-t, a scene erre rak "PHASE II" szöveget + camera shake-et
- **Támadás-választás determinisztikus** (NINCS `Phaser.Math.Between`): slash → charge →
  projectile → közelítés prioritási sorrend, saját cooldown-kapukkal (`canShoot`, `canCharge`).
  Ez egyszerre teszi nem-flaky-vá a unit teszteket és felismerhetővé a boss mintáit
- A **projectile és a charge saját cooldownnal** rendelkezik — enélkül a boss távolról
  végtelenül tüzelne, és soha nem indulna el a player felé
- **A boss nem hozza létre a lövedéket**, hanem `'boss-projectile'` eventet emittál (x, y, irány),
  a `BossScene` készíti el a `Fireball`-t — ugyanaz a minta, mint a `Player` `'fireball-cast'`-ja.
  Így a boss osztály nem függ a `Fireball`-tól, és unit tesztben az emisszió megfigyelhető
- Lövedék-magasság: `PROJECTILE_SPAWN_OFFSET_Y = 30` a boss középpontjához képest — ez pont a
  player mellmagassága, tehát **át lehet ugrani** (Project_plan.md 12. pont követelménye)
- Charge: `CHARGE_WINDUP_MS` (1000ms) piros telegraph-tint, az **irány a windup ELEJÉN rögzül**
  (egyenes vonalú roham, nem követi a playert), roham közben `hasHitThisCharge` miatt
  legfeljebb egyszer sebez, falnak ütközve (`body.blocked.left/right`) idő előtt véget ér,
  utána 3 mp `CHARGE_COOLDOWN_MS` csend
- A `takeDamage()` hit-villanása **szándékosan nem törli a charge piros telegraph-ját** —
  a player abból olvassa ki, hogy jön a roham
- `DIRECTION_DEADZONE` (6px), ugyanaz a védelem, mint a CrowHarvesternél: a boss ne pörögjön
  balra-jobbra, ha a player pont felette áll az aréna platformján
- UI **nincs** az osztályban (se HP-szöveg, se bar) — azt a scene rajzolja. Ez tartja a
  boss unit-tesztelhetőnek a `fakePhaser` minimális `MockSprite` felületén

### BossScene (`src/scenes/BossScene.ts`)
- **Fix 800×450-es aréna, NINCS kameragörgetés** (`startFollow` sincs): a boss, a player és a
  HP-bar mindig egyszerre látszik, a telegraph mindig olvasható, és a jövőbeli visual
  regression baseline determinisztikus
- Folyamatos talaj + 2 alacsony oldalsó platform (kitérés a charge elől, magaslat a leugró
  támadáshoz)
- **Player és boss között SZÁNDÉKOSAN nincs collider**: a sebzés a támadás-hitboxokon megy,
  így nem tolják egymást a pálya szélére
- Belépő: `fadeIn` + a boss neve be/kifadel (tween `hold` + `yoyo`), utána `boss.activate()`
- **Győzelem**: `registry.set('bossDefeated', true)` → `NarrationScene` (a `BOSS_VICTORY_NARRATION`
  szöveggel) → `Level2Scene`
- **Vereség**: fade → `Level1Scene`, ahol a player a checkpointon (az ajtónál) éled újra és
  **E**-vel léphet be ismét; a boss ilyenkor friss HP-val indul

### NarrationScene (`src/scenes/NarrationScene.ts`)
- Adatvezérelt, újrahasználható szöveges átvezető: `scene.start('NarrationScene', { lines, nextScene, title? })`
- Typewriter reveal; **Space/Enter** = gépelés közben teljes sor, kész sornál a következő sor;
  **Esc** = teljes átugrás. Az utolsó sor után fade → `nextScene`
- A mező neve `narration`, **NEM `data`** — a `Phaser.Scene`-nek már van `data` property-je
  (`DataManager`), az ütközés típushibát ad
- A narrációs szöveg placeholder (a `BossScene.ts` tetején, `BOSS_VICTORY_NARRATION`) —
  a végleges lore a Phase 9-ben készül, a csere egy tömb-szerkesztés

### Audio (`src/systems/AudioManager.ts`)
- **Egyetlen zenesáv** kezelése: `playMusic(key, { volume?, fadeInMs? })`, `stopMusic(fadeOutMs?)`,
  `getCurrentMusicKey()`, `destroy()`. Exportált konstansok: `MUSIC_KEYS`,
  `DEFAULT_MUSIC_VOLUME` (0.45), `DEFAULT_FADE_IN_MS` (800), `DEFAULT_FADE_OUT_MS` (1500)
- A hang **némán** jön létre (`volume: 0`), a hangerőt egy tween viszi fel — a `stopMusic()`
  a futó fade-in tweent leállítja, hogy a kifadelés az AKTUÁLIS hangerőről induljon
- `playMusic()` mindig hard-stoppolja az előző sávot → **nem lehet két loop egyszerre**
- `stopMusic()` kétszer hívva no-op (`isStopping` flag)
- **Autoplay policy**: ha `scene.sound.locked`, a lejátszás a `Phaser.Sound.Events.UNLOCKED`
  eseményre halasztódik. A gyakorlatban ez sosem kell — a Phaser `WebAudioSoundManager`
  **`keydown`-ra is felold**, a player pedig végigjátssza a Level 1-et, mire ide ér
- **Az asset Vite-importtal jön** (`import bossThemeUrl from '../../assets/audio/boss-theme.mp3'`),
  NEM a `public/` mappából. Így a build hash-eli, a GitHub Pages base path magától jó lesz,
  és **hiányzó fájlnál a build elszáll** néma 404 helyett. Ehhez kell a `src/vite-env.d.ts`
- Bekötés a `BossScene`-ben: `create()` → `new AudioManager(this)`, `startEntrance()` →
  `playMusic(MUSIC_KEYS.BOSS_THEME)`, `scheduleVictory()`/`scheduleDefeat()` → `stopMusic()`.
  Kézi takarítás **nincs** — az `AudioManager` maga iratkozik fel a scene shutdownjára

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
11. **Off-center sprite + `flipX` = a karakter oldalra UGRIK forduláskor.** A `flipX` a FRAME közepére tükröz, nem az originre. Ha a rajzolt figura nem a frame közepén van (a `CrowHarvester` teste a 64px-es frame x=14-énél ül, mert a kasza tölti ki a jobb oldalt), akkor egy sima `setFlipX()` a testet `2 * (32 - 14) = 36px`-t ugrasztja. A javítás: forduláskor az **`originX`-et ÉS a physics body offsetjét EGYÜTT** tükrözni (`CrowHarvester.setFacing()`): `originX ↔ 1 - originX`, `offsetX ↔ frameWidth - offsetX - bodyWidth`. A `tests/unit/crowHarvesterAnimations.test.ts` pont ezt a párost őrzi (a body világkoordinátás közepének nem szabad elmozdulnia). **Minden további off-center enemy sheetnél ugyanez a teendő** — érdemes lesz kiemelni közös helperbe, ha jön a második ilyen.
12. **(Ismert, még nem javított apró kockázat)** A `PlayerController`-nek nincs `destroy()`/leiratkozás metódusa — ha a `Level1Scene` scene-restart miatt újra lefut a `create()`, egy ÚJ `PlayerController` jön létre, ami újra regisztrálja a J/K/F billentyű- és pointerdown-listenereket. Mivel ezek a handlerek (`attackLight()` stb.) saját maguk cooldown-gate-eltek, a duplikált hívás gyakorlatilag no-op-ra fut (nincs látható hiba), de tisztább lenne egy `destroy()` a régi controlleren scene-leállításkor. Nem blokkoló, de ha valaha furcsa dupla-támadás tünetet észlelsz, ez az első gyanús hely.

## Ideiglenes/debug elemek a kódban (Phase 8 – Atmosphere-ben cserélendők)

- **A player és a CrowHarvester KIVÉTELÉVEL** minden grafika kódból generált színes
  téglalap/kör (`generateTexture`) — a boss, a talaj/platformok, a létra, az ajtó, az
  oszlopok és mindkét lövedék még placeholder
- CrowHarvester felett lebegő HP szöveg (debug célra, valódi HUD a `ui/` modulban készül majd)
- A bal felső sarki HUD szöveg a HP mellett a **player state-et is kiírja** (`HP: 100/100 | CLIMB`) — a mászás manuális tesztelését segíti, Phase 8-ban cserélendő
- Hit-reakció **a bossnál** = tint villanás, nincs valódi animáció (a playernél és a
  CrowHarvesternél már van hit/hurt animáció)
- **NYITOTT JOGI TÉTEL:** a CrowHarvester assethez (`assets/sprites/crow-harvester/`)
  — a knight csomaggal ellentétben — **nem került licenc fájl a repóba**. Ez tudatos,
  elhalasztott döntés. A forrás valószínűleg a `2D helper/Credits.txt`-ben szereplő
  karakter-csomag; **a repo nyilvánossá tétele / GitHub Pages deploy ELŐTT tisztázni kell.**
  Ezért maradt meg az eredeti `enemy04_sheet.png` fájlnév: ez az egyetlen megmaradó
  kapocs a forráscsomaghoz.
- `pillar-placeholder` és `door-placeholder` dekorációk: puszta színes téglalapok
- A checkpoint-prompt szöveg ("E: Checkpoint" / "Checkpoint mentve...") debug-stílusú `add.text`, a `playerHpText`-hez hasonlóan — valódi UI a `ui/` modulban készül majd
- A `BossScene` HP-barja nyers `Graphics`-szal rajzolt téglalap (`drawBossHealthBar()`), és a player HP-ja ott is a debug `add.text` — mindkettő a `ui/` modulba költözik Phase 8-ban
- `Level2Scene` teljes egészében placeholder ("Level 2 — The Crowless Forest / tervezés alatt"), és benne az **R billentyű** visszavisz a `Level1Scene`-re — kizárólag azért, hogy a `Level1 → Boss → átvezető → Level2` lánc manuálisan körbejárható legyen. A valódi Level 2 elkészültekor törlendő
- A `BOSS_VICTORY_NARRATION` szövege placeholder lore — a végleges a Phase 9 – Lore-ban készül
- A `BootScene` "Betöltés..." szövege + progress-sávja nyers `add.text` / `Graphics` — a `ui/` modulba költözik, amint több asset (sprite-ok) is betöltendő lesz
- `main.ts`-ben `arcade.debug: true` — a physics bodyk és a létra zónája ki van rajzolva
- A training dummy és a régi 'H' debug billentyű (self-damage teszteléshez) már törölve lett, miután a CrowHarvester valódi sebzésforrássá vált

## Következő lépés

**Phase 8 – Atmosphere folyamatban.** Az 1. iteráció (boss music) kész; ami még hátravan:
- **Sound effectek** (Project_plan.md 18. pont listája: sword swing/hit, fireball, hurt,
  death, jump, checkpoint stb.). Az `AudioManager` jelenleg csak zenét kezel — SFX-hez
  kap majd egy `playSfx(key)`-t, ami nem exkluzív (több hang egyszerre). A player
  animációi már megvannak, tehát a hangokat könnyű a megfelelő frame-hez kötni.
- **Boss / environment sprite-ok** — a player (2. iteráció) és a CrowHarvester
  (3. iteráció) kész; a *Grafted Wing-Breaker*, a tile-ok és a háttér még placeholder.
  A `2D helper/Sprites/` alatt van még Enemy01/02/03/05 és egy "Gino Character" — ha
  bármelyik boss- vagy enemy-jelöltként bejön, számíts rá, hogy szintén off-center
  (lásd a 11. technikai tanulságot).
- **Level / menü ambient.** Figyelem: az `AudioManager` most **scene-hatókörű** (a scene
  shutdownja elvágja) — scene-eken átívelő zenéhez game-szintűvé kell emelni.
- Megmaradt `TODO (Phase 8)` kommentek a kódban: fázisváltás sting (`BossScene.registerBossEvents()`),
  narration ambient (`NarrationScene.create()`), victory sting (`BossScene.scheduleVictory()`).
- A maradék kódból generált placeholder téglalapok cseréje valódi pixel art sprite-okra
  (`assets/backgrounds/`, `assets/tiles/`, `assets/effects/`).
- `ui/` modul: valódi HUD a debug `add.text`-ek helyett, és a boss HP-bar átköltöztetése
  a `BossScene.drawBossHealthBar()`-ból. Ide kerülhet a `BootScene` betöltésjelzője is.
- A `main.ts` `arcade.debug: true` kikapcsolása.

**Phase 8 után jön a Döntési pont** (lásd fentebb és a Project_plan.md 21. pontjában):
többi Enemy típus + Level + Bossok, VAGY tovább a Lore (Phase 9) / QA (Phase 10) irányba.

Nyitott, nem blokkoló polish-tételek:
- Szakadékok (gap) bevezetése a Level 1 `PLATFORMS` layoutjába (Project_plan.md 13. pont) —
  a checkpoint/respawn már készen áll rá.
- A knight csomagban van még **landolás** (`Jump.png` `f6–7`), és több nem használt sheet
  (Roll, Slide, crouch, Hanging, Pray, attack_from_air) az eredeti forrásmappában. Ezekhez
  nincs state a játékban, és a Project_plan.md sem tervez ilyet — csak akkor kerüljenek be,
  ha külön döntés születik róluk (a `Pray` pl. jó checkpoint-animáció lenne).
- A boss számai (HP 240, sebzések, cooldownok) az első hangolatlan értékek — manuális
  játszás után érdemes finomítani őket a `GraftedWingBreaker.ts` exportált konstansaiban.