import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
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
      case 'score':
        if (isBetween) {
          const [min, max] = Array.isArray(rule.value) ? rule.value : [0, 1000000];
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={min}
                onChange={(e) => handleValueChange([parseInt(e.target.value) || 0, max])}
                className="w-28 bg-[#3B3F51] border-0"
                min={0}
                max={1000000}
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                value={max}
                onChange={(e) => handleValueChange([min, parseInt(e.target.value) || 0])}
                className="w-28 bg-[#3B3F51] border-0"
                min={0}
                max={1000000}
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={typeof rule.value === 'number' ? rule.value : 0}
            onChange={(e) => handleValueChange(parseInt(e.target.value) || 0)}
            className="w-32 bg-[#3B3F51] border-0"
            min={0}
            max={1000000}
          />
        );

      case 'level':
        if (isBetween) {
          const [min, max] = Array.isArray(rule.value) ? rule.value : [1, 19];
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={min}
                onChange={(e) => handleValueChange([parseInt(e.target.value) || 1, max])}
                className="w-16 bg-[#3B3F51] border-0"
                min={1}
                max={19}
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                value={max}
                onChange={(e) => handleValueChange([min, parseInt(e.target.value) || 19])}
                className="w-16 bg-[#3B3F51] border-0"
                min={1}
                max={19}
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={typeof rule.value === 'number' ? rule.value : 1}
            onChange={(e) => handleValueChange(parseInt(e.target.value) || 1)}
            className="w-20 bg-[#3B3F51] border-0"
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
            <SelectTrigger className="w-28 bg-[#3B3F51] border-0">
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
            <SelectTrigger className="w-36 bg-[#3B3F51] border-0">
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
          <Input
            type="text"
            value={typeof rule.value === 'string' ? rule.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="flex-1 bg-[#3B3F51] border-0"
            placeholder="Song title..."
          />
        );

      case 'version':
      case 'era':
        return (
          <Input
            type="text"
            value={typeof rule.value === 'string' ? rule.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="flex-1 bg-[#3B3F51] border-0"
            placeholder={`Enter ${rule.type}...`}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-3 rounded-[10px] bg-[#3B3F51] p-4">
      <div className="flex items-start gap-2">
        {/* Type selector */}
        <Select value={rule.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-28 bg-[#2A2D3A] border-0">
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
          <SelectTrigger className="w-32 bg-[#2A2D3A] border-0">
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

        {/* Remove button */}
        {showRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Icon name="close" size={20} />
          </Button>
        )}
      </div>

      {/* Value input */}
      <div className="pt-1">
        {renderValueInput()}
      </div>
    </div>
  );
}
