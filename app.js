const STORAGE_KEY = "codeforge-files-v1";
const ACTIVE_KEY = "codeforge-active-v1";

const pythonKeywords = ["and", "as", "assert", "async", "await", "break", "case", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "match", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"];
const pythonSoftKeywords = ["lazy"];
const pythonBuiltins = ["abs", "all", "any", "ascii", "bin", "bool", "breakpoint", "bytearray", "bytes", "callable", "chr", "classmethod", "compile", "complex", "delattr", "dict", "dir", "divmod", "enumerate", "eval", "exec", "filter", "float", "format", "frozendict", "frozenset", "getattr", "globals", "hasattr", "hash", "help", "hex", "id", "input", "isinstance", "issubclass", "iter", "len", "list", "locals", "map", "max", "memoryview", "min", "next", "object", "oct", "open", "ord", "pow", "print", "property", "range", "repr", "reversed", "round", "set", "setattr", "sentinel", "slice", "sorted", "staticmethod", "str", "sum", "super", "tuple", "type", "vars", "zip"];
const pythonMethods = ["append", "capitalize", "casefold", "clear", "copy", "count", "encode", "endswith", "extend", "find", "format", "get", "index", "insert", "items", "join", "keys", "lower", "pop", "remove", "replace", "reverse", "setdefault", "sort", "split", "splitlines", "startswith", "strip", "title", "upper", "values"];
const pythonConstants = ["True", "False", "None", "NotImplemented", "Ellipsis", "self", "cls"];
const pythonModernModules = ["annotationlib", "string.templatelib", "compression", "compression.zstd", "sys", "types", "typing", "dataclasses", "asyncio", "pathlib", "importlib"];

const state = {
  files: loadFiles(),
  activeFile: localStorage.getItem(ACTIVE_KEY) || "",
  openFiles: [],
  autocompleteIndex: 0,
  autocompleteItems: [],
  toastTimer: null,
  commandIndex: 0,
  cursor: { line: 1, col: 1 }
};

const $ = (selector) => document.querySelector(selector);
const editorTextarea = $("#editor");
let suppressEditorChange = false;
const codeMirror = window.CodeMirror.fromTextArea(editorTextarea, {
  mode: "python",
  theme: "crunch-light",
  lineNumbers: false,
  indentUnit: 4,
  tabSize: 4,
  indentWithTabs: false,
  smartIndent: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  lineWrapping: false,
  viewportMargin: Infinity
});
const editor = {
  get value() { return codeMirror.getValue(); },
  set value(value) {
    suppressEditorChange = true;
    codeMirror.setValue(value || "");
    suppressEditorChange = false;
  },
  get selectionStart() { return codeMirror.indexFromPos(codeMirror.getCursor("from")); },
  set selectionStart(value) { codeMirror.setCursor(codeMirror.posFromIndex(value)); },
  get selectionEnd() { return codeMirror.indexFromPos(codeMirror.getCursor("to")); },
  set selectionEnd(value) { codeMirror.setSelection(codeMirror.posFromIndex(this.selectionStart), codeMirror.posFromIndex(value)); },
  get scrollTop() { return codeMirror.getScrollInfo().top; },
  set scrollTop(value) { codeMirror.scrollTo(undefined, value); },
  get scrollLeft() { return codeMirror.getScrollInfo().left; },
  set scrollLeft(value) { codeMirror.scrollTo(value, undefined); },
  get disabled() { return codeMirror.getOption("readOnly") === "nocursor"; },
  set disabled(value) { codeMirror.setOption("readOnly", value ? "nocursor" : false); },
  focus() { codeMirror.focus(); },
  setRangeText(text, start, end, selectionMode = "end") {
    const from = codeMirror.posFromIndex(start);
    const to = codeMirror.posFromIndex(end);
    codeMirror.replaceRange(text, from, to, "+input");
    const cursor = codeMirror.posFromIndex(start + text.length);
    codeMirror.setCursor(cursor);
    if (selectionMode === "select") codeMirror.setSelection(from, cursor);
  },
  addEventListener(type, handler) {
    if (type === "input") codeMirror.on("change", () => { if (!suppressEditorChange) handler(); });
    else if (type === "scroll") codeMirror.on("scroll", handler);
    else if (type === "select") codeMirror.on("cursorActivity", handler);
    else codeMirror.on(type, (_instance, event) => handler(event));
  }
};
const lineNumbers = $("#lineNumbers");
const minimap = $("#minimap");
const autocomplete = $("#autocomplete");
const tabs = $("#tabs");
const fileTree = $("#fileTree");
const outputLines = $("#outputLines");
const bottomPanel = $("#bottomPanel");

function loadFiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      const oldSampleFiles = new Set(["main.py", "utils.py", "readme.md"]);
      return Object.fromEntries(Object.entries(saved).filter(([fileName]) => fileName.toLowerCase().endsWith(".py") && !oldSampleFiles.has(fileName.toLowerCase())));
    }
  } catch { /* Start with an empty workspace when storage is unavailable. */ }
  return {};
}

function saveFiles() {
  const pythonFiles = Object.fromEntries(Object.entries(state.files).filter(([fileName]) => fileName.toLowerCase().endsWith(".py")));
  state.files = pythonFiles;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pythonFiles));
  localStorage.setItem(ACTIVE_KEY, state.activeFile);
}

function extFor(fileName) {
  const extension = fileName.split(".").pop().toLowerCase();
  return extension === "py" ? "PY" : extension === "md" ? "MD" : extension === "html" ? "HTML" : extension.toUpperCase().slice(0, 4);
}

function extensionClass(fileName) {
  const extension = fileName.split(".").pop().toLowerCase();
  return extension === "py" ? "ext-py" : extension === "md" ? "ext-md" : "ext-txt";
}

function renderFileTree() {
  const fileNames = Object.keys(state.files);
  fileTree.innerHTML = fileNames.length ? fileNames.map((fileName) => `
    <div class="file-row ${fileName === state.activeFile ? "active" : ""}" data-file="${escapeHtml(fileName)}">
      <span class="file-ext ${extensionClass(fileName)}">${extFor(fileName)}</span>
      <span class="file-name">${escapeHtml(fileName)}</span>
      ${fileName === state.activeFile ? '<span class="file-pin">●</span>' : ""}
    </div>
  `).join("") : '<div class="empty-file-tree"><span>＋</span><strong>No Python files yet</strong><small>Use Create file to begin.</small></div>';
  fileTree.querySelectorAll(".file-row").forEach((row) => row.addEventListener("click", () => openFile(row.dataset.file)));
}

function renderTabs() {
  const openTabs = state.openFiles.filter((file) => Object.hasOwn(state.files, file));
  tabs.innerHTML = openTabs.length ? openTabs.map((fileName) => `
    <div class="tab ${fileName === state.activeFile ? "active" : ""}" data-file="${escapeHtml(fileName)}">
      <span class="tab-file-icon ${extensionClass(fileName)}">${extFor(fileName).slice(0, 2)}</span>
      <span>${escapeHtml(fileName)}</span>
      <button class="tab-close" data-close="${escapeHtml(fileName)}" aria-label="Close ${escapeHtml(fileName)}">×</button>
    </div>
  `).join("") : '<div class="empty-tabs">Create a .py file to start</div>';
  tabs.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", (event) => {
    if (!event.target.closest(".tab-close")) openFile(tab.dataset.file);
  }));
  tabs.querySelectorAll(".tab-close").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeFile(button.dataset.close);
  }));
}

function openFile(fileName) {
  if (!Object.hasOwn(state.files, fileName)) return;
  state.activeFile = fileName;
  if (!state.openFiles.includes(fileName)) state.openFiles.push(fileName);
  editor.value = state.files[fileName];
  editor.scrollTop = 0;
  editor.scrollLeft = 0;
  hideAutocomplete();
  renderAll();
  editor.focus();
}

function closeFile(fileName) {
  const index = state.openFiles.indexOf(fileName);
  state.openFiles = state.openFiles.filter((file) => file !== fileName);
  if (state.activeFile === fileName) {
    state.activeFile = state.openFiles.length ? state.openFiles[Math.max(0, index - 1)] : "";
    editor.value = state.activeFile ? state.files[state.activeFile] : "";
  }
  saveFiles();
  renderAll();
}

function renderAll() {
  renderFileTree();
  renderTabs();
  renderEditor();
  const file = state.activeFile;
  const hasFile = Boolean(file && Object.hasOwn(state.files, file));
  editor.disabled = !hasFile;
  $("#breadcrumbFile").textContent = hasFile ? file : "no-file";
  $("#editorFileName").textContent = hasFile ? file : "No file open";
  $("#languageLabel").textContent = file.endsWith(".py") ? "Python 3.15 syntax" : file.endsWith(".md") ? "Markdown" : "Text";
  $(".status-language").innerHTML = `<span class="python-dot"></span> ${file.endsWith(".py") ? "Python 3.15 syntax" : "Text"}`;
}

function renderEditor() {
  const source = editor.value;
  const totalLines = Math.max(1, source.split("\n").length);
  lineNumbers.innerHTML = Array.from({ length: totalLines }, (_, index) => `<div>${index + 1}</div>`).join("");
  renderMinimap(source);
  updateCursorPosition();
  syncScroll();
}

function highlight(source) {
  if (!source) return "";
  const escaped = escapeHtml(source);
  return escaped.split("\n").map((line) => {
    const tokens = [];
    const protect = (pattern, className) => {
      line = line.replace(pattern, (value) => {
        const marker = `\u0000${tokens.length}\u0000`;
        tokens.push(`<span class="${className}">${value}</span>`);
        return marker;
      });
    };
    protect(/(^\s*#.*$)/, "token-comment");
    protect(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)/g, "token-string");
    protect(/(#[^\u0000]*)$/, "token-comment");
    protect(/\b(\d+(?:\.\d+)?)\b/g, "token-number");
    protect(/@([A-Za-z_]\w*)/g, "token-decorator");
    protect(/\b(def|class)\s+([A-Za-z_]\w*)/g, "token-function");
    line = line.replace(/\b(def|class)\b/g, '<span class="token-keyword">$1</span>');
    line = line.replace(/\b(else|elif|except|finally|for|from|if|import|in|is|and|as|assert|async|await|break|case|continue|del|global|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g, '<span class="token-keyword">$1</span>');
    line = line.replace(/\b(print|len|range|str|int|float|list|dict|set|tuple|sum|open|enumerate|zip|map|filter|sorted|type|bool)\b/g, '<span class="token-builtin">$1</span>');
    return line.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
  }).join("\n");
}

function renderMinimap(source) {
  const lines = source.split("\n").slice(0, 90);
  minimap.innerHTML = lines.map((line) => {
    const trimmed = line.trim();
    const kind = trimmed.startsWith("#") ? "comment" : trimmed.includes("\"") || trimmed.includes("'") ? "string" : /\b(def|class|if|for|return|import)\b/.test(trimmed) ? "keyword" : "";
    const width = Math.max(15, Math.min(100, Math.round((line.length / 68) * 100)));
    return `<div class="minimap-line ${kind}" style="width:${width}%"></div>`;
  }).join("") + '<div class="minimap-viewport"></div>';
}

function syncScroll() {
  lineNumbers.style.transform = `translateY(${-editor.scrollTop}px)`;
}

function updateCursorPosition() {
  const before = editor.value.slice(0, editor.selectionStart);
  const line = before.split("\n").length;
  const col = before.length - before.lastIndexOf("\n");
  state.cursor = { line, col };
  $("#cursorPosition").textContent = `Ln ${line}, Col ${col}`;
}

function inputChanged() {
  state.files[state.activeFile] = editor.value;
  scheduleSave();
  renderEditor();
  $("#dirtyIndicator").hidden = false;
  $("#statusMessage").textContent = "Unsaved changes saved locally";
}

let saveTimer;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveFiles, 180);
}

function handleKeydown(event) {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveFiles();
    $("#dirtyIndicator").hidden = true;
    $("#statusMessage").textContent = "All changes saved locally";
    showToast(`${state.activeFile} saved to this browser.`);
    return;
  }
  if (modifier && event.key.toLowerCase() === "p") {
    event.preventDefault();
    openCommandPalette();
    return;
  }
  if (modifier && event.code === "Space") {
    event.preventDefault();
    showAutocomplete();
    return;
  }
  if (modifier && event.key === "Enter") {
    event.preventDefault();
    runActiveFile();
    return;
  }
  if (event.key === "Enter" && autocomplete.classList.contains("visible")) {
    event.preventDefault();
    acceptCompletion(state.autocompleteItems[state.autocompleteIndex]);
    return;
  }
  if (event.key === "Escape") hideAutocomplete();
  if (event.key === "ArrowDown" && autocomplete.classList.contains("visible")) {
    event.preventDefault();
    state.autocompleteIndex = Math.min(state.autocompleteIndex + 1, state.autocompleteItems.length - 1);
    renderAutocomplete();
  }
  if (event.key === "ArrowUp" && autocomplete.classList.contains("visible")) {
    event.preventDefault();
    state.autocompleteIndex = Math.max(state.autocompleteIndex - 1, 0);
    renderAutocomplete();
  }
}

function showAutocomplete() {
  if (!state.activeFile.endsWith(".py")) return hideAutocomplete();
  const before = editor.value.slice(0, editor.selectionStart);
  const match = before.match(/[A-Za-z_]\w*$/);
  if (!match || match[0].length < 1) return hideAutocomplete();
  const prefix = match[0].toLowerCase();
  const all = getPythonCompletions();
  state.autocompleteItems = all.filter((item) => item.value.toLowerCase().startsWith(prefix) && item.value !== match[0]).slice(0, 10);
  state.autocompleteIndex = 0;
  if (!state.autocompleteItems.length) return hideAutocomplete();
  renderAutocomplete();
  autocomplete.classList.add("visible");
}

function getPythonCompletions() {
  const source = editor.value;
  const items = [
    ...pythonKeywords.map((value) => ({ value, kind: "K", meta: "keyword" })),
    ...pythonSoftKeywords.map((value) => ({ value, kind: "K", meta: "Python 3.15 soft keyword" })),
    ...pythonBuiltins.map((value) => ({ value, kind: "ƒ", meta: "builtin" })),
    ...pythonMethods.map((value) => ({ value, kind: "·", meta: "method" })),
    ...pythonConstants.map((value) => ({ value, kind: "C", meta: "constant" })),
    ...pythonModernModules.map((value) => ({ value, kind: "M", meta: "Python 3.14/3.15 module" }))
  ];
  const addMatches = (pattern, kind, meta) => {
    for (const match of source.matchAll(pattern)) {
      const value = match[1] || match[2];
      if (value) items.push({ value, kind, meta });
    }
  };
  addMatches(/\bdef\s+([A-Za-z_]\w*)/g, "ƒ", "function");
  addMatches(/\bclass\s+([A-Za-z_]\w*)/g, "C", "class");
  addMatches(/\b(?:from\s+[\w.]+\s+import|import)\s+([A-Za-z_]\w*)/g, "M", "import");
  addMatches(/^\s*([A-Za-z_]\w*)\s*=|\bfor\s+([A-Za-z_]\w*)\s+in\b/g, "V", "variable");
  const unique = new Map();
  items.forEach((item) => { if (!unique.has(item.value)) unique.set(item.value, item); });
  return [...unique.values()];
}

function renderAutocomplete() {
  autocomplete.innerHTML = state.autocompleteItems.map((item, index) => `<div class="completion ${index === state.autocompleteIndex ? "selected" : ""}" data-index="${index}" role="option"><span class="completion-kind">${item.kind}</span><span>${item.value}</span><span class="completion-meta">${item.meta}</span></div>`).join("");
  autocomplete.querySelectorAll(".completion").forEach((item) => {
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      acceptCompletion(state.autocompleteItems[Number(item.dataset.index)]);
    });
  });
}

function acceptCompletion(item) {
  if (!item) return;
  const before = editor.value.slice(0, editor.selectionStart);
  const match = before.match(/[A-Za-z_]\w*$/);
  if (!match) return hideAutocomplete();
  const start = editor.selectionStart - match[0].length;
  editor.setRangeText(item.value, start, editor.selectionStart, "end");
  inputChanged();
  hideAutocomplete();
}

function hideAutocomplete() {
  autocomplete.classList.remove("visible");
  autocomplete.innerHTML = "";
}

async function runActiveFile() {
  if (!state.activeFile) {
    showToast("Create a .py file before running code.");
    return;
  }
  bottomPanel.classList.remove("collapsed");
  $("#executionStatus").textContent = "Running Python…";
  outputLines.innerHTML = `<div class="output-line meta">$ python ${escapeHtml(state.activeFile)}</div><div class="output-line meta">· Local Python 3 runner · 3 second safety timeout</div>`;
  $("#outputCount").textContent = "…";
  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: editor.value })
    });
    const result = await response.json();
    const output = `${result.stdout || ""}${result.stderr || ""}`.trimEnd();
    const lines = output ? output.split("\n") : ["No console output."];
    outputLines.innerHTML = `<div class="output-line meta">$ python ${escapeHtml(state.activeFile)}</div><div class="output-line meta">· Local Python 3 runner · ${editor.value.split("\n").length} lines</div>${lines.map((line) => `<div class="output-line ${result.ok ? "" : "error-line"}">${escapeHtml(line)}</div>`).join("")}<div class="output-line ${result.ok ? "success" : "error-line"}">${result.ok ? "✓ Process finished with exit code 0" : "✕ Process stopped with an error"}</div>`;
    $("#outputCount").textContent = String(lines.length + 1);
    $("#executionStatus").textContent = result.ok ? "Run finished successfully" : "Run finished with errors";
    $("#statusMessage").textContent = result.ok ? "Run finished · exit code 0" : "Run finished · inspect output";
  } catch (error) {
    outputLines.innerHTML = `<div class="output-line error-line">Could not connect to the Python runner.</div><div class="output-line meta">${escapeHtml(error.message)}</div>`;
    $("#executionStatus").textContent = "Runner unavailable";
  }
}

function previewActiveFile() {
  if (!state.activeFile.endsWith(".html")) {
    showToast("Preview is available for HTML files. Run the Python file to view output.");
    return;
  }
  runActiveFile();
}

function createFile() {
  const name = window.prompt("New Python file name (must end with .py)", "script.py");
  if (!name) return;
  const cleanName = name.trim().replace(/[^A-Za-z0-9._-]/g, "-");
  if (!cleanName) return;
  if (!cleanName.toLowerCase().endsWith(".py")) {
    showToast("File was not created. The name must end with .py");
    return;
  }
  if (state.files[cleanName]) return openFile(cleanName);
  state.files[cleanName] = "";
  state.openFiles.push(cleanName);
  saveFiles();
  openFile(cleanName);
  showToast(`${cleanName} created.`);
}

function saveActiveFile() {
  if (!state.activeFile) {
    showToast("Create a .py file before saving.");
    return;
  }
  state.files[state.activeFile] = editor.value;
  saveFiles();
  $("#dirtyIndicator").hidden = true;
  $("#statusMessage").textContent = "File saved locally";
  showToast(`${state.activeFile} saved locally.`);
}

const commands = [
  { label: "Run active file", shortcut: "⌘ ↵", action: runActiveFile },
  { label: "Save active file", shortcut: "⌘ S", action: saveActiveFile },
  { label: "Create new file", shortcut: "", action: createFile },
  { label: "Toggle output panel", shortcut: "", action: () => bottomPanel.classList.toggle("collapsed") },
  { label: "Focus editor", shortcut: "", action: () => editor.focus() }
];

function openCommandPalette() {
  $("#commandOverlay").hidden = false;
  $("#commandInput").value = "";
  state.commandIndex = 0;
  renderCommands();
  setTimeout(() => $("#commandInput").focus(), 0);
}

function closeCommandPalette() { $("#commandOverlay").hidden = true; }
function renderCommands() {
  const query = $("#commandInput").value.toLowerCase();
  const visible = commands.filter((command) => command.label.toLowerCase().includes(query));
  $("#commandList").innerHTML = visible.map((command, index) => `<div class="command-item ${index === state.commandIndex ? "selected" : ""}" data-command="${escapeHtml(command.label)}"><span>${escapeHtml(command.label)}</span><kbd>${command.shortcut}</kbd></div>`).join("");
  $("#commandList").querySelectorAll(".command-item").forEach((item) => item.addEventListener("click", () => {
    const command = commands.find((entry) => entry.label === item.dataset.command);
    closeCommandPalette();
    command?.action();
  }));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

editor.addEventListener("input", inputChanged);
editor.addEventListener("keydown", handleKeydown);
editor.addEventListener("keyup", updateCursorPosition);
editor.addEventListener("click", updateCursorPosition);
editor.addEventListener("select", updateCursorPosition);
editor.addEventListener("scroll", syncScroll);
$("#runButton").addEventListener("click", runActiveFile);
$("#previewButton").addEventListener("click", previewActiveFile);
$("#newFileButton").addEventListener("click", createFile);
$("#newFileTopButton").addEventListener("click", createFile);
$("#saveFileButton").addEventListener("click", saveActiveFile);
$("#commandButton").addEventListener("click", openCommandPalette);
$("#collapsePanel").addEventListener("click", () => bottomPanel.classList.toggle("collapsed"));
document.querySelectorAll(".panel-tab").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll(".panel-tab").forEach((item) => item.classList.toggle("active", item === tab));
  $("#outputView").hidden = tab.dataset.panel !== "output";
  $("#problemsView").hidden = tab.dataset.panel !== "problems";
}));
$("#commandInput").addEventListener("input", () => { state.commandIndex = 0; renderCommands(); });
$("#commandInput").addEventListener("keydown", (event) => {
  const items = $("#commandList").querySelectorAll(".command-item");
  if (event.key === "Escape") return closeCommandPalette();
  if (event.key === "ArrowDown") { event.preventDefault(); state.commandIndex = Math.min(state.commandIndex + 1, items.length - 1); renderCommands(); }
  if (event.key === "ArrowUp") { event.preventDefault(); state.commandIndex = Math.max(state.commandIndex - 1, 0); renderCommands(); }
  if (event.key === "Enter") { event.preventDefault(); items[state.commandIndex]?.click(); }
});
$("#commandOverlay").addEventListener("click", (event) => { if (event.target.id === "commandOverlay") closeCommandPalette(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#commandOverlay").hidden) closeCommandPalette();
});

autoSelectInitialFile();
function autoSelectInitialFile() {
  state.openFiles = Object.keys(state.files);
  if (!state.files[state.activeFile]) state.activeFile = state.openFiles[0] || "";
  editor.value = state.activeFile ? state.files[state.activeFile] : "";
  saveFiles();
  renderAll();
}
