const state = {
  plants: [],
<<<<<<< HEAD
  catalogIndex: null,
  searchIndex: null,
  shardCache: new Map(),
  world: null,
  tdwgWorld: null,
  selected: [],
  layers: { native: true, introduced: true, invasive: true, observations: false },
  mode: 'demo'
=======
  world: null,
  selected: [],
  layers: { native: true, introduced: true, invasive: true, observations: false }
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
};

const worldView = { center: [18, 0], zoom: 2 };
const map = L.map('map', {
  zoomControl: true,
  minZoom: 1,
  maxZoom: 7,
  worldCopyJump: true,
  attributionControl: true
}).setView(worldView.center, worldView.zoom);

<<<<<<< HEAD
// Plant Atlas intentionally does not use a third-party raster tile server.
// The basemap is served as local GeoJSON and is therefore compatible with
// static hosting such as Cloudflare Pages/Workers.
=======
// No OSM/CARTO tile layer is used. The world map is local GeoJSON, so the map
// does not depend on a third-party raster tile server or its usage policy.
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
const worldLayer = L.geoJSON(null, {
  style: {
    color: '#b9c8ba',
    weight: 0.65,
    fillColor: '#edf3ec',
    fillOpacity: 1
  },
  onEachFeature: (feature, layer) => {
<<<<<<< HEAD
    const p = feature.properties || {};
    const name = p.name || p.ADMIN || p.LEVEL3_NAM || p.level3Name || 'Region';
=======
    const name = feature.properties?.name || feature.properties?.ADMIN || 'Country';
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
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

<<<<<<< HEAD
function commonName(p) {
  return p?.commonNames?.[0]?.name || p?.commonNames?.[0] || p?.common || p?.scientificName || p?.scientific || 'Unknown plant';
}

function scientificName(p) {
  return p?.scientificName || p?.scientific || 'Unknown scientific name';
}

function familyName(p) { return p?.family || ''; }

function distribution(p) {
  return p?.distribution || p?.ranges || { native: [], introduced: [], extinct: [], doubtful: [], invasive: [] };
}

function statusLabel(p) {
  if (p?.status) return p.status;
  const d = distribution(p);
  if ((d.invasive || p.invasive || []).length) return 'invasive in documented regions';
  if ((d.introduced || []).length) return 'introduced in documented regions';
  if ((d.native || []).length) return 'native distribution documented';
  return 'documented';
}

function codesForType(p, type) {
  const d = distribution(p);
  const values = d?.[type] || [];
  if (type === 'invasive' && p?.invasive?.length && (!values.length || typeof values[0] === 'object')) {
    return p.invasive.map(x => typeof x === 'object' ? x.tdwgCode : x).filter(Boolean).map(String).map(x => x.toUpperCase());
  }
  return values.map(x => typeof x === 'object' ? x.tdwgCode : x).filter(Boolean).map(String).map(x => x.toUpperCase());
}

function getFeatureCode(feature) {
  const p = feature.properties || {};
  return String(
    p.LEVEL3_COD || p.LEVEL3_COD_ || p.level3Code || p.level3_cod || p.code || p.iso_a3 || ''
  ).toUpperCase();
}

function getFeatureName(feature) {
  const p = feature.properties || {};
  return p.LEVEL3_NAM || p.level3Name || p.name || p.ADMIN || 'Region';
}

function countryFeatures(codes) {
  const wanted = new Set(codes || []);
  const source = state.tdwgWorld?.features?.length ? state.tdwgWorld : state.world;
  const features = (source?.features || []).filter(f => wanted.has(getFeatureCode(f)));
  return features;
}

function addFeatureCollection(features, plant, type, layerGroup, labelPrefix='Mapped') {
=======
function statusLabel(p) { return p?.status || 'documented'; }

function countryFeatures(codes) {
  const wanted = new Set(codes || []);
  return state.world?.features?.filter(f => wanted.has(String(f.properties?.iso_a3 || '').toUpperCase())) || [];
}

function makeRangeLayer(plant, type) {
  const features = countryFeatures(plant.ranges?.[type]);
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
  if (!features.length) return;
  const multiple = state.selected.length > 1;
  const layer = L.geoJSON({ type: 'FeatureCollection', features }, {
    style: () => ({
      color: COLORS[type],
      weight: multiple ? 0.9 : 1.4,
<<<<<<< HEAD
      opacity: 0.82,
=======
      opacity: 0.8,
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
      fillColor: COLORS[type],
      fillOpacity: multiple ? 0.24 : 0.40
    }),
    onEachFeature: (feature, featureLayer) => {
<<<<<<< HEAD
      const region = getFeatureName(feature);
      featureLayer.bindPopup(`<div class="range-popup"><strong>${escapeHtml(commonName(plant))}</strong><em>${escapeHtml(scientificName(plant))}</em><div><span>Region</span><b>${escapeHtml(region)}</b></div><div><span>${escapeHtml(labelPrefix)} status</span><b>${escapeHtml(type)}</b></div><div><span>Source status</span><b>${escapeHtml(statusLabel(plant))}</b></div></div>`);
    }
  });
  layer.addTo(layerGroup);
}

function makeRangeLayer(plant, type) {
  let codes = codesForType(plant, type);
  if (!codes.length) return;
  // Native status has precedence when a region has overlapping claims.
  if (type !== 'native') {
    const native = new Set(codesForType(plant, 'native'));
    codes = codes.filter(code => !native.has(code));
  }
  if (!codes.length) return;
  // Prefer WGSRPD Level 3 botanical-country geometry when available.
  addFeatureCollection(countryFeatures(codes), plant, type, rangeLayers[type], 'Source');
}

const occurrenceCache = new Map();
const GBIF_COL_XR_CHECKLIST = '7ddf754f-d193-4cc9-b351-99906754a03b';
const LEGACY_EXAMPLE_NAMES = {
  hemful: 'Hemerocallis fulva',
  alliaria: 'Alliaria petiolata',
  kudzu: 'Pueraria montana',
  milkweed: 'Asclepias syriaca',
  coneflower: 'Echinacea purpurea'
};
async function drawObservations(plant) {
  const key = plant?.gbif?.taxonKey;
  if (!key) {
    // Demo fallback for the handful of prototype records.
    const [lat, lng] = plant.observationCenter || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    for (let i = 0; i < 24; i++) {
      const angle = i * 0.95;
      const radius = 0.09 * Math.sqrt(i + 1);
      L.circleMarker([lat + Math.sin(angle) * radius * 2.7, lng + Math.cos(angle) * radius * 3.7], {
        radius: 4.2, color: '#fff', weight: 1.2, fillColor: '#3a6f9d', fillOpacity: .85
      }).bindTooltip(`${escapeHtml(commonName(plant))}<br><em>Demo occurrence</em>`, { direction: 'top' }).addTo(rangeLayers.observations);
    }
    return;
  }

  const cacheKey = String(key);
  let results = occurrenceCache.get(cacheKey);
  if (!results) {
    try {
      const params = new URLSearchParams({
        taxonKey: cacheKey,
        hasCoordinate: 'true',
        occurrenceStatus: 'PRESENT',
        checklistKey: GBIF_COL_XR_CHECKLIST,
        limit: '300'
      });
      const response = await fetch(`https://api.gbif.org/v1/occurrence/search?${params.toString()}`);
      if (!response.ok) throw new Error(`GBIF ${response.status}`);
      const payload = await response.json();
      results = payload.results || [];
      occurrenceCache.set(cacheKey, results);
    } catch (error) {
      console.warn('GBIF occurrence lookup failed:', error);
      return;
    }
  }

  results.forEach(o => {
    if (!Number.isFinite(o.decimalLatitude) || !Number.isFinite(o.decimalLongitude)) return;
    const marker = L.circleMarker([o.decimalLatitude, o.decimalLongitude], {
      radius: 3.8,
      color: '#fff',
      weight: 1,
      fillColor: '#3a6f9d',
      fillOpacity: 0.78
    });
    const recordUrl = o.key ? `https://www.gbif.org/occurrence/${encodeURIComponent(o.key)}` : null;
    marker.bindTooltip(`${escapeHtml(o.country || 'Recorded occurrence')}<br><em>GBIF observation</em>`, { direction: 'top' });
    if (recordUrl) marker.bindPopup(`<div class="range-popup"><strong>GBIF observation</strong><div><span>Country</span><b>${escapeHtml(o.country || 'Unknown')}</b></div><a href="${recordUrl}" target="_blank" rel="noopener noreferrer">View occurrence ↗</a></div>`);
    marker.addTo(rangeLayers.observations);
  });
=======
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
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
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
<<<<<<< HEAD
    status.textContent = state.mode === 'catalog'
      ? 'Source-backed catalog loaded. Select a species to add native, introduced, and invasive overlays.'
      : 'The map shows the world without a third-party tile service. Select a species to add distribution overlays.';
  } else if (state.selected.length === 1) {
    const p = state.selected[0];
    title.textContent = commonName(p);
    const source = state.mode === 'catalog' ? 'WCVP / POWO' : 'demo catalog';
    const d = distribution(p);
    const counts = [
      ['native', d.native?.length || 0],
      ['introduced', d.introduced?.length || 0],
      ['invasive', d.invasive?.length || p.invasive?.length || 0]
    ].filter(([, n]) => n > 0).map(([label, n]) => `${n.toLocaleString()} ${label}`).join(' · ');
    status.textContent = `${scientificName(p)} · ${statusLabel(p)} · ${counts || 'no distribution rows'} · ${source}`;
=======
    status.textContent = 'The map shows the world without a third-party tile service. Select a species to add distribution overlays.';
  } else if (state.selected.length === 1) {
    const p = state.selected[0];
    title.textContent = p.common;
    status.textContent = `${p.scientific} · ${p.status || 'documented'}`;
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
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
<<<<<<< HEAD
  list.innerHTML = state.selected.map(p => `<div class="selection-item"><span class="selection-dot"></span><div class="selection-copy"><div class="selection-name">${escapeHtml(commonName(p))}</div><div class="selection-sci">${escapeHtml(scientificName(p))}</div></div><button class="remove-btn" data-remove="${escapeHtml(p.id)}" aria-label="Remove">×</button></div>`).join('');
  list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removePlant(b.dataset.remove)));
}

function searchMatches(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (state.searchIndex?.species) {
    return state.searchIndex.species
      .filter(item => String(item.t || '').toLowerCase().includes(q))
      .slice(0, 10)
      .map(item => state.catalogIndex?.speciesById?.[item.id] || item);
  }
  return state.plants.filter(p => `${commonName(p)} ${scientificName(p)} ${familyName(p)}`.toLowerCase().includes(q)).slice(0, 10);
}

function renderSearch(query='') {
  const wrap = document.getElementById('searchResults');
  const q = query.trim();
  if (!q) { wrap.innerHTML = '<div class="search-hint">Start typing above to find a species.</div>'; return; }
  const results = searchMatches(q);
  wrap.innerHTML = results.length ? results.map(p => `<button class="result" data-select="${escapeHtml(p.id)}"><span class="result-main"><span class="result-name">${escapeHtml(commonName(p))}</span><span class="result-sci">${escapeHtml(scientificName(p))}</span></span><span class="result-badge">${escapeHtml(statusLabel(p).split(' ')[0])}</span></button>`).join('') : `<div class="search-hint">No match for “${escapeHtml(query)}”.</div>`;
  wrap.querySelectorAll('[data-select]').forEach(b => b.addEventListener('click', () => addPlant(b.dataset.select)));
}

async function getCatalogPlant(id) {
  if (!state.catalogIndex) return null;
  const meta = state.catalogIndex.speciesById?.[id] || state.catalogIndex.species?.find(x => x.id === id);
  if (!meta?.shard) return null;
  if (!state.shardCache.has(meta.shard)) {
    try {
      const shard = await loadJSON(`data/catalog/${meta.shard}`);
      state.shardCache.set(meta.shard, shard);
    } catch (error) {
      console.error('Failed loading catalog shard:', meta.shard, error);
      return null;
    }
  }
  const records = state.shardCache.get(meta.shard) || [];
  return records[meta.offset] || null;
}

async function addPlant(id) {
  let p = null;
  if (state.mode === 'catalog') {
    p = await getCatalogPlant(id);
    if (!p && LEGACY_EXAMPLE_NAMES[id]) {
      const target = LEGACY_EXAMPLE_NAMES[id].toLowerCase();
      const meta = state.catalogIndex?.species?.find(x => String(x.scientificName || '').toLowerCase() === target);
      if (meta) p = await getCatalogPlant(meta.id);
    }
  } else {
    p = state.plants.find(x => x.id === id) || null;
  }
  if (!p) return;
  if (!state.selected.some(x => x.id === p.id)) state.selected.push(p);
=======
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
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
  renderSelection(); renderMap();
}

function removePlant(id) { state.selected = state.selected.filter(p => p.id !== id); renderSelection(); renderMap(); }

<<<<<<< HEAD
async function loadJSON(pathname) {
  const r = await fetch(pathname, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${pathname}: ${r.status}`);
  return r.json();
}

async function loadCatalog() {
  const index = await loadJSON('data/catalog/index.json');
  index.speciesById = Object.fromEntries((index.species || []).map(x => [x.id, x]));
  state.catalogIndex = index;
  state.plants = index.species || [];
  try { state.searchIndex = await loadJSON('data/catalog/search-index.json'); } catch (_) { state.searchIndex = null; }
  state.mode = 'catalog';
  document.getElementById('catalogCount').textContent = `${Number(index.count || state.plants.length).toLocaleString()} species`;
}

async function loadLegacyCatalog() {
  try {
    state.plants = await loadJSON('data/plants.json');
    if (!Array.isArray(state.plants)) throw new Error('Catalog must be an array');
    state.mode = 'demo';
  } catch (e) {
    console.warn('Using embedded plant catalog.', e);
    state.plants = fallbackCatalog;
    state.mode = 'demo';
  }
  document.getElementById('catalogCount').textContent = `${state.plants.length} species`;
}

async function loadData() {
  try {
    state.world = await loadJSON('data/world.geojson');
    worldLayer.addData(state.world);
  } catch (e) {
    console.warn('World map file unavailable.', e);
  }

  // Optional WGS/RPD Level 3 geometry. The existing political basemap remains
  // as a fallback when this file is unavailable.
  try {
    state.tdwgWorld = await loadJSON('data/level3.geojson');
    if (state.tdwgWorld?.features?.length) console.info('Loaded WGSRPD Level 3 geometry:', state.tdwgWorld.features.length);
  } catch (_) {
    state.tdwgWorld = null;
  }

  try {
    await loadCatalog();
  } catch (e) {
    console.warn('Source-backed catalog unavailable; using legacy catalog.', e);
    await loadLegacyCatalog();
  }
=======
async function loadJSON(pathname) { const r = await fetch(pathname, { cache: 'no-store' }); if (!r.ok) throw new Error(`${pathname}: ${r.status}`); return r.json(); }

async function loadData() {
  try { state.world = await loadJSON('data/world.geojson'); worldLayer.addData(state.world); }
  catch (e) { console.warn('World map file unavailable.', e); }

  try { state.plants = await loadJSON('data/plants.json'); if (!Array.isArray(state.plants)) throw new Error('Catalog must be an array'); }
  catch (e) { console.warn('Using embedded plant catalog.', e); state.plants = fallbackCatalog; }
  document.getElementById('catalogCount').textContent = `${state.plants.length} species`;
>>>>>>> e29d526205d07f3fc6258f5064a6e71927595b32
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
