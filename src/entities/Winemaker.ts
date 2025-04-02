import NPC from './NPC';
import GameScene from '../scenes/GameScene';

export default class Winemaker extends NPC {
    private readonly batchSize = 5; // How many bottles to deliver at once

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_winemaker'); // Use the generated blue circle texture
        console.log('Winemaker created');
    }

    // Override the idle update
    protected updateIdle(time: number, delta: number): void {
        // Check if winery has a full batch available and we have no inventory
        if (this.currentScene.wineryLogic.wineInventory >= this.batchSize && this.inventory === null) {
            console.log(`Winemaker found batch of ${this.batchSize} wine available.`);
            // Try to collect the full batch
            const collected = this.currentScene.wineryLogic.collectWine(this.batchSize);
            if (collected) {
                console.log(`Winemaker collected batch of ${this.batchSize} wine.`);
                this.inventory = { type: 'Wine', quantity: this.batchSize };
                // Move to the shop drop-off point
                this.moveTo(this.currentScene.shopWineDropOffPoint); // Use correct property name
            } else {
                // Should not happen if wineInventory >= batchSize, but good to handle
                console.warn(`Winemaker tried to collect batch of ${this.batchSize}, but failed unexpectedly.`);
            }
        }
        // Note: Production is handled automatically by WineryLogic when grapes arrive
    }

    // Override stopMovement to handle arrival at the shop
    protected stopMovement(): void {
        const previousState = this.currentState;
        super.stopMovement(); // Sets state back to Idle by default

        if (previousState === 'MovingToTarget') {
            // Check if arrived at the shop drop-off point
            if (Phaser.Math.Distance.Between(this.x, this.y, this.currentScene.shopWineDropOffPoint.x, this.currentScene.shopWineDropOffPoint.y) < 5) { // Use correct property name
                this.deliverWine();
            }
            // Check if arrived back at the winery pickup point
            else if (Phaser.Math.Distance.Between(this.x, this.y, this.currentScene.wineryWinePickupPoint.x, this.currentScene.wineryWinePickupPoint.y) < 5) {
                console.log('Winemaker arrived back at winery pickup point.');
                // State is already set to Idle by super.stopMovement()
            }
        }
    }

    private deliverWine(): void {
        if (!this.inventory || this.inventory.type !== 'Wine') {
            console.warn('Winemaker arrived at shop but has no wine.');
            this.setNpcState('Idle');
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
        // After delivering, move back to the winery pickup point to wait
        this.moveTo(this.currentScene.wineryWinePickupPoint);
        // Note: setNpcState('Idle') will be called by stopMovement when it arrives there
    }
}
