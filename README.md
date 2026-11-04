# Salute – registro personale di salute e allenamento

App web personale, in italiano, pensata per lo smartphone Android: pulsanti grandi, funziona anche **senza internet** e si installa sulla schermata home come una vera app.

> **Strumento personale di registrazione, non fornisce consigli medici. Prima di iniziare allenamenti ad alta intensità consulta il medico.**

**Privacy:** tutti i tuoi dati restano **solo nel telefono** (nella memoria del browser). Non c'è nessun server, nessun invio di dati a terzi e nessuna libreria scaricata da internet: il repository contiene solo il codice dell'app, **mai dati personali**.

## Cosa c'è dentro

| Sezione | Cosa fa |
|---|---|
| **Home** | Cosa tocca oggi, ultimo peso e tendenza, passi e allenamenti della settimana |
| **Timer** | Intervalli con riscaldamento, lavoro/recupero, serie, defaticamento; 6 livelli graduali; voce, suoni, vibrazione, schermo sempre acceso; diario e grafico dei progressi |
| **Forza** | Registro serie × ripetizioni × carico (thruster, trazioni e varianti, esercizi tuoi), calendario settimanale, suggerimento di progressione |
| **Peso** | Peso e vita, media mobile a 7 giorni, ritmo reale contro obiettivo, data prevista di arrivo |
| **Cibo** | Importa i CSV di Cronometer: report settimanale e mensile di calorie, macro, micronutrienti |
| **Altro → Attività** | Importa i CSV di Mi Fitness (Xiaomi): passi, frequenza cardiaca, sonno, allenamenti |
| **Altro → Riepilogo** | Riepilogo settimanale da stampare o salvare in PDF |
| **Altro → Impostazioni** | Obiettivi, preferenze, backup e ripristino |

---

## 1. Attivare GitHub Pages (una volta sola)

1. Apri il repository su GitHub dal computer (o dal browser del telefono in modalità "sito desktop").
2. Vai in **Settings** (Impostazioni) → nel menu a sinistra **Pages**.
3. Sotto **Build and deployment** → **Source** scegli **Deploy from a branch**.
4. Sotto **Branch** scegli **main** e la cartella **/ (root)**, poi premi **Save**.
5. Aspetta 1-2 minuti e ricarica la pagina: in alto comparirà l'indirizzo del sito, di solito
   `https://TUO-NOME-UTENTE.github.io/Salute/`.

L'app funziona solo se questa pagina è stata pubblicata dal ramo `main`: se hai appena ricevuto le modifiche in una pull request, ricordati di **unirla (merge) in main**.

> Quando il codice cambia, GitHub Pages si aggiorna da solo. Sul telefono la nuova versione compare alla **seconda apertura** dell'app (la prima apertura scarica l'aggiornamento in silenzio).

## 2. Installare l'app sul telefono Android

1. Apri **Chrome** sul telefono e vai all'indirizzo del sito (vedi sopra).
2. Tocca i **tre puntini** in alto a destra.
3. Scegli **Installa app** (oppure **Aggiungi a schermata Home**).
4. Conferma. Sulla schermata home comparirà l'icona verde con la linea del battito.
5. Aprila una volta con internet attivo: da quel momento funziona anche **offline**.

Consigli per il timer:
- Tieni il volume del telefono alzato (suoni e voce italiana dipendono dal volume multimediale).
- Lo schermo resta acceso da solo mentre il timer è in funzione (se il telefono lo consente).
- La voce usa le voci italiane installate sul telefono (Impostazioni Android → Sistema → Lingue → Sintesi vocale).

## 3. Come esportare i dati da Cronometer

1. Accedi a **cronometer.com** dal computer (l'esportazione è sul sito web, non nell'app del telefono).
2. Vai su **More → Account → Export Data** (in alcune versioni: *Account → Export Data*).
3. Scegli l'intervallo di date e scarica i file che ti servono:
   - **Daily Nutrition** (il riepilogo giornaliero, `dailysummary.csv`) → è il più importante, serve per i report;
   - **Servings** (gli alimenti), **Biometrics** (peso, vita, ecc.), **Exercises** (esercizi): facoltativi.
4. Porta i file CSV sul telefono (cavo USB, Google Drive, email a te stesso…).
5. Nell'app apri **Cibo → Scegli file CSV** e seleziona uno o più file insieme: il tipo viene riconosciuto da solo.

Puoi reimportare lo stesso file più volte: i giorni già presenti vengono aggiornati, non duplicati. I pesi e le misure vita da Biometrics vengono aggiunti solo nei giorni in cui non hai già un dato.

Nella cartella `esempi/` trovi file **inventati** per provare l'app (`cronometer_*.csv`).

## 4. Come esportare i dati da Xiaomi (Mi Fitness)

1. Dal telefono o dal computer vai su **privacy.mi.com** e accedi al tuo account Xiaomi.
2. Scegli **Richiedi i tuoi dati** (Request your data) e seleziona i dati di **Mi Fitness / Zepp Life / Xiaomi Health** (nomi e posizione possono cambiare nel tempo).
3. Xiaomi ti manderà (anche dopo qualche giorno) un'email con un **archivio ZIP**. Scaricalo e decomprimilo.
4. Dentro ci sono diversi file **CSV** (passi, frequenza cardiaca, sonno, allenamenti…). I nomi variano: apri i file con un editor di testo per capire cosa contengono.
5. Nell'app apri **Altro → Attività**, tocca il tipo di dati (es. *Passi*) e scegli il file.
6. Compare la **schermata di mappatura**: per ogni voce (data, passi, ecc.) scegli la colonna giusta del tuo file. Controlla l'anteprima delle prime righe. Premi **Importa**.
7. L'app **ricorda la mappatura**: la prossima volta, con un file dello stesso formato, non dovrai sceglierla di nuovo.

Se le date risultano sbagliate o nessuna riga viene importata, controlla di aver scelto la colonna della **data** (può chiamarsi `date`, `time`, `timestamp`, ecc.). Sono accettate date come `2026-10-31`, `31/10/2026` e i timestamp numerici. In `esempi/` ci sono file inventati (`mifitness_*.csv`) per provare.

## 5. Backup e ripristino

I dati sono solo sul telefono: se cancelli i dati di Chrome, disinstalli l'app o cambi telefono, **li perdi**. Fai un backup ogni tanto!

**Fare il backup**
1. Apri **Altro → Impostazioni e backup**.
2. Premi **Esporta backup (JSON)**: viene scaricato un file `salute-backup-AAAA-MM-GG.json` (di solito nella cartella *Download*).
3. Copialo in un posto sicuro (Google Drive, email a te stesso…). **Non pubblicarlo su GitHub**: contiene i tuoi dati personali.

**Ripristinare**
1. Installa/apri l'app (anche su un telefono nuovo).
2. **Altro → Impostazioni e backup → Ripristina da backup** e scegli il file `.json`.
3. Conferma: i dati attuali vengono **sostituiti** con quelli del backup.

---

## Per chi vuole modificare il codice

- Nessuna installazione: sono file HTML/CSS/JavaScript semplici, senza librerie. Per provarla in locale: `python3 -m http.server` nella cartella, poi apri `http://localhost:8000`.
- **Test automatici** (serve Node 20+): `npm test`. Coprono parser Cronometer, media mobile e proiezione del peso, percentuali dei macro, progressione della forza, regola di avanzamento dei livelli, sequenza del timer, mappatura Mi Fitness, backup e l'elenco dei file offline.
- Dopo aver modificato i file dell'app, aggiorna in `sw.js` il numero di `VERSIONE` (e l'elenco `FILE` se ne aggiungi di nuovi: un test lo controlla), così i telefoni scaricano la versione nuova.
- Per rigenerare icone ed esempi: `node strumenti/genera-icone.mjs` e `node strumenti/genera-esempi.mjs`.
- Le scelte fatte dove le richieste erano ambigue sono annotate in [DECISIONI.md](DECISIONI.md).

Struttura: `js/logica/` contiene i calcoli (testati), `js/core/` gli strumenti di base (archivio, grafici, CSV), `js/viste/` le schermate.
