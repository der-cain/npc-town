/**
 * Defines the types of items that can exist in the game world.
 */
export type ItemType = 'Grape' | 'Wine';

/**
 * Represents an item stack in an inventory or being carried.
 */
export interface Item {
    type: ItemType;
    quantity: number;
}
