# Spin Wheel

A React + Vite spin-the-wheel app for making random selections from a list of options. The project uses Tailwind CSS for styling and includes a reusable wheel component for the main interaction.

## Features

- Interactive spinning wheel
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

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

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
