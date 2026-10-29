import { Client, Callbacks, MatchMakeError } from "@colyseus/sdk";
import env from "./env.js";

if(location.href.slice(0, 4)!="http")throw new Error("This is not supported on non HTTP(S) pages!");

const client = new Client("ws"+location.href.slice(4));

// window.test = await fetch("https://game.terra.hackclub.com/matchmake/joinOrCreate/world", {
//     "headers": {
//         "Content-Type": "application/json"
//     },
//     "body": JSON.stringify({
//         token: env.token,
//         levelId: "town-square",
//         protocol: 2
//     }),
//     "method": "POST"
// });

// client.auth.token = env.token;

// Join or create a room

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
// Get state callbacks handler
const callbacks = Callbacks.get(room);
 
// Listen for entities being added to a collection
callbacks.onAdd("players", (player, sessionId) => {
    console.log("Player joined:", sessionId);
 
    // Listen for changes on nested properties
    callbacks.listen(player, "x", (currentX, previousX) => {
        console.log("Player", sessionId, "x:", currentX);
    });
});
 
// Listen for entities being removed from a collection
callbacks.onRemove("players", (player, sessionId) => {
    console.log("Player left:", sessionId);
});
 
// Send a message to the server
room.send("move", { x: 10, y: 20 });
 
// Listen for messages from the server
room.onMessage("chat", (message) => {
    console.log("Chat:", message);
});