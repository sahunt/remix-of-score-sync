import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SavedFilter, FilterRule } from '@/components/filters/filterTypes';

interface DbFilter {
  id: string;
  user_id: string;
  name: string;
  rules: unknown;
  match_mode: string;
  created_at: string;
}

function mapDbToSavedFilter(db: DbFilter): SavedFilter {
  return {
    id: db.id,
    user_id: db.user_id,
    name: db.name,
    rules: db.rules as FilterRule[],
    matchMode: db.match_mode as 'all' | 'any',
    created_at: db.created_at,
  };
}

function toDbFilter(data: {
  created_at: string;
  id: string;
  match_mode: string;
  name: string;
  rules: unknown;
  user_id: string;
}): DbFilter {
  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    rules: data.rules,
    match_mode: data.match_mode,
    created_at: data.created_at,
  };
}

export function useSavedFilters() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    if (!user) {
      setFilters([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_filters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setFilters((data ?? []).map(d => mapDbToSavedFilter(toDbFilter(d))));
    } catch (err) {
      console.error('Error fetching filters:', err);
      setError('Failed to load filters');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const createFilter = useCallback(async (
    name: string,
    rules: FilterRule[],
    matchMode: 'all' | 'any'
  ): Promise<SavedFilter | null> => {
    if (!user) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase
        .from('user_filters') as any)
        .insert({
          user_id: user.id,
          name,
          rules,
          match_mode: matchMode,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newFilter = mapDbToSavedFilter(toDbFilter(data));
      setFilters(prev => [newFilter, ...prev]);
      return newFilter;
    } catch (err) {
      console.error('Error creating filter:', err);
      setError('Failed to save filter');
      return null;
    }
  }, [user]);

  const updateFilter = useCallback(async (
    id: string,
    updates: Partial<Pick<SavedFilter, 'name' | 'rules' | 'matchMode'>>
  ): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.rules !== undefined) dbUpdates.rules = updates.rules;
      if (updates.matchMode !== undefined) dbUpdates.match_mode = updates.matchMode;

      const { error: updateError } = await supabase
        .from('user_filters')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setFilters(prev => prev.map(f => 
        f.id === id 
          ? { ...f, ...updates } 
          : f
      ));
      return true;
    } catch (err) {
      console.error('Error updating filter:', err);
      setError('Failed to update filter');
      return false;
    }
  }, []);

  const deleteFilter = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('user_filters')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setFilters(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting filter:', err);
      setError('Failed to delete filter');
      return false;
    }
  }, []);

  return {
    filters,
    loading,
    error,
    createFilter,
    updateFilter,
    deleteFilter,
    refetch: fetchFilters,
  };
}
