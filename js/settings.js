/* Страница настроек профиля · v2.2.0
   Класс + ученик + система обучения. Выбор ученика переехал сюда
   со страницы «Моё» (которая удалена). */

(async function () {
  const classBar = document.getElementById("class-switch");
  const systemBar = document.getElementById("system-switch");
  const studentBar = document.getElementById("student-switch");
  const classNote = document.getElementById("class-note");
  const systemNote = document.getElementById("system-note");
  const studentNote = document.getElementById("student-note");
  const studentReset = document.getElementById("student-reset");
  const openSchedule = document.getElementById("open-schedule");

  let registry, calendarData, studentIndex;
  try {
    [registry, calendarData, studentIndex] = await Promise.all([
      loadJSON("data/classes.json"),
      loadJSON("data/holidays.json"),
      loadJSON("data/students/index.json").catch(() => ({ students: [] }))
    ]);
  } catch (e) {
    showError(document.querySelector("main"), e.message);
    return;
  }

  const studentById = id => studentIndex.students.find(s => s.id === id);

  const classIds = registry.classes.map(cls => cls.id);
  let currentClass = getParam("class");
  if (!classIds.includes(currentClass)) currentClass = readStored("schedule.class");
  if (!classIds.includes(currentClass)) currentClass = registry.default || classIds[0];
  let currentSystem = getSchoolSystemKey(calendarData);

  /* Выбранный ученик: из адреса (?student=) или из хранилища.
     Если он из другого класса — подстраиваем класс под него. */
  let currentStudent = getParam("student") || readStored("schedule.student");
  if (!studentById(currentStudent)) currentStudent = null;
  if (currentStudent && studentById(currentStudent).class !== currentClass) {
    currentClass = studentById(currentStudent).class;
  }

  function renderStudents() {
    studentBar.innerHTML = "";
    const ofClass = studentIndex.students.filter(s => s.class === currentClass);

    /* вариант «без ученика» */
    const noneBtn = el("button", "student-option none" + (!currentStudent ? " active" : ""));
    noneBtn.type = "button";
    noneBtn.innerHTML =
      '<span class="student-avatar">👥</span>' +
      '<span class="student-name">Только уроки класса</span>' +
      '<span class="student-check"></span>';
    noneBtn.addEventListener("click", () => {
      currentStudent = null;
      storeValue("schedule.student", "");
      render();
    });
    studentBar.appendChild(noneBtn);

    ofClass.forEach(s => {
      const btn = el("button", "student-option" + (s.id === currentStudent ? " active" : ""));
      btn.type = "button";
      btn.innerHTML =
        '<span class="student-avatar">' + (s.emoji || "🙂") + "</span>" +
        '<span class="student-name">' + s.name + "</span>" +
        '<span class="student-check">✓</span>';
      btn.addEventListener("click", () => {
        currentStudent = s.id;
        storeValue("schedule.student", s.id);
        render();
      });
      studentBar.appendChild(btn);
    });

    studentReset.hidden = !currentStudent;

    if (currentStudent) {
      const s = studentById(currentStudent);
      studentNote.textContent = "Выбран ученик: " + s.name +
        " — личные занятия появятся на странице «Уроки».";
    } else if (ofClass.length) {
      studentNote.textContent =
        "Ученик не выбран. Выберите, чтобы видеть личные занятия вместе с уроками.";
    } else {
      studentNote.textContent = "В этом классе пока нет учеников.";
    }
  }

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
        /* если выбранный ученик не из этого класса — снимаем выбор */
        if (currentStudent && studentById(currentStudent).class !== currentClass) {
          currentStudent = null;
          storeValue("schedule.student", "");
        }
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

    renderStudents();

    const selectedClass = registry.classes.find(cls => cls.id === currentClass);
    const system = getSchoolSystem(calendarData, currentSystem);
    classNote.textContent = "Сейчас выбрано: " + selectedClass.name;
    systemNote.textContent = "Последний учебный день: " + formatDateRu(system.lastSchoolDay) +
      (system.note ? " · " + system.note : "");

    const qs = new URLSearchParams();
    qs.set("class", currentClass);
    qs.set("system", currentSystem);
    if (currentStudent) qs.set("student", currentStudent);
    openSchedule.href = "index.html?" + qs.toString();
  }

  studentReset.addEventListener("click", () => {
    currentStudent = null;
    storeValue("schedule.student", "");
    render();
  });

  render();
})();
