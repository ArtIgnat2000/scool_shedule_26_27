/* Персональная страница ученика · v2.0
   student.html            → список учеников
   student.html?id=xxx     → личное расписание: уроки класса + доп. занятия */

(async function () {
  const listCard = document.getElementById("student-list-card");
  const personal = document.getElementById("personal");
  const content = document.getElementById("personal-content");

  let index;
  try {
    index = await loadJSON("data/students/index.json");
  } catch (e) {
    showError(document.getElementById("main"), e.message);
    return;
  }

  const id = getParam("id");
  const meta = index.students.find(s => s.id === id);

  /* ---------- режим списка ---------- */
  if (!meta) {
    listCard.hidden = false;
    const ul = document.getElementById("student-list");
    let registry = { classes: [] };
    try { registry = await loadJSON("data/classes.json"); } catch (e) {}
    const className = cid =>
      (registry.classes.find(c => c.id === cid) || { name: cid }).name;

    index.students.forEach(s => {
      const li = el("li");
      const a = el("a");
      a.href = "student.html?id=" + encodeURIComponent(s.id);
      a.appendChild(el("span", "student-avatar", s.emoji || "🙂"));
      a.appendChild(el("span", null, s.name));
      a.appendChild(el("span", "student-class", className(s.class)));
      a.appendChild(el("span", "chevron", "›"));
      li.appendChild(a);
      ul.appendChild(li);
    });
    return;
  }

  /* ---------- режим личного расписания ---------- */
  personal.hidden = false;

  let student, classData = null, registry = null;
  try {
    student = await loadJSON("data/students/" + meta.id + ".json");
    registry = await loadJSON("data/classes.json");
    const cls = registry.classes.find(c => c.id === student.class);
    if (cls) classData = await loadJSON(cls.file);
  } catch (e) {
    showError(content, e.message);
    return;
  }

  const clsName = classData ? classData.name : student.class;
  document.getElementById("student-title").textContent =
    (student.emoji ? student.emoji + " " : "") + student.name;
  document.getElementById("student-subtitle").textContent =
    "Класс " + clsName + " · уроки, доп. занятия и секции";

  /* сегмент-контрол на все 7 дней */
  const dayBar = document.getElementById("p-day-switch");
  const todayKey = DAYS[(new Date().getDay() + 6) % 7].key;
  let currentDay = todayKey;

  DAYS.forEach(d => {
    const btn = el("button", d.weekend ? "off-day" : null, d.short);
    btn.dataset.key = d.key;
    btn.addEventListener("click", () => { currentDay = d.key; render(); });
    dayBar.appendChild(btn);
  });

  function render() {
    dayBar.querySelectorAll("button").forEach(b =>
      b.classList.toggle("active", b.dataset.key === currentDay));
    const day = DAYS.find(d => d.key === currentDay);
    document.getElementById("p-day-title").textContent =
      day.full + (currentDay === todayKey ? " · сегодня" : "");

    content.innerHTML = "";

    const lessons = classData ? (classData.days || {})[currentDay] || [] : [];
    const acts = (student.activities || {})[currentDay] || [];

    if (lessons.length) {
      content.appendChild(el("div", "day-section-title", "📚 Уроки — " + clsName));
      const ul = el("ul", "lesson-list");
      lessons.forEach(l => ul.appendChild(lessonRow(l)));
      content.appendChild(ul);
    }

    if (acts.length) {
      content.appendChild(el("div", "day-section-title", "⭐ Мои занятия"));
      const ul = el("ul", "lesson-list");
      acts.forEach(a => ul.appendChild(activityRow(a)));
      content.appendChild(ul);
    }

    if (!lessons.length && !acts.length) {
      content.appendChild(el("div", "empty-note", "Свободный день — можно отдыхать! 🎉"));
    }
  }

  render();
})();
