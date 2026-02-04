// ----------------------------
// Réglages généraux
// ----------------------------
const SALINS_CENTER = [46.9426, 5.8768];  // centre approx Salins-les-Bains
const SALINS_ZOOM = 15;

// IMPORTANT : À remplacer avec des bornes exactes (voir section QGIS).
// Format Leaflet : [[latSud, lonOuest],[latNord, lonEst]]
const PLAN1_TILES_URL = "https://mapwarper.net/maps/tile/101545/{z}/{x}/{y}.png";
const PLAN2_TILES_URL = "https://mapwarper.net/maps/tile/101560/{z}/{x}/{y}.png";
const PLAN3_TILES_URL = "https://mapwarper.net/maps/tile/101569/{z}/{x}/{y}.png";
const PLAN4_TILES_URL = "https://mapwarper.net/maps/tile/102017/{z}/{x}/{y}.png";
const PLAN5_TILES_URL = "https://mapwarper.net/maps/tile/102019/{z}/{x}/{y}.png";
const PLAN6_TILES_URL = "https://mapwarper.net/maps/tile/102022/{z}/{x}/{y}.png";



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

  const plan3 = L.tileLayer(PLAN3_TILES_URL, {
    opacity: 0.75,
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: "Plan 3 (Map Warper)"
  });
  const plan4 = L.tileLayer(PLAN4_TILES_URL, {
    opacity: 0.75,
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: "Plan 4 (Map Warper)"
  });

  const plan5 = L.tileLayer(PLAN5_TILES_URL, {
    opacity: 0.75,
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: "Plan 5 (Map Warper)"
  });

  const plan6 = L.tileLayer(PLAN6_TILES_URL, {
    opacity: 0.75,
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: "Plan 6 (Map Warper)"
  });



  overlays = { plan1, plan2, plan3, plan4, plan5, plan6 };

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
  const t3 = document.getElementById("togglePlan3");
  const t4 = document.getElementById("togglePlan4");
  const t5 = document.getElementById("togglePlan5");
  const t6 = document.getElementById("togglePlan6");

  const o1 = document.getElementById("opacityPlan1");
  const o2 = document.getElementById("opacityPlan2");
  const o3 = document.getElementById("opacityPlan3");
  const o4 = document.getElementById("opacityPlan4");
  const o5 = document.getElementById("opacityPlan5");
  const o6 = document.getElementById("opacityPlan6");

  if (t1) t1.addEventListener("change", () => toggleOverlay("plan1", t1.checked));
  if (t2) t2.addEventListener("change", () => toggleOverlay("plan2", t2.checked));
  if (t3) t3.addEventListener("change", () => toggleOverlay("plan3", t3.checked));
  if (t4) t4.addEventListener("change", () => toggleOverlay("plan4", t4.checked));
  if (t5) t5.addEventListener("change", () => toggleOverlay("plan5", t5.checked));
  if (t6) t6.addEventListener("change", () => toggleOverlay("plan6", t6.checked));

  if (o1) o1.addEventListener("input", () => setOverlayOpacity("plan1", parseFloat(o1.value)));
  if (o2) o2.addEventListener("input", () => setOverlayOpacity("plan2", parseFloat(o2.value)));
  if (o3) o3.addEventListener("input", () => setOverlayOpacity("plan3", parseFloat(o3.value)));
  if (o4) o4.addEventListener("input", () => setOverlayOpacity("plan4", parseFloat(o4.value)));
  if (o5) o5.addEventListener("input", () => setOverlayOpacity("plan5", parseFloat(o5.value)));
  if (o6) o6.addEventListener("input", () => setOverlayOpacity("plan6", parseFloat(o6.value)));

  // Boutons topbar
  const btnReset = document.getElementById("btnReset");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      map.setView(SALINS_CENTER, SALINS_ZOOM);
    });
  }

  // Bouton "Localisation" optionnel (si vous le remettez un jour)
  const btnLocate = document.getElementById("btnLocate");
  if (btnLocate) {
    btnLocate.addEventListener("click", locateUser);
  }


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
  // Mobile: ouvrir/fermer le panneau "Cartes"
  const btnSidebar = document.getElementById("btnSidebar");
  const sidebar = document.getElementById("sidebar");

  if (btnSidebar && sidebar) {
    btnSidebar.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar--open");
    });

    // Fermer le panneau quand on clique sur la carte (mobile uniquement)
    const mapEl = document.getElementById("map");
    if (mapEl) {
      mapEl.addEventListener("click", () => {
        sidebar.classList.remove("sidebar--open");
      });
    }
  }


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
      title: "Plan 1 — Plan de Salins et de ses fortifications (XVIIIe siècle)",
      html: `
        <p class="meta"><strong>Source :</strong> scan d’archives - Archives Départementales du Jura, 5E 641 Plan 9 - géoréférencement via Map Warper.</p>
        <p><strong>Contenu :</strong> Plan de masse de la ville de Salins et de ses fortifications, avec légende détaillant les tours, portes et principaux bâtiments des forts Saint-André, Belin et Bracon. Aquarelle, plan légendé à l’échelle de deux pouces pour 100 toises, fin du XVIIIᵉ siècle.</p>
        <p><strong>Remarque :</strong> la déformation visible résulte de la rectification (ajustement sur points d’appui) afin d’aligner le plan avec la cartographie actuelle.</p>
      `
    },
    plan2: {
      title: "Plan 2 - Plan de Salins - Extrait du Recueil des plans des places du Royaume divisées en provinces (1693)",
      html: `
        <p class="meta"><strong>Source :</strong> scan d’archives - Bibliothèque nationale de France, département Cartes et plans, Recueil des plans des places du Royaume divisées en provinces (1693), cote GE DD-4585, Gallica, FRBNF41414522. - géoréférencement via Map Warper.</p>
        <p><strong>Contenu :</strong> extrait du Recueil des plans des places du Royaume divisées en provinces, dressé en 1693. Carte manuscrite aquarellée représentant la ville de Salins ; indications topographiques et définitions des ouvrages urbains à diverses échelles. Formats des cartes contenus dans le volume : 36 × 50 cm (double page) et 36 × 24 cm (page simple).</p>
        <p><strong>Remarque :</strong> la déformation visible résulte de la rectification (ajustement sur points d’appui) afin d’aligner le plan avec la cartographie actuelle.</p>
      `
    },
    plan3: {
      title: "Plan 3 - Tracé interprétatif de l’enceinte fortifiée de Salins-les-Bains : vestiges conservés et tracés restitués",
      html: `
        <p class="meta"><strong>Source :</strong>BD parcellaire - IGN, Plans anciens (Archives départementales du Jura, BNF, Musée de la Grande Saline, Bibliothèque Municipale de Salins, Archives militaires de Vincennes) - géoréférencé via Map Warper.</p>
        <p><strong>Contenu :</strong> Carte interprétative du tracé des fortifications de Salins-les-Bains. Les segments en bleu correspondent aux vestiges encore conservés en élévation, tandis que les autres tracés indiquent des restitutions ou hypothèses fondées sur les sources historiques, la topographie et les données archéologiques.</p>
      `
    },
    plan4: {
       title: "Plan 4 — Projet de 1738",
       html: `
         <p class="meta"><strong>Source :</strong> Plan de Salins relatif au projet de 1738, s. d., signé Aumale, échelle de deux pouces pour cent toises, 1738, ministère de la Défense, Service historique de la Défense (SHD), Vincennes, GR 1 VH 1611.</p>
         <p>Plan lié au projet de fortification de 1738. Il documente l’organisation urbaine et les aménagements projetés/présentés à cette date.</p>
       `
     },
     plan5: {
       title: "Plan 5 — Projet de 1759",
       html: `
         <p class="meta"><strong>Source :</strong> Plan des ville et forts de Salins pour servir au projet de 1759, légende indiquant les principales pièces de la fortification et les bâtiments qui en dépendent, s. n., s. d., échelle de deux pouces pour cent toises, 1759, ministère de la Défense, SHD, Vincennes, GR 1 VH 1611.</p>
         <p>Plan de référence pour le projet de 1759, avec légende détaillant les éléments de fortification et leurs dépendances.</p>
       `
     },
     plan6: {
       title: "Plan 6 — Projets de 1788",
       html: `
         <p class="meta"><strong>Source :</strong> Plan de la ville et des forts de Salins pour servir aux projets de 1788, signé Grésigny, s. n., s. d., échelle de deux pouces pour cent toises, ministère de la Défense, SHD, Vincennes, GR 1 VH 1611.</p>
         <p>Plan tardif (1788) permettant de confronter l’état des fortifications et des forts à la fin du XVIIIe siècle avec les projets et états antérieurs.</p>
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

