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

**Phase 6 (Level) részlegesen kész:** level layout, platforms, environment megvan (3200px hosszú pálya, 9 platform, létra, dekoráció). **Checkpoint és transition még hátra van** — a helyük a pálya végi felső platform (P9) és az ott lévő `door-placeholder` jelölő.

## Fájlstruktúra (jelenlegi, tényleges állapot)

```
the-wingless-crow/
├── package.json
├── index.html
├── tsconfig.json                 # megj.: vite.config.js NINCS, a projekt Vite defaultokon fut
├── docs/
│   └── Project_plan.md
├── src/
│   ├── main.ts
│   ├── scenes/
│   │   ├── BootScene.ts          # az összes placeholder textúra kódból generálva
│   │   └── Level1Scene.ts        # 3200px pálya, PLATFORMS adattömb, létra, 5 Hollow
│   ├── player/
│   │   ├── Player.ts             # + CLIMB state és LadderContact interface
│   │   └── PlayerController.ts   # + létra-input ág
│   ├── enemies/
│   │   └── Hollow.ts             # Enemy 1, state machine + HollowConfig (patrol határok)
│   └── combat/
│       ├── Attack.ts             # AttackType enum + ATTACK_CONFIGS (light/heavy sebzés, cooldown, hitbox méret)
│       ├── Projectile.ts         # Fireball osztály + FIREBALL_CONFIG
│       └── DamageSystem.ts       # Damageable interface (takeDamage/isDead)
```

Még NEM létezik (a Project_plan.md 20. pontjában tervezett, de nem implementált): `MenuScene`, `Level2Scene`, `BossScene`, `EndingScene`, `enemies/Archer.ts`, `enemies/Beast.ts`, `bosses/Warden.ts`, `systems/` mappa (GameState, CheckpointSystem, AudioManager), `ui/` mappa (HUD, Menu, Dialogue), `assets/` tartalommal, `tests/` mappa tartalommal.

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
- HP: 100, `takeDamage()`, halálnál lefagy (body disabled, szürke tint)
- Kard: Light Attack (J / bal klikk) és Heavy Attack (K / jobb klikk), külön cooldown/damage/hitbox méret (`combat/Attack.ts` konfigból)
- Fireball: F billentyű, `combat/Projectile.ts` Fireball osztályt hoz létre a Level1Scene-ben egy `fireball-cast` eventen keresztül

### Enemy — Hollow (`src/enemies/Hollow.ts`)
- State machine: PATROL → DETECT PLAYER → CHASE → ATTACK → COOLDOWN → CHASE (Project_plan.md 11. pont szerint)
- HP: 40, kard és fireball is sebzi
- Közelharci támadás: nem külön hitbox-zónával, hanem távolság-ellenőrzéssel a támadás windup végén (implementációs egyszerűsítés, nem terveltérés)
- Patrol range: spawn ponttól ±80px (felülírható), detection range: 220px, lose range: 320px (hiszterézis)
- **DETECT PLAYER kiváltói**: közelség VAGY sebzés PATROL közben — a `takeDamage()` PATROL
  állapotban azonnal CHASE-re vált, így egy távolról indított tűzgolyó is felébreszti
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
- Dekoráció: parallax háttéroszlopok (`scrollFactor 0.6`), létra-hátfal, és egy
  `door-placeholder` P9 jobb végén (a jövőbeli checkpoint/transition helye)
- Placeholder grafikák kódból generálva (`BootScene.ts` `createPlaceholderTextures()`), nem valódi sprite-ok

## Fontos technikai tanulságok (ne ismételd meg ezeket a hibákat!)

1. **Phaser Arcade Physics Group `.add()` felülírja a body sebességét/gravitációját.** Ha egy már konfigurált (velocity/gravity beállított) physics objektumot egy `Phaser.Physics.Arcade.Group`-hoz adsz hozzá, a group visszaállítja azokat az alapértékekre. Ezért a fireballokat és enemyket **plain TypeScript tömbben** tároljuk (`Fireball[]`, `Hollow[]`), nem Phaser Group-ban.
2. **Ne rendelj hozzá ÚJ tömböt egy már `physics.add.overlap`/`collider`-hez kötött referenciához.** A `filter()` új tömböt hoz létre — ha ezt visszaírod a property-be, a collider a régi (elavult) tömbre marad kötve. Élő elemek eltávolításához mindig `splice()`-t használj helyben (lásd `Level1Scene.update()` a fireballok takarításánál).

## Ideiglenes/debug elemek a kódban (Phase 8 – Atmosphere-ben cserélendők)

- Minden grafika kódból generált színes téglalap/kör (`generateTexture`), nincs valódi pixel art
- Player és Hollow felett lebegő HP szöveg (debug célra, valódi HUD a `ui/` modulban készül majd)
- A bal felső sarki HUD szöveg a HP mellett a **player state-et is kiírja** (`HP: 100/100 | CLIMB`) — a mászás manuális tesztelését segíti, Phase 8-ban cserélendő
- Hit-reakció = tint villanás, nincs valódi animáció
- `pillar-placeholder` és `door-placeholder` dekorációk: puszta színes téglalapok, a `door` egyelőre semmit nem csinál (csak a jövőbeli transition helyét jelöli)
- `main.ts`-ben `arcade.debug: true` — a physics bodyk és a létra zónája ki van rajzolva
- A training dummy és a régi 'H' debug billentyű (self-damage teszteléshez) már törölve lett, miután a Hollow valódi sebzésforrássá vált

## Következő lépés

**Phase 6 hátralévő része: checkpoint + transition.**
- Checkpoint rendszer (`systems/CheckpointSystem.ts`) + respawn — jelenleg a `Player.die()` letiltja a physics bodyt, és nincs visszatérés. Ez blokkolja a szakadékok/pit-ek bevezetését is.
- Level transition a pálya végi felső platformról (P9) a boss rész felé — a `door-placeholder` jelöli a helyét (x≈3040).
- Ha megvan a respawn, érdemes visszatérni a `PLATFORMS` layouthoz és szakadékokat is beszúrni (Project_plan.md 13. pont `gap` eleme).

Utána: **Phase 7 – Boss**, majd **Phase 8 – Atmosphere**, ahol a Döntési pont következik (lásd fentebb).