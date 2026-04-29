const MapConfig = {
  SPACE_TYPES: {
    '2025 STEM':       { color: '#FF8C1A', label: '2025 STEM' },
    '2026 STEM':       { color: '#2FB344', label: '2026 STEM' },
    '2026 НУШ':        { color: '#2D7FF9', label: '2026 НУШ' },
    '2025 передпілот': { color: '#F5C518', label: '2025 передпілот' },
  },

  RISK_COLORS: {
    'Задовільний':   '#4CAF50',
    'Помірний':      '#FFC107',
    'Високий':       '#FF9800',
    'Дуже Високий':  '#F44336',
    'Непереборний':  '#9E0000',
    'TOT':           '#B0B0B0',
  },

  HROMADA_DEFAULT_STYLE: {
    fillColor: '#F5F5F5',
    fillOpacity: 1,
    color: '#D0D0D0',
    weight: 0.5,
    interactive: false,
  },

  HROMADA_TOT_STYLE: {
    fillColor: '#B0B0B0',
    fillOpacity: 1,
    color: '#C0C0C0',
    weight: 0.5,
    interactive: false,
  },

  OBLAST_STYLE: {
    fill: false,
    color: '#808080',
    weight: 1.5,
    interactive: false,
  },

  MOUNTAINS_STYLE: {
    fillColor: '#A67B5B',
    fillOpacity: 0.35,
    color: '#A67B5B',
    weight: 0.5,
    interactive: false,
  },

  CHORNOBYL_STYLE: {
    fillColor: '#C8C8C8',
    fillOpacity: 0.6,
    color: '#999999',
    weight: 1,
    interactive: false,
  },

  MARKER_RADIUS: 6,
  MARKER_STROKE_COLOR: '#ffffff',
  MARKER_STROKE_WIDTH: 1.5,

  UKRAINE_BOUNDS: [[44.0, 22.0], [52.4, 40.2]],
  MIN_ZOOM: 5,
  MAX_ZOOM: 16,
  LABEL_MIN_ZOOM: 7,
  CLUSTER_RADIUS: 50,
  CLUSTER_DISABLE_ZOOM: 11,

  RISK_ORDER: ['Задовільний', 'Помірний', 'Високий', 'Дуже Високий', 'Непереборний'],
};
