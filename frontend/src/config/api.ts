// Central API configuration for local and cloud environments
export const DEFAULT_CLOUD_API_URL = 'https://bunk-application-4.onrender.com';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check custom override from Settings page
    const saved = localStorage.getItem('bunk_cloud_api_url');
    if (saved && saved.trim()) {
      const clean = saved.trim().replace(/\/+$/, '');
      // Auto-purge dead/suspended previous render URLs (bunk-application-2, 1, 3, etc.)
      if (
        clean.includes('bunk-application-2') ||
        clean.includes('bunk-application-1') ||
        clean.includes('bunk-application-3') ||
        clean === 'https://bunk-application.onrender.com'
      ) {
        console.warn('Auto-purging suspended cloud URL from storage:', clean);
        localStorage.removeItem('bunk_cloud_api_url');
      } else {
        return clean;
      }
    }

    // 2. Check if user explicitly selected local backend only
    if (localStorage.getItem('bunk_use_local_backend') === 'true') {
      return '';
    }

    // 3. Auto-detect environment:
    // If running on localhost or over local Wi-Fi network (192.168.*, 10.*, 172.*),
    // or if running directly on Render (*.onrender.com):
    // Use relative path '' so requests go through the active server proxy directly to the connected backend!
    const host = window.location.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      window.location.origin.includes('onrender.com')
    ) {
      return '';
    }
  }

  // 4. Check VITE_API_BASE_URL environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 5. Default to live Render cloud backend
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

