import Phaser from 'phaser';
import NPC from '../entities/NPC';
import NpcState from './NpcState';
import GameScene from '../scenes/GameScene';
// Import other states for transitions upon arrival
import IdleState from './IdleState';
import RestingState from './RestingState';
import HarvestingState from '../states/HarvestingState'; // Import HarvestingState
// Import specific NPC types for checks and method calls
import Farmer from '../entities/Farmer';
import Winemaker from '../entities/Winemaker';

/**
 * State representing the NPC moving towards a specific target position.
 * Handles checking for arrival and transitioning to the next appropriate state.
 */
export default class MovingState implements NpcState {
    private targetPosition: Phaser.Math.Vector2 | null = null;
    private purpose: string | null = null; // e.g., 'MovingToWork', 'MovingHome', 'MovingToHarvest', 'DeliveringGrapes', 'ReturningToWinery'
    private nextStateData: any = null; // Optional data for the *next* state after arrival

    enter(npc: NPC, data?: any): void {
        console.log(`${npc.constructor.name} entering MovingState`);
        if (data && data.targetPosition instanceof Phaser.Math.Vector2) {
            this.targetPosition = data.targetPosition;
            this.purpose = data.purpose || 'MovingToTarget'; // Default purpose
            this.nextStateData = data.nextStateData || null; // Carry over data for the next state

            // targetPosition is guaranteed to be non-null here due to the instanceof check
            // Use non-null assertion (!) to satisfy TypeScript
            console.log(`${npc.constructor.name} moving to [${this.targetPosition!.x.toFixed(0)}, ${this.targetPosition!.y.toFixed(0)}] for purpose: ${this.purpose}`);
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
            const arrivalPurpose = this.purpose;
            console.log(`${npc.constructor.name} reached target [${arrivedAt.x.toFixed(0)}, ${arrivedAt.y.toFixed(0)}] for purpose: ${arrivalPurpose}`);

            // --- Decide next state based on purpose ---
            let nextState: NpcState | null = null; // Use null to indicate state might be handled by action method

            if (arrivalPurpose === 'MovingHome') {
                nextState = new RestingState();
            } else if (arrivalPurpose === 'MovingToWork') {
                // Arrived at work location. Transition to Idle.
                // The Idle state itself should handle finding specific work.
                nextState = new IdleState();
            } else if (arrivalPurpose === 'MovingToHarvest') {
                // Arrived at a specific plot to harvest
                if (npc instanceof Farmer && npc.targetPlot) {
                    console.log("Arrived at plot, transitioning to HarvestingState.");
                    nextState = new HarvestingState();
                    // Pass the plot data needed by HarvestingState.enter
                    this.nextStateData = { targetPlot: npc.targetPlot };
                } else {
                    console.warn("Arrived for MovingToHarvest but NPC is not Farmer or targetPlot is missing. Going Idle.");
                    nextState = new IdleState();
                }
            } else if (arrivalPurpose === 'DeliveringGrapes') {
                 // Arrived at winery to deliver grapes
                 if (npc instanceof Farmer) {
                    console.log("Arrived at winery to deliver grapes. Calling deliverGrapes method.");
                    // The deliverGrapes method handles the next state transition (to Idle)
                    (npc as any).deliverGrapes(); // Cast to any to access private method, or make deliverGrapes public/protected
                    nextState = null; // State transition handled internally by deliverGrapes
                 } else {
                    console.warn("Arrived for DeliveringGrapes but NPC is not Farmer. Going Idle.");
                    nextState = new IdleState();
                 }
            } else if (arrivalPurpose === 'ReturningToWinery') {
                 // Winemaker arrived back at winery
                 console.log("Winemaker arrived back at winery.");
                 nextState = new IdleState(); // Go idle, check for wine later
            } else {
                 // Default for unknown or generic 'MovingToTarget'
                 console.log(`Arrived for unknown/generic purpose '${arrivalPurpose}'. Going Idle.`);
                 nextState = new IdleState();
            }

            // Transition to the determined next state ONLY if one was set
            if (nextState) {
                npc.changeState(nextState, this.nextStateData);
            }

        } else {
            // Continue moving - physics engine handles this based on setMovementTarget
        }
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting MovingState`);
        // IMPORTANT: Clear the movement target in the NPC itself when exiting this state
        npc.clearMovementTarget();
        this.targetPosition = null; // Clear local reference
        this.purpose = null;
        this.nextStateData = null;
    }
}
