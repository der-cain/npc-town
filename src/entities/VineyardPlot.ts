import Phaser from 'phaser';
import GameScene from '../scenes/GameScene'; // Import GameScene for type safety

// Define the possible states for a vineyard plot
export type PlotState = 'Empty' | 'Growing' | 'Ripe';

// Define timings (in milliseconds)
const GROW_TIME = 10000; // 10 seconds to grow
const REGROW_DELAY = 2000; // 2 seconds after harvest before regrowth starts

export default class VineyardPlot extends Phaser.GameObjects.Rectangle {
    public currentState: PlotState = 'Empty';
    private stateText: Phaser.GameObjects.Text; // For debugging state visually
    private growTimer?: Phaser.Time.TimerEvent;
    private regrowTimer?: Phaser.Time.TimerEvent;

    constructor(scene: GameScene, x: number, y: number, width: number = 32, height: number = 32) {
        super(scene, x, y, width, height);
        scene.add.existing(this); // Add the rectangle to the scene

        // Add text to display state (useful for debugging)
        this.stateText = scene.add.text(x - width / 2, y - height / 2 - 15, this.currentState, {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#000000'
        }).setOrigin(0, 0);

        this.setStrokeStyle(1, 0x000000); // Black outline
        // Start the initial growth cycle
        this.setPlotState('Empty'); // Set initial state via our method
        this.startGrowthCycle();
    }

    private updateAppearance() {
        switch (this.currentState) {
            case 'Empty':
                this.setFillStyle(0x8B4513); // Brown (empty dirt)
                break;
            case 'Growing':
                this.setFillStyle(0x90EE90); // Light Green (growing)
                break;
            case 'Ripe':
                this.setFillStyle(0x800080); // Purple (ripe grapes)
                break;
        }
        this.stateText.setText(this.currentState);
        this.stateText.setPosition(this.x - this.width / 2, this.y - this.height / 2 - 15);
    }

    // Renamed from setState to avoid conflict with base GameObject method
    private setPlotState(newState: PlotState) {
        if (this.currentState === newState) return; // No change

        this.currentState = newState;
        console.log(`Plot at [${this.x.toFixed(0)}, ${this.y.toFixed(0)}] changed state to: ${this.currentState}`);
        this.updateAppearance();

        // Clear any existing timers when state changes manually (e.g., via harvest)
        this.growTimer?.remove();
        this.regrowTimer?.remove();
    }

    private startGrowthCycle() {
        if (this.currentState !== 'Empty') return; // Only grow from empty

        this.setPlotState('Growing');
        // Use delayedCall for the growth timer
        this.growTimer = this.scene.time.delayedCall(GROW_TIME, () => {
            if (this.currentState === 'Growing') { // Check if still growing (wasn't harvested)
                this.setPlotState('Ripe');
            }
        });
    }

    public harvest(): boolean {
        if (this.currentState !== 'Ripe') {
            console.log(`Attempted to harvest plot at [${this.x.toFixed(0)}, ${this.y.toFixed(0)}] but it's not ripe.`);
            return false; // Cannot harvest if not ripe
        }

        console.log(`Harvested plot at [${this.x.toFixed(0)}, ${this.y.toFixed(0)}].`);
        this.setPlotState('Empty');

        // Start a timer to delay regrowth
        this.regrowTimer = this.scene.time.delayedCall(REGROW_DELAY, () => {
            this.startGrowthCycle();
        });

        return true; // Successfully harvested
    }

    // Override destroy to clean up timers and text
    destroy(fromScene?: boolean) {
        this.growTimer?.remove();
        this.regrowTimer?.remove();
        this.stateText.destroy();
        super.destroy(fromScene);
    }
}
