/**
 * Adds the signed-in user's token to every request to this app's own /api (except the public booking page
 * and sign in), and returns to the sign in screen when the login has expired.
 * Several screens call fetch('/api/...') directly, so this keeps them all working in one place.
 */
const originalFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  const isOwnApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
  const isPublic = url.includes('/api/public/') || url.includes('/api/auth/login') || url.includes('/api/auth/register');
  if (!isOwnApi || isPublic) return originalFetch(input, init);

  let token = null;
  try { token = localStorage.getItem('xunaris_auth_token'); } catch {}
  const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  return originalFetch(input, { ...init, headers }).then((res) => {
    if (res.status === 401 && token) {
      // The login expired (tokens last 24 hours): sign out so the user sees the sign in screen, not stale data
      try {
        localStorage.removeItem('xunaris_auth_token');
        if (sessionStorage.getItem('xun_crm_logged_in')) {
          sessionStorage.removeItem('xun_crm_logged_in');
          window.location.reload();
        }
      } catch {}
    }
    return res;
  });
};
