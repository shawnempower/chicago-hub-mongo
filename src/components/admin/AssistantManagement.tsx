import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, RotateCcw, ChevronDown, ChevronRight, Eye, History, Loader2, Database, Bot, Search, Wrench, Settings2, FileText, Network } from 'lucide-react';
import { adminApi, type AssistantPrompt, type AssistantPromptsResponse } from '@/api/admin';

// ============================================
// Types
// ============================================

interface EditState {
  content: string;
  versionName: string;
  isDirty: boolean;
}

interface HistoryState {
  versions: AssistantPrompt[];
  isOpen: boolean;
  loading: boolean;
}

// ============================================
// Prompt Editor Card
// ============================================

function PromptEditorCard({
  prompt,
  editState,
  onContentChange,
  onVersionNameChange,
  onSave,
  onResetToDefault,
  saving,
  history,
  onToggleHistory,
  onActivateVersion,
  onPreviewVersion,
  large = false,
}: {
  prompt: AssistantPrompt;
  editState: EditState;
  onContentChange: (content: string) => void;
  onVersionNameChange: (name: string) => void;
  onSave: () => void;
  onResetToDefault: () => void;
  saving: boolean;
  history: HistoryState;
  onToggleHistory: () => void;
  onActivateVersion: (id: string) => void;
  onPreviewVersion: (content: string) => void;
  large?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{prompt.label}</CardTitle>
            <CardDescription className="text-xs mt-1">{prompt.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {prompt.version !== 'default' && (
              <Badge variant="outline" className="text-xs">
                {prompt.version}
              </Badge>
            )}
            {editState.isDirty && (
              <Badge variant="secondary" className="text-xs">
                Unsaved
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={editState.content}
          onChange={(e) => onContentChange(e.target.value)}
          className={`font-mono text-sm ${large ? 'min-h-[400px]' : 'min-h-[150px]'}`}
          placeholder="Enter prompt content..."
        />

        <div className="flex gap-2 items-center">
          <Input
            value={editState.versionName}
            onChange={(e) => onVersionNameChange(e.target.value)}
            placeholder="Version name (e.g., v1.2, Tone update)"
            className="flex-1 text-sm"
          />
          <Button size="sm" onClick={onSave} disabled={saving || !editState.versionName.trim()}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onResetToDefault} title="Reset to default">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Version History */}
        <Collapsible open={history.isOpen} onOpenChange={onToggleHistory}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground">
              {history.isOpen ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
              <History className="w-3 h-3 mr-1" />
              Version History
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {history.loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading history...</span>
              </div>
            ) : history.versions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 pl-2">No saved versions yet.</p>
            ) : (
              <div className="space-y-1 mt-1 max-h-[200px] overflow-y-auto">
                {history.versions.map((v) => (
                  <div
                    key={v._id}
                    className="flex items-center justify-between p-2 rounded-md border text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{v.version}</span>
                        {v.isActive && <Badge variant="default" className="text-[10px] px-1 py-0">Active</Badge>}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onPreviewVersion(v.content)}
                        title="Preview"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      {!v.isActive && v._id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => onActivateVersion(v._id!)}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ============================================
// Model Config Editor
// ============================================

interface ModelConfigValues {
  anthropicModel: string;
  maxTokens: number;
  maxToolIterations: number;
  searchModelDefault: string;
  searchModelPro: string;
}

function ModelConfigEditor({
  prompt,
  editState,
  onContentChange,
  onVersionNameChange,
  onSave,
  onResetToDefault,
  saving,
  history,
  onToggleHistory,
  onActivateVersion,
  onPreviewVersion,
}: {
  prompt: AssistantPrompt;
  editState: EditState;
  onContentChange: (content: string) => void;
  onVersionNameChange: (name: string) => void;
  onSave: () => void;
  onResetToDefault: () => void;
  saving: boolean;
  history: HistoryState;
  onToggleHistory: () => void;
  onActivateVersion: (id: string) => void;
  onPreviewVersion: (content: string) => void;
}) {
  let config: ModelConfigValues;
  try {
    config = JSON.parse(editState.content);
  } catch {
    config = {
      anthropicModel: 'claude-opus-4-5-20251101',
      maxTokens: 8192,
      maxToolIterations: 10,
      searchModelDefault: 'sonar',
      searchModelPro: 'sonar-pro',
    };
  }

  const updateField = (field: keyof ModelConfigValues, value: string | number) => {
    const updated = { ...config, [field]: value };
    onContentChange(JSON.stringify(updated, null, 2));
  };

  const anthropicModels = [
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250514',
    'claude-sonnet-4-20250514',
    'claude-haiku-4-20250414',
  ];

  const perplexityModels = ['sonar', 'sonar-pro'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Model Configuration
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              AI model selection and parameters for the Hub Sales Assistant and web search
            </CardDescription>
          </div>
          {editState.isDirty && (
            <Badge variant="secondary" className="text-xs">Unsaved</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Anthropic Model */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Anthropic Model (Main Assistant)</label>
          <Select value={config.anthropicModel} onValueChange={(v) => updateField('anthropicModel', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anthropicModels.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">The Claude model used for the main sales assistant conversations.</p>
        </div>

        {/* Max Tokens */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Tokens</label>
            <Input
              type="number"
              value={config.maxTokens}
              onChange={(e) => updateField('maxTokens', parseInt(e.target.value) || 8192)}
              min={1024}
              max={32768}
            />
            <p className="text-xs text-muted-foreground">Maximum response length (tokens).</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max Tool Iterations</label>
            <Input
              type="number"
              value={config.maxToolIterations}
              onChange={(e) => updateField('maxToolIterations', parseInt(e.target.value) || 10)}
              min={1}
              max={25}
            />
            <p className="text-xs text-muted-foreground">Max tool calls per message.</p>
          </div>
        </div>

        {/* Perplexity Models */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Model (Default)</label>
            <Select value={config.searchModelDefault} onValueChange={(v) => updateField('searchModelDefault', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perplexityModels.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Perplexity model for general, news, and competitor searches.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Search Model (Pro/Deep)</label>
            <Select value={config.searchModelPro} onValueChange={(v) => updateField('searchModelPro', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perplexityModels.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Perplexity model for deep brand research.</p>
          </div>
        </div>

        {/* Save controls */}
        <div className="flex gap-2 items-center pt-2 border-t">
          <Input
            value={editState.versionName}
            onChange={(e) => onVersionNameChange(e.target.value)}
            placeholder="Version name (e.g., Switch to Sonnet)"
            className="flex-1 text-sm"
          />
          <Button size="sm" onClick={onSave} disabled={saving || !editState.versionName.trim()}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onResetToDefault} title="Reset to default">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Version History */}
        <Collapsible open={history.isOpen} onOpenChange={onToggleHistory}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground">
              {history.isOpen ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
              <History className="w-3 h-3 mr-1" />
              Version History
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {history.loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : history.versions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 pl-2">No saved versions yet.</p>
            ) : (
              <div className="space-y-1 mt-1 max-h-[200px] overflow-y-auto">
                {history.versions.map((v) => (
                  <div key={v._id} className="flex items-center justify-between p-2 rounded-md border text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{v.version}</span>
                        {v.isActive && <Badge variant="default" className="text-[10px] px-1 py-0">Active</Badge>}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onPreviewVersion(v.content)} title="Preview">
                        <Eye className="w-3 h-3" />
                      </Button>
                      {!v.isActive && v._id && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => onActivateVersion(v._id!)}>
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export const AssistantManagement = () => {
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<Record<string, AssistantPrompt[]>>({});
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [histories, setHistories] = useState<Record<string, HistoryState>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'sales-assistant' | 'publication' | 'hub-description'>('sales-assistant');
  const { toast } = useToast();

  // Load all active prompts
  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      const data: AssistantPromptsResponse = await adminApi.getAssistantPrompts();
      setPrompts(data.prompts);

      // Initialize edit states
      const newEdits: Record<string, EditState> = {};
      for (const category of Object.values(data.prompts)) {
        for (const p of category) {
          newEdits[p.promptKey] = {
            content: p.content,
            versionName: '',
            isDirty: false,
          };
        }
      }
      setEditStates(newEdits);
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast({ title: 'Error', description: 'Failed to load assistant prompts. Try seeding defaults.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // Seed defaults
  const handleSeedDefaults = async () => {
    try {
      const result = await adminApi.seedPromptDefaults();
      toast({
        title: 'Defaults Seeded',
        description: `Seeded ${result.seeded.length} prompts, ${result.skipped.length} already existed.`,
      });
      await loadPrompts();
    } catch (error) {
      console.error('Error seeding defaults:', error);
      toast({ title: 'Error', description: 'Failed to seed defaults', variant: 'destructive' });
    }
  };

  // Update edit content
  const updateContent = (promptKey: string, content: string) => {
    setEditStates((prev) => ({
      ...prev,
      [promptKey]: { ...prev[promptKey], content, isDirty: true },
    }));
  };

  const updateVersionName = (promptKey: string, versionName: string) => {
    setEditStates((prev) => ({
      ...prev,
      [promptKey]: { ...prev[promptKey], versionName },
    }));
  };

  // Save a new version
  const handleSave = async (promptKey: string) => {
    const edit = editStates[promptKey];
    if (!edit || !edit.versionName.trim()) return;

    try {
      setSavingKey(promptKey);
      await adminApi.savePromptVersion(promptKey, edit.content, edit.versionName);
      toast({ title: 'Saved', description: `New version "${edit.versionName}" saved and activated.` });
      setEditStates((prev) => ({
        ...prev,
        [promptKey]: { ...prev[promptKey], versionName: '', isDirty: false },
      }));
      // Refresh history if open
      if (histories[promptKey]?.isOpen) {
        await loadHistory(promptKey);
      }
      // Refresh prompts to get updated version badge
      await loadPrompts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSavingKey(null);
    }
  };

  // Reset to default
  const handleResetToDefault = async (promptKey: string) => {
    try {
      const result = await adminApi.getPromptDefault(promptKey);
      updateContent(promptKey, result.content);
      toast({ title: 'Reset', description: 'Content reset to default. Save a new version to apply.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load default', variant: 'destructive' });
    }
  };

  // Load version history
  const loadHistory = async (promptKey: string) => {
    setHistories((prev) => ({
      ...prev,
      [promptKey]: { ...prev[promptKey], loading: true, isOpen: true },
    }));
    try {
      const result = await adminApi.getPromptHistory(promptKey);
      setHistories((prev) => ({
        ...prev,
        [promptKey]: { versions: result.versions, isOpen: true, loading: false },
      }));
    } catch (error) {
      setHistories((prev) => ({
        ...prev,
        [promptKey]: { versions: [], isOpen: true, loading: false },
      }));
    }
  };

  const toggleHistory = (promptKey: string) => {
    const current = histories[promptKey];
    if (!current?.isOpen) {
      loadHistory(promptKey);
    } else {
      setHistories((prev) => ({
        ...prev,
        [promptKey]: { ...prev[promptKey], isOpen: false },
      }));
    }
  };

  // Activate a version
  const handleActivateVersion = async (promptKey: string, id: string) => {
    try {
      await adminApi.activatePromptVersion(id);
      toast({ title: 'Activated', description: 'Version activated successfully.' });
      await loadHistory(promptKey);
      await loadPrompts();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to activate version', variant: 'destructive' });
    }
  };

  // Preview a version (load content into editor)
  const handlePreviewVersion = (promptKey: string, content: string) => {
    updateContent(promptKey, content);
  };

  // Helper to get a prompt by key from grouped data
  const getPrompt = (promptKey: string): AssistantPrompt | null => {
    for (const category of Object.values(prompts)) {
      const found = category.find((p) => p.promptKey === promptKey);
      if (found) return found;
    }
    return null;
  };

  // Render a prompt editor by key
  const renderEditor = (promptKey: string, large = false) => {
    const prompt = getPrompt(promptKey);
    const edit = editStates[promptKey];
    if (!prompt || !edit) return null;

    if (promptKey === 'model_config') {
      return (
        <ModelConfigEditor
          prompt={prompt}
          editState={edit}
          onContentChange={(c) => updateContent(promptKey, c)}
          onVersionNameChange={(v) => updateVersionName(promptKey, v)}
          onSave={() => handleSave(promptKey)}
          onResetToDefault={() => handleResetToDefault(promptKey)}
          saving={savingKey === promptKey}
          history={histories[promptKey] || { versions: [], isOpen: false, loading: false }}
          onToggleHistory={() => toggleHistory(promptKey)}
          onActivateVersion={(id) => handleActivateVersion(promptKey, id)}
          onPreviewVersion={(c) => handlePreviewVersion(promptKey, c)}
        />
      );
    }

    return (
      <PromptEditorCard
        prompt={prompt}
        editState={edit}
        onContentChange={(c) => updateContent(promptKey, c)}
        onVersionNameChange={(v) => updateVersionName(promptKey, v)}
        onSave={() => handleSave(promptKey)}
        onResetToDefault={() => handleResetToDefault(promptKey)}
        saving={savingKey === promptKey}
        history={histories[promptKey] || { versions: [], isOpen: false, loading: false }}
        onToggleHistory={() => toggleHistory(promptKey)}
        onActivateVersion={(id) => handleActivateVersion(promptKey, id)}
        onPreviewVersion={(c) => handlePreviewVersion(promptKey, c)}
        large={large}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="text-muted-foreground">Loading assistant configuration...</span>
      </div>
    );
  }

  const hasPrompts = Object.values(prompts).some((cat) => cat.length > 0);

  return (
    <div className="space-y-6">
      {/* Seed Defaults (shown only when nothing is configured yet) */}
      {!hasPrompts && (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Prompt Configurations Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Seed Defaults" to initialize all AI prompt configurations with the current default values.
              This is a one-time setup.
            </p>
            <Button onClick={handleSeedDefaults}>
              <Database className="w-4 h-4 mr-2" />
              Seed Default Prompts
            </Button>
          </CardContent>
        </Card>
      )}

      {hasPrompts && (
        <>
          {/* Top-level section selector */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={activeSection === 'sales-assistant' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('sales-assistant')}
                className="flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Hub Sales Assistant
              </Button>
              <Button
                variant={activeSection === 'hub-description' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('hub-description')}
                className="flex items-center gap-2"
              >
                <Network className="w-4 h-4" />
                Hub AI Description
              </Button>
              <Button
                variant={activeSection === 'publication' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection('publication')}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Publication AI Profile
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleSeedDefaults}>
              <Database className="w-4 h-4 mr-2" />
              Seed Defaults
            </Button>
          </div>

          {/* ========== Hub AI Description ========== */}
          {activeSection === 'hub-description' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Hub AI Description</h2>
                <p className="text-muted-foreground text-sm">
                  Controls how AI generates the network summary and value proposition for the hub
                </p>
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                This prompt is sent to Perplexity when generating a hub's network summary.
                It uses data from all publications in the hub to produce sections: Value Proposition,
                Audience Highlights, Market Coverage, and Channel Strengths.
              </div>
              {renderEditor('hub_network_summary', true)}
            </div>
          )}

          {/* ========== Publication AI Profile ========== */}
          {activeSection === 'publication' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Publication AI Profile</h2>
                <p className="text-muted-foreground text-sm">
                  Controls how AI researches and describes publications to prospective advertisers
                </p>
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                This prompt is sent to Perplexity when generating AI profiles for publications.
                The output is structured into sections: Summary, Full Profile, Audience Insight, and Community Role.
              </div>
              {renderEditor('publication_profile', true)}
            </div>
          )}

          {/* ========== Hub Sales Assistant ========== */}
          {activeSection === 'sales-assistant' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Hub Sales Assistant</h2>
                <p className="text-muted-foreground text-sm">
                  AI prompts, tool descriptions, search prompts, and model settings for the sales assistant
                </p>
              </div>

              <Tabs defaultValue="system" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="system" className="flex items-center gap-1.5">
                    <Bot className="w-4 h-4" />
                    System Prompt
                  </TabsTrigger>
                  <TabsTrigger value="tool" className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" />
                    Tool Descriptions
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex items-center gap-1.5">
                    <Search className="w-4 h-4" />
                    Search Prompts
                  </TabsTrigger>
                  <TabsTrigger value="model" className="flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4" />
                    Model Config
                  </TabsTrigger>
                </TabsList>

                {/* System Prompt Tab */}
                <TabsContent value="system" className="space-y-4">
                  <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    The main system prompt defines the assistant's persona, capabilities, and behavior guidelines.
                    Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{HUB_NAME}}'}</code> as a placeholder
                    for the hub name, which gets replaced at runtime.
                  </div>
                  {renderEditor('system_prompt', true)}
                </TabsContent>

                {/* Tool Descriptions Tab */}
                <TabsContent value="tool" className="space-y-4">
                  <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    Tool descriptions are sent to the AI model to explain what each tool does.
                    These influence how and when the model decides to use each tool.
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {renderEditor('tool_web_search')}
                    {renderEditor('tool_get_inventory')}
                    {renderEditor('tool_update_context')}
                    {renderEditor('tool_generate_file')}
                  </div>
                </TabsContent>

                {/* Search Prompts Tab */}
                <TabsContent value="search" className="space-y-4">
                  <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    Search prompts are system instructions sent to the Perplexity API for each type of web search.
                    They guide how search results are synthesized and presented.
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {renderEditor('search_default')}
                    {renderEditor('search_brand_research')}
                    {renderEditor('search_company_news')}
                    {renderEditor('search_competitors')}
                  </div>
                </TabsContent>

                {/* Model Config Tab */}
                <TabsContent value="model" className="space-y-4">
                  <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    Model configuration controls which AI models are used and their parameters.
                    Changes take effect on the next conversation message (cached for up to 5 minutes).
                  </div>
                  {renderEditor('model_config')}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </>
      )}
    </div>
  );
};
