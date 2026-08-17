// Megosztott mock-scene/body/segédfüggvények a unit tesztekhez. A 'phaser' modul
// mockolása a vitest.config.ts setupFiles-ében (tests/unit/setup/phaserMock.ts)
// történik globálisan — ez a fájl csak a Player/Hollow/Fireball konstruktorai által
// elvárt scene-felületet és néhány időzítés-vezérlő helpert ad.
import { vi } from 'vitest';
import type Phaser from 'phaser';

export function createMockBody() {
  return {
    velocity: { x: 0, y: 0 },
    blocked: { down: false },
    touching: { down: false },
    checkCollision: { down: true },
    enable: true,
    setAllowGravity: vi.fn(),
    setSize: vi.fn(),
    reset: vi.fn(),
  };
}

function createMockZone() {
  const data = new Map<string, unknown>();
  return {
    body: null,
    // Stateful: a Player attack-hitboxa setData('damage', ...)-vel ír, a
    // Level1Scene (és a tesztek) getData('damage')-vel olvassák vissza.
    setData: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    }),
    getData: vi.fn((key: string) => data.get(key)),
  };
}

function createMockText() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text: any = {
    setPosition: vi.fn(() => text),
    setText: vi.fn(() => text),
    setOrigin: vi.fn(() => text),
    setVisible: vi.fn(() => text),
  };
  return text;
}

export function createMockScene() {
  return {
    add: {
      existing: vi.fn(),
      zone: vi.fn(() => createMockZone()),
      text: vi.fn(() => createMockText()),
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
    time: { delayedCall: vi.fn() },
    tweens: { add: vi.fn() },
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
 * EGYMÁSBA ÁGYAZOTT delayedCall-láncokhoz, mint a Hollow.startAttack() (startup →
 * a callbackjén belül cooldown) — csak így figyelhető meg a köztes állapot
 * (pl. COOLDOWN a CHASE előtt).
 */
export function createDelayedCallStepper(scene: MockScene) {
  let cursor = 0;
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
     * újra elsütné. Arra kell, amikor két objektum (pl. Hollow + Player) UGYANAZT
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
