import { useState, useEffect } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatInterface } from "./ChatInterface";
import { useConversationThreads } from "@/hooks/useConversationThreads";

interface ChatContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onViewPackage?: (packageId: number) => void;
}

export function ChatContainer({ isOpen, onClose, onViewPackage }: ChatContainerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const { threads, createThread } = useConversationThreads();

  // Auto-select first thread when available
  useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  const handleNewThread = async () => {
    const thread = await createThread();
    if (thread) {
      setActiveThreadId(thread.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeThreadId={activeThreadId}
        onThreadSelect={setActiveThreadId}
        onNewThread={handleNewThread}
        onClose={onClose}
      />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-16'}`}>
        <ChatInterface
          threadId={activeThreadId}
          onViewPackage={onViewPackage}
        />
      </div>
    </div>
  );
}