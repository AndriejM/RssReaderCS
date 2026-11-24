export interface AppConfig {
  id: number
  appConfigPayload: AppConfigPayload
}

export interface AppConfigPayload {
  defaultUserId: number
  daysForSetRead: number
  daysForCleanRssItems: number
  isSetClickedRssToRead: boolean
}

export interface User {
  id: number
  userName: string
}

export interface UserConfig {
  id: number
  userConfigPayload: UserConfigPayload
  userName: string
}

export interface UserConfigPayload {
  defaultCronExpression: string
  groups: Group[]
  settings?: UserSettingsPayload
}

export interface UserSettingsPayload {
  theme: string
  language: string
  layout: string
  readTtlDays: number
  firstFeedDone: boolean
  fontScales: FontScales
  columnWidths: ColumnWidths
  rowHeights: RowHeights
}

export interface FontScales {
  feeds: number
  headlines: number
  content: number
}

export interface ColumnWidths {
  feeds: number
  headlines: number
}

export interface RowHeights {
  headlines: number
}

export interface Group {
  uuid: string
  name: string
  rssConfigs: RssConfig[]
}

export interface RssConfig {
  uuid: string
  name: string
  url: string
  refreshCronExpression: string
  refreshMinutes?: number
  cleanMinutes?: number
  icon?: string
  lastCheckedAt?: string
  lastOkAt?: string
  lastErrorAt?: string
  lastErrorCode?: string
  lastErrorParams?: string
  lastErrorMessage?: string
  fetchFailureCount?: number
  nextRunAt?: string
  nextRetryAt?: string
  etag?: string
  lastModified?: string
  lastFetchedAt?: string
}

export interface RssItem {
  id: number | null
  userId: number
  groupUuid: string
  rssUuid: string
  status: string
  link: string
  title: string
  pubDate: string
  description?: string
  sourceId?: string
  sourceIdType?: 'LINK' | 'GUID' | 'ATOM_ID' | 'JSON_ID'
  feedName?: string
  fetchedAt?: string
  itemPayload: RssItemPayload
}

export interface RssUnreadCount {
  unread: number
}

export interface RssItemPayload {
  title: string
  link: string
  pubDate: string
  description: string
}

export interface RssConfigDto extends RssConfig {
  groupUuid: string
}

export interface RssRefreshResult {
  ok: boolean
  rssUuid: string
  name?: string
  added: number
  skipped: number
  seen: number
  notModified: boolean
  busy: boolean
  error?: string
}

export interface RssRefreshAllResult {
  ok: boolean
  failed: number
  results: RssRefreshResult[]
}

export interface RssFullText {
  id: number
  link: string
  title: string
  text: string
  paragraphs: number
  truncated: boolean
  error?: string
}

export interface FeedExportItem {
  groupUuid?: string
  name: string
  url: string
  refreshCronExpression?: string
  refreshMinutes?: number
  cleanMinutes?: number
  icon?: string
}

export interface FeedExport {
  version: number
  feeds: FeedExportItem[]
}

export interface FeedImportResult {
  ok: boolean
  added: number
  skipped: number
  total: number
  error?: string
}
