import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantBubble } from "@/components/AssistantBubble";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useConversationThreads } from "@/hooks/useConversationThreads";

interface AppShellProps {
  children: React.ReactNode;
  showHeaderFooter?: boolean;
  onViewPackage?: (packageId: number) => void;
}

export function AppShell({ children, showHeaderFooter = true, onViewPackage }: AppShellProps) {
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
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

  const handleAssistantClick = () => {
    setChatOpen(true);
  };

  const handleChatClose = () => {
    setChatOpen(false);
  };

  // For non-logged in users on marketing pages, use overlay chat
  if (!user && showHeaderFooter) {
    return (
      <div className="min-h-screen bg-background">
        <Header onAssistantClick={handleAssistantClick} />
        <main>{children}</main>
        <Footer />
        
        <AssistantBubble 
          onAssistantClick={handleAssistantClick}
          isChatOpen={chatOpen}
        />

        {/* Marketing overlay chat - simplified version */}
        {chatOpen && (
          <div className="fixed inset-0 z-40 bg-background">
            <div className="h-full w-full flex">
              <ChatSidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                activeThreadId={activeThreadId}
                onThreadSelect={setActiveThreadId}
                onNewThread={handleNewThread}
                onClose={handleChatClose}
                isMarketingMode={true}
              />
              
              <div className="flex-1 h-full flex flex-col min-w-0">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Chat with Lassie</h2>
                  <button 
                    onClick={handleChatClose}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {/* Simple chat interface for marketing */}
                  <div className="h-full flex flex-col">
                    <div className="flex-1 p-4 overflow-y-auto">
                      <div className="text-center text-muted-foreground">
                        <p>Sign up to start chatting with Lassie and get personalized media recommendations!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For logged-in users, use integrated sidebar layout
  return (
    <div className="min-h-screen bg-background flex">
      {/* Chat Sidebar - Always present for logged-in users */}
      {user && (
        <ChatSidebar
          isOpen={chatOpen && sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          activeThreadId={activeThreadId}
          onThreadSelect={setActiveThreadId}
          onNewThread={handleNewThread}
          onClose={() => setChatOpen(false)}
          isIntegrated={true}
        />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        user && chatOpen ? (sidebarOpen ? 'mr-80' : 'mr-16') : ''
      }`}>
        {showHeaderFooter && (
          <Header 
            onAssistantClick={user ? () => setChatOpen(!chatOpen) : handleAssistantClick}
            isChatOpen={user ? chatOpen : false}
          />
        )}
        
        <main className="flex-1">{children}</main>
        
        {showHeaderFooter && <Footer />}
      </div>

      {/* Floating Assistant for non-authenticated users */}
      {!user && (
        <AssistantBubble 
          onAssistantClick={handleAssistantClick}
          isChatOpen={chatOpen}
        />
      )}
    </div>
  );
}