// Enemy (Hollow) unit tesztek — Project_plan.md §23 "Unit testing / Enemy" bontása
// szerint: HP, damage, death, state transitions.
//
// Két teszt-blokk közvetlen regressziós védelmet ad a session során manuálisan
// megtalált és javított hibáknak: a "csak vízszintes irányban detektáljanak" (vertikális
// küszöb hiánya) és a "pörgés" (irány-jitter egy vertikálisan elérhetetlen célnál).
//
// A Hollow.update(player) egy valódi Player-típust vár — ehhez a megosztott harness-szel
// létrehozott, valódi (mock-alapú) Player példányokat használunk teszt-adatként, nem
// laza duck-typing + `as Player` castot. Így a resolveAttackHit() teszt valódi
// player.getHP() csökkenést tud ellenőrizni, nem csak mock-hívás-számlálást.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import Hollow, {
  HollowState,
  MAX_HP,
  DETECTION_RANGE,
  VERTICAL_DETECTION_RANGE,
  LOSE_RANGE,
  ATTACK_RANGE,
  ATTACK_DAMAGE,
} from '../../src/enemies/Hollow';
import Player, { MAX_HP as PLAYER_MAX_HP } from '../../src/player/Player';
import {
  createMockScene,
  getBody,
  createDelayedCallStepper,
  type MockScene,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

const HOLLOW_X = 500;
const HOLLOW_Y = 400;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

describe('Hollow', () => {
  let scene: MockScene;
  let hollow: Hollow;

  beforeEach(() => {
    scene = createMockScene();
    hollow = new Hollow(scene as unknown as Phaser.Scene, HOLLOW_X, HOLLOW_Y);
  });

  describe('HP', () => {
    it('új Hollow: HP a maximumon', () => {
      expect(hollow.getHP()).toBe(MAX_HP);
      expect(hollow.getMaxHP()).toBe(MAX_HP);
    });
  });

  describe('damage', () => {
    it('takeDamage: csökkenti a HP-t', () => {
      hollow.takeDamage(10);
      expect(hollow.getHP()).toBe(MAX_HP - 10);
    });

    it('takeDamage: nem megy 0 alá', () => {
      hollow.takeDamage(MAX_HP + 50);
      expect(hollow.getHP()).toBe(0);
    });

    it('takeDamage PATROL alatt azonnal CHASE-be vált', () => {
      expect(hollow.hollowState).toBe(HollowState.PATROL);
      hollow.takeDamage(1);
      expect(hollow.hollowState).toBe(HollowState.CHASE);
    });

    it('takeDamage DEAD állapotban nem csinál semmit', () => {
      hollow.takeDamage(MAX_HP);
      expect(hollow.isDead()).toBe(true);

      hollow.takeDamage(1);
      expect(hollow.getHP()).toBe(0);
      expect(hollow.hollowState).toBe(HollowState.DEAD);
    });
  });

  describe('death', () => {
    it('takeDamage(MAX_HP): azonnal DEAD, velocity nullázva, body letiltva', () => {
      hollow.takeDamage(MAX_HP);

      expect(hollow.isDead()).toBe(true);
      expect(hollow.hollowState).toBe(HollowState.DEAD);
      expect(getBody(hollow).velocity.x).toBe(0);
      expect(getBody(hollow).velocity.y).toBe(0);
      expect(getBody(hollow).enable).toBe(false);
    });

    it('DEAD állapotban update() no-op', () => {
      hollow.takeDamage(MAX_HP);
      const player = createPlayerAt(scene, HOLLOW_X, HOLLOW_Y);

      expect(() => hollow.update(player)).not.toThrow();
      expect(hollow.hollowState).toBe(HollowState.DEAD);
    });
  });

  describe('state transitions', () => {
    it('PATROL->CHASE csak akkor, ha vízszintesen ÉS vertikálisan is közel van a player', () => {
      // Csak vízszintesen közel, de vertikálisan távol -> marad PATROL.
      // Ez a "csak vízszintes irányban detektáljanak" hiba regressziós tesztje.
      const farVertically = createPlayerAt(
        scene,
        HOLLOW_X + 50,
        HOLLOW_Y - (VERTICAL_DETECTION_RANGE + 50)
      );
      hollow.update(farVertically);
      expect(hollow.hollowState).toBe(HollowState.PATROL);
    });

    it('PATROL->CHASE csak vertikálisan közel, de vízszintesen távol -> marad PATROL', () => {
      const farHorizontally = createPlayerAt(
        scene,
        HOLLOW_X + DETECTION_RANGE + 50,
        HOLLOW_Y
      );
      hollow.update(farHorizontally);
      expect(hollow.hollowState).toBe(HollowState.PATROL);
    });

    it('PATROL->CHASE, ha mindkét tengelyen a küszöbön belül van a player', () => {
      const near = createPlayerAt(scene, HOLLOW_X + 50, HOLLOW_Y - 10);
      hollow.update(near);
      expect(hollow.hollowState).toBe(HollowState.CHASE);
    });

    it('CHASE->PATROL, ha a player vízszintesen LOSE_RANGE-en túlra kerül', () => {
      const near = createPlayerAt(scene, HOLLOW_X + 50, HOLLOW_Y);
      hollow.update(near); // CHASE-be vált

      near.x = HOLLOW_X + LOSE_RANGE + 50;
      hollow.update(near);
      expect(hollow.hollowState).toBe(HollowState.PATROL);
    });

    it('CHASE->ATTACK, ha a player ATTACK_RANGE-en belül van', () => {
      const near = createPlayerAt(scene, HOLLOW_X + 50, HOLLOW_Y);
      hollow.update(near); // CHASE-be vált

      near.x = HOLLOW_X + ATTACK_RANGE - 5;
      hollow.update(near);
      expect(hollow.hollowState).toBe(HollowState.ATTACK);
    });

    it('ATTACK->COOLDOWN->CHASE, és a startup lépésnél valódi sebzés éri a playert', () => {
      const near = createPlayerAt(scene, HOLLOW_X + 50, HOLLOW_Y);
      hollow.update(near); // CHASE

      near.x = HOLLOW_X + ATTACK_RANGE - 5;
      hollow.update(near); // ATTACK, startAttack() ütemez egy delayedCallt
      expect(hollow.hollowState).toBe(HollowState.ATTACK);

      const stepper = createDelayedCallStepper(scene);
      // A resolveAttackHit() a Player.takeDamage()-en keresztül SAJÁT delayedCallt is
      // ütemez ugyanezen a scene-en (a HURT-tint törléséhez) — ezért a köztes COOLDOWN
      // állapot után a maradékot flushRemaining()-nel intézzük, nem egy második next()-tel.
      stepper.next(); // ATTACK_STARTUP_MS -> resolveAttackHit() + COOLDOWN
      expect(hollow.hollowState).toBe(HollowState.COOLDOWN);
      expect(near.getHP()).toBe(PLAYER_MAX_HP - ATTACK_DAMAGE);

      stepper.flushRemaining(); // player HURT-clear + Hollow ATTACK_COOLDOWN_MS -> CHASE
      expect(hollow.hollowState).toBe(HollowState.CHASE);
    });

    it('clampChaseToBounds: platform-kötött Hollow megáll a peremnél, nem sétál tovább', () => {
      // A mock nem szimulálja a fizikai integrációt (velocity -> pozíció), ezért a
      // Hollow pozícióját explicit a perem-határra állítjuk — ez felel meg annak, mint
      // ha korábbi frame-eken a valódi fizika már odavitte volna a CHASE mozgás során.
      const boundedHollow = new Hollow(scene as unknown as Phaser.Scene, HOLLOW_X, HOLLOW_Y, {
        patrolMinX: HOLLOW_X - 40,
        patrolMaxX: HOLLOW_X + 40,
        clampChaseToBounds: true,
      });
      boundedHollow.hollowState = HollowState.CHASE;
      boundedHollow.x = HOLLOW_X + 40; // már a jobb oldali peremen áll

      // A player tovább jobbra van, de nem elég közel az ATTACK_RANGE-hez, és
      // LOSE_RANGE-en belül marad -> a clamp-ágnak kell aktiválódnia.
      const beyondBounds = createPlayerAt(scene, HOLLOW_X + 40 + ATTACK_RANGE + 20, HOLLOW_Y);
      boundedHollow.update(beyondBounds);

      expect(boundedHollow.hollowState).toBe(HollowState.CHASE);
      expect(getBody(boundedHollow).velocity.x).toBe(0);
    });

    it('DIRECTION_DEADZONE: elérhetetlen, de vízszintesen közel álló player nem okoz sebesség-oszcillációt', () => {
      // A player majdnem pontosan a Hollow felett van (kicsi horizontalDistance),
      // de olyan messze vertikálisan, hogy a teljes 2D távolság > ATTACK_RANGE.
      // Ez a "pörgés" hiba regressziós tesztje.
      const unreachable = createPlayerAt(scene, HOLLOW_X + 1, HOLLOW_Y - 200);
      hollow.takeDamage(1); // PATROL -> CHASE, sebzésen keresztül (távolságtól függetlenül)
      expect(hollow.hollowState).toBe(HollowState.CHASE);

      hollow.update(unreachable);
      const velocityAfterFirst = getBody(hollow).velocity.x;
      hollow.update(unreachable);
      const velocityAfterSecond = getBody(hollow).velocity.x;

      expect(velocityAfterFirst).toBe(0);
      expect(velocityAfterSecond).toBe(0);
    });
  });
});
