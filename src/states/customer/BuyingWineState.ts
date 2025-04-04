import Phaser from 'phaser';
import NpcState from '../NpcState';
import NPC from '../../entities/NPC'; // Use base NPC type
import Customer from '../../entities/Customer'; // Specific type for casting if needed
import GameScene from '../../scenes/GameScene';
import MovingState from '../MovingState';
import DespawnedState from './DespawnedState'; // Need this for transition
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

        // Start a timer to simulate the buying process
        this.buyTimer = customer.currentScene.time.delayedCall(BUY_DURATION, () => {
            this.attemptToBuy(customer);
        });
    }

    update(npc: NPC, delta: number): void {
        // Logic is handled by the timer callback
        // If the timer finished and buy attempt was made, transition
        if (this.hasAttemptedBuy) {
            this.startLeaving(npc as Customer);
        }
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting BuyingWineState`);
        // Ensure timer is cleaned up if the state is exited prematurely
        if (this.buyTimer) {
            this.buyTimer.remove();
            this.buyTimer = null;
        }
        this.hasAttemptedBuy = false;
    }

    private attemptToBuy(customer: Customer): void {
        if (this.hasAttemptedBuy) return; // Prevent multiple attempts

        const scene = customer.currentScene as GameScene; // Cast scene
        console.log(`${customer.constructor.name} attempting to buy wine.`);

        if (scene.shopLogic.wineInventory > 0) {
            if (Math.random() < BUY_CHANCE) {
                const bought = scene.shopLogic.sellWine(1);
                if (bought) {
                    console.log(`${customer.constructor.name} successfully bought wine.`);
                    // Optional: Add visual feedback (e.g., show item briefly)
                } else {
                    console.log(`${customer.constructor.name} tried to buy wine, but failed (shop error?).`);
                }
            } else {
                console.log(`${customer.constructor.name} decided not to buy wine.`);
            }
        } else {
            console.log(`${customer.constructor.name} wanted wine, but shop is empty.`);
        }

        this.hasAttemptedBuy = true; // Mark buy attempt as complete
        // Transition will happen in the next update() call
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
