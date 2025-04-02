import Phaser from 'phaser';
import NPC from '../entities/NPC';
import NpcState from './NpcState';
import GameScene from '../scenes/GameScene';
// Import other states only if needed for direct transitions *within* MovingState (unlikely now)
import IdleState from './IdleState';
// No longer need specific state/NPC imports here for arrival logic
// import RestingState from './RestingState';
// import HarvestingState from '../states/HarvestingState';
// import Farmer from '../entities/Farmer';
// import Winemaker from '../entities/Winemaker';


/**
 * State representing the NPC moving towards a specific target position.
 * Handles checking for arrival and delegating the arrival logic to the NPC.
 */
export default class MovingState implements NpcState {
    private targetPosition: Phaser.Math.Vector2 | null = null;
    private _purpose: string | null = null; // Renamed for getter e.g., 'MovingToWork', 'MovingHome', 'MovingToHarvest', 'DeliveringGrapes', 'ReturningToWinery'
    private nextStateData: any = null; // Optional data for the *next* state after arrival (less used now)

    // Public getter for purpose
    public get purpose(): string | null {
        return this._purpose;
    }

    enter(npc: NPC, data?: any): void {
        console.log(`${npc.constructor.name} entering MovingState`);
        if (data && data.targetPosition instanceof Phaser.Math.Vector2) {
            this.targetPosition = data.targetPosition;
            this._purpose = data.purpose || 'MovingToTarget'; // Default purpose
            this.nextStateData = data.nextStateData || null; // Store any data intended for the *next* state

            // targetPosition is guaranteed to be non-null here due to the instanceof check
            // Use non-null assertion (!) to satisfy TypeScript
            console.log(`${npc.constructor.name} moving to [${this.targetPosition!.x.toFixed(0)}, ${this.targetPosition!.y.toFixed(0)}] for purpose: ${this._purpose}`);
            npc.setMovementTarget(this.targetPosition!); // Tell NPC physics to move
        } else {
            console.warn(`${npc.constructor.name} entered MovingState without a valid targetPosition! Transitioning to Idle.`);
            npc.changeState(new IdleState()); // Can't move without a target
        }
    }

    update(npc: NPC, delta: number): void {
        if (!this.targetPosition) return; // Should have transitioned out if no target

        // Check for arrival
        if (npc.hasReachedTarget(this.targetPosition, 5)) { // Use a threshold
            const arrivedAt = this.targetPosition; // Store before clearing
            const arrivalPurpose = this._purpose; // Store purpose before clearing in exit

            console.log(`${npc.constructor.name} reached target [${arrivedAt.x.toFixed(0)}, ${arrivedAt.y.toFixed(0)}] for purpose: ${arrivalPurpose}`);

            // Delegate arrival logic to the NPC instance
            // The NPC's handleArrival method is now responsible for deciding the next state
            npc.handleArrival(arrivalPurpose, arrivedAt);

            // NOTE: We no longer call npc.changeState here. It's done within npc.handleArrival or methods called by it.
        } else {
            // Continue moving - physics engine handles this based on setMovementTarget
        }
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting MovingState`);
        // IMPORTANT: Clear the movement target in the NPC itself when exiting this state
        npc.clearMovementTarget();
        this.targetPosition = null; // Clear local reference
        this._purpose = null;
        this.nextStateData = null;
    }
}
