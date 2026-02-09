/**
 * Inventory Chat Interface
 * 
 * Main chat UI for the Hub Sales Assistant
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Paperclip, X, FileText, Download, Image as ImageIcon, Bot, User, Sparkles } from 'lucide-react';
import { 
  sendMessage, 
  getConversation, 
  uploadAttachments,
  deleteAttachment,
  downloadGeneratedFile,
  ConversationAttachment,
  GeneratedFile
} from '@/api/inventoryChat';
import { toast } from '@/components/ui/use-toast';
import { MarkdownMessage } from './MarkdownMessage';

interface InventoryChatInterfaceProps {
  conversationId: string | null;
  onConversationUpdate?: () => void;
  onFilesGenerated?: (files: GeneratedFile[]) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Supported file types
const SUPPORTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const InventoryChatInterface: React.FC<InventoryChatInterfaceProps> = ({
  conversationId,
  onConversationUpdate,
  onFilesGenerated,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [attachments, setAttachments] = useState<ConversationAttachment[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversation messages and attachments when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setAttachments([]);
      setGeneratedFiles([]);
      setPendingFiles([]);
      return;
    }

    const loadConversation = async () => {
      setIsLoadingMessages(true);
      try {
        const conversation = await getConversation(conversationId);
        setMessages(conversation.messages || []);
        setAttachments(conversation.attachments || []);
        setGeneratedFiles(conversation.generatedFiles || []);
      } catch (error) {
        console.error('Error loading conversation:', error);
        toast({
          title: 'Error',
          description: 'Failed to load conversation',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        toast({
          title: 'Unsupported file type',
          description: `${file.name} is not a supported file type`,
          variant: 'destructive',
        });
        continue;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 10MB limit`,
          variant: 'destructive',
        });
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  // Upload pending files
  const uploadPendingFiles = useCallback(async () => {
    if (!conversationId || pendingFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      const uploaded = await uploadAttachments(conversationId, pendingFiles);
      setAttachments(prev => [...prev, ...uploaded]);
      setPendingFiles([]);
      toast({
        title: 'Files uploaded',
        description: `${uploaded.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [conversationId, pendingFiles]);

  // Auto-upload when files are added
  useEffect(() => {
    if (pendingFiles.length > 0 && conversationId) {
      uploadPendingFiles();
    }
  }, [pendingFiles, conversationId, uploadPendingFiles]);

  // Remove an attachment
  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!conversationId) return;
    
    try {
      await deleteAttachment(conversationId, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast({
        title: 'Attachment removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove attachment',
        variant: 'destructive',
      });
    }
  };

  // Download a generated file
  const handleDownloadFile = async (file: GeneratedFile) => {
    if (!conversationId) return;
    
    try {
      await downloadGeneratedFile(conversationId, file.id);
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleSendMessage = async () => {
    if (!conversationId || !inputValue.trim() || isLoading) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message optimistically
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage(conversationId, userMessage);
      
      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Add any generated files and notify parent
      if (response.generatedFiles && response.generatedFiles.length > 0) {
        setGeneratedFiles(prev => [...prev, ...response.generatedFiles!]);
        onFilesGenerated?.(response.generatedFiles);
      }
      
      // Notify parent to refresh conversation list
      onConversationUpdate?.();
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m !== newUserMessage));
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render attachment chip
  const renderAttachmentChip = (attachment: ConversationAttachment) => (
    <div
      key={attachment.id}
      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm group hover:border-slate-300 transition-colors"
    >
      {attachment.isImage ? (
        <ImageIcon className="h-4 w-4 text-purple-500" />
      ) : (
        <FileText className="h-4 w-4 text-blue-500" />
      )}
      <span className="max-w-[150px] truncate text-slate-600">{attachment.filename}</span>
      <button
        onClick={() => handleRemoveAttachment(attachment.id)}
        className="text-slate-300 hover:text-red-500 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  // Render download button for generated files
  const renderDownloadButton = (file: GeneratedFile) => {
    const isProposal = file.fileType === 'proposal_md';
    return (
      <button
        key={file.id}
        onClick={() => handleDownloadFile(file)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all hover:scale-[1.02] active:scale-[0.98]
          ${isProposal 
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:shadow-md' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }
        `}
      >
        <Download className="h-4 w-4" />
        <span className="truncate max-w-[200px]">{file.filename}</span>
      </button>
    );
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-lg text-center space-y-8">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          
          {/* Title & Description */}
          <div className="space-y-3">
            <h3 className="text-2xl font-semibold text-slate-800">Hub Sales Assistant</h3>
            <p className="text-slate-500 leading-relaxed max-w-md mx-auto">
              Research brands, plan campaigns, and create proposals using your publication inventory. 
              I can search the web, analyze your inventory, and generate downloadable documents.
            </p>
          </div>
          
          {/* Example prompts */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Try asking</p>
            <div className="flex flex-col items-center gap-2">
              {[
                { icon: '🔍', text: "Research Portillo's restaurant chain" },
                { icon: '📊', text: "Plan a $50K campaign for 3 months" },
                { icon: '📄', text: "Generate a proposal for this campaign" }
              ].map((example, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 text-sm px-4 py-3 rounded-xl bg-white hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm cursor-default w-full max-w-sm"
                >
                  <span className="text-lg">{example.icon}</span>
                  <span className="text-slate-600">"{example.text}"</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Start prompt */}
          <p className="text-xs text-slate-400">
            Click "New Chat" to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col font-sans relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag and drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-lg z-20 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white px-6 py-4 rounded-xl shadow-lg border border-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Paperclip className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-emerald-700 font-medium">Drop files to attach</p>
              <p className="text-emerald-600/70 text-sm">PDF, CSV, images, and more</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={SUPPORTED_TYPES.join(',')}
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Attachments bar (shown when there are attachments) */}
      {attachments.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3 flex-wrap max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-slate-500">
              <Paperclip className="h-4 w-4" />
              <span className="text-xs font-medium">Context files</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 flex-wrap">
              {attachments.map(renderAttachmentChip)}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4 pt-8 pb-40" ref={scrollAreaRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">How can I help you today?</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Research brands, discover inventory, plan campaigns, or generate proposals. 
                  Just ask or upload relevant documents to get started.
                </p>
              </div>
            ) : null}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' ? (
                  <div className="flex gap-3 max-w-[85%]">
                    {/* Assistant avatar */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    {/* Message content */}
                    <div className="flex-1 bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100">
                      <MarkdownMessage content={message.content} className="text-sm" />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 max-w-[85%]">
                    {/* Message content */}
                    <div className="bg-slate-800 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                    </div>
                    {/* User avatar */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-slate-500 ml-1">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Floating Input Area */}
        <div className="absolute bottom-4 left-8 right-8 z-10">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Input area */}
            <div className="relative">
              {/* Pending files indicator */}
              {isUploading && (
                <div className="absolute -top-12 left-0 right-0 flex justify-center">
                  <div className="bg-white px-4 py-2 rounded-full shadow-md text-sm flex items-center gap-2 border border-slate-100">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                    <span className="text-slate-600">Uploading files...</span>
                  </div>
                </div>
              )}
              
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Research brands, plan campaigns, generate proposals..."
                  className="min-h-[56px] max-h-[200px] resize-none pl-12 pr-14 py-4 border-0 focus:ring-0 focus-visible:ring-0 bg-transparent"
                  disabled={isLoading}
                />
                
                {/* Paperclip button for file upload */}
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                
                {/* Send button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className={`
                    absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all
                    ${inputValue.trim() && !isLoading
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:shadow-md'
                      : 'bg-slate-100 text-slate-400'
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Hint text */}
              <p className="text-xs text-slate-400 text-center mt-2">
                Press Enter to send • Shift+Enter for new line • Drop files to attach
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

