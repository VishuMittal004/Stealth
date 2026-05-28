import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/profile');
      setProfile(data.profile);
      setStatus(data.exists ? 'ready' : 'needs_setup');
    } catch (err) {
      if (err.response?.status === 401) setStatus('locked');
      else {
        setStatus('error');
        setError(err.response?.data?.message || 'Could not load profile');
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, setProfile, status, setStatus, error, reload: load };
}
