import Phaser from 'phaser';
import NpcState from '../NpcState';
import NPC from '../../entities/NPC'; // Use base NPC type
import Customer from '../../entities/Customer'; // Specific type for casting if needed
import GameScene from '../../scenes/GameScene';
import MovingState from '../MovingState';
import { LocationKeys } from '../../services/LocationService';

const BUY_DURATION = 2000; // ms (2 seconds)
const BUY_CHANCE = 0.8; // 80% chance to attempt buying if wine is available

export default class BuyingWineState implements NpcState {
    private buyTimer: Phaser.Time.TimerEvent | null = null;
    private hasAttemptedBuy: boolean = false;

    enter(npc: NPC): void {
        const customer = npc as Customer; // Cast for type safety if needed
        console.log(`${customer.constructor.name} entering BuyingWineState`);
        customer.clearMovementTarget(); // Stop moving if somehow still moving

        this.hasAttemptedBuy = false;
        this.scheduleBuyAttempt(customer); // Use a helper to schedule/reschedule
    }

    update(npc: NPC, delta: number): void {
        // Logic is now primarily handled by the timer callback and attemptToBuy
        // Transition happens when hasAttemptedBuy becomes true
        if (this.hasAttemptedBuy) {
            // Ensure we are not already leaving (e.g., if update runs multiple times after timer)
            if (!(npc.currentState instanceof MovingState && (npc.currentState as MovingState).purpose === 'LeavingShop')) {
                 this.startLeaving(npc as Customer);
            }
        }
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting BuyingWineState`);
        // Ensure timer is cleaned up if the state is exited prematurely
        if (this.buyTimer) {
            this.buyTimer.remove();
            this.buyTimer = null;
        }
        this.hasAttemptedBuy = false; // Reset flag on exit
    }

    // Helper method to schedule the buy attempt timer
    private scheduleBuyAttempt(customer: Customer): void {
        // Clear existing timer if any
        if (this.buyTimer) {
            this.buyTimer.remove();
        }
        // Schedule new timer
        this.buyTimer = customer.currentScene.time.delayedCall(BUY_DURATION, () => {
            this.attemptToBuy(customer);
        }, [], this); // Pass context
    }


    private attemptToBuy(customer: Customer): void {
        // Don't attempt if already decided/succeeded (flag is set in update)
        if (this.hasAttemptedBuy) return;

        const scene = customer.currentScene as GameScene;
        console.log(`${customer.constructor.name} attempting to buy wine.`);

        if (scene.shopLogic.wineInventory > 0) {
            // Shop has wine
            if (Math.random() < BUY_CHANCE) {
                // Customer decides to buy
                const bought = scene.shopLogic.sellWine(1);
                if (bought) {
                    console.log(`${customer.constructor.name} successfully bought wine.`);
                    this.hasAttemptedBuy = true; // Success, mark as done
                } else {
                    // This case should ideally not happen if inventory > 0, but handle defensively
                    console.error(`${customer.constructor.name} tried to buy wine, but sellWine failed unexpectedly.`);
                    this.hasAttemptedBuy = true; // Mark as done to avoid infinite loop on error
                }
            } else {
                // Customer decided not to buy this time
                console.log(`${customer.constructor.name} decided not to buy wine this time.`);
                this.hasAttemptedBuy = true; // Decided not to buy, mark as done
            }
        } else {
            // Shop is empty
            console.log(`${customer.constructor.name} wanted wine, but shop is empty. Waiting...`);
            // DO NOT set hasAttemptedBuy = true
            // Reschedule the check
            this.scheduleBuyAttempt(customer);
        }

        // Note: Transition to leaving now happens in update() when hasAttemptedBuy is true
    }


    private startLeaving(customer: Customer): void {
        console.log(`${customer.constructor.name} finished buying process, starting to leave.`);
        const scene = customer.currentScene as GameScene;
        const startPos = new Phaser.Math.Vector2(customer.x, customer.y);
        const endPosPoint = scene.locationService.getPoint(LocationKeys.CustomerDespawnPoint);
        const endPosVec = new Phaser.Math.Vector2(endPosPoint.x, endPosPoint.y); // Convert Point to Vector2
        const path = scene.locationService.findPath(startPos, endPosVec, LocationKeys.ShopDoor, LocationKeys.CustomerDespawnPoint); // Use ShopDoor as nominal start key

        customer.changeState(new MovingState(), { path: path, purpose: 'LeavingShop' });
    }
}
