# The Preca Underground

Invite-only, end-to-end encrypted night chat. The whole frontend is **one file**:
[`index.html`](index.html). It has no build step and no dependencies. The fonts and
avatars are embedded inside it, so nothing can fail to load.

## Try it

Open `index.html` in a browser with the URL ending in `?gate=open` (or serve the
folder, e.g. `python3 -m http.server`, and visit `http://localhost:8000/?gate=open`).

- The default `BACKEND: 'mock'` runs offline with fake members. The access code is
  `UNDERGROUND`.
- `?gate=open` and `?gate=closed` only work in mock mode. They let you see the app
  outside the 20:00–21:00 window.

## Merge with your backend

1. Serve `index.html` from your server.
2. In the `CONFIG` block at the top of the script set `BACKEND: 'http'`.
   - `API_URL: ''` means same origin.
   - `WS_URL: ''` means `ws(s)://<host>/ws`.
3. Implement the endpoints in the **BACKEND CONTRACT** comment right under `CONFIG`:
   `POST /auth/verify`, `POST /users`, `POST /sessions/resume`, `GET /rooms` and the
   `/ws` WebSocket events.

Encryption happens in the browser with AES-256-GCM:

- **proof:** derived from the access code with PBKDF2 and sent to the server. Check
  this proof, never the raw code.
- **key:** also derived from the code, but it never leaves the device.

The server only ever sees ciphertext. WebCrypto requires **HTTPS** (or localhost).

## Customise (all in `CONFIG`)

| Setting                  | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `ROOM_NAME`              | the single room's name                                      |
| `OPEN_AT` / `CLOSE_AT`   | nightly window, phone's local time                          |
| `EXTRA_AVATARS`          | add avatars: `{ id: '06', src: '/avatars/06.jpg' }`         |
| `MAX_CODE_ATTEMPTS`, `LOCKOUT_SECONDS` | wrong-code lockout                            |
| `NICK_MIN` / `NICK_MAX`  | alias length                                                |

Colours are CSS variables at the top of the `<style>`: `--g` is green and `--c` is
cyan.

## Notes

- Animations always run, including on phones with "Reduce Motion" on, because
  they're part of the experience.
- Every animation is driven by elapsed time and torn down with its screen. The
  unlock sequence has a hard fallback timer, so it always completes.
- `docs/reference/` holds the visual references the design follows.
