# LangLink

Mobile-first MVP for two-person spoken translation.

## Stack

- SvelteKit, Vite, TypeScript, Bun
- Convex for room and participant metadata
- LiveKit for room presence and push-to-talk microphone delivery
- OpenAI Realtime Translation WebRTC with server-minted ephemeral client secrets

## Development

```sh
bun install
cp .env.example .env
bunx convex dev
bun run dev
```

Required environment variables are listed in `.env.example`. The browser never receives
`OPENAI_API_KEY` or `LIVEKIT_API_SECRET`; those are read only by SvelteKit server routes.

## Prototype Flow

1. Open `/` and create a room.
2. Share the room URL or QR code with the second phone.
3. Each participant opens the room, grants microphone permission, and starts from their own phone.
4. Hold push-to-talk to publish microphone audio through LiveKit.
5. The other phone sends that remote microphone track to OpenAI Realtime Translation.
6. OpenAI detects the spoken source language and plays translated audio locally on the listener's phone.

Headphones are recommended to reduce feedback, but each participant uses their own phone
microphone for the MVP.
