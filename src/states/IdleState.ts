import NPC from '../entities/NPC';
import NpcState from './NpcState';
// import RestingState from './RestingState'; // Not needed directly here

/**
 * State representing the NPC being idle, waiting for tasks or conditions.
 * For Farmers, this state also handles finding the next ripe plot to harvest.
 */
export default class IdleState implements NpcState {
    enter(npc: NPC, data?: any): void {
        console.log(`${npc.constructor.name} entering IdleState`);
        npc.clearMovementTarget(); // Ensure NPC stops moving if they were
        // Optionally, play an idle animation if available
        // npc.playAnimation('idle');
    }

    update(npc: NPC, delta: number): void {
        // Idle state continuously checks if the NPC should start working.
        // Delegate the decision logic to the specific NPC instance.
        npc.checkForWork();
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting IdleState`);
        // No specific cleanup needed for idle
    }
}
