import { useState, useEffect, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerPortal, DrawerOverlay } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoalPreviewCard } from './GoalPreviewCard';
import { TargetSelector } from './TargetSelector';
import { GoalModeToggle } from './GoalModeToggle';
import { FilterRuleRow } from '@/components/filters/FilterRuleRow';
import {
  type FilterRule,
  generateRuleId,
  getDefaultOperator,
  getDefaultValue,
  FLARE_OPTIONS,
} from '@/components/filters/filterTypes';
import { useGoals } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFilterResults } from '@/hooks/useFilterResults';
import { useMusicDbCount } from '@/hooks/useMusicDbCount';

interface CreateGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TargetType = 'lamp' | 'grade' | 'flare' | 'score';

// Helper to format target display name
function formatTargetDisplay(targetType: TargetType | null, targetValue: string | null): string {
  if (!targetValue) return '';
  
  if (targetType === 'lamp') {
    return targetValue.toUpperCase();
  }
  if (targetType === 'grade') {
    return targetValue;
  }
  if (targetType === 'flare') {
    const flareOption = FLARE_OPTIONS.find(f => f.value === parseInt(targetValue));
    return flareOption ? `Flare ${flareOption.flareType.toUpperCase()}` : targetValue;
  }
  if (targetType === 'score') {
    return parseInt(targetValue).toLocaleString() + '+';
  }
  return targetValue;
}

// Helper to format criteria summary
function formatCriteriaSummary(rules: FilterRule[]): string {
  if (rules.length === 0) return 'Any chart';
  
  const summaries: string[] = [];
  
  for (const rule of rules) {
    if (rule.type === 'level' && Array.isArray(rule.value) && rule.value.length > 0) {
      const levels = rule.value as number[];
      const sorted = [...levels].sort((a, b) => a - b);
      if (sorted.length === 1) {
        summaries.push(`Level ${sorted[0]}`);
      } else {
        const isContiguous = sorted.every((level, i) => i === 0 || level === sorted[i - 1] + 1);
        if (isContiguous) {
          summaries.push(`Level ${sorted[0]}-${sorted[sorted.length - 1]}`);
        } else {
          summaries.push(`Level ${sorted.join(', ')}`);
        }
      }
    } else if (rule.type === 'difficulty' && Array.isArray(rule.value) && rule.value.length > 0) {
      const diffs = rule.value as string[];
      summaries.push(diffs.map(d => d.charAt(0) + d.slice(1).toLowerCase()).join(', '));
    } else if (rule.type === 'score') {
      summaries.push(`Score ${rule.operator} ${(rule.value as number).toLocaleString()}`);
    } else if (rule.type === 'flare' && Array.isArray(rule.value) && rule.value.length > 0) {
      summaries.push(`Flare ${(rule.value as number[]).map(v => FLARE_OPTIONS.find(f => f.value === v)?.flareType || v).join(', ')}`);
    }
  }
  
  if (summaries.length === 0) return 'Custom criteria';
  if (summaries.length === 1) return summaries[0];
  return `${summaries[0]} + ${summaries.length - 1} more`;
}

export function CreateGoalSheet({ open, onOpenChange }: CreateGoalSheetProps) {
  const { createGoal } = useGoals();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user scores for real-time matching
  const [userScores, setUserScores] = useState<Array<{
    score: number | null;
    difficulty_level: number | null;
    difficulty_name: string | null;
    rank: string | null;
    halo: string | null;
    flare: number | null;
    musicdb: { 
      name: string | null; 
      artist: string | null;
      eamuse_id: string | null;
      song_id: number | null;
    } | null;
  }>>([]);

  useEffect(() => {
    if (open && user) {
      const fetchAllScores = async () => {
        // Supabase limits responses to 1000 rows per request
        // Must paginate to fetch all scores (users can have 4500+ scores)
        const PAGE_SIZE = 1000;
        let allScores: typeof userScores = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data } = await supabase
            .from('user_scores')
            .select('score, difficulty_level, difficulty_name, rank, halo, flare, playstyle, musicdb(name, artist, eamuse_id, song_id)')
            .eq('user_id', user.id)
            .eq('playstyle', 'SP')
            .range(from, from + PAGE_SIZE - 1);
          
          if (data && data.length > 0) {
            allScores = [...allScores, ...data];
            from += PAGE_SIZE;
            hasMore = data.length === PAGE_SIZE;
          } else {
            hasMore = false;
          }
        }
        
        setUserScores(allScores);
      };
      fetchAllScores();
    }
  }, [open, user]);

  // Form state
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<TargetType | null>(null);
  const [targetValue, setTargetValue] = useState<string | null>(null);
  const [goalMode, setGoalMode] = useState<'all' | 'count'>('all');
  const [goalCount, setGoalCount] = useState(10);
  const [criteriaRules, setCriteriaRules] = useState<FilterRule[]>([]);
  const [criteriaMatchMode, setCriteriaMatchMode] = useState<'all' | 'any'>('all');
  const [scoreMode, setScoreMode] = useState<'target' | 'average'>('target');

  // Track which step is expanded (only one at a time)
  const [expandedStep, setExpandedStep] = useState<1 | 2 | 3>(1);

  // Initialize default criteria rule
  const defaultRule: FilterRule = {
    id: generateRuleId(),
    type: 'level',
    operator: getDefaultOperator('level'),
    value: getDefaultValue('level'),
  };

  // Reset form completely when sheet opens
  useEffect(() => {
    if (open) {
      // Reset all form state to initial values
      setName('');
      setTargetType(null);
      setTargetValue(null);
      setGoalMode('all');
      setGoalCount(10);
      setCriteriaRules([{
        id: generateRuleId(),
        type: 'level',
        operator: getDefaultOperator('level'),
        value: getDefaultValue('level'),
      }]);
      setCriteriaMatchMode('all');
      setScoreMode('target');
      setExpandedStep(1);
    }
  }, [open]);

  // Completion states
  const isStep1Complete = Boolean(targetType && targetValue);

  // Get total from musicdb based on criteria rules
  const { data: musicDbData } = useMusicDbCount(criteriaRules, criteriaMatchMode, open);
  const musicDbTotal = musicDbData?.total ?? 0;

  // Calculate matching scores based on criteria rules (for current progress)
  const { filteredScores } = useFilterResults(
    userScores,
    criteriaRules,
    criteriaMatchMode
  );

  // Calculate current progress (scores that already meet the target)
  const currentProgress = useMemo(() => {
    if (!targetType || !targetValue) return 0;
    
    return filteredScores.filter(score => {
      switch (targetType) {
        case 'lamp': {
          const lampHierarchy = ['clear', 'life4', 'fc', 'gfc', 'pfc', 'mfc'];
          const targetIndex = lampHierarchy.indexOf(targetValue.toLowerCase());
          const scoreIndex = lampHierarchy.indexOf((score.halo ?? '').toLowerCase());
          return scoreIndex >= targetIndex && targetIndex >= 0;
        }
        case 'grade': {
          const gradeHierarchy = ['D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'AA-', 'AA', 'AA+', 'AAA'];
          const targetIndex = gradeHierarchy.indexOf(targetValue);
          const scoreIndex = gradeHierarchy.indexOf(score.rank ?? '');
          return scoreIndex >= targetIndex && targetIndex >= 0;
        }
        case 'flare': {
          const targetFlare = parseInt(targetValue);
          return (score.flare ?? 0) >= targetFlare;
        }
        case 'score': {
          const targetScore = parseInt(targetValue);
          return (score.score ?? 0) >= targetScore;
        }
        default:
          return false;
      }
    }).length;
  }, [filteredScores, targetType, targetValue]);

  // Generate auto-name based on selections
  const generateName = () => {
    if (!targetValue) return '';
    
    let target = formatTargetDisplay(targetType, targetValue);
    
    // Build criteria description from rules
    let criteriaDesc = '';
    
    const levelRule = criteriaRules.find(r => r.type === 'level');
    if (levelRule && Array.isArray(levelRule.value) && levelRule.value.length > 0) {
      const levels = levelRule.value as number[];
      const sorted = [...levels].sort((a, b) => a - b);
      const isContiguous = sorted.every((level, i) => i === 0 || level === sorted[i - 1] + 1);
      
      if (sorted.length === 1) {
        criteriaDesc = ` ${sorted[0]}s`;
      } else if (isContiguous) {
        criteriaDesc = ` ${sorted[0]}-${sorted[sorted.length - 1]}s`;
      } else {
        criteriaDesc = ' songs';
      }
    }
    
    const diffRule = criteriaRules.find(r => r.type === 'difficulty');
    if (diffRule && Array.isArray(diffRule.value) && diffRule.value.length > 0) {
      const diffs = diffRule.value as string[];
      if (diffs.length === 1) {
        const diffName = diffs[0].charAt(0) + diffs[0].slice(1).toLowerCase();
        criteriaDesc = criteriaDesc || ' songs';
        criteriaDesc = ` ${diffName}${criteriaDesc}`;
      }
    }
    
    const flareRule = criteriaRules.find(r => r.type === 'flare');
    let flareSuffix = '';
    if (flareRule && Array.isArray(flareRule.value) && flareRule.value.length > 0 && targetType !== 'flare') {
      const flareVals = flareRule.value as number[];
      const flareLabels = flareVals.map(v => FLARE_OPTIONS.find(f => f.value === v)?.flareType || String(v));
      flareSuffix = ` with Flare ${flareLabels.join('/')}`;
    }
    
    if (!criteriaDesc) {
      criteriaDesc = ' songs';
    }

    if (goalMode === 'all') {
      return `${target} on all${criteriaDesc}${flareSuffix}`;
    } else {
      return `${target} on ${goalCount}${criteriaDesc}${flareSuffix}`;
    }
  };

  const displayName = name || generateName();

  const handleUpdateRule = (index: number, updatedRule: FilterRule) => {
    const newRules = [...criteriaRules];
    newRules[index] = updatedRule;
    setCriteriaRules(newRules);
  };

  const handleRemoveRule = (index: number) => {
    setCriteriaRules(criteriaRules.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!targetType || !targetValue) {
      toast({
        title: "Missing target",
        description: "Please select what you want to achieve.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createGoal.mutateAsync({
        name: displayName || 'New Goal',
        target_type: targetType,
        target_value: targetValue,
        criteria_rules: criteriaRules,
        criteria_match_mode: criteriaMatchMode,
        goal_mode: goalMode,
        goal_count: goalMode === 'count' ? goalCount : null,
        score_mode: targetType === 'score' ? scoreMode : 'target',
      });

      toast({
        title: "Goal created!",
        description: "Your new goal has been saved.",
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setName('');
    setTargetType(null);
    setTargetValue(null);
    setGoalMode('all');
    setGoalCount(10);
    setCriteriaRules([]);
    setCriteriaMatchMode('all');
    setScoreMode('target');
    setExpandedStep(1);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const canSave = targetType && targetValue;

  // Collapsible step header component
  const StepHeader = ({ 
    stepNumber, 
    title,
    summary,
    isExpanded,
    onClick
  }: { 
    stepNumber: number; 
    title: string;
    summary?: string;
    isExpanded: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-[10px] transition-all",
        isExpanded 
          ? "bg-[#262937] border-2 border-primary/30" 
          : "bg-[#262937]/50 border-2 border-transparent hover:bg-[#262937]/70"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold",
        isExpanded 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground"
      )}>
        {stepNumber}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {!isExpanded && summary && (
          <p className="text-xs text-primary truncate">{summary}</p>
        )}
      </div>
      <ChevronDown className={cn(
        "w-5 h-5 text-muted-foreground transition-transform duration-200",
        isExpanded && "rotate-180"
      )} />
    </button>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerOverlay className="fixed inset-0 bg-black/60" />
        <DrawerContent hideHandle className="fixed bottom-0 left-0 right-0 mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-[20px] bg-[#3B3F51] border-0 outline-none">
          <div className="flex-1 overflow-y-auto px-7 pb-8 pt-4">
            {/* Header matching filter sheet style */}
            <div className="flex items-center justify-between -mx-7 -mt-4 px-5 py-4 border-b border-[#4A4E61]">
              <button
                onClick={handleClose}
                className="p-2 text-white hover:text-muted-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
              <h2 className="text-lg font-semibold text-white">New Goal</h2>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>

            <div className="space-y-6 pt-6">
          {/* Live Preview Card */}
          <GoalPreviewCard
            name={displayName}
            targetType={targetType}
            targetValue={targetValue}
            goalMode={goalMode}
            goalCount={goalCount}
            matchingTotal={musicDbTotal}
            currentProgress={currentProgress}
          />

          {/* Goal name input - matching filter name input style */}
          <div className="flex items-center h-[52px] rounded-[10px] bg-[#262937] px-6">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={generateName() || "Enter goal name..."}
              className="flex-1 bg-transparent text-white placeholder:text-muted-foreground/50 outline-none"
            />
          </div>

          {/* Step 1: Target Selection */}
          <div>
            <StepHeader
              stepNumber={1}
              title="What do you want to achieve?"
              summary={isStep1Complete ? formatTargetDisplay(targetType, targetValue) : undefined}
              isExpanded={expandedStep === 1}
              onClick={() => setExpandedStep(1)}
            />
            {expandedStep === 1 && (
              <div className="mt-3 p-4 rounded-[10px] bg-[#262937] animate-in fade-in slide-in-from-top-2 duration-200">
                <TargetSelector
                  targetType={targetType}
                  targetValue={targetValue}
                  onTargetChange={(type, value) => {
                    setTargetType(type);
                    setTargetValue(value);
                    // Reset scoreMode when switching away from score
                    if (type !== 'score') {
                      setScoreMode('target');
                    }
                  }}
                  scoreMode={scoreMode}
                  onScoreModeChange={setScoreMode}
                />
              </div>
            )}
          </div>

          {/* Step 2: Criteria */}
          <div>
            <StepHeader
              stepNumber={2}
              title="On which charts?"
              summary={formatCriteriaSummary(criteriaRules)}
              isExpanded={expandedStep === 2}
              onClick={() => setExpandedStep(2)}
            />
            {expandedStep === 2 && (
              <div className="mt-3 p-4 rounded-[10px] bg-[#262937] animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-muted-foreground mb-3">
                  Optional: Filter which charts count toward this goal
                </p>
                
                {criteriaRules.length > 0 && (
                  <FilterRuleRow
                    rule={criteriaRules[0]}
                    onChange={(updatedRule) => handleUpdateRule(0, updatedRule)}
                    onRemove={() => handleRemoveRule(0)}
                    showRemove={false}
                    allowedTypes={['level', 'difficulty']}
                  />
                )}
              </div>
            )}
          </div>

          {/* Step 3: Goal Mode */}
          <div>
            <StepHeader
              stepNumber={3}
              title="How many?"
              summary={goalMode === 'all' ? 'All matching charts' : `${goalCount} charts`}
              isExpanded={expandedStep === 3}
              onClick={() => setExpandedStep(3)}
            />
            {expandedStep === 3 && (
              <div className="mt-3 p-4 rounded-[10px] bg-[#262937] animate-in fade-in slide-in-from-top-2 duration-200">
                <GoalModeToggle
                  mode={goalMode}
                  count={goalCount}
                  onModeChange={setGoalMode}
                  onCountChange={setGoalCount}
                />
              </div>
            )}
          </div>

          {/* Action buttons - matching filter sheet style */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={!canSave || createGoal.isPending}
              className="w-full h-11 rounded-[10px]"
              iconLeft="favorite"
            >
              {createGoal.isPending ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
            </div>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
