# Decisioni prese dove la richiesta era ambigua

Scelta sempre la soluzione più semplice; qui sotto, per poterle cambiare facilmente.

## Generali
- **Nessuna build, nessuna libreria**: JavaScript a moduli ES e grafici SVG scritti a mano (`js/core/charts.js`), così nulla viene caricato da internet.
- **Archivio**: IndexedDB (chiave → valore), con ripieghi su localStorage. I dati vengono letti in memoria all'avvio. Il backup contiene solo le chiavi note (`js/logica/impostazioni.js`).
- **Ripristino del backup = sostituzione** completa dei dati (non unione), dopo conferma.
- **Pubblicazione**: GitHub Pages dal ramo `main`, cartella radice, senza workflow. Percorsi tutti relativi, quindi funziona in una sotto-cartella (`/Salute/`).
- **Aggiornamenti offline**: il service worker risponde dalla copia salvata e aggiorna in background; la versione nuova si vede alla seconda apertura.

## Timer e livelli
- **Parametri precaricati**: riscaldamento 5' per i livelli 1-2 e 8' dal 3 in su (la richiesta indicava 5-10'); defaticamento 5'. Livelli 5 e 6 partono dal minimo dell'intervallo (6 e 10 ripetizioni) e l'utente può salire fino a 8 e 12 modificando le ripetizioni (restano considerati livello 5/6).
- **Nessun recupero dopo l'ultima ripetizione** di una serie: segue la pausa tra le serie o il defaticamento.
- **RPE previsto per salire** (soglia "non ha superato"): L1 6, L2 6, L3 7, L4 7, L5 7, L6 9. Per L2 e L4 non era indicato: ho usato l'intensità del tratto di lavoro.
- **Un solo RPE a fine sessione**: viene usato sia come "fatica media dei tratti di lavoro" (per salire) sia come "RPE dichiarato" (per scendere se supera 9, cioè se è 10). Registrare l'RPE di ogni singolo tratto sarebbe poco pratico con le mani sudate.
- **Proposta di livello**: considera solo le sessioni *consecutive* fatte al livello attuale e ignora le sessioni personalizzate (senza livello). Si scende solo se l'*ultima* sessione di quel livello è incompleta o con RPE > 9. È solo un suggerimento: i pulsanti dei livelli restano sempre liberi.
- Una sessione con parametri modificati rispetto a un livello diventa "personalizzata" (o prende il nome del preset) e **non conta per l'avanzamento**.
- Il tempo è calcolato con l'orologio di sistema (non contando i "tic"), così non perde secondi se il telefono rallenta il browser in background. Se la pagina viene sospesa a lungo, al ritorno annuncia la fase corrente.
- Il conto alla rovescia sugli ultimi 3 secondi è fatto con bip e vibrazione (la voce annuncia solo i cambi di fase).

## Forza
- **Calendario**: una voce per ogni giorno della settimana (riposo, intervalli o un esercizio). Si modifica in Impostazioni.
- **Progressione** per esercizio *e variante* (le assistite e le negative si seguono separatamente): sotto il tetto +1 ripetizione a pari carico; al tetto carico + incremento e ripartenza da N ripetizioni (tetto 12, ripartenza 8, +2 kg: tutto configurabile). Per le isometriche il campo "ripetizioni" indica i secondi di tenuta.
- Una registrazione = un esercizio con serie × ripetizioni × carico uguali per tutte le serie.

## Peso
- **Media mobile**: media delle misure degli ultimi 7 *giorni* (non delle ultime 7 misure), così funziona anche se non ti pesi ogni giorno.
- **Ritmo reale**: pendenza della retta (minimi quadrati) sulle misure delle ultime 4 settimane; richiede almeno 2 misure distanti 6+ giorni.
- **Proiezione**: parte dalla media a 7 giorni più recente; se il ritmo va nella direzione opposta all'obiettivo la data non viene calcolata.
- Il ritmo obiettivo è in kg/settimana, negativo per dimagrire (predefinito −0,5).

## Nutrizione (Cronometer)
- Il tipo di file è riconosciuto dalle intestazioni (Date/Day + Energy → giornaliero; *Food Name* → servings; *Metric+Amount* → biometrics; *Exercise* → exercises). Intestazioni confrontate senza distinzione di maiuscole; separatore `,` `;` o tab; virgola decimale accettata.
- I **file di esempio ricostruiscono il formato come lo ricordo** (colonne e unità tipiche degli export di Cronometer); l'export reale può avere colonne diverse: il parser ignora quelle sconosciute e cerca le note per nome.
- La colonna *Completed* viene letta ma **non** esclude i giorni (se non si "completano" mai i giorni su Cronometer non si importerebbe nulla).
- **Percentuali dei macro**: sulle calorie ricavate dai macro (proteine 4, carboidrati 4, grassi 9 kcal/g), non su quelle dichiarate; l'alcol è escluso.
- **Giorno "dentro obiettivo"**: calorie entro ±10% dell'obiettivo (tolleranza configurabile). In più si conta quanti giorni raggiungono almeno il 90% delle proteine obiettivo.
- **Micronutrienti**: fabbisogni di riferimento *indicativi per un adulto* (tabella `MICRO` in `js/logica/nutrizione.js`), non personalizzati e non consigli medici. Un micronutriente è "scarso" in un giorno se sotto il 100% del fabbisogno (soglia configurabile). Vitamina D convertita in UI se il file la dà in µg. Il sodio non è tra i micronutrienti (è un limite, non un minimo).
- **Giorno di ricarica**: mostrato a parte oppure escluso dalle medie (impostazione); i giorni "regolari" sono tutti gli altri.
- Biometrics: si importano solo peso (kg o lb) e vita (cm o pollici), solo dove non c'è già un dato inserito a mano; le altre misure sono ignorate. Servings ed Exercises alimentano due righe di riepilogo (calorie per pasto, esercizi del periodo).

## Mi Fitness (Xiaomi)
- Formato dell'archivio non documentato: i file di esempio sono **inventati**. Si importano CSV *piatti* (una colonna per dato). Se l'export reale contiene file con valori in JSON dentro una colonna (tipo `Key,Value`), non sono supportati: andrebbero convertiti in colonne separate.
- Il programma prova a indovinare la mappatura dai nomi delle colonne (in italiano e inglese) e la ricorda per tipo di file; se il file nuovo ha colonne diverse la propone di nuovo da indovinare.
- Più righe nello stesso giorno: passi **sommati**, sonno **sommato** (pisolini), frequenza cardiaca aggregata; la reimportazione sostituisce i giorni già presenti.
- **Frequenza a riposo** giornaliera: se il file ha una colonna dedicata si usa quella; con i campioni "battiti" si usa il 10° percentile del giorno (scartando valori fuori da 30-230).
- Durata di sonno/allenamenti: l'unità (minuti, secondi, ore) si sceglie nella mappatura, con una proposta automatica.
- Il sonno è attribuito alla data indicata nella colonna scelta come "data" (di solito il giorno del risveglio).

## Cruscotto e riepilogo
- La settimana va da lunedì a domenica. "Allenamenti della settimana" = sessioni di intervalli + giorni con forza registrata (non le singole serie) + allenamenti importati da Mi Fitness.
- Il riepilogo si stampa con la funzione di stampa del browser (si può scegliere "Salva come PDF"); gli stili di stampa nascondono menu e pulsanti.

## Avvertenza
- L'avviso medico è nelle Impostazioni, in fondo al riepilogo e come schermata da accettare (una volta) prima del primo uso del timer.
