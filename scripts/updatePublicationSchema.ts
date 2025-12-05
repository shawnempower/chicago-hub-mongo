/**
 * Script to update publication.json schema to reflect the new format structure
 * 
 * Changes:
 * - Removes deprecated 'sizes' field from advertisingOpportunities
 * - Removes deprecated 'specifications' field from advertisingOpportunities
 * - Ensures 'format' object has all necessary properties
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, '../json_files/schema/publication.json');

// The complete format object schema for different channel types
const baseFormatSchema = {
  type: "object",
  description: "Creative format specifications for ad delivery",
  properties: {
    dimensions: {
      oneOf: [
        {
          type: "string",
          description: "Single dimension value (e.g., '300x250', '30s', 'text-only')"
        },
        {
          type: "array",
          description: "Multiple accepted dimensions",
          items: { type: "string" },
          minItems: 1
        }
      ]
    },
    fileFormats: {
      type: "array",
      description: "Accepted file formats (e.g., ['JPG', 'PNG', 'GIF'] or ['MP3', 'WAV'])",
      items: { type: "string" }
    },
    maxFileSize: {
      type: "string",
      description: "Maximum file size (e.g., '150KB', '5MB', '50MB')"
    },
    colorSpace: {
      type: "string",
      enum: ["RGB", "CMYK", "Grayscale"],
      description: "Required color space for print ads"
    },
    resolution: {
      type: "string",
      description: "Required resolution (e.g., '300dpi', '1080p', '72dpi')"
    },
    duration: {
      type: "integer",
      description: "Duration in seconds for audio/video ads (e.g., 15, 30, 60)"
    },
    bitrate: {
      type: "string",
      description: "Audio/video bitrate requirement (e.g., '128kbps', '320kbps')"
    }
  }
};

function updateSchema() {
  console.log('Reading schema file...');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);
  
  let sizesRemoved = 0;
  let specificationsRemoved = 0;
  let formatUpdated = 0;
  
  // Recursive function to process all advertisingOpportunities
  function processObject(obj: any, path: string = ''): void {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if this is an advertisingOpportunities items schema
    if (obj.properties) {
      // Only process advertising opportunity items (have 'name' property and are inside advertisingOpportunities)
      const isAdOpportunityItem = path.includes('advertisingOpportunities.items') && obj.properties.name;
      
      if (isAdOpportunityItem) {
        // Remove 'sizes' if present
        if (obj.properties.sizes) {
          console.log(`  Removing 'sizes' at ${path}`);
          delete obj.properties.sizes;
          sizesRemoved++;
        }
        
        // Remove 'specifications' if present
        if (obj.properties.specifications) {
          console.log(`  Removing 'specifications' at ${path}`);
          delete obj.properties.specifications;
          specificationsRemoved++;
        }
        
        // Remove legacy 'dimensions' at root level (not inside format)
        if (obj.properties.dimensions) {
          console.log(`  Removing legacy root 'dimensions' at ${path}`);
          delete obj.properties.dimensions;
        }
        
        // Set or update 'format' object
        console.log(`  Setting 'format' at ${path}`);
        obj.properties.format = JSON.parse(JSON.stringify(baseFormatSchema));
        formatUpdated++;
        
        // Don't recurse into format since we just set it
        for (const key of Object.keys(obj)) {
          if (key !== 'properties' && typeof obj[key] === 'object' && obj[key] !== null) {
            processObject(obj[key], path ? `${path}.${key}` : key);
          }
        }
        for (const key of Object.keys(obj.properties)) {
          if (key !== 'format' && typeof obj.properties[key] === 'object' && obj.properties[key] !== null) {
            processObject(obj.properties[key], `${path}.properties.${key}`);
          }
        }
        return;
      }
    }
    
    // Recurse into nested objects
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        processObject(obj[key], path ? `${path}.${key}` : key);
      }
    }
  }
  
  console.log('\nProcessing schema...\n');
  processObject(schema);
  
  // Write updated schema
  console.log('\nWriting updated schema...');
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');
  
  console.log('\n=== Summary ===');
  console.log(`  'sizes' fields removed: ${sizesRemoved}`);
  console.log(`  'specifications' fields removed: ${specificationsRemoved}`);
  console.log(`  'format' objects updated/added: ${formatUpdated}`);
  console.log('\nSchema updated successfully!');
}

updateSchema();
