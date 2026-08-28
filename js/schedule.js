/* Главная страница: расписание по дням · v2.2.0
   Уроки класса + личные занятия выбранного ученика (выбор — в настройках). */

(async function () {
  const dayBar = document.getElementById("day-switch");
  const content = document.getElementById("schedule-content");
  const dayTitle = document.getElementById("day-title");
  const statusBox = document.getElementById("today-status");

  let registry, calendarData, studentIndex;
  let currentClass = null;
  let currentSystem = null;
  let studentMeta = null;   // выбранный ученик (из настроек)
  let studentData = null;   // его личные занятия
  const cache = {};
  let todayKey = currentDayKey();

  try {
    [registry, calendarData, studentIndex] = await Promise.all([
      loadJSON("data/classes.json"),
      loadJSON("data/holidays.json"),
      loadJSON("data/students/index.json").catch(() => ({ students: [] }))
    ]);
  } catch (e) {
    showError(content, e.message);
    return;
  }

  currentSystem = getSchoolSystemKey(calendarData);

  function weekdayOrMonday(key) {
    return DAYS.slice(0, 5).some(day => day.key === key) ? key : "mon";
  }

  /* --- класс: адрес → хранилище → по умолчанию --- */
  const ids = registry.classes.map(c => c.id);
  let selected = getParam("class");
  if (!ids.includes(selected)) selected = readStored("schedule.class");
  if (!ids.includes(selected)) selected = registry.default || ids[0];

  /* --- выбранный ученик: ?student= или настройки --- */
  let selectedStudent = getParam("student") || readStored("schedule.student");
  {
    const meta = studentIndex.students.find(s => s.id === selectedStudent);
    /* ученик учитывается, только если он из выбранного класса */
    if (meta && meta.class === selected) studentMeta = meta;
  }

  let currentDay = studentMeta ? todayKey : weekdayOrMonday(todayKey);

  /* Без ученика — Пн–Пт, с учеником — вся неделя (есть занятия на выходных). */
  function renderDayBar() {
    dayBar.innerHTML = "";
    const days = studentMeta ? DAYS : DAYS.slice(0, 5);
    days.forEach(d => {
      const btn = el("button", d.weekend ? "off-day" : null, d.short);
      btn.type = "button";
      btn.dataset.key = d.key;
      btn.addEventListener("click", () => { currentDay = d.key; render(); });
      dayBar.appendChild(btn);
    });
  }

  async function loadStudent() {
    studentData = null;
    if (!studentMeta || studentMeta.class !== currentClass) return;
    try {
      studentData = await loadJSON("data/students/" + studentMeta.id + ".json");
    } catch (e) {
      studentData = null;
    }
  }

  async function selectClass(id) {
    currentClass = id;
    storeValue("schedule.class", id);
    setParam("class", id);
    const meta = registry.classes.find(c => c.id === id);
    const system = getSchoolSystem(calendarData, currentSystem);
    let subtitle = meta.name + " · " + system.label + " · " + calendarData.schoolYear;
    if (studentMeta && studentMeta.class === id) subtitle += " · " + studentMeta.name;
    document.getElementById("page-subtitle").textContent = subtitle;

    if (!cache[id]) {
      content.innerHTML = '<div class="loading">Загрузка…</div>';
      try {
        cache[id] = await loadJSON(meta.file);
      } catch (e) {
        showError(content, e.message);
        return;
      }
    }
    await loadStudent();
    renderTodayStatus();
    render();
  }

  function renderTodayStatus() {
    const today = localISODate();
    const status = getAcademicStatus(calendarData, today, currentSystem);
    const upcoming = nextVacation(calendarData, today, currentSystem);
    let text;

    if (status.type === "before-year") {
      /* До начала года сообщение показывается только на вкладке «Каникулы». */
      statusBox.className = "today-status before-year";
      statusBox.textContent = "";
      statusBox.hidden = true;
      return;
    } else if (status.type === "vacation") {
      text = "Сейчас каникулы · " + status.vacation.name +
        " · до " + formatDateRu(status.vacation.end) + " (включительно)";
    } else if (status.type === "holiday") {
      text = "Сегодня праздник · " + status.holiday.name;
    } else if (status.type === "weekend") {
      text = "Сегодня выходной";
    } else if (status.type === "after-year") {
      text = "Учебный год завершён";
    } else {
      text = status.isLastSchoolDay ?
        "Сегодня последний учебный день" : "Сегодня учебный день";
      if (status.isLastSchoolDay) text += " · " + status.system.label;
    }

    /* Считаются только учебные дни внутри учебного года. */
    if (status.type !== "before-year" && status.type !== "after-year" &&
        status.type !== "vacation" && upcoming.next) {
      const days = schoolDaysBetween(calendarData, today, upcoming.next.start, currentSystem);
      text += days > 0
        ? " · до " + upcoming.next.name + " — " + days + " " +
          pluralRu(days, "учебный день", "учебных дня", "учебных дней")
        : " · ближайшие каникулы начинаются " + formatDateRu(upcoming.next.start);
    }

    statusBox.className = "today-status " + status.type;
    statusBox.textContent = text;
    statusBox.hidden = false;
  }

  function parseTimeRange(time) {
    const match = String(time || "").match(
      /(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/
    );
    if (!match) return null;
    return {
      start: Number(match[1]) * 60 + Number(match[2]),
      end: Number(match[3]) * 60 + Number(match[4])
    };
  }

  function lessonStates(lessons, dayKey) {
    const states = new Map();
    if (dayKey !== todayKey) return states;

    const status = getAcademicStatus(calendarData, localISODate(), currentSystem);
    if (status.type !== "school") return states;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const parsed = lessons.map(lesson => ({ lesson, range: parseTimeRange(lesson.time) }));
    const currentIndex = parsed.findIndex(item =>
      item.range && nowMinutes >= item.range.start && nowMinutes < item.range.end);
    const nextIndex = parsed.findIndex(item => item.range && item.range.start > nowMinutes);

    if (currentIndex >= 0) {
      states.set(parsed[currentIndex].lesson.n, "current");
      if (nextIndex > currentIndex) states.set(parsed[nextIndex].lesson.n, "next");
    } else if (nextIndex >= 0) {
      states.set(parsed[nextIndex].lesson.n, "next");
    }
    return states;
  }

  function render() {
    dayBar.querySelectorAll("button").forEach(b =>
      b.classList.toggle("active", b.dataset.key === currentDay));
    const day = DAYS.find(d => d.key === currentDay);
    dayTitle.textContent = day.full + (currentDay === todayKey ? " · сегодня" : "");

    if (!cache[currentClass]) return;
    content.innerHTML = "";

    const lessons = (cache[currentClass].days || {})[currentDay] || [];
    const states = lessonStates(lessons, currentDay);
    const acts = studentData ? (studentData.activities || {})[currentDay] || [] : [];

    if (lessons.length && acts.length) {
      content.appendChild(el("div", "day-section-title",
        "📚 Уроки — " + cache[currentClass].name));
    }

    if (lessons.length) {
      const ul = el("ul", "lesson-list");
      lessons.forEach(l => ul.appendChild(lessonRow(l, states.get(l.n))));
      content.appendChild(ul);
    }

    if (studentMeta && acts.length) {
      content.appendChild(el("div", "day-section-title",
        "⭐ Личные занятия — " + studentMeta.name));
      const ul = el("ul", "lesson-list");
      acts.forEach(a => ul.appendChild(activityRow(a)));
      content.appendChild(ul);
    }

    if (!lessons.length && !acts.length) {
      content.appendChild(el("div", "empty-note",
        day.weekend ? "Выходной — уроков нет 🎉" : "На этот день уроков нет 🎉"));
    }
  }

  /* Пересчитываем текущий урок раз в минуту; при смене даты
     автоматически переключаемся на новый день. */
  setInterval(() => {
    const freshTodayKey = currentDayKey();
    if (freshTodayKey !== todayKey) {
      todayKey = freshTodayKey;
      currentDay = studentMeta ? freshTodayKey : weekdayOrMonday(freshTodayKey);
    }
    renderTodayStatus();
    render();
  }, 60000);

  renderDayBar();
  await selectClass(selected);
})();
