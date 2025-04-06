import Worker from './Worker'; // Import Worker instead of NPC
import GameScene from '../scenes/GameScene';
import { TimeService } from '../services/TimeService'; // Import TimeService
// Import necessary states and services
import MovingState from '../states/MovingState';
import { LocationKeys } from '../services/LocationService';

export default class Shopkeeper extends Worker { // Extend Worker
    // Constructor now requires TimeService
    constructor(scene: GameScene, x: number, y: number, timeService: TimeService) {
        super(scene, x, y, timeService, 'npc_shopkeeper'); // Pass timeService to base constructor
        console.log('Shopkeeper created');
    }

    // Note: updateIdle logic will move into a state (e.g., IdleState or TendingShopState)

    // TODO: Add logic for buying wine from winemaker, selling to customers (likely within states)

    // Note: handleArrivalAtTarget logic is now handled within MovingState.update
}
