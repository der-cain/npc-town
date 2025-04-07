import Phaser from 'phaser';
import NPC, { NPC_SPEED } from '../entities/NPC'; // Import NPC_SPEED
import NpcState from './NpcState';
// Import other states only if needed for direct transitions *within* MovingState (unlikely now)
import IdleState from './IdleState';
// No longer need specific state/NPC imports here for arrival logic


/**
 * State representing the NPC moving towards a specific target position.
 * Handles checking for arrival and delegating the arrival logic to the NPC.
 * Can now follow a sequence of points (a path).
 */
export default class MovingState implements NpcState {
    private path: Phaser.Geom.Point[] = []; // Array of points to follow
    private currentTargetIndex: number = -1; // Index of the current target point in the path
    private _purpose: string | null = null; // e.g., 'MovingToWork', 'MovingHome', 'MovingToHarvest', 'DeliveringGrapes', 'ReturningToWinery'
    // nextStateData is likely less useful now as handleArrival determines the next state based on purpose
    // private nextStateData: any = null;
    // movementStarted flag is no longer needed as enter() is always called on new instances

    // Public getter for purpose
    public get purpose(): string | null {
        return this._purpose;
    }

    enter(npc: NPC, data?: any): void {
        // Expect data.path to be an array of Geom.Point, and optionally purpose/currentTargetIndex
        if (data && Array.isArray(data.path) && data.path.length > 0) {
            console.log(`${npc.constructor.name} entering MovingState`);
            this.path = data.path.map((p: any) => (p instanceof Phaser.Geom.Point ? p : new Phaser.Geom.Point(p.x, p.y)));
            this._purpose = data.purpose || 'MovingAlongPath'; // Default purpose

            // Use provided index if resuming, otherwise calculate
            if (typeof data.currentTargetIndex === 'number' && data.currentTargetIndex >= 0 && data.currentTargetIndex < this.path.length) {
                 this.currentTargetIndex = data.currentTargetIndex;
                 console.log(`  -> Resuming at index: ${this.currentTargetIndex}`);
            } else {
                // Always start at the beginning of the provided path (index 0)
                // The path from LocationService now correctly starts with the NPC's current position.
                this.currentTargetIndex = 0;
                console.log(`  -> Starting at index: ${this.currentTargetIndex}`);
            }

            // Validate the target index (should always be 0 or a valid resumption index now)
            if (this.currentTargetIndex < 0 || this.currentTargetIndex >= this.path.length) {
                console.warn(`${npc.constructor.name} MovingState has invalid target index ${this.currentTargetIndex} for path length ${this.path.length} (Path: ${JSON.stringify(this.path)}). Transitioning to Idle.`);
                npc.changeState(new IdleState());
                return;
            }

            // Get the target point
            const targetPoint = this.path[this.currentTargetIndex];
            if (!targetPoint) {
                console.error(`${npc.constructor.name} MovingState could not get target point at index ${this.currentTargetIndex}. Transitioning to Idle.`);
                npc.changeState(new IdleState());
                return;
            }

            // Log and initiate movement
            console.log(`${npc.constructor.name} starting path towards [${targetPoint.x.toFixed(0)}, ${targetPoint.y.toFixed(0)}] (point ${this.currentTargetIndex + 1}/${this.path.length}) for purpose: ${this._purpose}`);
            npc.setMovementTarget(new Phaser.Math.Vector2(targetPoint.x, targetPoint.y));

        } else {
            // Invalid data provided
            console.warn(`${npc.constructor.name} entered MovingState without a valid path! Transitioning to Idle.`);
            npc.changeState(new IdleState()); // Can't move without a path
        }
    }

    // _initiateMovement helper is no longer needed

    update(npc: NPC, delta: number): void {
        // --- Standard movement update logic ---
        // No need for the !this.movementStarted check anymore

        if (this.currentTargetIndex < 0 || this.currentTargetIndex >= this.path.length) {
            // No valid target, should not happen if enter() logic is correct
            return;
        }

        const currentTargetPoint = this.path[this.currentTargetIndex];
        // Add check for undefined target
        if (!currentTargetPoint) {
             console.error(`${npc.constructor.name} MovingState current target point at index ${this.currentTargetIndex} is undefined. Transitioning to Idle.`);
             npc.changeState(new IdleState());
             return;
        }
        const currentTargetVec = new Phaser.Math.Vector2(currentTargetPoint.x, currentTargetPoint.y);

        // Check for arrival at the current waypoint
        if (npc.hasReachedTarget(currentTargetVec, 5)) { // Use a threshold
            console.log(`${npc.constructor.name} reached waypoint ${this.currentTargetIndex + 1}/${this.path.length} [${currentTargetPoint.x.toFixed(0)}, ${currentTargetPoint.y.toFixed(0)}]`);

            // Move to the next point in the path
            this.currentTargetIndex++;

            if (this.currentTargetIndex < this.path.length) {
                // There's another point in the path
                const nextTargetPoint = this.path[this.currentTargetIndex];
                 // Add check for undefined target
                if (!nextTargetPoint) {
                    console.error(`${npc.constructor.name} MovingState next target point at index ${this.currentTargetIndex} is undefined. Reached end unexpectedly?`);
                    // Treat as reaching the final destination with the previous point
                    const finalDestination = currentTargetVec;
                    const arrivalPurpose = this._purpose;
                    npc.handleArrival(arrivalPurpose, finalDestination);
                    return; // Exit update
                }
                console.log(`${npc.constructor.name} moving to next waypoint ${this.currentTargetIndex + 1}/${this.path.length} [${nextTargetPoint.x.toFixed(0)}, ${nextTargetPoint.y.toFixed(0)}]`);
                // Convert Geom.Point to Vector2 for setMovementTarget
                const nextTargetVec = new Phaser.Math.Vector2(nextTargetPoint.x, nextTargetPoint.y);
                npc.setMovementTarget(nextTargetVec);
            } else {
                // Reached the final destination (the point we just arrived at)
                console.log(`${npc.constructor.name} reached final destination.`);
                const finalDestination = currentTargetVec; // The point we just arrived at
                const arrivalPurpose = this._purpose; // Store purpose before clearing in exit

                // Delegate arrival logic to the NPC instance
                // The NPC's handleArrival method is now responsible for deciding the next state
                npc.handleArrival(arrivalPurpose, finalDestination);
                // NOTE: State change happens within handleArrival
            }
        } else {
            // Continue moving towards the current target waypoint
        }
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting MovingState`);
        // IMPORTANT: Clear the movement target in the NPC itself when exiting this state
        npc.clearMovementTarget();
        // No need to clear internal state here as a new instance will be created next time
        // this.path = [];
        // this.currentTargetIndex = -1;
        // this._purpose = null;
    }

    /**
     * Provides the necessary data for resuming this state.
     */
    public getResumptionData(): any {
        return {
            path: this.path,
            currentTargetIndex: this.currentTargetIndex,
            purpose: this._purpose
        };
    }
}
