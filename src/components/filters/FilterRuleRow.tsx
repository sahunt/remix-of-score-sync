import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FlareSelector } from './FlareSelector';
import { LampSelector } from './LampSelector';
import {
  FILTER_TYPES,
  OPERATORS_BY_TYPE,
  GRADE_OPTIONS,
  DIFFICULTY_OPTIONS,
  getDefaultOperator,
  getDefaultValue,
  type FilterRule,
  type FilterType,
  type FilterOperator,
} from './filterTypes';

function generateRuleDescription(rule: FilterRule): string {
  const typeLabel = FILTER_TYPES.find(t => t.value === rule.type)?.label || rule.type;
  const operators = OPERATORS_BY_TYPE[rule.type];
  const operatorLabel = operators.find(o => o.value === rule.operator)?.label.toLowerCase() || rule.operator;
  
  if (rule.operator === 'is_between' && Array.isArray(rule.value)) {
    return `${typeLabel} ${operatorLabel} ${rule.value[0]} and ${rule.value[1]}`;
  }
  
  return `${typeLabel} ${operatorLabel} ${rule.value}`;
}

interface FilterRuleRowProps {
  rule: FilterRule;
  onChange: (rule: FilterRule) => void;
  onRemove: () => void;
  showRemove: boolean;
}

export function FilterRuleRow({ rule, onChange, onRemove, showRemove }: FilterRuleRowProps) {
  const operators = OPERATORS_BY_TYPE[rule.type];
  const isBetween = rule.operator === 'is_between';

  const handleTypeChange = (type: FilterType) => {
    onChange({
      ...rule,
      type,
      operator: getDefaultOperator(type),
      value: getDefaultValue(type),
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    let newValue = rule.value;
    
    // If switching to/from is_between, adjust the value format
    if (operator === 'is_between' && !Array.isArray(rule.value)) {
      const currentVal = typeof rule.value === 'number' ? rule.value : 0;
      newValue = [currentVal, currentVal + 1];
    } else if (operator !== 'is_between' && Array.isArray(rule.value)) {
      newValue = rule.value[0];
    }
    
    onChange({ ...rule, operator, value: newValue });
  };

  const handleValueChange = (value: string | number | [number, number]) => {
    onChange({ ...rule, value });
  };

  const renderValueInput = () => {
    switch (rule.type) {
      case 'score': {
        const STEP = 10000;
        const formatScore = (val: number) => val.toLocaleString();
        
        if (isBetween) {
          const [min, max] = Array.isArray(rule.value) ? rule.value : [0, 1000000];
          return (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-muted-foreground">Min Score</label>
                  <div className="flex items-center justify-center h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white">
                    {formatScore(min)}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-muted-foreground">Max Score</label>
                  <div className="flex items-center justify-center h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white">
                    {formatScore(max)}
                  </div>
                </div>
              </div>
              <Slider
                value={[min, max]}
                onValueChange={([newMin, newMax]) => handleValueChange([newMin, newMax])}
                min={0}
                max={1000000}
                step={STEP}
                className="w-full"
              />
            </div>
          );
        }
        
        const currentValue = typeof rule.value === 'number' ? rule.value : 0;
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white text-lg font-medium">
              {formatScore(currentValue)}
            </div>
            <Slider
              value={[currentValue]}
              onValueChange={([val]) => handleValueChange(val)}
              min={0}
              max={1000000}
              step={STEP}
              className="w-full"
            />
          </div>
        );
      }

      case 'level':
        if (isBetween) {
          const [min, max] = Array.isArray(rule.value) ? rule.value : [1, 19];
          return (
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-sm text-muted-foreground">Min Level</label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => handleValueChange([parseInt(e.target.value) || 1, max])}
                  className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white outline-none"
                  min={1}
                  max={19}
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm text-muted-foreground">Max Level</label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => handleValueChange([min, parseInt(e.target.value) || 19])}
                  className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white outline-none"
                  min={1}
                  max={19}
                />
              </div>
            </div>
          );
        }
        return (
          <input
            type="number"
            value={typeof rule.value === 'number' ? rule.value : 1}
            onChange={(e) => handleValueChange(parseInt(e.target.value) || 1)}
            className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white outline-none text-center"
            min={1}
            max={19}
          />
        );

      case 'flare':
        return (
          <FlareSelector
            value={rule.value as number | [number, number]}
            onChange={(val) => handleValueChange(val)}
            isBetween={isBetween}
            onBetweenChange={(val) => handleValueChange(val)}
            betweenValue={Array.isArray(rule.value) ? rule.value : [1, 10]}
          />
        );

      case 'lamp':
        return (
          <LampSelector
            value={typeof rule.value === 'string' ? rule.value : null}
            onChange={(val) => handleValueChange(val)}
          />
        );

      case 'grade':
        return (
          <Select
            value={typeof rule.value === 'string' ? rule.value : ''}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="w-full h-[44px] rounded-full bg-[#3B3F51] border-0 px-5">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent className="bg-[#3B3F51] border-0">
              {GRADE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'difficulty':
        return (
          <Select
            value={typeof rule.value === 'string' ? rule.value : ''}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="w-full h-[44px] rounded-full bg-[#3B3F51] border-0 px-5">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent className="bg-[#3B3F51] border-0">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'title':
        return (
          <input
            type="text"
            value={typeof rule.value === 'string' ? rule.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="w-full h-[44px] rounded-full bg-[#3B3F51] px-5 text-white placeholder:text-muted-foreground/50 outline-none"
            placeholder="Song title..."
          />
        );

      case 'version':
      case 'era':
        return (
          <input
            type="text"
            value={typeof rule.value === 'string' ? rule.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="w-full h-[44px] rounded-full bg-[#3B3F51] px-5 text-white placeholder:text-muted-foreground/50 outline-none"
            placeholder={`Enter ${rule.type}...`}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-in slide-in-from-top-2 fade-in duration-200 rounded-[10px] bg-[#262937] p-4">
      {/* Description header row with delete button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {generateRuleDescription(rule)}
        </p>
        {showRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2"
          >
            <Icon name="delete" size={20} />
          </Button>
        )}
      </div>

      {/* Type and operator selectors in a row */}
      <div className="flex items-center gap-2 mb-4">
        {/* Type selector */}
        <Select value={rule.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="flex-1 h-[44px] rounded-[10px] bg-[#3B3F51] border-0 px-5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#3B3F51] border-0">
            {FILTER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator selector */}
        <Select value={rule.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="flex-1 h-[44px] rounded-[10px] bg-[#3B3F51] border-0 px-5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#3B3F51] border-0">
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value input */}
      <div>
        {renderValueInput()}
      </div>
    </div>
  );
}
