import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { FilterRuleRow } from './FilterRuleRow';
import { MatchModeToggle } from './MatchModeToggle';
import { RuleConnectorChip } from './RuleConnectorChip';
import { useFilterResults } from '@/hooks/useFilterResults';
import {
  generateRuleId,
  getDefaultOperator,
  getDefaultValue,
  generateFilterName,
  type FilterRule,
} from './filterTypes';

interface CreateFilterSheetProps {
  scores: Array<{
    score: number | null;
    difficulty_level: number | null;
    difficulty_name: string | null;
    rank: string | null;
    halo: string | null;
    flare: number | null;
    musicdb: { name: string | null; artist: string | null } | null;
  }>;
  onSave: (name: string, rules: FilterRule[], matchMode: 'all' | 'any') => void;
  onShowResults: (rules: FilterRule[], matchMode: 'all' | 'any') => void;
  onBack: () => void;
  onCancel: () => void;
}

export function CreateFilterSheet({
  scores,
  onSave,
  onShowResults,
  onBack,
  onCancel,
}: CreateFilterSheetProps) {
  const [filterName, setFilterName] = useState('');
  const [rules, setRules] = useState<FilterRule[]>([
    {
      id: generateRuleId(),
      type: 'level',
      operator: getDefaultOperator('level'),
      value: getDefaultValue('level'),
    },
  ]);
  const [matchMode, setMatchMode] = useState<'all' | 'any'>('all');

  const { count } = useFilterResults(scores, rules, matchMode);

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: generateRuleId(),
        type: 'level',
        operator: getDefaultOperator('level'),
        value: getDefaultValue('level'),
      },
    ]);
  };

  const handleUpdateRule = (updatedRule: FilterRule) => {
    setRules((prev) =>
      prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
    );
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    const name = filterName.trim() || generateFilterName(rules);
    onSave(name, rules, matchMode);
  };

  const handleShowResults = () => {
    onShowResults(rules, matchMode);
  };

  return (
    <div className="space-y-6">
      {/* Header with close/back, title, and kebab */}
      <div className="flex items-center justify-between -mx-7 -mt-4 px-5 py-4 border-b border-[#4A4E61]">
        <button
          onClick={onBack}
          className="p-2 text-white hover:text-muted-foreground transition-colors"
          aria-label="Back"
        >
          <Icon name="close" size={24} />
        </button>
        <h2 className="text-lg font-semibold text-white">New Filter</h2>
        <button
          className="p-2 text-white hover:text-muted-foreground transition-colors"
          aria-label="More options"
        >
          <Icon name="more_vert" size={24} />
        </button>
      </div>

      {/* Filter name input */}
      <div className="flex items-center h-[52px] rounded-[10px] bg-[#262937] px-6">
        <input
          type="text"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="Filter name..."
          className="flex-1 bg-transparent text-white placeholder:text-muted-foreground/50 outline-none"
        />
      </div>

      {/* Match mode toggle (shows when 2+ rules) */}
      {rules.length >= 2 && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <MatchModeToggle value={matchMode} onChange={setMatchMode} />
        </div>
      )}

      {/* Rules */}
      <div className="space-y-1">
        {rules.map((rule, index) => (
          <div key={rule.id}>
            <FilterRuleRow
              rule={rule}
              onChange={handleUpdateRule}
              onRemove={() => handleRemoveRule(rule.id)}
              showRemove={rules.length > 1}
            />
            {/* Show connector chip between rules when there are multiple */}
            {rules.length > 1 && index < rules.length - 1 && (
              <RuleConnectorChip mode={matchMode} />
            )}
          </div>
        ))}

        {/* Add rule button - dashed outline */}
        <button
          onClick={handleAddRule}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-muted-foreground/30 h-[52px] text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="add" size={20} />
          Add rule
        </button>
      </div>

      {/* Action buttons */}
      <div className="space-y-3 pt-2">
        {/* Save filter button - primary CTA */}
        <Button 
          className="w-full h-11 rounded-[10px]" 
          onClick={handleSave}
          iconLeft="favorite"
        >
          Save Filter
        </Button>
        
        {/* Show results button - secondary */}
        <Button 
          variant="outline"
          className="w-full h-11 rounded-[10px]" 
          onClick={handleShowResults}
        >
          Show {count.toLocaleString()} Result{count !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
