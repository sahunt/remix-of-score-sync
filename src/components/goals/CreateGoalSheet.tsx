import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, Plus, ChevronDown } from 'lucide-react';
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

  // Form state
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<TargetType | null>(null);
  const [targetValue, setTargetValue] = useState<string | null>(null);
  const [goalMode, setGoalMode] = useState<'all' | 'count'>('all');
  const [goalCount, setGoalCount] = useState(10);
  const [criteriaRules, setCriteriaRules] = useState<FilterRule[]>([]);
  const [criteriaMatchMode, setCriteriaMatchMode] = useState<'all' | 'any'>('all');

  // Track which step is expanded (only one at a time)
  const [expandedStep, setExpandedStep] = useState<1 | 2 | 3>(1);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setExpandedStep(1);
    }
  }, [open]);

  // Completion states
  const isStep1Complete = Boolean(targetType && targetValue);

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

  const handleAddRule = () => {
    const newRule: FilterRule = {
      id: generateRuleId(),
      type: 'level',
      operator: getDefaultOperator('level'),
      value: getDefaultValue('level'),
    };
    setCriteriaRules([...criteriaRules, newRule]);
  };

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
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
          <DrawerTitle className="text-base font-semibold">New Goal</DrawerTitle>
          <div className="w-8" />
        </DrawerHeader>

        <div className="px-4 py-4 space-y-3 overflow-y-auto">
          {/* Live Preview Card */}
          <GoalPreviewCard
            name={displayName}
            targetType={targetType}
            targetValue={targetValue}
            goalMode={goalMode}
            goalCount={goalCount}
            matchingTotal={0}
            currentProgress={0}
          />

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
              <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <TargetSelector
                  targetType={targetType}
                  targetValue={targetValue}
                  onTargetChange={(type, value) => {
                    setTargetType(type);
                    setTargetValue(value);
                  }}
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
                
                {criteriaRules.length === 0 ? (
                  <Button
                    variant="outline"
                    onClick={handleAddRule}
                    className="w-full rounded-[10px] border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add filter
                  </Button>
                ) : (
                  <FilterRuleRow
                    rule={criteriaRules[0]}
                    onChange={(updatedRule) => handleUpdateRule(0, updatedRule)}
                    onRemove={() => handleRemoveRule(0)}
                    showRemove={true}
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
              <div className="mt-3 p-4 rounded-[10px] bg-[#262937] animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
                <GoalModeToggle
                  mode={goalMode}
                  count={goalCount}
                  onModeChange={setGoalMode}
                  onCountChange={setGoalCount}
                />

                {/* Optional: Custom Name */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label htmlFor="goal-name" className="text-xs text-muted-foreground uppercase tracking-wide">
                    Custom Name (optional)
                  </Label>
                  <Input
                    id="goal-name"
                    placeholder={generateName() || "Enter goal name..."}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-[10px] bg-[#3B3F51] border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Button - Always visible */}
          <Button
            onClick={handleSave}
            disabled={!canSave || createGoal.isPending}
            className="w-full rounded-[10px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {createGoal.isPending ? 'Saving...' : 'Save Goal'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
