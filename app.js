const state = {
  plants: [],
  world: null,
  selected: [],
  layers: { native: true, introduced: true, invasive: true, observations: false }
};

const worldView = { center: [18, 0], zoom: 2 };
const map = L.map('map', {
  zoomControl: true,
  minZoom: 1,
  maxZoom: 7,
  worldCopyJump: true,
  attributionControl: true
}).setView(worldView.center, worldView.zoom);

// No OSM/CARTO tile layer is used. The world map is local GeoJSON, so the map
// does not depend on a third-party raster tile server or its usage policy.
const worldLayer = L.geoJSON(null, {
  style: {
    color: '#b9c8ba',
    weight: 0.65,
    fillColor: '#edf3ec',
    fillOpacity: 1
  },
  onEachFeature: (feature, layer) => {
    const name = feature.properties?.name || feature.properties?.ADMIN || 'Country';
    layer.bindTooltip(name, { sticky: true, className: 'country-tooltip' });
  }
}).addTo(map);

const rangeLayers = {
  native: L.layerGroup().addTo(map),
  introduced: L.layerGroup().addTo(map),
  invasive: L.layerGroup().addTo(map),
  observations: L.layerGroup()
};

const COLORS = { native: '#2e7d4f', introduced: '#d39b28', invasive: '#c45852' };
const fallbackCatalog = [
  {id:'hemful',common:'Orange daylily',scientific:'Hemerocallis fulva',family:'Asphodelaceae',status:'introduced + invasive in parts',note:'A widely planted perennial that has naturalized across much of temperate North America.',ranges:{native:['CHN','KOR','JPN'],introduced:['GBR','FRA','DEU','USA','CAN','CHL','AUS'],invasive:['USA','CAN','AUS']},observationCenter:[41.6,-93.6],sources:['https://powo.science.kew.org/','https://www.cabi.org/isc/']},
  {id:'alliaria',common:'Garlic mustard',scientific:'Alliaria petiolata',family:'Brassicaceae',status:'introduced + invasive in parts',note:'A Eurasian biennial that is invasive in many deciduous forest systems in North America.',ranges:{native:['GBR','FRA','DEU','POL','ESP','ITA','GRC','TUR','MAR'],introduced:['USA','CAN','NZL'],invasive:['USA','CAN']},observationCenter:[44.5,-92.2],sources:['https://powo.science.kew.org/','https://www.cabi.org/isc/']},
  {id:'kudzu',common:'Kudzu',scientific:'Pueraria montana',family:'Fabaceae',status:'introduced + invasive in parts',note:'A vigorous vine native to East Asia that has become invasive in parts of the southeastern United States.',ranges:{native:['CHN','KOR','JPN'],introduced:['USA','AUS','NZL'],invasive:['USA']},observationCenter:[33.1,-86.8],sources:['https://powo.science.kew.org/','https://www.cabi.org/isc/']},
  {id:'milkweed',common:'Common milkweed',scientific:'Asclepias syriaca',family:'Apocynaceae',status:'native',note:'A North American native field species important to monarch butterflies.',ranges:{native:['USA','CAN'],introduced:[],invasive:[]},observationCenter:[41.9,-93.3],sources:['https://powo.science.kew.org/']},
  {id:'coneflower',common:'Purple coneflower',scientific:'Echinacea purpurea',family:'Asteraceae',status:'native',note:'A North American prairie wildflower widely grown in gardens and pollinator plantings.',ranges:{native:['USA','CAN'],introduced:['GBR','DEU'],invasive:[]},observationCenter:[39.1,-90.2],sources:['https://powo.science.kew.org/']}
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function statusLabel(p) { return p?.status || 'documented'; }

function countryFeatures(codes) {
  const wanted = new Set(codes || []);
  return state.world?.features?.filter(f => wanted.has(String(f.properties?.iso_a3 || '').toUpperCase())) || [];
}

function makeRangeLayer(plant, type) {
  const features = countryFeatures(plant.ranges?.[type]);
  if (!features.length) return;
  const multiple = state.selected.length > 1;
  const layer = L.geoJSON({ type: 'FeatureCollection', features }, {
    style: () => ({
      color: COLORS[type],
      weight: multiple ? 0.9 : 1.4,
      opacity: 0.8,
      fillColor: COLORS[type],
      fillOpacity: multiple ? 0.24 : 0.40
    }),
    onEachFeature: (feature, featureLayer) => {
      const country = feature.properties?.name || 'Country';
      featureLayer.bindPopup(`<div class="range-popup"><strong>${escapeHtml(plant.common)}</strong><em>${escapeHtml(plant.scientific)}</em><div><span>Country</span><b>${escapeHtml(country)}</b></div><div><span>Mapped status</span><b>${escapeHtml(type)}</b></div><div><span>Source status</span><b>${escapeHtml(statusLabel(plant))}</b></div></div>`);
    }
  });
  layer.addTo(rangeLayers[type]);
}

function drawObservations(plant) {
  const [lat, lng] = plant.observationCenter || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  for (let i = 0; i < 24; i++) {
    const angle = i * 0.95;
    const radius = 0.09 * Math.sqrt(i + 1);
    L.circleMarker([lat + Math.sin(angle) * radius * 2.7, lng + Math.cos(angle) * radius * 3.7], {
      radius: 4.2, color: '#fff', weight: 1.2, fillColor: '#3a6f9d', fillOpacity: .85
    }).bindTooltip(`${escapeHtml(plant.common)}<br><em>Demo occurrence</em>`, { direction: 'top' }).addTo(rangeLayers.observations);
  }
}

function clearRangeLayers() { Object.values(rangeLayers).forEach(layer => layer.clearLayers()); }

function renderMap() {
  clearRangeLayers();
  state.selected.forEach(plant => {
    ['native','introduced','invasive'].forEach(type => {
      if (state.layers[type]) makeRangeLayer(plant, type);
    });
    if (state.layers.observations) drawObservations(plant);
  });

  const title = document.getElementById('mapTitle');
  const status = document.getElementById('mapStatus');
  if (!state.selected.length) {
    title.textContent = 'Choose a plant';
    status.textContent = 'The map shows the world without a third-party tile service. Select a species to add distribution overlays.';
  } else if (state.selected.length === 1) {
    const p = state.selected[0];
    title.textContent = p.common;
    status.textContent = `${p.scientific} · ${p.status || 'documented'}`;
  } else {
    title.textContent = `${state.selected.length} species selected`;
    status.textContent = 'Compare each selected species across the native, introduced, and invasive layers.';
  }
}

function renderSelection() {
  const title = document.getElementById('selectionTitle');
  const list = document.getElementById('selectionList');
  title.textContent = state.selected.length ? `${state.selected.length} selected` : 'Nothing selected';
  if (!state.selected.length) { list.innerHTML = '<div class="empty-state">Selected plants appear here.</div>'; return; }
  list.innerHTML = state.selected.map(p => `<div class="selection-item"><span class="selection-dot"></span><div class="selection-copy"><div class="selection-name">${escapeHtml(p.common)}</div><div class="selection-sci">${escapeHtml(p.scientific)}</div></div><button class="remove-btn" data-remove="${escapeHtml(p.id)}" aria-label="Remove">×</button></div>`).join('');
  list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removePlant(b.dataset.remove)));
}

function renderSearch(query='') {
  const wrap = document.getElementById('searchResults');
  const q = query.trim().toLowerCase();
  if (!q) { wrap.innerHTML = '<div class="search-hint">Start typing above to find a species.</div>'; return; }
  const results = state.plants.filter(p => `${p.common} ${p.scientific} ${p.family || ''}`.toLowerCase().includes(q)).slice(0, 10);
  wrap.innerHTML = results.length ? results.map(p => `<button class="result" data-select="${escapeHtml(p.id)}"><span class="result-main"><span class="result-name">${escapeHtml(p.common)}</span><span class="result-sci">${escapeHtml(p.scientific)}</span></span><span class="result-badge">${escapeHtml((p.status || 'documented').split(' ')[0])}</span></button>`).join('') : `<div class="search-hint">No match for “${escapeHtml(query)}”. Add the species to <code>data/plants.json</code>.</div>`;
  wrap.querySelectorAll('[data-select]').forEach(b => b.addEventListener('click', () => addPlant(b.dataset.select)));
}

function addPlant(id) {
  const p = state.plants.find(x => x.id === id);
  if (!p) return;
  if (!state.selected.some(x => x.id === id)) state.selected.push(p);
  renderSelection(); renderMap();
}

function removePlant(id) { state.selected = state.selected.filter(p => p.id !== id); renderSelection(); renderMap(); }

async function loadJSON(pathname) { const r = await fetch(pathname, { cache: 'no-store' }); if (!r.ok) throw new Error(`${pathname}: ${r.status}`); return r.json(); }

async function loadData() {
  try { state.world = await loadJSON('data/world.geojson'); worldLayer.addData(state.world); }
  catch (e) { console.warn('World map file unavailable.', e); }

  try { state.plants = await loadJSON('data/plants.json'); if (!Array.isArray(state.plants)) throw new Error('Catalog must be an array'); }
  catch (e) { console.warn('Using embedded plant catalog.', e); state.plants = fallbackCatalog; }
  document.getElementById('catalogCount').textContent = `${state.plants.length} species`;
}

// UI events
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', e => renderSearch(e.target.value));
document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); searchInput.focus(); } });
document.getElementById('clearSelectionBtn').addEventListener('click', () => { state.selected = []; renderSelection(); renderMap(); });
['native','introduced','invasive','observation'].forEach(type => document.getElementById(`${type}Toggle`).addEventListener('change', e => { state.layers[type === 'observation' ? 'observations' : type] = e.target.checked; renderMap(); }));
document.getElementById('resetView').addEventListener('click', () => map.setView(worldView.center, worldView.zoom));
document.querySelectorAll('[data-plant]').forEach(b => b.addEventListener('click', () => addPlant(b.dataset.plant)));
document.getElementById('aboutBtn').addEventListener('click', () => document.getElementById('aboutDialog').showModal());
document.getElementById('sourcesBtn').addEventListener('click', () => document.getElementById('sourcesDialog').showModal());
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.close).close()));

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  renderSearch(''); renderSelection(); renderMap();
  setTimeout(() => map.invalidateSize(), 100);
});
