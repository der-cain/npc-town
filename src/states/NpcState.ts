import NPC from '../entities/NPC'; // Import base NPC class for type hinting

/**
 * Interface for defining the behavior of an NPC in a specific state.
 */
export default interface NpcState {
    /**
     * Called when the NPC enters this state.
     * @param npc The NPC entering the state.
     * @param data Optional data passed during the state transition (e.g., target position).
     */
    enter(npc: NPC, data?: any): void;

    /**
     * Called every frame while the NPC is in this state.
     * @param npc The NPC in this state.
     * @param delta Time elapsed since the last frame in milliseconds.
     */
    update(npc: NPC, delta: number): void;

    /**
     * Called just before the NPC leaves this state.
     * @param npc The NPC leaving the state.
     */
    exit(npc: NPC): void;

    /**
     * Optional method for a state to provide data needed for its resumption.
     * Called by NPC when saving state before resting in place.
     * @returns An object containing necessary data, or undefined/null if no specific data is needed.
     */
    getResumptionData?(): any;
}
