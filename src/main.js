import { Client, Callbacks } from "@colyseus/sdk";
import env from "./env.js";
import setupPixi from "./setupPixi.js";
import { Graphics, GraphicsContext } from "pixi.js";


if(location.href.slice(0, 4)!="http")throw new Error("This is not supported on non HTTP(S) pages!");

const client = new Client("ws"+location.origin.slice(4));

const {app, world} = await setupPixi(fetch('/assets/levels/town-square.json'));

let room;

try {
    room = await client.joinOrCreate("world", {
        token: env.token,
        levelId: "town-square",
        protocol: 2
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

// Listen for entities being added to a collection
callbacks.onAdd("players", (player, sessionId) => {
    if (sessionId === room.sessionId) console.log("me:", player.x, player.z);
    const dot = new Graphics(sessionId == room.sessionId ? meDot : youDot);
    dot.position.set(player.x, player.z);
    world.addChild(dot);
    dots.set(sessionId, dot);

    console.log("Player added", player.x, player.z)
 
    callbacks.listen(player, "x", x => dot.x = x);
    callbacks.listen(player, "z", z => dot.z = z);
});
 
callbacks.onRemove("players", (player, sessionId) => {
    dots.get(sessionId)?.destroy();
    dots.delete(sessionId);
});
 
room.onStateChange.once((state) => {
    console.log(state.toJSON());
});

 
room.onMessage("chat", (message) => {
    console.log("Chat:", message);
});