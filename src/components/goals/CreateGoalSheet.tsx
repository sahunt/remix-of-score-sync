import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, Plus } from 'lucide-react';
import { GoalPreviewCard } from './GoalPreviewCard';
import { TargetSelector } from './TargetSelector';
import { GoalModeToggle } from './GoalModeToggle';
import { GoalStepCard } from './GoalStepCard';
import { FilterRuleRow } from '@/components/filters/FilterRuleRow';
import { RuleConnectorChip } from '@/components/filters/RuleConnectorChip';
import { MatchModeToggle } from '@/components/filters/MatchModeToggle';
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
type StepNumber = 1 | 2 | 3;

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
    return parseInt(targetValue).toLocaleString();
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

  // Step state
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // Auto-advance to step 2 when target is selected
  useEffect(() => {
    if (targetType && targetValue && currentStep === 1) {
      // Small delay for visual feedback
      const timer = setTimeout(() => setCurrentStep(2), 300);
      return () => clearTimeout(timer);
    }
  }, [targetType, targetValue, currentStep]);

  // Completion states
  const isStep1Complete = Boolean(targetType && targetValue);
  const isStep2Complete = true; // Always complete (optional step)
  const isStep3Complete = true; // Always has default

  // Generate auto-name based on selections
  const generateName = () => {
    if (!targetValue) return '';
    
    // Format target display
    let target = formatTargetDisplay(targetType, targetValue);
    
    // For score targets, use "Score X+" format for the prefix
    const isScoreTarget = targetType === 'score';
    if (isScoreTarget) {
      target = `${target}+`;
    }
    
    // Build criteria description from rules
    let criteriaDesc = '';
    
    // Look for level rules
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
    
    // Look for difficulty rules
    const diffRule = criteriaRules.find(r => r.type === 'difficulty');
    if (diffRule && Array.isArray(diffRule.value) && diffRule.value.length > 0) {
      const diffs = diffRule.value as string[];
      if (diffs.length === 1) {
        const diffName = diffs[0].charAt(0) + diffs[0].slice(1).toLowerCase();
        criteriaDesc = criteriaDesc || ' songs';
        criteriaDesc = ` ${diffName}${criteriaDesc}`;
      }
    }
    
    // Look for flare criteria (only if not a flare target)
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

    // Build final name based on goal mode
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

      // Reset form and close
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
    setCurrentStep(1);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const canSave = targetType && targetValue;

  // Get step summaries
  const step1Summary = isStep1Complete ? formatTargetDisplay(targetType, targetValue) : undefined;
  const step2Summary = formatCriteriaSummary(criteriaRules);
  const step3Summary = goalMode === 'all' ? 'All matching' : `${goalCount} songs`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
          <DrawerTitle className="text-base font-semibold">New Goal</DrawerTitle>
          <div className="w-8" /> {/* Spacer for centering */}
        </DrawerHeader>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
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
          <GoalStepCard
            stepNumber={1}
            title="What do you want to achieve?"
            summary={step1Summary}
            isComplete={isStep1Complete}
            isExpanded={currentStep === 1}
            onToggle={() => setCurrentStep(1)}
          >
            <TargetSelector
              targetType={targetType}
              targetValue={targetValue}
              onTargetChange={(type, value) => {
                setTargetType(type);
                setTargetValue(value);
              }}
            />
          </GoalStepCard>

          {/* Step 2: Criteria (Optional) */}
          <GoalStepCard
            stepNumber={2}
            title="On which charts?"
            summary={step2Summary}
            isComplete={isStep2Complete}
            isExpanded={currentStep === 2}
            onToggle={() => setCurrentStep(2)}
            disabled={!isStep1Complete}
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Optional: Add rules to filter which charts count toward this goal
              </p>
              
              {/* Match mode toggle - show when 2+ rules */}
              {criteriaRules.length >= 2 && (
                <MatchModeToggle
                  value={criteriaMatchMode}
                  onChange={setCriteriaMatchMode}
                />
              )}

              {/* Rules list */}
              <div className="space-y-0">
                {criteriaRules.map((rule, index) => (
                  <div key={rule.id}>
                    {/* Show connector chip between rules */}
                    {index > 0 && (
                      <RuleConnectorChip mode={criteriaMatchMode} />
                    )}
                    <FilterRuleRow
                      rule={rule}
                      onChange={(updatedRule) => handleUpdateRule(index, updatedRule)}
                      onRemove={() => handleRemoveRule(index)}
                      showRemove={true}
                    />
                  </div>
                ))}
              </div>

              {/* Add rule button */}
              <Button
                variant="outline"
                onClick={handleAddRule}
                className="w-full rounded-[10px] border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add criteria
              </Button>
            </div>
          </GoalStepCard>

          {/* Step 3: Goal Mode */}
          <GoalStepCard
            stepNumber={3}
            title="How many?"
            summary={step3Summary}
            isComplete={isStep3Complete}
            isExpanded={currentStep === 3}
            onToggle={() => setCurrentStep(3)}
            disabled={!isStep1Complete}
          >
            <GoalModeToggle
              mode={goalMode}
              count={goalCount}
              onModeChange={setGoalMode}
              onCountChange={setGoalCount}
            />
          </GoalStepCard>

          {/* Optional: Custom Name */}
          {isStep1Complete && (
            <div className="space-y-2 pt-2">
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
          )}

          {/* Save Button */}
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
