# Brew Journal

A coffee brewing journal application to track your brews, recipes, equipment, and coffee beans.

## Project Structure

```
├── client/             # React frontend (Vite + TypeScript)
├── server/             # Express backend with SQLite
├── scripts/            # Utility scripts
│   ├── deploy.sh       # Build and deploy the application
│   ├── app.sh          # Start/stop/restart the application
│   └── commit-push.sh  # Git commit and push helper
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Deployment

```bash
# Build everything
./scripts/deploy.sh

# Start the application
./scripts/app.sh start
```

The application will be available at http://localhost:3003

### Application Control

```bash
# Start the server
./scripts/app.sh start

# Stop the server
./scripts/app.sh stop

# Restart the server
./scripts/app.sh restart

# Check status
./scripts/app.sh status

# View logs
./scripts/app.sh logs
```

### Git Workflow

```bash
# Commit and push changes
./scripts/commit-push.sh
```

### Environment Variables

Add to the root `.env` file:

```bash
# Gemini API Key for AI coffee bag scanning
# Get your API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development

For development, run the client and server separately:

```bash
# Terminal 1: Start the server (with hot reload)
cd server && npm run dev

# Terminal 2: Start the client (with hot reload)
cd client && npm run dev
```

The client dev server runs on port 5173 and proxies API requests to the server on port 3003.

## Features

- **Brew Tracking**: Log brews with detailed parameters (dose, grind, water, temperature, time)
- **Coffee Beans**: Manage beans with batches, track remaining weight, filter by roast type (espresso/pour-over)
- **AI Coffee Bag Scanner**: Take photos of coffee bags (front/back) to auto-fill bean information using Gemini AI
- **Recipes**: Create and save recipes with process steps for guided brewing
- **Equipment**: Track grinders, brewers, and coffee servers with photo uploads
- **Coffee Servers**: Manage servers with empty weight for automatic yield calculation
- **Brew History**: View, edit, and delete past brews with filtering and sorting
- **Analytics**: View brewing statistics and trends
- **Brew Comparison**: Compare multiple brews side by side
- **Brew Timer**: Timer with recipe steps, countdown sounds, flow rate display, and water tracking
- **Custom Templates**: Create custom brew note templates for consistent observations
- **Inventory Management**: Track coffee stock with low stock alerts
- **Export**: Export brew history to CSV or PDF
- **Share**: Share brew details via native share or clipboard

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express, TypeScript, better-sqlite3
- **Database**: SQLite
