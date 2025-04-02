import Phaser from 'phaser';
import { Item, ItemType } from '../data/items';

const PRODUCTION_TIME = 5000; // 5 seconds to produce wine

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

    // Method for Winemaker to take grapes (starts production implicitly)
    public takeGrapes(amount: number): boolean {
        if (this.grapeInventory >= amount && !this.isProducing) {
            this.grapeInventory -= amount;
            console.log(`Winemaker took ${amount} grapes. Remaining grapes: ${this.grapeInventory}`);
            this.startProductionProcess();
            return true;
        }
        console.log(`Winemaker failed to take ${amount} grapes (Available: ${this.grapeInventory}, Producing: ${this.isProducing})`);
        return false;
    }

    // Method for Winemaker to collect finished wine
    public collectWine(amount: number): boolean {
        if (this.wineInventory >= amount) {
            this.wineInventory -= amount;
            console.log(`Winemaker collected ${amount} wine. Remaining wine: ${this.wineInventory}`);
            return true;
        }
        console.log(`Winemaker failed to collect ${amount} wine (Available: ${this.wineInventory})`);
        return false;
    }

    // Internal method to attempt starting production
    private tryStartProduction(): void {
        if (this.hasGrapes() && !this.isProducing && this.wineInventory < this.maxWine) {
            // For simplicity, let's assume Winemaker takes 1 grape to start
            if (this.takeGrapes(1)) {
                // Production started successfully via takeGrapes -> startProductionProcess
            }
        }
    }

    // Internal method handling the production timer
    private startProductionProcess(): void {
        if (this.isProducing) return; // Already producing

        this.isProducing = true;
        console.log('Winery started producing wine...');

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
