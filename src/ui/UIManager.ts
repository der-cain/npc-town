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
    private skipNightText: Phaser.GameObjects.Text | null = null; // Text for skip message
    private uiTextStyle: Phaser.Types.GameObjects.Text.TextStyle;
    private skipNightTextStyle: Phaser.Types.GameObjects.Text.TextStyle;

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

        // Style for the skip night message
        this.skipNightTextStyle = {
            fontSize: '24px',
            color: '#FFFF00', // Yellow
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 10, y: 5 },
            align: 'center'
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

        // --- Create Skip Night Text (initially hidden) ---
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;
        this.skipNightText = this.scene.add.text(centerX, centerY, '', this.skipNightTextStyle)
            .setOrigin(0.5, 0.5)
            .setDepth(1100) // Above night overlay and other UI
            .setVisible(false); // Start hidden

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

    // --- Skip Night Message Control ---

    /** Displays the 'Skipping Night...' message. */
    public showSkipNightMessage(): void {
        if (this.skipNightText) {
            this.skipNightText.setText('Skipping Night...');
            this.skipNightText.setVisible(true);
        }
    }

    /** Hides the 'Skipping Night...' message. */
    public hideSkipNightMessage(): void {
        if (this.skipNightText) {
            this.skipNightText.setVisible(false);
            this.skipNightText.setText(''); // Clear text
        }
    }

    /** Cleans up UI elements and event listeners. */
    public shutdown(): void {
        console.log('UIManager shutting down...');
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        this.timeService.off(TimeEvents.TimeUpdate, this.updateTimeText, this);

        this.uiElements.forEach(element => element.destroy());
        this.uiElements.clear();

        // Destroy skip night text
        if (this.skipNightText) {
            this.skipNightText.destroy();
            this.skipNightText = null;
        }
    }
}
