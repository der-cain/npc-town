import Phaser from 'phaser';

// Define known location keys
export const LocationKeys = {
    VineyardArea: 'vineyardArea',
    WineryArea: 'wineryArea',
    ShopArea: 'shopArea',
    FarmerHome: 'farmerHome',
    WinemakerHome: 'winemakerHome',
    ShopkeeperHome: 'shopkeeperHome',
    WineryGrapeDropOff: 'wineryGrapeDropOff',
    WineryWinePickup: 'wineryWinePickup',
    ShopWineDropOff: 'shopWineDropOff',
    FarmerWorkPos: 'farmerWorkPos',
    WinemakerWorkPos: 'winemakerWorkPos',
    ShopkeeperWorkPos: 'shopkeeperWorkPos'
};

// Interface for area definitions (optional, but good practice)
interface AreaDefinition {
    x: number;
    y: number;
    width: number;
    height: number;
    rect: Phaser.Geom.Rectangle; // Store the Rectangle object
}

export class LocationService {
    private locations: Map<string, Phaser.Geom.Point> = new Map();
    private areas: Map<string, AreaDefinition> = new Map();

    constructor() {
        this.defineLocations();
    }

    private defineLocations(): void {
        // --- Define Areas ---
        const vineyardX = 50;
        const vineyardY = 50;
        const vineyardWidth = 300;
        const vineyardHeight = 200;
        this.areas.set(LocationKeys.VineyardArea, {
            x: vineyardX, y: vineyardY, width: vineyardWidth, height: vineyardHeight,
            rect: new Phaser.Geom.Rectangle(vineyardX, vineyardY, vineyardWidth, vineyardHeight)
        });

        const wineryX = 400;
        const wineryY = 50;
        const wineryWidth = 150;
        const wineryHeight = 100;
        this.areas.set(LocationKeys.WineryArea, {
            x: wineryX, y: wineryY, width: wineryWidth, height: wineryHeight,
            rect: new Phaser.Geom.Rectangle(wineryX, wineryY, wineryWidth, wineryHeight)
        });

        const shopX = 600;
        const shopY = 300;
        const shopWidth = 150;
        const shopHeight = 100;
        this.areas.set(LocationKeys.ShopArea, {
            x: shopX, y: shopY, width: shopWidth, height: shopHeight,
            rect: new Phaser.Geom.Rectangle(shopX, shopY, shopWidth, shopHeight)
        });

        // --- Define Points ---
        // Interaction points
        this.locations.set(LocationKeys.WineryGrapeDropOff, new Phaser.Geom.Point(wineryX + wineryWidth / 2, wineryY + wineryHeight + 10));
        this.locations.set(LocationKeys.WineryWinePickup, new Phaser.Geom.Point(wineryX - 10, wineryY + wineryHeight / 2));
        this.locations.set(LocationKeys.ShopWineDropOff, new Phaser.Geom.Point(shopX + shopWidth / 2, shopY - 10));

        // Work positions
        this.locations.set(LocationKeys.FarmerWorkPos, new Phaser.Geom.Point(vineyardX + vineyardWidth / 2, vineyardY + vineyardHeight + 10));
        this.locations.set(LocationKeys.WinemakerWorkPos, this.getPoint(LocationKeys.WineryWinePickup)); // Reuse point
        this.locations.set(LocationKeys.ShopkeeperWorkPos, new Phaser.Geom.Point(shopX + shopWidth / 2, shopY + shopHeight / 2));

        // Home locations
        const homeY = 550;
        const homeSpacing = 100;
        this.locations.set(LocationKeys.FarmerHome, new Phaser.Geom.Point(200, homeY));
        this.locations.set(LocationKeys.WinemakerHome, new Phaser.Geom.Point(200 + homeSpacing, homeY));
        this.locations.set(LocationKeys.ShopkeeperHome, new Phaser.Geom.Point(200 + homeSpacing * 2, homeY));

        console.log('LocationService defined locations and areas.');
    }

    /**
     * Gets the Point object for a given location key.
     * Throws an error if the key is not found.
     * @param key The string key (from LocationKeys) for the desired point.
     * @returns The Phaser.Geom.Point object.
     */
    public getPoint(key: string): Phaser.Geom.Point {
        const point = this.locations.get(key);
        if (!point) {
            throw new Error(`LocationService: Point key "${key}" not found.`);
        }
        // Return a clone to prevent accidental modification of the original
        return Phaser.Geom.Point.Clone(point);
    }

     /**
     * Gets the Point object for a given location key, returning null if not found.
     * @param key The string key (from LocationKeys) for the desired point.
     * @returns The Phaser.Geom.Point object or null.
     */
    public getPointOptional(key: string): Phaser.Geom.Point | null {
        const point = this.locations.get(key);
        return point ? Phaser.Geom.Point.Clone(point) : null;
    }

    /**
     * Gets the AreaDefinition object for a given area key.
     * Throws an error if the key is not found.
     * @param key The string key (from LocationKeys) for the desired area.
     * @returns The AreaDefinition object.
     */
    public getArea(key: string): AreaDefinition {
        const area = this.areas.get(key);
        if (!area) {
            throw new Error(`LocationService: Area key "${key}" not found.`);
        }
        // Return a copy of the definition, cloning the rectangle
        return { ...area, rect: Phaser.Geom.Rectangle.Clone(area.rect) };
    }

     /**
     * Gets the AreaDefinition object for a given area key, returning null if not found.
     * @param key The string key (from LocationKeys) for the desired area.
     * @returns The AreaDefinition object or null.
     */
    public getAreaOptional(key: string): AreaDefinition | null {
        const area = this.areas.get(key);
        // Return a copy of the definition, cloning the rectangle
        return area ? { ...area, rect: Phaser.Geom.Rectangle.Clone(area.rect) } : null;
    }

    // Add methods for getting random points within areas if needed later
    // public getRandomPointInArea(key: string): Phaser.Geom.Point | null { ... }
}
