/* Календарь каникул: генерация месяцев учебного года · v2.0 */

(async function () {
  const summaryBox = document.getElementById("vac-summary");
  const monthsBox = document.getElementById("months");

  let data;
  try {
    data = await loadJSON("data/holidays.json");
  } catch (e) {
    showError(monthsBox, e.message);
    return;
  }

  const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
                       "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const iso = d => d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");

  const holidaySet = new Map();
  (data.publicHolidays || []).forEach(h => holidaySet.set(h.date, h.name));
  const specialSet = new Map();
  (data.specialDays || []).forEach(s => specialSet.set(s.date, s.name));

  function vacationOf(dateStr) {
    return (data.vacations || []).find(v => dateStr >= v.start && dateStr <= v.end) || null;
  }

  const todayStr = iso(new Date());

  /* --- сводка каникул --- */
  const fmt = ds => {
    const [y, m, d] = ds.split("-").map(Number);
    return d + " " + ["янв", "фев", "мар", "апр", "мая", "июн",
      "июл", "авг", "сен", "окт", "ноя", "дек"][m - 1] + " " + y;
  };

  (data.vacations || []).forEach(v => {
    const item = el("button", "vac-item" + (v.optional ? " optional" : ""));
    item.type = "button";
    item.dataset.start = v.start;
    item.dataset.end = v.end;
    item.setAttribute("aria-label", "Показать период: " + v.name);
    item.addEventListener("click", () => focusVacation(v));

    item.appendChild(el("span", "v-emoji", v.emoji || "🌴"));
    const txt = el("div");
    const name = el("div", "v-name");
    name.textContent = v.name;
    txt.appendChild(name);
    const dates = el("div", "v-dates");
    dates.textContent = v.start === v.end ? fmt(v.start) : fmt(v.start) + " — " + fmt(v.end);
    txt.appendChild(dates);
    item.appendChild(txt);
    summaryBox.appendChild(item);
  });

  /* --- месяцы учебного года --- */
  const [sy, sm] = data.yearStart.split("-").map(Number);
  const [ey, em] = data.yearEnd.split("-").map(Number);

  let y = sy, m = sm - 1; // month 0-based
  while (y < ey || (y === ey && m <= em - 1)) {
    monthsBox.appendChild(renderMonth(y, m));
    m++;
    if (m > 11) { m = 0; y++; }
  }

  let focusTimer = null;

  function focusVacation(v) {
    if (focusTimer) clearTimeout(focusTimer);
    document.querySelectorAll(".period-focus").forEach(node => node.classList.remove("period-focus"));

    const month = document.getElementById("month-" + v.start.slice(0, 7));
    if (!month) return;

    const cells = Array.from(document.querySelectorAll(".cal-day[data-date]")).filter(cell => {
      const ds = cell.dataset.date;
      return ds >= v.start && ds <= v.end;
    });

    month.classList.add("period-focus");
    cells.forEach(cell => cell.classList.add("period-focus"));
    if (typeof month.scrollIntoView === "function") {
      month.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    focusTimer = setTimeout(() => {
      month.classList.remove("period-focus");
      cells.forEach(cell => cell.classList.remove("period-focus"));
      focusTimer = null;
    }, 3200);
  }

  function renderMonth(year, month) {
    const wrap = el("div", "cal-month");
    wrap.id = "month-" + year + "-" + String(month + 1).padStart(2, "0");
    wrap.dataset.month = year + "-" + String(month + 1).padStart(2, "0");
    wrap.appendChild(el("h3", null, MONTH_NAMES[month] + " " + year));

    const grid = el("div", "cal-grid");
    DOW.forEach((d, i) =>
      grid.appendChild(el("div", "cal-dow" + (i >= 5 ? " we" : ""), d)));

    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDow; i++) grid.appendChild(el("div", "cal-day blank"));

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const ds = iso(date);
      const dow = (date.getDay() + 6) % 7;

      const cell = el("div", "cal-day", String(d));
      cell.dataset.date = ds;
      const titles = [];

      const vac = vacationOf(ds);
      if (vac) { cell.classList.add("vac"); titles.push(vac.name); }

      if (dow >= 5) { cell.classList.add("off"); }
      if (holidaySet.has(ds)) { cell.classList.add("off"); titles.push(holidaySet.get(ds)); }

      if (specialSet.has(ds)) { cell.classList.add("special"); titles.push(specialSet.get(ds)); }
      if (ds === todayStr) { cell.classList.add("today"); titles.push("Сегодня"); }

      if (titles.length) cell.title = titles.join(" · ");
      grid.appendChild(cell);
    }

    wrap.appendChild(grid);
    return wrap;
  }
})();
