import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save } from 'lucide-react';
import { GoalPreviewCard } from './GoalPreviewCard';
import { TargetSelector } from './TargetSelector';
import { GoalModeToggle } from './GoalModeToggle';
import { GoalCriteriaSelector } from './GoalCriteriaSelector';
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
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);

  // Generate auto-name based on selections
  const generateName = () => {
    if (!targetValue) return '';
    const target = targetValue.toUpperCase();
    
    // Build level description
    let levelDesc = '';
    if (selectedLevels.length > 0 && selectedLevels.length < 19) {
      const sorted = [...selectedLevels].sort((a, b) => a - b);
      const isContiguous = sorted.every((level, i) => i === 0 || level === sorted[i - 1] + 1);
      if (sorted.length === 1) {
        levelDesc = ` ${sorted[0]}s`;
      } else if (isContiguous) {
        levelDesc = ` ${sorted[0]}-${sorted[sorted.length - 1]}s`;
      } else {
        levelDesc = ' songs';
      }
    } else {
      levelDesc = ' songs';
    }

    if (goalMode === 'all') {
      return `${target} all${levelDesc}`;
    } else {
      return `${target} ${goalCount}${levelDesc}`;
    }
  };

  const displayName = name || generateName();

  const handleSave = async () => {
    if (!targetType || !targetValue) {
      toast({
        title: "Missing target",
        description: "Please select what you want to achieve.",
        variant: "destructive",
      });
      return;
    }

    // Build criteria rules from selected levels
    const criteriaRules = selectedLevels.length > 0 && selectedLevels.length < 19
      ? [{ id: `level_${Date.now()}`, type: 'level', operator: 'is', value: selectedLevels }]
      : [];

    try {
      await createGoal.mutateAsync({
        name: displayName || 'New Goal',
        target_type: targetType,
        target_value: targetValue,
        criteria_rules: criteriaRules,
        criteria_match_mode: 'all',
        goal_mode: goalMode,
        goal_count: goalMode === 'count' ? goalCount : null,
      });

      toast({
        title: "Goal created!",
        description: "Your new goal has been saved.",
      });

      // Reset form and close
      setName('');
      setTargetType(null);
      setTargetValue(null);
      setGoalMode('all');
      setGoalCount(10);
      setSelectedLevels([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    }
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

          {/* Criteria - Level Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Which charts? (optional)
            </Label>
            <GoalCriteriaSelector
              selectedLevels={selectedLevels}
              onLevelsChange={setSelectedLevels}
            />
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
