'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSupabase, supabaseConfigured } from '@/lib/supabase/client';

const PortalContext = createContext(null);

const EMPTY_LOOKUPS = { lists: {}, clients: [], categories: [], people: [] };

export function PortalProvider({ children }) {
  const supabase = getSupabase();
  const [state, setState] = useState({ loading: true, user: null, profile: null, error: null });
  const [lookups, setLookups] = useState(EMPTY_LOOKUPS);

  const loadLookups = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('get_all_lookups');
    if (error) {
      console.error('get_all_lookups', error);
      return;
    }
    setLookups({
      lists: data?.lists || {},
      clients: data?.clients || [],
      categories: data?.categories || [],
      people: data?.people || []
    });
  }, [supabase]);

  const loadProfile = useCallback(async () => {
    if (!supabase) {
      setState({ loading: false, user: null, profile: null, error: 'config' });
      return;
    }
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setState({ loading: false, user: null, profile: null, error: null });
      return;
    }
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setState({ loading: false, user, profile: profile || null, error: error ? error.message : null });
    loadLookups();
  }, [supabase, loadLookups]);

  useEffect(() => {
    loadProfile();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') loadProfile();
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, loadProfile]);

  const value = {
    supabase,
    configured: supabaseConfigured,
    ...state,
    lookups,
    reloadLookups: loadLookups,
    reloadProfile: loadProfile,
    list: (key) => lookups.lists[key] || []
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  return useContext(PortalContext);
}
