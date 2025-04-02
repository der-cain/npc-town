import Phaser from 'phaser';
import { Item, ItemType } from '../data/items';
import GameScene from '../scenes/GameScene'; // For type safety

// Define possible NPC states (will expand later)
export type NpcState =
    | 'Idle'
    | 'MovingToTarget'
    | 'Harvesting'
    | 'Delivering'
    | 'Producing'
    | 'Selling';

const NPC_SPEED = 80; // Pixels per second

export default class NPC extends Phaser.Physics.Arcade.Sprite {
    public currentState: NpcState = 'Idle';
    public inventory: Item | null = null; // What the NPC is carrying
    protected currentScene: GameScene; // Reference to the main scene
    private stateText: Phaser.GameObjects.Text; // For debugging state visually
    private targetPosition: Phaser.Math.Vector2 | null = null; // Where the NPC is moving

    constructor(scene: GameScene, x: number, y: number, texture: string | Phaser.Textures.Texture = 'npc_placeholder', frame?: string | number) {
        // Using a placeholder texture name - we'll create this texture dynamically
        super(scene, x, y, texture, frame);
        this.currentScene = scene;
        scene.add.existing(this);
        scene.physics.add.existing(this); // Enable physics

        // Make the physics body a circle if using circle graphics
        // this.setCircle(8); // Assuming radius 8 for a 16x16 circle

        // Add text to display state
        this.stateText = scene.add.text(x, y - 15, this.currentState, {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#000000'
        }).setOrigin(0.5, 1);

        this.setInteractive(); // Allow clicking later if needed
        this.setCollideWorldBounds(true); // Prevent moving off-screen

        this.setNpcState('Idle'); // Set initial state via our method
    }

    // Placeholder for visual updates (e.g., setting tint or texture)
    protected updateAppearance() {
        // Default: Could set tint based on role later
        // this.setTint(0xffffff);
        this.stateText.setText(this.currentState);
        this.stateText.setPosition(this.x, this.y - this.displayHeight / 2 - 2); // Adjust based on sprite size
    }

    // Renamed from setState to avoid conflict
    public setNpcState(newState: NpcState) {
        if (this.currentState === newState) return;
        console.log(`${this.constructor.name} [${this.x.toFixed(0)}, ${this.y.toFixed(0)}] changed state: ${this.currentState} -> ${newState}`);
        this.currentState = newState;
        this.updateAppearance();
    }

    // Move towards a specific point or GameObject with x/y properties
    public moveTo(target: Phaser.Math.Vector2 | { x: number; y: number }) {
        const targetX = target.x;
        const targetY = target.y;

        // Ensure targetX and targetY are numbers before proceeding
        if (typeof targetX !== 'number' || typeof targetY !== 'number') {
            console.error(`${this.constructor.name} received invalid target for moveTo:`, target);
            return;
        }

        this.targetPosition = new Phaser.Math.Vector2(targetX, targetY);
        this.setNpcState('MovingToTarget');
        console.log(`${this.constructor.name} moving to [${targetX.toFixed(0)}, ${targetY.toFixed(0)}]`);
        // Use scene's physics manager to move 'this' (the NPC sprite)
        this.currentScene.physics.moveTo(this, targetX, targetY, NPC_SPEED);
    }

    // Stop movement
    protected stopMovement() {
        if (this.body?.velocity) { // Check if body and velocity exist
           this.setVelocity(0, 0);
        }
        this.targetPosition = null;
        if (this.currentState === 'MovingToTarget') {
            this.setNpcState('Idle'); // Default state after stopping, can be overridden
        }
    }

    // Basic update loop for movement
    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta); // Call parent update

        // Update state text position
        this.stateText.setPosition(this.x, this.y - this.displayHeight / 2 - 2);

        // Check if reached target
        if (this.currentState === 'MovingToTarget' && this.targetPosition) {
            const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetPosition.x, this.targetPosition.y);
            if (distance < 5) { // Close enough threshold
                console.log(`${this.constructor.name} reached target [${this.targetPosition.x.toFixed(0)}, ${this.targetPosition.y.toFixed(0)}]`);
                this.stopMovement();
                // Subclasses will override stopMovement or setState to handle arrival logic
            }
        }

        // Call a specific update method for the current state (optional pattern)
        const stateUpdateMethod = `update${this.currentState}` as keyof this;
        if (typeof this[stateUpdateMethod] === 'function') {
            (this[stateUpdateMethod] as Function)(time, delta);
        }
    }

    // Example state-specific update (can be overridden)
    protected updateIdle(time: number, delta: number) {
        // Logic for when the NPC is idle
    }

    // Override destroy to clean up text
    destroy(fromScene?: boolean) {
        this.stateText.destroy();
        super.destroy(fromScene);
    }
}
