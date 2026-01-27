import type { FlareType } from '@/components/ui/FlareChip';
import type { HaloType } from '@/components/ui/HaloChip';

// Filter types
export type FilterType = 
  | 'score' 
  | 'level' 
  | 'grade' 
  | 'lamp' 
  | 'difficulty' 
  | 'title' 
  | 'flare' 
  | 'version' 
  | 'era';

export type FilterOperator = 
  | 'is' 
  | 'is_not' 
  | 'less_than' 
  | 'greater_than' 
  | 'is_between' 
  | 'contains';

export interface FilterRule {
  id: string;
  type: FilterType;
  operator: FilterOperator;
  value: string | number | [number, number];
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  rules: FilterRule[];
  matchMode: 'all' | 'any';
  created_at: string;
}

// Filter type configurations
export const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'level', label: 'Level' },
  { value: 'grade', label: 'Grade' },
  { value: 'lamp', label: 'Lamp' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'title', label: 'Title' },
  { value: 'flare', label: 'Flare' },
  { value: 'version', label: 'Version' },
  { value: 'era', label: 'Era' },
];

// Operators by filter type
export const OPERATORS_BY_TYPE: Record<FilterType, { value: FilterOperator; label: string }[]> = {
  score: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'is_between', label: 'Is between' },
  ],
  level: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'is_between', label: 'Is between' },
  ],
  flare: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'is_between', label: 'Is between' },
  ],
  grade: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
  ],
  lamp: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
  ],
  difficulty: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
  ],
  title: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'contains', label: 'Contains' },
  ],
  version: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
  ],
  era: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
  ],
};

// Grade options
export const GRADE_OPTIONS = [
  { value: 'AAA', label: 'AAA' },
  { value: 'AA+', label: 'AA+' },
  { value: 'AA', label: 'AA' },
  { value: 'AA-', label: 'AA-' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
];

// Lamp options (with visual chip support)
export const LAMP_OPTIONS: { value: string; label: string; haloType?: HaloType }[] = [
  { value: 'mfc', label: 'MFC', haloType: 'mfc' },
  { value: 'pfc', label: 'PFC', haloType: 'pfc' },
  { value: 'gfc', label: 'GFC', haloType: 'gfc' },
  { value: 'fc', label: 'FC', haloType: 'fc' },
  { value: 'life4', label: 'LIFE4', haloType: 'life4' },
  { value: 'clear', label: 'Clear' },
  { value: 'fail', label: 'Fail' },
];

// Difficulty options
export const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'DIFFICULT', label: 'Difficult' },
  { value: 'EXPERT', label: 'Expert' },
  { value: 'CHALLENGE', label: 'Challenge' },
];

// Flare options (using FlareChip graphics)
export const FLARE_OPTIONS: { value: number; flareType: FlareType }[] = [
  { value: 10, flareType: 'ex' },
  { value: 9, flareType: 'ix' },
  { value: 8, flareType: 'viii' },
  { value: 7, flareType: 'vii' },
  { value: 6, flareType: 'vi' },
  { value: 5, flareType: 'v' },
  { value: 4, flareType: 'iv' },
  { value: 3, flareType: 'iii' },
  { value: 2, flareType: 'ii' },
  { value: 1, flareType: 'i' },
];

// Helper to generate a unique rule ID
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to get default operator for a filter type
export function getDefaultOperator(type: FilterType): FilterOperator {
  return OPERATORS_BY_TYPE[type][0].value;
}

// Helper to get default value for a filter type
export function getDefaultValue(type: FilterType): string | number {
  switch (type) {
    case 'score':
      return 900000;
    case 'level':
      return 15;
    case 'flare':
      return 5;
    case 'grade':
      return 'AAA';
    case 'lamp':
      return 'pfc';
    case 'difficulty':
      return 'EXPERT';
    case 'title':
      return '';
    case 'version':
      return '';
    case 'era':
      return '';
    default:
      return '';
  }
}

// Auto-generate filter name from rules
export function generateFilterName(rules: FilterRule[]): string {
  if (rules.length === 0) return 'New Filter';
  
  const firstRule = rules[0];
  const operatorLabel = OPERATORS_BY_TYPE[firstRule.type]
    .find(op => op.value === firstRule.operator)?.label ?? firstRule.operator;
  
  let valueLabel: string;
  if (firstRule.type === 'flare') {
    const flareOption = FLARE_OPTIONS.find(f => f.value === firstRule.value);
    valueLabel = flareOption?.flareType.toUpperCase() ?? String(firstRule.value);
  } else if (Array.isArray(firstRule.value)) {
    valueLabel = `${firstRule.value[0]}-${firstRule.value[1]}`;
  } else {
    valueLabel = String(firstRule.value);
  }
  
  const typeLabel = FILTER_TYPES.find(t => t.value === firstRule.type)?.label ?? firstRule.type;
  const baseName = `${typeLabel} ${operatorLabel} ${valueLabel}`;
  
  if (rules.length > 1) {
    return `${baseName} + ${rules.length - 1} more`;
  }
  
  return baseName;
}
