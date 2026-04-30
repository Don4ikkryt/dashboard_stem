const DataLoader = (() => {
  const COL = {
    ID:          'Номер_закладу_в_АІКОМ',
    NAME:        'Повна_назва_закладу',
    HROMADA:     'Назва_ТГ',
    TYPE:        'Тип_простору',
    FORMAT:      'Формат_роботи',
    LON:         'longitude',
    LAT:         'latitude',
    COD3:        'hromada_id',
    OBLAST:      'region_name',
    RISK_BUCKET: 'risk_bucket',
    IS_MOUNTAIN: 'is_mountain',
  };

  function parseCsv(text) {
    return Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.replace(/^﻿/, '').trim(),
    }).data;
  }

  function isValidCoord(lat, lon) {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    return !isNaN(la) && !isNaN(lo) && la >= 44 && la <= 53 && lo >= 22 && lo <= 41;
  }

  function buildRiskMap(rows) {
    const map = new Map();
    for (const row of rows) {
      const id   = String(row['id'] || '').trim();
      const risk = String(row['risk_bucket'] || '').trim();
      if (id && risk) map.set(id, risk);
    }
    return map;
  }

  function processSpaces(rows) {
    const seen = new Set();
    const valid = [];
    let skipped = 0;

    for (const row of rows) {
      const id        = String(row[COL.ID]   || '').trim();
      const spaceType = String(row[COL.TYPE] || '').trim();

      if (!isValidCoord(row[COL.LAT], row[COL.LON])) { skipped++; continue; }

      // Deduplicate by (id, spaceType) — a school can have multiple space types
      const dedupKey = id ? `${id}_${spaceType}` : null;
      if (dedupKey && seen.has(dedupKey)) { skipped++; continue; }
      if (dedupKey) seen.add(dedupKey);

      const cod3 = String(row[COL.COD3] || '').trim();
      valid.push({
        id,
        cod3,
        name:       String(row[COL.NAME]        || '').trim(),
        hromada:    String(row[COL.HROMADA]      || '').trim(),
        spaceType,
        format:     String(row[COL.FORMAT]       || '').trim(),
        lat:        parseFloat(row[COL.LAT]),
        lon:        parseFloat(row[COL.LON]),
        oblast:     String(row[COL.OBLAST]       || '').trim(),
        riskBucket:  String(row[COL.RISK_BUCKET]  || '').trim(),
        isMountain:  String(row[COL.IS_MOUNTAIN]  || '').trim().toUpperCase() === 'TRUE',
      });
    }

    console.log(`Spaces: ${valid.length} valid, ${skipped} skipped`);
    return valid;
  }

  function enrichHromady(geojson, riskMap) {
    for (const feature of geojson.features) {
      const props = feature.properties || {};
      const cod3  = props['adm3_pcode'] ? String(props['adm3_pcode']).trim() : null;
      const risk  = cod3 ? (riskMap.get(cod3) || null) : null;
      feature.properties._cod3 = cod3;
      feature.properties._risk = risk;
      feature.properties._tot  = risk === 'Непереборний';
    }
    return geojson;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json();
  }

  async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.text();
  }

  async function loadAll() {
    const [
      spacesText,
      riskText,
      oblastCenters,
    ] = await Promise.all([
      fetchText('data/for_dasboard.csv'),
      fetchText('data/risk_levels_2025_may.csv'),
      fetchJson('data/oblast_centers.json'),
    ]);

    const spaceRows = parseCsv(spacesText);
    const riskRows  = parseCsv(riskText);
    const riskMap   = buildRiskMap(riskRows);
    const spaces    = processSpaces(spaceRows);

    const geojson = {};

    const geoFiles = [
      ['hromady',   'data/hromady.geojson'],
      ['oblasti',   'data/oblasti.geojson'],
      ['mountains', 'data/mountains.geojson'],
    ];

    await Promise.all(geoFiles.map(async ([key, url]) => {
      try {
        geojson[key] = await fetchJson(url);
        if (key === 'hromady') enrichHromady(geojson[key], riskMap);
      } catch (e) {
        console.warn(`GeoJSON not loaded (${key}): ${e.message}`);
        geojson[key] = null;
      }
    }));

    return { spaces, geojson, oblastCenters, riskMap };
  }

  return { loadAll };
})();
