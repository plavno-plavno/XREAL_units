# XREAL_units

Стенд для теста сканирования QR очками XREAL One: страница с бирками юнитов и
страницы самих юнитов, которые открываются после скана.

```
index.html              стенд: бирки с QR, крайние случаи резолвера, верстак
equipment/EQ-1001.html  Centrifugal pump P-12
equipment/EQ-1002.html  Air compressor AC-3
equipment/EQ-1003.html  HVAC air handler AHU-7
equipment/EQ-1004.html  Forklift charger FC-2
vendor/qrcode.js        qrcode-generator 1.4.4 (MIT), чтобы стенд работал без интернета
```

## Как это работает

- В QR зашита ссылка на страницу юнита: `<адрес стенда>/equipment/<id>.html`.
  Адрес берётся от того, где открыт `index.html`, поэтому на GitHub Pages
  коды сразу указывают на реальные страницы. Открытый с диска стенд (`file://`)
  подставляет адрес Pages — `https://plavno-plavno.github.io/XREAL_units/`.
- После скана приложение отправляет строку
  `{"commandName":"sendTextCommand","text":"[glasses] QR scanned: url=<содержимое кода>"}`.
  Префикс добавляет приложение, в самом коде его быть не должно.
- Резолвер (на стенде — копия серверного): сначала точное совпадение ссылки
  из реестра, затем поиск `EQ-\d{3,}` в любом месте строки, иначе
  `equipment_id: null` и имя из последнего сегмента пути.

## Хостинг

Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
Статика без сборки; внешние зависимости — только шрифты с Google Fonts,
без них страницы деградируют до системных шрифтов.
