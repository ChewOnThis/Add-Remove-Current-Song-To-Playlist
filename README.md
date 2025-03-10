
# Chewy's Spicetify Keyboard Shortcuts

This Spicetify extension automates the management of a special Spotify playlist. It looks for a playlist formatted as `MAIN DD/MM/YY` (where `DD/MM/YY` is any date) that is owned by you. If it cannot find such a playlist, it automatically creates one using the current date.

## Features

- **Dynamic Playlist Lookup:**  
  Searches for a playlist with the exact format `MAIN DD/MM/YY` (e.g., `MAIN 24/03/25`) owned by you.
  
- **Automatic Playlist Creation:**  
  If no matching playlist is found, the extension creates one using the current date.
  
- **Track Management:**  
  Includes helper functions for adding and removing tracks from playlists.
  
- **Undo/Redo Support:**  
  Supports undo/redo functionality for track management actions.
  
- **Keyboard Shortcuts:**  
  Utilize Spicetify keyboard shortcuts for quick actions:
  - `Ctrl+1`: Add the current track to the MAIN playlist.
  - `Ctrl+\``: Remove the current track from the current playlist.
  - `Ctrl+2`: Remove all selected tracks.
  - `Ctrl+Z`: Undo the last action.
  - `Ctrl+Y` or `Ctrl+Shift+Z`: Redo the last undone action.

## Installation

### Prerequisites

- **Spicetify:**  
  Ensure you have [Spicetify](https://spicetify.app/) installed and configured on your system. Follow the [getting started guide](https://spicetify.app/get-started/) if needed.

### Steps

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/ChewOnThis/Add-Remove-Current-Song-To-Playlist
   cd Add-Remove-Current-Song-To-Playlist
   ```

2. **Copy the Extension File:**

   Copy the `addAndRemove.js` file (or the file containing the extension code) to your Spicetify extensions folder. The default locations are:

   - **Windows:** `%userprofile%\.spicetify\Extensions`
   - **macOS/Linux:** `~/.spicetify/Extensions`

   For example, on macOS/Linux:

   ```bash
   cp addAndRemove.js ~/.spicetify/Extensions/
   ```

3. **Enable the Extension:**

   ```bash
   spicetify config extensions addAndRemove.js
   ```

4. **Apply the Changes:**

   After updating the configuration, apply the changes with:

   ```bash
   spicetify apply
   ```

## Usage

Once installed and applied, the extension will automatically run with Spotify via Spicetify. It will search for a playlist named in the format `MAIN DD/MM/YY`. If none is found, it creates a new playlist using today's date in that format.

### Keyboard Shortcuts

- **Add current track to MAIN playlist:** `Ctrl+1`
- **Remove current track from current playlist:** `Ctrl+\``
- **Remove all selected tracks:** `Ctrl+2`
- **Undo last action:** `Ctrl+Z`
- **Redo last undone action:** `Ctrl+Y` or `Ctrl+Shift+Z`

## Customization

Feel free to modify the code to suit your needs. For example, you can change the date format in the `formatDate` function or adjust the keyboard shortcuts.

## Contributing

Contributions, bug fixes, and feature requests are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/yourusername/spicetify-main-playlist-manager).

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [Spicetify](https://spicetify.app/) for providing an awesome platform to customize Spotify.
- The Spicetify community for continuous improvements and support.

