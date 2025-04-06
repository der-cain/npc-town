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
    ShopkeeperWorkPos: 'shopkeeperWorkPos',
    // Door locations (entry/exit points for path system)
    FarmerHomeDoor: 'farmerHomeDoor',
    WinemakerHomeDoor: 'winemakerHomeDoor',
    ShopkeeperHomeDoor: 'shopkeeperHomeDoor',
    WineryDoor: 'wineryDoor', // Near grape drop-off/wine pickup
    ShopDoor: 'shopDoor', // Near wine drop-off
    VineyardDoor: 'vineyardDoor', // Near vineyard
    // Path Waypoints (more descriptive names)
    WpSouthWestJunction: 'wpSouthWestJunction', // Junction near homes (Renamed)
    WpMidJunction: 'wpMidJunction',     // Midpoint on main vertical path
    WpSouthMidJunction: 'wpSouthMidJunction', // New waypoint between Mid and South
    WpNorthJunction: 'wpNorthJunction',   // Renamed from WpCenterJunction
    WpEastJunction: 'wpEastJunction',    // Renamed from WpShopTurn
    WpSouthJunction: 'wpSouthJunction', // New waypoint below MidJunction
    WpSouthEastJunction: 'wpSouthEastJunction', // New waypoint connected to SouthJunction
    // Customer points
    CustomerSpawnPoint: 'customerSpawnPoint', // Where customers appear
    CustomerDespawnPoint: 'customerDespawnPoint' // Where customers disappear
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
    // Graph representation of path connections (Adjacency List)
    private pathConnections: Map<string, string[]> = new Map();
    // Set of keys considered "on the main path" or directly connected
    private onPathLocationKeys: Set<string> = new Set([
        LocationKeys.FarmerHomeDoor,
        LocationKeys.WinemakerHomeDoor,
        LocationKeys.ShopkeeperHomeDoor,
        LocationKeys.WineryDoor,
        LocationKeys.ShopDoor,
        LocationKeys.WpSouthWestJunction, // Use new waypoint keys (Renamed)
        LocationKeys.WpMidJunction,
        LocationKeys.WpSouthMidJunction, // Add new waypoint
        LocationKeys.WpNorthJunction, // Renamed from WpCenterJunction
        LocationKeys.WpEastJunction, // Renamed from WpShopTurn
        LocationKeys.WpSouthJunction, // Add new waypoint
        LocationKeys.WpSouthEastJunction, // Add new waypoint
        // Add work positions if they should directly connect to path
        LocationKeys.FarmerWorkPos, // Add Farmer work pos to path network
        LocationKeys.WinemakerWorkPos, // Equivalent to WineryDoor essentially
        LocationKeys.ShopkeeperWorkPos, // Equivalent to ShopDoor essentially
        LocationKeys.CustomerSpawnPoint // Add customer spawn point as valid path node
    ]);

    constructor() {
        this.defineLocationsAndPaths(); // Renamed constructor call
    }

    // Renamed method definition
    private defineLocationsAndPaths(): void {
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
        this.locations.set(LocationKeys.FarmerWorkPos, new Phaser.Geom.Point(vineyardX + vineyardWidth + 15, vineyardY + vineyardHeight / 2 + 15));
        this.locations.set(LocationKeys.WinemakerWorkPos, this.getPoint(LocationKeys.WineryWinePickup)); // Reuse point
        this.locations.set(LocationKeys.ShopkeeperWorkPos, new Phaser.Geom.Point(shopX + shopWidth / 2, shopY + shopHeight / 2));

        // Home locations
        const homeY = 550;
        const homeSpacing = 100;
        this.locations.set(LocationKeys.FarmerHome, new Phaser.Geom.Point(200, homeY));
        this.locations.set(LocationKeys.WinemakerHome, new Phaser.Geom.Point(200 + homeSpacing, homeY));
        // Duplicate line removed below
        this.locations.set(LocationKeys.ShopkeeperHome, new Phaser.Geom.Point(200 + homeSpacing * 2, homeY));

        // --- Define Path Nodes (Doors & Waypoints) based on image ---

        // Door locations (approximated from image)
        const farmerDoor = new Phaser.Geom.Point(200, homeY - 30);
        const winemakerDoor = new Phaser.Geom.Point(300, homeY - 30);
        const shopkeeperDoor = new Phaser.Geom.Point(400, homeY - 30);
        const wineryDoor = new Phaser.Geom.Point(wineryX + wineryWidth / 2, wineryY + wineryHeight + 15); // Below winery
        const shopDoor = new Phaser.Geom.Point(shopX + shopWidth / 2, shopY - 15); // Above shop
        const vineyardDoor = new Phaser.Geom.Point(vineyardX + vineyardWidth + 15, vineyardY + vineyardHeight / 2); // Right of vineyard

        this.locations.set(LocationKeys.FarmerHomeDoor, farmerDoor);
        this.locations.set(LocationKeys.WinemakerHomeDoor, winemakerDoor);
        this.locations.set(LocationKeys.ShopkeeperHomeDoor, shopkeeperDoor);
        this.locations.set(LocationKeys.WineryDoor, wineryDoor);
        this.locations.set(LocationKeys.ShopDoor, shopDoor);
        // Add Vineyard Door if needed, though FarmerWorkPos might suffice
        this.locations.set(LocationKeys.VineyardDoor, vineyardDoor);

        // Waypoints based on image path structure
        const wpSouthWestJunction = new Phaser.Geom.Point(300, homeY - 30); // Aligned with Winemaker door, junction for homes path (Renamed variable)
        const wpMidJunction = new Phaser.Geom.Point(wineryX + wineryWidth / 2, 410);      // Midpoint on vertical path
        const wpSouthMidJunction = new Phaser.Geom.Point(300, 410); // New waypoint position
        const wpNorthJunction = new Phaser.Geom.Point(wineryX + wineryWidth / 2, 250); // Renamed variable, Level with Winery Door, junction for vineyard/winery path
        const wpEastJunction = new Phaser.Geom.Point(shopX + shopWidth / 2, 250); // Renamed variable
        const wpSouthJunction = new Phaser.Geom.Point(wineryX + wineryWidth / 2, 510); // New waypoint below MidJunction (410 + 100)
        const wpSouthEastJunction = new Phaser.Geom.Point(shopX + shopWidth / 2, 510); // New waypoint SE of SouthJunction

        this.locations.set(LocationKeys.WpSouthWestJunction, wpSouthWestJunction); // Renamed key and variable
        this.locations.set(LocationKeys.WpMidJunction, wpMidJunction);
        this.locations.set(LocationKeys.WpSouthMidJunction, wpSouthMidJunction); // Set new waypoint location
        this.locations.set(LocationKeys.WpSouthJunction, wpSouthJunction); // Set new waypoint location
        this.locations.set(LocationKeys.WpSouthEastJunction, wpSouthEastJunction); // Set new waypoint location
        this.locations.set(LocationKeys.WpNorthJunction, wpNorthJunction); // Renamed key and variable
        this.locations.set(LocationKeys.WpEastJunction, wpEastJunction); // Renamed key and variable

        // Customer points (just inside bounds)
        // Assuming scene dimensions are roughly 800x600
        this.locations.set(LocationKeys.CustomerSpawnPoint, new Phaser.Geom.Point(shopX + shopWidth / 2, 580)); // Bottom edge, just inside bounds
        this.locations.set(LocationKeys.CustomerDespawnPoint, new Phaser.Geom.Point(780, shopY)); // Right edge, level with shop

        // Define path connections (Adjacency List)
        this.pathConnections.set(LocationKeys.FarmerHomeDoor, [LocationKeys.WpSouthWestJunction]); // Renamed key
        this.pathConnections.set(LocationKeys.WinemakerHomeDoor, [LocationKeys.WpSouthWestJunction]); // Renamed key
        this.pathConnections.set(LocationKeys.ShopkeeperHomeDoor, [LocationKeys.WpSouthWestJunction]); // Renamed key

        this.pathConnections.set(LocationKeys.WpSouthWestJunction, [ // Renamed key
            LocationKeys.FarmerHomeDoor,
            LocationKeys.WinemakerHomeDoor,
            LocationKeys.ShopkeeperHomeDoor,
            LocationKeys.WpSouthMidJunction // Connect South to new waypoint
        ]);

        // Connections for the SouthMid waypoint
        this.pathConnections.set(LocationKeys.WpSouthMidJunction, [
            LocationKeys.WpSouthWestJunction, // Renamed key
            LocationKeys.WpMidJunction // Connect SouthMid to new South waypoint
        ]);

        // Connections for the new South waypoint
        this.pathConnections.set(LocationKeys.WpSouthJunction, [
            LocationKeys.WpMidJunction,
            LocationKeys.WpSouthEastJunction
        ]);

        this.pathConnections.set(LocationKeys.WpMidJunction, [
            LocationKeys.WpSouthMidJunction, // Connect Mid to new South waypoint
            LocationKeys.WpNorthJunction // Renamed key
        ]);

        this.pathConnections.set(LocationKeys.WpNorthJunction, [ // Renamed key
            LocationKeys.WpMidJunction,
            LocationKeys.WineryDoor, // Connection to Winery
            LocationKeys.WpEastJunction, // Renamed key
            LocationKeys.FarmerWorkPos, // Connection to Farmer work area
            LocationKeys.VineyardDoor // Add if VineyardDoor is used
        ]);

        this.pathConnections.set(LocationKeys.WpSouthEastJunction, [LocationKeys.WpSouthJunction, LocationKeys.CustomerDespawnPoint]);

        this.pathConnections.set(LocationKeys.CustomerSpawnPoint, [LocationKeys.WpSouthEastJunction]);

        // Add connection from FarmerWorkPos back to the junction
        this.pathConnections.set(LocationKeys.FarmerWorkPos, [LocationKeys.WpNorthJunction]); // Renamed key

        // Add connection from VineyardDoor if used
        // this.pathConnections.set(LocationKeys.VineyardDoor, [LocationKeys.WpNorthJunction]); // Renamed key (commented out)

        this.pathConnections.set(LocationKeys.WineryDoor, [LocationKeys.WpNorthJunction]); // Renamed key

        this.pathConnections.set(LocationKeys.WpEastJunction, [ // Renamed key
            LocationKeys.WpNorthJunction, // Renamed key
            LocationKeys.ShopDoor
        ]);

        this.pathConnections.set(LocationKeys.ShopDoor, [LocationKeys.WpEastJunction]); // Renamed key

        console.log('LocationService defined locations, areas, path nodes, and connections.');
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

    /**
     * Finds a path (sequence of points) between two locations.
     * If both start and end are "on path" locations, it uses the main waypoint path.
     * Otherwise, it returns a direct path.
     * @param startPoint The starting position vector.
     * @param endPoint The ending position vector.
     * @param startKey Optional key for the starting location (used to check if on path).
     * @param endKey Optional key for the ending location (used to check if on path).
     * @returns An array of Phaser.Geom.Point representing the path.
     */
    public findPath(startPoint: Phaser.Math.Vector2, endPoint: Phaser.Math.Vector2, startKey?: string, endKey?: string): Phaser.Geom.Point[] {
        const startIsOnPath = startKey ? this.onPathLocationKeys.has(startKey) : false;
        const endIsOnPath = endKey ? this.onPathLocationKeys.has(endKey) : false;

        // If both start and end keys are provided and are valid path nodes, use BFS
        if (startIsOnPath && endIsOnPath && startKey && endKey) {
            console.log(`Finding graph path: ${startKey} -> ${endKey}`);

            // --- BFS Implementation ---
            const queue: { key: string; path: string[] }[] = [{ key: startKey, path: [startKey] }];
            const visited: Set<string> = new Set([startKey]);
            let foundPathKeys: string[] | null = null;

            while (queue.length > 0) {
                const current = queue.shift();
                if (!current) continue; // Should not happen

                if (current.key === endKey) {
                    foundPathKeys = current.path;
                    break; // Found the target
                }

                const neighbors = this.pathConnections.get(current.key) || [];
                for (const neighborKey of neighbors) {
                    if (!visited.has(neighborKey)) {
                        visited.add(neighborKey);
                        const newPath = [...current.path, neighborKey];
                        queue.push({ key: neighborKey, path: newPath });
                    }
                }
            }
            // --- End BFS ---

            if (foundPathKeys) {
                // Convert keys back to points
                const pointPath = foundPathKeys.map(key => this.locations.get(key)).filter(p => p !== undefined) as Phaser.Geom.Point[];

                // Prepend actual start point, append actual end point
                const finalPath = [
                    new Phaser.Geom.Point(startPoint.x, startPoint.y),
                    ...pointPath.map(p => Phaser.Geom.Point.Clone(p)), // Clone points from path
                    new Phaser.Geom.Point(endPoint.x, endPoint.y)
                ];

                // Optional: Smooth path by removing redundant intermediate points
                // Only smooth if the path has intermediate nodes (length >= 3: start, node, end)
                if (finalPath.length >= 3) {
                    const firstNode = finalPath[1]; // First node from BFS result
                    const startPointNode = finalPath[0]; // Actual start point

                    // Check if start point is very close to the first BFS node
                    if (firstNode && startPointNode && Phaser.Math.Distance.BetweenPointsSquared(startPointNode, firstNode) < 1) {
                        finalPath.splice(1, 1); // Remove the first BFS node
                    }
                }
                 // Check only if path still has at least start + end + one node (length >= 3 after potential first splice)
                 if (finalPath.length >= 3) {
                    const secondLastNode = finalPath[finalPath.length - 2]; // Second-to-last node (might be a BFS node or the start point)
                    const lastNode = finalPath[finalPath.length - 1]; // Actual end point

                    // Check if end point is very close to the second-to-last node
                    if (secondLastNode && lastNode && Phaser.Math.Distance.BetweenPointsSquared(secondLastNode, lastNode) < 1) {
                         // Remove the second-to-last node ONLY if it's not the start point itself
                         if (finalPath.length > 2) { // Ensure we don't remove the start point if it's the only one left besides the end
                            finalPath.splice(finalPath.length - 2, 1);
                         }
                    }
                 }


                console.log(`Graph path found with ${finalPath.length} points.`);
                return finalPath;
            } else {
                console.warn(`BFS could not find path from ${startKey} to ${endKey}. Returning direct path.`);
                return [new Phaser.Geom.Point(startPoint.x, startPoint.y), new Phaser.Geom.Point(endPoint.x, endPoint.y)];
            }

        } else {
            // Otherwise (e.g., moving to a specific plot or one key is invalid/off-path), return a direct path
            console.log(`Finding direct path (off-path or invalid keys): ${startKey || 'current pos'} -> ${endKey || 'target pos'}`);
            return [new Phaser.Geom.Point(startPoint.x, startPoint.y), new Phaser.Geom.Point(endPoint.x, endPoint.y)];
        }
    }

    // Removed findClosestWaypointIndex method

    // Removed mainPathWaypointsClone getter

    /**
     * Gets a clone of the path node locations map (used for drawing).
     * @returns A new Map containing the path node keys and their points.
     */
    public get pathNodesClone(): Map<string, Phaser.Geom.Point> {
        const nodes = new Map<string, Phaser.Geom.Point>();
        this.onPathLocationKeys.forEach(key => {
            const point = this.locations.get(key);
            if (point) {
                nodes.set(key, Phaser.Geom.Point.Clone(point));
            }
        });
        return nodes;
    }

     /**
     * Gets the direct connections for a given path node key.
     * @returns A new array containing the keys of connected nodes.
     */
    public getConnections(key: string): string[] {
        return [...(this.pathConnections.get(key) || [])];
    }

    /**
     * Gets a clone of the locations map.
     * @returns A new Map containing all defined location keys and their points.
     */
    public get locationsClone(): Map<string, Phaser.Geom.Point> {
        const clonedLocations = new Map<string, Phaser.Geom.Point>();
        this.locations.forEach((point, key) => {
            clonedLocations.set(key, Phaser.Geom.Point.Clone(point));
        });
        return clonedLocations;
    }
}
