import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import { WineryLogic } from '../logic/WineryLogic';
import { ShopLogic } from '../logic/ShopLogic';
import { TimeService, TimeEvents } from '../services/TimeService';
import { LocationService, LocationKeys } from '../services/LocationService'; // Import LocationService

// Define UI element keys for easier management
const UIKeys = {
    WineryGrapeText: 'wineryGrapeText',
    WineryWineText: 'wineryWineText',
    ShopWineText: 'shopWineText',
    TimeText: 'timeText'
};

export class UIManager {
    private scene: GameScene; // Keep reference to the scene for adding elements
    private wineryLogic: WineryLogic;
    private shopLogic: ShopLogic;
    private timeService: TimeService;
    private locationService: LocationService; // Add LocationService
    private uiElements: Map<string, Phaser.GameObjects.Text> = new Map();
    private uiTextStyle: Phaser.Types.GameObjects.Text.TextStyle;

    // Updated constructor to accept LocationService
    constructor(scene: GameScene, wineryLogic: WineryLogic, shopLogic: ShopLogic, timeService: TimeService, locationService: LocationService) {
        this.scene = scene;
        this.wineryLogic = wineryLogic;
        this.shopLogic = shopLogic;
        this.timeService = timeService;
        this.locationService = locationService; // Store LocationService

        this.uiTextStyle = {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 2, y: 2 }
        };

        // Listen for scene shutdown to clean up
        this.scene.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

        // Listen for time updates to refresh the time display
        this.timeService.on(TimeEvents.TimeUpdate, this.updateTimeText, this);

        // Initial UI creation should happen after scene elements are ready
        // We'll call createUIElements from the scene's create method
    }

    /** Creates the core UI text elements. Call this from the scene's create method. */
    public createUIElements(): void {
        console.log('UIManager creating UI elements...');
        // Use LocationService to get points
        const wineryDropOff = this.locationService.getPoint(LocationKeys.WineryGrapeDropOff);
        const shopDropOff = this.locationService.getPoint(LocationKeys.ShopWineDropOff);

        // Adjust positions relative to the fetched points
        const wineryTextX = wineryDropOff.x - 75; // Example adjustment
        const wineryTextY = wineryDropOff.y + 15; // Example adjustment
        const shopTextX = shopDropOff.x - 75; // Example adjustment
        const shopTextY = shopDropOff.y + 15; // Example adjustment

        this.uiElements.set(UIKeys.WineryGrapeText, this.scene.add.text(wineryTextX, wineryTextY, '', this.uiTextStyle).setDepth(1001));
        this.uiElements.set(UIKeys.WineryWineText, this.scene.add.text(wineryTextX, wineryTextY + 15, '', this.uiTextStyle).setDepth(1001));
        this.uiElements.set(UIKeys.ShopWineText, this.scene.add.text(shopTextX, shopTextY, '', this.uiTextStyle).setDepth(1001));
        this.uiElements.set(UIKeys.TimeText, this.scene.add.text(this.scene.cameras.main.width - 10, 10, '', this.uiTextStyle).setOrigin(1, 0).setDepth(1001));

        // Initial update
        this.updateInventoryTexts();
        this.updateTimeText();
        console.log('UIManager finished creating UI elements.');
    }

    /** Updates all inventory-related text elements. */
    public updateInventoryTexts(): void {
        this.uiElements.get(UIKeys.WineryGrapeText)?.setText(`Grapes: ${this.wineryLogic.grapeInventory}/${this.wineryLogic.maxGrapes}`);
        this.uiElements.get(UIKeys.WineryWineText)?.setText(`Wine: ${this.wineryLogic.wineInventory}/${this.wineryLogic.maxWine}`);
        this.uiElements.get(UIKeys.ShopWineText)?.setText(`Wine: ${this.shopLogic.wineInventory}/${this.shopLogic.maxWine}`);
    }

    /** Updates the time text element. */
    private updateTimeText(): void {
        const formattedTime = this.timeService.formatTime();
        const dayNight = this.timeService.isDaytime ? 'Day' : 'Night';
        this.uiElements.get(UIKeys.TimeText)?.setText(`Time: ${formattedTime} (${dayNight})`);
    }

    /** Cleans up UI elements and event listeners. */
    public shutdown(): void {
        console.log('UIManager shutting down...');
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        this.timeService.off(TimeEvents.TimeUpdate, this.updateTimeText, this);

        this.uiElements.forEach(element => element.destroy());
        this.uiElements.clear();
    }
}
