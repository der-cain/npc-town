import Phaser from 'phaser';
import NPC from '../entities/NPC';
import NpcState from './NpcState';
import VineyardPlot from '../entities/VineyardPlot';
import Farmer from '../entities/Farmer'; // Import Farmer for type casting if needed
import GameScene from '../scenes/GameScene';
// Import states for transitions
import IdleState from './IdleState';
import MovingState from './MovingState';

/**
 * State representing the Farmer harvesting a specific VineyardPlot.
 * Handles the harvest timer and transitions after completion or failure.
 */
export default class HarvestingState implements NpcState {
    private targetPlot: VineyardPlot | null = null;
    private harvestTimer: Phaser.Time.TimerEvent | null = null;

    enter(npc: NPC, data?: any): void {
        console.log(`${npc.constructor.name} entering HarvestingState`);
        if (!(npc instanceof Farmer)) {
            console.error("HarvestingState entered by non-Farmer NPC!");
            npc.changeState(new IdleState());
            return;
        }
        if (!data || !(data.targetPlot instanceof VineyardPlot) || data.targetPlot.currentState !== 'Ripe') {
            console.warn(`${npc.constructor.name} entered HarvestingState with invalid or not ripe targetPlot.`);
            npc.changeState(new IdleState());
            return;
        }

        this.targetPlot = data.targetPlot;
        // Add non-null assertions as targetPlot is confirmed non-null here
        console.log(`${npc.constructor.name} starting to harvest plot [${this.targetPlot!.x.toFixed(0)}, ${this.targetPlot!.y.toFixed(0)}]`);
        npc.clearMovementTarget(); // Ensure stopped at the plot

        // Start the harvest timer (logic moved from Farmer.startHarvesting)
        this.harvestTimer = npc.scene.time.delayedCall(500, () => {
            // Timer callback - check if still valid before acting
            if (npc.currentState === this && this.targetPlot) { // Check if state is still this instance
                this.completeHarvest(npc as Farmer, this.targetPlot);
            }
        }, [], this);
    }

    update(npc: NPC, delta: number): void {
        // The main logic is handled by the timer callback in enter()
        // Update could potentially handle animations or interruptions.
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting HarvestingState`);
        // Clean up timer if it's still running (e.g., state changed externally)
        if (this.harvestTimer) {
            this.harvestTimer.remove(false); // remove() returns boolean, false arg prevents auto-destroy
            this.harvestTimer = null;
        }
        this.targetPlot = null; // Clear reference
    }

    /**
     * Helper method to check if this state instance is currently harvesting the specified plot.
     * Used in Farmer.ts timer callback for safety.
     * @param plot The plot to check against.
     * @returns True if this state is targeting the given plot, false otherwise.
     */
    public isHarvestingPlot(plot: VineyardPlot): boolean {
        return this.targetPlot === plot;
    }

    /**
     * Logic executed when the harvest timer completes.
     * Moved from the timer callback in Farmer.ts.
     */
    private completeHarvest(npc: Farmer, plot: VineyardPlot): void {
        const success = plot.harvest();
        if (success) {
            // Increment inventory
            if (!npc.inventory) {
                npc.inventory = { type: 'Grape', quantity: 1 };
            } else {
                npc.inventory.quantity++;
            }
            console.log(`Farmer harvested. Inventory: ${npc.inventory.quantity}/${(npc as any).maxInventory}`); // Access maxInventory (consider making it protected or adding getter)

            // Decide next action
            if (npc.inventory.quantity >= (npc as any).maxInventory) {
                console.log('Farmer inventory full after harvest, moving to winery.');
                const targetPoint = (npc.scene as GameScene).wineryGrapeDropOffPoint;
                // No need to clear targetPlot here, exit() handles it.
                npc.changeState(new MovingState(), { targetPosition: new Phaser.Math.Vector2(targetPoint.x, targetPoint.y), purpose: 'DeliveringGrapes' });
            } else {
                // Look for another plot immediately
                console.log('Farmer looking for next plot.');
                // No need to clear targetPlot here, exit() handles it.
                npc.changeState(new IdleState()); // Go back to idle to trigger plot search in next update
            }
        } else {
            console.warn('Farmer failed to harvest plot (maybe it was already harvested?).');
            // No need to clear targetPlot here, exit() handles it.
            npc.changeState(new IdleState()); // Go back to idle if harvest failed
        }
    }
}
