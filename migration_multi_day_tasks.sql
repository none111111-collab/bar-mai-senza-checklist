-- Bar Mai Senza - Mansioni settimanali su piu' giorni (2026-07-31)
-- Da eseguire una sola volta nel SQL Editor di Supabase (Project > SQL Editor > New query)
--
-- Prima una mansione "settimanale" poteva avere un solo giorno assegnato
-- (day_of_week, un valore singolo). Alcune mansioni pero' vanno fatte piu'
-- volte a settimana (es. stipaggio merci: mercoledi E venerdi), quindi
-- serve un elenco di giorni invece di uno solo.

alter table tasks add column if not exists days_of_week text[];

update tasks set days_of_week = array[day_of_week]
where day_of_week is not null and days_of_week is null;

alter table tasks add constraint days_of_week_valid check (
  days_of_week is null or days_of_week <@ array['lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica']::text[]
);

alter table tasks drop column if exists day_of_week;
