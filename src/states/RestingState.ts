import NPC from '../entities/NPC';
import NpcState from './NpcState';
import GameScene from '../scenes/GameScene';
// Import other states if needed for transitions
import MovingState from './MovingState'; // Assuming MovingState will exist
import IdleState from './IdleState';

/**
 * State representing the NPC resting, usually at home during the night.
 */
export default class RestingState implements NpcState {
    enter(npc: NPC, data?: any): void {
        console.log(`${npc.constructor.name} entering RestingState`);
        npc.clearMovementTarget(); // Ensure NPC stops moving
        // Optionally move to bed/specific spot within home if homePosition is known
        // if (npc.homePosition) {
        //     npc.setPosition(npc.homePosition.x, npc.homePosition.y);
        // }
        // Optionally play sleeping animation
    }

    update(npc: NPC, delta: number): void {
        // Check conditions to leave resting state (e.g., time of day)
        const scene = npc.scene as GameScene; // Cast scene to access custom properties

        if (scene.isDaytime) {
            console.log(`${npc.constructor.name} waking up.`);
            if (npc.workPosition) {
                // Create a Vector2 from the Geom.Point for MovingState
                const targetVec = new Phaser.Math.Vector2(npc.workPosition.x, npc.workPosition.y);
                // Transition to MovingState to go to work
                npc.changeState(new MovingState(), { targetPosition: targetVec, purpose: 'MovingToWork' });
            } else {
                // No work position? Just become idle.
                npc.changeState(new IdleState());
            }
        }
        // Otherwise, continue resting
    }

    exit(npc: NPC): void {
        console.log(`${npc.constructor.name} exiting RestingState`);
        // Stop sleeping animation if any
    }
}
