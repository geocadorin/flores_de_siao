-- ============================================================
-- SEED DATA - Flores de Sião (Dados fictícios para desenvolvimento) 
-- ============================================================
-- Executar: psql < supabase/seed.sql
-- ============================================================
-- Requer Nível Avançado de conhecimento em SQL: Use esse sql para popular o banco de dados com dados fictícios para desenvolvimento
-- Alterar 58ef8607-5eb9-4e0b-a883-254dfcbfe20a pelo id do tenant do seu usuário

-- TENANT
INSERT INTO public.tenants (id, name, slug, phone, address, hero_title, hero_description)
VALUES (
  '58ef8607-5eb9-4e0b-a883-254dfcbfe20a',
  'Clínica Beleza Pura',
  'beleza-pura',
  '(11) 99999-0001',
  'Av. Paulista, 1000 - São Paulo/SP',
  'Sua beleza merece o melhor cuidado',
  'Tratamentos estéticos personalizados com profissionais especializados.'
) ON CONFLICT (id) DO NOTHING;

-- TENANT SETTINGS
INSERT INTO public.tenant_settings (id, tenant_id, allow_registration)
VALUES ('7859d9d6-9323-4f65-b097-d719ca466efc', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', true)
ON CONFLICT (id) DO NOTHING;

-- PROFILES (admin + staff)
-- Nota: 'admin' e 'staff' são papéis válidos na constraint profiles_role_check.
INSERT INTO public.profiles (id, user_id, tenant_id, full_name, role, phone) VALUES
  ('b50b26cc-dc70-496f-b89e-027e053b3d20', '7859d9d6-9323-4f65-b097-d719ca466efc', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Maria Silva', 'admin', NULL),
  ('c0000000-0000-0000-0000-000000000002', NULL, '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Beatriz Oliveira', 'staff', '(11) 99999-1002'),
  ('c0000000-0000-0000-0000-000000000003', NULL, '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Camila Santos', 'staff', '(11) 99999-1003')
ON CONFLICT (id) DO NOTHING;

-- SERVICES
INSERT INTO public.services (id, tenant_id, name, description, duration_minutes, price, active) VALUES
  ('e0000000-0000-0000-0000-000000000001', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Limpeza de Pele',        'Limpeza profunda com extração e máscara hidratante', 60, 180.00, true),
  ('e0000000-0000-0000-0000-000000000002', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Peeling Químico',        'Renovação celular com ácidos dermatológicos', 45, 250.00, true),
  ('e0000000-0000-0000-0000-000000000003', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Microagulhamento',       'Estímulo de colágeno com dermaroller', 90, 350.00, true),
  ('e0000000-0000-0000-0000-000000000004', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Harmonização Facial',    'Procedimento com ácido hialurônico', 120, 1200.00, true),
  ('e0000000-0000-0000-0000-000000000005', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Drenagem Linfática',     'Massagem manual para redução de inchaço', 60, 150.00, true),
  ('e0000000-0000-0000-0000-000000000006', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Botox',                  'Toxina botulínica para suavizar linhas de expressão', 30, 800.00, true),
  ('e0000000-0000-0000-0000-000000000007', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Hidratação Facial',      'Máscara hidratante com vitamina C', 45, 120.00, true)
ON CONFLICT (id) DO NOTHING;

-- CLIENTS
INSERT INTO public.clients (id, tenant_id, full_name, phone, email, notes) VALUES
  ('f0000000-0000-0000-0000-000000000001', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Juliana Ferreira',   '(11) 98765-0001', 'juliana@email.com',   'Pele sensível, alergia a parabenos'),
  ('f0000000-0000-0000-0000-000000000002', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Mariana Costa',      '(11) 98765-0002', 'mariana@email.com',   'Cliente fiel desde 2024'),
  ('f0000000-0000-0000-0000-000000000003', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Fernanda Lima',      '(11) 98765-0003', 'fernanda@email.com',  NULL),
  ('f0000000-0000-0000-0000-000000000004', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Patricia Mendes',    '(11) 98765-0004', 'patricia@email.com',  'Prefere horários à tarde'),
  ('f0000000-0000-0000-0000-000000000005', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Roberta Almeida',    '(11) 98765-0005', 'roberta@email.com',   'Gestante - verificar contraindicações'),
  ('f0000000-0000-0000-0000-000000000006', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Luciana Barbosa',    '(11) 98765-0006', 'luciana@email.com',   NULL),
  ('f0000000-0000-0000-0000-000000000007', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Carla Rodrigues',    '(11) 98765-0007', 'carla@email.com',     'Indicação da Juliana'),
  ('f0000000-0000-0000-0000-000000000008', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Amanda Souza',       '(11) 98765-0008', 'amanda@email.com',    NULL),
  ('f0000000-0000-0000-0000-000000000009', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Isabela Martins',    '(11) 98765-0009', 'isabela@email.com',   'Primeira sessão de peeling'),
  ('f0000000-0000-0000-0000-000000000010', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Renata Vieira',      '(11) 98765-0010', 'renata@email.com',    NULL)
ON CONFLICT (id) DO NOTHING;

-- PACKAGES
INSERT INTO public.packages (id, tenant_id, service_id, name, total_sessions, price, active) VALUES
  ('10000000-0000-0000-0000-000000000001', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'e0000000-0000-0000-0000-000000000001', 'Pacote Limpeza 5x',        5,  800.00, true),
  ('10000000-0000-0000-0000-000000000002', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'e0000000-0000-0000-0000-000000000003', 'Pacote Microagulhamento 4x', 4, 1200.00, true),
  ('10000000-0000-0000-0000-000000000003', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'e0000000-0000-0000-0000-000000000005', 'Pacote Drenagem 10x',      10, 1200.00, true)
ON CONFLICT (id) DO NOTHING;

-- CLIENT PACKAGES
INSERT INTO public.client_packages (id, tenant_id, client_id, package_id, sessions_total, sessions_used, status) VALUES
  ('11000000-0000-0000-0000-000000000001', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'f0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 5, 2, 'active'),
  ('11000000-0000-0000-0000-000000000002', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'f0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 10, 4, 'active'),
  ('11000000-0000-0000-0000-000000000003', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 4, 4, 'completed')
ON CONFLICT (id) DO NOTHING;

-- STAFF BUSINESS HOURS
INSERT INTO public.business_hours (id, tenant_id, staff_id, day_of_week, start_time, end_time, active) VALUES
  ('12000000-0000-0000-0000-000000000001', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'b50b26cc-dc70-496f-b89e-027e053b3d20', 1, '09:00', '18:00', true),
  ('12000000-0000-0000-0000-000000000002', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'b50b26cc-dc70-496f-b89e-027e053b3d20', 2, '09:00', '18:00', true),
  ('12000000-0000-0000-0000-000000000003', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'b50b26cc-dc70-496f-b89e-027e053b3d20', 3, '09:00', '18:00', true),
  ('12000000-0000-0000-0000-000000000004', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'b50b26cc-dc70-496f-b89e-027e053b3d20', 4, '09:00', '18:00', true),
  ('12000000-0000-0000-0000-000000000005', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'b50b26cc-dc70-496f-b89e-027e053b3d20', 5, '09:00', '18:00', true),
  ('12000000-0000-0000-0000-000000000006', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000002', 1, '10:00', '19:00', true),
  ('12000000-0000-0000-0000-000000000007', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000002', 2, '10:00', '19:00', true),
  ('12000000-0000-0000-0000-000000000008', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000002', 3, '10:00', '19:00', true),
  ('12000000-0000-0000-0000-000000000009', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000002', 4, '10:00', '19:00', true),
  ('12000000-0000-0000-0000-000000000010', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000002', 5, '10:00', '19:00', true),
  ('12000000-0000-0000-0000-000000000011', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000003', 1, '08:00', '14:00', true),
  ('12000000-0000-0000-0000-000000000012', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000003', 3, '08:00', '14:00', true),
  ('12000000-0000-0000-0000-000000000013', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000003', 5, '08:00', '14:00', true),
  ('12000000-0000-0000-0000-000000000014', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000003', 6, '09:00', '13:00', true)
ON CONFLICT (id) DO NOTHING;

-- STAFF SERVICES
INSERT INTO public.staff_services (id, tenant_id, staff_id, service_id) VALUES
  ('13000000-0000-0000-0000-000000000001', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'b50b26cc-dc70-496f-b89e-027e053b3d20', 'e0000000-0000-0000-0000-000000000001'),
  ('13000000-0000-0000-0000-000000000002', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'b50b26cc-dc70-496f-b89e-027e053b3d20', 'e0000000-0000-0000-0000-000000000002'),
  ('13000000-0000-0000-0000-000000000008', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001'),
  ('13000000-0000-0000-0000-000000000012', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000005')
ON CONFLICT (id) DO NOTHING;

-- FINANCIAL CATEGORIES
INSERT INTO public.financial_categories (id, tenant_id, name, type) VALUES
  ('15000000-0000-0000-0000-000000000001', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Consulta',          'income'),
  ('15000000-0000-0000-0000-000000000002', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Sessão',            'income'),
  ('15000000-0000-0000-0000-000000000004', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'Material',          'expense')
ON CONFLICT (id) DO NOTHING;

-- APPOINTMENTS
INSERT INTO public.appointments (id, tenant_id, client_id, service_id, staff_id, scheduled_at, duration_minutes, status) VALUES
  ('16000000-0000-0000-0000-000000000006', '58ef8607-5eb9-4e0b-a883-254dfcbfe20a', 'f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', 'b50b26cc-dc70-496f-b89e-027e053b3d20', CURRENT_DATE + TIME '10:00', 60, 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIM DO SEED
-- ============================================================
