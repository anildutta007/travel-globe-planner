/**
 * Dutta Travel Planner — Interactive 3D World Globe, Cost Estimator & Itinerary Planner
 * Developed by Anil Dutta (Anildutta007@gmail.com)
 * Core Client-Side Engine
 */

const state = {
  originHubId: 'LON',
  currency: 'GBP',
  tempUnit: 'C',
  minTempC: 16,
  maxTempC: 34,
  monthIndex: 9, // Default: October (0 = Jan, 9 = Oct)
  startDate: '', // YYYY-MM-DD
  endDate: '',   // YYYY-MM-DD
  tripDays: 7,
  selectedVibe: 'beach', // 'beach' | 'city' | 'mild' | 'snow' | 'any'
  adults: 2,
  children: 0,
  budgetGBP: 3000,
  strictBudget: true,
  seasonFilter: 'both', // 'both' | 'off-peak' | 'on-peak'
  selectedAccommodations: ['5star', '4star', '3star', 'airbnb'], // User can choose any or all
  mapMode: '3d', // '3d' | '2d'
  autoRotate: true,
  globeTextureIndex: 0,
  filterMode: 'simple', // 'simple' | 'advanced'
  selectedDestinationId: null,
  activeModalTier: '4star',
  itineraryVisible: false
};

const GLOBE_TEXTURES = [
  {
    name: 'Night Earth',
    globeUrl: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    bumpUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    atmosphereColor: '#38bdf8',
    tile2dUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    tile2dLabelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    tile2dAttribution: '&copy; Esri, HERE, Garmin, OpenStreetMap'
  },
  {
    name: 'Blue Marble',
    globeUrl: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    bumpUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    atmosphereColor: '#60a5fa',
    tile2dUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    tile2dLabelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    tile2dAttribution: '&copy; Esri, Maxar, Earthstar Geographics'
  },
  {
    name: 'Street / Vector',
    globeUrl: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
    bumpUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    atmosphereColor: '#10b981',
    tile2dUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    tile2dLabelsUrl: null,
    tile2dAttribution: '&copy; OpenStreetMap contributors'
  }
];

let globeInstance = null;
let leafletMap = null;
let leafletBaseTileLayer = null;
let leafletLabelTileLayer = null;
let leafletMarkersLayer = null;
let computedDestinations = [];

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initOriginHubSelect();
  initCurrencySelects();
  initDefaultDates();
  initMonthGrid();
  initAccommodationCheckboxes();
  updateVibeCardsUI();
  updateFilterLabels();
  initVisitorCounter();
  init3DGlobe();
  handleFilterChange();

  if (window.lucide) {
    lucide.createIcons();
  }

  window.addEventListener('resize', handleViewportResize);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDestinationModal();
  });
});

function initOriginHubSelect() {
  const headerSelect = document.getElementById('origin-hub-select');
  if (headerSelect) {
    headerSelect.innerHTML = DEPARTURE_HUBS.map(hub =>
      `<option value="${hub.id}" ${hub.id === state.originHubId ? 'selected' : ''}>${hub.flag} ${hub.city} (${hub.iata})</option>`
    ).join('');
  }

  const sidebarSelect = document.getElementById('sidebar-origin-select');
  if (sidebarSelect) {
    const regions = [...new Set(DEPARTURE_HUBS.map(h => h.region || 'Global'))];
    sidebarSelect.innerHTML = regions.map(region => {
      const hubsInRegion = DEPARTURE_HUBS.filter(h => (h.region || 'Global') === region);
      const optionsHtml = hubsInRegion.map(hub =>
        `<option value="${hub.id}" ${hub.id === state.originHubId ? 'selected' : ''}>${hub.flag} ${hub.city} (${hub.iata})</option>`
      ).join('');
      return `<optgroup label="${region}">${optionsHtml}</optgroup>`;
    }).join('');
  }
}

function initCurrencySelects() {
  const currKeys = Object.keys(CURRENCIES);
  const headerCurr = document.getElementById('currency-select');
  if (headerCurr) {
    headerCurr.innerHTML = currKeys.map(code => {
      const c = CURRENCIES[code];
      return `<option value="${code}" ${code === state.currency ? 'selected' : ''}>${c.flag || ''} ${c.symbol.trim()} ${c.code}</option>`;
    }).join('');
  }

  const sidebarCurr = document.getElementById('sidebar-currency-select');
  if (sidebarCurr) {
    sidebarCurr.innerHTML = currKeys.map(code => {
      const c = CURRENCIES[code];
      return `<option value="${code}" ${code === state.currency ? 'selected' : ''}>${c.flag || ''} ${c.code} (${c.symbol.trim()})</option>`;
    }).join('');
  }

  const pillsContainer = document.getElementById('sidebar-currency-pills');
  if (pillsContainer) {
    const quickCodes = ['GBP', 'USD', 'EUR', 'INR', 'AED', 'AUD', 'CAD', 'SGD', 'CHF', 'JPY'];
    pillsContainer.innerHTML = quickCodes.map(code => {
      const isSelected = code === state.currency;
      return `
        <button
          type="button"
          onclick="handleCurrencyChange('${code}')"
          class="py-1 px-1 rounded text-[10px] font-mono font-bold transition border ${
            isSelected
              ? 'bg-emerald-600 text-white border-emerald-400 shadow'
              : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
          }"
        >
          ${code}
        </button>
      `;
    }).join('');
  }
}

function initMonthGrid() {
  const grid = document.getElementById('month-grid');
  if (!grid) return;
  grid.innerHTML = MONTHS_META.map(m => {
    const isSelected = m.index === state.monthIndex;
    return `
      <button
        type="button"
        onclick="selectMonth(${m.index})"
        id="month-btn-${m.index}"
        class="py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center ${
          isSelected
            ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-pink-500/30 ring-1 ring-white/30 scale-[1.02]'
            : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
        }"
      >
        ${m.short}
      </button>
    `;
  }).join('');
}

function initAccommodationCheckboxes() {
  const container = document.getElementById('accommodation-checkbox-grid');
  if (!container) return;
  container.innerHTML = ACCOMMODATION_TIERS.map(tier => {
    const isChecked = state.selectedAccommodations.includes(tier.id);
    const starsHtml = tier.stars > 0
      ? `<span class="text-amber-400 text-[10px] tracking-tighter">${'★'.repeat(tier.stars)}</span>`
      : `<span class="text-rose-400 text-[10px] font-mono font-bold">RENTAL</span>`;

    return `
      <button
        type="button"
        onclick="toggleAccommodationTier('${tier.id}')"
        id="acc-tier-btn-${tier.id}"
        class="p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
          isChecked
            ? 'bg-slate-800/95 border-cyan-500/70 shadow-sm shadow-cyan-500/10 text-white'
            : 'bg-slate-950/60 border-slate-800/80 text-slate-500 hover:text-slate-300'
        }"
      >
        <div class="flex items-center justify-between w-full">
          ${starsHtml}
          <span class="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
            isChecked ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-transparent border border-slate-700'
          }">✓</span>
        </div>
        <div class="text-xs font-bold leading-snug">${tier.label}</div>
      </button>
    `;
  }).join('');
}

// ============================================================================
// UTILITY & PRICING ENGINE
// ============================================================================
function getOriginHub() {
  return DEPARTURE_HUBS.find(h => h.id === state.originHubId) || DEPARTURE_HUBS[0];
}

function formatMoney(amountGBP) {
  const curr = CURRENCIES[state.currency] || CURRENCIES.GBP;
  const converted = Math.round(amountGBP * curr.rate);
  return `${curr.symbol}${converted.toLocaleString()}`;
}

function formatTemp(tempC) {
  if (state.tempUnit === 'F') {
    const f = Math.round((tempC * 9) / 5 + 32);
    return `${f}°F`;
  }
  return `${Math.round(tempC)}°C`;
}

/**
 * Great-Circle Haversine Distance (km) between Origin Hub and Destination
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getHotelRoomsCount() {
  return Math.max(1, Math.ceil((state.adults + state.children * 0.5) / 2));
}

function getTravellersLabel(short = false) {
  if (short) {
    return state.children > 0 ? `${state.adults}A + ${state.children}C` : `${state.adults}A`;
  }
  const aText = `${state.adults} Adult${state.adults > 1 ? 's' : ''}`;
  const cText = state.children > 0 ? `, ${state.children} Child${state.children > 1 ? 'ren' : ''}` : '';
  return `${aText}${cText}`;
}

/**
 * Computes Flight Cost, Hotel Cost per tier, Total Cost, Weather & Match Status for a destination
 */
function evaluateDestination(dest) {
  const origin = getOriginHub();
  const distanceKm = calculateDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const estFlightHours = Math.max(1.5, +(distanceKm / 780 + 0.6).toFixed(1));

  const tempC = dest.monthlyTempC[state.monthIndex];
  const sunHours = dest.monthlySunHours[state.monthIndex];
  const isOnPeak = dest.peakMonths.includes(state.monthIndex);
  const seasonType = isOnPeak ? 'on-peak' : 'off-peak';

  // Seasonal multiplier: On-Peak has slight premium, Off-Peak has value discount
  const flightSeasonMultiplier = isOnPeak ? 1.14 : 0.88;
  const hotelSeasonMultiplier = isOnPeak ? 1.15 : 0.85;

  // Dynamic flight pricing per 1 Adult: uses curated London baseline if flying from UK, or distance-calibrated pricing from other global hubs
  let rawFlightGBP = dest.baseFlightGBP;
  if (origin.id !== 'LON') {
    if (distanceKm < 450) {
      rawFlightGBP = 65;
    } else if (distanceKm < 2800) {
      rawFlightGBP = Math.round(60 + distanceKm * 0.048);
    } else {
      rawFlightGBP = Math.round(140 + distanceKm * 0.056);
    }
  }
  const singleAdultFlightGBP = Math.max(48, Math.round((rawFlightGBP * flightSeasonMultiplier) / 5) * 5);
  const singleChildFlightGBP = Math.round(singleAdultFlightGBP * 0.75);
  const flightCostGBP = (state.adults * singleAdultFlightGBP) + (state.children * singleChildFlightGBP);

  // Calculate Hotel & Combined Total across all 4 accommodation tiers for state.tripDays & traveller party
  const nights = Math.max(1, state.tripDays);
  const roomsNeeded = getHotelRoomsCount();
  const totalTravellers = Math.max(1, state.adults + state.children);
  const tierBreakdowns = {};

  ACCOMMODATION_TIERS.forEach(tier => {
    const baseNightly = dest.hotelsGBP[tier.id] || 100;
    // Hotels scale by number of rooms needed (+15% child family-bed supplement if sharing); Airbnbs scale gently for larger multi-bedroom rentals
    let occupancyMultiplier = 1;
    if (tier.id === 'airbnb') {
      occupancyMultiplier = 1 + Math.max(0, totalTravellers - 2) * 0.18;
    } else {
      const extraChildSupplement = (state.children > 0 && roomsNeeded === Math.ceil(state.adults / 2))
        ? state.children * 0.15
        : 0;
      occupancyMultiplier = roomsNeeded + extraChildSupplement;
    }

    const nightlyGBP = Math.max(25, Math.round(baseNightly * hotelSeasonMultiplier * occupancyMultiplier));
    const hotelTotalGBP = nightlyGBP * nights;
    const combinedTotalGBP = flightCostGBP + hotelTotalGBP;
    const perPersonGBP = Math.round(combinedTotalGBP / totalTravellers);
    const withinBudget = combinedTotalGBP <= state.budgetGBP;

    tierBreakdowns[tier.id] = {
      tierId: tier.id,
      label: tier.label,
      shortLabel: tier.shortLabel,
      stars: tier.stars,
      baseNightlyGBP: baseNightly,
      hotelSeasonMultiplier,
      occupancyMultiplier,
      nightlyGBP,
      hotelTotalGBP,
      flightCostGBP,
      combinedTotalGBP,
      perPersonGBP,
      roomsNeeded: tier.id === 'airbnb' ? 1 : roomsNeeded,
      withinBudget,
      exampleProperty: dest.hotelExamples[tier.id]
    };
  });

  // Determine the best/representative tier among the user's selected accommodations
  const activeTierIds = state.selectedAccommodations.length > 0
    ? state.selectedAccommodations
    : ['4star'];

  const selectedTierObjs = activeTierIds.map(id => tierBreakdowns[id]).filter(Boolean);
  selectedTierObjs.sort((a, b) => a.combinedTotalGBP - b.combinedTotalGBP);

  // Pick the highest-comfort tier that fits within budget, or the most affordable selected tier if over budget
  const fittingTiers = selectedTierObjs.filter(t => t.withinBudget);
  const primaryTier = fittingTiers.length > 0
    ? fittingTiers[fittingTiers.length - 1] // Best tier within user's budget
    : selectedTierObjs[0]; // Lowest cost among selected tiers

  const minSelectedTotalGBP = selectedTierObjs[0].combinedTotalGBP;
  const maxSelectedTotalGBP = selectedTierObjs[selectedTierObjs.length - 1].combinedTotalGBP;

  // Check filter matches
  const searchQuery = ((document.getElementById('dest-search-input') || {}).value || '').trim().toLowerCase();
  const matchesSearch = !searchQuery ||
    dest.city.toLowerCase().includes(searchQuery) ||
    dest.country.toLowerCase().includes(searchQuery) ||
    dest.continent.toLowerCase().includes(searchQuery) ||
    dest.vibeTags.some(t => t.toLowerCase().includes(searchQuery));

  const matchesTemp = tempC >= state.minTempC && tempC <= state.maxTempC;
  const matchesSeason = state.seasonFilter === 'both' || state.seasonFilter === seasonType;
  const matchesBudget = fittingTiers.length > 0;

  // A location lights up if it matches Search + Temp + Season, and either fits budget or strictBudget is unchecked
  const isLitUp = matchesSearch && matchesTemp && matchesSeason && (state.strictBudget ? matchesBudget : true);

  return {
    ...dest,
    distanceKm,
    estFlightHours,
    tempC,
    sunHours,
    isOnPeak,
    seasonType,
    rawFlightGBP,
    flightSeasonMultiplier,
    hotelSeasonMultiplier,
    singleAdultFlightGBP,
    singleChildFlightGBP,
    flightCostGBP,
    nights,
    roomsNeeded,
    totalTravellers,
    tierBreakdowns,
    selectedTierObjs,
    fittingTiers,
    primaryTier,
    minSelectedTotalGBP,
    maxSelectedTotalGBP,
    matchesSearch,
    matchesTemp,
    matchesSeason,
    matchesBudget,
    isLitUp
  };
}

// ============================================================================
// FILTER HANDLERS & UI SYNCHRONIZATION
// ============================================================================
function syncTempSliders(changed) {
  const minSlider = document.getElementById('min-temp-slider');
  const maxSlider = document.getElementById('max-temp-slider');
  let minVal = parseInt(minSlider.value, 10);
  let maxVal = parseInt(maxSlider.value, 10);

  if (changed === 'min' && minVal > maxVal) {
    maxVal = minVal;
    maxSlider.value = maxVal;
  } else if (changed === 'max' && maxVal < minVal) {
    minVal = maxVal;
    minSlider.value = minVal;
  }

  state.minTempC = minVal;
  state.maxTempC = maxVal;
  handleFilterChange();
}

function applyTempPreset(minC, maxC, vibe = null) {
  state.minTempC = minC;
  state.maxTempC = maxC;
  if (vibe) {
    state.selectedVibe = vibe;
  }
  const minSlider = document.getElementById('min-temp-slider');
  const maxSlider = document.getElementById('max-temp-slider');
  if (minSlider) minSlider.value = minC;
  if (maxSlider) maxSlider.value = maxC;
  updateVibeCardsUI();
  handleFilterChange();
}

function selectVibe(vibeKey) {
  state.selectedVibe = vibeKey;
  if (vibeKey === 'beach') {
    state.minTempC = 28;
    state.maxTempC = 42;
  } else if (vibeKey === 'city') {
    state.minTempC = 15;
    state.maxTempC = 25;
  } else if (vibeKey === 'mild') {
    state.minTempC = 12;
    state.maxTempC = 21;
  } else if (vibeKey === 'snow') {
    state.minTempC = -15;
    state.maxTempC = 5;
  }
  const minSlider = document.getElementById('min-temp-slider');
  const maxSlider = document.getElementById('max-temp-slider');
  if (minSlider) minSlider.value = state.minTempC;
  if (maxSlider) maxSlider.value = state.maxTempC;
  updateVibeCardsUI();
  handleFilterChange();
}

function executeHolidaySearch() {
  // Center or highlight the top matching destination or scroll results into view
  const matches = (window.evaluatedDestinations || []).filter(d => d.passesFilters);
  if (matches.length > 0) {
    const top = matches[0];
    focusGlobeOnDestination(top.id);
    showNotification(`Found ${matches.length} matching destinations! Focused on ${top.city}.`, 'success');
  } else {
    showNotification('No destinations matched all criteria. Try adjusting your budget or vibe!', 'warning');
  }
}

function updateVibeCardsUI() {
  const vibes = ['beach', 'city', 'mild', 'snow'];
  vibes.forEach(v => {
    const card = document.getElementById(`vibe-card-${v}`);
    const check = document.getElementById(`vibe-check-${v}`);
    if (card) {
      if (state.selectedVibe === v) {
        card.classList.remove('border-slate-800/80', 'ring-0', 'scale-100');
        card.classList.add('border-amber-400', 'ring-2', 'ring-pink-500/80', 'scale-[1.02]');
      } else {
        card.classList.add('border-slate-800/80', 'scale-100');
        card.classList.remove('border-amber-400', 'ring-2', 'ring-pink-500/80', 'scale-[1.02]');
      }
    }
    if (check) {
      check.style.display = state.selectedVibe === v ? 'flex' : 'none';
    }
  });
}

function setTempUnit(unit) {
  state.tempUnit = unit;
  const cBtn = document.getElementById('unit-c-btn');
  const fBtn = document.getElementById('unit-f-btn');
  if (unit === 'C') {
    cBtn.className = 'px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold';
    fBtn.className = 'px-1.5 py-0.5 rounded text-slate-400 hover:text-white';
  } else {
    fBtn.className = 'px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold';
    cBtn.className = 'px-1.5 py-0.5 rounded text-slate-400 hover:text-white';
  }
  handleFilterChange();
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDMY(dateInput) {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function initDefaultDates() {
  const today = new Date();
  const targetYear = today.getFullYear();
  const start = new Date(targetYear, state.monthIndex, 10);
  if (start < today && state.monthIndex < today.getMonth()) {
    start.setFullYear(targetYear + 1);
  }
  const end = new Date(start);
  end.setDate(start.getDate() + (state.tripDays || 7));

  state.startDate = formatDateISO(start);
  state.endDate = formatDateISO(end);

  const startInput = document.getElementById('trip-start-date');
  if (startInput) startInput.value = state.startDate;
}

function handleStartDateChange(dateVal) {
  if (!dateVal) {
    const today = new Date();
    dateVal = formatDateISO(today);
  }

  const startDate = new Date(dateVal);
  if (isNaN(startDate.getTime())) return;

  state.startDate = dateVal;
  state.monthIndex = startDate.getMonth(); // Automatically set travel month (0-11)

  // Compute End Date based on current state.tripDays
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (state.tripDays || 7));
  state.endDate = formatDateISO(endDate);

  const startInput = document.getElementById('trip-start-date');
  if (startInput) startInput.value = state.startDate;

  initMonthGrid();
  handleFilterChange();
}

function handleMonthSliderChange(val) {
  const idx = Math.max(0, Math.min(11, parseInt(val, 10) || 0));
  selectMonth(idx);
}

function handleAccommodationSliderChange(val) {
  const index = Math.max(0, Math.min(3, parseInt(val, 10) || 0));
  const tierIds = ['5star', '4star', '3star', 'airbnb'];
  const labels = ['5★ Luxury', '4★ Boutique', '3★ Comfort', 'Rental / Airbnb'];
  const chosenTier = tierIds[index];
  
  state.selectedAccommodations = [chosenTier];
  const labelEl = document.getElementById('accommodation-tier-label');
  if (labelEl) labelEl.textContent = labels[index];
  
  handleFilterChange();
}

function selectMonth(index) {
  state.monthIndex = index;
  // Automatically adjust start date to fall within chosen month
  const today = new Date();
  let year = today.getFullYear();
  if (index < today.getMonth()) {
    year += 1;
  }
  const start = new Date(year, index, 10);
  const end = new Date(start);
  end.setDate(start.getDate() + (state.tripDays || 7));

  state.startDate = formatDateISO(start);
  state.endDate = formatDateISO(end);

  const startInput = document.getElementById('trip-start-date');
  if (startInput) startInput.value = state.startDate;

  const monthSlider = document.getElementById('month-slider');
  if (monthSlider && parseInt(monthSlider.value, 10) !== index) {
    monthSlider.value = index;
  }

  const monthLabel = document.getElementById('selected-month-label');
  if (monthLabel) {
    monthLabel.textContent = MONTHS_META[index].full;
  }

  initMonthGrid();
  handleFilterChange();
}

function setTripDays(days) {
  const parsed = Math.max(2, Math.min(28, parseInt(days, 10) || 7));
  state.tripDays = parsed;
  const slider = document.getElementById('trip-days-slider');
  if (slider) slider.value = parsed;

  if (state.startDate) {
    const start = new Date(state.startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parsed);
    state.endDate = formatDateISO(end);
    const endInput = document.getElementById('trip-end-date');
    if (endInput) endInput.value = state.endDate;
  }

  handleFilterChange();
}

function adjustTripDays(delta) {
  setTripDays(state.tripDays + delta);
}

function adjustTravellers(type, delta) {
  if (type === 'adults') {
    state.adults = Math.max(1, Math.min(10, state.adults + delta));
  } else if (type === 'children') {
    state.children = Math.max(0, Math.min(8, state.children + delta));
  }
  handleFilterChange();
}

function setTravellerParty(adults, children) {
  state.adults = Math.max(1, Math.min(10, parseInt(adults, 10) || 1));
  state.children = Math.max(0, Math.min(8, parseInt(children, 10) || 0));
  handleFilterChange();
}

function setOriginHub(hubId, flyToOrigin = false) {
  if (!hubId) return;
  state.originHubId = hubId;
  const headerSelect = document.getElementById('origin-hub-select');
  const sidebarSelect = document.getElementById('sidebar-origin-select');
  if (headerSelect) headerSelect.value = hubId;
  if (sidebarSelect) sidebarSelect.value = hubId;

  handleFilterChange();

  if (flyToOrigin) {
    focusOriginOnGlobe();
  }
}

function focusOriginOnGlobe() {
  const origin = getOriginHub();
  if (!origin) return;
  if (state.mapMode === '3d' && globeInstance) {
    globeInstance.pointOfView({ lat: origin.lat, lng: origin.lng, altitude: 1.75 }, 950);
  } else if (state.mapMode === '2d' && leafletMap) {
    leafletMap.flyTo([origin.lat, origin.lng], 4, { duration: 0.9 });
  }
}

function setFilterMode(mode) {
  state.filterMode = mode;
  const simpleBtn = document.getElementById('filter-mode-simple-btn');
  const advBtn = document.getElementById('filter-mode-adv-btn');
  const advSection = document.getElementById('advanced-filters-section');
  const advToggleBtn = document.getElementById('advanced-filters-toggle-btn');
  const advToggleChevron = document.getElementById('advanced-filters-chevron');

  const isSimple = mode === 'simple';

  if (simpleBtn && advBtn) {
    if (isSimple) {
      simpleBtn.className = 'flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-cyan-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition';
      advBtn.className = 'flex-1 py-1 px-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition';
    } else {
      advBtn.className = 'flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-purple-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition';
      simpleBtn.className = 'flex-1 py-1 px-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition';
    }
  }

  if (advSection) {
    if (isSimple) {
      advSection.classList.add('hidden');
    } else {
      advSection.classList.remove('hidden');
    }
  }

  if (advToggleBtn) {
    advToggleBtn.classList.toggle('bg-purple-950/40', !isSimple);
    advToggleBtn.classList.toggle('border-purple-500/40', !isSimple);
  }
  if (advToggleChevron) {
    advToggleChevron.style.transform = isSimple ? 'rotate(0deg)' : 'rotate(180deg)';
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

function toggleAdvancedFilters() {
  setFilterMode(state.filterMode === 'simple' ? 'advanced' : 'simple');
}

function setBudgetGBP(val) {
  state.budgetGBP = Math.max(200, Math.min(25000, parseInt(val, 10) || 3000));
  const slider = document.getElementById('budget-slider');
  if (slider) {
    slider.value = Math.min(15000, Math.max(300, state.budgetGBP));
    const percent = Math.min(100, Math.max(0, ((state.budgetGBP - 300) / (15000 - 300)) * 100));
    slider.style.background = `linear-gradient(90deg, #f97316 0%, #ec4899 ${percent}%, #1e293b ${percent}%)`;
  }
  handleFilterChange();
}

function setBudgetInSelectedCurrency(amountInCurr) {
  const curr = CURRENCIES[state.currency] || CURRENCIES.GBP;
  const parsed = parseFloat(amountInCurr);
  if (!isNaN(parsed) && parsed > 0) {
    const gbpEquivalent = Math.round(parsed / curr.rate);
    setBudgetGBP(gbpEquivalent);
  }
}

function setSeasonFilter(mode) {
  state.seasonFilter = mode;
  const modes = [
    { id: 'both', el: 'season-btn-both', sub: 'All Locations', subColor: 'opacity-85' },
    { id: 'off-peak', el: 'season-btn-offpeak', sub: 'Best Value', subColor: 'text-emerald-300' },
    { id: 'on-peak', el: 'season-btn-onpeak', sub: 'Prime Season', subColor: 'text-amber-300' }
  ];
  modes.forEach(m => {
    const btn = document.getElementById(m.el);
    if (!btn) return;
    if (m.id === mode) {
      btn.className = 'py-2 px-2 rounded-lg text-[11px] font-bold bg-cyan-600 text-white border border-cyan-400 shadow flex flex-col items-center gap-0.5 transition';
    } else {
      btn.className = 'py-2 px-2 rounded-lg text-[11px] font-semibold bg-slate-900 text-slate-300 hover:text-white border border-slate-800 flex flex-col items-center gap-0.5 transition';
    }
  });
  handleFilterChange();
}

function toggleAccommodationTier(tierId) {
  const idx = state.selectedAccommodations.indexOf(tierId);
  if (idx >= 0) {
    // Keep at least 1 option active so calculation is always meaningful
    if (state.selectedAccommodations.length > 1) {
      state.selectedAccommodations.splice(idx, 1);
    }
  } else {
    state.selectedAccommodations.push(tierId);
  }
  initAccommodationCheckboxes();
  handleFilterChange();
}

function selectAllAccommodationTiers() {
  state.selectedAccommodations = ACCOMMODATION_TIERS.map(t => t.id);
  initAccommodationCheckboxes();
  handleFilterChange();
}

function handleCurrencyChange(currCode) {
  if (!CURRENCIES[currCode]) return;
  state.currency = currCode;
  initCurrencySelects();

  // Update preset budget labels
  const presets = [1200, 2500, 4500, 8000];
  presets.forEach((val, idx) => {
    const el = document.getElementById(`preset-budget-${idx + 1}`);
    if (el) el.textContent = idx === 3 ? `${formatMoney(val)}+` : formatMoney(val);
  });
  handleFilterChange();
}

function resetAllFilters() {
  state.originHubId = 'LON';
  state.currency = 'GBP';
  state.minTempC = 14;
  state.maxTempC = 35;
  state.monthIndex = 9;
  state.tripDays = 7;
  state.adults = 2;
  state.children = 0;
  state.budgetGBP = 3000;
  state.strictBudget = true;
  state.seasonFilter = 'both';
  state.selectedAccommodations = ['5star', '4star', '3star', 'airbnb'];

  document.getElementById('min-temp-slider').value = state.minTempC;
  document.getElementById('max-temp-slider').value = state.maxTempC;
  document.getElementById('trip-days-slider').value = state.tripDays;
  document.getElementById('budget-slider').value = state.budgetGBP;
  document.getElementById('strict-budget-toggle').checked = true;
  document.getElementById('dest-search-input').value = '';

  initOriginHubSelect();
  initCurrencySelects();
  initDefaultDates();
  initMonthGrid();
  setSeasonFilter('both');
  initAccommodationCheckboxes();
  handleCurrencyChange('GBP');
  setFilterMode('simple');
}

/**
 * Visitor Counter Engine:
 * Interacts with /api/visitors backend and falls back gracefully to localStorage
 * Tracks total visits and unique visitors with live updates.
 */
function initVisitorCounter() {
  const badgeEl = document.getElementById('visitor-count-badge');
  if (!badgeEl) return;

  // Reset any old legacy inflated localStorage counters from previous builds
  try {
    const oldVal = parseInt(localStorage.getItem('dutta_local_visitor_count') || '0', 10);
    if (oldVal > 500) {
      localStorage.removeItem('dutta_local_visitor_count');
      localStorage.removeItem('dutta_planner_visitor_logged');
    }
  } catch (e) {}

  const storageKey = 'dutta_visitor_v2_logged';
  const isFirstVisit = !localStorage.getItem(storageKey);
  if (isFirstVisit) {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (e) {}
  }

  // Attempt backend API call
  const apiUrl = `/api/visitors?inc=1&unique=${isFirstVisit ? '1' : '0'}`;
  fetch(apiUrl)
    .then(res => {
      if (!res.ok) throw new Error('API offline');
      return res.json();
    })
    .then(data => {
      const visits = data.totalVisits || data.uniqueVisitors || 1;
      badgeEl.textContent = visits.toLocaleString();
    })
    .catch(() => {
      // Local fallback simulation with clean v2 localStorage
      const localKey = 'dutta_visitor_v2_count';
      let count = parseInt(localStorage.getItem(localKey) || '1', 10);
      try {
        localStorage.setItem(localKey, String(count));
      } catch (e) {}
      badgeEl.textContent = count.toLocaleString();
    });
}

function updateFilterLabels() {
  const monthMeta = MONTHS_META[state.monthIndex];
  const rooms = getHotelRoomsCount();
  const travLabel = getTravellersLabel(false);
  const origin = getOriginHub();
  const curr = CURRENCIES[state.currency] || CURRENCIES.GBP;

  const minBadge = document.getElementById('min-temp-badge');
  if (minBadge) minBadge.textContent = formatTemp(state.minTempC);
  const maxBadge = document.getElementById('max-temp-badge');
  if (maxBadge) maxBadge.textContent = formatTemp(state.maxTempC);
  const monthLbl = document.getElementById('selected-month-label');
  if (monthLbl) monthLbl.textContent = monthMeta.full;
  const tripDaysBadge = document.getElementById('trip-days-badge');
  if (tripDaysBadge) tripDaysBadge.textContent = `${state.tripDays} Days`;
  const budgetBadge = document.getElementById('budget-display-badge');
  if (budgetBadge) budgetBadge.textContent = formatMoney(state.budgetGBP);

  const travellersCardLabel = document.getElementById('travellers-card-summary');
  if (travellersCardLabel) {
    travellersCardLabel.textContent = `${travLabel} • ${rooms} Room${rooms > 1 ? 's' : ''}`;
  }

  // Update budget slider gradient
  const budgetSlider = document.getElementById('budget-slider');
  if (budgetSlider) {
    const percent = Math.min(100, Math.max(0, ((state.budgetGBP - 300) / (15000 - 300)) * 100));
    budgetSlider.style.background = `linear-gradient(90deg, #f97316 0%, #ec4899 ${percent}%, #1e293b ${percent}%)`;
  }

  const originBadge = document.getElementById('sidebar-origin-iata-badge');
  if (originBadge && origin) {
    originBadge.textContent = `${origin.flag} ${origin.city} (${origin.iata})`;
  }

  const currBadge = document.getElementById('sidebar-currency-badge');
  if (currBadge && curr) {
    currBadge.textContent = `${curr.flag || ''} ${curr.symbol.trim()} ${curr.code}`;
  }

  const budgetCurrCodeEl = document.getElementById('budget-input-curr-code');
  if (budgetCurrCodeEl && curr) {
    budgetCurrCodeEl.textContent = `${curr.code} (${curr.symbol.trim()})`;
  }

  const budgetCustomInput = document.getElementById('budget-custom-input');
  if (budgetCustomInput && curr) {
    budgetCustomInput.value = Math.round(state.budgetGBP * curr.rate);
  }

  const adultsEl = document.getElementById('adults-count-label');
  const childrenEl = document.getElementById('children-count-label');
  const travBadge = document.getElementById('travellers-summary-badge');
  const partyDurationSummary = document.getElementById('party-duration-summary');
  if (adultsEl) adultsEl.textContent = state.adults;
  if (childrenEl) childrenEl.textContent = state.children;
  if (travBadge) travBadge.textContent = `${travLabel} • ${rooms} Room${rooms > 1 ? 's' : ''}`;
  if (partyDurationSummary) {
    partyDurationSummary.textContent = `${travLabel} • ${rooms} Rm • ${state.tripDays}d`;
  }

  const tripStartDateInput = document.getElementById('trip-start-date');
  if (tripStartDateInput && state.startDate && tripStartDateInput.value !== state.startDate) {
    tripStartDateInput.value = state.startDate;
  }

  const dateRangeBadge = document.getElementById('date-range-summary-badge');
  if (dateRangeBadge) {
    if (state.startDate && state.endDate) {
      dateRangeBadge.textContent = `${formatDateDMY(state.startDate)} → ${formatDateDMY(state.endDate)}`;
    } else if (state.endDate) {
      dateRangeBadge.textContent = `Returns: ${formatDateDMY(state.endDate)}`;
    } else {
      dateRangeBadge.textContent = `${state.tripDays} Days`;
    }
  }

  const startDateDisplay = document.getElementById('trip-start-date-display');
  if (startDateDisplay) {
    startDateDisplay.textContent = state.startDate ? formatDateDMY(state.startDate) : 'Select date';
  }

  // Top Header Live Summary
  document.getElementById('header-summary-temp').textContent = `${formatTemp(state.minTempC)} – ${formatTemp(state.maxTempC)}`;
  document.getElementById('header-summary-month').textContent = `${monthMeta.full} (${state.tripDays} Days)`;
  const headerTrav = document.getElementById('header-summary-travellers');
  if (headerTrav) headerTrav.textContent = travLabel;
  document.getElementById('header-summary-budget').textContent = `Budget: ${formatMoney(state.budgetGBP)}`;
}

function handleFilterChange() {
  const strictToggle = document.getElementById('strict-budget-toggle');
  if (strictToggle) state.strictBudget = strictToggle.checked;

  updateFilterLabels();

  computedDestinations = DESTINATIONS_DB.map(evaluateDestination);
  const litLocations = computedDestinations.filter(d => d.isLitUp);

  document.getElementById('header-summary-matches').textContent = `${litLocations.length} Locations Lit Up`;

  updateGlobeVisualization();
  update2DMapVisualization();
  renderMatchingDestinationsList();

  // If modal is currently open, refresh its live numbers too
  if (state.selectedDestinationId) {
    const activeDest = computedDestinations.find(d => d.id === state.selectedDestinationId);
    if (activeDest && !document.getElementById('destination-modal').classList.contains('hidden')) {
      renderDestinationModalContent(activeDest);
    }
  }
}

// ============================================================================
// 3D INTERACTIVE WEBGL GLOBE (GLOBE.GL / THREE.JS)
// ============================================================================
let globeRenderEpoch = 0;

function init3DGlobe() {
  const container = document.getElementById('globe-viz');
  if (!container || typeof Globe === 'undefined') return;

  try {
    const tex = GLOBE_TEXTURES[state.globeTextureIndex];
    const width = container.clientWidth || 750;
    const height = container.clientHeight || 650;

    globeInstance = Globe()(container)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl(tex.globeUrl)
      .bumpImageUrl(tex.bumpUrl)
      .showAtmosphere(true)
      .atmosphereColor(tex.atmosphereColor)
      .atmosphereAltitude(0.2)
      // Glowing 3D cylinders/pillars at each lit-up location
      .pointsData([])
      .pointLat('lat')
      .pointLng('lng')
      .pointColor(d => d.isOrigin ? '#60a5fa' : (d.matchesBudget ? '#10b981' : '#f59e0b'))
      .pointAltitude(d => d.isOrigin ? 0.05 : 0.035)
      .pointRadius(d => d.isOrigin ? 0.65 : 0.55)
      .pointsTransitionDuration(0)
      // Pulsing concentric radar rings around lit-up destinations
      .ringsData([])
      .ringLat('lat')
      .ringLng('lng')
      .ringColor(d => t => d.matchesBudget ? `rgba(16, 185, 129, ${1 - t})` : `rgba(245, 158, 11, ${1 - t})`)
      .ringMaxRadius(3.8)
      .ringPropagationSpeed(2.0)
      .ringRepeatPeriod(950)
      // Animated flight arcs from Departure Hub to Lit-Up Destinations
      .arcsData([])
      .arcStartLat('startLat')
      .arcStartLng('startLng')
      .arcEndLat('endLat')
      .arcEndLng('endLng')
      .arcColor('color')
      .arcAltitude(d => d.altitude || 0.25)
      .arcDashLength(0.5)
      .arcDashGap(0.2)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(1800)
      .arcStroke(0.7)
      .arcsTransitionDuration(0)
      // Interactive Floating HTML Badges Showing Flag, City, Temp, Flight Cost + Hotel Cost
      .htmlElementsData([])
      .htmlLat('lat')
      .htmlLng('lng')
      .htmlAltitude(0.04)
      .htmlTransitionDuration(0)
      .htmlElement(d => createGlobePinElement(d));

    // Set initial camera & smooth auto-rotation
    const origin = getOriginHub();
    globeInstance.pointOfView({ lat: 24, lng: origin.lng + 15, altitude: 2.15 }, 800);

    const controls = globeInstance.controls();
    if (controls) {
      controls.autoRotate = state.autoRotate;
      controls.autoRotateSpeed = 0.45;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      // Pause rotation briefly when user drags the globe
      controls.addEventListener('start', () => {
        if (state.autoRotate) {
          controls.autoRotate = false;
        }
      });
    }
  } catch (err) {
    console.warn('WebGL Globe fallback mode activated:', err);
  }
}

function createGlobePinElement(d) {
  const wrapper = document.createElement('div');
  wrapper.className = 'globe-pin-wrapper';
  wrapper.dataset.pinId = String(d.id);
  wrapper.dataset.renderEpoch = String(globeRenderEpoch);

  if (d.isOrigin) {
    const originFlagHtml = getFlagIconHtml(d, "w-4 h-3 rounded-[2px] object-cover inline-block shadow-sm");
    wrapper.innerHTML = `
      <div class="globe-pin-origin flex items-center gap-1.5 shadow-lg shadow-cyan-500/30">
        ${originFlagHtml}
        <span>${d.city} (${d.iata})</span>
      </div>
    `;
    return wrapper;
  }

  const isSelected = state.selectedDestinationId === d.id;
  const tier = d.primaryTier;
  const flagHtml = getFlagIconHtml(d, "w-4 h-3 rounded-[2px] object-cover inline-block shadow-sm");

  // Clean pill presentation matching the new screenshot
  wrapper.innerHTML = `
    <div class="globe-pin-card ${isSelected ? 'pin-selected' : ''} ${!d.matchesBudget ? 'pin-over-budget' : ''}">
      <div class="flex items-center gap-1.5 text-xs font-extrabold leading-tight">
        ${flagHtml}
        <span class="truncate max-w-[110px] text-white">${d.city.split('(')[0].split('&')[0].trim()}</span>
      </div>
      <div class="flex items-center justify-between gap-1.5 text-[10px] font-mono leading-tight pt-0.5">
        <span class="text-amber-300 font-semibold flex items-center gap-0.5">
          <span>⛅</span>
          <span>${formatTemp(d.tempC)}</span>
        </span>
        <span class="font-bold ${d.matchesBudget ? 'text-cyan-300' : 'text-amber-300'}">${formatMoney(tier.combinedTotalGBP)}</span>
      </div>
    </div>
    <div class="globe-pin-stem"></div>
    <div class="globe-pin-dot ${!d.matchesBudget ? 'dot-amber' : ''}"></div>
  `;

  wrapper.onclick = (e) => {
    e.stopPropagation();
    openDestinationModal(d.id);
  };

  return wrapper;
}

/**
 * Purges any non-qualifying Three.js CSS2DObjects, 30s-delayed radar rings, points, and arcs
 * directly from the Three.js scene graph & DOM so CSS2DRenderer never re-appends stale pins.
 */
function purgeNonQualifyingGlobeObjects(validPinIds, validDestIds, targetEpoch) {
  if (!globeInstance) return;

  try {
    const scene = typeof globeInstance.scene === 'function' ? globeInstance.scene() : null;
    if (scene && typeof scene.traverse === 'function') {
      const toRemove = [];
      scene.traverse(obj => {
        if (obj.isCSS2DObject && obj.element) {
          const pinId = obj.element.dataset ? obj.element.dataset.pinId : null;
          const pinEpoch = obj.element.dataset ? obj.element.dataset.renderEpoch : null;
          if (!pinId || !validPinIds.has(pinId) || (targetEpoch && pinEpoch && pinEpoch !== String(targetEpoch))) {
            toRemove.push(obj);
          }
        } else if (obj.__globeObjType === 'ring' || obj.__globeObjType === 'arc') {
          const dataId = obj.__data && obj.__data.id ? String(obj.__data.id) : null;
          if (dataId && !validDestIds.has(dataId)) {
            toRemove.push(obj);
          }
        } else if (obj.__globeObjType === 'point') {
          const dataId = obj.__data && obj.__data.id ? String(obj.__data.id) : null;
          if (dataId && !validPinIds.has(dataId)) {
            toRemove.push(obj);
          }
        }
      });

      toRemove.forEach(obj => {
        if (obj.element && obj.element.parentNode) {
          obj.element.parentNode.removeChild(obj.element);
        }
        if (obj.parent) {
          obj.parent.remove(obj);
        }
      });
    }
  } catch (e) {
    // Ignore scene traversal edge cases
  }

  // Also clean any orphaned DOM pin wrappers not in validPinIds
  const domPins = document.querySelectorAll('#globe-viz .globe-pin-wrapper');
  domPins.forEach(el => {
    const pinId = el.dataset ? el.dataset.pinId : null;
    const pinEpoch = el.dataset ? el.dataset.renderEpoch : null;
    if (!pinId || !validPinIds.has(pinId) || (targetEpoch && pinEpoch && pinEpoch !== String(targetEpoch))) {
      el.remove();
    }
  });
}

function updateGlobeVisualization() {
  if (!globeInstance) return;

  globeRenderEpoch += 1;
  const currentEpoch = globeRenderEpoch;

  const origin = getOriginHub();
  const litDestinations = computedDestinations.filter(d => d.isLitUp);

  const originMarker = {
    isOrigin: true,
    id: `origin-${origin.id}`,
    city: origin.city,
    iata: origin.iata,
    flag: origin.flag,
    lat: origin.lat,
    lng: origin.lng
  };

  const points = [originMarker, ...litDestinations].map(p => ({ ...p }));
  const arcs = litDestinations.map(d => ({
    id: d.id,
    startLat: origin.lat,
    startLng: origin.lng,
    endLat: d.lat,
    endLng: d.lng,
    altitude: Math.min(0.35, Math.max(0.12, (d.distanceKm || 2000) / 18000)),
    color: d.matchesBudget
      ? ['rgba(56, 189, 248, 0.95)', 'rgba(56, 189, 248, 0.85)']
      : ['rgba(56, 189, 248, 0.65)', 'rgba(245, 158, 11, 0.75)']
  }));

  const validPinIds = new Set(points.map(p => String(p.id)));
  const validDestIds = new Set(litDestinations.map(d => String(d.id)));

  // Passing a fresh htmlElement function triggers purge:true inside Globe.gl's htmlElementsLayer
  globeInstance
    .pointsData(points)
    .ringsData(litDestinations)
    .arcsData(arcs)
    .htmlElementsData(points)
    .htmlElement(d => createGlobePinElement(d));

  // Purge non-qualifying objects immediately and after Globe.gl's requestAnimationFrame digest
  purgeNonQualifyingGlobeObjects(validPinIds, validDestIds, null);
  requestAnimationFrame(() => {
    if (currentEpoch === globeRenderEpoch) {
      purgeNonQualifyingGlobeObjects(validPinIds, validDestIds, currentEpoch);
    }
  });
  setTimeout(() => {
    if (currentEpoch === globeRenderEpoch) {
      purgeNonQualifyingGlobeObjects(validPinIds, validDestIds, currentEpoch);
    }
  }, 60);

  // If the user's filter narrows results down to 1–6 locations (and modal isn't open),
  // smoothly rotate the globe camera toward the matching location(s)
  if (litDestinations.length >= 1 && litDestinations.length <= 6 && !document.body.classList.contains('modal-open')) {
    const focusTarget = litDestinations[0];
    globeInstance.pointOfView(
      { lat: focusTarget.lat, lng: focusTarget.lng, altitude: litDestinations.length === 1 ? 1.55 : 1.95 },
      900
    );
  }
}

function toggleGlobeRotation() {
  state.autoRotate = !state.autoRotate;
  const btn = document.getElementById('btn-autorotate');
  if (globeInstance && globeInstance.controls()) {
    globeInstance.controls().autoRotate = state.autoRotate;
  }
  if (btn) {
    if (state.autoRotate) {
      btn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition';
      btn.innerHTML = `<i data-lucide="refresh-cw" class="w-3 h-3"></i><span>Spin: ON</span>`;
    } else {
      btn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 transition';
      btn.innerHTML = `<i data-lucide="pause" class="w-3 h-3"></i><span>Spin: OFF</span>`;
    }
    if (window.lucide) lucide.createIcons();
  }
}

function cycleGlobeTexture() {
  state.globeTextureIndex = (state.globeTextureIndex + 1) % GLOBE_TEXTURES.length;
  const tex = GLOBE_TEXTURES[state.globeTextureIndex];
  const label = document.getElementById('globe-texture-label');
  if (label) label.textContent = tex.name;

  if (globeInstance) {
    globeInstance
      .globeImageUrl(tex.globeUrl)
      .atmosphereColor(tex.atmosphereColor);
  }
  if (leafletMap) {
    apply2DTileLayer(state.globeTextureIndex);
  }
}

function focusGlobeRegion(region) {
  const coords = {
    'world': { lat: 22, lng: 10, altitude: 2.15, zoom2d: 2 },
    'Europe': { lat: 46, lng: 12, altitude: 1.25, zoom2d: 4 },
    'Asia': { lat: 20, lng: 105, altitude: 1.55, zoom2d: 3 },
    'Americas': { lat: 12, lng: -78, altitude: 1.65, zoom2d: 3 },
    'Middle East & Africa': { lat: 5, lng: 28, altitude: 1.6, zoom2d: 3 },
    'Oceania': { lat: -28, lng: 155, altitude: 1.5, zoom2d: 4 }
  };
  const target = coords[region] || coords.world;

  if (state.mapMode === '3d' && globeInstance) {
    globeInstance.pointOfView({ lat: target.lat, lng: target.lng, altitude: target.altitude }, 1100);
  } else if (state.mapMode === '2d' && leafletMap) {
    leafletMap.flyTo([target.lat, target.lng], target.zoom2d, { duration: 1.0 });
  }
}

function handleViewportResize() {
  const container = document.getElementById('globe-viz');
  if (globeInstance && container) {
    globeInstance.width(container.clientWidth);
    globeInstance.height(container.clientHeight);
  }
  if (leafletMap) {
    leafletMap.invalidateSize();
  }
}

// ============================================================================
// 2D WORLD MAP TOGGLE (LEAFLET.JS — 100% FREE, ZERO-API-KEY TILES)
// ============================================================================
function setMapMode(mode) {
  state.mapMode = mode;
  const globeDiv = document.getElementById('globe-viz');
  const mapDiv = document.getElementById('leaflet-map');
  const btn3d = document.getElementById('btn-view-3d');
  const btn2d = document.getElementById('btn-view-2d');

  if (mode === '2d') {
    globeDiv.classList.add('hidden');
    mapDiv.classList.remove('hidden');
    btn2d.className = 'px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-600 text-white shadow flex items-center gap-1 transition';
    btn3d.className = 'px-2.5 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition';
    init2DMap();
    setTimeout(() => {
      if (leafletMap) leafletMap.invalidateSize();
      update2DMapVisualization();
    }, 60);
  } else {
    mapDiv.classList.add('hidden');
    globeDiv.classList.remove('hidden');
    btn3d.className = 'px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-600 text-white shadow flex items-center gap-1 transition';
    btn2d.className = 'px-2.5 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition';
    handleViewportResize();
  }
}

function apply2DTileLayer(texIdx) {
  if (!leafletMap) return;
  const tex = GLOBE_TEXTURES[texIdx] || GLOBE_TEXTURES[0];

  if (leafletBaseTileLayer) {
    leafletMap.removeLayer(leafletBaseTileLayer);
    leafletBaseTileLayer = null;
  }
  if (leafletLabelTileLayer) {
    leafletMap.removeLayer(leafletLabelTileLayer);
    leafletLabelTileLayer = null;
  }

  leafletBaseTileLayer = L.tileLayer(tex.tile2dUrl, {
    attribution: tex.tile2dAttribution,
    maxZoom: 18
  }).addTo(leafletMap);

  if (tex.tile2dLabelsUrl) {
    leafletLabelTileLayer = L.tileLayer(tex.tile2dLabelsUrl, {
      maxZoom: 18,
      pane: 'overlayPane'
    }).addTo(leafletMap);
  }
}

function init2DMap() {
  if (leafletMap || typeof L === 'undefined') return;
  leafletMap = L.map('leaflet-map', {
    center: [24, 12],
    zoom: 2.4,
    minZoom: 2,
    maxZoom: 18,
    worldCopyJump: true
  });

  apply2DTileLayer(state.globeTextureIndex);
  leafletMarkersLayer = L.layerGroup().addTo(leafletMap);
}

function update2DMapVisualization() {
  if (!leafletMap || !leafletMarkersLayer) return;
  leafletMarkersLayer.clearLayers();

  const origin = getOriginHub();
  const litDestinations = computedDestinations.filter(d => d.isLitUp);

  // Compact Origin marker
  const originIcon = L.divIcon({
    className: '',
    html: `<div class="map2d-origin-pill" title="Starting Point: ${origin.name}">🛫 ${origin.city}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
  L.marker([origin.lat, origin.lng], { icon: originIcon, zIndexOffset: 500 }).addTo(leafletMarkersLayer);

  litDestinations.forEach(d => {
    const tier = d.primaryTier;
    const lineColor = d.matchesBudget ? '#10b981' : '#f59e0b';
    const shortCity = d.city.split('(')[0].split(',')[0].split('&')[0].trim();
    const tooltipText = `${d.city}, ${d.country} (${formatTemp(d.tempC)}) • Flights: ${formatMoney(d.flightCostGBP)} + ${tier.shortLabel}: ${formatMoney(tier.hotelTotalGBP)} = ${formatMoney(tier.combinedTotalGBP)} (Click for Itinerary)`;

    // Subtle flight polyline
    L.polyline([[origin.lat, origin.lng], [d.lat, d.lng]], {
      color: lineColor,
      weight: 1,
      opacity: 0.28,
      dashArray: '3, 6'
    }).addTo(leafletMarkersLayer);

    // Compact 2D Map badge: Location Name + Price Only (small font)
    const pinIcon = L.divIcon({
      className: '',
      html: `
        <div class="map2d-pin-wrapper" title="${tooltipText}">
          <div class="map2d-pin-pill ${!d.matchesBudget ? 'pin-over-budget' : ''}">
            <span class="map2d-pin-name">${shortCity}</span>
            <span class="map2d-pin-price">${formatMoney(tier.combinedTotalGBP)}</span>
          </div>
          <div class="map2d-pin-dot ${!d.matchesBudget ? 'dot-amber' : ''}"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const marker = L.marker([d.lat, d.lng], { icon: pinIcon }).addTo(leafletMarkersLayer);
    marker.on('mouseover', () => marker.setZIndexOffset(10000));
    marker.on('mouseout', () => marker.setZIndexOffset(0));
    marker.on('click', () => openDestinationModal(d.id));
  });
}

// Convert country code or flag emoji to reliable FlagCDN SVG image URL (guarantees flags display on Windows Chrome/Edge/Firefox)
function getFlagIconHtml(dest, className = "w-4 h-3.5 rounded-[2px] object-cover inline-block shrink-0 shadow-sm") {
  if (!dest) return '';
  const flagStr = dest.flag || '';
  const points = Array.from(flagStr).map(c => c.codePointAt(0));

  // Check if standard regional indicator flag (2 code points between 0x1F1E6 and 0x1F1FF)
  if (points.length === 2 && points[0] >= 0x1F1E6 && points[0] <= 0x1F1FF && points[1] >= 0x1F1E6 && points[1] <= 0x1F1FF) {
    const iso = String.fromCharCode(points[0] - 0x1F1E6 + 65, points[1] - 0x1F1E6 + 65).toLowerCase();
    return `<img src="https://flagcdn.com/w40/${iso}.png" alt="${dest.country || ''}" class="${className}" loading="lazy" onerror="this.outerHTML='${flagStr}'" />`;
  }

  // Scotland special sub-division flag
  if (dest.id === 'edinburgh' || flagStr.includes('🏴')) {
    return `<img src="https://flagcdn.com/w40/gb-sct.png" alt="Scotland" class="${className}" loading="lazy" onerror="this.outerHTML='${flagStr}'" />`;
  }

  // Fallback to unicode emoji or text
  return `<span class="inline-block text-base leading-none">${flagStr}</span>`;
}

// Curated high-resolution landscape photography for top destination cards
const DESTINATION_HERO_PHOTOS = {
  lisbon: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=600&q=80',
  seville: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=600&q=80',
  barcelona: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=600&q=80',
  rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
  amalfi: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
  athens: 'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=600&q=80',
  santorini: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
  dubrovnik: 'https://images.unsplash.com/photo-1555990538-16474e645936?auto=format&fit=crop&w=600&q=80',
  tenerife: 'https://images.unsplash.com/photo-1589553416260-f586c8f1514f?auto=format&fit=crop&w=600&q=80',
  madeira: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
  malta: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80',
  cyprus: 'https://images.unsplash.com/photo-1580837119756-563d608dd119?auto=format&fit=crop&w=600&q=80',
  istanbul: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80',
  antalya: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
  paris: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=600&q=80',
  nice: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
  prague: 'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=600&q=80',
  budapest: 'https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=600&q=80',
  vienna: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=600&q=80',
  zermatt: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=600&q=80',
  reykjavik: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
  rovaniemi: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
  amsterdam: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=600&q=80',
  edinburgh: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=80',
  tokyo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
  kyoto: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
  bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
  phuket: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=600&q=80',
  bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
  singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80',
  maldives: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80',
  hanoi: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
  jaipur: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
  colombo: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=600&q=80',
  seoul: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=600&q=80',
  taipei: 'https://images.unsplash.com/photo-1470004914216-30778578afb2?auto=format&fit=crop&w=600&q=80',
  dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80',
  muscat: 'https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?auto=format&fit=crop&w=600&q=80',
  marrakech: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=600&q=80',
  cairo: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=600&q=80',
  capetown: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80',
  zanzibar: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=600&q=80',
  mauritius: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=600&q=80',
  newyork: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=600&q=80',
  miami: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&w=600&q=80',
  cancun: 'https://images.unsplash.com/photo-1510414842594-a61782153f5b?auto=format&fit=crop&w=600&q=80',
  costarica: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  barbados: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  cusco: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=600&q=80',
  rio: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80',
  buenosaires: 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=600&q=80',
  banff: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
  sydney: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80',
  queenstown: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=600&q=80',
  fiji: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
  marrakech_agadir: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=600&q=80',
  krakow: 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=600&q=80',
  porto: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=600&q=80',
  mallorca: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
  tallinn: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80',
  florence: 'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=600&q=80',
  zurich_lucerne: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=600&q=80',
  tromso: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=600&q=80',
  lanzarote: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  algarve: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
  danang: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
  kualalumpur: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=600&q=80',
  honolulu: 'https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=600&q=80',
  cartagena: 'https://images.unsplash.com/photo-1583531352515-8884af319dc1?auto=format&fit=crop&w=600&q=80',
  seychelles: 'https://images.unsplash.com/photo-1589979481223-deb893043163?auto=format&fit=crop&w=600&q=80',
  geneva: 'https://images.unsplash.com/photo-1574873215043-44119461cb3b?auto=format&fit=crop&w=600&q=80',
  default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'
};

function getDestinationPhoto(id) {
  return DESTINATION_HERO_PHOTOS[id] || DESTINATION_HERO_PHOTOS.default;
}

function setSortTab(tabKey) {
  const sortSelect = document.getElementById('sort-select');
  const btnVal = document.getElementById('tab-sort-value');
  const btnCheap = document.getElementById('tab-sort-cheapest');
  const btnWarm = document.getElementById('tab-sort-warmest');

  [btnVal, btnCheap, btnWarm].forEach(btn => {
    if (btn) {
      btn.className = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition text-center';
    }
  });

  if (tabKey === 'value') {
    if (btnVal) btnVal.className = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 shadow-md transition text-center';
    if (sortSelect) sortSelect.value = 'total_asc';
  } else if (tabKey === 'cheapest') {
    if (btnCheap) btnCheap.className = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 shadow-md transition text-center';
    if (sortSelect) sortSelect.value = 'total_asc';
  } else if (tabKey === 'warmest') {
    if (btnWarm) btnWarm.className = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 shadow-md transition text-center';
    if (sortSelect) sortSelect.value = 'temp_desc';
  }

  renderMatchingDestinationsList();
}

function openComparisonModal() {
  const matches = computedDestinations.filter(d => d.isLitUp);
  if (matches.length > 0) {
    openDestinationModal(matches[0].id);
    showNotification(`Opened top recommendation (${matches[0].city}) for detailed comparison`, 'info');
  } else {
    showNotification('No destinations match current filters. Adjust your budget or month!', 'warning');
  }
}

// ============================================================================
// RIGHT SIDEBAR: MATCHING DESTINATIONS LIST & ACCOMMODATION BREAKDOWN
// ============================================================================
function renderMatchingDestinationsList() {
  const listEl = document.getElementById('matching-destinations-list');
  const countBadge = document.getElementById('matches-count-badge');
  const sortMode = (document.getElementById('sort-select') || {}).value || 'total_asc';
  const searchQuery = ((document.getElementById('dest-search-input') || {}).value || '').trim().toLowerCase();

  let matches = computedDestinations.filter(d => d.isLitUp);

  // Update bottom floating stats on the globe
  const globeMatchesCount = document.getElementById('globe-bottom-matches-count');
  const globeCheapest = document.getElementById('globe-bottom-cheapest-price');
  const globeWarmest = document.getElementById('globe-bottom-warmest-temp');
  if (globeMatchesCount) globeMatchesCount.textContent = matches.length;
  if (matches.length > 0) {
    const minPrice = Math.min(...matches.map(m => m.primaryTier.combinedTotalGBP));
    const maxTemp = Math.max(...matches.map(m => m.tempC));
    if (globeCheapest) globeCheapest.textContent = formatMoney(minPrice);
    if (globeWarmest) globeWarmest.textContent = formatTemp(maxTemp);
  } else {
    if (globeCheapest) globeCheapest.textContent = '--';
    if (globeWarmest) globeWarmest.textContent = '--';
  }

  if (searchQuery) {
    matches = matches.filter(d =>
      d.city.toLowerCase().includes(searchQuery) ||
      d.country.toLowerCase().includes(searchQuery) ||
      d.continent.toLowerCase().includes(searchQuery) ||
      d.vibeTags.some(t => t.toLowerCase().includes(searchQuery))
    );
  }

  // Sort
  matches.sort((a, b) => {
    if (sortMode === 'total_asc') return a.primaryTier.combinedTotalGBP - b.primaryTier.combinedTotalGBP;
    if (sortMode === 'temp_desc') return b.tempC - a.tempC;
    if (sortMode === 'temp_asc') return a.tempC - b.tempC;
    if (sortMode === 'flight_asc') return a.flightCostGBP - b.flightCostGBP;
    return 0;
  });

  if (countBadge) countBadge.textContent = `${matches.length} picks`;
  const compareBtnText = document.getElementById('compare-button-text');
  if (compareBtnText) {
    compareBtnText.textContent = matches.length > 0 ? `Compare ${Math.min(4, matches.length)} picks` : 'Compare picks';
  }

  if (matches.length === 0) {
    listEl.innerHTML = `
      <div class="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center space-y-3 my-4">
        <div class="w-10 h-10 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto">
          <i data-lucide="compass" class="w-5 h-5"></i>
        </div>
        <h3 class="text-sm font-bold text-white">No Destinations Match Strict Filters</h3>
        <p class="text-xs text-slate-400">
          Try widening your temperature range (${formatTemp(state.minTempC)}–${formatTemp(state.maxTempC)}), increasing your total budget (${formatMoney(state.budgetGBP)} for ${getTravellersLabel(false)}), or unchecking "Strictly hide locations over budget".
        </p>
        <button onclick="resetAllFilters()" class="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition">
          Reset Filters to Default
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  listEl.innerHTML = matches.map((d, index) => {
    const tier = d.primaryTier;
    const isTopRanked = index === 0;
    const photoUrl = getDestinationPhoto(d.id);
    const seasonBadgeClass = d.isOnPeak
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

    return `
      <div
        onclick="openDestinationModal('${d.id}')"
        class="group relative rounded-2xl overflow-hidden border ${
          isTopRanked
            ? 'border-orange-500/90 ring-1 ring-pink-500/80 shadow-lg shadow-pink-500/15'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/90'
        } cursor-pointer transition-all hover:scale-[1.01] flex flex-col"
      >
        <!-- Hero Photographic Banner (Landscape 16:9 crop) -->
        <div class="relative h-28 w-full overflow-hidden bg-slate-900">
          <img
            src="${photoUrl}"
            alt="${d.city}"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/20"></div>

          <!-- Top Rank Badge: #1 Best Match -->
          ${isTopRanked ? `
            <div class="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md">
              #1 Best match
            </div>
          ` : ''}

          <!-- Floating City & Season Badge inside photo -->
          <div class="absolute bottom-2 left-3 right-3 flex items-end justify-between z-10">
            <div class="flex items-center gap-1.5 min-w-0">
              ${getFlagIconHtml(d, "w-4 h-3 rounded-[2px] object-cover inline-block shadow-md")}
              <h3 class="text-sm font-extrabold text-white truncate drop-shadow-md">${d.city}</h3>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${seasonBadgeClass}">
                ${d.isOnPeak ? 'ON-PEAK' : 'OFF-PEAK'}
              </span>
            </div>
          </div>
        </div>

        <!-- Card Footer: Flight time, weather, and large price -->
        <div class="p-3 bg-slate-950/90 flex items-center justify-between border-t border-slate-800/80">
          <div>
            <div class="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
              <span>⛅ ${formatTemp(d.tempC)}</span>
              <span class="text-slate-600">•</span>
              <span>${d.estFlightHours}h flight</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">
              Flights + ${tier.shortLabel}
            </div>
          </div>

          <div class="text-right">
            <span class="text-[10px] text-slate-400 block -mb-0.5">from</span>
            <span class="text-base font-extrabold font-mono text-amber-300">
              ${formatMoney(tier.combinedTotalGBP)}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function pickRandomMatchingDestination() {
  const lit = computedDestinations.filter(d => d.isLitUp);
  const pool = lit.length > 0 ? lit : computedDestinations;
  if (pool.length === 0) return;
  const randomDest = pool[Math.floor(Math.random() * pool.length)];
  openDestinationModal(randomDest.id);
}

// ============================================================================
// DESTINATION MODAL: COST BREAKDOWN, ITINERARY GENERATOR & BOOKING LINKS
// ============================================================================
function openDestinationModal(destId) {
  const dest = computedDestinations.find(d => d.id === destId);
  if (!dest) return;

  state.selectedDestinationId = destId;
  state.activeModalTier = dest.primaryTier.tierId;
  state.itineraryVisible = false;

  // Hide background globe/map floating HTML pins while modal is open
  document.body.classList.add('modal-open');

  // Smoothly fly the 3D Globe or 2D Map camera to the clicked location
  if (state.mapMode === '3d' && globeInstance) {
    if (globeInstance.controls()) globeInstance.controls().autoRotate = false;
    globeInstance.pointOfView({ lat: dest.lat, lng: dest.lng, altitude: 1.35 }, 1000);
    updateGlobeVisualization();
  } else if (state.mapMode === '2d' && leafletMap) {
    leafletMap.flyTo([dest.lat, dest.lng], 5, { duration: 0.9 });
  }

  renderDestinationModalContent(dest);

  const modal = document.getElementById('destination-modal');
  modal.classList.remove('hidden');

  if (window.lucide) lucide.createIcons();
}

function closeDestinationModal() {
  const modal = document.getElementById('destination-modal');
  if (modal) modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  if (globeInstance && globeInstance.controls() && state.autoRotate) {
    globeInstance.controls().autoRotate = true;
  }
}

function toggleModalCalculationDetails() {
  const panel = document.getElementById('modal-calculation-details-panel');
  const chevron = document.getElementById('calc-details-chevron');
  if (panel) {
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      panel.classList.remove('hidden');
      if (chevron) chevron.style.transform = 'rotate(180deg)';
    } else {
      panel.classList.add('hidden');
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
  }
}

function toggleItinerarySection() {
  const box = document.getElementById('generated-itinerary-container');
  const btn = document.getElementById('btn-toggle-itinerary-box');
  if (box) {
    const isHidden = box.classList.contains('hidden');
    if (isHidden) {
      box.classList.remove('hidden');
      if (btn) btn.textContent = 'Hide Itinerary';
      generateDestinationItinerary();
    } else {
      box.classList.add('hidden');
      if (btn) btn.textContent = 'Create Itinerary';
    }
  }
}

function selectModalAccommodationTier(tierId) {
  state.activeModalTier = tierId;
  const dest = computedDestinations.find(d => d.id === state.selectedDestinationId);
  if (!dest) return;
  renderDestinationModalContent(dest);
}

function renderDestinationModalContent(dest) {
  const origin = getOriginHub();
  const monthMeta = MONTHS_META[state.monthIndex];
  const currCode = state.currency || 'GBP';
  const dates = getSampleTravelDates();

  // 1. Top Photographic Banner & Title
  const heroImg = document.getElementById('modal-hero-photo');
  if (heroImg) {
    heroImg.src = getDestinationPhoto(dest.id);
    heroImg.alt = dest.city;
  }
  const flagEl = document.getElementById('modal-flag');
  if (flagEl) {
    flagEl.innerHTML = getFlagIconHtml(dest, "w-6 h-4.5 rounded-[3px] object-cover inline-block shadow-md");
  }
  const cityTitle = document.getElementById('modal-city-title');
  if (cityTitle) cityTitle.textContent = dest.city;

  const tempBadge = document.getElementById('modal-temp-badge');
  if (tempBadge) tempBadge.textContent = `☀️ ${formatTemp(dest.tempC)} in ${monthMeta.short}`;

  const seasonText = document.getElementById('modal-season-text');
  if (seasonText) seasonText.textContent = dest.isOnPeak ? 'On-peak' : 'Off-peak';

  // 2. Summary Line: "7 nights • 2 adults • December" & "from £745"
  const summaryLine = document.getElementById('modal-trip-summary-line');
  if (summaryLine) {
    summaryLine.textContent = `${state.tripDays} nights • ${getTravellersLabel(false)} • ${monthMeta.full}`;
  }
  const minPriceEl = document.getElementById('modal-trip-min-price');
  const minTotal = Math.min(...Object.values(dest.tierBreakdowns).map(t => t.combinedTotalGBP));
  if (minPriceEl) minPriceEl.textContent = formatMoney(minTotal);

  // 3. Segmented Tier Choice Buttons Grid (4 columns)
  const tierGrid = document.getElementById('modal-tier-buttons-grid');
  if (tierGrid) {
    const tierDisplayNames = {
      '5star': 'Luxury',
      '4star': 'Boutique',
      '3star': 'Comfort',
      'airbnb': 'Rental'
    };
    tierGrid.innerHTML = ACCOMMODATION_TIERS.map(tierMeta => {
      const t = dest.tierBreakdowns[tierMeta.id];
      const isSelected = state.activeModalTier === tierMeta.id;
      const displayName = tierDisplayNames[tierMeta.id] || tierMeta.label;

      return `
        <button
          type="button"
          onclick="selectModalAccommodationTier('${tierMeta.id}')"
          class="py-2 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
            isSelected
              ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-500/50 shadow-md text-white'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
          }"
        >
          <span class="text-[11px] font-bold">${displayName}</span>
          <span class="text-xs font-mono font-extrabold ${isSelected ? 'text-white' : 'text-slate-300'}">
            ${formatMoney(t.combinedTotalGBP)}
          </span>
        </button>
      `;
    }).join('');
  }

  // 4. Active Hotel Card Panel (matching screenshot design)
  const activeTier = dest.tierBreakdowns[state.activeModalTier] || dest.primaryTier;
  const rawExample = activeTier.exampleProperty || dest.city;
  const primaryHotelName = rawExample.split('/')[0].trim();
  const hotelCard = document.getElementById('modal-selected-hotel-card');

  // Booking URLs for direct click
  const bookingHotelUrl = activeTier.tierId === 'airbnb'
    ? `https://www.airbnb.co.uk/s/${encodeURIComponent(dest.city)}--${encodeURIComponent(dest.country)}/homes?query=${encodeURIComponent(primaryHotelName)}&checkin=${dates.checkinISO}&checkout=${dates.checkoutISO}&adults=${state.adults}&children=${state.children}&currency=${currCode}`
    : `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${primaryHotelName}, ${dest.city}`)}&checkin=${dates.checkinISO}&checkout=${dates.checkoutISO}&group_adults=${state.adults}&group_children=${state.children}&no_rooms=${activeTier.roomsNeeded}&selected_currency=${currCode}`;

  const skyscannerFlightUrl = `https://www.skyscanner.net/transport/flights/${origin.skyscannerCode}/${dest.iata.toLowerCase()}/${dates.checkinSky}/${dates.checkoutSky}/?adults=${state.adults}&children=${state.children}&currency=${currCode}`;

  if (hotelCard) {
    hotelCard.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-base sm:text-lg font-extrabold text-white leading-tight">${primaryHotelName}</h3>
          <p class="text-xs text-slate-400 mt-0.5 truncate">${activeTier.label} in ${dest.city}</p>
        </div>
        <img
          src="${getDestinationPhoto(dest.id)}"
          alt="${primaryHotelName}"
          class="w-20 h-14 sm:w-24 sm:h-16 rounded-xl object-cover shrink-0 border border-slate-700/80 shadow"
        />
      </div>

      <!-- Cost breakdown list -->
      <div class="space-y-1.5 pt-1 border-t border-slate-800 text-xs font-mono">
        <div class="flex justify-between items-center text-slate-300">
          <span>${formatMoney(activeTier.nightlyGBP)}/night × ${state.tripDays}</span>
          <span class="font-bold text-white">${formatMoney(activeTier.hotelTotalGBP)}</span>
        </div>
        <div class="flex justify-between items-center text-slate-300">
          <span>Flights ${origin.city} → ${dest.city} (${getTravellersLabel(false)})</span>
          <span class="font-bold text-white">${formatMoney(dest.flightCostGBP)}</span>
        </div>
      </div>

      <!-- Total Row -->
      <div class="flex items-baseline justify-between pt-2 border-t border-slate-800">
        <div>
          <span class="text-sm font-extrabold text-white">Total</span>
        </div>
        <div class="text-right">
          <span class="text-lg sm:text-xl font-extrabold font-mono text-white">${formatMoney(activeTier.combinedTotalGBP)}</span>
          <span class="text-xs text-slate-400 ml-1">· ${formatMoney(activeTier.perPersonGBP)} per person</span>
        </div>
      </div>

      <!-- CTA Buttons: Book hotel & See flights -->
      <div class="grid grid-cols-2 gap-2.5 pt-1">
        <a
          href="${bookingHotelUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="py-2.5 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition active:scale-[0.98]"
        >
          <span>Book hotel</span>
          <i data-lucide="external-link" class="w-3.5 h-3.5 stroke-[2.5]"></i>
        </a>
        <a
          href="${skyscannerFlightUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
        >
          <span>See flights</span>
          <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-slate-400"></i>
        </a>
      </div>
    `;
  }

  // 5. Collapsible Calculation Details Panel
  const detailsPanel = document.getElementById('modal-calculation-details-panel');
  if (detailsPanel) {
    detailsPanel.innerHTML = `
      <div class="space-y-2 text-slate-300 text-xs">
        <div class="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <span class="font-bold text-white uppercase text-[10px] tracking-wider">Calculation Transparency</span>
          <span class="text-[10px] text-cyan-400 font-mono">${dates.checkinDMY} → ${dates.checkoutDMY}</span>
        </div>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-400">• Accommodation source:</span>
            <span class="text-amber-300 font-semibold">Booking.com &amp; Google Hotels (${activeTier.exampleProperty})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">• Airfare source:</span>
            <span class="text-cyan-300 font-semibold">Skyscanner (${origin.iata} ⇄ ${dest.iata})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">• Seasonality adjustment:</span>
            <span class="${dest.isOnPeak ? 'text-amber-300' : 'text-emerald-300'} font-semibold">${dest.isOnPeak ? 'On-Peak (+15%)' : 'Off-Peak Value (-15%)'}</span>
          </div>
        </div>
        <p class="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
          Click <strong>Book hotel</strong> or <strong>See flights</strong> above to view real-time availability and live pricing directly on Booking.com and Skyscanner.
        </p>
      </div>
    `;
  }

  // 6. Day-by-Day Itinerary prompt
  const itinContainer = document.getElementById('generated-itinerary-container');
  if (itinContainer && state.itineraryVisible) {
    generateDestinationItinerary();
  }

  if (window.lucide) lucide.createIcons();
}

// ============================================================================
// AI DAY-BY-DAY ITINERARY GENERATOR
// ============================================================================
function generateDestinationItinerary() {
  const dest = computedDestinations.find(d => d.id === state.selectedDestinationId);
  if (!dest) return;

  state.itineraryVisible = true;
  const container = document.getElementById('generated-itinerary-container');
  container.classList.remove('hidden');

  const style = (document.getElementById('itinerary-style-select') || {}).value || 'all-rounder';
  const monthMeta = MONTHS_META[state.monthIndex];
  const activeTierObj = dest.tierBreakdowns[state.activeModalTier] || dest.primaryTier;
  const days = state.tripDays;

  const styleDescriptions = {
    'all-rounder': 'Balanced Iconic Landmarks, Scenic Views & Local Neighborhoods',
    'culture': 'Deep-Dive Architecture, Museums, Heritage & Performing Arts',
    'food': 'Culinary Markets, Signature Local Dishes & Rooftop Dining',
    'relaxation': 'Scenic Coastal Promenades, Spas, Sunset Cruises & Leisurely Cafés',
    'adventure': 'Active Trails, Day Excursions, Panoramic Peaks & Hidden Gems'
  };

  const dayCardsHtml = [];
  for (let d = 1; d <= days; d++) {
    const highlightA = dest.highlights[(d - 1) % dest.highlights.length];
    const highlightB = dest.highlights[(d + 1) % dest.highlights.length];
    const dish = dest.cuisine[(d - 1) % dest.cuisine.length];
    const dishEvening = dest.cuisine[(d + 1) % dest.cuisine.length];
    const hood = dest.neighborhoods[(d - 1) % dest.neighborhoods.length];

    let dayTitle = `Exploring ${hood} & Signature Highlights`;
    let morningPlan = `Start your morning in **${hood}** enjoying ${formatTemp(dest.tempC)} ${monthMeta.full} weather. Experience: ${highlightA}.`;
    let afternoonPlan = `Savor a local lunch featuring **${dish}**, followed by a curated ${style} afternoon session${state.children > 0 ? ' (with family-friendly pacing)' : ''}: ${highlightB}.`;
    let eveningPlan = `Return to your **${activeTierObj.label}** stay (${activeTierObj.exampleProperty.split('/')[0].trim()}) to refresh, then head out for a sunset dinner tasting **${dishEvening}**.`;

    if (d === 1) {
      dayTitle = `Arrival in ${dest.city}, Check-In & Twilight Orientation`;
      morningPlan = `Touch down at **${dest.city} (${dest.iata})** with your party (${getTravellersLabel(false)}) and transfer to **${hood}**. Check into your ${activeTierObj.label} accommodation (*${activeTierObj.exampleProperty}*).`;
      afternoonPlan = `Take a gentle orientation walk through **${hood}** to soak in the ${formatTemp(dest.tempC)} climate and visit: ${highlightA}.`;
      eveningPlan = `Welcome dinner in ${hood} sampling authentic **${dish}** and **${dishEvening}** with panoramic evening views.`;
    } else if (d === days) {
      dayTitle = `Souvenir Artisan Markets, Final Viewpoints & Departure`;
      morningPlan = `Enjoy a leisurely breakfast and pick up artisanal local specialties in **${hood}**. Catch final photos at ${highlightA}.`;
      afternoonPlan = `Farewell gastronomic lunch featuring **${dish}** before transferring to **${dest.iata} Airport** for your return flight home.`;
      eveningPlan = `Board your return flight to ${getOriginHub().city} (${getOriginHub().iata}) with unforgettable memories of ${dest.city}.`;
    }

    dayCardsHtml.push(`
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-xs font-extrabold">
              DAY ${d}
            </span>
            <h4 class="text-sm font-extrabold text-white">${dayTitle}</h4>
          </div>
          <span class="text-[11px] font-mono text-slate-400">📍 ${hood} • 🌡️ ${formatTemp(dest.tempC)}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div class="bg-slate-900/70 rounded-lg p-2.5 border border-slate-800/70">
            <div class="text-[10px] font-mono uppercase text-amber-300 font-bold mb-1">☀️ Morning</div>
            <p class="text-slate-300 leading-relaxed">${morningPlan.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</p>
          </div>
          <div class="bg-slate-900/70 rounded-lg p-2.5 border border-slate-800/70">
            <div class="text-[10px] font-mono uppercase text-cyan-300 font-bold mb-1">🌤️ Afternoon</div>
            <p class="text-slate-300 leading-relaxed">${afternoonPlan.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</p>
          </div>
          <div class="bg-slate-900/70 rounded-lg p-2.5 border border-slate-800/70">
            <div class="text-[10px] font-mono uppercase text-purple-300 font-bold mb-1">🌙 Evening &amp; Dining</div>
            <p class="text-slate-300 leading-relaxed">${eveningPlan.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</p>
          </div>
        </div>
      </div>
    `);
  }

  const seasonTip = dest.isOnPeak
    ? `<strong>On-Peak Insider Tip (${monthMeta.full}):</strong> ${monthMeta.full} is prime season in ${dest.city}. Book morning timed-entry tickets for flagship sights 2–3 weeks ahead and reserve dinner tables for 8:00 PM.`
    : `<strong>Off-Peak Value Tip (${monthMeta.full}):</strong> Visiting ${dest.city} in ${monthMeta.full} means ~15% lower hotel rates and shorter queues at major landmarks while enjoying ${formatTemp(dest.tempC)} daytime highs.`;

  const familyTipHtml = state.children > 0
    ? `<div class="bg-pink-950/30 border border-pink-500/30 rounded-xl p-3 text-xs text-pink-200">
        👨‍👩‍👧‍👦 <strong>Family Travel Note (${getTravellersLabel(false)}):</strong> Child airfares include a 25% youth discount (${formatMoney(dest.singleChildFlightGBP)}/child vs ${formatMoney(dest.singleAdultFlightGBP)}/adult) and many museums/attractions in ${dest.city} offer discounted or free entry for under-12s.
      </div>`
    : '';

  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
      <div>
        <div class="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
          ✅ Custom ${days}-Day ${dest.city} Itinerary Ready (${styleDescriptions[style]})
        </div>
        <div class="text-[11px] text-slate-400 mt-0.5">
          Tailored for ${getTravellersLabel(false)} in ${monthMeta.full} • ${activeTierObj.label} (${formatMoney(activeTierObj.combinedTotalGBP)} Total Flight + Stay)
        </div>
      </div>
      <div class="no-print flex items-center gap-2">
        <button onclick="copyItineraryText()" id="btn-copy-itinerary" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition">
          <i data-lucide="copy" class="w-3.5 h-3.5 text-cyan-400"></i>
          <span>Copy Plan</span>
        </button>
        <button onclick="window.print()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition">
          <i data-lucide="printer" class="w-3.5 h-3.5 text-emerald-400"></i>
          <span>Print / Save PDF</span>
        </button>
      </div>
    </div>

    <div class="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200">
      💡 ${seasonTip}
    </div>
    ${familyTipHtml}

    <div class="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      ${dayCardsHtml.join('')}
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function copyItineraryText() {
  const dest = computedDestinations.find(d => d.id === state.selectedDestinationId);
  if (!dest) return;
  const container = document.getElementById('generated-itinerary-container');
  const text = container ? container.innerText : '';
  if (navigator.clipboard && text) {
    navigator.clipboard.writeText(text);
    const btn = document.getElementById('btn-copy-itinerary');
    if (btn) {
      btn.innerHTML = `<span class="text-emerald-400">✓ Copied!</span>`;
      setTimeout(() => {
        btn.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5 text-cyan-400"></i><span>Copy Plan</span>`;
        if (window.lucide) lucide.createIcons();
      }, 2000);
    }
  }
}

// ============================================================================
// DIRECT FLIGHT & HOTEL BOOKING LINKS GENERATOR
// ============================================================================
function getSampleTravelDates() {
  const now = new Date();
  let checkinDate, checkoutDate;

  if (state.startDate && state.endDate) {
    checkinDate = new Date(state.startDate);
    checkoutDate = new Date(state.endDate);
  } else if (state.startDate) {
    checkinDate = new Date(state.startDate);
    checkoutDate = new Date(checkinDate);
    checkoutDate.setDate(checkinDate.getDate() + (state.tripDays || 7));
  } else {
    let year = now.getFullYear();
    if (state.monthIndex < now.getMonth()) {
      year += 1;
    }
    checkinDate = new Date(year, state.monthIndex, 10);
    checkoutDate = new Date(year, state.monthIndex, 10 + (state.tripDays || 7));
  }

  const fmtISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fmtSky = (d) => {
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  };

  const fmtDMY = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return {
    checkinISO: fmtISO(checkinDate),
    checkoutISO: fmtISO(checkoutDate),
    checkinDMY: fmtDMY(checkinDate),
    checkoutDMY: fmtDMY(checkoutDate),
    checkinSky: fmtSky(checkinDate),
    checkoutSky: fmtSky(checkoutDate)
  };
}

function renderDirectBookingLinks(dest) {
  const origin = getOriginHub();
  const dates = getSampleTravelDates();
  const activeTierObj = dest.tierBreakdowns[state.activeModalTier] || dest.primaryTier;
  const cityCountryEncoded = encodeURIComponent(`${dest.city}, ${dest.country}`);
  const cityEncoded = encodeURIComponent(dest.city);
  const rooms = getHotelRoomsCount();
  const currCode = state.currency || 'GBP';

  document.getElementById('booking-links-subtitle').textContent =
    `Direct booking in ${currCode} for ${getTravellersLabel(false)} • Starting from ${origin.city} (${origin.iata}) ✈ ${dest.city} (${dest.iata}) • ${dates.checkinDMY} to ${dates.checkoutDMY} (${state.tripDays} Nights)`;
  document.getElementById('booking-flight-price-pill').textContent =
    `Est. ${formatMoney(dest.flightCostGBP)} (${getTravellersLabel(true)})`;
  document.getElementById('booking-hotel-price-pill').textContent =
    `${activeTierObj.shortLabel}: ${formatMoney(activeTierObj.hotelTotalGBP)}`;

  // 1. Flight Links (Pre-filled with Starting Point, Currency, Adults & Children)
  const skyscannerUrl = `https://www.skyscanner.net/transport/flights/${origin.skyscannerCode}/${dest.iata.toLowerCase()}/${dates.checkinSky}/${dates.checkoutSky}/?adults=${state.adults}&children=${state.children}&currency=${currCode}`;
  const googleFlightsUrl = `https://www.google.com/travel/flights?curr=${currCode}&q=${encodeURIComponent(`Flights from ${origin.iata} to ${dest.iata} on ${dates.checkinISO} through ${dates.checkoutISO} for ${state.adults} adults${state.children > 0 ? ' and ' + state.children + ' children' : ''}`)}`;
  const kayakPaxPath = `${state.adults}adults${state.children > 0 ? '/children-' + Array(state.children).fill('8').join('-') : ''}`;
  const kayakFlightsUrl = `https://www.kayak.co.uk/flights/${origin.iata}-${dest.iata}/${dates.checkinISO}/${dates.checkoutISO}/${kayakPaxPath}?sort=bestflight_a`;
  const expediaFlightsUrl = `https://www.expedia.co.uk/Flights-Search?trip=roundtrip&leg1=from:${origin.city},to:${dest.city},departure:${dates.checkinISO}TANYT&leg2=from:${dest.city},to:${origin.city},departure:${dates.checkoutISO}TANYT&passengers=adults:${state.adults},children:${state.children}&mode=search`;

  const flightPortals = [
    { name: 'Skyscanner', sub: `From ${origin.iata} • ${currCode} (${getTravellersLabel(true)})`, url: skyscannerUrl, badge: 'Popular' },
    { name: 'Google Flights', sub: `From ${origin.iata} • ${currCode} (${getTravellersLabel(true)})`, url: googleFlightsUrl, badge: 'Fast' },
    { name: 'Kayak Flights', sub: `From ${origin.iata} (${getTravellersLabel(true)})`, url: kayakFlightsUrl, badge: 'Deals' },
    { name: 'Expedia Flights', sub: `From ${origin.city} (${getTravellersLabel(true)})`, url: expediaFlightsUrl, badge: 'ATOL' }
  ];

  document.getElementById('modal-flight-links').innerHTML = flightPortals.map(p => `
    <a
      href="${p.url}"
      target="_blank"
      rel="noopener noreferrer"
      class="group p-2.5 rounded-xl bg-slate-950 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/60 transition flex flex-col justify-between gap-1"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-extrabold text-white group-hover:text-cyan-300 flex items-center gap-1">
          <span>${p.name}</span>
        </span>
        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300"></i>
      </div>
      <span class="text-[10px] text-slate-400">${p.sub}</span>
    </a>
  `).join('');

  // 2. Hotel & Airbnb Links (incorporating user's 5★, 4★, 3★, Airbnb preferences + Currency + Adults/Children/Rooms)
  const selectedStars = state.selectedAccommodations
    .filter(id => id !== 'airbnb')
    .map(id => id.replace('star', ''));
  const nfltParam = selectedStars.length > 0
    ? encodeURIComponent(selectedStars.map(s => `class=${s}`).join(';'))
    : encodeURIComponent('class=3;class=4;class=5');

  const bookingComUrl = `https://www.booking.com/searchresults.html?ss=${cityCountryEncoded}&checkin=${dates.checkinISO}&checkout=${dates.checkoutISO}&group_adults=${state.adults}&group_children=${state.children}&no_rooms=${rooms}&selected_currency=${currCode}&nflt=${nfltParam}`;
  const airbnbUrl = `https://www.airbnb.co.uk/s/${cityEncoded}--${encodeURIComponent(dest.country)}/homes?checkin=${dates.checkinISO}&checkout=${dates.checkoutISO}&adults=${state.adults}&children=${state.children}&currency=${currCode}`;
  const hotelsComUrl = `https://uk.hotels.com/Hotel-Search?destination=${cityCountryEncoded}&startDate=${dates.checkinISO}&endDate=${dates.checkoutISO}&adults=${state.adults}${state.children > 0 ? '&children=' + Array(state.children).fill('8').join(',') : ''}`;
  const expediaHotelsUrl = `https://www.expedia.co.uk/Hotel-Search?destination=${cityCountryEncoded}&startDate=${dates.checkinISO}&endDate=${dates.checkoutISO}&adults=${state.adults}${state.children > 0 ? '&children=' + Array(state.children).fill('8').join(',') : ''}`;

  const hotelPortals = [
    { name: 'Booking.com', sub: `${selectedStars.length ? selectedStars.map(s => s + '★').join('/') : '3★–5★'} • ${rooms} Room(s) (${currCode})`, url: bookingComUrl },
    { name: 'Airbnb Stays', sub: `Entire homes • ${currCode} (${getTravellersLabel(true)})`, url: airbnbUrl },
    { name: 'Hotels.com', sub: `Member rates (${getTravellersLabel(true)})`, url: hotelsComUrl },
    { name: 'Expedia Stays', sub: `5★, 4★ & resorts (${getTravellersLabel(true)})`, url: expediaHotelsUrl }
  ];

  document.getElementById('modal-hotel-links').innerHTML = hotelPortals.map(p => `
    <a
      href="${p.url}"
      target="_blank"
      rel="noopener noreferrer"
      class="group p-2.5 rounded-xl bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/60 transition flex flex-col justify-between gap-1"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-extrabold text-white group-hover:text-amber-300">${p.name}</span>
        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300"></i>
      </div>
      <span class="text-[10px] text-slate-400">${p.sub}</span>
    </a>
  `).join('');
}
