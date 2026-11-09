# Stellic RPC

A Windows desktop app for Discord Rich Presence with three modes:

- **Automatic:** uses the detected Stellic page title and URL-derived page label.
- **Manual:** uses the activity text you enter.
- **Hybrid:** manual text takes priority when filled in; otherwise detected page information is used.

Discord application ID is preconfigured as `1569378197785682096`.

## Requirements

- Windows 10/11
- Node.js 20 or newer
- Discord desktop application (running and signed in)
- Microsoft Edge or Google Chrome
- Internet connection for installing dependencies

## 1. Install and run the desktop app

1. Extract the ZIP.
2. Open the extracted `stellic-rpc` folder.
3. In the folder address bar, type `powershell` and press Enter.
4. Run:

   ```powershell
   npm install
   npm start
   ```

5. Keep the desktop app running.
6. Open the Discord desktop application before pressing **Connect Discord**.

The app runs a local bridge at `http://127.0.0.1:17392`. It only accepts HTTPS pages on `stellic.cc` domains.

## 2. Install the browser extension (Edge)

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `extension` folder inside the extracted project.
5. Open or refresh `https://stellic.cc`.
6. In the desktop app, choose **Automatic** or **Hybrid**.

## Install in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project's `extension` folder.
5. Open or refresh Stellic.

## 3. Manual and hybrid modes

- **Manual:** fill in Details and State, then click **Apply activity**.
- **Automatic:** activity is based on the detected Stellic page.
- **Hybrid:** non-empty manual Details/State override the detected values.

The image fields are optional. If you want custom artwork, create image assets in the Discord Developer Portal for this application, then enter the exact asset keys here. The app cannot upload assets to Discord automatically.

## Privacy

The browser extension sends only the active Stellic page's document title and URL to the desktop app on your own computer. It does not inspect page text, course names, grades, assignments, or other page contents. The local bridge binds to `127.0.0.1`, not your network interface.

## Troubleshooting

- **Discord won't connect:** use the Discord desktop app, not the website; make sure it is open and signed in.
- **No automatic activity:** confirm the extension is enabled, refresh Stellic, and keep the desktop app running.
- **No custom image:** verify that the asset key exactly matches an uploaded Discord application asset.
- **Port in use:** close any other process using port `17392`.

## Notes

This is a source project, not a prebuilt Windows installer. The included `index.html` is the app interface and is intended to be loaded by Electron; opening it directly in a browser does not provide Discord IPC or the local bridge.
