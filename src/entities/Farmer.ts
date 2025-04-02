import NPC from './NPC';
import GameScene from '../scenes/GameScene';
import VineyardPlot from './VineyardPlot';

export default class Farmer extends NPC {
    private targetPlot: VineyardPlot | null = null; // Track the specific plot being targeted

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_farmer'); // Use the generated green circle texture
        console.log('Farmer created');
    }

    // Override the idle update to look for work
    protected updateIdle(time: number, delta: number): void {
        // Find the first ripe plot that isn't already targeted by another farmer (if we had multiple)
        const ripePlot = this.currentScene.vineyardPlots.find(plot => plot.currentState === 'Ripe'); // Simplified: doesn't check if targeted

        if (ripePlot) {
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
            }
            // TODO: Add logic for arriving at Winery later
        }
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

        // Simulate harvesting time
        this.scene.time.delayedCall(2000, () => { // 2 seconds to harvest
            if (this.currentState === 'Harvesting' && this.targetPlot) { // Check if still harvesting this plot
                const success = this.targetPlot.harvest();
                if (success) {
                    console.log('Farmer finished harvesting.');
                    this.inventory = { type: 'Grape', quantity: 1 }; // Pick up 1 grape (placeholder)
                    // TODO: Move to Winery next
                    this.setNpcState('Idle'); // Go back to idle for now
                } else {
                    console.warn('Farmer failed to harvest plot (maybe it was already harvested?).');
                    this.setNpcState('Idle'); // Go back to idle
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
