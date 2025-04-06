import Phaser from 'phaser';
import { Item, ItemType } from '../data/items';

const CUSTOMER_ARRIVAL_RATE = 8000; // Milliseconds between customer attempts
const CUSTOMER_BUY_CHANCE = 0.7; // 70% chance a customer buys if wine is available

/**
 * Manages the state and inventory of the Shop.
 * Also simulates basic customer behavior.
 */
export class ShopLogic {
    private scene: Phaser.Scene;
    public wineInventory: number = 2; // Changed initial inventory to 2
    // private customerTimer?: Phaser.Time.TimerEvent; // Removed old timer

    // Define capacity limits (optional)
    public maxWine: number = 10;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        console.log('ShopLogic initialized.');
        // this.startCustomerSimulation(); // Removed old simulation start
    }

    // Method for Winemaker to drop off wine
    public addWine(amount: number): boolean {
        if (this.wineInventory + amount > this.maxWine) {
            console.log(`Shop cannot accept ${amount} wine, exceeds capacity.`);
            return false;
        }
        this.wineInventory += amount;
        console.log(`Shop received ${amount} wine. Total wine: ${this.wineInventory}`);
        return true;
    }

    // Method for simulated customers to buy wine
    public sellWine(amount: number): boolean {
        if (this.wineInventory >= amount) {
            this.wineInventory -= amount;
            console.log(`Shop sold ${amount} wine. Remaining wine: ${this.wineInventory}`);
            return true;
        }
        console.log(`Shop failed to sell ${amount} wine (Available: ${this.wineInventory})`);
        return false;
    }

    // Removed simulateCustomer and startCustomerSimulation methods

    // Cleanup timers on shutdown (if any were added back)
    public shutdown() {
        // this.customerTimer?.remove(); // Removed old timer cleanup
        console.log('ShopLogic shutdown.');
    }
}
