//@ts-check

// NAME: Keyboard Shortcuts with Notifications
// AUTHOR: Your Name
// DESCRIPTION: Adds shortcuts for "MAIN" playlist with undo/redo, Spotify notifications, and debug logs.

/// <reference path="../../spicetify-cli/globals.d.ts" />

(async function keyboardShortcuts() {
    if (!(Spicetify?.Mousetrap && Spicetify?.Player && Spicetify?.Platform && Spicetify?.CosmosAsync)) {
        console.warn("Spicetify dependencies not loaded yet. Retrying...");
        setTimeout(keyboardShortcuts, 300); // Retry after 300ms
        return;
    }

    console.log("Keyboard Shortcuts with Notifications loaded!");

    const actionHistory = [];
    const redoStack = [];

    /**
     * Display a Spotify notification and log it to the console.
     * @param {string} message - The message to display.
     * @param {boolean} [isError=false] - Whether the message represents an error.
     */
    function showNotification(message, isError = false) {
        Spicetify.showNotification(message, isError);
        if (isError) {
            console.error(`[Spotify Notification]: ${message}`);
        } else {
            console.log(`[Spotify Notification]: ${message}`);
        }
    }

    /**
     * Locate the "MAIN" playlist.
     * @returns {Promise<string | null>} The ID of the "MAIN" playlist, or null if not found.
     */
    async function locateMainPlaylist() {
        console.log("Locating MAIN playlist...");
        const playlists = await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/me/playlists?limit=50");
        const mainPlaylist = playlists.items.find((playlist) => playlist.name.startsWith("MAIN"));
        if (mainPlaylist) {
            console.log(`Located MAIN playlist: ${mainPlaylist.name} (ID: ${mainPlaylist.id})`);
            return mainPlaylist.id;
        } else {
            showNotification("No MAIN playlist found.", true);
            return null;
        }
    }

    /**
     * Add the current track to the "MAIN" playlist.
     */
    async function addCurrentTrackToMainPlaylist() {
        const mainPlaylistId = await locateMainPlaylist();
        if (!mainPlaylistId) return;

        const currentTrack = Spicetify.Player?.data?.item || Spicetify.Player.getTrack();
        if (!currentTrack) {
            showNotification("No track currently playing.", true);
            return;
        }

        const endpoint = `https://api.spotify.com/v1/playlists/${mainPlaylistId}/tracks`;

        const action = {
            do: async () => {
                try {
                    const response = await Spicetify.CosmosAsync.post(endpoint, {
                        uris: [currentTrack.uri],
                    });
                    if (response?.snapshot_id) {
                        showNotification("Track added to MAIN playlist.");
                        console.log(`Track "${currentTrack.name}" added to MAIN playlist.`);
                    }
                } catch (error) {
                    console.error("Error adding track to MAIN playlist:", error);
                    showNotification("Error adding track to MAIN playlist.", true);
                }
            },
            undo: async () => {
                try {
                    const response = await Spicetify.CosmosAsync.delete(endpoint, {
                        tracks: [{ uri: currentTrack.uri }],
                    });
                    if (response?.snapshot_id) {
                        showNotification("Track removed from MAIN playlist.");
                        console.log(`Track "${currentTrack.name}" removed from MAIN playlist.`);
                    }
                } catch (error) {
                    console.error("Error removing track from MAIN playlist:", error);
                    showNotification("Error removing track from MAIN playlist.", true);
                }
            },
        };

        performAction(action);
    }

    /**
     * Remove the current track from the current playlist.
     */
    async function removeCurrentTrackFromCurrentPlaylist() {
        const currentPlaylistUri = Spicetify.Player?.data?.context?.uri;
        const currentTrack = Spicetify.Player?.data?.item || Spicetify.Player.getTrack();
        if (!currentPlaylistUri || !currentTrack) {
            showNotification("No track or playlist context found.", true);
            return;
        }

        const playlistId = currentPlaylistUri.split(":").pop();
        const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

        const action = {
            do: async () => {
                try {
                    const response = await Spicetify.CosmosAsync.delete(endpoint, {
                        tracks: [{ uri: currentTrack.uri }],
                    });
                    if (response?.snapshot_id) {
                        showNotification("Track removed from current playlist.");
                        console.log(`Track "${currentTrack.name}" removed from playlist "${playlistId}".`);
                    }
                } catch (error) {
                    console.error("Error removing track from current playlist:", error);
                    showNotification("Error removing track from current playlist.", true);
                }
            },
            undo: async () => {
                try {
                    const response = await Spicetify.CosmosAsync.post(endpoint, {
                        uris: [currentTrack.uri],
                    });
                    if (response?.snapshot_id) {
                        showNotification("Track re-added to current playlist.");
                        console.log(`Track "${currentTrack.name}" re-added to playlist "${playlistId}".`);
                    }
                } catch (error) {
                    console.error("Error re-adding track to current playlist:", error);
                    showNotification("Error re-adding track to current playlist.", true);
                }
            },
        };

        performAction(action);
    }

    /**
     * Perform an action and store it in the action history for undo/redo.
     * @param {object} action - The action to perform.
     */
    function performAction(action) {
        redoStack.length = 0; // Clear the redo stack
        actionHistory.push(action); // Add the action to history

        if (typeof action.do === "function") {
            try {
                action.do();
            } catch (error) {
                console.error("Failed to perform action:", error);
            }
        }
    }

    /**
     * Undo the last action.
     */
    async function undoAction() {
        if (actionHistory.length === 0) {
            showNotification("No actions to undo.");
            return;
        }

        const action = actionHistory.pop();
        await action.undo();
        redoStack.push(action);
        showNotification("Action undone.");
    }

    /**
     * Redo the last undone action.
     */
    async function redoAction() {
        if (redoStack.length === 0) {
            showNotification("No actions to redo.");
            return;
        }

        const action = redoStack.pop();
        await action.do();
        actionHistory.push(action);
        showNotification("Action redone.");
    }

    // Bind Shortcuts
    Spicetify.Mousetrap.bind("ctrl+1", async () => {
        console.log("Ctrl+1 pressed: Adding current track to MAIN playlist...");
        await addCurrentTrackToMainPlaylist();
    });

    Spicetify.Mousetrap.bind("ctrl+`", async () => {
        console.log("Ctrl+` pressed: Removing current track from current playlist...");
        await removeCurrentTrackFromCurrentPlaylist();
    });

    Spicetify.Mousetrap.bind("ctrl+z", async () => {
        console.log("Ctrl+Z pressed: Undoing last action...");
        await undoAction();
    });

    Spicetify.Mousetrap.bind("ctrl+y", async () => {
        console.log("Ctrl+Y pressed: Redoing last undone action...");
        await redoAction();
    });

    console.log("Keyboard shortcuts with notifications initialized.");
})();
