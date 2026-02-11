import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Send,
  Pin,
  MailCheck,
  MailX,
  Paperclip,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

import { messagesApi } from '@/api/messages';
import type {
  ConversationDocument,
  ConversationMessage,
  DeliveryChannel,
} from '@/integrations/mongodb/messagingSchema';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ===== Props =====

interface ConversationThreadProps {
  conversationId: string;
  userType: 'hub' | 'publication';
}

// ===== Delivery channel options =====

const DELIVERY_CHANNELS: { value: DeliveryChannel; label: string }[] = [
  { value: 'in_app', label: 'In-App' },
  { value: 'email', label: 'Email' },
  { value: 'both', label: 'Both' },
];

// ===== Helpers =====

function relativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

function typeBadgeVariant(type: string) {
  switch (type) {
    case 'order':
      return 'default';
    case 'broadcast':
      return 'secondary';
    default:
      return 'outline';
  }
}

// ===== Component =====

export function ConversationThread({
  conversationId,
  userType,
}: ConversationThreadProps) {
  const [conversation, setConversation] = useState<ConversationDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messageText, setMessageText] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>('in_app');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ----- Fetch conversation -----

  const fetchConversation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { conversation: data } = await messagesApi.getConversation(conversationId);
      setConversation(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // ----- Auto-scroll to bottom on new messages -----

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages?.length]);

  // ----- Send message -----

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !conversation) return;

    setSending(true);
    try {
      const { message: sentMessage } = await messagesApi.sendMessage(conversationId, {
        content: trimmed,
        deliveryChannel: userType === 'hub' ? deliveryChannel : undefined,
      });

      // Optimistic update — append the returned message (or a local stub)
      if (sentMessage) {
        setConversation((prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, sentMessage] }
            : prev
        );
      }

      setMessageText('');
      textareaRef.current?.focus();
    } catch {
      // Could surface a toast here
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // ----- Derived data -----

  const pinnedNotes =
    conversation?.messages.filter((m) => m.messageType === 'pinned_note') ?? [];
  const regularMessages =
    conversation?.messages.filter((m) => m.messageType === 'message') ?? [];
  const participantNames =
    conversation?.participants.map((p) => p.name).join(', ') ?? '';

  // ----- Loading state -----

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ----- Error state -----

  if (error || !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>{error ?? 'Conversation not found'}</p>
        <Button variant="outline" size="sm" onClick={fetchConversation}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border">
      {/* ===== Header ===== */}
      <CardHeader className="flex-none space-y-1 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold leading-tight">
                {conversation.subject || 'Conversation'}
              </h2>
              <Badge variant={typeBadgeVariant(conversation.type)} className="shrink-0 capitalize">
                {conversation.type}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">{participantNames}</p>
          </div>
        </div>
      </CardHeader>

      {/* ===== Messages area ===== */}
      <ScrollArea className="flex-1" viewportRef={scrollRef}>
        <div className="flex flex-col gap-1 p-4">
          {/* --- Pinned notes --- */}
          {pinnedNotes.length > 0 && (
            <div className="mb-3 space-y-2">
              {pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/40"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <Pin className="h-3 w-3" />
                    Pinned by {note.pinnedBy ?? note.senderName}
                    <span className="ml-auto text-[10px] font-normal text-amber-600/70 dark:text-amber-500/60">
                      {relativeTime(note.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
                    {note.content}
                  </p>
                </div>
              ))}
              <Separator className="mt-2" />
            </div>
          )}

          {/* --- Chat bubbles --- */}
          {regularMessages.map((msg) => {
            const isOwn = msg.sender === userType;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
              >
                <div className={`max-w-[75%] space-y-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Sender name */}
                  <p
                    className={`px-1 text-[11px] font-medium text-muted-foreground ${
                      isOwn ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.senderName}
                  </p>

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                      isOwn
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md bg-muted text-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                      {msg.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Paperclip className="h-3 w-3" />
                          {att.fileName}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Meta line: timestamp + email status */}
                  <div
                    className={`flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground/70 ${
                      isOwn ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{relativeTime(msg.timestamp)}</span>
                    {msg.emailStatus && (
                      <>
                        <span>·</span>
                        {msg.emailStatus.error ? (
                          <span className="inline-flex items-center gap-0.5 text-destructive">
                            <MailX className="h-3 w-3" />
                            Email failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                            <MailCheck className="h-3 w-3" />
                            Sent via email
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* ===== Composer ===== */}
      <CardContent className="flex-none border-t p-3">
        {/* Delivery channel toggle (hub users only) */}
        {userType === 'hub' && (
          <div className="mb-2 flex items-center gap-1">
            <span className="mr-1.5 text-xs text-muted-foreground">Send via:</span>
            <div className="inline-flex rounded-lg border bg-muted p-0.5">
              {DELIVERY_CHANNELS.map((ch) => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => setDeliveryChannel(ch.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    deliveryChannel === ch.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (⌘+Enter to send)"
            className="min-h-[42px] max-h-[160px] resize-none text-sm"
            rows={1}
            disabled={sending}
          />
          <Button
            size="icon"
            className="h-[42px] w-[42px] shrink-0"
            disabled={sending || !messageText.trim()}
            onClick={handleSend}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
