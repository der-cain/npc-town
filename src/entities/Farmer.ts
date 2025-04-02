import NPC from './NPC';
import GameScene from '../scenes/GameScene';
import VineyardPlot from './VineyardPlot';
// Import necessary states
import IdleState from '../states/IdleState';
import MovingState from '../states/MovingState';
import HarvestingState from '../states/HarvestingState'; // Assuming this will exist

export default class Farmer extends NPC {
    public targetPlot: VineyardPlot | null = null; // Track the specific plot being targeted (Made public for state access)
    protected readonly maxInventory = 20; // How many grapes the farmer can carry (Made protected)

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_farmer'); // Use the generated green circle texture
        console.log('Farmer created');
    }

    // Note: stopMovement logic is now handled within MovingState.update/exit

    /**
     * Called by IdleState.enter() - Farmer checks for ripe plots or delivery needs.
     */
    public override checkForWork(): void {
        // Only look for work during the day and if currently Idle
        // (avoids issues if checkForWork is somehow called during another state)
        if (!this.currentScene.isDaytime || !(this.currentState instanceof IdleState)) {
            // console.log(`${this.constructor.name} skipping checkForWork (not daytime or not Idle)`);
            return;
        }

        // 1. Check if inventory is full, need to deliver
        if (this.inventory && this.inventory.quantity >= this.maxInventory) {
            console.log('Farmer checking work: Inventory full, moving to winery.');
            this.targetPlot = null; // Ensure plot target is cleared
            const targetPoint = this.currentScene.wineryGrapeDropOffPoint;
            this.changeState(new MovingState(), {
                targetPosition: new Phaser.Math.Vector2(targetPoint.x, targetPoint.y),
                purpose: 'DeliveringGrapes'
            });
            return; // Don't look for plots if delivering
        }

        // 2. Find a ripe plot to harvest
        // TODO: Add logic to prevent multiple farmers targeting the same plot
        const availablePlots = this.currentScene.vineyardPlots.filter(plot => plot.currentState === 'Ripe');

        if (availablePlots.length > 0) {
            const ripePlot = Phaser.Utils.Array.GetRandom(availablePlots);
            console.log(`Farmer checking work: Found ripe plot at [${ripePlot.x.toFixed(0)}, ${ripePlot.y.toFixed(0)}]`);
            this.targetPlot = ripePlot; // Set the target plot on the farmer instance
            // Transition to MovingState to go to the plot
            this.changeState(new MovingState(), {
                targetPosition: new Phaser.Math.Vector2(ripePlot.x, ripePlot.y),
                purpose: 'MovingToHarvest',
            });
        } else {
            // console.log("Farmer checking work: No ripe plots found and inventory not full.");
        }
    }

    private deliverGrapes(): void {
        // This method might be called by a state upon arrival at the winery
        if (!this.inventory || this.inventory.type !== 'Grape') {
            console.warn('Farmer trying to deliver but has no grapes.');
            this.changeState(new IdleState()); // Go idle if delivery is impossible
            return;
        }

        console.log(`Farmer delivering ${this.inventory.quantity} grapes to winery.`);
        const accepted = this.currentScene.wineryLogic.addGrapes(this.inventory.quantity);

        if (accepted) {
            this.inventory = null; // Successfully delivered
            console.log('Grapes delivered successfully.');
        } else {
            console.log('Winery did not accept grapes (maybe full?). Farmer keeps grapes.');
            // Farmer might wait or try again later - for now, just go idle
        }
        this.changeState(new IdleState()); // Go back to idle after attempting delivery
    }

    // This method might be called by a state upon arrival at a plot
    private startHarvesting(): void {
        // Called when arriving at a target plot
        if (!this.targetPlot || this.targetPlot.currentState !== 'Ripe') {
            console.warn('Farmer arrived at plot, but it is invalid or not ripe.');
            this.targetPlot = null;
            this.changeState(new IdleState()); // Go back to idle
            return;
        }

        console.log(`Farmer starting to harvest plot [${this.targetPlot.x.toFixed(0)}, ${this.targetPlot.y.toFixed(0)}]`);
        // Transition to Harvesting state, passing the target plot
        this.changeState(new HarvestingState(), { targetPlot: this.targetPlot });

        // Simulate harvesting time (faster) - This timer logic should ideally move INTO HarvestingState.enter or update
        this.scene.time.delayedCall(500, () => { // 0.5 seconds to harvest
            // Check if we are *still* in the Harvesting state and targeting the same plot
            if (this.currentState instanceof HarvestingState && this.targetPlot) {
                // Explicitly assert type after instanceof check
                const harvestingState = this.currentState as HarvestingState;
                // Check if the state is still targeting the *correct* plot
                if (harvestingState.isHarvestingPlot(this.targetPlot)) {
                    const success = this.targetPlot.harvest();
                    if (success) {
                    // Increment inventory
                    if (!this.inventory) {
                        this.inventory = { type: 'Grape', quantity: 1 };
                    } else {
                        this.inventory.quantity++;
                    }
                    console.log(`Farmer harvested. Inventory: ${this.inventory.quantity}/${this.maxInventory}`);

                    // Decide next action
                    if (this.inventory.quantity >= this.maxInventory) {
                        console.log('Farmer inventory full after harvest, moving to winery.');
                        const targetPoint = this.currentScene.wineryGrapeDropOffPoint;
                        this.targetPlot = null; // Clear target plot before moving
                        this.changeState(new MovingState(), { targetPosition: new Phaser.Math.Vector2(targetPoint.x, targetPoint.y), purpose: 'DeliveringGrapes' });
                    } else {
                        // Look for another plot immediately
                    console.log('Farmer looking for next plot.');
                    this.targetPlot = null; // Clear current target
                    this.changeState(new IdleState()); // Go back to idle to trigger plot search in next update
                }
                    } else {
                        // Harvest failed (plot wasn't ripe?)
                        console.warn('Farmer failed to harvest plot (maybe it was already harvested?).');
                        this.targetPlot = null;
                        this.changeState(new IdleState());
                    }
                } else {
                    // State is HarvestingState, but not for the expected plot? Go idle.
                    console.warn(`Farmer in HarvestingState but isHarvestingPlot returned false for targetPlot [${this.targetPlot.x.toFixed(0)}, ${this.targetPlot.y.toFixed(0)}]. Going Idle.`);
                    this.targetPlot = null;
                    this.changeState(new IdleState());
                }
            } // No else needed here - if not HarvestingState or no targetPlot, timer does nothing
        }, [], this);
    }

// Note: updateHarvesting logic will move to HarvestingState

// Note: handleArrivalAtTarget logic is now handled within MovingState.update
}
