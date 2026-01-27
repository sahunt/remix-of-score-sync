import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, Plus } from 'lucide-react';
import { GoalPreviewCard } from './GoalPreviewCard';
import { TargetSelector } from './TargetSelector';
import { GoalModeToggle } from './GoalModeToggle';
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

  // Generate auto-name based on selections
  const generateName = () => {
    if (!targetValue) return '';
    
    // Format target display
    let target = targetValue.toUpperCase();
    if (targetType === 'flare') {
      const flareOption = FLARE_OPTIONS.find(f => f.value === parseInt(targetValue));
      target = flareOption?.flareType.toUpperCase() ?? targetValue;
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
    
    if (!criteriaDesc) {
      criteriaDesc = ' songs';
    }

    if (goalMode === 'all') {
      return `${target} all${criteriaDesc}`;
    } else {
      return `${target} ${goalCount}${criteriaDesc}`;
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
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const canSave = targetType && targetValue;

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

        <div className="px-4 py-4 space-y-6 overflow-y-auto">
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

          {/* Custom Name (optional) */}
          <div className="space-y-2">
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

          {/* Target Selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              What do you want to achieve?
            </Label>
            <TargetSelector
              targetType={targetType}
              targetValue={targetValue}
              onTargetChange={(type, value) => {
                setTargetType(type);
                setTargetValue(value);
              }}
            />
          </div>

          {/* Criteria - Filter Rules */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Which charts? (optional)
            </Label>
            
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
              Add criteria rule
            </Button>
          </div>

          {/* Goal Mode */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Goal Type
            </Label>
            <GoalModeToggle
              mode={goalMode}
              count={goalCount}
              onModeChange={setGoalMode}
              onCountChange={setGoalCount}
            />
          </div>

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
