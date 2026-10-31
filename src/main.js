import { Client, Callbacks } from "@colyseus/sdk";
import env from "./env.js";
import setupPixi from "./setupPixi.js";
import { Graphics, GraphicsContext } from "pixi.js";

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

const RADIUS = 0.25;
const meDot = new GraphicsContext().circle(0, 0, RADIUS).fill(0x0000ff);
const youDot = new GraphicsContext().circle(0, 0, RADIUS).fill(0xff0000);

const dots = new Map();

room.onMessage("pingCheck", e => room.send("pongCheck", { id: e.id }));

callbacks.listen("levelId", updateMap);

callbacks.onAdd("players", (player, sessionId) => {
    if (sessionId === room.sessionId) console.log("me:", player.x, player.z);
    const dot = new Graphics(sessionId == room.sessionId ? meDot : youDot);
    dot.position.set(player.x, player.z);
    world.addChild(dot);
    dots.set(sessionId, dot);

    console.log("Player added", player.x, player.z);

    callbacks.listen(player, "x", x => (dot.x = x));
    callbacks.listen(player, "z", z => (dot.z = z));
});

room.onMessage("redirectToLevel", console.log);

room.onMessage("pingCheck", console.log);

callbacks.onRemove("players", (player, sessionId) => {
    dots.get(sessionId)?.destroy();
    dots.delete(sessionId);
});

room.onStateChange(state => {
    console.log(state.toJSON());
});

room.onMessage("chat", message => {
    console.log("Chat:", message);
});
