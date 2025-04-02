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
    public wineInventory: number = 0;
    private customerTimer?: Phaser.Time.TimerEvent;

    // Define capacity limits (optional)
    public maxWine: number = 10;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        console.log('ShopLogic initialized.');
        this.startCustomerSimulation();
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

    // Simulate customers arriving and buying
    private startCustomerSimulation(): void {
        this.customerTimer = this.scene.time.addEvent({
            delay: CUSTOMER_ARRIVAL_RATE,
            callback: this.simulateCustomer,
            callbackScope: this,
            loop: true
        });
        console.log('Shop customer simulation started.');
    }

    private simulateCustomer(): void {
        console.log('Customer arrived at shop.');
        if (this.wineInventory > 0) {
            if (Math.random() < CUSTOMER_BUY_CHANCE) {
                console.log('Customer is buying wine...');
                this.sellWine(1); // Customer buys 1 wine
            } else {
                console.log('Customer looked but did not buy.');
            }
        } else {
            console.log('Customer arrived, but shop has no wine.');
        }
    }

    // Cleanup timers on shutdown
    public shutdown() {
        this.customerTimer?.remove();
    }
}
