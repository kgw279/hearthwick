/**
 * Throwing things out (Y, or R): the first press asks, a second press soon after (on the same stack)
 * throws the whole stack away. Shared by the bag and the storage screens.
 */
const CONFIRM = 3; // seconds the second press has

export class Discard {
  private pending: { item: string; until: number } | null = null;

  /**
   * A press on a stack: true if it's the second (throw it out now); else it's asked, and `say` is told
   * what to press. name: the item's name; count: how many in the stack.
   */
  press(item: string, name: string, count: number, time: number, say: (text: string) => void, again: string): boolean {
    if (this.pending && this.pending.item === item && time < this.pending.until) {
      this.pending = null;
      say(`Threw out ${name}${count > 1 ? ` x${count}` : ''}`);
      return true;
    }
    this.pending = { item, until: time + CONFIRM };
    say(`Throw out ${name}${count > 1 ? ` x${count}` : ''}? ${again} again to throw ${count > 1 ? 'them' : 'it'} out`);
    return false;
  }
}
