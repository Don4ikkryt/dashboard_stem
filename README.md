# Дашборд освітніх просторів України

Інтерактивна карта STEM-просторів та просторів НУШ на основі Leaflet.js. Статичний сайт — не потребує бекенду, розгортається на GitHub Pages.

## Структура

```
/
├── index.html
├── css/styles.css
├── js/
│   ├── map-config.js      — кольори, стилі, константи
│   ├── data-loader.js     — завантаження CSV та GeoJSON
│   └── main.js            — ініціалізація карти, фільтри, маркери
└── data/
    ├── for_dashboard.csv          ← основні дані просторів
    ├── risk_levels_2025_may.csv   ← рівні ризику громад
    ├── oblast_centers.json        ← координати центрів областей
    ├── hromady.geojson            ← межі громад (треба отримати)
    ├── oblasti.geojson            ← межі областей (треба отримати)
    ├── chornobyl_zone.geojson     ← зона Чорнобиля (треба отримати)
    └── mountains.geojson          ← гірські райони (треба отримати)
```

## Отримання GeoJSON файлів

### Громади (hromady.geojson)
Завантажте з відкритих джерел:
- https://data.humdata.org/dataset/cod-ab-ukr — humanitarian data exchange (рівень ADM3)
- https://github.com/oleksiikolomiiets/uag — Ukrainian administrative GeoJSON

Файл має містити КАТОТТГ-код у полі `cod3`, `katotth`, або `KOATUU` для кожної громади — це ключ для з'єднання з даними ризику.

### Області (oblasti.geojson)
Той самий HDXA джерело, рівень ADM1, або:
- https://github.com/georgique/world-geojson — папка `countries/ukraine/`

### Зона Чорнобиля (chornobyl_zone.geojson)
Можна намалювати вручну в geojson.io або взяти з:
- OpenStreetMap через Overpass API (relation 2080224)

### Гірські райони (mountains.geojson)
Можна намалювати полігон Карпат вручну в geojson.io і зберегти.

> Якщо GeoJSON файли відсутні — карта все одно завантажиться, просто без шарів меж громад/областей. Маркери просторів відображаються завжди.

## Локальний запуск

GeoJSON та CSV завантажуються через `fetch()`, тому потрібен локальний HTTP-сервер (не `file://`):

```bash
# Python 3
cd "dashboard stem"
python3 -m http.server 8080
# відкрити http://localhost:8080
```

або

```bash
# Node.js (npx)
npx serve .
```

## Розгортання на GitHub Pages

1. Створіть репозиторій на GitHub
2. Завантажте всі файли
3. Settings → Pages → Source: main branch / root
4. Через кілька хвилин сайт доступний за адресою `https://<username>.github.io/<repo>/`

## Оновлення даних

- **Замінити `data/for_dashboard.csv`** — перезавантажити сторінку
- **Замінити `data/risk_levels_2025_may.csv`** — рівні ризику оновляться автоматично

## Технічний стек

| Бібліотека | Версія | Призначення |
|---|---|---|
| Leaflet | 1.9.4 | Карта |
| Leaflet.markercluster | 1.5.3 | Кластеризація маркерів |
| PapaParse | 5.4.1 | Парсинг CSV |
| Inter (Google Fonts) | — | Шрифт |
