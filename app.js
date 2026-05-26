const STORAGE_KEY = "als-voice-note-v1";

const defaultPhrases = {
  body: [
    "息が苦しいです",
    "痛みがあります",
    "飲み込みにくいです",
    "痰がからみます",
    "眠れませんでした",
    "だるさが強いです",
    "薬の後から気分が悪いです",
    "食事がつらいです"
  ],
  medical: [
    "この症状について相談したいです",
    "薬の量を相談したいです",
    "今後の進行について聞きたいです",
    "呼吸の検査について聞きたいです",
    "リハビリについて聞きたいです",
    "家で気をつけることを聞きたいです",
    "緊急時の対応を確認したいです",
    "家族にも説明してください"
  ],
  feeling: [
    "不安です",
    "こわいです",
    "うれしいです",
    "悲しいです",
    "ありがとう",
    "一人にしないでください",
    "今は話したくないです",
    "そばにいてください"
  ]
};

const phraseCategories = {
  body: "体調",
  medical: "診察",
  feeling: "気持ち"
};

const careEventTitles = new Set(["通院", "訪問看護", "ヘルパー", "リハビリ"]);
const repeatLabels = {
  none: "繰り返しなし",
  daily: "毎日",
  weekly: "毎週",
  monthly: "毎月",
  yearly: "毎年"
};
const qaCategories = ["通院", "訪問看護", "ヘルパー", "リハビリ", "家族", "その他"];
const statusLevelOptions = ["普通", "少しつらい", "つらい", "かなりつらい", "厳しい"];
const defaultStatusScales = [
  { id: "pain", label: "痛み" },
  { id: "breath", label: "息苦しさ" },
  { id: "fatigue", label: "疲れ" },
  { id: "swallow", label: "飲み込みにくさ" }
];
const defaultStatusMemos = [
  { id: "sleep", label: "眠れなかった" },
  { id: "meal", label: "食事がつらい" },
  { id: "phlegm", label: "痰がからむ" },
  { id: "anxiety", label: "不安が強い" },
  { id: "medicine", label: "薬の相談" }
];

const state = loadState();
let activeCategory = "body";
let selectedStatuses = new Set();
let statusLevels = Object.fromEntries(state.statusScales.map((scale) => [scale.id, statusLevelOptions[0]]));
let lastDisplayedText = "";
let lastDisplayedSaved = false;
let selectedDateKey = toDateKey(new Date());
let calendarMonth = startOfMonth(new Date());

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  messageInput: $("#messageInput"),
  showMessage: $("#showMessage"),
  saveMessage: $("#saveMessage"),
  clearMessage: $("#clearMessage"),
  displayDialog: $("#displayDialog"),
  displayText: $("#displayText"),
  closeDisplay: $("#closeDisplay"),
  recordDisplayed: $("#recordDisplayed"),
  logEditDialog: $("#logEditDialog"),
  logEditTitle: $("#logEditTitle"),
  editingLogId: $("#editingLogId"),
  logEditText: $("#logEditText"),
  cancelLogEdit: $("#cancelLogEdit"),
  saveLogEdit: $("#saveLogEdit"),
  statusGrid: $("#statusGrid"),
  statusChips: $("#statusChips"),
  phraseGrid: $("#phraseGrid"),
  saveStatus: $("#saveStatus"),
  editingQaId: $("#editingQaId"),
  qaEventId: $("#qaEventId"),
  qaContext: $("#qaContext"),
  qaCategory: $("#qaCategory"),
  qaDate: $("#qaDate"),
  qaPerson: $("#qaPerson"),
  qaQuestion: $("#qaQuestion"),
  qaAnswer: $("#qaAnswer"),
  qaMemo: $("#qaMemo"),
  clearQaForm: $("#clearQaForm"),
  saveQaRecord: $("#saveQaRecord"),
  recordSearch: $("#recordSearch"),
  recordFilter: $("#recordFilter"),
  recordDate: $("#recordDate"),
  recordResults: $("#recordResults"),
  editingDiaryId: $("#editingDiaryId"),
  diaryDate: $("#diaryDate"),
  diaryText: $("#diaryText"),
  saveDiary: $("#saveDiary"),
  monthTitle: $("#monthTitle"),
  prevMonth: $("#prevMonth"),
  nextMonth: $("#nextMonth"),
  calendarGrid: $("#calendarGrid"),
  dayDialog: $("#dayDialog"),
  closeDayDialog: $("#closeDayDialog"),
  selectedDateTitle: $("#selectedDateTitle"),
  dayList: $("#dayList"),
  newEvent: $("#newEvent"),
  editingEventId: $("#editingEventId"),
  eventDate: $("#eventDate"),
  eventTimeField: $("#eventTimeField"),
  eventTime: $("#eventTime"),
  eventTitle: $("#eventTitle"),
  eventName: $("#eventName"),
  eventPlace: $("#eventPlace"),
  eventRepeat: $("#eventRepeat"),
  eventAllDay: $("#eventAllDay"),
  saveEvent: $("#saveEvent"),
  largeTextToggle: $("#largeTextToggle"),
  contrastToggle: $("#contrastToggle"),
  autoSaveToggle: $("#autoSaveToggle"),
  editingStatusScaleId: $("#editingStatusScaleId"),
  customStatusScale: $("#customStatusScale"),
  saveStatusScale: $("#saveStatusScale"),
  cancelStatusScaleEdit: $("#cancelStatusScaleEdit"),
  statusScaleManageList: $("#statusScaleManageList"),
  editingStatusMemoId: $("#editingStatusMemoId"),
  customStatusMemo: $("#customStatusMemo"),
  saveStatusMemo: $("#saveStatusMemo"),
  cancelStatusMemoEdit: $("#cancelStatusMemoEdit"),
  statusMemoManageList: $("#statusMemoManageList"),
  customCategory: $("#customCategory"),
  customPhrase: $("#customPhrase"),
  saveCustomPhrase: $("#saveCustomPhrase"),
  cancelPhraseEdit: $("#cancelPhraseEdit"),
  editingPhraseId: $("#editingPhraseId"),
  phraseManageList: $("#phraseManageList"),
  exportBackup: $("#exportBackup"),
  importBackup: $("#importBackup"),
  exportReadable: $("#exportReadable"),
  backupFileInput: $("#backupFileInput"),
  toast: $("#toast"),
  openSettings: $("#openSettings")
};

function loadState() {
  const fallback = {
    logs: [],
    events: [],
    qaRecords: [],
    diaryEntries: [],
    questions: [],
    phrases: createDefaultPhraseState(),
    statusScales: createDefaultStatusScales(),
    statusMemos: createDefaultStatusMemos(),
    settings: {
      theme: "default",
      largeText: false,
      highContrast: false,
      autoSave: true
    }
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return fallback;
    const migratedPhrases = saved.phrases
      ? normalizePhraseState(saved.phrases)
      : migrateOldPhrases(saved.customPhrases);
    return {
      ...fallback,
      ...saved,
      events: normalizeEvents(saved.events || []),
      qaRecords: normalizeQaRecords(saved.qaRecords || []),
      diaryEntries: normalizeDiaryEntries(saved.diaryEntries || []),
      phrases: migratedPhrases,
      statusScales: normalizeStatusScales(saved.statusScales),
      statusMemos: normalizeStatusMemos(saved.statusMemos),
      settings: {
        ...fallback.settings,
        ...(saved.settings || {})
      }
    };
  } catch {
    return fallback;
  }
}

function normalizeQaRecords(records) {
  return records.map((record) => ({
    id: record.id || createId(),
    eventId: record.eventId || "",
    category: qaCategories.includes(record.category) ? record.category : "通院",
    date: record.date || toDateKey(new Date(record.createdAt || Date.now())),
    person: record.person || "",
    question: record.question || "",
    answer: record.answer || "",
    memo: record.memo || "",
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || record.createdAt || new Date().toISOString()
  }));
}

function normalizeDiaryEntries(entries) {
  return entries.map((entry) => ({
    id: entry.id || createId(),
    date: entry.date || toDateKey(new Date(entry.createdAt || Date.now())),
    text: entry.text || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  }));
}

function normalizeEvents(events) {
  return events.map((event) => ({
    allDay: false,
    repeat: "none",
    repeatUntil: "",
    name: "",
    ...event
  }));
}

function createDefaultStatusScales() {
  return defaultStatusScales.map((scale) => ({ ...scale }));
}

function createDefaultStatusMemos() {
  return defaultStatusMemos.map((memo) => ({ ...memo }));
}

function normalizeStatusScales(scales) {
  const source = Array.isArray(scales) ? scales : createDefaultStatusScales();
  return source
    .map((scale) => {
      if (typeof scale === "string") {
        return { id: createId(), label: scale };
      }
      return {
        id: scale.id || createId(),
        label: scale.label || scale.name || ""
      };
    })
    .filter((scale) => scale.label.trim());
}

function normalizeStatusMemos(memos) {
  const source = Array.isArray(memos) ? memos : createDefaultStatusMemos();
  return source
    .map((memo) => {
      if (typeof memo === "string") {
        return { id: createId(), label: memo };
      }
      return {
        id: memo.id || createId(),
        label: memo.label || memo.text || ""
      };
    })
    .filter((memo) => memo.label.trim());
}

function createDefaultPhraseState() {
  return Object.fromEntries(
    Object.entries(defaultPhrases).map(([category, phrases]) => [
      category,
      phrases.map((text) => ({
        id: createId(),
        text
      }))
    ])
  );
}

function normalizePhraseState(source) {
  const result = {};
  Object.keys(phraseCategories).forEach((category) => {
    result[category] = (source[category] || [])
      .map((phrase) => {
        if (typeof phrase === "string") {
          return { id: createId(), text: phrase };
        }
        return {
          id: phrase.id || createId(),
          text: phrase.text || ""
        };
      })
      .filter((phrase) => phrase.text.trim());
  });
  return result;
}

function migrateOldPhrases(customPhrases = {}) {
  const phrases = createDefaultPhraseState();
  Object.keys(phraseCategories).forEach((category) => {
    (customPhrases[category] || []).forEach((text) => {
      phrases[category].push({
        id: createId(),
        text
      });
    });
  });
  return phrases;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeImportedState(source = {}) {
  const raw = source.data || source;
  const fallback = {
    logs: [],
    events: [],
    qaRecords: [],
    diaryEntries: [],
    questions: [],
    phrases: createDefaultPhraseState(),
    statusScales: createDefaultStatusScales(),
    statusMemos: createDefaultStatusMemos(),
    settings: {
      theme: "default",
      largeText: false,
      highContrast: false,
      autoSave: true
    }
  };
  const phrases = raw.phrases
    ? normalizePhraseState(raw.phrases)
    : migrateOldPhrases(raw.customPhrases);
  return {
    ...fallback,
    ...raw,
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    events: normalizeEvents(raw.events || []),
    qaRecords: normalizeQaRecords(raw.qaRecords || []),
    diaryEntries: normalizeDiaryEntries(raw.diaryEntries || []),
    phrases,
    statusScales: normalizeStatusScales(raw.statusScales),
    statusMemos: normalizeStatusMemos(raw.statusMemos),
    settings: {
      ...fallback.settings,
      ...(raw.settings || {})
    }
  };
}

function replaceState(nextState) {
  Object.keys(state).forEach((key) => {
    delete state[key];
  });
  Object.assign(state, normalizeImportedState(nextState));
  persist();
  selectedDateKey = toDateKey(new Date());
  calendarMonth = startOfMonth(new Date());
  selectedStatuses = new Set();
  syncStatusSettings();
  resetPhraseForm();
  resetStatusScaleForm();
  resetStatusMemoForm();
  resetQaForm(selectedDateKey);
  resetEventForm(selectedDateKey);
  resetDiaryForm(selectedDateKey);
  applySettings();
  renderStatusScales();
  renderStatusMemos();
  renderStatusScaleManager();
  renderStatusMemoManager();
  renderPhrases();
  renderPhraseManager();
  renderCalendar();
  renderDayList();
  renderRecordResults();
}

function downloadTextFile(filename, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function nowLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function fullDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function addLog(kind, text, extra = {}) {
  const item = {
    id: createId(),
    kind,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    visitType: extra.visitType || "日常",
    person: extra.person || "",
    ...extra
  };
  state.logs.unshift(item);
  persist();
  renderCalendar();
  renderDayList();
  renderRecordResults();
  return item;
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function daysBetween(fromKey, toKey) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to - from) / msPerDay);
}

function isCareEvent(title) {
  return careEventTitles.has(title);
}

function eventOccursOn(event, dateKey) {
  const repeat = event.repeat || "none";
  if ((event.repeatUntil || "") && dateKey > event.repeatUntil) return false;
  if (dateKey < event.date) return false;
  if (repeat === "none") return event.date === dateKey;
  if (repeat === "daily") return true;

  const start = parseDateKey(event.date);
  const target = parseDateKey(dateKey);
  if (repeat === "weekly") return daysBetween(event.date, dateKey) % 7 === 0;
  if (repeat === "monthly") return start.getDate() === target.getDate();
  if (repeat === "yearly") {
    return start.getMonth() === target.getMonth() && start.getDate() === target.getDate();
  }
  return event.date === dateKey;
}

function eventSortValue(event) {
  if (event.allDay) return "00:00";
  return event.time || "99:99";
}

function eventDisplayTitle(event) {
  return event.name || event.title || "予定";
}

function eventQaCategory(event) {
  return qaCategories.includes(event.title) ? event.title : "その他";
}

function eventQaPerson(event) {
  return event.place || event.name || event.title || "";
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long"
  }).format(date);
}

function selectedDateLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(parseDateKey(selectedDateKey));
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 1800);
}

function syncStatusSettings() {
  const scaleIds = new Set(state.statusScales.map((scale) => scale.id));
  Object.keys(statusLevels).forEach((key) => {
    if (!scaleIds.has(key)) {
      delete statusLevels[key];
    }
  });
  state.statusScales.forEach((scale) => {
    if (!statusLevels[scale.id]) {
      statusLevels[scale.id] = statusLevelOptions[0];
    }
  });
  const memoIds = new Set(state.statusMemos.map((memo) => memo.id));
  selectedStatuses = new Set([...selectedStatuses].filter((id) => memoIds.has(id)));
}

function renderStatusScales() {
  syncStatusSettings();
  if (!state.statusScales.length) {
    els.statusGrid.innerHTML = `<div class="empty-state">設定から体調の項目を追加できます</div>`;
    return;
  }

  els.statusGrid.innerHTML = state.statusScales
    .map((scale) => {
      const buttons = statusLevelOptions
        .map((level) => {
          const selected = statusLevels[scale.id] === level ? " selected" : "";
          return `<button class="${selected.trim()}" type="button" data-level="${escapeAttr(level)}">${escapeHtml(level)}</button>`;
        })
        .join("");
      return `
        <fieldset class="status-scale" data-status-key="${escapeAttr(scale.id)}">
          <legend>${escapeHtml(scale.label)}</legend>
          <div class="level-row">${buttons}</div>
        </fieldset>
      `;
    })
    .join("");
}

function renderStatusMemos() {
  syncStatusSettings();
  if (!state.statusMemos.length) {
    els.statusChips.innerHTML = `<div class="empty-state">設定から当てはまることを追加できます</div>`;
    return;
  }

  els.statusChips.innerHTML = state.statusMemos
    .map((memo) => {
      const selected = selectedStatuses.has(memo.id) ? " selected" : "";
      return `<button class="${selected.trim()}" type="button" data-status-id="${escapeAttr(memo.id)}">${escapeHtml(memo.label)}</button>`;
    })
    .join("");
}

function renderStatusScaleManager() {
  if (!state.statusScales.length) {
    els.statusScaleManageList.innerHTML = `<div class="empty-state">体調の項目はまだありません</div>`;
    return;
  }

  els.statusScaleManageList.innerHTML = state.statusScales
    .map(
      (scale) => `
        <article class="phrase-manage-item" data-id="${scale.id}">
          <div class="phrase-manage-text">${escapeHtml(scale.label)}</div>
          <div class="question-actions">
            <button type="button" data-action="edit-status-scale">編集</button>
            <button type="button" data-action="delete-status-scale">削除</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderStatusMemoManager() {
  if (!state.statusMemos.length) {
    els.statusMemoManageList.innerHTML = `<div class="empty-state">当てはまることはまだありません</div>`;
    return;
  }

  els.statusMemoManageList.innerHTML = state.statusMemos
    .map(
      (memo) => `
        <article class="phrase-manage-item" data-id="${memo.id}">
          <div class="phrase-manage-text">${escapeHtml(memo.label)}</div>
          <div class="question-actions">
            <button type="button" data-action="edit-status-memo">編集</button>
            <button type="button" data-action="delete-status-memo">削除</button>
          </div>
        </article>
      `
    )
    .join("");
}

function resetStatusScaleForm() {
  els.editingStatusScaleId.value = "";
  els.customStatusScale.value = "";
  els.saveStatusScale.textContent = "保存";
}

function saveStatusScale() {
  const label = els.customStatusScale.value.trim();
  if (!label) {
    showToast("項目名を入力してください");
    return;
  }

  const editingId = els.editingStatusScaleId.value;
  const existing = state.statusScales.find((scale) => scale.id === editingId);
  if (existing) {
    existing.label = label;
    showToast("体調の項目を更新しました");
  } else {
    const id = createId();
    state.statusScales.push({ id, label });
    statusLevels[id] = statusLevelOptions[0];
    showToast("体調の項目を追加しました");
  }

  persist();
  resetStatusScaleForm();
  renderStatusScales();
  renderStatusScaleManager();
}

function editStatusScale(id) {
  const scale = state.statusScales.find((item) => item.id === id);
  if (!scale) return;
  els.editingStatusScaleId.value = scale.id;
  els.customStatusScale.value = scale.label;
  els.saveStatusScale.textContent = "変更を保存";
  els.customStatusScale.focus();
}

function deleteStatusScale(id) {
  const scale = state.statusScales.find((item) => item.id === id);
  if (!scale) return;
  const ok = confirm("この体調項目を削除しますか？");
  if (!ok) return;
  state.statusScales = state.statusScales.filter((item) => item.id !== id);
  delete statusLevels[id];
  if (els.editingStatusScaleId.value === id) {
    resetStatusScaleForm();
  }
  persist();
  renderStatusScales();
  renderStatusScaleManager();
  showToast("体調の項目を削除しました");
}

function resetStatusMemoForm() {
  els.editingStatusMemoId.value = "";
  els.customStatusMemo.value = "";
  els.saveStatusMemo.textContent = "保存";
}

function saveStatusMemo() {
  const label = els.customStatusMemo.value.trim();
  if (!label) {
    showToast("表示する内容を入力してください");
    return;
  }

  const editingId = els.editingStatusMemoId.value;
  const existing = state.statusMemos.find((memo) => memo.id === editingId);
  if (existing) {
    existing.label = label;
    showToast("当てはまることを更新しました");
  } else {
    state.statusMemos.push({ id: createId(), label });
    showToast("当てはまることを追加しました");
  }

  persist();
  resetStatusMemoForm();
  renderStatusMemos();
  renderStatusMemoManager();
}

function editStatusMemo(id) {
  const memo = state.statusMemos.find((item) => item.id === id);
  if (!memo) return;
  els.editingStatusMemoId.value = memo.id;
  els.customStatusMemo.value = memo.label;
  els.saveStatusMemo.textContent = "変更を保存";
  els.customStatusMemo.focus();
}

function deleteStatusMemo(id) {
  const memo = state.statusMemos.find((item) => item.id === id);
  if (!memo) return;
  const ok = confirm("この項目を削除しますか？");
  if (!ok) return;
  state.statusMemos = state.statusMemos.filter((item) => item.id !== id);
  selectedStatuses.delete(id);
  if (els.editingStatusMemoId.value === id) {
    resetStatusMemoForm();
  }
  persist();
  renderStatusMemos();
  renderStatusMemoManager();
  showToast("当てはまることを削除しました");
}

function renderPhrases() {
  const phrases = state.phrases[activeCategory] || [];

  if (!phrases.length) {
    els.phraseGrid.innerHTML = `<div class="empty-state">定型文はまだありません</div>`;
    return;
  }

  els.phraseGrid.innerHTML = phrases
    .map((phrase) => `<button type="button" data-phrase="${escapeAttr(phrase.text)}">${escapeHtml(phrase.text)}</button>`)
    .join("");
}

function renderPhraseManager() {
  const category = els.customCategory.value;
  const phrases = state.phrases[category] || [];

  if (!phrases.length) {
    els.phraseManageList.innerHTML = `<div class="empty-state">このカテゴリの定型文はまだありません</div>`;
    return;
  }

  els.phraseManageList.innerHTML = phrases
    .map(
      (phrase) => `
        <article class="phrase-manage-item" data-id="${phrase.id}">
          <div class="phrase-manage-text">${escapeHtml(phrase.text)}</div>
          <div class="question-actions">
            <button type="button" data-action="edit-phrase">編集</button>
            <button type="button" data-action="delete-phrase">削除</button>
          </div>
        </article>
      `
    )
    .join("");
}

function resetPhraseForm() {
  els.editingPhraseId.value = "";
  els.customPhrase.value = "";
  els.saveCustomPhrase.textContent = "保存";
}

function savePhrase() {
  const text = els.customPhrase.value.trim();
  const category = els.customCategory.value;
  if (!text) {
    showToast("文を入力してください");
    return;
  }

  if (!state.phrases[category]) {
    state.phrases[category] = [];
  }

  const editingId = els.editingPhraseId.value;
  const existing = state.phrases[category].find((phrase) => phrase.id === editingId);
  if (existing) {
    existing.text = text;
    showToast("定型文を更新しました");
  } else {
    state.phrases[category].push({
      id: createId(),
      text
    });
    showToast("定型文を追加しました");
  }

  persist();
  resetPhraseForm();
  renderPhrases();
  renderPhraseManager();
}

function editPhrase(id) {
  const category = els.customCategory.value;
  const phrase = (state.phrases[category] || []).find((item) => item.id === id);
  if (!phrase) return;
  els.editingPhraseId.value = phrase.id;
  els.customPhrase.value = phrase.text;
  els.saveCustomPhrase.textContent = "変更を保存";
  els.customPhrase.focus();
}

function deletePhrase(id) {
  const category = els.customCategory.value;
  const phrase = (state.phrases[category] || []).find((item) => item.id === id);
  if (!phrase) return;
  const ok = confirm("この定型文を削除しますか？");
  if (!ok) return;
  state.phrases[category] = state.phrases[category].filter((item) => item.id !== id);
  if (els.editingPhraseId.value === id) {
    resetPhraseForm();
  }
  persist();
  renderPhrases();
  renderPhraseManager();
  showToast("定型文を削除しました");
}

function renderQaRecords() {
  renderDayList();
  renderRecordResults();
}

function renderTimeline() {
  // Legacy log editing helpers still call this after updates; the visible daily
  // history now lives in the calendar view.
}

function renderCalendar() {
  els.monthTitle.textContent = monthLabel(calendarMonth);
  const first = startOfMonth(calendarMonth);
  const gridStart = addDays(first, -first.getDay());
  const todayKey = toDateKey(new Date());
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const key = toDateKey(date);
    const inMonth = date.getMonth() === calendarMonth.getMonth();
    const eventCount = state.events.filter((event) => eventOccursOn(event, key)).length;
    const logCount = state.logs.filter((log) => toDateKey(new Date(log.createdAt)) === key).length;
    const qaCount = state.qaRecords.filter((record) => record.date === key).length;
    const diaryCount = state.diaryEntries.filter((entry) => entry.date === key).length;
    const classes = [
      "calendar-day",
      inMonth ? "" : "outside",
      key === todayKey ? "today" : "",
      key === selectedDateKey ? "selected" : ""
    ]
      .filter(Boolean)
      .join(" ");
    const badges = [
      eventCount ? `<span class="calendar-badge">予定${eventCount}</span>` : "",
      qaCount ? `<span class="calendar-badge">Q${qaCount}</span>` : "",
      logCount ? `<span class="calendar-badge">記録${logCount}</span>` : "",
      diaryCount ? `<span class="calendar-badge">日記</span>` : ""
    ].join("");

    cells.push(`
      <button class="${classes}" type="button" data-date="${key}" aria-label="${key}">
        <span class="calendar-date">${date.getDate()}</span>
        <span class="calendar-badges">${badges}</span>
      </button>
    `);
  }

  els.calendarGrid.innerHTML = cells.join("");
  els.selectedDateTitle.textContent = `${selectedDateLabel()}の予定`;
  if (!els.editingEventId.value) {
    els.eventDate.value = selectedDateKey;
  }
}

function openDayDialog() {
  if (typeof els.dayDialog.showModal === "function" && !els.dayDialog.open) {
    els.dayDialog.showModal();
  } else {
    els.dayDialog.setAttribute("open", "");
  }
}

function closeDayDialog() {
  if (typeof els.dayDialog.close === "function") {
    els.dayDialog.close();
  } else {
    els.dayDialog.removeAttribute("open");
  }
}

function renderDayList() {
  const events = state.events
    .filter((event) => eventOccursOn(event, selectedDateKey))
    .sort((a, b) => eventSortValue(a).localeCompare(eventSortValue(b)));
  const logs = state.logs
    .filter((log) => toDateKey(new Date(log.createdAt)) === selectedDateKey)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const qaRecords = state.qaRecords
    .filter((record) => record.date === selectedDateKey)
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  const diaries = state.diaryEntries
    .filter((entry) => entry.date === selectedDateKey)
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

  if (!events.length && !logs.length && !qaRecords.length && !diaries.length) {
    els.dayList.innerHTML = `<div class="empty-state">この日の予定と伝えたことはまだありません</div>`;
    return;
  }

  const eventItems = events.map((event) => {
    const careEvent = isCareEvent(event.title);
    const shownTitle = eventDisplayTitle(event);
    const time = event.allDay ? "終日・" : event.time ? `${event.time}・` : "";
    const place = event.place ? `・${escapeHtml(event.place)}` : "";
    const repeat = event.repeat && event.repeat !== "none" ? `・${repeatLabels[event.repeat]}` : "";
    const stopped = event.repeatUntil ? `・${event.repeatUntil}まで` : "";
    const memo = event.memo ? `<div class="day-main">${escapeHtml(event.memo)}</div>` : "";
    const linkedQa = qaRecords.filter((record) => record.eventId === event.id);
    const linkedQaHtml = linkedQa.length
      ? `<div class="event-qa-list">${linkedQa.map((record) => renderQaCard(record, { compact: true })).join("")}</div>`
      : `<div class="event-qa-empty">この予定の聞きたいことはまだありません</div>`;
    const sendButton = careEvent && event.memo
      ? `<button type="button" data-action="send-memo" data-id="${event.id}">記録へ</button>`
      : "";
    const stopButton = event.repeat && event.repeat !== "none" && !event.repeatUntil
      ? `<button type="button" data-action="stop-event" data-id="${event.id}">停止</button>`
      : "";
    return `
      <article class="day-item" data-event-id="${event.id}">
        <div class="day-meta">
          <span class="day-kind">予定</span>
          <span>${time}${escapeHtml(shownTitle)}${place}${repeat}${stopped}</span>
        </div>
        ${memo}
        ${linkedQaHtml}
        <div class="day-actions">
          <button type="button" data-action="add-qa-event" data-id="${event.id}">聞きたいことを追加</button>
          ${sendButton}
          <button type="button" data-action="edit-event" data-id="${event.id}">編集</button>
          ${stopButton}
          <button class="danger-inline" type="button" data-action="delete-event" data-id="${event.id}">削除</button>
        </div>
      </article>
    `;
  });

  const logItems = logs.map((log) => {
    const date = new Date(log.createdAt);
    const meta = [nowLabel(date), log.visitType, log.person].filter(Boolean).join("・");
    return `
      <article class="day-item" data-log-id="${log.id}">
        <div class="day-meta">
          <span class="day-kind">${kindLabel(log.kind)}</span>
          <span>${escapeHtml(meta)}</span>
        </div>
        <div class="day-main">${escapeHtml(log.text)}</div>
        <div class="day-actions">
          <button type="button" data-action="edit-log" data-id="${log.id}">編集</button>
          <button class="danger-inline" type="button" data-action="delete-log" data-id="${log.id}">削除</button>
        </div>
      </article>
    `;
  });

  const linkedEventIds = new Set(events.map((event) => event.id));
  const qaItems = qaRecords
    .filter((record) => !record.eventId || !linkedEventIds.has(record.eventId))
    .map((record) => renderQaCard(record));
  const diaryItems = diaries.map((entry) => renderDiaryCard(entry));

  els.dayList.innerHTML = [...eventItems, ...qaItems, ...logItems, ...diaryItems].join("");
}

function kindLabel(kind) {
  const labels = {
    message: "発言",
    question: "質問",
    reply: "返答",
    status: "体調"
  };
  return labels[kind] || "記録";
}

function renderQaCard(record, options = {}) {
  const meta = [record.date, record.category, record.person].filter(Boolean).join("・");
  const answer = record.answer ? `<div class="qa-answer"><strong>A</strong><p>${escapeHtml(record.answer)}</p></div>` : "";
  const memo = record.memo ? `<div class="qa-memo">${escapeHtml(record.memo)}</div>` : "";
  const compactClass = options.compact ? " compact-qa" : "";
  return `
    <article class="qa-item${compactClass}" data-id="${record.id}">
      <div class="timeline-meta">
        <span class="timeline-kind">聞きたいこと</span>
        <span>${escapeHtml(meta)}</span>
      </div>
      <div class="qa-question"><strong>Q</strong><p>${escapeHtml(record.question)}</p></div>
      ${answer}
      ${memo}
      <div class="day-actions">
        <button type="button" data-action="edit-qa" data-id="${record.id}">編集</button>
        <button class="danger-inline" type="button" data-action="delete-qa" data-id="${record.id}">削除</button>
      </div>
    </article>
  `;
}

function renderDiaryCard(entry) {
  return `
    <article class="qa-item" data-diary-id="${entry.id}">
      <div class="timeline-meta">
        <span class="timeline-kind">日記</span>
        <span>${escapeHtml(entry.date)}</span>
      </div>
      <div class="day-main">${escapeHtml(entry.text)}</div>
      <div class="day-actions">
        <button type="button" data-action="edit-diary" data-id="${entry.id}">編集</button>
        <button class="danger-inline" type="button" data-action="delete-diary" data-id="${entry.id}">削除</button>
      </div>
    </article>
  `;
}

function getDayData(date) {
  return {
    date,
    events: state.events
      .filter((event) => eventOccursOn(event, date))
      .sort((a, b) => eventSortValue(a).localeCompare(eventSortValue(b))),
    qaRecords: state.qaRecords
      .filter((record) => record.date === date)
      .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt)),
    logs: state.logs
      .filter((log) => toDateKey(new Date(log.createdAt)) === date)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    diaries: state.diaryEntries
      .filter((entry) => entry.date === date)
      .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
  };
}

function daySearchText(day) {
  return [
    day.date,
    ...day.events.flatMap((event) => [event.title, event.name, event.place]),
    ...day.qaRecords.flatMap((record) => [record.category, record.person, record.question, record.answer, record.memo]),
    ...day.logs.flatMap((log) => [kindLabel(log.kind), log.text, log.visitType, log.person]),
    ...day.diaries.map((entry) => entry.text)
  ].filter(Boolean).join(" ");
}

function dayMatchesFilter(day, filter) {
  if (filter === "all") return true;
  if (filter === "event") return day.events.length > 0;
  if (filter === "qa") return day.qaRecords.length > 0;
  if (filter === "answered") return day.qaRecords.some((record) => record.answer);
  if (filter === "message") return day.logs.some((log) => log.kind !== "status");
  if (filter === "status") return day.logs.some((log) => log.kind === "status");
  if (filter === "diary") return day.diaries.length > 0;
  return true;
}

function renderDaySummaryCard(day) {
  const eventLine = day.events.length
    ? `<p><strong>予定</strong>${escapeHtml(day.events.map((event) => eventDisplayTitle(event)).join("、"))}</p>`
    : "";
  const qaLine = day.qaRecords.length
    ? `<p><strong>聞いたこと</strong>${escapeHtml(day.qaRecords.map((record) => record.question).join(" / "))}</p>`
    : "";
  const logLine = day.logs.length
    ? `<p><strong>伝えたこと・体調</strong>${escapeHtml(day.logs.map((log) => log.text).join(" / "))}</p>`
    : "";
  const diaryLine = day.diaries.length
    ? day.diaries.map((entry) => `
      ${entry.text ? `<p><strong>日記</strong>${escapeHtml(entry.text)}</p>` : ""}
    `).join("")
    : "";

  return `
    <article class="record-day-card" data-record-date="${day.date}">
      <div class="record-day-head">
        <h2>${escapeHtml(day.date)}</h2>
        <button type="button" class="secondary-button compact" data-action="open-day" data-date="${day.date}">開く</button>
      </div>
      <div class="record-day-body">
        ${eventLine || qaLine || logLine || diaryLine ? [eventLine, qaLine, logLine, diaryLine].join("") : "<p>この日の記録はまだ少ないです。</p>"}
      </div>
    </article>
  `;
}

function resetQaForm(date = toDateKey(new Date())) {
  els.editingQaId.value = "";
  els.qaEventId.value = "";
  els.qaDate.value = date;
  els.qaCategory.value = "通院";
  els.qaPerson.value = "";
  els.qaQuestion.value = "";
  els.qaAnswer.value = "";
  els.qaMemo.value = "";
  els.saveQaRecord.textContent = "Q&Aを保存";
  els.qaContext.textContent = "予定なしで登録";
}

function updateQaContext() {
  const event = state.events.find((item) => item.id === els.qaEventId.value);
  if (event) {
    const time = event.allDay ? "終日" : event.time || "時間未定";
    const place = eventQaPerson(event);
    const date = els.qaDate.value || event.date;
    els.qaContext.textContent = `${date} ${time}・${eventDisplayTitle(event)}${place ? `・${place}` : ""} の聞きたいこと`;
    return;
  }
  const date = els.qaDate.value || selectedDateKey;
  const person = els.qaPerson.value.trim();
  els.qaContext.textContent = `${date}・予定なし${person ? `・${person}` : ""}`;
}

function addQaForEvent(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  const date = selectedDateKey || event.date;
  resetQaForm(date);
  els.qaEventId.value = event.id;
  els.qaDate.value = date;
  els.qaCategory.value = eventQaCategory(event);
  els.qaPerson.value = eventQaPerson(event);
  updateQaContext();
  els.qaQuestion.focus();
  els.qaQuestion.scrollIntoView({ behavior: "smooth", block: "center" });
}

function saveQaRecord() {
  const question = els.qaQuestion.value.trim();
  if (!question) {
    showToast("質問を入力してください");
    return;
  }

  const id = els.editingQaId.value || createId();
  const record = {
    id,
    eventId: els.qaEventId.value,
    category: els.qaCategory.value,
    date: els.qaDate.value || toDateKey(new Date()),
    person: els.qaPerson.value.trim(),
    question,
    answer: els.qaAnswer.value.trim(),
    memo: els.qaMemo.value.trim(),
    updatedAt: new Date().toISOString()
  };

  const index = state.qaRecords.findIndex((item) => item.id === id);
  if (index >= 0) {
    state.qaRecords[index] = {
      ...state.qaRecords[index],
      ...record
    };
  } else {
    state.qaRecords.push({
      ...record,
      createdAt: new Date().toISOString()
    });
  }

  persist();
  resetQaForm(record.date);
  renderQaRecords();
  renderCalendar();
  renderDayList();
  renderRecordResults();
  showToast("Q&Aを保存しました");
}

function editQaRecord(id) {
  const record = state.qaRecords.find((item) => item.id === id);
  if (!record) return;
  els.editingQaId.value = record.id;
  els.qaEventId.value = record.eventId || "";
  els.qaDate.value = record.date;
  els.qaCategory.value = record.category || "通院";
  els.qaPerson.value = record.person || "";
  els.qaQuestion.value = record.question || "";
  els.qaAnswer.value = record.answer || "";
  els.qaMemo.value = record.memo || "";
  els.saveQaRecord.textContent = "変更を保存";
  updateQaContext();
  selectedDateKey = record.date;
  calendarMonth = startOfMonth(parseDateKey(record.date));
  switchScreen("screenCalendar");
  renderQaRecords();
  els.qaQuestion.focus();
}

function deleteQaRecord(id) {
  const record = state.qaRecords.find((item) => item.id === id);
  if (!record) return;
  const ok = confirm("このQ&Aを削除しますか？");
  if (!ok) return;
  state.qaRecords = state.qaRecords.filter((item) => item.id !== id);
  if (els.editingQaId.value === id) {
    resetQaForm();
  }
  persist();
  renderQaRecords();
  renderCalendar();
  renderDayList();
  renderRecordResults();
  showToast("Q&Aを削除しました");
}

function sendQuestionToQa(question) {
  resetQaForm();
  els.qaQuestion.value = question;
  els.qaDate.value = selectedDateKey;
  updateQaContext();
  switchScreen("screenCalendar");
  els.qaQuestion.focus();
}

function showText(text, kind = "message") {
  const clean = text.trim();
  if (!clean) {
    showToast("文を入力してください");
    return;
  }
  lastDisplayedText = clean;
  lastDisplayedSaved = false;
  els.displayText.textContent = clean;

  if (typeof els.displayDialog.showModal === "function") {
    els.displayDialog.showModal();
  } else {
    alert(clean);
  }

  if (state.settings.autoSave) {
    addLog(kind, clean);
    lastDisplayedSaved = true;
  }
}

function saveCurrentMessage() {
  const text = els.messageInput.value.trim();
  if (!text) {
    showToast("文を入力してください");
    return;
  }
  addLog("message", text);
  showToast("記録しました");
}

function saveStatus() {
  const scales = state.statusScales.map((scale) => `${scale.label}: ${statusLevels[scale.id] || statusLevelOptions[0]}`);
  const chips = state.statusMemos
    .filter((memo) => selectedStatuses.has(memo.id))
    .map((memo) => memo.label);
  const text = [
    ...scales,
    ...chips
  ].join("、");

  if (!text) {
    showToast("体調の項目を設定してください");
    return;
  }

  addLog("status", text, {
    status: chips.join("、"),
    levels: { ...statusLevels }
  });
  showToast("体調を記録しました");
}

function updateEventFormMode() {
  const careEvent = isCareEvent(els.eventTitle.value);
  document.querySelectorAll(".care-field").forEach((field) => {
    field.hidden = !careEvent;
  });
  document.querySelectorAll(".life-field").forEach((field) => {
    field.hidden = careEvent;
  });
  els.eventTimeField.hidden = !careEvent && els.eventAllDay.checked;
  if (!careEvent && els.eventAllDay.checked) {
    els.eventTime.value = "";
  }
}

function resetEventForm(date = selectedDateKey) {
  els.editingEventId.value = "";
  els.eventDate.value = date;
  els.eventTime.value = "";
  els.eventTitle.value = "通院";
  els.eventName.value = "";
  els.eventPlace.value = "";
  els.eventRepeat.value = "none";
  els.eventAllDay.checked = false;
  els.saveEvent.textContent = "予定を保存";
  updateEventFormMode();
}

function saveEvent() {
  const date = els.eventDate.value || selectedDateKey;
  const careEvent = isCareEvent(els.eventTitle.value);
  const existing = state.events.find((item) => item.id === els.editingEventId.value);
  const event = {
    id: els.editingEventId.value || createId(),
    date,
    time: !careEvent && els.eventAllDay.checked ? "" : els.eventTime.value,
    title: els.eventTitle.value,
    name: careEvent ? "" : els.eventName.value.trim(),
    place: careEvent ? els.eventPlace.value.trim() : "",
    allDay: careEvent ? false : els.eventAllDay.checked,
    repeat: careEvent ? "none" : els.eventRepeat.value,
    repeatUntil: existing?.repeatUntil || "",
    memo: existing?.memo || "",
    updatedAt: new Date().toISOString()
  };

  if (!event.title) {
    showToast("予定を選んでください");
    return;
  }

  const index = state.events.findIndex((item) => item.id === event.id);
  const shouldPrepareQa = index < 0 && qaCategories.includes(event.title);
  if (index >= 0) {
    state.events[index] = {
      ...state.events[index],
      ...event
    };
  } else {
    state.events.push({
      ...event,
      createdAt: new Date().toISOString()
    });
  }

  selectedDateKey = date;
  calendarMonth = startOfMonth(parseDateKey(date));
  persist();
  resetEventForm(date);
  renderCalendar();
  renderDayList();
  if (shouldPrepareQa) {
    addQaForEvent(event.id);
    showToast("予定を保存しました。聞きたいことも入力できます");
  } else {
    openDayDialog();
    showToast("予定を保存しました");
  }
}

function editEvent(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  selectedDateKey = event.date;
  calendarMonth = startOfMonth(parseDateKey(event.date));
  els.editingEventId.value = event.id;
  els.eventDate.value = event.date;
  els.eventTime.value = event.time || "";
  els.eventTitle.value = event.title || "通院";
  els.eventName.value = event.name || "";
  els.eventPlace.value = event.place || "";
  els.eventRepeat.value = event.repeat || "none";
  els.eventAllDay.checked = Boolean(event.allDay);
  els.saveEvent.textContent = "変更を保存";
  updateEventFormMode();
  renderCalendar();
  renderDayList();
  openDayDialog();
  els.eventTitle.focus();
}

function stopEvent(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  const ok = confirm("この繰り返し予定を今後停止しますか？");
  if (!ok) return;
  event.repeatUntil = selectedDateKey;
  event.updatedAt = new Date().toISOString();
  persist();
  renderCalendar();
  renderDayList();
  showToast("繰り返しを停止しました");
}

function deleteEvent(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  const ok = confirm("この予定を削除しますか？");
  if (!ok) return;
  state.events = state.events.filter((item) => item.id !== id);
  if (els.editingEventId.value === id) {
    resetEventForm(selectedDateKey);
  }
  persist();
  renderCalendar();
  renderDayList();
  showToast("予定を削除しました");
}

function sendEventMemoToQa(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event || !event.memo) return;
  resetQaForm(selectedDateKey || event.date);
  els.qaEventId.value = event.id;
  els.qaCategory.value = eventQaCategory(event);
  els.qaPerson.value = eventQaPerson(event);
  els.qaQuestion.value = event.memo;
  updateQaContext();
  switchScreen("screenCalendar");
  els.qaQuestion.focus();
  showToast("記録に送りました");
}

function openLogEditor(id) {
  const log = state.logs.find((item) => item.id === id);
  if (!log) return;
  els.editingLogId.value = id;
  els.logEditTitle.textContent = `${kindLabel(log.kind)}を編集`;
  els.logEditText.value = log.text;

  if (typeof els.logEditDialog.showModal === "function") {
    els.logEditDialog.showModal();
    els.logEditText.focus();
  } else {
    const updated = prompt("記録を編集", log.text);
    if (updated === null) return;
    updateLogText(id, updated);
  }
}

function updateLogText(id, text) {
  const clean = text.trim();
  if (!clean) {
    showToast("記録内容を入力してください");
    return false;
  }
  const log = state.logs.find((item) => item.id === id);
  if (!log) return false;
  log.text = clean;
  log.updatedAt = new Date().toISOString();
  persist();
  renderTimeline();
  renderCalendar();
  renderDayList();
  renderRecordResults();
  showToast("記録を更新しました");
  return true;
}

function saveLogEdit() {
  const id = els.editingLogId.value;
  if (!id) return;
  const saved = updateLogText(id, els.logEditText.value);
  if (saved) {
    els.logEditDialog.close();
  }
}

function deleteLog(id) {
  const log = state.logs.find((item) => item.id === id);
  if (!log) return;
  const ok = confirm("この記録を削除しますか？");
  if (!ok) return;
  state.logs = state.logs.filter((item) => item.id !== id);
  persist();
  renderTimeline();
  renderCalendar();
  renderDayList();
  renderRecordResults();
  showToast("記録を削除しました");
}

function saveDiary() {
  const text = els.diaryText.value.trim();
  if (!text) {
    showToast("日記を入力してください");
    return;
  }
  const id = els.editingDiaryId.value || createId();
  const entry = {
    id,
    date: els.diaryDate.value || selectedDateKey,
    text,
    updatedAt: new Date().toISOString()
  };
  const index = state.diaryEntries.findIndex((item) => item.id === id);
  if (index >= 0) {
    state.diaryEntries[index] = { ...state.diaryEntries[index], ...entry };
  } else {
    state.diaryEntries.push({ ...entry, createdAt: new Date().toISOString() });
  }
  persist();
  resetDiaryForm(entry.date);
  renderCalendar();
  renderDayList();
  renderRecordResults();
  showToast("日記を保存しました");
}

function resetDiaryForm(date = selectedDateKey) {
  els.editingDiaryId.value = "";
  els.diaryDate.value = date;
  els.diaryText.value = "";
}

function editDiary(id) {
  const entry = state.diaryEntries.find((item) => item.id === id);
  if (!entry) return;
  els.editingDiaryId.value = entry.id;
  els.diaryDate.value = entry.date;
  els.diaryText.value = entry.text || "";
  selectedDateKey = entry.date;
  calendarMonth = startOfMonth(parseDateKey(entry.date));
  switchScreen("screenCalendar");
  renderCalendar();
  renderDayList();
  openDayDialog();
  els.diaryText.focus();
}

function deleteDiary(id) {
  const entry = state.diaryEntries.find((item) => item.id === id);
  if (!entry) return;
  const ok = confirm("この日記を削除しますか？");
  if (!ok) return;
  state.diaryEntries = state.diaryEntries.filter((item) => item.id !== id);
  if (els.editingDiaryId.value === id) resetDiaryForm();
  persist();
  renderCalendar();
  renderDayList();
  renderRecordResults();
  showToast("日記を削除しました");
}

function exportBackup() {
  const payload = {
    app: "TalkNote",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: state
  };
  const date = toDateKey(new Date());
  downloadTextFile(
    `talknote-backup-${date}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
  showToast("バックアップを書き出しました");
}

function importBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const ok = confirm("今のデータをバックアップ内容で置き換えますか？");
      if (!ok) return;
      replaceState(parsed);
      showToast("バックアップを読み込みました");
    } catch {
      showToast("バックアップを読み込めませんでした");
    } finally {
      els.backupFileInput.value = "";
    }
  });
  reader.readAsText(file);
}

function exportReadableText() {
  const lines = ["TalkNote 記録", `書き出し: ${fullDateLabel()}`, ""];
  const dates = new Set([
    ...state.events.map((event) => event.date),
    ...state.qaRecords.map((record) => record.date),
    ...state.logs.map((log) => toDateKey(new Date(log.createdAt))),
    ...state.diaryEntries.map((entry) => entry.date)
  ]);

  [...dates].sort().forEach((date) => {
    lines.push(`## ${date}`, "");
    state.events.filter((event) => event.date === date).forEach((event) => {
      lines.push(`予定: ${[event.time || (event.allDay ? "終日" : ""), event.name || event.title, event.place].filter(Boolean).join(" / ")}`);
    });
    state.qaRecords.filter((record) => record.date === date).forEach((record) => {
      lines.push(`Q (${record.category}${record.person ? ` / ${record.person}` : ""}): ${record.question}`);
      if (record.answer) lines.push(`A: ${record.answer}`);
      if (record.memo) lines.push(`メモ: ${record.memo}`);
    });
    state.logs.filter((log) => toDateKey(new Date(log.createdAt)) === date).forEach((log) => {
      lines.push(`${kindLabel(log.kind)}: ${log.text}`);
    });
    state.diaryEntries.filter((entry) => entry.date === date).forEach((entry) => {
      if (entry.text) lines.push(`日記: ${entry.text}`);
    });
    lines.push("");
  });

  downloadTextFile(`talknote-records-${toDateKey(new Date())}.txt`, lines.join("\n"));
  showToast("テキストを書き出しました");
}

function renderRecordResults() {
  const query = (els.recordSearch?.value || "").trim().toLowerCase();
  const filter = els.recordFilter?.value || "all";
  const date = els.recordDate?.value || "";
  const dates = new Set([
    ...state.events.map((event) => event.date),
    ...state.qaRecords.map((record) => record.date),
    ...state.logs.map((log) => toDateKey(new Date(log.createdAt))),
    ...state.diaryEntries.map((entry) => entry.date)
  ]);
  const days = [...dates]
    .map((dayDate) => getDayData(dayDate))
    .filter((day) => !date || day.date === date)
    .filter((day) => dayMatchesFilter(day, filter))
    .filter((day) => !query || daySearchText(day).toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!els.recordResults) return;
  if (!days.length) {
    els.recordResults.innerHTML = `<div class="empty-state">該当する記録はありません</div>`;
    return;
  }
  els.recordResults.innerHTML = days.map((day) => renderDaySummaryCard(day)).join("");
}

function renderEventResult(event) {
  const title = event.name || event.title;
  const meta = [event.date, event.time || (event.allDay ? "終日" : ""), event.place].filter(Boolean).join("・");
  return `
    <article class="day-item">
      <div class="day-meta">
        <span class="day-kind">予定</span>
        <span>${escapeHtml(meta)}</span>
      </div>
      <div class="day-main">${escapeHtml(title)}</div>
    </article>
  `;
}

function renderLogResult(log) {
  const date = toDateKey(new Date(log.createdAt));
  const meta = [date, nowLabel(new Date(log.createdAt)), log.visitType, log.person].filter(Boolean).join("・");
  return `
    <article class="day-item" data-log-id="${log.id}">
      <div class="day-meta">
        <span class="day-kind">${kindLabel(log.kind)}</span>
        <span>${escapeHtml(meta)}</span>
      </div>
      <div class="day-main">${escapeHtml(log.text)}</div>
      <div class="day-actions">
        <button type="button" data-action="edit-log" data-id="${log.id}">編集</button>
        <button class="danger-inline" type="button" data-action="delete-log" data-id="${log.id}">削除</button>
      </div>
    </article>
  `;
}

function exportLog() {
  if (!state.logs.length) {
    showToast("書き出す記録がありません");
    return;
  }

  const lines = [
    "TalkNote 記録",
    `書き出し: ${fullDateLabel()}`,
    "",
    ...state.logs
      .slice()
      .reverse()
      .flatMap((item) => {
        const date = fullDateLabel(new Date(item.createdAt));
        const meta = [item.visitType, item.person].filter(Boolean).join(" / ");
        return [
          `[${date}] ${kindLabel(item.kind)}${meta ? ` (${meta})` : ""}`,
          item.text,
          ""
        ];
      })
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `voice-note-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function applySettings() {
  const theme = ["default", "light", "dark"].includes(state.settings.theme)
    ? state.settings.theme
    : "default";
  state.settings.theme = theme;
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("large-text", state.settings.largeText);
  document.body.classList.toggle("high-contrast", state.settings.highContrast);
  $$("[data-theme]").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === theme);
  });
  els.largeTextToggle.checked = state.settings.largeText;
  els.contrastToggle.checked = state.settings.highContrast;
  els.autoSaveToggle.checked = state.settings.autoSave;
}

function setStatusLevel(key, level) {
  statusLevels[key] = level;
  const scale = document.querySelector(`.status-scale[data-status-key="${key}"]`);
  if (!scale) return;
  scale.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.level === level);
  });
}

function switchScreen(screenId) {
  $$(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId);
  });
  $$(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.screen === screenId);
  });
  els.openSettings.hidden = screenId === "screenSettings";
  if (screenId === "screenCalendar") {
    renderCalendar();
    renderDayList();
  }
  if (screenId === "screenLog") {
    els.recordDate.value = selectedDateKey;
    els.diaryDate.value = selectedDateKey;
    renderRecordResults();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function wireEvents() {
  els.showMessage.addEventListener("click", () => showText(els.messageInput.value, "message"));
  els.saveMessage.addEventListener("click", saveCurrentMessage);
  els.clearMessage?.addEventListener("click", () => {
    els.messageInput.value = "";
    els.messageInput.focus();
  });

  els.closeDisplay.addEventListener("click", () => els.displayDialog.close());
  els.recordDisplayed.addEventListener("click", () => {
    if (lastDisplayedSaved) {
      showToast("記録済みです");
      return;
    }
    if (lastDisplayedText) {
      addLog("message", lastDisplayedText);
      lastDisplayedSaved = true;
      showToast("記録しました");
    }
  });
  els.cancelLogEdit.addEventListener("click", () => els.logEditDialog.close());
  els.saveLogEdit.addEventListener("click", saveLogEdit);

  $$(".quick-answer").forEach((button) => {
    button.addEventListener("click", () => showText(button.dataset.phrase, "message"));
  });

  $$("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      $$("[data-category]").forEach((segment) => {
        segment.classList.toggle("active", segment === button);
      });
      renderPhrases();
    });
  });

  els.phraseGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    els.messageInput.value = button.dataset.phrase;
    els.messageInput.focus();
  });

  els.statusGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-level]");
    const scale = event.target.closest(".status-scale");
    if (!button || !scale) return;
    setStatusLevel(scale.dataset.statusKey, button.dataset.level);
  });

  els.statusChips.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const status = button.dataset.statusId;
    if (!status) return;
    if (selectedStatuses.has(status)) {
      selectedStatuses.delete(status);
      button.classList.remove("selected");
    } else {
      selectedStatuses.add(status);
      button.classList.add("selected");
    }
  });

  els.saveStatus.addEventListener("click", saveStatus);
  els.clearQaForm.addEventListener("click", () => {
    resetQaForm(selectedDateKey);
    els.qaQuestion.focus();
  });
  [els.qaCategory, els.qaPerson].forEach((control) => {
    control.addEventListener("input", updateQaContext);
    control.addEventListener("change", updateQaContext);
  });
  els.saveQaRecord.addEventListener("click", saveQaRecord);
  [els.dayList, els.recordResults].forEach((list) => {
    list.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      if (button.dataset.action === "open-day") {
        selectedDateKey = button.dataset.date;
        calendarMonth = startOfMonth(parseDateKey(selectedDateKey));
        resetEventForm(selectedDateKey);
        resetQaForm(selectedDateKey);
        resetDiaryForm(selectedDateKey);
        switchScreen("screenCalendar");
        renderCalendar();
        renderDayList();
        openDayDialog();
      }
      if (button.dataset.action === "edit-qa") editQaRecord(button.dataset.id);
      if (button.dataset.action === "delete-qa") deleteQaRecord(button.dataset.id);
      if (button.dataset.action === "edit-diary") editDiary(button.dataset.id);
      if (button.dataset.action === "delete-diary") deleteDiary(button.dataset.id);
      if (button.dataset.action === "edit-log") openLogEditor(button.dataset.id);
      if (button.dataset.action === "delete-log") deleteLog(button.dataset.id);
    });
  });
  els.prevMonth.addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  els.nextMonth.addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  els.calendarGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (!button) return;
    selectedDateKey = button.dataset.date;
    calendarMonth = startOfMonth(parseDateKey(selectedDateKey));
    resetEventForm(selectedDateKey);
    resetQaForm(selectedDateKey);
    resetDiaryForm(selectedDateKey);
    renderCalendar();
    renderDayList();
    openDayDialog();
  });
  els.newEvent.addEventListener("click", () => {
    resetEventForm(selectedDateKey);
    els.eventTitle.focus();
  });
  els.closeDayDialog.addEventListener("click", closeDayDialog);
  els.dayDialog.addEventListener("click", (event) => {
    if (event.target === els.dayDialog) {
      closeDayDialog();
    }
  });
  els.eventTitle.addEventListener("change", updateEventFormMode);
  els.eventAllDay.addEventListener("change", updateEventFormMode);
  els.eventDate.addEventListener("change", () => {
    if (!els.eventDate.value) return;
    selectedDateKey = els.eventDate.value;
    calendarMonth = startOfMonth(parseDateKey(selectedDateKey));
    renderCalendar();
    renderDayList();
  });
  els.saveEvent.addEventListener("click", saveEvent);
  $$("[data-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.theme = button.dataset.theme;
      persist();
      applySettings();
    });
  });
  [els.recordSearch, els.recordFilter, els.recordDate].forEach((control) => {
    control.addEventListener("input", renderRecordResults);
    control.addEventListener("change", () => {
      if (control === els.recordDate && els.recordDate.value) {
        els.diaryDate.value = els.recordDate.value;
      }
      renderRecordResults();
    });
  });
  els.saveDiary.addEventListener("click", saveDiary);
  els.dayList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      const qaItem = event.target.closest(".qa-item");
      const eventItem = event.target.closest("[data-event-id]");
      if (eventItem && !qaItem) {
        editEvent(eventItem.dataset.eventId);
      }
      return;
    }
    if (button.dataset.action === "edit-event") {
      editEvent(button.dataset.id);
    }
    if (button.dataset.action === "delete-event") {
      deleteEvent(button.dataset.id);
    }
    if (button.dataset.action === "stop-event") {
      stopEvent(button.dataset.id);
    }
    if (button.dataset.action === "send-memo") {
      sendEventMemoToQa(button.dataset.id);
    }
    if (button.dataset.action === "add-qa-event") {
      addQaForEvent(button.dataset.id);
    }
    if (button.dataset.action === "edit-log") {
      openLogEditor(button.dataset.id);
    }
    if (button.dataset.action === "delete-log") {
      deleteLog(button.dataset.id);
    }
  });

  els.largeTextToggle.addEventListener("change", () => {
    state.settings.largeText = els.largeTextToggle.checked;
    persist();
    applySettings();
  });
  els.contrastToggle.addEventListener("change", () => {
    state.settings.highContrast = els.contrastToggle.checked;
    persist();
    applySettings();
  });
  els.autoSaveToggle.addEventListener("change", () => {
    state.settings.autoSave = els.autoSaveToggle.checked;
    persist();
  });
  els.exportBackup.addEventListener("click", exportBackup);
  els.importBackup.addEventListener("click", () => els.backupFileInput.click());
  els.backupFileInput.addEventListener("change", () => importBackupFile(els.backupFileInput.files[0]));
  els.exportReadable.addEventListener("click", exportReadableText);

  els.saveStatusScale.addEventListener("click", saveStatusScale);
  els.cancelStatusScaleEdit.addEventListener("click", resetStatusScaleForm);
  els.statusScaleManageList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const item = event.target.closest(".phrase-manage-item");
    if (!button || !item) return;
    if (button.dataset.action === "edit-status-scale") {
      editStatusScale(item.dataset.id);
    }
    if (button.dataset.action === "delete-status-scale") {
      deleteStatusScale(item.dataset.id);
    }
  });
  els.saveStatusMemo.addEventListener("click", saveStatusMemo);
  els.cancelStatusMemoEdit.addEventListener("click", resetStatusMemoForm);
  els.statusMemoManageList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const item = event.target.closest(".phrase-manage-item");
    if (!button || !item) return;
    if (button.dataset.action === "edit-status-memo") {
      editStatusMemo(item.dataset.id);
    }
    if (button.dataset.action === "delete-status-memo") {
      deleteStatusMemo(item.dataset.id);
    }
  });

  els.saveCustomPhrase.addEventListener("click", savePhrase);
  els.cancelPhraseEdit.addEventListener("click", resetPhraseForm);
  els.customCategory.addEventListener("change", () => {
    resetPhraseForm();
    renderPhraseManager();
  });
  els.phraseManageList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const item = event.target.closest(".phrase-manage-item");
    if (!button || !item) return;
    if (button.dataset.action === "edit-phrase") {
      editPhrase(item.dataset.id);
    }
    if (button.dataset.action === "delete-phrase") {
      deletePhrase(item.dataset.id);
    }
  });

  $$(".nav-item").forEach((item) => {
    item.addEventListener("click", () => switchScreen(item.dataset.screen));
  });

  els.openSettings.addEventListener("click", () => switchScreen("screenSettings"));
}

function init() {
  applySettings();
  renderStatusScales();
  renderStatusMemos();
  renderStatusScaleManager();
  renderStatusMemoManager();
  renderPhrases();
  renderPhraseManager();
  resetQaForm();
  renderQaRecords();
  resetEventForm(selectedDateKey);
  resetDiaryForm(selectedDateKey);
  renderCalendar();
  renderDayList();
  renderRecordResults();
  wireEvents();
}

init();
