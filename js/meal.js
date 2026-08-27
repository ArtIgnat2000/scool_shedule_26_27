/* Страница питания · v2.1.0 */

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

  function renderSections() {
    content.innerHTML = "";
    (mealData.sections || []).forEach(sectionData => {
      const section = el("section", "meal-section");
      const heading = el("div", "meal-heading");
      heading.appendChild(el("span", "meal-heading-icon", sectionData.emoji || "🍽️"));
      heading.appendChild(el("h2", null, sectionData.title));
      section.appendChild(heading);

      const list = el("div", "meal-list");
      const matchingRows = (sectionData.rows || [])
        .filter(rowMatches)
        .sort((a, b) => firstTime(a.time) - firstTime(b.time));

      if (!matchingRows.length) return;

      matchingRows.forEach(rowData => {
        const row = el("div", "meal-row" + (rowData.special ? " special" : ""));
        row.appendChild(el("div", "meal-time", rowData.time));
        if (rowData.special) {
          const details = el("div", "meal-classes");
          details.textContent = rowData.label || "Свободный выбор блюд";
          row.appendChild(details);
        }
        list.appendChild(row);
      });
      section.appendChild(list);
      content.appendChild(section);
    });
  }

  function renderInfo() {
    infoBox.innerHTML = "";
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

  renderSections();
  renderInfo();
})();
