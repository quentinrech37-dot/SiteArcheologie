// ----------------------------
// Réglages généraux
// ----------------------------
const SALINS_CENTER = [46.9426, 5.8768];  // centre approx Salins-les-Bains
const SALINS_ZOOM = 15;

// IMPORTANT : À remplacer avec des bornes exactes (voir section QGIS).
// Format Leaflet : [[latSud, lonOuest],[latNord, lonEst]]
const PLAN1_TILES_URL = "https://mapwarper.net/maps/tile/101545/{z}/{x}/{y}.png";
const PLAN2_TILES_URL = "https://mapwarper.net/maps/tile/101560/{z}/{x}/{y}.png";


// Fichiers images (renommez si besoin)

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
  const plan1 = L.tileLayer(PLAN1_TILES_URL, {
    opacity: 0.75,
    maxZoom: 22,         // zoom possible côté Leaflet
    maxNativeZoom: 19,   // souvent 18/19 pour Map Warper; 19 est un bon défaut
    attribution: "Plan 1 (Map Warper)"
  });

  const plan2 = L.tileLayer(PLAN2_TILES_URL, {
    opacity: 0.75,
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: "Plan 2 (Map Warper)"
  });


  overlays = { plan1, plan2 };

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
  // Boutons "Infos" des plans
  document.querySelectorAll('[data-info]').forEach(btn => {
    btn.addEventListener('click', () => openInfo(btn.dataset.info));
  });

  // Fermeture modal
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', closeInfo);
  });

  // Échap pour fermer
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeInfo();
  });

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

function openInfo(which){
  const modal = document.getElementById("infoModal");
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");

  const data = {
    plan1: {
      title: "Plan 1 — Plan de Salins (XVIIIe siècle)",
      html: `
        <p class="meta"><strong>Source :</strong> scan d’archives — géoréférencement via Map Warper.</p>
        <p><strong>Contenu :</strong> représentation planimétrique de Salins et des alentours, avec éléments fortifiés, trame viaire et occupation des sols.</p>
        <p><strong>Remarque :</strong> la déformation visible résulte de la rectification (ajustement sur points d’appui) afin d’aligner le plan avec la cartographie actuelle.</p>
      `
    },
    plan2: {
      title: "Plan 2 — Carte (XIXe siècle)",
      html: `
        <p class="meta"><strong>Source :</strong> scan d’archives — géoréférencement via Map Warper.</p>
        <p><strong>Contenu :</strong> plan/carte de référence plus tardif(e), utile pour comparer l’évolution des structures urbaines, des axes et des aménagements.</p>
        <p><strong>À compléter :</strong> date exacte, auteur, cote, contexte de production (selon votre mémoire).</p>
      `
    }
  };

  const d = data[which];
  if(!d) return;

  title.textContent = d.title;
  body.innerHTML = d.html;

  modal.setAttribute("aria-hidden", "false");
}

function closeInfo(){
  const modal = document.getElementById("infoModal");
  if(!modal) return;
  modal.setAttribute("aria-hidden", "true");
}

