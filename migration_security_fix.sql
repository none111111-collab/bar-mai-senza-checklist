-- Bar Mai Senza - Fix sicurezza (2026-07-31)
-- Da eseguire una sola volta nel SQL Editor di Supabase (Project > SQL Editor > New query)
--
-- Problema: la colonna birth_code (il codice personale a 4 cifre dei
-- dipendenti) era leggibile da chiunque avesse la anon key pubblica,
-- anche se il sito non la mostra mai. Bastava interrogare direttamente
-- l'API del database per leggere tutti i codici.
--
-- Soluzione: togliamo il permesso di leggere quella colonna a chi non ha
-- fatto login (anon), e spostiamo il controllo "il codice X corrisponde a
-- quale dipendente?" dentro una funzione del database che gira con
-- permessi elevati (security definer) e restituisce solo id/nome/ordine,
-- mai il codice stesso.

revoke select on employees from anon;
grant select (id, name, sort_order, active) on employees to anon;

create or replace function match_employee_code(p_code text)
returns table(id int, name text, sort_order int)
language sql
security definer
set search_path = public
as $$
  select id, name, sort_order from employees
  where birth_code = p_code and active = true
  limit 1;
$$;

revoke all on function match_employee_code(text) from public;
grant execute on function match_employee_code(text) to anon, authenticated;
