# Crunch Editor Plan

## Product scope
Build a browser-based custom code editor focused on Python, inspired by the productive layout and interaction patterns of VS Code without copying its branding. The first version is client-only and stores the working files in browser localStorage so it is immediately usable without an account or server.

## Implementation approach
- Use a dependency-light Node static server on port 3000.
- Build the interface with semantic HTML, CSS, and vanilla JavaScript.
- Use a layered code surface: a syntax-highlighted `<pre>` behind a transparent textarea, a synchronized line-number gutter, and a compact minimap.
- Implement Python-focused editor behaviors locally: four-space indentation, colon-based block indentation, dedent for `else`/`elif`/`except`/`finally`, Tab/Shift+Tab handling, bracket auto-pairing, and lightweight token-based autocomplete.
- Keep a file model in localStorage with starter files (`main.py`, `utils.py`, `README.md`) and support file selection, tabs, creating files, closing tabs, and saving.
- Provide a safe browser-side “Run” simulation that surfaces representative print output and execution metadata; clearly label it as a preview until a real Python runtime is connected.
- Keep the project structured so a future server or Pyodide worker can replace the simulation without changing the editor shell.

## Project structure
- `server.js`: small static HTTP server with SPA fallback and `/manus-routes.json` support.
- `index.html`: application shell, toolbar, sidebar, editor workspace, output panel, and status bar.
- `styles.css`: dark developer-tool visual system, layout, editor surfaces, responsive breakpoints, and motion.
- `app.js`: file model, editor state, syntax highlighting, autocomplete, indentation, run simulation, persistence, keyboard shortcuts, and UI interactions.
- `public/manus-routes.json`: route manifest for the single-page app.
- `app.config.ts`: project logo metadata.

## Design direction
### Candidate styles
- **Graphite Observatory** (0.06): focused dark IDE with luminous data accents and quiet chrome.
- **Paper Terminal** (0.04): warm light canvas with monospaced notes and ink-like controls.
- **Signal Workshop** (0.08): high-contrast developer console with electric cyan and amber status cues.

### Selected style: Graphite Observatory

**Design Movement:** Contemporary developer-tool minimalism with observatory-console precision: deep graphite planes, thin instrument lines, and small luminous status signals.

**Core Principles:** Reduce visual noise; keep code as the primary surface; use cyan for action and amber for attention; make state visible through small, information-dense readouts.

**Color Philosophy:** Near-black graphite (#0f1117) keeps long coding sessions calm. Cool slate surfaces separate panels without heavy borders. Cyan (#74d6d0) is the ownable action color, while amber and violet distinguish runtime and language signals.

**Layout Paradigm:** A left tool rail anchors navigation, a narrow project tree occupies the sidebar, and the main editor expands into a broad workbench with a right-edge minimap and a docked output tray. The hierarchy follows the developer’s gaze rather than centering content.

**Signature Elements:** A crunchy cookie mark in the Crunch wordmark; tiny telemetry labels such as `PYTHON 3.12` and `Ln 1, Col 1`; a thin cyan focus line beneath active tabs and controls.

**Interaction Philosophy:** Every action gives immediate, compact feedback through active states, a toast, a changed status readout, or output. Keyboard-first behavior is primary; buttons remain discoverable for new users.

**Animation:** Use 120–180ms ease-out transitions for tabs, buttons, and panel changes. Autocomplete appears with a short upward fade. Avoid looping decorative animation; only the run indicator may pulse while output is being prepared.

**Typography System:** Use Inter for interface text and JetBrains Mono for all code, labels, telemetry, and keyboard hints. Headings are compact and medium-weight; metadata is uppercase with generous tracking.

**Brand Essence:** A calm, capable personal coding bench for people who want an editor that feels like theirs. Personality: focused, precise, inviting.

**Brand Voice:** Headings are short and confident; CTAs describe the action. Example lines: “Shape the next file.” and “Run a quick preview.”

**Wordmark & Logo:** `Crunch` paired with a golden cookie cracking into two pieces, suggesting ideas breaking into executable code.

**Signature Brand Color:** Forge Cyan (#74d6d0).

## Future extension points
- Replace `simulateRun()` with an isolated Pyodide/Web Worker or a backend execution API.
- Add language packs for JavaScript, TypeScript, HTML, and JSON.
- Add project import/export, command palette commands, settings persistence, and collaboration.
