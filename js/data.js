/* Общий слой данных и утилиты · v2.0 */

const DAYS = [
  { key: "mon", short: "Пн", full: "Понедельник" },
  { key: "tue", short: "Вт", full: "Вторник" },
  { key: "wed", short: "Ср", full: "Среда" },
  { key: "thu", short: "Чт", full: "Четверг" },
  { key: "fri", short: "Пт", full: "Пятница" },
  { key: "sat", short: "Сб", full: "Суббота", weekend: true },
  { key: "sun", short: "Вс", full: "Воскресенье", weekend: true }
];

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Не удалось загрузить ${path} (HTTP ${res.status})`);
  return res.json();
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function showError(container, message) {
  container.innerHTML = "";
  const card = el("div", "error-card");
  card.textContent = "⚠️ " + message +
    " — проверьте, что страница открыта через HTTP-сервер (не file://), и что файлы в каталоге data/ на месте.";
  container.appendChild(card);
}

/* Рендер строки урока: <li> номер · время · предмет */
function lessonRow(lesson) {
  const li = el("li");
  li.appendChild(el("span", "lesson-num", String(lesson.n)));
  li.appendChild(el("span", "lesson-time", lesson.time));
  const title = el("span", "lesson-title");
  title.textContent = (lesson.icon ? lesson.icon + " " : "") + lesson.subject;
  li.appendChild(title);
  return li;
}

/* Рендер строки личного занятия */
const ACT_ICONS = { sport: "🏃", lesson: "💡", club: "🎯", other: "📌" };

function activityRow(act) {
  const li = el("li");
  const type = ACT_ICONS[act.type] ? act.type : "other";
  li.appendChild(el("span", "act-badge " + type, act.icon || ACT_ICONS[type]));
  li.appendChild(el("span", "lesson-time", act.time));
  const title = el("span", "lesson-title");
  const name = el("span");
  name.textContent = act.title;
  title.appendChild(name);
  if (act.place) {
    const wrap = el("span");
    wrap.appendChild(name);
    wrap.appendChild(el("span", "place", act.place));
    title.innerHTML = "";
    title.appendChild(wrap);
  }
  li.appendChild(title);
  return li;
}
