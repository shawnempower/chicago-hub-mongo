import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  MessageCircle, 
  ChevronRight, 
  MoreVertical, 
  Archive, 
  Trash2, 
  Edit3,
  X
} from "lucide-react";
import { useConversationThreads, ConversationThread } from "@/hooks/useConversationThreads";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
}

export function ChatSidebar({ 
  isOpen, 
  onToggle, 
  activeThreadId, 
  onThreadSelect,
  onNewThread 
}: ChatSidebarProps) {
  const { threads, loading, createThread, updateThread, deleteThread, archiveThread } = useConversationThreads();
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadDescription, setNewThreadDescription] = useState("");
  const [editingThread, setEditingThread] = useState<ConversationThread | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim()) return;
    
    const thread = await createThread(newThreadTitle, newThreadDescription);
    if (thread) {
      onThreadSelect(thread.id);
      setShowNewThreadDialog(false);
      setNewThreadTitle("");
      setNewThreadDescription("");
    }
  };

  const handleUpdateThread = async () => {
    if (!editingThread || !editTitle.trim()) return;
    
    await updateThread(editingThread.id, { title: editTitle });
    setEditingThread(null);
    setEditTitle("");
  };

  const startEditing = (thread: ConversationThread) => {
    setEditingThread(thread);
    setEditTitle(thread.title);
  };

  if (!isOpen) {
    return (
      <div className="fixed left-0 top-0 h-full z-50 bg-background border-r border-border p-4 w-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNewThread}
          className="mb-4"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full z-50 bg-background border-r border-border p-4 w-80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary font-serif">Conversations</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* New Thread Button */}
      <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
        <DialogTrigger asChild>
          <Button className="mb-4 w-full justify-start" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>
              Create a new conversation thread to organize your discussions with Lassie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
                placeholder="e.g., Campaign Strategy, Q4 Media Plan"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={newThreadDescription}
                onChange={(e) => setNewThreadDescription(e.target.value)}
                placeholder="Brief description of this conversation"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewThreadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Start a new conversation with Lassie</p>
          </div>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                activeThreadId === thread.id
                  ? 'bg-accent'
                  : 'hover:bg-muted'
              }`}
              onClick={() => onThreadSelect(thread.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {editingThread?.id === thread.id ? (
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateThread()}
                        className="text-sm h-8"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={handleUpdateThread} className="h-8 w-8">
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <h3 className="font-medium text-sm truncate">{thread.title}</h3>
                  )}
                  {thread.description && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {thread.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                    <span>{thread.message_count} messages</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditing(thread)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => archiveThread(thread.id)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteThread(thread.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}