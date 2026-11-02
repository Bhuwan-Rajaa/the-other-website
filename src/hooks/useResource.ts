import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { readableError } from '../services/supabase';

export function useResource<T>(fetcher: () => Promise<T>, sample: T, key = '') {
  const { preview } = useAuth();
  const { revision } = useWorkspace();
  const [data, setData] = useState<T>(sample);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (preview) { setData(sample); setLoading(false); setError(''); return; }
    let cancelled = false;
    setLoading(true); setError('');
    fetcher().then(result => { if (!cancelled) setData(result); })
      .catch(issue => { if (!cancelled) setError(readableError(issue)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // key describes the query; callers supply it when filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision, preview, attempt]);
  return { data, loading, error, retry: () => setAttempt(n => n + 1), reload: () => setAttempt(n => n + 1) };
}
