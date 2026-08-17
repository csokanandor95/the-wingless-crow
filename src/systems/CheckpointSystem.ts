// Egyetlen aktív respawn-pontot tárol. A player halálakor a scene ezt kérdezi le,
// hogy hova éledjen újra.
export default class CheckpointSystem {
  private x: number;
  private y: number;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
  }

  activate(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  getRespawnPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
