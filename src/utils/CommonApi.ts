import axios from "axios";
import { getAccessToken, endSession } from "../component/auth/authUtils";

const BASE_URL = process.env.REACT_APP_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url ?? "");
    const isLoginRequest =
      requestUrl.endsWith("/Login/login") ||
      requestUrl.endsWith("/Pharmacy/login");
    const isRefreshRequest = requestUrl.endsWith("/Login/refresh");

    // Keep login/refresh failures on the current flow; session timeout handles refresh 401.
    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest) {
      endSession();
    }
    return Promise.reject(error);
  }
);

export const get = (url: string) => api.get(url);

export const post = (url: string, data?: any) => api.post(url, data);

export const put = (url: string, data?: any) => api.put(url, data);

export const del = (url: string) => api.delete(url);

/**
 * Fire-and-forget contact with the API host so the first login is not also
 * the first TLS / connection setup after a cold page load.
 */
export const warmApiConnection = (): void => {
  if (!BASE_URL) return;
  void api
    .request({
      url: "/",
      method: "HEAD",
      timeout: 8000,
      validateStatus: () => true,
    })
    .catch(() => undefined);
};

export default api;
