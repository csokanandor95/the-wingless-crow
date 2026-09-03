import Phaser from 'phaser';
import AudioManager, {
  LEVEL_MUSIC_FADE_IN_MS,
  LEVEL_MUSIC_VOLUME,
  MUSIC_KEYS,
} from '../systems/AudioManager';
import { resetProgress } from '../systems/GameProgress';
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';
import {
  BACKGROUND_COLOR,
  CONTROLS_FONT_SIZE_PX,
  CONTROLS_HINT,
  CONTROLS_HINT_Y,
  CONTROLS_LABEL_COLOR,
  CONTROLS_LABEL_X,
  CONTROLS_PANEL,
  CONTROLS_ROWS,
  CONTROLS_TITLE,
  CONTROLS_TITLE_Y,
  CONTROLS_VALUE_COLOR,
  CONTROLS_VALUE_X,
  controlsRowY,
  HINT_COLOR,
  HINT_FONT_SIZE_PX,
  ITEM_FONT_SIZE_PX,
  MENU_CARET,
  MENU_CARET_X,
  MENU_HINT,
  MENU_HINT_Y,
  MENU_ITEM_COLOR,
  MENU_ITEM_STEP_Y,
  MENU_ITEMS,
  MENU_LABEL_X,
  MENU_PANEL,
  MENU_SELECTED_COLOR,
  MENU_TITLE,
  MENU_TITLE_COLOR,
  MENU_TITLE_Y,
  menuItemY,
  PANEL_BORDER_ALPHA,
  PANEL_BORDER_COLOR,
  PANEL_FILL_ALPHA,
  PANEL_FILL_COLOR,
  PANEL_PADDING,
  TITLE_FONT_SIZE_PX,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  wrapSelection,
  type MainMenuAction,
} from '../ui/MainMenuLayout';

/**
 * A játék fogadóképernyője — innen indul a lánc, és ide tér vissza a `CreditsScene`.
 *
 * `Start Game` -> `PreScene` · `Controls` -> IN-SCENE lap · `Credits` -> `CreditsScene`.
 * **`Exit Game` nincs** (user-döntés): egy böngészőfül nem zárhatja be magát.
 *
 * MINDEN geometria, szín és szöveg a `ui/MainMenuLayout.ts`-ben él — ez a fájl csak rajzol és
 * vált. Az oka a bevett kényszer: a `fakePhaser` nem ad `Scene` osztályt, tehát ez a modul
 * unit tesztből nem importálható, a layout viszont igen.
 *
 * A CONTROLS SZÁNDÉKOSAN NEM külön scene, hanem nézetváltás ezen belül. Ez kényszer, nem
 * ízlés: az `AudioManager` scene-hatókörű és a SHUTDOWN-on megsemmisül (CLAUDE.md 6.
 * tanulság), tehát egy külön Controls-scene minden be- és kilépéskor levágná és elölről
 * indítaná a menüzenét.
 */

const FADE_IN_MS = 600;
const FADE_OUT_MS = 700;

const PRE_SCENE_KEY = 'PreScene';
const CREDITS_SCENE_KEY = 'CreditsScene';

/** A `Dialogue` mélység-receptje: a panel, fölötte egy szinttel a szövegei. */
const PANEL_DEPTH = 90;
const TEXT_DEPTH = 91;

enum MainMenuView {
  MENU = 'MENU',
  CONTROLS = 'CONTROLS',
}

export default class MainMenuScene extends Phaser.Scene {
  private audio!: AudioManager;

  /** EGYETLEN Graphics mindkét panelhez — nézetváltáskor `clear()` + újrarajzolás. */
  private panel!: Phaser.GameObjects.Graphics;

  private menuObjects: Phaser.GameObjects.Text[] = [];
  private controlsObjects: Phaser.GameObjects.Text[] = [];
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private caret!: Phaser.GameObjects.Text;

  private selection = 0;
  private view: MainMenuView = MainMenuView.MENU;
  private isTransitioning = false;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    // A class field initializerek CSAK a Scene első létrehozásakor futnak le (CLAUDE.md
    // "Fontos technikai tanulságok" 3.) — ide pedig a CreditsScene felől VISSZATÉRÜNK, tehát a
    // create() másodszor is lefut ugyanezen a példányon. A három tömb enélkül a legutóbbi
    // shutdown által MÁR MEGSEMMISÍTETT GameObjectekre mutató referenciákat halmozna, és a
    // showView() setVisible()-je azokon dobna.
    this.menuObjects = [];
    this.controlsObjects = [];
    this.itemTexts = [];
    this.selection = 0;
    this.view = MainMenuView.MENU;
    this.isTransitioning = false;

    // Kézi takarítás nem kell: az AudioManager maga iratkozik fel a scene shutdownjára.
    this.audio = new AudioManager(this);

    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.cameras.main.fadeIn(FADE_IN_MS);

    this.createBackground();
    this.panel = this.add.graphics().setDepth(PANEL_DEPTH);
    this.createMenuView();
    this.createControlsView();
    this.showView(MainMenuView.MENU);
    this.registerInput();

    // A menü az ELSŐ scene a Boot után, tehát a böngésző audio contextje itt még ZÁROLT: a
    // playMusic() az UNLOCKED eseményre halasztja a lejátszást, és a zene az első
    // billentyűleütésnél/kattintásnál kezd szólni. Ez helyes böngésző-viselkedés, nem hiba —
    // és pont ezért kap hosszú, "ambient" fade-int, hogy ne robbanjon be az első leütésre.
    this.audio.playMusic(MUSIC_KEYS.MENU_THEME, {
      volume: LEVEL_MUSIC_VOLUME,
      fadeInMs: LEVEL_MUSIC_FADE_IN_MS,
    });
  }

  /**
   * Álló, teljes képernyős háttér — NEM ParallaxBackground: a kamera fix, és a kép pontosan
   * 800x450, tehát nincs mit eltolni és skálázni sem kell.
   *
   * TINT NINCS: a menüsáv mért fényessége mean 32,2 — a festmény eleve sötét. A helyi fényes
   * foltokat (max 124: rózsaablak, kivilágított ablakok) nem tinttel, hanem a panel fedésével
   * kezeljük, tehát csak a szöveg mögött, ahol tényleg zavarnának.
   */
  private createBackground(): void {
    this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, BACKGROUND_TEXTURES.MAIN_MENU).setDepth(-30);
  }

  /**
   * MINDEN szöveg BALRA IGAZÍTOTT, egész x-en (`setOrigin(0, 0.5)`).
   *
   * Ez a 29. technikai tanulság megkerülése FOGALMI szinten: a `setOrigin(0.5)` + `pixelArt`
   * páros páratlan szövegszélességnél fél pixelre esik, amit a `TutorialHint` `Math.round()`-dal
   * javít. Itt nincs mit kerekíteni — a horgony eleve egész. (A háttérkép az egyetlen kivétel,
   * de az pontosan 800x450, tehát a (400, 225) középpontja is egész.)
   */
  private createMenuView(): void {
    this.menuObjects.push(
      this.addText(MENU_LABEL_X, MENU_TITLE_Y, MENU_TITLE, TITLE_FONT_SIZE_PX, MENU_TITLE_COLOR)
    );

    this.caret = this.addText(MENU_CARET_X, menuItemY(0), MENU_CARET, ITEM_FONT_SIZE_PX, MENU_SELECTED_COLOR);
    this.menuObjects.push(this.caret);

    MENU_ITEMS.forEach((item, index) => {
      const text = this.addText(
        MENU_LABEL_X,
        menuItemY(index),
        item.label,
        ITEM_FONT_SIZE_PX,
        MENU_ITEM_COLOR
      );
      this.itemTexts.push(text);
      this.menuObjects.push(text);

      // Kattintófelület: a panel teljes szélességét lefedő, LÁTHATATLAN zóna — nem a Text saját
      // bounds-a. A sorok balra igazítottak és eltérő hosszúak, tehát a szöveg-bounds egy rövid
      // címkénél bosszantóan kicsi céltábla lenne.
      // A magassága a SORKÖZ, hogy a zónák hézag nélkül érjenek össze.
      const zone = this.add
        .zone(
          MENU_PANEL.x + PANEL_PADDING,
          menuItemY(index),
          MENU_PANEL.width - PANEL_PADDING * 2,
          MENU_ITEM_STEP_Y
        )
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerover', () => this.hoverSelection(index));
      zone.on('pointerdown', () => {
        this.hoverSelection(index);
        this.confirm();
      });
    });

    this.menuObjects.push(
      this.addText(MENU_CARET_X, MENU_HINT_Y, MENU_HINT, HINT_FONT_SIZE_PX, HINT_COLOR)
    );
  }

  private createControlsView(): void {
    this.controlsObjects.push(
      this.addText(
        CONTROLS_LABEL_X,
        CONTROLS_TITLE_Y,
        CONTROLS_TITLE,
        TITLE_FONT_SIZE_PX,
        MENU_TITLE_COLOR
      )
    );

    CONTROLS_ROWS.forEach((row, index) => {
      const y = controlsRowY(index);

      // Üres címke = az előző sor folytatása; ilyenkor nem születik arany címke-objektum.
      if (row.label.length > 0) {
        this.controlsObjects.push(
          this.addText(CONTROLS_LABEL_X, y, row.label, CONTROLS_FONT_SIZE_PX, CONTROLS_LABEL_COLOR)
        );
      }

      this.controlsObjects.push(
        this.addText(CONTROLS_VALUE_X, y, row.value, CONTROLS_FONT_SIZE_PX, CONTROLS_VALUE_COLOR)
      );
    });

    this.controlsObjects.push(
      this.addText(CONTROLS_LABEL_X, CONTROLS_HINT_Y, CONTROLS_HINT, HINT_FONT_SIZE_PX, HINT_COLOR)
    );
  }

  private addText(
    x: number,
    y: number,
    value: string,
    fontSizePx: number,
    color: string
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, value, {
        fontFamily: 'monospace',
        fontSize: `${fontSizePx}px`,
        color,
      })
      .setOrigin(0, 0.5)
      .setDepth(TEXT_DEPTH);
  }

  private showView(view: MainMenuView): void {
    this.view = view;
    const rect = view === MainMenuView.MENU ? MENU_PANEL : CONTROLS_PANEL;

    // A clear() KÖTELEZŐ: enélkül a Controls panelje RÁ rajzolódna a menüére, és két egymáson
    // ülő téglalap látszana.
    this.panel.clear();
    this.panel.fillStyle(PANEL_FILL_COLOR, PANEL_FILL_ALPHA);
    this.panel.fillRect(rect.x, rect.y, rect.width, rect.height);
    this.panel.lineStyle(1, PANEL_BORDER_COLOR, PANEL_BORDER_ALPHA);
    this.panel.strokeRect(rect.x, rect.y, rect.width, rect.height);

    const menuVisible = view === MainMenuView.MENU;
    for (const object of this.menuObjects) object.setVisible(menuVisible);
    for (const object of this.controlsObjects) object.setVisible(!menuVisible);

    if (menuVisible) this.refreshSelection();
  }

  private refreshSelection(): void {
    this.itemTexts.forEach((text, index) => {
      text.setColor(index === this.selection ? MENU_SELECTED_COLOR : MENU_ITEM_COLOR);
    });
    this.caret.setY(menuItemY(this.selection));
  }

  private registerInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    // A KeyboardPlugin a scene leállásakor magától leiratkoztat (a NarrationScene/CreditsScene
    // mintája), tehát a Credits felőli visszatéréskor sem duplikálódnak a listenerek.
    keyboard.on('keydown-UP', () => this.moveSelection(-1));
    keyboard.on('keydown-W', () => this.moveSelection(-1));
    keyboard.on('keydown-DOWN', () => this.moveSelection(1));
    keyboard.on('keydown-S', () => this.moveSelection(1));
    keyboard.on('keydown-ENTER', () => this.confirm());
    keyboard.on('keydown-SPACE', () => this.confirm());
    keyboard.on('keydown-ESC', () => this.cancel());
  }

  private moveSelection(delta: number): void {
    if (this.isTransitioning || this.view !== MainMenuView.MENU) return;

    this.selection = wrapSelection(this.selection, delta, MENU_ITEMS.length);
    this.refreshSelection();
  }

  /** Egér-hover: csak kijelöl, nem választ. */
  private hoverSelection(index: number): void {
    if (this.isTransitioning || this.view !== MainMenuView.MENU) return;

    this.selection = index;
    this.refreshSelection();
  }

  private confirm(): void {
    if (this.isTransitioning) return;

    if (this.view === MainMenuView.CONTROLS) {
      this.showView(MainMenuView.MENU);
      return;
    }

    const action: MainMenuAction = MENU_ITEMS[this.selection].action;
    switch (action) {
      case 'start':
        this.startGame();
        break;
      case 'controls':
        this.showView(MainMenuView.CONTROLS);
        break;
      case 'credits':
        this.leaveTo(CREDITS_SCENE_KEY);
        break;
    }
  }

  /** Esc: a Controls lapról vissza. A menüben nincs hova — ezért ott no-op (nincs Exit sem). */
  private cancel(): void {
    if (this.isTransitioning || this.view !== MainMenuView.CONTROLS) return;

    this.showView(MainMenuView.MENU);
  }

  private startGame(): void {
    // Új játék TISZTA lappal. A registry GAME-szintű, tehát a legyőzött bossok flagjei, a
    // checkpointok és a látott párbeszédek különben átszivárognának egy előző végigjátszásból.
    // Ez ITT van, és nem a CreditsScene-ben: az új játék ITT kezdődik.
    resetProgress(this.registry);
    this.leaveTo(PRE_SCENE_KEY);
  }

  private leaveTo(sceneKey: string): void {
    this.isTransitioning = true;

    // A zene a KÉPPEL EGYÜTT halkul el; a scene shutdownja önmagában is elvágná, de fade
    // nélkül, pont a fekete képernyő pillanatában.
    this.audio.stopMusic(FADE_OUT_MS);

    // FADE_OUT_COMPLETE, nem a fadeOut() callbackje: utóbbi a fade MINDEN frame-jén lefutna
    // (CLAUDE.md 4. tanulság).
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey);
    });
    this.cameras.main.fadeOut(FADE_OUT_MS, 0, 0, 0);
  }

  // `update()` SZÁNDÉKOSAN NINCS — szemben a projekt összes többi scene-jével. A menü tisztán
  // eseményvezérelt: nincs benne se animáció, se időzítés, amit frame-enként léptetni kellene.
}
