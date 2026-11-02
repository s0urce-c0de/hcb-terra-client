/**
 * @fileoverview
 */
import { Application, Container, Graphics } from "pixi.js";
import { LazyAsyncGetTerraMap } from "./types.js";

/**
 * @typedef {{
 *  margin: number,
 *  worldW: number,
 *  worldH: number
 * }} drawCfgT
 */
export let drawCfgT;

/**
 * @type {drawCfgT}
 */
const drawCfgDefault = {
    margin: 0.9,
    worldW: 20,
    worldH: 20,
};

/**
 * Automatically resize the world size to the app
 *
 * @param {!Application} app The PixiJS app
 * @param {!Container} world The world container that is being resized
 * @param {!drawCfgT} cfg The draw config
 * @returns {void}
 */
function autoResize(app, world, cfg) {
    const { width, height } = app.screen;
    world.scale.set(Math.min((width * cfg.margin) / cfg.worldW, (height * cfg.margin) / cfg.worldH));
    world.position.set(width / 2, height / 2);
}

/**
 *
 * @param {function(): void} autoResizeBinded The automatic resize function (binded)
 * @param {!drawCfgT} drawCfg The drawing config
 * @param {!Graphics} bounds The bounds object
 * @param {!LazyAsyncGetTerraMap} maps
 * @param {string} mapName
 * @returns {void}
 */
async function updateMap(autoResizeBinded, drawCfg, bounds, maps, mapName) {
    const { width: worldW, height: worldH, boundsPolygon } = await maps.get(mapName);
    bounds.clear();
    bounds
        .poly(
            boundsPolygon.flatMap(({ x, z }) => [x, z]),
            true
        )
        .stroke({ width: 0.15, color: 0xffffff });

    [drawCfg.worldW, drawCfg.worldH] = [worldW, worldH];

    autoResizeBinded();
}

/**
 *
 * @param {!LazyAsyncGetTerraMap} maps
 * @returns {{
 *  app: !Application,
 *  drawCfg: !drawCfgT,
 *  autoResize: (function(): void),
 *  world: !Container
 * }}
 */
export default async function setupPixi(maps) {
    /**
     * @type {!Application}
     */
    const app = new Application();

    await app.init({
        background: "#000000",
        resizeTo: window,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        antialias: true,
    });

    const world = new Container();
    app.stage.addChild(world);

    const bounds = new Graphics();
    world.addChild(bounds);

    const drawCfg = structuredClone(drawCfgDefault);

    const autoResizeBinded = autoResize.bind(globalThis, app, world, drawCfg);
    const updateMapBinded = updateMap.bind(globalThis, autoResizeBinded, drawCfg, bounds, maps);

    autoResizeBinded();
    app.renderer.on("resize", autoResizeBinded);

    document.body.appendChild(app.canvas);
    return {
        app,
        drawCfg,
        autoResize: autoResizeBinded,
        updateMap: updateMapBinded,
        world,
    };
}
