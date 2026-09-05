// Central API configuration for local and cloud environments
export const DEFAULT_CLOUD_API_URL = 'https://bunk-application-4.onrender.com';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check custom override from Settings page
    const saved = localStorage.getItem('bunk_cloud_api_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }

    // 2. If running on local dev machine and no VITE_API_BASE_URL is set, use local proxy
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (isLocalhost && (!envUrl || !envUrl.trim())) {
      return '';
    }
  }

  // 3. Check VITE_API_BASE_URL environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 4. Default to live Render cloud backend for Vercel, mobile, and production
  return DEFAULT_CLOUD_API_URL;
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
