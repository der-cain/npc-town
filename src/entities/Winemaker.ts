import Phaser from 'phaser'; // Import Phaser for Vector2
import NPC from './NPC';
import GameScene from '../scenes/GameScene';
// Import necessary states
import IdleState from '../states/IdleState';
import MovingState from '../states/MovingState';

export default class Winemaker extends NPC {
    public readonly batchSize = 5; // How many bottles to deliver at once (made public for potential state access)

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_winemaker'); // Use the generated blue circle texture
        console.log('Winemaker created');
    }

    // Note: updateIdle logic needs to move into a state (e.g., IdleState or CheckingWineryState)
    //       This state would check wineryLogic, collect wine, and transition to MovingState.

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
        // After attempting delivery, move back to the winery pickup point to wait
        const wineryTarget = this.currentScene.wineryWinePickupPoint;
        this.changeState(new MovingState(), {
            targetPosition: new Phaser.Math.Vector2(wineryTarget.x, wineryTarget.y),
            purpose: 'ReturningToWinery' // New purpose for clarity
        });
    }

    // Note: handleArrivalAtTarget logic is now handled within MovingState.update
}
