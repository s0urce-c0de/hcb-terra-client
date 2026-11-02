import { Client, Callbacks, Room } from "@colyseus/sdk";
import env from "./env.js";
import setupPixi from "./setupPixi.js";
import { Application, Container, Graphics, GraphicsContext, triangulateWithHoles } from "pixi.js";
import { DefaultMap, DotMap } from "./extrastuff.js";
import { LazyAsyncGetTerraMap } from "./types.js";
import { StateCallbackStrategy } from "@colyseus/schema";

const terraCfg = {
    TICK_RATE: 60,
    FIXED_DT: 1 / 60,
    WORLD_HALF_SIZE: 20,
    WORLD_BOUNDS_CORNER_RADIUS: 0.3,
    PLAYER_SPEED: 4,
    PLAYER_SPRINT_SPEED: 7,
    PLAYER_RADIUS: 0.4,
    FRICTION_PER_TICK: 0.8,
    MAX_PLAYERS_PER_ROOM: 50,
    SERVER_SEND_RATE: 20,
    CLIENT_CMD_RATE: 30,
    INTERP_DELAY: 100,
    ERROR_CORRECTION_TIME: 0.15,
    NPC_INTERACT_RANGE: 2,
    POSITION_SOFT_THRESHOLD: 0.5,
    POSITION_SOFT_THRESHOLD_SPRINT: 1.2,
    POSITION_HARD_THRESHOLD: 1.5,
    POSITION_HARD_THRESHOLD_SPRINT: 3.2,
    MAX_FRAME_TIME: 0.25,
    MAX_PHYSICS_STEPS_PER_TICK: 15,
    PING_INTERVAL_MS: 2e3,
    MAX_LATENCY_ALLOWANCE_MS: 400,
}; // stolen directly from the code !!!!

class InputManager /* <- NetworkManager reference btw */ {
    /** @type {!DefaultMap} */
    keysPressed;
    constructor() {
        this.keysPressed = new DefaultMap(false);
        window.addEventListener("keydown", this.#handleInput.bind(this, true));
        window.addEventListener("keyup", this.#handleInput.bind(this, false));
        // window.addEventListener("visibilitychange", e => {})
    }

    /**
     * @param {!KeyboardEvent} e
     * @returns {void}
     */
    #handleInput(down, e) {
        this.keysPressed.set(e.code, down);
    }

    getDirection() {
        return {
            h: Math.sign(
                this.keysPressed.get("ArrowRight") -
                    this.keysPressed.get("ArrowLeft") +
                    this.keysPressed.get("KeyD") -
                    this.keysPressed.get("KeyA")
            ),
            v: Math.sign(
                this.keysPressed.get("ArrowDown") -
                    this.keysPressed.get("ArrowUp") +
                    this.keysPressed.get("KeyS") -
                    this.keysPressed.get("KeyW")
            ),
        };
    }
}

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
    /** @type {!InputManager} */
    inputmanager;

    /** @type {number} */
    seq = 0;
    /** @type {number} */
    lastSendWhen = 0;
    /** @type {boolean} */
    isMoving = false;

    constructor() {
        this._constructor();
    }

    async _constructor() {
        if (location.href.slice(0, 4) != "http") throw new Error("This is not supported on non HTTP(S) pages!");

        this.client = new Client("ws" + location.origin.slice(4));
        this.terraMaps = new LazyAsyncGetTerraMap();
        this.token = env.token;
        this.inputmanager = new InputManager();

        ({ app: this.app, world: this.world, updateMap: this.updateMap } = await setupPixi(this.terraMaps));

        this.app.ticker.maxFPS = terraCfg.TICK_RATE;
        this.app.ticker.minFPS = terraCfg.TICK_RATE;
        this.app.ticker.add(() => this.movementTick());

        this.joinWorld("world").catch(err => {
            console.error(err);
            if (err.code === 4412 || err.message.includes("session_conflict")) {
                if (window.confirm("Kick device already on terra?")) {
                    return this.joinWorld("world", { takeover: true });
                }
            }
            throw err;
        });
    }

    /**
     * @returns {void}
     */
    movementTick() {
        /** @type {GraphicsContext} */
        const meDot = this.dots?.get(this.room?.sessionId);
        if (!meDot) return;

        const { h, v } = this.inputmanager.getDirection();
        const sprinting = this.inputmanager.keysPressed.get("ShiftLeft");
        const speed = sprinting ? terraCfg.PLAYER_SPRINT_SPEED : terraCfg.PLAYER_SPEED;

        meDot.x += (h * speed * terraCfg.FIXED_DT) / (Math.hypot(h, v) || 1);
        meDot.y += (v * speed * terraCfg.FIXED_DT) / (Math.hypot(h, v) || 1);

        const now = performance.now();
        if (this.isMoving || h || v) {
            if (now - this.lastSendWhen >= 1000 / terraCfg.CLIENT_CMD_RATE) {
                this.seq++;
                this.room.send("move", {
                    x: h,
                    z: v,
                    seq: this.seq,
                    posX: meDot.x,
                    posZ: meDot.y,
                    sprinting,
                });
                this.lastSendWhen = now;

                this.isMoving = !!(h || v);
            }
        }
    }

    fixLoc(servX, servZ) {
        console.log(servX, servZ);
        const meDot = this.dots?.get(this.room?.sessionId);
        if (!meDot) return;

        const dErr = Math.hypot(servX - meDot.x, servZ - meDot.y);

        if (
            dErr >
            (this.inputmanager.keysPressed.get("ShiftLeft")
                ? this.isMoving
                    ? terraCfg.POSITION_HARD_THRESHOLD_SPRINT
                    : terraCfg.POSITION_SOFT_THRESHOLD_SPRINT
                : this.isMoving
                  ? terraCfg.POSITION_HARD_THRESHOLD
                  : terraCfg.POSITION_SOFT_THRESHOLD)
        ) {
            meDot.x = servX;
            meDot.y = servZ;
        }
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

        if (!this.dots) this.dots = new DotMap(this.world);
        this.dots.clear();

        this.room.onMessage("pingCheck", e => this.room.send("pongCheck", { id: e.id }));
        // this.room.onDrop();
        // this.room.onReconnect();
        // this.room.onMessage("serverMigrate");
        // this.room.onMessage("refreshPrompt");
        this.room.onMessage(
            "sessionKicked",
            alert.bind(globalThis, "You were kicked from the server by another client. Reload to join again.")
        );
        // this.room.onMessage("npc.dialogueStart");
        // this.room.onMessage("npc.fadeOut");
        // this.room.onMessage("npc.disappeared");
        this.room.onMessage("redirectToLevel", e => {
            console.log(e);
            this.joinWorld("world", { levelId: e.levelId, farmOwnerId: e.farmOwnerId });
        });
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
            const isMe = sessionId === this.room.sessionId;
            if (isMe) console.log("me joined!", player.x, player.z);

            const dot = new Graphics(isMe ? meDot : youDot);
            dot.position.set(player.x, player.z);
            this.dots.set(sessionId, dot);
            console.log(player);
            console.log("player join", player.x, player.z);

            this.callbacks.listen(player, "x", isMe ? x => this.fixLoc(x, player.z) : x => (dot.x = x));
            this.callbacks.listen(player, "z", isMe ? z => this.fixLoc(player.x, z) : z => (dot.y = z));
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
        const joinProm = roomId
            ? client.joinOrCreate(roomId, { ...joinOpts, token: this.token, friendJoin: true, protocol: 2 })
            : client.joinOrCreate(roomName, { ...joinOpts, token: this.token, protocol: 2 });
        const timeout = new Promise((_, r) => (timer = setTimeout(() => r(new Error("timeout")), timeOutMs)));
        try {
            return await Promise.race([joinProm, timeout]);
            // add sessionid sotorage
        } catch (err) {
            joinProm.then(r => r.leave()).catch(_ => _);
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
            if ((err?.code === 4411 || err?.message?.includes("farm_owner_missing")) && !options.farmOwnerId) {
                const farmOwnerId = this.token2uID(this.token);
                if (farmOwnerId) {
                    this.room = await this.joinOnce(this.client, roomName, { ...options, farmOwnerId }, timeoutMs);
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
