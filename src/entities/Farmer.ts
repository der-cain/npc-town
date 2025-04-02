import NPC from './NPC';
import GameScene from '../scenes/GameScene';
import VineyardPlot from './VineyardPlot';

export default class Farmer extends NPC {
    private targetPlot: VineyardPlot | null = null; // Track the specific plot being targeted
    private readonly maxInventory = 20; // How many grapes the farmer can carry

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_farmer'); // Use the generated green circle texture
        console.log('Farmer created');
    }

    // Override the idle update to look for work
    protected updateIdle(time: number, delta: number): void {
        // Explicit check, though preUpdate should handle this
        if (this.currentState !== 'Idle') return;

        // If inventory is full, go deliver
        if (this.inventory && this.inventory.quantity >= this.maxInventory) {
            console.log('Farmer inventory full, moving to winery.');
            this.targetPlot = null; // Ensure we don't think we're targeting a plot
            this.moveTo(this.currentScene.wineryGrapeDropOffPoint); // Use correct property name
            return; // Don't look for more plots
        }

        // Find a ripe plot that isn't already targeted (more robust check needed for multiple farmers)
        const availablePlots = this.currentScene.vineyardPlots.filter(plot => plot.currentState === 'Ripe');

        if (availablePlots.length > 0) {
            // Pick a random available plot
            const ripePlot = Phaser.Utils.Array.GetRandom(availablePlots);
            console.log(`Farmer found ripe plot at [${ripePlot.x.toFixed(0)}, ${ripePlot.y.toFixed(0)}]`);
            this.targetPlot = ripePlot;
            this.moveTo(ripePlot); // Move towards the plot
            // State is set to 'MovingToTarget' within moveTo()
        }
        // Else: Stay idle if no ripe plots found
    }

    // Override stopMovement to handle arrival at different locations
    protected stopMovement(): void {
        const previousState = this.currentState;
        super.stopMovement(); // Sets state back to Idle by default

        // Logic after reaching a target depends on *what* the target was
        if (previousState === 'MovingToTarget') {
            if (this.targetPlot && Phaser.Math.Distance.Between(this.x, this.y, this.targetPlot.x, this.targetPlot.y) < 5) {
                // Arrived at the vineyard plot
                this.startHarvesting();
            } else if (Phaser.Math.Distance.Between(this.x, this.y, this.currentScene.wineryGrapeDropOffPoint.x, this.currentScene.wineryGrapeDropOffPoint.y) < 5) { // Use correct property name
                // Arrived at the winery drop-off
                this.deliverGrapes();
            }
        }
    }

    private deliverGrapes(): void {
        if (!this.inventory || this.inventory.type !== 'Grape') {
            console.warn('Farmer arrived at winery but has no grapes.');
            this.setNpcState('Idle');
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
        this.setNpcState('Idle'); // Go back to idle after attempting delivery
    }

    private startHarvesting(): void {
        if (!this.targetPlot || this.targetPlot.currentState !== 'Ripe') {
            console.warn('Farmer tried to harvest but target plot is invalid or not ripe.');
            this.targetPlot = null;
            this.setNpcState('Idle'); // Go back to idle
            return;
        }

        console.log(`Farmer starting to harvest plot [${this.targetPlot.x.toFixed(0)}, ${this.targetPlot.y.toFixed(0)}]`);
        this.setNpcState('Harvesting');

        // Simulate harvesting time (faster)
        this.scene.time.delayedCall(500, () => { // 0.5 seconds to harvest
            if (this.currentState === 'Harvesting' && this.targetPlot) { // Check if still harvesting this plot
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
                        this.targetPlot = null; // Clear target plot before moving
                        this.moveTo(this.currentScene.wineryGrapeDropOffPoint); // Use correct property name
                    } else {
                        // Look for another plot immediately
                        console.log('Farmer looking for next plot.');
                        this.targetPlot = null; // Clear current target
                        this.setNpcState('Idle'); // Go back to idle to trigger plot search in next update
                    }
                } else {
                    console.warn('Farmer failed to harvest plot (maybe it was already harvested?).');
                    this.targetPlot = null; // Clear target plot
                    this.setNpcState('Idle'); // Go back to idle if harvest failed
                }
                this.targetPlot = null; // Clear target plot
            }
        }, [], this);
    }

    // Example state-specific update
    protected updateHarvesting(time: number, delta: number): void {
        // Farmer is busy harvesting, maybe play an animation later
    }
}
