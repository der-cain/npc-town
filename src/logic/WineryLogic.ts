import Phaser from 'phaser';
import { Item, ItemType } from '../data/items';

const PRODUCTION_TIME = 5000; // 5 seconds to produce wine
const GRAPES_PER_WINE = 5; // How many grapes needed for 1 wine

/**
 * Manages the state and inventory of the Winery.
 * This is a simple non-visual logic handler.
 */
export class WineryLogic {
    private scene: Phaser.Scene;
    public grapeInventory: number = 0;
    public wineInventory: number = 0;
    public isProducing: boolean = false;
    private productionTimer?: Phaser.Time.TimerEvent;

    // Define capacity limits (optional)
    public maxGrapes: number = 30; // Increased capacity
    public maxWine: number = 5;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        console.log('WineryLogic initialized.');
    }

    // Method for Farmer to drop off grapes
    public addGrapes(amount: number): boolean {
        if (this.grapeInventory + amount > this.maxGrapes) {
            console.log(`Winery cannot accept ${amount} grapes, exceeds capacity.`);
            // Optionally allow partial drop-off
            return false; // Could return amount accepted instead
        }
        this.grapeInventory += amount;
        console.log(`Winery received ${amount} grapes. Total grapes: ${this.grapeInventory}`);
        // Automatically start production if possible and not already producing
        this.tryStartProduction();
        return true;
    }

    // Method for Winemaker to check for grapes
    public hasGrapes(): boolean {
        return this.grapeInventory > 0;
    }

    // Method for Winemaker to collect finished wine
    public collectWine(amount: number): boolean {
        if (this.wineInventory >= amount) {
            this.wineInventory -= amount;
            console.log(`Winemaker collected ${amount} wine. Remaining wine: ${this.wineInventory}`);
            // Check if we can start producing again immediately after collection
            this.tryStartProduction();
            return true;
        }
        console.log(`Winemaker failed to collect ${amount} wine (Available: ${this.wineInventory})`);
        return false;
    }

    // Internal method to attempt starting production
    private tryStartProduction(): void {
        console.log(`Winery trying production check: Grapes=${this.grapeInventory}, Producing=${this.isProducing}, Wine=${this.wineInventory}/${this.maxWine}`); // Added log
        // Check if we have enough grapes, aren't already producing, and have space for wine
        if (this.grapeInventory >= GRAPES_PER_WINE && !this.isProducing && this.wineInventory < this.maxWine) {
            console.log('Winery starting production process...');
            this.startProductionProcess(); // Directly start the process
        } else {
            // Log exactly why it didn't start
            if (this.grapeInventory < GRAPES_PER_WINE) console.log('Winery check failed: Not enough grapes.');
            if (this.isProducing) console.log('Winery check failed: Already producing.');
            if (this.wineInventory >= this.maxWine) console.log('Winery check failed: Wine storage full.');
        }
    }

    // Internal method handling the production timer
    private startProductionProcess(): void {
        // Double check conditions just before starting
        if (this.isProducing || this.grapeInventory < GRAPES_PER_WINE) return;

        // Consume GRAPES_PER_WINE grapes to start production
        this.grapeInventory -= GRAPES_PER_WINE;
        this.isProducing = true;
        console.log(`Winery started producing 1 wine (used ${GRAPES_PER_WINE} grapes)...`);

        this.productionTimer = this.scene.time.delayedCall(PRODUCTION_TIME, () => {
            this.isProducing = false;
            if (this.wineInventory < this.maxWine) {
                this.wineInventory++;
                console.log(`Winery finished producing 1 wine. Total wine: ${this.wineInventory}`);
                // Check if more grapes are available to continue production
                this.tryStartProduction();
            } else {
                console.log('Winery finished producing, but wine storage is full.');
            }
        });
    }

    // Cleanup timers on shutdown
    public shutdown() {
        this.productionTimer?.remove();
    }
}
