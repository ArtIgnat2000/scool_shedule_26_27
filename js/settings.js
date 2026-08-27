/* Страница настроек профиля · v2.1.0 */

(async function () {
  const classBar = document.getElementById("class-switch");
  const systemBar = document.getElementById("system-switch");
  const classNote = document.getElementById("class-note");
  const systemNote = document.getElementById("system-note");
  const openSchedule = document.getElementById("open-schedule");

  let registry, calendarData;
  try {
    [registry, calendarData] = await Promise.all([
      loadJSON("data/classes.json"),
      loadJSON("data/holidays.json")
    ]);
  } catch (e) {
    showError(document.querySelector("main"), e.message);
    return;
  }

  const classIds = registry.classes.map(cls => cls.id);
  let currentClass = getParam("class");
  if (!classIds.includes(currentClass)) currentClass = readStored("schedule.class");
  if (!classIds.includes(currentClass)) currentClass = registry.default || classIds[0];
  let currentSystem = getSchoolSystemKey(calendarData);

  function render() {
    classBar.innerHTML = "";
    registry.classes.forEach(cls => {
      const btn = el("button", null, cls.name);
      btn.type = "button";
      btn.dataset.id = cls.id;
      btn.addEventListener("click", () => {
        currentClass = cls.id;
        storeValue("schedule.class", currentClass);
        setParam("class", currentClass);
        render();
      });
      classBar.appendChild(btn);
    });
    classBar.querySelectorAll("button").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.id === currentClass));

    systemBar.innerHTML = "";
    Object.entries(calendarData.systems || { quarters: { name: "По четвертям" } }).forEach(([key, system]) => {
      const btn = el("button", null, system.name || SCHOOL_SYSTEM_LABELS[key] || key);
      btn.type = "button";
      btn.dataset.key = key;
      btn.addEventListener("click", () => {
        currentSystem = key;
        storeValue("schedule.system", currentSystem);
        setParam("system", currentSystem);
        render();
      });
      systemBar.appendChild(btn);
    });
    systemBar.querySelectorAll("button").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.key === currentSystem));

    const selectedClass = registry.classes.find(cls => cls.id === currentClass);
    const system = getSchoolSystem(calendarData, currentSystem);
    classNote.textContent = "Сейчас выбрано: " + selectedClass.name;
    systemNote.textContent = "Последний учебный день: " + formatDateRu(system.lastSchoolDay) +
      (system.note ? " · " + system.note : "");
    openSchedule.href = "index.html?class=" + encodeURIComponent(currentClass) +
      "&system=" + encodeURIComponent(currentSystem);
  }

  render();
})();
