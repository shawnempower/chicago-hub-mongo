import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, FileText, Megaphone, Circle, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ConversationListItem } from '@/api/messages';
import type { ConversationType } from '@/integrations/mongodb/messagingSchema';

// ===== Props =====

interface ConversationListProps {
  conversations: ConversationListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  userType: 'hub' | 'publication';
}

// ===== Type badge config =====

const typeBadgeConfig: Record<ConversationType, { label: string; className: string; Icon: typeof MessageSquare }> = {
  direct: {
    label: 'Direct',
    className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
    Icon: MessageSquare,
  },
  order: {
    label: 'Order',
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    Icon: FileText,
  },
  broadcast: {
    label: 'Broadcast',
    className: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
    Icon: Megaphone,
  },
};

// ===== Helpers =====

function getParticipantLabel(
  conv: ConversationListItem,
  userType: 'hub' | 'publication',
): string {
  const others = conv.participants.filter((p) => p.userType !== userType);

  if (others.length === 0) return 'Unknown';

  if (userType === 'hub') {
    // Hub user sees publication name(s)
    return others
      .map((p) => p.publicationName || p.name)
      .join(', ');
  }

  // Publication user sees hub user name(s)
  return others.map((p) => p.name || 'Hub').join(', ');
}

// ===== Loading skeleton =====

function ConversationSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-border p-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 rounded-full bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ===== Empty state =====

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <MessageSquare className="h-10 w-10 opacity-40" />
      <p className="text-sm font-medium">No conversations yet</p>
      <p className="text-xs">Start a new conversation to get going.</p>
    </div>
  );
}

// ===== Main component =====

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading = false,
  userType,
}: ConversationListProps) {
  if (loading) {
    return (
      <ScrollArea className="h-full">
        <ConversationSkeleton />
      </ScrollArea>
    );
  }

  if (conversations.length === 0) {
    return (
      <ScrollArea className="h-full">
        <EmptyState />
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-2">
        {conversations.map((conv) => {
          const id = String(conv._id);
          const isSelected = id === selectedId;
          const { label, className: badgeClass, Icon } = typeBadgeConfig[conv.type];
          const participantLabel = getParticipantLabel(conv, userType);

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`
                group relative flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5
                text-left transition-colors
                ${isSelected
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-transparent hover:border-border hover:bg-accent/50'
                }
              `}
            >
              {/* Top row: type badge + timestamp */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {conv.hasUnreadMessages && (
                    <Circle className="h-2.5 w-2.5 flex-shrink-0 fill-blue-500 text-blue-500" />
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 leading-4 ${badgeClass}`}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {label}
                  </Badge>
                </div>

                <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                </span>
              </div>

              {/* Subject / Participant row */}
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span
                  className={`truncate text-sm ${
                    conv.hasUnreadMessages ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                  }`}
                >
                  {conv.subject || participantLabel}
                </span>
              </div>

              {/* Last message preview */}
              <p className="truncate text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium">{conv.lastMessageSender}:</span>{' '}
                {conv.lastMessagePreview}
              </p>

              {/* Bottom row: participant names / hub name + message count */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  {conv.subject && (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {participantLabel}
                    </span>
                  )}
                  {userType === 'publication' && conv.hubName && (
                    <>
                      {conv.subject && <span className="text-[11px] text-muted-foreground">·</span>}
                      <span className="truncate text-[11px] text-muted-foreground/70 italic">
                        {conv.hubName}
                      </span>
                    </>
                  )}
                  {!conv.subject && !(userType === 'publication' && conv.hubName) && <span />}
                </div>

                <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                  {conv.messageCount} {conv.messageCount === 1 ? 'message' : 'messages'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
