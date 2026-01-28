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
import { LevelSelector } from './LevelSelector';
import { GradeSelector } from './GradeSelector';
import { DifficultySelector } from './DifficultySelector';
import {
  FILTER_TYPES,
  OPERATORS_BY_TYPE,
  getDefaultOperator,
  getDefaultValue,
  isValueEmpty,
  type FilterRule,
  type FilterType,
  type FilterOperator,
} from './filterTypes';

function generateRuleDescription(rule: FilterRule): React.ReactNode {
  const typeLabel = FILTER_TYPES.find(t => t.value === rule.type)?.label || rule.type;
  const operators = OPERATORS_BY_TYPE[rule.type];
  const operatorLabel = operators.find(o => o.value === rule.operator)?.label.toLowerCase() || rule.operator;
  
  // Check if value is empty
  if (isValueEmpty(rule.value)) {
    return (
      <>
        {typeLabel} {operatorLabel} <span className="border-b border-muted-foreground inline-block w-8" />
      </>
    );
  }
  
  if (rule.operator === 'is_between' && Array.isArray(rule.value) && rule.value.length === 2) {
    return `${typeLabel} ${operatorLabel} ${rule.value[0]} and ${rule.value[1]}`;
  }
  
  // For multi-select arrays, join with commas
  if (Array.isArray(rule.value)) {
    const displayValue = rule.value.length > 3 
      ? `${rule.value.slice(0, 3).join(', ')}...` 
      : rule.value.join(', ');
    return `${typeLabel} ${operatorLabel} ${displayValue}`;
  }
  
  return `${typeLabel} ${operatorLabel} ${rule.value}`;
}

interface FilterRuleRowProps {
  rule: FilterRule;
  onChange: (rule: FilterRule) => void;
  onRemove: () => void;
  showRemove: boolean;
  allowedTypes?: FilterType[];
}

export function FilterRuleRow({ rule, onChange, onRemove, showRemove, allowedTypes }: FilterRuleRowProps) {
  const operators = OPERATORS_BY_TYPE[rule.type];
  const isBetween = rule.operator === 'is_between';
  
  // Filter available types if allowedTypes is provided
  const availableTypes = allowedTypes 
    ? FILTER_TYPES.filter(t => allowedTypes.includes(t.value))
    : FILTER_TYPES;

  const handleTypeChange = (type: FilterType) => {
    onChange({
      ...rule,
      type,
      operator: getDefaultOperator(type),
      value: getDefaultValue(type),
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    let newValue: FilterRule['value'] = rule.value;
    
    // If switching to is_between, convert to range tuple
    if (operator === 'is_between') {
      if (rule.type === 'score') {
        const currentVal = typeof rule.value === 'number' ? rule.value : 0;
        newValue = [currentVal, currentVal + 100000] as [number, number];
      } else if (rule.type === 'level' || rule.type === 'flare') {
        let baseVal = 1;
        if (Array.isArray(rule.value) && rule.value.length > 0) {
          baseVal = typeof rule.value[0] === 'number' ? rule.value[0] : 1;
        } else if (typeof rule.value === 'number') {
          baseVal = rule.value;
        }
        newValue = [baseVal, Math.min(baseVal + 1, rule.type === 'level' ? 19 : 10)] as [number, number];
      }
    } 
    // If switching from is_between to something else
    else if (rule.operator === 'is_between') {
      if (rule.type === 'score') {
        newValue = Array.isArray(rule.value) ? (rule.value[0] as number) : 0;
      } else if (rule.type === 'level' || rule.type === 'flare') {
        const baseVal = Array.isArray(rule.value) ? (rule.value[0] as number) : 1;
        newValue = [baseVal];
      }
    }
    
    onChange({ ...rule, operator, value: newValue });
  };

  const handleValueChange = (value: FilterRule['value']) => {
    onChange({ ...rule, value });
  };

  const renderValueInput = () => {
    switch (rule.type) {
      case 'score': {
        const STEP = 10000;
        const formatScore = (val: number) => val.toLocaleString();
        const parseScore = (str: string) => {
          const num = parseInt(str.replace(/,/g, ''), 10);
          return isNaN(num) ? 0 : Math.min(1000000, Math.max(0, num));
        };
        
        if (isBetween) {
          const rangeValue = Array.isArray(rule.value) ? rule.value : [0, 1000000];
          const min = typeof rangeValue[0] === 'number' ? rangeValue[0] : 0;
          const max = typeof rangeValue[1] === 'number' ? rangeValue[1] : 1000000;
          
          return (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-muted-foreground">Min Score</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatScore(min)}
                    onChange={(e) => {
                      const newMin = parseScore(e.target.value);
                      handleValueChange([newMin, max] as [number, number]);
                    }}
                    className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white text-center outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-muted-foreground">Max Score</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatScore(max)}
                    onChange={(e) => {
                      const newMax = parseScore(e.target.value);
                      handleValueChange([min, newMax] as [number, number]);
                    }}
                    className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white text-center outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <Slider
                value={[min, max]}
                onValueChange={([newMin, newMax]) => handleValueChange([newMin, newMax] as [number, number])}
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
            <input
              type="text"
              inputMode="numeric"
              value={formatScore(currentValue)}
              onChange={(e) => {
                const newVal = parseScore(e.target.value);
                handleValueChange(newVal);
              }}
              className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white text-center text-lg font-medium outline-none focus:ring-2 focus:ring-primary"
            />
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

      case 'level': {
        // Convert value to the expected format for LevelSelector
        let levelValue: number[] | [number, number];
        if (isBetween) {
          const arr = Array.isArray(rule.value) ? rule.value : [1, 19];
          levelValue = [
            typeof arr[0] === 'number' ? arr[0] : 1,
            typeof arr[1] === 'number' ? arr[1] : 19
          ] as [number, number];
        } else {
          if (Array.isArray(rule.value)) {
            levelValue = rule.value.filter((v): v is number => typeof v === 'number');
          } else if (typeof rule.value === 'number') {
            levelValue = [rule.value];
          } else {
            levelValue = []; // Empty selection
          }
        }
        
        // Use single select for greater_than and less_than operators
        const isSingleSelect = rule.operator === 'greater_than' || rule.operator === 'less_than';
        
        return (
          <LevelSelector
            value={levelValue}
            onChange={handleValueChange}
            isBetween={isBetween}
            singleSelect={isSingleSelect}
          />
        );
      }

      case 'flare': {
        // Convert value to the expected format for FlareSelector
        let flareValue: number[] | [number, number];
        if (isBetween) {
          const arr = Array.isArray(rule.value) ? rule.value : [1, 10];
          flareValue = [
            typeof arr[0] === 'number' ? arr[0] : 1,
            typeof arr[1] === 'number' ? arr[1] : 10
          ] as [number, number];
        } else {
          if (Array.isArray(rule.value)) {
            flareValue = rule.value.filter((v): v is number => typeof v === 'number');
          } else if (typeof rule.value === 'number') {
            flareValue = [rule.value];
          } else {
            flareValue = []; // Empty selection
          }
        }
        
        return (
          <FlareSelector
            value={flareValue}
            onChange={handleValueChange}
            isBetween={isBetween}
          />
        );
      }

      case 'lamp': {
        // Convert value to string array for LampSelector
        let lampValue: string[];
        if (Array.isArray(rule.value)) {
          lampValue = rule.value.filter((v): v is string => typeof v === 'string');
        } else if (typeof rule.value === 'string' && rule.value !== '') {
          lampValue = [rule.value];
        } else {
          lampValue = []; // Empty selection
        }
        
        return (
          <LampSelector
            value={lampValue}
            onChange={handleValueChange}
          />
        );
      }

      case 'grade': {
        // Convert value to string array for GradeSelector
        let gradeValue: string[];
        if (Array.isArray(rule.value)) {
          gradeValue = rule.value.filter((v): v is string => typeof v === 'string');
        } else if (typeof rule.value === 'string' && rule.value !== '') {
          gradeValue = [rule.value];
        } else {
          gradeValue = []; // Empty selection
        }
        
        return (
          <GradeSelector
            value={gradeValue}
            onChange={handleValueChange}
          />
        );
      }

      case 'difficulty': {
        // Convert value to string array for DifficultySelector
        let diffValue: string[];
        if (Array.isArray(rule.value)) {
          diffValue = rule.value.filter((v): v is string => typeof v === 'string');
        } else if (typeof rule.value === 'string' && rule.value !== '') {
          diffValue = [rule.value];
        } else {
          diffValue = []; // Empty selection
        }
        
        return (
          <DifficultySelector
            value={diffValue}
            onChange={handleValueChange}
          />
        );
      }

      case 'title':
        return (
          <input
            type="text"
            value={typeof rule.value === 'string' ? rule.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full h-[44px] rounded-[10px] bg-[#3B3F51] px-5 text-white placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary"
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
            {availableTypes.map((type) => (
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
