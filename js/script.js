// ======================================================================
// Reserveringskalender + automatische prijsberekening
// 1 kalender: aankomst + vertrek in hetzelfde blok
// ======================================================================

document.addEventListener('DOMContentLoaded', () => {
  // ----------------------
  // DOM referenties
  // ----------------------
  const calendarEl      = document.getElementById('calendar');
  const monthYearEl     = document.getElementById('month-year');
  const prevMonthButton = document.getElementById('prev-month');
  const nextMonthButton = document.getElementById('next-month');

  const selectedArrival   = document.getElementById('selected-arrival');
  const selectedDeparture = document.getElementById('selected-departure');

  const selectedPeriodEl = document.getElementById('selected-period');
  const arrivalHidden    = document.getElementById('arrival-hidden');
  const departureHidden  = document.getElementById('departure-hidden');

  const priceSummary    = document.getElementById('price-summary');
  const priceSpecEl     = document.getElementById('price-spec');
  const priceHidden     = document.getElementById('price-hidden');
  const priceSpecHidden = document.getElementById('price-spec-hidden');
  const stayHidden      = document.getElementById('stay-hidden');

  const personsInput = document.getElementById('personen');
  const babiesInput  = document.getElementById('babies');

  const cleanSel        = document.getElementById('schoonmaak');
  const beddengoedSel   = document.getElementById('beddengoed');
  const handdoekenAantalInput = document.getElementById('handdoeken-aantal');
  const campingbedjeSel = document.getElementById('campingbedje');
  const kinderstoelSel  = document.getElementById('kinderstoel');
  const hotspotSel      = document.getElementById('hotspot');

  // Als de nieuwe kalender-HTML nog niet is geplaatst, breek dan netjes af.
  if (!calendarEl || !monthYearEl || !prevMonthButton || !nextMonthButton) {
    console.warn('Kalender-HTML met id="calendar", "month-year", "prev-month" en "next-month" ontbreekt.');
    return;
  }

  // ----------------------
  // Kalender instellingen
  // ----------------------
  const today = new Date();
  let currentYear  = today.getFullYear();
  let currentMonth = today.getMonth();

  let arrivalDateYMD = '';
  let departureDateYMD = '';

  const weekdays = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

  // Vanaf morgen boekbaar
  const SEASON_START = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const SEASON_END   = new Date(today.getFullYear(), today.getMonth() + 13, 0);

  // ----------------------
  // Beschikbaarheid
  // ----------------------
  const availability = {};

  function addDateRange(startDate, endDate, status) {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    while (start <= end) {
      availability[start.toISOString().split('T')[0]] = status;
      start.setDate(start.getDate() + 1);
    }
  }

  addDateRange('2026-04-25', '2026-05-07', 1); // meivakantie
  addDateRange('2026-05-14', '2026-05-18', 1); // hemelvaart
  addDateRange('2026-05-22', '2026-05-25', 1); // pinksteren
  addDateRange('2026-07-09', '2026-08-14', 1); // zomervakantie noord (niet te boeken)
  addDateRange('2026-10-23', '2027-04-02', 1); // winter dicht

  // ----------------------
  // Prijzen
  // ----------------------
  const PRICING = [
    { name: 'Laagseizoen voorjaar 2026', start: '2026-03-13', end: '2026-04-02',
      weekend: 145, midweek: 195, week: 245, tweeweken: 395, drieweken: 565, anderhalveweek: 325, tweeenhalveweek: 500},

    { name: 'Paasweekend 2026', start: '2026-04-03', end: '2026-04-06',
      paasweekend: 250, weekend: null, midweek: null, week: null, tweeweken: null, drieweken: null, anderhalveweek: null, tweeenhalveweek: null },

    { name: 'Laagseizoen voorjaar 2026', start: '2026-04-07', end: '2026-04-24',
      weekend: 145, midweek: 195, week: 245, tweeweken: 395, drieweken: 565, anderhalveweek: 325, tweeenhalveweek: 500 },

    { name: 'Meivakantie 2026', start: '2026-04-25', end: '2026-05-07',
      weekend: null, midweek: null, week: null, tweeweken: null, drieweken: null, anderhalveweek: null, tweeenhalveweek: null },

    { name: 'Middenseizoen 2026', start: '2026-05-08', end: '2026-07-02',
      weekend: 195, midweek: 240, week: 295, tweeweken: 480, drieweken: 720, anderhalveweek: 435, tweeenhalveweek: 650 },

    { name: 'Zomervakantie 2026 (1e week Noord)', start: '2026-07-03', end: '2026-07-09',
      weekend: null, midweek: null, week: 395, tweeweken: null, drieweken: null, anderhalveweek: null, tweeenhalveweek: null },

    { name: 'Zomervakantie 2026', start: '2026-07-09', end: '2026-08-14',
      weekend: null, midweek: null, week: null, tweeweken: null, drieweken: null, anderhalveweek: null, tweeenhalveweek: null },

    { name: 'Zomervakantie 2026 (Zuid, Midden)', start: '2026-08-14', end: '2026-08-28',
      weekend: null, midweek: null, week: 395, tweeweken: null, drieweken: null, anderhalveweek: null, tweeenhalveweek: null },

    { name: 'Laagseizoen najaar 2026', start: '2026-08-28', end: '2026-10-09',
      weekend: 195, midweek: 240, week: 295, tweeweken: null, drieweken: null, anderhalveweek: null, tweeenhalveweek: null },

    { name: 'Herfstvakantie 2026', start: '2026-10-09', end: '2026-10-23',
      weekend: null, midweek: null, week: 320, tweeweken: 595, drieweken: null, anderhalveweek: null, tweeenhalveweek: null },
  ];

  // ----------------------
  // Verblijfspatronen
  // ----------------------
  const STAY_PATTERNS = [
    { key: 'weekend',       label: 'Weekend',       nights: 3,  arrivalWD: [5], departureWD: [1] }, // vr -> ma
    { key: 'midweek',       label: 'Midweek',       nights: 4,  arrivalWD: [1], departureWD: [5] }, // ma -> vr
    { key: 'week',          label: 'Week',          nights: 7,  arrivalWD: [1, 5], departureWD: [1, 5] },
    { key: 'anderhalveweek',label: '1,5 week',      nights: 10, arrivalWD: [5], departureWD: [1] }, // vr -> ma
    { key: 'anderhalveweek',label: '1,5 week',      nights: 11, arrivalWD: [1], departureWD: [5] }, // ma -> vr
    { key: 'tweeweken',     label: '2 weken',       nights: 14, arrivalWD: [1, 5], departureWD: [1, 5] },
    { key: 'tweeenhalveweek', label: '2,5 week',    nights: 17, arrivalWD: [5], departureWD: [1] }, // vr -> ma
    { key: 'tweeenhalveweek', label: '2,5 week',    nights: 18, arrivalWD: [1], departureWD: [5] }, // ma -> vr
    { key: 'drieweken',     label: '3 weken',       nights: 21, arrivalWD: [1, 5], departureWD: [1, 5] }
  ];

  // ----------------------
  // Helpers
  // ----------------------
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function ymd(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseYMD(ymdStr) {
    const [y, m, d] = ymdStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDate(ymdStr) {
    const [y, m, d] = ymdStr.split('-');
    return `${d}-${m}-${y}`;
  }

  function addDays(date, n) {
    const c = new Date(date);
    c.setDate(c.getDate() + n);
    return c;
  }

  function diffNights(aYMD, dYMD) {
    return Math.round((parseYMD(dYMD) - parseYMD(aYMD)) / 86400000);
  }

  function between(dateStr, startStr, endStr) {
    const d = parseYMD(dateStr);
    const s = parseYMD(startStr);
    const e = parseYMD(endStr);
    return d >= s && d <= e;
  }

  function euro(n) {
    return n == null ? 'n.v.t.' : `€ ${Number(n).toFixed(0)},-`;
  }

  function getWeekNumber(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil((((t - y0) / 86400000) + 1) / 7);
  }

  function isBookableWindow(dateObj) {
    return dateObj >= SEASON_START && dateObj <= SEASON_END;
  }

  function isBlocked(dateYMD) {
    return availability[dateYMD] === 1;
  }

  function hasArrivalSelection() {
    return arrivalDateYMD !== '';
  }

  function clearSelection() {
    arrivalDateYMD = '';
    departureDateYMD = '';
    if (selectedArrival) selectedArrival.textContent = '';
    if (selectedDeparture) selectedDeparture.textContent = '';
    updateSelectedPeriodText();
    updatePriceAndExtras();
    renderCalendar();
  }

  // ----------------------
  // Type & prijs
  // ----------------------
  function classifyStay(aYMD, dYMD) {
    const a = parseYMD(aYMD);
    const d = parseYMD(dYMD);
    const nights = diffNights(aYMD, dYMD);
    const aWD = a.getDay();
    const dWD = d.getDay();

    // Speciale logica voor Pasen 2026
    if (aYMD === '2026-04-03' && dYMD === '2026-04-06') {
      return { type: 'paasweekend', label: 'Paasweekend', nights };
    }
    if (aYMD === '2026-04-03' && dYMD === '2026-04-07') {
      return { type: 'paasweekend', label: 'Paasweekend', nights };
    }

    for (const p of STAY_PATTERNS) {
      if (nights === p.nights && p.arrivalWD.includes(aWD) && p.departureWD.includes(dWD)) {
        return { type: p.key, label: p.label, nights };
      }
    }

    return { type: 'other', label: 'Onbekende periode', nights };
  }

  function getSeasonFor(dateStrYMD) {
    return PRICING.find(s => between(dateStrYMD, s.start, s.end)) || null;
  }

  function getPriceFor(arrivalYMD, stayType) {
    const season = getSeasonFor(arrivalYMD);
    if (!season) return { price: null, seasonName: null };
    const v = season[stayType];
    return { price: (typeof v === 'number' ? v : null), seasonName: season.name };
  }

  // ----------------------
  // Range- en kliklogica
  // ----------------------
  function isRangeFree(aYMD, dYMD) {
    const start = parseYMD(aYMD);
    const end   = parseYMD(dYMD);

    const current = new Date(start);
    while (current <= end) {
      const key = ymd(current);
      if (isBlocked(key)) return false;
      current.setDate(current.getDate() + 1);
    }
    return true;
  }

  function isAllowedArrival(dateYMD) {
    const dateObj = parseYMD(dateYMD);
    const wd = dateObj.getDay();
    return isBookableWindow(dateObj) && !isBlocked(dateYMD) && (wd === 1 || wd === 5);
  }

  function getAllowedDepartureSet(arrivalYMD) {
    const set = new Set();
    if (!arrivalYMD) return set;

    const arrivalObj = parseYMD(arrivalYMD);

    // Speciale Paasuitzonderingen
    if (arrivalYMD === '2026-04-03') {
      ['2026-04-06', '2026-04-07'].forEach(dep => {
        if (isBookableWindow(parseYMD(dep)) && !isBlocked(dep) && isRangeFree(arrivalYMD, dep)) {
          set.add(dep);
        }
      });
    }

    // Standaardpatronen
    for (const p of STAY_PATTERNS) {
      const depObj = addDays(arrivalObj, p.nights);
      const depYMD = ymd(depObj);

      if (!isBookableWindow(depObj)) continue;
      if (isBlocked(depYMD)) continue;
      if (!isRangeFree(arrivalYMD, depYMD)) continue;

      const cls = classifyStay(arrivalYMD, depYMD);
      if (cls.type === p.key) {
        set.add(depYMD);
      }
    }

    return set;
  }

  function selectDate(dateYMD) {
    // Eerste klik of nieuwe selectie beginnen
    if (!arrivalDateYMD || (arrivalDateYMD && departureDateYMD)) {
      if (!isAllowedArrival(dateYMD)) return;

      arrivalDateYMD = dateYMD;
      departureDateYMD = '';
      if (selectedArrival) selectedArrival.textContent = formatDate(arrivalDateYMD);
      if (selectedDeparture) selectedDeparture.textContent = '';
      updateSelectedPeriodText();
      updatePriceAndExtras();
      renderCalendar();
      return;
    }

    // Tweede klik: of opnieuw aankomst kiezen
    if (arrivalDateYMD && !departureDateYMD) {
      if (dateYMD === arrivalDateYMD) {
        clearSelection();
        return;
      }

      const allowedDepartureSet = getAllowedDepartureSet(arrivalDateYMD);

      // Klik op andere geldige aankomstdatum = nieuwe selectie starten
      if (!allowedDepartureSet.has(dateYMD) && isAllowedArrival(dateYMD)) {
        arrivalDateYMD = dateYMD;
        departureDateYMD = '';
        if (selectedArrival) selectedArrival.textContent = formatDate(arrivalDateYMD);
        if (selectedDeparture) selectedDeparture.textContent = '';
        updateSelectedPeriodText();
        updatePriceAndExtras();
        renderCalendar();
        return;
      }

      if (!allowedDepartureSet.has(dateYMD)) return;

      departureDateYMD = dateYMD;
      if (selectedDeparture) selectedDeparture.textContent = formatDate(departureDateYMD);
      updateSelectedPeriodText();
      updatePriceAndExtras();
      renderCalendar();
    }
  }

  // ----------------------
  // Extra’s berekening
  // ----------------------
    function computeExtras(aYMD, dYMD, stayType) {
    const nights = diffNights(aYMD, dYMD);

    const persons = parseInt(personsInput?.value || '0', 10) || 0;
    const babies  = parseInt(babiesInput?.value || '0', 10) || 0;

    // 0-2 jaar gratis, vanaf 3 jaar toeristenbelasting
    const payingPersons = Math.max(persons - babies, 0);

    const toerBel = 4 * payingPersons * nights;
    const schoon  = cleanSel?.checked ? 50 : 0;
    const borg    = 100;

    const linenCount = beddengoedSel?.checked ? payingPersons : 0;
    const linenCost  = 4 * linenCount;

    const towelsCount = parseInt(handdoekenAantalInput?.value || '0', 10) || 0;
    const towelRate = 4; // €4 per set
    const towelCost = towelsCount * towelRate;

    const campingbedje = campingbedjeSel?.checked ? 0 : 0;
    const kinderstoel  = kinderstoelSel?.checked ? 0 : 0;
    
    let hotspot = 0;

      if (hotspotSel?.checked) {
        if (nights >= 14) {
          hotspot = 50; // 2 weken of langer
        } else {
          hotspot = 25;
        }
      }

    return {
      nights,
      persons,
      babies,
      payingPersons,
      toerBel,
      schoon,
      borg,
      linenCount,
      linenCost,
      towelsCount,
      towelRate,
      towelCost,
      campingbedje,
      kinderstoel,
      hotspot
    };
  }

  // ----------------------
  // UI updates
  // ----------------------
  function updateSelectedPeriodText() {
    const a = arrivalDateYMD ? formatDate(arrivalDateYMD) : '';
    const d = departureDateYMD ? formatDate(departureDateYMD) : '';

    if (selectedPeriodEl) {
      if (a && d) selectedPeriodEl.textContent = `Reservering voor de volgende periode: ${a} t/m ${d}`;
      else if (a) selectedPeriodEl.textContent = `Aankomst: ${a}`;
      else selectedPeriodEl.textContent = '';
    }

    if (arrivalHidden) arrivalHidden.value = a;
    if (departureHidden) departureHidden.value = d;
  }

  function updatePriceAndExtras() {
    const a = arrivalDateYMD;
    const d = departureDateYMD;

    if (!a || !d) {
      if (priceSummary)    priceSummary.textContent = '';
      if (priceSpecEl)     priceSpecEl.innerHTML = '';
      if (priceHidden)     priceHidden.value = '';
      if (priceSpecHidden) priceSpecHidden.value = '';
      if (stayHidden)      stayHidden.value = '';
      return;
    }

    const arrivalDate   = parseYMD(a);
    const departureDate = parseYMD(d);

    if (departureDate <= arrivalDate) {
      if (priceSummary) priceSummary.textContent = 'De vertrekdatum moet na de aankomstdatum liggen.';
      if (priceSpecEl) priceSpecEl.innerHTML = '';
      if (priceSpecHidden) priceSpecHidden.value = '';
      return;
    }

    const cls = classifyStay(a, d);
    if (stayHidden) stayHidden.value = cls.label || '';

    const { price, seasonName } = getPriceFor(a, cls.type);

    if (price) {
      const baseText = `${cls.label} = ${euro(price)} (${seasonName})`;
      if (priceSummary) {
        priceSummary.textContent =
          `Je wilt boeken van ${formatDate(a)} t/m ${formatDate(d)}. Dat is een ${cls.label.toLowerCase()}. Prijsindicatie: ${baseText} — exclusief toeristenbelasting, borg en extra’s. Vul het formulier in voor een preciezere prijs excl. borg en campingkosten.`;
      }
      if (priceHidden) priceHidden.value = `${cls.label} – ${euro(price)} (${seasonName})`;
    } else {
      const baseText = (cls.type === 'other')
        ? 'Deze periode valt buiten onze standaard week/weekend/midweek.'
        : 'Niet beschikbaar in deze periode.';
      if (priceSummary) priceSummary.textContent = `Je wilt boeken van ${formatDate(a)} t/m ${formatDate(d)}. ${baseText}`;
      if (priceHidden) priceHidden.value = baseText;
    }

    const X = computeExtras(a, d, cls.type);

    if (priceSpecEl) {
      const tableRows = [];
      const tbParts = [];

      tableRows.push(`<tr>
      <td>Huur ${cls.label} (${formatDate(a)} t/m ${formatDate(d)})</td>
      <td><strong>${euro(price)}</strong></td>
      </tr>`);

      tbParts.push(`€4 p.p.p.n. × ${X.payingPersons} ${X.payingPersons === 1 ? 'persoon' : 'personen'}`);
      if (X.babies > 0) tbParts.push(`+ ${X.babies} kind${X.babies > 1 ? 'eren' : ''} van 0-2 jaar gratis`);

      tableRows.push(`<tr><td>Toeristenbelasting<br><small>(${tbParts.join(' ')} × ${X.nights} nachten)</small></td><td><strong>${euro(X.toerBel)}</strong></td></tr>`);

      if (cleanSel?.checked)
        tableRows.push(`<tr><td>Eindschoonmaak (door ons uitgevoerd)</td><td><strong>${euro(X.schoon)}</strong></td></tr>`);

      if (X.linenCount > 0)
        tableRows.push(`<tr><td>Linnengoed (${X.linenCount}×)</td><td><strong>${euro(X.linenCost)}</strong></td></tr>`);

      if (X.towelsCount > 0)
        tableRows.push(`<tr><td>Handdoeksets (${X.towelsCount}× à €${X.towelRate})</td><td><strong>${euro(X.towelCost)}</strong></td></tr>`);

      if (campingbedjeSel?.checked)
        tableRows.push(`<tr><td>Campingbedje</td><td><strong>gratis</strong></td></tr>`);

      if (kinderstoelSel?.checked)
        tableRows.push(`<tr><td>Kinderstoel</td><td><strong>gratis</strong></td></tr>`);

      if (hotspotSel?.checked)
        tableRows.push(`<tr><td>Hotspot (wifi in caravan)</td><td><strong>${euro(X.hotspot)}</strong></td></tr>`);

      const subtotal = (price || 0) + X.toerBel + X.schoon + X.linenCost + X.towelCost + X.hotspot;

      tableRows.push(`<tr class="price-total">
        <td><strong>Totaalbedrag</strong><br><small>excl. borg en campingextra’s</small></td>
        <td><strong>${euro(subtotal)}</strong></td>
        </tr>`);

        tableRows.push(`<tr>
        <td>Borg (wordt teruggestort na controle caravan)</td>
        <td><strong>${euro(X.borg)}</strong></td>
        </tr>`);

      priceSpecEl.innerHTML = `
        <table class="prijs-tabel">
          <tbody>
            ${tableRows.join('')}
          </tbody>
        </table>
      `;

      if (priceSpecHidden) {
        priceSpecHidden.value = [
          `Periode: ${formatDate(a)} t/m ${formatDate(d)}`,
          `Basis (${cls.label}): ${price ? euro(price) : 'n.v.t.'}`,
          `Toeristenbelasting: ${euro(X.toerBel)}`,
          X.schoon ? `Schoonmaak: ${euro(X.schoon)}` : '',
          X.linenCount > 0 ? `Linnengoed (${X.linenCount}x): ${euro(X.linenCost)}` : '',
          X.towelsCount > 0 ? `Handdoeken (${X.towelsCount}x): ${euro(X.towelCost)}` : '',
          campingbedjeSel?.checked ? 'Campingbedje: gratis' : '',
          kinderstoelSel?.checked ? 'Kinderstoel: gratis' : '',
          X.hotspot ? `Hotspot: ${euro(X.hotspot)}` : '',
          `Borg: ${euro(X.borg)}`,
          `Totaalbedrag excl. borg en campingextra's: ${euro(subtotal)}`
        ].filter(Boolean).join('\n');
      }
    }
  }

  // ----------------------
  // Kalender genereren
  // ----------------------
  function renderCalendar() {
    calendarEl.innerHTML = '';

    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    monthYearEl.textContent = `${firstOfMonth.toLocaleString('default', { month: 'long' })} ${currentYear}`;

    weekdays.forEach(lbl => {
      const h = document.createElement('div');
      h.className = 'day header';
      h.textContent = lbl;
      calendarEl.appendChild(h);
    });

    const startWD = firstOfMonth.getDay();
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < startWD; i++) {
      const e = document.createElement('div');
      e.className = 'day empty';
      calendarEl.appendChild(e);
    }

    const allowedDepartureSet = hasArrivalSelection() ? getAllowedDepartureSet(arrivalDateYMD) : new Set();

    for (let d = 1; d <= days; d++) {
      const jsDate = new Date(currentYear, currentMonth, d);
      const dateKey = ymd(jsDate);
      const wd = jsDate.getDay();

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day';
      cell.textContent = d;
      cell.dataset.date = dateKey;

      if (wd === 0) {
        const wk = getWeekNumber(jsDate);
        const badge = document.createElement('div');
        badge.className = 'wk-badge';
        badge.textContent = `wk ${wk}`;
        cell.prepend(badge);
      }

      if (!isBookableWindow(jsDate)) {
        cell.classList.add('unavailable');
        cell.disabled = true;
        calendarEl.appendChild(cell);
        continue;
      }

      if (isBlocked(dateKey)) {
        cell.classList.add('booked');
        cell.disabled = true;
        calendarEl.appendChild(cell);
        continue;
      }

      const isSelectedStart = arrivalDateYMD && dateKey === arrivalDateYMD;
      const isSelectedEnd   = departureDateYMD && dateKey === departureDateYMD;
      const isInRange = arrivalDateYMD && departureDateYMD &&
        parseYMD(dateKey) > parseYMD(arrivalDateYMD) &&
        parseYMD(dateKey) < parseYMD(departureDateYMD);

      if (isSelectedStart) cell.classList.add('selected-start');
      if (isSelectedEnd) cell.classList.add('selected-end');
      if (isInRange) cell.classList.add('selected-range');

      let isClickable = false;

      if (!arrivalDateYMD || (arrivalDateYMD && departureDateYMD)) {
        if (isAllowedArrival(dateKey)) {
          cell.classList.add('available', 'arrival-option');
          isClickable = true;
        } else {
          cell.classList.add('unavailable');
          cell.disabled = true;
        }
      } else {
        // Alleen nog vertrek kiezen of opnieuw een aankomstdatum starten
        if (dateKey === arrivalDateYMD) {
          cell.classList.add('available', 'arrival-option');
          isClickable = true;
        } else if (allowedDepartureSet.has(dateKey)) {
          cell.classList.add('available', 'departure-option');
          isClickable = true;
        } else if (isAllowedArrival(dateKey)) {
          cell.classList.add('available', 'arrival-option');
          isClickable = true;
        } else {
          cell.classList.add('unavailable');
          cell.disabled = true;
        }
      }

      if (isClickable) {
        cell.addEventListener('click', () => selectDate(dateKey));
      }

      calendarEl.appendChild(cell);
    }
  }

  // ----------------------
  // Navigatie
  // ----------------------
  prevMonthButton.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  nextMonthButton.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  // Extra’s live herberekenen
  [
    personsInput, babiesInput,
    cleanSel, beddengoedSel, handdoekenAantalInput,
    campingbedjeSel, kinderstoelSel, hotspotSel
  ].forEach(el => {
    if (el) {
      el.addEventListener('change', updatePriceAndExtras);
      el.addEventListener('input', updatePriceAndExtras);
    }
  });

  renderCalendar();
  updateSelectedPeriodText();
  updatePriceAndExtras();
});

// ======================================================================
// Formulier + ontvangstoverzicht
// ======================================================================

document.addEventListener('DOMContentLoaded', () => {
  const form   = document.getElementById('boeken');
  const thanks = document.getElementById('submission-receipt');

  if (!form || !thanks) return;

  function getLabelFor(input) {
    if (!input.id) return '';
    const lbl = form.querySelector(`label[for="${input.id}"]`);
    return lbl ? lbl.textContent.trim().replace(/\*+$/, '') : (input.name || input.id);
  }

  function addRow(tbody, label, value) {
    if (!value || String(value).trim() === '') return;
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');
    th.textContent = label;
    td.textContent = value;
    td.className = 'num';
    tr.append(th, td);
    tbody.appendChild(tr);
  }

  async function submitToFormspree(ev) {
    ev.preventDefault();

    const fd = new FormData(form);
    const mail = fd.get('email') || '';

    const ccField = document.getElementById('cc-email');
    if (ccField) {
      ccField.value = mail;
      fd.set('_cc', mail);
    }

    fd.set('_replyto', mail);

    try {
      const res = await fetch(form.action, {
        method: form.method || 'POST',
        body: fd,
        headers: { 'Accept': 'application/json' }
      });

      buildReceiptTable(fd, mail);

      form.style.display = 'none';
      thanks.style.display = '';

      const btn = document.getElementById('receipt-print');
      if (btn) btn.onclick = () => window.print();

      if (!res.ok) {
        console.warn('Formspree gaf geen 200 terug:', res.status);
      }
    } catch (e) {
      console.error('Verzenden naar Formspree mislukte:', e);
      buildReceiptTable(fd, mail);
      form.style.display = 'none';
      thanks.style.display = '';
    }
  }

  function buildReceiptTable(fd, mail) {
    const srcSummary = document.getElementById('price-summary');
    const srcSpec    = document.getElementById('price-spec');
    const dstSummary = document.getElementById('receipt-price-summary');
    const dstSpec    = document.getElementById('receipt-price-spec');

    if (dstSummary && srcSummary) dstSummary.textContent = srcSummary.textContent;
    if (dstSpec && srcSpec) dstSpec.innerHTML = srcSpec.innerHTML;

    const tbody = document.querySelector('#receipt-table tbody');
    tbody.innerHTML = '';

    const aankomst = (document.getElementById('arrival-hidden')?.value) || '';
    const vertrek  = (document.getElementById('departure-hidden')?.value) || '';
    if (aankomst || vertrek) {
      addRow(tbody, 'Periode', `${aankomst || '?'} t/m ${vertrek || '?'}`);
    }

    const skipNames = new Set([
      '_subject', '_replyto', '_cc',
      'IndicatiefTotaal', 'PrijsIndicatie', 'PrijsSpecificatie',
      'Verblijfstype', 'arrival-hidden', 'departure-hidden'
    ]);

    form.querySelectorAll('input, select, textarea').forEach(el => {
      const type = (el.type || '').toLowerCase();
      const name = el.name || el.id;

      if (type === 'submit' || type === 'button' || type === 'reset') return;
      if (!name || skipNames.has(name)) return;

      let val = '';
      if (type === 'checkbox') {
        val = el.checked ? 'Ja' : 'Nee';
      } else if (type === 'radio') {
        if (!el.checked) return;
        val = el.value;
      } else {
        val = el.value;
      }

      const label = getLabelFor(el);
      addRow(tbody, label || name, val);
    });

    const stayHidden  = document.getElementById('stay-hidden')?.value;
    const priceHidden = document.getElementById('price-hidden')?.value;
    if (stayHidden) addRow(tbody, 'Verblijfstype', stayHidden);
    if (priceHidden) addRow(tbody, 'Prijsindicatie', priceHidden);

    const specText = (document.getElementById('price-spec')?.innerText || '');
    const lastLine = specText.split('\n').reverse().find(l => /Totaalbedrag/i.test(l));
    if (lastLine) addRow(tbody, 'Totaalbedrag', lastLine.replace(/^.*?:\s*/, '').trim());
  }

  form.addEventListener('submit', submitToFormspree);
});