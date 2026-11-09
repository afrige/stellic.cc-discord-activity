const $ = id => document.getElementById(id);
let currentMode = "hybrid";
let currentStatus = {};

function showError(message = "") { $("error").textContent = message; }
function updatePreview() {
  $("previewDetails").innerHTML = `${escapeHtml($("details").value || "Browsing Stellic")}<br><span id="previewState">${escapeHtml($("state").value || "Planning my courses")}</span>`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function renderStatus(status) {
  currentStatus = status;
  currentMode = status.mode || currentMode;
  $("dot").classList.toggle("on", !!status.connected);
  $("connectionText").textContent = status.connected ? "Discord connected" : (status.connecting ? "Connecting…" : "Not connected");
  document.querySelectorAll(".mode").forEach(button => button.classList.toggle("active", button.dataset.mode === currentMode));
  if (status.detected) {
    $("detectedTitle").textContent = status.detected.details || "Stellic detected";
    $("detectedUrl").textContent = status.detected.url || "Waiting for a page";
  }
  if (status.error) showError(status.error);
}
async function applyManual() {
  showError("");
  const result = await window.stellicRPC.setManual({
    details: $("details").value,
    state: $("state").value,
    largeImageKey: $("largeImage").value,
    smallImageKey: $("smallImage").value
  });
  updatePreview();
  if (!result?.ok) showError("Could not apply activity.");
}
$("connectBtn").addEventListener("click", async () => { showError(""); await window.stellicRPC.connect(); });
$("disconnectBtn").addEventListener("click", async () => { showError(""); await window.stellicRPC.disconnect(); });
$("saveBtn").addEventListener("click", applyManual);
$("resetBtn").addEventListener("click", () => {
  $("details").value = "";
  $("state").value = "";
  $("largeImage").value = "";
  $("smallImage").value = "";
  applyManual();
});
["details","state"].forEach(id => $(id).addEventListener("input", updatePreview));
document.querySelectorAll(".mode").forEach(button => button.addEventListener("click", async () => {
  await window.stellicRPC.setMode(button.dataset.mode);
}));
window.stellicRPC.onStatus(renderStatus);
window.stellicRPC.getStatus().then(renderStatus).catch(error => showError(error.message));
updatePreview();
