import { Client, Callbacks } from "@colyseus/sdk";
 
const client = new Client("http://localhost:2567");

// Join or create a room
const room = await client.joinOrCreate("my_room");
 
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