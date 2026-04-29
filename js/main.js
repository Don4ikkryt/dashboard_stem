/* global L, MapConfig, DataLoader */

(async () => {
  // ── State ──────────────────────────────────────────────────────────────────
  let allSpaces = [];
  let markerIndex = new Map(); // spaceId → L.circleMarker
  let clusterGroup = null;
  let pinnedEl = null; // { source, popup } — зафіксований попап

  function unpinAll() {
    if (pinnedEl) { map.closePopup(pinnedEl.popup); pinnedEl = null; }
  }

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

  map.on('click', unpinAll);

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

if (geojson.mountains) {
    L.geoJSON(geojson.mountains, { style: MapConfig.MOUNTAINS_STYLE }).addTo(map);
  }

  if (geojson.hromady) {
    const hromadaPopup = L.popup({ closeButton: false, autoPan: false, offset: [0, -4] });

    function buildHromadaContent(p) {
      const name      = p.adm3_name1 || '—';
      const oblast    = MapConfig.OBLAST_NAMES[p.adm1_pcode] || '—';
      const risk      = p._risk || null;
      const riskColor = risk ? (MapConfig.RISK_COLORS[risk] || '#ccc') : null;
      const riskHtml  = risk
        ? `<span class="hromada-popup-risk" style="background:${riskColor}20;color:${riskColor};border:1px solid ${riskColor}50">${risk}</span>`
        : '';
      return `<div class="hromada-popup"><strong>${name}</strong><span>${oblast}</span>${riskHtml}${p.adm3_pcode ? `<span class="hromada-popup-kod">${p.adm3_pcode}</span>` : ''}</div>`;
    }

    hromadyLayer = L.geoJSON(geojson.hromady, {
      style: feature => {
        const p = feature.properties;
        if (p.adm3_pcode === 'UA3200000') return MapConfig.HROMADA_BLACK_STYLE;
        return p._tot ? MapConfig.HROMADA_TOT_STYLE : MapConfig.HROMADA_DEFAULT_STYLE;
      },
      onEachFeature(feature, layer) {
        layer.on({
          mouseover(e) {
            if (pinnedEl?.source?.feature) return; // будь-яка громада зафіксована
            hromadaPopup
              .setLatLng(e.latlng)
              .setContent(buildHromadaContent(e.target.feature.properties))
              .openOn(map);
          },
          mousemove(e) {
            if (pinnedEl?.source?.feature) return;
            hromadaPopup.setLatLng(e.latlng);
          },
          mouseout() {
            if (pinnedEl?.source?.feature) return;
            map.closePopup(hromadaPopup);
          },
          click(e) {
            L.DomEvent.stopPropagation(e);
            map.closePopup(hromadaPopup);
            if (pinnedEl?.source === layer) { unpinAll(); return; }
            unpinAll();
            const pin = L.popup({ closeButton: true, autoPan: true, offset: [0, -4] })
              .setLatLng(e.latlng)
              .setContent(buildHromadaContent(layer.feature.properties))
              .openOn(map);
            pinnedEl = { source: layer, popup: pin };
            pin.on('remove', () => { if (pinnedEl?.source === layer) pinnedEl = null; });
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
          ${space.id ? `<div class="popup-aikom">АІКОМ: ${space.id}</div>` : ''}
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <span class="popup-label">Громада</span>
            <span class="popup-value">${space.hromada || '—'}</span>
          </div>
          ${space.cod3 ? `
          <div class="popup-row">
            <span class="popup-label">КАТОТТГ</span>
            <span class="popup-value popup-mono">${space.cod3}</span>
          </div>` : ''}
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
        </div>
      </div>
    `;

    const hoverPopup = L.popup({ maxWidth: 280, autoPan: false, closeButton: false })
      .setContent(popupContent);

    m.bindPopup(hoverPopup);

    m.on('mouseover', function () {
      if (pinnedEl && !pinnedEl.source?.feature) return; // будь-яка школа зафіксована
      this.openPopup();
    });
    m.on('mouseout', function () {
      if (pinnedEl && !pinnedEl.source?.feature) return;
      this.closePopup();
    });
    m.on('click', function (e) {
      L.DomEvent.stopPropagation(e);
      if (pinnedEl?.source === this) { unpinAll(); return; }
      unpinAll();
      const pin = L.popup({ maxWidth: 280, autoPan: true, closeButton: true })
        .setContent(popupContent);
      this.unbindPopup().bindPopup(pin).openPopup();
      pinnedEl = { source: this, popup: pin };
      pin.on('remove', () => {
        if (pinnedEl?.source === m) { pinnedEl = null; m.unbindPopup().bindPopup(hoverPopup); }
      });
    });

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
  const uniqueOblasts = [...new Set(allSpaces.map(s => s.oblast).filter(Boolean))].sort();
  const uniqueTypes   = [...new Set(allSpaces.map(s => s.spaceType).filter(Boolean))].sort();
  const uniqueFormats = [...new Set(allSpaces.map(s => s.format).filter(Boolean))].sort();

  function getFilteredHromady() {
    const src = filterState.oblasts.size > 0
      ? allSpaces.filter(s => filterState.oblasts.has(s.oblast))
      : allSpaces;
    return [...new Set(src.map(s => s.hromada).filter(Boolean))].sort();
  }

  // ── Fly-to helpers ─────────────────────────────────────────────────────────
  function flyToGroup(items, zoom) {
    if (!items.length) return;
    const lat = items.reduce((a, s) => a + s.lat, 0) / items.length;
    const lon = items.reduce((a, s) => a + s.lon, 0) / items.length;
    map.flyTo([lat, lon], zoom, { duration: 0.8 });
  }

  // ── Close all dropdowns ────────────────────────────────────────────────────
  document.addEventListener('click', () => {
    document.querySelectorAll('.fd-list').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.fd-trigger').forEach(t => t.classList.remove('open'));
  });

  // ── Dropdown with chips ────────────────────────────────────────────────────
  function buildDropdown(containerId, getItems, stateSet, onChange, placeholder, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let items = getItems();

    function render() {
      container.innerHTML = '';

      const wrap = document.createElement('div');
      wrap.className = 'fd-wrap';

      const trigger = document.createElement('button');
      trigger.className = 'fd-trigger' + (stateSet.size ? ' has-value' : '');
      trigger.type = 'button';

      const triggerLabel = document.createElement('span');
      triggerLabel.className = 'fd-label';
      triggerLabel.textContent = stateSet.size ? `${stateSet.size} обрано` : placeholder;

      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('width', '12'); arrow.setAttribute('height', '12');
      arrow.setAttribute('viewBox', '0 0 12 12');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M2 4l4 4 4-4');
      path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round');
      arrow.appendChild(path);
      trigger.appendChild(triggerLabel); trigger.appendChild(arrow);

      const list = document.createElement('div');
      list.className = 'fd-list hidden';

      const search = document.createElement('input');
      search.className = 'fd-search'; search.placeholder = 'Пошук...';
      list.appendChild(search);

      const itemsWrap = document.createElement('div');
      list.appendChild(itemsWrap);

      function renderItems(q = '') {
        itemsWrap.innerHTML = '';
        const filtered = q ? items.filter(v => v.toLowerCase().includes(q.toLowerCase())) : items;
        filtered.forEach(item => {
          const label = document.createElement('label');
          label.className = 'fd-item' + (stateSet.has(item) ? ' checked' : '');
          const cb = document.createElement('input');
          cb.type = 'checkbox'; cb.checked = stateSet.has(item);
          cb.addEventListener('change', e => {
            e.stopPropagation();
            if (cb.checked) { stateSet.add(item); if (onSelect) onSelect(item); }
            else             { stateSet.delete(item); }
            label.classList.toggle('checked', cb.checked);
            updateTrigger(); updateChips(); onChange();
          });
          const text = document.createElement('span');
          text.textContent = item;
          label.appendChild(cb); label.appendChild(text);
          itemsWrap.appendChild(label);
        });
      }

      search.addEventListener('input', e => { e.stopPropagation(); renderItems(search.value); });
      search.addEventListener('click', e => e.stopPropagation());

      function updateTrigger() {
        triggerLabel.textContent = stateSet.size ? `${stateSet.size} обрано` : placeholder;
        trigger.classList.toggle('has-value', stateSet.size > 0);
      }

      const chipsRow = document.createElement('div');
      chipsRow.className = 'chips-row';

      function updateChips() {
        chipsRow.innerHTML = '';
        for (const item of stateSet) {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.innerHTML = `<span>${item}</span><button type="button">✕</button>`;
          chip.querySelector('button').addEventListener('click', () => {
            stateSet.delete(item);
            updateTrigger(); renderItems(search.value); updateChips(); onChange();
          });
          chipsRow.appendChild(chip);
        }
      }

      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = !list.classList.contains('hidden');
        document.querySelectorAll('.fd-list').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('.fd-trigger').forEach(t => t.classList.remove('open'));
        if (!isOpen) {
          items = getItems();
          renderItems();
          list.classList.remove('hidden');
          trigger.classList.add('open');
          search.focus();
        }
      });
      list.addEventListener('click', e => e.stopPropagation());

      renderItems();
      updateChips();
      wrap.appendChild(trigger); wrap.appendChild(list);
      container.appendChild(wrap); container.appendChild(chipsRow);
    }

    render();
    return { refresh() { render(); } };
  }

  // ── Type buttons ───────────────────────────────────────────────────────────
  function buildTypeButtons() {
    const container = document.getElementById('filter-type');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'type-grid';
    for (const [key, cfg] of Object.entries(MapConfig.SPACE_TYPES)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'type-btn' + (filterState.types.has(key) ? ' active' : '');
      btn.style.setProperty('--tc', cfg.color);
      btn.innerHTML = `<span class="type-dot"></span>${cfg.label}`;
      btn.addEventListener('click', () => {
        filterState.types.has(key) ? filterState.types.delete(key) : filterState.types.add(key);
        btn.classList.toggle('active', filterState.types.has(key));
        applyFilters();
      });
      container.appendChild(btn);
    }
  }

  // ── Format buttons ─────────────────────────────────────────────────────────
  function buildFormatButtons() {
    const container = document.getElementById('filter-format');
    if (!container) return;
    container.innerHTML = '';
    container.className = 'format-row';
    for (const fmt of uniqueFormats) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'format-btn' + (filterState.formats.has(fmt) ? ' active' : '');
      btn.textContent = fmt;
      btn.addEventListener('click', () => {
        filterState.formats.has(fmt) ? filterState.formats.delete(fmt) : filterState.formats.add(fmt);
        btn.classList.toggle('active', filterState.formats.has(fmt));
        applyFilters();
      });
      container.appendChild(btn);
    }
  }

  // ── Autocomplete name search ───────────────────────────────────────────────
  const nameWrap = document.getElementById('filter-name')?.parentNode;
  const nameInput = document.getElementById('filter-name');
  if (nameInput && nameWrap) {
    nameWrap.style.position = 'relative';
    const acList = document.createElement('div');
    acList.className = 'ac-list hidden';
    nameWrap.appendChild(acList);

    nameInput.addEventListener('input', () => {
      const q = nameInput.value.trim();
      filterState.nameQuery = q.toLowerCase();
      applyFilters();
      if (!q) { acList.classList.add('hidden'); return; }
      const matches = allSpaces.filter(s => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 25);
      if (!matches.length) { acList.classList.add('hidden'); return; }
      acList.innerHTML = '';
      for (const space of matches) {
        const el = document.createElement('div');
        el.className = 'ac-item';
        const low = q.toLowerCase();
        const idx = space.name.toLowerCase().indexOf(low);
        el.innerHTML = space.name.slice(0, idx)
          + `<mark>${space.name.slice(idx, idx + q.length)}</mark>`
          + space.name.slice(idx + q.length);
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          nameInput.value = space.name;
          filterState.nameQuery = space.name.toLowerCase();
          acList.classList.add('hidden');
          applyFilters();
          map.flyTo([space.lat, space.lon], 11, { duration: 0.8 });
        });
        acList.appendChild(el);
      }
      acList.classList.remove('hidden');
    });
    nameInput.addEventListener('blur', () => setTimeout(() => acList.classList.add('hidden'), 150));
    nameInput.addEventListener('click', e => e.stopPropagation());
  }

  // ── Build all filters ──────────────────────────────────────────────────────
  let hromadyCtrl = null;

  buildDropdown(
    'filter-oblast',
    () => uniqueOblasts,
    filterState.oblasts,
    () => {
      filterState.hromady.clear();
      hromadyCtrl && hromadyCtrl.refresh();
      applyFilters();
    },
    'Усі області',
    name => flyToGroup(allSpaces.filter(s => s.oblast === name), 8)
  );

  hromadyCtrl = buildDropdown(
    'filter-hromada',
    getFilteredHromady,
    filterState.hromady,
    applyFilters,
    'Усі громади',
    name => flyToGroup(allSpaces.filter(s => s.hromada === name), 11)
  );

  buildTypeButtons();
  buildFormatButtons();

  // ── Reset ──────────────────────────────────────────────────────────────────
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    filterState.oblasts.clear(); filterState.hromady.clear();
    filterState.types.clear();   filterState.formats.clear();
    filterState.nameQuery = '';
    if (nameInput) nameInput.value = '';
    buildDropdown('filter-oblast', () => uniqueOblasts, filterState.oblasts, () => {
      filterState.hromady.clear(); hromadyCtrl && hromadyCtrl.refresh(); applyFilters();
    }, 'Усі області', name => flyToGroup(allSpaces.filter(s => s.oblast === name), 8));
    hromadyCtrl = buildDropdown('filter-hromada', getFilteredHromady, filterState.hromady, applyFilters, 'Усі громади',
      name => flyToGroup(allSpaces.filter(s => s.hromada === name), 11));
    buildTypeButtons(); buildFormatButtons(); applyFilters();
  });

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
