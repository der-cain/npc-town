import Phaser from 'phaser';
import GameScene from './scenes/GameScene'; // We'll create this next

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
  width: 800,
  height: 600,
  parent: 'game-container', // ID of the div to contain the game
  physics: {
    default: 'arcade',
    arcade: {
      // gravity: { y: 200 }, // Optional gravity
      debug: false // Set to true for physics debugging visuals
    }
  },
  pixelArt: true, // Crucial for crisp pixel art
  scene: [
    GameScene // The main scene for our game
  ]
};

// Instantiate the game
const game = new Phaser.Game(config);

console.log('Phaser game initialized:', game);
