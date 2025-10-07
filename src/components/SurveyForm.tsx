import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle, Globe, Printer, Mail, Radio, Users, Calendar, FileText, Settings } from 'lucide-react';
import { useConfetti } from '@/hooks/useConfetti';
import { API_BASE_URL } from '@/config/api';

interface SurveyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const printFrequencies = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'other'];

const SurveyForm: React.FC<SurveyFormProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState(1);
  const { triggerSurveyConfetti } = useConfetti();
  const [formData, setFormData] = useState({
    contactInformation: {
      firstName: '',
      lastName: '',
      fullName: '',
      title: '',
      email: '',
      emailAddress: '',
      companyName: '',
      mediaOutletNames: '',
    },
    websiteAdvertising: {
      monthlyUniqueVisitors: '',
      hasWebsiteAdvertising: undefined as boolean | undefined,
      largestDigitalAdSize: '',
      secondLargestDigitalAdSize: '',
      largestAdWeeklyRate: '',
      largestAdMonthlyRate: '',
      secondLargestAdWeeklyRate: '',
      secondLargestAdMonthlyRate: '',
      websiteTakeoverCost: '',
      mediaKitLink: '',
    },
    printAdvertising: {
      hasPrintProduct: undefined as boolean | undefined,
      mainPrintProductName: '',
      printFrequency: '',
      averagePrintRun: '',
      distributionOutlets: '',
      fullPageAdSize: '',
      halfPageAdSize: '',
      fullPageRate1x: '',
      fullPageRate6x: '',
      fullPageRate12x: '',
      halfPageRate1x: '',
      halfPageRate6x: '',
      halfPageRate12x: '',
      printRatesComparable: '',
    },
    newsletterAdvertising: {
      hasNewsletter: undefined as boolean | undefined,
      newsletterSubscribers: '',
      newsletterFrequency: '',
      newsletterAdSizeLargest: '',
      newsletterAdSizeSecond: '',
      newsletterLargestAdRate1x: '',
      newsletterLargestAdRateMonthly: '',
      newsletterSecondAdRate1x: '',
      newsletterSecondAdRateMonthly: '',
      newsletterTakeoverCost: '',
      newsletterRatesComparable: '',
    },
    radioPodcastAdvertising: {
      hasRadioStation: undefined as boolean | undefined,
      hasPodcast: undefined as boolean | undefined,
      radio30SecondAdsCost10x: '',
      radio60SecondAdsCost10x: '',
      podcast30SecondAdsCost10x: '',
      podcastListenersPerShow: '',
      podcastSpecialTakeoversCost: '',
      video30SecondAdCost: '',
      video60SecondAdCost: '',
      videoAverageViews: '',
    },
    socialMedia: {
      facebookFollowers: '',
      instagramFollowers: '',
      twitterFollowers: '',
      tiktokFollowers: '',
      linkedinFollowers: '',
      otherSocialFollowers: '',
      socialMediaAdvertisingOptions: '',
    },
    eventMarketing: {
      hostsEvents: undefined as boolean | undefined,
      annualEventCount: '',
      eventAttendanceRange: '',
      largestSponsorshipLevel: '',
      smallestSponsorshipLevel: '',
      eventSponsorshipDetails: '',
    },
    brandedContent: {
      offersBrandedContent: undefined as boolean | undefined,
      printBrandedContentCost: '',
      websiteBrandedContentCost3Month: '',
      shortFormContentCost: '',
      brandedContentAdditionalInfo: '',
    },
    additionalServices: {
      offersOttMarketing: undefined as boolean | undefined,
      offersVirtualWebinars: undefined as boolean | undefined,
      producesOtherVideos: undefined as boolean | undefined,
      videoProductionDetails: '',
      customData: '',
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const [section, field] = name.split('.');

    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleSelectChange = (section: string, field: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleBooleanChange = (section: string, field: string) => (value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const validateStep = () => {
    switch (step) {
      case 1: // Contact Information
        if (!formData.contactInformation.mediaOutletNames) {
          toast.error('Please provide your media outlet name(s).');
          return false;
        }
        if (!formData.contactInformation.email && !formData.contactInformation.emailAddress) {
          toast.error('Please provide an email address.');
          return false;
        }
        const email = formData.contactInformation.email || formData.contactInformation.emailAddress;
        if (email && !/\S+@\S+\.\S+/.test(email)) {
          toast.error('Please enter a valid email address.');
          return false;
        }
        break;
      // Other steps are optional, so no strict validation needed
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      contactInformation: {
        firstName: '', lastName: '', fullName: '', title: '', email: '', emailAddress: '', companyName: '', mediaOutletNames: '',
      },
      websiteAdvertising: {
        monthlyUniqueVisitors: '', hasWebsiteAdvertising: undefined, largestDigitalAdSize: '', secondLargestDigitalAdSize: '',
        largestAdWeeklyRate: '', largestAdMonthlyRate: '', secondLargestAdWeeklyRate: '', secondLargestAdMonthlyRate: '',
        websiteTakeoverCost: '', mediaKitLink: '',
      },
      printAdvertising: {
        hasPrintProduct: undefined, mainPrintProductName: '', printFrequency: '', averagePrintRun: '', distributionOutlets: '',
        fullPageAdSize: '', halfPageAdSize: '', fullPageRate1x: '', fullPageRate6x: '', fullPageRate12x: '',
        halfPageRate1x: '', halfPageRate6x: '', halfPageRate12x: '', printRatesComparable: '',
      },
      newsletterAdvertising: {
        hasNewsletter: undefined, newsletterSubscribers: '', newsletterFrequency: '', newsletterAdSizeLargest: '', newsletterAdSizeSecond: '',
        newsletterLargestAdRate1x: '', newsletterLargestAdRateMonthly: '', newsletterSecondAdRate1x: '', newsletterSecondAdRateMonthly: '',
        newsletterTakeoverCost: '', newsletterRatesComparable: '',
      },
      radioPodcastAdvertising: {
        hasRadioStation: undefined, hasPodcast: undefined, radio30SecondAdsCost10x: '', radio60SecondAdsCost10x: '',
        podcast30SecondAdsCost10x: '', podcastListenersPerShow: '', podcastSpecialTakeoversCost: '',
        video30SecondAdCost: '', video60SecondAdCost: '', videoAverageViews: '',
      },
      socialMedia: {
        facebookFollowers: '', instagramFollowers: '', twitterFollowers: '', tiktokFollowers: '', linkedinFollowers: '',
        otherSocialFollowers: '', socialMediaAdvertisingOptions: '',
      },
      eventMarketing: {
        hostsEvents: undefined, annualEventCount: '', eventAttendanceRange: '', largestSponsorshipLevel: '',
        smallestSponsorshipLevel: '', eventSponsorshipDetails: '',
      },
      brandedContent: {
        offersBrandedContent: undefined, printBrandedContentCost: '', websiteBrandedContentCost3Month: '',
        shortFormContentCost: '', brandedContentAdditionalInfo: '',
      },
      additionalServices: {
        offersOttMarketing: undefined, offersVirtualWebinars: undefined, producesOtherVideos: undefined,
        videoProductionDetails: '', customData: '',
      },
    });
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      return;
    }

    try {
      // Clean up the data - remove empty strings and undefined values
      const cleanData = {
        ...formData,
        contactInformation: {
          ...formData.contactInformation,
          email: formData.contactInformation.email || formData.contactInformation.emailAddress,
        }
      };

      // Remove empty string values
      Object.keys(cleanData).forEach(sectionKey => {
        const section = cleanData[sectionKey as keyof typeof cleanData] as any;
        Object.keys(section).forEach(fieldKey => {
          if (section[fieldKey] === '' || section[fieldKey] === undefined) {
            delete section[fieldKey];
          }
        });
      });

      const response = await fetch(`${API_BASE_URL}/survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit survey');
      }

      toast.success('Survey submitted successfully!');
      setStep(9); // Go to success step
      // Trigger epic confetti celebration for survey completion
      setTimeout(() => {
        triggerSurveyConfetti();
      }, 200);
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred.');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">1. Contact Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="contactInformation.firstName" value={formData.contactInformation.firstName} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="contactInformation.lastName" value={formData.contactInformation.lastName} onChange={handleChange} />
              </div>
            </div>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="contactInformation.fullName" value={formData.contactInformation.fullName} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="title">Title/Position</Label>
              <Input id="title" name="contactInformation.title" value={formData.contactInformation.title} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" name="contactInformation.email" type="email" value={formData.contactInformation.email} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="companyName">Company/Organization Name</Label>
              <Input id="companyName" name="contactInformation.companyName" value={formData.contactInformation.companyName} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="mediaOutletNames">Media Outlet Name(s) *</Label>
              <Input id="mediaOutletNames" name="contactInformation.mediaOutletNames" value={formData.contactInformation.mediaOutletNames} onChange={handleChange} required placeholder="e.g., Chicago Tribune, Block Club Chicago" />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">2. Website & Digital Advertising</h3>
            </div>
            <div>
              <Label htmlFor="monthlyUniqueVisitors">Monthly Unique Visitors</Label>
              <Input id="monthlyUniqueVisitors" name="websiteAdvertising.monthlyUniqueVisitors" type="number" value={formData.websiteAdvertising.monthlyUniqueVisitors} onChange={handleChange} placeholder="e.g., 50000" />
            </div>
            <div className="space-y-3">
              <Label>Do you offer website advertising?</Label>
              <RadioGroup value={formData.websiteAdvertising.hasWebsiteAdvertising?.toString()} onValueChange={(value) => handleBooleanChange('websiteAdvertising', 'hasWebsiteAdvertising')(value === 'true')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="websiteAd-yes" />
                  <Label htmlFor="websiteAd-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="websiteAd-no" />
                  <Label htmlFor="websiteAd-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            {formData.websiteAdvertising.hasWebsiteAdvertising && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="largestDigitalAdSize">Largest Digital Ad Size</Label>
                    <Input id="largestDigitalAdSize" name="websiteAdvertising.largestDigitalAdSize" value={formData.websiteAdvertising.largestDigitalAdSize} onChange={handleChange} placeholder="e.g., 728x90 pixels" />
                  </div>
                  <div>
                    <Label htmlFor="secondLargestDigitalAdSize">Second Largest Digital Ad Size</Label>
                    <Input id="secondLargestDigitalAdSize" name="websiteAdvertising.secondLargestDigitalAdSize" value={formData.websiteAdvertising.secondLargestDigitalAdSize} onChange={handleChange} placeholder="e.g., 300x250 pixels" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="largestAdWeeklyRate">Largest Ad Weekly Rate</Label>
                    <Input id="largestAdWeeklyRate" name="websiteAdvertising.largestAdWeeklyRate" value={formData.websiteAdvertising.largestAdWeeklyRate} onChange={handleChange} placeholder="e.g., $500" />
                  </div>
                  <div>
                    <Label htmlFor="largestAdMonthlyRate">Largest Ad Monthly Rate</Label>
                    <Input id="largestAdMonthlyRate" name="websiteAdvertising.largestAdMonthlyRate" value={formData.websiteAdvertising.largestAdMonthlyRate} onChange={handleChange} placeholder="e.g., $1800" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="secondLargestAdWeeklyRate">Second Largest Ad Weekly Rate</Label>
                    <Input id="secondLargestAdWeeklyRate" name="websiteAdvertising.secondLargestAdWeeklyRate" value={formData.websiteAdvertising.secondLargestAdWeeklyRate} onChange={handleChange} placeholder="e.g., $300" />
                  </div>
                  <div>
                    <Label htmlFor="secondLargestAdMonthlyRate">Second Largest Ad Monthly Rate</Label>
                    <Input id="secondLargestAdMonthlyRate" name="websiteAdvertising.secondLargestAdMonthlyRate" value={formData.websiteAdvertising.secondLargestAdMonthlyRate} onChange={handleChange} placeholder="e.g., $1000" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="websiteTakeoverCost">Website Takeover Cost</Label>
                  <Input id="websiteTakeoverCost" name="websiteAdvertising.websiteTakeoverCost" value={formData.websiteAdvertising.websiteTakeoverCost} onChange={handleChange} placeholder="e.g., $5000 or N/A" />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="mediaKitLink">Media Kit/Rate Card Link</Label>
              <Input id="mediaKitLink" name="websiteAdvertising.mediaKitLink" type="url" value={formData.websiteAdvertising.mediaKitLink} onChange={handleChange} placeholder="https://..." />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Printer className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">3. Print Advertising</h3>
            </div>
            <div className="space-y-3">
              <Label>Do you have a print publication?</Label>
              <RadioGroup value={formData.printAdvertising.hasPrintProduct?.toString()} onValueChange={(value) => handleBooleanChange('printAdvertising', 'hasPrintProduct')(value === 'true')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="print-yes" />
                  <Label htmlFor="print-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="print-no" />
                  <Label htmlFor="print-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            {formData.printAdvertising.hasPrintProduct && (
              <>
                <div>
                  <Label htmlFor="mainPrintProductName">Main Print Product Name</Label>
                  <Input id="mainPrintProductName" name="printAdvertising.mainPrintProductName" value={formData.printAdvertising.mainPrintProductName} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="printFrequency">Publication Frequency</Label>
                  <Select value={formData.printAdvertising.printFrequency} onValueChange={handleSelectChange('printAdvertising', 'printFrequency')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {printFrequencies.map(freq => (
                        <SelectItem key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="averagePrintRun">Average Print Run</Label>
                    <Input id="averagePrintRun" name="printAdvertising.averagePrintRun" type="number" value={formData.printAdvertising.averagePrintRun} onChange={handleChange} placeholder="e.g., 15000" />
                  </div>
                  <div>
                    <Label htmlFor="distributionOutlets">Distribution Outlets</Label>
                    <Input id="distributionOutlets" name="printAdvertising.distributionOutlets" type="number" value={formData.printAdvertising.distributionOutlets} onChange={handleChange} placeholder="e.g., 200" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullPageAdSize">Full Page Ad Size (inches)</Label>
                    <Input id="fullPageAdSize" name="printAdvertising.fullPageAdSize" value={formData.printAdvertising.fullPageAdSize} onChange={handleChange} placeholder="e.g., 10 x 13" />
                  </div>
                  <div>
                    <Label htmlFor="halfPageAdSize">Half Page Ad Size (inches)</Label>
                    <Input id="halfPageAdSize" name="printAdvertising.halfPageAdSize" value={formData.printAdvertising.halfPageAdSize} onChange={handleChange} placeholder="e.g., 10 x 6.5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Full Page Ad Rates</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input name="printAdvertising.fullPageRate1x" value={formData.printAdvertising.fullPageRate1x} onChange={handleChange} placeholder="1x rate (e.g., $2000)" />
                    <Input name="printAdvertising.fullPageRate6x" value={formData.printAdvertising.fullPageRate6x} onChange={handleChange} placeholder="6x rate (e.g., $1800)" />
                    <Input name="printAdvertising.fullPageRate12x" value={formData.printAdvertising.fullPageRate12x} onChange={handleChange} placeholder="12x rate (e.g., $1600)" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Half Page Ad Rates</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input name="printAdvertising.halfPageRate1x" value={formData.printAdvertising.halfPageRate1x} onChange={handleChange} placeholder="1x rate (e.g., $1200)" />
                    <Input name="printAdvertising.halfPageRate6x" value={formData.printAdvertising.halfPageRate6x} onChange={handleChange} placeholder="6x rate (e.g., $1100)" />
                    <Input name="printAdvertising.halfPageRate12x" value={formData.printAdvertising.halfPageRate12x} onChange={handleChange} placeholder="12x rate (e.g., $1000)" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="printRatesComparable">Are rates comparable across print products?</Label>
                  <Textarea id="printRatesComparable" name="printAdvertising.printRatesComparable" value={formData.printAdvertising.printRatesComparable} onChange={handleChange} rows={2} />
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">4. Newsletter Advertising</h3>
            </div>
            <div className="space-y-3">
              <Label>Do you publish a newsletter?</Label>
              <RadioGroup value={formData.newsletterAdvertising.hasNewsletter?.toString()} onValueChange={(value) => handleBooleanChange('newsletterAdvertising', 'hasNewsletter')(value === 'true')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="newsletter-yes" />
                  <Label htmlFor="newsletter-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="newsletter-no" />
                  <Label htmlFor="newsletter-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            {formData.newsletterAdvertising.hasNewsletter && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newsletterSubscribers">Newsletter Subscribers</Label>
                    <Input id="newsletterSubscribers" name="newsletterAdvertising.newsletterSubscribers" type="number" value={formData.newsletterAdvertising.newsletterSubscribers} onChange={handleChange} placeholder="e.g., 12000" />
                  </div>
                  <div>
                    <Label htmlFor="newsletterFrequency">Newsletter Frequency</Label>
                    <Input id="newsletterFrequency" name="newsletterAdvertising.newsletterFrequency" value={formData.newsletterAdvertising.newsletterFrequency} onChange={handleChange} placeholder="e.g., daily, weekly" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newsletterAdSizeLargest">Largest Newsletter Ad Size</Label>
                    <Input id="newsletterAdSizeLargest" name="newsletterAdvertising.newsletterAdSizeLargest" value={formData.newsletterAdvertising.newsletterAdSizeLargest} onChange={handleChange} placeholder="e.g., 600x200 pixels" />
                  </div>
                  <div>
                    <Label htmlFor="newsletterAdSizeSecond">Second Newsletter Ad Size</Label>
                    <Input id="newsletterAdSizeSecond" name="newsletterAdvertising.newsletterAdSizeSecond" value={formData.newsletterAdvertising.newsletterAdSizeSecond} onChange={handleChange} placeholder="e.g., 300x150 pixels" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newsletterLargestAdRate1x">Largest Ad - One-time Rate</Label>
                    <Input id="newsletterLargestAdRate1x" name="newsletterAdvertising.newsletterLargestAdRate1x" value={formData.newsletterAdvertising.newsletterLargestAdRate1x} onChange={handleChange} placeholder="e.g., $500" />
                  </div>
                  <div>
                    <Label htmlFor="newsletterLargestAdRateMonthly">Largest Ad - Monthly Rate</Label>
                    <Input id="newsletterLargestAdRateMonthly" name="newsletterAdvertising.newsletterLargestAdRateMonthly" value={formData.newsletterAdvertising.newsletterLargestAdRateMonthly} onChange={handleChange} placeholder="e.g., $2000" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newsletterSecondAdRate1x">Second Ad - One-time Rate</Label>
                    <Input id="newsletterSecondAdRate1x" name="newsletterAdvertising.newsletterSecondAdRate1x" value={formData.newsletterAdvertising.newsletterSecondAdRate1x} onChange={handleChange} placeholder="e.g., $300" />
                  </div>
                  <div>
                    <Label htmlFor="newsletterSecondAdRateMonthly">Second Ad - Monthly Rate</Label>
                    <Input id="newsletterSecondAdRateMonthly" name="newsletterAdvertising.newsletterSecondAdRateMonthly" value={formData.newsletterAdvertising.newsletterSecondAdRateMonthly} onChange={handleChange} placeholder="e.g., $1200" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="newsletterTakeoverCost">Newsletter Takeover Cost</Label>
                  <Input id="newsletterTakeoverCost" name="newsletterAdvertising.newsletterTakeoverCost" value={formData.newsletterAdvertising.newsletterTakeoverCost} onChange={handleChange} placeholder="e.g., $5000 or N/A" />
                </div>
                <div>
                  <Label htmlFor="newsletterRatesComparable">Are rates comparable across newsletters?</Label>
                  <Textarea id="newsletterRatesComparable" name="newsletterAdvertising.newsletterRatesComparable" value={formData.newsletterAdvertising.newsletterRatesComparable} onChange={handleChange} rows={2} />
                </div>
              </>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">5. Radio, Podcast & Video Advertising</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Do you operate a radio station?</Label>
                <RadioGroup value={formData.radioPodcastAdvertising.hasRadioStation?.toString()} onValueChange={(value) => handleBooleanChange('radioPodcastAdvertising', 'hasRadioStation')(value === 'true')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="radio-yes" />
                    <Label htmlFor="radio-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="radio-no" />
                    <Label htmlFor="radio-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>Do you produce podcasts?</Label>
                <RadioGroup value={formData.radioPodcastAdvertising.hasPodcast?.toString()} onValueChange={(value) => handleBooleanChange('radioPodcastAdvertising', 'hasPodcast')(value === 'true')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="podcast-yes" />
                    <Label htmlFor="podcast-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="podcast-no" />
                    <Label htmlFor="podcast-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            {formData.radioPodcastAdvertising.hasRadioStation && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold">Radio Advertising Rates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="radio30SecondAdsCost10x">10x 30-Second Radio Ads Cost</Label>
                    <Input id="radio30SecondAdsCost10x" name="radioPodcastAdvertising.radio30SecondAdsCost10x" value={formData.radioPodcastAdvertising.radio30SecondAdsCost10x} onChange={handleChange} placeholder="e.g., $1500" />
                  </div>
                  <div>
                    <Label htmlFor="radio60SecondAdsCost10x">10x 60-Second Radio Ads Cost</Label>
                    <Input id="radio60SecondAdsCost10x" name="radioPodcastAdvertising.radio60SecondAdsCost10x" value={formData.radioPodcastAdvertising.radio60SecondAdsCost10x} onChange={handleChange} placeholder="e.g., $2500" />
                  </div>
                </div>
              </div>
            )}
            {formData.radioPodcastAdvertising.hasPodcast && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold">Podcast Advertising</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="podcast30SecondAdsCost10x">10x 30-Second Podcast Ads Cost</Label>
                    <Input id="podcast30SecondAdsCost10x" name="radioPodcastAdvertising.podcast30SecondAdsCost10x" value={formData.radioPodcastAdvertising.podcast30SecondAdsCost10x} onChange={handleChange} placeholder="e.g., $800" />
                  </div>
                  <div>
                    <Label htmlFor="podcastListenersPerShow">Average Listeners per Episode</Label>
                    <Input id="podcastListenersPerShow" name="radioPodcastAdvertising.podcastListenersPerShow" type="number" value={formData.radioPodcastAdvertising.podcastListenersPerShow} onChange={handleChange} placeholder="e.g., 5000" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="podcastSpecialTakeoversCost">Special Show Takeovers Cost</Label>
                  <Input id="podcastSpecialTakeoversCost" name="radioPodcastAdvertising.podcastSpecialTakeoversCost" value={formData.radioPodcastAdvertising.podcastSpecialTakeoversCost} onChange={handleChange} placeholder="e.g., $3000" />
                </div>
              </div>
            )}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-semibold">Video Advertising</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="video30SecondAdCost">30-Second Video Ad Cost</Label>
                  <Input id="video30SecondAdCost" name="radioPodcastAdvertising.video30SecondAdCost" value={formData.radioPodcastAdvertising.video30SecondAdCost} onChange={handleChange} placeholder="e.g., $500" />
                </div>
                <div>
                  <Label htmlFor="video60SecondAdCost">60-Second Video Ad Cost</Label>
                  <Input id="video60SecondAdCost" name="radioPodcastAdvertising.video60SecondAdCost" value={formData.radioPodcastAdvertising.video60SecondAdCost} onChange={handleChange} placeholder="e.g., $800" />
                </div>
                <div>
                  <Label htmlFor="videoAverageViews">Average Views per Video</Label>
                  <Input id="videoAverageViews" name="radioPodcastAdvertising.videoAverageViews" type="number" value={formData.radioPodcastAdvertising.videoAverageViews} onChange={handleChange} placeholder="e.g., 10000" />
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">6. Social Media</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="facebookFollowers">Facebook Followers</Label>
                <Input id="facebookFollowers" name="socialMedia.facebookFollowers" type="number" value={formData.socialMedia.facebookFollowers} onChange={handleChange} placeholder="e.g., 25000" />
              </div>
              <div>
                <Label htmlFor="instagramFollowers">Instagram Followers</Label>
                <Input id="instagramFollowers" name="socialMedia.instagramFollowers" type="number" value={formData.socialMedia.instagramFollowers} onChange={handleChange} placeholder="e.g., 15000" />
              </div>
              <div>
                <Label htmlFor="twitterFollowers">Twitter/X Followers</Label>
                <Input id="twitterFollowers" name="socialMedia.twitterFollowers" type="number" value={formData.socialMedia.twitterFollowers} onChange={handleChange} placeholder="e.g., 8000" />
              </div>
              <div>
                <Label htmlFor="tiktokFollowers">TikTok Followers</Label>
                <Input id="tiktokFollowers" name="socialMedia.tiktokFollowers" type="number" value={formData.socialMedia.tiktokFollowers} onChange={handleChange} placeholder="e.g., 12000" />
              </div>
              <div>
                <Label htmlFor="linkedinFollowers">LinkedIn Followers</Label>
                <Input id="linkedinFollowers" name="socialMedia.linkedinFollowers" type="number" value={formData.socialMedia.linkedinFollowers} onChange={handleChange} placeholder="e.g., 3000" />
              </div>
            </div>
            <div>
              <Label htmlFor="otherSocialFollowers">Other Social Media Platforms</Label>
              <Textarea id="otherSocialFollowers" name="socialMedia.otherSocialFollowers" value={formData.socialMedia.otherSocialFollowers} onChange={handleChange} rows={2} placeholder="List other platforms and follower counts" />
            </div>
            <div>
              <Label htmlFor="socialMediaAdvertisingOptions">Social Media Advertising Services</Label>
              <Textarea id="socialMediaAdvertisingOptions" name="socialMedia.socialMediaAdvertisingOptions" value={formData.socialMedia.socialMediaAdvertisingOptions} onChange={handleChange} rows={3} placeholder="Describe social media advertising services you offer" />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">7. Event Marketing</h3>
            </div>
            <div className="space-y-3">
              <Label>Do you host events?</Label>
              <RadioGroup value={formData.eventMarketing.hostsEvents?.toString()} onValueChange={(value) => handleBooleanChange('eventMarketing', 'hostsEvents')(value === 'true')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="events-yes" />
                  <Label htmlFor="events-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="events-no" />
                  <Label htmlFor="events-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            {formData.eventMarketing.hostsEvents && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="annualEventCount">Average Events per Year</Label>
                    <Input id="annualEventCount" name="eventMarketing.annualEventCount" type="number" value={formData.eventMarketing.annualEventCount} onChange={handleChange} placeholder="e.g., 12" />
                  </div>
                  <div>
                    <Label htmlFor="eventAttendanceRange">Typical Event Attendance</Label>
                    <Input id="eventAttendanceRange" name="eventMarketing.eventAttendanceRange" value={formData.eventMarketing.eventAttendanceRange} onChange={handleChange} placeholder="e.g., 50-200" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="largestSponsorshipLevel">Highest Sponsorship Level</Label>
                    <Input id="largestSponsorshipLevel" name="eventMarketing.largestSponsorshipLevel" value={formData.eventMarketing.largestSponsorshipLevel} onChange={handleChange} placeholder="e.g., $5000" />
                  </div>
                  <div>
                    <Label htmlFor="smallestSponsorshipLevel">Lowest Sponsorship Level</Label>
                    <Input id="smallestSponsorshipLevel" name="eventMarketing.smallestSponsorshipLevel" value={formData.eventMarketing.smallestSponsorshipLevel} onChange={handleChange} placeholder="e.g., $500" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="eventSponsorshipDetails">Event Sponsorship Details</Label>
                  <Textarea id="eventSponsorshipDetails" name="eventMarketing.eventSponsorshipDetails" value={formData.eventMarketing.eventSponsorshipDetails} onChange={handleChange} rows={3} placeholder="Describe sponsorship opportunities and benefits" />
                </div>
              </>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">8. Branded Content & Additional Services</h3>
            </div>
            <div className="space-y-3">
              <Label>Do you offer branded/sponsored content?</Label>
              <RadioGroup value={formData.brandedContent.offersBrandedContent?.toString()} onValueChange={(value) => handleBooleanChange('brandedContent', 'offersBrandedContent')(value === 'true')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="branded-yes" />
                  <Label htmlFor="branded-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="branded-no" />
                  <Label htmlFor="branded-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            {formData.brandedContent.offersBrandedContent && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold">Branded Content Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="printBrandedContentCost">Print Branded Content Cost</Label>
                    <Input id="printBrandedContentCost" name="brandedContent.printBrandedContentCost" value={formData.brandedContent.printBrandedContentCost} onChange={handleChange} placeholder="e.g., $2500 or N/A" />
                  </div>
                  <div>
                    <Label htmlFor="websiteBrandedContentCost3Month">Website Branded Content (3 months)</Label>
                    <Input id="websiteBrandedContentCost3Month" name="brandedContent.websiteBrandedContentCost3Month" value={formData.brandedContent.websiteBrandedContentCost3Month} onChange={handleChange} placeholder="e.g., $3000" />
                  </div>
                  <div>
                    <Label htmlFor="shortFormContentCost">Short-form Content/Interviews</Label>
                    <Input id="shortFormContentCost" name="brandedContent.shortFormContentCost" value={formData.brandedContent.shortFormContentCost} onChange={handleChange} placeholder="e.g., $1500" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="brandedContentAdditionalInfo">Additional Branded Content Info</Label>
                  <Textarea id="brandedContentAdditionalInfo" name="brandedContent.brandedContentAdditionalInfo" value={formData.brandedContent.brandedContentAdditionalInfo} onChange={handleChange} rows={3} />
                </div>
              </div>
            )}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-semibold">Additional Services</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>OTT (Over-the-Top) Marketing?</Label>
                  <RadioGroup value={formData.additionalServices.offersOttMarketing?.toString()} onValueChange={(value) => handleBooleanChange('additionalServices', 'offersOttMarketing')(value === 'true')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="ott-yes" />
                      <Label htmlFor="ott-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="ott-no" />
                      <Label htmlFor="ott-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Virtual Webinars?</Label>
                  <RadioGroup value={formData.additionalServices.offersVirtualWebinars?.toString()} onValueChange={(value) => handleBooleanChange('additionalServices', 'offersVirtualWebinars')(value === 'true')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="webinar-yes" />
                      <Label htmlFor="webinar-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="webinar-no" />
                      <Label htmlFor="webinar-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Other Video Production?</Label>
                  <RadioGroup value={formData.additionalServices.producesOtherVideos?.toString()} onValueChange={(value) => handleBooleanChange('additionalServices', 'producesOtherVideos')(value === 'true')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="video-yes" />
                      <Label htmlFor="video-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="video-no" />
                      <Label htmlFor="video-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <div>
                <Label htmlFor="videoProductionDetails">Video Production Details</Label>
                <Textarea id="videoProductionDetails" name="additionalServices.videoProductionDetails" value={formData.additionalServices.videoProductionDetails} onChange={handleChange} rows={2} placeholder="Describe video production capabilities" />
              </div>
              <div>
                <Label htmlFor="customData">Additional Information</Label>
                <Textarea id="customData" name="additionalServices.customData" value={formData.additionalServices.customData} onChange={handleChange} rows={3} placeholder="Any other services or information you'd like to share" />
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-2xl font-semibold text-center">Survey Submitted!</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Thank you for providing your advertising inventory information. We will review your submission and add you to our media partner network.
            </p>
            <Button onClick={() => { onOpenChange(false); resetForm(); }}>Close</Button>
          </div>
        );

      default:
        return null;
    }
  };

  const stepIcons = [Users, Globe, Printer, Mail, Radio, Users, Calendar, FileText];
  const stepLabels = ['Contact', 'Website', 'Print', 'Newsletter', 'Audio/Video', 'Social', 'Events', 'Content'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chicago Media Network - Advertising Inventory Survey</DialogTitle>
          <DialogDescription>
            Help us understand your advertising opportunities and join our network of Chicago media partners.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {step <= 8 && (
            <div className="flex justify-between text-xs text-muted-foreground overflow-x-auto pb-2">
              {stepLabels.map((label, index) => {
                const IconComponent = stepIcons[index];
                return (
                  <div key={label} className={`flex flex-col items-center min-w-0 ${step === index + 1 ? 'font-bold text-primary' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1 ${step > index + 1 ? 'bg-primary border-primary text-white' : step === index + 1 ? 'border-primary text-primary' : 'border-muted-foreground'}`}>
                      {step > index + 1 ? <CheckCircle className="h-4 w-4" /> : <IconComponent className="h-4 w-4" />}
                    </div>
                    <span className="text-center">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
          {renderStep()}
        </div>
        {step <= 8 && (
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleBack} disabled={step === 1}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            {step < 8 ? (
              <Button onClick={handleNext}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                Submit Survey <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SurveyForm;