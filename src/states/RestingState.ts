import NPC from '../entities/NPC';
import NpcState from './NpcState';
import { TimeEvents } from '../services/TimeService';
import { LocationKeys } from '../services/LocationService'; // Import LocationKeys
// GameScene import removed as time is checked via npc.timeService
// Import other states if needed for transitions
import MovingState from './MovingState'; // Assuming MovingState will exist
import IdleState from './IdleState';

/**
 * State representing the NPC resting, usually at home during the night.
 */
export default class RestingState implements NpcState {
    private npc: NPC | null = null; // Store reference to the NPC

    enter(npc: NPC, data?: any): void {
        console.log(`${npc.constructor.name} entering RestingState`);
        this.npc = npc; // Store the NPC reference
        npc.clearMovementTarget(); // Ensure NPC stops moving
        // Optionally move to bed/specific spot within home if homePosition is known
        // if (npc.homePosition) {
        //     npc.setPosition(npc.homePosition.x, npc.homePosition.y);
        // }
        // Optionally play sleeping animation

        // Listen for the DayStarted event to trigger waking up
        // Pass the npc instance explicitly to the handler using an arrow function or bind
        // Using .once ensures it only fires once
        npc.timeService.once(TimeEvents.DayStarted, () => this.handleDayStarted(), this);
    }

    update(npc: NPC, delta: number): void {
        // Resting state no longer needs an update loop check for waking up
        // Logic is handled by the DayStarted event listener
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting RestingState`);
        // Stop sleeping animation if any
        // Remove the listener to prevent memory leaks if the state exits unexpectedly
        // Ensure the listener removal matches how it was added
        npc.timeService.off(TimeEvents.DayStarted, this.handleDayStarted, this); // This might need adjustment if using arrow func
        this.npc = null; // Clear the NPC reference
    }

    /** Handles the DayStarted event from TimeService */
    // Removed npc parameter as we use this.npc
    private handleDayStarted(): void {
        // Use the stored NPC reference
        if (!this.npc) {
            console.warn("RestingState.handleDayStarted called but this.npc is null.");
            return;
        }

        // Check if the NPC is still in the RestingState before proceeding
        if (!(this.npc.currentState instanceof RestingState)) {
            return;
        }

        console.log(`${this.npc.constructor.name} waking up due to DayStarted event.`);
        this.npc.handleStartDay();
    }
}
