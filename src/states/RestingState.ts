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
        if (this.npc.workPosition) {
            const startPos = new Phaser.Math.Vector2(this.npc.x, this.npc.y);
            const endPoint = this.npc.workPosition; // workPosition is already a Point
            const endPos = new Phaser.Math.Vector2(endPoint.x, endPoint.y); // Convert Point to Vector2
            // Find path from home door to work position using the keys stored on the NPC
            const homeDoorKey = this.npc.homeDoorKey;
            const workPosKey = this.npc.workPositionKey;

            if (!homeDoorKey || !workPosKey) {
                 console.error(`${this.npc.constructor.name} is missing homeDoorKey or workPositionKey. Cannot find path to work.`);
                 this.npc.changeState(new IdleState()); // Go idle if keys are missing
                 return;
            }

            const path = this.npc.currentScene.locationService.findPath(startPos, endPos, homeDoorKey, workPosKey);
            // Transition to MovingState to go to work using the path
            this.npc.changeState(new MovingState(), { path: path, purpose: 'MovingToWork' });
        } else {
            // No work position? Just become idle.
            this.npc.changeState(new IdleState());
        }
    }
}
