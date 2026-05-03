import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const API = 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [accessToken, setToken]   = useState(() => sessionStorage.getItem('at'));
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const saveToken = (token) => {
    setToken(token);
    sessionStorage.setItem('at', token);
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('at');
  };

  // ── Refresh on mount ───────────────────────────────────────────────────────

  useEffect(() => {
    async function restore() {
      try {
        const res = await fetch(`${API}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        const { accessToken: at } = await res.json();
        saveToken(at);

        const meRes = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${at}` },
          credentials: 'include',
        });
        if (meRes.ok) {
          const { user } = await meRes.json();
          setUser(user);
        }
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const register = useCallback(async ({ email, username, password }) => {
    setError(null);
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, username, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); throw new Error(data.error); }
    saveToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setError(null);
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); throw new Error(data.error); }
    saveToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    clearAuth();
  }, []);

  // Auto-refresh: 14 min intervals (access token expires in 15m)
  useEffect(() => {
    if (!accessToken) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const { accessToken: at } = await res.json();
          saveToken(at);
        }
      } catch { /* silently ignore */ }
    }, 14 * 60 * 1000);
    return () => clearInterval(id);
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, error, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
