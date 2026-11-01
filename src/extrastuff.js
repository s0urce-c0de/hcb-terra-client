export class DotMap extends Map {
    constructor(world) {
        super();
        this.world = world;
    }

    set(key, val) {
        if (this.has(key)) this.delete(key);
        this.world.addChild(val);
        return super.set(key, val);
    }

    delete(key) {
        if (this.has(key)) {
            const val = this.get(key);
            this.world.removeChild(val);
            val?.destroy();
        }
        return super.delete(key);
    }
}
