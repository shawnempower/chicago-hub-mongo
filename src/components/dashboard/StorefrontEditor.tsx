import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  StorefrontConfiguration, 
  ComponentType,
  HeroContent,
  AudienceContent,
  InventoryContent,
  CampaignContent,
  ContactFaqContent,
  AboutUsContent,
  NavbarContent,
  FooterContent,
  TestimonialsContent
} from '@/types/storefront';
import { 
  Navigation,
  Home,
  Users,
  Package,
  Zap,
  Mail,
  Info,
  Settings,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  Plus,
  X,
  Trash2,
  PlusCircle,
  MessageSquare,
  Megaphone,
  Globe
} from 'lucide-react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StorefrontImageManager } from './StorefrontImageManager';

// Available component types that can be added
const AVAILABLE_COMPONENT_TYPES: ComponentType[] = [
  'navbar', 'hero', 'audience', 'testimonials', 'inventory', 'campaign', 'contactfaq', 'aboutus', 'footer'
];

interface AddComponentDropdownProps {
  onAddComponent: (componentType: ComponentType) => void;
  existingComponents: ComponentType[];
}

const AddComponentDropdown: React.FC<AddComponentDropdownProps> = ({ onAddComponent, existingComponents }) => {
  const availableComponents = AVAILABLE_COMPONENT_TYPES.filter(
    type => !existingComponents.includes(type)
  );

  const getComponentIcon = (componentType: ComponentType) => {
    const icons = {
      navbar: Navigation,
      hero: Home,
      audience: Users,
      testimonials: MessageSquare,
      inventory: Package,
      campaign: Megaphone,
      contactfaq: Mail,
      aboutus: Info,
      footer: Globe
    };
    return icons[componentType] || Settings;
  };

  if (availableComponents.length === 0) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <PlusCircle className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <PlusCircle className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableComponents.map(type => {
          const Icon = getComponentIcon(type);
          return (
            <DropdownMenuItem
              key={type}
              onClick={() => onAddComponent(type)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              <span className="capitalize">{type}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface StorefrontEditorProps {
  config: StorefrontConfiguration;
  onChange: (config: StorefrontConfiguration) => void;
  onSave: (config: StorefrontConfiguration) => void;
  saving: boolean;
  publicationId: string;
}

export const StorefrontEditor: React.FC<StorefrontEditorProps> = ({
  config,
  onChange,
  onSave,
  saving,
  publicationId
}) => {
  const [activeComponent, setActiveComponent] = useState<ComponentType>('hero');

  const updateComponent = (componentType: ComponentType, updates: any) => {
    const updatedConfig = {
      ...config,
      components: {
        ...config.components,
        [componentType]: {
          ...config.components[componentType],
          ...updates
        }
      }
    };
    onChange(updatedConfig);
  };

  const updateComponentContent = (componentType: ComponentType, content: any) => {
    updateComponent(componentType, { content });
  };

  const toggleComponent = (componentType: ComponentType) => {
    updateComponent(componentType, { 
      enabled: !config.components[componentType].enabled 
    });
  };

  const moveComponent = (componentType: ComponentType, direction: 'up' | 'down') => {
    const currentOrder = config.components[componentType].order;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    
    // Find component with the target order
    const targetComponent = Object.entries(config.components).find(
      ([_, component]) => component.order === newOrder
    );
    
    if (targetComponent) {
      const [targetType] = targetComponent;
      const updatedConfig = {
        ...config,
        components: {
          ...config.components,
          [componentType]: {
            ...config.components[componentType],
            order: newOrder
          },
          [targetType]: {
            ...config.components[targetType],
            order: currentOrder
          }
        }
      };
      onChange(updatedConfig);
    }
  };

  const addComponent = (componentType: ComponentType) => {
    if (config.components[componentType]) return; // Component already exists
    
    const maxOrder = Math.max(...Object.values(config.components).map(c => c.order), 0);
    const defaultContent = getDefaultComponentContent(componentType);
    
    const updatedConfig = {
      ...config,
      components: {
        ...config.components,
        [componentType]: {
          enabled: true,
          order: maxOrder + 1,
          content: defaultContent
        }
      }
    };
    onChange(updatedConfig);
    setActiveComponent(componentType);
  };

  const removeComponent = (componentType: ComponentType) => {
    if (!config.components[componentType]) return;
    
    const removedOrder = config.components[componentType].order;
    const { [componentType]: removed, ...remainingComponents } = config.components;
    
    // Reorder remaining components
    const reorderedComponents = Object.entries(remainingComponents).reduce((acc, [type, component]) => {
      acc[type] = {
        ...component,
        order: component.order > removedOrder ? component.order - 1 : component.order
      };
      return acc;
    }, {} as typeof remainingComponents);
    
    const updatedConfig = {
      ...config,
      components: reorderedComponents
    };
    
    onChange(updatedConfig);
    
    // Set active component to first available component
    const remainingTypes = Object.keys(reorderedComponents) as ComponentType[];
    if (remainingTypes.length > 0) {
      setActiveComponent(remainingTypes[0]);
    }
  };

  const getDefaultComponentContent = (componentType: ComponentType) => {
    switch (componentType) {
      case 'navbar':
        return {
          logoUrl: '',
          navItems: [
            { id: 'home', label: 'Home', href: '#hero' },
            { id: 'about', label: 'About', href: '#aboutus' }
          ],
          ctaText: 'Get Started',
          ctaHref: '#contact'
        };
      case 'hero':
        return {
          tag: '',
          title: 'Your Compelling Headline',
          description: 'Describe your value proposition here',
          ctaText: 'Get Started',
          imageUrl: '',
          stats: []
        };
      case 'audience':
        return {
          title: 'Your Target Audience',
          description: 'Learn about the people you can reach',
          ageDemographics: [],
          statHighlights: []
        };
      case 'testimonials':
        return {
          title: 'What Our Customers Say',
          subtitle: 'Success stories from satisfied clients',
          testimonials: []
        };
      case 'inventory':
        return {
          title: 'Our Services',
          subtitle: 'Explore what we offer',
          channels: []
        };
      case 'campaign':
        return {
          title: 'How It Works',
          description: 'Simple steps to get started',
          planningCard: {
            title: 'Get Your Custom Proposal',
            features: [],
            ctaText: 'Get Started'
          },
          features: []
        };
      case 'contactfaq':
        return {
          title: 'Get In Touch',
          description: 'We\'d love to hear from you',
          faqTitle: 'Frequently Asked Questions',
          formLabels: {
            name: 'Full Name',
            email: 'Email Address',
            company: 'Company Name',
            interest: 'Interest',
            message: 'Message',
            submit: 'Send Message'
          },
          faqItems: [],
          contactInfo: {
            phone: '',
            email: ''
          }
        };
      case 'aboutus':
        return {
          title: 'About Us',
          paragraphs: ['Tell your story here...'],
          imageUrl: ''
        };
      case 'footer':
        return {
          companyName: 'Your Company',
          description: 'Your company description',
          contactInfo: {
            phone: '',
            email: '',
            address: ''
          },
          socialLinks: {
            linkedin: null,
            twitter: null,
            facebook: null,
            instagram: null
          },
          navItems: []
        };
      default:
        return {};
    }
  };

  const getComponentIcon = (componentType: ComponentType) => {
    const icons = {
      navbar: Navigation,
      hero: Home,
      audience: Users,
      testimonials: MessageSquare,
      inventory: Package,
      campaign: Megaphone,
      contactfaq: Mail,
      aboutus: Info,
      footer: Globe
    };
    return icons[componentType] || Settings;
  };

  const componentsList = Object.entries(config.components)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([type, component]) => ({ type: type as ComponentType, ...component }));

  const renderHeroEditor = (content: HeroContent) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="hero-tag">Tag Line</Label>
        <Input
          id="hero-tag"
          value={content.tag}
          onChange={(e) => updateComponentContent('hero', { ...content, tag: e.target.value })}
          placeholder="e.g., TRUSTED LOCAL MEDIA"
        />
      </div>
      
      <div>
        <Label htmlFor="hero-title">Main Title</Label>
        <Input
          id="hero-title"
          value={content.title}
          onChange={(e) => updateComponentContent('hero', { ...content, title: e.target.value })}
          placeholder="Your compelling headline"
        />
      </div>
      
      <div>
        <Label htmlFor="hero-description">Description</Label>
        <Textarea
          id="hero-description"
          value={content.description}
          onChange={(e) => updateComponentContent('hero', { ...content, description: e.target.value })}
          placeholder="Describe your value proposition"
          rows={3}
        />
      </div>
      
      <div>
        <Label htmlFor="hero-cta">Call to Action Text</Label>
        <Input
          id="hero-cta"
          value={content.ctaText}
          onChange={(e) => updateComponentContent('hero', { ...content, ctaText: e.target.value })}
          placeholder="e.g., Get Started"
        />
      </div>
      
      <StorefrontImageManager
        publicationId={publicationId}
        config={config}
        onChange={onChange}
        imageType="hero"
        label="Hero Background Image"
        description="Upload a high-quality hero image (recommended: 1920x1080px)"
      />

      <div>
        <Label>Statistics</Label>
        <div className="space-y-2">
          {(content.stats || []).map((stat, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={stat.key}
                onChange={(e) => {
                  const newStats = [...(content.stats || [])];
                  newStats[index] = { ...stat, key: e.target.value };
                  updateComponentContent('hero', { ...content, stats: newStats });
                }}
                placeholder="Statistic"
              />
              <Input
                value={stat.value}
                onChange={(e) => {
                  const newStats = [...(content.stats || [])];
                  newStats[index] = { ...stat, value: e.target.value };
                  updateComponentContent('hero', { ...content, stats: newStats });
                }}
                placeholder="Description"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newStats = (content.stats || []).filter((_, i) => i !== index);
                  updateComponentContent('hero', { ...content, stats: newStats });
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newStats = [...content.stats, { key: '', value: '' }];
              updateComponentContent('hero', { ...content, stats: newStats });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Statistic
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAudienceEditor = (content: AudienceContent) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="audience-title">Title</Label>
        <Input
          id="audience-title"
          value={content.title}
          onChange={(e) => updateComponentContent('audience', { ...content, title: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="audience-description">Description</Label>
        <Textarea
          id="audience-description"
          value={content.description}
          onChange={(e) => updateComponentContent('audience', { ...content, description: e.target.value })}
          rows={3}
        />
      </div>

      <div>
        <Label>Age Demographics</Label>
        <div className="space-y-2">
          {(content.ageDemographics || []).map((demo, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={demo.label}
                onChange={(e) => {
                  const newDemos = [...(content.ageDemographics || [])];
                  newDemos[index] = { ...demo, label: e.target.value };
                  updateComponentContent('audience', { ...content, ageDemographics: newDemos });
                }}
                placeholder="Age range"
              />
              <Input
                type="number"
                value={demo.percentage}
                onChange={(e) => {
                  const newDemos = [...(content.ageDemographics || [])];
                  newDemos[index] = { ...demo, percentage: parseInt(e.target.value) || 0 };
                  updateComponentContent('audience', { ...content, ageDemographics: newDemos });
                }}
                placeholder="Percentage"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDemos = (content.ageDemographics || []).filter((_, i) => i !== index);
                  updateComponentContent('audience', { ...content, ageDemographics: newDemos });
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newDemos = [...content.ageDemographics, { label: '', percentage: 0 }];
              updateComponentContent('audience', { ...content, ageDemographics: newDemos });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Age Group
          </Button>
        </div>
      </div>

      <div>
        <Label>Stat Highlights</Label>
        <div className="space-y-2">
          {(content.statHighlights || []).map((stat, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={stat.key}
                onChange={(e) => {
                  const newStats = [...(content.statHighlights || [])];
                  newStats[index] = { ...stat, key: e.target.value };
                  updateComponentContent('audience', { ...content, statHighlights: newStats });
                }}
                placeholder="Stat key"
              />
              <Input
                value={stat.value}
                onChange={(e) => {
                  const newStats = [...(content.statHighlights || [])];
                  newStats[index] = { ...stat, value: e.target.value };
                  updateComponentContent('audience', { ...content, statHighlights: newStats });
                }}
                placeholder="Stat value"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newStats = (content.statHighlights || []).filter((_, i) => i !== index);
                  updateComponentContent('audience', { ...content, statHighlights: newStats });
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newStats = [...content.statHighlights, { key: '', value: '' }];
              updateComponentContent('audience', { ...content, statHighlights: newStats });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Stat
          </Button>
        </div>
      </div>
    </div>
  );

  const renderNavbarEditor = (content: NavbarContent) => (
    <div className="space-y-4">
      <StorefrontImageManager
        publicationId={publicationId}
        config={config}
        onChange={onChange}
        imageType="logo"
        label="Logo"
        description="Upload your publication's logo (recommended: 200x50px, PNG with transparency)"
      />
      
      <div>
        <Label htmlFor="navbar-cta-text">CTA Button Text</Label>
        <Input
          id="navbar-cta-text"
          value={content.ctaText}
          onChange={(e) => updateComponentContent('navbar', { ...content, ctaText: e.target.value })}
          placeholder="Get Started"
        />
      </div>
      
      <div>
        <Label htmlFor="navbar-cta-href">CTA Button Link</Label>
        <Input
          id="navbar-cta-href"
          value={content.ctaHref}
          onChange={(e) => updateComponentContent('navbar', { ...content, ctaHref: e.target.value })}
          placeholder="#contact"
        />
      </div>

      <div>
        <Label>Navigation Items</Label>
        <div className="space-y-2">
          {(content.navItems || []).map((item, index) => (
            <div key={index} className="grid grid-cols-3 gap-2">
              <Input
                value={item.label}
                onChange={(e) => {
                  const newItems = [...(content.navItems || [])];
                  newItems[index] = { ...item, label: e.target.value };
                  updateComponentContent('navbar', { ...content, navItems: newItems });
                }}
                placeholder="Label"
              />
              <Input
                value={item.href}
                onChange={(e) => {
                  const newItems = [...(content.navItems || [])];
                  newItems[index] = { ...item, href: e.target.value };
                  updateComponentContent('navbar', { ...content, navItems: newItems });
                }}
                placeholder="Link"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newItems = (content.navItems || []).filter((_, i) => i !== index);
                  updateComponentContent('navbar', { ...content, navItems: newItems });
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newItems = [...content.navItems, { id: `nav-${Date.now()}`, label: '', href: '' }];
              updateComponentContent('navbar', { ...content, navItems: newItems });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Navigation Item
          </Button>
        </div>
      </div>
    </div>
  );

  const renderInventoryEditor = (content: InventoryContent) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="inventory-title">Title</Label>
        <Input
          id="inventory-title"
          value={content.title}
          onChange={(e) => updateComponentContent('inventory', { ...content, title: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="inventory-subtitle">Subtitle</Label>
        <Textarea
          id="inventory-subtitle"
          value={content.subtitle}
          onChange={(e) => updateComponentContent('inventory', { ...content, subtitle: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label>Advertising Channels</Label>
        <div className="space-y-4">
          {(content.channels || []).map((channel, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Channel ID</Label>
                    <Input
                      value={channel.id}
                      onChange={(e) => {
                        const newChannels = [...(content.channels || [])];
                        newChannels[index] = { ...channel, id: e.target.value };
                        updateComponentContent('inventory', { ...content, channels: newChannels });
                      }}
                      placeholder="print"
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={channel.label}
                      onChange={(e) => {
                        const newChannels = [...(content.channels || [])];
                        newChannels[index] = { ...channel, label: e.target.value };
                        updateComponentContent('inventory', { ...content, channels: newChannels });
                      }}
                      placeholder="Print"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Title</Label>
                  <Input
                    value={channel.title}
                    onChange={(e) => {
                      const newChannels = [...(content.channels || [])];
                      newChannels[index] = { ...channel, title: e.target.value };
                      updateComponentContent('inventory', { ...content, channels: newChannels });
                    }}
                    placeholder="Print Advertising"
                  />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={channel.description}
                    onChange={(e) => {
                      const newChannels = [...(content.channels || [])];
                      newChannels[index] = { ...channel, description: e.target.value };
                      updateComponentContent('inventory', { ...content, channels: newChannels });
                    }}
                    rows={2}
                  />
                </div>
                
                <StorefrontImageManager
                  publicationId={publicationId}
                  config={config}
                  onChange={onChange}
                  imageType="channel"
                  channelId={channel.id}
                  label="Channel Image"
                  description="Upload an image for this advertising channel"
                />

                <div>
                  <Label>Statistics</Label>
                  <div className="space-y-2">
                    {(channel.stats || []).map((stat, statIndex) => (
                      <div key={statIndex} className="flex gap-2">
                        <Input
                          value={stat.key}
                          onChange={(e) => {
                            const newChannels = [...(content.channels || [])];
                            const newStats = [...channel.stats];
                            newStats[statIndex] = { ...stat, key: e.target.value };
                            newChannels[index] = { ...channel, stats: newStats };
                            updateComponentContent('inventory', { ...content, channels: newChannels });
                          }}
                          placeholder="Stat key"
                        />
                        <Input
                          value={stat.value}
                          onChange={(e) => {
                            const newChannels = [...(content.channels || [])];
                            const newStats = [...channel.stats];
                            newStats[statIndex] = { ...stat, value: e.target.value };
                            newChannels[index] = { ...channel, stats: newStats };
                            updateComponentContent('inventory', { ...content, channels: newChannels });
                          }}
                          placeholder="Stat value"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newChannels = [...(content.channels || [])];
                            const newStats = channel.stats.filter((_, i) => i !== statIndex);
                            newChannels[index] = { ...channel, stats: newStats };
                            updateComponentContent('inventory', { ...content, channels: newChannels });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newChannels = [...(content.channels || [])];
                        const newStats = [...channel.stats, { key: '', value: '' }];
                        newChannels[index] = { ...channel, stats: newStats };
                        updateComponentContent('inventory', { ...content, channels: newChannels });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Stat
                    </Button>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newChannels = (content.channels || []).filter((_, i) => i !== index);
                    updateComponentContent('inventory', { ...content, channels: newChannels });
                  }}
                >
                  Remove Channel
                </Button>
              </div>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const newChannels = [...content.channels, {
                id: `channel-${Date.now()}`,
                label: '',
                title: '',
                description: '',
                imageUrl: '',
                stats: []
              }];
              updateComponentContent('inventory', { ...content, channels: newChannels });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Channel
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCampaignEditor = (content: CampaignContent) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="campaign-title">Title</Label>
        <Input
          id="campaign-title"
          value={content.title}
          onChange={(e) => updateComponentContent('campaign', { ...content, title: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="campaign-description">Description</Label>
        <Textarea
          id="campaign-description"
          value={content.description}
          onChange={(e) => updateComponentContent('campaign', { ...content, description: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label>Planning Card</Label>
        <Card className="p-4">
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={content.planningCard.title}
                onChange={(e) => updateComponentContent('campaign', { 
                  ...content, 
                  planningCard: { ...content.planningCard, title: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>CTA Text</Label>
              <Input
                value={content.planningCard.ctaText}
                onChange={(e) => updateComponentContent('campaign', { 
                  ...content, 
                  planningCard: { ...content.planningCard, ctaText: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Features</Label>
              <div className="space-y-2">
                {(content.planningCard?.features || []).map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...(content.planningCard?.features || [])];
                        newFeatures[index] = e.target.value;
                        updateComponentContent('campaign', { 
                          ...content, 
                          planningCard: { ...(content.planningCard || {}), features: newFeatures }
                        });
                      }}
                      placeholder="Feature description"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFeatures = (content.planningCard?.features || []).filter((_, i) => i !== index);
                        updateComponentContent('campaign', { 
                          ...content, 
                          planningCard: { ...(content.planningCard || {}), features: newFeatures }
                        });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newFeatures = [...content.planningCard.features, ''];
                    updateComponentContent('campaign', { 
                      ...content, 
                      planningCard: { ...content.planningCard, features: newFeatures }
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Feature
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <Label>Campaign Features</Label>
        <div className="space-y-2">
          {(content.features || []).map((feature, index) => (
            <Card key={index} className="p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={feature.title}
                    onChange={(e) => {
                      const newFeatures = [...(content.features || [])];
                      newFeatures[index] = { ...feature, title: e.target.value };
                      updateComponentContent('campaign', { ...content, features: newFeatures });
                    }}
                  />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Input
                    value={feature.icon}
                    onChange={(e) => {
                      const newFeatures = [...(content.features || [])];
                      newFeatures[index] = { ...feature, icon: e.target.value };
                      updateComponentContent('campaign', { ...content, features: newFeatures });
                    }}
                    placeholder="award"
                  />
                </div>
              </div>
              <div className="mt-2">
                <Label>Description</Label>
                <Textarea
                  value={feature.description}
                  onChange={(e) => {
                    const newFeatures = [...(content.features || [])];
                    newFeatures[index] = { ...feature, description: e.target.value };
                    updateComponentContent('campaign', { ...content, features: newFeatures });
                  }}
                  rows={2}
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const newFeatures = (content.features || []).filter((_, i) => i !== index);
                  updateComponentContent('campaign', { ...content, features: newFeatures });
                }}
              >
                Remove Feature
              </Button>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const newFeatures = [...content.features, { title: '', description: '', icon: '' }];
              updateComponentContent('campaign', { ...content, features: newFeatures });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Feature
          </Button>
        </div>
      </div>
    </div>
  );

  const renderContactFaqEditor = (content: ContactFaqContent) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="contact-title">Title</Label>
        <Input
          id="contact-title"
          value={content.title}
          onChange={(e) => updateComponentContent('contactfaq', { ...content, title: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="contact-description">Description</Label>
        <Textarea
          id="contact-description"
          value={content.description}
          onChange={(e) => updateComponentContent('contactfaq', { ...content, description: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="faq-title">FAQ Section Title</Label>
        <Input
          id="faq-title"
          value={content.faqTitle}
          onChange={(e) => updateComponentContent('contactfaq', { ...content, faqTitle: e.target.value })}
        />
      </div>

      <div>
        <Label>Form Labels</Label>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name Field</Label>
              <Input
                value={content.formLabels.name}
                onChange={(e) => updateComponentContent('contactfaq', { 
                  ...content, 
                  formLabels: { ...content.formLabels, name: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Email Field</Label>
              <Input
                value={content.formLabels.email}
                onChange={(e) => updateComponentContent('contactfaq', { 
                  ...content, 
                  formLabels: { ...content.formLabels, email: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Company Field</Label>
              <Input
                value={content.formLabels.company}
                onChange={(e) => updateComponentContent('contactfaq', { 
                  ...content, 
                  formLabels: { ...content.formLabels, company: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Interest Field</Label>
              <Input
                value={content.formLabels.interest}
                onChange={(e) => updateComponentContent('contactfaq', { 
                  ...content, 
                  formLabels: { ...content.formLabels, interest: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Message Field</Label>
              <Input
                value={content.formLabels.message}
                onChange={(e) => updateComponentContent('contactfaq', { 
                  ...content, 
                  formLabels: { ...content.formLabels, message: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Submit Button</Label>
              <Input
                value={content.formLabels.submit}
                onChange={(e) => updateComponentContent('contactfaq', { 
                  ...content, 
                  formLabels: { ...content.formLabels, submit: e.target.value }
                })}
              />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <Label>Contact Information</Label>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input
                value={content.contactInfo.phone}
                onChange={(e) => updateComponentContent('contactfaq', { 
                  ...content, 
                  contactInfo: { ...content.contactInfo, phone: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={content.contactInfo.email}
                onChange={(e) => updateComponentContent('contactfaq', { 
                  ...content, 
                  contactInfo: { ...content.contactInfo, email: e.target.value }
                })}
              />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <Label>FAQ Items</Label>
        <div className="space-y-2">
          {(content.faqItems || []).map((item, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-2">
                <div>
                  <Label>Question</Label>
                  <Input
                    value={item.question}
                    onChange={(e) => {
                      const newItems = [...(content.faqItems || [])];
                      newItems[index] = { ...item, question: e.target.value };
                      updateComponentContent('contactfaq', { ...content, faqItems: newItems });
                    }}
                  />
                </div>
                <div>
                  <Label>Answer</Label>
                  <Textarea
                    value={item.answer}
                    onChange={(e) => {
                      const newItems = [...(content.faqItems || [])];
                      newItems[index] = { ...item, answer: e.target.value };
                      updateComponentContent('contactfaq', { ...content, faqItems: newItems });
                    }}
                    rows={3}
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newItems = (content.faqItems || []).filter((_, i) => i !== index);
                    updateComponentContent('contactfaq', { ...content, faqItems: newItems });
                  }}
                >
                  Remove FAQ
                </Button>
              </div>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const newItems = [...content.faqItems, { id: `faq-${Date.now()}`, question: '', answer: '' }];
              updateComponentContent('contactfaq', { ...content, faqItems: newItems });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add FAQ Item
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAboutUsEditor = (content: AboutUsContent) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="about-title">Title</Label>
        <Input
          id="about-title"
          value={content.title}
          onChange={(e) => updateComponentContent('aboutus', { ...content, title: e.target.value })}
        />
      </div>
      
      <StorefrontImageManager
        publicationId={publicationId}
        config={config}
        onChange={onChange}
        imageType="about"
        label="About Us Image"
        description="Upload an image for the about section (recommended: 800x600px)"
      />

      <div>
        <Label>Paragraphs</Label>
        <div className="space-y-2">
          {(content.paragraphs || []).map((paragraph, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Paragraph {index + 1}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newParagraphs = (content.paragraphs || []).filter((_, i) => i !== index);
                    updateComponentContent('aboutus', { ...content, paragraphs: newParagraphs });
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                value={paragraph}
                onChange={(e) => {
                  const newParagraphs = [...(content.paragraphs || [])];
                  newParagraphs[index] = e.target.value;
                  updateComponentContent('aboutus', { ...content, paragraphs: newParagraphs });
                }}
                rows={4}
                placeholder="Enter paragraph content..."
              />
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const newParagraphs = [...content.paragraphs, ''];
              updateComponentContent('aboutus', { ...content, paragraphs: newParagraphs });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Paragraph
          </Button>
        </div>
      </div>
    </div>
  );

  const renderFooterEditor = (content: FooterContent) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="footer-company">Company Name</Label>
        <Input
          id="footer-company"
          value={content.companyName}
          onChange={(e) => updateComponentContent('footer', { ...content, companyName: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="footer-description">Description</Label>
        <Textarea
          id="footer-description"
          value={content.description}
          onChange={(e) => updateComponentContent('footer', { ...content, description: e.target.value })}
          rows={3}
        />
      </div>

      <div>
        <Label>Contact Information</Label>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input
                value={content.contactInfo.phone}
                onChange={(e) => updateComponentContent('footer', { 
                  ...content, 
                  contactInfo: { ...content.contactInfo, phone: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={content.contactInfo.email}
                onChange={(e) => updateComponentContent('footer', { 
                  ...content, 
                  contactInfo: { ...content.contactInfo, email: e.target.value }
                })}
              />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input
                value={content.contactInfo.address || ''}
                onChange={(e) => updateComponentContent('footer', { 
                  ...content, 
                  contactInfo: { ...content.contactInfo, address: e.target.value }
                })}
              />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <Label>Social Links</Label>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>LinkedIn</Label>
              <Input
                value={content.socialLinks.linkedin || ''}
                onChange={(e) => updateComponentContent('footer', { 
                  ...content, 
                  socialLinks: { ...content.socialLinks, linkedin: e.target.value || null }
                })}
                placeholder="https://linkedin.com/company/..."
              />
            </div>
            <div>
              <Label>Facebook</Label>
              <Input
                value={content.socialLinks.facebook || ''}
                onChange={(e) => updateComponentContent('footer', { 
                  ...content, 
                  socialLinks: { ...content.socialLinks, facebook: e.target.value || null }
                })}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input
                value={content.socialLinks.instagram || ''}
                onChange={(e) => updateComponentContent('footer', { 
                  ...content, 
                  socialLinks: { ...content.socialLinks, instagram: e.target.value || null }
                })}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <Label>Twitter</Label>
              <Input
                value={content.socialLinks.twitter || ''}
                onChange={(e) => updateComponentContent('footer', { 
                  ...content, 
                  socialLinks: { ...content.socialLinks, twitter: e.target.value || null }
                })}
                placeholder="https://twitter.com/..."
              />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <Label>Footer Navigation</Label>
        <div className="space-y-2">
          {(content.navItems || []).map((item, index) => (
            <div key={index} className="grid grid-cols-3 gap-2">
              <Input
                value={item.label}
                onChange={(e) => {
                  const newItems = [...(content.navItems || [])];
                  newItems[index] = { ...item, label: e.target.value };
                  updateComponentContent('footer', { ...content, navItems: newItems });
                }}
                placeholder="Label"
              />
              <Input
                value={item.href}
                onChange={(e) => {
                  const newItems = [...(content.navItems || [])];
                  newItems[index] = { ...item, href: e.target.value };
                  updateComponentContent('footer', { ...content, navItems: newItems });
                }}
                placeholder="Link"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newItems = (content.navItems || []).filter((_, i) => i !== index);
                  updateComponentContent('footer', { ...content, navItems: newItems });
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newItems = [...content.navItems, { id: `footer-nav-${Date.now()}`, label: '', href: '' }];
              updateComponentContent('footer', { ...content, navItems: newItems });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Navigation Item
          </Button>
        </div>
      </div>
    </div>
  );

  const renderTestimonialsEditor = (content: TestimonialsContent) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="testimonials-title">Title</Label>
        <Input
          id="testimonials-title"
          value={content.title}
          onChange={(e) => updateComponentContent('testimonials', { ...content, title: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="testimonials-subtitle">Subtitle</Label>
        <Input
          id="testimonials-subtitle"
          value={content.subtitle}
          onChange={(e) => updateComponentContent('testimonials', { ...content, subtitle: e.target.value })}
        />
      </div>

      <div>
        <Label>Testimonials</Label>
        <div className="space-y-2">
          {(content.testimonials || []).map((testimonial, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={testimonial.name}
                      onChange={(e) => {
                        const newTestimonials = [...(content.testimonials || [])];
                        newTestimonials[index] = { ...testimonial, name: e.target.value };
                        updateComponentContent('testimonials', { ...content, testimonials: newTestimonials });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={testimonial.company}
                      onChange={(e) => {
                        const newTestimonials = [...(content.testimonials || [])];
                        newTestimonials[index] = { ...testimonial, company: e.target.value };
                        updateComponentContent('testimonials', { ...content, testimonials: newTestimonials });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label>Quote</Label>
                  <Textarea
                    value={testimonial.quote}
                    onChange={(e) => {
                      const newTestimonials = [...(content.testimonials || [])];
                      newTestimonials[index] = { ...testimonial, quote: e.target.value };
                      updateComponentContent('testimonials', { ...content, testimonials: newTestimonials });
                    }}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Image URL (optional)</Label>
                  <Input
                    value={testimonial.imageUrl || ''}
                    onChange={(e) => {
                      const newTestimonials = [...(content.testimonials || [])];
                      newTestimonials[index] = { ...testimonial, imageUrl: e.target.value || undefined };
                      updateComponentContent('testimonials', { ...content, testimonials: newTestimonials });
                    }}
                    placeholder="https://example.com/person.jpg"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newTestimonials = (content.testimonials || []).filter((_, i) => i !== index);
                    updateComponentContent('testimonials', { ...content, testimonials: newTestimonials });
                  }}
                >
                  Remove Testimonial
                </Button>
              </div>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const newTestimonials = [...content.testimonials, { 
                id: `testimonial-${Date.now()}`, 
                name: '', 
                company: '', 
                quote: '' 
              }];
              updateComponentContent('testimonials', { ...content, testimonials: newTestimonials });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Testimonial
          </Button>
        </div>
      </div>
    </div>
  );

  const renderComponentEditor = (componentType: ComponentType) => {
    const component = config.components[componentType];
    
    switch (componentType) {
      case 'hero':
        return renderHeroEditor(component.content as HeroContent);
      case 'audience':
        return renderAudienceEditor(component.content as AudienceContent);
      case 'navbar':
        return renderNavbarEditor(component.content as NavbarContent);
      case 'inventory':
        return renderInventoryEditor(component.content as InventoryContent);
      case 'campaign':
        return renderCampaignEditor(component.content as CampaignContent);
      case 'contactfaq':
        return renderContactFaqEditor(component.content as ContactFaqContent);
      case 'aboutus':
        return renderAboutUsEditor(component.content as AboutUsContent);
      case 'footer':
        return renderFooterEditor(component.content as FooterContent);
      case 'testimonials':
        return renderTestimonialsEditor(component.content as TestimonialsContent);
      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Editor for {componentType} component coming soon...
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Storefront Editor</h3>
          <p className="text-sm text-muted-foreground">
            Configure and customize your storefront components
          </p>
        </div>
        <Button onClick={() => onSave(config)} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Component List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Components</CardTitle>
              <AddComponentDropdown onAddComponent={addComponent} existingComponents={Object.keys(config.components) as ComponentType[]} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {componentsList.map(({ type, enabled, order }) => {
                const Icon = getComponentIcon(type);
                return (
                  <div
                    key={type}
                    className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      activeComponent === type 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div 
                      className="flex items-center gap-2 flex-1"
                      onClick={() => setActiveComponent(type)}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm capitalize">{type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {enabled ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground mr-2">{order}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeComponent(type);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {componentsList.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No components added yet</p>
                  <p className="text-xs">Click the + button to add components</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Component Editor */}
        <Card className="lg:col-span-3">
          {componentsList.length > 0 && activeComponent && config.components[activeComponent] ? (
            <>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {React.createElement(getComponentIcon(activeComponent), { className: "w-5 h-5" })}
                <CardTitle className="capitalize">{activeComponent} Component</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${activeComponent}-enabled`} className="text-sm">
                    Enabled
                  </Label>
                  <Switch
                    id={`${activeComponent}-enabled`}
                    checked={config.components[activeComponent].enabled}
                    onCheckedChange={() => toggleComponent(activeComponent)}
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveComponent(activeComponent, 'up')}
                    disabled={config.components[activeComponent].order === 1}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveComponent(activeComponent, 'down')}
                    disabled={config.components[activeComponent].order === Object.keys(config.components).length}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to remove the ${activeComponent} component? This action cannot be undone.`)) {
                        removeComponent(activeComponent);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {config.components[activeComponent].enabled ? (
              renderComponentEditor(activeComponent)
            ) : (
              <div className="text-center py-8">
                <EyeOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  This component is disabled. Enable it to edit its content.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => toggleComponent(activeComponent)}
                >
                  Enable Component
                </Button>
              </div>
            )}
          </CardContent>
            </>
          ) : (
            <CardContent>
              <div className="text-center py-16">
                <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Components Added</h3>
                <p className="text-muted-foreground mb-6">
                  Start building your storefront by adding components. Each component represents a section of your storefront page.
                </p>
                <AddComponentDropdown 
                  onAddComponent={addComponent} 
                  existingComponents={Object.keys(config.components) as ComponentType[]} 
                />
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};
