import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { connectToDatabase } from '../integrations/mongodb/client';

// Load environment variables
config();

// Check if we should skip MongoDB and just generate JSON
const GENERATE_JSON_ONLY = process.argv.includes('--json-only');

interface CSVRow {
  id: string;
  dma: string;
  county: string | null;
  zip: string | null;
  created_at: string;
  updated_at: string;
}

interface County {
  name: string;
  normalized: string;
  zipCodes: string[];
}

interface Area {
  dma: {
    name: string;
    normalized: string;
  };
  counties: County[];
  allZipCodes: string[];
  metadata: {
    totalCounties: number;
    totalZipCodes: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface AreaMap {
  [dmaName: string]: {
    dma: {
      name: string;
      normalized: string;
    };
    counties: Map<string, Set<string>>;
  };
}

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n');
  const rows: CSVRow[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handling quoted values)
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const parts = line.split(regex);
    
    if (parts.length < 6) continue;
    
    const id = parts[0].trim();
    const dma = parts[1].replace(/^"|"$/g, '').trim();
    const county = parts[2].trim();
    const zip = parts[3].trim();
    const created_at = parts[4].replace(/^"|"$/g, '').trim();
    const updated_at = parts[5].replace(/^"|"$/g, '').trim();
    
    rows.push({
      id,
      dma,
      county: county === 'NULL' ? null : county.replace(/^"|"$/g, ''),
      zip: zip === 'NULL' ? null : zip.replace(/^"|"$/g, ''),
      created_at,
      updated_at
    });
  }
  
  return rows;
}

function transformToAreas(rows: CSVRow[]): Area[] {
  const areaMap: AreaMap = {};
  
  console.log(`Processing ${rows.length} CSV rows...`);
  
  for (const row of rows) {
    const dmaName = row.dma;
    
    // Initialize DMA if not exists
    if (!areaMap[dmaName]) {
      areaMap[dmaName] = {
        dma: {
          name: dmaName,
          normalized: normalizeString(dmaName)
        },
        counties: new Map()
      };
    }
    
    // Add county if exists
    if (row.county) {
      if (!areaMap[dmaName].counties.has(row.county)) {
        areaMap[dmaName].counties.set(row.county, new Set());
      }
      
      // Add zip to county if exists
      if (row.zip) {
        areaMap[dmaName].counties.get(row.county)!.add(row.zip);
      }
    }
  }
  
  console.log(`Found ${Object.keys(areaMap).length} unique DMAs`);
  
  // Transform to final structure
  const areas: Area[] = Object.values(areaMap).map(area => {
    const counties: County[] = Array.from(area.counties.entries())
      .map(([name, zipCodes]) => ({
        name,
        normalized: normalizeString(name),
        zipCodes: Array.from(zipCodes).sort()
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const allZipCodes = counties
      .flatMap(c => c.zipCodes)
      .sort();
    
    return {
      dma: area.dma,
      counties,
      allZipCodes,
      metadata: {
        totalCounties: counties.length,
        totalZipCodes: allZipCodes.length,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  });
  
  return areas.sort((a, b) => a.dma.name.localeCompare(b.dma.name));
}

async function importAreas() {
  console.log('🚀 Starting areas import process...\n');
  
  try {
    // Read CSV file
    console.log('📖 Reading geography.csv file...');
    const csvContent = readFileSync('./geography.csv', 'utf-8');
    
    // Parse CSV
    console.log('🔍 Parsing CSV data...');
    const rows = parseCSV(csvContent);
    console.log(`✅ Parsed ${rows.length} rows\n`);
    
    // Transform data
    console.log('🔄 Transforming data to area documents...');
    const areas = transformToAreas(rows);
    console.log(`✅ Created ${areas.length} area documents\n`);
    
    // Display sample
    console.log('📊 Sample area document:');
    console.log(JSON.stringify(areas[0], null, 2));
    console.log('\n');
    
    // Calculate statistics
    const totalCounties = areas.reduce((sum, area) => sum + area.metadata.totalCounties, 0);
    const totalZips = areas.reduce((sum, area) => sum + area.metadata.totalZipCodes, 0);
    
    console.log('📈 Statistics:');
    console.log(`  - Total DMAs: ${areas.length}`);
    console.log(`  - Total Counties: ${totalCounties}`);
    console.log(`  - Total Zip Codes: ${totalZips}`);
    console.log(`  - Avg Counties per DMA: ${(totalCounties / areas.length).toFixed(1)}`);
    console.log(`  - Avg Zip Codes per DMA: ${(totalZips / areas.length).toFixed(1)}`);
    console.log('\n');
    
    // If JSON-only mode, save and exit
    if (GENERATE_JSON_ONLY) {
      const jsonPath = './areas-import.json';
      console.log(`💾 Saving to JSON file: ${jsonPath}`);
      writeFileSync(jsonPath, JSON.stringify(areas, null, 2), 'utf-8');
      console.log('✅ JSON file created successfully!\n');
      console.log('To import this into MongoDB later, run:');
      console.log('  npm run import:areas\n');
      process.exit(0);
    }
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const db = await connectToDatabase();
    console.log('✅ Connected to MongoDB\n');
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'areas' }).toArray();
    if (collections.length > 0) {
      console.log('⚠️  Collection "areas" already exists');
      console.log('🗑️  Dropping existing collection...');
      await db.collection('areas').drop();
      console.log('✅ Existing collection dropped\n');
    }
    
    // Insert documents
    console.log('💾 Inserting area documents into MongoDB...');
    const result = await db.collection('areas').insertMany(areas);
    console.log(`✅ Inserted ${result.insertedCount} documents\n`);
    
    // Create indexes
    console.log('🔍 Creating indexes for optimal query performance...');
    
    // 1. DMA name index (for case-insensitive search, use normalized field)
    await db.collection('areas').createIndex(
      { 'dma.name': 1 },
      { name: 'dma_name_index' }
    );
    console.log('  ✅ Created DMA name index');
    
    // 2. DMA normalized name lookup
    await db.collection('areas').createIndex(
      { 'dma.normalized': 1 },
      { name: 'dma_normalized_index' }
    );
    console.log('  ✅ Created DMA normalized index');
    
    // 3. Zip code lookup
    await db.collection('areas').createIndex(
      { 'allZipCodes': 1 },
      { name: 'zip_codes_index' }
    );
    console.log('  ✅ Created zip codes index');
    
    // 4. County name lookup
    await db.collection('areas').createIndex(
      { 'counties.name': 1 },
      { name: 'county_name_index' }
    );
    console.log('  ✅ Created county name index');
    
    // 5. Combined DMA + County lookup
    await db.collection('areas').createIndex(
      { 
        'dma.normalized': 1, 
        'counties.normalized': 1 
      },
      { name: 'dma_county_index' }
    );
    console.log('  ✅ Created DMA + county combined index\n');
    
    // Display some example queries
    console.log('🔍 Testing queries:\n');
    
    // Query 1: Find Chicago DMA
    const chicago = await db.collection('areas').findOne({ 'dma.normalized': 'chicago-il' });
    if (chicago) {
      console.log('  📍 Chicago DMA:');
      console.log(`     - Counties: ${chicago.metadata.totalCounties}`);
      console.log(`     - Zip Codes: ${chicago.metadata.totalZipCodes}`);
    }
    
    // Query 2: Find by zip code
    const zipResult = await db.collection('areas').findOne(
      { 'allZipCodes': '60601' },
      { projection: { 'dma.name': 1 } }
    );
    if (zipResult) {
      console.log(`  📮 Zip 60601 belongs to: ${zipResult.dma.name}`);
    }
    
    // Query 3: Regex search (case-insensitive)
    const searchResults = await db.collection('areas')
      .find({ 'dma.name': { $regex: 'NEW YORK', $options: 'i' } })
      .limit(3)
      .toArray();
    console.log(`  🔎 Search "new york" found ${searchResults.length} results:`);
    searchResults.forEach(r => {
      console.log(`     - ${r.dma.name}`);
    });
    
    console.log('\n✅ Areas import completed successfully!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing areas:', error);
    process.exit(1);
  }
}

// Run the import
importAreas();

