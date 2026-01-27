import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Goal } from './useGoalProgress';

interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  target_type: string;
  target_value: string;
  criteria_rules: any;
  criteria_match_mode: string;
  goal_mode: string;
  goal_count: number | null;
  created_at: string;
  updated_at: string;
}

function mapRowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    target_type: row.target_type as Goal['target_type'],
    target_value: row.target_value,
    criteria_rules: Array.isArray(row.criteria_rules) ? row.criteria_rules : [],
    criteria_match_mode: row.criteria_match_mode as Goal['criteria_match_mode'],
    goal_mode: row.goal_mode as Goal['goal_mode'],
    goal_count: row.goal_count,
  };
}

export function useGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapRowToGoal);
    },
    enabled: !!user?.id,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: Omit<Goal, 'id'>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_goals')
        .insert({
          user_id: user.id,
          name: goal.name,
          target_type: goal.target_type,
          target_value: goal.target_value,
          criteria_rules: goal.criteria_rules,
          criteria_match_mode: goal.criteria_match_mode,
          goal_mode: goal.goal_mode,
          goal_count: goal.goal_count,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRowToGoal(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Goal> & { id: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_goals')
        .update({
          name: updates.name,
          target_type: updates.target_type,
          target_value: updates.target_value,
          criteria_rules: updates.criteria_rules,
          criteria_match_mode: updates.criteria_match_mode,
          goal_mode: updates.goal_mode,
          goal_count: updates.goal_count,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return mapRowToGoal(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
    },
  });

  return {
    goals: goalsQuery.data ?? [],
    isLoading: goalsQuery.isLoading,
    error: goalsQuery.error,
    createGoal,
    updateGoal,
    deleteGoal,
  };
}

export function useGoal(goalId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      if (!user?.id || !goalId) return null;
      
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data ? mapRowToGoal(data) : null;
    },
    enabled: !!user?.id && !!goalId,
  });
}
