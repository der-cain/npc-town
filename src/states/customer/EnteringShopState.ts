import Phaser from 'phaser';
import NpcState from '../NpcState';
import NPC from '../../entities/NPC';
import Customer from '../../entities/Customer';
import GameScene from '../../scenes/GameScene';
import MovingState from '../MovingState';
import { LocationKeys } from '../../services/LocationService';
import IdleState from '../IdleState'; // Fallback

/**
 * State for a customer moving from their spawn point towards the shop entrance.
 */
export default class EnteringShopState implements NpcState {
    enter(npc: NPC): void {
        const customer = npc as Customer;
        const scene = customer.currentScene as GameScene;
        console.log(`${customer.constructor.name} entering EnteringShopState`);

        try {
            const startPos = new Phaser.Math.Vector2(customer.x, customer.y);
            const endPosPoint = scene.locationService.getPoint(LocationKeys.ShopDoor);
            const endPosVec = new Phaser.Math.Vector2(endPosPoint.x, endPosPoint.y);

            // Find path from current (spawn) location to the shop door
            // Since spawn point is off-path, this will likely be a direct path.
            const path = scene.locationService.findPath(
                startPos,
                endPosVec,
                LocationKeys.CustomerSpawnPoint, // Provide start key hint
                LocationKeys.ShopDoor           // Provide end key hint
            );

            if (path && path.length > 0) {
                customer.changeState(new MovingState(), { path: path, purpose: 'EnteringShop' });
            } else {
                console.error(`${customer.constructor.name} could not find path to shop door. Switching to Idle.`);
                customer.changeState(new IdleState()); // Fallback if pathfinding fails
            }
        } catch (error) {
            console.error(`${customer.constructor.name} error finding path in EnteringShopState:`, error);
            customer.changeState(new IdleState()); // Fallback on error
        }
    }

    update(npc: NPC, delta: number): void {
        // MovingState handles the actual movement and arrival check.
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting EnteringShopState`);
        // Cleanup is handled by MovingState's exit
    }
}
