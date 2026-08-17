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
  NEM Phaser 3-at. Phaser 3 doksi/példa keresésekor erre figyelj (pl. a `gravity: { y: 800 }`
  Phaser 4-ben `Vector2Like`-ot vár, ezért ad típushibát a `main.ts`).
- Vite (dev szerver / bundler)
- TypeScript (strict mode)
- Node.js / npm

## Parancsok

```
cd the-wingless-crow
npm run dev      # dev szerver, http://localhost:5173
npm run build    # production build (még nem tesztelt)
```

## Itt fejeztük be a Chat-szintű fejlesztést

A chat-beszélgetés közepén, mielőtt Claude Code-ra váltottunk, ez a kérdés függőben maradt, **válasz nélkül**:

> A Project_plan.md 11. pontja az Archer/Caster-t (Enemy 2) és a Beast-et (Enemy 3, opcionális) is felsorolja, de a 21. pont Phase 5 roadmap sora kifejezetten csak "Hollow"-t nevesíti.

Három opció volt feltéve a usernek:
1. Csak Hollow (terv szerint) → mehetünk Phase 6 – Level-re
2. Archer hozzáadása most, mielőtt továbbmegyünk
3. Archer ÉS Beast hozzáadása most

**Ez frissítve lett a Project_plan.md-ben, és az alapján mehetünk tovább a Phase 6 - Level-re. Egy Döntési pont lett beszúrva a Phase 8 - Atmosphere után, ahol eldöntjük majd, hogy mi következik: Többi Enemy típus, Level és Bossok létrehozása VAGY haladunk tovább a Lore, QA irányba és ha mindez megvan, akkor bővítjük csak a többi Enemy, Level és Boss hozzáadásával.**

## Jelenlegi állapot

Készen: Step 1 (Projekt setup), Phase 2 (Player), Phase 3 (Combat), Phase 4 (Magic), Phase 5 (Enemy) részlegesen — Hollow kész.

**Phase 6 (Level) KÉSZ:** level layout, platforms, environment, checkpoint, transition mind megvan. A pálya végi ajtónál (`door-placeholder`, P9 platform) **E** billentyűvel aktiválható a checkpoint, ami egyben fade-out után átvált a (stub) `BossScene`-re.

**Phase 10 (QA) elindult:** unit teszt infra (`vitest`, `npm run test`, zero-config — nincs `vitest.config.ts`), a Player + Combat + Enemy (Hollow) le van fedve a Project_plan.md §23 bontása szerint. Boss/Game state/Utility logic unit tesztek még hátravannak. A `Player.ts` és `Hollow.ts` tuning-konstansai exportáltak, hogy a tesztek ne nyers számokat égessenek be (`Player`: `MOVE_SPEED, JUMP_VELOCITY, MAX_HP, CLIMB_SPEED, CAST_DELAY_MS`; `Hollow`: `MAX_HP, PATROL_SPEED, CHASE_SPEED, PATROL_RANGE, DETECTION_RANGE, LOSE_RANGE, ATTACK_RANGE, ATTACK_DAMAGE, ATTACK_STARTUP_MS, ATTACK_COOLDOWN_MS, VERTICAL_DETECTION_RANGE, DIRECTION_DEADZONE`), és mindkettőnek van `getHP()`/`getMaxHP()`-ja.
- A `'phaser'` modult minden teszt fájl egy teljesen önálló fake névtérre cseréli (`tests/unit/helpers/fakePhaser.ts` `createFakePhaserModule()`) — a valódi Phaser csomag már betöltéskor `window is not defined`-del elszáll Node alatt.
- **`vi.mock()` hoisting csapda**: a vitest a `vi.mock()` hívást a fájl IMPORT sorai fölé mozgatja, ezért a factory nem hivatkozhat statikusan importált binding-ra (TDZ hiba). Emiatt a `createFakePhaserModule` megosztása **dinamikus** `import()`-tal történik a factory testén belül: `vi.mock('phaser', async () => { const { createFakePhaserModule } = await import('./helpers/fakePhaser'); return createFakePhaserModule(); });` — ezt minden teszt fájl elején meg kell ismételni (globális `setupFiles`-es próbálkozás NEM működött, ugyanezen hoisting-ok miatt).
- A `Hollow`/`Player` `scene.time.delayedCall`-jai **interleave-elhetnek** (pl. `Hollow.resolveAttackHit()` a `Player.takeDamage()`-en keresztül saját delayedCallt ütemez ugyanazon a mock scene-en) — ezért a `createDelayedCallStepper` helper (`tests/unit/helpers/phaserTestUtils.ts`) `.next()` (egy lépés) ÉS `.flushRemaining()` (a kurzortól a végéig, újra-tüzelés nélkül) metódust is ad.

## Fájlstruktúra (jelenlegi, tényleges állapot)

```
the-wingless-crow/
├── package.json
├── index.html
├── tsconfig.json                 # megj.: vite.config.js NINCS, a projekt Vite defaultokon fut
├── docs/
│   └── Project_plan.md
├── tests/
│   └── unit/
│       ├── player.test.ts       # Project_plan.md §23 Player scope
│       ├── combat.test.ts       # §23 Combat scope (ATTACK_CONFIGS, Player attack, Fireball)
│       ├── hollow.test.ts       # §23 Enemy scope (Hollow HP/damage/death/state transitions)
│       └── helpers/
│           ├── fakePhaser.ts        # a 'phaser' modul önálló fake névtere (createFakePhaserModule)
│           └── phaserTestUtils.ts   # megosztott mock scene/body/delayedCall-stepper helperek
├── src/
│   ├── main.ts
│   ├── scenes/
│   │   ├── BootScene.ts          # az összes placeholder textúra kódból generálva
│   │   ├── Level1Scene.ts        # 3200px pálya, PLATFORMS adattömb, létra, 5 Hollow, checkpoint-ajtó
│   │   └── BossScene.ts          # minimális stub — Phase 7-ben kap valódi tartalmat
│   ├── player/
│   │   ├── Player.ts             # + CLIMB state, LadderContact interface, respawn()
│   │   └── PlayerController.ts   # + létra-input ág
│   ├── enemies/
│   │   └── Hollow.ts             # Enemy 1, state machine + HollowConfig (patrol határok)
│   ├── systems/
│   │   └── CheckpointSystem.ts   # egyetlen aktív respawn-pont tárolása
│   └── combat/
│       ├── Attack.ts             # AttackType enum + ATTACK_CONFIGS (light/heavy sebzés, cooldown, hitbox méret)
│       ├── Projectile.ts         # Fireball osztály + FIREBALL_CONFIG
│       └── DamageSystem.ts       # Damageable interface (takeDamage/isDead)
```

Még NEM létezik (a Project_plan.md 20. pontjában tervezett, de nem implementált): `MenuScene`, `Level2Scene`, `EndingScene`, `enemies/Archer.ts`, `enemies/Beast.ts`, `bosses/Warden.ts`, `systems/GameState.ts`, `systems/AudioManager.ts`, `ui/` mappa (HUD, Menu, Dialogue), `assets/` tartalommal.

## Implementált gameplay

### Player (`src/player/Player.ts`, `PlayerController.ts`)
- Mozgás: balra/jobbra (nyilak vagy A/D), ugrás (fel/W/Space)
- State-ek: IDLE, RUN, JUMP, FALL, ATTACK, CAST, HURT, CLIMB, DEAD
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

### Enemy — Hollow (`src/enemies/Hollow.ts`)
- State machine: PATROL → DETECT PLAYER → CHASE → ATTACK → COOLDOWN → CHASE (Project_plan.md 11. pont szerint)
- HP: 40, kard és fireball is sebzi
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
- **`HollowConfig`** (opcionális 4. konstruktor-paraméter): `patrolMinX` / `patrolMaxX`
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
- **5 Hollow**: 3 földi (820, 1850, 2700) + 2 platformon álló (P4 tágas, P8 szűk)
- **Létra** a pálya végén (x=2762): `tileSprite` a vizuál, külön `Zone` statikus bodyval
  a fizika. A scene `update()`-je **szinkron** `this.physics.overlap(player, ladderZone)`-t
  használ, NEM `physics.add.overlap` callbacket — utóbbi csak a scene `update()` UTÁN
  futna le, ami 1 frame késést okozna a mászásban
- **Checkpoint-ajtó** (x=3040, P9 jobb vége): ugyanaz a szinkron `physics.overlap()` minta,
  mint a létránál (`doorZone`). Közelben **E**-re: `checkpoint.activate()` + 500ms
  `cameras.main.fadeOut()` + `scene.start('BossScene')`. A prompt-szöveg ("E: Checkpoint")
  csak akkor látszik, ha a player a zónában van és még nincs folyamatban a transition
  (`isTransitioning` flag)
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

## Fontos technikai tanulságok (ne ismételd meg ezeket a hibákat!)

1. **Phaser Arcade Physics Group `.add()` felülírja a body sebességét/gravitációját.** Ha egy már konfigurált (velocity/gravity beállított) physics objektumot egy `Phaser.Physics.Arcade.Group`-hoz adsz hozzá, a group visszaállítja azokat az alapértékekre. Ezért a fireballokat és enemyket **plain TypeScript tömbben** tároljuk (`Fireball[]`, `Hollow[]`), nem Phaser Group-ban.
2. **Ne rendelj hozzá ÚJ tömböt egy már `physics.add.overlap`/`collider`-hez kötött referenciához.** A `filter()` új tömböt hoz létre — ha ezt visszaírod a property-be, a collider a régi (elavult) tömbre marad kötve. Élő elemek eltávolításához mindig `splice()`-t használj helyben (lásd `Level1Scene.update()` a fireballok takarításánál).
3. **Scene-restart (`scene.start(kulcsSajátMaga)`) NEM hívja újra a class field initializereket.** A Phaser Scene példány egyszer jön létre; `scene.start()` csak a lifecycle-t (init/preload/create) futtatja újra UGYANAZON a példányon. A `private enemies: Hollow[] = [];`-szerű mezők csak a LEGELSŐ konstruáláskor inicializálódnak — ha a `create()` nem üríti ki őket explicit módon, a régi (a scene leállásakor Phaser által már megsemmisített body-jú) objektumok bennmaradnak, és az `update()` rajtuk hívott metódusai (`setVelocityX` stb.) `undefined`-on szállnak el. Ez okozta, hogy a `BossScene` "R: vissza Level1Scene-re" debug-gombja "nem csinált semmit" — valójában lefutott a scene-váltás, csak utána azonnal crashelt. **Minden scene, aminek van saját magára mutató restart-útja, a `create()` elején explicit nullázza a class-field tömbjeit/flag-jeit** (lásd `Level1Scene.create()` teteje: `this.fireballs = []; this.enemies = []; this.isTransitioning = false; this.respawnScheduled = false;`).
4. **(Ismert, még nem javított apró kockázat)** A `PlayerController`-nek nincs `destroy()`/leiratkozás metódusa — ha a `Level1Scene` scene-restart miatt újra lefut a `create()`, egy ÚJ `PlayerController` jön létre, ami újra regisztrálja a J/K/F billentyű- és pointerdown-listenereket. Mivel ezek a handlerek (`attackLight()` stb.) saját maguk cooldown-gate-eltek, a duplikált hívás gyakorlatilag no-op-ra fut (nincs látható hiba), de tisztább lenne egy `destroy()` a régi controlleren scene-leállításkor. Nem blokkoló, de ha valaha furcsa dupla-támadás tünetet észlelsz, ez az első gyanús hely.

## Ideiglenes/debug elemek a kódban (Phase 8 – Atmosphere-ben cserélendők)

- Minden grafika kódból generált színes téglalap/kör (`generateTexture`), nincs valódi pixel art
- Player és Hollow felett lebegő HP szöveg (debug célra, valódi HUD a `ui/` modulban készül majd)
- A bal felső sarki HUD szöveg a HP mellett a **player state-et is kiírja** (`HP: 100/100 | CLIMB`) — a mászás manuális tesztelését segíti, Phase 8-ban cserélendő
- Hit-reakció = tint villanás, nincs valódi animáció
- `pillar-placeholder` és `door-placeholder` dekorációk: puszta színes téglalapok
- A checkpoint-prompt szöveg ("E: Checkpoint" / "Checkpoint mentve...") debug-stílusú `add.text`, a `playerHpText`-hez hasonlóan — valódi UI a `ui/` modulban készül majd
- `BossScene` szövegesen jelzi, hogy stub ("Boss Arena (Phase 7 – hamarosan)") — nincs benne semmilyen valódi gameplay, ez a Phase 7 első lépéseként cserélendő
- `BossScene`-ben az **R billentyű** visszavisz a `Level1Scene`-re — kizárólag a checkpoint/respawn lánc manuális tesztelhetőségéhez kell (a valódi boss nem fog így visszaküldeni), Phase 7-ben törlendő
- `main.ts`-ben `arcade.debug: true` — a physics bodyk és a létra zónája ki van rajzolva
- A training dummy és a régi 'H' debug billentyű (self-damage teszteléshez) már törölve lett, miután a Hollow valódi sebzésforrássá vált

## Következő lépés

**Phase 6 kész.** Most jöhet a **Phase 7 – Boss**:
- Valódi `BossScene` tartalom a jelenlegi stub helyett (jelenleg csak egy szöveges placeholder + fade-in).
- `bosses/Warden.ts` — a boss enemy state machine-je (Project_plan.md 15. pont: boss arénák, fázisváltás).
- A `BossScene`-ből jelenleg nincs visszaút Level1Scene-be (a boss halálakor/vereség esetén ez kellhet majd).
- Megfontolandó, hogy a respawn most már megvan-e olyan szinten, hogy visszatérjünk a `PLATFORMS` layouthoz és szakadékokat (gap) is beszúrjunk (Project_plan.md 13. pont) — ez opcionális polish, nem blokkolja a Phase 7-et.

Utána: **Phase 8 – Atmosphere**, ahol a Döntési pont következik (lásd fentebb).