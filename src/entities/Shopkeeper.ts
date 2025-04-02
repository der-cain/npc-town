import NPC from './NPC';
import GameScene from '../scenes/GameScene';

export default class Shopkeeper extends NPC {
    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_shopkeeper'); // Use the generated yellow circle texture
        console.log('Shopkeeper created');
    }

    // Note: updateIdle logic will move into a state (e.g., IdleState or TendingShopState)

    // TODO: Add logic for buying wine from winemaker, selling to customers (likely within states)

    // Note: handleArrivalAtTarget logic is now handled within MovingState.update
}
