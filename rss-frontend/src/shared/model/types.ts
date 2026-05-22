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
  itemPayload: RssItemPayload
}

export interface RssItemPayload {
  title: string
  link: string
  pubDate: string
  description: string
}
