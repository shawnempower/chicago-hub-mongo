import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useConversationThreads } from "@/hooks/useConversationThreads";

interface ChatContextType {
  // Chat UI state
  chatOpen: boolean;
  sidebarOpen: boolean;
  setChatOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleChat: () => void;
  toggleSidebar: () => void;
  
  // Thread management
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  threads: any[];
  createThread: () => Promise<any>;
  
  // Actions
  handleNewThread: () => Promise<void>;
  handleCloseChat: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user } = useAuth();
  const { threads, createThread } = useConversationThreads();
  
  // Chat UI state
  const [chatOpen, setChatOpen] = useState(!!user); // Open by default for logged-in users
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Auto-select first thread when available
  useEffect(() => {
    if (!activeThreadId && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  // Open chat by default for logged-in users
  useEffect(() => {
    if (user && !chatOpen) {
      setChatOpen(true);
    }
  }, [user]);

  const toggleChat = () => setChatOpen(!chatOpen);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleNewThread = async () => {
    const thread = await createThread();
    if (thread) {
      setActiveThreadId(thread.id);
    }
  };

  const handleCloseChat = () => {
    setChatOpen(false);
  };

  const value: ChatContextType = {
    chatOpen,
    sidebarOpen,
    setChatOpen,
    setSidebarOpen,
    toggleChat,
    toggleSidebar,
    activeThreadId,
    setActiveThreadId,
    threads,
    createThread,
    handleNewThread,
    handleCloseChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}