import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      return data as {
        total_clients: number;
        appointments_today: number;
        appointments_week: number;
        active_packages: number;
        upcoming_appointments: Array<{
          id: string;
          scheduled_at: string;
          status: string;
          duration_minutes: number;
          client_name: string;
          client_phone: string;
          service_name: string;
        }>;
      };
    },
  });
}

export function useClients() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { full_name: string; phone?: string; email?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...input, tenant_id: profile!.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useServices() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; duration_minutes: number; price: number }) => {
      const { data, error } = await supabase
        .from('services')
        .insert({ ...input, tenant_id: profile!.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function usePackages() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*, services(name)')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; service_id: string; total_sessions: number; price: number }) => {
      const { data, error } = await supabase
        .from('packages')
        .insert({ ...input, tenant_id: profile!.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });
}

export function useClientPackages(clientId?: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['client-packages', clientId],
    queryFn: async () => {
      let query = supabase
        .from('client_packages')
        .select('*, packages(name, total_sessions, services(name)), clients(full_name)')
        .eq('status', 'active');
      if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query.order('purchased_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

export function useCreateClientPackage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { client_id: string; package_id: string; sessions_total: number }) => {
      const { data, error } = await supabase
        .from('client_packages')
        .insert({ ...input, tenant_id: profile!.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-packages'] }),
  });
}

export function useAppointments() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, clients(full_name, phone), services(name)')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      service_id: string;
      scheduled_at: string;
      duration_minutes: number;
      client_package_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert({ ...input, tenant_id: profile!.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useCompleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['client-packages'] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
