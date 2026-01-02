import { Router } from 'express';
import { authenticateToken } from '../middleware/authenticate';
import { getDynamoDBService } from '../dynamodbService';

const router = Router();

/**
 * Web Analytics Routes
 * 
 * These endpoints provide real-time web analytics data from DynamoDB
 * for publications with tracking scripts installed.
 */

/**
 * GET /api/web-analytics
 * Get aggregated web analytics for a domain (last 30 days)
 * 
 * Query params:
 *   - domain: The website URL/domain to get analytics for
 * 
 * Returns:
 *   - dataAvailable: boolean
 *   - visitors: number (if data available)
 *   - pageViews: number (if data available)
 *   - mobilePercentage: number (if data available)
 *   - desktopPercentage: number (if data available)
 *   - dateRange: { start: string, end: string } (if data available)
 *   - daysWithData: number (if data available)
 *   - trackingScript: string (the script tag to add if no data)
 *   - publicationKey: string (the publication key used in tracking)
 */
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const domain = req.query.domain as string;

    if (!domain) {
      return res.status(400).json({ 
        error: 'Missing domain parameter',
        message: 'Please provide a domain query parameter'
      });
    }

    const dynamodbService = getDynamoDBService();

    if (!dynamodbService) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Web analytics service is not configured',
        dataAvailable: false
      });
    }

    const analytics = await dynamodbService.getWebAnalytics(domain);

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching web analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch web analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
      dataAvailable: false
    });
  }
});

/**
 * GET /api/web-analytics/tracking-script
 * Generate a tracking script for a domain (doesn't require data to exist)
 * 
 * Query params:
 *   - domain: The website URL/domain
 * 
 * Returns:
 *   - publicationKey: string
 *   - trackingScript: string
 */
router.get('/tracking-script', authenticateToken, async (req: any, res) => {
  try {
    const domain = req.query.domain as string;

    if (!domain) {
      return res.status(400).json({ 
        error: 'Missing domain parameter',
        message: 'Please provide a domain query parameter'
      });
    }

    const dynamodbService = getDynamoDBService();

    if (!dynamodbService) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Web analytics service is not configured'
      });
    }

    const publicationKey = dynamodbService.generatePublicationKey(domain);
    const trackingScript = dynamodbService.generateTrackingScript(publicationKey);

    res.json({
      publicationKey,
      trackingScript,
      instructions: 'Add this script to your website\'s <head> section to enable analytics tracking.'
    });
  } catch (error) {
    console.error('Error generating tracking script:', error);
    res.status(500).json({ 
      error: 'Failed to generate tracking script',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/web-analytics/check
 * Quick check if analytics data exists for a domain
 * 
 * Query params:
 *   - domain: The website URL/domain
 * 
 * Returns:
 *   - hasData: boolean
 */
router.get('/check', authenticateToken, async (req: any, res) => {
  try {
    const domain = req.query.domain as string;

    if (!domain) {
      return res.status(400).json({ 
        error: 'Missing domain parameter',
        message: 'Please provide a domain query parameter'
      });
    }

    const dynamodbService = getDynamoDBService();

    if (!dynamodbService) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Web analytics service is not configured',
        hasData: false
      });
    }

    const hasData = await dynamodbService.hasAnalyticsData(domain);

    res.json({ hasData });
  } catch (error) {
    console.error('Error checking analytics data:', error);
    res.status(500).json({ 
      error: 'Failed to check analytics data',
      message: error instanceof Error ? error.message : 'Unknown error',
      hasData: false
    });
  }
});

export default router;


