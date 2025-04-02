import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    // The key of the scene for Phaser's scene manager
    super('GameScene');
  }

  preload() {
    // Load assets like images, spritesheets, audio
    console.log('GameScene preload');
    // Example: this.load.image('sky', 'assets/sky.png');
  }

  create() {
    // Set up game objects like sprites, text, groups
    console.log('GameScene create');
    // Example: this.add.image(400, 300, 'sky');
    this.cameras.main.setBackgroundColor('#5D7C43'); // A grassy green background

    // Define areas (adjust coordinates and sizes as needed)
    const vineyardX = 50;
    const vineyardY = 50;
    const vineyardWidth = 300;
    const vineyardHeight = 200;

    const wineryX = 400;
    const wineryY = 50;
    const wineryWidth = 150;
    const wineryHeight = 100;

    const shopX = 600;
    const shopY = 300;
    const shopWidth = 150;
    const shopHeight = 100;

    // Draw placeholders
    // Vineyard Area (light brown)
    this.add.rectangle(
      vineyardX + vineyardWidth / 2,
      vineyardY + vineyardHeight / 2,
      vineyardWidth,
      vineyardHeight,
      0xAE8A6F // Light brown fill
    ).setStrokeStyle(1, 0x7C5A4F); // Darker brown stroke

    // Winery Building (grey)
    this.add.rectangle(
      wineryX + wineryWidth / 2,
      wineryY + wineryHeight / 2,
      wineryWidth,
      wineryHeight,
      0x888888 // Grey fill
    ).setStrokeStyle(1, 0x555555); // Darker grey stroke

    // Shop Building (tan)
    this.add.rectangle(
      shopX + shopWidth / 2,
      shopY + shopHeight / 2,
      shopWidth,
      shopHeight,
      0xD2B48C // Tan fill
    ).setStrokeStyle(1, 0x8B4513); // Saddle brown stroke

    // Add labels (optional, but helpful)
    this.add.text(vineyardX + 5, vineyardY + 5, 'Vineyard Area', { fontSize: '14px', color: '#ffffff' });
    this.add.text(wineryX + 5, wineryY + 5, 'Winery', { fontSize: '14px', color: '#ffffff' });
    this.add.text(shopX + 5, shopY + 5, 'Shop', { fontSize: '14px', color: '#ffffff' });

    // Define interaction points (can be refined later)
    // Example: A point within the winery for drop-off
    this.wineryDropOffPoint = new Phaser.Geom.Point(wineryX + wineryWidth / 2, wineryY + wineryHeight + 10);
    // Example: A point within the shop for drop-off
    this.shopDropOffPoint = new Phaser.Geom.Point(shopX + shopWidth / 2, shopY - 10);

    console.log('Placeholder world layout created.');
  }

  // Declare scene properties if needed (like interaction points)
  wineryDropOffPoint!: Phaser.Geom.Point;
  shopDropOffPoint!: Phaser.Geom.Point;


  update(time: number, delta: number) {
    // Game loop logic, runs continuously
    // console.log('GameScene update', time, delta);
    // Example: player.update(cursors);
  }
}
