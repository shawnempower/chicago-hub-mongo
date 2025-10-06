#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

import { connectToDatabase } from '@/integrations/mongodb/client';
import { surveySubmissionsService } from '@/integrations/mongodb/allServices';
import { SurveySubmissionInsert } from '@/integrations/mongodb/schemas';

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceDate(value: any): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function normalizeSubmission(input: any): SurveySubmissionInsert {
  const metadata = isObject(input.metadata) ? input.metadata : {};
  const contactInformation = isObject(input.contactInformation) ? input.contactInformation : {};

  // Ensure required mediaOutletNames exists (fallbacks if present under other names)
  const mediaOutletNames =
    contactInformation.mediaOutletNames ||
    contactInformation.outletNames ||
    contactInformation.outlets ||
    input.mediaOutletNames ||
    'Unknown';

  const normalized: SurveySubmissionInsert = {
    metadata: {
      respondentId: metadata.respondentId ?? undefined,
      collectorId: metadata.collectorId ?? undefined,
      startDate: coerceDate(metadata.startDate),
      endDate: coerceDate(metadata.endDate),
      ipAddress: metadata.ipAddress ?? undefined,
      userAgent: metadata.userAgent ?? undefined,
      referrer: metadata.referrer ?? undefined,
      source: metadata.source ?? input.source ?? 'import',
      utmSource: metadata.utmSource ?? undefined,
      utmMedium: metadata.utmMedium ?? undefined,
      utmCampaign: metadata.utmCampaign ?? undefined,
    },
    contactInformation: {
      firstName: contactInformation.firstName ?? undefined,
      lastName: contactInformation.lastName ?? undefined,
      fullName: contactInformation.fullName ?? undefined,
      title: contactInformation.title ?? undefined,
      email: contactInformation.email ?? contactInformation.emailAddress ?? undefined,
      emailAddress: contactInformation.emailAddress ?? contactInformation.email ?? undefined,
      companyName: contactInformation.companyName ?? input.companyName ?? undefined,
      mediaOutletNames,
    },
    websiteAdvertising: input.websiteAdvertising ?? undefined,
    printAdvertising: input.printAdvertising ?? undefined,
    newsletterAdvertising: input.newsletterAdvertising ?? undefined,
    radioPodcastAdvertising: input.radioPodcastAdvertising ?? undefined,
    socialMedia: input.socialMedia ?? undefined,
    eventMarketing: input.eventMarketing ?? undefined,
    brandedContent: input.brandedContent ?? undefined,
    additionalServices: input.additionalServices ?? undefined,
    surveyResponses: input.surveyResponses ?? undefined,
    application: input.application ?? { status: 'new' },
  };

  return normalized;
}

async function importSurveysFromDir(dir: string) {
  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir)) {
    throw new Error(`Directory not found: ${absDir}`);
  }

  const files = fs.readdirSync(absDir).filter(f => f.endsWith('.json'));
  console.log(`📁 Found ${files.length} JSON file(s) in ${absDir}`);

  let success = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    const fullPath = path.join(absDir, file);
    try {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(raw);
      const records: any[] = Array.isArray(data) ? data : [data];

      for (const rec of records) {
        try {
          const submission = normalizeSubmission(rec);
          // Validate minimum required field
          if (!submission.contactInformation?.mediaOutletNames) {
            throw new Error('Missing contactInformation.mediaOutletNames');
          }
          await surveySubmissionsService.create(submission);
          success++;
        } catch (innerErr: any) {
          errors.push({ file: `${file}`, error: innerErr?.message || String(innerErr) });
        }
      }
      console.log(`✅ Imported file: ${file}`);
    } catch (err: any) {
      console.error(`❌ Failed to import file ${file}:`, err?.message || err);
      errors.push({ file, error: err?.message || String(err) });
    }
  }

  return { success, errors };
}

async function main() {
  try {
    const dir = process.argv[2] || path.join(process.cwd(), 'json_files', 'surveys');
    console.log('🚀 Connecting to MongoDB...');
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');

    const { success, errors } = await importSurveysFromDir(dir);
    console.log(`\n🎉 Import complete. Inserted ${success} submission(s).`);
    if (errors.length) {
      console.log(`\n⚠️  ${errors.length} error(s):`);
      for (const e of errors) {
        console.log(`- ${e.file}: ${e.error}`);
      }
      process.exitCode = 1;
    }
  } catch (error: any) {
    console.error('❌ Import failed:', error?.message || error);
    process.exit(1);
  }
}

main();


