import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Plus,
  X,
  Send,
  Trash2,
  MessageSquare,
  Bot,
  User,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  Code
} from 'lucide-react';
import {
  getStorefrontChatConfig,
  saveStorefrontChatConfig,
  testStorefrontChat,
  ChatMessage
} from '@/api/storefrontChatConfig';
import { StorefrontChatConfig } from '@/integrations/mongodb/schemas';
import { ChatWidget } from '@/types/storefront';

interface StorefrontChatConfigEditorProps {
  publicationId: string;
  domain?: string; // Optional domain for passing to Lambda as clientId
  publicationName?: string;
  chatWidget?: ChatWidget;
  onChatWidgetChange?: (chatWidget: ChatWidget) => void;
}

const defaultChatWidget: ChatWidget = {
  enabled: false,
  apiEndpoint: '',
  buttonPosition: 'bottom-right',
  defaultOpen: false,
  title: 'Campaign Assistant',
  subtitle: '',
  initialMessage: ''
};

export const StorefrontChatConfigEditor: React.FC<StorefrontChatConfigEditorProps> = ({
  publicationId,
  domain,
  publicationName,
  chatWidget = defaultChatWidget,
  onChatWidgetChange
}) => {
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Config state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewConfig, setIsNewConfig] = useState(false); // Track if this is a new config
  
  // Form state
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [contextFormat, setContextFormat] = useState<'json' | 'markdown'>('markdown');
  const [contextContent, setContextContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [prependInstructions, setPrependInstructions] = useState('');
  const [appendInstructions, setAppendInstructions] = useState('');
  const [contextError, setContextError] = useState<string | null>(null);
  
  // Local chat widget state (saved with the rest of the config)
  const [localChatWidget, setLocalChatWidget] = useState<ChatWidget>(chatWidget);
  
  // Sync local widget state when prop changes (e.g., on initial load)
  useEffect(() => {
    setLocalChatWidget(chatWidget);
  }, [chatWidget]);
  
  // Helper to update widget and mark as changed
  const updateChatWidget = (updates: Partial<ChatWidget>) => {
    setLocalChatWidget(prev => ({ ...prev, ...updates }));
    markChanged();
  };

  // Simple markdown formatter
  const renderMarkdown = (text: string): string => {
    if (!text) return '';
    
    return text
      // Convert literal \n to actual newlines first
      .replace(/\\n/g, '\n')
      // Escape HTML (but not after we process markdown)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Lists (- item)
      .replace(/^- (.+)$/gm, '<div class="ml-4">• $1</div>')
      // Convert newlines to line breaks
      .replace(/\n/g, '<br/>');
  };

  // Test chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');

  // Parse component tags from message content
  interface ParsedComponent {
    type: string;
    data: any;
  }

  interface ParsedContent {
    textBefore: string;
    component: ParsedComponent | null;
    textAfter: string;
  }

  const parseMessageContent = (content: string): ParsedContent => {
    const componentRegex = /<component\s+type="([^"]+)">\s*([\s\S]*?)\s*<\/component>/;
    const match = content.match(componentRegex);
    
    if (!match) {
      return { textBefore: content, component: null, textAfter: '' };
    }

    const [fullMatch, type, jsonStr] = match;
    const matchIndex = content.indexOf(fullMatch);
    const textBefore = content.slice(0, matchIndex).trim();
    const textAfter = content.slice(matchIndex + fullMatch.length).trim();

    try {
      const data = JSON.parse(jsonStr);
      return { textBefore, component: { type, data }, textAfter };
    } catch {
      // If JSON parsing fails, return content as-is
      return { textBefore: content, component: null, textAfter: '' };
    }
  };

  // Handle choice selection
  const handleChoiceSelect = (label: string) => {
    if (isSending) return;
    setInputMessage(label);
    // Auto-send the selection
    setTimeout(() => {
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
      // Directly add message and send
      const userMessage: ChatMessage = { role: 'user', content: label };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      sendMessageWithContent(label);
    }, 100);
  };

  // Send message with specific content (for choice selections)
  const sendMessageWithContent = async (content: string) => {
    if (!content.trim() || isSending) return;
    
    setIsSending(true);
    setStreamingResponse('');

    try {
      const updatedMessages = [...messages, { role: 'user' as const, content }];
      
      const response = await testStorefrontChat(
        domain,
        updatedMessages,
        undefined,
        (chunk) => {
          setStreamingResponse(prev => prev + chunk);
        }
      );

      // Add complete response as assistant message
      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
      setStreamingResponse('');
    } catch (err: any) {
      toast({
        title: 'Chat Error',
        description: err.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Render choices component
  const renderChoicesComponent = (data: any) => {
    const { options, allowMultiple } = data;
    if (!options || !Array.isArray(options)) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {options.map((option: { value: string; label: string }, idx: number) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => handleChoiceSelect(option.label)}
            disabled={isSending}
          >
            {option.label}
          </Button>
        ))}
      </div>
    );
  };

  // Render lead submit component
  const renderLeadComponent = (data: any) => {
    const { buttonText, message } = data;

    const handleLeadSubmit = () => {
      // Send "Submit" or the button text as the user's response
      handleChoiceSelect(buttonText || 'Submit Inquiry');
    };

    return (
      <div className="mt-3">
        <Button
          onClick={handleLeadSubmit}
          disabled={isSending}
          className="w-full"
          size="sm"
        >
          {buttonText || 'Submit Inquiry'}
        </Button>
      </div>
    );
  };

  // Render message content with components
  const renderMessageContent = (content: string, isLastMessage: boolean) => {
    const parsed = parseMessageContent(content);
    
    return (
      <>
        {parsed.textBefore && (
          <p className="whitespace-pre-wrap">{parsed.textBefore}</p>
        )}
        {parsed.component && isLastMessage && (
          <>
            {parsed.component.type === 'choices' && renderChoicesComponent(parsed.component.data)}
            {parsed.component.type === 'lead' && renderLeadComponent(parsed.component.data)}
          </>
        )}
        {parsed.textAfter && (
          <p className="whitespace-pre-wrap mt-2">{parsed.textAfter}</p>
        )}
      </>
    );
  };

  // Load existing config
  useEffect(() => {
    loadConfig();
  }, [publicationId]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  const loadConfig = async () => {
    // If no publicationId, just set defaults and allow form to render
    if (!publicationId) {
      setIsNewConfig(true);
      setPlaceholders({
        'publication name': publicationName || '',
        'publication city': ''
      });
      setContextFormat('markdown');
      setContextContent('');
      setPrependInstructions('');
      setAppendInstructions('');
      setHasChanges(false);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const config = await getStorefrontChatConfig(publicationId);
      
      if (config) {
        setIsNewConfig(false);
        setPlaceholders(config.placeholders || {});
        const { format, content } = loadContextFromRecord(config.publicationContext || {});
        setContextFormat(format);
        setContextContent(content);
        setPrependInstructions(config.prependInstructions || '');
        setAppendInstructions(config.appendInstructions || '');
      } else {
        // Set defaults for new config - this is normal, not an error
        setIsNewConfig(true);
        setPlaceholders({
          'publication name': publicationName || '',
          'publication city': ''
        });
        setContextFormat('markdown');
        setContextContent('');
        setPrependInstructions('');
        setAppendInstructions('');
      }
      
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error loading chat config:', err);
      // Only show error if it's not a 404 (which just means no config exists yet)
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to load chat configuration');
      } else {
        setIsNewConfig(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate context content
    if (!validateContextContent(contextContent, contextFormat)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Save chat config (placeholders, instructions, context)
      await saveStorefrontChatConfig(publicationId, {
        publicationId,
        placeholders,
        publicationContext: getContextAsRecord(),
        prependInstructions,
        appendInstructions
      });
      
      // Save widget settings to storefront config
      if (onChatWidgetChange) {
        await onChatWidgetChange(localChatWidget);
      }

      setHasChanges(false);
      setIsNewConfig(false); // Config is now saved, enable test chat
      toast({
        title: 'Configuration Saved',
        description: 'Chat assistant configuration has been updated. You can now test the chat.',
      });
    } catch (err: any) {
      console.error('Error saving chat config:', err);
      setError(err.message || 'Failed to save configuration');
      toast({
        title: 'Save Failed',
        description: err.message || 'Failed to save chat configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const markChanged = () => {
    setHasChanges(true);
  };

  // Placeholder management
  const addPlaceholder = () => {
    setPlaceholders({ ...placeholders, '': '' });
    markChanged();
  };

  const updatePlaceholderKey = (oldKey: string, newKey: string) => {
    const newPlaceholders = { ...placeholders };
    const value = newPlaceholders[oldKey];
    delete newPlaceholders[oldKey];
    newPlaceholders[newKey] = value;
    setPlaceholders(newPlaceholders);
    markChanged();
  };

  const updatePlaceholderValue = (key: string, value: string) => {
    setPlaceholders({ ...placeholders, [key]: value });
    markChanged();
  };

  const removePlaceholder = (key: string) => {
    const newPlaceholders = { ...placeholders };
    delete newPlaceholders[key];
    setPlaceholders(newPlaceholders);
    markChanged();
  };

  // Validate context content based on format
  const validateContextContent = (content: string, format: 'json' | 'markdown'): boolean => {
    if (format === 'json' && content.trim()) {
      try {
        JSON.parse(content);
        setContextError(null);
        return true;
      } catch {
        setContextError('Invalid JSON format');
        return false;
      }
    }
    setContextError(null);
    return true;
  };

  // Convert context content to Record for saving
  const getContextAsRecord = (): Record<string, unknown> => {
    if (contextFormat === 'json' && contextContent.trim()) {
      try {
        return JSON.parse(contextContent);
      } catch {
        return {};
      }
    }
    // For markdown, wrap the content in an object
    return contextContent.trim() ? { _markdown: contextContent, _format: 'markdown' } : {};
  };

  // Load context from Record (detect format)
  const loadContextFromRecord = (record: Record<string, unknown>): { format: 'json' | 'markdown'; content: string } => {
    if (record._format === 'markdown' && typeof record._markdown === 'string') {
      return { format: 'markdown', content: record._markdown };
    }
    // Default to JSON format
    const hasContent = Object.keys(record).length > 0;
    return { 
      format: 'json', 
      content: hasContent ? JSON.stringify(record, null, 2) : '' 
    };
  };

  // Get current config for testing (includes unsaved changes)
  const getCurrentConfig = () => {
    return {
      publicationId,
      placeholders,
      publicationContext: getContextAsRecord(),
      prependInstructions,
      appendInstructions
    };
  };

  // Test chat functions
  const sendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: inputMessage.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsSending(true);
    setStreamingResponse('');

    try {
      const response = await testStorefrontChat(
        publicationId,
        newMessages,
        getCurrentConfig(),
        (chunk) => {
          setStreamingResponse(prev => prev + chunk);
        }
      );

      // Add assistant response
      const assistantMessage: ChatMessage = { role: 'assistant', content: response };
      setMessages([...newMessages, assistantMessage]);
      setStreamingResponse('');
    } catch (err: any) {
      console.error('Error in test chat:', err);
      toast({
        title: 'Chat Error',
        description: err.message || 'Failed to get response from chat service',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingResponse('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading chat configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chat Assistant Configuration</h3>
          <p className="text-sm text-muted-foreground">
            {domain ? (
              <>Configure the AI chat widget behavior for <code className="bg-muted px-1 py-0.5 rounded">{domain}</code></>
            ) : (
              <>Configure the AI chat widget behavior for your storefront</>
            )}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges || !publicationId}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {!publicationId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Publication ID is required to save the chat assistant configuration.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content - Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Configuration Panel (Left - 3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Chat Widget Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Widget Settings</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure the appearance and behavior of your chat widget
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable Chat Widget</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the chat widget will appear on your storefront
                  </p>
                </div>
                <Switch
                  checked={localChatWidget.enabled}
                  onCheckedChange={(checked) => updateChatWidget({ enabled: checked })}
                />
              </div>

              <Separator />

              {/* Title and Subtitle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="widget-title">Widget Title</Label>
                  <Input
                    id="widget-title"
                    value={localChatWidget.title ?? ''}
                    onChange={(e) => updateChatWidget({ title: e.target.value })}
                    placeholder="Campaign Assistant"
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed in the chat widget header
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="widget-subtitle">Widget Subtitle</Label>
                  <Input
                    id="widget-subtitle"
                    value={localChatWidget.subtitle ?? ''}
                    onChange={(e) => updateChatWidget({ subtitle: e.target.value })}
                    placeholder="Your Publication Advertising"
                  />
                  <p className="text-xs text-muted-foreground">
                    Secondary text shown below the title
                  </p>
                </div>
              </div>

              {/* Position and Default Open */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="button-position">Button Position</Label>
                  <Select
                    value={localChatWidget.buttonPosition ?? 'bottom-right'}
                    onValueChange={(value: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left') => 
                      updateChatWidget({ buttonPosition: value })
                    }
                  >
                    <SelectTrigger id="button-position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Where the chat button appears on the page
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Open by Default</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="default-open"
                      checked={localChatWidget.defaultOpen ?? false}
                      onCheckedChange={(checked) => updateChatWidget({ defaultOpen: checked })}
                    />
                    <Label htmlFor="default-open" className="text-sm font-normal">
                      Auto-open widget on page load
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Widget will be expanded when visitors arrive
                  </p>
                </div>
              </div>

              {/* API Endpoint */}
              <div className="space-y-2">
                <Label htmlFor="api-endpoint">API Endpoint</Label>
                <Input
                  id="api-endpoint"
                  value={localChatWidget.apiEndpoint ?? ''}
                  onChange={(e) => updateChatWidget({ apiEndpoint: e.target.value })}
                  placeholder="https://your-lambda-url.on.aws/chat"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  The chat service endpoint URL (Lambda function URL)
                </p>
              </div>

              {/* Initial Message */}
              <div className="space-y-2">
                <Label htmlFor="initial-message">Initial Message</Label>
                <Textarea
                  id="initial-message"
                  value={localChatWidget.initialMessage ?? ''}
                  onChange={(e) => updateChatWidget({ initialMessage: e.target.value })}
                  placeholder="Hi! I'm your campaign assistant. How can I help you today?"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  The first message displayed when the chat opens. Supports component tags like{' '}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{'<component type="choices">...</component>'}</code>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Placeholders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Template Placeholders</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Variables that replace <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{{key}}"}</code> patterns in the chat instructions
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={addPlaceholder}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(placeholders).map(([key, value], index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={key}
                    onChange={(e) => updatePlaceholderKey(key, e.target.value)}
                    placeholder="Key (e.g., publication name)"
                    className="flex-1"
                  />
                  <Input
                    value={value}
                    onChange={(e) => updatePlaceholderValue(key, e.target.value)}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlaceholder(key)}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {Object.keys(placeholders).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No placeholders configured. Click "Add" to create one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Dynamic Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dynamic Instructions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Additional instructions to modify the base chat behavior
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prepend">Prepend Instructions</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Text added BEFORE the base agent instructions
                </p>
                <Textarea
                  id="prepend"
                  value={prependInstructions}
                  onChange={(e) => {
                    setPrependInstructions(e.target.value);
                    markChanged();
                  }}
                  placeholder="e.g., Always greet users by mentioning the publication name..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="append">Append Instructions</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Text added AFTER the base agent instructions
                </p>
                <Textarea
                  id="append"
                  value={appendInstructions}
                  onChange={(e) => {
                    setAppendInstructions(e.target.value);
                    markChanged();
                  }}
                  placeholder="e.g., Always end conversations by asking if they'd like to subscribe..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Publication Context */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Publication Context</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Additional information about your publication for the chat assistant
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {contextFormat === 'markdown' && (
                    <Button
                      variant={showPreview ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? (
                        <>
                          <Code className="w-4 h-4 mr-1" />
                          Edit
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </>
                      )}
                    </Button>
                  )}
                  <Select
                    value={contextFormat}
                    onValueChange={(value: 'json' | 'markdown') => {
                      setContextFormat(value);
                      setShowPreview(false);
                      markChanged();
                      validateContextContent(contextContent, value);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {contextFormat === 'markdown' && showPreview ? (
                <div 
                  className="border rounded-md p-4 min-h-[260px] bg-muted/30 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(contextContent) || '<p class="text-muted-foreground italic">No content to preview</p>' }}
                />
              ) : (
                <Textarea
                  value={contextContent}
                  onChange={(e) => {
                    setContextContent(e.target.value);
                    markChanged();
                    validateContextContent(e.target.value, contextFormat);
                  }}
                  placeholder={contextFormat === 'markdown' 
                    ? "Enter context about your publication...\n\n## Coverage Area\nWe cover the greater Portland metro area.\n\n## Ad Rates\n- Display: $500/month\n- Newsletter: $250/month"
                    : '{\n  "coverageArea": "Portland metro",\n  "adRates": { "display": 500, "newsletter": 250 }\n}'
                  }
                  rows={10}
                  className={`${contextFormat === 'json' ? 'font-mono text-sm' : ''} ${contextError ? 'border-red-500' : ''}`}
                />
              )}
              {contextError && (
                <p className="text-xs text-red-500 mt-2">{contextError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {contextFormat === 'markdown' 
                  ? "Use Markdown formatting to describe your publication's details, rates, coverage area, etc."
                  : "Enter valid JSON object with your publication data."
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Test Chat Panel (Right - 2 cols) */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col max-h-[700px]">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <CardTitle className="text-base">Test Chat</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {!isNewConfig && (
                    <Button variant="ghost" size="sm" onClick={clearChat}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {isNewConfig 
                  ? 'Save your configuration first to enable testing'
                  : 'Test your configuration with the actual AI service'
                }
              </p>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col min-h-[400px] overflow-hidden">
              {/* Prompt to save first if new config */}
              {isNewConfig ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Bot className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-base font-medium mb-2">Configuration Required</p>
                  <p className="text-sm mb-4 max-w-[250px]">
                    Save your chat assistant configuration first to enable testing.
                  </p>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              ) : (
              <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 min-h-0">
                {messages.length === 0 && !streamingResponse && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Bot className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Send a message to test the chat assistant</p>
                  </div>
                )}
                
                {messages.map((msg, index) => {
                  const isLastAssistantMessage = msg.role === 'assistant' && 
                    index === messages.length - 1 || 
                    (index === messages.length - 2 && messages[messages.length - 1]?.role === 'user');
                  
                  return (
                    <div
                      key={index}
                      className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {msg.role === 'assistant' 
                          ? renderMessageContent(msg.content, isLastAssistantMessage && !isSending)
                          : <p className="whitespace-pre-wrap">{msg.content}</p>
                        }
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Streaming response */}
                {streamingResponse && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted">
                      {/* Show text content while streaming, hide component tags */}
                      <p className="whitespace-pre-wrap">
                        {streamingResponse.replace(/<component[\s\S]*?<\/component>/g, '').trim() || streamingResponse}
                      </p>
                      <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1" />
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {isSending && !streamingResponse && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-muted">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isSending || !inputMessage.trim()}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

