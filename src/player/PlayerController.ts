import Phaser from 'phaser';
import Player from './Player';

export default class PlayerController {
  private player: Player;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: { [key: string]: Phaser.Input.Keyboard.Key };

  /**
   * Ki lehet-e kapcsolni az inputot menet közben (párbeszéd alatt) — lásd `setEnabled()`.
   * Alapból `true`, tehát minden meglévő hívó viselkedése változatlan.
   */
  private enabled = true;

  constructor(scene: Phaser.Scene, player: Player) {
    this.player = player;

    if (!scene.input.keyboard) {
      throw new Error('Keyboard input plugin nem elérhető.');
    }

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE,J,K,F') as {
      [key: string]: Phaser.Input.Keyboard.Key;
    };

    this.keys.J.on('down', () => {
      if (this.enabled) this.player.attack();
    });
    // A heavy-nek billentyűs útja IS van: a játék eddig teljesen játszható volt egér
    // nélkül (J = kard, F = tűzgolyó), és ez nem veszhet el egy új támadással.
    this.keys.K.on('down', () => {
      if (this.enabled) this.player.heavyAttack();
    });
    this.keys.F.on('down', () => {
      if (this.enabled) this.player.castFireball();
    });

    // A context menü letiltása KÖTELEZŐ, mert a jobb gomb megint játékbeli akció (heavy):
    // enélkül minden nagy csapásra felugrana a böngésző-menü a canvas fölött.
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.enabled) return;
      if (pointer.leftButtonDown()) this.player.attack();
      else if (pointer.rightButtonDown()) this.player.heavyAttack();
    });
  }

  /**
   * Az input teljes ki-/bekapcsolása — a `Level1Scene` ezzel fagyasztja be a playert a ház
   * előtti párbeszéd idejére.
   *
   * **Az `update()` kihagyása önmagában NEM elég**, ezért kell ez: a konstruktor a `J` / `K` /
   * `F` billentyűre és a `pointerdown`-ra listenereket regisztrál, tehát a player a monológ
   * alatt is kardot suhinthatna és tűzgolyót dobhatna. A `Boss2Scene` trükkje ("a controllert csak a
   * harc előtt hozzuk létre") itt nem alkalmazható, mert a player a párbeszéd ELŐTT és UTÁN is
   * sétál; a `PreScene`-é (saját, minimális input) sem, mert ez harci pálya.
   *
   * A kapcsoló egyben lezárja a CLAUDE.md 17. tanulságában dokumentált nyitott kockázatot is:
   * a listenerek élettartamát nem kell kezelni, mert nem jönnek-mennek.
   *
   * **A hívó feladata**, hogy kikapcsolt állapotban maga hívja a `player.stopMoving()`-ot és a
   * `player.updateState()`-et — enélkül a player a futó animáción ragadna (a `PreScene`
   * `DIALOGUE` fázisának azonos mintája).
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  update(): void {
    if (!this.enabled) return;

    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const jumpKey = this.keys.SPACE.isDown;

    // Létra-ág: akkor aktív, ha a player létrával fedésben van ÉS mászni akar
    // (vagy már mászik). Így a felső platformon állva – ahol még fedésben van a
    // létrával – a normál mozgás működik tovább.
    if (this.player.isOnLadder() && (up || down || this.player.isClimbing())) {
      // Vízszintes input MINDIG kilép a létráról, így nem lehet beragadni
      // (pl. a létra alján, talajon állva, lefelé nyomva).
      if (left) {
        this.player.exitLadder();
        this.player.moveLeft();
      } else if (right) {
        this.player.exitLadder();
        this.player.moveRight();
      } else if (jumpKey) {
        this.player.jumpOffLadder();
      } else if (up) {
        this.player.climb(-1);
      } else if (down) {
        this.player.climb(1);
      } else {
        this.player.climbIdle();
      }

      this.player.updateState();
      return;
    }

    if (left) {
      this.player.moveLeft();
    } else if (right) {
      this.player.moveRight();
    } else {
      this.player.stopMoving();
    }

    if (up || jumpKey) {
      this.player.jump();
    }

    this.player.updateState();
  }
}