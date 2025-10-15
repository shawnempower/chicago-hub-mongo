/**
 * Publication Field Mapping Configuration
 * Maps UI template fields to schema paths with metadata about mapping quality
 */

export type MappingStatus = 'full' | 'partial' | 'none';

export interface FieldMapping {
  label: string;
  schemaPath: string;
  mappingStatus: MappingStatus;
  warningMessage?: string;
  required?: boolean;
  transformToDisplay?: (value: any) => any;
  transformToSchema?: (value: any) => any;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'phone' | 'url' | 'textarea' | 'select' | 'array';
  options?: string[];
}

export interface SectionMapping {
  title: string;
  mappingStatus: MappingStatus;
  warningMessage?: string;
  fields: Record<string, FieldMapping>;
}

/**
 * Helper functions for data transformation
 */
export const transformers = {
  // Convert array to comma-separated string
  arrayToString: (arr: string[] | null | undefined): string => {
    if (!arr || !Array.isArray(arr)) return '';
    return arr.join(', ');
  },
  
  // Convert comma-separated string to array
  stringToArray: (str: string): string[] => {
    return str.split(',').map(s => s.trim()).filter(Boolean);
  },
  
  // Format age groups from percentages to readable text
  ageGroupsToText: (ageGroups: Record<string, number> | null | undefined): string => {
    if (!ageGroups) return '';
    const ranges = Object.entries(ageGroups)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([range, pct]) => `${range} (${pct}%)`);
    return ranges.join(', ') || '';
  },
  
  // Format income from percentages to readable text
  incomeToText: (income: Record<string, number> | null | undefined): string => {
    if (!income) return '';
    const primary = Object.entries(income)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])[0];
    return primary ? `${primary[0].replace(/([a-z])([A-Z])/g, '$1 $2')} (${primary[1]}% of audience)` : '';
  },
  
  // Format education from percentages to readable text
  educationToText: (education: Record<string, number> | null | undefined): string => {
    if (!education) return '';
    const primary = Object.entries(education)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])[0];
    return primary ? `${primary[0].replace(/([A-Z])/g, ' $1').trim()} (${primary[1]}% of audience)` : '';
  },
  
  // Calculate combined social media following
  calculateSocialFollowing: (socialMedia: any[] | null | undefined): number => {
    if (!socialMedia || !Array.isArray(socialMedia) || socialMedia.length === 0) return 0;
    return socialMedia.reduce((sum, platform) => {
      return sum + (platform?.metrics?.followers || 0);
    }, 0);
  },
  
  // Format social platforms with counts
  formatSocialPlatforms: (socialMedia: any[] | null | undefined): string => {
    if (!socialMedia || !Array.isArray(socialMedia) || socialMedia.length === 0) return '';
    return socialMedia
      .filter(p => p?.metrics?.followers > 0)
      .map(p => `${p.platform}: ${p.metrics.followers.toLocaleString()}`)
      .join(', ');
  }
};

/**
 * Complete field mapping configuration
 */
export const publicationFieldMapping: Record<string, SectionMapping> = {
  essentialInfo: {
    title: 'Essential Information',
    mappingStatus: 'full',
    fields: {
      publicationName: {
        label: 'Publication',
        schemaPath: 'basicInfo.publicationName',
        mappingStatus: 'full',
        required: true,
        type: 'text',
        placeholder: 'Publication name'
      },
      publicationType: {
        label: 'Type',
        schemaPath: 'basicInfo.publicationType',
        mappingStatus: 'full',
        required: true,
        type: 'select',
        options: ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'other']
      },
      primaryServiceArea: {
        label: 'Market',
        schemaPath: 'basicInfo.primaryServiceArea',
        mappingStatus: 'full',
        required: true,
        type: 'text',
        placeholder: 'City, State format'
      },
      founded: {
        label: 'Founded',
        schemaPath: 'basicInfo.founded',
        mappingStatus: 'full',
        type: 'number',
        placeholder: 'Year (YYYY)'
      },
      websiteUrl: {
        label: 'Website',
        schemaPath: 'basicInfo.websiteUrl',
        mappingStatus: 'full',
        required: true,
        type: 'url',
        placeholder: 'https://'
      },
      primaryContactName: {
        label: 'Primary Contact Name',
        schemaPath: 'contactInfo.salesContact.name',
        mappingStatus: 'partial',
        warningMessage: 'Using Sales Contact field',
        type: 'text'
      },
      primaryContactEmail: {
        label: 'Primary Email',
        schemaPath: 'contactInfo.salesContact.email',
        mappingStatus: 'partial',
        warningMessage: 'Using Sales Contact field',
        required: true,
        type: 'email'
      },
      primaryContactPhone: {
        label: 'Primary Phone',
        schemaPath: 'contactInfo.salesContact.phone',
        mappingStatus: 'partial',
        warningMessage: 'Using Sales Contact field',
        type: 'phone',
        placeholder: '(555) 555-5555'
      },
      salesContactName: {
        label: 'Sales Contact Name',
        schemaPath: 'contactInfo.advertisingDirector.name',
        mappingStatus: 'partial',
        warningMessage: 'Using Advertising Director field',
        type: 'text'
      },
      salesContactEmail: {
        label: 'Sales Email',
        schemaPath: 'contactInfo.advertisingDirector.email',
        mappingStatus: 'partial',
        warningMessage: 'Using Advertising Director field',
        type: 'email'
      },
      salesContactPhone: {
        label: 'Sales Phone',
        schemaPath: 'contactInfo.advertisingDirector.phone',
        mappingStatus: 'partial',
        warningMessage: 'Using Advertising Director field',
        type: 'phone'
      }
    }
  },
  
  businessInfo: {
    title: 'Business Information',
    mappingStatus: 'partial',
    fields: {
      legalEntity: {
        label: 'Legal Entity',
        schemaPath: 'businessInfo.legalEntity',
        mappingStatus: 'none',
        warningMessage: 'No schema field - requires schema update',
        type: 'text',
        placeholder: 'Full legal business name'
      },
      parentCompany: {
        label: 'Parent Company',
        schemaPath: 'businessInfo.parentCompany',
        mappingStatus: 'full',
        type: 'text'
      },
      taxId: {
        label: 'Tax ID/EIN',
        schemaPath: 'businessInfo.taxId',
        mappingStatus: 'none',
        warningMessage: 'No schema field - requires schema update',
        type: 'text',
        placeholder: 'XX-XXXXXXX'
      },
      businessAddress: {
        label: 'Business Address',
        schemaPath: 'basicInfo.headquarters',
        mappingStatus: 'partial',
        warningMessage: 'Using headquarters field',
        type: 'textarea',
        placeholder: 'Full address for contracts/invoicing'
      },
      sisterPublications: {
        label: 'Sister Publications',
        schemaPath: 'businessInfo.sisterPublications',
        mappingStatus: 'none',
        warningMessage: 'No schema array - requires schema update',
        type: 'array'
      },
      ownershipType: {
        label: 'Ownership Type',
        schemaPath: 'businessInfo.ownershipType',
        mappingStatus: 'full',
        type: 'select',
        options: ['independent', 'chain', 'nonprofit', 'public', 'private', 'family-owned']
      },
      yearsInOperation: {
        label: 'Years in Operation',
        schemaPath: 'businessInfo.yearsInOperation',
        mappingStatus: 'full',
        type: 'number'
      },
      accountingContactName: {
        label: 'Accounting Contact Name',
        schemaPath: 'contactInfo.accountingContact.name',
        mappingStatus: 'none',
        warningMessage: 'No accounting contact in schema',
        type: 'text'
      },
      accountingContactEmail: {
        label: 'Accounting Email',
        schemaPath: 'contactInfo.accountingContact.email',
        mappingStatus: 'none',
        warningMessage: 'No accounting contact in schema',
        type: 'email'
      },
      accountingContactPhone: {
        label: 'Accounting Phone',
        schemaPath: 'contactInfo.accountingContact.phone',
        mappingStatus: 'none',
        warningMessage: 'No accounting contact in schema',
        type: 'phone'
      }
    }
  },
  
  programEnrollment: {
    title: 'Program Enrollment',
    mappingStatus: 'none',
    warningMessage: 'This entire section requires schema update - data will not persist',
    fields: {
      programs: {
        label: 'Programs',
        schemaPath: 'programEnrollment',
        mappingStatus: 'none',
        warningMessage: 'Schema does not support program enrollment tracking',
        type: 'array'
      }
    }
  },
  
  geographicMarkets: {
    title: 'Geographic Markets',
    mappingStatus: 'partial',
    fields: {
      primaryCoverage: {
        label: 'Primary Coverage',
        schemaPath: 'basicInfo.primaryServiceArea',
        mappingStatus: 'full',
        required: true,
        type: 'text',
        placeholder: 'Neighborhood, city, region, or metro'
      },
      secondaryCoverage: {
        label: 'Secondary Coverage',
        schemaPath: 'basicInfo.secondaryMarkets',
        mappingStatus: 'partial',
        warningMessage: 'Array converted to comma-separated list',
        type: 'text',
        placeholder: 'Comma-separated if multiple',
        transformToDisplay: transformers.arrayToString,
        transformToSchema: transformers.stringToArray
      },
      fullDescription: {
        label: 'Full Description',
        schemaPath: 'basicInfo.geographicDescription',
        mappingStatus: 'none',
        warningMessage: 'No schema field for full geographic description',
        type: 'textarea',
        placeholder: 'Complete geographic scope'
      }
    }
  },
  
  audienceSnapshot: {
    title: 'Audience Snapshot',
    mappingStatus: 'partial',
    warningMessage: 'Schema has structured percentages; UI shows simplified text',
    fields: {
      age: {
        label: 'Age',
        schemaPath: 'audienceDemographics.ageGroups',
        mappingStatus: 'partial',
        warningMessage: 'Converts structured percentages to readable text',
        type: 'text',
        placeholder: 'Primary range or distribution',
        transformToDisplay: transformers.ageGroupsToText
      },
      income: {
        label: 'Income',
        schemaPath: 'audienceDemographics.householdIncome',
        mappingStatus: 'partial',
        warningMessage: 'Converts structured percentages to readable text',
        type: 'text',
        placeholder: 'Primary range or median',
        transformToDisplay: transformers.incomeToText
      },
      education: {
        label: 'Education',
        schemaPath: 'audienceDemographics.education',
        mappingStatus: 'partial',
        warningMessage: 'Converts structured percentages to readable text',
        type: 'text',
        placeholder: 'Primary level',
        transformToDisplay: transformers.educationToText
      },
      geography: {
        label: 'Geography',
        schemaPath: 'audienceDemographics.location',
        mappingStatus: 'full',
        type: 'text',
        placeholder: 'Primary markets'
      }
    }
  },
  
  positioningAndValue: {
    title: 'Positioning & Unique Value',
    mappingStatus: 'partial',
    fields: {
      marketPosition: {
        label: 'Market Position',
        schemaPath: 'competitiveInfo.uniqueValueProposition',
        mappingStatus: 'partial',
        warningMessage: 'Using Unique Value Proposition field',
        type: 'textarea',
        placeholder: 'How you position yourself'
      },
      uniqueDifferentiators: {
        label: 'What Makes You Unique',
        schemaPath: 'competitiveInfo.keyDifferentiators',
        mappingStatus: 'full',
        type: 'array'
      },
      bestFor: {
        label: 'Best For',
        schemaPath: 'competitiveInfo.bestFor',
        mappingStatus: 'none',
        warningMessage: 'No schema field for "Best For"',
        type: 'textarea',
        placeholder: 'Types of advertisers who succeed with you'
      }
    }
  },
  
  notes: {
    title: 'Notes',
    mappingStatus: 'full',
    fields: {
      operationalNotes: {
        label: 'Notes',
        schemaPath: 'internalNotes.operationalNotes',
        mappingStatus: 'full',
        type: 'textarea',
        placeholder: 'Any important context, special considerations, or internal notes'
      }
    }
  }
};

