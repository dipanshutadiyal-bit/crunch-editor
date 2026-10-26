# Crunch Editor TODO

## 1. Deliver a focused VS Code-inspired Python workspace
- The product is a browser-based custom code editor with a polished dark developer workspace.
- The layout includes a branded header, project/file explorer, editable code area, tabs, minimap-style overview, output panel, and status bar.
- The interface is responsive enough to remain usable on narrower screens.

## 2. Support Python editing fundamentals
- The editor supports Python files and starts with useful example files including `main.py` and `utils.py`.
- The editor provides line numbers and Python syntax highlighting.
- Pressing Enter preserves the current indentation and adds indentation after a Python colon; block keywords such as `else`, `elif`, `except`, and `finally` can dedent appropriately.
- Tab inserts four spaces and Shift+Tab removes one indentation level.
- Brackets and quotes auto-pair when typed in the editor.

## 3. Provide autocomplete and keyboard-first interactions
- Python keywords, built-ins, and common methods appear as autocomplete suggestions based on the current word prefix.
- A suggestion can be selected by mouse or keyboard, and Escape closes the list.
- Ctrl/Cmd+S saves the active file to browser storage, Ctrl/Cmd+P opens the command palette, and Ctrl/Cmd+Enter runs a preview.
- The interface exposes Run, Preview, and file-creation actions without requiring keyboard shortcuts.

## 4. Provide a usable local project model
- Users can open files from the explorer, switch between tabs, close tabs, and create a new file.
- File contents persist in localStorage between refreshes.
- The active file, cursor position, and current editor state update the status bar.

## 5. Show execution feedback safely in the browser
- Run opens the output panel and shows execution metadata and representative output for the current Python file.
- The UI clearly communicates that the first version is a browser-side preview simulation, not an unrestricted Python runtime.
- Preview can render a simple HTML file in the output area.

## 6. Make the project ready to preview and extend
- The application serves on the configured port 3000.
- `GET /manus-routes.json` returns the single-page route manifest.
- The source remains dependency-light and organized across separate HTML, CSS, JavaScript, and server files.
