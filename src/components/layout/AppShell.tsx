import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantBubble } from "@/components/AssistantBubble";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";

interface AppShellProps {
  children: React.ReactNode;
  showHeaderFooter?: boolean;
  onViewPackage?: (packageId: number) => void;
}

export function AppShell({ children, showHeaderFooter = true, onViewPackage }: AppShellProps) {
  const { user } = useAuth();
  const {
    chatOpen,
    sidebarOpen,
    toggleChat,
    toggleSidebar,
    activeThreadId,
    setActiveThreadId,
    handleNewThread,
    handleCloseChat
  } = useChat();

  // For non-logged in users on marketing pages, use overlay chat
  if (!user && showHeaderFooter) {
    return (
      <div className="min-h-screen bg-background">
        <Header onAssistantClick={toggleChat} isChatOpen={chatOpen} />
        <main>{children}</main>
        <Footer />
        
        <AssistantBubble 
          onAssistantClick={toggleChat}
          isChatOpen={chatOpen}
        />

        {/* Marketing overlay chat */}
        {chatOpen && (
          <div className="fixed inset-0 z-40 bg-background">
            <div className="h-full w-full flex">
              <ChatSidebar
                isOpen={sidebarOpen}
                onToggle={toggleSidebar}
                activeThreadId={activeThreadId}
                onThreadSelect={setActiveThreadId}
                onNewThread={handleNewThread}
                onClose={handleCloseChat}
                isMarketingMode={true}
              />
              
              <div className="flex-1 h-full flex flex-col min-w-0">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Chat with Lassie</h2>
                  <button 
                    onClick={handleCloseChat}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-center p-8 text-muted-foreground">
                    <p>Sign up to start chatting with Lassie and get personalized media recommendations!</p>
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
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {showHeaderFooter && (
          <Header 
            onAssistantClick={toggleChat}
            isChatOpen={chatOpen}
          />
        )}
        
        <main className="flex-1">{children}</main>
        
        {showHeaderFooter && <Footer />}
      </div>

      {/* Chat Sidebar - Fixed on right side for logged-in users */}
      {user && chatOpen && (
        <>
          <ChatSidebar
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            activeThreadId={activeThreadId}
            onThreadSelect={setActiveThreadId}
            onNewThread={handleNewThread}
            onClose={handleCloseChat}
            isIntegrated={true}
          />
          
          {/* Chat Interface - Only when sidebar is open */}
          {sidebarOpen && (
            <div className="w-96 h-full bg-background border-l border-border flex flex-col shrink-0 fixed right-80 top-0 z-20">
              <ChatInterface
                threadId={activeThreadId}
                onViewPackage={onViewPackage}
              />
            </div>
          )}
        </>
      )}

      {/* Collapsed chat toggle for logged-in users when closed */}
      {user && !chatOpen && (
        <div className="w-16 h-full bg-muted/30 border-l border-border flex flex-col items-center py-4 space-y-4 shrink-0 fixed right-0 top-0 z-30">
          <button
            onClick={toggleChat}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            💬
          </button>
        </div>
      )}
    </div>
  );
}