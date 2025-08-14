// ======================================================================
// Reserveringskalender + automatische prijsberekening (met uitleg)
// ======================================================================
//
// Wat kun je hier zelf eenvoudig aanpassen?
// 1) BOEKBAAR VENSTER (SEASON_START/SEASON_END): regel 62-63
// 2) GEBOEKTE / GEBLOKKEERDE DAGEN: via addDateRange(...): regel 83+
// 3) PRIJZEN PER SEIZOEN: const PRICING = [...]: regel 99+
// 4) VERBLIJFSTYPEN/PATRONEN (weekend/midweek/week of extra varianten):
//    const STAY_PATTERNS = [...]: regel 152+
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // ----------------------
  // DOM referenties
  // ----------------------
  const arrivalCalendar    = document.getElementById('arrival-calendar');
  const departureCalendar  = document.getElementById('departure-calendar');
  const arrivalMonthYear   = document.getElementById('arrival-month-year');
  const departureMonthYear = document.getElementById('departure-month-year');
  const selectedArrival    = document.getElementById('selected-arrival');
  const selectedDeparture  = document.getElementById('selected-departure');

  const prevArrivalButton   = document.getElementById('prev-arrival-month');
  const nextArrivalButton   = document.getElementById('next-arrival-month');
  const prevDepartureButton = document.getElementById('prev-departure-month');
  const nextDepartureButton = document.getElementById('next-departure-month');

  const selectedPeriodEl = document.getElementById('selected-period');
  const arrivalHidden    = document.getElementById('arrival-hidden');
  const departureHidden  = document.getElementById('departure-hidden');

  // Prijs/indicatie + hidden fields (voor formulier/email)
  const priceSummary = document.getElementById('price-summary');  // korte zin
  const priceSpecEl  = document.getElementById('price-spec');     // breakdown
  const priceHidden  = document.getElementById('price-hidden');   // indicatie
  const stayHidden   = document.getElementById('stay-hidden');    // Week/Midweek/Weekend/...

  // Extra’s inputs (IDs uit jouw HTML)
  const adultsInput      = document.getElementById('volwassenen');       // 1..4
  const childrenInput    = document.getElementById('kinderen');          // (nu niet gebruikt in berekening)
  const kind1Sel         = document.getElementById('kind1');             // 'baby' → 4/nacht eraf
  const kind2Sel         = document.getElementById('kind2');
  const kind3Sel         = document.getElementById('kind3');
  const cleanSel         = document.getElementById('schoonmaak');        // 'ja' → +50
  const beddengoedSel    = document.getElementById('beddengoed');        // (geen effect)
  const aantalBeddengoed = document.getElementById('aantalbeddengoed');  // n.v.t.|1..4 → +4×n
  const handdoekenSel    = document.getElementById('handdoeken');        // (geen effect)
  const aantalHanddoeken = document.getElementById('aantalhanddoeken');  // n.v.t.|1..4 → +4×n (week/midweek) of +2×n (weekend)
  const campingbedjeSel  = document.getElementById('campingbedje');      // 'ja' → gratis, wel tonen
  const kinderstoelSel   = document.getElementById('kinderstoel');       // 'ja' → gratis, wel tonen
  const hotspotSel       = document.getElementById('hotspot');           // 'ja' → +25

  // ----------------------
  // Kalender instellingen (startmaand weergave)
  // ----------------------
  let arrivalYear  = 2025;
  let arrivalMonth = 7;  // Augustus (0-based)
  let departureYear  = 2025;
  let departureMonth = 7; // Standaard dezelfde maand als aankomst

  const weekdays = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

  // ----------------------
  // BOEKBAAR VENSTER (zichtbaar/boekbaar bereik in de kalenders)
  // Pas gerust aan als je verder wilt tonen/boeken
  // ----------------------
  const SEASON_START = new Date('2025-05-01');
  const SEASON_END   = new Date('2026-10-31');

  // ----------------------
  // Beschikbaarheid 0=vrij, 1=geboekt/uitgesloten
  // Beheer hier je blokperiodes (vakanties/gesloten)
  // ----------------------
  const availability = {};
  function addDateRange(startDate, endDate, status) {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    while (start <= end) {
      availability[start.toISOString().split('T')[0]] = status; // 'YYYY-MM-DD'
      start.setDate(start.getDate() + 1);
    }
  }
  // VOORBEELDEN (pas aan / voeg toe):
  addDateRange('2025-08-01', '2025-08-21', 1); // zomervakantie noord (niet te boeken)
  addDateRange('2025-10-28', '2026-04-02', 1); // winter dicht
  addDateRange('2026-04-25', '2026-05-07', 1); // meivakantie
  addDateRange('2026-05-14', '2026-05-18', 1); // hemelvaart
  addDateRange('2026-05-22', '2026-05-25', 1); // pinksteren

  // ----------------------
  // PRIJZEN PER SEIZOEN (compact en makkelijk bijhouden)
  // Tip: Zet niet-beschikbare combinaties op null
  // ----------------------
  const PRICING = [
    // 2025
    { name: 'Laagseizoen najaar 2025', start: '2025-08-29', end: '2025-10-10',
      weekend: 195, midweek: 240, week: 295 },
    { name: 'Herfstvakantie 2025',     start: '2025-10-10', end: '2025-10-24',
      weekend: null, midweek: null, week: 320 },

    // 2026
    { name: 'Laagseizoen voorjaar 2026', start: '2026-04-03', end: '2026-04-24',
      weekend: 195, midweek: 240, week: 295 },
    { name: 'Meivakantie 2026',          start: '2026-04-25', end: '2026-05-07',
      weekend: null, midweek: null, week: null }, // geblokt (overlapt ook met availability)
    { name: 'Middenseizoen 2026',        start: '2026-05-08', end: '2026-07-02',
      weekend: 195, midweek: 240, week: 295 },
    { name: 'Zomervakantie 2026 (1e week Noord) ', start: '2026-07-03', end: '2026-07-09',
      weekend: null, midweek: null, week: 420 },  // alleen week
    { name: 'Zomervakantie 2026 (Zuid, Midden)', start: '2026-08-30', end: '2026-08-27',
      weekend: null, midweek: null, week: 395 }   // alleen week
    { name: 'Laagseizoen najaar 2026', start: '2026-08-30', end: '2026-10-10',
      weekend: 195, midweek: 240, week: 295 },
  ];

  // ----------------------
  // VERBLIJFSPATRONEN
  // Je kunt hier eenvoudig varianten toevoegen.
  // - nights: aantal nachten
  // - arrivalWD: toegestane aankomstdagen (0=zo..6=za), standaard ma=1, vr=5
  // - departureWD: idem voor vertrek
  // ----------------------
  const STAY_PATTERNS = [
    { key: 'weekend', label: 'Weekend', nights: 3, arrivalWD: [5],        departureWD: [1]        }, // vr → ma
    { key: 'midweek', label: 'Midweek', nights: 4, arrivalWD: [1],        departureWD: [5]        }, // ma → vr
    { key: 'week',    label: 'Week',    nights: 7, arrivalWD: [1, 5],     departureWD: [1, 5]     }  // ma→ma of vr→vr
    // Voorbeeld extra midweek: { key:'midweek2', label:'Midweek (di-za)', nights:4, arrivalWD:[2], departureWD:[6] }
  ];

  // ----------------------
  // Helpers
  // ----------------------
  function formatDate(ymdStr) {                 // 'YYYY-MM-DD' -> 'dd-mm-jjjj'
    const [y, m, d] = ymdStr.split('-');
    return `${d}-${m}-${y}`;
  }
  function parseDMY(dmyStr) {                   // 'dd-mm-jjjj' -> Date
    const [dd, mm, yy] = dmyStr.split('-').map(Number);
    return new Date(yy, mm - 1, dd);
  }
  function parseYMD(ymdStr) {                   // 'YYYY-MM-DD' -> Date
    const [y, m, d] = ymdStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function ymd(date) {                          // Date -> 'YYYY-MM-DD'
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function addDays(date, n) {
    const c = new Date(date);
    c.setDate(c.getDate() + n);
    return c;
  }
  function diffNights(aDMY, dDMY) {
    return Math.round((parseDMY(dDMY) - parseDMY(aDMY)) / 86400000);
  }
  function between(dateStr, startStr, endStr) {
    const d = parseYMD(dateStr), s = parseYMD(startStr), e = parseYMD(endStr);
    return d >= s && d <= e;
  }
  function getSeasonFor(dateStrYMD) {
    return PRICING.find(s => between(dateStrYMD, s.start, s.end)) || null;
  }
  function euro(n) { return n == null ? 'n.v.t.' : `€ ${Number(n).toFixed(0)},-`; }
  function getWeekNumber(d) {                   // ISO-week
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil((((t - y0) / 86400000) + 1) / 7);
  }
  function hasArrivalSelection() {
    return (selectedArrival?.textContent || '').trim().length > 0;
  }

  // ----------------------
  // Type & prijs
  // ----------------------
  function classifyStay(aDMY, dDMY) {
    const a = parseDMY(aDMY);
    const d = parseDMY(dDMY);
    const nights = diffNights(aDMY, dDMY);
    const aWD = a.getDay(); // 0=zo..6=za
    const dWD = d.getDay();

    // 1) Eerst doorloop je je patronenlijst (makkelijk uitbreidbaar)
    for (const p of STAY_PATTERNS) {
      if (nights === p.nights && p.arrivalWD.includes(aWD) && p.departureWD.includes(dWD)) {
        return { type: p.key, label: p.label, nights };
      }
    }
    // 2) Fallback (onbekend patroon / andere lengte)
    return { type: 'other', label: 'Onbekende periode', nights };
  }

  function getPriceFor(arrivalDMY, stayType) {
    const season = getSeasonFor(ymd(parseDMY(arrivalDMY)));
    if (!season) return { price: null, seasonName: null };
    const v = season[stayType]; // weekend/midweek/week/… (key uit STAY_PATTERNS)
    return { price: (typeof v === 'number' ? v : null), seasonName: season.name };
  }

  // ----------------------
  // Extra’s berekening (jouw regels)
  // ----------------------
  function computeExtras(aDMY, dDMY, stayType) {
    const nights = diffNights(aDMY, dDMY);

    // Toeristenbelasting: €4 p.p.p.n. (alleen volwassenen)
    const adults = parseInt(adultsInput?.value || '0', 10) || 0;
    let toerBel = 4 * adults * nights;

    // Baby’s (kind1/2/3 == 'baby') → €4/nacht eraf per baby
    const babies =
      (kind1Sel?.value === 'baby') +
      (kind2Sel?.value === 'baby') +
      (kind3Sel?.value === 'baby');
    toerBel = Math.max(0, toerBel - 4 * babies * nights);

    // Schoonmaak
    const schoon = (cleanSel && cleanSel.value === 'ja') ? 50 : 0;

    // Beddengoed: €4 * aantal (totaal, niet per nacht)
    let linenCount = parseInt(aantalBeddengoed?.value || '0', 10);
    if (isNaN(linenCount)) linenCount = 0;
    const linenCost = 4 * linenCount;

    // Handdoeken: weekend €2 p.p., week/midweek €4 p.p. (op basis van aantal setjes)
    let towelsCount = parseInt(aantalHanddoeken?.value || '0', 10);
    if (isNaN(towelsCount)) towelsCount = 0;
    const towelRate = (stayType === 'weekend') ? 2 : 4;
    const towelCost = towelRate * towelsCount;

    // Gratis items, wel tonen in specificatie
    const campingbedje = (campingbedjeSel && campingbedjeSel.value === 'ja') ? 0 : 0;
    const kinderstoel  = (kinderstoelSel  && kinderstoelSel.value  === 'ja') ? 0 : 0;

    // Hotspot
    const hotspot = (hotspotSel && hotspotSel.value === 'ja') ? 25 : 0;

    return {
      nights, adults, babies,
      toerBel, schoon, linenCost, towelCost, towelRate, towelsCount,
      campingbedje, kinderstoel, hotspot, linenCount
    };
  }

  // ----------------------
  // UI updates
  // ----------------------
  function updateSelectedPeriodText() {
    const a = (selectedArrival?.textContent || '').trim();
    const d = (selectedDeparture?.textContent || '').trim();

    if (selectedPeriodEl) {
      if (a && d) selectedPeriodEl.textContent = `Reservering voor de volgende periode: ${a} t/m ${d}`;
      else if (a || d) selectedPeriodEl.textContent = a ? `Aankomst: ${a}` : `Vertrek: ${d}`;
      else selectedPeriodEl.textContent = '';
    }
    if (arrivalHidden)   arrivalHidden.value   = a || '';
    if (departureHidden) departureHidden.value = d || '';
  }

  function updatePriceAndExtras() {
    const a = (selectedArrival?.textContent || '').trim();
    const d = (selectedDeparture?.textContent || '').trim();
    if (!a || !d) {
      if (priceSummary) priceSummary.textContent = '';
      if (priceSpecEl)  priceSpecEl.innerHTML = '';
      if (priceHidden)  priceHidden.value = '';
      if (stayHidden)   stayHidden.value = '';
      return;
    }

    const cls = classifyStay(a, d);           // {type,label,nights}
    if (stayHidden) stayHidden.value = cls.label || '';

    const { price, seasonName } = getPriceFor(a, cls.type);

    // Hoofdregel (indicatie)
    if (price) {
      const baseText = `${cls.label} · ${euro(price)} (${seasonName})`;
      if (priceSummary) priceSummary.textContent =
        `Je wilt boeken van ${a} t/m ${d}. Dat is een ${cls.label.toLowerCase()}. Prijsindicatie: ${baseText} — exclusief toeristenbelasting, borg en extra’s. Vul het formulier in voor een preciezere prijs excl. borg en campingkosten.`;
      if (priceHidden) priceHidden.value = `${cls.label} – ${euro(price)} (${seasonName})`;
    } else {
      const baseText = (cls.type === 'other')
        ? 'Deze periode valt buiten onze standaard week/weekend/midweek.'
        : 'Niet beschikbaar in deze periode.';
      if (priceSummary) priceSummary.textContent = `Je wilt boeken van ${a} t/m ${d}. ${baseText}`;
      if (priceHidden)  priceHidden.value = baseText;
    }

    // Extra’s
    const X = computeExtras(a, d, cls.type);
    if (priceSpecEl) {
      const rows = [];
      rows.push(`<div>Basis (${cls.label}): <strong>${price ? euro(price) : 'n.v.t.'}</strong></div>`);
      rows.push(`<div>Toeristenbelasting (4 p.p.p.n. × ${X.adults} volw${X.babies ? ` – ${X.babies} baby gratis` : ''} × ${X.nights} nachten): <strong>${euro(X.toerBel)}</strong></div>`);
      if (cleanSel && cleanSel.value === 'ja') rows.push(`<div>Schoonmaak: <strong>${euro(X.schoon)}</strong></div>`);
      if (aantalBeddengoed && aantalBeddengoed.value !== 'nvt' && X.linenCount > 0) rows.push(`<div>Linnengoed (${X.linenCount}×): <strong>${euro(X.linenCost)}</strong></div>`);
      if (aantalHanddoeken && aantalHanddoeken.value !== 'nvt' && X.towelsCount > 0) rows.push(`<div>Handdoeken (${X.towelsCount}× à €${X.towelRate}): <strong>${euro(X.towelCost)}</strong></div>`);
      if (campingbedjeSel && campingbedjeSel.value === 'ja') rows.push(`<div>Campingbedje: <strong>gratis</strong></div>`);
      if (kinderstoelSel  && kinderstoelSel.value  === 'ja') rows.push(`<div>Kinderstoel: <strong>gratis</strong></div>`);
      if (hotspotSel && hotspotSel.value === 'ja') rows.push(`<div>Hotspot: <strong>${euro(X.hotspot)}</strong></div>`);

      const subtotal = (price || 0) + X.toerBel + X.schoon + X.linenCost + X.towelCost + X.hotspot;
      rows.push(`<div class="price-total">Indicatief totaal (excl. borg & overige extra’s): <strong>${euro(subtotal)}</strong></div>`);
      priceSpecEl.innerHTML = rows.join('');
    }
  }

  // ----------------------
  // Kalender genereren
  // ----------------------
  function generateCalendar(year, month, calendarEl, monthYearEl, type) {
    calendarEl.innerHTML = '';

    const firstOfMonth = new Date(year, month, 1);
    monthYearEl.textContent = `${firstOfMonth.toLocaleString('default', { month: 'long' })} ${year}`;

    // Kopregel
    weekdays.forEach(lbl => {
      const h = document.createElement('div');
      h.className = 'day header';
      h.textContent = lbl;
      calendarEl.appendChild(h);
    });

    const startWD = new Date(year, month, 1).getDay();      // 0=Zo..6=Za
    const days    = new Date(year, month + 1, 0).getDate();

    // Leading blanks
    for (let i = 0; i < startWD; i++) {
      const e = document.createElement('div');
      e.className = 'day';
      calendarEl.appendChild(e);
    }

    for (let d = 1; d <= days; d++) {
      const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const jsDate  = new Date(year, month, d);
      const wd      = jsDate.getDay(); // 0=Zo..6=Za

      const cell = document.createElement('div');
      cell.className = 'day';
      cell.textContent = d;

      // Weeknummer op maandag (styling via .wk-badge in CSS)
      if (wd === 1) {
        const wk = getWeekNumber(jsDate);
        const badge = document.createElement('div');
        badge.className = 'wk-badge';
        badge.textContent = `wk ${wk}`;
        cell.prepend(badge);
      }

      // Seizoensgrenzen
      if (jsDate < SEASON_START || jsDate > SEASON_END) {
        cell.className = 'day unavailable';
        calendarEl.appendChild(cell);
        continue;
      }

      // Boekingen
      if (availability[dateKey] === 1) {
        cell.className = 'day booked';
        calendarEl.appendChild(cell);
        continue;
      }

      // Alleen ma/vr klikbaar (arrival & departure)
      const allowed = (wd === 1 || wd === 5);
      if (allowed && (type === 'arrival' || type === 'departure')) {
        cell.className = 'day available';
        cell.addEventListener('click', () => selectDate(type, dateKey, cell, calendarEl));
      } else {
        cell.className = 'day unavailable';
      }

      calendarEl.appendChild(cell);
    }
  }

  // ----------------------
  // Selectie & navigatie
  // ----------------------
  function selectDate(type, dateKey, dayDiv, calendarEl) {
    const prev = calendarEl.querySelector('.selected');
    if (prev) prev.classList.remove('selected');
    dayDiv.classList.add('selected');

    const dmy = formatDate(dateKey); // dd-mm-jjjj
    if (type === 'arrival') selectedArrival.textContent = dmy;
    else if (type === 'departure') selectedDeparture.textContent = dmy;

    updateSelectedPeriodText();
    updatePriceAndExtras();
  }

  // Sync helpers (zelfde maand houden – maar met jouw wens voor vertrek-knoppen)
  function setDepartureSameAsArrival() {
    departureYear  = arrivalYear;
    departureMonth = arrivalMonth;
    generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
  }
  function setArrivalSameAsDeparture() {
    arrivalYear  = departureYear;
    arrivalMonth = departureMonth;
    generateCalendar(arrivalYear, arrivalMonth, arrivalCalendar, arrivalMonthYear, 'arrival');
  }
  function renderFromArrival() {
    generateCalendar(arrivalYear, arrivalMonth, arrivalCalendar, arrivalMonthYear, 'arrival');
    setDepartureSameAsArrival();
  }

  // Knoppen (LET OP: vertrek beweegt los; alleen syncen als er nog geen aankomst is gekozen)
  prevArrivalButton.addEventListener('click', () => {
    arrivalMonth--; if (arrivalMonth < 0) { arrivalMonth = 11; arrivalYear--; }
    renderFromArrival();
  });
  nextArrivalButton.addEventListener('click', () => {
    arrivalMonth++; if (arrivalMonth > 11) { arrivalMonth = 0; arrivalYear++; }
    renderFromArrival();
  });
  prevDepartureButton.addEventListener('click', () => {
    departureMonth--; if (departureMonth < 0) { departureMonth = 11; departureYear--; }
    generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
    // Alleen syncen als er NOG GEEN aankomstdatum gekozen is
    if (!hasArrivalSelection()) setArrivalSameAsDeparture();
  });
  nextDepartureButton.addEventListener('click', () => {
    departureMonth++; if (departureMonth > 11) { departureMonth = 0; departureYear++; }
    generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
    // Alleen syncen als er NOG GEEN aankomstdatum gekozen is
    if (!hasArrivalSelection()) setArrivalSameAsDeparture();
  });

  // Extra’s → live herberekenen bij wijzigingen
  [
    adultsInput, childrenInput, kind1Sel, kind2Sel, kind3Sel,
    cleanSel, beddengoedSel, aantalBeddengoed, handdoekenSel,
    aantalHanddoeken, campingbedjeSel, kinderstoelSel, hotspotSel
  ].forEach(el => {
    if (el) {
      el.addEventListener('change', updatePriceAndExtras);
      el.addEventListener('input',  updatePriceAndExtras);
    }
  });

  // Init
  renderFromArrival();
});

