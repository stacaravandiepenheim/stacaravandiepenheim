// ============================
// Reserveringskalender (2 kalenders) - auto type + prijs + extras
// ============================
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM refs
  const arrivalCalendar     = document.getElementById('arrival-calendar');
  const departureCalendar   = document.getElementById('departure-calendar');
  const arrivalMonthYear    = document.getElementById('arrival-month-year');
  const departureMonthYear  = document.getElementById('departure-month-year');
  const selectedArrival     = document.getElementById('selected-arrival');
  const selectedDeparture   = document.getElementById('selected-departure');

  const prevArrivalButton   = document.getElementById('prev-arrival-month');
  const nextArrivalButton   = document.getElementById('next-arrival-month');
  const prevDepartureButton = document.getElementById('prev-departure-month');
  const nextDepartureButton = document.getElementById('next-departure-month');

  const selectedPeriodEl    = document.getElementById('selected-period');
  const arrivalHidden       = document.getElementById('arrival-hidden');
  const departureHidden     = document.getElementById('departure-hidden');

  // Prijs/indicatie + extra’s
  const priceSummary = document.getElementById('price-summary');   // tekstregel
  const priceSpecEl  = document.getElementById('price-spec');      // breakdown (optioneel)
  const priceHidden  = document.getElementById('price-hidden');    // verborgen veld met indicatie
  const stayHidden   = document.getElementById('stay-hidden');     // verborgen veld met "Week/Midweek/Weekend"

  // Form inputs voor extra’s (IDs uit jouw HTML)
  const adultsInput       = document.getElementById('volwassenen');       // 1..4
  const childrenInput     = document.getElementById('kinderen');          // 0..3 (nu niet gebruikt in berekening)
  const kind1Sel          = document.getElementById('kind1');             // 'baby' → 4/nacht eraf
  const kind2Sel          = document.getElementById('kind2');
  const kind3Sel          = document.getElementById('kind3');
  const cleanSel          = document.getElementById('schoonmaak');        // 'ja' → +50
  const beddengoedSel     = document.getElementById('beddengoed');        // (bewust geen effect)
  const aantalBeddengoed  = document.getElementById('aantalbeddengoed');  // n.v.t.|1..4 → +4×n
  const handdoekenSel     = document.getElementById('handdoeken');        // (bewust geen effect)
  const aantalHanddoeken  = document.getElementById('aantalhanddoeken');  // n.v.t.|1..4 → +4×n (week/midweek) of +2×n (weekend)
  const campingbedjeSel   = document.getElementById('campingbedje');      // 'ja' → gratis, wel tonen
  const kinderstoelSel    = document.getElementById('kinderstoel');       // 'ja' → gratis, wel tonen
  const hotspotSel        = document.getElementById('hotspot');           // 'ja' → +25

  // --- Startmaanden (0-based maanden)
  let arrivalYear  = 2025;
  let arrivalMonth = 7;  // Aug 2025
  let departureYear  = 2025;
  let departureMonth = 7; // Zelfde maand als aankomst

  const weekdays = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

  // === Seizoensgrenzen (pas aan naar wens) ===
  const SEASON_START = new Date('2025-05-01');  // vanaf 1 mei 2025
  const SEASON_END   = new Date('2026-10-31');  // t/m 31 okt 2026

  // --- Beschikbaarheid (0 = vrij, 1 = bezet)
  const availability = {};
  function addDateRange(startDate, endDate, status) {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    while (start <= end) {
      const formatted = start.toISOString().split('T')[0]; // yyyy-mm-dd
      availability[formatted] = status;
      start.setDate(start.getDate() + 1);
    }
  }

  // Voorbeeld-blokkades/boekingen (pas naar wens aan)
  addDateRange('2025-08-01', '2025-08-21', 1); // Niet te boeken: zomervakantie noord
  addDateRange('2025-10-28', '2026-04-02', 1); // Winterperiode dicht
  addDateRange('2026-04-25', '2026-05-07', 1); // Meivakantie geboekt
  addDateRange('2026-05-14', '2026-05-18', 1); // Hemelvaart geboekt
  addDateRange('2026-05-22', '2026-05-25', 1); // Pinksteren geboekt

  // =========================
  // Prijs-config (pas bedragen/ranges aan jouw tabel aan)
  // =========================
  const PRICING = [
    { name: 'Laagseizoen voorjaar 2026', start: '2026-04-03', end: '2026-04-24',
      weekend: 195, midweek: 240, week: 295 },
    { name: 'Meivakantie 2026', start: '2026-04-25', end: '2026-05-07',
      weekend: null, midweek: null, week: null }, // uitgesloten/geboekt
    { name: 'Middenseizoen 2026', start: '2026-05-08', end: '2026-07-02',
      weekend: 215, midweek: 270, week: 320 },
    { name: 'Zomervakantie (eerste week Noord)', start: '2026-07-03', end: '2026-07-09',
      weekend: null, midweek: null, week: 420 },
    { name: 'Zomervakantie midden/zuid', start: '2026-08-14', end: '2026-08-21',
      weekend: null, midweek: null, week: 395 },
    { name: 'Zomervakantie (laatste week Zuid)', start: '2026-08-21', end: '2026-08-27',
      weekend: null, midweek: null, week: 395 },
    // 2025 (voorbeeld)
    { name: 'Zomervakantie (laatste week Midden) 2025', start: '2025-08-22', end: '2025-08-28',
      weekend: 265, midweek: null, week: 395 },
    { name: 'Laagseizoen najaar 2025', start: '2025-08-29', end: '2025-10-10',
      weekend: 195, midweek: 240, week: 295 },
    { name: 'Herfstvakantie 2025', start: '2025-10-10', end: '2025-10-24',
      weekend: 195, midweek: null, week: 320 }
  ];

  // =========================
  // Helpers
  // =========================
  function formatDate(dateString) {
    const [y, m, d] = dateString.split('-');
    return `${d}-${m}-${y}`;
  }
  function ymd(d) { // Date -> 'YYYY-MM-DD'
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function parseDMY(str) { // 'dd-mm-jjjj' -> Date
    const [dd, mm, yy] = str.split('-').map(Number);
    return new Date(yy, mm - 1, dd);
  }
  function parseYMD(s) { // 'YYYY-MM-DD' -> Date
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function addDays(d, n) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
  }
  function diffNights(startDMY, endDMY) {
    const ms = parseDMY(endDMY) - parseDMY(startDMY);
    return Math.round(ms / 86400000); // 1000*60*60*24
  }
  function between(dateStr, startStr, endStr) {
    const d = parseYMD(dateStr), s = parseYMD(startStr), e = parseYMD(endStr);
    return d >= s && d <= e;
  }
  function getSeasonFor(dateStrYMD) {
    return PRICING.find(s => between(dateStrYMD, s.start, s.end)) || null;
  }
  function getWeekNumber(d) {
    // ISO weeknummer
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = tmp.getUTCDay() || 7; // 1..7 (ma=1)
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  }

  // Type bepalen op basis van gekozen aankomst/vertrek
  function classifyStay(aDMY, dDMY) {
    const a = parseDMY(aDMY);
    const d = parseDMY(dDMY);
    const nights = diffNights(aDMY, dDMY);
    const aWD = a.getDay(); // 1=Ma,5=Vr
    const dWD = d.getDay();
    if (nights === 4 && aWD === 1 && dWD === 5) return { type: 'midweek', label: 'Midweek', nights };
    if (nights === 3 && aWD === 5 && dWD === 1) return { type: 'weekend', label: 'Weekend', nights };
    if (nights === 7 && ((aWD === 1 && dWD === 1) || (aWD === 5 && dWD === 5))) return { type: 'week', label: 'Week', nights };
    return { type: 'other', label: 'Onbekende periode', nights };
  }

  function getPriceFor(arrivalDMY, stayType) {
    const arrival = parseDMY(arrivalDMY);
    const season  = getSeasonFor(ymd(arrival));
    if (!season) return { price: null, seasonName: null };
    const val = season[stayType]; // weekend/midweek/week
    return { price: (typeof val === 'number' ? val : null), seasonName: season.name };
  }

  // Extra’s-berekening volgens jouw regels
  function computeExtras(aDMY, dDMY, stayType) {
    const nights = diffNights(aDMY, dDMY);

    // Toeristenbelasting: 4 € p.p.p.n., start met volwassenen
    const adults = parseInt(adultsInput?.value || '0', 10) || 0;
    let toerBel = 4 * adults * nights;

    // Baby’s (kind1/2/3 == 'baby') → 4/nacht eraf per baby
    const babies =
      (kind1Sel?.value === 'baby') +
      (kind2Sel?.value === 'baby') +
      (kind3Sel?.value === 'baby');
    toerBel = Math.max(0, toerBel - 4 * babies * nights);

    // Schoonmaak
    const schoon = (cleanSel && cleanSel.value === 'ja') ? 50 : 0;

    // Beddengoed: €4 * aantal
    let linenCount = parseInt(aantalBeddengoed?.value || '0', 10);
    if (isNaN(linenCount)) linenCount = 0;
    const linenCost = 4 * linenCount;

    // Handdoeken: week/midweek = €4 p.p. ; weekend = €2 p.p.
    // (Midweek niet gespecificeerd door jou; we nemen hier 4 zoals week. Pas aan als je anders wilt.)
    let towelsCount = parseInt(aantalHanddoeken?.value || '0', 10);
    if (isNaN(towelsCount)) towelsCount = 0;
    const towelRate = (stayType === 'weekend') ? 2 : 4;
    const towelCost = towelRate * towelsCount;

    // Campingbedje/kinderstoel: gratis, wel tonen
    const campingbedje = (campingbedjeSel && campingbedjeSel.value === 'ja') ? 0 : 0;
    const kinderstoel  = (kinderstoelSel  && kinderstoelSel.value  === 'ja') ? 0 : 0;

    // Hotspot: €25 totaal
    const hotspot = (hotspotSel && hotspotSel.value === 'ja') ? 25 : 0;

    return {
      nights, adults, babies,
      toerBel, schoon, linenCost, towelCost,
      campingbedje, kinderstoel, hotspot,
      linenCount, towelsCount, towelRate
    };
  }

  function euro(n) {
    if (n == null) return 'n.v.t.';
    return `€ ${Number(n).toFixed(0)},-`;
  }

  // UI updates
  function updateSelectedPeriodText() {
    const a = (selectedArrival?.textContent || '').trim();
    const d = (selectedDeparture?.textContent || '').trim();

    if (selectedPeriodEl) {
      if (a && d) {
        selectedPeriodEl.textContent = `Reservering voor de volgende periode: ${a} t/m ${d}`;
      } else if (a || d) {
        selectedPeriodEl.textContent = a ? `Aankomst: ${a}` : `Vertrek: ${d}`;
      } else {
        selectedPeriodEl.textContent = '';
      }
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

    const cls = classifyStay(a, d); // {type,label,nights}
    if (stayHidden) stayHidden.value = (cls.label || '');

    const { price, seasonName } = getPriceFor(a, cls.type);

    // Hoofdregel (indicatie)
    if (price) {
      const baseText = `${cls.label} · ${euro(price)} (${seasonName})`;
      if (priceSummary) priceSummary.textContent =
        `Je wilt boeken van ${a} t/m ${d}. Dat is een ${cls.label.toLowerCase()}. Indicatie: ${baseText} — exclusief toeristenbelasting, borg en extra’s. Vul het formulier in voor een preciezere prijs.`;
      if (priceHidden) priceHidden.value = `${cls.label} – ${euro(price)} (${seasonName})`;
    } else {
      const baseText = (cls.type === 'other')
        ? 'Deze periode valt buiten onze standaard week/weekend/midweek.'
        : 'Niet beschikbaar in deze periode.';
      if (priceSummary) priceSummary.textContent = `Je wilt boeken van ${a} t/m ${d}. ${baseText}`;
      if (priceHidden) priceHidden.value = baseText;
    }

    // Extra's berekenen en specificatie tonen
    const X = computeExtras(a, d, cls.type);
    if (priceSpecEl) {
      const rows = [];
      rows.push(`<div>Basis (${cls.label}): <strong>${price ? euro(price) : 'n.v.t.'}</strong></div>`);
      rows.push(`<div>Toeristenbelasting (4 p.p.p.n. × ${X.adults} volw${X.babies ? ` – ${X.babies} baby gratis` : ''} × ${X.nights} nachten): <strong>${euro(X.toerBel)}</strong></div>`);
      if (cleanSel && cleanSel.value === 'ja') rows.push(`<div>Schoonmaak: <strong>${euro(X.schoon)}</strong></div>`);
      if (aantalBeddengoed && aantalBeddengoed.value !== 'nvt' && X.linenCount > 0) rows.push(`<div>Linnengoed (${X.linenCount}×): <strong>${euro(X.linenCost)}</strong></div>`);
      if (aantalHanddoeken && aantalHanddoeken.value !== 'nvt' && X.towelsCount > 0) rows.push(`<div>Handdoeken (${X.towelsCount}× à €${X.towelRate}): <strong>${euro(X.towelCost)}</strong></div>`);
      if (campingbedjeSel && campingbedjeSel.value === 'ja') rows.push(`<div>Campingbedje: <strong>gratis</strong></div>`);
      if (kinderstoelSel && kinderstoelSel.value === 'ja') rows.push(`<div>Kinderstoel: <strong>gratis</strong></div>`);
      if (hotspotSel && hotspotSel.value === 'ja') rows.push(`<div>Hotspot: <strong>${euro(X.hotspot)}</strong></div>`);

      const subtotal = (price || 0) + X.toerBel + X.schoon + X.linenCost + X.towelCost + X.hotspot;
      rows.push(`<div style="margin-top:.25rem;border-top:1px solid #eee;padding-top:.25rem">Indicatief totaal (excl. borg & overige extra’s): <strong>${euro(subtotal)}</strong></div>`);
      priceSpecEl.innerHTML = rows.join('');
    }
  }

  // =========================
  // Kalender genereren (met weeknummers)
  // =========================
  function generateCalendar(year, month, calendarEl, monthYearEl, type) {
    calendarEl.innerHTML = '';

    const firstOfMonth = new Date(year, month, 1);
    const monthName = firstOfMonth.toLocaleString('default', { month: 'long' });
    monthYearEl.textContent = `${monthName} ${year}`;

    // Kopregel (weekdagen)
    weekdays.forEach(dayLabel => {
      const header = document.createElement('div');
      header.className = 'day header';
      header.textContent = dayLabel;
      calendarEl.appendChild(header);
    });

    const startWeekday = new Date(year, month, 1).getDay(); // 0=Zo..6=Za
    const daysInMonth  = new Date(year, month + 1, 0).getDate();

    // Leading blanks
    for (let i = 0; i < startWeekday; i++) {
      const empty = document.createElement('div');
      empty.className = 'day';
      calendarEl.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const jsDate  = new Date(year, month, day);
      const weekday = jsDate.getDay(); // 0=Zo..6=Za

      const dayDiv = document.createElement('div');
      dayDiv.className = 'day';
      dayDiv.textContent = day;

   // NIEUW
      if (weekday === 1) {
        const wk = getWeekNumber(jsDate);
        const wkBadge = document.createElement('div');
        wkBadge.className = 'wk-badge';
        wkBadge.textContent = `wk ${wk}`;
        dayDiv.prepend(wkBadge);
}


      // Seizoensgrenzen
      if (jsDate < SEASON_START || jsDate > SEASON_END) {
        dayDiv.className = 'day unavailable';
        calendarEl.appendChild(dayDiv);
        continue;
      }

      // Boekingen
      if (availability[dateKey] === 1) {
        dayDiv.className = 'day booked';
        calendarEl.appendChild(dayDiv);
        continue;
      }

      // Aankomst/Vertrek: ma of vr selecteerbaar
      const isAllowedWeekday = (weekday === 1 || weekday === 5); // ma/vr
      if ((type === 'arrival' || type === 'departure') && isAllowedWeekday) {
        dayDiv.className = 'day available';
        dayDiv.addEventListener('click', () => selectDate(type, dateKey, dayDiv, calendarEl));
      } else {
        dayDiv.className = 'day unavailable';
      }

      calendarEl.appendChild(dayDiv);
    }
  }

  // =========================
  // Selectie handlers
  // =========================
  function selectDate(type, dateKey, dayDiv, calendarEl) {
    const previouslySelected = calendarEl.querySelector('.selected');
    if (previouslySelected) previouslySelected.classList.remove('selected');
    dayDiv.classList.add('selected');

    const formatted = formatDate(dateKey); // dd-mm-jjjj
    if (type === 'arrival') {
      selectedArrival.textContent = formatted;
    } else if (type === 'departure') {
      selectedDeparture.textContent = formatted;
    }

    updateSelectedPeriodText();
    updatePriceAndExtras(); // zodra beide datums er zijn → type/prijs/extras tonen
  }

  // =========================
  // Synchronisatie helpers (zelfde maand)
  // =========================
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

  // =========================
  // Navigatie knoppen
  // =========================
  prevArrivalButton.addEventListener('click', () => {
    arrivalMonth--;
    if (arrivalMonth < 0) { arrivalMonth = 11; arrivalYear--; }
    renderFromArrival();
  });
  nextArrivalButton.addEventListener('click', () => {
    arrivalMonth++;
    if (arrivalMonth > 11) { arrivalMonth = 0; arrivalYear++; }
    renderFromArrival();
  });
  prevDepartureButton.addEventListener('click', () => {
    departureMonth--;
    if (departureMonth < 0) { departureMonth = 11; departureYear--; }
    generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
    setArrivalSameAsDeparture();
  });
  nextDepartureButton.addEventListener('click', () => {
    departureMonth++;
    if (departureMonth > 11) { departureMonth = 0; departureYear++; }
    generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
    setArrivalSameAsDeparture();
  });

  // Inputs voor extra’s → live herberekenen
  [adultsInput, childrenInput, kind1Sel, kind2Sel, kind3Sel,
   cleanSel, beddengoedSel, aantalBeddengoed, handdoekenSel,
   aantalHanddoeken, campingbedjeSel, kinderstoelSel, hotspotSel]
    .forEach(el => {
      if (el) {
        el.addEventListener('change', updatePriceAndExtras);
        el.addEventListener('input',  updatePriceAndExtras);
      }
    });

  // Init
  renderFromArrival();
});
