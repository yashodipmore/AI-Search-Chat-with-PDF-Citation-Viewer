# CalQuity Frontend

This is the frontend application for CalQuity AI Search Chat, built with Next.js 14+ and the App Router.

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Key Features

- **Perplexity-style Chat Interface** - Clean, centered layout
- **Real-time Streaming** - SSE-based response streaming
- **Generative UI** - Charts, tables, cards rendered progressively
- **PDF Viewer** - Smooth animated transitions with zoom/navigation
- **Dark Mode** - Full dark mode support

## Tech Stack

- Next.js 14+ (App Router)
- React 18
- TypeScript
- Zustand (State Management)
- TanStack Query (Server State)
- Framer Motion (Animations)
- react-pdf (PDF Rendering)
- Tailwind CSS (Styling)
