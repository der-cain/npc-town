import Phaser from 'phaser';
import { Item } from '../data/items';
import GameScene from '../scenes/GameScene'; // Still needed for adding to scene, physics, text
import NpcState from '../states/NpcState';
import IdleState from '../states/IdleState';
import RestingState from '../states/RestingState'; // Needed for instanceof check
import MovingState from '../states/MovingState';
import { TimeService, TimeEvents } from '../services/TimeService'; // Import TimeService

export const NPC_SPEED = 80; // Pixels per second // Export the constant

// Define an interface for storing state information for resumption
interface StoredStateInfo {
    // Using 'any' for constructor type as specific state types aren't known here easily
    // and we primarily need it to check instanceof MovingState later.
    // A more type-safe approach might involve a registry or discriminated union.
    stateConstructor: any;
    data?: any; // Data needed to re-initialize the state (e.g., path, index, purpose for MovingState)
}

export default abstract class NPC extends Phaser.Physics.Arcade.Sprite { // Make class abstract
    public currentState!: NpcState;
    public previousStateBeforeResting: StoredStateInfo | null = null; // Store state info, not instance
    public inventory: Item | null = null;
    public currentScene: GameScene; // Made public for states/logic to access services easily
    public timeService: TimeService; // Made public for states to access
    private stateText: Phaser.GameObjects.Text;
    public homePosition: Phaser.Geom.Point | null = null; // Actual home location
    public workPosition: Phaser.Geom.Point | null = null; // Actual work location
    public homeDoorKey: string | null = null; // Key for the door near home (set by GameScene)
    public workPositionKey: string | null = null; // Key for the work position/area entry (set by GameScene)

    // Abstract method for subclasses to define their start-of-day behavior
    public abstract handleStartDay(): void;

    // Modified constructor to accept TimeService
    constructor(scene: GameScene, x: number, y: number, timeService: TimeService, texture: string | Phaser.Textures.Texture = 'npc_placeholder', frame?: string | number) {
        super(scene, x, y, texture, frame);
        this.currentScene = scene;
        this.timeService = timeService; // Store TimeService reference
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Initialize stateText
        this.stateText = scene.add.text(x, y - 15, 'Initializing...', {
            fontSize: '10px', color: '#ffffff', backgroundColor: '#000000'
        }).setOrigin(0.5, 1).setDepth(100); // Ensure text is visible

        this.setInteractive();
        this.setCollideWorldBounds(true);

        // Set initial state
        this.changeState(new RestingState());

        // Listen for TimeService events
        this.timeService.on(TimeEvents.GoHomeTime, this.handleGoHomeTime, this);
        this.timeService.on(TimeEvents.DayStarted, this.handleDayStartedEvent, this); // Listen for day start
    }

    // --- State Management ---

    /**
     * Changes the NPC's current state.
     * Calls exit() on the old state and enter() on the new state.
     * @param newState The new state object instance.
     * @param data Optional data to pass to the new state's enter() method.
     */
    public changeState(newState: NpcState, data?: any): void {
        if (this.currentState) {
            this.currentState.exit(this); // Clean up the old state
        }
        const oldStateName = this.currentState?.constructor.name || 'None';
        this.currentState = newState;
        console.log(`${this.constructor.name} [${this.x.toFixed(0)}, ${this.y.toFixed(0)}] state: ${oldStateName} -> ${newState.constructor.name}`);
        this.currentState.enter(this, data); // Initialize the new state
        this.updateAppearance(); // Update debug text
    }

    // --- Core Actions (Called by States) ---

    /**
     * Sets the physics body's velocity to move towards a target.
     * Called by MovingState.enter()
     * @param target The target position vector.
     */
    public setMovementTarget(target: Phaser.Math.Vector2): boolean {
        if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
            console.error(`${this.constructor.name} received invalid target for setMovementTarget:`, target);
            this.clearMovementTarget(); // Stop if target is invalid
            return false;
        }
        
        if(!this.hasReachedTarget(target, 5)) {
            console.log(`${this.constructor.name} setting physics move to [${target.x.toFixed(0)}, ${target.y.toFixed(0)}]`);
            this.currentScene.physics.moveTo(this, target.x, target.y, NPC_SPEED);
            return true; // Return true to indicate movement was initiated
        } else {
            console.log(`${this.constructor.name} target already reached, stopping movement.`);
            this.setVelocity(0, 0); // Stop if already at the target
        }
        return false; // Return false to indicate movement was not initiated
    }

    /**
     * Stops the NPC's movement by setting velocity to zero.
     * Called by MovingState.exit() and potentially other states like IdleState.enter().
     */
    public clearMovementTarget(): void {
        if (this.body?.velocity && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
            // console.log(`${this.constructor.name} clearing movement target (stopping velocity)`);
            this.setVelocity(0, 0);
        }
    }

    /**
     * Checks if the NPC has reached a target position within a given threshold.
     * Checks if the NPC has reached or passed a target position.
     * Considers both distance and direction of movement relative to the target.
     * Called by MovingState.update()
     * @param target The target position vector to check against.
     * @param threshold The maximum distance allowed to be considered "at" the target.
     * @returns True if the NPC is within the threshold and no longer moving towards the target, false otherwise.
     */
    public hasReachedTarget(target: Phaser.Math.Vector2, threshold: number = 5): boolean {
        // Ensure target and physics body are valid
        if (!target || !this.body) {
            console.warn(`${this.constructor.name} hasReachedTarget called with invalid target or missing body.`);
            return false;
        }

        const currentPos = new Phaser.Math.Vector2(this.x, this.y);
        const distance = Phaser.Math.Distance.Between(currentPos.x, currentPos.y, target.x, target.y);
        const isCloseEnough = distance < threshold;

        if (isCloseEnough) {
            return true; // Close enough, consider it reached
        }

        // console.log(`${this.constructor.name} potential overshooting detected: [${currentPos.x.toFixed(0)}, ${currentPos.y.toFixed(0)}] to [${target.x.toFixed(0)}, ${target.y.toFixed(0)}] distance: ${distance.toFixed(2)}`);

        // If not close enough, check if we are moving towards the target
        const velocity = this.body.velocity;

        // If velocity is zero, we've stopped or we didn't start moving
        if (velocity.lengthSq() === 0) { // Use lengthSq for efficiency
            return false;
        }

        // Calculate the vector pointing from the current position to the target
        const vecToTarget = target.clone().subtract(currentPos);

        // If we are *exactly* at the target, vecToTarget might be zero.
        if (vecToTarget.lengthSq() === 0) {
            return true;
        }

        // Calculate the dot product of velocity and the vector to the target.
        // A positive dot product means the velocity has a component *towards* the target.
        // A zero or negative dot product means the velocity is perpendicular or away from the target.
        const dotProduct = velocity.dot(vecToTarget);
        if(dotProduct <= 0) {
            console.log(`${this.constructor.name} dot product: ${dotProduct.toFixed(2)} (velocity: [${velocity.x.toFixed(0)}, ${velocity.y.toFixed(0)}], vecToTarget: [${vecToTarget.x.toFixed(0)}, ${vecToTarget.y.toFixed(0)}])`);
        }

        // We've reached the target if we are close enough AND
        // the dot product is <= 0 (meaning we are moving away, perpendicular, or stopped).
        return dotProduct <= 0;
    }

    /**
     * Method for subclasses to implement their specific logic
     * for finding work when they become idle. Called by IdleState.enter().
     */
    public checkForWork(): void {
        // Base implementation does nothing. Subclasses override.
        // console.log(`${this.constructor.name} checking for work (base implementation).`);
    }

    /**
     * Handles the logic when the NPC arrives at a destination.
     * Called by MovingState upon reaching the target.
     * Base implementation handles common cases like arriving home or at work.
     * Subclasses should override this to handle specific arrival purposes.
     * @param purpose The purpose string passed to MovingState (e.g., 'MovingHome', 'MovingToHarvest').
     * @param arrivedAt The position vector where the NPC arrived.
     */
    public handleArrival(purpose: string | null, arrivedAt: Phaser.Math.Vector2): void {
        console.log(`${this.constructor.name} handleArrival for purpose: ${purpose}`);
        if (purpose === 'MovingHome') {
            this.changeState(new RestingState());
        } else if (purpose === 'MovingToWork') {
            this.changeState(new IdleState());
        } else {
            // Default for unknown or unhandled purposes in base class
            console.log(`Base handleArrival defaulting to IdleState for purpose: ${purpose}`);
            this.changeState(new IdleState());
        }
    }

    // --- Update Loop ---

    /**
     * Updates the NPC's appearance (debug text) and delegates behavior to the current state.
     */
    // --- Event Handlers ---

    /** Handles the GoHomeTime event from TimeService */
    private handleGoHomeTime(): void {
        // Check if we are already resting or moving home
        if (this.currentState instanceof RestingState || (this.currentState instanceof MovingState && this.currentState.purpose === 'MovingHome')) {
            return; // Already resting or moving home
        }

        console.log(`${this.constructor.name} [${this.x.toFixed(0)}, ${this.y.toFixed(0)}] received GoHomeTime event!`); // Log position at start

        // If we have a home position and door key, find path home
        if (this.homePosition && this.homeDoorKey) {
            console.log(`  -> Finding path home.`);
            const startPos = new Phaser.Math.Vector2(this.x, this.y); // Position used for path calc
            const endPos = new Phaser.Math.Vector2(this.homePosition.x, this.homePosition.y);
            // Assume starting from work position key, find path to home door key
            // Pass undefined if keys are null
            const startKey = this.workPositionKey ?? undefined; // Use work key if available
            const endKey = this.homeDoorKey ?? undefined; // Use home key if available

            // Log position just before pathfinding
            console.log(`  -> Position before findPath: [${this.x.toFixed(0)}, ${this.y.toFixed(0)}]`);
            const path = this.currentScene.locationService.findPath(startPos, endPos, startKey, endKey);

            // Log position just before changing state
            console.log(`  -> Position before changeState: [${this.x.toFixed(0)}, ${this.y.toFixed(0)}]`);
            // Intentionally do not save the previousStateBeforeResting if we have a homePosition and homeDoorKey
            this.changeState(new MovingState(), { path: path, purpose: 'MovingHome' });
        } else {
            // No home position/key? Rest in place.
            console.log(`  -> No home position/key. Resting in place.`);
            console.log(`${this.constructor.name} received GoHomeTime event, but no home position. Resting in place.`);
            // Save state info if not already resting/moving home
            if (!(this.currentState instanceof RestingState) && !(this.currentState instanceof MovingState && this.currentState.purpose === 'MovingHome')) {
                // Get resumption data from the current state, if the method exists
                const resumptionData = typeof this.currentState.getResumptionData === 'function'
                    ? this.currentState.getResumptionData()
                    : {}; // Default to empty object if method doesn't exist

                console.log(`${this.constructor.name} saving state ${this.currentState.constructor.name} before resting in place. Data:`, resumptionData);

                this.previousStateBeforeResting = {
                    stateConstructor: this.currentState.constructor, // Store the constructor
                    data: resumptionData // Store the data returned by the state
                };

                // --- Manual State Transition to Resting (without calling exit on previous) ---
                const oldStateName = this.currentState?.constructor.name || 'None';
                const newState = new RestingState();
                this.currentState = newState; // Directly assign
                console.log(`${this.constructor.name} [${this.x.toFixed(0)}, ${this.y.toFixed(0)}] state: ${oldStateName} -> ${newState.constructor.name} (Manual Rest)`);
                newState.enter(this); // Only call enter on the new state
                this.updateAppearance();
                // --- End Manual Transition ---
            }
        }
    }

    /** Handles the DayStarted event from TimeService, triggering state resumption or start-of-day logic */
    private handleDayStartedEvent(): void {
        // Only trigger start-of-day behavior if currently resting
        if (this.currentState instanceof RestingState) {
            console.log(`${this.constructor.name} received DayStarted event while resting.`);
            // Check if we should resume and if there's state info to resume from
            if (this.previousStateBeforeResting) {
                const stateInfo = this.previousStateBeforeResting;
                this.previousStateBeforeResting = null; // Clear saved info

                console.log(`${this.constructor.name} should resume. Recreating state: ${stateInfo.stateConstructor.name}`);

                // Create a new instance of the state using the stored constructor
                const newStateInstance = new stateInfo.stateConstructor();

                // Use the standard changeState method to handle exit/enter and pass data
                this.changeState(newStateInstance, stateInfo.data);

            } else {
                // Either shouldn't resume or no state info was saved
                console.log(`${this.constructor.name} No state to resume or should not resume. Calling specific handleStartDay.`);
                this.handleStartDay(); // Call the specific NPC's start day logic
                this.previousStateBeforeResting = null; // Ensure it's cleared
            }
        } else {
             // console.log(`${this.constructor.name} received DayStarted event but not resting (state: ${this.currentState?.constructor.name}). Ignoring.`);
        }
    }

    // --- Update Loop ---

    /**
     * Delegates behavior to the current state and updates appearance.
     * Time-based logic is now handled by the TimeService event listener.
     */
    preUpdate(time: number, delta: number) {
        // console.log(`${this.constructor.name} [${this.x.toFixed(0)}, ${this.y.toFixed(0)}] preUpdate running. State: ${this.currentState?.constructor.name}`); // DEBUG LOG
        super.preUpdate(time, delta);

        // --- Delegate to Current State ---
        // console.log(`${this.constructor.name} preUpdate: About to call update on state: ${this.currentState?.constructor.name}`); // DEBUG LOG
        this.currentState?.update(this, delta);

        // Update debug text position
        this.updateAppearance();
    }

    /** Updates the debug state text content and position, including inventory */
    protected updateAppearance() {
        if (this.stateText && this.currentState) {
            let labelText = this.currentState.constructor.name.replace('State', ''); // Show simplified state name
            if (this.inventory) {
                labelText += ` (${this.inventory.type}: ${this.inventory.quantity})`; // Add inventory info
            }
            this.stateText.setText(labelText);
            this.stateText.setPosition(this.x, this.y - this.displayHeight / 2 - 2);
        }
    }

    // --- Cleanup ---
    destroy(fromScene?: boolean) {
        if (this.stateText) {
            this.stateText.destroy();
        }
        // Ensure state cleanup is called
        this.currentState?.exit(this);
        // Remove event listeners
        this.timeService.off(TimeEvents.GoHomeTime, this.handleGoHomeTime, this);
        this.timeService.off(TimeEvents.DayStarted, this.handleDayStartedEvent, this); // Remove day start listener
        super.destroy(fromScene);
    }
}
