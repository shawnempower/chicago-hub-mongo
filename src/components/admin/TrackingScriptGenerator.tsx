/**
 * Tracking Script Generator
 * 
 * UI component for generating and managing tracking scripts for digital ad placements.
 * Allows hub staff to generate tracking tags for publications to traffic.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { 
  Code, 
  Copy, 
  Check, 
  RefreshCw, 
  Loader2, 
  Mail, 
  Globe, 
  Video, 
  ExternalLink,
  AlertCircle,
  Trash2,
  Plus,
  FileCode
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import { cn } from '@/lib/utils';
import { TrackingScript, TrackingChannel, ESPCompatibility } from '@/integrations/mongodb/trackingScriptSchema';

interface TrackingScriptGeneratorProps {
  campaignId: string;
  campaignName?: string;
  advertiserName?: string;
  publicationId: number;
  publicationCode: string;
  publicationName: string;
  /** Available creatives for this campaign */
  creatives?: Array<{
    _id: string;
    name: string;
    type: string;
    format?: {
      width?: number;
      height?: number;
      dimensions?: string;
    };
    clickUrl?: string;
    imageUrl?: string;
    altText?: string;
    // For text ads
    headline?: string;
    body?: string;
    ctaText?: string;
  }>;
  /** Available digital placements for this publication */
  placements?: Array<{
    itemPath: string;
    itemName: string;
    channel: string;
    dimensions?: string;
  }>;
  /** ESP compatibility for this publication's newsletter */
  espCompatibility?: ESPCompatibility;
  onScriptsGenerated?: () => void;
}

const CHANNEL_LABELS: Record<TrackingChannel, string> = {
  website: 'Website/Display',
  newsletter_image: 'Newsletter (Image)',
  newsletter_text: 'Newsletter (Text)',
  streaming: 'Streaming Video'
};

const CHANNEL_ICONS: Record<TrackingChannel, React.ReactNode> = {
  website: <Globe className="h-4 w-4" />,
  newsletter_image: <Mail className="h-4 w-4" />,
  newsletter_text: <Mail className="h-4 w-4" />,
  streaming: <Video className="h-4 w-4" />
};

const ESP_LABELS: Record<ESPCompatibility, string> = {
  full: 'Full HTML Support',
  limited: 'Limited HTML',
  none: 'Text Only'
};

const ESP_COLORS: Record<ESPCompatibility, string> = {
  full: 'bg-green-100 text-green-800',
  limited: 'bg-yellow-100 text-yellow-800',
  none: 'bg-red-100 text-red-800'
};

export function TrackingScriptGenerator({
  campaignId,
  campaignName,
  advertiserName,
  publicationId,
  publicationCode,
  publicationName,
  creatives = [],
  placements = [],
  espCompatibility = 'full',
  onScriptsGenerated
}: TrackingScriptGeneratorProps) {
  const [scripts, setScripts] = useState<TrackingScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  // Generate form state
  const [selectedCreative, setSelectedCreative] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<TrackingChannel>('website');
  const [customClickUrl, setCustomClickUrl] = useState<string>('');
  
  // Digital channels that support tracking
  const digitalChannels = ['website', 'newsletter', 'streaming'];
  const digitalPlacements = placements.filter(p => digitalChannels.includes(p.channel));
  
  useEffect(() => {
    fetchScripts();
  }, [campaignId, publicationId]);
  
  const fetchScripts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(
        `${API_BASE_URL}/tracking-scripts?campaignId=${campaignId}&publicationId=${publicationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Failed to fetch scripts');
      
      const data = await response.json();
      setScripts(data.scripts || []);
    } catch (error) {
      console.error('Error fetching tracking scripts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tracking scripts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerate = async () => {
    if (!selectedCreative) {
      toast({
        title: 'Select Creative',
        description: 'Please select a creative to generate tracking for',
        variant: 'destructive'
      });
      return;
    }
    
    const creative = creatives.find(c => c._id === selectedCreative);
    if (!creative) return;
    
    try {
      setGenerating(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/tracking-scripts/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignId,
          creativeId: creative._id,
          publicationId,
          publicationCode,
          publicationName,
          channel: selectedChannel,
          creative: {
            name: creative.name,
            clickUrl: customClickUrl || creative.clickUrl || '',
            imageUrl: creative.imageUrl,
            width: creative.format?.width,
            height: creative.format?.height,
            altText: creative.altText || creative.name,
            headline: creative.headline,
            body: creative.body,
            ctaText: creative.ctaText
          },
          espCompatibility,
          advertiserName,
          campaignName
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate script');
      }
      
      const data = await response.json();
      
      toast({
        title: data.updated ? 'Script Updated' : 'Script Generated',
        description: `Tracking script ${data.updated ? 'updated' : 'created'} for ${creative.name}`
      });
      
      setShowGenerateDialog(false);
      setSelectedCreative('');
      setCustomClickUrl('');
      fetchScripts();
      onScriptsGenerated?.();
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };
  
  const handleCopy = async (text: string, scriptId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(scriptId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: 'Copied!',
        description: 'Tag copied to clipboard'
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive'
      });
    }
  };
  
  const handleDelete = async (scriptId: string) => {
    if (!confirm('Delete this tracking script?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/tracking-scripts/${scriptId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete script');
      
      toast({
        title: 'Deleted',
        description: 'Tracking script removed'
      });
      
      fetchScripts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete script',
        variant: 'destructive'
      });
    }
  };
  
  const getChannelFromPlacement = (channel: string): TrackingChannel => {
    if (channel === 'newsletter') return 'newsletter_image';
    if (channel === 'streaming') return 'streaming';
    return 'website';
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Tracking Scripts
            </CardTitle>
            <CardDescription>
              Generate tracking tags for {publicationName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {espCompatibility && (
              <Badge className={cn(ESP_COLORS[espCompatibility])}>
                {ESP_LABELS[espCompatibility]}
              </Badge>
            )}
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={creatives.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Script
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generate Tracking Script</DialogTitle>
                  <DialogDescription>
                    Create tracking tags for {publicationName} to traffic in their {selectedChannel === 'newsletter_image' || selectedChannel === 'newsletter_text' ? 'newsletter' : selectedChannel}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Creative</Label>
                    <Select value={selectedCreative} onValueChange={setSelectedCreative}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a creative..." />
                      </SelectTrigger>
                      <SelectContent>
                        {creatives.map(creative => (
                          <SelectItem key={creative._id} value={creative._id}>
                            <div className="flex items-center gap-2">
                              <span>{creative.name}</span>
                              {creative.format?.dimensions && (
                                <span className="text-xs text-muted-foreground">
                                  ({creative.format.dimensions})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Channel Type</Label>
                    <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as TrackingChannel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Website/Display Ad
                          </div>
                        </SelectItem>
                        <SelectItem value="newsletter_image">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Newsletter (Image Ad)
                          </div>
                        </SelectItem>
                        <SelectItem value="newsletter_text">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Newsletter (Text Ad)
                          </div>
                        </SelectItem>
                        <SelectItem value="streaming">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Streaming Video
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Click-Through URL (optional override)</Label>
                    <Input
                      placeholder="https://advertiser.com/landing-page"
                      value={customClickUrl}
                      onChange={(e) => setCustomClickUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use the creative's default click URL
                    </p>
                  </div>
                  
                  {(selectedChannel === 'newsletter_image' || selectedChannel === 'newsletter_text') && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Newsletter Tracking Note</p>
                          <p className="text-amber-700">
                            Impression tracking in newsletters is affected by email privacy features (Apple Mail Privacy Protection, Gmail caching). Click tracking remains reliable.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerate} disabled={generating || !selectedCreative}>
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Code className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {scripts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No tracking scripts yet</p>
            <p className="text-sm">Scripts are auto-generated when creative assets are uploaded.</p>
            <p className="text-xs mt-2">Upload assets in the Creative Assets tab, or use Refresh to check for new scripts.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {scripts.map((script) => (
              <AccordionItem 
                key={script._id?.toString()} 
                value={script._id?.toString() || ''}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    {CHANNEL_ICONS[script.channel]}
                    <div>
                      <p className="font-medium">{script.creative.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {CHANNEL_LABELS[script.channel]}
                        {script.creative.width && script.creative.height && (
                          <> • {script.creative.width}x{script.creative.height}</>
                        )}
                        {script.version > 1 && (
                          <> • v{script.version}</>
                        )}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <Tabs defaultValue="full" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="full">Full Tag</TabsTrigger>
                      <TabsTrigger value="urls">URLs Only</TabsTrigger>
                      {script.tags.simplifiedTag && (
                        <TabsTrigger value="simplified">Simplified</TabsTrigger>
                      )}
                    </TabsList>
                    
                    <TabsContent value="full" className="mt-4">
                      <div className="relative">
                        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                          <code>{script.tags.fullTag}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => handleCopy(script.tags.fullTag, `${script._id}-full`)}
                        >
                          {copiedId === `${script._id}-full` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Complete HTML tag with impression pixel and click tracking
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="urls" className="mt-4 space-y-3">
                      <div>
                        <Label className="text-xs">Impression Pixel</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            value={script.urls.impressionPixel} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(script.urls.impressionPixel, `${script._id}-imp`)}
                          >
                            {copiedId === `${script._id}-imp` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Click Tracker</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            value={script.urls.clickTracker} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(script.urls.clickTracker, `${script._id}-click`)}
                          >
                            {copiedId === `${script._id}-click` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Creative URL</Label>
                        <div className="flex gap-2 mt-1">
                          <Input 
                            value={script.urls.creativeUrl} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(script.urls.creativeUrl, `${script._id}-creative`)}
                          >
                            {copiedId === `${script._id}-creative` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    
                    {script.tags.simplifiedTag && (
                      <TabsContent value="simplified" className="mt-4">
                        <div className="relative">
                          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                            <code>{script.tags.simplifiedTag}</code>
                          </pre>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopy(script.tags.simplifiedTag || '', `${script._id}-simple`)}
                          >
                            {copiedId === `${script._id}-simple` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Simplified version for ESPs with limited HTML support
                        </p>
                      </TabsContent>
                    )}
                  </Tabs>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Generated {new Date(script.generatedAt).toLocaleDateString()}
                      {script.creative.clickUrl && (
                        <> • Clicks to: <a href={script.creative.clickUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          {new URL(script.creative.clickUrl).hostname}
                          <ExternalLink className="h-3 w-3" />
                        </a></>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(script._id?.toString() || '')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        
        {creatives.length === 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">No Creatives Available</p>
                <p className="text-amber-700">
                  Upload creative assets to the campaign before generating tracking scripts.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
