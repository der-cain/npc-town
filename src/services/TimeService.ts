import Phaser from 'phaser';

// Define event names for clarity
export const TimeEvents = {
    DayStarted: 'dayStarted', // Visual day start (light appears)
    StartWorkTime: 'startWorkTime', // NPCs start their workday
    NightStarted: 'nightStarted', // Visual night start (darkness appears)
    GoHomeTime: 'goHomeTime', // NPCs start heading home
    TimeUpdate: 'timeUpdate' // For general time updates if needed
};

export class TimeService extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private dayLengthSeconds: number;
    private _currentTimeOfDay: number = 0.05; // Start just before dawn
    private _isDaytime: boolean = false; // Start as night
    private nightStartThreshold: number;
    private dayStartThreshold: number;
    private goHomeThreshold: number;
    private nightOverlay: Phaser.GameObjects.Rectangle | null = null;
    private maxNightAlpha: number = 0.6;

    constructor(
        scene: Phaser.Scene,
        dayLengthSeconds: number = 120,
        dayStartThreshold: number = 0.15, // ~3:30 AM
        nightStartThreshold: number = 0.70, // ~5:00 PM
        goHomeThreshold: number = 0.65 // ~4:00 PM
    ) {
        super();
        this.scene = scene;
        this.dayLengthSeconds = dayLengthSeconds;
        this.dayStartThreshold = dayStartThreshold;
        this.nightStartThreshold = nightStartThreshold;
        this.goHomeThreshold = goHomeThreshold;

        // Initialize state based on starting time
        this._isDaytime = this._currentTimeOfDay >= this.dayStartThreshold && this._currentTimeOfDay < this.nightStartThreshold;

        // Listen for scene updates to run the time logic
        this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        // Clean up listener when the scene shuts down
        this.scene.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    }

    // --- Public Accessors ---

    public get currentTimeOfDay(): number {
        return this._currentTimeOfDay;
    }

    public get isDaytime(): boolean {
        return this._isDaytime;
    }

    public get isGoHomeTime(): boolean {
        // Check if it's time to go home but not yet full night (avoids sending NPCs home repeatedly after night starts)
        return this._currentTimeOfDay >= this.goHomeThreshold && this._currentTimeOfDay < this.nightStartThreshold;
    }

    // --- Core Logic ---

    private update(time: number, delta: number): void {
        const deltaSeconds = delta / 1000;
        const previousTimeOfDay = this._currentTimeOfDay;
        this._currentTimeOfDay += deltaSeconds / this.dayLengthSeconds;
        this._currentTimeOfDay %= 1.0; // Wrap around at 1.0 (midnight)

        const previouslyDaytime = this._isDaytime;
        this._isDaytime = this._currentTimeOfDay >= this.dayStartThreshold && this._currentTimeOfDay < this.nightStartThreshold;

        const wasGoHomeTime = previousTimeOfDay >= this.goHomeThreshold && previousTimeOfDay < this.nightStartThreshold;
        const isNowGoHomeTime = this.isGoHomeTime;

        // Emit events based on transitions
        if (this._isDaytime && !previouslyDaytime) {
            console.log("--- Day/Work Started (TimeService) ---");
            this.emit(TimeEvents.DayStarted); // For visual transition
            this.emit(TimeEvents.StartWorkTime); // For NPC behavior start
        } else if (!this._isDaytime && previouslyDaytime) {
            console.log("--- Night Started (TimeService) ---");
            this.emit(TimeEvents.NightStarted);
        }

        if (isNowGoHomeTime && !wasGoHomeTime) {
            console.log("--- Go Home Time (TimeService) ---");
            this.emit(TimeEvents.GoHomeTime);
        }

        this.emit(TimeEvents.TimeUpdate, this._currentTimeOfDay, delta); // Emit general update

        this.updateNightOverlay(); // Update visual effect
    }

    // --- Visuals ---

    /** Creates the night overlay rectangle. Call this from the scene's create method. */
    public createNightOverlay(): void {
        if (!this.nightOverlay) {
            this.nightOverlay = this.scene.add.rectangle(
                0, 0,
                this.scene.cameras.main.width, this.scene.cameras.main.height,
                0x000000
            )
            .setOrigin(0, 0)
            .setAlpha(0) // Start transparent
            .setDepth(1000); // Ensure it's above most things but below UI
            this.updateNightOverlay(); // Set initial alpha
            console.log('Night overlay created by TimeService.');
        }
    }

    private updateNightOverlay(): void {
        if (!this.nightOverlay) return;

        let targetAlpha = 0;
        const dawnStart = this.dayStartThreshold;
        const dawnEnd = dawnStart + 0.1; // Dawn transition duration
        const duskStart = this.nightStartThreshold - 0.05; // Start dimming slightly before night
        const duskEnd = this.nightStartThreshold + 0.1; // Dusk transition duration

        if (this._currentTimeOfDay < dawnStart || this._currentTimeOfDay >= duskEnd) {
            targetAlpha = this.maxNightAlpha; // Full night
        } else if (this._currentTimeOfDay >= dawnStart && this._currentTimeOfDay < dawnEnd) {
            // Dawn fade out (night alpha decreases)
            // Corrected 3rd arg for Percent: range = end - start
            targetAlpha = Phaser.Math.Linear(this.maxNightAlpha, 0, Phaser.Math.Percent(this._currentTimeOfDay, dawnStart, dawnEnd));
        } else if (this._currentTimeOfDay >= duskStart && this._currentTimeOfDay < this.nightStartThreshold) {
            // Dusk fade in (partial)
            // Corrected 3rd arg for Percent: range = end - start
             targetAlpha = Phaser.Math.Linear(0, this.maxNightAlpha * 0.7, Phaser.Math.Percent(this._currentTimeOfDay, duskStart, this.nightStartThreshold));
        } else if (this._currentTimeOfDay >= this.nightStartThreshold && this._currentTimeOfDay < duskEnd) {
            // Dusk fade in (full)
            // Corrected 3rd arg for Percent: range = end - start
             targetAlpha = Phaser.Math.Linear(this.maxNightAlpha * 0.7, this.maxNightAlpha, Phaser.Math.Percent(this._currentTimeOfDay, this.nightStartThreshold, duskEnd));
        } else {
            targetAlpha = 0; // Full day
        }
        this.nightOverlay.setAlpha(targetAlpha);
    }

    // --- Utility ---

    public formatTime(): string {
        const totalMinutes = Math.floor(this._currentTimeOfDay * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // --- Cleanup ---

    public shutdown(): void {
        console.log('TimeService shutting down...');
        this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        if (this.nightOverlay) {
            this.nightOverlay.destroy();
            this.nightOverlay = null;
        }
        this.removeAllListeners(); // Clear event listeners
    }
}
