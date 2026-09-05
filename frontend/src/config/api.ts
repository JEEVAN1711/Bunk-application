// Central API configuration for local and cloud environments
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bunk_cloud_api_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const setCustomApiBaseUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('bunk_cloud_api_url', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('bunk_cloud_api_url');
    }
  }
};
