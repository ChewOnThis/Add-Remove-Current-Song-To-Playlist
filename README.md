# Add-Remove-Current-Song-To-Playlist

### **Overview**
`AddAndRemove.js` is a Spicetify extension that enables keyboard shortcuts to quickly manage Spotify playlists. With this script, you can:
- Add the currently playing track to a specific playlist (e.g., the "MAIN" playlist which I've specified, but you can change it to any playlist in your favourite code editor).
- Remove the currently playing track from the current playlist.
- Undo and redo playlist actions.

### **Features**
- **Add to "MAIN" Playlist**: Quickly add the current track to a designated playlist (default is a playlist named "MAIN" with any following characters).
- **Remove from Playlist**: Remove the current track from the playlist you're currently listening to.
- **Undo/Redo Actions**: Revert or redo changes made to playlists with keyboard shortcuts.
- **Custom Notifications**: Get feedback through Spotify notifications for every action.

### **Keyboard Shortcuts**
| Shortcut      | Action                                       |
|---------------|---------------------------------------------|
| `Ctrl+1`      | Add the currently playing track to the "MAIN" playlist. |
| `` Ctrl+` ``  | Remove the currently playing track from the current playlist. |
| `Ctrl+Z`      | Undo the last action.                       |
| `Ctrl+Y`      | Redo the last undone action.                |

### **Installation**

1. **Download and Place the Script**:
   - Place `AddAndRemove.js` in your Spicetify Extensions directory:
     ```
     C:\Users\<YourUsername>\.spicetify\Extensions
     ```
     Replace `<YourUsername>` with your system username.

2. **Configure Spicetify**:
   - Add the script to Spicetify's configuration:
     ```bash
     spicetify config extensions AddAndRemove.js
     ```

3. **Apply Configuration**:
   - Apply the changes and reload Spicetify:
     ```bash
     spicetify apply
     ```

4. **Restart Spotify**:
   - Close and reopen Spotify to activate the extension.

### **Usage**

Once installed, the extension will automatically load when Spotify starts. Use the keyboard shortcuts to manage your playlists efficiently. Notifications will confirm successful actions or errors.

### **Customization**

You can customize the playlist name, shortcuts, or functionality by editing the script. Key areas to modify include:
- **Playlist Name**: Change `"MAIN"` in the script to your preferred playlist name.
- **Keyboard Shortcuts**: Update the key bindings in the `Mousetrap.bind()` calls.

### **Contributing**

Contributions, suggestions, and bug reports are welcome! To contribute:
1. Fork this repository.
2. Create a feature branch.
3. Submit a pull request with your changes.

### **License**
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

Let me know if you'd like to add more sections, such as screenshots or FAQs!
