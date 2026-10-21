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
        `<option value="${hub.id}" ${hub.id === state.originHubId ? 'selected' : ''}>${hub.flag} ${hub.name}</option>`
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
      return `<option value="${code}" ${code === state.currency ? 'selected' : ''}>${c.flag || ''} ${c.name}</option>`;
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

function setQuickStartDate(preset) {
  const today = new Date();
  let start = new Date(today);

  if (preset === 'today') {
    start = new Date(today);
  } else if (preset === 'next-weekend') {
    // Next Saturday
    const day = today.getDay();
    const daysUntilSat = (6 - day + 7) % 7 || 7;
    start.setDate(today.getDate() + daysUntilSat);
  } else if (preset === 'first-of-month') {
    // 1st of the currently selected month
    let year = today.getFullYear();
    if (state.monthIndex < today.getMonth()) {
      year += 1;
    }
    start = new Date(year, state.monthIndex, 1);
  }

  handleStartDateChange(formatDateISO(start));
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

  const storageKey = 'dutta_planner_visitor_logged';
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
      // Local fallback simulation with persistent localStorage
      const localKey = 'dutta_local_visitor_count';
      let count = parseInt(localStorage.getItem(localKey) || '1', 10);
      count += 1;
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
  if (adultsEl) adultsEl.textContent = state.adults;
  if (childrenEl) childrenEl.textContent = state.children;
  if (travBadge) travBadge.textContent = `${travLabel} • ${rooms} Room${rooms > 1 ? 's' : ''}`;

  const dateRangeBadge = document.getElementById('date-range-summary-badge');
  if (dateRangeBadge) {
    if (state.endDate) {
      dateRangeBadge.textContent = `Returns: ${state.endDate}`;
    } else {
      dateRangeBadge.textContent = `${state.tripDays} Days`;
    }
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
      .arcDashLength(0.45)
      .arcDashGap(0.25)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(2200)
      .arcStroke(0.55)
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
    wrapper.innerHTML = `
      <div class="globe-pin-origin">
        🛫 ${d.flag} ${d.city} (${d.iata})
      </div>
    `;
    return wrapper;
  }

  const isSelected = state.selectedDestinationId === d.id;
  const tier = d.primaryTier;
  const seasonLabel = d.isOnPeak ? 'On-Peak' : 'Off-Peak';
  const seasonBadgeColor = d.isOnPeak ? 'text-amber-300' : 'text-emerald-300';

  wrapper.innerHTML = `
    <div class="globe-pin-card ${isSelected ? 'pin-selected' : ''} ${!d.matchesBudget ? 'pin-over-budget' : ''}">
      <div class="flex items-center justify-between gap-2 text-[11px] font-extrabold leading-tight">
        <span class="truncate max-w-[125px]">${d.flag} ${d.city.split('(')[0].split('&')[0].trim()}</span>
        <span class="font-mono text-amber-300">${formatTemp(d.tempC)}</span>
      </div>
      <div class="flex items-center justify-between gap-1.5 text-[10px] font-mono leading-tight">
        <span class="text-slate-400">${tier.shortLabel}</span>
        <span class="font-extrabold ${d.matchesBudget ? 'text-emerald-400' : 'text-amber-400'}">${formatMoney(tier.combinedTotalGBP)}</span>
      </div>
      <div class="globe-pin-details flex-col gap-1 pt-1 mt-0.5 border-t border-slate-700/70">
        <div class="flex items-center justify-between gap-1.5 text-[10px] font-mono text-slate-200 leading-tight">
          <span>✈️ ${formatMoney(d.flightCostGBP)}</span>
          <span>+</span>
          <span>🏨 ${formatMoney(tier.hotelTotalGBP)}</span>
        </div>
        <div class="flex items-center justify-between gap-1 text-[9px] leading-tight">
          <span class="font-bold ${seasonBadgeColor}">${seasonLabel}</span>
          <span class="text-cyan-300">Click for Itinerary →</span>
        </div>
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
    color: d.matchesBudget
      ? ['rgba(56, 189, 248, 0.75)', 'rgba(16, 185, 129, 0.95)']
      : ['rgba(56, 189, 248, 0.55)', 'rgba(245, 158, 11, 0.85)']
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

// ============================================================================
// RIGHT SIDEBAR: MATCHING DESTINATIONS LIST & ACCOMMODATION BREAKDOWN
// ============================================================================
function renderMatchingDestinationsList() {
  const listEl = document.getElementById('matching-destinations-list');
  const countHeading = document.getElementById('matches-count-heading');
  const subtitle = document.getElementById('matches-subtitle');
  const sortMode = (document.getElementById('sort-select') || {}).value || 'total_asc';
  const searchQuery = ((document.getElementById('dest-search-input') || {}).value || '').trim().toLowerCase();

  let matches = computedDestinations.filter(d => d.isLitUp);

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

  const monthName = MONTHS_META[state.monthIndex].full;
  countHeading.textContent = `${matches.length} Locations Lit Up on Globe`;
  subtitle.textContent = `${monthName} • ${state.tripDays} Days • ${getTravellersLabel(false)}`;

  if (matches.length === 0) {
    listEl.innerHTML = `
      <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-5 text-center space-y-3 my-4">
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

  listEl.innerHTML = matches.map(d => {
    const tier = d.primaryTier;
    const seasonBadge = d.isOnPeak
      ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">On-Peak</span>`
      : `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Off-Peak</span>`;

    // Show mini pills for all user-selected accommodation tiers
    const allSelectedTiersPills = d.selectedTierObjs.map(t => {
      const fits = t.withinBudget;
      return `
        <div class="px-2 py-1 rounded-lg bg-slate-900 border ${fits ? 'border-slate-800 text-slate-200' : 'border-amber-500/30 text-amber-300/80'} flex items-center justify-between text-[10px]">
          <span class="font-semibold">${t.shortLabel}</span>
          <span class="font-mono font-bold ${fits ? 'text-emerald-300' : 'text-amber-300'}">${formatMoney(t.combinedTotalGBP)}</span>
        </div>
      `;
    }).join('');

    return `
      <div
        onclick="openDestinationModal('${d.id}')"
        class="group bg-slate-950/85 hover:bg-slate-900 border ${
          d.matchesBudget ? 'border-slate-800 hover:border-emerald-500/60' : 'border-amber-500/30 hover:border-amber-400'
        } rounded-xl p-3 cursor-pointer transition-all shadow-sm hover:shadow-lg space-y-2.5"
      >
        <!-- Top Row: City, Country, Season & Temp -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xl leading-none flex-shrink-0">${d.flag}</span>
            <div class="min-w-0">
              <h3 class="text-xs font-extrabold text-white group-hover:text-cyan-300 transition truncate">${d.city}</h3>
              <p class="text-[10px] text-slate-400 truncate">${d.country} • ${d.iata} (${d.estFlightHours}h flight)</p>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            ${seasonBadge}
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              🌡️ ${formatTemp(d.tempC)}
            </span>
          </div>
        </div>

        <!-- Middle Row: Expected Flying Cost + Hotel Cost Highlight -->
        <div class="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2 flex items-center justify-between text-xs">
          <div class="space-y-0.5">
            <div class="text-[10px] text-slate-400">Flights (${getTravellersLabel(true)}) + ${state.tripDays}d ${tier.shortLabel}</div>
            <div class="font-mono text-[11px] text-slate-200">
              <span class="text-cyan-300 font-semibold">✈️ ${formatMoney(d.flightCostGBP)}</span>
              <span class="text-slate-500 mx-1">+</span>
              <span class="text-amber-300 font-semibold">🏨 ${formatMoney(tier.hotelTotalGBP)}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[9px] uppercase font-mono ${d.matchesBudget ? 'text-emerald-400' : 'text-amber-400'}">
              ${d.matchesBudget ? 'Within Budget' : 'Above Budget'}
            </div>
            <div class="text-sm font-mono font-extrabold ${d.matchesBudget ? 'text-emerald-300' : 'text-amber-300'}">
              ${formatMoney(tier.combinedTotalGBP)}
            </div>
          </div>
        </div>

        <!-- Selected Accommodation Tiers Comparison Grid -->
        <div class="grid grid-cols-2 gap-1">
          ${allSelectedTiersPills}
        </div>

        <!-- Bottom Action Bar -->
        <div class="flex items-center justify-between pt-0.5 text-[10px] text-cyan-400 font-semibold">
          <span class="flex items-center gap-1">
            <span>✨ Click for AI Itinerary &amp; Booking Links</span>
          </span>
          <span class="group-hover:translate-x-0.5 transition-transform">→</span>
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

function selectModalAccommodationTier(tierId) {
  state.activeModalTier = tierId;
  const dest = computedDestinations.find(d => d.id === state.selectedDestinationId);
  if (!dest) return;
  renderDestinationModalContent(dest);
  if (state.itineraryVisible) {
    generateDestinationItinerary();
  }
}

function renderDestinationModalContent(dest) {
  const origin = getOriginHub();
  const monthMeta = MONTHS_META[state.monthIndex];

  document.getElementById('modal-flag').textContent = dest.flag;
  document.getElementById('modal-city-title').textContent = `${dest.city}, ${dest.country}`;
  document.getElementById('modal-tagline').textContent = dest.tagline;
  document.getElementById('modal-temp-badge').textContent = `🌡️ ${formatTemp(dest.tempC)} in ${monthMeta.short} (${dest.sunHours}h Sun/day)`;

  const seasonBadge = document.getElementById('modal-season-badge');
  if (dest.isOnPeak) {
    seasonBadge.textContent = '🔥 On-Peak Season';
    seasonBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40';
  } else {
    seasonBadge.textContent = '💎 Off-Peak Value Season';
    seasonBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
  }

  document.getElementById('modal-vibe-tags').innerHTML = dest.vibeTags.map(tag =>
    `<span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">${tag}</span>`
  ).join('');

  document.getElementById('modal-cost-heading').textContent =
    `Expected Flying + Hotel Cost (${state.tripDays} Days • ${getTravellersLabel(false)} in ${monthMeta.full})`;
  document.getElementById('modal-route-meta').textContent =
    `${origin.city} (${origin.iata}) ✈ ${dest.city} (${dest.iata}) • ~${dest.estFlightHours}h Flight • ${getHotelRoomsCount()} Room(s)`;

  // Render all 4 Accommodation Tiers (highlighting the ones the user checked + allowing click to switch)
  const cardsContainer = document.getElementById('modal-accommodation-cards');
  cardsContainer.innerHTML = ACCOMMODATION_TIERS.map(tierMeta => {
    const t = dest.tierBreakdowns[tierMeta.id];
    const isUserChecked = state.selectedAccommodations.includes(tierMeta.id);
    const isActive = state.activeModalTier === tierMeta.id;
    const budgetDiff = state.budgetGBP - t.combinedTotalGBP;
    const stayRoomLabel = tierMeta.id === 'airbnb'
      ? 'Entire Rental'
      : `${t.roomsNeeded} Room${t.roomsNeeded > 1 ? 's' : ''}`;

    return `
      <div
        onclick="selectModalAccommodationTier('${tierMeta.id}')"
        class="p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
          isActive
            ? 'bg-slate-800/95 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg'
            : isUserChecked
              ? 'bg-slate-950/90 border-slate-700 hover:border-slate-500'
              : 'bg-slate-950/40 border-slate-800/60 opacity-65 hover:opacity-100'
        }"
      >
        <div>
          <div class="flex items-center justify-between gap-1 mb-1.5">
            <span class="text-xs font-extrabold text-white">${tierMeta.label}</span>
            ${isActive
              ? `<span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-extrabold">Viewing Basis</span>`
              : isUserChecked
                ? `<span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Selected</span>`
                : ''
            }
          </div>
          <div class="bg-slate-900/90 border border-slate-800 rounded-lg p-2 mb-2.5">
            <div class="text-[9px] uppercase font-mono tracking-wider text-amber-300/90 font-bold mb-0.5">
              🏨 Identified Reference Stay:
            </div>
            <p class="text-[11px] font-semibold text-white leading-snug line-clamp-2" title="${t.exampleProperty}">
              ${t.exampleProperty}
            </p>
            <div class="text-[10px] font-mono text-emerald-300 mt-1">
              ${formatMoney(t.nightlyGBP)}/night × ${state.tripDays} nights
            </div>
          </div>
        </div>

        <div class="space-y-1 pt-2 border-t border-slate-800 text-xs font-mono">
          <div class="flex justify-between text-[11px] text-slate-300">
            <span>✈️ Flights (${getTravellersLabel(true)}):</span>
            <span class="text-cyan-300 font-semibold">${formatMoney(t.flightCostGBP)}</span>
          </div>
          <div class="flex justify-between text-[11px] text-slate-300">
            <span>🏨 ${state.tripDays}n (${stayRoomLabel}):</span>
            <span class="text-amber-300 font-semibold">${formatMoney(t.hotelTotalGBP)}</span>
          </div>
          <div class="flex justify-between items-baseline pt-1.5 border-t border-slate-800/80">
            <span class="text-[11px] font-sans font-bold text-white">Total (${getTravellersLabel(true)}):</span>
            <span class="text-base font-extrabold ${t.withinBudget ? 'text-emerald-400' : 'text-amber-400'}">${formatMoney(t.combinedTotalGBP)}</span>
          </div>
          <div class="flex items-center justify-between text-[10px] font-sans">
            <span class="text-slate-400">~${formatMoney(t.perPersonGBP)}/person</span>
            <span class="font-semibold ${t.withinBudget ? 'text-emerald-400' : 'text-amber-400'}">
              ${t.withinBudget ? `✅ -${formatMoney(budgetDiff)}` : `⚠️ +${formatMoney(Math.abs(budgetDiff))}`}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Render Identified Reference Hotel & Flight Price Basis Panel for Active Tier
  const basisPanel = document.getElementById('modal-price-basis-panel');
  if (basisPanel) {
    const activeTier = dest.tierBreakdowns[state.activeModalTier] || dest.primaryTier;
    const dates = getSampleTravelDates();
    const currCode = state.currency || 'GBP';
    const primaryHotelName = (activeTier.exampleProperty || dest.city).split('/')[0].trim();
    const hotelCleanQuery = `${primaryHotelName}, ${dest.city}`;
    const hotelQueryEncoded = encodeURIComponent(hotelCleanQuery);

    // Google Hotels metasearch direct property search (reliably opens hotel overview, photos, reviews & rate comparisons)
    const googleHotelsUrl = `https://www.google.com/travel/hotels?q=${encodeURIComponent(`${primaryHotelName} ${dest.city}`)}`;

    // Booking.com destination search with dates and occupancy
    const bookingHotelUrl = activeTier.tierId === 'airbnb'
      ? `https://www.airbnb.co.uk/s/${encodeURIComponent(dest.city)}--${encodeURIComponent(dest.country)}/homes?checkin=${dates.checkinISO}&checkout=${dates.checkoutISO}&adults=${state.adults}&children=${state.children}&currency=${currCode}`
      : `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.city + ', ' + dest.country)}&checkin=${dates.checkinISO}&checkout=${dates.checkoutISO}&group_adults=${state.adults}&group_children=${state.children}&no_rooms=${activeTier.roomsNeeded}&selected_currency=${currCode}`;

    // Tripadvisor direct hotel search
    const tripadvisorUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${primaryHotelName} ${dest.city}`)}&ssrc=h`;

    // Direct property rates link uses Google Hotels metasearch which displays the exact property card, photos, and comparison prices across all providers
    const specificHotelBookingUrl = activeTier.tierId === 'airbnb'
      ? `https://www.airbnb.co.uk/s/${encodeURIComponent(dest.city)}--${encodeURIComponent(dest.country)}/homes?checkin=${dates.checkinISO}&checkout=${dates.checkoutISO}&adults=${state.adults}&children=${state.children}&currency=${currCode}`
      : googleHotelsUrl;

    const secondaryHotelUrl = activeTier.tierId === 'airbnb'
      ? `https://www.google.com/travel/hotels?q=${encodeURIComponent(`vacation rentals ${dest.city}`)}`
      : bookingHotelUrl;
    const skyscannerFlightUrl = `https://www.skyscanner.net/transport/flights/${origin.skyscannerCode}/${dest.iata.toLowerCase()}/${dates.checkinSky}/${dates.checkoutSky}/?adults=${state.adults}&children=${state.children}&currency=${currCode}`;

    const hotelSeasonText = dest.isOnPeak
      ? `On-Peak Month (+15% peak demand adjustment in ${monthMeta.full})`
      : `Off-Peak Value Month (-15% off-peak discount in ${monthMeta.full})`;
    const flightSeasonText = dest.isOnPeak
      ? `On-Peak Month (+14% seasonal airfare adjustment in ${monthMeta.full})`
      : `Off-Peak Value Month (-12% off-peak airfare saver in ${monthMeta.full})`;
    const roomBasisText = activeTier.tierId === 'airbnb'
      ? `Entire Home / Apartment for ${getTravellersLabel(false)}`
      : `${activeTier.roomsNeeded} Room${activeTier.roomsNeeded > 1 ? 's' : ''} for ${getTravellersLabel(false)}`;

    basisPanel.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            Price Transparency Basis
          </span>
          <h4 class="text-xs sm:text-sm font-extrabold text-white">
            How Your ${formatMoney(activeTier.combinedTotalGBP)} Total (${activeTier.label}) Was Identified
          </h4>
        </div>
        <span class="text-[11px] font-mono text-emerald-300 font-bold">
          All amounts in ${currCode} • ${state.tripDays} Nights (${dates.checkinISO} → ${dates.checkoutISO})
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <!-- 1. Hotel Basis Card -->
        <div class="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <i data-lucide="hotel" class="w-4 h-4"></i>
                <span>1. Identified Accommodation Basis (${activeTier.shortLabel})</span>
              </span>
              <span class="font-mono text-xs font-extrabold text-amber-300">${formatMoney(activeTier.hotelTotalGBP)}</span>
            </div>

            <div class="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 space-y-1">
              <div class="text-[10px] text-slate-400 uppercase font-mono">Benchmark Reference Hotel / Property:</div>
              <div class="text-xs font-extrabold text-white">${activeTier.exampleProperty}</div>
            </div>

            <div class="space-y-1 text-[11px] font-mono text-slate-300 pt-1">
              <div class="flex justify-between">
                <span class="text-slate-400">• Standard Base Rate (1 Room/Night):</span>
                <span class="text-white font-semibold">${formatMoney(activeTier.baseNightlyGBP)}/night</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">• Seasonality (${monthMeta.short}):</span>
                <span class="${dest.isOnPeak ? 'text-amber-300' : 'text-emerald-300'}">${hotelSeasonText}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">• Party &amp; Room Allocation:</span>
                <span class="text-white">${roomBasisText}</span>
              </div>
              <div class="flex justify-between pt-1 border-t border-slate-800 text-amber-300 font-bold">
                <span>• Identified Nightly Stay Cost × ${state.tripDays} Nights:</span>
                <span>${formatMoney(activeTier.nightlyGBP)} × ${state.tripDays}n = ${formatMoney(activeTier.hotelTotalGBP)}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="${specificHotelBookingUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
              title="Open Google Hotels live rates and details for ${primaryHotelName}"
            >
              <i data-lucide="building" class="w-3 h-3 text-amber-400"></i>
              <span>View "${primaryHotelName}" Rates</span>
              <i data-lucide="external-link" class="w-3 h-3"></i>
            </a>
            <a
              href="${tripadvisorUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition"
              title="View reviews and photos on Tripadvisor"
            >
              <span>Tripadvisor</span>
              <i data-lucide="arrow-up-right" class="w-3 h-3 text-emerald-400"></i>
            </a>
            <a
              href="${secondaryHotelUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition"
              title="Explore all hotels on Booking.com"
            >
              <span>Booking.com</span>
              <i data-lucide="arrow-up-right" class="w-3 h-3 text-slate-400"></i>
            </a>
          </div>
        </div>

        <!-- 2. Flight Basis Card -->
        <div class="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                <i data-lucide="plane" class="w-4 h-4"></i>
                <span>2. Identified Return Flight Basis (${origin.iata} ✈ ${dest.iata})</span>
              </span>
              <span class="font-mono text-xs font-extrabold text-cyan-300">${formatMoney(dest.flightCostGBP)}</span>
            </div>

            <div class="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 space-y-1">
              <div class="text-[10px] text-slate-400 uppercase font-mono">Corridor &amp; Distance Basis:</div>
              <div class="text-xs font-extrabold text-white">
                ${origin.flag} ${origin.city} (${origin.iata}) ⇄ ${dest.flag} ${dest.city} (${dest.iata}) • ${dest.distanceKm.toLocaleString()} km (~${dest.estFlightHours}h)
              </div>
            </div>

            <div class="space-y-1 text-[11px] font-mono text-slate-300 pt-1">
              <div class="flex justify-between">
                <span class="text-slate-400">• Route Baseline Return Fare (1 Adult):</span>
                <span class="text-white font-semibold">${formatMoney(dest.rawFlightGBP)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">• Seasonality (${monthMeta.short}):</span>
                <span class="${dest.isOnPeak ? 'text-amber-300' : 'text-emerald-300'}">${flightSeasonText}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">• Adult Return Fare (${state.adults} Adult${state.adults > 1 ? 's' : ''}):</span>
                <span class="text-white">${state.adults} × ${formatMoney(dest.singleAdultFlightGBP)} = ${formatMoney(state.adults * dest.singleAdultFlightGBP)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">• Child Return Fare (25% off, ${state.children} Child${state.children !== 1 ? 'ren' : ''}):</span>
                <span class="text-pink-300">${state.children > 0 ? `${state.children} × ${formatMoney(dest.singleChildFlightGBP)} = ${formatMoney(state.children * dest.singleChildFlightGBP)}` : `${formatMoney(dest.singleChildFlightGBP)}/child (0 selected)`}</span>
              </div>
              <div class="flex justify-between pt-1 border-t border-slate-800 text-cyan-300 font-bold">
                <span>• Total Return Flights (${getTravellersLabel(true)}):</span>
                <span>${formatMoney(dest.flightCostGBP)}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="${skyscannerFlightUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>Verify ${origin.iata} ⇄ ${dest.iata} Fares on Skyscanner</span>
              <i data-lucide="external-link" class="w-3 h-3"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }

  // Update Itinerary Prompt Question
  document.getElementById('itinerary-prompt-question').textContent =
    `Would you like the tool to create a custom ${state.tripDays}-Day Itinerary for ${dest.city} (${getTravellersLabel(false)})?`;
  document.getElementById('itinerary-prompt-month').textContent =
    `${monthMeta.full} (${formatTemp(dest.tempC)}, ${dest.isOnPeak ? 'On-Peak' : 'Off-Peak'})`;

  if (!state.itineraryVisible) {
    document.getElementById('generated-itinerary-container').classList.add('hidden');
  }

  // Render Direct Flight & Hotel Booking Links
  renderDirectBookingLinks(dest);

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

  return {
    checkinISO: fmtISO(checkinDate),
    checkoutISO: fmtISO(checkoutDate),
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
    `Direct booking in ${currCode} for ${getTravellersLabel(false)} • Starting from ${origin.city} (${origin.iata}) ✈ ${dest.city} (${dest.iata}) • ${dates.checkinISO} to ${dates.checkoutISO} (${state.tripDays} Nights)`;
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
