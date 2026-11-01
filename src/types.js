/**
 * @typedef {{x: number, z: number}} CoordinatePair A pair of (x, z) coordinates
 */
export let CoordinatePair = void 0;

// unknown what colliders is atm
/**
 * @typedef {{
 *  id: string,
 *  name: string,
 *  width: number,
 *  height: number,
 *  boundsPolygon: !Array<!CoordinatePair>,
 *  levelType: string,
 *  cameraZoom: number,
 *  music: string,
 *  spawn: !CoordinatePair,
 *  spawns: !Array<!{
 *      id: string,
 *      tag: string,
 *      x: number,
 *      z: number,
 *      isPrimary: boolean
 *  }>,
 *  objects: !Array<!{
 *      id: (string|undefined),
 *      type: string,
 *      x: number,
 *      z: number,
 *      rotation: (number|undefined),
 *      scale: (number|undefined),
 *      flipX: (boolean|undefined),
 *      baseFade: (boolean|undefined),
 *      action: (!{
 *          type: string,
 *          label: string
 *      }|undefined)
 *  }>,
 *  colliders: !Array<*>,
 *  npcs: !Array<!{
 *      sprite: string
 *  }>,
 *  exitZones: !Array<!{
 *      id: string,
 *      x: number,
 *      z: number,
 *      width: number,
 *      depth: number,
 *      rotation: (number|undefined),
 *      blocking: (?boolean|undefined),
 *      lockedMessage: (string|undefined),
 *      requiredQuest: (!{
 *          questId: string,
 *          stepId: string
 *      }|undefined),   
 *      targetLevelId: string,
 *      targetSpawnTag: string
 *  }>,
 *  terrain: !{
 *      gridCols: number,
 *      gridRows: number,
 *      cellSize: number,
 *      tiles: !Array<!Array<?string>>,
 *      groundTiles: !Array<!Array<?string>>
 *  },
 *  lights: !Array<(!{
 *      type: string,
 *      color: string,
 *      intensity: number
 *  }|!{
 *      id: string,
 *      type: string,
 *      color: string,
 *      intensity: number,
 *      x: number,
 *      y: number,
 *      z: number,
 *      softness: (undefined|number),
 *      radius: number
 *  })>
 * }} TerraMap
 */
export let TerraMap = void 0;

/**
 * A lazy-loading, asynchronous on the get method map, that is for terra keys
 */
export class LazyAsyncGetTerraMap extends Map {
    /**
     * @private
     * @type {!Array<string>}
     */
    locs;

    /**
     * @param {!Set<string>=} locs Locations 
     */
    constructor(locs = new Set(["town-square", "farm-island", "intro-scene"])) {
        super();
        this.locs = locs;
    }

    /**
     * 
     * @param {string} key
     * @returns {!Promise<!TerraMap>}
     */
    async get(key) {
        if(super.has(key) || !this.locs.has(key)) return super.get(key);

        /**
         * @type {!Response} Request for the level data
         */
        const req = await fetch(`/assets/levels/${key}.json`);
        /**
         * @type {!TerraMap}
         */
        const json = /** @type {!TerraMap} */(await req.json());

        return json;
    }
}