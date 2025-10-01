// AddAndRemove.js — Spicetify extension
// Uses Spicetify.CosmosAsync so auth headers and refresh are handled by the client.
// Docs: CosmosAsync auto-adds required headers and works with Web API endpoints.
// https://spicetify.app/docs/development/api-wrapper/methods/cosmos-async/

(async function addAndRemove() {
    // Wait for Spicetify pieces
    function depsReady() {
        return (
            typeof Spicetify !== "undefined" &&
            Spicetify?.CosmosAsync &&
            Spicetify?.Player &&
            (Spicetify?.Mousetrap || Spicetify?.Keyboard)
        );
    }
    if (!depsReady()) {
        setTimeout(addAndRemove, 300);
        return;
    }

    console.log("AddAndRemove.js loaded");

    // ========================================
    // Notifications and history
    // ========================================
    const actionHistory = [];
    const redoStack = [];
    const showNote = (msg, isErr = false) => {
        try { Spicetify.showNotification(msg, isErr); } catch {}
        (isErr ? console.error : console.log)(msg);
    };

    // ========================================
    // Web API helpers via CosmosAsync
    // ========================================
    // All JSON bodies are auto stringified by CosmosAsync; responses are JSON-parsed.
    const api = {
        get: (url, body, headers) => Spicetify.CosmosAsync.get(url, body, headers),
        post: (url, body, headers) => Spicetify.CosmosAsync.post(url, body, headers),
        put: (url, body, headers) => Spicetify.CosmosAsync.put(url, body, headers),
        del: (url, body, headers) => Spicetify.CosmosAsync.del(url, body, headers),
    };

    // ========================================
    // Date formatting and MAIN playlist helpers
    // ========================================
    function formatDateDDMMYY(date) {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const y = String(date.getFullYear()).slice(-2);
        return `${d}/${m}/${y}`;
    }

    async function getCurrentUserId() {
        const me = await api.get("https://api.spotify.com/v1/me");
        return me?.id || null;
    }

    async function createMainPlaylist(userId) {
        const name = `MAIN ${formatDateDDMMYY(new Date())}`;
        const payload = {
            name,
            public: false,
            description:
                "Auto-generated MAIN playlist by Caleb's Spicetify plugin :) https://github.com/ChewOnThis/Add-Remove-Current-Song-To-Playlist",
        };
        const res = await api.post(`https://api.spotify.com/v1/users/${userId}/playlists`, payload);
        if (!res?.id) {
            showNote("Could not create MAIN playlist.", true);
            return null;
        }
        showNote(`Created ${name}.`);
        return res.id;
    }

    // Scan all user-owned playlists, looking for name MAIN DD/MM/YY
    async function locateMainPlaylist() {
        const userId = await getCurrentUserId();
        if (!userId) {
            showNote("Could not determine user id.", true);
            return null;
        }
        let url = "https://api.spotify.com/v1/me/playlists?limit=50";
        const regex = /^MAIN \d\d\/\d\d\/\d\d$/;

        while (url) {
            const page = await api.get(url);
            const hit = page?.items?.find(p => regex.test(p?.name) && p?.owner?.id === userId);
            if (hit) return hit.id;
            url = page?.next || null;
        }
        showNote("No MAIN DD/MM/YY found. Creating today’s MAIN…");
        return await createMainPlaylist(userId);
    }

    // ========================================
    // Playlist ops
    // ========================================
    function getCurrentPlaylistContextId() {
        try {
            const ctx = Spicetify.Player?.data?.context;
            if (!ctx?.uri || !ctx.uri.includes("playlist")) return null;
            return ctx.uri.split(":").pop();
        } catch {
            return null;
        }
    }

    async function addTracksToPlaylist(playlistId, trackUris) {
        const res = await api.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            uris: trackUris,
        });
        const ok = !!res?.snapshot_id;
        if (ok) showNote(trackUris.length > 1 ? `Added ${trackUris.length} tracks.` : "Track added.");
        return ok;
    }

    async function removeTracksFromPlaylist(playlistId, trackUris) {
        const body = { tracks: trackUris.map(uri => ({ uri })) };
        const res = await api.del(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, body);
        const ok = !!res?.snapshot_id;
        if (ok) showNote(trackUris.length > 1 ? `Removed ${trackUris.length} tracks.` : "Track removed.");
        return ok;
    }

    // ========================================
    // High-level actions
    // ========================================
    async function addCurrentTrackToMainPlaylist() {
        const mainId = await locateMainPlaylist();
        if (!mainId) return;

        const currentTrack = Spicetify.Player?.data?.item;
        if (!currentTrack?.uri) {
            showNote("No track currently playing.", true);
            return;
        }
        const ok = await addTracksToPlaylist(mainId, [currentTrack.uri]);
        if (ok) {
            actionHistory.push({ action: "add", playlistId: mainId, trackUris: [currentTrack.uri] });
            redoStack.length = 0;
        }
    }

    async function removeCurrentTrackFromCurrentPlaylist() {
        const playlistId = getCurrentPlaylistContextId();
        const currentTrack = Spicetify.Player?.data?.item;
        if (!playlistId || !currentTrack?.uri) {
            showNote("No valid playlist or track context.", true);
            return;
        }
        const ok = await removeTracksFromPlaylist(playlistId, [currentTrack.uri]);
        if (ok) {
            actionHistory.push({ action: "remove", playlistId, trackUris: [currentTrack.uri] });
            redoStack.length = 0;
        }
    }

    // Try multiple selection markers used in recent UIs
    function getSelectedTrackUrisFromDOM() {
        const selectors = [
            '[aria-selected="true"]',
            '[data-interaction-state~="selected"]',
            '[data-selected="true"]',
        ];
        const selectedEls = selectors.flatMap(sel => Array.from(document.querySelectorAll(sel)));
        const uniq = Array.from(new Set(selectedEls));

        const uris = uniq
            .map(el => {
                let uri =
                    el.getAttribute?.("data-uri") ||
                    el.querySelector?.("[data-uri]")?.getAttribute?.("data-uri");
                if (!uri) {
                    const a = el.querySelector?.('a[href*="/track/"]');
                    if (a?.href) {
                        const id = a.href.split("/track/")[1]?.split("?")[0];
                        if (id) uri = `spotify:track:${id}`;
                    }
                }
                return uri || null;
            })
            .filter(Boolean);

        return uris;
    }

    async function removeAllSelectedTracks() {
        const playlistId = getCurrentPlaylistContextId();
        if (!playlistId) {
            showNote("No playlist context.", true);
            return;
        }
        const uris = getSelectedTrackUrisFromDOM();
        if (uris.length === 0) {
            showNote("No selected tracks found.", true);
            return;
        }
        const ok = await removeTracksFromPlaylist(playlistId, uris);
        if (ok) {
            actionHistory.push({ action: "remove", playlistId, trackUris: uris });
            redoStack.length = 0;
        }
    }

    // ========================================
    // Undo / Redo
    // ========================================
    async function undoAction() {
        if (!actionHistory.length) {
            showNote("Nothing to undo.");
            return;
        }
        const last = actionHistory.pop();
        if (last.action === "add") {
            if (await removeTracksFromPlaylist(last.playlistId, last.trackUris)) {
                redoStack.push(last);
                showNote("Undo: removed.");
            }
        } else if (last.action === "remove") {
            if (await addTracksToPlaylist(last.playlistId, last.trackUris)) {
                redoStack.push(last);
                showNote("Undo: re-added.");
            }
        }
    }

    async function redoAction() {
        if (!redoStack.length) {
            showNote("Nothing to redo.");
            return;
        }
        const last = redoStack.pop();
        if (last.action === "add") {
            if (await addTracksToPlaylist(last.playlistId, last.trackUris)) {
                actionHistory.push(last);
                showNote("Redo: added again.");
            }
        } else if (last.action === "remove") {
            if (await removeTracksFromPlaylist(last.playlistId, last.trackUris)) {
                actionHistory.push(last);
                showNote("Redo: removed again.");
            }
        }
    }

    // ========================================
    // Keybindings
    // ========================================
    // Keep Mousetrap binds that you already use for top-row digits,
    // then add Spicetify.Keyboard fallbacks for numpad and layout quirks.
    const bindMT = (combo, fn) => {
        try { Spicetify.Mousetrap.bind(combo, fn); } catch {}
    };
    const bindKB = (combo, fn) => {
        try { Spicetify.Keyboard.registerShortcut(combo, (e) => { e?.preventDefault?.(); fn(); }); } catch {}
    };

    // Your original combos
    bindMT("ctrl+1", addCurrentTrackToMainPlaylist);
    bindMT("ctrl+`", removeCurrentTrackFromCurrentPlaylist);
    bindMT("ctrl+2", removeAllSelectedTracks);

    // Undo / Redo
    bindMT("ctrl+z", undoAction);
    bindMT("ctrl+y", redoAction);
    bindMT("ctrl+shift+z", redoAction);

    // Robust fallbacks for remove selected:
    bindKB("ctrl+NUMPAD_2", removeAllSelectedTracks); // numpad 2
    bindKB({ key: "@", ctrl: true }, removeAllSelectedTracks); // some layouts map 2 to @
    bindKB("ctrl+shift+d", removeAllSelectedTracks); // universal backstop

    // Optional alternative layout mappings for your add/remove:
    bindKB("alt+a", addCurrentTrackToMainPlaylist);
    bindKB("alt+r", removeCurrentTrackFromCurrentPlaylist);

    console.log("AddAndRemove.js: shortcuts initialised");
})();
