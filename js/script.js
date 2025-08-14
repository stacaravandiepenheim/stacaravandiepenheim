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
  const kind1Sel         = document.getElementById('kind1');             // 'baby' → label “baby gratis” (géén prijswijziging)
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
  // Config & helpers
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

  // ----------------------
  // Prijzen (per seizoen) — eenvoudig uitbreidbaar
  // ----------------------
  const PRICING = [
    // Voorbeeld:
    // { name: 'Zomer 2025', start: '2025-06-28', end: '2025-08-31', weekend: 190, midweek: 260, week: 400 },
    // { name: 'Najaar 2025', start: '2025-09-01', end: '2025-10-27', weekend: 170, midweek: 230, week: 360 },
    // { name: 'Zomer 2026', start: '2026-06-27', end: '2026-08-29', weekend: 210, midweek: 280, week: 430 },
  ];

  // ----------------------
  // Verblijfspatronen (aankomst/vertrek en #nachten)
  // ----------------------
  const STAY_PATTERNS = [
    // Weekend: vr → ma (3 nachten)
    { key: 'weekend', label: 'Weekend', nights: 3, arrivalWD: [5], departureWD: [1] },
    // Midweek: ma → vr (4 nachten)
    { key: 'midweek', label: 'Midweek', nights: 4, arrivalWD: [1], departureWD: [5] },
    // Week: ma → ma of vr → vr (7 nachten)
    { key: 'week', label: 'Week', nights: 7, arrivalWD: [1,5], departureWD: [1,5] },
  ];

  // ----------------------
  // Helperfuncties voor datums/formatten
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

  // ----------------------
  // Prijs & verblijf bepalen
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
    // Belangrijk: baby is gratis, maar prijs blijft hetzelfde → GEEN aftrek meer
    const toerBel = 4 * adults * nights;

    // Kind-aantallen voor weergave (beïnvloeden de prijs niet)
    const val1 = kind1Sel?.value || 'nvt';
    const val2 = kind2Sel?.value || 'nvt';
    const val3 = kind3Sel?.value || 'nvt';
    const isBaby = v => v === 'baby';
    const isChild = v => /^(1-3|4-12|13-17|15-17|1-17)$/.test(v);

    const babies =
      (isBaby(val1) ? 1 : 0) +
      (isBaby(val2) ? 1 : 0) +
      (isBaby(val3) ? 1 : 0);

    const children =
      (isChild(val1) ? 1 : 0) +
      (isChild(val2) ? 1 : 0) +
      (isChild(val3) ? 1 : 0);

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
      nights, adults, babies, children,
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

  function hasArrivalSelection() {
    return (selectedArrival?.textContent || '').trim().length > 0;
  }

  function setArrivalSameAsDeparture() {
    const d = (selectedDeparture?.textContent || '').trim();
    selectedArrival.textContent = d || '';
    updateSelectedPeriodText();
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
    if (stayHidden) stayHidden.value = cls.label;

    const { price } = getPriceFor(a, cls.type);
    const X = computeExtras(a, d, cls.type);

    // Korte zin
    if (priceSummary) {
      if (price) {
        priceSummary.textContent = `Indicatie: ${X.nights} nachten, ${cls.label}, basis ${euro(price)} + extra’s`;
      } else {
        priceSummary.textContent = `Indicatie: ${X.nights} nachten, ${cls.label}, (basisprijs niet beschikbaar)`;
      }
    }

    // Breakdown
    if (priceSpecEl) {
      const rows = [];
      rows.push(`<div>Basis (${cls.label}): <strong>${price ? euro(price) : 'n.v.t.'}</strong></div>`);
      // >>> aangepaste toeristenbelasting-tekst
      rows.push(`<div>Toeristenbelasting (4 p.p.p.n. × ${X.adults} volw${X.children ? ` + ${X.children} kind${X.children>1?'eren':''}` : ''}${X.babies ? `, baby gratis` : ''} × ${X.nights} nachten): <strong>${euro(X.toerBel)}</strong></div>`);
      if (cleanSel && cleanSel.value === 'ja') rows.push(`<div>Schoonmaak: <strong>${euro(X.schoon)}</strong></div>`);
      if (aantalBeddengoed && aantalBeddengoed.value !== 'nvt' && X.linenCount > 0) rows.push(`<div>Beddengoed (${X.linenCount}×): <strong>${euro(4 * X.linenCount)}</strong></div>`);
      if (aantalHanddoeken && aantalHanddoeken.value !== 'nvt' && X.towelsCount > 0) rows.push(`<div>Handdoeken (${X.towelsCount}× à ${euro(X.towelRate)}): <strong>${euro(X.towelCost)}</strong></div>`);
      if (campingbedjeSel && campingbedjeSel.value === 'ja') rows.push(`<div>Campingbedje: gratis</div>`);
      if (kinderstoelSel  && kinderstoelSel.value  === 'ja') rows.push(`<div>Kinderstoel: gratis</div>`);
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
      const blank = document.createElement('div');
      blank.className = 'day blank';
      calendarEl.appendChild(blank);
    }

    // Dagen
    for (let d = 1; d <= days; d++) {
      const cell = document.createElement('div');
      cell.className = 'day';

      const dateObj = new Date(year, month, d);
      const dateStr = ymd(dateObj);

      // Buiten seizoen → disabled
      if (dateObj < SEASON_START || dateObj > SEASON_END) {
        cell.classList.add('disabled');
      }

      // Geblokkeerd/uitgesloten
      if (availability[dateStr] === 1) {
        cell.classList.add('blocked');
        cell.setAttribute('data-blocked', '1');
      }

      // Welke kalender?
      if (type === 'arrival') {
        cell.addEventListener('click', () => {
          // Niet op geblokkeerde dagen aankomen
          if (cell.classList.contains('blocked')) return;
          selectedArrival.textContent  = `${String(d).padStart(2,'0')}-${String(month+1).padStart(2,'0')}-${year}`;
          updateSelectedPeriodText();
          updatePriceAndExtras();
        });
      } else {
        cell.addEventListener('click', () => {
          // Niet op geblokkeerde dagen vertrekken
          if (cell.classList.contains('blocked')) return;
          selectedDeparture.textContent = `${String(d).padStart(2,'0')}-${String(month+1).padStart(2,'0')}-${year}`;
          updateSelectedPeriodText();
          updatePriceAndExtras();
        });
      }

      // Tekst in cel
      const label = document.createElement('span');
      label.className = 'date-label';
      label.textContent = d;
      cell.appendChild(label);

      // Aankomst/vertrek markeren
      const a = (selectedArrival?.textContent || '').trim();
      const v = (selectedDeparture?.textContent || '').trim();
      if (a && parseDMY(a).toDateString() === dateObj.toDateString()) {
        cell.classList.add('arrival-selected');
      }
      if (v && parseDMY(v).toDateString() === dateObj.toDateString()) {
        cell.classList.add('departure-selected');
      }

      calendarEl.appendChild(cell);
    }
  }

  function renderFromArrival() {
    generateCalendar(arrivalYear, arrivalMonth, arrivalCalendar, arrivalMonthYear, 'arrival');

    // Sync vertrekmaand/jaar met aankomst, tenzij gebruiker al iets anders koos
    const aTxt = (selectedArrival?.textContent || '').trim();
    if (!aTxt) {
      departureYear  = arrivalYear;
      departureMonth = arrivalMonth;
      generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
    } else {
      generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
    }
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
