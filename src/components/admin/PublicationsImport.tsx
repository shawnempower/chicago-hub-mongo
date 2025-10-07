import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';
import { 
  Upload, FileJson, Eye, Play, AlertCircle, CheckCircle, 
  XCircle, RefreshCw, Download, FileText, Zap
} from 'lucide-react';

interface ImportResult {
  action: 'create' | 'update' | 'skip' | 'error';
  publication: any;
  existing?: any;
  changes?: any;
  error?: string;
  reason?: string;
}

interface ImportOptions {
  preview: boolean;
  force: boolean;
  matchField: string;
  updateMode: 'update' | 'skip';
}

export const PublicationsImport = () => {
  const [importData, setImportData] = useState('');
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [options, setOptions] = useState<ImportOptions>({
    preview: true,
    force: false,
    matchField: 'publicationId',
    updateMode: 'update'
  });

  // Get auth headers for API calls
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  const sampleData = `[
  {
    "_id": "sample_001",
    "publicationId": 2001,
    "basicInfo": {
      "publicationName": "Sample Publication",
      "websiteUrl": "https://samplepub.com",
      "founded": "2020",
      "publicationType": "weekly",
      "contentType": "news",
      "headquarters": "Chicago, IL",
      "geographicCoverage": "local",
      "primaryServiceArea": "Chicago Metro",
      "secondaryMarkets": ["Suburbs", "Cook County"],
      "numberOfPublications": 1
    },
    "contactInfo": {
      "mainPhone": "(555) 123-4567",
      "businessHours": "Monday-Friday 9AM-5PM",
      "salesContact": {
        "name": "Jane Smith",
        "title": "Sales Director",
        "email": "sales@samplepub.com",
        "phone": "(555) 123-4568",
        "preferredContact": "email"
      },
      "editorialContact": {
        "name": "John Doe",
        "title": "Editor-in-Chief",
        "email": "editor@samplepub.com",
        "phone": "(555) 123-4569"
      }
    },
    "audienceDemographics": {
      "totalAudience": 50000,
      "ageGroups": {
        "25-34": 25,
        "35-44": 30,
        "45-54": 25,
        "55-64": 15,
        "65+": 5
      },
      "householdIncome": {
        "50k-75k": 20,
        "75k-100k": 30,
        "100k-150k": 25,
        "over150k": 25
      },
      "education": {
        "bachelors": 60,
        "graduate": 30
      },
      "targetMarkets": ["Young professionals", "Families"],
      "interests": ["Local news", "Business", "Culture"]
    },
    "editorialInfo": {
      "contentFocus": ["Local News", "Business", "Culture"],
      "contentPillars": ["Community focus", "Business coverage", "Cultural events"],
      "specialSections": ["Business Weekly", "Arts & Culture", "Local Politics"],
      "signatureFeatures": ["Weekly roundup", "Business profiles", "Event calendar"]
    },
    "businessInfo": {
      "ownershipType": "private",
      "yearsInOperation": 4,
      "numberOfEmployees": 15,
      "topAdvertiserCategories": ["Restaurants", "Real Estate", "Professional Services"]
    },
    "competitiveInfo": {
      "uniqueValueProposition": "Chicago's fastest-growing local news source with deep community connections",
      "keyDifferentiators": ["Hyperlocal focus", "Business expertise", "Community events"],
      "competitiveAdvantages": ["Local relationships", "Digital-first approach", "Engaged audience"]
    },
    "distributionChannels": {
      "website": {
        "url": "https://samplepub.com",
        "metrics": {
          "monthlyVisitors": 25000,
          "monthlyPageViews": 100000
        }
      },
      "newsletters": [{
        "name": "Weekly Update",
        "subscribers": 5000,
        "openRate": 35
      }]
    },
    "metadata": {
      "extractedFrom": ["manual_entry"],
      "confidence": 0.95,
      "verificationStatus": "verified",
      "dataCompleteness": 85,
      "lastUpdated": "${new Date().toISOString()}",
      "createdAt": "${new Date().toISOString()}"
    }
  }
]`;

  const validateJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      const publications = Array.isArray(parsed) ? parsed : [parsed];
      
      for (const pub of publications) {
        if (!pub.publicationId || !pub.basicInfo?.publicationName) {
          throw new Error('Invalid publication: missing publicationId or publicationName');
        }
      }
      
      return { valid: true, publications };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  };

  const handlePreview = async () => {
    const validation = validateJson(importData);
    if (!validation.valid) {
      toast.error(`Invalid JSON: ${validation.error}`);
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/publications/import-preview`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          publications: validation.publications,
          options: { ...options, preview: true }
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Authentication required. Please log in again.');
          return;
        }
        throw new Error('Failed to generate preview');
      }

      const results = await response.json();
      setImportResults(results);
      setShowPreview(true);
      toast.success(`Preview generated: ${results.length} publications analyzed`);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    const validation = validateJson(importData);
    if (!validation.valid) {
      toast.error(`Invalid JSON: ${validation.error}`);
      return;
    }

    if (!options.force) {
      const confirmed = confirm('Are you sure you want to proceed with the import? This will modify your database.');
      if (!confirmed) return;
    }

    setIsImporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/publications/import`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          publications: validation.publications,
          options: { ...options, preview: false }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 Import API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        
        if (response.status === 401) {
          toast.error('Authentication required. Please log in again.');
          return;
        }
        throw new Error(`Import failed: ${response.status} ${response.statusText}`);
      }

      const results = await response.json();
      
      // Ensure results is an array
      if (!Array.isArray(results)) {
        console.error('Invalid response format:', results);
        throw new Error('Invalid response format from server');
      }
      
      const created = results.filter((r: ImportResult) => r.action === 'create').length;
      const updated = results.filter((r: ImportResult) => r.action === 'update').length;
      const skipped = results.filter((r: ImportResult) => r.action === 'skip').length;
      const errors = results.filter((r: ImportResult) => r.action === 'error').length;

      if (errors > 0) {
        toast.warning(`Import completed with errors! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
      } else {
        toast.success(`Import completed! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
      }
      setImportData('');
      setShowPreview(false);
      setImportResults([]);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'skip': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <CheckCircle className="w-4 h-4" />;
      case 'update': return <RefreshCw className="w-4 h-4" />;
      case 'skip': return <XCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Publications Import</h2>
        <p className="text-muted-foreground">Import publication data from JSON with preview and update capabilities</p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="options">Import Options</TabsTrigger>
          <TabsTrigger value="sample">Sample Format</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                JSON Data Input
              </CardTitle>
              <CardDescription>
                Paste your publication JSON data below. Supports single publications or arrays of publications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your JSON data here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
              
              <div className="flex gap-2">
                <Button 
                  onClick={handlePreview} 
                  disabled={!importData.trim() || isImporting}
                  variant="outline"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {isImporting ? 'Analyzing...' : 'Preview Changes'}
                </Button>
                
                <Button 
                  onClick={handleImport} 
                  disabled={!importData.trim() || isImporting}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Import Publications'}
                </Button>
                
                <Button 
                  onClick={() => setImportData(sampleData)} 
                  variant="ghost"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Load Sample
                </Button>
              </div>

              {importData && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(() => {
                      const validation = validateJson(importData);
                      if (validation.valid) {
                        return `✅ Valid JSON with ${validation.publications.length} publication(s)`;
                      } else {
                        return `❌ Invalid JSON: ${validation.error}`;
                      }
                    })()}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Import Options
              </CardTitle>
              <CardDescription>
                Configure how the import process should handle existing publications and conflicts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="matchField">Match Field</Label>
                    <Select value={options.matchField} onValueChange={(value) => setOptions({...options, matchField: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="publicationId">Publication ID</SelectItem>
                        <SelectItem value="_id">MongoDB ID</SelectItem>
                        <SelectItem value="basicInfo.publicationName">Publication Name</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Field used to match existing publications for updates</p>
                  </div>

                  <div>
                    <Label htmlFor="updateMode">Update Mode</Label>
                    <Select value={options.updateMode} onValueChange={(value: any) => setOptions({...options, updateMode: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">Update existing records</SelectItem>
                        <SelectItem value="skip">Skip existing records</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">How to handle publications that already exist. "Update" merges new data with existing records, "Skip" leaves existing records unchanged.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="preview">Preview Mode</Label>
                      <p className="text-xs text-muted-foreground">Show changes without applying them</p>
                    </div>
                    <Switch
                      id="preview"
                      checked={options.preview}
                      onCheckedChange={(checked) => setOptions({...options, preview: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="force">Force Import</Label>
                      <p className="text-xs text-muted-foreground">Skip confirmation prompts</p>
                    </div>
                    <Switch
                      id="force"
                      checked={options.force}
                      onCheckedChange={(checked) => setOptions({...options, force: checked})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sample" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Sample Publication Format
              </CardTitle>
              <CardDescription>
                Example JSON structure for publication import. Copy this format for your own data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                {sampleData}
              </pre>
              <Button 
                onClick={() => navigator.clipboard.writeText(sampleData)}
                variant="outline"
                className="mt-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Copy Sample JSON
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Results Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review the changes that will be made to your publications database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Create ({importResults.filter(r => r.action === 'create').length})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Update ({importResults.filter(r => r.action === 'update').length})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span>Skip ({importResults.filter(r => r.action === 'skip').length})</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {importResults.map((result, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(result.action)}>
                        {getActionIcon(result.action)}
                        {result.action.toUpperCase()}
                      </Badge>
                      <span className="font-medium">
                        {result.publication.basicInfo?.publicationName || 'Unknown Publication'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ID: {result.publication.publicationId}
                    </span>
                  </div>

                  {result.action === 'update' && result.changes && (
                    <div className="text-xs text-muted-foreground">
                      <p>Changes: {Object.keys(result.changes).join(', ')}</p>
                    </div>
                  )}

                  {result.action === 'create' && (
                    <div className="text-xs text-muted-foreground">
                      <p>New publication will be created</p>
                    </div>
                  )}

                  {result.action === 'skip' && (
                    <div className="text-xs text-muted-foreground">
                      <p>Publication already exists and will be skipped</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                <Play className="w-4 h-4 mr-2" />
                {isImporting ? 'Importing...' : 'Execute Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
