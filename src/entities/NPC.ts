import Phaser from 'phaser';
import { Item } from '../data/items';
import GameScene from '../scenes/GameScene'; // Still needed for adding to scene, physics, text
import NpcState from '../states/NpcState';
import IdleState from '../states/IdleState';
import RestingState from '../states/RestingState';
import MovingState from '../states/MovingState';
import { TimeService, TimeEvents } from '../services/TimeService'; // Import TimeService

const NPC_SPEED = 80; // Pixels per second

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    public currentState!: NpcState;
    public inventory: Item | null = null;
    public currentScene: GameScene; // Made public for states/logic to access services easily
    public timeService: TimeService; // Made public for states to access
    private stateText: Phaser.GameObjects.Text;
    public homePosition: Phaser.Geom.Point | null = null; // Actual home location
    public workPosition: Phaser.Geom.Point | null = null; // Actual work location
    public homeDoorKey: string | null = null; // Key for the door near home (set by GameScene)
    public workPositionKey: string | null = null; // Key for the work position/area entry (set by GameScene)

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

        // Listen for the GoHomeTime event
        this.timeService.on(TimeEvents.GoHomeTime, this.handleGoHomeTime, this);
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
    public setMovementTarget(target: Phaser.Math.Vector2): void {
        if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
            console.error(`${this.constructor.name} received invalid target for setMovementTarget:`, target);
            this.clearMovementTarget(); // Stop if target is invalid
            return;
        }
        // console.log(`${this.constructor.name} setting physics move to [${target.x.toFixed(0)}, ${target.y.toFixed(0)}]`);
        this.currentScene.physics.moveTo(this, target.x, target.y, NPC_SPEED);
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
     * Called by MovingState.update()
     * @param target The target position vector to check against.
     * @param threshold The maximum distance allowed to be considered "at" the target.
     * @returns True if the distance is within the threshold, false otherwise.
     */
    public hasReachedTarget(target: Phaser.Math.Vector2, threshold: number = 5): boolean {
        if (!target) return false;
        const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        return distance < threshold;
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
        if (this.currentState instanceof RestingState) {
            return; // Already resting
        }
        if (this.currentState instanceof MovingState && this.currentState.purpose === 'MovingHome') {
            return; // Already moving home
        }

        // If we have a home position, go there
        // If we have a home position and door key, find path home
        if (this.homePosition && this.homeDoorKey) {
            console.log(`${this.constructor.name} received GoHomeTime event! Finding path home.`);
            const startPos = new Phaser.Math.Vector2(this.x, this.y);
            const endPos = new Phaser.Math.Vector2(this.homePosition.x, this.homePosition.y);
            // Assume starting from work position key, find path to home door key
            // Pass undefined if keys are null
            const startKey = this.workPositionKey ?? undefined;
            const endKey = this.homeDoorKey ?? undefined;
            const path = this.currentScene.locationService.findPath(startPos, endPos, startKey, endKey);
            this.changeState(new MovingState(), { path: path, purpose: 'MovingHome' });
        } else {
            // No home position/key? Rest in place.
            console.log(`${this.constructor.name} received GoHomeTime event, but no home position. Resting in place.`);
            this.changeState(new RestingState());
        }
    }

    // --- Update Loop ---

    /**
     * Delegates behavior to the current state and updates appearance.
     * Time-based logic is now handled by the TimeService event listener.
     */
    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        // --- Delegate to Current State ---
        this.currentState?.update(this, delta);

        // Update debug text position
        this.updateAppearance();
    }

    /** Updates the debug state text content and position */
    protected updateAppearance() {
        if (this.stateText && this.currentState) {
            this.stateText.setText(this.currentState.constructor.name.replace('State', '')); // Show simplified state name
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
        // Remove event listener
        this.timeService.off(TimeEvents.GoHomeTime, this.handleGoHomeTime, this);
        super.destroy(fromScene);
    }
}
