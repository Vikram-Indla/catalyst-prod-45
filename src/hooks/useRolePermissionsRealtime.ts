 import { useEffect } from 'react';
 import { useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 /**
  * Real-time subscription hook for product_role_permissions table.
  * Automatically syncs permission matrix changes across all users.
  */
 export function useRolePermissionsRealtime() {
   const queryClient = useQueryClient();
 
   useEffect(() => {
     const channel = supabase
       .channel('role-permissions-realtime')
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'product_role_permissions',
         },
         () => {
           // Invalidate all permission-related queries
           queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
           queryClient.invalidateQueries({ queryKey: ['all-role-permissions'] });
           queryClient.invalidateQueries({ queryKey: ['effective-product-permissions'] });
         }
       )
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'user_product_roles',
         },
         () => {
           // When users are assigned to roles, refresh their permissions
           queryClient.invalidateQueries({ queryKey: ['effective-product-permissions'] });
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [queryClient]);
 }