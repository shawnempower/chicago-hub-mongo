/**
 * Script to find orphaned hub pricing entries
 * 
 * Scans all publications for hubPricing entries where:
 * - hubId is null or empty
 * - hubId doesn't match any existing hub
 * 
 * Usage: npx ts-node scripts/findOrphanedHubPricing.ts
 */

import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

interface OrphanedEntry {
  publicationId: number;
  publicationName: string;
  channel: string;
  itemName: string;
  hubId: string | null;
  hubName: string | null;
  reason: string;
}

async function findOrphanedHubPricing() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db('chicago-hub');
    
    // Get all valid hub IDs
    const hubs = await db.collection('hubs').find({}).toArray();
    const validHubIds = new Set(hubs.map(h => h.hubId));
    console.log(`Found ${validHubIds.size} valid hubs: ${[...validHubIds].join(', ')}\n`);
    
    // Get all publications
    const publications = await db.collection('publications').find({}).toArray();
    console.log(`Scanning ${publications.length} publications...\n`);
    
    const orphanedEntries: OrphanedEntry[] = [];
    
    for (const pub of publications) {
      const pubId = pub.publicationId;
      const pubName = pub.basicInfo?.publicationName || `Publication ${pubId}`;
      const dc = pub.distributionChannels || {};
      
      // Check website ads
      if (dc.website?.advertisingOpportunities) {
        for (const ad of dc.website.advertisingOpportunities) {
          checkHubPricing(ad.hubPricing, pubId, pubName, 'website', ad.name || 'Unknown Ad', validHubIds, orphanedEntries);
        }
      }
      
      // Check newsletters
      if (dc.newsletters) {
        for (const newsletter of dc.newsletters) {
          for (const ad of newsletter.advertisingOpportunities || []) {
            checkHubPricing(ad.hubPricing, pubId, pubName, 'newsletter', `${newsletter.name} - ${ad.name || ad.position || 'Unknown'}`, validHubIds, orphanedEntries);
          }
        }
      }
      
      // Check print
      if (Array.isArray(dc.print)) {
        for (const print of dc.print) {
          for (const ad of print.advertisingOpportunities || []) {
            checkHubPricing(ad.hubPricing, pubId, pubName, 'print', `${print.name} - ${ad.name || 'Unknown'}`, validHubIds, orphanedEntries);
          }
        }
      }
      
      // Check social media
      if (dc.socialMedia) {
        for (const social of dc.socialMedia) {
          for (const ad of social.advertisingOpportunities || []) {
            checkHubPricing(ad.hubPricing, pubId, pubName, 'social', `${social.platform} - ${ad.name || 'Unknown'}`, validHubIds, orphanedEntries);
          }
        }
      }
      
      // Check events
      if (dc.events) {
        for (const event of dc.events) {
          for (const opp of event.advertisingOpportunities || event.sponsorshipOpportunities || []) {
            checkHubPricing(opp.hubPricing, pubId, pubName, 'events', `${event.name} - ${opp.name || opp.level || 'Unknown'}`, validHubIds, orphanedEntries);
          }
        }
      }
      
      // Check podcasts
      if (dc.podcasts) {
        for (const podcast of dc.podcasts) {
          for (const ad of podcast.advertisingOpportunities || []) {
            checkHubPricing(ad.hubPricing, pubId, pubName, 'podcast', `${podcast.name} - ${ad.name || 'Unknown'}`, validHubIds, orphanedEntries);
          }
        }
      }
      
      // Check radio stations
      if (dc.radioStations) {
        for (const radio of dc.radioStations) {
          // Station-level ads
          for (const ad of radio.advertisingOpportunities || []) {
            checkHubPricing(ad.hubPricing, pubId, pubName, 'radio', `${radio.callSign} - ${ad.name || 'Unknown'}`, validHubIds, orphanedEntries);
          }
          // Show-level ads
          for (const show of radio.shows || []) {
            for (const ad of show.advertisingOpportunities || []) {
              checkHubPricing(ad.hubPricing, pubId, pubName, 'radio', `${radio.callSign} - ${show.name} - ${ad.name || 'Unknown'}`, validHubIds, orphanedEntries);
            }
          }
        }
      }
      
      // Check streaming video
      if (dc.streamingVideo) {
        for (const stream of dc.streamingVideo) {
          for (const ad of stream.advertisingOpportunities || []) {
            checkHubPricing(ad.hubPricing, pubId, pubName, 'streaming', `${stream.name} - ${ad.name || 'Unknown'}`, validHubIds, orphanedEntries);
          }
        }
      }
    }
    
    // Report findings
    console.log('=' .repeat(80));
    console.log('ORPHANED HUB PRICING REPORT');
    console.log('=' .repeat(80));
    
    if (orphanedEntries.length === 0) {
      console.log('\n✅ No orphaned hub pricing entries found!\n');
    } else {
      console.log(`\n⚠️  Found ${orphanedEntries.length} orphaned hub pricing entries:\n`);
      
      // Group by publication
      const byPublication = new Map<number, OrphanedEntry[]>();
      for (const entry of orphanedEntries) {
        const existing = byPublication.get(entry.publicationId) || [];
        existing.push(entry);
        byPublication.set(entry.publicationId, existing);
      }
      
      for (const [pubId, entries] of byPublication) {
        const pubName = entries[0].publicationName;
        console.log(`\n📰 ${pubName} (ID: ${pubId}) - ${entries.length} orphaned entries:`);
        for (const entry of entries) {
          console.log(`   - [${entry.channel}] ${entry.itemName}`);
          console.log(`     hubId: "${entry.hubId || 'null'}", hubName: "${entry.hubName || 'null'}"`);
          console.log(`     Reason: ${entry.reason}`);
        }
      }
      
      // Summary by reason
      console.log('\n' + '-'.repeat(80));
      console.log('SUMMARY BY REASON:');
      const byReason = new Map<string, number>();
      for (const entry of orphanedEntries) {
        byReason.set(entry.reason, (byReason.get(entry.reason) || 0) + 1);
      }
      for (const [reason, count] of byReason) {
        console.log(`  ${reason}: ${count}`);
      }
      
      // Summary by publication
      console.log('\nSUMMARY BY PUBLICATION:');
      for (const [pubId, entries] of byPublication) {
        console.log(`  ${entries[0].publicationName}: ${entries.length} orphaned entries`);
      }
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

function checkHubPricing(
  hubPricing: any[] | undefined,
  pubId: number,
  pubName: string,
  channel: string,
  itemName: string,
  validHubIds: Set<string>,
  orphanedEntries: OrphanedEntry[]
) {
  if (!hubPricing || !Array.isArray(hubPricing)) return;
  
  for (const hp of hubPricing) {
    if (!hp) {
      orphanedEntries.push({
        publicationId: pubId,
        publicationName: pubName,
        channel,
        itemName,
        hubId: null,
        hubName: null,
        reason: 'null hubPricing entry'
      });
      continue;
    }
    
    const hubId = hp.hubId;
    const hubName = hp.hubName;
    
    if (!hubId) {
      orphanedEntries.push({
        publicationId: pubId,
        publicationName: pubName,
        channel,
        itemName,
        hubId: hubId || null,
        hubName: hubName || null,
        reason: 'Missing or empty hubId'
      });
    } else if (!validHubIds.has(hubId)) {
      orphanedEntries.push({
        publicationId: pubId,
        publicationName: pubName,
        channel,
        itemName,
        hubId,
        hubName: hubName || null,
        reason: `hubId "${hubId}" not found in hubs collection`
      });
    } else if (!hubName) {
      orphanedEntries.push({
        publicationId: pubId,
        publicationName: pubName,
        channel,
        itemName,
        hubId,
        hubName: null,
        reason: 'Missing hubName (hubId is valid)'
      });
    }
    
    // Also check if pricing is null
    if (hp.pricing === null) {
      orphanedEntries.push({
        publicationId: pubId,
        publicationName: pubName,
        channel,
        itemName,
        hubId: hubId || null,
        hubName: hubName || null,
        reason: 'pricing is null'
      });
    }
  }
}

findOrphanedHubPricing();
