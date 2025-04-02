import Phaser from 'phaser';
import { Item, ItemType } from '../data/items';
import GameScene from '../scenes/GameScene'; // For type safety

// Define possible NPC states (will expand later)
export type NpcState =
    | 'Idle'
    | 'MovingToTarget' // Generic movement (e.g., farmer to plot, winemaker to shop)
    | 'MovingToWork'
    | 'MovingHome'
    | 'Harvesting'
    | 'Delivering'
    | 'Producing'
    | 'Selling'
    | 'Resting';

const NPC_SPEED = 80; // Pixels per second

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    public currentState: NpcState = 'Idle';
    public inventory: Item | null = null; // What the NPC is carrying
    protected currentScene: GameScene; // Reference to the main scene
    private stateText: Phaser.GameObjects.Text; // For debugging state visually
    private targetPosition: Phaser.Math.Vector2 | null = null; // Where the NPC is moving
    public homePosition: Phaser.Geom.Point | null = null; // Assigned by GameScene
    public workPosition: Phaser.Geom.Point | null = null; // Assigned by GameScene

    constructor(scene: GameScene, x: number, y: number, texture: string | Phaser.Textures.Texture = 'npc_placeholder', frame?: string | number) {
        super(scene, x, y, texture, frame);
        this.currentScene = scene;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.stateText = scene.add.text(x, y - 15, this.currentState, {
            fontSize: '10px', color: '#ffffff', backgroundColor: '#000000'
        }).setOrigin(0.5, 1);

        this.setInteractive();
        this.setCollideWorldBounds(true);

        // Initial state will be set in GameScene after creation
    }

    protected updateAppearance() {
        this.stateText.setText(this.currentState);
        this.stateText.setPosition(this.x, this.y - this.displayHeight / 2 - 2);
    }

    public setNpcState(newState: NpcState) {
        if (this.currentState === newState) return;

        const oldState = this.currentState;
        console.log(`${this.constructor.name} [${this.x.toFixed(0)}, ${this.y.toFixed(0)}] state: ${oldState} -> ${newState}`);
        this.currentState = newState;

        // Stop actions/timers when leaving certain states or entering resting/moving home
        if (newState === 'Resting' || newState === 'MovingHome' || newState === 'MovingToWork') {
            if (this.body?.velocity.x !== 0 || this.body?.velocity.y !== 0) {
                this.setVelocity(0, 0);
            }
            this.targetPosition = null;
            // TODO: Cancel specific action timers if needed (e.g., Farmer harvest timer)
            // if (oldState === 'Harvesting' && this.harvestTimer) this.harvestTimer.remove();
        }

        this.updateAppearance();
    }

    public moveTo(target: Phaser.Math.Vector2 | { x: number; y: number }, movingState: NpcState = 'MovingToTarget') {
        // Note: Removed check for this.currentState === 'Resting' here,
        // as the preUpdate logic now handles waking up and initiating movement.

        const targetX = target.x;
        const targetY = target.y;

        if (typeof targetX !== 'number' || typeof targetY !== 'number') {
            console.error(`${this.constructor.name} received invalid target for moveTo:`, target);
            return;
        }

        this.setNpcState(movingState); // Set state BEFORE moving
        this.targetPosition = new Phaser.Math.Vector2(targetX, targetY);
        console.log(`${this.constructor.name} moving to [${targetX.toFixed(0)}, ${targetY.toFixed(0)}] in state ${movingState}`);
        this.currentScene.physics.moveTo(this, targetX, targetY, NPC_SPEED);
    }

    // Simplified stopMovement - just stops physics
    protected stopMovement() {
        if (this.body?.velocity) {
           this.setVelocity(0, 0);
        }
        this.targetPosition = null;
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        const scene = this.currentScene; // Alias for readability

        // --- Day/Night State Transitions ---
        const shouldGoHome = scene.currentTimeOfDay >= scene.goHomeThreshold && scene.currentTimeOfDay < 1.0; // Check if it's time to go home (before midnight)
        const isNightTime = !scene.isDaytime; // Check if it's actually night (for resting)

        if (shouldGoHome && this.currentState !== 'Resting' && this.currentState !== 'MovingHome') {
            // Time to head home!
            if (this.homePosition) {
                console.log(`${this.constructor.name} heading home for the night.`);
                this.moveTo(this.homePosition, 'MovingHome');
            } else {
                this.setNpcState('Resting'); // No home? Rest in place.
            }
        } else if (scene.isDaytime && this.currentState === 'Resting') {
            // Time to wake up and go to work!
            console.log(`${this.constructor.name} waking up.`);
            if (this.workPosition) {
                this.moveTo(this.workPosition, 'MovingToWork');
            } else {
                this.setNpcState('Idle'); // No work position? Just idle.
            }
        }

        // --- Update Logic ---
        this.stateText.setPosition(this.x, this.y - this.displayHeight / 2 - 2);

        // If Resting, do nothing else
        if (this.currentState === 'Resting') {
             if (this.body?.velocity.x !== 0 || this.body?.velocity.y !== 0) {
                this.setVelocity(0, 0); // Ensure stopped
            }
            return;
        }

        // Check if reached target while moving
        if ((this.currentState === 'MovingToTarget' || this.currentState === 'MovingHome' || this.currentState === 'MovingToWork') && this.targetPosition) {
            const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetPosition.x, this.targetPosition.y);
            if (distance < 5) {
                const arrivedAt = this.targetPosition; // Store target info
                const previousState = this.currentState;
                console.log(`${this.constructor.name} reached target [${arrivedAt.x.toFixed(0)}, ${arrivedAt.y.toFixed(0)}] in state ${previousState}`);

                // Stop movement *immediately* upon arrival detection
                this.stopMovement();

                // Determine next state based on arrival context
                let nextState: NpcState = 'Idle'; // Default if no specific arrival logic matches
                if (previousState === 'MovingHome' && this.homePosition && this.homePosition.x === arrivedAt.x && this.homePosition.y === arrivedAt.y) {
                    console.log(`${this.constructor.name} arrived home.`);
                    nextState = 'Resting';
                } else if (previousState === 'MovingToWork' && this.workPosition && this.workPosition.x === arrivedAt.x && this.workPosition.y === arrivedAt.y) {
                     console.log(`${this.constructor.name} arrived at work.`);
                    nextState = 'Idle'; // Arrived at work, become idle
                } else if (previousState === 'MovingToTarget') {
                    // Handle arrival for generic moves (subclass responsibility)
                    // Note: handleArrivalAtTarget should call setNpcState itself
                    this.handleArrivalAtTarget(arrivedAt);
                    return; // Skip default state setting below if handled by subclass
                }
                // else: If interrupted while MovingHome/MovingToWork but not at destination, default to Idle

                // Set the determined state
                this.setNpcState(nextState);
                return; // Skip state-specific update for this frame as we just arrived
            }
        }

        // Call state-specific update method if it exists (and not moving)
        const stateUpdateMethod = `update${this.currentState}`;
        if (typeof (this as any)[stateUpdateMethod] === 'function') {
            ((this as any)[stateUpdateMethod] as Function)(time, delta);
        }
    }

    // New method for subclasses to override for specific target arrivals
    protected handleArrivalAtTarget(target: Phaser.Math.Vector2) {
        console.log(`${this.constructor.name} arrived at generic target [${target.x.toFixed(0)}, ${target.y.toFixed(0)}], going Idle.`);
        this.setNpcState('Idle');
    }

    // Example state-specific update (can be overridden)
    protected updateIdle(time: number, delta: number) {
        // Base implementation does nothing, subclasses override
    }

    destroy(fromScene?: boolean) {
        this.stateText.destroy();
        super.destroy(fromScene);
    }
}
