import NPC from './NPC';
import GameScene from '../scenes/GameScene';

export default class Winemaker extends NPC {
    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_winemaker'); // Use the generated blue circle texture
        console.log('Winemaker created');
    }

    // Override the idle update
    protected updateIdle(time: number, delta: number): void {
        // Check if winery has finished wine available
        if (this.currentScene.wineryLogic.wineInventory > 0 && this.inventory === null) {
            console.log('Winemaker checking for finished wine...');
            // Try to collect 1 wine
            const collected = this.currentScene.wineryLogic.collectWine(1);
            if (collected) {
                console.log('Winemaker collected 1 wine.');
                this.inventory = { type: 'Wine', quantity: 1 };
                // Move to the shop drop-off point
                this.moveTo(this.currentScene.shopDropOffPoint);
            } else {
                // Should not happen if wineInventory > 0, but good to handle
                console.warn('Winemaker tried to collect wine, but failed unexpectedly.');
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
            if (Phaser.Math.Distance.Between(this.x, this.y, this.currentScene.shopDropOffPoint.x, this.currentScene.shopDropOffPoint.y) < 5) {
                this.deliverWine();
            }
            // Could add logic here if winemaker moves elsewhere
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
        this.setNpcState('Idle'); // Go back to idle after attempting delivery
    }
}
