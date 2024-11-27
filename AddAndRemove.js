(async function addAndRemove() {
    if (!Spicetify || !Spicetify.Mousetrap || !Spicetify.Player || !Spicetify.Platform) {
        console.warn("Spicetify dependencies not loaded yet. Retrying...");
        setTimeout(addAndRemove, 300);
        return;
    }

    console.log("AddAndRemove.js loaded successfully!");

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
        try {
            const playlists = await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/me/playlists?limit=50");
            const mainPlaylist = playlists.items.find((playlist) => playlist.name.startsWith("MAIN"));
            if (mainPlaylist) {
                return mainPlaylist.id;
            } else {
                showNotification("No MAIN playlist found.", true);
                return null;
            }
        } catch (error) {
            console.error("Error locating MAIN playlist:", error);
            showNotification("Error locating MAIN playlist.", true);
            return null;
        }
    }

    /**
     * Add a track to a playlist.
     * @param {string} playlistId - The playlist ID.
     * @param {string} trackUri - The track URI.
     */
    async function addTrackToPlaylist(playlistId, trackUri) {
        try {
            const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
            const response = await Spicetify.CosmosAsync.post(endpoint, { uris: [trackUri] });
            if (response?.snapshot_id) {
                showNotification("Track added to playlist.");
                return true;
            }
        } catch (error) {
            console.error("Error adding track to playlist:", error);
            showNotification("Error adding track to playlist.", true);
        }
        return false;
    }

    /**
     * Remove a track from a playlist.
     * @param {string} playlistId - The playlist ID.
     * @param {string} trackUri - The track URI.
     */
    async function removeTrackFromPlaylist(playlistId, trackUri) {
        try {
            const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
            await fetch(endpoint, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${Spicetify.Platform?.Session?.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tracks: [{ uri: trackUri }] }),
            });
            showNotification("Track removed from playlist.");
            return true;
        } catch (error) {
            console.error("Error removing track from playlist:", error);
            showNotification("Error removing track from playlist.", true);
        }
        return false;
    }

    /**
     * Add the current track to the "MAIN" playlist.
     */
    async function addCurrentTrackToMainPlaylist() {
        const mainPlaylistId = await locateMainPlaylist();
        if (!mainPlaylistId) return;

        const currentTrack = Spicetify.Player?.data?.item;
        if (!currentTrack) {
            showNotification("No track currently playing.", true);
            return;
        }

        const trackUri = currentTrack.uri;
        console.log("Adding track to MAIN playlist:", currentTrack.name);

        const success = await addTrackToPlaylist(mainPlaylistId, trackUri);
        if (success) {
            actionHistory.push({
                action: "add",
                playlistId: mainPlaylistId,
                trackUri: trackUri,
            });
            redoStack.length = 0; // Clear redo stack on new action
        }
    }

    /**
     * Remove the current track from the current playlist.
     */
    async function removeCurrentTrackFromCurrentPlaylist() {
        const currentPlaylistUri = Spicetify.Player?.data?.context?.uri;
        const currentTrack = Spicetify.Player?.data?.item;

        if (!currentPlaylistUri || !currentTrack) {
            showNotification("No track or playlist context found.", true);
            return;
        }

        const playlistId = currentPlaylistUri.split(":").pop();
        const trackUri = currentTrack.uri;

        console.log(`Removing track "${currentTrack.name}" from playlist "${playlistId}"`);

        const success = await removeTrackFromPlaylist(playlistId, trackUri);
        if (success) {
            actionHistory.push({
                action: "remove",
                playlistId: playlistId,
                trackUri: trackUri,
            });
            redoStack.length = 0; // Clear redo stack on new action
        }
    }
/**
 * Remove the currently selected track from its playlist.
 */
/**
 * Remove currently selected track(s) from the playlist.
 */







async function removeAllSelectedTracks() {
    try {
        // Locate all selected tracks and store them in an array
        const selectedTrackElements = Array.from(document.querySelectorAll('[aria-selected="true"]'));
        console.log("Selected Track Elements:", selectedTrackElements);

        if (selectedTrackElements.length === 0) {
            Spicetify.showNotification("No tracks selected.", true);
            console.warn("No tracks are currently selected.");
            return;
        }

        // Loop through all selected tracks
        for (const trackElement of selectedTrackElements) {
            try {
                // Open the "More options" menu
                const moreOptionsButton = trackElement.querySelector('[aria-label^="More options"]');
                if (!moreOptionsButton) {
                    console.warn("More options button not found for track:", trackElement);
                    continue;
                }

                moreOptionsButton.click();
                console.log("Clicked 'More options' for track.");

                // Wait for the context menu to load
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Find the "Remove from this playlist" option
                const removeOption = Array.from(document.querySelectorAll('span[data-encore-id="type"]'))
                    .find((element) => element.textContent.trim() === "Remove from this playlist");

                if (removeOption) {
                    removeOption.click();
                    console.log("Clicked 'Remove from this playlist' for track.");
                } else {
                    console.warn("Remove option not found in the context menu.");
                }

                // Wait for removal to process
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (trackError) {
                console.error("Error removing track:", trackError);
            }
        }

        Spicetify.showNotification(`Removed ${selectedTrackElements.length} track(s) from the playlist.`);
        console.log(`Successfully removed ${selectedTrackElements.length} track(s).`);
    } catch (error) {
        console.error("Error removing selected tracks:", error);
        Spicetify.showNotification("Error removing selected tracks from playlist.", true);
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

        const lastAction = actionHistory.pop();
        if (lastAction.action === "add") {
            const success = await removeTrackFromPlaylist(lastAction.playlistId, lastAction.trackUri);
            if (success) {
                redoStack.push(lastAction);
                showNotification("Undo: Track removed from playlist.");
            }
        } else if (lastAction.action === "remove") {
            const success = await addTrackToPlaylist(lastAction.playlistId, lastAction.trackUri);
            if (success) {
                redoStack.push(lastAction);
                showNotification("Undo: Track added back to playlist.");
            }
        }
    }

    /**
     * Redo the last undone action.
     */
    async function redoAction() {
        if (redoStack.length === 0) {
            showNotification("No actions to redo.");
            return;
        }

        const lastUndoneAction = redoStack.pop();
        if (lastUndoneAction.action === "add") {
            const success = await addTrackToPlaylist(lastUndoneAction.playlistId, lastUndoneAction.trackUri);
            if (success) {
                actionHistory.push(lastUndoneAction);
                showNotification("Redo: Track added back to playlist.");
            }
        } else if (lastUndoneAction.action === "remove") {
            const success = await removeTrackFromPlaylist(lastUndoneAction.playlistId, lastUndoneAction.trackUri);
            if (success) {
                actionHistory.push(lastUndoneAction);
                showNotification("Redo: Track removed from playlist.");
            }
        }
    }

    // Bind shortcuts
    Spicetify.Mousetrap.bind("ctrl+1", async () => {
        await addCurrentTrackToMainPlaylist();
    });
 
    Spicetify.Mousetrap.bind("ctrl+`", async () => {
        await removeCurrentTrackFromCurrentPlaylist();
    });

    Spicetify.Mousetrap.bind("ctrl+z", async () => {
        await undoAction();
    });

    Spicetify.Mousetrap.bind("ctrl+y", async () => {
        await redoAction();
    });

    Spicetify.Mousetrap.bind("ctrl+2", async () => {
        await removeAllSelectedTracks();
    });

    console.log("AddAndRemove.js: Keyboard shortcuts initialized successfully!");
})();
