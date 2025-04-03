import Phaser from 'phaser'; // Import Phaser for Vector2
import NPC from './NPC';
import GameScene from '../scenes/GameScene';
import { TimeService } from '../services/TimeService';
import { LocationKeys } from '../services/LocationService'; // Import LocationKeys
// Import necessary states
import IdleState from '../states/IdleState';
import MovingState from '../states/MovingState';

export default class Winemaker extends NPC {
    public readonly batchSize = 5; // How many bottles to deliver at once (made public for potential state access)

    // Constructor now requires TimeService
    constructor(scene: GameScene, x: number, y: number, timeService: TimeService) {
        super(scene, x, y, timeService, 'npc_winemaker'); // Pass timeService to base constructor
        console.log('Winemaker created');
    }

    /**
     * Called by IdleState.update() - Winemaker checks if wine is ready for delivery.
     */
    public override checkForWork(): void {
        // Only look for work during the day and if currently Idle
        // Use timeService for daytime check
        if (!this.timeService.isDaytime || !(this.currentState instanceof IdleState)) {
            return;
        }

        // Check if winery has a full batch available and we have no inventory
        if (this.currentScene.wineryLogic.wineInventory >= this.batchSize && this.inventory === null) {
            console.log(`Winemaker checking work: Found batch of ${this.batchSize} wine available.`);
            // Try to collect the full batch
            const collected = this.currentScene.wineryLogic.collectWine(this.batchSize);
            if (collected) {
                console.log(`Winemaker collected batch of ${this.batchSize} wine.`);
                this.inventory = { type: 'Wine', quantity: this.batchSize };
                // Move to the shop drop-off point using LocationService pathfinding
                const startPos = new Phaser.Math.Vector2(this.x, this.y);
                const endPoint = this.currentScene.locationService.getPoint(LocationKeys.ShopWineDropOff); // Actual drop-off
                const endPos = new Phaser.Math.Vector2(endPoint.x, endPoint.y);
                // Pathfind from WineryDoor to ShopDoor
                const path = this.currentScene.locationService.findPath(startPos, endPos, LocationKeys.WineryDoor, LocationKeys.ShopDoor);
                this.changeState(new MovingState(), {
                    path: path,
                    purpose: 'DeliveringWine'
                });
            } else {
                // Should not happen if wineInventory >= batchSize, but good to handle
                console.warn(`Winemaker tried to collect batch of ${this.batchSize}, but failed unexpectedly.`);
                // Remain Idle
            }
        }
        // Else: Remain Idle if no batch is ready or inventory is not empty
    }

    // Note: stopMovement logic is now handled within MovingState.update/exit

    /**
     * Called by a state (e.g., MovingState) upon arrival at the shop drop-off point.
     */
    public deliverWine(): void { // Made public for states to call
        if (!this.inventory || this.inventory.type !== 'Wine') {
            console.warn('Winemaker trying to deliver but has no wine.');
            this.changeState(new IdleState()); // Go idle if delivery is impossible
            return;
        }

        console.log(`Winemaker delivering ${this.inventory.quantity} wine to shop.`);
        const accepted = this.currentScene.shopLogic.addWine(this.inventory.quantity);

        if (accepted) {
            this.inventory = null; // Successfully delivered
            console.log('Wine delivered successfully to shop.');
        } else {
            console.log('Shop did not accept wine (maybe full?). Winemaker keeps wine.');
            // Winemaker might wait or try again later - for now, just go idle
        }
        // After attempting delivery, move back to the winery pickup point using LocationService pathfinding
        const startPos = new Phaser.Math.Vector2(this.x, this.y); // Current pos (should be near shop drop off)
        const endPoint = this.currentScene.locationService.getPoint(LocationKeys.WinemakerWorkPos); // Actual work position
        const endPos = new Phaser.Math.Vector2(endPoint.x, endPoint.y);
        // Pathfind from ShopDoor back to WineryDoor
        const path = this.currentScene.locationService.findPath(startPos, endPos, LocationKeys.ShopDoor, LocationKeys.WineryDoor);
        this.changeState(new MovingState(), {
            path: path,
            purpose: 'ReturningToWinery'
        });
    }

    /**
     * Overrides the base handleArrival to manage Winemaker-specific transitions.
     */
    public override handleArrival(purpose: string | null, arrivedAt: Phaser.Math.Vector2): void {
        console.log(`Winemaker handleArrival for purpose: ${purpose}`);
        if (purpose === 'DeliveringWine') {
            // Arrived at shop, deliver wine (which transitions to MovingState -> ReturningToWinery)
            this.deliverWine();
        } else if (purpose === 'ReturningToWinery') {
            // Arrived back at winery, go idle
            this.changeState(new IdleState());
        } else {
            // For other purposes (MovingHome, MovingToWork, unknown), use base logic
            super.handleArrival(purpose, arrivedAt);
        }
    }

    // Note: handleArrivalAtTarget logic is now handled within MovingState.update (and this handleArrival override)
}
