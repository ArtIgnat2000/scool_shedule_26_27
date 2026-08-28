/* Страница питания · v2.2.0
   Компактная таблица «приём пищи — время» для выбранного класса.
   Особые позиции (свободный выбор блюд) вынесены вниз, к режиму работы кафе. */

(async function () {
  const content = document.getElementById("meal-content");
  const infoBox = document.getElementById("meal-info");
  const subtitle = document.getElementById("meal-subtitle");

  let mealData, registry;
  try {
    [mealData, registry] = await Promise.all([
      loadJSON("data/meal.json"),
      loadJSON("data/classes.json")
    ]);
  } catch (e) {
    showError(content, e.message);
    return;
  }

  const ids = registry.classes.map(cls => cls.id);
  let selectedId = getParam("class");
  if (!ids.includes(selectedId)) selectedId = readStored("schedule.class");
  if (!ids.includes(selectedId)) selectedId = registry.default || ids[0];
  storeValue("schedule.class", selectedId);

  const selectedClass = registry.classes.find(cls => cls.id === selectedId);
  const className = selectedClass ? selectedClass.name : selectedId;
  const classCode = className.replace(/[«»\s]/g, "");
  subtitle.textContent = className;

  function gradeOf(code) {
    const match = String(code).match(/^\d+/);
    return match ? Number(match[0]) : null;
  }

  function rowMatches(row) {
    if (row.allClasses) return true;
    if (row.grades) {
      const grade = gradeOf(classCode);
      return grade !== null && grade >= row.grades.from && grade <= row.grades.to;
    }
    return (row.classes || []).includes(classCode);
  }

  function firstTime(time) {
    const match = String(time || "").match(/^(\d{1,2})[:.](\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER;
  }

  /* Убираем диапазон классов из названия приёма («Полдник 1–4» → «Полдник»). */
  function cleanTitle(title) {
    return String(title || "").replace(/\s+\d+–\d+$/, "").trim();
  }

  /* Собираем подходящие строки: обычные — в таблицу, особые — вниз к кафе. */
  const meals = [];
  const specials = [];
  (mealData.sections || []).forEach(sectionData => {
    (sectionData.rows || []).filter(rowMatches).forEach(row => {
      if (row.special) specials.push({ section: sectionData, row });
      else meals.push({ section: sectionData, row });
    });
  });
  meals.sort((a, b) => firstTime(a.row.time) - firstTime(b.row.time));

  function renderTable() {
    content.innerHTML = "";

    if (!meals.length) {
      content.appendChild(el("div", "empty-note", "Для этого класса приёмов пищи не найдено"));
      return;
    }

    const table = el("table", "meal-table");
    const thead = el("thead");
    const headRow = el("tr");
    const thName = el("th", null, "Приём пищи");
    const thTime = el("th", null, "Время");
    thName.scope = "col";
    thTime.scope = "col";
    headRow.appendChild(thName);
    headRow.appendChild(thTime);
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el("tbody");
    meals.forEach(({ section, row }) => {
      const tr = el("tr");
      const nameCell = el("td", "meal-name");
      nameCell.appendChild(el("span", "meal-emoji", section.emoji || "🍽️"));
      nameCell.appendChild(el("span", null, cleanTitle(section.title)));
      tr.appendChild(nameCell);
      tr.appendChild(el("td", "meal-time-cell", row.time));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    content.appendChild(table);
  }

  function renderInfo() {
    infoBox.innerHTML = "";

    /* Особые позиции (свободный выбор блюд) — рядом с режимом работы. */
    specials.forEach(({ row }) => {
      const item = el("div", "meal-info-item");
      item.appendChild(el("span", "meal-info-icon", "🍽️"));
      const text = el("div");
      text.appendChild(el("div", "meal-info-label", row.label || "Свободный выбор блюд"));
      text.appendChild(el("div", "meal-info-value", row.time));
      item.appendChild(text);
      infoBox.appendChild(item);
    });

    (mealData.info || []).forEach(info => {
      const item = el("div", "meal-info-item");
      item.appendChild(el("span", "meal-info-icon", info.emoji || "ℹ️"));
      const text = el("div");
      text.appendChild(el("div", "meal-info-label", info.label));
      text.appendChild(el("div", "meal-info-value", info.value));
      item.appendChild(text);
      infoBox.appendChild(item);
    });
  }

  renderTable();
  renderInfo();
})();
