# Bar Mai Senza - Check List online

Versione web della check list, con Supabase come backend gratuito (database + API)
e GitHub Pages come hosting gratuito.

- `index.html` - pagina che aprono i dipendenti da telefono, accesso con codice personale (giorno+mese di nascita)
- `dashboard.html` - pagina "Resoconto Titolare" con i totali in tempo reale (pubblica, nessun dato sensibile)
- `admin.html` - pannello titolare: aggiungi/rimuovi dipendenti e mansioni, protetto da vero login
- `schema.sql` - struttura iniziale del database
- `migration_admin.sql` - aggiunge il codice dipendenti e la protezione del pannello titolare
- `config.js` - chiavi del progetto Supabase (gia' compilato per questo progetto)

## Accesso dipendenti

Ogni dipendente digita il proprio codice personale (per default giorno+mese di
nascita, es. 1503 per il 15 marzo) su `index.html`. Il codice si imposta dal
pannello titolare (`admin.html`), non e' modificabile dal dipendente stesso, quindi
nessuno puo' spacciarsi per un collega.

## Pannello titolare

`admin.html` richiede email e password (account Supabase Auth dedicato, creato
una volta sola). Da li' si possono:
- aggiungere o disattivare dipendenti e assegnare/cambiare il loro codice
- aggiungere o disattivare mansioni della check list
- eliminare definitivamente una voce (lo storico dei controlli gia' fatti resta comunque salvato)

## Sicurezza

- I dipendenti possono solo scrivere le proprie voci di check list (`checks`), mai
  modificare l'elenco di dipendenti o mansioni.
- Solo l'account autenticato nel pannello titolare puo' scrivere su `employees` e `tasks`
  (regole di Row Level Security in `migration_admin.sql`).
- Il codice personale (`birth_code`) non viene mai restituito dalle pagine pubbliche
  (dashboard, lista dipendenti): e' leggibile solo durante il login con il codice esatto,
  o dal pannello titolare autenticato.
- Essendo un codice a 4 cifre (GGMM), non e' una protezione fortissima contro un
  tentativo deliberato e sistematico - e' pensato per impedire lo scambio "per sbaglio
  o comodita'" tra colleghi, non come sicurezza bancaria.

## Se serve ripartire da zero su un nuovo progetto Supabase

1. Crea il progetto su supabase.com, esegui `schema.sql` poi `migration_admin.sql` nello SQL Editor.
2. Project Settings -> API: copia Project URL e anon key in `config.js`.
3. Crea l'utente titolare in Authentication -> Users -> Add user (email + password).
4. Pubblica su GitHub Pages: Settings -> Pages -> Source: Deploy from a branch -> main/(root).
