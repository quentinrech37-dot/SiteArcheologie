// ----------------------------
// Réglages généraux
// ----------------------------
const SALINS_CENTER = [46.9426, 5.8768];  // centre approx Salins-les-Bains
const SALINS_ZOOM = 15;

// IMPORTANT : À remplacer avec des bornes exactes (voir section QGIS).
// Format Leaflet : [[latSud, lonOuest],[latNord, lonEst]]
const PLAN1_BOUNDS = [[46.9390, 5.8710],[46.9465, 5.8845]];
const PLAN2_BOUNDS = [[46.9385, 5.8705],[46.9470, 5.8850]];

// Fichiers images (renommez si besoin)
const PLAN1_URL = "assets/img/plan1.jpg";
const PLAN2_URL = "assets/img/plan2.jpg";

// ----------------------------
// Carte Leaflet
// ----------------------------
let map;
let baseLayers = {};
let overlays = {};
let userMarker = null;

window.addEventListener("load", () => {
  initMap();
  initUI();
  registerSW();
});

function initMap(){
  map = L.map("map", {
    center: SALINS_CENTER,
    zoom: SALINS_ZOOM,
    zoomControl: true
  });

  // Fond satellite (ESRI)
  const esriSat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Fond : Esri World Imagery"
    }
  );

  // Fond plan (OSM)
  const osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "Fond : © OpenStreetMap"
    }
  );

  baseLayers = { sat: esriSat, osm: osm };
  baseLayers.sat.addTo(map);

  // Surcouches (plans scannés)
  const plan1 = L.imageOverlay(PLAN1_URL, PLAN1_BOUNDS, { opacity: 0.75, interactive: false });
  const plan2 = L.imageOverlay(PLAN2_URL, PLAN2_BOUNDS, { opacity: 0.75, interactive: false });

  overlays = { plan1, plan2 };

  // Un petit repère utile (optionnel)
  L.circleMarker(SALINS_CENTER, { radius: 5 }).addTo(map).bindPopup("Centre (approx.) de Salins-les-Bains");
}

function initUI(){
  // Basemap radio
  document.querySelectorAll('input[name="basemap"]').forEach(radio => {
    radio.addEventListener("change", () => {
      const v = document.querySelector('input[name="basemap"]:checked').value;
      setBasemap(v);
    });
  });

  // Toggles plans
  const t1 = document.getElementById("togglePlan1");
  const t2 = document.getElementById("togglePlan2");
  const o1 = document.getElementById("opacityPlan1");
  const o2 = document.getElementById("opacityPlan2");

  t1.addEventListener("change", () => toggleOverlay("plan1", t1.checked));
  t2.addEventListener("change", () => toggleOverlay("plan2", t2.checked));

  o1.addEventListener("input", () => setOverlayOpacity("plan1", parseFloat(o1.value)));
  o2.addEventListener("input", () => setOverlayOpacity("plan2", parseFloat(o2.value)));

  // Boutons topbar
  document.getElementById("btnReset").addEventListener("click", () => {
    map.setView(SALINS_CENTER, SALINS_ZOOM);
  });

  document.getElementById("btnLocate").addEventListener("click", locateUser);

  // Crédit dynamique (vous pouvez personnaliser)
  setCredit("Activez un plan à gauche pour comparer.");
}

function setBasemap(which){
  // retire tout
  Object.values(baseLayers).forEach(l => {
    if (map.hasLayer(l)) map.removeLayer(l);
  });
  baseLayers[which].addTo(map);

  if(which === "sat") setCredit("Fond : Esri World Imagery — Surcouches : scans d’archives");
  if(which === "osm") setCredit("Fond : © OpenStreetMap — Surcouches : scans d’archives");
}

function toggleOverlay(key, on){
  const layer = overlays[key];
  if(!layer) return;

  if(on){
    layer.addTo(map);
    // Option utile : zoomer sur l’emprise du plan au premier affichage
    // map.fitBounds(layer.getBounds());
  } else {
    if(map.hasLayer(layer)) map.removeLayer(layer);
  }
}

function setOverlayOpacity(key, opacity){
  const layer = overlays[key];
  if(!layer) return;
  layer.setOpacity(opacity);
}

function locateUser(){
  if(!navigator.geolocation){
    alert("La géolocalisation n’est pas disponible sur ce navigateur.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      if(userMarker) map.removeLayer(userMarker);
      userMarker = L.marker([lat, lon]).addTo(map).bindPopup("Vous êtes ici (GPS)").openPopup();
      map.setView([lat, lon], Math.max(map.getZoom(), 16));
    },
    () => alert("Localisation refusée ou indisponible."),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function setCredit(text){
  document.getElementById("credit").textContent = text;
}

// ----------------------------
// PWA : Service Worker
// ----------------------------
function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").catch(() => {
    // silencieux
  });
}
