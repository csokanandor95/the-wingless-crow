// Megosztott mock-scene/body/segédfüggvények a unit ÉS az integration tesztekhez. Ez a fájl
// csak a Player/CrowHarvester/Fireball konstruktorai által elvárt scene-felületet és néhány
// időzítés-vezérlő helpert ad.
//
// A 'phaser' modul mockolása NEM itt és NEM globálisan történik: minden teszt fájl a saját
// elején hívja a `vi.mock('phaser', ...)`-t a helpers/fakePhaser.ts factoryjával. Globális
// `setupFiles` NEM működött, a vitest `vi.mock()` hoisting-ja miatt (lásd a CLAUDE.md
// Phase 10 szakaszát) — ezért nincs `vitest.config.ts` sem.
//
// (A fájl korábbi fejléce egy `vitest.config.ts` `setupFiles`-ét és egy
// `tests/unit/setup/phaserMock.ts`-t emlegetett; EGYIK SEM LÉTEZETT soha. A Phase 10 QA
// átvizsgálása találta meg, F-01 néven.)
import { vi } from 'vitest';
import type Phaser from 'phaser';

export function createMockBody() {
  return {
    velocity: { x: 0, y: 0 },
    // left/right: a boss charge-ja ebből olvassa ki, hogy falnak ütközött-e.
    blocked: { down: false, left: false, right: false },
    touching: { down: false },
    checkCollision: { down: true },
    enable: true,
    setAllowGravity: vi.fn(),
    setSize: vi.fn(),
    // A Player konstruktora ezzel illeszti a bodyt a 128x64-es sprite frame-en belüli
    // rajzolt karakterre.
    setOffset: vi.fn(),
    reset: vi.fn(),
  };
}

export interface MockZone {
  body: unknown;
  x: number;
  y: number;
  width: number;
  height: number;
  setData: ReturnType<typeof vi.fn>;
  getData: ReturnType<typeof vi.fn>;
}

// A geometriát (x/y/width/height) a SpikeField tesztje olvassa vissza: azt bizonyítja, hogy
// a sebző zóna a mező KÖZEPÉN ül, a talaj felszínén, és a behúzás a mező egészére vonatkozik.
function createMockZone(x = 0, y = 0, width = 0, height = 0): MockZone {
  const data = new Map<string, unknown>();
  return {
    body: null,
    x,
    y,
    width,
    height,
    // Stateful: a Player attack-hitboxa setData('damage', ...)-vel ír, a
    // Level1Scene (és a tesztek) getData('damage')-vel olvassák vissza.
    setData: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    }),
    getData: vi.fn((key: string) => data.get(key)),
  };
}

export interface MockSound {
  key: string;
  volume: number;
  isPlaying: boolean;
  play: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

// A Phaser hangobjektumának minimális mása: annyit tud, amennyit az AudioManager használ.
// A `volume` sima mező, mert a fade-et tween írja (`targets: sound, volume: ...`).
export function createMockSound(key: string): MockSound {
  const sound: MockSound = {
    key,
    volume: 0,
    isPlaying: false,
    play: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
  };

  sound.play.mockImplementation(() => {
    sound.isPlaying = true;
    return true;
  });
  sound.stop.mockImplementation(() => {
    sound.isPlaying = false;
    return true;
  });
  sound.destroy.mockImplementation(() => {
    sound.isPlaying = false;
  });

  return sound;
}

/**
 * Laza tween-konfig típus a mockhoz. Azért kell explicit paramétertípus a `tweens.add`
 * mockon, mert paraméter nélküli `vi.fn()` esetén a `mock.calls` üres tuple-ként (`[]`)
 * tipizálódik, és a tesztek nem tudják kiolvasni belőle a konfigot.
 */
export interface MockTweenConfig {
  targets?: unknown;
  duration?: number;
  onComplete?: () => void;
  [key: string]: unknown;
}

function createMockTween() {
  return { stop: vi.fn() };
}

/**
 * Az `add.image()` minimális mása az AfterImageTrail-hez: minden setter láncolható, és a
 * beállított értékek visszaolvashatók, hogy a teszt ellenőrizhesse a forrás sprite
 * geometriájának (origin, flip, scale) átmásolását.
 */
export interface MockImage {
  x: number;
  y: number;
  texture: string;
  frame: string | number;
  originX: number;
  originY: number;
  flipX: boolean;
  scaleX: number;
  scaleY: number;
  depth: number;
  alpha: number;
  tint: number | null;
  rotation: number;
  destroyed: boolean;
  setOrigin(x: number, y: number): MockImage;
  setFlipX(v: boolean): MockImage;
  setScale(x: number, y: number): MockImage;
  setDepth(v: number): MockImage;
  setAlpha(v: number): MockImage;
  setTint(v: number): MockImage;
  // A SwingingReaper ezekkel mozgatja/forgatja a pengét a lengés mentén.
  setPosition(x: number, y: number): MockImage;
  setRotation(v: number): MockImage;
  destroy(): void;
}

export function createMockImage(
  x: number,
  y: number,
  texture: string,
  frame: string | number
): MockImage {
  const image: MockImage = {
    x,
    y,
    texture,
    frame,
    originX: 0.5,
    originY: 0.5,
    flipX: false,
    scaleX: 1,
    scaleY: 1,
    depth: 0,
    alpha: 1,
    tint: null,
    rotation: 0,
    destroyed: false,
    setOrigin(ox, oy) {
      image.originX = ox;
      image.originY = oy;
      return image;
    },
    setFlipX(v) {
      image.flipX = v;
      return image;
    },
    setScale(sx, sy) {
      image.scaleX = sx;
      image.scaleY = sy;
      return image;
    },
    setDepth(v) {
      image.depth = v;
      return image;
    },
    setAlpha(v) {
      image.alpha = v;
      return image;
    },
    setTint(v) {
      image.tint = v;
      return image;
    },
    setPosition(x, y) {
      image.x = x;
      image.y = y;
      return image;
    },
    setRotation(v) {
      image.rotation = v;
      return image;
    },
    destroy() {
      image.destroyed = true;
    },
  };

  return image;
}

/**
 * Az `add.sprite()` minimális mása a `Player` heavy-echójához: a `MockImage` felülete
 * kiegészítve azzal a hárommal, amit egy ANIMÁLT, VÁGOTT és ki-be kapcsolható sprite kíván.
 *
 * A `cropArgs` és a `playedKeys` szándékosan visszaolvasható: a teszt így tudja
 * ellenőrizni, hogy a lovag testét tényleg levágtuk a második hullámról, és hogy az echo a
 * heavy SAJÁT (lassabb) animációját játssza, nem az alapcsapásét.
 */
export interface MockSprite extends MockImage {
  visible: boolean;
  cropArgs: [number, number, number, number] | null;
  playedKeys: string[];
  blendMode: number;
  setVisible(v: boolean): MockSprite;
  setCrop(x: number, y: number, width: number, height: number): MockSprite;
  setBlendMode(v: number): MockSprite;
  play(key: string, ignoreIfPlaying?: boolean): MockSprite;
}

export function createMockSprite(x: number, y: number, texture: string): MockSprite {
  // A createMockImage setterei a SAJÁT objektumukat adják vissza, az Object.assign pedig
  // ugyanazt a példányt bővíti — a láncolás tehát végig ezen a kiterjesztett objektumon fut.
  const sprite: MockSprite = Object.assign(createMockImage(x, y, texture, 0), {
    visible: true,
    cropArgs: null as [number, number, number, number] | null,
    playedKeys: [] as string[],
    blendMode: 0,
    setVisible(v: boolean) {
      sprite.visible = v;
      return sprite;
    },
    setCrop(cropX: number, cropY: number, width: number, height: number) {
      sprite.cropArgs = [cropX, cropY, width, height];
      return sprite;
    },
    setBlendMode(v: number) {
      sprite.blendMode = v;
      return sprite;
    },
    play(key: string) {
      sprite.playedKeys.push(key);
      return sprite;
    },
  });

  return sprite;
}

/**
 * A `Graphics` minimális mása. A SwingingReaper ezzel rajzolja újra a láncot minden
 * frame-ben; a teszt a `lineBetween` argumentumaiból olvassa vissza, hogy a lánc a
 * horgonytól a penge AKTUÁLIS pozíciójáig tart.
 */
export interface MockGraphics {
  depth: number;
  destroyed: boolean;
  clear: ReturnType<typeof vi.fn>;
  lineStyle: ReturnType<typeof vi.fn>;
  lineBetween: ReturnType<typeof vi.fn>;
  // A ui/Dialogue panelje kitöltött + körvonalazott téglalapot rajzol, és a kamerához
  // rögzíti magát; a SwingingReaper lánca csak vonalat húz. A felület tehát mindkettőt fedi.
  fillStyle: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
  visible: boolean;
  setScrollFactor(v: number): MockGraphics;
  setDepth(v: number): MockGraphics;
  // A CombatHud a Level 1 haz-parbeszede alatt elrejti magat (a panel ott a kepernyo
  // TETEJEN van, tehat a HUD-ra lognа).
  setVisible(v: boolean): MockGraphics;
  destroy(): void;
}

export function createMockGraphics(): MockGraphics {
  const graphics: MockGraphics = {
    depth: 0,
    destroyed: false,
    clear: vi.fn(),
    lineStyle: vi.fn(),
    lineBetween: vi.fn((_x1: number, _y1: number, _x2: number, _y2: number) => undefined),
    fillStyle: vi.fn(),
    fillRect: vi.fn(
      (_x: number, _y: number, _width: number, _height: number) => undefined
    ),
    strokeRect: vi.fn(
      (_x: number, _y: number, _width: number, _height: number) => undefined
    ),
    visible: true,
    setScrollFactor() {
      return graphics;
    },
    setDepth(v) {
      graphics.depth = v;
      return graphics;
    },
    setVisible(v) {
      graphics.visible = v;
      return graphics;
    },
    destroy() {
      graphics.destroyed = true;
    },
  };

  return graphics;
}

function createMockText() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text: any = {
    destroyed: false,
    x: 0,
    y: 0,
    // A ui/TutorialHint ezekbol szamolja a KEREKITETT kozepre igazitast (a "remego felirat"
    // javitasa). A teszt allitja be oket, hogy paratlan szelesseget is szimulalhasson.
    displayWidth: 0,
    displayHeight: 0,
    setPosition: vi.fn((x: number, y: number) => {
      text.x = x;
      text.y = y;
      return text;
    }),
    setText: vi.fn(() => text),
    setOrigin: vi.fn(() => text),
    visible: true,
    setVisible: vi.fn((v: boolean) => {
      text.visible = v;
      return text;
    }),
    // A ui/Dialogue a kamerához rögzíti és a panel fölé emeli a feliratait.
    setScrollFactor: vi.fn(() => text),
    setDepth: vi.fn(() => text),
    setAlpha: vi.fn(() => text),
    // A CrowHarvester.destroy()-a felszabadítja a debug HP-szöveget (a scene-en belüli
    // enemy-reset miatt már nem elég a scene-shutdown takarítása).
    destroy: vi.fn(() => {
      text.destroyed = true;
    }),
  };
  return text;
}

/**
 * Az `Arcade.StaticGroup` minimális mása a `MovingPlatform`-hoz. A lap a scene STATIKUS
 * platform-groupjába kerül (nem sajátba), ezért a teszt is így kapja meg; a `refreshBody`
 * hívásszáma pedig fontos állítás: static bodynál enélkül a fizika a régi helyén maradna.
 */
export interface MockStaticSprite {
  x: number;
  y: number;
  texture: string;
  scaleX: number;
  tint: number | null;
  /** Valódi csempekészletnél a fizikai sprite LÁTHATATLAN — a látvány külön objektum. */
  visible: boolean;
  refreshCount: number;
  setScale(sx: number, sy: number): MockStaticSprite;
  setTint(v: number): MockStaticSprite;
  setVisible(v: boolean): MockStaticSprite;
  setPosition(x: number, y: number): MockStaticSprite;
  refreshBody(): MockStaticSprite;
}

export function createMockStaticGroup() {
  const created: MockStaticSprite[] = [];

  return {
    created,
    create: vi.fn((x: number, y: number, texture: string) => {
      const sprite: MockStaticSprite = {
        x,
        y,
        texture,
        scaleX: 1,
        tint: null,
        visible: true,
        refreshCount: 0,
        setScale(sx) {
          sprite.scaleX = sx;
          return sprite;
        },
        setTint(v) {
          sprite.tint = v;
          return sprite;
        },
        setVisible(v) {
          sprite.visible = v;
          return sprite;
        },
        setPosition(nx, ny) {
          sprite.x = nx;
          sprite.y = ny;
          return sprite;
        },
        refreshBody() {
          sprite.refreshCount++;
          return sprite;
        },
      };
      created.push(sprite);
      return sprite;
    }),
  };
}

export type MockStaticGroup = ReturnType<typeof createMockStaticGroup>;

export function createMockScene() {
  return {
    add: {
      existing: vi.fn(),
      zone: vi.fn((x?: number, y?: number, width?: number, height?: number) =>
        createMockZone(x, y, width, height)
      ),
      // A SpikeField ezzel csempézi a tüske-grafikát a mező hosszában (a létra mintájára),
      // a terrain- és a mozgó platform-látvány pedig a padlót/pallót. Ugyanaz a chainable
      // felület, mint a MockImage-é, plusz a méret — a hívók `setOrigin`/`setTint`/
      // `setDepth`/`setPosition`-t is láncolnak rá.
      tileSprite: vi.fn(
        (x: number, y: number, width: number, height: number, texture: string) =>
          Object.assign(createMockImage(x, y, texture, 0), { width, height })
      ),
      text: vi.fn(() => createMockText()),
      image: vi.fn((x: number, y: number, texture: string, frame: string | number) =>
        createMockImage(x, y, texture, frame)
      ),
      // A Player heavy-echója (a második kardhullám) ezen jön létre.
      sprite: vi.fn((x: number, y: number, texture: string) =>
        createMockSprite(x, y, texture)
      ),
      graphics: vi.fn(() => createMockGraphics()),
    },
    physics: {
      add: {
        existing: vi.fn((obj: { body: unknown }) => {
          obj.body = createMockBody();
        }),
      },
    },
    // NEM fut le automatikusan — a teszt dönti el, mikor "telik el" az idő
    // a felvett callback(ok) manuális meghívásával (lásd a helperek lentebb).
    // A `now` sima, ÍRHATÓ mező: az AfterImageTrail ebből throttle-öl, a teszt pedig
    // ennek léptetésével szimulálja az idő múlását.
    time: { delayedCall: vi.fn(), now: 0 },
    // A tween mock tweent AD VISSZA (nem undefined-ot), mert az AudioManager eltárolja és
    // `stop()`-olja a futó fade-et. A `flushLastTween()` a hívás ARGUMENTUMAIBÓL olvas,
    // ezért ez a többi tesztet nem érinti.
    // A killTweensOf-ot a CrowHarvester.destroy()-a hívja: a halál-fade tweenje futhat még
    // rajta, amikor a Level1Scene enemy-resetje megsemmisíti.
    tweens: {
      add: vi.fn((_config: MockTweenConfig) => createMockTween()),
      killTweensOf: vi.fn((_target: unknown) => undefined),
    },
    // A Phaser SoundManager game-szintű; az AudioManager innen kér hangot, és a scene
    // `events`-én keresztül iratkozik fel a shutdownra.
    sound: {
      locked: false,
      add: vi.fn((key: string, _config?: { loop?: boolean; volume?: number }) =>
        createMockSound(key)
      ),
      // One-shot SFX (playSfx). Az explicit paramétertípus KÖTELEZŐ: paraméter nélküli
      // vi.fn() mellett a mock.calls üres tuple-ként (`[]`) tipizálódik, és a tsc --noEmit
      // elszállna, amikor a teszt kiolvassa belőle a configot (lásd MockTweenConfig).
      play: vi.fn((_key: string, _config?: { volume?: number; detune?: number }) => true),
      once: vi.fn((_event: string, _callback: () => void) => undefined),
    },
    events: { once: vi.fn((_event: string, _callback: () => void) => undefined) },
  };
}

export type MockScene = ReturnType<typeof createMockScene>;

// A `body` deklarált típusa `Body | StaticBody | null` (a src/ osztályok is
// `as Phaser.Physics.Arcade.Body` cast-tal szűkítik) — ugyanígy szűkít a teszt is,
// hogy a mock bodyn beállított mezőket (velocity, blocked, ...) típushelyesen tudja
// olvasni. Generikus: bármely Phaser.Physics.Arcade.Sprite-ra használható.
export function getBody(obj: { body: unknown }): Phaser.Physics.Arcade.Body {
  return obj.body as Phaser.Physics.Arcade.Body;
}

/**
 * Lépésenkénti delayedCall-vezérlés: minden `.next()` a *következő még le nem
 * futtatott* ütemezett hívást futtatja le, regisztrációs sorrendben. Ez kell az olyan
 * EGYMÁSBA ÁGYAZOTT delayedCall-láncokhoz, mint a CrowHarvester.startAttack() (startup →
 * a callbackjén belül cooldown) — csak így figyelhető meg a köztes állapot
 * (pl. COOLDOWN a CHASE előtt).
 *
 * `skipExisting: true` esetén a kurzor a MÁR ütemezett hívások mögé áll — ez kell, ha a
 * teszt előkészítése (pl. a boss Phase 2-be sebzése) maga is ütemez callbackeket, amiket
 * nem akarunk beleszámolni a megfigyelt lépésekbe.
 */
export function createDelayedCallStepper(scene: MockScene, skipExisting = false) {
  let cursor = skipExisting ? scene.time.delayedCall.mock.calls.length : 0;
  return {
    next(): void {
      const calls = scene.time.delayedCall.mock.calls;
      if (cursor >= calls.length) {
        throw new Error('Nincs több ütemezett delayedCall a lépéshez.');
      }
      const [, callback] = calls[cursor] as [number, () => void];
      cursor++;
      callback();
    },
    /**
     * A kurzortól a végéig lefuttat mindent (beleértve a futtatás közben újonnan
     * ütemezetteket is), anélkül hogy a már `.next()`-tel lefuttatott hívásokat
     * újra elsütné. Arra kell, amikor két objektum (pl. CrowHarvester + Player) UGYANAZT
     * a scene-t osztja meg, és egymásba ágyazva/összefonódva ütemeznek
     * delayedCall-okat — ilyenkor a köztes állapotot `.next()`-tel figyeljük meg,
     * a többit meg egyszerűen lefuttatjuk.
     */
    flushRemaining(): void {
      const calls = scene.time.delayedCall.mock.calls;
      for (; cursor < calls.length && cursor < 1000; cursor++) {
        const [, callback] = calls[cursor] as [number, () => void];
        callback();
      }
    },
  };
}

/**
 * KÉSLELTETÉS SZERINTI, szelektív delayedCall-futtatás.
 *
 * A `createDelayedCallStepper` REGISZTRÁCIÓS sorrendben halad, ami néhány forgatókönyvben
 * túl merev: a boss egy támadásnál több, KÜLÖNBÖZŐ hosszúságú callbacket is ütemez
 * egyszerre (pl. a lövedék 500ms-os startupját ÉS a 2200ms-os újratöltését), és a teszt
 * pont azt akarja megnézni, mi történik, ha az egyik már lefutott, a másik még nem —
 * mert így jut el a boss a lövedékről a Shadow Spellre.
 *
 * A `run(delayMs)` mindig a megadott késleltetéssel ütemezett, még LE NEM FUTTATOTT első
 * callbacket süti el, tehát ugyanazzal a hosszal ütemezett hívások időrendben jönnek.
 */
export function createDelayedCallRunner(scene: MockScene) {
  const fired = new Set<number>();

  return {
    run(delayMs: number): void {
      const calls = scene.time.delayedCall.mock.calls as Array<[number, () => void]>;

      for (let i = 0; i < calls.length; i++) {
        if (fired.has(i) || calls[i][0] !== delayMs) continue;
        fired.add(i);
        calls[i][1]();
        return;
      }

      throw new Error(`Nincs le nem futtatott delayedCall ${delayMs}ms késleltetéssel.`);
    },
  };
}

/**
 * Az összes eddig ütemezett delayedCall lefuttatása, beleértve a futtatás KÖZBEN
 * újonnan ütemezetteket is — arra jó, ha a köztes állapot nem érdekes, csak a
 * végeredmény (pl. a Player egyszerű, nem ágyazott HURT->DEAD láncához elég).
 */
export function flushAllDelayedCalls(scene: MockScene): void {
  const calls = scene.time.delayedCall.mock.calls;
  for (let i = 0; i < calls.length && i < 1000; i++) {
    const [, callback] = calls[i] as [number, () => void];
    callback();
  }
}

/** A legutóbb elindított tween `onComplete`-jének manuális lefuttatása. */
export function flushLastTween(scene: MockScene): void {
  const calls = scene.tweens.add.mock.calls;
  const config = calls[calls.length - 1][0] as { onComplete?: () => void };
  config.onComplete?.();
}
