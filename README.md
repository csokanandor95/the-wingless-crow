# The Wingless Crow

![The Wingless Crow](docs/images/Cover.png)

> **A 2D dark fantasy action platformer built as a QA engineering portfolio piece** — a small,
> finished game wrapped in a real testing strategy and a CI pipeline.

<!-- ▼▼▼ THE ONLY TWO LINES TO EDIT AFTER DEPLOYMENT ▼▼▼ -->
[play-itch]: https://REPLACE-ME.itch.io/the-wingless-crow
[play-pages]: https://csokanandor95.github.io/the-wingless-crow/
<!-- ▲▲▲ every "Play" link in this file points at these two references ▲▲▲ -->

[![CI](https://github.com/csokanandor95/the-wingless-crow/actions/workflows/ci.yml/badge.svg)](https://github.com/csokanandor95/the-wingless-crow/actions/workflows/ci.yml)
[![Play on itch.io](https://img.shields.io/badge/Play-itch.io-fa5c5c)][play-itch]
[![Play on GitHub Pages](https://img.shields.io/badge/Play-GitHub%20Pages-222)][play-pages]

**▶ Play it in your browser: [itch.io][play-itch] · [GitHub Pages][play-pages]** — no install, ~20 minutes.

---

Lazar, the Crowmarked, guards the gate between the living and the dead. A mad king strikes a
bargain with an ancient demon to resurrect his dying queen; the demon delivers — and cages the
crows, tearing the order of both worlds apart. Lazar survives, but loses his wings.

That is the game. The reason this repository is public, though, is the **other half**: 1 015
automated tests across four levels, a six-gate CI pipeline, and a
[test plan](docs/Test-plan.md) that argues *why each layer exists and what was deliberately left
out*.

## At a glance

| | |
|---|---|
| **Genre** | 2D dark fantasy action platformer, single player, fully offline |
| **Engine** | [Phaser 4](https://phaser.io/) (Arcade Physics) · TypeScript (strict) · Vite |
| **Playtime** | ~20 minutes, one session |
| **Resolution** | 800×450 logical, `Scale.FIT`, `pixelArt: true` |
| **Content** | 12 scenes · 3 levels · 4 bosses · 3 enemy types · 9 music tracks |
| **Source** | 66 TypeScript files, 20 371 lines |
| **Tests** | **1 015 automated** (unit · integration · E2E · build sanity) + manual release gate |
| **CI** | GitHub Actions, 6 quality gates, Chromium + Firefox |

## Screenshots

| | |
|---|---|
| ![The opening shrine](docs/images/screenshot1.png) | ![Level 1 — the Swinging Reaper](docs/images/screenshot2.png) |
| **The opening shrine** — Lazar wakes wingless; the Flame Keeper explains what happened. | **Level 1** — a swinging reaper sweeps the only bridge over a 400 px drop. |
| ![Boss 1 — The Grafted Wing-Breaker](docs/images/screenshot3.png) | ![Level 2 — The Crowless Quarter](docs/images/screenshot4.png) |
| **The Grafted Wing-Breaker** — two phases, four attacks, every telegraph deterministic and learnable. | **Level 2** — a Beast on the scaffold and two Gravecallers throwing bolts from below. |

## For reviewers — where to look

The project is documented across four files with a deliberate split: **plan → current state →
history → QA**. I tried not to duplicated between them.

| If you are… | Read | It answers |
|---|---|---|
| **a QA / test engineer** | [**`docs/Test-plan.md`**](docs/Test-plan.md) *(English)* | Risk map, test levels, fault injection, coverage traceability, accepted limitations |
| **any engineer** | [**`CLAUDE.md`**](CLAUDE.md) | What exists *now*: every system, file and derived constant — plus 29 numbered technical lessons |
| **a PM / designer** | [**`docs/Project_plan.md`**](docs/Project_plan.md) | What was *planned*: game design, scope discipline, the 40-step roadmap |
| **interested in process** | [**`docs/devlog.md`**](docs/devlog.md) | **How it got here**: phase-by-phase iterations, alternatives that were discarded, and the measurement behind every tuned number |

> **Language note:** `docs/Test-plan.md` is written in English. `Project_plan.md`, `CLAUDE.md` and
> `devlog.md` are in Hungarian — the working language of the project.

---

## Quality engineering

### The question the suite answers

> ### "Can I confidently publish this?...*while applying a risk-based testing approach, and avoiding over-engineering*"



Not *"is this game provably free of defects?"* — that question is unanswerable and, for a
20-minute browser game, not worth asking. Concretely, "yes" means: the game **starts** in more
than one engine; it is **completable** with no wrong door or softlock; the **core loop works**
(move, fight, take damage, die, respawn); there is **no silent runtime error**; and what ships is
**what was tested**. Anything that moved none of those five needles was left out on purpose —
see [`Test-plan.md` §1](docs/Test-plan.md).

### The test pyramid — deliberately top-light

```text
   manual + beta (itch.io)     experience, difficulty, audio, lore, Safari
   performance (2 metrics)     load time, frame time                          on demand
   cross-browser (smoke ×2)    does it start at all
   screenshot review (4)       is the picture broken                          human-reviewed
   E2E (5 specs, Chromium)     the 6 023 untested scene lines
   integration (2 files)       module contracts
   unit (34 files)             logic, geometry, state machines
```

E2E exists to reach what nothing else can — **6 023 lines of scene code that are structurally
untestable at unit level** — not to re-verify combat maths already proven deterministically
below it. The fake Phaser module in `tests/unit/helpers/fakePhaser.ts` provides no `Scene` class
by design; a fake rich enough to run one `create()` would be a partial reimplementation of the
engine. That single constraint is what shapes every layer above it.

### Suite at a glance

| Layer | Files | Tests | Runtime | Runs |
|---|---|---|---|---|
| Unit | 34 | 967 | ~4 s | every push |
| Integration | 2 | 23 | ~0.5 s | every push |
| Build sanity | 1 script | 2 assertions | <1 s | every push |
| E2E — Chromium | 5 specs | 18 | ~1.5 min | every push |
| E2E — Firefox smoke | 1 spec | 5 | ~20 s | every push |
| Performance | 1 spec | 2 | ~15 s | on demand |
| Manual playthrough | — | 8-point checklist | ~25 min | before release |
| Exploratory charters | — | 5 charters | ~30 min | before release |
| **Total automated** | **43** | **1 015** | **~2 min** | |

Every test traces back to a numbered risk, and every testable requirement in
[`Project_plan.md`](docs/Project_plan.md) §23–§31 traces forward to the test that verifies it — or
is explicitly marked as covered at a different level, by design. Both directions are tabulated in
[`Test-plan.md` §4 and §6](docs/Test-plan.md); anything that traced to no risk was not written.

### CI quality gates

```text
job: verify              typecheck → unit (967) → integration (23) → build → deploy sanity
job: e2e                 Playwright: Chromium full + Firefox smoke → report artifact
job: performance         workflow_dispatch only, --workers=1
```

```text
Unit tests        PASS
Integration       PASS
Build             PASS
Deploy sanity     PASS      guards vite.config base:'./'
E2E               PASS
Critical errors   0         enforced by the E2E fixture on every test
```

`typecheck` is a **separate step** because `vite build` only *strips* types with esbuild — a green
build does not prove `tsc` is clean. The Linux runner is case-sensitive, which catches mis-cased
asset filenames that Windows hides. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml),
and [`docs/devlog.md` → *"Phase 10 – QA — a CI útja a minimális szelettől a teljes
pipeline-ig"*](docs/devlog.md) for how the pipeline grew from a three-step minimum slice into this.

### Manual testing feeds back into the automated suite

The most useful loop in the project, using the Mad King as the worked example:

1. **A manual playthrough finds a boss that feels unfair** — his 330 ms wind-up could not be
   dodged by jumping alone.
2. **The dodge window is measured, not guessed** — computed from the player's own exported
   `JUMP_VELOCITY`, `MOVE_SPEED` and `GRAVITY_Y`. At 330 ms the player reaches 127 px and is hit;
   660 ms yields 160 px and clears. 660 ms also turns out to be the natural *ceiling*: the jump
   apex sits at 625 ms, so a longer wind-up buys lethargy, not fairness.
3. **The constant becomes derived**, with the derivation recorded next to it.
4. **A fairness invariant locks it in** — `tests/unit/madKing.test.ts` recomputes the dodge from
   the player's constants and asserts *both* escape answers still work.

The consequence is the point: a later "let's speed the boss up" tweak **fails in CI**, instead of
surviving to the next manual playthrough. Full measurements, and the values that were rejected, in
[`docs/devlog.md` → *"Fairness-hangolások — kézi teszt után"*](docs/devlog.md).

### What is deliberately NOT tested — and why

Naming what is not tested is part of the strategy, not an omission. An oversized QA process on a
small game is as much a red flag as a missing one — and the scope discipline is inherited straight
from [`Project_plan.md`](docs/Project_plan.md) §37, which fixed the target as *"few mechanics, but
working, spectacular and well testable"* and named the features that were ruled out up front.

| Not tested | Why |
|---|---|
| **New unit tests** | 967 already exist; more would raise the count, not lower the risk. A unit-test *audit* is planned instead |
| **Boss fights through E2E** | Beating a 340 HP boss with synthetic keystrokes is flaky; phase transitions are already proven by four unit suites |
| **Coverage-percentage gate** | Rewards writing tests, not reducing risk |
| **Mobile / touch, accessibility** | No touch input exists; the game is a single canvas with no DOM UI |
| **Load, stress, security** | Static site, no backend, no accounts, no user data |
| **WebKit in CI** | Playwright's WebKit build has no Web Audio API at all, so the game cannot finish booting — a broken *test browser*, not Safari. Covered by a manual charter ([§7.1](docs/Test-plan.md)) |

---

## The game

```text
Boot ─► MainMenu ─┬─► PreScene ─► Level 1 ─► Boss 1 ─► Level 2 ─► Boss 2
                  │                                                 │
                  │        ┌────────────────────────────────────────┘
                  │        └─► Level 3 ─► Boss 3 ─► Final Boss ─► ending ─► Credits ─┐
                  └────────────────────────────────────────────────────────────────◄─┘
```

Three hand-authored levels (a ruined cathedral approach, a gothic quarter, a beast dungeon), four
bosses each built around a different pressure — reach, pure melee, a charging mini-boss, and
area-denial — and three enemy types: a melee harvester, a ranged caster, and a charger.

**Controls:** `A`/`D` or arrows to move · `Space`/`W` jump · `E` interact · `J` or LMB sword ·
`K` or RMB heavy slash (charged by 3 landed sword hits) · `F` fireball (2 charges) · `F11`
fullscreen. The in-game menu has a full controls page.

## Engineering notes

Patterns a reviewing engineer will notice, each chosen to keep the game testable:

- **Level geometry lives in Phaser-free data modules** (`src/levels/Level*Layout.ts`), so layouts
  are unit-testable without mocking GameObjects — including **BFS reachability proofs** that walk
  the level with ballistic jump maths and assert every surface is reachable and every gap
  jumpable. Magic numbers are not allowed back into a scene.
- **Tuning constants are exported and guarded by invariants** — see the fairness loop above.
- **Entities emit events; scenes own the side effects.** Projectiles and SFX are created by the
  scene in response to an event, so entities never depend on `AudioManager`, and every emission is
  observable in a test.
- **`fakePhaser.ts` deliberately provides no `Scene` class** — the structural reason scene
  verification belongs in a real browser ([`Test-plan.md` §5.1](docs/Test-plan.md)).
- **29 numbered technical lessons** in [`CLAUDE.md`](CLAUDE.md) record engine-level traps paid for
  once and never again — e.g. `setTintFill()` being a silent no-op in Phaser 4, and an Arcade
  `Group.add()` quietly resetting a body's velocity.

The reasoning *behind* these patterns — including alternatives that were built, measured and then
thrown away — lives in [`docs/devlog.md`](docs/devlog.md), whose appendix traces every deviation
back to the original plan.

## Run it locally

Requires **Node.js 24+**.

```bash
git clone https://github.com/csokanandor95/the-wingless-crow.git
cd the-wingless-crow
npm ci
npm run dev          # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run build` · `npm run preview` | Production build · serve it locally |
| `npm run typecheck` | `tsc --noEmit` (includes `tests/`) |
| `npm run test` · `npm run test:watch` | Unit tests (967) |
| `npm run test:integration` | Integration tests (23) |
| `npm run check:build` | Deploy sanity check on `dist/` |
| `npm run e2e` · `e2e:smoke` · `e2e:visual` | Playwright: full · smoke only · screenshot capture |
| `npm run e2e:perf` · `e2e:report` | Performance, `--workers=1` (only valid run alone) · open last report |

**Reproduce the CI `verify` job locally** — if these five are green, CI should be too:

```bash
npm run typecheck && npm run test && npm run test:integration && npm run build && npm run check:build
```

## Project status

**Feature complete** (Phases 1–9) · **QA Phase 10 closed** · **Phase 11 — deployment — in progress.**

No functional defect was found in the game itself during the Phase 10 QA build-out: the scene
sweep, the progression matrix and the asset audit all passed on the first run — which, given that
6 023 lines of scene code had never been under test, is a result in itself. The findings that *were*
raised were process defects, including two independent **false green** mechanisms in the test
harness, both caught only because fault injection was run.

Known limitations are documented rather than hidden: Safari is manual-only, subtle visual drift is
caught by human review rather than CI, and 23.5 MB is preloaded before the menu is reachable
(87 % of it audio). See [`Test-plan.md` §10](docs/Test-plan.md).

## Further documentation

Beyond the four documents listed [above](#for-reviewers--where-to-look), `docs/` also holds
[`level1-layout.md`](docs/level1-layout.md) and [`level2-layout.md`](docs/level2-layout.md) — level
specs **with acceptance criteria**, which are the source of the reachability invariants — and
[`story.md`](docs/story.md), the narrative premise. Level3 has no layout documentation. It deliberately an experimental session by finding the assets and telling Claude how to implement them, and how I imagine the scene without giving it exact specification docs like before - the results are quite appealing, in my opinion.

## Credits

Third-party art, music and sound effects are credited **in-game**; the `CREDITS` list in
[`src/scenes/CreditsScene.ts`](src/scenes/CreditsScene.ts) is the authoritative attribution list,
and each package's own `license.txt` is kept beside the assets it covers. Licensing was treated as
a release gate rather than an afterthought — the audit that closed out every package is recorded in
[`docs/devlog.md` → *"Licenc-átnézés és lezárás"*](docs/devlog.md).

## License

© 2026 Nándor Csóka. All rights reserved.

This repository is publicly available for portfolio, educational and reference purposes. The source code, game assets, artwork, music, narrative content and other original project materials may not be copied, redistributed, relicensed, modified and redistributed, or used in another project without explicit permission from the author.

Public visibility of this repository does not grant permission to use, reproduce, distribute, or create derivative works from the project.

Third-party assets included in this repository are subject to their respective licenses. See the relevant asset directories and license files for details.
