/**
 * Seed fake leads for testing
 * Run with: npx tsx scripts/seedLeads.ts
 */

import { config } from 'dotenv';
import { connectToDatabase } from '../src/integrations/mongodb/client';
import { leadInquiriesService } from '../src/integrations/mongodb/allServices';
import { leadNotesService } from '../src/integrations/mongodb/leadNotesService';

// Load environment variables
config();

const fakeLeads = [
  {
    leadSource: 'storefront_form' as const,
    hubId: 'chicago-hub',
    publicationId: undefined,
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah.johnson@techinnovations.com',
    contactPhone: '(312) 555-0123',
    businessName: 'Tech Innovations LLC',
    websiteUrl: 'https://techinnovations.com',
    budgetRange: '$5,000 - $10,000/month',
    timeline: 'Start in 2-3 weeks',
    marketingGoals: ['Increase brand awareness', 'Generate leads', 'Target local audience'],
    interestedOutlets: ['Chicago Tribune', 'Block Club Chicago'],
    status: 'new' as const,
  },
  {
    leadSource: 'ai_chat' as const,
    hubId: 'chicago-hub',
    publicationId: undefined,
    contactName: 'Michael Chen',
    contactEmail: 'michael@localbrewco.com',
    contactPhone: '(773) 555-0456',
    businessName: 'Local Brew Co.',
    websiteUrl: 'https://localbrewco.com',
    budgetRange: '$2,000 - $5,000/month',
    timeline: 'Immediate',
    marketingGoals: ['Promote events', 'Build community presence', 'Drive sales and revenue'],
    conversationContext: {
      topic: 'Event promotion for new brewery opening',
      interests: ['Local news outlets', 'Food & beverage publications'],
    },
    status: 'contacted' as const,
  },
  {
    leadSource: 'storefront_form' as const,
    hubId: 'chicago-hub',
    publicationId: undefined,
    contactName: 'Jennifer Martinez',
    contactEmail: 'jmartinez@greenenergyplus.com',
    contactPhone: '(847) 555-0789',
    businessName: 'Green Energy Plus',
    websiteUrl: 'https://greenenergyplus.com',
    budgetRange: '$15,000 - $25,000/month',
    timeline: 'Q2 2025',
    marketingGoals: ['Launch new product/service', 'Increase brand awareness', 'Target local audience'],
    interestedOutlets: ['Crain\'s Chicago Business', 'Chicago Sun-Times'],
    status: 'qualified' as const,
  },
  {
    leadSource: 'manual_entry' as const,
    hubId: 'chicago-hub',
    publicationId: undefined,
    contactName: 'David Kim',
    contactEmail: 'david@chicagoeats.com',
    contactPhone: '(312) 555-0234',
    businessName: 'Chicago Eats Restaurant Group',
    websiteUrl: 'https://chicagoeats.com',
    budgetRange: '$8,000 - $12,000/month',
    timeline: 'Start next month',
    marketingGoals: ['Promote events', 'Drive sales and revenue', 'Build community presence'],
    status: 'proposal_sent' as const,
  },
  {
    leadSource: 'ai_chat' as const,
    hubId: 'chicago-hub',
    publicationId: undefined,
    contactName: 'Amanda Foster',
    contactEmail: 'amanda@fitnessfirst.com',
    contactPhone: '(630) 555-0567',
    businessName: 'Fitness First Chicago',
    websiteUrl: 'https://fitnessfirstchicago.com',
    budgetRange: '$3,000 - $7,000/month',
    timeline: 'Start in 1 month',
    marketingGoals: ['Generate leads', 'Target local audience', 'Increase brand awareness'],
    conversationContext: {
      topic: 'Multi-location fitness center expansion campaign',
      interests: ['Health & wellness publications', 'Community newspapers'],
    },
    status: 'closed_won' as const,
  },
  {
    leadSource: 'storefront_form' as const,
    hubId: 'chicago-hub',
    publicationId: undefined,
    contactName: 'Robert Thompson',
    contactEmail: 'rthompson@lawfirm.com',
    contactPhone: '(312) 555-0890',
    businessName: 'Thompson & Associates Law',
    websiteUrl: 'https://thompsonlaw.com',
    budgetRange: '$10,000 - $15,000/month',
    timeline: 'Flexible',
    marketingGoals: ['Increase brand awareness', 'Generate leads'],
    status: 'closed_lost' as const,
  },
  {
    leadSource: 'ai_chat' as const,
    hubId: 'chicago-hub',
    publicationId: undefined,
    contactName: 'Emily Rodriguez',
    contactEmail: 'emily@creativestudio.com',
    contactPhone: '(773) 555-0123',
    businessName: 'Creative Studio Chicago',
    websiteUrl: 'https://creativestudiochi.com',
    budgetRange: '$4,000 - $8,000/month',
    timeline: 'Start ASAP',
    marketingGoals: ['Launch new product/service', 'Target local audience', 'Build community presence'],
    conversationContext: {
      topic: 'Design studio rebranding campaign',
      interests: ['Arts & culture publications', 'Business journals'],
    },
    status: 'new' as const,
  },
];

async function seedLeads() {
  console.log('🌱 Starting lead seeding process...\n');

  try {
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database\n');

    // Create leads
    console.log('Creating fake leads...\n');
    
    for (const leadData of fakeLeads) {
      try {
        const lead = await leadInquiriesService.create(leadData);
        console.log(`✅ Created lead: ${leadData.businessName} (${leadData.leadSource}, status: ${leadData.status})`);
        
        // Add an initial note for some leads
        if (lead._id) {
          if (leadData.status === 'contacted') {
            await leadNotesService.create({
              leadId: lead._id.toString(),
              authorId: 'system',
              authorName: 'System',
              noteContent: 'Initial contact made via phone. Left voicemail with callback number.',
              noteType: 'note',
            });
            console.log(`   📝 Added initial note`);
          }
          
          if (leadData.status === 'proposal_sent') {
            await leadNotesService.create({
              leadId: lead._id.toString(),
              authorId: 'system',
              authorName: 'System',
              noteContent: 'Sent comprehensive media kit and proposal via email.',
              noteType: 'note',
            });
            console.log(`   📝 Added proposal note`);
          }
          
          if (leadData.status === 'closed_won') {
            await leadNotesService.create({
              leadId: lead._id.toString(),
              authorId: 'system',
              authorName: 'System',
              noteContent: 'Contract signed! 6-month campaign starting next month.',
              noteType: 'note',
            });
            console.log(`   📝 Added won note`);
          }
          
          if (leadData.status === 'closed_lost') {
            await leadNotesService.create({
              leadId: lead._id.toString(),
              authorId: 'system',
              authorName: 'System',
              noteContent: 'Client decided to go with a different agency. Budget constraints cited.',
              noteType: 'note',
            });
            console.log(`   📝 Added lost reason note`);
          }
        }
      } catch (error) {
        console.error(`❌ Error creating lead ${leadData.businessName}:`, error);
      }
    }

    console.log('\n✅ Successfully seeded fake leads!');
    console.log(`\n📊 Summary:`);
    console.log(`   Total leads created: ${fakeLeads.length}`);
    console.log(`   Sources breakdown:`);
    console.log(`      - Storefront forms: ${fakeLeads.filter(l => l.leadSource === 'storefront_form').length}`);
    console.log(`      - AI chat: ${fakeLeads.filter(l => l.leadSource === 'ai_chat').length}`);
    console.log(`      - Manual entry: ${fakeLeads.filter(l => l.leadSource === 'manual_entry').length}`);
    console.log(`   Status breakdown:`);
    console.log(`      - New: ${fakeLeads.filter(l => l.status === 'new').length}`);
    console.log(`      - Contacted: ${fakeLeads.filter(l => l.status === 'contacted').length}`);
    console.log(`      - Qualified: ${fakeLeads.filter(l => l.status === 'qualified').length}`);
    console.log(`      - Proposal sent: ${fakeLeads.filter(l => l.status === 'proposal_sent').length}`);
    console.log(`      - Closed won: ${fakeLeads.filter(l => l.status === 'closed_won').length}`);
    console.log(`      - Closed lost: ${fakeLeads.filter(l => l.status === 'closed_lost').length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding leads:', error);
    process.exit(1);
  }
}

// Run the seeder
seedLeads();

