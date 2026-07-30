-- Ore lavorate per dipendente PER MESE (non piu' un unico numero fisso),
-- necessario per calcolare la classifica del premio mensile su qualsiasi
-- mese passato o presente.

create table if not exists employee_hours (
  employee_id int not null references employees(id),
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  hours numeric not null default 0,
  primary key (employee_id, year_month)
);

alter table employee_hours enable row level security;

-- Lettura pubblica (serve al pannello di controllo per calcolare la classifica)
create policy "public read employee_hours" on employee_hours for select using (true);

-- Scrittura solo dal titolare autenticato (stesso principio di employees/tasks)
create policy "admin write employee_hours" on employee_hours for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- La vecchia colonna singola non serve piu': il monte ore ora e' per mese.
alter table employees drop column if exists hours_worked;
