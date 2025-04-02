import NPC from './NPC';
import GameScene from '../scenes/GameScene';
import { TimeService } from '../services/TimeService'; // Import TimeService

export default class Shopkeeper extends NPC {
    // Constructor now requires TimeService
    constructor(scene: GameScene, x: number, y: number, timeService: TimeService) {
        super(scene, x, y, timeService, 'npc_shopkeeper'); // Pass timeService to base constructor
        console.log('Shopkeeper created');
    }

    // Note: updateIdle logic will move into a state (e.g., IdleState or TendingShopState)

    // TODO: Add logic for buying wine from winemaker, selling to customers (likely within states)

    // Note: handleArrivalAtTarget logic is now handled within MovingState.update
}
