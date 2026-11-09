const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const RPC = require("discord-rpc");

const CLIENT_ID = "1569378197785682096";
const PORT = 17392;

let win;
let rpc;
let rpcReady = false;
let rpcConnecting = false;
let mode = "hybrid";
let manual = { details: "Browsing Stellic", state: "Planning my courses", largeImageKey: "", smallImageKey: "" };
let detected = { details: "Viewing Stellic", state: "stellic.cc", url: "https://stellic.cc/" };
let activityStartedAt = Date.now();
let lastActivity = null;
let httpServer;

function sendStatus(extra = {}) {
  if (win && !win.isDestroyed()) {
    win.webContents.send("app-status", {
      connected: rpcReady,
      connecting: rpcConnecting,
      mode,
      detected,
      ...extra
    });
  }
}

function effectiveActivity() {
  const details = mode === "manual"
    ? manual.details
    : (mode === "automatic"
        ? detected.details
        : (manual.details.trim() || detected.details));
  const state = mode === "manual"
    ? manual.state
    : (mode === "automatic"
        ? detected.state
        : (manual.state.trim() || detected.state));

  const payload = {
    details: (details || "Browsing Stellic").slice(0, 128),
    state: (state || "stellic.cc").slice(0, 128),
    startTimestamp: activityStartedAt,
    instance: false
  };

  const largeImageKey = manual.largeImageKey.trim();
  const smallImageKey = manual.smallImageKey.trim();
  if (largeImageKey) payload.largeImageKey = largeImageKey;
  if (smallImageKey) payload.smallImageKey = smallImageKey;
  return payload;
}

async function updatePresence() {
  if (!rpcReady || !rpc) return;
  const activity = effectiveActivity();
  const signature = JSON.stringify(activity);
  if (signature === lastActivity) return;
  try {
    await rpc.setActivity(activity);
    lastActivity = signature;
    sendStatus({ activity });
  } catch (error) {
    sendStatus({ error: `Could not update Discord activity: ${error.message}` });
  }
}

async function connectDiscord() {
  if (rpcReady || rpcConnecting) return;
  rpcConnecting = true;
  sendStatus();
  try {
    RPC.register(CLIENT_ID);
    rpc = new RPC.Client({ transport: "ipc" });
    rpc.on("ready", async () => {
      rpcReady = true;
      rpcConnecting = false;
      lastActivity = null;
      sendStatus();
      await updatePresence();
    });
    rpc.on("disconnected", () => {
      rpcReady = false;
      rpcConnecting = false;
      lastActivity = null;
      sendStatus({ error: "Discord disconnected. Make sure the Discord desktop app is open." });
    });
    await rpc.login({ clientId: CLIENT_ID });
  } catch (error) {
    rpcReady = false;
    rpcConnecting = false;
    sendStatus({ error: `Discord connection failed: ${error.message}. Open the Discord desktop app and try again.` });
    try { if (rpc) rpc.destroy(); } catch {}
    rpc = null;
  }
}

async function disconnectDiscord() {
  try {
    if (rpc) {
      if (rpcReady) await rpc.clearActivity();
      rpc.destroy();
    }
  } catch {}
  rpc = null;
  rpcReady = false;
  rpcConnecting = false;
  lastActivity = null;
  sendStatus();
}

function startLocalBridge() {
  httpServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    if (req.method !== "POST" || req.url !== "/activity") {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "Not found" }));
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 16_384) req.destroy();
    });
    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        const url = String(data.url || "");
        if (!/^https:\/\/([a-z0-9-]+\.)*stellic\.cc(\/|$)/i.test(url)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ ok: false, error: "Only stellic.cc pages are accepted." }));
        }
        const title = String(data.title || "Stellic").replace(/\s+/g, " ").trim().slice(0, 100);
        let page = "Stellic";
        try {
          const parsed = new URL(url);
          const parts = parsed.pathname.split("/").filter(Boolean);
          page = parts.length ? parts[parts.length - 1].replace(/[-_]/g, " ") : "Dashboard";
          page = page.replace(/\b\w/g, c => c.toUpperCase()).slice(0, 80);
        } catch {}
        detected = {
          details: title && title !== "Stellic" ? title : `Viewing ${page}`,
          state: `Stellic • ${page}`,
          url
        };
        if (mode !== "manual") await updatePresence();
        sendStatus();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid request." }));
      }
    });
  });

  httpServer.listen(PORT, "127.0.0.1", () => {
    sendStatus({ bridge: `http://127.0.0.1:${PORT}` });
  });
  httpServer.on("error", error => sendStatus({ error: `Local browser bridge failed: ${error.message}` }));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 850,
    minHeight: 620,
    backgroundColor: "#0b0b12",
    title: "Stellic RPC",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  startLocalBridge();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle("connect-discord", connectDiscord);
ipcMain.handle("disconnect-discord", disconnectDiscord);
ipcMain.handle("set-mode", async (_event, nextMode) => {
  if (["automatic", "manual", "hybrid"].includes(nextMode)) mode = nextMode;
  lastActivity = null;
  await updatePresence();
  sendStatus();
  return { ok: true };
});
ipcMain.handle("set-manual", async (_event, values) => {
  manual = {
    details: String(values.details || "").slice(0, 128),
    state: String(values.state || "").slice(0, 128),
    largeImageKey: String(values.largeImageKey || "").slice(0, 128),
    smallImageKey: String(values.smallImageKey || "").slice(0, 128)
  };
  lastActivity = null;
  await updatePresence();
  sendStatus();
  return { ok: true };
});
ipcMain.handle("get-status", () => ({
  connected: rpcReady,
  connecting: rpcConnecting,
  mode,
  detected,
  bridge: `http://127.0.0.1:${PORT}`
}));

app.on("before-quit", () => {
  try { if (rpc) rpc.destroy(); } catch {}
  try { if (httpServer) httpServer.close(); } catch {}
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
