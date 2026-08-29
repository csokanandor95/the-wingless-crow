// Player unit tesztek — Project_plan.md §23 "Unit testing / Player" bontása szerint:
// movement calculation, health, damage, death, respawn.
//
// A "respawn" NINCS lefedve: a funkció még nem létezik a kódban (nincs
// systems/CheckpointSystem.ts, a Player.die() csak letiltja a physics bodyt).
// Pótlandó, ha a checkpoint rendszer elkészül (Phase 6 hátralévő része).
//
// A 'phaser' modult a megosztott fake-re cseréljük (tests/unit/helpers/fakePhaser.ts).
// A vi.mock() hívást a vitest a fájl saját importjai FÖLÉ hoisztolja — ezért a factory
// nem hivatkozhat statikusan importált binding-ra (TDZ hiba). Dinamikus import()-tal
// a factory TESTÉN belül ez elkerülhető, mert az csak akkor fut le, amikor a mock
// ténylegesen kell, nem a hoisztolt helyen.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Phaser from 'phaser';
import Player, {
  PlayerState,
  MOVE_SPEED,
  JUMP_VELOCITY,
  MAX_HP,
  CLIMB_SPEED,
  type LadderContact,
} from '../../src/player/Player';
import { FOOTSTEP_INTERVAL_MS } from '../../src/player/PlayerAnimations';
import {
  createMockScene,
  getBody,
  flushAllDelayedCalls,
  type MockScene,
} from './helpers/phaserTestUtils';

vi.mock('phaser', async () => {
  const { createFakePhaserModule } = await import('./helpers/fakePhaser');
  return createFakePhaserModule();
});

function setGrounded(player: Player, grounded: boolean): void {
  getBody(player).blocked.down = grounded;
}

describe('Player', () => {
  let scene: MockScene;
  let player: Player;

  beforeEach(() => {
    scene = createMockScene();
    player = new Player(scene as unknown as Phaser.Scene, 100, 200);
  });

  describe('movement calculation', () => {
    it('moveLeft: negatív X sebesség, balra néz, RUN state földön', () => {
      setGrounded(player, true);
      player.moveLeft();

      expect(getBody(player).velocity.x).toBe(-MOVE_SPEED);
      expect(player.flipX).toBe(true);
      expect(player.playerState).toBe(PlayerState.RUN);
    });

    it('moveRight: pozitív X sebesség, jobbra néz, RUN state földön', () => {
      setGrounded(player, true);
      player.moveRight();

      expect(getBody(player).velocity.x).toBe(MOVE_SPEED);
      expect(player.flipX).toBe(false);
      expect(player.playerState).toBe(PlayerState.RUN);
    });

    it('moveLeft/moveRight levegőben nem vált RUN state-re', () => {
      setGrounded(player, false);
      player.moveRight();

      expect(getBody(player).velocity.x).toBe(MOVE_SPEED);
      expect(player.playerState).not.toBe(PlayerState.RUN);
    });

    it('stopMoving: nullázza az X sebességet, IDLE state földön', () => {
      setGrounded(player, true);
      player.moveRight();
      player.stopMoving();

      expect(getBody(player).velocity.x).toBe(0);
      expect(player.playerState).toBe(PlayerState.IDLE);
    });

    it('jump: földön állva JUMP_VELOCITY és JUMP state', () => {
      setGrounded(player, true);
      player.jump();

      expect(getBody(player).velocity.y).toBe(JUMP_VELOCITY);
      expect(player.playerState).toBe(PlayerState.JUMP);
    });

    it('jump: levegőben nem csinál semmit', () => {
      setGrounded(player, false);
      player.jump();

      expect(getBody(player).velocity.y).toBe(0);
      expect(player.playerState).not.toBe(PlayerState.JUMP);
    });

    it.each([PlayerState.ATTACK, PlayerState.CAST, PlayerState.HURT, PlayerState.DEAD])(
      'zárolt %s állapotban a mozgás-parancsok nem csinálnak semmit',
      (lockedState) => {
        setGrounded(player, true);
        player.playerState = lockedState;

        player.moveLeft();
        player.moveRight();
        player.stopMoving();
        player.jump();

        expect(getBody(player).velocity.x).toBe(0);
        expect(getBody(player).velocity.y).toBe(0);
        expect(player.playerState).toBe(lockedState);
      }
    );

    describe('létra / mászás', () => {
      const ladder: LadderContact = { centerX: 100, topY: 50, bottomY: 250 };

      it('climb(-1): CLIMB state, gravitáció ki, felfelé mozgás', () => {
        player.setLadderContact(ladder);
        player.climb(-1);

        expect(player.playerState).toBe(PlayerState.CLIMB);
        expect(getBody(player).setAllowGravity).toHaveBeenCalledWith(false);
        expect(getBody(player).velocity.y).toBe(-CLIMB_SPEED);
        expect(player.isClimbing()).toBe(true);
      });

      it('climb(-1): a pozíció a topY-nál clampelődik, ha már túllépte', () => {
        // A climb() csak akkor clampel, ha a pozíció (az előző képkocka fizikai
        // lépése miatt) MÁR túllépte a határt — a valódi mozgást a fizika-motor
        // végzi a beállított velocity alapján, nem ez a metódus.
        player.setLadderContact(ladder);
        player.y = ladder.topY - 5;
        player.climb(-1);

        expect(player.y).toBe(ladder.topY);
        expect(getBody(player).velocity.y).toBe(0);
      });

      it('climb(1): a pozíció a bottomY-nál clampelődik, ha már túllépte', () => {
        player.setLadderContact(ladder);
        player.y = ladder.bottomY + 5;
        player.climb(1);

        expect(player.y).toBe(ladder.bottomY);
        expect(getBody(player).velocity.y).toBe(0);
      });

      it('climb(): ladder kontaktus nélkül nem csinál semmit', () => {
        player.climb(-1);

        expect(player.playerState).not.toBe(PlayerState.CLIMB);
        expect(player.isClimbing()).toBe(false);
      });

      it('exitLadder: visszakapcsolja a gravitációt, FALL state levegőben', () => {
        setGrounded(player, false);
        player.setLadderContact(ladder);
        player.climb(-1);

        player.exitLadder();

        expect(player.isClimbing()).toBe(false);
        expect(getBody(player).setAllowGravity).toHaveBeenLastCalledWith(true);
        expect(player.playerState).toBe(PlayerState.FALL);
      });

      it('exitLadder: IDLE state földön', () => {
        setGrounded(player, true);
        player.setLadderContact(ladder);
        player.climb(-1);

        player.exitLadder();

        expect(player.playerState).toBe(PlayerState.IDLE);
      });
    });
  });

  describe('health', () => {
    it('új player: HP a maximumon', () => {
      expect(player.getHP()).toBe(MAX_HP);
      expect(player.getMaxHP()).toBe(MAX_HP);
    });
  });

  describe('damage', () => {
    it('takeDamage: azonnal csökkenti a HP-t és HURT state-be vált', () => {
      player.takeDamage(30);

      expect(player.getHP()).toBe(MAX_HP - 30);
      expect(player.playerState).toBe(PlayerState.HURT);
    });

    it('takeDamage: nem megy 0 alá', () => {
      player.takeDamage(MAX_HP + 50);

      expect(player.getHP()).toBe(0);
    });

    it('takeDamage: DEAD állapotban nem csinál semmit', () => {
      player.takeDamage(MAX_HP);
      flushAllDelayedCalls(scene);
      expect(player.isDead()).toBe(true);

      const callsBefore = scene.time.delayedCall.mock.calls.length;
      player.takeDamage(10);

      expect(player.getHP()).toBe(0);
      expect(scene.time.delayedCall.mock.calls.length).toBe(callsBefore);
    });

    it('takeDamage: mászás közben lelöki a létráról', () => {
      const ladder: LadderContact = { centerX: 100, topY: 50, bottomY: 250 };
      player.setLadderContact(ladder);
      player.climb(-1);
      expect(player.isClimbing()).toBe(true);

      player.takeDamage(10);

      expect(player.isClimbing()).toBe(false);
      expect(getBody(player).setAllowGravity).toHaveBeenLastCalledWith(true);
    });
  });

  describe('death', () => {
    it('takeDamage(MAX_HP) után a delayedCall lefutva: DEAD state, isDead() true', () => {
      player.takeDamage(MAX_HP);
      flushAllDelayedCalls(scene);

      expect(player.isDead()).toBe(true);
      expect(player.playerState).toBe(PlayerState.DEAD);
      expect(getBody(player).velocity.x).toBe(0);
      expect(getBody(player).velocity.y).toBe(0);
      expect(getBody(player).enable).toBe(false);
    });

    it('DEAD állapotban a mozgás-parancsok nem csinálnak semmit', () => {
      player.takeDamage(MAX_HP);
      flushAllDelayedCalls(scene);

      setGrounded(player, true);
      player.moveLeft();
      player.jump();

      expect(getBody(player).velocity.x).toBe(0);
      expect(getBody(player).velocity.y).toBe(0);
      expect(player.playerState).toBe(PlayerState.DEAD);
    });
  });

  // A hangokat a SCENE játssza le, a Player csak eseményt bocsát ki — így az entitás nem
  // függ az AudioManagertől, a kibocsátás pedig itt megfigyelhető. Ezek a tesztek a
  // KIBOCSÁTÁS FELTÉTELEIT őrzik, nem a hangot.
  describe('hang-események', () => {
    function listen(event: string): ReturnType<typeof vi.fn> {
      const spy = vi.fn();
      player.on(event, spy);
      return spy;
    }

    describe('ugrás', () => {
      it('földről ugorva emittál', () => {
        const spy = listen('player-jump');
        setGrounded(player, true);
        player.jump();

        expect(spy).toHaveBeenCalledTimes(1);
      });

      // A guard MÖGÖTT van: a levegőben hiába nyomott ugrás ne adjon hangot.
      it('levegőben NEM emittál', () => {
        const spy = listen('player-jump');
        setGrounded(player, false);
        player.jump();

        expect(spy).not.toHaveBeenCalled();
      });
    });

    describe('halál', () => {
      it('a halálos sebzés PONTOSAN egyszer emittál', () => {
        const spy = listen('player-death');
        player.takeDamage(MAX_HP);
        flushAllDelayedCalls(scene);

        expect(spy).toHaveBeenCalledTimes(1);
      });

      // A zuhanás-halál a scene-ben `takeDamage(getHP())`-ként jön be, tehát ugyanezen az
      // ágon fut le — nem kell hozzá külön esemény.
      // A DEAD-guard a takeDamage() ELSŐ sorában van, tehát egy már halott playeren a
      // hívás semmit nem ütemez — így a die() (és vele a nyögés) nem futhat kétszer.
      // Azt mérjük, hogy nem keletkezik ÚJ delayedCall; a spy újra-flusholása félrevezető
      // lenne, mert a teszt-helper mindig a 0. indextől játssza vissza a callbackeket.
      it('a már halott playert újra sebezve nem indul új halál-lánc', () => {
        const spy = listen('player-death');
        player.takeDamage(MAX_HP);
        flushAllDelayedCalls(scene);
        expect(spy).toHaveBeenCalledTimes(1);

        const scheduledBefore = scene.time.delayedCall.mock.calls.length;
        player.takeDamage(10);

        expect(scene.time.delayedCall.mock.calls.length).toBe(scheduledBefore);
      });
    });

    // A projekt EGYETLEN ismétlődő SFX-e: nem diszkrét eseményre szól, hanem kadenciára.
    describe('lépés-kadencia', () => {
      function startRunning(): ReturnType<typeof vi.fn> {
        const spy = listen('footstep');
        setGrounded(player, true);
        player.moveRight();
        return spy;
      }

      // Enélkül a futás indulása egy teljes intervallumig néma lenne — pont az a pillanat,
      // aminek a legtöbb súlya van.
      it('a RUN-ba lépés ELSŐ lépése azonnal szól', () => {
        const spy = startRunning();
        player.updateState();

        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('az intervallumon belül nem lép újra, utána igen', () => {
        const spy = startRunning();
        player.updateState();

        scene.time.now = FOOTSTEP_INTERVAL_MS - 1;
        player.updateState();
        expect(spy).toHaveBeenCalledTimes(1);

        scene.time.now = FOOTSTEP_INTERVAL_MS;
        player.updateState();
        expect(spy).toHaveBeenCalledTimes(2);
      });

      it('állva (IDLE) nem lép', () => {
        const spy = listen('footstep');
        setGrounded(player, true);
        player.stopMoving();
        player.updateState();

        expect(spy).not.toHaveBeenCalled();
      });

      it('levegőben nem lép, még RUN state-ből érkezve sem', () => {
        const spy = startRunning();
        setGrounded(player, false);
        player.updateState();

        expect(spy).not.toHaveBeenCalled();
      });

      it('létrán mászva nem lép', () => {
        const spy = listen('footstep');
        player.setLadderContact({ centerX: 100, topY: 100, bottomY: 300 });
        player.climb(-1);
        player.updateState();

        expect(spy).not.toHaveBeenCalled();
      });

      // A megállás nullázza a kadenciát, tehát az ÚJRAINDULÁS is azonnal szól — nem a
      // korábbi ritmus maradék idejét kell kivárni.
      it('megállás után az újrainduló futás azonnal lép', () => {
        const spy = startRunning();
        player.updateState();

        player.stopMoving();
        player.updateState();

        scene.time.now = 10; // jóval az intervallumon belül
        player.moveRight();
        player.updateState();

        expect(spy).toHaveBeenCalledTimes(2);
      });
    });
  });
});
