const Database = require('better-sqlite3');
const db = new Database('C:/ChoserDB/data/choser.db');

const tableId = 'proxi-core-engines-2026';
const title = 'Выбор ядра (Routing Core Engine) для мультипротокольного клиента Proxi';
const desc = 'Сравнение сетевых движков. Добавлен вариант Dual-Core (одновременное использование Sing-box и Mihomo) по запросу.';

const columns = [
  { key: 'p_protocols', title: 'Поддержка современных протоколов (Reality, Hys2, WG)', weight: 10, type: 'text' },
  { key: 'p_routing',   title: 'Гибкость маршрутизации (Traffic Splitting, Fallback)',  weight: 9, type: 'text' },
  { key: 'p_tun',       title: 'Поддержка прозрачного проксирования (TUN для всех ОС)', weight: 10, type: 'text' },
  { key: 'p_perf',      title: 'Производительность и потребление RAM/CPU',              weight: 8, type: 'text' },
  { key: 'p_dev',       title: 'Интеграция как библиотека (Go API / C-shared lib)',     weight: 7, type: 'text' },
  { key: 'p_mobile',    title: 'Мобильные ОС (iOS Network Ext. / Android VpnService)',  weight: 9, type: 'text' },
  { key: 'p_community', title: 'Активность развития и поддержка новых стандартов',      weight: 6, type: 'text' },
  { key: 'p_license',   title: 'Лицензионные риски (GPLv3 vs MIT/Apache)',              weight: 8, type: 'text' },
  { key: 'p_custom',    title: 'Легкость внедрения собственной проприетарной крипты',   weight: 7, type: 'text' },
  { key: 'p_ttm',       title: 'Время выхода на рынок (Time-to-Market)',                weight: 10, type: 'text' },
];

const rows = [
  {
    name: 'Sing-box',
    price: 0,
    p_protocols: { grade: 10, value: 'Абсолютный лидер. Встроены Reality, Hysteria 2, TUIC, Shadowsocks, WireGuard, Naive.\nhttps://sing-box.sagernet.org/configuration/outbound/' },
    p_routing: { grade: 9, value: 'Мощная система Rules (по IP, домену, процессам). Fallback настраивается через urltest.\nhttps://sing-box.sagernet.org/configuration/route/' },
    p_tun: { grade: 10, value: 'Встроенный высокопроизводительный TUN стек (gVisor/system), перехват всего трафика OS.\nhttps://sing-box.sagernet.org/configuration/inbound/tun/' },
    p_perf: { grade: 9, value: 'Написан на Go, крайне легковесный, оптимизирован под роутеры и слабые устройства.\nhttps://github.com/SagerNet/sing-box' },
    p_dev: { grade: 8, value: 'Имеет официальный пакет libbox для сборки C-shared/JNI/ObjC.\nhttps://github.com/SagerNet/sing-box/tree/main/libbox' },
    p_mobile: { grade: 10, value: 'Официальное ядро для Apple iOS и Android (sing-box for Apple/Android).\nhttps://github.com/SagerNet/sing-box-for-apple' },
    p_community: { grade: 9, value: 'Главный тренд 2024-2026. Самое активное комьюнити разработчиков.\nhttps://github.com/SagerNet/sing-box' },
    p_license: { grade: 3, value: 'GPLv3. Если вы встроите его в коммерческий Proxi, по условиям GPL вы обязаны открыть исходники вашего UI (или использовать IPC).\nhttps://github.com/SagerNet/sing-box/blob/main/LICENSE' },
    p_custom: { grade: 4, value: 'Кодовая база модульная, но вливать проприетарный код сложно из-за GPL (только в приватный форк).\nhttps://github.com/SagerNet/sing-box' },
    p_ttm: { grade: 10, value: 'Минимальное. Можно выпустить продукт через неделю, просто натянув UI поверх libbox.\nhttps://sing-box.sagernet.org/' }
  },
  {
    name: 'Mihomo (Clash Meta)',
    price: 0,
    p_protocols: { grade: 9, value: 'Поддерживает всё основное (Hysteria 2, Reality), так как интегрирует чужие библиотеки.\nhttps://wiki.metacubex.one/config/proxies/' },
    p_routing: { grade: 10, value: 'Король маршрутизации. Clash-правила — это индустриальный стандарт для подписок и разделения трафика.\nhttps://wiki.metacubex.one/config/rules/' },
    p_tun: { grade: 9, value: 'Встроенный TUN (через wireguard-go/gVisor), работает стабильно.\nhttps://wiki.metacubex.one/config/tun/' },
    p_perf: { grade: 7, value: 'Тяжелее Sing-box из-за раздутой кодовой базы Clash и огромного количества legacy.\nhttps://github.com/MetaCubeX/mihomo' },
    p_dev: { grade: 6, value: 'Интеграция сложнее, обычно используют как внешний процесс (binary), общаясь через REST API.\nhttps://wiki.metacubex.one/api/' },
    p_mobile: { grade: 8, value: 'Отлично работает (Clash for Android/Meta), но UI-оболочки тяжелее собирать с нуля.\nhttps://github.com/MetaCubeX/ClashMetaForAndroid' },
    p_community: { grade: 8, value: 'Огромное пользовательское сообщество, но архитектура ядра устаревает по сравнению с sing-box.\nhttps://github.com/MetaCubeX/mihomo' },
    p_license: { grade: 3, value: 'GPLv3. Те же проблемы, что и у sing-box для закрытого коммерческого использования.\nhttps://github.com/MetaCubeX/mihomo/blob/Meta/LICENSE' },
    p_custom: { grade: 3, value: 'Очень монолитный код правил маршрутизации, впиливать свою крипту больно.\nhttps://github.com/MetaCubeX/mihomo' },
    p_ttm: { grade: 8, value: 'Быстро, если делать десктопный клиент на Electron, управляющий бинарником через API.\nhttps://github.com/MetaCubeX/mihomo' }
  },
  {
    name: 'Xray-core',
    price: 0,
    p_protocols: { grade: 6, value: 'Создатель Reality/VLESS. Но НЕ поддерживает Hysteria 2, TUIC, так как сфокусирован только на XTLS экосистеме.\nhttps://xtls.github.io/config/' },
    p_routing: { grade: 8, value: 'Мощная JSON-ориентированная маршрутизация, но очень многословная и сложная.\nhttps://xtls.github.io/config/routing.html' },
    p_tun: { grade: 3, value: 'Нет нативного встроенного TUN. Требует сторонних инструментов (tun2socks) на десктопе.\nhttps://github.com/xjasonlyu/tun2socks' },
    p_perf: { grade: 9, value: 'Отличная оптимизация внутри XTLS потоков.\nhttps://github.com/XTLS/Xray-core' },
    p_dev: { grade: 7, value: 'Есть API (gRPC), но ядро монолитно.\nhttps://xtls.github.io/document/level-2/grpc.html' },
    p_mobile: { grade: 7, value: 'V2rayNG / XrayPB. Сложно адаптировать ядро под свой кастомный iOS клиент (LibXray).\nhttps://github.com/XTLS/Xray-core' },
    p_community: { grade: 8, value: 'Авторитетные ресерчеры, но вектор развития узкий (только TLS-mimicry).\nhttps://github.com/XTLS/Xray-core' },
    p_license: { grade: 6, value: 'MPL 2.0 (Mozilla). Позволяет линковать с закрытым кодом (коммерческим UI), нужно лишь открывать изменения самого Xray.\nhttps://github.com/XTLS/Xray-core/blob/main/LICENSE' },
    p_custom: { grade: 5, value: 'Архитектура proxy/inbound/outbound позволяет добавить свой модуль, но документации мало.\nhttps://xtls.github.io/development/' },
    p_ttm: { grade: 6, value: 'Среднее. Из-за отсутствия TUN придётся писать много платформенно-зависимого кода (C/С++, NetworkExt).\nhttps://github.com/XTLS/Xray-core' }
  },
  {
    name: 'Custom Core (с нуля на Go/Rust)',
    price: 0,
    p_protocols: { grade: 2, value: 'Придётся писать обёртки для каждого протокола (Hysteria, WireGuard, Reality) руками, тратя месяцы работы.\nhttps://go.dev/' },
    p_routing: { grade: 3, value: 'Писать свой движок правил (по IP/GeoIP/процессам) — это сотни часов отладки.\nhttps://github.com/v2fly/geoip' },
    p_tun: { grade: 1, value: 'Сложный низкоуровневый системный код. Чтение пакетов, L3/L4 TCP stack (надо встраивать lwIP или gVisor).\nhttps://github.com/google/gvisor' },
    p_perf: { grade: 10, value: 'Можно добиться максимума, выбросив всё лишнее и оставив только нужные протоколы.\nhttps://rust-lang.org/' },
    p_dev: { grade: 10, value: 'Идеальная нативная интеграция в свой продукт, никаких API/REST-костылей.\nhttps://go.dev/' },
    p_mobile: { grade: 10, value: 'Можно написать идеальные FFI/JNI биндинги специально под ваши нужды.\nhttps://github.com/golang/mobile' },
    p_community: { grade: 0, value: 'Поддерживать и исправлять баги протоколов будете вы сами, один на один с GFW.\nhttps://en.wikipedia.org/wiki/Not_invented_here' },
    p_license: { grade: 10, value: 'Полностью ваше. 100% закрытый проприетарный коммерческий код, никаких проблем с аудитом Apple App Store.\nhttps://choosealicense.com/' },
    p_custom: { grade: 10, value: 'Делайте что угодно: уникальные протоколы, нестандартную криптографию, никто не увидит ваш код.\nhttps://noiseprotocol.org/' },
    p_ttm: { grade: 1, value: 'Минимум 6–12 месяцев сильной команды инженеров до первого рабочего прототипа.\nhttps://en.wikipedia.org/wiki/Time_to_market' }
  },
  {
    name: 'Dual Core (Sing-box + Mihomo)',
    price: 0,
    p_protocols: { grade: 10, value: 'Суммарно покрывают 100% всех существующих протоколов.\nhttps://github.com/SagerNet/sing-box' },
    p_routing: { grade: 10, value: 'Mihomo может использоваться как фронт-балансировщик, проксирующий часть трафика в Sing-box.\nhttps://wiki.metacubex.one/config/proxies/' },
    p_tun: { grade: 2, value: 'Критичный конфликт! Два TUN интерфейса не могут одновременно перехватывать системный трафик без жестких петель маршрутизации (Routing Loops).\nhttps://github.com/google/gvisor' },
    p_perf: { grade: 2, value: 'Запуск двух тяжелых Go-машин (Garbage Collectors) убьет батарею мобильного устройства и съест всю RAM.\nhttps://go.dev/doc/gc-guide' },
    p_dev: { grade: 1, value: 'Кошмарная архитектура (IPC взаимодействие, передача сокетов между процессами, сложнейшая отладка утечек).\nhttps://en.wikipedia.org/wiki/Inter-process_communication' },
    p_mobile: { grade: 1, value: 'В iOS Network Extension лимит памяти ~15-50MB. Два ядра гарантированно вызовут OOM Crash (Out of Memory).\nhttps://developer.apple.com/documentation/networkextension' },
    p_community: { grade: 4, value: 'Никто так не делает в коммерческих мобильных VPN. Иногда встречается на мощных домашних роутерах (OpenWRT).\nhttps://openwrt.org/' },
    p_license: { grade: 3, value: 'Двойная головная боль с лицензиями (GPLv3 x 2).\nhttps://choosealicense.com/licenses/gpl-3.0/' },
    p_custom: { grade: 2, value: 'Кастомный модуль придётся писать и поддерживать сразу для двух совершенно разных архитектур.\nhttps://github.com/SagerNet/sing-box' },
    p_ttm: { grade: 1, value: 'Разработка моста между ядрами и решение конфликтов TUN займут больше времени, чем просто добавление протокола в Sing-box.\nhttps://en.wikipedia.org/wiki/System_integration' }
  }
];

const insertTable = db.prepare(`INSERT OR REPLACE INTO tables 
  (id, title, description, author, state, param_count, object_count, tags, created_at, updated_at) 
  VALUES (?, ?, ?, 'AI Architect', 'открытая', ?, ?, 'proxi, architecture, vpn, core', unixepoch(), date('now'))`);
const insertCol  = db.prepare('INSERT OR REPLACE INTO columns (table_id, definition) VALUES (?, ?)');
const deleteRows = db.prepare('DELETE FROM rows WHERE table_id = ?');
const insertRow  = db.prepare('INSERT INTO rows (table_id, data) VALUES (?, ?)');

db.transaction(() => {
  insertTable.run(tableId, title, desc, columns.length, rows.length);
  insertCol.run(tableId, JSON.stringify(columns));
  deleteRows.run(tableId);
  for (const row of rows) {
    insertRow.run(tableId, JSON.stringify(row));
  }
})();

console.log(`✅ Table Updated with Dual Core: ${tableId}`);
