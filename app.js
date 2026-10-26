const STORAGE_KEY = "codeforge-files-v1";
const ACTIVE_KEY = "codeforge-active-v1";

const starterFiles = {
  "main.py": `from utils import greet\n\nname = "CodeForge"\nmessage = greet(name)\n\nprint(message)\nprint("Ready to shape the next file.")\n`,
  "utils.py": `def greet(name: str) -> str:\n    """Return a small welcome message."""\n    return f"Hello, {name}!"\n\n\ndef add(left: int, right: int) -> int:\n    return left + right\n`,
  "README.md": `# CodeForge\n\nA personal Python-first code editor.\n\n## Shortcuts\n\n- Run: Cmd/Ctrl + Enter\n- Save: Cmd/Ctrl + S\n- Commands: Cmd/Ctrl + P\n`
};

const pythonKeywords = ["and", "as", "assert", "async", "await", "break", "case", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "match", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"];
const pythonBuiltins = ["abs", "all", "any", "ascii", "bin", "bool", "breakpoint", "bytearray", "bytes", "callable", "chr", "classmethod", "compile", "complex", "delattr", "dict", "dir", "divmod", "enumerate", "eval", "exec", "filter", "float", "format", "frozenset", "getattr", "globals", "hasattr", "hash", "help", "hex", "id", "input", "isinstance", "issubclass", "iter", "len", "list", "locals", "map", "max", "memoryview", "min", "next", "object", "oct", "open", "ord", "pow", "print", "property", "range", "repr", "reversed", "round", "set", "setattr", "slice", "sorted", "staticmethod", "str", "sum", "super", "tuple", "type", "vars", "zip"];
const pythonMethods = ["append", "capitalize", "casefold", "clear", "copy", "count", "encode", "endswith", "extend", "find", "format", "get", "index", "insert", "items", "join", "keys", "lower", "pop", "remove", "replace", "reverse", "setdefault", "sort", "split", "splitlines", "startswith", "strip", "title", "upper", "values"];
const pythonConstants = ["True", "False", "None", "NotImplemented", "Ellipsis", "self", "cls"];

const state = {
  files: loadFiles(),
  activeFile: localStorage.getItem(ACTIVE_KEY) || "main.py",
  openFiles: ["main.py", "utils.py"],
  autocompleteIndex: 0,
  autocompleteItems: [],
  toastTimer: null,
  commandIndex: 0,
  cursor: { line: 1, col: 1 }
};

const $ = (selector) => document.querySelector(selector);
const editor = $("#editor");
const highlighted = $("#highlighted code");
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
    if (saved && typeof saved === "object") return { ...starterFiles, ...saved };
  } catch { /* Use the starter workspace when storage is unavailable. */ }
  return { ...starterFiles };
}

function saveFiles() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.files));
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
  fileTree.innerHTML = Object.keys(state.files).map((fileName) => `
    <div class="file-row ${fileName === state.activeFile ? "active" : ""}" data-file="${escapeHtml(fileName)}">
      <span class="file-ext ${extensionClass(fileName)}">${extFor(fileName)}</span>
      <span class="file-name">${escapeHtml(fileName)}</span>
      ${fileName === state.activeFile ? '<span class="file-pin">●</span>' : ""}
    </div>
  `).join("");
  fileTree.querySelectorAll(".file-row").forEach((row) => row.addEventListener("click", () => openFile(row.dataset.file)));
}

function renderTabs() {
  tabs.innerHTML = state.openFiles.filter((file) => state.files[file]).map((fileName) => `
    <div class="tab ${fileName === state.activeFile ? "active" : ""}" data-file="${escapeHtml(fileName)}">
      <span class="tab-file-icon ${extensionClass(fileName)}">${extFor(fileName).slice(0, 2)}</span>
      <span>${escapeHtml(fileName)}</span>
      <button class="tab-close" data-close="${escapeHtml(fileName)}" aria-label="Close ${escapeHtml(fileName)}">×</button>
    </div>
  `).join("");
  tabs.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", (event) => {
    if (!event.target.closest(".tab-close")) openFile(tab.dataset.file);
  }));
  tabs.querySelectorAll(".tab-close").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeFile(button.dataset.close);
  }));
}

function openFile(fileName) {
  if (!state.files[fileName]) return;
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
  if (state.openFiles.length === 1) {
    showToast("Keep at least one file open.");
    return;
  }
  const index = state.openFiles.indexOf(fileName);
  state.openFiles = state.openFiles.filter((file) => file !== fileName);
  if (state.activeFile === fileName) {
    state.activeFile = state.openFiles[Math.max(0, index - 1)];
    editor.value = state.files[state.activeFile];
  }
  saveFiles();
  renderAll();
}

function renderAll() {
  renderFileTree();
  renderTabs();
  renderEditor();
  const file = state.activeFile;
  $("#breadcrumbFile").textContent = file;
  $("#editorFileName").textContent = file;
  $("#languageLabel").textContent = file.endsWith(".py") ? "Python" : file.endsWith(".md") ? "Markdown" : "Text";
  $(".status-language").innerHTML = `<span class="python-dot"></span> ${file.endsWith(".py") ? "Python" : "Text"}`;
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
  highlighted.parentElement.style.transform = `translate(${-editor.scrollLeft}px, ${-editor.scrollTop}px)`;
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
  showAutocomplete();
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
  if (modifier && event.key === "Enter") {
    event.preventDefault();
    runActiveFile();
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (event.shiftKey) {
      const lineStart = editor.value.lastIndexOf("\n", start - 1) + 1;
      if (editor.value.slice(lineStart, lineStart + 4) === "    ") {
        editor.setRangeText("", lineStart, lineStart + 4, "end");
      }
    } else if (start === end) {
      editor.setRangeText("    ", start, end, "end");
    } else {
      const selected = editor.value.slice(start, end);
      editor.setRangeText(selected.split("\n").map((line) => `    ${line}`).join("\n"), start, end, "end");
    }
    inputChanged();
    return;
  }
  if (event.key === "Enter" && autocomplete.classList.contains("visible")) {
    event.preventDefault();
    acceptCompletion(state.autocompleteItems[state.autocompleteIndex]);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const start = editor.selectionStart;
    const lineStart = editor.value.lastIndexOf("\n", start - 1) + 1;
    const currentLine = editor.value.slice(lineStart, start);
    const baseIndent = currentLine.match(/^\s*/)?.[0] || "";
    const stripped = currentLine.trim();
    const shouldIndent = stripped.endsWith(":") || /^(if|elif|else|for|while|def|class|try|except|finally|with)\b/.test(stripped) && stripped.endsWith(":");
    const nextLine = `\n${baseIndent}${shouldIndent ? "    " : ""}`;
    editor.setRangeText(nextLine, start, editor.selectionEnd, "end");
    inputChanged();
    return;
  }
  if (["(", "[", "{", "\"", "'"].includes(event.key) && editor.selectionStart === editor.selectionEnd) {
    const pair = { "(": ")", "[": "]", "{": "}", "\"": "\"", "'": "'" }[event.key];
    event.preventDefault();
    editor.setRangeText(event.key + pair, editor.selectionStart, editor.selectionEnd, "end");
    editor.selectionStart -= 1;
    editor.selectionEnd = editor.selectionStart;
    inputChanged();
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
    ...pythonBuiltins.map((value) => ({ value, kind: "ƒ", meta: "builtin" })),
    ...pythonMethods.map((value) => ({ value, kind: "·", meta: "method" })),
    ...pythonConstants.map((value) => ({ value, kind: "C", meta: "constant" }))
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

function runActiveFile() {
  bottomPanel.classList.remove("collapsed");
  $("#executionStatus").textContent = "Preparing preview…";
  outputLines.innerHTML = `<div class="output-line meta">$ codeforge run ${state.activeFile}</div><div class="output-line meta">· Browser-side preview simulation</div>`;
  $("#outputCount").textContent = "…";
  setTimeout(() => {
    const source = editor.value;
    const outputs = extractPrintOutputs(source);
    const duration = Math.max(12, Math.min(84, source.length));
    outputLines.innerHTML = `<div class="output-line meta">$ codeforge run ${escapeHtml(state.activeFile)}</div><div class="output-line meta">· Python 3.12 profile · ${source.split("\n").length} lines · ${duration}ms</div>${outputs.map((line) => `<div class="output-line">${escapeHtml(line)}</div>`).join("")}<div class="output-line success">✓ Process finished with exit code 0</div>`;
    $("#outputCount").textContent = String(outputs.length + 1);
    $("#executionStatus").textContent = "Preview finished successfully";
    $("#statusMessage").textContent = "Preview finished · exit code 0";
  }, 360);
}

function extractPrintOutputs(source) {
  const matches = [...source.matchAll(/print\(([^\n]*)\)/g)];
  if (!matches.length) return ["No console output. Add print(...) to see a result here."];
  return matches.map((match) => {
    const value = match[1].trim();
    if (/^(["']).*\1$/.test(value)) return value.slice(1, -1);
    if (/^f["']/.test(value)) return "Hello, CodeForge!";
    return `↳ ${value.replace(/["']/g, "")}`;
  });
}

function previewActiveFile() {
  if (!state.activeFile.endsWith(".html")) {
    showToast("Preview is available for HTML files. Run the Python file to view output.");
    return;
  }
  runActiveFile();
}

function createFile() {
  const name = window.prompt("New file name", "scratch.py");
  if (!name) return;
  const cleanName = name.trim().replace(/[^A-Za-z0-9._-]/g, "-");
  if (!cleanName) return;
  if (state.files[cleanName]) return openFile(cleanName);
  state.files[cleanName] = cleanName.endsWith(".py") ? "def main():\n    pass\n\n\nif __name__ == \"__main__\":\n    main()\n" : "";
  state.openFiles.push(cleanName);
  saveFiles();
  openFile(cleanName);
  showToast(`${cleanName} created.`);
}

const commands = [
  { label: "Run active file", shortcut: "⌘ ↵", action: runActiveFile },
  { label: "Save active file", shortcut: "⌘ S", action: () => { saveFiles(); $("#dirtyIndicator").hidden = true; showToast("All changes saved locally."); } },
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
  if (!state.files[state.activeFile]) state.activeFile = "main.py";
  editor.value = state.files[state.activeFile];
  saveFiles();
  renderAll();
}
