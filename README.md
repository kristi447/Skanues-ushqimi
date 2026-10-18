# The Preca Underground

Invite-only, end-to-end encrypted night chat. This repository is the **frontend**
(React + Vite + TypeScript). It runs on phones and laptops and can be added to the
home screen like an app.

## Run it

```bash
npm install
cp .env.example .env     # then edit
npm run dev              # http://localhost:5173 (also on your LAN for phone testing)
```

The app only opens between `VITE_OPEN_AT` and `VITE_CLOSE_AT` (default **20:00–21:00**,
the device's local time). While developing you can force the gate:

- `http://localhost:5173/?gate=open`: skip the clock screen
- `http://localhost:5173/?gate=closed`: see the clock screen

These overrides only exist in `npm run dev`, never in a production build.

With the default `VITE_BACKEND=mock` everything works offline: the access code is
`UNDERGROUND` (change it with `VITE_MOCK_CODE`) and a few fake members chat in the room.

```bash
npm run build      # production bundle in dist/
npm test           # unit tests
npm run typecheck
npm run format
```

## Flow

1. **Closed** (outside the window): analog clock with no numerals, a seconds ring that
   ticks, and a countdown to opening.
2. **Access**: flickering title and the access-code field. After 3 wrong codes the
   field locks for 30 s.
3. **Unlock**: a padlock built from live 0/1 digits decrypts, the key turns and the
   shackle lifts.
4. **Identity** (first visit only): alias field with flickering letters, plus avatar
   picker.
5. **Channels**: the single room.
6. **Chat**:
   - Clock top centre, with a pulsing `ENCRYPTED` badge.
   - Friends write in green, you in neon cyan.
   - Each friend shows a small online dot: pulsing green when online, still white when
     offline.

When the window closes mid-session, everyone sees **CONNECTION TERMINATED**, a CRT
power-off, then the clock screen. The server should enforce the window too.

## Customise

| What           | Where                                                                              |
| -------------- | ---------------------------------------------------------------------------------- |
| Room name      | `VITE_ROOM_NAME` (or return it from your backend's `/rooms`)                       |
| Open hours     | `VITE_OPEN_AT`, `VITE_CLOSE_AT`                                                    |
| Avatars        | Drop square images into `src/assets/avatars/` (`06-name.jpg` ...). Picked up automatically |
| Colours        | `src/styles/global.css` → `--g` (green), `--c` (cyan)                              |
| Alias rules    | `src/config.ts` → `nickname`                                                        |

## Backend contract (`VITE_BACKEND=http`)

The adapter lives in `src/api/http.ts`. Adjust paths and fields there if your server
differs. All the UI depends on is the `Backend` interface in `src/api/types.ts`.

### Encryption

Message bodies are encrypted **on the device** with AES-256-GCM (WebCrypto,
`src/api/crypto.ts`). Two independent values are derived from the access code with
PBKDF2-SHA256 (250k iterations):

- `proof` (salt `preca-underground/v1/auth`): sent to the server to prove the user
  knows the code. **Store and compare this, never the raw code.**
- `key` (salt `preca-underground/v1/e2ee`): never leaves the device. It
  encrypts and decrypts messages.

The server only ever sees `proof` and ciphertext (`v1.<iv b64>.<ciphertext b64>`), so it
cannot read messages. Everyone with the same code shares the room key, so rotating the
code rotates the key.

### HTTP

| Method & path           | Body                                | Response                                   |
| ----------------------- | ----------------------------------- | ------------------------------------------ |
| `POST /auth/verify`     | `{ proof }`                         | `200 { ticket }` · `401` wrong code · `423` outside hours |
| `POST /users`           | `{ ticket, nickname, avatarId }`    | `{ token, user: Member }` · `4xx { error }` (e.g. alias taken) |
| `POST /sessions/resume` | `{ ticket }` + `Authorization: Bearer <token>` | `{ token, user: Member }`        |
| `GET /rooms`            | `Authorization: Bearer <token>`     | `[{ id, name, online? }]`                  |

`Member = { id, nickname, avatarId, online }`. `avatarId` is the image file name
without extension, for example `02-phantom`.

### WebSocket: `VITE_WS_URL?token=<token>&room=<roomId>`

Server → client:

```jsonc
{ "type": "history",  "messages": [WireMessage] }
{ "type": "message",  "message": WireMessage }
{ "type": "members",  "members": [Member] }
{ "type": "presence", "memberId": "…", "online": true }
{ "type": "ack",      "clientId": "…", "message": WireMessage }   // confirms your send
```

Client → server:

```jsonc
{ "type": "send", "clientId": "uuid", "ciphertext": "v1.…" }
```

`WireMessage = { id, senderId, ciphertext, sentAt /* ms epoch */ }`

The client reconnects automatically with backoff when the socket drops.

## Notes

- The phone keyboard is asked for dark mode (`color-scheme: dark`). iOS and most Android
  keyboards follow it, but a user's own keyboard settings can override it.
- Animations are transform/opacity/canvas only and time-based. The unlock sequence
  has a hard fallback timer, so it always completes even on a slow phone. Users with
  "reduce motion" turned on get calmer versions.
- `docs/reference/` holds the visual references the design was built from.
