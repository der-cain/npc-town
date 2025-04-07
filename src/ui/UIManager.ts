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
    TimeText: 'timeText',
    DaySpeedText: 'daySpeedText',   // New key for day speed display
    NightSpeedText: 'nightSpeedText' // New key for night speed display
};

// Define button styles
const buttonStyle = {
    backgroundColor: '#555',
    color: '#fff',
    padding: { x: 5, y: 3 },
    fontSize: '9px'
};
const buttonHoverStyle = {
    backgroundColor: '#777'
};

export class UIManager {
    private scene: GameScene; // Keep reference to the scene for adding elements
    private wineryLogic: WineryLogic;
    private shopLogic: ShopLogic;
    private timeService: TimeService;
    private locationService: LocationService; // Add LocationService
    private uiElements: Map<string, Phaser.GameObjects.Text> = new Map();
    // Removed skipNightText
    private uiTextStyle: Phaser.Types.GameObjects.Text.TextStyle;
    // Removed skipNightTextStyle

    // Add properties for time scale buttons
    private daySpeedButtons: Phaser.GameObjects.Text[] = [];
    private nightSpeedButtons: Phaser.GameObjects.Text[] = [];

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

        // Removed skipNightTextStyle block

        // Listen for scene shutdown to clean up
        this.scene.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

        // Listen for time updates to refresh the time display
        this.timeService.on(TimeEvents.TimeUpdate, this.updateTimeText, this);
        // Listen for time scale changes to update the speed displays
        this.timeService.on('timeScaleChanged', this.updateTimeScaleTexts, this);

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
        const timeText = this.scene.add.text(this.scene.cameras.main.width - 10, 10, '', this.uiTextStyle).setOrigin(1, 0).setDepth(1001);
        this.uiElements.set(UIKeys.TimeText, timeText);

        // --- Create Time Scale Controls ---
        const controlStartY = timeText.y + timeText.height + 10;
        const controlStartX = this.scene.cameras.main.width - 10; // Align with time text right edge

        // Day Speed Controls
        const dayLabel = this.scene.add.text(controlStartX, controlStartY, 'Day Speed:', this.uiTextStyle).setOrigin(1, 0).setDepth(1001);
        const daySpeedText = this.scene.add.text(controlStartX, dayLabel.y + dayLabel.height + 2, '', this.uiTextStyle).setOrigin(1, 0).setDepth(1001);
        this.uiElements.set(UIKeys.DaySpeedText, daySpeedText);
        this.daySpeedButtons = this.createSpeedControlButtons(daySpeedText.x - daySpeedText.width - 30, daySpeedText.y, 'day');

        // Night Speed Controls
        const nightLabel = this.scene.add.text(controlStartX, daySpeedText.y + daySpeedText.height + 8, 'Night Speed:', this.uiTextStyle).setOrigin(1, 0).setDepth(1001);
        const nightSpeedText = this.scene.add.text(controlStartX, nightLabel.y + nightLabel.height + 2, '', this.uiTextStyle).setOrigin(1, 0).setDepth(1001);
        this.uiElements.set(UIKeys.NightSpeedText, nightSpeedText);
        this.nightSpeedButtons = this.createSpeedControlButtons(nightSpeedText.x - nightSpeedText.width - 30, nightSpeedText.y, 'night');

        // Initial update
        this.updateInventoryTexts();
        this.updateTimeText();
        this.updateTimeScaleTexts(); // Initial update for speed displays

        // Removed skip night text creation

        console.log('UIManager finished creating UI elements.');
    }

    /** Helper to create the (+), (-), (R) buttons for speed control */
    private createSpeedControlButtons(x: number, y: number, scaleType: 'day' | 'night'): Phaser.GameObjects.Text[] {
        const buttons: Phaser.GameObjects.Text[] = [];
        const buttonSpacing = 25;

        // Reset Button (R)
        const resetButton = this.scene.add.text(x, y, '(R)', buttonStyle)
            .setOrigin(1, 0) // Align right
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.timeService.resetTimeScale(scaleType))
            .on('pointerover', () => resetButton.setStyle(buttonHoverStyle))
            .on('pointerout', () => resetButton.setStyle(buttonStyle))
            .setDepth(1001);
        buttons.push(resetButton);

        // Decrease Button (-)
        const decreaseButton = this.scene.add.text(resetButton.x - buttonSpacing, y, '(-)', buttonStyle)
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.timeService.adjustTimeScale(scaleType, -0.5))
            .on('pointerover', () => decreaseButton.setStyle(buttonHoverStyle))
            .on('pointerout', () => decreaseButton.setStyle(buttonStyle))
            .setDepth(1001);
        buttons.push(decreaseButton);

        // Increase Button (+)
        const increaseButton = this.scene.add.text(decreaseButton.x - buttonSpacing, y, '(+)', buttonStyle)
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.timeService.adjustTimeScale(scaleType, 0.5))
            .on('pointerover', () => increaseButton.setStyle(buttonHoverStyle))
            .on('pointerout', () => increaseButton.setStyle(buttonStyle))
            .setDepth(1001);
        buttons.push(increaseButton);

        return buttons;
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

    /** Updates the time scale text displays. */
    private updateTimeScaleTexts(): void {
        this.uiElements.get(UIKeys.DaySpeedText)?.setText(`${this.timeService.dayTimeScale.toFixed(1)}x`);
        this.uiElements.get(UIKeys.NightSpeedText)?.setText(`${this.timeService.nightTimeScale.toFixed(1)}x`);
    }

    // --- Skip Night Message Control (REMOVED) ---

    /** Cleans up UI elements and event listeners. */
    public shutdown(): void {
        console.log('UIManager shutting down...');
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        this.timeService.off(TimeEvents.TimeUpdate, this.updateTimeText, this);
        this.timeService.off('timeScaleChanged', this.updateTimeScaleTexts, this); // Remove listener

        this.uiElements.forEach(element => element.destroy());
        this.uiElements.clear();

        // Destroy buttons
        this.daySpeedButtons.forEach(button => button.destroy());
        this.nightSpeedButtons.forEach(button => button.destroy());
        this.daySpeedButtons = [];
        this.nightSpeedButtons = [];

        // Removed skip night text destruction
    }
}
