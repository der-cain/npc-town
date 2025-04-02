import NPC from './NPC';
import GameScene from '../scenes/GameScene';

export default class Shopkeeper extends NPC {
    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_shopkeeper'); // Use the generated yellow circle texture
        console.log('Shopkeeper created');
    }

    // Override the idle update (will add logic later)
    protected updateIdle(time: number, delta: number): void {
        // TODO: Manage shop inventory, interact with customers
    }

    // TODO: Add logic for buying wine from winemaker, selling to customers
}
