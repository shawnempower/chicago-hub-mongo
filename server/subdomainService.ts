import { 
  Route53Client, 
  ChangeResourceRecordSetsCommand,
  ListResourceRecordSetsCommand 
} from '@aws-sdk/client-route-53';
import { 
  CloudFrontClient, 
  GetDistributionConfigCommand,
  UpdateDistributionCommand 
} from '@aws-sdk/client-cloudfront';

// Configuration loaded from environment variables
// In production: AWS Systems Manager Parameter Store (SSM)
// In development: .env file
const getConfig = () => ({
  DOMAIN: process.env.STOREFRONT_DOMAIN,
  HOSTED_ZONE_ID: process.env.STOREFRONT_HOSTED_ZONE_ID,
  CLOUDFRONT_DISTRIBUTION_ID: process.env.STOREFRONT_CLOUDFRONT_DISTRIBUTION_ID,
  CLOUDFRONT_DOMAIN: process.env.STOREFRONT_CLOUDFRONT_DOMAIN,
  SSL_CERTIFICATE_ARN: process.env.STOREFRONT_SSL_CERTIFICATE_ARN,
  AWS_REGION: process.env.STOREFRONT_AWS_REGION,
  DNS_TTL: parseInt(process.env.STOREFRONT_DNS_TTL || '300')
});

// Validate configuration (called when service is instantiated)
const validateConfig = () => {
  const CONFIG = getConfig();
  const missingConfig = Object.entries(CONFIG)
    .filter(([key, value]) => key !== 'DNS_TTL' && !value)
    .map(([key]) => `STOREFRONT_${key}`);

  if (missingConfig.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingConfig.join(', ')}\n` +
      'Please ensure these are set in your .env file (development) or AWS SSM Parameter Store (production)'
    );
  }
  return CONFIG;
};

interface SubdomainSetupResult {
  success: boolean;
  fullDomain: string;
  alreadyConfigured: boolean;
  error?: string;
}

export class SubdomainService {
  private route53Client: Route53Client;
  private cloudFrontClient: CloudFrontClient;
  private CONFIG: ReturnType<typeof getConfig>;

  constructor() {
    // Validate and get config when service is instantiated
    this.CONFIG = validateConfig();
    
    const awsConfig = {
      region: this.CONFIG.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    };

    this.route53Client = new Route53Client(awsConfig);
    this.cloudFrontClient = new CloudFrontClient(awsConfig);
  }

  /**
   * Check if Route53 CNAME already exists
   */
  private async checkRoute53Exists(fullDomain: string): Promise<boolean> {
    try {
      const command = new ListResourceRecordSetsCommand({
        HostedZoneId: this.CONFIG.HOSTED_ZONE_ID,
        StartRecordName: fullDomain,
        StartRecordType: 'CNAME',
        MaxItems: 1
      });

      const response = await this.route53Client.send(command);
      
      if (response.ResourceRecordSets && response.ResourceRecordSets.length > 0) {
        const record = response.ResourceRecordSets[0];
        return record.Name === `${fullDomain}.` && record.Type === 'CNAME';
      }
      
      return false;
    } catch (error) {
      console.error('Error checking Route53:', error);
      return false;
    }
  }

  /**
   * Check if CloudFront alias already exists
   */
  private async checkCloudFrontHasAlias(fullDomain: string): Promise<boolean> {
    try {
      const command = new GetDistributionConfigCommand({
        Id: this.CONFIG.CLOUDFRONT_DISTRIBUTION_ID
      });

      const response = await this.cloudFrontClient.send(command);
      const aliases = response.DistributionConfig?.Aliases?.Items || [];
      
      return aliases.includes(fullDomain);
    } catch (error) {
      console.error('Error checking CloudFront:', error);
      return false;
    }
  }

  /**
   * Create Route53 CNAME record
   */
  private async createRoute53Record(fullDomain: string): Promise<void> {
    const command = new ChangeResourceRecordSetsCommand({
      HostedZoneId: this.CONFIG.HOSTED_ZONE_ID,
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: fullDomain,
              Type: 'CNAME',
              TTL: this.CONFIG.DNS_TTL,
              ResourceRecords: [{ Value: this.CONFIG.CLOUDFRONT_DOMAIN }]
            }
          }
        ]
      }
    });

    await this.route53Client.send(command);
    console.log(`✅ Route53 CNAME created: ${fullDomain} → ${this.CONFIG.CLOUDFRONT_DOMAIN}`);
  }

  /**
   * Add alias to CloudFront distribution
   */
  private async addCloudFrontAlias(fullDomain: string): Promise<void> {
    // Get current config
    const getCommand = new GetDistributionConfigCommand({
      Id: this.CONFIG.CLOUDFRONT_DISTRIBUTION_ID
    });

    const getResponse = await this.cloudFrontClient.send(getCommand);
    const config = getResponse.DistributionConfig!;
    const etag = getResponse.ETag!;
    const currentAliases = config.Aliases?.Items || [];

    // Add new alias
    const newAliases = [...currentAliases, fullDomain];

    config.Aliases = {
      Quantity: newAliases.length,
      Items: newAliases
    };

    // Ensure SSL certificate is configured
    config.ViewerCertificate = {
      ACMCertificateArn: this.CONFIG.SSL_CERTIFICATE_ARN,
      SSLSupportMethod: 'sni-only',
      MinimumProtocolVersion: 'TLSv1.2_2021',
      Certificate: this.CONFIG.SSL_CERTIFICATE_ARN,
      CertificateSource: 'acm'
    };

    // Update distribution
    const updateCommand = new UpdateDistributionCommand({
      Id: this.CONFIG.CLOUDFRONT_DISTRIBUTION_ID,
      DistributionConfig: config,
      IfMatch: etag
    });

    await this.cloudFrontClient.send(updateCommand);
    console.log(`✅ CloudFront alias added: ${fullDomain}`);
  }

  /**
   * Setup subdomain - only if not already configured
   */
  async setupSubdomain(subdomain: string): Promise<SubdomainSetupResult> {
    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return {
        success: false,
        fullDomain: `${subdomain}.${this.CONFIG.DOMAIN}`,
        alreadyConfigured: false,
        error: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.'
      };
    }

    const fullDomain = `${subdomain}.${this.CONFIG.DOMAIN}`;

    try {
      console.log(`🔧 Checking subdomain: ${fullDomain}`);

      // Check if already configured
      const [route53Exists, cloudFrontHasAlias] = await Promise.all([
        this.checkRoute53Exists(fullDomain),
        this.checkCloudFrontHasAlias(fullDomain)
      ]);

      if (route53Exists && cloudFrontHasAlias) {
        console.log(`ℹ️  Subdomain already configured: ${fullDomain}`);
        return {
          success: true,
          fullDomain,
          alreadyConfigured: true
        };
      }

      // Setup what's missing
      if (!route53Exists) {
        console.log(`📝 Creating Route53 record for: ${fullDomain}`);
        await this.createRoute53Record(fullDomain);
      }

      if (!cloudFrontHasAlias) {
        console.log(`📝 Adding CloudFront alias for: ${fullDomain}`);
        await this.addCloudFrontAlias(fullDomain);
      }

      console.log(`✅ Subdomain setup complete: ${fullDomain}`);
      
      return {
        success: true,
        fullDomain,
        alreadyConfigured: false
      };
    } catch (error: any) {
      console.error(`❌ Error setting up subdomain ${fullDomain}:`, error);
      return {
        success: false,
        fullDomain,
        alreadyConfigured: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}

// Singleton instance
let _subdomainService: SubdomainService | null | undefined;

export const subdomainService = (): SubdomainService | null => {
  if (_subdomainService === undefined) {
    // Check if AWS credentials are available
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('⚠️  AWS credentials not configured. Subdomain service disabled.');
      _subdomainService = null;
    } else {
      // Check if STOREFRONT config is available before instantiating
      const config = getConfig();
      const missingConfig = Object.entries(config)
        .filter(([key, value]) => key !== 'DNS_TTL' && !value)
        .map(([key]) => `STOREFRONT_${key}`);
      
      if (missingConfig.length > 0) {
        console.warn(`⚠️  STOREFRONT configuration incomplete (missing: ${missingConfig.join(', ')}). Subdomain service disabled.`);
        _subdomainService = null;
      } else {
        try {
          _subdomainService = new SubdomainService();
          console.log('✅ Subdomain service initialized');
        } catch (error) {
          console.error('❌ Failed to initialize subdomain service:', error);
          _subdomainService = null;
        }
      }
    }
  }
  return _subdomainService;
};

