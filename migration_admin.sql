-- Aggiunge supporto per: codice compleanno dipendenti, disattivazione
-- soft (invece di cancellare, cosi la cronologia dei controlli passati
-- resta intatta), e protezione delle operazioni di amministrazione
-- dietro un vero login (Supabase Auth), cosi solo il titolare puo'
-- aggiungere/rimuovere dipendenti e mansioni.

alter table employees add column if not exists birth_code text;
alter table employees add column if not exists active boolean not null default true;
alter table tasks add column if not exists active boolean not null default true;

-- Le policy di sola lettura pubblica devono mostrare solo le voci attive
drop policy if exists "public read employees" on employees;
create policy "public read employees" on employees for select using (active = true);

drop policy if exists "public read tasks" on tasks;
create policy "public read tasks" on tasks for select using (active = true);

-- Scrittura su employees/tasks consentita SOLO a chi ha fatto login
-- (cioe' solo il titolare, che sara' l'unico account creato in Supabase Auth)
create policy "admin write employees" on employees for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin write tasks" on tasks for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
