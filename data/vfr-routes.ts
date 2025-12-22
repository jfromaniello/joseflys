/**
 * Popular VFR routes for SEO and example purposes.
 * Each route includes comprehensive flight planning information,
 * real-world tips, and SEO-optimized content.
 * 
 * FOCUS: General Aviation airports, not major commercial hubs.
 * These are realistic routes for PPL/IR pilots flying light aircraft.
 */

export interface VfrRoute {
  /** URL slug: origin-destination in lowercase (e.g., "kfrg-kbed") */
  slug: string;
  /** Origin airport */
  origin: {
    icao: string;
    name: string;
    city: string;
    state?: string;
    country: string;
    lat: number;
    lon: number;
    elevation: number; // feet
    ctaf?: string;
    atis?: string;
  };
  /** Destination airport */
  destination: {
    icao: string;
    name: string;
    city: string;
    state?: string;
    country: string;
    lat: number;
    lon: number;
    elevation: number;
    ctaf?: string;
    atis?: string;
  };
  /** Typical cruise TAS for this route in knots */
  typicalTas: number;
  /** Suggested VFR cruising altitudes */
  suggestedAltitudes: {
    eastbound: number[];
    westbound: number[];
  };
  /** SEO title */
  seoTitle: string;
  /** Meta description (150-160 chars) */
  metaDescription: string;
  /** H1 title for the page */
  pageTitle: string;
  /** Introduction paragraph */
  introduction: string;
  /** Route overview section */
  routeOverview: {
    heading: string;
    content: string;
  };
  /** Flight planning considerations */
  flightPlanning: {
    heading: string;
    content: string;
    bulletPoints: string[];
  };
  /** Airspace and navigation */
  airspaceNavigation: {
    heading: string;
    content: string;
    bulletPoints: string[];
  };
  /** Weather considerations */
  weatherConsiderations: {
    heading: string;
    content: string;
  };
  /** Landmarks and visual references */
  landmarks: {
    heading: string;
    items: Array<{
      name: string;
      description: string;
    }>;
  };
  /** Alternate airports */
  alternates: Array<{
    icao: string;
    name: string;
    distance: string;
    notes: string;
  }>;
  /** Tips from experienced pilots */
  pilotTips: string[];
  /** Related routes for internal linking */
  relatedRoutes: string[];
  /** Keywords for SEO */
  keywords: string[];
  /** Region for grouping */
  region: "us-northeast" | "us-southeast" | "us-west" | "us-midwest" | "us-southwest" | "europe" | "other";
}

export const VFR_ROUTES: VfrRoute[] = [
  // ===== REPUBLIC (LONG ISLAND) TO BEDFORD (BOSTON AREA) =====
  {
    slug: "kfrg-kbed",
    origin: {
      icao: "KFRG",
      name: "Republic Airport",
      city: "Farmingdale",
      state: "NY",
      country: "USA",
      lat: 40.7288,
      lon: -73.4134,
      elevation: 82,
      ctaf: "118.8",
      atis: "124.2",
    },
    destination: {
      icao: "KBED",
      name: "Laurence G. Hanscom Field",
      city: "Bedford",
      state: "MA",
      country: "USA",
      lat: 42.4700,
      lon: -71.2890,
      elevation: 133,
      ctaf: "118.5",
      atis: "128.4",
    },
    typicalTas: 120,
    suggestedAltitudes: {
      eastbound: [4500, 6500, 8500],
      westbound: [5500, 7500],
    },
    seoTitle: "Republic KFRG to Hanscom KBED Flight Calculator | NYC to Boston GA Route",
    metaDescription: "Plan your VFR flight from Republic Airport (Long Island) to Hanscom Field (Boston). Calculate course, wind correction, and ground speed for this 155 NM GA route.",
    pageTitle: "Republic (KFRG) to Hanscom (KBED) VFR Flight Calculator",
    introduction: "Planning a VFR flight from Long Island to the Boston area? This route from Republic Airport (KFRG) to Hanscom Field (KBED) is the classic general aviation alternative to the busy JFK-Logan corridor. Both airports are GA-friendly with excellent facilities, reasonable fees, and much simpler operations than the major commercial airports. This calculator provides real-time course calculations including wind correction angle, magnetic heading, and ground speed.",
    routeOverview: {
      heading: "Route Overview: Long Island to Boston",
      content: "The direct route from KFRG to KBED covers approximately 155 nautical miles on a true course of roughly 055°. Flight time in a typical single-engine aircraft at 120 knots TAS is between 1 hour 15 minutes and 1 hour 30 minutes depending on winds. The route crosses Long Island Sound, follows the Connecticut coastline, passes through Rhode Island, and enters Massachusetts. This is a well-established VFR corridor popular with GA pilots, offering excellent visual references and multiple GA airports for diversions along the way.",
    },
    flightPlanning: {
      heading: "Flight Planning Considerations",
      content: "This route offers a much simpler alternative to flying between the major commercial airports. Both Republic and Hanscom are busy GA fields with professional services but without the complexity of Class B operations.",
      bulletPoints: [
        "File a VFR flight plan with FSS for flight following and search and rescue",
        "Republic has multiple FBOs with competitive fuel prices - top off before departure",
        "Hanscom is a popular business aviation airport - expect professional ATC service",
        "Route stays mostly under or around the NYC Class B shelf - simpler than JFK departure",
        "Fuel planning: 25-30 gallons for a 172/Cherokee with standard VFR reserves",
        "Consider early morning departure to avoid afternoon sea breeze and traffic",
        "Check TFRs - stadium TFRs common near both ends (MetLife, Gillette Stadium)",
      ],
    },
    airspaceNavigation: {
      heading: "Airspace and Navigation",
      content: "This route is designed to minimize Class B encounters. Departing from Republic puts you under the New York Class B shelf, and Hanscom lies just outside the Boston Class B.",
      bulletPoints: [
        "New York Class B: Shelf over Long Island starts at 1,500-2,000 ft - stay below or request transition",
        "Bridgeport Class D (KBDR): May need to transition or fly around",
        "New Haven Class D (KHVN): Along the coast, easy to avoid if needed",
        "Providence Class C (KPVD): 5 NM radius, surface to 4,100 feet",
        "Boston Class B: Hanscom is just outside - no Class B clearance required",
        "Request flight following from New York Approach early (125.7)",
        "Boston Approach (124.4) for handoff approaching Hanscom",
      ],
    },
    weatherConsiderations: {
      heading: "Weather Considerations",
      content: "The Long Island Sound and coastal New England create unique weather patterns. Marine layers and sea fog are common, especially in spring and early summer mornings. The Connecticut and Rhode Island coastline can experience localized fog even when inland areas are clear. Summer afternoons often bring sea breezes that can create bumpy conditions near the coast. Check METARs for KFRG, KBDR, KHVN, KPVD, and KBED before departure. Winter brings nor'easters and icing concerns - always get a thorough weather briefing.",
    },
    landmarks: {
      heading: "Visual Landmarks and Navigation References",
      items: [
        { name: "Long Island Sound", description: "Major water crossing shortly after departure from KFRG. Easy to identify, provides constant position reference." },
        { name: "Connecticut Coastline", description: "Follow the shoreline eastbound. Cities of Bridgeport, New Haven, and New London clearly visible." },
        { name: "Thames River", description: "Distinctive river near New London/Groton. Submarine base visible. Good checkpoint before Rhode Island." },
        { name: "Narragansett Bay", description: "Large bay in Rhode Island. Providence visible to the north. Easy to identify from altitude." },
        { name: "Route 128/I-95", description: "Major highway loop around Boston. Hanscom is just inside the 128 belt, northwest of the city." },
        { name: "Minute Man National Park", description: "Adjacent to Hanscom Field. Historic site makes for easy identification on approach." },
      ],
    },
    alternates: [
      { icao: "KOWD", name: "Norwood Memorial", distance: "20 NM S of KBED", notes: "Good GA alternate, less busy than Hanscom" },
      { icao: "KPVD", name: "T.F. Green (Providence)", distance: "50 NM SW of KBED", notes: "Class C, full services, ILS approaches" },
      { icao: "KBDR", name: "Sikorsky Memorial", distance: "Midway point", notes: "Good fuel stop, Class D" },
      { icao: "KHVN", name: "Tweed-New Haven", distance: "70 NM from KFRG", notes: "Convenient coastal alternate" },
      { icao: "KGON", name: "Groton-New London", distance: "85 NM from KFRG", notes: "Easy coastal access, less congested" },
    ],
    pilotTips: [
      "Republic has great training environment - FBOs are used to student pilots and VFR traffic",
      "Hanscom can be busy with corporate jets - be ready for 'number 3, follow the Gulfstream'",
      "The coastline route is scenic and provides more emergency landing options than direct overwater",
      "Fuel at KFRG is often cheaper than Boston area - top off before departure",
      "KBED has good courtesy cars and crew cars available through the FBOs",
      "Monitor 121.5 throughout - busy corridor for all types of traffic",
      "Consider KOWD (Norwood) as alternate destination if Hanscom is too busy",
      "Summer weekends see increased traffic at both ends - plan accordingly",
    ],
    relatedRoutes: ["kvny-ksba", "kpao-kmry", "kdpa-kosh"],
    keywords: [
      "Republic to Hanscom flight",
      "KFRG KBED route",
      "Long Island to Boston VFR",
      "New York Boston GA route",
      "general aviation cross country",
      "Farmingdale to Bedford flight",
      "Northeast corridor VFR",
      "course calculator New York Boston",
      "wind correction calculator",
    ],
    region: "us-northeast",
  },

  // ===== VAN NUYS TO SANTA BARBARA =====
  {
    slug: "kvny-ksba",
    origin: {
      icao: "KVNY",
      name: "Van Nuys Airport",
      city: "Van Nuys",
      state: "CA",
      country: "USA",
      lat: 34.2098,
      lon: -118.4900,
      elevation: 802,
      ctaf: "118.45",
      atis: "118.45",
    },
    destination: {
      icao: "KSBA",
      name: "Santa Barbara Airport",
      city: "Santa Barbara",
      state: "CA",
      country: "USA",
      lat: 34.4262,
      lon: -119.8404,
      elevation: 10,
      ctaf: "119.7",
      atis: "121.1",
    },
    typicalTas: 120,
    suggestedAltitudes: {
      eastbound: [5500, 7500],
      westbound: [4500, 6500, 8500],
    },
    seoTitle: "Van Nuys KVNY to Santa Barbara KSBA Flight Calculator | SoCal Coastal VFR",
    metaDescription: "Calculate your VFR flight from Van Nuys to Santa Barbara. Get wind correction, heading, and flight time for this scenic 65 NM California coastal route.",
    pageTitle: "Van Nuys (KVNY) to Santa Barbara (KSBA) VFR Flight Calculator",
    introduction: "The Van Nuys to Santa Barbara route is one of the most popular VFR training and weekend flights in Southern California. This 65 nautical mile journey takes you from the busiest GA airport in the world to the beautiful American Riviera. The route offers stunning coastal views, straightforward navigation, and is perfect for building cross-country experience. Use this calculator to determine your wind correction angle, magnetic heading, and ground speed with current conditions.",
    routeOverview: {
      heading: "Route Overview: LA to Santa Barbara",
      content: "The route from KVNY to KSBA follows a true course of approximately 290° along the Ventura County coastline. Flight time is typically 30-40 minutes at 120 knots. Most pilots choose the coastal route via the Malibu coast and Point Mugu, which offers spectacular scenery and avoids the mountains. The alternate route over the Santa Susana Pass and through Ventura is shorter but involves more terrain considerations. This is an excellent first cross-country destination for student pilots.",
    },
    flightPlanning: {
      heading: "Flight Planning Considerations",
      content: "Van Nuys is an extremely busy airport with parallel runways and complex taxi procedures. Santa Barbara offers a more relaxed environment but still requires attention to the unique coastal approach.",
      bulletPoints: [
        "Van Nuys ATIS and ground control are critical - expect detailed taxi instructions",
        "Coastal route recommended for VFR - better emergency options and scenery",
        "Mountain route via 118/23 freeway requires higher altitude and terrain awareness",
        "Santa Barbara has noise abatement - review procedures before arrival",
        "Fuel: 15-20 gallons sufficient, but VNY has competitive prices - fill up",
        "TFR alert: Malibu area occasionally has celebrity TFRs - check NOTAMs",
        "Marine layer common at SBA - verify destination weather before departure",
      ],
    },
    airspaceNavigation: {
      heading: "Airspace and Navigation",
      content: "The LA Basin airspace is complex, but this route is designed to stay clear of the busiest areas. Van Nuys is under the LAX Class B shelf.",
      bulletPoints: [
        "Van Nuys Class D: Surface to 2,500 ft MSL",
        "Los Angeles Class B: Shelf starts at 2,500 ft over Van Nuys area",
        "Special Flight Rules Area: LA SFRA requires specific training if routing downtown",
        "Point Mugu NAS: R-2519 restricted area - verify status and avoid",
        "Oxnard/Camarillo: Both have Class D - can transition or avoid",
        "Santa Barbara Class C: 5 NM radius, surface to 4,000 ft",
        "Coastal route: Stay over water to avoid Class B, contact SoCal Approach",
      ],
    },
    weatherConsiderations: {
      heading: "Weather Considerations",
      content: "The Southern California coast has predictable but challenging weather patterns. Marine layer (June Gloom) is common from May through August, often clearing by mid-morning. Santa Barbara is particularly prone to coastal fog while Van Nuys remains clear. Santa Ana winds in fall can create turbulence through the passes. The Malibu coast can have localized wind effects. Always check PIREPs and verify Santa Barbara weather - it's common to depart VFR from Van Nuys and find Santa Barbara below minimums.",
    },
    landmarks: {
      heading: "Visual Landmarks and Navigation References",
      items: [
        { name: "Malibu Pier/Colony", description: "Famous beach community marks departure from LA basin. Easy to spot from altitude." },
        { name: "Point Dume", description: "Distinctive point jutting into ocean. Common VFR checkpoint on the coastal route." },
        { name: "Point Mugu", description: "Naval air station with restricted airspace. Easy landmark, stay clear of R-2519." },
        { name: "Oxnard/Channel Islands Harbor", description: "Large harbor complex. Camarillo Airport visible inland." },
        { name: "Ventura Pier", description: "Long pier, marks Ventura city. Continue coastal or head toward Ventura County line." },
        { name: "Oil Platforms", description: "Multiple offshore platforms between Ventura and Santa Barbara. Good position references." },
        { name: "UCSB Campus", description: "Large university campus visible near Santa Barbara. Marks 10 NM final approach." },
      ],
    },
    alternates: [
      { icao: "KCMA", name: "Camarillo", distance: "30 NM from KVNY", notes: "Great mid-route alternate, GA-friendly" },
      { icao: "KOXR", name: "Oxnard", distance: "35 NM from KVNY", notes: "Towered, good services, often clear when SBA foggy" },
      { icao: "KSZP", name: "Santa Paula", distance: "40 NM from KVNY", notes: "Classic GA airport, good fuel prices" },
      { icao: "KIZA", name: "Santa Ynez", distance: "25 NM inland from KSBA", notes: "Wine country alternate, often clear" },
    ],
    pilotTips: [
      "Van Nuys is busiest 8-10 AM and 4-6 PM - plan around peak times if new to the airport",
      "Always verify Point Mugu restricted area status - sometimes active with military traffic",
      "The coastal route adds only 5-10 minutes but is much more scenic and safer",
      "Santa Barbara's runway 25 approach over the water is beautiful but watch for birds",
      "SBA has great restaurants on the field - worth planning lunch around your arrival",
      "Return flight often has headwinds - plan fuel accordingly",
      "If SBA is foggy, Camarillo or Oxnard are usually clear alternatives",
      "Watch for paragliders near Malibu and hang gliders at various coastal points",
    ],
    relatedRoutes: ["kfrg-kbed", "kpao-kmry", "ktoa-kcrq"],
    keywords: [
      "Van Nuys Santa Barbara flight",
      "KVNY KSBA route",
      "Southern California VFR",
      "LA to Santa Barbara flight time",
      "Malibu coastal route",
      "SoCal cross country",
      "general aviation California",
      "course calculator Van Nuys",
      "VFR training flight California",
    ],
    region: "us-west",
  },

  // ===== TAMIAMI TO MARATHON (FLORIDA KEYS) =====
  {
    slug: "ktmb-kmth",
    origin: {
      icao: "KTMB",
      name: "Miami Executive Airport (Tamiami)",
      city: "Miami",
      state: "FL",
      country: "USA",
      lat: 25.6479,
      lon: -80.4328,
      elevation: 8,
      ctaf: "123.85",
      atis: "124.6",
    },
    destination: {
      icao: "KMTH",
      name: "Florida Keys Marathon Airport",
      city: "Marathon",
      state: "FL",
      country: "USA",
      lat: 24.7261,
      lon: -81.0514,
      elevation: 7,
      ctaf: "118.65",
      atis: "135.975",
    },
    typicalTas: 110,
    suggestedAltitudes: {
      eastbound: [3500, 5500],
      westbound: [2500, 4500],
    },
    seoTitle: "Tamiami KTMB to Marathon KMTH Flight Calculator | Florida Keys VFR Route",
    metaDescription: "Plan your scenic VFR flight from Miami Tamiami to Marathon in the Florida Keys. Calculate course, wind correction, and flight time for this stunning 85 NM route.",
    pageTitle: "Tamiami (KTMB) to Marathon (KMTH) VFR Flight Calculator",
    introduction: "The flight from Miami's Tamiami Airport to Marathon in the Florida Keys is one of the most beautiful VFR routes in the United States. This 85 nautical mile journey takes you over the stunning turquoise waters of Florida Bay and the Atlantic, with the famous Overseas Highway and Seven Mile Bridge visible below. Tamiami (KTMB) is a major GA training airport, making this an ideal destination for building cross-country experience while enjoying world-class scenery.",
    routeOverview: {
      heading: "Route Overview: Miami to the Keys",
      content: "The route from KTMB to KMTH follows a true course of approximately 220° across Florida Bay and along the Keys island chain. Flight time is typically 45 minutes to 1 hour at 110 knots. After departing Tamiami, you'll cross the Everglades transition zone before reaching the crystal-clear waters of Florida Bay. The route passes over Key Largo, Islamorada, and the famous Seven Mile Bridge before arriving at Marathon. This is consistently rated as one of the top scenic flights in North America.",
    },
    flightPlanning: {
      heading: "Flight Planning Considerations",
      content: "Tamiami is one of the busiest training airports in Florida, so you'll be comfortable with pattern work and busy frequencies. Marathon offers a relaxed Keys atmosphere with excellent facilities.",
      bulletPoints: [
        "Tamiami has multiple flight schools - expect training traffic in all patterns",
        "Overwater flight equipment recommended: life vests, flotation devices",
        "Marathon has 5,000 ft runway - plenty for any light GA aircraft",
        "Fuel available at both airports - Marathon prices slightly higher",
        "ADIZ awareness: Stay well north of the Cuba ADIZ boundary",
        "File a VFR flight plan - good practice for the overwater segments",
        "Key West TFR occasionally active - verify if continuing beyond Marathon",
      ],
    },
    airspaceNavigation: {
      heading: "Airspace and Navigation",
      content: "The airspace for this route is relatively simple compared to the commercial airport alternatives. Most of the flight is through Class E and G airspace.",
      bulletPoints: [
        "Miami Class B: Tamiami is outside the Class B - no clearance needed for departure",
        "Homestead ARB: Class D to the southeast - easy to avoid on direct route",
        "Florida Keys: Mostly Class G and E airspace below 4,000 ft",
        "Marathon: Class E surface area, simple uncontrolled field with AWOS",
        "ADIZ: Invisible line south of the Keys - absolutely do not cross into Cuban airspace",
        "Miami Approach (119.65) for flight following early in the route",
        "Key West Approach (118.2) as you pass Islamorada",
      ],
    },
    weatherConsiderations: {
      heading: "Weather Considerations",
      content: "South Florida has tropical weather patterns with afternoon thunderstorms common from May through October. The Keys generally have better weather than the mainland due to the moderating effect of surrounding waters. Trade winds typically blow from the east-southeast at 10-15 knots, providing consistent headwinds on the outbound leg and tailwinds returning. Visibility is usually excellent over the water but can be reduced by haze or smoke during dry season. Morning flights avoid the afternoon convection that's typical in summer.",
    },
    landmarks: {
      heading: "Visual Landmarks and Navigation References",
      items: [
        { name: "Tamiami Trail (US-41)", description: "Major highway west of airport through the Everglades. Easy reference for departure." },
        { name: "Card Sound", description: "Large sound at the north end of Key Largo. Marks the transition to the Keys." },
        { name: "John Pennekamp State Park", description: "Famous underwater park at Key Largo. Distinctive reef patterns visible from altitude." },
        { name: "Islamorada", description: "'Sport Fishing Capital of the World' - multiple bridges and marinas visible." },
        { name: "Seven Mile Bridge", description: "Iconic landmark, one of the longest bridges in the US. Unmistakable from the air." },
        { name: "Marathon/Vaca Key", description: "Destination island. Airport clearly visible on the Atlantic side." },
      ],
    },
    alternates: [
      { icao: "KEYW", name: "Key West International", distance: "50 NM from KMTH", notes: "Towered, full services, continue if weather good" },
      { icao: "KOPF", name: "Opa-locka Executive", distance: "Return to Miami", notes: "Easy GA airport if turning back" },
      { icao: "KHST", name: "Homestead ARB", distance: "PPR only", notes: "Emergency use only, military" },
      { icao: "X49", name: "South Lakeland", distance: "Return option", notes: "Small Keys strip, fuel available" },
    ],
    pilotTips: [
      "Fly at 2,000-3,000 ft for the best views - low enough to see the reefs",
      "Bring a camera - this is a bucket-list VFR flight for most pilots",
      "Morning flights have calmer air and better visibility",
      "Marathon has a great Cuban restaurant on the field - plan for lunch",
      "Watch for seaplane traffic near Key Largo and throughout the Keys",
      "Fuel at Tamiami before departure - generally cheaper than Keys airports",
      "If doing the roundtrip same day, watch the headwind/tailwind effect on fuel",
      "Consider continuing to Key West if time allows - just 50 NM further",
    ],
    relatedRoutes: ["kvny-ksba", "kpao-kmry", "kfrg-kbed"],
    keywords: [
      "Tamiami Marathon flight",
      "KTMB KMTH route",
      "Florida Keys VFR",
      "Miami to Keys flight time",
      "Seven Mile Bridge flight",
      "Florida scenic flight",
      "Keys cross country",
      "course calculator Florida",
      "overwater VFR flight",
    ],
    region: "us-southeast",
  },

  // ===== PALO ALTO TO MONTEREY =====
  {
    slug: "kpao-kmry",
    origin: {
      icao: "KPAO",
      name: "Palo Alto Airport",
      city: "Palo Alto",
      state: "CA",
      country: "USA",
      lat: 37.4611,
      lon: -122.1150,
      elevation: 4,
      ctaf: "118.6",
      atis: "125.0",
    },
    destination: {
      icao: "KMRY",
      name: "Monterey Regional Airport",
      city: "Monterey",
      state: "CA",
      country: "USA",
      lat: 36.5870,
      lon: -121.8430,
      elevation: 257,
      ctaf: "118.4",
      atis: "118.4",
    },
    typicalTas: 110,
    suggestedAltitudes: {
      eastbound: [5500, 7500],
      westbound: [4500, 6500],
    },
    seoTitle: "Palo Alto KPAO to Monterey KMRY Flight Calculator | Bay Area Coastal VFR",
    metaDescription: "Calculate your VFR flight from Palo Alto to Monterey along California's coast. Get wind correction, heading, and ETA for this scenic 55 NM Bay Area route.",
    pageTitle: "Palo Alto (KPAO) to Monterey (KMRY) VFR Flight Calculator",
    introduction: "The Palo Alto to Monterey route is a Bay Area classic - a perfect VFR flight from Silicon Valley to the stunning Monterey Peninsula. This 55 nautical mile coastal journey offers views of the Santa Cruz Mountains, redwood forests, and the beautiful Monterey Bay. Palo Alto Airport is the quintessential Bay Area GA field, and Monterey provides a perfect destination with great restaurants and the famous Cannery Row nearby.",
    routeOverview: {
      heading: "Route Overview: Bay Area to Monterey",
      content: "The route from KPAO to KMRY follows a true course of approximately 155° southward along the coast. Flight time is typically 30-40 minutes at 110 knots. Pilots can choose between the direct route over the Santa Cruz Mountains or the scenic coastal route via Half Moon Bay and Santa Cruz. The coastal route adds about 10 minutes but offers better emergency landing options and spectacular scenery. Either way, you'll arrive at Monterey Bay with views of the famous aquarium and Cannery Row.",
    },
    flightPlanning: {
      heading: "Flight Planning Considerations",
      content: "Palo Alto is a busy uncontrolled field near the San Francisco Class B. Monterey is towered with a professional but relaxed atmosphere. The route requires awareness of the San Jose Class C and coastal weather patterns.",
      bulletPoints: [
        "Palo Alto has right traffic for Runway 31 - know the pattern before arriving",
        "San Jose Class C transition possible but not required for coastal route",
        "Marine layer affects both airports - afternoon usually clearer than morning",
        "Coastal route via Half Moon Bay adds scenery and emergency options",
        "Mountain route requires higher altitude and awareness of terrain",
        "Fuel: 15-20 gallons sufficient, both airports have 100LL",
        "Monterey often has military jet traffic - be prepared for wake turbulence callouts",
      ],
    },
    airspaceNavigation: {
      heading: "Airspace and Navigation",
      content: "The Bay Area airspace is complex but manageable with planning. The coastal route keeps you clear of most controlled airspace.",
      bulletPoints: [
        "Palo Alto: Under the SFO Class B shelf (floor 1,500 ft)",
        "San Jose Class C (KSJC): Can transition or route around to the west",
        "Coastal route: Stays over water and west of the Class C and B",
        "NorCal Approach (135.65) for flight following",
        "Monterey Class D: Tower frequency 118.4",
        "Watsonville (KWVI): Good waypoint and potential alternate",
        "Half Moon Bay (KHAF): Popular mid-route stop, uncontrolled",
      ],
    },
    weatherConsiderations: {
      heading: "Weather Considerations",
      content: "The Central California coast is famous for its marine layer and fog, especially from May through August. Known locally as 'May Gray' and 'June Gloom,' the fog typically forms overnight and burns off by late morning. The coast can be completely socked in while just a few miles inland is clear and sunny. Monterey is particularly prone to fog that can roll in quickly. Check Monterey's weather carefully and have a backup plan - Salinas (KSNS) is usually clear when Monterey is foggy.",
    },
    landmarks: {
      heading: "Visual Landmarks and Navigation References",
      items: [
        { name: "Half Moon Bay", description: "Distinctive crescent-shaped bay with small airport (KHAF). Popular mid-route checkpoint." },
        { name: "Santa Cruz Boardwalk", description: "Amusement park and pier visible from altitude. Marks Santa Cruz city." },
        { name: "Moss Landing Power Plant", description: "Two tall stacks visible for miles. Key landmark for Monterey Bay entry." },
        { name: "Monterey Bay Aquarium", description: "Large building on Cannery Row. Helps identify the peninsula." },
        { name: "Point Pinos Lighthouse", description: "Southern tip of Monterey Peninsula. Marks the bay entrance." },
        { name: "Carmel Valley", description: "Valley visible to the south, helps with airport orientation." },
      ],
    },
    alternates: [
      { icao: "KWVI", name: "Watsonville Municipal", distance: "15 NM N of KMRY", notes: "Inland, often clearer than Monterey" },
      { icao: "KSNS", name: "Salinas Municipal", distance: "10 NM E of KMRY", notes: "Usually clear when coast foggy" },
      { icao: "KHAF", name: "Half Moon Bay", distance: "30 NM from KPAO", notes: "Coastal alternate, can also be foggy" },
      { icao: "KSQL", name: "San Carlos", distance: "Return to Bay Area", notes: "If weather deteriorates" },
    ],
    pilotTips: [
      "Check Monterey ATIS before departure - field can go IFR quickly",
      "Watsonville or Salinas are great alternates when coast is foggy",
      "The mountain route over the Santa Cruz range offers beautiful redwood views",
      "Monterey's Runway 28R has a great view but watch for wind shear on approach",
      "Fisherman's Wharf is walkable from the airport for fresh seafood",
      "Return trip often has afternoon headwinds - plan fuel accordingly",
      "Watch for hang gliders near Pacifica and along the coast",
      "Weekend mornings can be busy at Palo Alto - arrive early or late to avoid traffic",
    ],
    relatedRoutes: ["kvny-ksba", "kfrg-kbed", "ktmb-kmth"],
    keywords: [
      "Palo Alto Monterey flight",
      "KPAO KMRY route",
      "Bay Area coastal VFR",
      "Silicon Valley to Monterey",
      "Monterey Bay flight",
      "California coast flying",
      "Half Moon Bay route",
      "course calculator Bay Area",
      "NorCal cross country",
    ],
    region: "us-west",
  },

  // ===== DUPAGE TO OSHKOSH =====
  {
    slug: "kdpa-kosh",
    origin: {
      icao: "KDPA",
      name: "DuPage Airport",
      city: "West Chicago",
      state: "IL",
      country: "USA",
      lat: 41.9078,
      lon: -88.2486,
      elevation: 759,
      ctaf: "120.9",
      atis: "120.175",
    },
    destination: {
      icao: "KOSH",
      name: "Wittman Regional Airport",
      city: "Oshkosh",
      state: "WI",
      country: "USA",
      lat: 43.9844,
      lon: -88.5570,
      elevation: 808,
      ctaf: "118.5",
      atis: "125.9",
    },
    typicalTas: 120,
    suggestedAltitudes: {
      eastbound: [4500, 6500],
      westbound: [3500, 5500],
    },
    seoTitle: "DuPage KDPA to Oshkosh KOSH Flight Calculator | Chicago to EAA Airventure Route",
    metaDescription: "Plan your VFR flight from DuPage Airport to Oshkosh. Calculate course, wind correction, and flight time for this classic 125 NM Midwest aviation route.",
    pageTitle: "DuPage (KDPA) to Oshkosh (KOSH) VFR Flight Calculator",
    introduction: "The route from Chicago's DuPage Airport to Oshkosh is a pilgrimage for aviation enthusiasts. Whether you're heading to EAA AirVenture or just visiting the aviation capital of Wisconsin, this 125 nautical mile flight takes you from one of Chicago's premier GA airports to the home of the world's greatest aviation celebration. This calculator helps you plan the perfect flight to 'the world's busiest airport' during late July.",
    routeOverview: {
      heading: "Route Overview: Chicago Area to Oshkosh",
      content: "The direct route from KDPA to KOSH covers approximately 125 nautical miles on a true course of roughly 345°. Flight time is typically 1 hour to 1 hour 15 minutes at 120 knots. The flight crosses the Wisconsin-Illinois border near Lake Geneva, passes west of Milwaukee, and arrives at Wittman Field. Outside of AirVenture week, this is a pleasant Midwest cross-country over farmland and lakes. During AirVenture (late July), special procedures apply and this becomes one of the most exciting arrivals in aviation.",
    },
    flightPlanning: {
      heading: "Flight Planning Considerations",
      content: "DuPage is a professional GA airport with excellent facilities. Oshkosh during normal operations is a standard towered field. During AirVenture, everything changes - study the NOTAM carefully.",
      bulletPoints: [
        "CRITICAL: During EAA AirVenture (late July), Oshkosh has special arrival/departure procedures",
        "AirVenture arrivals: Download and study the NOTAM thoroughly - unique procedures",
        "Non-AirVenture: Standard VFR arrival, contact Oshkosh Tower on 118.5",
        "DuPage has excellent services and is outside the O'Hare Class B",
        "Route passes west of Milwaukee Class C - easy to avoid or transition",
        "Fuel: Top off at DuPage - cheaper than Oshkosh during AirVenture",
        "File a VFR flight plan - good practice and recommended for AirVenture",
      ],
    },
    airspaceNavigation: {
      heading: "Airspace and Navigation",
      content: "This route is relatively simple for airspace, staying clear of the major Class B areas. The main consideration is Milwaukee's Class C.",
      bulletPoints: [
        "Chicago Class B: DuPage is well west and outside - no factor for departure",
        "Milwaukee Class C (KMKE): Route passes 10-15 NM west - no transition needed",
        "Waukesha (KUES): Possible waypoint, Class D field",
        "Fond du Lac (KFLD): Good checkpoint south of Oshkosh",
        "Oshkosh: Normal Class D; during AirVenture becomes special procedures",
        "Chicago Approach not needed; Milwaukee Approach (127.0) optional for flight following",
        "Oshkosh Tower (118.5) - or Fisk Approach during AirVenture",
      ],
    },
    weatherConsiderations: {
      heading: "Weather Considerations",
      content: "The Midwest offers generally good VFR weather in summer, though afternoon thunderstorms are common from June through August. The Great Lakes influence can create lake-effect clouds and fog, especially in spring and fall. Winds are typically from the southwest in summer, providing a slight tailwind on the northbound leg. During AirVenture week, weather becomes critical - even marginal VFR conditions cause massive delays in the arrival sequence. Always have a backup plan for AirVenture arrivals.",
    },
    landmarks: {
      heading: "Visual Landmarks and Navigation References",
      items: [
        { name: "Fox River", description: "Runs north through the region. Easy to follow from DuPage area northward." },
        { name: "Lake Geneva", description: "Popular resort lake near the Wisconsin border. Easy landmark." },
        { name: "Milwaukee Skyline", description: "Visible to the east. Keep it on your right as you pass." },
        { name: "Fond du Lac", description: "City at the south end of Lake Winnebago. Marks 20 NM to Oshkosh." },
        { name: "Lake Winnebago", description: "Large lake - Oshkosh is on the west shore at the north end." },
        { name: "EAA Museum", description: "Large complex visible from pattern altitude at KOSH." },
      ],
    },
    alternates: [
      { icao: "KFLD", name: "Fond du Lac", distance: "20 NM S of KOSH", notes: "Good alternate, especially during AirVenture" },
      { icao: "KUES", name: "Waukesha County", distance: "50 NM from KOSH", notes: "Midway point alternate" },
      { icao: "KENW", name: "Kenosha Regional", distance: "60 NM from KOSH", notes: "Return to Chicago area option" },
      { icao: "KATW", name: "Appleton", distance: "25 NM N of KOSH", notes: "Often used during AirVenture delays" },
    ],
    pilotTips: [
      "AirVenture arrival: Review the NOTAM multiple times - it's unlike any other arrival",
      "During AirVenture, monitor 124.5 Fisk Approach starting at Green Lake",
      "The Ripon-to-Fisk arrival is a once-in-a-lifetime experience - embrace it",
      "If not going to AirVenture, Oshkosh is still worth visiting for the EAA Museum",
      "DuPage has multiple FBOs - shop around for best fuel price",
      "Watch for increased VFR traffic in the region during AirVenture week",
      "Pack light for AirVenture - camping under the wing is part of the experience",
      "Return flight from Oshkosh: Depart early morning to avoid AirVenture traffic",
    ],
    relatedRoutes: ["kfrg-kbed", "kvny-ksba", "ktmb-kmth"],
    keywords: [
      "DuPage to Oshkosh flight",
      "KDPA KOSH route",
      "EAA AirVenture flight",
      "Chicago to Oshkosh",
      "Midwest VFR route",
      "Oshkosh arrival",
      "AirVenture approach",
      "course calculator Wisconsin",
      "general aviation Midwest",
    ],
    region: "us-midwest",
  },

  // ===== TORRANCE TO CARLSBAD =====
  {
    slug: "ktoa-kcrq",
    origin: {
      icao: "KTOA",
      name: "Zamperini Field",
      city: "Torrance",
      state: "CA",
      country: "USA",
      lat: 33.8034,
      lon: -118.3396,
      elevation: 101,
      ctaf: "124.0",
      atis: "127.225",
    },
    destination: {
      icao: "KCRQ",
      name: "McClellan-Palomar Airport",
      city: "Carlsbad",
      state: "CA",
      country: "USA",
      lat: 33.1283,
      lon: -117.2801,
      elevation: 331,
      ctaf: "132.35",
      atis: "127.225",
    },
    typicalTas: 115,
    suggestedAltitudes: {
      eastbound: [4500, 6500],
      westbound: [3500, 5500],
    },
    seoTitle: "Torrance KTOA to Carlsbad KCRQ Flight Calculator | SoCal Beach Cities VFR",
    metaDescription: "Calculate your VFR flight from Torrance to Carlsbad along the SoCal coast. Get wind correction, heading, and ETA for this scenic 75 NM beach cities route.",
    pageTitle: "Torrance (KTOA) to Carlsbad (KCRQ) VFR Flight Calculator",
    introduction: "The Torrance to Carlsbad flight is a beautiful coastal journey through Southern California's beach cities. This 75 nautical mile route takes you from the South Bay's Zamperini Field to San Diego County's McClellan-Palomar Airport, passing legendary surf spots like Huntington Beach, Newport, and San Clemente. Both airports are GA-friendly facilities that avoid the complexity of LAX and SAN, making this an ideal SoCal cross-country for pilots of all experience levels.",
    routeOverview: {
      heading: "Route Overview: South Bay to North County San Diego",
      content: "The coastal route from KTOA to KCRQ follows a true course of approximately 135° along the Orange and San Diego County coastlines. Flight time is typically 40-50 minutes at 115 knots. The route stays over the beach cities, providing stunning views of the Pacific Ocean, harbor complexes, and famous surf breaks. This is a popular training route for SoCal flight schools and a great weekend destination for the pilot who wants beach time after landing.",
    },
    flightPlanning: {
      heading: "Flight Planning Considerations",
      content: "Torrance is a busy GA airport with active flight training. Carlsbad offers a relaxed North County San Diego atmosphere with excellent dining nearby.",
      bulletPoints: [
        "Torrance has complex traffic patterns - review before arrival or departure",
        "Coastal route keeps you clear of Los Angeles Class B airspace",
        "John Wayne (KSNA) Class C can be transitioned or avoided via offshore route",
        "Camp Pendleton restricted airspace - stay over water or obtain clearance",
        "San Diego Class B shelf starts north of Carlsbad - stay below or call SoCal",
        "Fuel: 20-25 gallons sufficient, competitive prices at both airports",
        "TFR check: Nixon Library, Disneyland, and Camp Pendleton NOTAMs common",
      ],
    },
    airspaceNavigation: {
      heading: "Airspace and Navigation",
      content: "The SoCal coast has multiple Class C and D fields, but the coastal route simplifies navigation by staying over water.",
      bulletPoints: [
        "Torrance Class D: Surface to 2,500 ft",
        "Los Angeles Class B: Shelf starts at 2,500 ft - coastal route stays under or around",
        "Long Beach Class D (KLGB): Easy to avoid via coastal route",
        "John Wayne Class C (KSNA): 5 NM radius - offshore route avoids",
        "Camp Pendleton: R-2503 restricted area - check NOTAM, often need to go offshore",
        "Carlsbad Class D: Surface to 2,600 ft, Tower on 132.35",
        "SoCal Approach (119.6 south) for flight following",
      ],
    },
    weatherConsiderations: {
      heading: "Weather Considerations",
      content: "The SoCal coastline enjoys excellent VFR weather year-round, with some seasonal variations. June Gloom (May-June) brings morning marine layer that typically burns off by noon. Santa Ana winds in fall create clear skies but gusty, turbulent conditions, especially near terrain. Summer afternoons can have onshore flow creating light chop near the coast. Visibility is usually exceptional - 10+ miles on most days. Catalina Island is often visible from cruise altitude on clear days.",
    },
    landmarks: {
      heading: "Visual Landmarks and Navigation References",
      items: [
        { name: "Palos Verdes Peninsula", description: "Distinctive peninsula south of Torrance. Great reference point for departure." },
        { name: "Long Beach Harbor", description: "Large port complex with Queen Mary. Easy landmark." },
        { name: "Huntington Beach Pier", description: "'Surf City USA' - long pier and distinctive downtown visible." },
        { name: "Newport Harbor", description: "Balboa Peninsula and harbor complex. Marks Orange County." },
        { name: "Dana Point Harbor", description: "Harbor with distinctive headlands. Last landmark before Camp Pendleton." },
        { name: "San Onofre Nuclear Plant", description: "Two dome structures on the coast at Camp Pendleton. Unmistakable." },
        { name: "Oceanside Pier", description: "Long wooden pier marks Oceanside. Carlsbad is just south." },
      ],
    },
    alternates: [
      { icao: "KSNA", name: "John Wayne (Santa Ana)", distance: "35 NM from KTOA", notes: "Class C but GA-friendly, good services" },
      { icao: "KFUL", name: "Fullerton Municipal", distance: "25 NM from KTOA", notes: "Inland alternate, usually clear" },
      { icao: "KSDM", name: "Brown Field", distance: "45 NM from KCRQ", notes: "South San Diego option" },
      { icao: "KOKB", name: "Oceanside Municipal", distance: "10 NM from KCRQ", notes: "Smaller field, good alternate" },
    ],
    pilotTips: [
      "Torrance has right traffic for Runway 29R - know the pattern",
      "Offshore route avoids most airspace but adds a few minutes",
      "Camp Pendleton is often restricted - check NOTAMs and have backup plan",
      "Carlsbad has great restaurants within walking distance - The Brigantine is popular",
      "Return flight often has headwinds from the northwest - plan fuel accordingly",
      "Watch for skydiving activity near Oceanside (KOKB area)",
      "Catalina Island makes for a great side trip if you have the time",
      "Avoid flying directly over the nuclear plant - no TFR but best practice",
    ],
    relatedRoutes: ["kvny-ksba", "kpao-kmry", "ktmb-kmth"],
    keywords: [
      "Torrance Carlsbad flight",
      "KTOA KCRQ route",
      "Southern California coastal VFR",
      "Orange County flight",
      "SoCal beach cities route",
      "LA to San Diego GA",
      "Camp Pendleton routing",
      "course calculator SoCal",
      "coastal cross country California",
    ],
    region: "us-west",
  },

  // ===== ARGENTINA: SAN FERNANDO TO GENERAL RODRIGUEZ =====
  {
    slug: "sadf-safg",
    origin: {
      icao: "SADF",
      name: "Aeródromo San Fernando",
      city: "San Fernando",
      state: "Buenos Aires",
      country: "Argentina",
      lat: -34.4533,
      lon: -58.5897,
      elevation: 10,
      ctaf: "122.5",
    },
    destination: {
      icao: "SAFG",
      name: "Aeródromo General Rodríguez",
      city: "General Rodríguez",
      state: "Buenos Aires",
      country: "Argentina",
      lat: -34.5908,
      lon: -58.9869,
      elevation: 30,
      ctaf: "122.8",
    },
    typicalTas: 100,
    suggestedAltitudes: {
      eastbound: [1500, 2500],
      westbound: [2000, 3000],
    },
    seoTitle: "San Fernando SADF a General Rodríguez SAFG | Calculador de Ruta VFR",
    metaDescription: "Calculá tu vuelo VFR desde San Fernando a General Rodríguez. Obtené corrección de viento, rumbo y velocidad para esta ruta clásica de 25 MN en Buenos Aires.",
    pageTitle: "San Fernando (SADF) a General Rodríguez (SAFG) - Calculador VFR",
    introduction: "La ruta de San Fernando a General Rodríguez es un clásico vuelo de navegación para pilotos argentinos. Este trayecto de 25 millas náuticas es ideal para vuelos de práctica, travesías cortas y familiarización con el espacio aéreo del Área Terminal Buenos Aires. Ambos aeródromos son muy utilizados por la comunidad de aviación general del Gran Buenos Aires. Usá esta calculadora para determinar tu ángulo de corrección de viento, rumbo magnético y velocidad con las condiciones actuales.",
    routeOverview: {
      heading: "Descripción de la Ruta: San Fernando a General Rodríguez",
      content: "La ruta directa desde SADF a SAFG cubre aproximadamente 25 millas náuticas con un rumbo verdadero de unos 250°. El tiempo de vuelo es típicamente 15-20 minutos a 100 nudos. El vuelo cruza la zona oeste del Gran Buenos Aires, pasando sobre áreas suburbanas y rurales. Esta es una excelente ruta para pilotos que están construyendo horas de navegación o practicando procedimientos de travesía en el espacio aéreo argentino.",
    },
    flightPlanning: {
      heading: "Consideraciones de Planificación",
      content: "San Fernando es uno de los aeródromos más activos del área metropolitana con mucho tránsito de instrucción. General Rodríguez ofrece un ambiente más tranquilo y rural.",
      bulletPoints: [
        "Consultar NOTAM de ambos aeródromos antes del vuelo",
        "Coordinar con San Fernando Radio (122.5) antes del despegue",
        "Ruta pasa al sur del CTR Ezeiza - mantener fuera del espacio controlado",
        "Combustible: 15-20 litros suficientes para un Cessna 150/152",
        "Llevar carta VFR actualizada del área Buenos Aires",
        "Verificar pronóstico - niebla matinal común en invierno",
        "Plan de vuelo recomendado aunque no obligatorio para VFR local",
      ],
    },
    airspaceNavigation: {
      heading: "Espacio Aéreo y Navegación",
      content: "El área metropolitana de Buenos Aires tiene espacio aéreo complejo. Esta ruta está diseñada para mantenerse fuera de las zonas más restrictivas.",
      bulletPoints: [
        "CTR Aeroparque (SABE): Evitar - queda al sur de San Fernando",
        "CTR Ezeiza (SAEZ): La ruta pasa al norte - mantenerse fuera",
        "TMA Buenos Aires: Techo variable - verificar carta actualizada",
        "San Fernando no tiene torre - operación con procedimientos de radio",
        "General Rodríguez: Aeródromo no controlado, anunciar posiciones",
        "Frecuencia en ruta: 122.5 o 122.8 según proximidad",
        "Contactar Ezeiza Approach si se requiere transitar espacio controlado",
      ],
    },
    weatherConsiderations: {
      heading: "Consideraciones Meteorológicas",
      content: "La zona del Gran Buenos Aires tiene clima templado con estaciones marcadas. El invierno trae frecuentes nieblas matinales y bancos de niebla en zonas bajas cerca del Río de la Plata y el Delta. El verano puede traer tormentas convectivas por la tarde, especialmente de noviembre a marzo. Los vientos predominantes son del este y noreste (Sudestada) o del sur (Pampero). La visibilidad suele ser buena pero puede reducirse significativamente con humo de quemas en el Delta durante épocas secas.",
    },
    landmarks: {
      heading: "Referencias Visuales y Puntos de Navegación",
      items: [
        { name: "Río Reconquista", description: "Curso de agua que cruza la zona. Fácil de identificar desde el aire." },
        { name: "Autopista del Oeste (Acceso Oeste)", description: "Autopista que corre paralela a la ruta. Excelente referencia de navegación." },
        { name: "Ruta Nacional 7", description: "Ruta principal Buenos Aires-Luján. Visible y fácil de seguir." },
        { name: "Country clubs y barrios cerrados", description: "Varios complejos visibles desde el aire en la zona oeste." },
        { name: "Moreno/Paso del Rey", description: "Zonas urbanas que marcan la mitad del recorrido." },
        { name: "Zona rural de General Rodríguez", description: "Transición a campo abierto indica proximidad al destino." },
      ],
    },
    alternates: [
      { icao: "SADM", name: "Aeródromo Morón", distance: "15 MN al sur", notes: "Aeródromo militar, verificar disponibilidad" },
      { icao: "SADF", name: "San Fernando", distance: "Regreso", notes: "Volver si el clima deteriora" },
      { icao: "SA00", name: "Varios campos privados", distance: "Zona rural", notes: "Campos de emergencia en área rural" },
    ],
    pilotTips: [
      "San Fernando puede estar muy activo los fines de semana - paciencia en el circuito",
      "Llevá agua en verano - las esperas en tierra pueden ser largas",
      "General Rodríguez tiene buena parrilla cerca - ideal para almorzar",
      "Cuidado con cables de alta tensión en la zona rural",
      "En invierno, planificá salir después de las 10 AM para evitar niebla",
      "Verificá el estado de la pista en General Rodríguez después de lluvias",
      "Tené a mano la frecuencia de Ezeiza Approach por si necesitás asistencia",
      "Fotografía aérea espectacular del Delta si desviás un poco al norte",
    ],
    relatedRoutes: ["sazs-saco", "sadf-sadl"],
    keywords: [
      "San Fernando General Rodriguez vuelo",
      "SADF SAFG ruta",
      "VFR Buenos Aires",
      "aviación general Argentina",
      "navegación Gran Buenos Aires",
      "vuelo travesía Argentina",
      "calculador rumbo Argentina",
      "corrección viento VFR",
      "aeródromos Buenos Aires",
    ],
    region: "other",
  },

  // ===== ARGENTINA: SAN CARLOS DE BARILOCHE TO CHAPELCO =====
  {
    slug: "sazs-sazy",
    origin: {
      icao: "SAZS",
      name: "Aeropuerto Internacional San Carlos de Bariloche",
      city: "San Carlos de Bariloche",
      state: "Río Negro",
      country: "Argentina",
      lat: -41.1512,
      lon: -71.1575,
      elevation: 2774,
      atis: "127.3",
    },
    destination: {
      icao: "SAZY",
      name: "Aeropuerto Aviador Carlos Campos (Chapelco)",
      city: "San Martín de los Andes",
      state: "Neuquén",
      country: "Argentina",
      lat: -40.0754,
      lon: -71.1372,
      elevation: 2569,
      ctaf: "122.1",
    },
    typicalTas: 110,
    suggestedAltitudes: {
      eastbound: [9500, 11500],
      westbound: [8500, 10500],
    },
    seoTitle: "Bariloche SAZS a Chapelco SAZY | Vuelo Patagónico VFR Calculador",
    metaDescription: "Planificá tu vuelo VFR desde Bariloche a San Martín de los Andes. Calculá rumbo, corrección de viento y tiempo para esta espectacular ruta de 65 MN en la Patagonia.",
    pageTitle: "Bariloche (SAZS) a Chapelco (SAZY) - Calculador VFR Patagonia",
    introduction: "El vuelo de Bariloche a San Martín de los Andes es una de las rutas más espectaculares de la Patagonia argentina. Este trayecto de 65 millas náuticas atraviesa el corazón de los Andes patagónicos, con vistas increíbles del Lago Nahuel Huapi, el Cerro Tronador, y los lagos del corredor de los Siete Lagos. Es un vuelo que todo piloto argentino debería hacer al menos una vez. Esta calculadora te ayuda a planificar con las condiciones de viento actuales.",
    routeOverview: {
      heading: "Descripción de la Ruta: Bariloche a Chapelco",
      content: "La ruta desde SAZS a SAZY cubre aproximadamente 65 millas náuticas con un rumbo verdadero de unos 005° (casi norte directo). El tiempo de vuelo es típicamente 35-45 minutos a 110 nudos. El vuelo ofrece vistas incomparables de los lagos Nahuel Huapi, Correntoso, Espejo, y Lácar, siguiendo el famoso corredor de los Siete Lagos. Ambos aeropuertos están en zona montañosa con elevaciones superiores a 2500 pies, requiriendo atención especial al rendimiento del avión.",
    },
    flightPlanning: {
      heading: "Consideraciones de Planificación",
      content: "Este vuelo requiere planificación cuidadosa debido al terreno montañoso y las condiciones meteorológicas variables de la Patagonia. La altitud de ambos aeropuertos afecta significativamente el rendimiento del avión.",
      bulletPoints: [
        "CRÍTICO: Calcular distancia de despegue con altitud densidad - ambos aeropuertos sobre 2500 ft",
        "Verificar vientos en altura - pueden ser muy fuertes en la cordillera",
        "Ruta debe mantener altitud mínima segura sobre terreno (MEA)",
        "Combustible: Planificar conservadoramente - opciones limitadas en ruta",
        "Presentar plan de vuelo VFR obligatorio para zona cordillerana",
        "Verificar estado operativo de Chapelco - puede cerrar por viento",
        "Llevar ropa de abrigo - condiciones pueden cambiar rápidamente",
        "Equipo de supervivencia recomendado para vuelo sobre terreno inhóspito",
      ],
    },
    airspaceNavigation: {
      heading: "Espacio Aéreo y Navegación",
      content: "La zona cordillerana tiene espacio aéreo menos complejo que Buenos Aires, pero el terreno impone sus propias restricciones. La navegación visual es excelente con los lagos como referencias.",
      bulletPoints: [
        "Bariloche CTR: Radio obligatorio, coordinar salida con torre",
        "FIR Comodoro Rivadavia: Espacio aéreo no controlado en ruta",
        "Chapelco: Torre operativa en horarios limitados - verificar",
        "Frecuencia en ruta: 126.9 (FIR Comodoro Rivadavia)",
        "Cruce fronterizo: NO cruzar a Chile sin autorización - ADIZ activa",
        "Altitud mínima: Mantener mínimo 2000 ft AGL sobre terreno",
        "Lagos como referencias: Nahuel Huapi → Correntoso → Espejo → Lácar",
      ],
    },
    weatherConsiderations: {
      heading: "Consideraciones Meteorológicas",
      content: "La Patagonia cordillerana tiene clima extremadamente variable. Los vientos pueden cambiar de calma a 50 nudos en minutos. El efecto Foehn (viento Zonda) puede crear turbulencia severa en el lado este de los Andes. Las nubes orográficas se forman rápidamente sobre las cumbres. El invierno trae nieve que puede cerrar ambos aeropuertos. El verano ofrece las mejores condiciones pero aún requiere vigilancia constante. SIEMPRE obtener briefing meteorológico completo y tener plan alternativo.",
    },
    landmarks: {
      heading: "Referencias Visuales y Puntos de Navegación",
      items: [
        { name: "Lago Nahuel Huapi", description: "Enorme lago al salir de Bariloche. Imposible de perder." },
        { name: "Cerro Tronador", description: "Montaña de 3478m con glaciares. Visible a la izquierda (oeste) de la ruta." },
        { name: "Villa La Angostura", description: "Pueblo en el istmo entre lagos Nahuel Huapi y Correntoso." },
        { name: "Lago Correntoso", description: "Lago pequeño y verde, marca el inicio de los Siete Lagos." },
        { name: "Lago Espejo", description: "Lago distintivo por sus aguas calmas y reflejos perfectos." },
        { name: "Lago Lácar", description: "Último lago grande antes de San Martín. El aeropuerto está al este." },
        { name: "Volcán Lanín", description: "Cono perfecto de 3776m visible al noroeste. Referencia inconfundible." },
      ],
    },
    alternates: [
      { icao: "SAZS", name: "Bariloche", distance: "Regreso", notes: "Principal alternativa - regresar si clima deteriora" },
      { icao: "SAHC", name: "Cutral-Co", distance: "80 MN al este", notes: "Fuera de zona montañosa, emergencia" },
      { icao: "SAZN", name: "Neuquén", distance: "200 MN al este", notes: "Aeropuerto grande, condiciones normalmente mejores" },
    ],
    pilotTips: [
      "NUNCA despegar si hay dudas sobre el clima en ruta o destino",
      "Salir temprano en la mañana - vientos aumentan significativamente por la tarde",
      "Verificar NOTAM Chapelco - cierra frecuentemente por viento cruzado",
      "El Volcán Lanín es tu mejor amigo para navegación - siempre visible en días claros",
      "Llevar oxígeno si planeas volar sobre 10,000 ft para mayor margen con terreno",
      "Los lagos son tu referencia principal - si los perdés de vista, algo está mal",
      "Tené combustible para volver a Bariloche en cualquier momento",
      "San Martín de los Andes tiene excelente gastronomía - vale la pena el viaje",
    ],
    relatedRoutes: ["sadf-safg", "sazs-saco"],
    keywords: [
      "Bariloche Chapelco vuelo",
      "SAZS SAZY ruta",
      "VFR Patagonia",
      "vuelo cordillera Andes",
      "Siete Lagos aéreo",
      "San Martín de los Andes vuelo",
      "aviación Patagonia Argentina",
      "calculador rumbo montaña",
      "vuelo escénico Argentina",
    ],
    region: "other",
  },

  // ===== ARGENTINA: CÓRDOBA TO VILLA DOLORES =====
  {
    slug: "saco-saod",
    origin: {
      icao: "SACO",
      name: "Aeropuerto Internacional Ingeniero Ambrosio Taravella",
      city: "Córdoba",
      state: "Córdoba",
      country: "Argentina",
      lat: -31.3236,
      lon: -64.2080,
      elevation: 1604,
      atis: "127.85",
    },
    destination: {
      icao: "SAOD",
      name: "Aeródromo Villa Dolores",
      city: "Villa Dolores",
      state: "Córdoba",
      country: "Argentina",
      lat: -31.9450,
      lon: -65.1464,
      elevation: 1847,
      ctaf: "122.8",
    },
    typicalTas: 105,
    suggestedAltitudes: {
      eastbound: [6500, 8500],
      westbound: [5500, 7500],
    },
    seoTitle: "Córdoba SACO a Villa Dolores SAOD | Vuelo Sierras VFR Calculador",
    metaDescription: "Calculá tu vuelo VFR desde Córdoba a Villa Dolores cruzando las Sierras Grandes. Rumbo, corrección de viento y tiempo para esta ruta de 55 MN.",
    pageTitle: "Córdoba (SACO) a Villa Dolores (SAOD) - Calculador VFR Sierras",
    introduction: "El vuelo de Córdoba a Villa Dolores es una travesía clásica que cruza las Sierras Grandes de Córdoba. Este trayecto de 55 millas náuticas ofrece vistas espectaculares del paisaje serrano, incluyendo el Cerro Champaquí, los valles de Traslasierra, y el imponente Cordón de los Comechingones. Es una excelente ruta para pilotos que quieren experiencia en vuelo sobre terreno montañoso moderado. Usá esta calculadora para planificar con las condiciones de viento actuales.",
    routeOverview: {
      heading: "Descripción de la Ruta: Córdoba a Traslasierra",
      content: "La ruta desde SACO a SAOD cubre aproximadamente 55 millas náuticas con un rumbo verdadero de unos 235° (sudoeste). El tiempo de vuelo es típicamente 30-35 minutos a 105 nudos. El vuelo cruza las Sierras Grandes, el cordón montañoso más alto de las Sierras de Córdoba, con el Cerro Champaquí alcanzando 2884 metros. La ruta requiere altitudes de crucero que permitan sobrevolar el terreno con margen de seguridad adecuado.",
    },
    flightPlanning: {
      heading: "Consideraciones de Planificación",
      content: "El cruce de las Sierras Grandes requiere planificación cuidadosa. Ambos aeropuertos están a elevaciones moderadas, pero el terreno en ruta alcanza casi 3000 metros.",
      bulletPoints: [
        "Altitud mínima de cruce: Las Sierras Grandes requieren mínimo 10,000 ft para margen seguro",
        "Calcular rendimiento de ascenso - Córdoba está a 1600 ft de elevación",
        "Verificar vientos en altura - efecto valle puede crear turbulencia",
        "Combustible: 25-30 litros mínimo, considerar reserva extra",
        "Plan de vuelo VFR recomendado para cruce serrano",
        "Verificar pronóstico de ambas vertientes - puede diferir significativamente",
        "Villa Dolores no tiene servicios de combustible garantizados - confirmar",
      ],
    },
    airspaceNavigation: {
      heading: "Espacio Aéreo y Navegación",
      content: "Córdoba tiene CTR activo y tráfico comercial. Una vez fuera del CTR, el espacio aéreo es principalmente no controlado hasta Villa Dolores.",
      bulletPoints: [
        "Córdoba CTR: Coordinar salida con torre, seguir procedimientos publicados",
        "Salida típica: Por el VOR CBA, luego directo al sudoeste",
        "FIR Córdoba: Espacio no controlado fuera del CTR",
        "Villa Dolores: Aeródromo no controlado, procedimientos estándar",
        "Frecuencia en ruta: 126.9 FIR Córdoba",
        "Mantener escucha en 121.5 sobre terreno montañoso",
        "Reportar posición al cruzar las sierras si hay tráfico conocido",
      ],
    },
    weatherConsiderations: {
      heading: "Consideraciones Meteorológicas",
      content: "Las Sierras de Córdoba crean su propio microclima. La ladera este (lado Córdoba) suele tener mejor tiempo que la ladera oeste (Traslasierra). Las nubes orográficas se forman sobre las cumbres, especialmente con vientos del este. En verano, las tormentas convectivas de la tarde son frecuentes y pueden ser severas. El invierno trae ocasionalmente nieve en las cumbres más altas. El viento Zonda puede crear condiciones muy turbulentas. Siempre verificar el pronóstico de ambos lados de la sierra.",
    },
    landmarks: {
      heading: "Referencias Visuales y Puntos de Navegación",
      items: [
        { name: "Valle de Punilla", description: "Valle visible al norte durante el ascenso. Carlos Paz y el Lago San Roque identificables." },
        { name: "Cerro Champaquí", description: "Punto más alto de las Sierras de Córdoba (2884m). Referencia principal." },
        { name: "Pampa de Achala", description: "Meseta de altura antes de cruzar al oeste. Terreno relativamente plano a 2000m." },
        { name: "Cordón de los Comechingones", description: "Línea de cumbres que marca el límite provincial Córdoba-San Luis." },
        { name: "Valle de Traslasierra", description: "Valle amplio al oeste de las sierras. Indica proximidad a Villa Dolores." },
        { name: "Río de los Sauces", description: "Curso de agua cerca de Villa Dolores. Ayuda a identificar el aeródromo." },
      ],
    },
    alternates: [
      { icao: "SACO", name: "Córdoba", distance: "Regreso", notes: "Principal alternativa con todos los servicios" },
      { icao: "SAOC", name: "Río Cuarto", distance: "70 MN al sur", notes: "Aeropuerto con servicios completos" },
      { icao: "SAOS", name: "San Luis", distance: "100 MN al suroeste", notes: "Aeropuerto alternativo fuera de sierras" },
    ],
    pilotTips: [
      "Cruzar las sierras temprano en la mañana - turbulencia aumenta después del mediodía",
      "Si hay nubes sobre las cumbres, NO intentar cruzar - dar la vuelta",
      "El valle de Traslasierra puede tener viento fuerte de componente norte",
      "Villa Dolores tiene pista de tierra - verificar condiciones después de lluvias",
      "Excelente gastronomía en Villa Dolores y Mina Clavero - planear almuerzo",
      "Foto obligatoria del Champaquí si el día está claro",
      "Considerar hacer escala en Pampa de Achala si hay aeródromo operativo",
      "El regreso por la tarde puede tener turbulencia significativa - planear horarios",
    ],
    relatedRoutes: ["sadf-safg", "sazs-sazy"],
    keywords: [
      "Córdoba Villa Dolores vuelo",
      "SACO SAOD ruta",
      "cruce Sierras Grandes",
      "VFR Córdoba Argentina",
      "Traslasierra vuelo",
      "Champaquí aéreo",
      "vuelo sierras Córdoba",
      "calculador rumbo sierras",
      "aviación Córdoba Argentina",
    ],
    region: "other",
  },
];

/**
 * Get a route by its slug
 */
export function getRouteBySlug(slug: string): VfrRoute | undefined {
  return VFR_ROUTES.find((route) => route.slug === slug.toLowerCase());
}

/**
 * Get all route slugs for static generation
 */
export function getAllRouteSlugs(): string[] {
  return VFR_ROUTES.map((route) => route.slug);
}

/**
 * Get routes by region
 */
export function getRoutesByRegion(region: VfrRoute["region"]): VfrRoute[] {
  return VFR_ROUTES.filter((route) => route.region === region);
}
