/* global L */

const SALINS_CENTER = [46.9407, 5.8760];
const SALINS_ZOOM = 15;

let map;

// Fond
let osmLayer;
let esriWorldImagery;

// Plans (chargés depuis JSON)
const planLayers = new Map(); // id -> L.TileLayer
const planState = new Map();  // id -> { opacity, visible, data }

// -------------------- INIT --------------------
init();

async function init() {
  // Carte
  map = L.map("map", {
    zoomControl: true,
    attributionControl: true
  }).setView(SALINS_CENTER, SALINS_ZOOM);

  // Fonds
  osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  });

  esriWorldImagery = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Esri"
    }
  );

  // Fond par défaut = Satellite
  esriWorldImagery.addTo(map);

  // UI fond
  bindBaseUI();

  // Boutons
  const btnReset = document.getElementById("btnReset");
  btnReset?.addEventListener("click", () => {
    map.setView(SALINS_CENTER, SALINS_ZOOM);
  });


  // Modal
  bindModal();

  // Charger les plans depuis JSON
  await loadPlansFromJson();
}

// -------------------- UI FOND --------------------
function bindBaseUI() {
  const rbSatellite = document.getElementById("baseSatellite");
  const rbOSM = document.getElementById("baseOSM");

  rbSatellite?.addEventListener("change", () => {
    if (!rbSatellite.checked) return;
    if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
    if (!map.hasLayer(esriWorldImagery)) esriWorldImagery.addTo(map);
  });

  rbOSM?.addEventListener("change", () => {
    if (!rbOSM.checked) return;
    if (map.hasLayer(esriWorldImagery)) map.removeLayer(esriWorldImagery);
    if (!map.hasLayer(osmLayer)) osmLayer.addTo(map);
  });
}

// -------------------- MODAL --------------------
function bindModal() {
  const modal = document.getElementById("infoModal");
  const closeBtn = document.getElementById("btnCloseInfo");
  const overlay = modal?.querySelector(".modal__backdrop");

  function close() {
    modal?.setAttribute("aria-hidden", "true");
  }

  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}


function openInfoFromPlan(planId) {
  const modal = document.getElementById("infoModal");
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");

  const st = planState.get(planId);
  if (!st) return;

  title.textContent = st.data?.info?.title || st.data?.name || "Informations";

  let html = st.data?.info?.html || "<p>Aucune information disponible.</p>";

  // ---- AJOUT : lien vers le document original ----
  if (st.data?.fichier) {
    html += `
      <hr class="divider" />
      <p>
        <a
          href="${st.data.fichier}"
          class="btn btn--primary"
          target="_blank"
          download
        >
          Télécharger le scan d'archive (document original)
        </a>
      </p>
    `;
  }

  body.innerHTML = html;
  modal.setAttribute("aria-hidden", "false");
}


// -------------------- CHARGEMENT JSON --------------------
async function loadPlansFromJson() {
  const res = await fetch("./plans.json", { cache: "no-store" });
  if (!res.ok) {
    console.error("Impossible de charger plans.json");
    return;
  }

  const json = await res.json();
  const plans = Array.isArray(json.plans) ? json.plans : [];

  // Construire la sidebar
  const container = document.getElementById("plansContainer");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    if (!p?.id || !p?.tileUrl) continue;

    // Créer layer Leaflet
    const layer = L.tileLayer(p.tileUrl, {
      maxZoom: 19,
      opacity: typeof p.defaultOpacity === "number" ? p.defaultOpacity : 0.75,
      attribution: "Map Warper"
    });

    planLayers.set(p.id, layer);
    planState.set(p.id, {
      opacity: typeof p.defaultOpacity === "number" ? p.defaultOpacity : 0.75,
      visible: !!p.defaultVisible,
      data: p
    });

    // Créer DOM (même esthétique qu’avant)
    const block = document.createElement("div");
    block.innerHTML = `
      <div class="layeritem">
        <label class="layeritem__main">
          <input type="checkbox" id="toggle_${p.id}" ${p.defaultVisible ? "checked" : ""} />
          <img class="layeritem__thumb" src="${p.thumb || ""}" alt="Vignette ${escapeHtml(p.name || p.id)}">
          <span class="layeritem__text">
            <span class="layeritem__name">${escapeHtml(p.name || p.id)}</span>
            <span class="layeritem__meta">${escapeHtml(p.meta || "")}</span>
          </span>
        </label>

        <div class="layeritem__actions">
          <button class="btn btn--ghost" type="button" data-info="${p.id}">Infos</button>
        </div>
      </div>

      <div class="opacity">
        <label for="opacity_${p.id}">Opacité</label>
        <input type="range" id="opacity_${p.id}" min="0" max="1" step="0.05" value="${typeof p.defaultOpacity === "number" ? p.defaultOpacity : 0.75}" />
      </div>

      <hr class="divider" />
    `;
    container.appendChild(block);

    // Bind events
    const cb = document.getElementById(`toggle_${p.id}`);
    const slider = document.getElementById(`opacity_${p.id}`);
    const infoBtn = container.querySelector(`button[data-info="${cssEscape(p.id)}"]`);

    cb?.addEventListener("change", () => {
      setPlanVisibility(p.id, cb.checked);
    });

    slider?.addEventListener("input", () => {
      const val = parseFloat(slider.value);
      setPlanOpacity(p.id, val);
    });

    infoBtn?.addEventListener("click", () => openInfoFromPlan(p.id));

    // Appliquer l’état initial
    if (p.defaultVisible) {
      layer.addTo(map);
    }
  }
}

function setPlanVisibility(planId, visible) {
  const layer = planLayers.get(planId);
  const st = planState.get(planId);
  if (!layer || !st) return;

  st.visible = visible;

  if (visible) {
    if (!map.hasLayer(layer)) layer.addTo(map);
  } else {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  }
}

function setPlanOpacity(planId, opacity) {
  const layer = planLayers.get(planId);
  const st = planState.get(planId);
  if (!layer || !st) return;

  st.opacity = opacity;
  layer.setOpacity(opacity);
}

// -------------------- UTILS --------------------
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

// pour querySelector avec ids potentiellement “bizarres”
function cssEscape(s) {
  return String(s).replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, "\\$1");
}
