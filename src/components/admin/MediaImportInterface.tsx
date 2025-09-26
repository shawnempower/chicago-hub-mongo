import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedOutletData {
  name: string;
  website_url: string;
  type: string;
  founding_year?: number;
  publication_frequency?: string;
  staff_count?: number;
  monthly_visitors?: number;
  email_subscribers?: number;
  open_rate?: number;
  primary_market?: string;
  secondary_markets?: string[];
  demographics?: any;
  editorial_focus?: string[];
  competitive_advantages?: string;
  business_model?: string;
  ownership_type?: string;
  awards?: any[];
  key_personnel?: any[];
  technical_specs?: any;
  contact_email?: string;
  contact_phone?: string;
  coverage_area?: string;
  audience_size?: string;
  description?: string;
  tagline?: string;
  social_media?: any;
}

interface ParsedInventoryData {
  package_name: string;
  package_type: string;
  placement_options: any[];
  pricing_tiers: any[];
  technical_requirements: any;
  file_requirements: any;
  performance_metrics: any;
  availability_schedule?: string;
  min_commitment?: string;
  max_commitment?: string;
  lead_time?: string;
  cancellation_policy?: string;
  description?: string;
}

interface MediaImportInterfaceProps {
  onImportSuccess?: () => void;
}

export const MediaImportInterface = ({ onImportSuccess }: MediaImportInterfaceProps) => {
  const [profileMarkdown, setProfileMarkdown] = useState('');
  const [inventoryMarkdown, setInventoryMarkdown] = useState('');
  const [parsedData, setParsedData] = useState<{
    outlet: ParsedOutletData | null;
    inventory: ParsedInventoryData[];
  }>({ outlet: null, inventory: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parseProfileMarkdown = (markdown: string): ParsedOutletData | null => {
    if (!markdown.trim()) return null;

    try {
      const lines = markdown.split('\n');
      const data: ParsedOutletData = {
        name: '',
        website_url: '',
        type: 'digital publication'
      };

      // Extract basic information
      lines.forEach((line, index) => {
        const cleanLine = line.trim();
        
        if (cleanLine.includes('**Publication Name**:')) {
          data.name = cleanLine.split(':')[1]?.trim() || '';
        }
        if (cleanLine.includes('**Website URL**:')) {
          data.website_url = cleanLine.split(':')[1]?.trim() || '';
        }
        if (cleanLine.includes('**Founded**:')) {
          const foundedMatch = cleanLine.match(/(\d{4})/);
          if (foundedMatch) data.founding_year = parseInt(foundedMatch[1]);
        }
        if (cleanLine.includes('**Publication Type**:')) {
          data.publication_frequency = cleanLine.split(':')[1]?.trim() || '';
        }
        if (cleanLine.includes('**Primary Service Area**:') || cleanLine.includes('**Geographic Market**:')) {
          data.primary_market = cleanLine.split(':')[1]?.trim() || '';
        }
        if (cleanLine.includes('**Secondary Markets**:')) {
          const markets = cleanLine.split(':')[1]?.trim().split(',').map(m => m.trim()) || [];
          data.secondary_markets = markets;
        }
        if (cleanLine.includes('**Monthly Website Visitors**:')) {
          const visitorMatch = cleanLine.match(/(\d{1,3}(?:,\d{3})*)/);
          if (visitorMatch) data.monthly_visitors = parseInt(visitorMatch[1].replace(/,/g, ''));
        }
        if (cleanLine.includes('**Total Email Reach**:')) {
          const subscriberMatch = cleanLine.match(/(\d{1,3}(?:,\d{3})*)/);
          if (subscriberMatch) data.email_subscribers = parseInt(subscriberMatch[1].replace(/,/g, ''));
        }
        if (cleanLine.includes('**Average Open Rate**:')) {
          const rateMatch = cleanLine.match(/(\d+)%/);
          if (rateMatch) data.open_rate = parseInt(rateMatch[1]);
        }
        if (cleanLine.includes('**Advertising Contact**:') || cleanLine.includes('**Publisher/Editor**:')) {
          const emailMatch = cleanLine.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (emailMatch) data.contact_email = emailMatch[1];
          const phoneMatch = cleanLine.match(/(\d{3}-\d{3}-\d{4})/);
          if (phoneMatch) data.contact_phone = phoneMatch[1];
        }
        if (cleanLine.includes('**Total Staff**:')) {
          const staffMatch = cleanLine.match(/(\d+)/);
          if (staffMatch) data.staff_count = parseInt(staffMatch[1]);
        }
        if (cleanLine.includes('**Ownership Type**:')) {
          data.ownership_type = cleanLine.split(':')[1]?.trim() || '';
        }
        if (cleanLine.includes('**Unique Value Proposition**:')) {
          data.competitive_advantages = cleanLine.split(':')[1]?.trim() || '';
        }
      });

      // Extract demographics
      const demographicsSection = markdown.match(/## Audience Demographics([\s\S]*?)##/);
      if (demographicsSection) {
        const demoData: any = {};
        const demoLines = demographicsSection[1].split('\n');
        
        demoLines.forEach(line => {
          if (line.includes('- Male:')) {
            demoData.gender = { male: line.match(/(\d+)%/)?.[1] || '50' };
          }
          if (line.includes('- Female:')) {
            if (!demoData.gender) demoData.gender = {};
            demoData.gender.female = line.match(/(\d+)%/)?.[1] || '50';
          }
          if (line.includes('- $100K+:')) {
            demoData.income = { high_income: line.match(/(\d+)%/)?.[1] || '0' };
          }
          if (line.includes('- Graduate Degree:')) {
            demoData.education = { graduate_degree: line.match(/(\d+)%/)?.[1] || '0' };
          }
          if (line.includes('- Have Children:')) {
            demoData.family = { have_children: line.match(/(\d+)%/)?.[1] || '0' };
          }
          if (line.includes('- Mobile Readership:')) {
            demoData.device = { mobile: line.match(/(\d+)%/)?.[1] || '0' };
          }
        });
        
        data.demographics = demoData;
      }

      // Extract editorial focus
      const editorialSection = markdown.match(/## Editorial Information([\s\S]*?)##/);
      if (editorialSection) {
        const editorialData = editorialSection[1];
        if (editorialData.includes('**Primary Coverage Areas**:')) {
          const focusMatch = editorialData.match(/\*\*Primary Coverage Areas\*\*:\s*([^\n]+)/);
          if (focusMatch) {
            data.editorial_focus = focusMatch[1].split(',').map(f => f.trim());
          }
        }
      }

      // Extract awards
      const awardsSection = markdown.match(/## Competitive Positioning([\s\S]*?)##/);
      if (awardsSection) {
        const awardsData = awardsSection[1];
        const awards = [];
        if (awardsData.includes('Emmy Award')) awards.push({ type: 'Emmy Award', recipient: 'Jeff Hirsh' });
        if (awardsData.includes('Sigma Delta Chi')) awards.push({ type: 'Sigma Delta Chi Award', recipient: 'Jeff Hirsh' });
        if (awardsData.includes('Spirit of Evanston')) awards.push({ type: 'Spirit of Evanston Award', recipient: 'Bill Smith' });
        data.awards = awards;
      }

      // Set basic fields
      data.description = `${data.name} is a ${data.publication_frequency || 'digital'} publication serving ${data.primary_market || 'the local community'}.`;
      data.tagline = 'Local news and community coverage';
      data.coverage_area = data.primary_market || '';
      data.audience_size = data.monthly_visitors ? `${data.monthly_visitors.toLocaleString()} monthly visitors` : '';
      data.business_model = 'Display advertising, sponsored content, email marketing, paid memberships';
      data.social_media = { total_followers: 12500 };

      return data;
    } catch (err) {
      console.error('Error parsing profile markdown:', err);
      return null;
    }
  };

  const parseInventoryMarkdown = (markdown: string): ParsedInventoryData[] => {
    if (!markdown.trim()) return [];

    try {
      const inventory: ParsedInventoryData[] = [];

      // Parse display advertising packages
      const displayMatches = markdown.matchAll(/\*\*(Best|Better|Good) Visibility Package\*\*([\s\S]*?)(?=\*\*|##|$)/g);
      
      for (const match of displayMatches) {
        const packageType = match[1];
        const content = match[2];
        
        const placementMatch = content.match(/- Placement:\s*([^\n]+)/);
        const monthlyRateMatch = content.match(/- Monthly Rate:\s*\$(\d+)/);
        const annualRateMatch = content.match(/- Annual Rate:\s*\$(\d+)/);
        const impressionsMatch = content.match(/- Monthly Impressions:\s*([^\n]+)/);

        inventory.push({
          package_name: `${packageType} Visibility Package`,
          package_type: 'Display Advertising',
          placement_options: [placementMatch?.[1] || ''],
          pricing_tiers: [
            { duration: 'monthly', price: monthlyRateMatch?.[1] || '0' },
            { duration: 'annual', price: annualRateMatch?.[1] || '0' }
          ],
          technical_requirements: {
            file_types: ['JPG', 'PNG', 'GIF', 'HTML5'],
            max_file_size: '125KB',
            animation: 'Allowed (must end after 15 seconds)'
          },
          file_requirements: {
            formats: ['JPG', 'PNG', 'GIF', 'HTML5'],
            size_limit: '125KB'
          },
          performance_metrics: {
            monthly_impressions: impressionsMatch?.[1] || 'Not specified'
          },
          description: content.trim()
        });
      }

      // Parse sponsored content
      const sponsoredMatch = markdown.match(/#### Website Sponsored Posts([\s\S]*?)####/);
      if (sponsoredMatch) {
        const content = sponsoredMatch[1];
        const singleRateMatch = content.match(/- Single Post Rate:\s*\$(\d+)/);
        const packageRateMatch = content.match(/- 12-Post Package:\s*\$(\d+)/);

        inventory.push({
          package_name: 'Sponsored Content',
          package_type: 'Content Marketing',
          placement_options: ['Website', 'Newsletter'],
          pricing_tiers: [
            { duration: 'single', price: singleRateMatch?.[1] || '0' },
            { duration: '12-posts', price: packageRateMatch?.[1] || '0' }
          ],
          technical_requirements: {
            word_count: 'Flexible',
            includes: 'Homepage promotion, newsletter inclusion'
          },
          file_requirements: {},
          performance_metrics: {},
          description: 'Sponsored posts with homepage and newsletter promotion'
        });
      }

      // Parse email marketing
      const emailMatch = markdown.match(/#### Email Blasts \(Dedicated Sends\)([\s\S]*?)###/);
      if (emailMatch) {
        const content = emailMatch[1];
        const rateMatch = content.match(/- Single Blast Rate:\s*\$(\d+)/);
        const packageMatch = content.match(/- 12-Blast Package:\s*\$(\d+)/);

        inventory.push({
          package_name: 'Email Blast',
          package_type: 'Email Marketing',
          placement_options: ['Newsletter 1', 'Newsletter 2', 'Both Newsletters'],
          pricing_tiers: [
            { duration: 'single', price: rateMatch?.[1] || '0' },
            { duration: '12-blasts', price: packageMatch?.[1] || '0' }
          ],
          technical_requirements: {
            format: 'Graphical email',
            reach: '~24,800 subscribers',
            open_rate: '45%'
          },
          file_requirements: {
            format: 'Graphical'
          },
          performance_metrics: {
            expected_opens: '11,160',
            open_rate: '45%'
          },
          description: 'Dedicated email sends to subscriber base'
        });
      }

      return inventory;
    } catch (err) {
      console.error('Error parsing inventory markdown:', err);
      return [];
    }
  };

  const handleParseFiles = () => {
    setError(null);
    
    const outlet = parseProfileMarkdown(profileMarkdown);
    const inventory = parseInventoryMarkdown(inventoryMarkdown);
    
    if (!outlet && !inventory.length) {
      setError('Please provide valid markdown content for either profile or inventory.');
      return;
    }
    
    setParsedData({ outlet, inventory });
  };

  const handleImport = async () => {
    if (!parsedData.outlet) {
      setError('No outlet data to import.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Insert media outlet
      const { data: outletData, error: outletError } = await supabase
        .from('media_outlets')
        .insert([parsedData.outlet])
        .select()
        .single();

      if (outletError) throw outletError;

      // Insert advertising inventory if available
      if (parsedData.inventory.length > 0) {
        const inventoryRecords = parsedData.inventory.map(item => ({
          ...item,
          media_outlet_id: outletData.id
        }));

        const { error: inventoryError } = await supabase
          .from('advertising_inventory')
          .insert(inventoryRecords);

        if (inventoryError) throw inventoryError;
      }

      setSuccess(true);
      toast.success('Media outlet imported successfully!');
      
      // Call success callback to navigate to Enhanced Outlets tab
      if (onImportSuccess) {
        setTimeout(() => {
          onImportSuccess();
        }, 1000); // Small delay to show success message
      }
      
      // Reset form
      setProfileMarkdown('');
      setInventoryMarkdown('');
      setParsedData({ outlet: null, inventory: [] });
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during import.');
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Media Outlet Import
          </CardTitle>
          <CardDescription>
            Import media outlet profiles and advertising inventory from markdown files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profile">Media Outlet Profile (Markdown)</Label>
              <Textarea
                id="profile"
                placeholder="Paste the outlet profile markdown content here..."
                value={profileMarkdown}
                onChange={(e) => setProfileMarkdown(e.target.value)}
                rows={10}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="inventory">Advertising Inventory (Markdown)</Label>
              <Textarea
                id="inventory"
                placeholder="Paste the advertising inventory markdown content here..."
                value={inventoryMarkdown}
                onChange={(e) => setInventoryMarkdown(e.target.value)}
                rows={10}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleParseFiles}
              variant="outline"
              disabled={!profileMarkdown.trim() && !inventoryMarkdown.trim()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Parse Content
            </Button>
            
            <Button 
              onClick={handleImport}
              disabled={!parsedData.outlet || isLoading}
            >
              {isLoading ? 'Importing...' : 'Import to Database'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Media outlet imported successfully! 
                {onImportSuccess && (
                  <Button 
                    variant="link" 
                    className="p-0 h-auto ml-2"
                    onClick={onImportSuccess}
                  >
                    View in Enhanced Outlets →
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {parsedData.outlet && (
            <Card>
              <CardHeader>
                <CardTitle>Parsed Data Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {parsedData.outlet.name}</p>
                  <p><strong>Website:</strong> {parsedData.outlet.website_url}</p>
                  <p><strong>Founded:</strong> {parsedData.outlet.founding_year}</p>
                  <p><strong>Monthly Visitors:</strong> {parsedData.outlet.monthly_visitors?.toLocaleString()}</p>
                  <p><strong>Email Subscribers:</strong> {parsedData.outlet.email_subscribers?.toLocaleString()}</p>
                  <p><strong>Open Rate:</strong> {parsedData.outlet.open_rate}%</p>
                  <p><strong>Staff Count:</strong> {parsedData.outlet.staff_count}</p>
                  <p><strong>Inventory Items:</strong> {parsedData.inventory.length}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};