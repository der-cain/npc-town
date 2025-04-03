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
 * Can now follow a sequence of points (a path).
 */
export default class MovingState implements NpcState {
    private path: Phaser.Geom.Point[] = []; // Array of points to follow
    private currentTargetIndex: number = -1; // Index of the current target point in the path
    private _purpose: string | null = null; // e.g., 'MovingToWork', 'MovingHome', 'MovingToHarvest', 'DeliveringGrapes', 'ReturningToWinery'
    private nextStateData: any = null; // Optional data for the *next* state after arrival (less used now)

    // Public getter for purpose
    public get purpose(): string | null {
        return this._purpose;
    }

    enter(npc: NPC, data?: any): void {
        console.log(`${npc.constructor.name} entering MovingState`);
        // Expect data.path to be an array of Geom.Point
        if (data && Array.isArray(data.path) && data.path.length > 0) {
            // Ensure all elements are Points (or convert if needed, though findPath returns Points)
            this.path = data.path.map((p: any) => (p instanceof Phaser.Geom.Point ? p : new Phaser.Geom.Point(p.x, p.y)));
            this._purpose = data.purpose || 'MovingAlongPath'; // Default purpose
            this.nextStateData = data.nextStateData || null;

            // Start moving towards the first point in the path (skip the very first point if it's the current location)
            const firstPoint = this.path[0];
            if (!firstPoint) { // Check if the first point exists
                 console.error(`${npc.constructor.name} MovingState path is unexpectedly empty after validation! Transitioning to Idle.`);
                 npc.changeState(new IdleState());
                 return;
            }
            this.currentTargetIndex = (this.path.length > 1 && Phaser.Math.Distance.BetweenPointsSquared(npc, firstPoint) < 1) ? 1 : 0;


            if (this.currentTargetIndex >= this.path.length) {
                 console.warn(`${npc.constructor.name} MovingState path calculation resulted in invalid starting index. Transitioning to Idle.`);
                 npc.changeState(new IdleState());
                 return;
            }

            const firstTarget = this.path[this.currentTargetIndex];
            // Add check for undefined target
            if (!firstTarget) {
                console.error(`${npc.constructor.name} MovingState could not get first target at index ${this.currentTargetIndex}. Transitioning to Idle.`);
                npc.changeState(new IdleState());
                return;
            }
            console.log(`${npc.constructor.name} starting path to [${firstTarget.x.toFixed(0)}, ${firstTarget.y.toFixed(0)}] (point ${this.currentTargetIndex + 1}/${this.path.length}) for purpose: ${this._purpose}`);
            // Convert Geom.Point to Vector2 for setMovementTarget
            npc.setMovementTarget(new Phaser.Math.Vector2(firstTarget.x, firstTarget.y));

        } else {
            console.warn(`${npc.constructor.name} entered MovingState without a valid path! Transitioning to Idle.`);
            npc.changeState(new IdleState()); // Can't move without a path
        }
    }

    update(npc: NPC, delta: number): void {
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
        // Convert Geom.Point to Vector2 for hasReachedTarget
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
                npc.setMovementTarget(new Phaser.Math.Vector2(nextTargetPoint.x, nextTargetPoint.y));
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
        this.path = []; // Clear local path reference
        this.currentTargetIndex = -1;
        this._purpose = null;
        this.nextStateData = null;
    }
}
