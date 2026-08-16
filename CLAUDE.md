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

- Phaser 3 (game engine, Arcade Physics)
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

## Fájlstruktúra (jelenlegi, tényleges állapot)

```
the-wingless-crow/
├── package.json
├── index.html
├── vite.config.js
├── tsconfig.json
├── docs/
│   └── Project_plan.md
├── src/
│   ├── main.ts
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   └── Level1Scene.ts        # jelenleg scratch/teszt pálya, NEM a végleges Level 1 design
│   ├── player/
│   │   ├── Player.ts
│   │   └── PlayerController.ts
│   ├── enemies/
│   │   └── Hollow.ts             # Enemy 1, teljes state machine-nel
│   └── combat/
│       ├── Attack.ts             # AttackType enum + ATTACK_CONFIGS (light/heavy sebzés, cooldown, hitbox méret)
│       ├── Projectile.ts         # Fireball osztály + FIREBALL_CONFIG
│       └── DamageSystem.ts       # Damageable interface (takeDamage/isDead)
```

Még NEM létezik (a Project_plan.md 20. pontjában tervezett, de nem implementált): `MenuScene`, `Level2Scene`, `BossScene`, `EndingScene`, `enemies/Archer.ts`, `enemies/Beast.ts`, `bosses/Warden.ts`, `systems/` mappa (GameState, CheckpointSystem, AudioManager), `ui/` mappa (HUD, Menu, Dialogue), `assets/` tartalommal, `tests/` mappa tartalommal.

## Implementált gameplay

### Player (`src/player/Player.ts`, `PlayerController.ts`)
- Mozgás: balra/jobbra (nyilak vagy A/D), ugrás (fel/W/Space)
- State-ek: IDLE, RUN, JUMP, FALL, ATTACK, CAST, HURT, DEAD
- HP: 100, `takeDamage()`, halálnál lefagy (body disabled, szürke tint)
- Kard: Light Attack (J / bal klikk) és Heavy Attack (K / jobb klikk), külön cooldown/damage/hitbox méret (`combat/Attack.ts` konfigból)
- Fireball: F billentyű, `combat/Projectile.ts` Fireball osztályt hoz létre a Level1Scene-ben egy `fireball-cast` eventen keresztül

### Enemy — Hollow (`src/enemies/Hollow.ts`)
- State machine: PATROL → DETECT PLAYER → CHASE → ATTACK → COOLDOWN → CHASE (Project_plan.md 11. pont szerint)
- HP: 40, kard és fireball is sebzi
- Közelharci támadás: nem külön hitbox-zónával, hanem távolság-ellenőrzéssel a támadás windup végén (implementációs egyszerűsítés, nem terveltérés)
- Patrol range: spawn ponttól ±80px, detection range: 220px, lose range: 320px (hiszterézis)

### Level1Scene (`src/scenes/Level1Scene.ts`)
- Ideiglenes teszt-pálya: talaj + 2 lebegő platform, 2 Hollow enemy (450px és 900px-nél), kamera követi a playert
- Placeholder grafikák kódból generálva (`BootScene.ts` `createPlaceholderTextures()`), nem valódi sprite-ok

## Fontos technikai tanulságok (ne ismételd meg ezeket a hibákat!)

1. **Phaser Arcade Physics Group `.add()` felülírja a body sebességét/gravitációját.** Ha egy már konfigurált (velocity/gravity beállított) physics objektumot egy `Phaser.Physics.Arcade.Group`-hoz adsz hozzá, a group visszaállítja azokat az alapértékekre. Ezért a fireballokat és enemyket **plain TypeScript tömbben** tároljuk (`Fireball[]`, `Hollow[]`), nem Phaser Group-ban.
2. **Ne rendelj hozzá ÚJ tömböt egy már `physics.add.overlap`/`collider`-hez kötött referenciához.** A `filter()` új tömböt hoz létre — ha ezt visszaírod a property-be, a collider a régi (elavult) tömbre marad kötve. Élő elemek eltávolításához mindig `splice()`-t használj helyben (lásd `Level1Scene.update()` a fireballok takarításánál).

## Ideiglenes/debug elemek a kódban (Phase 8 – Atmosphere-ben cserélendők)

- Minden grafika kódból generált színes téglalap/kör (`generateTexture`), nincs valódi pixel art
- Player és Hollow felett lebegő HP szöveg (debug célra, valódi HUD a `ui/` modulban készül majd)
- Hit-reakció = tint villanás, nincs valódi animáció
- A training dummy és a régi 'H' debug billentyű (self-damage teszteléshez) már törölve lett, miután a Hollow valódi sebzésforrássá vált

## Következő lépés

A projekt fájlok átnézése és a kontextus megértése után:
- **Phase 6 – Level**: level layout, platforms, environment, checkpoint, transition (Project_plan.md 21. pont)