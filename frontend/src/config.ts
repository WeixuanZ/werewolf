// In production (Cloud Run), we use Nginx proxy
// In local dev, we might use Vite proxy or full URL.
const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    // In production, Nginx proxies /api -> Backend
    return "/api";
  }

  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || "8000";
  return `http://${host}:${port}/api`;
};

const getWsUrl = () => {
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || "8000";

  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${host}:${port}`;
};

export const API_BASE_URL = getBaseUrl();
export const WS_BASE_URL = getWsUrl();
