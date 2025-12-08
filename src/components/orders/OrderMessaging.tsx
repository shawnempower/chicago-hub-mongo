import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, User, Building2, Paperclip, FileText, Image, X, Download } from 'lucide-react';

interface MessageAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

interface Message {
  id: string;
  content: string;
  sender: 'hub' | 'publication';
  senderName: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

interface OrderMessagingProps {
  publicationNotes?: string;
  hubNotes?: string;
  messages?: Message[];
  onSendMessage?: (message: string, attachments?: MessageAttachment[]) => Promise<void>;
  userType: 'hub' | 'publication';
  readOnly?: boolean;
  className?: string;
}

export function OrderMessaging({
  publicationNotes,
  hubNotes,
  messages = [],
  onSendMessage,
  userType,
  readOnly = false,
  className = ''
}: OrderMessagingProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !onSendMessage) return;

    setSending(true);
    try {
      await onSendMessage(newMessage.trim(), pendingAttachments.length > 0 ? pendingAttachments : undefined);
      setNewMessage('');
      setPendingAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // For now, we'll just create local URLs. In production, these would be uploaded first.
    // This is a simplified approach - files need to be uploaded to get real URLs
    const newAttachments: MessageAttachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Create a temporary preview URL
      const url = URL.createObjectURL(file);
      newAttachments.push({
        fileName: file.name,
        fileUrl: url,
        fileType: file.type,
        fileSize: file.size
      });
    }

    setPendingAttachments(prev => [...prev, ...newAttachments]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const renderAttachment = (attachment: MessageAttachment, isCurrentUser: boolean) => (
    <a
      key={attachment.fileUrl}
      href={attachment.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 p-2 rounded text-xs ${
        isCurrentUser 
          ? 'bg-blue-500/30 hover:bg-blue-500/40' 
          : 'bg-gray-200 hover:bg-gray-300'
      }`}
    >
      {getFileIcon(attachment.fileType)}
      <span className="truncate max-w-[150px]">{attachment.fileName}</span>
      {attachment.fileSize && (
        <span className="text-xs opacity-70">({formatFileSize(attachment.fileSize)})</span>
      )}
      <Download className="h-3 w-3 ml-auto" />
    </a>
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4" />
          Messages & Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pinned notes sections */}
        {publicationNotes && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {userType === 'hub' ? 'Publication Note' : 'Your Pinned Note'}
              </span>
            </div>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">{publicationNotes}</p>
          </div>
        )}

        {hubNotes && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                {userType === 'publication' ? 'Hub Note' : 'Your Pinned Note'}
              </span>
            </div>
            <p className="text-sm text-purple-800 whitespace-pre-wrap">{hubNotes}</p>
          </div>
        )}

        {/* Message thread */}
        {messages.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50/50">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide sticky top-0 bg-gray-50/90 py-1">
              Conversation ({messages.length} message{messages.length !== 1 ? 's' : ''})
            </div>
            {messages.map((message) => {
              const isCurrentUser = message.sender === userType;
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === 'hub' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    {message.sender === 'hub' ? (
                      <Building2 className="h-4 w-4 text-purple-600" />
                    ) : (
                      <User className="h-4 w-4 text-blue-600" />
                    )}
                  </div>

                  {/* Message content */}
                  <div className={`flex-1 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col max-w-[80%]`}>
                    <div className={`flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-medium text-gray-700">
                        {message.senderName}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          message.sender === 'hub' 
                            ? 'border-purple-300 text-purple-700' 
                            : 'border-blue-300 text-blue-700'
                        }`}
                      >
                        {message.sender === 'hub' ? 'Hub' : 'Publication'}
                      </Badge>
                    </div>
                    <div
                      className={`mt-1 p-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border text-gray-900'
                      }`}
                    >
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className={`mt-2 space-y-1 ${message.content ? 'pt-2 border-t border-current/20' : ''}`}>
                          {message.attachments.map(att => renderAttachment(att, isCurrentUser))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !publicationNotes && !hubNotes && (
          <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50/50">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            {!readOnly && onSendMessage && (
              <p className="text-xs mt-1">Start a conversation below</p>
            )}
          </div>
        )}

        {/* Input for new message */}
        {!readOnly && onSendMessage && (
          <div className="space-y-3 pt-4 border-t">
            {/* Pending attachments */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map((att, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"
                  >
                    {getFileIcon(att.fileType)}
                    <span className="truncate max-w-[100px]">{att.fileName}</span>
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              placeholder={`Type your message...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                >
                  <Paperclip className="h-4 w-4 mr-1" />
                  Attach
                </Button>
                <span className="text-xs text-gray-500">
                  Press ⌘+Enter to send
                </span>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && pendingAttachments.length === 0) || sending}
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
