import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Mail, Paperclip, X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/api/client';
import { messagesApi } from '@/api/messages';
import type { DeliveryChannel, MessageAttachment } from '@/integrations/mongodb/messagingSchema';

interface Publication {
  id: number;
  name: string;
}

interface HubOption {
  hubId: string;
  name: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
}

type RecipientType = 'publication' | 'team_member';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubId: string;
  hubIds?: string[];
  userType: 'hub' | 'publication';
  onCreated: (conversationId: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  hubId,
  hubIds,
  userType,
  onCreated,
}: NewConversationDialogProps) {
  const [subject, setSubject] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('publication');
  const [selectedPublicationId, setSelectedPublicationId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedHubId, setSelectedHubId] = useState<string>(hubId);
  const [message, setMessage] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>('in_app');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [hubs, setHubs] = useState<HubOption[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [loadingHubs, setLoadingHubs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Multi-hub support for publication users
  const allHubIds = hubIds && hubIds.length > 0 ? hubIds : (hubId ? [hubId] : []);
  const hasMultipleHubs = userType === 'publication' && allHubIds.length > 1;

  // Fetch hub names for multi-hub publication users
  useEffect(() => {
    if (!open || !hasMultipleHubs) return;
    let cancelled = false;

    async function fetchHubs() {
      setLoadingHubs(true);
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/hubs`);
        if (!response.ok) throw new Error('Failed to fetch hubs');
        const data = await response.json();
        if (!cancelled) {
          const allHubs: any[] = data.hubs ?? data ?? [];
          setHubs(
            allHubs
              .filter((h: any) => allHubIds.includes(h.hubId || String(h._id)))
              .map((h: any) => ({
                hubId: h.hubId || String(h._id),
                name: h.basicInfo?.name || h.name || `Hub ${h.hubId}`,
              }))
          );
        }
      } catch (err) {
        console.error('Error fetching hubs:', err);
        if (!cancelled) setHubs(allHubIds.map(id => ({ hubId: id, name: `Hub ${id}` })));
      } finally {
        if (!cancelled) setLoadingHubs(false);
      }
    }

    fetchHubs();
    return () => { cancelled = true; };
  }, [open, hasMultipleHubs, allHubIds.join(',')]);

  // Fetch publications for hub users
  useEffect(() => {
    if (!open || userType !== 'hub' || recipientType !== 'publication') return;
    let cancelled = false;

    async function fetchPublications() {
      setLoadingPublications(true);
      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/publications?hubId=${encodeURIComponent(selectedHubId)}`
        );
        if (!response.ok) throw new Error('Failed to fetch publications');
        const data = await response.json();
        if (!cancelled) {
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
    return () => { cancelled = true; };
  }, [open, selectedHubId, userType, recipientType]);

  // Fetch admin users for hub users messaging team members
  useEffect(() => {
    if (!open || userType !== 'hub' || recipientType !== 'team_member') return;
    let cancelled = false;

    async function fetchAdmins() {
      setLoadingAdmins(true);
      try {
        // Fetch admin users from the messaging endpoint
        const response = await authenticatedFetch(`${API_BASE_URL}/messages/admin-users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        if (!cancelled) {
          const users: any[] = data.users ?? data ?? [];
          setAdminUsers(
            users.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching admin users:', err);
      } finally {
        if (!cancelled) setLoadingAdmins(false);
      }
    }

    fetchAdmins();
    return () => { cancelled = true; };
  }, [open, userType, recipientType]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSubject('');
      setRecipientType('publication');
      setSelectedPublicationId('');
      setSelectedUserId('');
      setSelectedHubId(hubId || allHubIds[0] || '');
      setMessage('');
      setDeliveryChannel('in_app');
      setError(null);
      setPendingFiles([]);
    }
  }, [open]);

  const effectiveHubId = userType === 'publication' ? selectedHubId : hubId;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_FILE_SIZE) {
        alert(`"${f.name}" exceeds the 10MB limit and was not added.`);
        continue;
      }
      newFiles.push(f);
    }

    setPendingFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_FILES) {
        alert(`You can attach up to ${MAX_FILES} files per message.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() && pendingFiles.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      // Upload pending files first
      let attachments: MessageAttachment[] | undefined;
      if (pendingFiles.length > 0) {
        attachments = await Promise.all(
          pendingFiles.map((f) => messagesApi.uploadAttachment(f))
        );
      }

      const result = await messagesApi.createConversation({
        hubId: effectiveHubId,
        subject: subject.trim() || undefined,
        recipientPublicationId:
          userType === 'hub' && recipientType === 'publication'
            ? Number(selectedPublicationId)
            : undefined,
        recipientUserId:
          userType === 'hub' && recipientType === 'team_member'
            ? selectedUserId
            : undefined,
        initialMessage: message.trim() || '(attachment)',
        deliveryChannel: userType === 'hub' ? deliveryChannel : undefined,
        attachments,
      });

      const conversationId =
        result.conversation._id?.toString() ?? result.conversation.toString();

      onCreated(conversationId);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create conversation';
      setError(msg);
      console.error('Failed to create conversation:', err);
    } finally {
      setSubmitting(false);
    }
  }

  // Validation
  const hasContent = message.trim().length > 0 || pendingFiles.length > 0;
  let canSubmit = hasContent;
  if (userType === 'hub') {
    if (recipientType === 'publication') canSubmit = canSubmit && selectedPublicationId !== '';
    if (recipientType === 'team_member') canSubmit = canSubmit && selectedUserId !== '';
  } else {
    canSubmit = canSubmit && effectiveHubId !== '';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            New Conversation
          </DialogTitle>
          <DialogDescription>
            {userType === 'hub'
              ? 'Start a direct conversation.'
              : 'Send a message to the hub team.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">

          {/* Hub user: recipient type toggle + selector */}
          {userType === 'hub' && (
            <>
              <div className="space-y-2">
                <Label>Send to</Label>
                <Tabs
                  value={recipientType}
                  onValueChange={(v) => {
                    setRecipientType(v as RecipientType);
                    setSelectedPublicationId('');
                    setSelectedUserId('');
                  }}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="publication" className="flex-1">
                      Publication
                    </TabsTrigger>
                    <TabsTrigger value="team_member" className="flex-1">
                      Admin
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {recipientType === 'publication' ? (
                <div className="space-y-2">
                  <Label htmlFor="publication">To</Label>
                  <Select
                    value={selectedPublicationId}
                    onValueChange={setSelectedPublicationId}
                    disabled={loadingPublications}
                  >
                    <SelectTrigger id="publication">
                      <SelectValue
                        placeholder={
                          loadingPublications ? 'Loading...' : 'Select a publication'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {publications.map((pub) => (
                        <SelectItem key={pub.id} value={String(pub.id)}>
                          {pub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="admin-user">To</Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    disabled={loadingAdmins}
                  >
                    <SelectTrigger id="admin-user">
                      <SelectValue
                        placeholder={
                          loadingAdmins ? 'Loading...' : 'Select an admin'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {adminUsers.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.name}
                          <span className="ml-2 text-muted-foreground text-xs">
                            {admin.email}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Publication user: hub selector or static label */}
          {userType === 'publication' && hasMultipleHubs && (
            <div className="space-y-2">
              <Label htmlFor="hub-select">To</Label>
              <Select
                value={selectedHubId}
                onValueChange={setSelectedHubId}
                disabled={loadingHubs || submitting}
              >
                <SelectTrigger id="hub-select">
                  <SelectValue
                    placeholder={loadingHubs ? 'Loading...' : 'Select a hub to message'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {hubs.map((hub) => (
                    <SelectItem key={hub.hubId} value={hub.hubId}>
                      {hub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {userType === 'publication' && !hasMultipleHubs && (
            <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              To: <span className="font-medium text-foreground">Hub Team</span>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Subject <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="subject"
              placeholder="Enter a subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.html,.htm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || pendingFiles.length >= MAX_FILES}
            >
              <Paperclip className="mr-1.5 h-4 w-4" />
              Attach Files
            </Button>
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pendingFiles.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <span className="text-[10px]">({(f.size / 1024).toFixed(0)}KB)</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-background"
                      disabled={submitting}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Channel (hub only) */}
          {userType === 'hub' && (
            <div className="space-y-2">
              <Label>Delivery Channel</Label>
              <RadioGroup
                value={deliveryChannel}
                onValueChange={(val) => setDeliveryChannel(val as DeliveryChannel)}
                className="flex gap-4"
                disabled={submitting}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="in_app" id="channel-in-app" />
                  <Label htmlFor="channel-in-app" className="font-normal cursor-pointer">
                    In-App
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="email" id="channel-email" />
                  <Label htmlFor="channel-email" className="font-normal cursor-pointer">
                    Email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="both" id="channel-both" />
                  <Label htmlFor="channel-both" className="font-normal cursor-pointer">
                    Both
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

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
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
