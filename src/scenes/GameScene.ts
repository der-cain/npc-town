import Phaser from 'phaser';
import VineyardPlot from '../entities/VineyardPlot';
import Farmer from '../entities/Farmer';
import Winemaker from '../entities/Winemaker';
import Shopkeeper from '../entities/Shopkeeper';
import { WineryLogic } from '../logic/WineryLogic'; // Import WineryLogic
import { ShopLogic } from '../logic/ShopLogic'; // Import ShopLogic

export default class GameScene extends Phaser.Scene {
  // Declare scene properties
  wineryDropOffPoint!: Phaser.Geom.Point;
  shopDropOffPoint!: Phaser.Geom.Point;
  vineyardPlots: VineyardPlot[] = [];
  farmer!: Farmer; // Reference to the farmer instance
  winemaker!: Winemaker; // Reference to the winemaker instance
  shopkeeper!: Shopkeeper; // Reference to the shopkeeper instance
  wineryLogic!: WineryLogic; // Handles winery inventory and production
  shopLogic!: ShopLogic; // Handles shop inventory and customers

  constructor() {
    // The key of the scene for Phaser's scene manager
    super('GameScene');
  }

  preload() {
    // Load assets like images, spritesheets, audio
    console.log('GameScene preload');

    // Generate placeholder NPC textures (colored circles)
    const npcRadius = 8;
    const npcDiameter = npcRadius * 2;

    // Farmer (Green)
    let farmerGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    farmerGraphics.fillStyle(0x00ff00); // Green
    farmerGraphics.fillCircle(npcRadius, npcRadius, npcRadius);
    farmerGraphics.generateTexture('npc_farmer', npcDiameter, npcDiameter);
    farmerGraphics.destroy();

    // Winemaker (Blue)
    let winemakerGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    winemakerGraphics.fillStyle(0x0000ff); // Blue
    winemakerGraphics.fillCircle(npcRadius, npcRadius, npcRadius);
    winemakerGraphics.generateTexture('npc_winemaker', npcDiameter, npcDiameter);
    winemakerGraphics.destroy();

    // Shopkeeper (Yellow)
    let shopkeeperGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    shopkeeperGraphics.fillStyle(0xffff00); // Yellow
    shopkeeperGraphics.fillCircle(npcRadius, npcRadius, npcRadius);
    shopkeeperGraphics.generateTexture('npc_shopkeeper', npcDiameter, npcDiameter);
    shopkeeperGraphics.destroy();

    console.log('Generated placeholder NPC textures.');
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

    // Create Vineyard Plots
    const plotSize = 32;
    const plotPadding = 10;
    const plotsPerRow = Math.floor(vineyardWidth / (plotSize + plotPadding));
    const plotsPerCol = Math.floor(vineyardHeight / (plotSize + plotPadding));

    for (let row = 0; row < plotsPerCol; row++) {
      for (let col = 0; col < plotsPerRow; col++) {
        const plotX = vineyardX + plotPadding + col * (plotSize + plotPadding) + plotSize / 2;
        const plotY = vineyardY + plotPadding + row * (plotSize + plotPadding) + plotSize / 2;
        const plot = new VineyardPlot(this, plotX, plotY, plotSize, plotSize);
        this.vineyardPlots.push(plot);
      }
    }
    console.log(`Created ${this.vineyardPlots.length} vineyard plots.`);

    // Create NPCs
    // Place them near their respective areas initially
    this.farmer = new Farmer(this, vineyardX + vineyardWidth + 30, vineyardY + 50);
    this.winemaker = new Winemaker(this, wineryX + wineryWidth / 2, wineryY + wineryHeight + 30);
    this.shopkeeper = new Shopkeeper(this, shopX + shopWidth / 2, shopY + shopHeight + 30);

    console.log('Created NPCs.');

    // Create Logic Handlers
    this.wineryLogic = new WineryLogic(this);
    this.shopLogic = new ShopLogic(this);

    // Add shutdown listeners
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
        console.log('GameScene shutting down...');
        this.wineryLogic.shutdown();
        this.shopLogic.shutdown();
    });
  }

  update(time: number, delta: number) {
    // Game loop logic, runs continuously
    // console.log('GameScene update', time, delta);
    // Example: player.update(cursors);
  }
}
