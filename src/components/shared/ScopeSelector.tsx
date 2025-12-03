import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ScopeSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ScopeSelector({ value, onChange, placeholder = "Select Portfolio" }: ScopeSelectorProps) {
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {portfolios?.filter(portfolio => portfolio.id && portfolio.id.trim() !== '').map((portfolio) => (
          <SelectItem key={portfolio.id} value={portfolio.id}>
            {portfolio.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
