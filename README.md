# Spin Wheel

A React + Vite spin-the-wheel app for making random selections from a list of options. The project uses Tailwind CSS for styling and includes a reusable wheel component for the main interaction.

## Features

- Interactive spinning wheel
- One spin per device, enforced server-side (with a `TRY AGAIN` exception)
- Custom option list support
- Responsive React UI
- Fast local development with Vite
- Tailwind CSS styling

## Tech Stack

- React
- Vite
- Tailwind CSS
- JavaScript

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Development uses `.env.development` with `VITE_APP_ENV=Development`, so spins are unlimited while testing locally.

Build for production:

```bash
npm run build
```

Run the production build with the spin-lock API:

```bash
npm start
```

You can also build and start in one command:

```bash
npm run serve:production
```

Production uses `.env.production` with `VITE_APP_ENV=Production`. In this mode the app calls `/api/spin-lock` before the wheel starts spinning. Local production stores spin history in `server/spin-store.json` and refuses another spin from that same device, even from another browser that produces the same device fingerprint.

## Vercel deployment

Vercel does not run `server/index.js` as a persistent server, so the API must live in `api/spin-lock.js`. This repo now includes that serverless function and a `vercel.json` SPA rewrite.

If you want the frontend to talk to Supabase directly, use browser-safe env vars instead:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

When those env vars are present, the app talks to Supabase directly from the browser using RPC functions and a publishable key.

Run the SQL in `supabase/spin_lock.sql` inside the Supabase SQL editor before deploying. It creates the `spin_devices` table, enables RLS, revokes direct table access, and exposes only the `claim_spin_lock` and `get_spin_lock_status` RPC functions to the browser.

To reset local production testing, stop the server and delete `server/spin-store.json`.

## Spin-once logic

In production each device is allowed a **single spin**. The rule is enforced on the server (`server/index.js`) and keyed to a browser-neutral device fingerprint, so clearing `localStorage` — or opening another browser on the same machine — does not grant a new spin.

The one exception is **`TRY AGAIN`**: whenever a spin lands on it, the device is allowed to spin again. This repeats for as long as the wheel keeps landing on `TRY AGAIN`. The session only ends once the device lands on a real outcome — a prize, or `OOPS! BETTER LUCK` — after which further spins are refused.

In development (`VITE_APP_ENV=Development`) the lock is disabled entirely and spins are unlimited.

## Project Structure

```text
spin-wheel/
  src/
    components/
      Wheel.jsx
    App.jsx
    App.css
    index.css
  index.html
  vite.config.js
  package.json
```

## Tailwind CSS

Tailwind is loaded from `src/index.css`:

```css
@import "tailwindcss";
```

The Vite config uses the official Tailwind Vite plugin:

```js
import tailwindcss from '@tailwindcss/vite'
```

If Tailwind is not active, make sure the plugin is installed:

```bash
npm install -D @tailwindcss/vite
```

## Development Notes

The main app logic lives in `src/App.jsx`, and the spinning wheel UI is handled by `src/components/Wheel.jsx`. Global styles are split between `src/index.css` and `src/App.css`.
