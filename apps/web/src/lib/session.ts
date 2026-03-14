import { useMemo, useState } from 'react';

export type SessionState = {
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
};

const SESSION_KEY = 'bookflow_session';

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const actions = useMemo(() => ({
    save: (next: SessionState) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
    },
    clear: () => {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    }
  }), []);

  return { session, ...actions };
}
