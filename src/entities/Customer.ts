import Phaser from 'phaser';
import NPC from './NPC';
import GameScene from '../scenes/GameScene';
import { TimeService } from '../services/TimeService';
// Import customer states
import BuyingWineState from '../states/customer/BuyingWineState';
import DespawnedState from '../states/customer/DespawnedState'; // Needed for handleStartDay and handleGoHomeTime
import EnteringShopState from '@/states/customer/EnteringShopState';
// Import base states needed
import NpcState from '../states/NpcState';
import RestingState from '../states/RestingState';


export default class Customer extends NPC {
    private stateBeforeResting: NpcState | null = null; // To store state before resting

    constructor(scene: GameScene, x: number, y: number, timeService: TimeService) {
        // Use a specific texture key for customers
        super(scene, x, y, timeService, 'npc_customer');
        // Customers don't need home/work positions in the traditional sense
        this.homePosition = null;
        this.workPosition = null;
        this.homeDoorKey = null;
        this.workPositionKey = null;

        // Initial state will be set by the spawner (e.g., EnteringShopState)
        // For safety, set a default if needed, though it should be overwritten immediately
        // this.changeState(new IdleState());
        console.log(`Customer created at [${x.toFixed(0)}, ${y.toFixed(0)}]`);
    }

    /**
     * Defines the customer's behavior at the start of the workday.
     * Customers simply despawn, letting the regular spawner handle new arrivals.
     */
    public handleStartDay(): void {
        console.log("Customer received StartWorkTime while resting. Despawning.");
        this.changeState(new EnteringShopState());
    }


    /**
     * Handles arrival logic specific to the Customer.
     * Determines the next state based on the purpose of the movement.
     * @param purpose The purpose string from MovingState (e.g., 'EnteringShop', 'LeavingShop').
     * @param arrivedAt The position vector where the NPC arrived.
     */
    public override handleArrival(purpose: string | null, arrivedAt: Phaser.Math.Vector2): void {
        console.log(`Customer handleArrival for purpose: ${purpose}`);

        if (purpose === 'EnteringShop') {
            console.log('Customer arrived at shop, changing to BuyingWineState.');
            this.changeState(new BuyingWineState());
        } else if (purpose === 'LeavingShop') {
            console.log('Customer reached despawn point, changing to DespawnedState.');
            this.changeState(new DespawnedState());
        } else {
            // Default behavior if purpose is unknown or null
            console.warn(`Customer handleArrival: Unknown purpose '${purpose}'. Changing to DespawnedState.`);
            this.changeState(new DespawnedState()); // Default to despawning if purpose is unclear
        }
    }

    // Customers don't look for work in the same way
    public override checkForWork(): void {
        // No specific work check needed for customers in Idle state
    }

    // Override updateAppearance if needed for different customer visuals/text
    // protected override updateAppearance() {
    //     super.updateAppearance();
    //     // Add customer-specific text or visuals
    // }

    // Override destroy if extra cleanup is needed
    // destroy(fromScene?: boolean) {
    //     console.log('Customer being destroyed');
    //     super.destroy(fromScene);
    // }
}
