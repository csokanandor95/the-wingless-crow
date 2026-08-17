// A 'phaser' modul fake helyettesítője a unit tesztekhez. NEM vi.mock()-ba csomagolva —
// minden teszt fájl saját maga hívja meg `vi.mock('phaser', createFakePhaserModule)`-ként
// a saját tetején (ez garantáltan jól hoisztolódik vitesttel), ez a fájl csak a tényleges
// definíciót adja megosztva, hogy ne kelljen háromszor leírni.
//
// A valódi Phaser csomag már betöltéskor (window global hiányában) elszáll Node alatt,
// ezért nem hívható rá `importOriginal()` sem — ez a fake teljesen önálló, csak azt a
// felületet adja, amit a src/ osztályok (Player, Hollow, Fireball) ténylegesen használnak:
// Physics.Arcade.Sprite (mindhárom ebből örököl), Events.EventEmitter, Math.Linear
// (Player.climb() lágy rásnapelése) és Math.Distance.Between (Hollow távolság-számításai).
export function createFakePhaserModule() {
  class EventEmitter {
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    on(event: string, cb: (...args: unknown[]) => void) {
      const list = this.listeners.get(event) ?? [];
      list.push(cb);
      this.listeners.set(event, list);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      for (const cb of this.listeners.get(event) ?? []) cb(...args);
      return true;
    }
  }

  class MockSprite extends EventEmitter {
    scene: unknown;
    x: number;
    y: number;
    texture: string;
    flipX = false;
    active = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any = null;

    constructor(scene: unknown, x: number, y: number, texture: string) {
      super();
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.texture = texture;
    }

    setCollideWorldBounds() {
      return this;
    }
    setVelocityX(x: number) {
      this.body.velocity.x = x;
      return this;
    }
    setVelocityY(y: number) {
      this.body.velocity.y = y;
      return this;
    }
    setVelocity(x: number, y: number) {
      this.body.velocity.x = x;
      this.body.velocity.y = y;
      return this;
    }
    setFlipX(v: boolean) {
      this.flipX = v;
      return this;
    }
    setTint(_color: number) {
      return this;
    }
    clearTint() {
      return this;
    }
    destroy() {
      this.active = false;
    }
  }

  const FakePhaser = {
    Physics: { Arcade: { Sprite: MockSprite } },
    Events: { EventEmitter },
    Math: {
      // Ugyanaz a lerp-képlet, mint a valódi Phaser.Math.Linear: p0 + (p1 - p0) * t.
      Linear: (p0: number, p1: number, t: number) => p0 + (p1 - p0) * t,
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) =>
          Math.hypot(x2 - x1, y2 - y1),
      },
    },
  };

  return { default: FakePhaser };
}
