// Közös interfész mindenkinek, aki sebződhet: Player, majd később Enemy/Boss is ezt implementálja.
export interface Damageable {
  takeDamage(amount: number): void;
  isDead(): boolean;
}