import { ref, computed } from 'vue';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function getCurrentDateParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function getDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

const { year: initialYear, month: initialMonth } = getCurrentDateParts();
const year = ref(initialYear);
const month = ref(initialMonth);
let syncedDateKey = getDateKey();
let userPickedMonth = false;

function syncToTodayIfNeeded() {
  if (userPickedMonth) return;
  const key = getDateKey();
  if (key === syncedDateKey) return;
  const { year: y, month: m } = getCurrentDateParts();
  year.value = y;
  month.value = m;
  syncedDateKey = key;
}

export function useMonthFilter() {
  syncToTodayIfNeeded();

  const label = computed(() => {
    const { year: todayYear, month: todayMonth } = getCurrentDateParts();
    const cap = MONTH_NAMES[month.value - 1];
    const isCurrent = year.value === todayYear && month.value === todayMonth;
    return isCurrent ? `${cap} (текущий месяц)` : `${cap} ${year.value}`;
  });

  function params() {
    return { year: year.value, month: month.value };
  }

  function goToCurrentMonth() {
    userPickedMonth = false;
    const { year: y, month: m } = getCurrentDateParts();
    year.value = y;
    month.value = m;
    syncedDateKey = getDateKey();
  }

  function prev() {
    userPickedMonth = true;
    if (month.value === 1) {
      month.value = 12;
      year.value -= 1;
    } else {
      month.value -= 1;
    }
  }

  function next() {
    userPickedMonth = true;
    if (month.value === 12) {
      month.value = 1;
      year.value += 1;
    } else {
      month.value += 1;
    }
  }

  return { year, month, label, params, prev, next, goToCurrentMonth };
}

export function syncMonthFilterToToday() {
  syncToTodayIfNeeded();
}
