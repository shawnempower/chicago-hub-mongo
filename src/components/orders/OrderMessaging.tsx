import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, User, Building2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'hub' | 'publication';
  senderName: string;
  timestamp: Date;
}

interface OrderMessagingProps {
  publicationNotes?: string;
  hubNotes?: string;
  messages?: Message[];
  onSendMessage?: (message: string, type: 'hub' | 'publication') => void;
  userType: 'hub' | 'publication'; // Who is viewing this
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !onSendMessage) return;

    setSending(true);
    try {
      await onSendMessage(newMessage, userType);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Notes & Communication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Static notes sections */}
        {userType === 'hub' && publicationNotes && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Publication Notes</span>
            </div>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">{publicationNotes}</p>
          </div>
        )}

        {userType === 'publication' && hubNotes && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Hub Notes</span>
            </div>
            <p className="text-sm text-purple-800 whitespace-pre-wrap">{hubNotes}</p>
          </div>
        )}

        {/* Message thread */}
        {messages.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Message History
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
                  <div className={`flex-1 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700">
                        {message.senderName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {message.sender === 'hub' ? 'Hub' : 'Publication'}
                      </Badge>
                    </div>
                    <div
                      className={`mt-1 p-3 rounded-lg max-w-md ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

        {/* Input for new message */}
        {!readOnly && onSendMessage && (
          <div className="space-y-2 pt-4 border-t">
            <Textarea
              placeholder={`Add a note or message...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
              disabled={sending}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        )}

        {messages.length === 0 && !publicationNotes && !hubNotes && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No messages yet</p>
            {!readOnly && (
              <p className="text-xs mt-1">Start a conversation by sending a message</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

