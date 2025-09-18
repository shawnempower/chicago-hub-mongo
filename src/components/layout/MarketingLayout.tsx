import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantBubble } from "@/components/AssistantBubble";
import { useChat } from "@/contexts/ChatContext";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

interface MarketingLayoutProps {
  children: React.ReactNode;
  onViewPackage?: (packageId: number) => void;
}

export function MarketingLayout({ children, onViewPackage }: MarketingLayoutProps) {
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