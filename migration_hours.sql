-- Ore lavorate per dipendente, usate per calcolare il rapporto di
-- completezza (punti task completate / ore lavorate) nella classifica
-- del pannello titolare. Il titolare inserisce/aggiorna il valore a mano
-- dal pannello admin.
alter table employees add column if not exists hours_worked numeric not null default 0;
