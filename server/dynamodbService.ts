import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

interface DynamoDBConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

interface WebAnalyticsRecord {
  domain: string;
  date: string;
  datedomain: string;
  pageViews: number;
  visitors: number;
  desktopViews: number;
  mobileViews: number;
}

export interface WebAnalyticsResult {
  dataAvailable: boolean;
  visitors?: number;
  pageViews?: number;
  mobilePercentage?: number;
  desktopPercentage?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  daysWithData?: number;
  trackingScript?: string;
  publicationKey?: string;
}

export class DynamoDBService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string = 'WebAnalyticsAggregateDomain';
  private indexName: string = 'domain-date-index';

  constructor(config: DynamoDBConfig) {
    const client = new DynamoDBClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  /**
   * Normalize a URL to match DynamoDB domain format
   * DynamoDB stores domains as full URLs like "https://www.example.com"
   */
  private normalizeDomain(url: string): string {
    let domain = url.trim().toLowerCase();
    
    // Remove trailing slash
    domain = domain.replace(/\/+$/, '');
    
    // Add https:// if no protocol
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }
    
    return domain;
  }

  /**
   * Generate publication key from domain for tracking script
   * e.g., "www.example.com" -> "example-com"
   * e.g., "https://news.chicago.com" -> "news-chicago-com"
   */
  generatePublicationKey(url: string): string {
    let domain = url.trim().toLowerCase();
    
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');
    
    // Remove www. prefix
    domain = domain.replace(/^www\./, '');
    
    // Remove trailing slash
    domain = domain.replace(/\/+$/, '');
    
    // Replace dots with hyphens
    domain = domain.replace(/\./g, '-');
    
    return domain;
  }

  /**
   * Generate the tracking script HTML for a publication
   */
  generateTrackingScript(publicationKey: string): string {
    return `<script async type='text/javascript' src='https://adbundle.empowerlocal.co/bundle.js?publicationKey=${publicationKey}'></script>`;
  }

  /**
   * Get the date string for N days ago in YYYY-MM-DD format
   */
  private getDateString(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  /**
   * Query analytics for a domain with date range
   */
  private async queryDomainAnalytics(domain: string, startDate: string, endDate: string): Promise<WebAnalyticsRecord[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: this.indexName,
        KeyConditionExpression: '#domain = :domain AND #date BETWEEN :startDate AND :endDate',
        ExpressionAttributeNames: {
          '#domain': 'domain',
          '#date': 'date',
        },
        ExpressionAttributeValues: {
          ':domain': domain,
          ':startDate': startDate,
          ':endDate': endDate,
        },
      });

      const response = await this.docClient.send(command);
      return (response.Items || []) as WebAnalyticsRecord[];
    } catch (error) {
      console.error('Error querying DynamoDB:', error);
      return [];
    }
  }

  /**
   * Get aggregated web analytics for a domain over the last 30 days
   */
  async getWebAnalytics(websiteUrl: string): Promise<WebAnalyticsResult> {
    const normalizedDomain = this.normalizeDomain(websiteUrl);
    const publicationKey = this.generatePublicationKey(websiteUrl);
    const trackingScript = this.generateTrackingScript(publicationKey);
    
    const endDate = this.getDateString(0); // Today
    const startDate = this.getDateString(30); // 30 days ago

    // Try exact match first
    let records = await this.queryDomainAnalytics(normalizedDomain, startDate, endDate);

    // If no data, try with www prefix added/removed
    if (records.length === 0) {
      const url = new URL(normalizedDomain);
      const alternativeDomain = url.hostname.startsWith('www.')
        ? normalizedDomain.replace('://www.', '://')
        : normalizedDomain.replace('://', '://www.');
      
      records = await this.queryDomainAnalytics(alternativeDomain, startDate, endDate);
    }

    // If still no data, return with tracking script
    if (records.length === 0) {
      return {
        dataAvailable: false,
        trackingScript,
        publicationKey,
      };
    }

    // Aggregate the data
    const totals = records.reduce(
      (acc, record) => ({
        visitors: acc.visitors + (record.visitors || 0),
        pageViews: acc.pageViews + (record.pageViews || 0),
        desktopViews: acc.desktopViews + (record.desktopViews || 0),
        mobileViews: acc.mobileViews + (record.mobileViews || 0),
      }),
      { visitors: 0, pageViews: 0, desktopViews: 0, mobileViews: 0 }
    );

    // Calculate percentages
    const totalDeviceViews = totals.desktopViews + totals.mobileViews;
    const mobilePercentage = totalDeviceViews > 0
      ? Math.round((totals.mobileViews / totalDeviceViews) * 100)
      : 0;
    const desktopPercentage = totalDeviceViews > 0
      ? Math.round((totals.desktopViews / totalDeviceViews) * 100)
      : 0;

    // Get actual date range from records
    const dates = records.map(r => r.date).sort();
    const actualStartDate = dates[0];
    const actualEndDate = dates[dates.length - 1];

    return {
      dataAvailable: true,
      visitors: totals.visitors,
      pageViews: totals.pageViews,
      mobilePercentage,
      desktopPercentage,
      dateRange: {
        start: actualStartDate,
        end: actualEndDate,
      },
      daysWithData: records.length,
      trackingScript,
      publicationKey,
    };
  }

  /**
   * Check if analytics data exists for a domain (quick check)
   */
  async hasAnalyticsData(websiteUrl: string): Promise<boolean> {
    const result = await this.getWebAnalytics(websiteUrl);
    return result.dataAvailable;
  }
}

// Create and export DynamoDB service instance
export const createDynamoDBService = (): DynamoDBService | null => {
  const config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_DYNAMODB_REGION || process.env.AWS_REGION || 'us-east-2',
  };

  // Check if required config is present
  if (!config.accessKeyId || !config.secretAccessKey) {
    console.warn('AWS DynamoDB configuration incomplete. Web analytics service disabled.');
    return null;
  }

  return new DynamoDBService(config);
};

// Lazy-load DynamoDB service to ensure environment variables are loaded
let _dynamodbService: DynamoDBService | null | undefined;

export const getDynamoDBService = (): DynamoDBService | null => {
  if (_dynamodbService === undefined) {
    _dynamodbService = createDynamoDBService();
  }
  return _dynamodbService;
};

// Export as a getter function
export { getDynamoDBService as dynamodbService };


