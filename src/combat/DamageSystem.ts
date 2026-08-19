import type Phaser from 'phaser';

// Közös interfész mindenkinek, aki sebződhet: Player, Enemy (Hollow) és a Boss is ezt implementálja.
export interface Damageable {
  takeDamage(amount: number): void;
  isDead(): boolean;
}

/**
 * A `physics.add.overlap` / `collider` callbackjeinek paramétertípusa. Phaser 4-ben az
 * `ArcadePhysicsCallback` NEM sima `GameObject`-et ad, hanem ezt az uniót — ha a handler
 * `Phaser.GameObjects.GameObject`-tel van tipizálva, a TypeScript elutasítja
 * (a `Body` nem `GameObject`). A hívóhelyek ezt szűkítik `as Fireball` / `as Hollow` stb. casttal.
 */
export type PhysicsOverlapObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;