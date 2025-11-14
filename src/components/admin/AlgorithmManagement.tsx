import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Settings, 
  Save, 
  AlertCircle, 
  Edit, 
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';

interface Algorithm {
  algorithmId: string;
  name: string;
  description: string;
  icon?: string;
  llmConfig?: {
    model?: {
      maxTokens?: number;
      temperature?: number;
    };
    pressForward?: {
      enforceAllOutlets?: boolean;
      prioritizeSmallOutlets?: boolean;
      allowBudgetExceeding?: boolean;
      maxBudgetExceedPercent?: number;
    };
    selection?: {
      maxPublications?: number;
      minPublications?: number;
      diversityWeight?: number;
    };
    output?: {
      includeRationale?: boolean;
      verboseLogging?: boolean;
      includeAlternatives?: boolean;
    };
  };
  constraints?: {
    strictBudget?: boolean;
    maxBudgetExceedPercent?: number;
    maxPublications?: number;
    minPublications?: number;
    maxPublicationPercent?: number;
    minPublicationSpend?: number;
    targetPublicationsMin?: number;
    targetPublicationsMax?: number;
    pruningPassesMax?: number;
  };
  scoring?: {
    sizeWeight?: number;
    diversityWeight?: number;
    costEfficiencyWeight?: number;
    reachWeight?: number;
    engagementWeight?: number;
  };
  promptInstructions?: string;
  isActive?: boolean;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
  createdBy?: string;
}

export const AlgorithmManagement = () => {
  const { toast } = useToast();
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(null);
  const [editingAlgorithm, setEditingAlgorithm] = useState<Algorithm | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAlgorithms();
  }, []);

  const fetchAlgorithms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      console.log('Fetching algorithms from:', `${API_BASE_URL}/admin/algorithms`);
      
      const response = await fetch(`${API_BASE_URL}/admin/algorithms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch algorithms');
      }
      
      const data = await response.json();
      console.log('Algorithms loaded:', data);
      setAlgorithms(data.algorithms || []);
    } catch (error) {
      console.error('Error fetching algorithms:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch algorithms',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAlgorithm = async (algorithmId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/algorithms/${algorithmId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch algorithm details');
      }
      
      const algorithm = await response.json();
      setEditingAlgorithm(algorithm);
    } catch (error) {
      console.error('Error fetching algorithm:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch algorithm details',
        variant: 'destructive'
      });
    }
  };

  const handleSaveAlgorithm = async () => {
    if (!editingAlgorithm) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/admin/algorithms/${editingAlgorithm.algorithmId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editingAlgorithm)
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to save algorithm');
      }
      
      toast({
        title: 'Success',
        description: 'Algorithm configuration saved successfully'
      });
      
      setEditingAlgorithm(null);
      fetchAlgorithms();
    } catch (error) {
      console.error('Error saving algorithm:', error);
      toast({
        title: 'Error',
        description: 'Failed to save algorithm',
        variant: 'destructive'
      });
    }
  };


  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateEditingField = (path: string[], value: any) => {
    if (!editingAlgorithm) return;
    
    const updated = { ...editingAlgorithm };
    let current: any = updated;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setEditingAlgorithm(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Algorithm Management</h2>
          <p className="text-sm text-muted-foreground">
            Configure campaign generation algorithms. Changes are stored in the database and override code defaults.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {algorithms.map((algorithm) => (
          <Card key={algorithm.algorithmId} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">{algorithm.name}</h3>
                  {algorithm.isDefault && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                      Default
                    </span>
                  )}
                  {algorithm.isActive === false && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {algorithm.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Max Publications:</span>{' '}
                    <span className="font-medium">
                      {algorithm.constraints?.maxPublications || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Budget Exceeding:</span>{' '}
                    <span className="font-medium">
                      {algorithm.llmConfig?.pressForward?.allowBudgetExceeding ? 'Allowed' : 'Not Allowed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pruning Passes:</span>{' '}
                    <span className="font-medium">
                      {algorithm.constraints?.pruningPassesMax ?? 3}
                    </span>
                  </div>
                  {algorithm.updatedAt && (
                    <div>
                      <span className="text-muted-foreground">Last Modified:</span>{' '}
                      <span className="font-medium">
                        {new Date(algorithm.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditAlgorithm(algorithm.algorithmId)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAlgorithm} onOpenChange={(open) => !open && setEditingAlgorithm(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Algorithm: {editingAlgorithm?.name}</DialogTitle>
            <DialogDescription>
              Configure algorithm settings. These override the code defaults and are stored in the database.
            </DialogDescription>
          </DialogHeader>

          {editingAlgorithm && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('basic')}>
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  {expandedSections.basic ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                
                {(expandedSections.basic !== false) && (
                  <div className="space-y-4 pl-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editingAlgorithm.name}
                        onChange={(e) => updateEditingField(['name'], e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editingAlgorithm.description}
                        onChange={(e) => updateEditingField(['description'], e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={editingAlgorithm.isActive !== false}
                        onCheckedChange={(checked) => updateEditingField(['isActive'], checked)}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>
                )}
              </div>

              {/* Constraints */}
              <div className="space-y-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('constraints')}>
                  <h3 className="text-lg font-semibold">Constraints</h3>
                  {expandedSections.constraints ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                
                {(expandedSections.constraints !== false) && (
                  <div className="grid grid-cols-2 gap-4 pl-4">
                    <div>
                      <Label htmlFor="strictBudget">Strict Budget</Label>
                      <Switch
                        id="strictBudget"
                        checked={editingAlgorithm.constraints?.strictBudget || false}
                        onCheckedChange={(checked) => updateEditingField(['constraints', 'strictBudget'], checked)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxBudgetExceedPercent">Max Budget Exceed %</Label>
                      <Input
                        id="maxBudgetExceedPercent"
                        type="number"
                        step="0.01"
                        value={editingAlgorithm.constraints?.maxBudgetExceedPercent || 0}
                        onChange={(e) => updateEditingField(['constraints', 'maxBudgetExceedPercent'], parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPublications">Max Publications</Label>
                      <Input
                        id="maxPublications"
                        type="number"
                        value={editingAlgorithm.constraints?.maxPublications || ''}
                        onChange={(e) => updateEditingField(['constraints', 'maxPublications'], parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="minPublications">Min Publications</Label>
                      <Input
                        id="minPublications"
                        type="number"
                        value={editingAlgorithm.constraints?.minPublications || ''}
                        onChange={(e) => updateEditingField(['constraints', 'minPublications'], parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPublicationPercent">Max Publication % of Budget</Label>
                      <Input
                        id="maxPublicationPercent"
                        type="number"
                        step="0.01"
                        value={editingAlgorithm.constraints?.maxPublicationPercent || 0.25}
                        onChange={(e) => updateEditingField(['constraints', 'maxPublicationPercent'], parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="minPublicationSpend">Min Publication Spend</Label>
                      <Input
                        id="minPublicationSpend"
                        type="number"
                        value={editingAlgorithm.constraints?.minPublicationSpend || 500}
                        onChange={(e) => updateEditingField(['constraints', 'minPublicationSpend'], parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pruningPassesMax">Pruning Passes Max (0-4)</Label>
                      <Input
                        id="pruningPassesMax"
                        type="number"
                        min="0"
                        max="4"
                        value={editingAlgorithm.constraints?.pruningPassesMax ?? 3}
                        onChange={(e) => updateEditingField(['constraints', 'pruningPassesMax'], parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* LLM Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('llmConfig')}>
                  <h3 className="text-lg font-semibold">LLM Configuration</h3>
                  {expandedSections.llmConfig ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                
                {expandedSections.llmConfig && (
                  <div className="space-y-4 pl-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="temperature">Temperature</Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          value={editingAlgorithm.llmConfig?.model?.temperature || 0.7}
                          onChange={(e) => updateEditingField(['llmConfig', 'model', 'temperature'], parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxTokens">Max Tokens</Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          value={editingAlgorithm.llmConfig?.model?.maxTokens || 16000}
                          onChange={(e) => updateEditingField(['llmConfig', 'model', 'maxTokens'], parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Press Forward Settings</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingAlgorithm.llmConfig?.pressForward?.allowBudgetExceeding || false}
                          onCheckedChange={(checked) => updateEditingField(['llmConfig', 'pressForward', 'allowBudgetExceeding'], checked)}
                        />
                        <Label>Allow Budget Exceeding</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingAlgorithm.llmConfig?.pressForward?.enforceAllOutlets || false}
                          onCheckedChange={(checked) => updateEditingField(['llmConfig', 'pressForward', 'enforceAllOutlets'], checked)}
                        />
                        <Label>Enforce All Outlets</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingAlgorithm.llmConfig?.pressForward?.prioritizeSmallOutlets || false}
                          onCheckedChange={(checked) => updateEditingField(['llmConfig', 'pressForward', 'prioritizeSmallOutlets'], checked)}
                        />
                        <Label>Prioritize Small Outlets</Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt Instructions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('prompt')}>
                  <h3 className="text-lg font-semibold">Prompt Instructions</h3>
                  {expandedSections.prompt ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                
                {expandedSections.prompt && (
                  <div className="pl-4">
                    <Textarea
                      value={editingAlgorithm.promptInstructions || ''}
                      onChange={(e) => updateEditingField(['promptInstructions'], e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                      placeholder="Custom prompt instructions (leave empty to use code defaults)"
                    />
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Database-stored configuration</p>
                    <p className="text-xs text-blue-700 mt-1">
                      All algorithm settings are stored in MongoDB. Changes take effect immediately for new campaigns.
                      {editingAlgorithm.updatedAt && ` Last updated: ${new Date(editingAlgorithm.updatedAt).toLocaleString()}`}
                      {editingAlgorithm.updatedBy && ` by ${editingAlgorithm.updatedBy}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingAlgorithm(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAlgorithm}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

