import { useState, useEffect } from 'react';
import { leadsApi, type LeadNote } from '@/api/leads';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  RefreshCcw, 
  UserCheck, 
  Settings, 
  Edit2, 
  Trash2,
  Save,
  X
} from 'lucide-react';

interface LeadNotesTimelineProps {
  leadId: string;
  currentUserId?: string;
  showComposer?: boolean;
}

const getNoteIcon = (noteType: LeadNote['noteType']) => {
  switch (noteType) {
    case 'note':
      return <MessageSquare className="h-4 w-4" />;
    case 'status_change':
      return <RefreshCcw className="h-4 w-4" />;
    case 'assignment':
      return <UserCheck className="h-4 w-4" />;
    case 'system':
      return <Settings className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

const getNoteTypeColor = (noteType: LeadNote['noteType']) => {
  switch (noteType) {
    case 'note':
      return 'bg-blue-100 text-blue-800';
    case 'status_change':
      return 'bg-green-100 text-green-800';
    case 'assignment':
      return 'bg-purple-100 text-purple-800';
    case 'system':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

export const LeadNotesTimeline = ({
  leadId,
  currentUserId,
  showComposer = true,
}: LeadNotesTimelineProps) => {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchNotes();
  }, [leadId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await leadsApi.getNotes(leadId);
      setNotes(response.notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      toast({
        title: "Error",
        description: "Note content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingNote(true);
      await leadsApi.addNote(leadId, {
        noteContent: newNoteContent,
        noteType: 'note',
      });

      setNewNoteContent('');
      await fetchNotes();

      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setAddingNote(false);
    }
  };

  const handleStartEdit = (note: LeadNote) => {
    setEditingNoteId(note._id || null);
    setEditContent(note.noteContent);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editContent.trim()) {
      toast({
        title: "Error",
        description: "Note content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await leadsApi.updateNote(leadId, noteId, {
        noteContent: editContent,
      });

      setEditingNoteId(null);
      setEditContent('');
      await fetchNotes();

      toast({
        title: "Success",
        description: "Note updated successfully",
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await leadsApi.deleteNote(leadId, noteId);
      await fetchNotes();

      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading notes...</div>;
  }

  return (
    <div className="space-y-4">
      {showComposer && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-3">Add Note</h3>
            <Textarea
              placeholder="Write a note about this lead..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <Button
              onClick={handleAddNote}
              disabled={addingNote || !newNoteContent.trim()}
              size="sm"
            >
              {addingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes Timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Activity Timeline</h3>
        
        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
            No notes yet. Add the first note above.
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note._id} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`rounded-full p-2 ${getNoteTypeColor(note.noteType)}`}>
                    {getNoteIcon(note.noteType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{note.authorName}</span>
                      <Badge variant="outline" className="text-xs">
                        {note.noteType.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Note Content - Editable or Display */}
                    {editingNoteId === note._id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(note._id!)}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {note.noteContent}
                        </p>

                        {/* Metadata for status changes */}
                        {note.noteType === 'status_change' && note.metadata?.previousStatus && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Status changed from{' '}
                            <Badge variant="outline" className="text-xs">
                              {note.metadata.previousStatus}
                            </Badge>
                            {' '}to{' '}
                            <Badge variant="outline" className="text-xs">
                              {note.metadata.newStatus}
                            </Badge>
                          </div>
                        )}

                        {/* Metadata for assignments */}
                        {note.noteType === 'assignment' && note.metadata?.newAssignee && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Assigned to: {note.metadata.newAssignee}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions - Only show for own notes */}
                  {editingNoteId !== note._id && currentUserId === note.authorId && note.noteType === 'note' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(note)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note._id!)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};


