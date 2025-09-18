import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useChat } from "@/contexts/ChatContext";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onViewPackage?: (packageId: number) => void;
}

export function DashboardLayout({ children, onViewPackage }: DashboardLayoutProps) {
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onAssistantClick={toggleChat}
          isChatOpen={chatOpen}
        />
        
        <main className="flex-1">{children}</main>
        
        <Footer />
      </div>

      {/* Chat Sidebar - Fixed on right side for dashboard */}
      {chatOpen && (
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

      {/* Collapsed chat toggle when closed */}
      {!chatOpen && (
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