// ======================================================================
// Reserveringskalender + automatische prijsberekening
// 1 kalender: aankomst + vertrek in hetzelfde blok
// ======================================================================

document.addEventListener('DOMContentLoaded', () => {
  // ----------------------
  // DOM referenties
  // ----------------------
  const calendarEl = document.getElementById('calendar');
  const monthYearEl = document.getElementById('month-year');
  const prevMonthButton = document.getElementById('prev-month');
  const nextMonthButton = document.getElementById('next-month');

  const selectedArrival = document.getElementById('selected-arrival');
  const selectedDeparture = document.getElementById('selected-departure');

  const selectedPeriodEl = document.getElementById('selected-period');
  const arrivalHidden = document.getElementById('arrival-hidden');
  const departureHidden = document.getElementById('departure-hidden');

  const priceSummary = document.getElementById('price-summary');
  const priceSpecEl = document.getElementById('price-spec');
  const priceHidden = document.getElementById('price-hidden');
  const priceSpecHidden = document.getElementById('price-spec-hidden');
  const stayHidden = document.getElementById('stay-hidden');

  const personsInput = document.getElementById('personen');
  const babiesInput = document.getElementById('babies');

  const cleanSel = document.getElementById('schoonmaak');
  const beddengoedSel = document.getElementById('beddengoed');
  const handdoekenAantalInput = document.getElementById('handdoeken-aantal');
  const campingbedjeSel = document.getElementById('campingbedje');
  const kinderstoelSel = document.getElementById('kinderstoel');
  const hotspotSel = document.getElementById('hotspot');

  if (!calendarEl || !monthYearEl || !prevMonthButton || !nextMonthButton) {
    console.warn('Kalender-HTML met id="calendar", "month-year", "prev-month" en "next-month" ontbreekt.');
    return;
  }

  // ----------------------
  // Kalender instellingen
  // ----------------------
  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  let arrivalDateYMD = '';
  let departureDateYMD = '';

  const weekdays = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const MIN_NIGHTS = 2;

  // Gewone boekregel: andere aankomstdagen minimaal 3 dagen van tevoren
  const SEASON_START = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
  const SEASON_END = new Date(today.getFullYear(), today.getMonth() + 13, 0);

  // Vrijdag/zat/zon/ma-aankomsten mogen nog tot een deadline van 10:00 geboekt worden
  const LAST_MINUTE_HOUR = 10;

  const SPECIAL_LAST_MINUTE_ARRIVALS = {
    '2026-04-21': {
      deadline: '2026-04-20T21:00:00'
    }
  };
  // ----------------------
  // Beschikbaarheid
  // ----------------------
  const availability = {};

  function addDateRange(startDate, endDate, status = 'unavailable') {
    const start = new Date(startDate);
    const end = new Date(endDate);

    while (start <= end) {
      availability[start.toISOString().split('T')[0]] = status;
      start.setDate(start.getDate() + 1);
    }
  }

  addDateRange('2026-05-02', '2026-05-03', 'unavailable'); // meivakantie
  addDateRange('2026-05-04', '2026-05-13', 'bezet');       // verhuurd / bezet
  addDateRange('2026-05-14', '2026-05-17', 'unavailable'); // hemelvaart
  addDateRange('2026-05-22', '2026-05-24', 'unavailable'); // pinksteren
  addDateRange('2026-05-30', '2026-06-04', 'bezet');       // verhuurd / bezet
  addDateRange('2026-06-15', '2026-06-21', 'bezet');       // verhuurd / bezet
  addDateRange('2026-07-04', '2026-07-11', 'bezet');       // verhuurd / bezet
  addDateRange('2026-07-12', '2026-08-06', 'unavailable'); // zomervakantie noord (niet te boeken)
  addDateRange('2026-10-23', '2027-04-02', 'unavailable'); // winter dicht
  // ----------------------
  // Prijzen
  // ----------------------
  const PRICING = [
    {
      name: 'Laagseizoen voorjaar 2026',
      start: '2026-03-13',
      end: '2026-04-02',
      night_mon_thu: 45,
      night_fri: 50,
      night_sat: 50,
      night_sun: 50
    },
    {
      name: 'Laagseizoen voorjaar 2026',
      start: '2026-04-06',
      end: '2026-04-18',
      night_mon_thu: 45,
      night_fri: 50,
      night_sat: 50,
      night_sun: 50
    },
    {
      name: 'Meivakantie 2026',
      start: '2026-04-19',
      end: '2026-05-02',
      night_mon_thu: 48,
      night_fri: 75,
      night_sat: 75,
      night_sun: 70
    },
    
  
    {
      name: 'Meivakantie 2026',
      start: '2026-05-02',
      end: '2026-05-03',
      night_mon_thu: null,
      night_fri: null,
      night_sat: null,
      night_sun: null
    },
    {
      name: 'Middenseizoen 2026',
      start: '2026-05-04',
      end: '2026-07-02',
      night_mon_thu: 45,
      night_fri: 50,
      night_sat: 50,
      night_sun: 50
    },
    {
      name: 'Zomervakantie 2026 (1e week Noord)',
      start: '2026-07-03',
      end: '2026-07-11',
      night_mon_thu: 50,
      night_fri: 55,
      night_sat: 55,
      night_sun: 55
    },
    {
      name: 'Zomervakantie 2026 Bezet',
      start: '2026-07-12',
      end: '2026-08-06',
      night_mon_thu: null,
      night_fri: null,
      night_sat: null,
      night_sun: null
    },
    {
      name: 'Zomervakantie 2026',
      start: '2026-08-06',
      end: '2026-08-29',
      night_mon_thu: 55,
      night_fri: 55,
      night_sat: 55,
      night_sun: 55
    },
    {
      name: 'Laagseizoen najaar 2026',
      start: '2026-08-28',
      end: '2026-10-09',
      night_mon_thu: 45,
      night_fri: 50,
      night_sat: 50,
      night_sun: 50
    },
    {
      name: 'Herfstvakantie 2026',
      start: '2026-10-09',
      end: '2026-10-23',
      night_mon_thu: 50,
      night_fri: 55,
      night_sat: 55,
      night_sun: 55
    }
  ];

  // ----------------------
  // Verblijfspatronen
  // ----------------------
  const STAY_PATTERNS = [
    { key: 'weekend', label: 'Weekend', nights: 3, arrivalWD: [5], departureWD: [1] },
    { key: 'midweek', label: 'Midweek', nights: 4, arrivalWD: [1], departureWD: [5] },
    { key: 'week', label: 'Week', nights: 7, arrivalWD: [1, 5], departureWD: [1, 5] },
    { key: 'anderhalveweek', label: '1,5 week', nights: 10, arrivalWD: [5], departureWD: [1] },
    { key: 'anderhalveweek', label: '1,5 week', nights: 11, arrivalWD: [1], departureWD: [5] },
    { key: 'tweeweken', label: '2 weken', nights: 14, arrivalWD: [1, 5], departureWD: [1, 5] },
    { key: 'tweeenhalveweek', label: '2,5 week', nights: 17, arrivalWD: [5], departureWD: [1] },
    { key: 'tweeenhalveweek', label: '2,5 week', nights: 18, arrivalWD: [1], departureWD: [5] },
    { key: 'drieweken', label: '3 weken', nights: 21, arrivalWD: [1, 5], departureWD: [1, 5] }
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
    return n == null
      ? 'n.v.t.'
      : `€ ${Number(n).toFixed(2).replace('.', ',')}`;
  }

  function getWeekNumber(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil((((t - y0) / 86400000) + 1) / 7);
  }

  function isBookableWindow(dateObj) {
    return dateObj <= SEASON_END;
  }

  function stripTime(dateObj) {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  }

  function isBlocked(dateYMD) {
  return !!availability[dateYMD];
  }
  function isChangeoverDay(dateYMD) {
  if (!isBlocked(dateYMD)) return false;

  const previousDay = ymd(addDays(parseYMD(dateYMD), -1));

  // Als de dag ervoor niet geblokkeerd is → vertrekdag
  return !isBlocked(previousDay);
}

  function isArrivalChangeoverDay(dateYMD) {
    if (isBlocked(dateYMD)) return false;

    const previousDay = ymd(addDays(parseYMD(dateYMD), -1));

    // Als vorige dag bezet is → aankomstdag na bezetting
    return isBlocked(previousDay);
  }


  function getAvailabilityStatus(dateYMD) {
    return availability[dateYMD] || null;
  }

  function hasArrivalSelection() {
    return arrivalDateYMD !== '';
  }

  function monthHasAllowedArrival(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateKey = ymd(dateObj);

      if (isAllowedArrival(dateKey)) {
        return true;
      }
    }

    return false;
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


    for (const p of STAY_PATTERNS) {
      if (nights === p.nights && p.arrivalWD.includes(aWD) && p.departureWD.includes(dWD)) {
        return { type: p.key, label: p.label, nights };
      }
    }

    return { type: 'other', label: `${nights} nacht${nights === 1 ? '' : 'en'}`, nights };
  }


  function getSeasonFor(dateStrYMD) {
    return PRICING.find(s => between(dateStrYMD, s.start, s.end)) || null;
  }

  function getNightPriceForDate(dateStrYMD) {
    const season = getSeasonFor(dateStrYMD);
    if (!season) return { nightPrice: null, seasonName: null };

    const dateObj = parseYMD(dateStrYMD);
    const wd = dateObj.getDay();

    let nightPrice = null;

    if (wd >= 1 && wd <= 4) {
      nightPrice = season.night_mon_thu;
    } else if (wd === 5) {
      nightPrice = season.night_fri;
    } else if (wd === 6) {
      nightPrice = season.night_sat;
    } else if (wd === 0) {
      nightPrice = season.night_sun;
    }

    return {
      nightPrice: typeof nightPrice === 'number' ? nightPrice : null,
      seasonName: season.name
    };
  }

  function getPriceForRange(arrivalYMD, departureYMD) {
  const cls = classifyStay(arrivalYMD, departureYMD);

    const arrival = parseYMD(arrivalYMD);
    const departure = parseYMD(departureYMD);

    const summerStart = parseYMD('2026-08-06');
    const summerEnd = parseYMD('2026-08-29');

    // Alleen als het hele verblijf binnen augustus/zomervakantie valt
    const isAugustSummerStay = arrival >= summerStart && departure <= summerEnd;

    if (isAugustSummerStay && cls.type === 'tweeweken') {
      return {
        price: 695,
        seasonName: '2 weken zomervakantie augustus',
        parts: [{
          seasonName: '2 weken zomervakantie augustus',
          nights: cls.nights,
          amount: 695
        }],
        unavailableDate: null
      };
    }

    if (isAugustSummerStay && cls.type === 'drieweken') {
      return {
        price: 995,
        seasonName: '3 weken zomervakantie augustus',
        parts: [{
          seasonName: '3 weken zomervakantie augustus',
          nights: cls.nights,
          amount: 995
        }],
        unavailableDate: null
      };
    }
  // Vaste pakketprijzen, allemaal exclusief toeristenbelasting
  const packagePrices = {
    weekend: {
      price: 150,
      label: 'Weekend'
    },
    midweek: {
      price: 160,
      label: 'Midweek'
    },
    week: {
      price: 250,
      label: 'Week'
    },
    anderhalveweek: {
      price: 350,
      label: '1,5 week'
    },
    tweeweken: {
      price: 475,
      label: '2 weken'
    }
  };

  if (packagePrices[cls.type]) {
    const pkg = packagePrices[cls.type];

    return {
      price: pkg.price,
      seasonName: pkg.label,
      parts: [{
        seasonName: pkg.label,
        nights: cls.nights,
        amount: pkg.price
      }],
      unavailableDate: null
    };
  }

  // Alle andere periodes: losse nachten volgens dagprijzen
  const start = parseYMD(arrivalYMD);
  const end = parseYMD(departureYMD);

  let current = new Date(start);
  let total = 0;
  const parts = [];

  while (current < end) {
    const dateKey = ymd(current);
    const { nightPrice, seasonName } = getNightPriceForDate(dateKey);

    if (nightPrice == null) {
      return {
        price: null,
        seasonName: null,
        parts: [],
        unavailableDate: dateKey
      };
    }

    const existing = parts.find(p => p.seasonName === seasonName);
    if (existing) {
      existing.nights += 1;
      existing.amount += nightPrice;
    } else {
      parts.push({
        seasonName,
        nights: 1,
        amount: nightPrice
      });
    }

    total += nightPrice;
    current = addDays(current, 1);
  }

  return {
    price: Math.round(total * 100) / 100,
    seasonName: parts.map(p => p.seasonName).join(' + '),
    parts,
    unavailableDate: null
  };
}
  function getLongStayDiscount(basePrice, nights) {
    if (basePrice == null) {
      return {
        discountPercent: 0,
        discountAmount: 0,
        discountedPrice: null
      };
    }

    let discountPercent = 0;

    if (nights >= 14) {
      discountPercent = 15;
    } else if (nights >= 10) {
      discountPercent = 12;
    } else if (nights >= 7) {
      discountPercent = 10;
    }

    const discountAmount = Math.round(basePrice * (discountPercent / 100) * 100) / 100;
    const discountedPrice = Math.round((basePrice - discountAmount) * 100) / 100;

    return {
      discountPercent,
      discountAmount,
      discountedPrice
    };
  }

  function getShortStaySurcharge(nights) {
    if (nights === 2) {
      return 30;
    }
    return 0;
  }

  // ----------------------
  // Range- en kliklogica
  // ----------------------
  function isRangeFree(aYMD, dYMD) {
    const start = parseYMD(aYMD);
    const end = parseYMD(dYMD);

    const current = new Date(start);
    while (current < end) {
      const key = ymd(current);
      if (isBlocked(key)) return false;
      current.setDate(current.getDate() + 1);
    }
    return true;
  }

    function isAllowedArrival(dateYMD) {
    const dateObj = parseYMD(dateYMD);
    const arrivalDay = stripTime(dateObj);

    if (!isBookableWindow(dateObj) || isBlocked(dateYMD)) {
      return false;
    }

    const now = new Date();

    // Eenmalige uitzonderingen
    if (SPECIAL_LAST_MINUTE_ARRIVALS[dateYMD]) {
      const deadline = new Date(SPECIAL_LAST_MINUTE_ARRIVALS[dateYMD].deadline);
      return now <= deadline;
    }

    const wd = arrivalDay.getDay();

    // Vrijdag aankomst -> boeken t/m vrijdag 10:00
    if (wd === 5) {
      const deadline = new Date(
        arrivalDay.getFullYear(),
        arrivalDay.getMonth(),
        arrivalDay.getDate(),
        LAST_MINUTE_HOUR,
        0,
        0,
        0
      );
      return now <= deadline;
    }

    // Zaterdag, zondag, maandag aankomst -> boeken t/m de dag ervoor 10:00
    if (wd === 6 || wd === 0 || wd === 1) {
      const deadline = new Date(
        arrivalDay.getFullYear(),
        arrivalDay.getMonth(),
        arrivalDay.getDate() - 1,
        LAST_MINUTE_HOUR,
        0,
        0,
        0
      );
      return now <= deadline;
    }

    // Andere aankomstdagen: minimaal 3 dagen van tevoren
    const normalEarliestArrival = stripTime(SEASON_START);
    return arrivalDay >= normalEarliestArrival;
  }

  function getAllowedDepartureSet(arrivalYMD) {
    const set = new Set();
    if (!arrivalYMD) return set;

    const arrivalObj = parseYMD(arrivalYMD);
    const maxDate = new Date(SEASON_END);

    let current = addDays(arrivalObj, MIN_NIGHTS);

    while (current <= maxDate) {
      const depYMD = ymd(current);

      if (!isBookableWindow(current)) break;

      if (isRangeFree(arrivalYMD, depYMD)) {
        set.add(depYMD);
      } else {
        break;
      }

      current = addDays(current, 1);
    }

    return set;
  }

  function selectDate(dateYMD) {
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

    if (arrivalDateYMD && !departureDateYMD) {
      if (dateYMD === arrivalDateYMD) {
        clearSelection();
        return;
      }

      const allowedDepartureSet = getAllowedDepartureSet(arrivalDateYMD);

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
  function computeExtras(aYMD, dYMD) {
    const nights = diffNights(aYMD, dYMD);

    const persons = parseInt(personsInput?.value || '0', 10) || 0;
    const babies = parseInt(babiesInput?.value || '0', 10) || 0;
    const payingPersons = Math.max(persons - babies, 0);

    const toerBel = 4 * payingPersons * nights;
    const schoon = cleanSel?.checked ? 50 : 0;
    const borg = 100;

    const linenCount = beddengoedSel?.checked ? payingPersons : 0;
    const linenCost = 4 * linenCount;

    const towelsCount = parseInt(handdoekenAantalInput?.value || '0', 10) || 0;
    const towelRate = 4;
    const towelCost = towelsCount * towelRate;

    let hotspot = 0;
    if (hotspotSel?.checked) {
      hotspot = nights >= 14 ? 50 : 25;
    }

    return {
      nights,
      payingPersons,
      babies,
      toerBel,
      schoon,
      borg,
      linenCount,
      linenCost,
      towelsCount,
      towelRate,
      towelCost,
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
      if (priceSummary) priceSummary.textContent = '';
      if (priceSpecEl) priceSpecEl.innerHTML = '';
      if (priceHidden) priceHidden.value = '';
      if (priceSpecHidden) priceSpecHidden.value = '';
      if (stayHidden) stayHidden.value = '';
      return;
    }

    const arrivalDate = parseYMD(a);
    const departureDate = parseYMD(d);

    if (departureDate <= arrivalDate) {
      if (priceSummary) priceSummary.textContent = 'De vertrekdatum moet na de aankomstdatum liggen.';
      if (priceSpecEl) priceSpecEl.innerHTML = '';
      if (priceSpecHidden) priceSpecHidden.value = '';
      return;
    }

    const cls = classifyStay(a, d);

    if (stayHidden) stayHidden.value = cls.label || '';

    if (cls.nights < MIN_NIGHTS) {
      if (priceSummary) {
        priceSummary.textContent = `Een verblijf van ${cls.nights} nacht${cls.nights === 1 ? '' : 'en'} is niet mogelijk. Reserveren kan vanaf ${MIN_NIGHTS} nachten.`;
      }
      if (priceSpecEl) priceSpecEl.innerHTML = '';
      if (priceHidden) priceHidden.value = '';
      if (priceSpecHidden) priceSpecHidden.value = '';
      return;
    }

    const priceInfo = getPriceForRange(a, d);
    const rawBasePrice = priceInfo.price;
    const seasonLabel = priceInfo.parts
      ? [...new Set(priceInfo.parts.map(p => p.seasonName))].join(' + ')
      : '';

    const shortStaySurcharge = getShortStaySurcharge(cls.nights);
    const basePrice = rawBasePrice == null ? null : rawBasePrice + shortStaySurcharge;
    const price = basePrice;
    const X = computeExtras(a, d);
    if (price != null) {
  const baseText = seasonLabel
    ? `${euro(price)} (${seasonLabel})`
    : `${euro(price)}`;

  if (priceSummary) {
    priceSummary.textContent =
      `Je wilt boeken van ${formatDate(a)} t/m ${formatDate(d)} (${cls.label}). De huurprijs voor deze periode is ${baseText} — exclusief toeristenbelasting, borg en extra’s. Vul het formulier in voor een preciezere prijs excl. borg en campingkosten.`;
  }

  if (priceHidden) {
    priceHidden.value = `${baseText} exclusief toeristenbelasting`;
  }
}
    else {
      const unavailableText = priceInfo.unavailableDate
        ? `Voor minstens één nacht in deze periode is geen prijs beschikbaar (${formatDate(priceInfo.unavailableDate)}).`
        : 'Voor deze periode is geen prijs beschikbaar.';

      if (priceSummary) {
        priceSummary.textContent = `Je wilt boeken van ${formatDate(a)} t/m ${formatDate(d)}. ${unavailableText}`;
      }

      if (priceHidden) {
        priceHidden.value = unavailableText;
      }
    }

    if (priceSpecEl) {
      const tableRows = [];
      const tbParts = [];

      tableRows.push(`<tr>
        <td>Huur ${cls.label} (${formatDate(a)} t/m ${formatDate(d)})</td>
        <td><strong>${euro(price)}</strong></td>
      </tr>`);

      tbParts.push(`€4 p.p.p.n. × ${X.payingPersons} ${X.payingPersons === 1 ? 'persoon' : 'personen'}`);
      if (X.babies > 0) {
        tbParts.push(`+ ${X.babies} kind${X.babies > 1 ? 'eren' : ''} van 0-2 jaar gratis`);
      }

      tableRows.push(`<tr>
        <td>Toeristenbelasting<br><small>(${tbParts.join(' ')} × ${X.nights} nachten)</small></td>
        <td><strong>${euro(X.toerBel)}</strong></td>
      </tr>`);


      if (cleanSel?.checked) {
        tableRows.push(`<tr><td>Eindschoonmaak (door ons uitgevoerd)</td><td><strong>${euro(X.schoon)}</strong></td></tr>`);
      }

      if (X.linenCount > 0) {
        tableRows.push(`<tr><td>Linnengoed (${X.linenCount}×)</td><td><strong>${euro(X.linenCost)}</strong></td></tr>`);
      }

      if (X.towelsCount > 0) {
        tableRows.push(`<tr><td>Handdoeksets (${X.towelsCount}× à €${X.towelRate})</td><td><strong>${euro(X.towelCost)}</strong></td></tr>`);
      }

      if (campingbedjeSel?.checked) {
        tableRows.push(`<tr><td>Campingbedje</td><td><strong>gratis</strong></td></tr>`);
      }

      if (kinderstoelSel?.checked) {
        tableRows.push(`<tr><td>Kinderstoel</td><td><strong>gratis</strong></td></tr>`);
      }

      if (hotspotSel?.checked) {
        tableRows.push(`<tr><td>Hotspot (wifi in caravan)</td><td><strong>${euro(X.hotspot)}</strong></td></tr>`);
      }

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
        const lines = [];

        lines.push(`Periode: ${formatDate(a)} t/m ${formatDate(d)}`);
        lines.push(`Verblijfstype: ${cls.label}`);
        lines.push(`Aantal nachten: ${cls.nights}`);
        lines.push('');
        lines.push('--- HUURPRIJS ---');
        lines.push(`Huur ${cls.label} (${formatDate(a)} t/m ${formatDate(d)}): ${euro(price)}`);

        if (priceInfo.parts && priceInfo.parts.length > 1) {
          lines.push('');
          lines.push('--- OPBOUW BASISHUUR ---');
          priceInfo.parts.forEach(part => {
            lines.push(`${part.nights} nacht${part.nights === 1 ? '' : 'en'} ${part.seasonName}: ${euro(part.amount)}`);
          });
        }

        lines.push('');
        lines.push('--- EXTRA\'S ---');
        lines.push(`Toeristenbelasting: ${euro(X.toerBel)}`);


        if (X.schoon) {
          lines.push(`Schoonmaak: ${euro(X.schoon)}`);
        }

        if (X.linenCount > 0) {
          lines.push(`Linnengoed (${X.linenCount}x): ${euro(X.linenCost)}`);
        }

        if (X.towelsCount > 0) {
          lines.push(`Handdoeken (${X.towelsCount}x): ${euro(X.towelCost)}`);
        }

        if (X.hotspot) {
          lines.push(`Hotspot: ${euro(X.hotspot)}`);
        }

        lines.push('');
        lines.push(`Totaal excl. borg: ${euro(subtotal)}`);
        lines.push(`Borg: ${euro(X.borg)}`);

        priceSpecHidden.value = lines.join('\n');
      }
    }
  }

  // ----------------------
  // Kalender genereren
  // ----------------------
  function renderCalendar() {
    if (!hasArrivalSelection()) {
      let guard = 0;

      while (!monthHasAllowedArrival(currentYear, currentMonth) && guard < 24) {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        guard++;
      }
    }

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
      if (arrivalDateYMD && !departureDateYMD && allowedDepartureSet.has(dateKey)) {
        if (isBlocked(dateKey)) {
          cell.classList.add('changeover-day', 'departure-option');
          cell.setAttribute(
            'aria-label',
            `${d} ${monthYearEl.textContent}: vertrek mogelijk, aankomst niet mogelijk`
          );
        } else {
        cell.classList.add('available', 'departure-option');

        if (isArrivalChangeoverDay(dateKey)) {
          cell.classList.add('changeover-arrival');
        }
      }

        cell.addEventListener('click', () => selectDate(dateKey));
        calendarEl.appendChild(cell);
        continue;
      }
        if (isBlocked(dateKey)) {
  const status = getAvailabilityStatus(dateKey);

   if (isChangeoverDay(dateKey)) {
      cell.classList.add('changeover-day');

      if (departureDateYMD && dateKey === departureDateYMD) {
        cell.classList.add('selected-end');
      }

      cell.disabled = true;
      cell.setAttribute(
        'aria-label',
        `${d} ${monthYearEl.textContent}: vertrek mogelijk, aankomst niet mogelijk`
      );
      calendarEl.appendChild(cell);
      continue;
    }

    cell.classList.add('booked');
    cell.disabled = true;

        if (status === 'bezet') {
        cell.classList.add('bezet'); // 👈 NIEUW

        cell.setAttribute('aria-label', `${d} ${monthYearEl.textContent}: bezet`);

        const label = document.createElement('div');
        label.className = 'day-status-label';
        label.textContent = 'Verhuurd';
        cell.appendChild(label);
      }
        calendarEl.appendChild(cell);
        continue;
      }

      const isSelectedStart = arrivalDateYMD && dateKey === arrivalDateYMD;
      const isSelectedEnd = departureDateYMD && dateKey === departureDateYMD;
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

        if (isArrivalChangeoverDay(dateKey)) {
          cell.classList.add('changeover-arrival');
        }

        isClickable = true;
      } else {
        cell.classList.add('unavailable');
        cell.disabled = true;
      }
    } else {
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
  const form = document.getElementById('boeken');
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
        headers: { Accept: 'application/json' }
      });

      buildReceiptTable(fd);

      form.style.display = 'none';
      thanks.style.display = '';

      const btn = document.getElementById('receipt-print');
      if (btn) btn.onclick = () => window.print();

      if (!res.ok) {
        console.warn('Formspree gaf geen 200 terug:', res.status);
      }
    } catch (e) {
      console.error('Verzenden naar Formspree mislukte:', e);
      buildReceiptTable(fd);
      form.style.display = 'none';
      thanks.style.display = '';
    }
  }

  function buildReceiptTable() {
    const srcSummary = document.getElementById('price-summary');
    const srcSpec = document.getElementById('price-spec');
    const dstSummary = document.getElementById('receipt-price-summary');
    const dstSpec = document.getElementById('receipt-price-spec');

    if (dstSummary && srcSummary) dstSummary.textContent = srcSummary.textContent;
    if (dstSpec && srcSpec) dstSpec.innerHTML = srcSpec.innerHTML;

    const tbody = document.querySelector('#receipt-table tbody');
    tbody.innerHTML = '';

    const aankomst = document.getElementById('arrival-hidden')?.value || '';
    const vertrek = document.getElementById('departure-hidden')?.value || '';
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

    const stayHidden = document.getElementById('stay-hidden')?.value;
    const priceHidden = document.getElementById('price-hidden')?.value;
    if (stayHidden) addRow(tbody, 'Verblijfstype', stayHidden);
    if (priceHidden) addRow(tbody, 'Prijsindicatie', priceHidden);

    const specText = document.getElementById('price-spec')?.innerText || '';
    const lastLine = specText.split('\n').reverse().find(l => /Totaalbedrag/i.test(l));
    if (lastLine) addRow(tbody, 'Totaalbedrag', lastLine.replace(/^.*?:\s*/, '').trim());
  }

  form.addEventListener('submit', submitToFormspree);
});