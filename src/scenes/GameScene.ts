import Phaser from 'phaser';
import VineyardPlot from '../entities/VineyardPlot';
import Farmer from '../entities/Farmer';
import Winemaker from '../entities/Winemaker';
import Shopkeeper from '../entities/Shopkeeper';
import { WineryLogic } from '../logic/WineryLogic'; // Import WineryLogic
import { ShopLogic } from '../logic/ShopLogic'; // Import ShopLogic
import NPC from '../entities/NPC'; // Import base NPC for type hints

export default class GameScene extends Phaser.Scene {
  // Declare scene properties
  // Interaction Points
  wineryGrapeDropOffPoint!: Phaser.Geom.Point;
  wineryWinePickupPoint!: Phaser.Geom.Point;
  shopWineDropOffPoint!: Phaser.Geom.Point;
  // Work Positions (where NPCs idle/start work)
  farmerWorkPos!: Phaser.Geom.Point;
  winemakerWorkPos!: Phaser.Geom.Point;
  shopkeeperWorkPos!: Phaser.Geom.Point;
  // Home Positions (defined later in create)
  farmerHomePos!: Phaser.Geom.Point;
  winemakerHomePos!: Phaser.Geom.Point;
  shopkeeperHomePos!: Phaser.Geom.Point;
  // Game Objects
  vineyardPlots: VineyardPlot[] = [];
  farmer!: Farmer;
  winemaker!: Winemaker;
  shopkeeper!: Shopkeeper;
  wineryLogic!: WineryLogic;
  shopLogic!: ShopLogic;

  // UI Text Elements
  private wineryGrapeText!: Phaser.GameObjects.Text;
  private wineryWineText!: Phaser.GameObjects.Text;
  private shopWineText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private nightOverlay!: Phaser.GameObjects.Rectangle;

  // Day/Night Cycle properties
  private dayLengthSeconds: number = 120; // 2 minutes for a full cycle
  private _currentTimeOfDay: number = 0.05; // Start just before dawn
  public get currentTimeOfDay(): number { return this._currentTimeOfDay; } // Getter for external access
  public isDaytime: boolean = false; // Start as night
  private nightStartThreshold: number = 0.70; // 70% through the cycle (approx 5 PM)
  private dayStartThreshold: number = 0.15; // 15% through the cycle (approx 3:30 AM)
  public goHomeThreshold: number = 0.65; // Start heading home around 60% (approx 4 PM)

  constructor() {
    super('GameScene');
  }

  preload() {
    console.log('GameScene preload');
    // Generate placeholder NPC textures (colored circles)
    const npcRadius = 8;
    const npcDiameter = npcRadius * 2;
    const textures = ['npc_farmer', 'npc_winemaker', 'npc_shopkeeper'];
    const colors = [0x00ff00, 0x0000ff, 0xffff00]; // Green, Blue, Yellow

    textures.forEach((key, index) => {
        if (!this.textures.exists(key)) { // Avoid recreating textures on hot reload
            let graphics = this.make.graphics({ x: 0, y: 0 }, false);
            graphics.fillStyle(colors[index]!); // Assert non-null
            graphics.fillCircle(npcRadius, npcRadius, npcRadius);
            graphics.generateTexture(key, npcDiameter, npcDiameter);
            graphics.destroy();
        }
    });
    console.log('Generated placeholder NPC textures.');
  }

  create() {
    console.log('GameScene create');
    this.cameras.main.setBackgroundColor('#5D7C43'); // A grassy green background

    // --- Define Locations ---
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

    // Interaction points
    this.wineryGrapeDropOffPoint = new Phaser.Geom.Point(wineryX + wineryWidth / 2, wineryY + wineryHeight + 10);
    this.wineryWinePickupPoint = new Phaser.Geom.Point(wineryX - 10, wineryY + wineryHeight / 2);
    this.shopWineDropOffPoint = new Phaser.Geom.Point(shopX + shopWidth / 2, shopY - 10);

    // Work positions
    this.farmerWorkPos = new Phaser.Geom.Point(vineyardX + vineyardWidth / 2, vineyardY + vineyardHeight + 10); // Near bottom of vineyard
    this.winemakerWorkPos = this.wineryWinePickupPoint; // Same as pickup point
    this.shopkeeperWorkPos = new Phaser.Geom.Point(shopX + shopWidth / 2, shopY + shopHeight / 2); // Center of shop

    // Home locations
    const homeY = 550;
    const homeSpacing = 100;
    this.farmerHomePos = new Phaser.Geom.Point(200, homeY);
    this.winemakerHomePos = new Phaser.Geom.Point(200 + homeSpacing, homeY);
    this.shopkeeperHomePos = new Phaser.Geom.Point(200 + homeSpacing * 2, homeY);

    // --- Draw Placeholders ---
    this.add.rectangle(vineyardX + vineyardWidth / 2, vineyardY + vineyardHeight / 2, vineyardWidth, vineyardHeight, 0xAE8A6F).setStrokeStyle(1, 0x7C5A4F);
    this.add.rectangle(wineryX + wineryWidth / 2, wineryY + wineryHeight / 2, wineryWidth, wineryHeight, 0x888888).setStrokeStyle(1, 0x555555);
    this.add.rectangle(shopX + shopWidth / 2, shopY + shopHeight / 2, shopWidth, shopHeight, 0xD2B48C).setStrokeStyle(1, 0x8B4513);
    const homeSize = 30;
    this.add.rectangle(this.farmerHomePos.x, this.farmerHomePos.y, homeSize, homeSize, 0x8B4513).setStrokeStyle(1, 0x000000);
    this.add.rectangle(this.winemakerHomePos.x, this.winemakerHomePos.y, homeSize, homeSize, 0x8B4513).setStrokeStyle(1, 0x000000);
    this.add.rectangle(this.shopkeeperHomePos.x, this.shopkeeperHomePos.y, homeSize, homeSize, 0x8B4513).setStrokeStyle(1, 0x000000);

    // --- Add Labels ---
    this.add.text(vineyardX + 5, vineyardY + 5, 'Vineyard Area', { fontSize: '14px', color: '#ffffff' });
    this.add.text(wineryX + 5, wineryY + 5, 'Winery', { fontSize: '14px', color: '#ffffff' });
    this.add.text(shopX + 5, shopY + 5, 'Shop', { fontSize: '14px', color: '#ffffff' });
    this.add.text(this.farmerHomePos.x, this.farmerHomePos.y - homeSize, 'Farmer Home', { fontSize: '10px', color: '#fff' }).setOrigin(0.5, 1);
    this.add.text(this.winemakerHomePos.x, this.winemakerHomePos.y - homeSize, 'Winemaker Home', { fontSize: '10px', color: '#fff' }).setOrigin(0.5, 1);
    this.add.text(this.shopkeeperHomePos.x, this.shopkeeperHomePos.y - homeSize, 'Shopkeeper Home', { fontSize: '10px', color: '#fff' }).setOrigin(0.5, 1);

    // --- Create Vineyard Plots ---
    const plotSize = 32;
    const plotPadding = 10;
    const plotsPerRow = Math.floor(vineyardWidth / (plotSize + plotPadding));
    const plotsPerCol = Math.floor(vineyardHeight / (plotSize + plotPadding));
    this.vineyardPlots = []; // Clear array in case of hot reload
    for (let row = 0; row < plotsPerCol; row++) {
      for (let col = 0; col < plotsPerRow; col++) {
        const plotX = vineyardX + plotPadding + col * (plotSize + plotPadding) + plotSize / 2;
        const plotY = vineyardY + plotPadding + row * (plotSize + plotPadding) + plotSize / 2;
        const plot = new VineyardPlot(this, plotX, plotY, plotSize, plotSize);
        this.vineyardPlots.push(plot);
      }
    }
    console.log(`Created ${this.vineyardPlots.length} vineyard plots.`);

    // --- Create NPCs ---
    // Create at home positions
    this.farmer = new Farmer(this, this.farmerHomePos.x, this.farmerHomePos.y);
    this.winemaker = new Winemaker(this, this.winemakerHomePos.x, this.winemakerHomePos.y);
    this.shopkeeper = new Shopkeeper(this, this.shopkeeperHomePos.x, this.shopkeeperHomePos.y);
    // Assign home and work positions
    this.farmer.homePosition = this.farmerHomePos;
    this.farmer.workPosition = this.farmerWorkPos;
    this.winemaker.homePosition = this.winemakerHomePos;
    this.winemaker.workPosition = this.winemakerWorkPos;
    this.shopkeeper.homePosition = this.shopkeeperHomePos;
    this.shopkeeper.workPosition = this.shopkeeperWorkPos;
    // Set initial state to Resting
    this.farmer.setNpcState('Resting');
    this.winemaker.setNpcState('Resting');
    this.shopkeeper.setNpcState('Resting');
    console.log('Created NPCs at home, resting.');

    // --- Create Logic Handlers ---
    this.wineryLogic = new WineryLogic(this);
    this.shopLogic = new ShopLogic(this);

    // --- Add shutdown listeners ---
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
        console.log('GameScene shutting down...');
        this.wineryLogic.shutdown();
        this.shopLogic.shutdown();
    });

    // --- Create UI Text Elements ---
    const uiTextStyle = { fontSize: '12px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 2, y: 2 } };
    this.wineryGrapeText = this.add.text(wineryX, wineryY + wineryHeight + 5, 'Grapes: 0', uiTextStyle).setDepth(1001);
    this.wineryWineText = this.add.text(wineryX, wineryY + wineryHeight + 20, 'Wine: 0', uiTextStyle).setDepth(1001);
    this.shopWineText = this.add.text(shopX, shopY + shopHeight + 5, 'Wine: 0', uiTextStyle).setDepth(1001);
    this.timeText = this.add.text(this.cameras.main.width - 10, 10, 'Time: 00:00 (Night)', uiTextStyle).setOrigin(1, 0).setDepth(1001);

    // --- Create Night Overlay ---
    this.nightOverlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000)
        .setOrigin(0, 0)
        .setAlpha(0) // Start transparent, will be updated
        .setDepth(1000);

    console.log('Created UI text elements and night overlay.');
    this.updateTimeAndVisuals(0); // Initial update for time/visuals
  }

  // Separate function for time/visual updates
  updateTimeAndVisuals(delta: number) {
    // --- Time Update ---
    const deltaSeconds = delta / 1000;
    this._currentTimeOfDay += deltaSeconds / this.dayLengthSeconds;
    this._currentTimeOfDay %= 1.0; // Wrap around at 1.0 (midnight)

    // Determine if it's daytime (working hours)
    const previouslyDaytime = this.isDaytime;
    this.isDaytime = this._currentTimeOfDay >= this.dayStartThreshold && this._currentTimeOfDay < this.nightStartThreshold;

    if (this.isDaytime && !previouslyDaytime) {
        console.log("--- Day Started ---");
    } else if (!this.isDaytime && previouslyDaytime) {
        console.log("--- Night Started ---");
    }

    // --- Visual Update (Overlay) ---
    const maxAlpha = 0.6;
    let targetAlpha = 0;
    const dawnStart = this.dayStartThreshold;
    const dawnEnd = dawnStart + 0.1; // Dawn transition duration (e.g., 0.1 = ~2.4 hours)
    const duskStart = this.nightStartThreshold - 0.05; // Start dimming slightly before night threshold
    const duskEnd = this.nightStartThreshold + 0.1; // Dusk transition duration

    if (this._currentTimeOfDay < dawnStart || this._currentTimeOfDay >= duskEnd) {
        targetAlpha = maxAlpha; // Full night
    } else if (this._currentTimeOfDay >= dawnStart && this._currentTimeOfDay < dawnEnd) {
        targetAlpha = Phaser.Math.Linear(maxAlpha, 0, Phaser.Math.Percent(this._currentTimeOfDay, dawnStart, dawnEnd)); // Dawn fade out
    } else if (this._currentTimeOfDay >= duskStart && this._currentTimeOfDay < this.nightStartThreshold) {
         targetAlpha = Phaser.Math.Linear(0, maxAlpha * 0.7, Phaser.Math.Percent(this._currentTimeOfDay, duskStart, this.nightStartThreshold)); // Dusk fade in (partial)
    } else if (this._currentTimeOfDay >= this.nightStartThreshold && this._currentTimeOfDay < duskEnd) {
         targetAlpha = Phaser.Math.Linear(maxAlpha * 0.7, maxAlpha, Phaser.Math.Percent(this._currentTimeOfDay, this.nightStartThreshold, duskEnd)); // Dusk fade in (full)
    } else {
        targetAlpha = 0; // Full day
    }
    this.nightOverlay.setAlpha(targetAlpha);

    // --- UI Update ---
    this.wineryGrapeText.setText(`Grapes: ${this.wineryLogic.grapeInventory}/${this.wineryLogic.maxGrapes}`);
    this.wineryWineText.setText(`Wine: ${this.wineryLogic.wineInventory}/${this.wineryLogic.maxWine}`);
    this.shopWineText.setText(`Wine: ${this.shopLogic.wineInventory}/${this.shopLogic.maxWine}`);
    const totalMinutes = Math.floor(this._currentTimeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    this.timeText.setText(`Time: ${formattedTime} (${this.isDaytime ? 'Day' : 'Night'})`);
  }


  update(time: number, delta: number) {
    this.updateTimeAndVisuals(delta); // Call time/visual update

    // NPC updates are handled by their preUpdate methods
  }
}
