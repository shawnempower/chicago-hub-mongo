import { useState, useEffect, useMemo } from 'react';
import { Megaphone, Send, Loader2, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';
import { messagesApi } from '@/api/messages';
import type { DeliveryChannel } from '@/integrations/mongodb/messagingSchema';

interface Publication {
  id: number;
  name: string;
}

interface BroadcastComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubId: string;
  onCreated: () => void;
}

export function BroadcastComposer({
  open,
  onOpenChange,
  hubId,
  onCreated,
}: BroadcastComposerProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>('in_app');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch publications
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function fetchPublications() {
      setLoadingPublications(true);
      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/publications?hubId=${encodeURIComponent(hubId)}`
        );
        if (!response.ok) throw new Error('Failed to fetch publications');
        const data = await response.json();
        if (!cancelled) {
          // API returns either array directly or { data: [...] } for paginated
          const raw: any[] = Array.isArray(data) ? data : (data.data ?? data.publications ?? []);
          setPublications(
            raw.map((p: any) => ({
              id: p.publicationId ?? p.id,
              name: p.basicInfo?.publicationName ?? p.basicInfo?.name ?? p.name ?? `Publication #${p.publicationId}`,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching publications:', err);
      } finally {
        if (!cancelled) setLoadingPublications(false);
      }
    }

    fetchPublications();
    return () => {
      cancelled = true;
    };
  }, [open, hubId]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
      setSelectedIds(new Set());
      setDeliveryChannel('in_app');
    }
  }, [open]);

  const allSelected = useMemo(
    () => publications.length > 0 && selectedIds.size === publications.length,
    [publications, selectedIds]
  );

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(publications.map((p) => p.id)));
    }
  }

  function togglePublication(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!subject.trim() || !message.trim() || selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const result = await messagesApi.createBroadcast({
        hubId,
        subject: subject.trim(),
        publicationIds: Array.from(selectedIds),
        message: message.trim(),
        deliveryChannel,
      });

      toast({
        title: 'Broadcast sent',
        description: `Created ${result.conversationCount} conversation${
          result.conversationCount !== 1 ? 's' : ''
        } successfully.`,
      });

      onCreated();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create broadcast:', err);
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to send broadcast.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    selectedIds.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            New Broadcast
          </DialogTitle>
          <DialogDescription>
            Send a message to multiple publications at once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="broadcast-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="broadcast-subject"
              placeholder="Enter a subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          {/* Publication Multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Publications <span className="text-destructive">*</span>
              </Label>
              {selectedIds.size > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} of {publications.length} selected
                </span>
              )}
            </div>

            <div className="rounded-md border">
              {/* Select All toggle */}
              <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={submitting || loadingPublications}
                />
                <Label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Select All
                </Label>
              </div>

              <ScrollArea className="h-[180px]">
                {loadingPublications ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading publications...
                  </div>
                ) : publications.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    No publications found.
                  </div>
                ) : (
                  <div className="p-1">
                    {publications.map((pub) => (
                      <div
                        key={pub.id}
                        className="flex items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`pub-${pub.id}`}
                          checked={selectedIds.has(pub.id)}
                          onCheckedChange={() => togglePublication(pub.id)}
                          disabled={submitting}
                        />
                        <Label
                          htmlFor={`pub-${pub.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {pub.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="broadcast-message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="broadcast-message"
              placeholder="Write your broadcast message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Delivery Channel */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Delivery Channel
            </Label>
            <RadioGroup
              value={deliveryChannel}
              onValueChange={(val) => setDeliveryChannel(val as DeliveryChannel)}
              className="flex gap-4"
              disabled={submitting}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="in_app" id="bc-channel-in-app" />
                <Label htmlFor="bc-channel-in-app" className="font-normal cursor-pointer">
                  In-App
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="email" id="bc-channel-email" />
                <Label htmlFor="bc-channel-email" className="font-normal cursor-pointer">
                  Email
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="both" id="bc-channel-both" />
                <Label htmlFor="bc-channel-both" className="font-normal cursor-pointer">
                  Both
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Broadcast
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
