/* global L, MapConfig, DataLoader */

(async () => {
  // ── State ──────────────────────────────────────────────────────────────────
  let allSpaces = [];
  let markerIndex = new Map(); // spaceId → L.circleMarker
  let clusterGroup = null;

  const filterState = {
    oblasts:    new Set(),
    hromady:    new Set(),
    types:      new Set(),
    nameQuery:  '',
    formats:    new Set(),
  };

  // ── Map init ───────────────────────────────────────────────────────────────
  const map = L.map('map', {
    center: [49.0, 31.5],
    zoom: 6,
    minZoom: MapConfig.MIN_ZOOM,
    maxZoom: MapConfig.MAX_ZOOM,
    zoomControl: false,
    attributionControl: false,
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  map.setMaxBounds(L.latLngBounds(
    [MapConfig.UKRAINE_BOUNDS[0][0] - 2, MapConfig.UKRAINE_BOUNDS[0][1] - 2],
    [MapConfig.UKRAINE_BOUNDS[1][0] + 2, MapConfig.UKRAINE_BOUNDS[1][1] + 2]
  ));

  // ── Loading overlay ────────────────────────────────────────────────────────
  const overlay = document.getElementById('loading-overlay');
  function hideOverlay() { overlay.classList.add('hidden'); }

  // ── Load data ──────────────────────────────────────────────────────────────
  let data;
  try {
    data = await DataLoader.loadAll();
  } catch (e) {
    console.error(e);
    overlay.innerHTML = `<div class="loading-text error">Помилка завантаження даних:<br>${e.message}</div>`;
    return;
  }

  allSpaces = data.spaces;
  const { geojson, oblastCenters } = data;

  // ── GeoJSON layers ─────────────────────────────────────────────────────────
  let hromadyLayer = null;
  let oblastLayer  = null;

  if (geojson.chornobyl) {
    L.geoJSON(geojson.chornobyl, { style: MapConfig.CHORNOBYL_STYLE }).addTo(map);
  }
  if (geojson.mountains) {
    L.geoJSON(geojson.mountains, { style: MapConfig.MOUNTAINS_STYLE }).addTo(map);
  }

  if (geojson.hromady) {
    const hromadaPopup = L.popup({ closeButton: false, autoPan: false, offset: [0, -4] });

    hromadyLayer = L.geoJSON(geojson.hromady, {
      style: feature => feature.properties._tot
        ? MapConfig.HROMADA_TOT_STYLE
        : MapConfig.HROMADA_DEFAULT_STYLE,
      onEachFeature(feature, layer) {
        layer.on({
          mouseover(e) {
            const p      = e.target.feature.properties;
            const name   = p.adm3_name1 || '—';
            const oblast = MapConfig.OBLAST_NAMES[p.adm1_pcode] || '—';
            const risk   = p._risk || null;
            const riskColor = risk ? (MapConfig.RISK_COLORS[risk] || '#ccc') : null;
            const riskHtml  = risk
              ? `<span class="hromada-popup-risk" style="background:${riskColor}20;color:${riskColor};border:1px solid ${riskColor}50">${risk}</span>`
              : '';
            hromadaPopup
              .setLatLng(e.latlng)
              .setContent(`<div class="hromada-popup"><strong>${name}</strong><span>${oblast}</span>${riskHtml}</div>`)
              .openOn(map);
          },
          mousemove(e) {
            hromadaPopup.setLatLng(e.latlng);
          },
          mouseout() {
            map.closePopup(hromadaPopup);
          },
        });
      },
    }).addTo(map);
  }

  if (geojson.oblasti) {
    oblastLayer = L.geoJSON(geojson.oblasti, { style: MapConfig.OBLAST_STYLE }).addTo(map);
  }

  // ── Oblast labels ──────────────────────────────────────────────────────────
  const labelLayer = L.layerGroup().addTo(map);
  function updateLabels() {
    labelLayer.clearLayers();
    if (map.getZoom() < MapConfig.LABEL_MIN_ZOOM) return;
    for (const c of oblastCenters) {
      L.marker([c.lat, c.lon], {
        icon: L.divIcon({
          className: 'oblast-label',
          html: `<span>${c.name}</span>`,
          iconSize: null,
        }),
        interactive: false,
      }).addTo(labelLayer);
    }
  }
  map.on('zoomend', updateLabels);
  updateLabels();

  // ── Cluster group ──────────────────────────────────────────────────────────
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: MapConfig.CLUSTER_RADIUS,
    disableClusteringAtZoom: MapConfig.CLUSTER_DISABLE_ZOOM,
    chunkedLoading: true,
    iconCreateFunction: cluster => {
      const count = cluster.getChildCount();
      const size = count < 10 ? 32 : count < 100 ? 40 : 48;
      return L.divIcon({
        html: `<div class="cluster-icon" style="width:${size}px;height:${size}px;line-height:${size}px">${count}</div>`,
        className: '',
        iconSize: [size, size],
      });
    },
  });
  map.addLayer(clusterGroup);

  // ── Marker creation ────────────────────────────────────────────────────────
  function makeMarker(space) {
    const cfg = MapConfig.SPACE_TYPES[space.spaceType] || { color: '#888888' };
    const m = L.circleMarker([space.lat, space.lon], {
      radius: MapConfig.MARKER_RADIUS,
      fillColor: cfg.color,
      fillOpacity: 1,
      color: MapConfig.MARKER_STROKE_COLOR,
      weight: MapConfig.MARKER_STROKE_WIDTH,
    });

    const riskColor = MapConfig.RISK_COLORS[space.riskBucket] || '#ccc';

    const popupContent = `
      <div class="popup-content">
        <div class="popup-header">
          <div class="popup-type-badge" style="background:${cfg.color}">${space.spaceType || '—'}</div>
          <div class="popup-name">${space.name || '—'}</div>
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <span class="popup-label">Громада</span>
            <span class="popup-value">${space.hromada || '—'}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Область</span>
            <span class="popup-value">${space.oblast || '—'}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Формат</span>
            <span class="popup-value"><span class="tag ${space.format === 'Дистанційно' ? 'tag-remote' : 'tag-onsite'}">${space.format || '—'}</span></span>
          </div>
          ${space.riskBucket ? `
          <div class="popup-row">
            <span class="popup-label">Ризик</span>
            <span class="popup-value"><span class="popup-risk-badge" style="background:${riskColor}18;color:${riskColor};border:1px solid ${riskColor}40">${space.riskBucket}</span></span>
          </div>` : ''}
          ${space.id ? `
          <div class="popup-row">
            <span class="popup-label">АІКОС</span>
            <span class="popup-value" style="color:#aaa">${space.id}</span>
          </div>` : ''}
        </div>
      </div>
    `;

    const popup = L.popup({ maxWidth: 280, autoPan: false, closeButton: false });
    popup.setContent(popupContent);

    m.on('mouseover', function () { this.bindPopup(popup).openPopup(); });
    m.on('mouseout',  function () { this.closePopup(); });

    return m;
  }

  function buildAllMarkers() {
    markerIndex.clear();
    for (const space of allSpaces) {
      markerIndex.set(space.id || `${space.lat}_${space.lon}`, makeMarker(space));
    }
  }
  buildAllMarkers();

  // ── Filter logic ───────────────────────────────────────────────────────────
  function matchesFilter(space) {
    if (filterState.oblasts.size > 0 && !filterState.oblasts.has(space.oblast)) return false;
    if (filterState.hromady.size  > 0 && !filterState.hromady.has(space.hromada)) return false;
    if (filterState.types.size    > 0 && !filterState.types.has(space.spaceType)) return false;
    if (filterState.formats.size  > 0 && !filterState.formats.has(space.format)) return false;
    if (filterState.nameQuery) {
      const q = filterState.nameQuery.toLowerCase();
      if (!space.name.toLowerCase().includes(q)) return false;
    }
    return true;
  }

  function applyFilters() {
    const toAdd = [];
    for (const space of allSpaces) {
      const key = space.id || `${space.lat}_${space.lon}`;
      const m = markerIndex.get(key);
      if (!m) continue;
      if (matchesFilter(space)) toAdd.push(m);
    }
    clusterGroup.clearLayers();
    clusterGroup.addLayers(toAdd);
    updateCounter(toAdd.length);
  }

  function updateCounter(n) {
    const el = document.getElementById('result-count');
    if (el) el.textContent = `${n} просторів`;
  }

  // Initial render
  applyFilters();

  // ── Filter UI ──────────────────────────────────────────────────────────────
  const uniqueOblasts  = [...new Set(allSpaces.map(s => s.oblast).filter(Boolean))].sort();
  const uniqueTypes    = [...new Set(allSpaces.map(s => s.spaceType).filter(Boolean))].sort();
  const uniqueFormats  = [...new Set(allSpaces.map(s => s.format).filter(Boolean))].sort();

  function getFilteredHromady() {
    const src = filterState.oblasts.size > 0
      ? allSpaces.filter(s => filterState.oblasts.has(s.oblast))
      : allSpaces;
    return [...new Set(src.map(s => s.hromada).filter(Boolean))].sort();
  }

  // Multi-select dropdown builder
  function buildMultiSelect(containerId, items, stateSet, onChange, placeholder) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const summary = document.createElement('div');
    summary.className = 'ms-summary';
    summary.dataset.placeholder = placeholder;

    const dropdown = document.createElement('div');
    dropdown.className = 'ms-dropdown hidden';

    function refreshSummary() {
      if (stateSet.size === 0) {
        summary.textContent = placeholder;
        summary.classList.remove('active');
      } else {
        summary.textContent = [...stateSet].join(', ');
        summary.classList.add('active');
      }
    }

    function renderItems() {
      dropdown.innerHTML = '';

      const searchInput = document.createElement('input');
      searchInput.className = 'ms-search';
      searchInput.placeholder = 'Пошук...';
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase();
        dropdown.querySelectorAll('.ms-item').forEach(el => {
          el.style.display = el.dataset.value.toLowerCase().includes(q) ? '' : 'none';
        });
      });
      dropdown.appendChild(searchInput);

      const clearBtn = document.createElement('div');
      clearBtn.className = 'ms-clear';
      clearBtn.textContent = 'Очистити';
      clearBtn.addEventListener('click', e => {
        e.stopPropagation();
        stateSet.clear();
        refreshSummary();
        renderItems();
        onChange();
      });
      dropdown.appendChild(clearBtn);

      for (const item of items) {
        const el = document.createElement('div');
        el.className = 'ms-item' + (stateSet.has(item) ? ' selected' : '');
        el.dataset.value = item;
        el.textContent = item;
        el.addEventListener('click', e => {
          e.stopPropagation();
          if (stateSet.has(item)) {
            stateSet.delete(item);
            el.classList.remove('selected');
          } else {
            stateSet.add(item);
            el.classList.add('selected');
          }
          refreshSummary();
          onChange();
        });
        dropdown.appendChild(el);
      }
    }

    summary.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !dropdown.classList.contains('hidden');
      document.querySelectorAll('.ms-dropdown').forEach(d => d.classList.add('hidden'));
      if (!isOpen) dropdown.classList.remove('hidden');
    });

    renderItems();
    refreshSummary();

    container.appendChild(summary);
    container.appendChild(dropdown);

    return { refresh: (newItems) => { items = newItems; renderItems(); refreshSummary(); } };
  }

  // Close all dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.ms-dropdown').forEach(d => d.classList.add('hidden'));
  });

  // Build oblast filter
  buildMultiSelect('filter-oblast', uniqueOblasts, filterState.oblasts, () => {
    // Rebuild hromada list when oblast changes
    filterState.hromady.clear();
    const newHromady = getFilteredHromady();
    hromadyCtrl && hromadyCtrl.refresh(newHromady);
    applyFilters();
  }, 'Усі області');

  // Build hromada filter (dynamic)
  let hromadyCtrl = buildMultiSelect(
    'filter-hromada',
    getFilteredHromady(),
    filterState.hromady,
    applyFilters,
    'Усі громади'
  );

  // Build type filter
  buildMultiSelect('filter-type', uniqueTypes, filterState.types, applyFilters, 'Усі типи');

  // Build format filter
  buildMultiSelect('filter-format', uniqueFormats, filterState.formats, applyFilters, 'Усі формати');

  // Name search
  const nameInput = document.getElementById('filter-name');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      filterState.nameQuery = nameInput.value.trim();
      applyFilters();
    });
  }

  // Reset button
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      filterState.oblasts.clear();
      filterState.hromady.clear();
      filterState.types.clear();
      filterState.formats.clear();
      filterState.nameQuery = '';
      if (nameInput) nameInput.value = '';
      // Rebuild all selects
      buildMultiSelect('filter-oblast', uniqueOblasts, filterState.oblasts, () => {
        filterState.hromady.clear();
        hromadyCtrl && hromadyCtrl.refresh(getFilteredHromady());
        applyFilters();
      }, 'Усі області');
      hromadyCtrl = buildMultiSelect('filter-hromada', getFilteredHromady(), filterState.hromady, applyFilters, 'Усі громади');
      buildMultiSelect('filter-type', uniqueTypes, filterState.types, applyFilters, 'Усі типи');
      buildMultiSelect('filter-format', uniqueFormats, filterState.formats, applyFilters, 'Усі формати');
      applyFilters();
    });
  }

  // ── Legend ─────────────────────────────────────────────────────────────────
  function buildLegend() {
    const legendTypes = document.getElementById('legend-types');
    if (legendTypes) {
      for (const [key, cfg] of Object.entries(MapConfig.SPACE_TYPES)) {
        legendTypes.insertAdjacentHTML('beforeend', `
          <div class="legend-item">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="5" fill="${cfg.color}" stroke="#fff" stroke-width="1.5"/>
            </svg>
            <span>${cfg.label}</span>
          </div>
        `);
      }
    }

    const legendRisk = document.getElementById('legend-risk');
    if (legendRisk) {
      for (const riskName of MapConfig.RISK_ORDER) {
        const color = MapConfig.RISK_COLORS[riskName] || '#ccc';
        legendRisk.insertAdjacentHTML('beforeend', `
          <div class="legend-item">
            <span class="legend-rect" style="background:${color}"></span>
            <span>${riskName}</span>
          </div>
        `);
      }
    }
  }
  buildLegend();

  // ── Mobile bottom drawer ───────────────────────────────────────────────────
  const sidebar   = document.getElementById('sidebar');
  const drawerHandle = document.getElementById('drawer-handle');
  let drawerOpen  = false;

  if (drawerHandle) {
    drawerHandle.addEventListener('click', () => {
      drawerOpen = !drawerOpen;
      sidebar.classList.toggle('drawer-open', drawerOpen);
    });
  }

  // ── Fit map to Ukraine ─────────────────────────────────────────────────────
  map.fitBounds(MapConfig.UKRAINE_BOUNDS);

  hideOverlay();
})();
