# HackCluB Terra Client

This is a custom terra (OMG! TERRA REFERENCE!!!!!) client that is open source. The current one is closed source for some reason.


# THIS WILL NOT SUPPORT ALL FEATURES

I don't have a way to test all the features. Probably just moving around supported and buying, shipping, etc probably not.

Also at the moment it is minimally viable, you cant travel between islands, interact with NPCs, etc. Also movement is slightly buggy.

# Set Up

<!-- First, copy env-example.js into src/env.js. Then fill it out with appropriate information. Then `npm ci && npm run serve`.

Ignore what that says. That is just before I had to publish onto nest. -->

* Go to `https://terra.hackclub.com/`.
* Make sure you are logged in to your terra account.
* Then `localStorage.terra_auth_token` will be your auth token (run `copy(localStorage.terra_auth_token)` to copy it to your clipboard.
* Enter it into the prompt on the demo

# Host it yourself
* Clone the repository `git clone https://github.com/s0urce-c0de/hcb-terra-client/`
* Enter the folder `cd hcb-terra-client`
* Install dependencies `npm ci`
* Run the server `npm run serve`
* Go to http://localhost:8080/
* Follow the instructions above to get the token, and enter it into the prompt.

# Demo

https://terra-client.s0urce-c0de.hackclub.app/
