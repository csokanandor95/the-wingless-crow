import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MainMenuScene from './scenes/MainMenuScene';
import PreScene from './scenes/PreScene';
import Level1Scene from './scenes/Level1Scene';
import BossScene from './scenes/BossScene';
import NarrationScene from './scenes/NarrationScene';
import Level2Scene from './scenes/Level2Scene';
import Boss2Scene from './scenes/Boss2Scene';
import Level3Scene from './scenes/Level3Scene';
import Boss3Scene from './scenes/Boss3Scene';
import FinalBossScene from './scenes/FinalBossScene';
import CreditsScene from './scenes/CreditsScene';
import { GRAVITY_Y } from './config/physics';
import { registerFullscreenToggle } from './systems/Fullscreen';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0a0f',
  // Kötelező a pixel art sprite-okhoz: enélkül a Phaser bilineárisan szűri a textúrákat,
  // és a knight sheetek elmosódnak.
  pixelArt: true,
  // A LOGIKAI felbontás VÁLTOZATLANUL 800x450 (a `ui/MainMenuLayout.VIEW_WIDTH/HEIGHT`, minden
  // `Level*Layout` és mind a négy boss-aréna ebből dolgozik) — a `scale` blokk KIZÁRÓLAG azt
  // írja le, hogy ez a 800x450-es vászon hogyan JELENIK MEG a böngészőben.
  //
  //  - `FIT`: a vászon a szülőelem méretéig nő, de az arányt (16:9) MEGTARTVA, tehát sosem
  //    torzul, és a teljes játéktér látszik (a maradék hely letterbox marad). A `NONE` fix
  //    méretet, az `ENVELOP` pedig levágást adna — utóbbi sértené a "minden látszódjon" elvet.
  //  - `CENTER_BOTH`: a letterbox mindkét tengelyen szimmetrikus.
  //  - `RESIZE` SZÁNDÉKOSAN NEM: az a scene-eknek adná át a valódi méretet, tehát minden
  //    layout-konstans elavulna.
  //
  // A Scale Manager a pointer-koordinátákat magától visszaskálázza a logikai térbe, ezért az
  // egérrel vezérelt elemek (a főmenü zónái, a bal/jobb klikkes támadás) változatlanul működnek.
  // A `FIT` tört nagyítást is adhat (pl. 1440px-es ablakon 1,8x); ELMOSÓDÁST ez nem okoz, mert
  // az `index.html` `image-rendering: pixelated`-je nearest-neighbor felskálázást kér a
  // böngészőtől — a `pixelArt: true` csak a Phaseren BELÜLI textúraszűrésre hat, a vászon
  // CSS-nyújtására nem.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 450,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // Phaser 4-ben a gravity Vector2Like, tehát az x is kötelező (Phaser 3-ban nem volt az).
      // Az érték a config/physics.ts-ből jön: a Level1Layout ugyanebből vezeti le a maximális
      // ugrásmagasságot és -távolságot, amikhez a pálya szakadékai méretezve vannak.
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false,
    },
  },
  // A lánc sorrendben: MainMenu -> PreScene -> Level 1 -> Boss 1 -> Level 2 -> Boss 2 ->
  // Level 3 -> Boss 3 -> Final -> ending -> credits -> vissza a MainMenu-be. A regisztráció
  // ÉLESÍTI a korábbi scene-ek feltételes ágait: a Boss2Scene győzelme a Level3Scene-t keresi,
  // a Level3Scene ajtaja a Boss3Scene-t, a Boss3Scene győzelme pedig a FinalBossScene-t.
  // A BootScene marad ELSŐ: a Phaser azt indítja automatikusan.
  scene: [
    BootScene,
    MainMenuScene,
    PreScene,
    Level1Scene,
    BossScene,
    NarrationScene,
    Level2Scene,
    Boss2Scene,
    Level3Scene,
    Boss3Scene,
    FinalBossScene,
    CreditsScene,
  ],
};

registerFullscreenToggle(new Phaser.Game(config));