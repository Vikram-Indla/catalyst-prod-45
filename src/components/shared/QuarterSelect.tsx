import Select from '@atlaskit/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QuarterOption {
  value: string;
  label: string;
}

function getCurrentQuarterLabel(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function useFiscalQuarters() {
  return useQuery<QuarterOption[]>({
    queryKey: ['fiscal-quarters-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_quarters')
        .select('label, sort_order, year, quarter_num')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (!data?.length) console.warn('[QuarterSelect] fiscal_quarters returned empty — check table + RLS');
      return (data ?? []).map(q => ({ value: q.label, label: q.label }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

interface QuarterSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  inputId?: string;
  defaultCurrentQuarter?: boolean;
}

export function QuarterSelect({ value, onChange, placeholder = 'Select quarter', isDisabled, inputId, defaultCurrentQuarter }: QuarterSelectProps) {
  const { data: options = [], isLoading } = useFiscalQuarters();

  const resolvedValue = (value == null && defaultCurrentQuarter)
    ? getCurrentQuarterLabel()
    : value;

  const selected = options.find(o => o.value === resolvedValue) ?? null;

  return (
    <Select<QuarterOption>
      inputId={inputId}
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt ? opt.value : null)}
      placeholder={placeholder}
      isDisabled={isDisabled || isLoading}
      isLoading={isLoading}
      isClearable
      menuPortalTarget={document.body}
      menuPosition="fixed"
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
        option: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
        singleValue: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
        input: (base) => ({ ...base, fontSize: 'var(--ds-font-size-400)' }),
      }}
    />
  );
}
