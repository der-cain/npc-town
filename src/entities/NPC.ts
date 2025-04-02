import Phaser from 'phaser';
import { Item } from '../data/items'; // Removed ItemType as it wasn't used here
import GameScene from '../scenes/GameScene'; // For type safety
import NpcState from '../states/NpcState'; // Import the state interface
import IdleState from '../states/IdleState'; // Import initial state
import RestingState from '../states/RestingState'; // Import initial state option
import MovingState from '../states/MovingState'; // Import MovingState for time-based transitions

const NPC_SPEED = 80; // Pixels per second

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    public currentState!: NpcState; // Holds the current state object
    public inventory: Item | null = null; // What the NPC is carrying
    protected currentScene: GameScene; // Reference to the main scene
    private stateText: Phaser.GameObjects.Text; // For debugging state visually
    // targetPosition is now managed within MovingState
    public homePosition: Phaser.Geom.Point | null = null; // Assigned by GameScene
    public workPosition: Phaser.Geom.Point | null = null; // Assigned by GameScene

    constructor(scene: GameScene, x: number, y: number, texture: string | Phaser.Textures.Texture = 'npc_placeholder', frame?: string | number) {
        super(scene, x, y, texture, frame);
        this.currentScene = scene;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Initialize stateText - content will be updated in updateAppearance
        this.stateText = scene.add.text(x, y - 15, 'Initializing...', {
            fontSize: '10px', color: '#ffffff', backgroundColor: '#000000'
        }).setOrigin(0.5, 1).setDepth(100); // Ensure text is visible

        this.setInteractive();
        this.setCollideWorldBounds(true);

        // Set initial state - NPCs start resting at home
        // Note: We call this *after* the super constructor and basic setup
        this.changeState(new RestingState());
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
    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        // --- High-Priority Time-Based State Changes ---
        const scene = this.currentScene; // Alias for readability
        const shouldGoHome = scene.currentTimeOfDay >= scene.goHomeThreshold && scene.currentTimeOfDay < 1.0;

        // Check if it's time to go home and we aren't already resting or heading home
        if (shouldGoHome && !(this.currentState instanceof RestingState)) {
            // Avoid interrupting if already moving home
            let isMovingHome = false;
            if (this.currentState instanceof MovingState) {
                // Need access to the state's purpose - requires making purpose public or adding a getter
                // For now, let's assume MovingState has a public 'purpose' property (needs adjustment in MovingState.ts)
                 if ((this.currentState as any).purpose === 'MovingHome') {
                     isMovingHome = true;
                 }
            }

            if (!isMovingHome) {
                if (this.homePosition) {
                    console.log(`${this.constructor.name} time to go home!`);
                    const homeVec = new Phaser.Math.Vector2(this.homePosition.x, this.homePosition.y);
                    this.changeState(new MovingState(), { targetPosition: homeVec, purpose: 'MovingHome' });
                    // Skip current state's update for this frame as we just changed state
                    this.updateAppearance(); // Update text immediately
                    return;
                } else {
                    // No home? Rest in place.
                    console.log(`${this.constructor.name} time to rest, but no home position. Resting in place.`);
                    this.changeState(new RestingState());
                    this.updateAppearance(); // Update text immediately
                    return;
                }
            }
        }

        // --- Delegate to Current State ---
        // If no high-priority change occurred, run the current state's update
        this.currentState?.update(this, delta);

        // Update debug text position (content updated in changeState/constructor)
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
        // Ensure state cleanup is called if NPC is destroyed mid-state
        this.currentState?.exit(this);
        super.destroy(fromScene);
    }
}
