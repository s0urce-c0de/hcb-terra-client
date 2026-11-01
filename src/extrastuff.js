/**
 * @fileoverview extra stuffs
 */

import { Container, GraphicsContext } from "pixi.js";

/**
 * A dotmap that automatically adds it dots to a world object
 * 
 * @extends {Map}
 */
export class DotMap extends Map {
    /**
     * @param {!Container} world 
     */
    constructor(world) {
        super();
        this.world = world;
    }

    /**
     * 
     * @param {string} key 
     * @param {!GraphicsContext} value
     * @returns {!DotMap}
     */
    set(key, value) {
        if (this.has(key)) this.delete(key);
        this.world.addChild(value);
        return super.set(key, value);
    }

    /**
     * @param {string} key 
     * @returns {boolean}
     */
    delete(key) {
        if (this.has(key)) {
            const val = this.get(key);
            this.world.removeChild(val);
            val?.destroy();
        }
        return super.delete(key);
    }
}
