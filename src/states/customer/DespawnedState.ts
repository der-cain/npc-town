import NpcState from '../NpcState';
import NPC from '../../entities/NPC';

/**
 * A marker state indicating the customer has left the map and can be removed.
 */
export default class DespawnedState implements NpcState {
    enter(npc: NPC): void {
        console.log(`${npc.constructor.name} entering DespawnedState (ready for removal)`);
        // Stop any movement just in case
        npc.clearMovementTarget();
        // Make the NPC invisible or disable physics if desired before removal
        npc.setVisible(false);
        npc.setActive(false);
        if (npc.body) {
            npc.body.enable = false;
        }
    }

    update(npc: NPC, delta: number): void {
        // No action needed in this state. GameScene will handle removal.
    }

    exit(npc: NPC): void {
        // No specific cleanup needed when transitioning *from* this state,
        // as the NPC is usually destroyed immediately after entering it.
        console.log(`${npc.constructor.name} exiting DespawnedState (being destroyed)`);
    }
}
