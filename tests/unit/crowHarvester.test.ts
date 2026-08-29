// Enemy (CrowHarvester) unit tesztek — Project_plan.md §23 "Unit testing / Enemy" bontása
// szerint: HP, damage, death, state transitions.
//
// Két teszt-blokk közvetlen regressziós védelmet ad a session során manuálisan
// megtalált és javított hibáknak: a "csak vízszintes irányban detektáljanak" (vertikális
// küszöb hiánya) és a "pörgés" (irány-jitter egy vertikálisan elérhetetlen célnál).
//
// A CrowHarvester.update(player) egy valódi Player-típust vár — ehhez a megosztott harness-szel
// létrehozott, valódi (mock-alapú) Player példányokat használunk teszt-adatként, nem
// laza duck-typing + `as Player` castot. Így a resolveAttackHit() teszt valódi
// player.getHP() csökkenést tud ellenőrizni, nem csak mock-hívás-számlálást.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import CrowHarvester, {
  CrowHarvesterState,
  MAX_HP,
  DETECTION_RANGE,
  VERTICAL_DETECTION_RANGE,
  LOSE_RANGE,
  ATTACK_RANGE,
  ATTACK_DAMAGE,
} from '../../src/enemies/CrowHarvester';
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

const HARVESTER_X = 500;
const HARVESTER_Y = 400;

function createPlayerAt(scene: MockScene, x: number, y: number): Player {
  const player = new Player(scene as unknown as Phaser.Scene, x, y);
  player.x = x;
  player.y = y;
  return player;
}

describe('CrowHarvester', () => {
  let scene: MockScene;
  let crowHarvester: CrowHarvester;

  beforeEach(() => {
    scene = createMockScene();
    crowHarvester = new CrowHarvester(scene as unknown as Phaser.Scene, HARVESTER_X, HARVESTER_Y);
  });

  describe('HP', () => {
    it('új CrowHarvester: HP a maximumon', () => {
      expect(crowHarvester.getHP()).toBe(MAX_HP);
      expect(crowHarvester.getMaxHP()).toBe(MAX_HP);
    });
  });

  describe('damage', () => {
    it('takeDamage: csökkenti a HP-t', () => {
      crowHarvester.takeDamage(10);
      expect(crowHarvester.getHP()).toBe(MAX_HP - 10);
    });

    it('takeDamage: nem megy 0 alá', () => {
      crowHarvester.takeDamage(MAX_HP + 50);
      expect(crowHarvester.getHP()).toBe(0);
    });

    it('takeDamage PATROL alatt azonnal CHASE-be vált', () => {
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.PATROL);
      crowHarvester.takeDamage(1);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.CHASE);
    });

    it('takeDamage DEAD állapotban nem csinál semmit', () => {
      crowHarvester.takeDamage(MAX_HP);
      expect(crowHarvester.isDead()).toBe(true);

      crowHarvester.takeDamage(1);
      expect(crowHarvester.getHP()).toBe(0);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.DEAD);
    });
  });

  describe('death', () => {
    it('takeDamage(MAX_HP): azonnal DEAD, velocity nullázva, body letiltva', () => {
      crowHarvester.takeDamage(MAX_HP);

      expect(crowHarvester.isDead()).toBe(true);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.DEAD);
      expect(getBody(crowHarvester).velocity.x).toBe(0);
      expect(getBody(crowHarvester).velocity.y).toBe(0);
      expect(getBody(crowHarvester).enable).toBe(false);
    });

    it('DEAD állapotban update() no-op', () => {
      crowHarvester.takeDamage(MAX_HP);
      const player = createPlayerAt(scene, HARVESTER_X, HARVESTER_Y);

      expect(() => crowHarvester.update(player)).not.toThrow();
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.DEAD);
    });

    it('a haláltusa hangját a die() emittálja', () => {
      const spy = vi.fn();
      crowHarvester.on('harvester-death', spy);
      crowHarvester.takeDamage(MAX_HP);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    // A LEGFONTOSABB állítás a hang körül. A destroy() a state-et közvetlenül DEAD-re
    // állítja, die() hívása NÉLKÜL — és a scene-ek resetEnemies()-e a player minden
    // halálakor az ÖSSZES lényt megsemmisíti. Ha az emit valaha a destroy()-ba kerülne,
    // minden respawn egy 9 (Level 1) illetve 14 (Level 2) hangos haláltusa-kórussal
    // indulna, amit kézi teszten könnyű a "sok enemy" számlájára írni.
    it('a destroy() NEM emittál haláltusát (respawn-kórus elleni védelem)', () => {
      const spy = vi.fn();
      crowHarvester.on('harvester-death', spy);
      crowHarvester.destroy();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // A Level1Scene a player halálakor megsemmisíti és újraspawnolja az összes enemyt
  // (resetEnemies()), tehát a destroy() már nem csak scene-shutdownkor fut le, hanem
  // menet közben, akár egy ÉPP TÁMADÓ lényen.
  describe('destroy (in-scene enemy reset)', () => {
    it('DEAD-re állít, hogy a függő delayedCall-ok inertté váljanak', () => {
      crowHarvester.destroy();

      expect(crowHarvester.isDead()).toBe(true);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.DEAD);
    });

    it('a windup közben megsemmisített lény MÁR NEM sebzi meg a playert', () => {
      const near = createPlayerAt(scene, HARVESTER_X + 50, HARVESTER_Y);
      crowHarvester.update(near); // CHASE

      near.x = HARVESTER_X + ATTACK_RANGE - 5;
      crowHarvester.update(near); // ATTACK — startAttack() ütemezi a startup delayedCallt
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.ATTACK);

      // A reset a windup KÖZBEN kapja el: a sebzés-callback még ütemezve van.
      crowHarvester.destroy();
      createDelayedCallStepper(scene).next(); // ATTACK_STARTUP_MS

      expect(near.getHP()).toBe(PLAYER_MAX_HP);
    });

    it('felszabadítja a debug HP-szöveget és leállítja a futó tweeneket', () => {
      crowHarvester.takeDamage(MAX_HP); // die() -> elhalványító tween indul
      crowHarvester.destroy();

      expect(scene.tweens.killTweensOf).toHaveBeenCalledWith(crowHarvester);
      // A hpText az egyetlen scene-objektum, amit a CrowHarvester maga hoz létre.
      const hpText = scene.add.text.mock.results[0].value as { destroyed: boolean };
      expect(hpText.destroyed).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('PATROL->CHASE csak akkor, ha vízszintesen ÉS vertikálisan is közel van a player', () => {
      // Csak vízszintesen közel, de vertikálisan távol -> marad PATROL.
      // Ez a "csak vízszintes irányban detektáljanak" hiba regressziós tesztje.
      const farVertically = createPlayerAt(
        scene,
        HARVESTER_X + 50,
        HARVESTER_Y - (VERTICAL_DETECTION_RANGE + 50)
      );
      crowHarvester.update(farVertically);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.PATROL);
    });

    it('PATROL->CHASE csak vertikálisan közel, de vízszintesen távol -> marad PATROL', () => {
      const farHorizontally = createPlayerAt(
        scene,
        HARVESTER_X + DETECTION_RANGE + 50,
        HARVESTER_Y
      );
      crowHarvester.update(farHorizontally);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.PATROL);
    });

    it('PATROL->CHASE, ha mindkét tengelyen a küszöbön belül van a player', () => {
      const near = createPlayerAt(scene, HARVESTER_X + 50, HARVESTER_Y - 10);
      crowHarvester.update(near);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.CHASE);
    });

    it('CHASE->PATROL, ha a player vízszintesen LOSE_RANGE-en túlra kerül', () => {
      const near = createPlayerAt(scene, HARVESTER_X + 50, HARVESTER_Y);
      crowHarvester.update(near); // CHASE-be vált

      near.x = HARVESTER_X + LOSE_RANGE + 50;
      crowHarvester.update(near);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.PATROL);
    });

    it('CHASE->ATTACK, ha a player ATTACK_RANGE-en belül van', () => {
      const near = createPlayerAt(scene, HARVESTER_X + 50, HARVESTER_Y);
      crowHarvester.update(near); // CHASE-be vált

      near.x = HARVESTER_X + ATTACK_RANGE - 5;
      crowHarvester.update(near);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.ATTACK);
    });

    it('ATTACK->COOLDOWN->CHASE, és a startup lépésnél valódi sebzés éri a playert', () => {
      const near = createPlayerAt(scene, HARVESTER_X + 50, HARVESTER_Y);
      crowHarvester.update(near); // CHASE

      near.x = HARVESTER_X + ATTACK_RANGE - 5;
      crowHarvester.update(near); // ATTACK, startAttack() ütemez egy delayedCallt
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.ATTACK);

      const stepper = createDelayedCallStepper(scene);
      // A resolveAttackHit() a Player.takeDamage()-en keresztül SAJÁT delayedCallt is
      // ütemez ugyanezen a scene-en (a HURT-tint törléséhez) — ezért a köztes COOLDOWN
      // állapot után a maradékot flushRemaining()-nel intézzük, nem egy második next()-tel.
      stepper.next(); // ATTACK_STARTUP_MS -> resolveAttackHit() + COOLDOWN
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.COOLDOWN);
      expect(near.getHP()).toBe(PLAYER_MAX_HP - ATTACK_DAMAGE);

      stepper.flushRemaining(); // player HURT-clear + CrowHarvester ATTACK_COOLDOWN_MS -> CHASE
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.CHASE);
    });

    it('chaseMaxX: a felület peremén megáll üldözés közben, nem sétál le', () => {
      // A mock nem szimulálja a fizikai integrációt (velocity -> pozíció), ezért a
      // CrowHarvester pozícióját explicit a perem-határra állítjuk — ez felel meg annak, mint
      // ha korábbi frame-eken a valódi fizika már odavitte volna a CHASE mozgás során.
      const boundedCrowHarvester = new CrowHarvester(
        scene as unknown as Phaser.Scene,
        HARVESTER_X,
        HARVESTER_Y,
        {
          patrolMinX: HARVESTER_X - 40,
          patrolMaxX: HARVESTER_X + 40,
          chaseMinX: HARVESTER_X - 40,
          chaseMaxX: HARVESTER_X + 40,
        }
      );
      boundedCrowHarvester.crowHarvesterState = CrowHarvesterState.CHASE;
      boundedCrowHarvester.x = HARVESTER_X + 40; // már a jobb oldali peremen áll

      // A player tovább jobbra van, de nem elég közel az ATTACK_RANGE-hez, és
      // LOSE_RANGE-en belül marad -> a perem-ágnak kell aktiválódnia.
      const beyondBounds = createPlayerAt(scene, HARVESTER_X + 40 + ATTACK_RANGE + 20, HARVESTER_Y);
      boundedCrowHarvester.update(beyondBounds);

      expect(boundedCrowHarvester.crowHarvesterState).toBe(CrowHarvesterState.CHASE);
      expect(getBody(boundedCrowHarvester).velocity.x).toBe(0);
    });

    it('az üldözés a PATROL körzeten TÚL is folytatódik, a chase-határig', () => {
      // Ez a finomhangolás lényege: a séta-körzet szűk, az üldözés viszont a felület
      // pereméig tart. Korábban a kettő egybe volt mosva, ezért a földi enemy a saját
      // patrol-határán (a pálya közepén) láthatatlan falba ütközött.
      const wideChase = new CrowHarvester(
        scene as unknown as Phaser.Scene,
        HARVESTER_X,
        HARVESTER_Y,
        {
          patrolMinX: HARVESTER_X - 40,
          patrolMaxX: HARVESTER_X + 40,
          chaseMinX: HARVESTER_X - 400,
          chaseMaxX: HARVESTER_X + 400,
        }
      );
      wideChase.crowHarvesterState = CrowHarvesterState.CHASE;
      wideChase.x = HARVESTER_X + 40; // a patrol-körzet jobb peremén

      const ahead = createPlayerAt(scene, HARVESTER_X + 40 + ATTACK_RANGE + 20, HARVESTER_Y);
      wideChase.update(ahead);

      // Nem áll meg: a patrol-határ már nem kapu az üldözésnek.
      expect(getBody(wideChase).velocity.x).toBeGreaterThan(0);
    });

    it('üldözési határ NÉLKÜL korlátlanul üldöz (a default nem zár be senkit)', () => {
      const unbounded = new CrowHarvester(
        scene as unknown as Phaser.Scene,
        HARVESTER_X,
        HARVESTER_Y,
        { patrolMinX: HARVESTER_X - 40, patrolMaxX: HARVESTER_X + 40 }
      );
      unbounded.crowHarvesterState = CrowHarvesterState.CHASE;
      unbounded.x = HARVESTER_X + 5000;

      const farAhead = createPlayerAt(scene, HARVESTER_X + 5000 + ATTACK_RANGE + 20, HARVESTER_Y);
      unbounded.update(farAhead);

      expect(getBody(unbounded).velocity.x).toBeGreaterThan(0);
    });

    it('DIRECTION_DEADZONE: elérhetetlen, de vízszintesen közel álló player nem okoz sebesség-oszcillációt', () => {
      // A player majdnem pontosan a CrowHarvester felett van (kicsi horizontalDistance),
      // de olyan messze vertikálisan, hogy a teljes 2D távolság > ATTACK_RANGE.
      // Ez a "pörgés" hiba regressziós tesztje.
      const unreachable = createPlayerAt(scene, HARVESTER_X + 1, HARVESTER_Y - 200);
      crowHarvester.takeDamage(1); // PATROL -> CHASE, sebzésen keresztül (távolságtól függetlenül)
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.CHASE);

      crowHarvester.update(unreachable);
      const velocityAfterFirst = getBody(crowHarvester).velocity.x;
      crowHarvester.update(unreachable);
      const velocityAfterSecond = getBody(crowHarvester).velocity.x;

      expect(velocityAfterFirst).toBe(0);
      expect(velocityAfterSecond).toBe(0);
    });
  });

  // A csapás hangját a scene játssza le erre az eventre (mint a Player 'sword-swing'-jét).
  describe("'harvester-attack' event (a csapás SFX kiváltója)", () => {
    /** CHASE-en át ATTACK-be viszi a lényt; a startup callback ütemezve marad. */
    function startAttackOn(harvester: CrowHarvester): Player {
      const near = createPlayerAt(scene, HARVESTER_X + 50, HARVESTER_Y);
      harvester.update(near); // CHASE
      near.x = HARVESTER_X + ATTACK_RANGE - 5;
      harvester.update(near); // ATTACK
      return near;
    }

    // A windup egy MOZDULATLAN, magasba emelt kasza-póz: a hang nem oda tartozik, hanem
    // a fehér ívhez — vagyis a startup VÉGÉRE, oda, ahol a sebzés is feloldódik.
    it('a windup alatt NEM szól, csak a csapás lépésénél', () => {
      const onSwing = vi.fn();
      crowHarvester.on('harvester-attack', onSwing);

      startAttackOn(crowHarvester);
      expect(crowHarvester.crowHarvesterState).toBe(CrowHarvesterState.ATTACK);
      expect(onSwing).not.toHaveBeenCalled();

      createDelayedCallStepper(scene).next(); // ATTACK_STARTUP_MS
      expect(onSwing).toHaveBeenCalledTimes(1);
    });

    // Az emit a DEAD guard MÖGÖTT van: a windup alatt megölt lény már nem csap hangosan.
    it('a windup alatt megölt lény NEM emittál', () => {
      const onSwing = vi.fn();
      crowHarvester.on('harvester-attack', onSwing);

      startAttackOn(crowHarvester);
      crowHarvester.takeDamage(MAX_HP); // DEAD még a startup lejárta előtt

      createDelayedCallStepper(scene).next(); // a csapás callbackje lefut, de korán visszatér
      expect(onSwing).not.toHaveBeenCalled();
    });
  });
});
