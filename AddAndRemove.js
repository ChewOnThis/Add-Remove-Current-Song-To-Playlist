(async function addAndRemove() {
    // Wait until Spicetify is ready:
    if (!Spicetify || !Spicetify.Mousetrap || !Spicetify.Player || !Spicetify.Platform) {
        console.warn("Spicetify dependencies not loaded yet. Retrying...");
        setTimeout(addAndRemove, 300);
        return;
    }

    // ========================================
    // === Access Token & Refresh Handling ===
    // ========================================
    let accessToken = Spicetify.Platform?.Session?.accessToken || null;

    async function refreshAccessToken() {
        try {
            const newToken = await Spicetify.Platform.AuthAPI.getAccessToken();
            if (!newToken) {
                throw new Error("Failed to refresh access token.");
            }
            accessToken = newToken;
            console.log("Access token refreshed successfully.");
            return newToken;
        } catch (error) {
            console.error("Error refreshing access token:", error);
            Spicetify.showNotification("Error refreshing access token. Please re-login.", true);
            return null;
        }
    }

    async function ensureValidAccessToken() {
        if (!accessToken) {
            const newToken = await refreshAccessToken();
            if (!newToken) {
                throw new Error("Unable to refresh access token. Please re-login.");
            }
        }
        return accessToken;
    }

    /**
     * A helper to call fetch() and retry once on HTTP 401 (token expired).
     */
    async function fetchWithRetry(url, options) {
        await ensureValidAccessToken(); // Make sure we have a token first
        let response = await fetch(url, options);

        // If unauthorized, token might be stale. Refresh once and retry.
        if (response.status === 401) {
            console.warn("Got 401; attempting token refresh & retry.");
            await refreshAccessToken();
            options.headers.Authorization = `Bearer ${accessToken}`;
            response = await fetch(url, options);
        }
        return response;
    }

    // As a backup, automatically refresh every 55 minutes
    setInterval(async () => {
        const newToken = await refreshAccessToken();
        if (newToken) {
            console.log("Access token refreshed (interval).");
        }
    }, 55 * 60 * 1000);

    console.log("AddAndRemove.js loaded successfully!");

    // ========================================
    // === Undo / Redo Tracking ===
    // ========================================
    const actionHistory = [];
    const redoStack = [];

    function showNotification(message, isError = false) {
        Spicetify.showNotification(message, isError);
        const prefix = isError ? "[Error]" : "[Info]";
        console[isError ? "error" : "log"](`${prefix} ${message}`);
    }

    // ========================================
    // === Playlist & Track Helpers ===
    // ========================================

    /**
     * Creates a new playlist named "Main" for the given user.
     */
   /**
 * Format a given Date object as YY/MM/DD.
 */
/**
 * Format a given Date object as YY/MM/DD.
 */
/**
 * Format a given Date object as DD/MM/YY.
 */
function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
}

/**
 * Creates a new playlist named "MAIN <date>" for the given user.
 */
async function createMainPlaylist(userId) {
    try {
        const currentDate = new Date();
        const formattedDate = formatDate(currentDate);
        const playlistName = `MAIN ${formattedDate}`;
        const endpoint = `https://api.spotify.com/v1/users/${userId}/playlists`;
        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: playlistName,
                public: false,
                description: "Auto-generated MAIN playlist by Caleb's Spicetify plugin :) https://github.com/ChewOnThis/Add-Remove-Current-Song-To-Playlist/edit/main/AddAndRemove.js",
            }),
        };

        const response = await fetchWithRetry(endpoint, options);
        if (!response.ok) {
            console.error("Failed to create MAIN playlist:", response.status, response.statusText);
            return null;
        }
        const result = await response.json();
        showNotification(`Created new ${playlistName} playlist.`);
        return result.id;
    } catch (error) {
        console.error("Error creating MAIN playlist:", error);
        showNotification("Error creating MAIN playlist.", true);
        return null;
    }
}

/**
 * Locate the user's MAIN playlist that follows the pattern "MAIN DD/MM/YY".
 * It checks all playlists owned by the user for a name matching that format.
 * If none is found, it creates a new one using the current date.
 */
async function locateMainPlaylist() {
    try {
        // Fetch your playlists
        const res = await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/me/playlists?limit=50");
        // Fetch current user details
        const userRes = await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/me");
        const userId = userRes.id;

        // Regular expression to match "MAIN DD/MM/YY"
        const regex = /^MAIN \d\d\/\d\d\/\d\d$/;
        let playlist = res.items.find((p) =>
            regex.test(p.name) && p.owner.id === userId
        );
        if (!playlist) {
            const formattedDate = formatDate(new Date());
            const playlistName = `MAIN ${formattedDate}`;
            showNotification(`No playlist matching pattern "MAIN DD/MM/YY" found. Creating ${playlistName}...`);
            const newPlaylistId = await createMainPlaylist(userId);
            if (!newPlaylistId) {
                showNotification("Failed to create MAIN playlist.", true);
                return null;
            }
            return newPlaylistId;
        }
        return playlist.id;
    } catch (error) {
        console.error("Error locating MAIN playlist:", error);
        showNotification("Error locating MAIN playlist.", true);
        return null;
    }
}


    
    async function getCurrentPlaylistContext() {
        try {
            const context = Spicetify.Player?.data?.context;
            if (!context?.uri || !context.uri.includes("playlist")) {
                throw new Error("No valid playlist context found.");
            }
            return context.uri.split(":").pop(); // "spotify:playlist:123" => "123"
        } catch (err) {
            console.error("Error fetching playlist context:", err);
            showNotification("Error fetching playlist context. Try refreshing.", true);
            return null;
        }
    }

    async function addTracksToPlaylist(playlistId, trackUris) {
        try {
            const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
            const options = {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ uris: trackUris }),
            };
    
            const response = await fetchWithRetry(endpoint, options);
            if (!response.ok) {
                // Log the detailed error response from Spotify
                const errorResponse = await response.json();
                console.error("Spotify API error response:", errorResponse);
                throw new Error(`Failed to add tracks: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
    
            if (result?.snapshot_id) {
                showNotification(
                    trackUris.length > 1
                        ? `Added ${trackUris.length} tracks to playlist.`
                        : "Track added to playlist."
                );
                return true;
            }
        } catch (error) {
            console.error("Error adding track(s) to playlist:", error);
            showNotification("Error adding track(s) to playlist.", true);
        }
        return false;
    }
    
    async function removeTracksFromPlaylist(playlistId, trackUris) {
        // For DELETE, body: { tracks: [ {uri: '...'}, {uri: '...'} ] }
        const trackObjects = trackUris.map((uri) => ({ uri }));

        try {
            const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
            const options = {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tracks: trackObjects }),
            };

            const response = await fetchWithRetry(endpoint, options);
            if (!response.ok) {
                throw new Error(
                    `Failed to remove track(s): ${response.status} ${response.statusText}`
                );
            }
            await response.json(); // read the body to finalize

            showNotification(
                trackUris.length > 1
                    ? `Removed ${trackUris.length} tracks from playlist.`
                    : "Track removed from playlist."
            );
            return true;
        } catch (error) {
            console.error("Error removing track(s) from playlist:", error);
            showNotification("Error removing track(s) from playlist.", true);
            return false;
        }
    }

    // ========================================
    // === High-Level Operations ===
    // ========================================

    async function addCurrentTrackToMainPlaylist() {
        const mainPlaylistId = await locateMainPlaylist();
        if (!mainPlaylistId) return;

        const currentTrack = Spicetify.Player?.data?.item;
        if (!currentTrack) {
            showNotification("No track currently playing.", true);
            return;
        }

        const success = await addTracksToPlaylist(mainPlaylistId, [currentTrack.uri]);
        if (success) {
            actionHistory.push({
                action: "add",
                playlistId: mainPlaylistId,
                trackUris: [currentTrack.uri],
            });
            redoStack.length = 0;
        }
    }

    async function removeCurrentTrackFromCurrentPlaylist() {
        const playlistId = await getCurrentPlaylistContext();
        const currentTrack = Spicetify.Player?.data?.item;

        if (!playlistId || !currentTrack) {
            showNotification("No valid playlist or track context found.", true);
            return;
        }

        const success = await removeTracksFromPlaylist(playlistId, [currentTrack.uri]);
        if (success) {
            actionHistory.push({
                action: "remove",
                playlistId: playlistId,
                trackUris: [currentTrack.uri],
            });
            redoStack.length = 0;
        }
    }

    /**
     * Attempt to find the track URIs for each selected row in the new Spotify UI.
     * If we can't find URIs, we return an empty array.
     */
    function getSelectedTrackUrisFromDOM() {
        const selectedTrackElements = Array.from(
            document.querySelectorAll('[aria-selected="true"]')
        );

        // Try different fallback selectors/attributes
        const uris = selectedTrackElements
            .map((el) => {
                // 1) Check data-uri
                let uri = el.getAttribute("data-uri");
                if (!uri) {
                    // 2) Check children
                    const child = el.querySelector("[data-uri]");
                    if (child) {
                        uri = child.getAttribute("data-uri");
                    }
                }
                // 3) Attempt anchor-based approach: find <a href="/track/XXXX">
                if (!uri) {
                    const anchor = el.querySelector('a[href*="/track/"]');
                    if (anchor) {
                        const parts = anchor.href.split("/track/");
                        if (parts.length > 1) {
                            const trackId = parts[1].split("?")[0]; // handle query params
                            uri = `spotify:track:${trackId}`;
                        }
                    }
                }

                return uri || null;
            })
            .filter(Boolean);

        return uris;
    }

    /**
     * Remove all selected tracks from the current playlist (API-based).
     * If we can't find URIs from the DOM, we fallback to the UI-based right-click approach.
     */
    async function removeAllSelectedTracks() {
        const playlistId = await getCurrentPlaylistContext();
        if (!playlistId) {
            showNotification("No valid playlist context found for removal.", true);
            return;
        }

        const trackUris = getSelectedTrackUrisFromDOM();
        if (trackUris.length === 0) {
            console.error("Could not find URIs for the selected tracks via DOM. Fallback to UI.");
            // === FALLBACK: Remove tracks via right-click UI clicks (slower, can break selection) ===
            await removeSelectedTracksViaUI();
            return;
        }

        console.log("Removing selected track URIs:", trackUris);
        const success = await removeTracksFromPlaylist(playlistId, trackUris);
        if (success) {
            actionHistory.push({
                action: "remove",
                playlistId: playlistId,
                trackUris: trackUris,
            });
            redoStack.length = 0;
        }
    }

    /**
     * Fallback that removes selected tracks one-by-one with UI clicks.
     * Because the new UI often deselects tracks once you remove the first one,
     * this might only remove one track. We'll try to remove from last to first.
     */
    async function removeSelectedTracksViaUI() {
        // Grab the selected track elements
        let selectedTrackElements = Array.from(document.querySelectorAll('[aria-selected="true"]'));
        if (selectedTrackElements.length === 0) {
            showNotification("No tracks selected (fallback).", true);
            return;
        }
        // Reverse so we remove from bottom up
        selectedTrackElements = selectedTrackElements.reverse();

        let removedCount = 0;
        for (const el of selectedTrackElements) {
            // open the context menu
            const moreOptionsBtn = el.querySelector('[aria-label^="More options"]');
            if (!moreOptionsBtn) {
                console.warn("No 'More options' button found for track element:", el);
                continue;
            }
            moreOptionsBtn.click();
            await new Promise((r) => setTimeout(r, 500));

            // find "Remove from this playlist" menu item
            const removeOption = Array.from(
                document.querySelectorAll('span[data-encore-id="type"]')
            ).find((e) => e.textContent.trim() === "Remove from this playlist");
            if (!removeOption) {
                console.warn("Could not find 'Remove from this playlist' in context menu.");
                continue;
            }
            removeOption.click();
            await new Promise((r) => setTimeout(r, 500));

            removedCount += 1;
        }

        if (removedCount > 0) {
            showNotification(`Removed ${removedCount} track(s) using fallback.`);
            console.log(`Fallback removed ${removedCount} track(s).`);
        } else {
            showNotification("Could not remove selected track(s) via fallback method.", true);
        }
    }

    // ========================================
    // === Undo / Redo Implementation ===
    // ========================================
    async function undoAction() {
        if (actionHistory.length === 0) {
            showNotification("No actions to undo.");
            return;
        }

        const lastAction = actionHistory.pop();
        // If you want standard "stack-based" redo, do NOT empty redoStack here.
        // If you want to discard partial redos after new actions, you can do:
        // redoStack.length = 0;

        if (lastAction.action === "add") {
            // Undo an add by removing
            const success = await removeTracksFromPlaylist(
                lastAction.playlistId,
                lastAction.trackUris
            );
            if (success) {
                redoStack.push(lastAction);
                showNotification("Undo: Track(s) removed from playlist.");
            }
        } else if (lastAction.action === "remove") {
            // Undo a remove by re-adding
            const success = await addTracksToPlaylist(
                lastAction.playlistId,
                lastAction.trackUris
            );
            if (success) {
                redoStack.push(lastAction);
                showNotification("Undo: Track(s) added back to playlist.");
            }
        }
    }

    async function redoAction() {
        if (redoStack.length === 0) {
            showNotification("No actions to redo.");
            return;
        }

        const lastUndone = redoStack.pop();
        if (lastUndone.action === "add") {
            // Redo an add by adding again
            const success = await addTracksToPlaylist(
                lastUndone.playlistId,
                lastUndone.trackUris
            );
            if (success) {
                actionHistory.push(lastUndone);
                showNotification("Redo: Track(s) added again to playlist.");
            }
        } else if (lastUndone.action === "remove") {
            // Redo a remove by removing again
            const success = await removeTracksFromPlaylist(
                lastUndone.playlistId,
                lastUndone.trackUris
            );
            if (success) {
                actionHistory.push(lastUndone);
                showNotification("Redo: Track(s) removed from playlist again.");
            }
        }
    }

    // ========================================
    // === Spicetify Keyboard Shortcuts ===
    // ========================================

    Spicetify.Mousetrap.bind("ctrl+1", addCurrentTrackToMainPlaylist);
    Spicetify.Mousetrap.bind("ctrl+`", removeCurrentTrackFromCurrentPlaylist);
    Spicetify.Mousetrap.bind("ctrl+2", removeAllSelectedTracks);

    // For Undo/Redo in Spicetify:
    Spicetify.Mousetrap.bind("ctrl+z", undoAction);
    Spicetify.Mousetrap.bind("ctrl+y", redoAction);
    Spicetify.Mousetrap.bind("ctrl+shift+z", redoAction);

    // ========================================
    // === Global Key Listener for Undo/Redo ===
    // ========================================
    window.addEventListener("keydown", (e) => {
        console.log("keydown event:", {
            key: e.key,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
        });

        const isInput =
            e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA" ||
            e.target.isContentEditable;
        if (isInput) {
            return;
        }

        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        if (!isCtrlOrCmd) return;

        const key = e.key.toLowerCase();

        if (key === "z" && !e.shiftKey) {
            e.preventDefault();
            undoAction();
        } else if (key === "y") {
            e.preventDefault();
            redoAction();
        } else if (key === "z" && e.shiftKey) {
            e.preventDefault();
            redoAction();
        }
    });

    console.log("AddAndRemove.js: Keyboard shortcuts initialized successfully!");
})();
