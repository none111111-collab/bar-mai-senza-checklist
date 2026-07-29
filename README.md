# Bar Mai Senza - Check List online

Versione web della check list, con Supabase come backend gratuito (database + API)
e GitHub Pages come hosting gratuito.

- `index.html` - pagina che aprono i dipendenti da telefono per compilare la check list del giorno
- `dashboard.html` - pagina "Resoconto Titolare" con i totali in tempo reale
- `schema.sql` - struttura del database da eseguire una volta sola su Supabase
- `config.js` - qui vanno incollate le chiavi del tuo progetto Supabase

## 1. Crea il progetto Supabase (gratis)

1. Vai su https://supabase.com e crea un account / accedi.
2. "New project" -> scegli un nome (es. "bar-mai-senza") e una password per il database (salvala da parte, serve solo a te).
3. Aspetta che il progetto sia pronto (circa 1-2 minuti).

## 2. Crea le tabelle

1. Nel progetto, apri **SQL Editor** (menu a sinistra) -> **New query**.
2. Incolla tutto il contenuto del file `schema.sql` di questa cartella e premi **Run**.
3. Controlla in **Table Editor** che siano comparse le tabelle `employees`, `tasks`, `checks`, `shifts`.

## 3. Prendi le chiavi API

1. Vai su **Project Settings** (icona ingranaggio) -> **API**.
2. Copia **Project URL** e la chiave **anon public**.
3. Apri `config.js` in questa cartella e incolla i due valori al posto di
   `INCOLLA_QUI_IL_TUO_PROJECT_URL` e `INCOLLA_QUI_LA_TUA_ANON_KEY`.

La chiave "anon" e' pensata per stare nel codice pubblico del sito (non e' un segreto
come la password del database): la protezione vera e' nelle regole di Row Level Security
gia' incluse in `schema.sql`.

## 4. Metti il sito online con GitHub Pages (gratis)

1. Crea un nuovo repository su GitHub (pubblico, va bene anche vuoto).
2. Carica tutti i file di questa cartella nel repository (via `git push` o trascinandoli
   dall'interfaccia web di GitHub).
3. Nel repository: **Settings -> Pages -> Source: Deploy from a branch -> main / (root)** -> Save.
4. Dopo un paio di minuti GitHub ti dara' un link tipo:
   `https://tuonomeutente.github.io/nome-repository/`

## 5. Condividi i link

- Ai dipendenti: `https://tuonomeutente.github.io/nome-repository/index.html`
  (la prima volta scelgono il proprio nome, poi il telefono se lo ricorda)
- A te (titolare): `https://tuonomeutente.github.io/nome-repository/dashboard.html`

## Nota sulla sicurezza

E' uno strumento interno pensato per un piccolo team fidato: chi ha il link puo'
scrivere le proprie voci di check list, ma non puo' modificare l'elenco delle mansioni
o dei dipendenti (quello si fa solo da Supabase). Non c'e' un vero login personale -
se in futuro serve, si puo' aggiungere l'autenticazione via email di Supabase.
