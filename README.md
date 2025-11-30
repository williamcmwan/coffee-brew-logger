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

Copy `.env.example` to `.env` and configure:

```bash
# Required: JWT secret for authentication (generate a secure random string)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_secure_random_string_here

# Required for Google Sign-In
VITE_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional: Allowed origins for CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3003,https://your-domain.com

# Optional: Gemini API Key for AI coffee bag scanning
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: EmailJS for contact form
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key

# Optional: reCAPTCHA for contact form
VITE_RECAPTCHA_SITE_KEY=your_site_key
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

## Security Features

- **JWT Authentication**: Secure token-based authentication with 7-day expiry
- **Password Hashing**: Bcrypt with 12 rounds for secure password storage
- **Google OAuth**: Server-side token verification for Google Sign-In
- **Rate Limiting**: Protection against brute force attacks (20 attempts per 10 minutes for auth)
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- **Input Validation**: Zod schemas for API input validation

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express, TypeScript, better-sqlite3
- **Database**: SQLite
- **Authentication**: JWT, bcrypt, Google OAuth
- **Security**: Helmet, express-rate-limit, Zod validation
