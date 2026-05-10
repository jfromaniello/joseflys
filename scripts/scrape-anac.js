const fs = require('fs');

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      console.log(`Retry ${i+1} for ${url}: ${res.status}`);
    } catch (e) {
      console.log(`Retry ${i+1} for ${url}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  return null;
}

async function main() {
  console.log('Fetching aerodrome list...');
  const listRes = await fetch('https://datos.anac.gob.ar/madhel/api/v2/airports/');
  const listData = await listRes.json();
  
  const aerodromos = listData.results;
  console.log(`Total: ${aerodromos.length}`);
  
  const mapping = {};
  const details = {};
  
  for (let i = 0; i < aerodromos.length; i++) {
    const aero = aerodromos[i];
    const localId = aero.local_identifier;
    
    console.log(`[${i+1}/${aerodromos.length}] Fetching ${localId}...`);
    
    const detail = await fetchWithRetry(`https://datos.anac.gob.ar/madhel/api/v2/airports/${localId}/`);
    
    if (detail && detail.metadata && detail.metadata.identifiers) {
      const icao = detail.metadata.identifiers.icao;
      const iata = detail.metadata.identifiers.iata;
      
      if (icao) {
        mapping[icao] = localId;
      }
      if (iata) {
        mapping[iata] = localId;
      }
      
      details[localId] = {
        local: localId,
        icao: icao || null,
        iata: iata || null,
        name: detail.human_readable_identifier,
        type: detail.type,
        lat: detail.metadata.localization?.coordinates?.lat || null,
        lon: detail.metadata.localization?.coordinates?.lng || null,
        elevation: detail.metadata.localization?.elevation || null,
        city: detail.metadata.localization?.city_reference || null,
        province: detail.metadata.localization?.state || null,
        region: detail.metadata.localization?.region || null,
        fir: detail.metadata.localization?.fir || null,
        control: detail.metadata.localization?.control || null,
        condition: detail.metadata.localization?.condition || null,
        traffic: detail.metadata.localization?.traffic || null,
        runways: detail.data?.rwy || [],
        telephone: detail.data?.telephone || [],
        fuel: detail.data?.fuel || null,
        atz: detail.data?.atz || null,
        service_schedule: detail.data?.service_schedule || null,
        norms_general: detail.data?.norms?.general?.content || null,
        norms_particular: detail.data?.norms?.particular?.content || null,
      };
    }
    
    // Delay to be nice to the server
    if (i < aerodromos.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  fs.writeFileSync('data/anac-mapping.json', JSON.stringify(mapping, null, 2));
  fs.writeFileSync('data/anac-details.json', JSON.stringify(details, null, 2));
  
  console.log(`\nDone! Mapped ${Object.keys(mapping).length} codes.`);
  console.log(`Details for ${Object.keys(details).length} aerodromes.`);
}

main().catch(console.error);
