# Subly
Find a sublease, post your own — your community's rental marketplace.

## Getting Started

### Prerequisites
- Node.js 18+ installed
- A free Mapbox account (get one at https://www.mapbox.com/)

### Setup

1. **Clone or navigate to the project**
   ```bash
   cd c:\Users\skyle\Projects\Subly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Get your Mapbox token**
   - Go to https://account.mapbox.com/
   - Sign up for a free account (if you don't have one)
   - Navigate to "Tokens" in the left sidebar
   - Copy your default public token

4. **Create `.env.local` file** in the project root:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and replace `your_mapbox_token_here` with your actual Mapbox token.

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Current Features
- ✅ Interactive Mapbox map centered on McGill University
- ✅ Sample listings displayed as markers on the map
- ✅ Click markers to view listing details in a popup
- ✅ Red "M" marker showing McGill's location

## Architecture
- **Frontend**: Next.js + React + TypeScript
- **Styling**: Tailwind CSS
- **Mapping**: Mapbox GL + react-map-gl
- **Database**: (Coming soon)

## Next Steps
- Database setup (PostgreSQL + Supabase)
- User authentication
- Listing creation form
- Listing detail pages
- Search & filter functionality

