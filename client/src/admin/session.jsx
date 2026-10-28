import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SessionContext = createContext(null);

export const SessionProvider = SessionContext;
export const useSession = () => useContext(SessionContext);

// Loads data for an admin page; a 401 means the session expired, so the panel returns to sign-in.
export function useAdminData(load) {
  const { expire } = useSession();
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    try {
      setState({ data: await load(), error: null, loading: false });
    } catch (error) {
      if (error.status === 401) expire();
      setState({ data: null, error: error.message, loading: false });
    }
  }, [load, expire]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload, setData: (data) => setState((current) => ({ ...current, data })) };
}
