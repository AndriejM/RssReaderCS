import axios, {type AxiosError, type AxiosResponse} from 'axios';
import type {
  AppConfig,
  RssItem,
  RssUnreadCount,
  User,
  UserConfig,
  UserSettingsPayload,
} from "@/shared/model/types.ts";

// Create an instance of axios with some default configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Define a generic API function
type UserIdGetter = () => { userId: number | null };

export const apiRequest = async <T = unknown, P = unknown>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: P): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient({
      method,
      url,
      data,
    });
    //console.log("response:" + JSON.stringify(response));
    return await response.data;
  } catch (error: unknown) {
    //console.log("error1:" + JSON.stringify(err));
    const message = (error as AxiosError<{ message: string }>).response?.data?.message;
    console.log(`Error while posting ${url}. ${message ?? ''}`, 'error');
//    notification(`Error while posting ${url}. ${message ?? ''}`, 'error');
    throw error;
  }
};

export const getAppConfig = () => {
  return apiRequest<AppConfig>("/app-config/get", "GET");
}

export const setCurrentUser = (userId: number) => {
  return apiRequest<void>(`/app-config/set-current-user/${userId}`, "GET");
}
export const saveAppConfig = (appConfig: AppConfig) => {
  return apiRequest<void, AppConfig>("/app-config/save", "POST", appConfig);
}
export const getUser = () => {
  return apiRequest<User[]>("/user/find", "GET");
}
export const createUser = (user: User) => {
  return apiRequest<void, User>("/user/create", "POST", user);
}
export const getUserConfig = () => {
  return apiRequest<UserConfig[]>("/user-config/find", "GET");
}
export const getUserConfigById = (get: UserIdGetter) => async () => {
  const userId = get().userId;
  if (!userId) {return null}
  return await apiRequest<UserConfig>(`/user-config/find/${userId}`, "GET");
}
export const saveUserConfig = (userConfig: UserConfig) => {
  return apiRequest<void, UserConfig>("/user-config/save", "POST", userConfig);
}
export const deleteUserConfig = (userId: number) => {
  return apiRequest<void, void>(`/user-config/delete/${userId}`, "DELETE");
}
export const getUserSettings = (userId: number) => {
  return apiRequest<UserSettingsPayload>(`/user-config/${userId}/settings`, "GET");
}
export const saveUserSettings = (userId: number, settings: UserSettingsPayload) => {
  return apiRequest<UserSettingsPayload, UserSettingsPayload>(`/user-config/${userId}/settings`, "PUT", settings);
}
export const getRssListByUser = (get: UserIdGetter) => async () => {
  const userId = get().userId;
  if (!userId) {return []}
  return await apiRequest<RssItem[]>(`/rss/list/${userId}`, "GET");
}
export const getRssListByUserAndGroup = (userId: number, groupUuid: string) => {
  return apiRequest<RssItem[]>(`/rss/list/${userId}/${groupUuid}`, "GET");
}
export const getRssUnreadCount = (get: UserIdGetter) => async () => {
  const userId = get().userId;
  if (!userId) {return {unread: 0}}
  return await apiRequest<RssUnreadCount>(`/rss/unread-count/${userId}`, "GET");
}
export const getRssById = (itemId: number) => {
  return apiRequest<RssItem>(`/rss/rss/${itemId}`, "GET");
}
export const setStatusRssRead = async (itemId: number) => {
  await apiRequest<RssItem, number>(`/rss/rss/${itemId}/set-status-read`, "PUT");
}
