import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { FilterRule } from '@/components/filters/filterTypes';

interface GoalProgressResult {
  completed: number;
  total: number;
}

/**
 * Extract level and difficulty filter values from criteria rules.
 * The RPC accepts flat arrays rather than complex JSONB.
 */
function extractFilterParams(rules: FilterRule[]): {
  levelValues: number[] | null;
  levelOperator: string;
  difficultyValues: string[] | null;
  difficultyOperator: string;
} {
  const levelRule = rules.find(r => r.type === 'level');
  const difficultyRule = rules.find(r => r.type === 'difficulty');

  return {
    levelValues: levelRule && Array.isArray(levelRule.value) && levelRule.value.length > 0
      ? levelRule.value as number[]
      : null,
    levelOperator: levelRule?.operator ?? 'is',
    difficultyValues: difficultyRule && Array.isArray(difficultyRule.value) && difficultyRule.value.length > 0
      ? (difficultyRule.value as string[]).map(d => d.toUpperCase())
      : null,
    difficultyOperator: difficultyRule?.operator ?? 'is',
  };
}

/**
 * Fetch goal progress from the server-side RPC.
 * This calculates both completed and total counts in a single query,
 * eliminating the need for separate useMusicDbCount calls per goal.
 */
export function useServerGoalProgress(
  goalId: string | undefined,
  criteriaRules: FilterRule[],
  targetType: 'lamp' | 'grade' | 'flare' | 'score',
  targetValue: string,
  enabled: boolean = true
) {
  const { user } = useAuth();
  
  const { levelValues, levelOperator, difficultyValues, difficultyOperator } = 
    extractFilterParams(criteriaRules);

  return useQuery<GoalProgressResult>({
    queryKey: ['goal-progress-rpc', goalId, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { completed: 0, total: 0 };
      }

      const { data, error } = await supabase.rpc('calculate_goal_progress', {
        p_user_id: user.id,
        p_level_values: levelValues,
        p_level_operator: levelOperator,
        p_difficulty_values: difficultyValues,
        p_difficulty_operator: difficultyOperator,
        p_target_type: targetType,
        p_target_value: targetValue,
      });

      if (error) throw error;

      // RPC returns an array with one row
      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
      
      return {
        completed: Number(result?.completed_count ?? 0),
        total: Number(result?.total_count ?? 0),
      };
    },
    enabled: enabled && !!user?.id && !!goalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Batch fetch progress for multiple goals at once.
 * This is more efficient than calling useServerGoalProgress for each goal.
 */
export async function fetchGoalProgressBatch(
  userId: string,
  goals: Array<{
    id: string;
    criteria_rules: FilterRule[];
    target_type: 'lamp' | 'grade' | 'flare' | 'score';
    target_value: string;
  }>
): Promise<Map<string, GoalProgressResult>> {
  const results = new Map<string, GoalProgressResult>();

  // Execute all RPCs in parallel
  const promises = goals.map(async (goal) => {
    const { levelValues, levelOperator, difficultyValues, difficultyOperator } = 
      extractFilterParams(goal.criteria_rules);

    const { data, error } = await supabase.rpc('calculate_goal_progress', {
      p_user_id: userId,
      p_level_values: levelValues,
      p_level_operator: levelOperator,
      p_difficulty_values: difficultyValues,
      p_difficulty_operator: difficultyOperator,
      p_target_type: goal.target_type,
      p_target_value: goal.target_value,
    });

    if (error) {
      console.error(`Error fetching progress for goal ${goal.id}:`, error);
      return { goalId: goal.id, completed: 0, total: 0 };
    }

    const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return {
      goalId: goal.id,
      completed: Number(result?.completed_count ?? 0),
      total: Number(result?.total_count ?? 0),
    };
  });

  const allResults = await Promise.all(promises);
  
  for (const result of allResults) {
    results.set(result.goalId, { 
      completed: result.completed, 
      total: result.total 
    });
  }

  return results;
}
