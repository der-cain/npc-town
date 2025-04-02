import NPC from './NPC';
import GameScene from '../scenes/GameScene';

export default class Winemaker extends NPC {
    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'npc_winemaker'); // Use the generated blue circle texture
        console.log('Winemaker created');
    }

    // Override the idle update (will add logic later)
    protected updateIdle(time: number, delta: number): void {
        // TODO: Look for grapes at the winery drop-off
    }

    // TODO: Add logic for producing wine, moving to shop, etc.
}
