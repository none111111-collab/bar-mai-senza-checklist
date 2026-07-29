-- Bar Mai Senza - Check List online
-- Da eseguire una sola volta nel SQL Editor di Supabase (Project > SQL Editor > New query)

create extension if not exists pgcrypto;

create table if not exists employees (
  id serial primary key,
  name text not null unique,
  sort_order int not null
);

create table if not exists tasks (
  id serial primary key,
  section text not null check (section in ('apertura','pranzo','chiusura','settimanale')),
  day_of_week text check (day_of_week in ('lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica')),
  label text not null,
  sort_order int not null
);

create table if not exists checks (
  id uuid primary key default gen_random_uuid(),
  task_id int not null references tasks(id),
  employee_id int not null references employees(id),
  check_date date not null default current_date,
  status text not null check (status in ('OK','NON OK')),
  reason text,
  created_at timestamptz not null default now(),
  unique (task_id, employee_id, check_date)
);

-- Riga con la data compilata dal titolare/dipendenti (equivalente alla cella DATA: del foglio)
create table if not exists shifts (
  check_date date primary key,
  updated_at timestamptz not null default now()
);

-- --- Seed dipendenti (stesso ordine del foglio originale) ---
insert into employees (name, sort_order) values
  ('Luana', 1), ('Emiliana', 2), ('Oriana', 3), ('Sofia', 4), ('Roman', 5), ('Valentina', 6)
on conflict (name) do nothing;

-- --- Seed mansioni (stesse 35 voci del foglio "Check List") ---
insert into tasks (section, day_of_week, label, sort_order) values
  ('apertura', null, 'Pulizia vetrina', 1),
  ('apertura', null, 'Ricarico brioche', 2),
  ('apertura', null, 'Ricarico frighi', 3),
  ('apertura', null, 'Riordino sala (sedie, tavoli, zuccheri, fazzoletti)', 4),
  ('apertura', null, 'Stoccaggio merci arrivate la mattina', 5),
  ('pranzo', null, 'Pulizia cucina', 6),
  ('pranzo', null, 'Controllo macchine del thè', 7),
  ('pranzo', null, 'Controllo macchina ginseng/orzo', 8),
  ('pranzo', null, 'Controllo macchina caffè americano', 9),
  ('pranzo', null, 'Ricarico tabacchi (sigarette e gratta e vinci)', 10),
  ('pranzo', null, 'Riordino sala (sedie, tavoli, zuccheri, fazzoletti)', 11),
  ('pranzo', null, 'Preparazione spremuta per il giorno dopo', 12),
  ('pranzo', null, 'Preparazione linea aperitivo', 13),
  ('pranzo', null, 'Preparazione panini per il giorno dopo', 14),
  ('pranzo', null, 'Svuotare bidoni', 15),
  ('pranzo', null, 'Ricarico frighi mancanti', 16),
  ('pranzo', null, 'Mettere fuori scatole fornaio', 17),
  ('pranzo', null, 'Pulire posate', 18),
  ('pranzo', null, 'Pulizia bagni (clienti e staff)', 19),
  ('chiusura', null, 'Pulizia macchine', 20),
  ('chiusura', null, 'Alzare sedie', 21),
  ('chiusura', null, 'Spegnimento macchine', 22),
  ('chiusura', null, 'Pulizia e spegnimento lavastoviglie', 23),
  ('chiusura', null, 'Ultimo controllo generale', 24),
  ('chiusura', null, 'Scopa e straccio in tutti gli ambienti', 25),
  ('chiusura', null, 'Chiusura cassa e scontrini', 26),
  ('chiusura', null, '20:00 FINE TURNO', 27),
  ('settimanale', 'lunedi',    'Pulizia approfondita frigoriferi', 28),
  ('settimanale', 'martedi',   'Riordino magazzino', 29),
  ('settimanale', 'mercoledi', 'Pulizia ripiani e bottiglie', 30),
  ('settimanale', 'giovedi',   'Pulizia approfondita bancone', 31),
  ('settimanale', 'venerdi',   'Riordino cassetti bar', 32),
  ('settimanale', 'sabato',    'Pulizia sala approfondita', 33),
  ('settimanale', 'domenica',  'Controllo scadenze prodotti', 34)
on conflict do nothing;

-- --- Row Level Security ---
-- Strumento interno per un piccolo team: niente login personale, ma serve comunque
-- impedire che il sito acceda a query pericolose. Consentiamo lettura pubblica e
-- scrittura solo sulla tabella "checks" (nessuna scrittura su employees/tasks dal client).
alter table employees enable row level security;
alter table tasks enable row level security;
alter table checks enable row level security;
alter table shifts enable row level security;

create policy "public read employees" on employees for select using (true);
create policy "public read tasks" on tasks for select using (true);
create policy "public read checks" on checks for select using (true);
create policy "public insert checks" on checks for insert with check (true);
create policy "public update checks" on checks for update using (true);
create policy "public read shifts" on shifts for select using (true);
create policy "public upsert shifts" on shifts for insert with check (true);
create policy "public update shifts" on shifts for update using (true);
