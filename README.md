# Brew Journal

A coffee brewing journal application to track your brews, recipes, equipment, and coffee beans.

## Project Structure

```
├── client/             # React frontend (Vite + TypeScript)
├── server/             # Express backend with SQLite
│   └── scripts/        # Server-side TypeScript utilities
├── scripts/            # Shell scripts for operations
│   ├── deploy.sh       # Build and deploy the application
│   ├── app.sh          # Start/stop/restart the application
│   ├── commit-push.sh  # Git commit and push helper
│   ├── migrate_upload.sh       # Migrate uploads to user folders
│   └── cleanup_orphan_upload.sh # Remove orphan upload files
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installing Node.js on Linux

Using NodeSource (recommended for latest LTS):

```bash
# Download and run NodeSource setup script (Node.js 20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js (includes npm)
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

Alternative using nvm (Node Version Manager):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Reload shell
source ~/.bashrc

# Install and use Node.js 20
nvm install 20
nvm use 20

# Verify installation
node --version
npm --version
```

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

### Upload Management

Uploads are organized into user-specific folders based on email address.

```bash
# Migrate existing uploads to user folders (dry run)
./scripts/migrate_upload.sh

# Migrate existing uploads to user folders (live)
./scripts/migrate_upload.sh --run

# Find and remove orphan upload files (dry run)
./scripts/cleanup_orphan_upload.sh

# Find and remove orphan upload files (live)
./scripts/cleanup_orphan_upload.sh --run
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

# Optional: EmailJS for contact form and password reset
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
EMAILJS_PASSWORD_RESET_TEMPLATE_ID=your_reset_template_id

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

- **JWT Authentication**: Secure token-based authentication with 30-day expiry
- **Password Hashing**: Bcrypt with 12 rounds for secure password storage
- **Google OAuth**: Server-side token verification for Google Sign-In
- **Rate Limiting**: Protection against brute force attacks
  - Auth endpoints: 20 attempts per 10 minutes
  - Password reset: 5 attempts per hour
  - General API: 100 requests per minute
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, XSS filter)
- **Input Validation**: Zod schemas for API input validation
- **User Data Isolation**: All data queries filtered by authenticated user ID (IDOR protection)
- **User-Specific Uploads**: Files organized in user folders with ownership verification
- **Path Traversal Protection**: Strict filename validation for uploads

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express, TypeScript, better-sqlite3
- **Database**: SQLite
- **Authentication**: JWT, bcrypt, Google OAuth
- **Security**: Helmet, express-rate-limit, Zod validation
