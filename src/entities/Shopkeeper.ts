import NPC from './NPC';
import GameScene from '../scenes/GameScene';

export default class Shopkeeper extends NPC {
    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_shopkeeper'); // Use the generated yellow circle texture
        console.log('Shopkeeper created');
    }

    // Override the idle update (will add logic later)
    protected updateIdle(time: number, delta: number): void {
        // Explicit check
        if (this.currentState !== 'Idle') return;

        // TODO: Manage shop inventory, interact with customers
    }

    // TODO: Add logic for buying wine from winemaker, selling to customers

    // Override the base arrival handler (no specific targets yet)
    protected handleArrivalAtTarget(target: Phaser.Math.Vector2): void {
        // Currently, Shopkeeper only moves between home and work.
        // Arrival at work is handled by the base NPC class setting state to Idle.
        // If other targets were added, logic would go here.
        super.handleArrivalAtTarget(target); // Default to going Idle
    }
}
