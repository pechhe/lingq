# LangLink

Mobile-first MVP for two-person spoken translation.

## Stack

- SvelteKit, Vite, TypeScript, Bun
- Convex for room and participant metadata
- LiveKit for room presence and push-to-talk microphone delivery
- OpenAI Realtime Translation WebRTC with server-minted ephemeral client secrets
- Stripe Checkout for subscription entry, once price IDs are configured

## Development

```sh
bun install
cp .env.example .env
bunx convex dev
bun run dev
```

Required environment variables are listed in `.env.example`. `LIVEKIT_API_SECRET` is read
only by SvelteKit server routes. `OPENAI_API_KEY` remains server-side for the hosted
service path; users can also enter their own OpenAI key locally in the browser.

## Prototype Flow

1. Open `/` and choose either an OpenAI key or a subscription.
2. Continue to `/setup` and create a room.
3. Share the room URL or QR code with the second phone.
4. Each participant opens the room, grants microphone permission, and starts from their own phone.
5. Hold push-to-talk to publish microphone audio through LiveKit.
6. The other phone sends that remote microphone track to OpenAI Realtime Translation.
7. OpenAI detects the spoken source language and plays translated audio locally on the listener's phone.

Headphones are recommended to reduce feedback, but each participant uses their own phone
microphone for the MVP.
