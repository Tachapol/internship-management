export function supportReturnPath(role?: string, requested?: string | null): string {
  const fallback = ['SUPER_ADMIN', 'BD_TEAM', 'MENTOR'].includes(role ?? '') ? '/support-tickets' : '/support';
  if (!requested) return fallback;
  try {
    const url = new URL(requested, 'https://devplus.invalid');
    if (url.origin !== 'https://devplus.invalid' || url.pathname !== fallback) return fallback;
    const query = new URLSearchParams();
    for (const key of ['status', 'priority', 'q']) {
      const value = url.searchParams.get(key);
      if (value) query.set(key, value);
    }
    return fallback + (query.size ? `?${query}` : '');
  } catch { return fallback; }
}
