import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BoardManagerPage from '@/components/boards/BoardManagerPage';
import Spinner from '@atlaskit/spinner';

function useProductByCode(code: string | undefined): { id: string | null; name: string } {
  const { data } = useQuery({
    queryKey: ['product-by-code', code],
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name')
        .eq('code', code!.toUpperCase())
        .maybeSingle();
      return data as { id: string; name: string } | null;
    },
  });
  return { id: data?.id ?? null, name: data?.name ?? code ?? '' };
}

export default function ProductBoardManagerPage() {
  const { key } = useParams<{ key: string }>();
  const { id: productId, name: productName } = useProductByCode(key);

  if (!productId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 32 }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <BoardManagerPage
      projectIdOverride={productId}
      basePath={`/product-hub/${key}/boards`}
      projectName={productName}
      projectKey={key?.toUpperCase()}
    />
  );
}
