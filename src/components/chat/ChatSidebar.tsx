import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MessageSquare, 
  Plus, 
  X, 
  Edit, 
  Archive, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Check,
  XIcon
} from "lucide-react";
import { useConversationThreads } from "@/hooks/useConversationThreads";
import { formatDistanceToNow } from "date-fns";

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onClose: () => void;
  isMarketingMode?: boolean;
  isIntegrated?: boolean;
}

export function ChatSidebar({
  isOpen,
  onToggle,
  activeThreadId,
  onThreadSelect,
  onNewThread,
  onClose,
  isMarketingMode = false,
  isIntegrated = false
}: ChatSidebarProps) {
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { threads, loading, updateThread, deleteThread, archiveThread } = useConversationThreads();

  const handleUpdateThread = async () => {
    if (editingThread && editTitle.trim()) {
      await updateThread(editingThread, { title: editTitle });
      setEditingThread(null);
      setEditTitle("");
    }
  };

  const startEditing = (threadId: string, currentTitle: string) => {
    setEditingThread(threadId);
    setEditTitle(currentTitle);
  };

  // Collapsed sidebar - only show for integrated mode
  if (!isOpen && isIntegrated) {
    return (
      <div className="w-16 h-full bg-muted/30 border-l border-border flex flex-col items-center py-4 space-y-4 shrink-0 fixed right-0 top-0 z-30">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="w-10 h-10"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewThread}
          className="w-10 h-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Don't render anything if not open and not integrated
  if (!isOpen && !isIntegrated) {
    return null;
  }

  // Full sidebar
  return (
    <div className={`w-80 h-full bg-muted/30 border-border flex flex-col shrink-0 ${
      isIntegrated ? 'border-l fixed right-0 top-0 z-30' : 'border-r'
    }`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewThread}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            {isIntegrated ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-8 w-8 hidden md:flex"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 md:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <Button 
          onClick={onNewThread}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to get started</p>
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                  activeThreadId === thread.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onThreadSelect(thread.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingThread === thread.id ? (
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateThread();
                            if (e.key === 'Escape') {
                              setEditingThread(null);
                              setEditTitle("");
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateThread();
                          }}
                          className="h-7 w-7"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingThread(null);
                            setEditTitle("");
                          }}
                          className="h-7 w-7"
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="font-medium text-sm truncate mb-1">
                        {thread.title}
                      </h3>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {thread.message_count || 0} messages
                      </Badge>
                      <span>
                        {formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  {editingThread !== thread.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(thread.id, thread.title);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveThread(thread.id);
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(thread.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}