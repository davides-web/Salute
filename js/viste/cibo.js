// Nutrizione: importazione dei CSV di Cronometer e report settimanale/mensile.
import { h, svuota, toast, leggiFile } from '../core/dom.js';
import { leggi, scrivi, impostazioni } from '../core/store.js';
import { importaCronometer, reportPeriodo, sostituisciPerData, unisciRegistroPeso } from '../logica/nutrizione.js';
import { graficoBarre } from '../core/charts.js';
import {
  oggiISO, inizioSettimana, aggiungiGiorni, inizioMese, fineMese, aggiungiMesi, nomeMese, dataBreve, giornoMese, fmt, somma,
} from '../core/util.js';

const NOMI_TIPO = { giornaliero: 'riepilogo giornaliero', porzioni: 'alimenti', biometria: 'misure (peso/vita)', esercizi: 'esercizi' };

export async function render(el) {
  const imp = impostazioni();
  const cfg = imp.nutrizione;
  const giorniObj = leggi('nutr_giorni', {});
  const giorni = Object.values(giorniObj);
  const st = { modo: 'settimana', riferimento: oggiISO() };
  const stato = h('div');

  async function importa(files) {
    const msg = [];
    for (const f of files) {
      let r;
      try { r = importaCronometer(await leggiFile(f)); } catch { r = { tipo: null }; }
      if (!r.tipo) { msg.push(`${f.name}: formato non riconosciuto`); continue; }
      if (r.tipo === 'giornaliero') {
        const attuali = leggi('nutr_giorni', {});
        for (const g of r.giorni) attuali[g.data] = g;
        scrivi('nutr_giorni', attuali);
        msg.push(`${f.name}: ${r.giorni.length} giorni importati${r.scartate ? ` (${r.scartate} righe scartate)` : ''}`);
      } else if (r.tipo === 'porzioni') {
        scrivi('nutr_porzioni', sostituisciPerData(leggi('nutr_porzioni', []), r.porzioni));
        msg.push(`${f.name}: ${r.porzioni.length} alimenti importati`);
      } else if (r.tipo === 'esercizi') {
        scrivi('nutr_esercizi', sostituisciPerData(leggi('nutr_esercizi', []), r.esercizi));
        msg.push(`${f.name}: ${r.esercizi.length} esercizi importati`);
      } else {
        scrivi('peso', unisciRegistroPeso(leggi('peso', []), r.peso, r.vita));
        msg.push(`${f.name}: ${Object.keys(r.peso).length} pesi e ${Object.keys(r.vita).length} misure vita aggiunti (quelli già presenti non vengono toccati)`);
      }
    }
    svuota(stato).append(h('div', { class: 'avviso ok' }, msg.map((m) => h('div', null, m))));
    toast('Importazione terminata');
    setTimeout(() => { svuota(el); render(el); el.prepend(h('div', { class: 'avviso ok' }, msg.map((m) => h('div', null, m)))); }, 50);
  }

  const input = h('input', { type: 'file', accept: '.csv,text/csv', multiple: true, style: 'display:none', onchange: (e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) importa(f); } });

  el.append(h('h1', null, 'Nutrizione'),
    h('div', { class: 'carta' }, h('h2', null, 'Importa da Cronometer'),
      h('p', { class: 'muto' }, 'Scegli uno o più file CSV esportati da Cronometer (riepilogo giornaliero, servings, biometrics, exercises). Il tipo viene riconosciuto da solo.'),
      h('button', { class: 'primario grande', onclick: () => input.click() }, '📂 Scegli file CSV'), input, stato));

  if (!giorni.length) {
    el.append(h('div', { class: 'vuoto' }, 'Importa il riepilogo giornaliero per vedere i report. Nella cartella "esempi" del progetto ci sono file di prova.'));
    return;
  }

  // periodo
  const periodo = () => st.modo === 'settimana'
    ? { da: inizioSettimana(st.riferimento), a: aggiungiGiorni(inizioSettimana(st.riferimento), 6) }
    : { da: inizioMese(st.riferimento), a: fineMese(st.riferimento) };
  const corpo = h('div');
  const ridisegna = () => { svuota(corpo); corpo.append(...contenuto(periodo())); };

  function contenuto({ da, a }) {
    const rep = reportPeriodo(giorni, cfg, da, a);
    const s = rep.regolari;
    const out = [];
    const barraMacro = (nome, perc, obiettivo) => h('div', { style: 'margin:8px 0' },
      h('div', { class: 'riga', style: 'border:0;padding:0' }, h('span', null, nome), h('span', null, `${fmt(perc, 0)}% (obiettivo ${fmt(obiettivo, 0)}%)`)),
      h('div', { class: 'barra' }, h('i', { style: `width:${Math.min(100, perc)}%` })));

    out.push(h('div', { class: 'carta' },
      h('div', { class: 'riga', style: 'border:0' },
        h('button', { onclick: () => { st.riferimento = st.modo === 'settimana' ? aggiungiGiorni(st.riferimento, -7) : aggiungiMesi(st.riferimento, -1); ridisegna(); } }, '◀'),
        h('strong', { class: 'centro' }, st.modo === 'settimana' ? `${dataBreve(da)} – ${dataBreve(a)}` : nomeMese(da)),
        h('button', { onclick: () => { st.riferimento = st.modo === 'settimana' ? aggiungiGiorni(st.riferimento, 7) : aggiungiMesi(st.riferimento, 1); ridisegna(); } }, '▶')),
      h('div', { class: 'gruppo' },
        ['settimana', 'mese'].map((m) => h('button', { class: st.modo === m ? 'sel' : '', onclick: () => { st.modo = m; ridisegna(); } }, m === 'settimana' ? 'Settimana' : 'Mese')))));

    if (!rep.giorniConDati) { out.push(h('div', { class: 'vuoto' }, 'Nessun dato in questo periodo.')); return out; }

    if (s.n) {
      out.push(h('div', { class: 'carta' }, h('h2', null, `Medie giornaliere (${s.n} giorni)`),
        h('div', { class: 'griglia3' },
          [['Calorie', s.medie.kcal, 'kcal'], ['Proteine', s.medie.proteine, 'g'], ['Grassi', s.medie.grassi, 'g'],
            ['Carboidrati', s.medie.carboidrati, 'g'], ['Fibre', s.medie.fibre, 'g'], ['Sodio', s.medie.sodio, 'mg'],
            ['Potassio', s.medie.potassio, 'mg']].map(([n, v, u]) => h('div', null, h('div', { class: 'etichetta' }, n), h('div', { class: 'numero' }, fmt(v, 0), h('small', null, ` ${u}`)))))));

      if (s.perc) {
        out.push(h('div', { class: 'carta' }, h('h2', null, 'Ripartizione dei macro'),
          barraMacro('Proteine', s.perc.p, cfg.p), barraMacro('Grassi', s.perc.g, cfg.g), barraMacro('Carboidrati', s.perc.c, cfg.c)));
      }
      out.push(h('div', { class: 'carta' }, h('h2', null, 'Giorni rispetto all\'obiettivo'),
        h('div', { class: 'riga' }, h('span', null, `Calorie entro ±${cfg.tolleranza}% di ${fmt(cfg.kcal)} kcal`), h('strong', null, `${s.dentro} dentro · ${s.fuori} fuori`)),
        h('div', { class: 'riga' }, h('span', null, `Proteine ≥ 90% di ${fmt(s.obiettivoProteineG, 0)} g`), h('strong', null, `${s.proteineOk} su ${s.n}`))));

      const peggiori = s.micro.filter((m) => m.giorniSotto > 0).slice(0, 5);
      out.push(h('div', { class: 'carta' }, h('h2', null, 'Micronutrienti più spesso sotto il fabbisogno'),
        peggiori.length ? peggiori.map((m) => h('div', { class: 'riga' },
          h('div', null, h('strong', null, m.nome), h('div', { class: 'muto' }, `media ${fmt(m.media, 1)} ${m.unita} su ${fmt(m.rda, 1)} (${fmt(m.percMedia, 0)}%)`)),
          h('strong', null, `${m.giorniSotto}/${m.giorniTot} giorni`)))
          : h('div', { class: 'vuoto' }, 'Nessun micronutriente sotto il fabbisogno (o dati non presenti).'),
        h('p', { class: 'muto' }, 'Fabbisogni di riferimento indicativi per un adulto: non sono valori personalizzati.')));
    }

    if (rep.ricarica && rep.ricarica.n) {
      const r = rep.ricarica;
      out.push(h('div', { class: 'carta' }, h('h2', null, `Giorno di ricarica (${r.n})`),
        h('div', { class: 'griglia3' }, [['Calorie', r.medie.kcal, 'kcal'], ['Proteine', r.medie.proteine, 'g'], ['Carboidrati', r.medie.carboidrati, 'g']]
          .map(([n, v, u]) => h('div', null, h('div', { class: 'etichetta' }, n), h('div', { class: 'numero' }, fmt(v, 0), h('small', null, ` ${u}`)))))));
    } else if (rep.ricaricaEsclusa) {
      out.push(h('p', { class: 'muto' }, `${rep.ricaricaEsclusa} giorno/i di ricarica esclusi dalle medie.`));
    }

    out.push(h('div', { class: 'carta' }, h('h2', null, 'Calorie giorno per giorno'),
      graficoBarre({
        barre: rep.giorni.map((g) => ({ x: g.data, y: g.kcal, colore: cfg.giornoRicarica != null && new Date(g.data + 'T12:00').getDay() === (cfg.giornoRicarica + 1) % 7 ? 2 : 1 })),
        orizzontali: [{ y: cfg.kcal, etichetta: 'obiettivo' }], etichettaX: giornoMese, descrizione: 'Calorie giornaliere',
      })));

    // alimenti ed esercizi del periodo (se importati)
    const porz = leggi('nutr_porzioni', []).filter((p) => p.data >= da && p.data <= a);
    if (porz.length) {
      const perGruppo = {};
      for (const p of porz) perGruppo[p.gruppo || '–'] = (perGruppo[p.gruppo || '–'] || 0) + (p.kcal || 0);
      const nGiorni = new Set(porz.map((p) => p.data)).size;
      out.push(h('div', { class: 'carta' }, h('h2', null, 'Calorie per pasto (media al giorno)'),
        Object.entries(perGruppo).sort((x, y) => y[1] - x[1]).map(([g, k]) => h('div', { class: 'riga' }, h('span', null, g), h('strong', null, `${fmt(k / nGiorni, 0)} kcal`)))));
    }
    const ese = leggi('nutr_esercizi', []).filter((e) => e.data >= da && e.data <= a);
    if (ese.length) {
      out.push(h('div', { class: 'carta' }, h('h2', null, 'Esercizi registrati su Cronometer'),
        h('div', { class: 'riga' }, h('span', null, `${ese.length} attività`), h('strong', null, `${fmt(somma(ese.map((e) => e.minuti || 0)), 0)} min · ${fmt(somma(ese.map((e) => e.kcal || 0)), 0)} kcal`))));
    }
    return out;
  }

  el.append(corpo);
  ridisegna();
}
