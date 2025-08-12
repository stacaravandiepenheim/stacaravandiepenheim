// ============================
// Reserveringskalender (2 kalenders)
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

  // --- Startmaanden (0-based maanden)
  let arrivalYear  = 2025;
  let arrivalMonth = 7;  // Aug 2025
  let departureYear  = 2025;
  let departureMonth = 8; // Sep 2025

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

  // --------------------
  // Helpers
  // --------------------
  function formatDate(dateString) {
    const [y, m, d] = dateString.split('-');
    return `${d}-${m}-${y}`;
  }

  function getWeekNumber(d) {
    // ISO weeknummer
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = tmp.getUTCDay() || 7; // 1..7 (ma=1)
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  }

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

  function selectDate(type, dateKey, dayDiv, calendarEl) {
    const previouslySelected = calendarEl.querySelector('.selected');
    if (previouslySelected) previouslySelected.classList.remove('selected');
    dayDiv.classList.add('selected');

    const formatted = formatDate(dateKey);
    if (type === 'arrival') {
      selectedArrival.textContent = formatted;
    } else if (type === 'departure') {
      selectedDeparture.textContent = formatted;
    }
    updateSelectedPeriodText();
  }

  // --------------------
  // Kalender genereren (met weeknummers)
  // --------------------
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

    // Leading blanks (voor de 1e dag van de maand)
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

      // Weeknummer tonen op elke MAANDAG (weekday==1)
      if (weekday === 1) {
        const wk = getWeekNumber(jsDate);
        const wkBadge = document.createElement('div');
        wkBadge.textContent = `wk ${wk}`;
        wkBadge.style.fontSize = '0.7rem';
        wkBadge.style.opacity  = '0.8';
        wkBadge.style.marginBottom = '2px';
        dayDiv.prepend(wkBadge);
      }

      // Seizoensgrenzen toepassen
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

      // Aankomst-/Vertrekdag (alleen ma of vr)
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

  // --------------------
  // Synchronisatie helpers (altijd 1 maand verschil)
  // --------------------
  function setDepartureOneMonthAfterArrival() {
    departureYear  = arrivalYear;
    departureMonth = arrivalMonth + 1;
    if (departureMonth > 11) { departureMonth = 0; departureYear++; }
    generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
  }

  function setArrivalOneMonthBeforeDeparture() {
    arrivalYear  = departureYear;
    arrivalMonth = departureMonth - 1;
    if (arrivalMonth < 0) { arrivalMonth = 11; arrivalYear--; }
    generateCalendar(arrivalYear, arrivalMonth, arrivalCalendar, arrivalMonthYear, 'arrival');
  }

  function renderFromArrival() {
    generateCalendar(arrivalYear, arrivalMonth, arrivalCalendar, arrivalMonthYear, 'arrival');
    setDepartureOneMonthAfterArrival();
  }

  // --------------------
  // Navigatie knoppen
  // --------------------
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
    setArrivalOneMonthBeforeDeparture();
  });

  nextDepartureButton.addEventListener('click', () => {
    departureMonth++;
    if (departureMonth > 11) { departureMonth = 0; departureYear++; }
    generateCalendar(departureYear, departureMonth, departureCalendar, departureMonthYear, 'departure');
    setArrivalOneMonthBeforeDeparture();
  });

  // Init
  renderFromArrival();
});
