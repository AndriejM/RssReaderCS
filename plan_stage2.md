# Этап 2 — функциональная паритетность с `RssReader.chrome`

Цель: веб-приложение (`rss-backend` + `rss-frontend`) воспроизводит поведение Chrome-расширения
`D:\work\RssReader.chrome`. Расширение — single-profile, плоский список фидов, хранение в
`chrome.storage.local`. Веб-версия уже идёт как надстройка: **multi-user + группы** — это суперсет,
его сохраняем.

Документ: (1) инвентарь эталона, (2) gap-анализ, (3) план backend, (4) план frontend,
(5) что не портируем, (6) порядок работ.

---

## 1. Инвентарь эталона

### 1.1 Модель данных (`chrome.storage.local`)

**`feeds[]`**
- `id` (uuid), `name`, `rss_link`, `delay_timeout` (мин, ≥1, default 30), `clean_timeout` (мин, ≥1, default 1440), `icon`
- health: `lastCheckedAt`, `lastOkAt`, `lastErrorAt`, `lastErrorCode`, `lastErrorParams`, `lastErrorMessage` (<300), `fetchFailureCount`, `nextAlarmAt`, `nextRetryAt`
- conditional GET: `etag`, `lastModified`, `lastFetchedAt`
- при смене `rss_link` health + валидаторы сбрасываются

**`items[]`** (headlines)
- `uid` = `<feedId>|<sourceId>`, `feedId`, `feedName`, `rss_link`, `title`, `link`
- `sourceId` (guid / atom:id / json:id / link), `sourceIdType` (`link|guid|atom:id|json:id`)
- `pubDate` (UTC ISO или ''), `time` (ms загрузки), `description` (preview, ≤8000 симв.)
- сортировка freshest-first; cap 250/фид, 2000 всего

**`read[]`** (личные read-метки, чтобы прочитанное не возвращалось)
- `link`, `sourceId`, `sourceIdType`, `pubDate`, `time`
- матчинг по `sourceId` (или `link`), TTL `read_ttl_days` (default 7, 1..3650), cap 1000
- TTL считается от `max(pubDate, time)`

**`feed_fetch_locks`** — `{feedId: {until}}`, TTL 45с, защита от параллельного чтения одного фида.

**`settings`** — `theme`, `sound`, `sound_file`, `sound_volume`, `show_message`, `read_ttl_days`,
`language`, `first_feed_done`, `font_scales{feeds,headlines,content}`, `column_widths{feeds,headlines}`,
`row_heights{headlines}`, `layout` (`three|list|split`).

### 1.2 Экраны
- **Reader** (`index.html`): 3 панели (feeds → headlines → content), 3 layout'а, поиск, шорткаты,
  undo-удаление, full-text по `f`, mark read `m`, refresh `r`, авто-выбор, health-линии, i18n, a11y.
- **Feeds** (`feeds.html`): таблица фидов, add/edit/delete, export/import JSON, "Load now", health-линии.
- **Global settings** (`settings.html`): `read_ttl_days`, sound on/off + файл + громкость, show_message,
  язык, "Forget read items", кнопка "Write".

### 1.3 Ключевые механики
- Парсинг RSS 2.0 / Atom / RDF / JSON Feed; определение кодировки (BOM / Content-Type / XML decl, Windows-1251).
- Conditional GET (ETag/Last-Modified → 304 ничего не пишет).
- Backoff для падающих фидов (до 1440 мин).
- Favicon фида при добавлении.
- Full-text извлечение статьи по запросу (`extract.js`, лимиты 60 абз./16000 симв., мин. абзац 40).
- Cleanup по `clean_timeout` (проверка раз в минуту) + purge read по TTL.
- Badge (1..99, `*` >99), звук, системные нотификации — браузерные.

### 1.4 Шорткаты ридера
`/` поиск · `↓/j` `↑/k` навигация · `Enter` открыть оригинал · `f` full-text · `r` refresh ·
`m` mark read · `d` delete · `u` undo · `Esc` очистить поиск / undo · `?` список клавиш.
Клавиши по физическому коду (работают на любой раскладке).

---

## 2. Gap-анализ (текущий проект vs эталон)

| Область | Эталон | Сейчас в `rss-backend` | Статус |
|---|---|---|---|
| Пользователи | 1 профиль | multi-user | ✅ сверх |
| Группы | нет | `Group` | ✅ сверх |
| Фид: name/url | есть | `RssConfig{name,url}` | ✅ |
| Период обновления | `delay_timeout` мин/фид | cron глобально+`refreshCronExpression` | ✅ принято: оставить cron |
| Срок хранения | `clean_timeout` мин/фид | глоб. `daysForCleanRssItems` | ⚠️ гранулярность |
| Дедуп | `sourceId`+type | по `link` | ❌ |
| Read-память | `read[]` TTL | `status=READ` на строке | ❌ (после cleanup возвращается) |
| Preview | `description` ≤8000 | `itemPayload.description` | ✅ |
| Health record | есть | нет | ❌ |
| Conditional GET | ETag/Last-Modified | нет | ❌ |
| Backoff | есть | нет | ❌ |
| Favicon | есть | нет | ❌ |
| Full-text | `extract.js` | нет | ❌ |
| Кодировки | BOM/CT/XML | `InvalidXmlCharacterFilter` | ⚠️ проверить |
| Caps 250/2000 | есть | нет | ❌ |
| read_ttl_days | 7 (1..3650) | `daysForSetRead`=3 | ⚠️ семантика |
| Settings UI-prefs | theme/lang/layout/font/widths | нет | ❌ → в БД на пользователя |
| Export/import фидов | JSON | нет | ❌ |
| Undo delete | 15с | нет | ❌ (frontend) |
| Search/filter | есть | нет | ❌ (frontend) |
| Keyboard | есть | нет | ❌ (frontend) |
| Layouts 3/list/split | есть | нет | ❌ (frontend) |
| i18n 7 языков | есть | нет | ❌ (frontend) |
| Badge/звук/нотификации | браузер | — | 🔁 отдельный Chrome-модуль + polling API |
| `set-status-read` | — | контроллер вызывает `getRssItemsById` | 🐛 баг |

Баг: `RssController.setRssStatusToRead` вызывает `rssService.getRssItemsById(id)` вместо
`rssService.setRssStatusToRead(id)` (сервис-метод уже корректный). Правка — 1 строка.

---

## 3. План BACKEND

### 3.1 Модель данных / сущности
- **`RssConfig`** дополнить: `icon`, health-поля (`lastCheckedAt/lastOkAt/lastErrorAt/lastErrorCode/lastErrorMessage/
  fetchFailureCount/nextRunAt/nextRetryAt`), валидаторы (`etag/lastModified/lastFetchedAt`).
  Период обновления остаётся cron: `refreshCronExpression` + `defaultCronExpression`.
- **`RssItem`** дополнить: `sourceId`, `sourceIdType` (enum `LINK/GUID/ATOM_ID/JSON_ID`),
  `feedName`, `fetchedAt` (ms загрузки), `description` вынести в колонку (или оставить в payload).
  Уникальность дедупа: `userId + rssUuid + sourceId` (fallback `link`).
- **Новая сущность `ReadMarker`** (таблица `read_marker`): `id`, `userId`, `rssUuid`, `link`,
  `sourceId`, `sourceIdType`, `pubDate`, `markedAt`. TTL-очистка отдельно от `rss_item`.
- **`UserSettingsPayload`** внутри `UserConfigPayload.settings`: theme, language, layout,
  fontScales, columnWidths, rowHeights, readTtlDays, firstFeedDone.
  Звук/нотификации в веб-версии не реализуются; для будущего Chrome-модуля нужен дешёвый
  polling endpoint количества непрочитанных.

### 3.2 Миграции Liquibase (`changelog-011.xml`+)
- `ALTER rss_item` ADD `source_id`, `source_id_type`, `feed_name`, `fetched_at`.
- `CREATE TABLE read_marker` + индекс `(user_id, source_id)`.
- UI-настройки: отдельная миграция не нужна, если храним `settings` внутри `user_config_payload`.
- Расширение `rss_config` payload-полей (health/validators/minutes) — если `RssConfig` хранится
  JSON-строкой в `user_config_payload`, миграция данных не нужна; если отдельная таблица — ALTER.
- Backfill: существующие `rss_item` → `source_id_type='LINK'`, `source_id=link`.

### 3.3 DTO / API
- `RssItemDto`: + `sourceId`, `sourceIdType`, `feedName`, `description`, `fetchedAt`.
- `RssConfigDto`: + `refreshMinutes`, `cleanMinutes`, `icon`, health, validators.
- Новые эндпоинты:
  - `POST /rss/refresh/{userId}/{rssUuid}` — прочитать 1 фид (аналог `MSG_REFRESH_FEED`), ответ
    `{ok, added, skipped, seen, busy}`.
  - `POST /rss/refresh-all/{userId}` — все фиды, ответ `{ok, results[], failed}`.
  - `POST /rss/rss/{id}/mark-read` и `.../mark-unread` (toggle вместо только-read).
  - `DELETE /rss/rss/{id}` — удалить item (кладёт read-метку, возвращает для undo).
  - `POST /rss/rss/{id}/restore` — undo.
  - `POST /rss/rss/{id}/full-text` — извлечь полный текст статьи.
  - `GET /rss/unread-count/{userId}` — дешёвый polling endpoint для будущего Chrome-модуля.
  - UI-настройки: расширить `UserConfigPayload.settings` и существующие `/user-config` endpoints.
  - `GET /feeds/export/{userId}`, `POST /feeds/import/{userId}` — JSON-файл фидов.
  - `DELETE /read-markers/{userId}` — "Forget read items".
- Исправить `RssController.setRssStatusToRead` → вызывать `setRssStatusToRead`.

### 3.4 Сервисы
- **`RssLoaderService`**: дедуп по `sourceId`(+type, fallback link); cap 250/фид и 2000/юзер;
  проставлять `fetchedAt`, `feedName`; применять read-метки (не создавать NEW для помеченных);
  сохранять `description` ≤8000.
- **`FeedHealthService`** (новый): запись health, `fetchFailureCount`, backoff (`feedBackoffMinutes`),
  `nextRunAt/nextRetryAt`.
- **`ConditionalGetService`** (или внутри loader): слать `If-None-Match`/`If-Modified-Since`,
  обрабатывать 304.
- **`EncodingService`** (новый): bytes→text по BOM/Content-Type/XML-decl (проверить, что `rssreader`
  это умеет; иначе декодировать вручную до парсинга).
- **`ArticleExtractor`** (новый): fetch страницы + извлечение текста (jsoup), лимиты 60/16000/40.
- **`FaviconService`** (новый): при добавлении фида читать страницу, искать `<link rel=icon>`/`favicon.ico`.
- **`ReadMarkerService`** (новый): CRUD + TTL-purge + cap 1000.
- **`UserSettingsService`** (новый): CRUD UI-настроек.
- **`FeedLockService`** (новый): блокировка фида на время чтения (TTL 45с) — аналог `feed_fetch_locks`.

### 3.5 Scheduler (`DynamicScheduler`)
- Планировать каждый фид по `refreshMinutes` (или cron), с учётом `nextRetryAt` (backoff).
- Cleanup-задача раз в минуту: удалять `rss_item` старше `cleanMinutes` фида; purge `read_marker`
  по `readTtlDays`; сбрасывать протухшие feed-локи.
- Пересоздавать задачи при сохранении конфига (уже есть restart).

### 3.6 Порядок backend-задач
1. Исправить баг `set-status-read`.
2. Liquibase: `source_id*`, `feed_name`, `fetched_at`, `read_marker`, `user_settings`.
3. Сущности/DTO/мапперы под новые поля.
4. Дедуп по `sourceId` + caps в `RssLoaderService`.
5. `ReadMarkerService` + применение меток при загрузке + toggle/mark endpoints.
6. Cleanup по `cleanMinutes` + purge read по TTL.
7. `FeedHealthService` + backoff + health в DTO.
8. Conditional GET.
9. `EncodingService` (проверка/замена).
10. `FaviconService`.
11. `ArticleExtractor` + endpoint.
12. `UserSettingsService` + endpoints.
13. Refresh endpoints (single/all) + `FeedLockService`.
14. Export/import фидов.

---

## 4. План FRONTEND

### 4.1 Структура (feature-sliced, как сейчас)
- `features/reader/` — 3-панельный ридер (заменяет/расширяет `rss-list`).
- `features/feeds/` — экран управления фидами (таблица, add/edit/delete, import/export, Load now).
- `features/settings/` — глобальные настройки (read_ttl, sound, show_message, language).
- `shared/ui/` — layout-switcher, font-size switcher, resizable borders, theme toggle, shortcuts modal.

### 4.2 Stores (Zustand + leo-query)
- `reader-store` — выбранный фид/«All feeds», выбранный headline, поиск, layout, undo-стек.
- `feeds-store` — таблица фидов + health.
- `settings-store` — UI-настройки (theme/language/layout/font/widths/sound/show_message/read_ttl).
- Переиспользовать `user-store`, `user-config-store`, `app-config-store`.

### 4.3 Reader UI
- 3 панели + layout `three|list|split` (switcher, `data-layout`).
- «All feeds» строка, счётчики, health-бейджи, favicon'ы.
- Поиск по title/feedName (AND по словам), без изменения порядка.
- Resizable borders (column_widths/row_heights), font-size на колонку (font_scales).
- Full-text по кнопке/`f`; mark read `m`; delete `d` + undo-линия 15с (`u`/`Esc`).
- Keyboard (физические коды, `event.code`), `?`-модалка со списком клавиш.
- Авто-выбор freshest; возврат из настроек к той же фид/headline.
- A11y: listbox/option, aria-live, aria-current, prefers-reduced-motion.

### 4.4 Feeds UI
- Таблица (name/link/refresh/clean), human-units ("1.5 h"), валидация полей.
- Add-draft, Save, Delete (confirm), Load now ("New: N, read: M"), health-линия под строкой.
- Export/Import JSON (`rss-reader-feeds.json`, version 1, add-only по link).

### 4.5 Settings UI
- read_ttl_days (1..3650), sound on/off + combobox файла + volume slider + preview,
  show_message, language (7 языков), "Forget read items" (confirm), кнопка "Write" + "Changes not saved".

### 4.6 Cross-cutting
- i18n: 7 словарей (ru/en/uk/pl/de/fr/es), `t(key,params)`, `applyI18n`, язык из настроек→navigator→en.
- Theme light/dark (CSS vars), синхронизация между вкладками (BroadcastChannel / storage event).
- Badge-аналог в веб-версии: опционально `document.title` (1..99/`*`) через polling.
- Звук и нотификации в веб-версии не реализуются — выносятся в отдельный Chrome-модуль.
- Multi-tab sync: BroadcastChannel для layout/font/widths/theme/языка.

### 4.7 Порядок frontend-задач
1. API client под новые эндпоинты + типы.
2. `settings-store` + theme + language (i18n каркас).
3. Reader: 3 панели + «All feeds» + выбор/авто-выбор.
4. Layouts three/list/split + resizable + font-size.
5. Search + keyboard + shortcuts modal.
6. mark read / delete / undo / full-text.
7. Feeds screen (CRUD + health + Load now).
8. Import/export фидов.
9. Settings screen (read_ttl/sound/show_message/language/forget).
10. Polling unread-count + multi-tab sync; звук/нотификации — отдельный Chrome-модуль.
11. i18n-словари (7 языков) + a11y-полировка.

---

## 5. Что НЕ портируем напрямую (браузер → веб)
- `chrome.alarms` → Spring `DynamicScheduler`.
- `chrome.storage.local` → БД + Zustand/localStorage-кэш.
- offscreen document → обычный backend-fetch.
- `chrome.action` badge → отдельный Chrome-модуль `rss-chrome`; в веб-версии опционально `document.title`.
- `chrome.notifications` → отдельный Chrome-модуль `rss-chrome`, не веб-frontend.
- `chrome.tabs` focusOrCreate → BroadcastChannel / `window.focus`.
- `chrome.runtime` messages → REST + (опц.) SSE/WebSocket для push-обновлений счётчиков.

## 6. Принятые решения
1. **Период обновления**: оставить cron. `refreshCronExpression` остаётся источником расписания;
   `delay_timeout`/`clean_timeout` из эталона не становятся основными полями.
2. **UI-настройки** (`theme`, `layout`, `font_scales`, `column_widths`, `row_heights`, язык и т.п.):
   хранить в БД на пользователя. Допустимо хранить внутри `user_config.user_config_payload` как
   `settings`, чтобы не плодить отдельную таблицу без необходимости.
3. **Live-счётчики**: polling. SSE/WebSocket не нужен.
4. **Звук/нотификации в веб-версии**: не нужны. Для этого будет отдельный маленький Chrome-модуль `rss-chrome`:
   - периодически опрашивает backend о количестве непрочитанных новостей;
   - показывает количество в иконке;
   - воспроизводит звук и/или выдаёт нотификацию при появлении непрочитанных;
   - по клику на иконку открывает frontend приложения с RSS-каналами в новой вкладке браузера.

## 7. Следствие для backend API
Для будущего Chrome-модуля нужен лёгкий polling endpoint, например:
- `GET /rss/unread-count/{userId}` → `{unread: N}`.

Этот endpoint должен быть дешёвым и не тянуть payload статей.
