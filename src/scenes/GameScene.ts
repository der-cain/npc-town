import Phaser from 'phaser';
import VineyardPlot from '../entities/VineyardPlot';
import Farmer from '../entities/Farmer';
import Winemaker from '../entities/Winemaker';
import Shopkeeper from '../entities/Shopkeeper';
import Customer from '../entities/Customer'; // Import Customer
import { WineryLogic } from '../logic/WineryLogic';
import { ShopLogic } from '../logic/ShopLogic';
import NPC from '../entities/NPC';
import DespawnedState from '../states/customer/DespawnedState'; // Import DespawnedState for checking
import EnteringShopState from '../states/customer/EnteringShopState'; // Import for initial state
import { TimeService } from '../services/TimeService'; // Import TimeService
import { UIManager } from '../ui/UIManager'; // Import UIManager
import { LocationService, LocationKeys } from '../services/LocationService'; // Import LocationService

export default class GameScene extends Phaser.Scene {
  // --- Services and Managers ---
  public locationService!: LocationService; // Made public for easy access by entities/logic for now
  public timeService!: TimeService; // Made public
  private uiManager!: UIManager;

  // --- Logic Handlers ---
  public wineryLogic!: WineryLogic; // Made public
  public shopLogic!: ShopLogic; // Made public

  // --- Game Objects ---
  public vineyardPlots: VineyardPlot[] = []; // Made public
  private farmer!: Farmer;
  private winemaker!: Winemaker;
  private shopkeeper!: Shopkeeper;
  private customerGroup!: Phaser.GameObjects.Group; // Group for customers
  private customerSpawnTimer: number = 0; // Timer accumulator for spawning
  private customerSpawnInterval: number = 5000; // ms between spawn attempts

  // Removed old UI/Time/Location properties - managed by services now

  constructor() {
    super('GameScene');
  }

  preload() {
    console.log('GameScene preload');
    // Generate placeholder NPC textures (colored circles)
    const npcRadius = 8;
    const npcDiameter = npcRadius * 2;
    const textures = ['npc_farmer', 'npc_winemaker', 'npc_shopkeeper', 'npc_customer']; // Add customer texture
    const colors = [0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]; // Green, Blue, Yellow, Magenta for customer

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

    // --- Initialize Services ---
    this.locationService = new LocationService();
    // Pass scene reference to TimeService, it will hook into scene events
    this.timeService = new TimeService(this);
    // Logic handlers need the scene context
    this.wineryLogic = new WineryLogic(this);
    this.shopLogic = new ShopLogic(this);
    // UIManager needs references to update UI based on logic/time, and location service
    this.uiManager = new UIManager(this, this.wineryLogic, this.shopLogic, this.timeService, this.locationService);

    // --- Draw Placeholders using LocationService ---
    const vineyardArea = this.locationService.getArea(LocationKeys.VineyardArea);
    const wineryArea = this.locationService.getArea(LocationKeys.WineryArea);
    const shopArea = this.locationService.getArea(LocationKeys.ShopArea);
    const farmerHome = this.locationService.getPoint(LocationKeys.FarmerHome);
    const winemakerHome = this.locationService.getPoint(LocationKeys.WinemakerHome);
    const shopkeeperHome = this.locationService.getPoint(LocationKeys.ShopkeeperHome);

    this.add.rectangle(vineyardArea.rect.centerX, vineyardArea.rect.centerY, vineyardArea.width, vineyardArea.height, 0xAE8A6F).setStrokeStyle(1, 0x7C5A4F);
    this.add.rectangle(wineryArea.rect.centerX, wineryArea.rect.centerY, wineryArea.width, wineryArea.height, 0x888888).setStrokeStyle(1, 0x555555);
    this.add.rectangle(shopArea.rect.centerX, shopArea.rect.centerY, shopArea.width, shopArea.height, 0xD2B48C).setStrokeStyle(1, 0x8B4513);
    const homeSize = 30;
    this.add.rectangle(farmerHome.x, farmerHome.y, homeSize, homeSize, 0x8B4513).setStrokeStyle(1, 0x000000);
    this.add.rectangle(winemakerHome.x, winemakerHome.y, homeSize, homeSize, 0x8B4513).setStrokeStyle(1, 0x000000);
    this.add.rectangle(shopkeeperHome.x, shopkeeperHome.y, homeSize, homeSize, 0x8B4513).setStrokeStyle(1, 0x000000);

    // --- Add Labels ---
    this.add.text(vineyardArea.x + 5, vineyardArea.y + 5, 'Vineyard Area', { fontSize: '14px', color: '#ffffff' });
    this.add.text(wineryArea.x + 5, wineryArea.y + 5, 'Winery', { fontSize: '14px', color: '#ffffff' });
    this.add.text(shopArea.x + 5, shopArea.y + 5, 'Shop', { fontSize: '14px', color: '#ffffff' });
    this.add.text(farmerHome.x, farmerHome.y - homeSize, 'Farmer Home', { fontSize: '10px', color: '#fff' }).setOrigin(0.5, 1);
    this.add.text(winemakerHome.x, winemakerHome.y - homeSize, 'Winemaker Home', { fontSize: '10px', color: '#fff' }).setOrigin(0.5, 1);
    this.add.text(shopkeeperHome.x, shopkeeperHome.y - homeSize, 'Shopkeeper Home', { fontSize: '10px', color: '#fff' }).setOrigin(0.5, 1);

    // --- Create Vineyard Plots ---
    const plotSize = 32;
    const plotPadding = 10;
    const plotsPerRow = Math.floor(vineyardArea.width / (plotSize + plotPadding));
    const plotsPerCol = Math.floor(vineyardArea.height / (plotSize + plotPadding));
    this.vineyardPlots = []; // Clear array in case of hot reload
    for (let row = 0; row < plotsPerCol; row++) {
      for (let col = 0; col < plotsPerRow; col++) {
        const plotX = vineyardArea.x + plotPadding + col * (plotSize + plotPadding) + plotSize / 2;
        const plotY = vineyardArea.y + plotPadding + row * (plotSize + plotPadding) + plotSize / 2;
        const plot = new VineyardPlot(this, plotX, plotY, plotSize, plotSize);
        this.vineyardPlots.push(plot);
      }
    }
    console.log(`Created ${this.vineyardPlots.length} vineyard plots.`);

    // --- Create NPCs (passing TimeService) ---
    this.farmer = new Farmer(this, farmerHome.x, farmerHome.y, this.timeService);
    this.winemaker = new Winemaker(this, winemakerHome.x, winemakerHome.y, this.timeService);
    this.shopkeeper = new Shopkeeper(this, shopkeeperHome.x, shopkeeperHome.y, this.timeService);

    // Assign home/work positions and their corresponding keys using LocationService
    this.farmer.homePosition = farmerHome;
    this.farmer.homeDoorKey = LocationKeys.FarmerHomeDoor;
    this.farmer.workPosition = this.locationService.getPoint(LocationKeys.FarmerWorkPos);
    this.farmer.workPositionKey = LocationKeys.FarmerWorkPos;

    this.winemaker.homePosition = winemakerHome;
    this.winemaker.homeDoorKey = LocationKeys.WinemakerHomeDoor;
    this.winemaker.workPosition = this.locationService.getPoint(LocationKeys.WinemakerWorkPos); // Actual work spot
    this.winemaker.workPositionKey = LocationKeys.WineryDoor; // Key for pathfinding graph node

    this.shopkeeper.homePosition = shopkeeperHome;
    this.shopkeeper.homeDoorKey = LocationKeys.ShopkeeperHomeDoor;
    this.shopkeeper.workPosition = this.locationService.getPoint(LocationKeys.ShopkeeperWorkPos); // Actual work spot
    this.shopkeeper.workPositionKey = LocationKeys.ShopDoor; // Key for pathfinding graph node
    console.log('Created NPCs at home, resting.');

    // --- Create Customer Group ---
    this.customerGroup = this.add.group({
        classType: Customer,
        runChildUpdate: true // Ensure customer updates are called
    });
    console.log('Created Customer group.');

    // --- Draw Debug Locations (Paths, Doors, Work Positions) ---
    this.drawDebugLocations();

    // --- Create UI via UIManager ---
    this.uiManager.createUIElements();

    // --- Create Night Overlay via TimeService ---
    this.timeService.createNightOverlay();

    // --- Add shutdown listeners ---
    // Note: Services/Managers now handle their own shutdown via scene events
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
        console.log('GameScene custom shutdown actions...');
        // Logic handlers might still need manual shutdown if they don't use scene events
        this.wineryLogic.shutdown();
        this.shopLogic.shutdown();
        // Services/Managers cleanup is handled automatically by their event listeners
    });

    console.log('GameScene create completed.');
  }

  // Removed updateTimeAndVisuals method

  update(time: number, delta: number) {
    // TimeService update is handled via scene event listener
    // UIManager update (for time) is handled via TimeService event listener

    // We might need to manually trigger inventory UI updates if they don't happen via events
    // For simplicity, let's update them every frame for now. Could be optimized later.
    this.uiManager.updateInventoryTexts();

    // NPC updates are handled by their preUpdate methods (which delegate to states)

    // --- Customer Spawning Logic ---
    this.handleCustomerSpawning(delta);

    // --- Customer Despawning Logic ---
    this.handleCustomerDespawning();
  }

  /** Handles spawning customers based on time and interval */
  private handleCustomerSpawning(delta: number): void {
    // Check if it's daytime (8:00 - 16:00)
    const currentTime = this.timeService.currentTimeOfDay;
    const isShopOpen = currentTime >= (8 / 24) && currentTime < (16 / 24);

    if (isShopOpen) {
        this.customerSpawnTimer += delta;
        if (this.customerSpawnTimer >= this.customerSpawnInterval) {
            this.customerSpawnTimer = 0; // Reset timer

            // Add a chance to spawn, e.g., 50% chance per interval
            if (Math.random() < 0.5) {
                this.spawnCustomer();
            }
        }
    } else {
        // Reset timer if shop is closed
        this.customerSpawnTimer = 0;
    }
  }

  /** Creates a new customer instance */
  private spawnCustomer(): void {
    try {
        const spawnPoint = this.locationService.getPoint(LocationKeys.CustomerSpawnPoint);
        // Create customer slightly off-screen using the spawn point coordinates
        const customer = new Customer(this, spawnPoint.x, spawnPoint.y, this.timeService);
        this.customerGroup.add(customer); // Add to group
        console.log(`Spawned customer ${customer.name} at [${spawnPoint.x}, ${spawnPoint.y}]`);
        // Set initial state to start moving towards the shop
        customer.changeState(new EnteringShopState());
    } catch (error) {
        console.error("Error spawning customer:", error);
    }
  }

  /** Checks for and removes customers in the DespawnedState */
  private handleCustomerDespawning(): void {
    const customersToRemove: Customer[] = [];
    this.customerGroup.getChildren().forEach((customerGO) => {
        const customer = customerGO as Customer;
        if (customer.currentState instanceof DespawnedState) {
            customersToRemove.push(customer);
        }
    });

    if (customersToRemove.length > 0) {
        console.log(`Despawning ${customersToRemove.length} customers.`);
        customersToRemove.forEach(customer => {
            this.customerGroup.remove(customer, true, true); // Remove from group and destroy
        });
    }
  }


  /** Draws path graph, doors, and work positions for visualization */
  private drawDebugLocations(): void {
      const pathNodes = this.locationService.pathNodesClone;
      const allLocations = this.locationService.locationsClone;
      if (pathNodes.size === 0 && allLocations.size === 0) return;

      const graphics = this.add.graphics();
      graphics.setDepth(1); // Draw below NPCs/UI but above background

      // --- Draw Path Connections ---
      graphics.lineStyle(2, 0xffd966, 0.6); // Light orange path
      const drawnConnections = new Set<string>();
      pathNodes.forEach((point1, key1) => {
          const connections = this.locationService.getConnections(key1);
          connections.forEach(key2 => {
              const connectionKey = [key1, key2].sort().join('-');
              if (!drawnConnections.has(connectionKey)) {
                  const point2 = pathNodes.get(key2); // Get from pathNodes map
                  if (point1 && point2) {
                      graphics.lineBetween(point1.x, point1.y, point2.x, point2.y);
                      drawnConnections.add(connectionKey);
                  }
              }
          });
      });
      console.log('Drew path graph visualization.');

      // --- Draw Markers for All Locations ---
      const markerRadius = 3;
      const labelStyle = { fontSize: '8px', color: '#dddddd', backgroundColor: 'rgba(0,0,0,0.5)' };

      allLocations.forEach((point, key) => {
          let color = 0x888888; // Default grey for unknown/other
          if (key.includes('Door')) {
              color = 0xff0000; // Red for doors
          } else if (key.includes('Wp')) {
              color = 0x0000ff; // Blue for waypoints
          } else if (key.includes('WorkPos')) {
              color = 0x00ff00; // Green for work positions
          } else if (key.includes('DropOff') || key.includes('Pickup')) {
              color = 0xffff00; // Yellow for interaction points
          }

          graphics.fillStyle(color, 0.8);
          graphics.fillCircle(point.x, point.y, markerRadius);

          // Add text label slightly offset
          this.add.text(point.x + markerRadius + 1, point.y, key, labelStyle)
              .setOrigin(0, 0.5)
              .setDepth(graphics.depth + 1); // Ensure label is above marker/path
      });
      console.log('Drew location markers visualization.');
  }
}
