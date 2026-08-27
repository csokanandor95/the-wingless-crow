# Level 1 – Cathedral Ruins
## Phaser Implementation Layout

## 1. General
- Logical resolution: 800x450
- Side-scrolling 2D platformer
- Player starts at the left side.
- Level progresses left → right.
- Camera follows player.
- Level ends at BossScene transition.

## 2. Level Flow

START
  ↓
Movement tutorial
  ↓
First enemy
  ↓
Basic combat tutorial
  ↓
Gap / platforming and few Crowharvester enemies
  ↓
Static spikes
  ↓
Combat + platforming + first casting enemy
  ↓
Swinging reaper hazard
  ↓
Casting and Crowharvester enemies
  ↓
Ladder at the end of level leading to safe area & checkpoint
  ↓
Boss entrance (door)
  ↓
BossScene

## 3. Section A – Starting Area

Purpose:
- Teach movement and jumping (key bindings appear on screen for a short time).

Elements:
- Starting platform
- 2–3 simple platforms

Requirements:
- Player can test movement.

## 4. Section B – First Enemy

Purpose:
- Introduce combat (key bindings appear on screen for a short time).

Elements:
- One CrowHarvester enemy
- Wide platform
- No environmental hazard

Layout:

────────────────────────────
        PLAYER      ENEMY
────────────────────────────

Requirements:
- Enemy should be defeated using basic sword attack or fireball.
- Player should have enough space to learn attack timing.

## 5. Section C – First Platforming Challenge

Elements:
- Gap on the floor
- 2–3 floating platforms
- Different platform heights
- If player falls into the gap on the floor he dies and respawns at level start with enemies respawned as well

Requirements:
- Falling triggers player death/respawn according to existing game logic.
- Platform spacing must be achievable with the current jump parameters.

## 6. Section D – Spike Tutorial

Purpose:
- Introduce environmental damage.

Elements:
- Static spike floor
- Safe platform before and after spikes

Layout:

──────────    ^^^^^^^^^^    ──────────
              SPIKES

Requirements:
- Contact causes damage.
- Spikes must have a clearly identifiable visual representation.
- Player must be able to jump over them.
- CrowHarvaster enemy does not walk into or jump over spikes.

## 7. Section E – Combined Challenge

Elements:
- Floating platforms
- Many CrowHarvesters
- 1 Caster enemy
- Small gap
- Elevated platform

Purpose:
- Combine combat and platforming.

## 9. Section F – Swinging Reaper

Purpose:
- Introduce timing-based moving hazard.

Elements:
- Ceiling anchor
- Hanging reaper/scythe
- Swinging motion
- Damage hitbox
- Platforms requiring timed movement

Concept:

                 ●
                 │
                 │
                 │
                ╲
                 ╲
                  ☠
                   ╲

────────────       ────────────
       ↑
     PLAYER

Requirements:
- Reaper swings between approximately -45° and +45°.
- Damage is applied on contact.
- Movement is deterministic.
- Player must be able to observe the pattern before committing to the jump.

## 7. Section G – Final combat

Elements:
- 1 Caster enemy after swing reaper
- 2 CrowHarvesters guarding the ladder to the boss entrance

Purpose:
- Final combat before entering boss arena.

## 10. Section H – Boss Entrance

Elements:
- Short, safe upper platform, reachable by a ladder
- Boss door / transition trigger

On entering the trigger:
→ transition to BossScene.

## 11. Design Constraints

- Do not introduce additional gameplay mechanics unless explicitly requested.
- Keep all challenges achievable with the existing player movement.
- Avoid unavoidable damage.
- Hazards must have readable visual telegraphing.
- Level should progressively increase difficulty.
- Keep the tutorial section safe and simple.
- Use placeholder assets if final assets are not available.

## 12. Implementation Requirements

Implement using:
- Phaser
- TypeScript
- Existing project architecture
- Existing Player class
- Existing enemy/combat systems
- Existing checkpoint system

Do not rewrite existing systems unless required.

Implement level geometry and objects as separate, maintainable components where practical.

Make the current Level1Scene longer. 

## 13. Acceptance Criteria

- Player can traverse the complete level from START to BossScene.
- All platforms are reachable.
- Spike collision causes damage.
- Reaper collision causes damage.
- Checkpoint activates correctly.
- Player death/respawn works.
- Camera follows player correctly.
- Boss transition works.
- No console errors during normal gameplay.