/**
 * Inventory Chat Container
 * 
 * Main container with header-based conversation selector
 * and right-side artifacts panel for generated documents
 */

import React, { useState, useEffect, useRef } from 'react';
import { useHubContext } from '@/contexts/HubContext';
import { InventoryChatInterface } from './InventoryChatInterface';
import { 
  getConversation, 
  listConversations, 
  createConversation, 
  deleteConversation,
  downloadGeneratedFile,
  type Conversation,
  type GeneratedFile
} from '@/api/inventoryChat';
import { 
  Loader2, 
  ChevronDown, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Sparkles,
  Check,
  FileText,
  FileSpreadsheet,
  Download,
  FolderOpen,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export const InventoryChatContainer: React.FC = () => {
  const { selectedHubId } = useHubContext();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isArtifactsPanelOpen, setIsArtifactsPanelOpen] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  useEffect(() => {
    if (!selectedHubId) return;
    
    const loadConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const data = await listConversations(selectedHubId);
        setConversations(data);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    
    loadConversations();
  }, [selectedHubId]);

  // Auto-create a new chat when loading finishes with no conversation selected
  useEffect(() => {
    if (isLoadingConversations || !selectedHubId || selectedConversationId) return;

    const autoCreate = async () => {
      setIsCreating(true);
      try {
        const newConversation = await createConversation(selectedHubId);
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversationId(newConversation.conversationId);
      } catch (error) {
        console.error('Error auto-creating chat:', error);
      } finally {
        setIsCreating(false);
      }
    };

    autoCreate();
  }, [isLoadingConversations, selectedHubId, selectedConversationId]);

  // Load generated files when conversation changes
  useEffect(() => {
    if (!selectedConversationId) {
      setGeneratedFiles([]);
      return;
    }
    
    const loadGeneratedFiles = async () => {
      try {
        const conversation = await getConversation(selectedConversationId);
        setGeneratedFiles(conversation.generatedFiles || []);
      } catch (error) {
        console.error('Error loading generated files:', error);
        setGeneratedFiles([]);
      }
    };
    
    loadGeneratedFiles();
  }, [selectedConversationId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current conversation title
  const currentConversation = conversations.find(c => c.conversationId === selectedConversationId);
  const currentTitle = currentConversation?.title || 'New Chat';

  const handleCreateConversation = async () => {
    if (!selectedHubId) return;
    
    setIsCreating(true);
    try {
      const newConversation = await createConversation(selectedHubId);
      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversationId(newConversation.conversationId);
      setIsDropdownOpen(false);
      toast({ title: 'New chat created' });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create chat',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.conversationId !== conversationId));
      
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      
      toast({ title: 'Chat deleted' });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete chat',
        variant: 'destructive'
      });
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsDropdownOpen(false);
  };

  const handleConversationUpdate = async () => {
    // Refresh conversations list and generated files
    if (!selectedHubId) return;
    try {
      const data = await listConversations(selectedHubId);
      setConversations(data);
      
      // Also refresh generated files for current conversation
      if (selectedConversationId) {
        const conversation = await getConversation(selectedConversationId);
        setGeneratedFiles(conversation.generatedFiles || []);
      }
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    }
  };

  const handleDownloadFile = async (file: GeneratedFile) => {
    if (!selectedConversationId) return;
    
    try {
      await downloadGeneratedFile(selectedConversationId, file.id);
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  // Callback from chat interface when new files are generated
  const handleFilesGenerated = (newFiles: GeneratedFile[]) => {
    setGeneratedFiles(prev => [...prev, ...newFiles]);
  };

  if (!selectedHubId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2 text-slate-700">No Hub Selected</p>
          <p className="text-sm text-slate-500">
            Please select a hub to start exploring inventory.
          </p>
        </div>
      </div>
    );
  }

  // Check if we should show the artifacts panel
  const hasArtifacts = generatedFiles.length > 0;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white rounded-lg border border-slate-200">
      {/* Header with conversation selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        {/* Left: Logo + Conversation Dropdown */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          
          {/* Conversation Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
                "hover:bg-slate-100 border border-transparent",
                isDropdownOpen && "bg-slate-100 border-slate-200"
              )}
            >
              <span className="font-medium text-slate-700 max-w-[200px] truncate">
                Chat History
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isDropdownOpen && "rotate-180"
              )} />
            </button>
            
            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                {/* New Chat Button */}
                <button
                  onClick={handleCreateConversation}
                  disabled={isCreating}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="font-medium">New Chat</span>
                </button>
                
                <div className="h-px bg-slate-100 my-1" />
                
                {/* Conversations List */}
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-slate-500">
                    No conversations yet
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.conversationId}
                        onClick={() => handleSelectConversation(conversation.conversationId)}
                        className={cn(
                          "group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                          selectedConversationId === conversation.conversationId
                            ? "bg-emerald-50"
                            : "hover:bg-slate-50"
                        )}
                      >
                        <MessageSquare className={cn(
                          "h-4 w-4 flex-shrink-0",
                          selectedConversationId === conversation.conversationId
                            ? "text-emerald-600"
                            : "text-slate-400"
                        )} />
                        <span className={cn(
                          "flex-1 text-sm truncate",
                          selectedConversationId === conversation.conversationId
                            ? "text-emerald-700 font-medium"
                            : "text-slate-600"
                        )}>
                          {conversation.title}
                        </span>
                        {selectedConversationId === conversation.conversationId && (
                          <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        )}
                        <button
                          onClick={(e) => handleDeleteConversation(conversation.conversationId, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Artifacts toggle + New Chat */}
        <div className="flex items-center gap-2">
          {hasArtifacts && (
            <button
              onClick={() => setIsArtifactsPanelOpen(!isArtifactsPanelOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                isArtifactsPanelOpen 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="font-medium">{generatedFiles.length}</span>
            </button>
          )}
          <button
            onClick={handleCreateConversation}
            disabled={isCreating}
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="New Chat"
          >
            {isCreating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          {isLoadingConversation ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <InventoryChatInterface
              conversationId={selectedConversationId}
              onConversationUpdate={handleConversationUpdate}
              onFilesGenerated={handleFilesGenerated}
              key={selectedConversationId}
            />
          )}
        </div>

        {/* Artifacts Panel (Right Side) */}
        {hasArtifacts && isArtifactsPanelOpen && (
          <div className="w-72 border-l border-slate-200 bg-slate-50/50 flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Documents</h3>
              </div>
              <button
                onClick={() => setIsArtifactsPanelOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {generatedFiles.map((file) => {
                const isProposal = file.fileType === 'proposal_md';
                return (
                  <div
                    key={file.id}
                    className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {/* File Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isProposal 
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
                          : "bg-slate-200"
                      )}>
                        {isProposal ? (
                          <FileText className="h-5 w-5 text-white" />
                        ) : (
                          <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                        )}
                      </div>
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {file.filename}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isProposal ? 'Proposal' : 'Data Export'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Download Button */}
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className={cn(
                        "w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isProposal
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

