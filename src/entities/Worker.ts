import Phaser from 'phaser';
import NPC from './NPC';
import MovingState from '../states/MovingState';
import GameScene from '../scenes/GameScene'; // Needed for type casting currentScene
import { TimeService } from '../services/TimeService'; // Needed for constructor signature match

/**
 * Abstract base class for worker NPCs (Farmer, Winemaker, Shopkeeper).
 * Implements common start-of-day behavior.
 */
export default abstract class Worker extends NPC {

    // Constructor signature must match the base class (NPC) even if not adding new logic here
    constructor(scene: GameScene, x: number, y: number, timeService: TimeService, texture: string | Phaser.Textures.Texture, frame?: string | number) {
        super(scene, x, y, timeService, texture, frame);
    }

    /**
     * Implements the common start-of-day behavior for all workers: move to the work position.
     */
    public handleStartDay(): void {
        if (this.workPosition && this.workPositionKey && this.homeDoorKey) {
            console.log(`${this.constructor.name} received StartWorkTime. Moving to work.`);
            const startPos = new Phaser.Math.Vector2(this.x, this.y);
            const endPos = new Phaser.Math.Vector2(this.workPosition.x, this.workPosition.y);
            // Pathfind from home door node to work position node
            const path = this.currentScene.locationService.findPath(startPos, endPos, this.homeDoorKey, this.workPositionKey);
            if (path && path.length > 0) {
                this.changeState(new MovingState(), { path: path, purpose: 'MovingToWork' });
            } else {
                 console.warn(`${this.constructor.name} failed to find path to work from ${startPos.x},${startPos.y}. Remaining Resting.`);
                 // Stay resting if path fails
            }
        } else {
            console.warn(`${this.constructor.name} received StartWorkTime but work position/keys are not set. Remaining Resting.`);
            // Stay resting if configuration is missing
        }
    }

    // Subclasses (Farmer, Winemaker, Shopkeeper) will still need to implement other abstract methods
    // or specific logic like checkForWork, handleArrival overrides, etc.
}
