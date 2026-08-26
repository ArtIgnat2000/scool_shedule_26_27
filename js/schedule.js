/* Главная страница: выбор класса + расписание по дням · v2.0 */

(async function () {
  const classBar = document.getElementById("class-switch");
  const dayBar = document.getElementById("day-switch");
  const content = document.getElementById("schedule-content");
  const dayTitle = document.getElementById("day-title");

  let registry, currentClass = null, currentDay = "mon";
  const cache = {};

  try {
    registry = await loadJSON("data/classes.json");
  } catch (e) {
    showError(content, e.message);
    return;
  }

  /* --- выбор класса: ?class= → localStorage → default --- */
  const ids = registry.classes.map(c => c.id);
  let selected = getParam("class");
  if (!ids.includes(selected)) selected = localStorage.getItem("schedule.class");
  if (!ids.includes(selected)) selected = registry.default || ids[0];

  /* --- сегмент-контрол классов --- */
  registry.classes.forEach(cls => {
    const btn = el("button", null, cls.name);
    btn.addEventListener("click", () => selectClass(cls.id));
    btn.dataset.id = cls.id;
    classBar.appendChild(btn);
  });

  /* --- сегмент-контрол дней (Пн–Пт) --- */
  DAYS.slice(0, 5).forEach(d => {
    const btn = el("button", null, d.short);
    btn.dataset.key = d.key;
    btn.addEventListener("click", () => selectDay(d.key));
    dayBar.appendChild(btn);
  });

  async function selectClass(id) {
    currentClass = id;
    localStorage.setItem("schedule.class", id);
    history.replaceState(null, "", "?class=" + id);
    classBar.querySelectorAll("button").forEach(b =>
      b.classList.toggle("active", b.dataset.id === id));
    const meta = registry.classes.find(c => c.id === id);
    document.getElementById("page-subtitle").textContent =
      "Класс " + meta.name + " · учебный год 2026/2027";
    if (!cache[id]) {
      content.innerHTML = '<div class="loading">Загрузка…</div>';
      try {
        cache[id] = await loadJSON(meta.file);
      } catch (e) {
        showError(content, e.message);
        return;
      }
    }
    render();
  }

  function selectDay(key) {
    currentDay = key;
    render();
  }

  function render() {
    dayBar.querySelectorAll("button").forEach(b =>
      b.classList.toggle("active", b.dataset.key === currentDay));
    const day = DAYS.find(d => d.key === currentDay);
    dayTitle.textContent = day.full;

    const lessons = (cache[currentClass].days || {})[currentDay] || [];
    content.innerHTML = "";
    if (!lessons.length) {
      content.appendChild(el("div", "empty-note", "На этот день уроков нет 🎉"));
      return;
    }
    const ul = el("ul", "lesson-list");
    lessons.forEach(l => ul.appendChild(lessonRow(l)));
    content.appendChild(ul);
  }

  await selectClass(selected);
})();
