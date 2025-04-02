import Phaser from 'phaser';
import VineyardPlot from '../entities/VineyardPlot';
import Farmer from '../entities/Farmer';
import Winemaker from '../entities/Winemaker';
import Shopkeeper from '../entities/Shopkeeper';
import { WineryLogic } from '../logic/WineryLogic'; // Import WineryLogic
import { ShopLogic } from '../logic/ShopLogic'; // Import ShopLogic

export default class GameScene extends Phaser.Scene {
  // Declare scene properties
  wineryGrapeDropOffPoint!: Phaser.Geom.Point; // Where farmer drops grapes
  wineryWinePickupPoint!: Phaser.Geom.Point; // Where winemaker picks up wine
  shopWineDropOffPoint!: Phaser.Geom.Point; // Where winemaker drops wine
  vineyardPlots: VineyardPlot[] = [];
  farmer!: Farmer; // Reference to the farmer instance
  winemaker!: Winemaker; // Reference to the winemaker instance
  shopkeeper!: Shopkeeper; // Reference to the shopkeeper instance
  wineryLogic!: WineryLogic; // Handles winery inventory and production
  shopLogic!: ShopLogic; // Handles shop inventory and customers

  // UI Text Elements
  private wineryGrapeText!: Phaser.GameObjects.Text;
  private wineryWineText!: Phaser.GameObjects.Text;
  private shopWineText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text; // For Day/Night display
  private nightOverlay!: Phaser.GameObjects.Rectangle; // Darkening overlay

  // Day/Night Cycle properties
  private dayLengthSeconds: number = 120; // 2 minutes for a full cycle
  private currentTimeOfDay: number = 0.25; // Start mid-morning (0.0 = midnight, 0.25 = morning, 0.5 = noon, 0.75 = evening)
  public isDaytime: boolean = true; // Public so NPCs can check it
  private nightStartThreshold: number = 0.70; // 70% through the cycle
  private dayStartThreshold: number = 0.15; // 15% through the cycle (allows for some night)

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

    // Define interaction points
    this.wineryGrapeDropOffPoint = new Phaser.Geom.Point(wineryX + wineryWidth / 2, wineryY + wineryHeight + 10); // Below winery
    this.wineryWinePickupPoint = new Phaser.Geom.Point(wineryX - 10, wineryY + wineryHeight / 2); // Left of winery
    this.shopWineDropOffPoint = new Phaser.Geom.Point(shopX + shopWidth / 2, shopY - 10); // Above shop

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

    // Create UI Text Elements
    const uiTextStyle = { fontSize: '12px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 2, y: 2 } };
    // Position texts near the relevant buildings
    this.wineryGrapeText = this.add.text(wineryX, wineryY + wineryHeight + 5, 'Grapes: 0', uiTextStyle);
    this.wineryWineText = this.add.text(wineryX, wineryY + wineryHeight + 20, 'Wine: 0', uiTextStyle);
    this.shopWineText = this.add.text(shopX, shopY + shopHeight + 5, 'Wine: 0', uiTextStyle);
    // Time indicator in upper right
    this.timeText = this.add.text(this.cameras.main.width - 10, 10, 'Time: Day', uiTextStyle).setOrigin(1, 0).setDepth(1001); // Ensure UI is above overlay

    // Set depth for other UI elements
    this.wineryGrapeText.setDepth(1001);
    this.wineryWineText.setDepth(1001);
    this.shopWineText.setDepth(1001);

    // Create Night Overlay
    this.nightOverlay = this.add.rectangle(
        0, 0,
        this.cameras.main.width, this.cameras.main.height,
        0x000000 // Black color
    )
    .setOrigin(0, 0)
    .setAlpha(0) // Start fully transparent
    .setDepth(1000); // Ensure it's on top of game elements but below UI

    console.log('Created UI text elements and night overlay.');
  }

  update(time: number, delta: number) {
    // --- Time Update ---
    const deltaSeconds = delta / 1000;
    this.currentTimeOfDay += deltaSeconds / this.dayLengthSeconds;
    this.currentTimeOfDay %= 1.0; // Wrap around at 1.0 (midnight)

    // Determine if it's daytime (working hours)
    const previouslyDaytime = this.isDaytime;
    this.isDaytime = this.currentTimeOfDay >= this.dayStartThreshold && this.currentTimeOfDay < this.nightStartThreshold;

    if (this.isDaytime && !previouslyDaytime) {
        console.log("--- Day Started ---");
        // Potentially trigger wake-up events here if needed
    } else if (!this.isDaytime && previouslyDaytime) {
        console.log("--- Night Started ---");
        // Potentially trigger go-to-sleep events here if needed
    }

    // --- Visual Update ---
    // Adjust night overlay alpha based on time of day
    const maxAlpha = 0.6; // How dark it gets at peak night
    let targetAlpha = 0;
    // Define transition periods (e.g., dawn 0.10-0.25, dusk 0.70-0.85)
    const dawnStart = this.dayStartThreshold; // 0.10
    const dawnEnd = 0.25;
    const duskStart = this.nightStartThreshold; // 0.70
    const duskEnd = 0.85;

    if (this.currentTimeOfDay < dawnStart || this.currentTimeOfDay >= duskEnd) {
        // Full night
        targetAlpha = maxAlpha;
    } else if (this.currentTimeOfDay >= dawnStart && this.currentTimeOfDay < dawnEnd) {
        // Dawn: Fade out overlay (night -> day)
        targetAlpha = Phaser.Math.Linear(maxAlpha, 0, Phaser.Math.Percent(this.currentTimeOfDay, dawnStart, dawnEnd));
    } else if (this.currentTimeOfDay >= duskStart && this.currentTimeOfDay < duskEnd) {
        // Dusk: Fade in overlay (day -> night)
        targetAlpha = Phaser.Math.Linear(0, maxAlpha, Phaser.Math.Percent(this.currentTimeOfDay, duskStart, duskEnd));
    } else {
        // Full day
        targetAlpha = 0;
    }
    this.nightOverlay.setAlpha(targetAlpha);


    // --- UI Update ---
    this.wineryGrapeText.setText(`Grapes: ${this.wineryLogic.grapeInventory}/${this.wineryLogic.maxGrapes}`);
    this.wineryWineText.setText(`Wine: ${this.wineryLogic.wineInventory}/${this.wineryLogic.maxWine}`);
    this.shopWineText.setText(`Wine: ${this.shopLogic.wineInventory}/${this.shopLogic.maxWine}`);
    // Update time text to HH:MM format
    const totalMinutes = Math.floor(this.currentTimeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    this.timeText.setText(`Time: ${formattedTime} (${this.isDaytime ? 'Day' : 'Night'})`);
  }
}
