export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  
  // Try to load customer token if available
  if (typeof window !== 'undefined') {
    const custData = localStorage.getItem('menino_customer_data');
    if (custData) {
      try {
        const parsed = JSON.parse(custData);
        if (parsed?.token) {
          headers.set('Authorization', `Bearer ${parsed.token}`);
        }
      } catch {}
    }
  }

  // Set default content type
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // 15-second timeout so requests never hang the UI
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('A requisição demorou demais. Verifique sua conexão e tente novamente.');
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    let errorMsg = 'Failed to fetch API';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}
