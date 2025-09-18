import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  MessageSquare,
  MoreVertical,
  Edit2,
  Archive,
  Trash2,
  X,
} from "lucide-react";
import { useConversationThreads, ConversationThread } from "@/hooks/useConversationThreads";
import { formatDistanceToNow } from "date-fns";

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onClose: () => void;
}

export function ChatSidebar({
  isOpen,
  onToggle,
  activeThreadId,
  onThreadSelect,
  onNewThread,
  onClose,
}: ChatSidebarProps) {
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { threads, loading, updateThread, deleteThread, archiveThread } = useConversationThreads();

  const handleUpdateThread = async () => {
    if (editingThread && editTitle.trim()) {
      await updateThread(editingThread, { title: editTitle.trim() });
      setEditingThread(null);
      setEditTitle("");
    }
  };

  const startEditing = (thread: ConversationThread) => {
    setEditingThread(thread.id);
    setEditTitle(thread.title);
  };

  // Collapsed sidebar
  if (!isOpen) {
    return (
      <div className="w-16 bg-muted/30 border-r flex flex-col items-center py-4 space-y-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewThread}
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 lg:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Full sidebar
  return (
    <div className="w-80 bg-muted/30 border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
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
        <div className="p-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading conversations...
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <div className="space-y-1">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`group relative rounded-lg p-3 cursor-pointer transition-colors ${
                    activeThreadId === thread.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => onThreadSelect(thread.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingThread === thread.id ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateThread();
                              } else if (e.key === "Escape") {
                                setEditingThread(null);
                                setEditTitle("");
                              }
                            }}
                            placeholder="Thread title"
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={handleUpdateThread}
                              className="h-6 px-2 text-xs"
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingThread(null);
                                setEditTitle("");
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-medium text-sm truncate mb-1">
                            {thread.title}
                          </h3>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{thread.message_count} messages</span>
                            <span>
                              {formatDistanceToNow(new Date(thread.updated_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </>
                      )}
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
                          <DropdownMenuItem onClick={() => startEditing(thread)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => archiveThread(thread.id)}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <Separator />
                          <DropdownMenuItem
                            onClick={() => deleteThread(thread.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}