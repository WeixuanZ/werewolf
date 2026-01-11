// Dynamic URL based on current hostname for LAN access
const getBaseUrl = () => {
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || '8000';

  // Use env var if explicitly set, otherwise derive from hostname
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  return `http://${host}:${port}`;
};

const getWsUrl = () => {
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT || '8000';

  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${host}:${port}`;
};

export const API_BASE_URL = getBaseUrl();
export const WS_BASE_URL = getWsUrl();
