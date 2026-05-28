import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

export function useTodayLog(active = true) {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(Boolean(active));

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    const { data } = await api.get('/logs/today');
    setLog(data.log);
    setLoading(false);
  }, [active]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  return { log, setLog, loading, reload: load };
}
