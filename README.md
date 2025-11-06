# José's Aviation Calculators

A collection of experimental aviation calculators for pilots and flight planners. All calculations are performed client-side for instant results.

🌐 **Live at**: [joseflys.com](https://joseflys.com/)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jfromaniello/joseflys)

## Features

### 🛫 TAS Calculator
Calculate True Airspeed (TAS) from Calibrated Airspeed (CAS), Outside Air Temperature (OAT), and Pressure Altitude using the ISA model.

- Based on International Standard Atmosphere (ISA) model
- Real-time calculations
- Shareable URLs with pre-filled values
- Dynamic Open Graph images for social sharing

### 🌬️ Wind & Course Calculator
Calculate wind correction angle, ground speed, compass heading, and wind components for accurate flight planning.

- Wind Correction Angle (WCA) calculation
- Ground Speed computation
- Compass Heading (including magnetic deviation)
- Headwind and Crosswind components
- Effective True Airspeed (ETAS)
- Time and fuel planning integration

### 📏 Distance Calculator
Calculate precise distances and bearings between any two coordinates using WGS-84 geodesic algorithms.

- **High-precision calculations** using GeographicLib (Karney's method)
- **WGS-84 ellipsoid model** for accurate distances worldwide
- **Initial bearing** (azimuth) calculations
- More accurate than Haversine, especially for:
  - Long distances (>1000 NM)
  - Polar regions
  - High-precision navigation

### 🔄 Unit Converter
Convert aviation units including distances, speeds, fuel volumes, temperatures, weight, and pressure.

- **Distance**: Nautical Miles, Statute Miles, Kilometers, Feet, Meters
- **Speed**: Knots, MPH, KPH, FPM, MPS
- **Fuel Volume**: US Gallons, Liters, Imperial Gallons, Pounds (Jet-A & Avgas)
- **Temperature**: Celsius, Fahrenheit, Kelvin
- **Weight**: Pounds, Kilograms
- **Pressure**: inHg, hPa, mmHg, PSI

Inspired by the Jeppesen CR-3 flight computer.

### 📊 Flight Planning Calculator
Calculate time, speed, distance, and fuel consumption. Solve any flight planning problem by entering two known values.

- **Time-Speed-Distance**: Calculate any variable given the other two
- **Fuel Consumption**: Calculate fuel required, flow rate, endurance, or available fuel

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Testing**: Vitest with TypeScript
- **Geodesic Calculations**: GeographicLib (geographiclib-geodesic)
- **Maps**: Leaflet with React Leaflet
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/jfromaniello/joseflys.git
cd joseflys

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Build

```bash
# Create a production build
npm run build

# Start the production server
npm start
```

## Project Structure

```
tas-calculator/
├── app/
│   ├── tas/              # TAS calculator page
│   ├── course/           # Wind & course calculator page
│   ├── distance/         # Distance calculator page
│   ├── conversions/      # Unit converter page
│   ├── planning/         # Flight planning calculator page
│   ├── api/              # API routes (OG images, geocoding)
│   └── components/       # Shared components
├── lib/
│   ├── distanceCalculations.ts      # WGS-84 geodesic calculations
│   ├── distanceCalculations.test.ts # Tests for distance calculations
│   ├── courseCalculations.ts        # Wind triangle calculations
│   ├── flightPlanningCalculations.ts
│   ├── unitConversions.ts
│   └── compassDeviation.ts
├── public/
│   ├── sitemap.xml       # Sitemap for search engines
│   └── robots.txt        # Robots.txt for search engines
├── vitest.config.ts      # Vitest configuration
└── package.json
```

## Features in Detail

### ISA Model Calculations
All calculations are based on the International Standard Atmosphere (ISA) model:
- Sea level pressure: 1013.25 hPa
- Sea level temperature: 15°C
- Temperature lapse rate: -1.98°C per 1000 ft

### WGS-84 Geodesic Calculations
Distance and bearing calculations use the WGS-84 ellipsoid model:
- **Algorithm**: Karney's method via GeographicLib
- **Accuracy**: Superior to Haversine (accounts for Earth's ellipsoidal shape)
- **Use cases**: Long-distance navigation, polar routes, high-precision planning
- **Test coverage**: 25+ unit tests validating accuracy across all scenarios

### Wind Triangle Calculations
Wind calculations use vector mathematics to compute:
- Wind correction angle using trigonometry
- Ground speed from true airspeed and wind vectors
- Heading corrections for magnetic deviation

### Shareable URLs
All calculators support URL parameters for sharing specific calculations:
- TAS: `?cas=90&oat=8&alt=4000`
- Course: `?wd=270&ws=20&th=360&tas=100`
- Distance: Geocoded locations stored in URL
- Conversions: `?cat=distance&val=100&from=nm`
- Planning: `?mode=time-speed-distance&gs=120&dist=240`

## Browser Support

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for any purpose.

## Author

Created by [José Romaniello](https://twitter.com/jfroma)

GitHub: [@jfromaniello](https://github.com/jfromaniello)

## Disclaimer

These are experimental calculators for educational and flight planning purposes. Always verify critical calculations with certified equipment and follow official procedures for flight operations.

## Acknowledgments

- Inspired by the Jeppesen CR-3 flight computer
- Based on International Standard Atmosphere (ISA) model
- Geodesic calculations powered by [GeographicLib](https://geographiclib.sourceforge.io/) (Charles Karney)
- Built with Next.js and React
