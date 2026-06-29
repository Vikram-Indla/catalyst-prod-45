import Select from '@atlaskit/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QuarterOption {
  value: string;
  label: string;
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
}

export function QuarterSelect({ value, onChange, placeholder = 'Select quarter', isDisabled, inputId }: QuarterSelectProps) {
  const { data: options = [], isLoading } = useFiscalQuarters();
  const selected = options.find(o => o.value === value) ?? null;

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
    />
  );
}
