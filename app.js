// app.js - Geofencing lab: your code goes here.
// Erasmus Mundus Master in Geospatial Technologies.
// Follow the slides: complete STEP 1 to STEP 6 in order. Everything marked PROVIDED already works.

// ======================================================================
// PROVIDED: map, fences and small UI helpers
// ======================================================================
const $ = (id) => document.getElementById(id);
const fences = loadFences(GEOFENCES);              // from geo.js
const COLORS = { library: "#1d6fa5", parking: "#2e9e6a", lab: "#c2410c" };
let lastPos = null;                                // last position received {lat, lon}
let watchId = null;                                // id returned by watchPosition (STEP 5)
let replayTimer = null;
let total = 0;

const map = L.map("map").setView([ORIGIN.lat, ORIGIN.lon], 17);   // initial view: needed before fitBounds()
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20, maxNativeZoom: 19, attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);
const fenceLayer = L.featureGroup().addTo(map);
const trail = L.polyline([], { color: "#374151", weight: 2, opacity: 0.6 }).addTo(map);
const meMarker = L.circleMarker([0, 0], { radius: 7, color: "#fff", weight: 2, fillColor: "#111827", fillOpacity: 1 });
const accCircle = L.circle([0, 0], { radius: 1, color: "#1d6fa5", weight: 1, fillOpacity: 0.08 });

function drawFence(f) {
  const color = COLORS[f.id] || "#7c3aed";
  const style = { color, weight: 2, fillOpacity: 0.15 };
  const layer = f.kind === "circle" ? L.circle(f.center, { ...style, radius: f.radius_m }) : L.polygon(f.ring, style);
  layer.bindTooltip(f.id + (f.restricted ? " (restricted)" : ""), { permanent: true, direction: "center" });
  layer.addTo(fenceLayer);
}
function addCircleFence(id, lat, lon, radius, restricted) {
  const f = { id, kind: "circle", center: [lat, lon], radius_m: radius, restricted, inside: false, count: 0, events: 0 };
  fences.push(f);
  drawFence(f);
  updateTable();
}
function drawMe(lat, lon, accuracy) {
  meMarker.setLatLng([lat, lon]).addTo(map);
  if (accuracy) accCircle.setLatLng([lat, lon]).setRadius(accuracy).addTo(map);
  trail.addLatLng([lat, lon]);
}
function setStatus(msg, isError = false) {
  $("status").textContent = msg;
  $("status").className = "status" + (isError ? " error" : "");
}
function showAlert(msg) {
  $("alert").textContent = msg;
  $("alert").classList.remove("hidden");
  setTimeout(() => $("alert").classList.add("hidden"), 6000);
}
function log(text, type) {
  const li = document.createElement("li");
  li.className = type;
  li.textContent = text;
  $("log").appendChild(li);
  li.scrollIntoView({ block: "nearest" });
}
function updateTable() {
  $("fenceTable").querySelector("tbody").innerHTML = fences.map((f) =>
    `<tr><td>${f.id}</td><td><span class="chip ${f.inside ? "in" : ""}">${f.inside ? "inside" : "outside"}</span></td>` +
    `<td>${f.events || 0}</td></tr>`).join("");
  $("total").textContent = total;
}
function resetAll() {
  fences.forEach((f) => { f.inside = false; f.count = 0; f.events = 0; });
  total = 0;
  $("log").innerHTML = "";
  trail.setLatLngs([]);
  updateTable();
}
const clock = (t) => new Date(t).toTimeString().slice(0, 8);

// ======================================================================
// STEP 1 - Where am I?  (HTML5 Geolocation API, one position)
// ======================================================================
function whereAmI() {
  setStatus("Asking the browser for your position…");
  // TODO STEP 1a: ask the browser for ONE position with navigator.geolocation.getCurrentPosition(...)
  //               success -> showPosition, error -> showError, options -> { enableHighAccuracy: true }
  navigator.geolocation.getCurrentPosition(showPosition, showError,  { enableHighAccuracy: true });

  setStatus("STEP 1a is not done yet: complete whereAmI() in app.js", true);
}

function showPosition(pos) {
  // TODO STEP 1b: read the real values from pos.coords (latitude, longitude, accuracy)
  
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  const accuracy = pos.coords.accuracy;

  lastPos = { lat, lon };
  drawMe(lat, lon, accuracy);
  if (watchId === null) map.setView([lat, lon], 18);
  setStatus(`You are at ${lat.toFixed(5)}, ${lon.toFixed(5)}  (±${Math.round(accuracy)} m)`);
  checkFences(lat, lon, pos.timestamp);
}

function showError(err) {
  setStatus(`Geolocation error ${err.code}: ${err.message}`, true);
}

// ======================================================================
// STEP 2 - Am I inside each fence?
// STEP 3 - Turn changes of state into ENTER / EXIT events
// ======================================================================
function checkFences(lat, lon, time) {
  for (const f of fences) {
    // TODO STEP 2: is the point inside this fence? Replace false by isInsideFence(f, lat, lon)
    const inside = isInsideFence(f, lat, lon);
  if (inside !== f.inside) { // changed?
    f.inside = inside;
    fireEvent(inside ? "ENTER" : "EXIT",
              f, time);
  }


    // TODO STEP 3: replace the line "f.inside = inside;" above by:
    //   if the state changed (inside !== f.inside):
    //     - store the new state in f.inside
    //     - call fireEvent(inside ? "ENTER" : "EXIT", f, time)
  }
  updateTable();
}

// ======================================================================
// STEP 4 - Replay the simulated walk (PROVIDED: just press the button)
// ======================================================================
function replayTrack() {
  stopAll();
  resetAll();
  map.fitBounds(fenceLayer.getBounds().pad(0.3));
  let i = 0;
  replayTimer = setInterval(() => {
    if (i >= TRACK.length) { stopAll(); setStatus(`Replay finished: ${total} events.`); return; }
    const [iso, lat, lon] = TRACK[i++];
    drawMe(lat, lon);
    checkFences(lat, lon, Date.parse(iso));
    setStatus(`Replaying ${iso.slice(11)}  (${i}/${TRACK.length})`);
  }, 60);
}

// ======================================================================
// STEP 5 - Go live: follow your position continuously
// ======================================================================
function startLive() {
  stopAll();
  resetAll();
  // follow the position continuously
watchId = navigator.geolocation.watchPosition(
  showPosition, showError,
  { enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000 });

  // TODO STEP 5: follow the position continuously with navigator.geolocation.watchPosition(...)
  //              same callbacks as STEP 1, options { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
  //              and keep the returned id in watchId (stopAll() uses it to stop).
  setStatus("STEP 5 is not done yet: complete startLive() in app.js", true);
}

function stopAll() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (replayTimer) clearInterval(replayTimer);
  replayTimer = null;
}

// ======================================================================
// STEP 6 - React to events: alert for restricted fences + your own fence
// ======================================================================
function fireEvent(type, fence, time) {
  fence.events = (fence.events || 0) + 1;
  total += 1;
  log(`${clock(time)}  ${type}  ${fence.id}`, type);
  // TODO STEP 6a: if the event is an ENTER and the fence is restricted:
  //               showAlert(...) and, if available, navigator.vibrate([200, 100, 200])
}

function fenceAroundMe() {
  if (!lastPos) { setStatus("Press 'Where am I?' or 'Start live' first.", true); return; }
  // TODO STEP 6b: create a restricted circle of 25 m around lastPos with
  //               addCircleFence("my-fence", lat, lon, radius, restricted)
  setStatus("STEP 6b is not done yet: complete fenceAroundMe() in app.js", true);
}

// ======================================================================
// PROVIDED: start-up
// ======================================================================
fences.forEach(drawFence);
map.fitBounds(fenceLayer.getBounds().pad(0.3));
updateTable();
$("btnWhere").onclick = whereAmI;
$("btnReplay").onclick = replayTrack;
$("btnLive").onclick = startLive;
$("btnStop").onclick = () => { stopAll(); setStatus("Stopped."); };
$("btnFenceHere").onclick = fenceAroundMe;
if (!window.isSecureContext) {
  setStatus("Replay works here, but GPS needs http://localhost or https:// (see Getting started).", true);
}
