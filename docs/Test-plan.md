# Test Plan — The Wingless Crow

**Single source of truth for this project's QA.** Strategy, scope, risk analysis, coverage,
automation, CI, findings and limitations — one maintained document instead of seven decaying
ones (see §3.3).

| | |
|---|---|
| **Product** | 2D dark fantasy action platformer, Phaser 4 + TypeScript + Vite |
| **Playtime** | ~20 minutes, single session, single player, fully offline |
| **Status** | Feature complete (Phases 1–9). Published in **draft** on itch.io, played by beta testers |
| **QA phase** | Phase 10 |
| **Last updated** | 2026-09-08 |

---

## 1. Purpose — the question this test suite answers

> ### “Can I confidently publish this?”

Not *“is this game provably free of defects?”* — that question is unanswerable and, for a
20-minute browser game, not worth asking. The suite is built to answer one practical question
before each release, and everything in this document is justified against it.

Concretely, “yes” means:

1. the game **starts** — in more than one browser engine;
2. the game is **completable** — no wrong door, no softlock, no dead end;
3. the **core loop works** — move, fight, take damage, die, respawn;
4. there is **no game-breaking crash** and no silent runtime error;
5. what ships is **what was tested** — the build that reaches itch.io actually runs.

Anything that does not move one of those five needles was deliberately left out. The scope
discipline is itself part of the deliverable: an oversized QA process on a small game is as
much a red flag as a missing one.

---

## 2. System under test

### 2.1 Scene chain

```
Boot ─► MainMenu ─┬─► PreScene ─► Level 1 ─► Boss 1 ─► Level 2 ─► Boss 2
                  │                                                 │
                  │        ┌────────────────────────────────────────┘
                  │        └─► Level 3 ─► Boss 3 ─► Final Boss ─► ending ─► Credits ─┐
                  └────────────────────────────────────────────────────────────────◄─┘
                     (Credits ─► MainMenu; “Start Game” wipes all progress)
```

12 scenes. The three level doors **change target based on progress flags** — this is the
single most defect-prone piece of wiring in the game (see R2).

### 2.2 State

All cross-scene progress lives in the Phaser registry under **8 keys**
(`systems/GameProgress.PROGRESS_REGISTRY_KEYS`): four `*Defeated` boss flags, three checkpoint
objects, and the seen-dialogue list. The registry is *game*-scoped, so it survives a full
playthrough — which is exactly why “New Game” must clear it.

### 2.3 Determinism profile — why some test levels are cheap here

The **only** source of randomness in the entire `src/` tree is the SFX detune spread in
`AudioManager.ts`. Boss attack rotations, hazard swings, moving platforms and enemy AI are all
deterministic *by explicit design decision*, documented in the source.

This makes state-based assertions reliable and cheap. It does **not**, however, make *rendering*
reproducible — see §10.2, where measurement contradicted the assumption.

### 2.4 Size and shape

| | |
|---|---|
| Source | 65 `.ts` files, 20 350 lines |
| Scene layer | 12 files, **6 023 lines (30 % of source)** — untestable at unit level, see §5.1 |
| Assets | 109 files, **23.55 MB**, of which audio is **20.44 MB (87 %)**, all preloaded up front |
| Logical resolution | 800×450, `Scale.FIT`, `pixelArt: true` |
| Deploy target | itch.io HTML5 (served from a generated sub-path — see R3) |

---

## 3. Scope

### 3.1 In scope

Startup and scene creation · progression and door routing · new-game reset · core combat
contracts (sword/fireball → enemy) · checkpoint → respawn · asset and animation integrity ·
runtime/console errors · cross-browser startup · load time and frame time · full manual
playthrough.

### 3.2 Out of scope — and why

Naming what is *not* tested is part of the strategy, not an omission.

| Not tested | Why |
|---|---|
| **New unit tests** | 967 already exist. The suite is deep on logic, geometry and state machines; adding more would raise the count, not lower the risk. A separate **unit-test audit** iteration is planned to review whether all 967 earn their place. |
| **Boss fights driven through E2E** | Beating a 240–340 HP boss with synthetic keystrokes is timing-dependent and flaky. Phase transitions are already proven deterministically by four unit suites. |
| **Memory profiling, long-session degradation** (Project_plan §29) | The game is ~20 minutes, one session. Not a real risk at this scope. |
| **Coverage-percentage gate** | Rewards writing tests, not reducing risk — contrary to Project_plan §37 (“few mechanics, but working, spectacular and well testable”). |
| **Mobile / touch, accessibility audit** | No touch input exists; §27 lists desktop browsers only; the game is a single canvas with no DOM UI. |
| **Load, stress, security testing** | Static site, no backend, no accounts, no user data (§37 explicitly excludes an online backend). |
| **Phaser engine internals** | Third-party. |
| **Game feel, difficulty balance** | The fairness *derivations* are unit-tested (e.g. “both dodge answers must work”). Whether it *feels* fair is a human question — §9. |

### 3.3 Documentation scope — one file, not seven

`Project_plan.md` §33 planned `test-strategy.md`, `test-plan.md`, `test-cases.md`,
`automation.md`, `known-issues.md`, `game-design.md` and `architecture.md`. This project ships
**one** document. Rationale:

- **A test strategy is an organisational artifact** — multiple teams, multiple products, a
  long-term direction to align on. With one developer and one game, “strategy” is a section,
  not a file; as a standalone document it would be padding.
- **Test cases belong in the test code.** A separately maintained case list drifts from the
  suite within weeks, and a QA document that lies is worse than none.
- `game-design.md` and `architecture.md` already exist in substance as `Project_plan.md`,
  `docs/level*-layout.md` and `CLAUDE.md`.

*One maintained document beats seven decaying ones* — and that judgement is itself a QA
statement. Project_plan §33 has been updated to match.

---

## 4. Risk map — the backbone of this plan

Ordered by *player impact × how hard the defect is to notice by hand*. Every test that exists
traces back to a row here; anything that traced to no row was not written.

| # | Risk | Why it blocks release | How it would surface today | Level | Status |
|---|---|---|---|---|---|
| **R1** | A scene throws in `create()` → black screen | Game stops dead | Only if someone reaches that scene | E2E scene sweep | ✅ covered |
| **R2** | Door routes to the wrong scene / softlock | Game not completable | Only via a full playthrough *with* flags set | E2E progression | ✅ covered |
| **R3** | `vite.config.ts` `base` reverts to `'/'` | **The itch.io build silently breaks** — build stays green, the game does not start | Only after upload | Build sanity check | ✅ covered |
| **R4** | `START_SCENE` committed on a dev value | Game starts in the wrong scene | Only on launch — *this already happened once* | E2E smoke | ✅ covered |
| **R5** | Missing texture / audio / animation frame | Invisible sprite, silent boss | Only if you happen to look | E2E assets | ✅ covered |
| **R6** | Console error / uncaught exception in play | Both layout specs list “no console errors” as acceptance criteria | Nobody plays with devtools open | E2E fixture, every test | ✅ covered |
| **R7** | Sprite vanished / camera broken / background wrong | Ugly, not blocking | Needs a trained eye, per screen | Screenshot review + canvas-not-blank | ⚠️ partial — §10.2 |
| **R8** | Game fails to start in another browser | Loses a share of players | Only by hand, in 3 browsers | Cross-browser smoke | ⚠️ partial — §7 |
| **R9** | Sword / fireball → enemy damage chain breaks | Core gameplay | Immediately obvious in play | Integration | ✅ covered |
| **R10** | Checkpoint → respawn breaks | Frustrating, near-softlock | Obvious in play | Integration + E2E | ✅ covered |
| **R11** | Slow load / stutter | 23.5 MB preload, 87 % audio | Only felt, never measured | Performance | ✅ covered |
| **R12** | Difficulty, feel, audio mix, lore text | Experience quality | **Only a human** | Manual + beta | ✅ covered |

**Already covered elsewhere, deliberately not re-tested higher up the pyramid:** boss phase
transitions (4 unit suites), enemy AI and state machines, level geometry and reachability (BFS
proofs), fairness derivations, animation key mapping, audio mix ordering.

### 4.1 Why the scene layer is where the risk is

Every defect this project found by *manual play* lived in the scene layer:

- `Level2Scene`’s door targeted `Boss2Scene` unconditionally, ignoring `kingDefeated`;
- `START_SCENE` was committed as `'BossScene'`, so the game booted into a boss arena;
- a class-field initializer was not reset on scene restart, crashing after `create()`;
- a missing `fallDeathTriggered` gate re-triggered fall-death every frame.

**Not one of the 967 unit tests could have caught any of them** — and not through negligence:
the fake Phaser module deliberately provides no `Scene` class (§5.1). The new layers were
placed exactly here.

---

## 5. Test levels

```
   manual + beta (itch.io)     experience, difficulty, audio, lore, Safari
   performance (2 metrics)     load time, frame time                          on demand
   cross-browser (smoke ×2)    does it start at all
   screenshot review (4)       is the picture broken                          human-reviewed
   E2E (5 specs, Chromium)     the 6 023 untested scene lines
   integration (2 files)       module contracts
   unit (34 files — DONE)      logic, geometry, state machines
```

Deliberately **top-light**: E2E exists to reach what nothing else can, not to re-verify combat
maths already proven deterministically below it.

### 5.1 Unit — 34 files, 967 tests *(pre-existing, unchanged)*

Covers Project_plan §23 in depth: player movement/health/damage/death, combat configs and
cooldowns, all three enemies’ state machines, all four bosses (HP, phase transition, attack
rotation, death), level geometry with **BFS reachability proofs**, animation key mapping and
off-centre facing compensation, audio mix invariants, dialogue, HUD, main menu contrast.

**Structural constraint that shapes everything above it:** `tests/unit/helpers/fakePhaser.ts`
provides `Physics.Arcade.Sprite`, `EventEmitter`, `Math` helpers and tint/blend enums — and
**no `Scene`, `Game`, `Cameras`, `Input`, `Scale`, `registry` or physics world**. `Level1Scene`
alone touches `add.tileSprite`, `physics.add.staticGroup/collider/overlap`, `cameras.main`,
`input.keyboard`, `sound`, `tweens`, `time`, `registry` and `scene.start`. A fake rich enough
to run one `create()` would be a partial reimplementation of Phaser.

→ **Scene-level verification belongs in a real browser.** This is the plan’s central decision.

*Planned:* a separate audit iteration to review whether all 967 tests still earn their keep.

### 5.2 Integration — `tests/integration/`, 2 files, 23 tests

Vitest with the same fake Phaser, but composing **real modules on both sides** (unit tests mock
the counterpart). Implements Project_plan §24.

| File | §24 flow | What it proves that no unit test does |
|---|---|---|
| `combat.integration.test.ts` | Sword → Enemy, Fireball → Enemy | Real `Player` vs real `CrowHarvester`/`Gravecaller`/`Beast`: the **combat rhythm** (4 / 3 / 5 sword hits to kill) is a contract between two modules’ constants; one swing damages a target once even while the overlap persists; heavy charge accrues only on connecting `SWORD` hits, once per swing regardless of how many enemies are struck; a blocked heavy schedules *nothing* |
| `checkpointRespawn.integration.test.ts` | Checkpoint → Respawn | Real `CheckpointSystem` + `Player` + `LevelEnemies` over the **real Level 1 layout data**: respawn position, full HP and fireball charges, heavy charge *lost*, all enemies revived at full HP, and — as an explicit regression test — that `reset()` **preserves array identity** (colliders bind to the reference) |

**Accepted limitation:** this layer does not run the scenes’ `physics.add.overlap` wiring — the
fake has no physics world. The two `resolve*Hit()` helpers *mirror* the scene rule (and cite the
source lines); the wiring itself is E2E’s job. Stated here rather than hidden.

*The fourth §24 flow (Boss → 50 % → Phase 2) is deliberately omitted — four unit suites already
prove it.*

### 5.3 E2E — `tests/e2e/`, 5 specs, Playwright

Runs against the **production build** (`npm run build` + `vite preview`), because that is what
ships. A shared fixture (`fixtures/game.ts`) gives every test:

- **critical-error watch** — console errors, uncaught exceptions, failed requests and any HTTP
  ≥ 400 fail the test *at teardown*, so Project_plan §28 (“the test must fail even if the game
  appears to work but generates a critical error”) holds for the whole suite from one place;
- **access to game state** via the `window.game` test seam — necessary because the HUD, HP and
  every label are drawn *on the canvas*, not in the DOM;
- **deterministic frame stepping** — `game.loop.stop()` plus fixed-delta `loop.step()`.

| Spec | Tests | Risk | What it does |
|---|---|---|---|
| `smoke.spec.ts` | 5 | R4, R6, R8 | Boot → **active scene is `MainMenuScene`** → all 12 scenes registered → menu renders → real `Enter` keypress starts the game → player sprite exists with a live body. **Runs on both browsers.** |
| `scenes.spec.ts` | 2 | **R1**, R6 | All 11 post-boot scenes: create, run 60 stepped frames, stay active, draw something. Plus **re-entry** into all four boss arenas (scene-restart regression). *Reaches 6 023 otherwise-untested lines.* |
| `progression.spec.ts` | 2 | **R2**, R10 | The **complete door matrix** — 3 levels × flag present/absent = 6 combinations — plus “Start Game clears all 8 progress keys”. |
| `assets.spec.ts` | 5 | R5 | Zero failed loads; all 24 audio files cached with real duration; every animation has frames and points at a real texture; all 13 generated placeholder textures exist; no scene uses `__MISSING`. |
| `visual.spec.ts` | 4 | R7 | Captures the four scene archetypes and attaches them to the report for human review, asserting only that the canvas is not blank. **Not a pixel gate** — see §10.2. |
| `performance.spec.ts` | 2 | R11 | Separate project, `--workers=1`. See §5.5. |

**Why the sweep is one test with steps, not eleven tests:** every Playwright test gets a fresh
page, and each page reloads all 23.5 MB. Eleven tests meant eleven boots and the first version
timed out. One boot, per-scene `test.step()`s, and failures **attributed by scene name** so one
run reports *every* broken scene, not just the first.

### 5.4 Build sanity check — `scripts/check-build.mjs`

The cheapest and highest-value check in the plan. It asserts that `dist/index.html` and the
bundle contain **relative** asset references, not root-absolute ones.

This is the only defect class **no other gate can catch**:

| Gate | Why it misses R3 |
|---|---|
| `tsc --noEmit` | `base` is not a type error |
| `npm run test` | unit tests do not build |
| `npm run build` | **stays green** — the build succeeds, it just writes different paths |
| E2E via `vite preview` | preview serves from the *root*, where `/assets/…` also works |

The defect passes the whole pipeline and only appears on the uploaded game — where it is fatal,
because itch.io serves from a generated sub-path. `vite.config.ts` already warns about this in
prose; this script makes it an executable assertion.

### 5.5 Performance — 2 metrics, on demand

Project_plan §29 lists five candidate metrics and **no numeric budget**. Two are measured; the
budgets are QA-owned baselines, explicitly not spec quotes, and act as **regression tripwires,
not quality gates**.

| Metric | Measured | Budget | Note |
|---|---|---|---|
| Boot (navigation → first scene) | **3 971 ms** | < 45 000 ms | Localhost, warm cache — this measures *processing*, not real-world download of 23.5 MB |
| Level 1 frame time | **p50 16.7 ms (~60 FPS), p95 16.7 ms** | p95 < 33 ms (≈30 FPS) | Zero variance; Level 1 chosen as the heaviest running scene |

Runs in its own Playwright project with `--workers=1`, because measurement under contention is
meaningless: the same p95 read **16.7 ms alone and 51.7 ms** alongside the full suite on six
parallel workers — the game unchanged.

---

## 6. Coverage and traceability

### 6.1 Requirement → risk → test

| Requirement source | Requirement | Risk | Verified by |
|---|---|---|---|
| Project_plan §23 | Player movement, health, damage, death | — | `tests/unit/player.test.ts` *(pre-existing)* |
| Project_plan §23 | Combat damage, cooldown, attack state | R9 | `combat.test.ts` + `combat.integration.test.ts` |
| Project_plan §23 | Enemy HP, damage, death, state transitions | — | `crowHarvester` / `gravecaller` / `beast` tests |
| Project_plan §23 | Boss HP, phase transition, death | — | `boss` / `madKing` / `beastMaster` / `ancientDemon` tests |
| Project_plan §23 | Game state: checkpoint, progression, boss-defeated | R2, R10 | `gameProgress.test.ts` + `checkpointRespawn.integration` + `progression.spec.ts` |
| Project_plan §24 | Sword → Enemy | R9 | `combat.integration.test.ts` |
| Project_plan §24 | Fireball → Enemy | R9 | `combat.integration.test.ts` |
| Project_plan §24 | Checkpoint → Respawn | R10 | `checkpointRespawn.integration.test.ts` |
| Project_plan §24 | Boss → Phase 2 | — | *unit only, by design (§5.2)* |
| Project_plan §25 | Smoke: launch → menu → start → level → player | R4 | `smoke.spec.ts` |
| Project_plan §25 | Movement, combat, fireball E2E | R9 | *integration level, by design (§3.2)* |
| Project_plan §25 | Checkpoint E2E | R10 | `progression.spec.ts` |
| Project_plan §25 | Boss fight, ending E2E | — | *not automated, by design (§3.2); covered by the manual playthrough* |
| Project_plan §26 | Visual regression | R7 | `visual.spec.ts` (review, not gate — §10.2) |
| Project_plan §27 | Cross-browser | R8 | `smoke.spec.ts` on Chromium + Firefox; Safari manual (§7) |
| Project_plan §28 | Console / runtime errors | R6 | E2E fixture, every test |
| Project_plan §29 | Performance | R11 | `performance.spec.ts` |
| Project_plan §30 | Asset integrity | R5 | `assets.spec.ts` + `vite build` + Linux case-sensitivity |
| Project_plan §31 | CI/CD quality gates | — | `.github/workflows/ci.yml` (§8) |
| `level1-layout.md` §13 | All platforms reachable | — | `level1Layout.test.ts` BFS *(pre-existing)* |
| `level1-layout.md` §13 | Traverse START → BossScene | R2 | `progression.spec.ts` + manual playthrough |
| `level1-layout.md` §13 | No console errors during play | R6 | E2E fixture |
| `level2-layout.md` §23 | Level completable with 0 hazard damage | R12 | Manual charter M-3 |
| — *(new, found in this phase)* | itch.io build must work from a sub-path | **R3** | `scripts/check-build.mjs` |

### 6.2 Module coverage

| Area | Unit | Integration | E2E | Status |
|---|---|---|---|---|
| `player/Player.ts` | ✅ | ✅ | ✅ | covered |
| `player/PlayerController.ts` | ❌ | — | ✅ *(menu + door input)* | **partial** — input paths exercised end-to-end, not unit-isolated |
| `combat/*` | ✅ | ✅ | — | covered |
| `enemies/*`, `bosses/*` | ✅ | ✅ | ✅ *(sweep)* | covered |
| `levels/*Layout.ts` | ✅ | ✅ | — | covered |
| `levels/LevelEnemies.ts` | ❌ | ✅ | ✅ | covered |
| `systems/GameProgress`, `DialogueMemory` | ✅ | ✅ | ✅ | covered |
| `systems/CheckpointSystem.ts` | ❌ | ✅ | ✅ | covered |
| `systems/Fullscreen.ts` | ❌ | ❌ | ❌ | **not covered** — manual charter M-4 |
| `scenes/*` (12 files, 6 023 lines) | ❌ *(impossible)* | ❌ | ✅ | covered at the only viable level |
| `main.ts` | ❌ | ❌ | ✅ | covered |

---

## 7. Browser matrix

| Engine | Coverage | Rationale |
|---|---|---|
| **Chromium** | Full suite (18 tests) | Primary target; the widest real-world share |
| **Firefox** | Smoke only (5 tests) | Browser-specific failures — WebGL context, loading, audio policy, input delivery — surface **at startup**, not at the fortieth assertion. Tripling the whole suite would buy runtime, not coverage |
| **WebKit** | ❌ **excluded — measured decision** | See below |
| **Safari (real)** | Manual charter M-5 | The beta testers can open the itch.io link on a Mac/iPhone |

### 7.1 Why WebKit is excluded

Playwright’s WebKit build has **no Web Audio API at all** — `AudioContext`,
`webkitAudioContext` *and* `OfflineAudioContext` are all `undefined` (all three exist in
Chromium and Firefox). Phaser therefore falls back to `HTML5AudioSoundManager`, whose file
loader waits for `canplaythrough` — an event that never fires in this media-stack-less build.

**Result:** `BootScene` stalls permanently at **91/106 files** (the 15 WAV SFX), with zero
failures and an empty load queue. Reproduced identically in headed mode, so not a headless
artifact.

**This is not a game defect and not Safari behaviour** — real Safari has supported Web Audio
since 2012. Playwright’s WebKit is the engine without media codecs, not Safari. “Fixing” the
game here would mean optimising for a broken test browser. Safari coverage therefore moves to
manual (M-5), which is realistic because the game is already on itch.io with beta testers.

---

## 8. CI execution and quality gates

`.github/workflows/ci.yml` — on every push, on PRs to `main`, and on manual dispatch.

```
job: verify            typecheck → unit (967) → integration (23) → build → deploy sanity
job: e2e (needs verify) Playwright: Chromium full + Firefox smoke → report artifact
job: performance        workflow_dispatch only, --workers=1
```

Quality gates, per Project_plan §31 with one addition:

```
Unit tests        PASS
Integration       PASS      <- new
Build             PASS
Deploy sanity     PASS      <- new: guards vite.config base:'./'  (R3)
E2E               PASS
Critical errors   0         <- enforced by the E2E fixture on every test
```

**Design notes.**
`typecheck` is a separate step because `vite build` only *strips* types with esbuild — a green
build does not prove `tsc` is clean, and `tsconfig` includes `tests`, so the test files are
type-checked too. `npm ci` (not `install`) fails loudly if lockfile and manifest diverge.
Playwright browsers (~400 MB) are cached against `package-lock.json`. The Linux runner is
**case-sensitive**, which catches mis-cased asset filenames that Windows hides — a free slice
of §30. The workflow is structured so a Phase 11 Pages deploy job drops in behind the gates.

**Local equivalent** — if these five are green, CI should be too:

```bash
npm run typecheck && npm run test && npm run test:integration && npm run build && npm run check:build
npm run e2e        # Chromium + Firefox
npm run e2e:perf   # on demand, runs alone
```

---

## 9. Manual and exploratory testing

Automation answers *“did anything break?”*. It cannot answer *“is this good?”* — and for a game
that second question carries most of the value.

### 9.1 Release gate — full playthrough (~25 min, mandatory before publishing)

Checklist derived from `level1-layout.md` §13 and `level2-layout.md` §23:

- [ ] Traverse Level 1 START → boss door; all platforms reachable
- [ ] Spikes and reaper deal damage; crossing cleanly costs **0** damage
- [ ] Intermediate checkpoint activates on touch; death respawns there **with enemies revived**
- [ ] All four boss fights: dialogue → title card → music → phase 2 → victory
- [ ] Defeat returns to the correct level, at the correct checkpoint
- [ ] After a defeated boss the door leads **onward**, not back into the arena
- [ ] Ending narration → credits → main menu; a second New Game starts genuinely clean
- [ ] No console errors during the entire run

### 9.2 Exploratory charters

| # | Charter | Why it must be human |
|---|---|---|
| **M-1** | Audio: mix balance, autoplay unlock on first keypress, no double loops when re-entering an arena | Automation can assert *that* a track plays, not whether it sounds right |
| **M-2** | Fullscreen (F11) and window resizing: `Scale.FIT` letterbox, pixel-art crispness at fractional scale | Browser-chrome behaviour; `systems/Fullscreen.ts` is otherwise uncovered |
| **M-3** | Difficulty and feel: is each hazard avoidable? is any boss unfair? is Level 2 completable at 0 hazard damage? | The fairness *numbers* are unit-tested; the *experience* is not mechanisable |
| **M-4** | Dialogue and lore proofreading across all scenes | Text quality |
| **M-5** | **Safari / iOS** via the itch.io link | Not automatable (§7.1) |

### 9.3 Beta feedback — real UAT

The game is on itch.io in draft on a secret URL, played by friends. This is genuine user
acceptance testing and is treated as a first-class input: reported issues are triaged into §11,
and anything reproducible that is also *cheaply automatable* gets a regression test at the
lowest level that catches it.

---

## 10. Known limitations and accepted risks

### 10.1 The integration layer does not run real physics

The fake Phaser has no physics world, so overlap/collider *registration* is not exercised there;
the tests mirror the scene rule instead. Covered at E2E level. **Accepted.**

### 10.2 Visual regression is review, not a gate — with evidence

A conventional `toHaveScreenshot()` baseline suite was built (4 baselines, frozen loop, fixed
frame stepping) and **failed its own validation**:

| Measurement | Result |
|---|---|
| Consecutive clean runs | 1 false failure in 4–5 runs (~10–25 % flake) |
| Moving a decor prop 20 px | **not detected** |
| Moving the same prop 400 px (to screen centre) | detected **1 run in 3** |
| With strict per-pixel `threshold: 0` | *clean* runs differed from each other by 207–9 327 pixels |

Root cause: rendering is genuinely non-deterministic here. Comparing captures showed the
`TutorialHint` label sitting at a **different fade phase** after an identical number of stepped
frames. Making it reliable would require freezing tweens and timers from test-only hooks in
production code — disproportionate for a 20-minute game.

**A gate that fails 25 % of the time on unchanged input while missing real changes is worse than
no gate**: it destroys trust in the whole suite and grants false confidence. Replaced with
screenshot capture attached to the report for human review, backed by two automated checks that
*are* reliable — canvas-not-blank per scene (catches the catastrophic case) and asset integrity
(catches §26’s “asset loading problem”). **Accepted risk:** subtle visual drift is caught by a
human at review time, not by CI.

### 10.3 WebKit / Safari is not automated

See §7.1. Mitigated by manual charter M-5. **Accepted.**

### 10.4 Performance numbers are local, not real-world

Boot time is measured over localhost with a warm cache, so it reflects processing, not the
download of 23.5 MB over a real connection. The 87 %-audio payload remains the largest
real-world performance item (F-05). **Accepted; documented rather than gated.**

### 10.5 `PlayerController` has no unit test

118 lines of branching input logic (the ladder path, the dialogue input freeze). Exercised
end-to-end through menu and door interaction, not unit-isolated. Deliberate: the user’s decision
is that no new unit tests are added before the planned audit. **Accepted.**

### 10.6 E2E reaches into private scene fields

`progression.spec.ts` touches `scene.player` / `scene.doorZone`, which are `private` in
TypeScript but plain properties at runtime, because the scenes expose no test surface. A rename
will fail this spec loudly — an acceptable price over adding production test hooks.

---

## 11. QA findings

### 11.1 Static review findings (before writing any test)

| # | Finding | Severity | Status |
|---|---|---|---|
| F-01 | `phaserTestUtils.ts` documented a `vitest.config.ts` and a `tests/unit/setup/phaserMock.ts` that never existed — misleading for maintainers | Low | ✅ fixed |
| F-02 | Project_plan §31 states “vitest, 12 files / 265 tests”; actual is 34 / 967 | Low | ✅ fixed |
| F-03 | §38 “Ending works” unchecked although the ending shipped 2026-08-30 | Low | ✅ fixed |
| F-04 | `src/assets/hero.png` is an orphan, referenced nowhere | Trivial | Open — safe to delete |
| F-05 | 23.55 MB preloaded before the menu is reachable, 87 % of it audio | Medium | Open — measured (§5.5), accepted for now |
| F-06 | No `typecheck` npm script; CI called `npx tsc --noEmit` inline, so local and CI gates could drift | Low | ✅ fixed |
| F-07 | Scene-private constants (`CHECKPOINT_REGISTRY_KEY`, `NEXT_SCENE_KEY`, …) could silently drift from `PROGRESS_REGISTRY_KEYS` | Medium | ✅ verified consistent; now guarded by `progression.spec.ts` |

### 11.2 Findings from building the suite

| # | Finding | Severity | Status |
|---|---|---|---|
| F-08 | The game never finishes booting under Playwright WebKit — stalls at 91/106 files. Diagnosed to a missing Web Audio API in that build, **not** a game defect | Medium *(test env)* | ✅ documented, §7.1 |
| F-09 | **False green:** an orphaned `vite preview` server made Playwright reuse a stale build, so an injected real bug passed. Found only because fault injection was run | **High** *(process)* | ✅ fixed — `reuseExistingServer: false` |
| F-10 | **False green:** `build && preview` inside `webServer` let tests start against the previous build (results lagged one run) | **High** *(process)* | ✅ fixed — build is now a separate step before Playwright |
| F-11 | Pixel-diff visual regression proved unreliable in both directions | Medium | ✅ redesigned, §10.2 |
| F-12 | Treating every `console.warn` as fatal drowned the suite in headless GPU driver messages | Low | ✅ fixed — targeted Phaser-warning patterns |
| F-13 | The scene sweep as 11 separate tests reloaded 23.5 MB eleven times and timed out | Low | ✅ fixed — one boot, per-scene steps |

**No functional defect was found in the game itself during this phase.** The scene sweep, the
progression matrix and the asset audit all pass on the first run — which, given that 6 023 lines
of scene code had never been under test, is a meaningful result in its own right.

### 11.3 Fault injection — proving the tests can fail

A green suite proves nothing until it has been shown to go red. Each new layer was validated by
deliberately reintroducing a realistic defect:

| Injected defect | Expected to fail | Result |
|---|---|---|
| `START_SCENE = 'BossScene'` *(happened for real once)* | `smoke.spec.ts` | ✅ 2 tests failed, naming the wrong active scene |
| `Level2Scene` door ignores `kingDefeated` *(a real historical bug)* | `progression.spec.ts` | ✅ failed with `Level2Scene [kingDefeated]: expected Level3Scene, got NarrationScene` |
| `vite.config.ts` `base: '/'` | `check:build` | ✅ build stayed green; the check failed, listing 1 + 69 root-absolute references |
| Typo in a texture key | `assets.spec.ts` | ✅ all 5 failed; the key one named `zero-frame animations: player-idle` |
| Decor prop moved 20 px | `visual.spec.ts` | ❌ **not detected** → led to F-11 and the redesign in §10.2 |

The last row is the most valuable one: it is why the visual layer was rebuilt rather than
shipped green and useless.

---

## 12. Test execution summary

| Layer | Files | Tests | Runtime | Where |
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

Last full run: **all green**, 2026-09-08.

---

## 13. QA iteration history

### Iteration 1 — Phase 10 foundation *(2026-09-08)*

**Scope:** build the pyramid above the existing unit suite — integration, E2E, visual,
cross-browser, performance, CI.

**Added:** `window.game` test seam in `main.ts`; `scripts/check-build.mjs`; 2 integration files
(23 tests); Playwright config plus 5 E2E specs and a shared fixture (25 tests); CI extended from
3 steps to 2 jobs with 6 gates; npm scripts for every layer; this document.

**Key findings:** F-08 (WebKit cannot run the game — test-environment limitation, not a defect),
F-09 and F-10 (two independent *false green* mechanisms, both found by fault injection),
F-11 (pixel-diff visual regression unreliable → redesigned as reviewed capture).

**Fixed:** F-01, F-02, F-03, F-06, F-09, F-10, F-11, F-12, F-13.

**Defects found in the game:** none. 6 023 previously untested scene lines now pass.

**Remaining risk:** subtle visual drift (human review only, §10.2); Safari (manual, §7.1);
`PlayerController` not unit-isolated (§10.5); 23.5 MB preload (F-05).

**Next:** unit-test audit (are all 967 earning their place?); Phase 11 deploy job behind the
existing gates.

---

## 14. Document change history

| Date | Change |
|---|---|
| 2026-09-08 | Created. Covers Phase 10 iteration 1. |
