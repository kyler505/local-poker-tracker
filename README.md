# Local Poker Tracker

A web application for tracking poker sessions, player statistics, and bankroll management. Built with Next.js, TypeScript, and Supabase.

## Features

- **Session Management**: Track poker sessions with date, location, and status
- **Player Tracking**: Monitor individual player performance with detailed statistics
- **Transaction Ledger**: Record buy-ins, cash-outs, and calculate net profit automatically
- **Dashboard Analytics**:
  - Total sessions and money circulated
  - Leaderboard with win rates
  - Bankroll charts showing cumulative profit over time
  - Player comparison charts
  - Date range filtering (7 days, 30 days, 90 days, all time, custom)
- **Player Profiles**: Individual player pages with:
  - Total profit/loss
  - Best win and worst loss
  - Average profit per session
  - Cumulative profit chart
  - Session-by-session results

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Radix UI, Lucide React icons

## Project Structure

```
local-poker-tracker/
├── web/                    # Next.js web application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   │   ├── page.tsx   # Dashboard/home page
│   │   │   ├── players/   # Player pages
│   │   │   └── sessions/  # Session pages
│   │   ├── components/    # React components
│   │   │   ├── dashboard/ # Dashboard charts and tables
│   │   │   └── ui/        # Reusable UI components
│   │   └── lib/           # Utilities and Supabase client
│   └── scripts/           # Utility scripts (CSV import)
├── supabase/              # Database schema and migrations
│   ├── schema.sql         # Database schema
│   └── migration/         # Migration scripts
└── types/                 # Shared TypeScript types
```

## Prerequisites

- Node.js 20.x
- npm or yarn
- Supabase account and project

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd local-poker-tracker
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the schema SQL in your Supabase SQL editor:

```bash
cat supabase/schema.sql
```

Copy and paste the contents into the Supabase SQL editor and execute it.

### 3. Configure environment variables

Create a `.env.local` file in the `web/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

You can find these values in your Supabase project settings under API.

### 4. Install dependencies

```bash
cd web
npm install
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses three main tables:

- **players**: Stores player information (name, nickname)
- **sessions**: Tracks poker sessions (date, location, status)
- **transactions**: Records buy-ins and cash-outs for each player per session

The `net_profit` column in the transactions table is automatically calculated as `cash_out_amount - buy_in_amount`.

## Importing Historical Data

You can import historical session data from CSV files using the import script:

### CSV Format

Create CSV files with the following columns:

```csv
date,location,player,nickname,buy_in,cash_out
2024-01-15,Home Game,John Doe,JD,100,150
2024-01-15,Home Game,Jane Smith,JS,100,50
```

- `date`: Session date in YYYY-MM-DD format
- `location`: Session location (e.g., "Home Game")
- `player`: Player name (will be created if it doesn't exist)
- `nickname`: Optional player nickname
- `buy_in`: Buy-in amount for the player in that session
- `cash_out`: Cash-out amount for the player in that session

### Running the Import

```bash
cd web
npm run import:csv -- ./path/to/csv-directory
```

The script will:
- Create players if they don't exist
- Create sessions if they don't exist (based on date and location)
- Upsert transactions for each player-session combination

## Available Scripts

In the `web/` directory:

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run import:csv` - Import CSV data (requires path argument)

## Building for Production

```bash
cd web
npm run build
npm run start
```

## License

This project is private and for personal use.
