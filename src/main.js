import { Client, Callbacks, Room } from "@colyseus/sdk";
import env from "./env.js";
import setupPixi from "./setupPixi.js";
import { Application, Container, Graphics, GraphicsContext } from "pixi.js";
import { DotMap } from "./extrastuff.js";
import { LazyAsyncGetTerraMap } from "./types.js";
import { StateCallbackStrategy } from "@colyseus/schema";


class ColyseusManager {
    /** @type {!Room} */
    room;
    /** @type {!DotMap} */
    dots;
    /** @type {!Client} */
    client;
    /** @type {!LazyAsyncGetTerraMap} */
    terraMaps;
    /** @type {!Application} */
    app;
    /** @type {!Container} */
    world;
    /** @type {function(string): void} */
    updateMap;
    /** @type {!StateCallbackStrategy} */
    callbacks;
    /** @type {string} */
    token;

    constructor() {
        this._constructor();
    }

    async _constructor() {
        if (location.href.slice(0, 4) != "http") throw new Error("This is not supported on non HTTP(S) pages!");

        this.client = new Client("ws" + location.origin.slice(4));
        this.terraMaps = new LazyAsyncGetTerraMap();
        this.token = env.token;

        ({ app: this.app, world: this.world, updateMap: this.updateMap } = await setupPixi(this.terraMaps));

        this.joinWorld("world").catch(err => {
            console.error(err);
            if (err.code === 4412 || err.message.includes("session_conflict")) {
                if (window.confirm("Kick device already on terra?")) {
                    return this.joinWorld("world", {takeover: true})
                };
            }
            throw err;
        });
    }

    /**
     * Binds event listeners to a instance of colyseus
     * 
     * @returns {void} 
     */
    bindRoomListeners() {
        const RADIUS = 0.25;
        const meDot = new GraphicsContext().circle(0, 0, RADIUS).fill(0x0000ff);
        const youDot = new GraphicsContext().circle(0, 0, RADIUS).fill(0xff0000);

        if(!this.dots)this.dots = new DotMap(this.world);
        this.dots.clear();

        this.room.onMessage("pingCheck", e => this.room.send("pongCheck", { id: e.id }));
        // this.room.onDrop();
        // this.room.onReconnect();
        // this.room.onMessage("serverMigrate");
        // this.room.onMessage("refreshPrompt");
        this.room.onMessage("sessionKicked", alert.bind(globalThis, "You were kicked from the server by another client. Reload to join again."));
        // this.room.onMessage("npc.dialogueStart");
        // this.room.onMessage("npc.fadeOut");
        // this.room.onMessage("npc.disappeared");
        this.room.onMessage("redirectToLevel", e => {console.log(e);this.joinWorld("world", {levelId: e.levelId, farmOwnerId: e.farmOwnerId})});
        // this.room.onMessage("hud.state");
        // this.room.onMessage("chat.history");
        // this.room.onMessage("chat.message");
        // this.room.onMessage("chat.deleted");
        // this.room.onMessage("chat.edited");
        // this.room.onMessage("chat.access");
        // this.room.onMessage("friend.joinRoom");
        // this.room.onMessage("friend.joinError");
        // this.room.onMessage("friend.presence");
        // this.room.onMessage("chat.error")
        // this.room.onMessage("joinComplete");
        // this.room.onMessage("inventory.sync");
        // this.room.onMessage("accessories.sync");
        // this.room.onMessage("player.currency");
        // this.room.onMessage("npc.rewardResult");
        // this.room.onMessage("shop.stock");
        // this.room.onMessage("loan.state");
        // this.room.onMessage("loan.result");
        // this.room.onMessage("shop.purchaseResult");
        // this.room.onMessage("ratticus.seedResult");
        // this.room.onMessage("ratticus.rentResult");
        // this.room.onMessage("market.items");
        // this.room.onMessage("market.saleResult");
        // this.room.onMessage("market.notice");
        // this.room.onMessage("ratticus.notice");
        // this.room.onMessage("farm.notice");
        // this.room.onMessage("quest.defenitions");
        // this.room.onMessage("hours.update");
        // this.room.onMessage("rentDebt.check");
        // this.room.onMessage("plotLoan.notice");
        // this.room.onMessage("objective.update");
        // this.room.onMessage("quest.progress");
        // this.room.onMessage("quest.targets");
        // this.room.onMessage("quest.taskCompleted");
        // this.room.onMessage("quest.started");
        // this.room.onLeave();

        // this.callbacks.onAdd(n(e.equippedAccessories));
        // this.callbacks.onChange(n(e.equippedAccessories));
        // this.callbacks.onRemove(n(e.equippedAccessories));
        // this.callbacks.listen("clothesHue");
        // this.callbacks.listen("displayName");
        // this.callbacks.onChange();
        this.callbacks.onAdd("players", (player, sessionId) => {
            if (sessionId === this.room.sessionId) console.log("me joined!", player.x, player.z);
            
            const dot = new Graphics(sessionId === this.room.sessionId ? meDot : youDot);
            dot.position.set(player.x, player.z);
            this.dots.set(sessionId, dot);
            
            console.log("player join", player.x, player.z);

            this.callbacks.listen(player, "x", x => (dot.x = x));
            this.callbacks.listen(player, "z", z => (dot.z = z));
        });
        // this.callbacks.onChange("players");
        this.callbacks.onRemove("players", (player, sessionId) => {
            this.dots.delete(sessionId);
        });
        // this.callbacks.onAdd("npcs");
        // this.callbacks.onChange("npcs");
        // this.callbacks.onRemove("npcs");
        // this.callbacks.onAdd("farmItems");
        // this.callbacks.onChange("farmItems");
        // this.callbacks.onRemove("farmITems");
        // this.callbacks.listen("waterApplied");
        // this.callbacks.listen("fedAt");
        // this.callbacks.listen("shippedAt");
        // this.callbacks.listen("reviewState");
        // this.callbacks.listen("grownAt");
        // this.callbacks.listen("witheredAt");
        // this.room.onMessage("positionCorrection");
        // this.room.onMessage("forceTeleport");

        this.callbacks.listen("levelId", this.updateMap);
    }

    /**
     * 
     * @param {!Client} client 
     * @param {string} this.roomName 
     * @param {!Object} options 
     * @param {number} timeOutMs 
     */
    async joinOnce(client, roomName, options, timeOutMs) {
        const { roomId, ...joinOpts } = options;
        let timer;
        const joinProm = roomId ? client.joinOrCreate(roomId, {...joinOpts, token: this.token, friendJoin: true, protocol: 2}) : client.joinOrCreate(roomName, {...joinOpts, token: this.token, protocol: 2})
        const timeout = new Promise((_, r)=>(timer = setTimeout(() => r(new Error("timeout")), timeOutMs)));
        try {
            return await Promise.race([joinProm, timeout]);
            // add sessionid sotorage
        } catch (err) {
            joinProm.then(r => r.leave()).catch(_=>_);
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * 
     * @param {string} token JWT Token 
     * @returns {string} The userid
     */
    token2uID(token) {
        try {
            const decoded = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
            return decoded.userId ?? null;
        } catch {
            return null;
        }
    }

    /**
     * @param {string} roomName 
     * @param {!Object=} options 
     * @param {number=} timeOutMs
     */
    async joinWorld(roomName, options = {}, timeOutMs = 10_000) {
        try {
            this.room = await this.joinOnce(this.client, roomName, options, timeOutMs);
        } catch (err) {
            if((err?.code === 4411 || err?.message?.includes("farm_owner_missing")) && !options.farmOwnerId) {
                const farmOwnerId = token2uID(this.token);
                if (farmOwnerId) {
                    this.room = await this.joinOnce(
                        this.client,
                        roomName,
                        { ...options, farmOwnerId },
                        timeoutMs
                    );
                }
            }
            throw err;
        }

        this.callbacks = Callbacks.get(this.room);

        this.bindRoomListeners();   
    }
}

window.colyseusmanager = new ColyseusManager();

// this.room.onStateChange(state => {
//     console.log(state.toJSON());
// });
