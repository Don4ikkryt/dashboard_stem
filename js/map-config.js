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
    'Дуже високий':  '#F44336',
    'Непереборний':  '#9E0000',
    'TOT':           '#B0B0B0',
  },

  HROMADA_DEFAULT_STYLE: {
    fillColor: '#F5F5F5',
    fillOpacity: 1,
    color: '#D0D0D0',
    weight: 0.5,
  },

  HROMADA_TOT_STYLE: {
    fillColor: '#B0B0B0',
    fillOpacity: 1,
    color: '#C0C0C0',
    weight: 0.5,
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
    fillColor: '#1a1a1a',
    fillOpacity: 0.75,
    color: '#000000',
    weight: 1,
    interactive: false,
  },

  OBLAST_NAMES: {
    'UA01': 'Автономна Республіка Крим',
    'UA05': 'Вінницька область',
    'UA07': 'Волинська область',
    'UA12': 'Дніпропетровська область',
    'UA14': 'Донецька область',
    'UA18': 'Житомирська область',
    'UA21': 'Закарпатська область',
    'UA23': 'Запорізька область',
    'UA26': 'Івано-Франківська область',
    'UA32': 'Київська область',
    'UA35': 'Кіровоградська область',
    'UA44': 'Луганська область',
    'UA46': 'Львівська область',
    'UA48': 'Миколаївська область',
    'UA51': 'Одеська область',
    'UA53': 'Полтавська область',
    'UA56': 'Рівненська область',
    'UA59': 'Сумська область',
    'UA61': 'Тернопільська область',
    'UA63': 'Харківська область',
    'UA65': 'Херсонська область',
    'UA68': 'Хмельницька область',
    'UA71': 'Черкаська область',
    'UA73': 'Чернівецька область',
    'UA74': 'Чернігівська область',
    'UA80': 'місто Київ',
    'UA85': 'місто Севастополь',
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

  RISK_ORDER: ['Задовільний', 'Помірний', 'Високий', 'Дуже високий', 'Непереборний'],
};
