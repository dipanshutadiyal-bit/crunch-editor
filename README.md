# Crunch

Crunch is a small, friendly Python code editor made for people who want a focused place to write and run Python without opening a large development suite.

It is designed around a simple idea: open the editor, create a `.py` file, start typing, and get out of the way. Crunch uses a clean light interface, Python-aware editing, a local file workspace, and a Run panel for seeing program output.

## Download for Windows

Download the latest portable Windows build from the [Crunch releases page](https://github.com/dipanshutadiyal-bit/crunch-editor/releases/latest).

The current release is [`Crunch-1.0.0-Windows.exe`](https://github.com/dipanshutadiyal-bit/crunch-editor/releases/download/v1.0.0/Crunch-1.0.0-Windows.exe). It is portable, so it does not need a traditional installer. Download it, open it, and keep it wherever you want on your computer.

The Run button uses the Python installation available on the computer. Install Python from [python.org](https://www.python.org/downloads/) if Python is not already available on Windows.

## What Crunch includes

- A clean, light workspace with a cookie-crack Crunch logo.
- Python files created through an explicit **Create file** action.
- `.py` filename validation so Python files stay organized.
- VS Code-style Python syntax highlighting powered by CodeMirror.
- Automatic indentation, bracket matching, and closing brackets.
- Python autocomplete while typing and with `Ctrl + Space` or `Cmd + Space`.
- Modern Python vocabulary, including lazy imports and newer Python modules.
- A real local Python Run action with loop output, error output, and a safety timeout.
- Native laptop saving in the Windows app through a Save File dialog.
- Browser download fallback when Crunch is opened on the web.
- Local browser storage for quick workspace recovery.

## Running from source

Crunch is a small Node and Electron application. To run the web version locally:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

To open the desktop version during development:

```bash
npm start
```

To build the portable Windows executable:

```bash
npm run dist:win
```

The generated file is placed in `dist/Crunch-1.0.0-Windows.exe`.

## Project layout

- `index.html` contains the editor workspace and interface structure.
- `styles.css` contains the Crunch visual system and CodeMirror theme.
- `app.js` contains file management, autocomplete, editor actions, and Run output handling.
- `server.js` serves the app and provides the local Python execution endpoint.
- `main.cjs` starts the Electron desktop window and local server.
- `preload.cjs` provides the secure native Save File bridge.
- `public/vendor/` contains the offline CodeMirror assets used by the desktop build.

## A note about Python versions

Crunch targets modern Python syntax in its editor vocabulary. The exact Python version used by the Run button is the Python runtime installed on the computer. This keeps the editor useful across different machines while making execution behavior honest and predictable.

## Contributing

Ideas, bug reports, and improvements are welcome. If something feels confusing or typing does not feel natural, please open an issue with a short description and, when possible, a small example that reproduces the problem.

## License

Crunch is released under the MIT License. See [`LICENSE`](LICENSE).
