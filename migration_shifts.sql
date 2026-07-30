-- Turno di lavoro (dalle/alle) che ogni dipendente registra quando accede
-- con il proprio codice, usato per il resoconto orario settimanale.
create table if not exists employee_shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id int not null references employees(id),
  work_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

alter table employee_shifts enable row level security;

create policy "public read employee_shifts" on employee_shifts for select using (true);
create policy "public insert employee_shifts" on employee_shifts for insert with check (true);
create policy "public update employee_shifts" on employee_shifts for update using (true);
