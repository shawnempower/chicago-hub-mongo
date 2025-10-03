import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Save, Eye } from 'lucide-react';

interface AssistantInstruction {
  id: string;
  version: string;
  instructions: string;
  is_active: boolean;
  created_at: string;
}

export const AssistantManagement = () => {
  const [instructions, setInstructions] = useState<AssistantInstruction[]>([]);
  const [currentInstructions, setCurrentInstructions] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInstructions();
  }, []);

  const fetchInstructions = async () => {
    try {
      const { data, error } = await supabase
        .from('assistant_instructions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setInstructions(data || []);
      
      // Set current active instructions
      const activeInstruction = data?.find(inst => inst.is_active);
      if (activeInstruction) {
        setCurrentInstructions(activeInstruction.instructions);
      }
    } catch (error) {
      console.error('Error fetching instructions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assistant instructions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveInstructions = async () => {
    if (!newVersion.trim()) {
      toast({
        title: "Version Required",
        description: "Please enter a version name for these instructions",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, deactivate all existing instructions
      await supabase
        .from('assistant_instructions')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

      // Create new instruction set
      const { error } = await supabase
        .from('assistant_instructions')
        .insert({
          version: newVersion,
          instructions: currentInstructions,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assistant instructions updated successfully",
      });

      setNewVersion('');
      fetchInstructions();
    } catch (error) {
      console.error('Error saving instructions:', error);
      toast({
        title: "Error",
        description: "Failed to save assistant instructions",
        variant: "destructive",
      });
    }
  };

  const activateVersion = async (instructionId: string) => {
    try {
      // Deactivate all existing instructions
      await supabase
        .from('assistant_instructions')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Activate the selected instruction
      const { data, error } = await supabase
        .from('assistant_instructions')
        .update({ is_active: true })
        .eq('id', instructionId)
        .select()
        .single();

      if (error) throw error;

      setCurrentInstructions(data.instructions);
      
      toast({
        title: "Success",
        description: "Instruction version activated successfully",
      });

      fetchInstructions();
    } catch (error) {
      console.error('Error activating version:', error);
      toast({
        title: "Error",
        description: "Failed to activate instruction version",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading assistant instructions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Assistant Management</h2>
        <p className="text-muted-foreground">Manage AI assistant instructions and behavior</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Instructions</CardTitle>
              <CardDescription>Edit the assistant's behavior and responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={currentInstructions}
                onChange={(e) => setCurrentInstructions(e.target.value)}
                placeholder="Enter assistant instructions..."
                className="min-h-[300px] font-mono text-sm"
              />
              
              <div className="flex gap-2">
                <Input
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="Version name (e.g., v1.2, Lead Focus Update)"
                  className="flex-1"
                />
                <Button onClick={saveInstructions}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Version
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <p><strong>Tip:</strong> Include instructions for lead capture, conversation flow, and response tone.</p>
                <p>Focus on capturing business name, contact info, and marketing goals.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>Previous instruction versions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {instructions.map((instruction) => (
                  <div key={instruction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{instruction.version}</span>
                        {instruction.is_active && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(instruction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentInstructions(instruction.instructions)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!instruction.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => activateVersion(instruction.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversation Analytics</CardTitle>
              <CardDescription>Assistant performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">47</div>
                    <div className="text-sm text-muted-foreground">Total Conversations</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-sm text-muted-foreground">Leads Generated</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">25%</div>
                    <div className="text-sm text-muted-foreground">Conversion Rate</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">4.2</div>
                    <div className="text-sm text-muted-foreground">Avg. Messages/Conv.</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p><strong>Note:</strong> Analytics are placeholder data. Implement conversation tracking for real metrics.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};