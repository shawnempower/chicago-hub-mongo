import { usePublication } from "@/contexts/PublicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  Building2, 
  MessageCircle, 
  FileText,
  Settings,
  DollarSign,
  Users,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  Upload,
  Download,
  Eye,
  Trash2,
  FileImage,
  File,
  FileSpreadsheet,
  Calendar,
  Loader2,
  Plus,
  X
} from "lucide-react";
import { calculateRevenue } from '@/utils/pricingCalculations';
import { PublicationDataQuality, calculateDataQuality } from '@/components/admin/PublicationDataQuality';
import { useMemo, useRef, useState, useEffect } from "react";
import { getPublicationActivities, UserInteraction } from '@/api/activities';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  getPublicationFiles, 
  uploadPublicationFile, 
  deletePublicationFile,
  getFileDownloadUrl,
  validateFileType,
  getFileTypes
} from '@/api/publicationFiles';
// MongoDB services removed - using API calls instead

interface PublicationFile {
  _id: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  description?: string;
  fileUrl?: string;
  fileSize: number;
  uploadedBy?: string;
  tags?: string[];
  isPublic?: boolean;
  downloadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export function DashboardOverview() {
  const { selectedPublication } = usePublication();
  const navigate = useNavigate();
  const { toast } = useToast();
  const inventoryQualityRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentActivity, setRecentActivity] = useState<UserInteraction[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  // Knowledge base state
  const [files, setFiles] = useState<PublicationFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFileType, setUploadFileType] = useState('media_kit');
  const [uploadDescription, setUploadDescription] = useState('');

  // Fetch recent activities for the selected publication
  useEffect(() => {
    if (!selectedPublication?._id) return;
    
    const fetchActivities = async () => {
      setLoadingActivity(true);
      try {
        const response = await getPublicationActivities(selectedPublication._id, {
          limit: 5,
          offset: 0
        });
        setRecentActivity(response.activities);
      } catch (error) {
        console.error('Error fetching activities:', error);
        // Fail silently - activity is not critical for dashboard
      } finally {
        setLoadingActivity(false);
      }
    };
    
    fetchActivities();
  }, [selectedPublication?._id]);

  // Fetch files for knowledge base
  useEffect(() => {
    if (!selectedPublication?._id) {
      setFiles([]);
      return;
    }
    
    const loadFiles = async () => {
      try {
        setLoadingFiles(true);
        const publicationFiles = await getPublicationFiles(selectedPublication._id);
        setFiles(publicationFiles);
      } catch (error) {
        console.error('Error loading publication files:', error);
        // Fail silently for files
      } finally {
        setLoadingFiles(false);
      }
    };
    
    loadFiles();
  }, [selectedPublication?._id]);

  if (!selectedPublication) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No publication selected</p>
      </div>
    );
  }

  // File handling functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPublication?._id) return;

    const validation = validateFileType(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid File Type",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      await uploadPublicationFile(
        selectedPublication._id,
        file,
        uploadFileType,
        uploadDescription || undefined,
        [],
        false
      );
      
      toast({
        title: "Success",
        description: "File uploaded successfully!",
      });
      
      setUploadDescription('');
      setShowUploadForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reload files
      const publicationFiles = await getPublicationFiles(selectedPublication._id);
      setFiles(publicationFiles);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: PublicationFile) => {
    if (!selectedPublication?._id) return;
    
    try {
      const downloadUrl = await getFileDownloadUrl(selectedPublication._id, file._id);
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (file: PublicationFile) => {
    if (!selectedPublication?._id || !confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deletePublicationFile(selectedPublication._id, file._id);
      toast({
        title: "Success",
        description: "File deleted successfully!",
      });
      
      // Reload files
      const publicationFiles = await getPublicationFiles(selectedPublication._id);
      setFiles(publicationFiles);
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleView = (file: PublicationFile) => {
    if (file.fileUrl) {
      window.open(file.fileUrl, '_blank');
    } else {
      handleDownload(file);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-4 w-4 text-blue-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActivityLabel = (activity: UserInteraction) => {
    const labels: Record<string, string> = {
      campaign_create: 'Campaign created',
      campaign_update: 'Campaign updated',
      order_create: 'Order created',
      order_update: 'Order updated',
      package_create: 'Package created',
      package_update: 'Package updated',
      lead_create: 'New lead received',
      lead_update: 'Lead updated',
      publication_update: 'Publication updated',
      inventory_update: 'Inventory updated',
      storefront_update: 'Storefront updated',
    };
    return labels[activity.interactionType] || activity.interactionType;
  };

  const quickActions = [
    { 
      title: "Manage Inventory", 
      description: "Update advertising slots and pricing",
      icon: Package,
      tab: "inventory"
    },
    { 
      title: "Edit Profile", 
      description: "Update publication information",
      icon: Building2,
      tab: "profile"
    },
    { 
      title: "Settings", 
      description: "Configure publication settings",
      icon: Settings,
      tab: "settings"
    }
  ];

  const handleQuickAction = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
  };

  const scrollToInventoryQuality = () => {
    inventoryQualityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Use the same calculation logic as the detailed PublicationDataQuality component
  const inventoryQuality = useMemo(() => calculateDataQuality(selectedPublication), [selectedPublication]);

  // Calculate key metrics
  const calculateMetrics = () => {
    let totalInventory = 0;
    let totalRevenuePotential = 0;
    let totalReach = 0;
    let activeChannels = 0;
    let hubPricingCount = 0;

    // Website
    if (selectedPublication.distributionChannels.website?.advertisingOpportunities) {
      const websiteAds = selectedPublication.distributionChannels.website.advertisingOpportunities;
      totalInventory += websiteAds.length;
      activeChannels++;
      totalReach += selectedPublication.distributionChannels.website.metrics?.monthlyVisitors || 0;
      
      websiteAds.forEach((ad: any) => {
        totalRevenuePotential += calculateRevenue(ad, 'month');
        if (ad.hubPricing?.length > 0) hubPricingCount++;
      });
    }

    // Newsletters
    if (selectedPublication.distributionChannels.newsletters?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.newsletters.forEach((newsletter: any) => {
        totalReach += newsletter.subscribers || 0;
        if (newsletter.advertisingOpportunities) {
          totalInventory += newsletter.advertisingOpportunities.length;
          newsletter.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', newsletter.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Print
    if (Array.isArray(selectedPublication.distributionChannels.print) && selectedPublication.distributionChannels.print.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.print.forEach((print: any) => {
        totalReach += print.circulation || 0;
        if (print.advertisingOpportunities) {
          totalInventory += print.advertisingOpportunities.length;
          print.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', print.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Social Media
    if (selectedPublication.distributionChannels.socialMedia?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.socialMedia.forEach((social: any) => {
        totalReach += social.metrics?.followers || 0;
        if (social.advertisingOpportunities) {
          totalInventory += social.advertisingOpportunities.length;
          social.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month');
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Events
    if (selectedPublication.distributionChannels.events?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.events.forEach((event: any) => {
        totalReach += event.averageAttendance || 0;
        if (event.advertisingOpportunities) {
          totalInventory += event.advertisingOpportunities.length;
          event.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', event.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Podcasts
    if (selectedPublication.distributionChannels.podcasts?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.podcasts.forEach((podcast: any) => {
        totalReach += podcast.averageListeners || 0;
        if (podcast.advertisingOpportunities) {
          totalInventory += podcast.advertisingOpportunities.length;
          podcast.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', podcast.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Radio
    if (selectedPublication.distributionChannels.radioStations?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.radioStations.forEach((radio: any) => {
        // NEW: Handle show-based structure
        if (radio.shows && radio.shows.length > 0) {
          radio.shows.forEach((show: any) => {
            totalReach += show.averageListeners || radio.listeners || 0;
            if (show.advertisingOpportunities) {
              totalInventory += show.advertisingOpportunities.length;
              show.advertisingOpportunities.forEach((ad: any) => {
                totalRevenuePotential += calculateRevenue(ad, 'month', show.frequency);
                if (ad.hubPricing?.length > 0) hubPricingCount++;
              });
            }
          });
        } else if (radio.advertisingOpportunities && radio.advertisingOpportunities.length > 0) {
          // LEGACY: Handle station-level ads only if no shows exist (prevent double-counting)
          totalReach += radio.listeners || 0;
          totalInventory += radio.advertisingOpportunities.length;
          radio.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month');
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Streaming
    if (selectedPublication.distributionChannels.streamingVideo?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.streamingVideo.forEach((streaming: any) => {
        totalReach += streaming.subscribers || 0;
        if (streaming.advertisingOpportunities) {
          totalInventory += streaming.advertisingOpportunities.length;
          streaming.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', streaming.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    // Television
    if (selectedPublication.distributionChannels.television?.length > 0) {
      activeChannels++;
      selectedPublication.distributionChannels.television.forEach((station: any) => {
        totalReach += station.viewers || 0;
        if (station.advertisingOpportunities) {
          totalInventory += station.advertisingOpportunities.length;
          station.advertisingOpportunities.forEach((ad: any) => {
            totalRevenuePotential += calculateRevenue(ad, 'month', station.frequency);
            if (ad.hubPricing?.length > 0) hubPricingCount++;
          });
        }
      });
    }

    return {
      totalInventory,
      totalRevenuePotential,
      totalReach,
      activeChannels,
      hubPricingCount
    };
  };

  const metrics = calculateMetrics();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Potential */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(metrics.totalRevenuePotential)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              If 100% sold monthly
            </p>
          </CardContent>
        </Card>

        {/* Total Reach */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Reach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatNumber(metrics.totalReach)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined audience
            </p>
          </CardContent>
        </Card>

        {/* Hub Pricing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hub Pricing
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center">
                      <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3" sideOffset={8}>
                    <p className="text-xs mb-2">Number of inventory items with special hub pricing rates</p>
                    <a 
                      href="/pricing-formulas.html#hub-pricing" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 underline inline-block font-medium"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      View pricing formulas →
                    </a>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {metrics.hubPricingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.hubPricingCount === 1 ? 'Item' : 'Items'} with hub rates
            </p>
          </CardContent>
        </Card>

        {/* Inventory Quality */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={scrollToInventoryQuality}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Inventory Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div className={`text-3xl font-bold ${getQualityScoreColor(inventoryQuality.score)}`}>
                {inventoryQuality.score}%
              </div>
              <p className="text-xs text-muted-foreground">
                {inventoryQuality.completeItems} of {inventoryQuality.totalItems} items complete
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <Package className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Button 
                key={action.title} 
                variant="outline" 
                className="w-full justify-start h-auto p-4"
                onClick={() => handleQuickAction(action.tab)}
              >
                <action.icon className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-sans text-base">
              <MessageCircle className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Loading activities...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={activity._id || index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getActivityLabel(activity)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                      {activity.metadata?.resourceId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {activity.metadata.resourceId.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => navigate('/dashboard?tab=activity')}
            >
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Quality - Full Width */}
      <div ref={inventoryQualityRef}>
        <PublicationDataQuality 
          publication={selectedPublication}
          onViewDetails={() => handleQuickAction('inventory')}
          preCalculatedQuality={inventoryQuality}
        />
      </div>

      {/* Knowledge Base - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-sans text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Knowledge Base
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Media kits, rate cards, and resources for {selectedPublication.basicInfo.publicationName}
              </p>
            </div>
            <Button 
              size="sm"
              onClick={() => setShowUploadForm(!showUploadForm)}
            >
              {showUploadForm ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Files
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Form */}
          {showUploadForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">File Type</label>
                  <Select value={uploadFileType} onValueChange={setUploadFileType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getFileTypes().map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <Input
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Brief description of the file..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Choose File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.json,.jpg,.jpeg,.png,.svg,.gif,.webp,.zip,.gz,.mp4,.mpeg,.mov,.mp3,.wav"
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PDF, Word, Excel, PowerPoint, Images, Archives, Audio, Video
                </p>
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading file...
                </div>
              )}
            </div>
          )}

          {/* Files List */}
          {loadingFiles ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No files yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first file to get started.
              </p>
              {!showUploadForm && (
                <Button onClick={() => setShowUploadForm(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {files.length} file{files.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {files.slice(0, 6).map((file) => (
                  <div key={file._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(file.fileType)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium font-sans text-sm truncate">{file.originalFileName}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.fileSize)}</span>
                          {file.downloadCount && file.downloadCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{file.downloadCount} downloads</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleView(file)}
                        title="View file"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownload(file)}
                        title="Download file"
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        onClick={() => handleDelete(file)}
                        title="Delete file"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {files.length > 6 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  + {files.length - 6} more file{files.length - 6 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}