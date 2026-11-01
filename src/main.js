import { Client, Callbacks } from "@colyseus/sdk";
import env from "./env.js";
import setupPixi from "./setupPixi.js";
import { Graphics, GraphicsContext } from "pixi.js";
import { DotMap } from "./extrastuff.js";


const terraMaps = {};

for (let loc of ["town-square", "farm-island", "intro-scene"])
    Object.defineProperty(terraMaps, loc, {
        get() {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", `/assets/levels/${loc}.json`, false); // no async since no async in getter. would have blocked map draw anyways
            // maybe requestidle callback
            xhr.send(null);

            if (xhr.status !== 200) throw new Error(`Map for ${loc} not found`);

            const res = Object.freeze(JSON.parse(xhr.responseText));

            Object.defineProperty(this, loc, {
                value: res,
                writable: false,
                configurable: false,
                enumerable: true,
            });

            return res;
        },
        configurable: true,
        enumerable: true,
    });

if (location.href.slice(0, 4) != "http") throw new Error("This is not supported on non HTTP(S) pages!");

const client = new Client("ws" + location.origin.slice(4));

const { app, world, updateMap } = await setupPixi(terraMaps);

function bindRoomListeners(room, dots) {
    const RADIUS = 0.25;
    const meDot = new GraphicsContext().circle(0, 0, RADIUS).fill(0x0000ff);
    const youDot = new GraphicsContext().circle(0, 0, RADIUS).fill(0xff0000);
    const callbacks = Callbacks.get(room);

    room.onMessage("pingCheck", e => room.send("pongCheck", { id: e.id }));
    // room.onDrop();
    // room.onReconnect();
    // room.onMessage("serverMigrate");
    // room.onMessage("refreshPrompt");
    // room.onMessage("sessionKicked");
    // room.onMessage("npc.dialogueStart");
    // room.onMessage("npc.fadeOut");
    // room.onMessage("npc.disappeared");
    room.onMessage("redirectToLevel", console.log);
    // room.onMessage("hud.state");
    // room.onMessage("chat.history");
    // room.onMessage("chat.message");
    // room.onMessage("chat.deleted");
    // room.onMessage("chat.edited");
    // room.onMessage("chat.access");
    // room.onMessage("friend.joinRoom");
    // room.onMessage("friend.joinError");
    // room.onMessage("friend.presence");
    // room.onMessage("chat.error")
    // room.onMessage("joinComplete");
    // room.onMessage("inventory.sync");
    // room.onMessage("accessories.sync");
    // room.onMessage("player.currency");
    // room.onMessage("npc.rewardResult");
    // room.onMessage("shop.stock");
    // room.onMessage("loan.state");
    // room.onMessage("loan.result");
    // room.onMessage("shop.purchaseResult");
    // room.onMessage("ratticus.seedResult");
    // room.onMessage("ratticus.rentResult");
    // room.onMessage("market.items");
    // room.onMessage("market.saleResult");
    // room.onMessage("market.notice");
    // room.onMessage("ratticus.notice");
    // room.onMessage("farm.notice");
    // room.onMessage("quest.defenitions");
    // room.onMessage("hours.update");
    // room.onMessage("rentDebt.check");
    // room.onMessage("plotLoan.notice");
    // room.onMessage("objective.update");
    // room.onMessage("quest.progress");
    // room.onMessage("quest.targets");
    // room.onMessage("quest.taskCompleted");
    // room.onMessage("quest.started");
    // room.onLeave();

    // callbacks.onAdd(n(e.equippedAccessories));
    // callbacks.onChange(n(e.equippedAccessories));
    // callbacks.onRemove(n(e.equippedAccessories));
    // callbacks.listen("clothesHue");
    // callbacks.listen("displayName");
    // callbacks.onChange();
    callbacks.onAdd("players", (player, sessionId) => {
        if (sessionId === room.sessionId) console.log("me joined!", player.x, player.z);
        
        const dot = new Graphics(sessionId === room.sessionId ? meDot : youDot);
        dot.position.set(player.x, player.z);
        dots.set(sessionId, dot);
        
        console.log("player join", player.x, player.z);

        callbacks.listen(player, "x", x => (dot.x = x));
        callbacks.listen(player, "z", z => (dot.z = z));
    });
    // callbacks.onChange("players");
    callbacks.onRemove("players", (player, sessionId) => {
        dots.delete(sessionId);
    });
    // callbacks.onAdd("npcs");
    // callbacks.onChange("npcs");
    // callbacks.onRemove("npcs");
    // callbacks.onAdd("farmItems");
    // callbacks.onChange("farmItems");
    // callbacks.onRemove("farmITems");
    // callbacks.listen("waterApplied");
    // callbacks.listen("fedAt");
    // callbacks.listen("shippedAt");
    // callbacks.listen("reviewState");
    // callbacks.listen("grownAt");
    // callbacks.listen("witheredAt");
    // room.onMessage("positionCorrection");
    // room.onMessage("forceTeleport");
}
let room;

try {
    room = await client.joinOrCreate("world", {
        token: env.token,
        protocol: 2,
    });
} catch (err) {
    console.error(err);
    if (err.message == "session_conflict") {
        alert("Please log off the other device!");
    }
    throw err;
}

const callbacks = Callbacks.get(room);

const dots = new DotMap(world);

bindRoomListeners(room, dots);

callbacks.listen("levelId", updateMap);

// callbacks.onAdd("players", (player, sessionId) => {
//     if (sessionId === room.sessionId) console.log("me:", player.x, player.z);
//     const dot = new Graphics(sessionId == room.sessionId ? meDot : youDot);
//     dot.position.set(player.x, player.z);
//     world.addChild(dot);
//     dots.set(sessionId, dot);

//     console.log("Player added", player.x, player.z);

//     callbacks.listen(player, "x", x => (dot.x = x));
//     callbacks.listen(player, "z", z => (dot.z = z));
// });

// room.onMessage("redirectToLevel", console.log);

// callbacks.onRemove("players", (player, sessionId) => {
//     dots.get(sessionId)?.destroy();
//     dots.delete(sessionId);
// });

// room.onStateChange(state => {
//     console.log(state.toJSON());
// });

// room.onMessage("chat", message => {
//     console.log("Chat:", message);
// });
