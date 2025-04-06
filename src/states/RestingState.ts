import NPC from '../entities/NPC';
import NpcState from './NpcState';

/**
 * State representing the NPC resting, usually at home during the night.
 */
export default class RestingState implements NpcState {
    enter(npc: NPC, data?: any): void {
        console.log(`${npc.constructor.name} entering RestingState`);
        npc.clearMovementTarget(); // Ensure NPC stops moving
    }

    update(npc: NPC, delta: number): void {
        // Resting state no longer needs an update loop check for waking up
        // Logic is handled by the DayStarted event listener
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting RestingState`);
    }
}
