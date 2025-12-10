/**
 * Proof Verification Queue
 * 
 * Admin interface for reviewing and verifying proof of performance uploads.
 * Shows pending proofs with preview and approve/reject actions.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Image, 
  Music, 
  Video, 
  File,
  Download,
  ExternalLink,
  Loader2,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  ProofOfPerformance, 
  ProofFileType,
  PROOF_FILE_TYPE_LABELS,
  formatFileSize,
  VerificationStatus
} from '@/integrations/mongodb/proofOfPerformanceSchema';

interface ProofVerificationQueueProps {
  hubId?: string;
}

export function ProofVerificationQueue({ hubId }: ProofVerificationQueueProps) {
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState<ProofOfPerformance[]>([]);
  const [filteredProofs, setFilteredProofs] = useState<ProofOfPerformance[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState<ProofOfPerformance | null>(null);
  const [verifyAction, setVerifyAction] = useState<'verified' | 'rejected' | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchProofs();
  }, [hubId, statusFilter]);

  useEffect(() => {
    filterProofs();
  }, [proofs, typeFilter, searchQuery]);

  const fetchProofs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch based on status filter
      let url = `${API_BASE_URL}/proof-of-performance`;
      if (statusFilter === 'pending') {
        url = `${API_BASE_URL}/proof-of-performance/verification-queue`;
      } else if (statusFilter !== 'all') {
        url += `?verificationStatus=${statusFilter}`;
      }
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setProofs(data.proofs || []);
      }
    } catch (error) {
      console.error('Error fetching proofs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load proofs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProofs = () => {
    let filtered = [...proofs];
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.fileType === typeFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.publicationName.toLowerCase().includes(query) ||
        p.fileName.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    setFilteredProofs(filtered);
  };

  const handleVerify = async () => {
    if (!selectedProof || !verifyAction) return;
    
    setVerifying(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/proof-of-performance/${selectedProof._id}/verify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: verifyAction,
          notes: verifyNotes || undefined,
        }),
      });
      
      if (res.ok) {
        toast({
          title: verifyAction === 'verified' ? 'Proof Verified' : 'Proof Rejected',
          description: `The proof has been ${verifyAction}`,
        });
        setSelectedProof(null);
        setVerifyAction(null);
        setVerifyNotes('');
        fetchProofs();
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update verification status',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const getFileIcon = (proof: ProofOfPerformance) => {
    const mime = proof.mimeType.toLowerCase();
    if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (mime.startsWith('audio/')) return <Music className="w-5 h-5 text-purple-500" />;
    if (mime.startsWith('video/')) return <Video className="w-5 h-5 text-red-500" />;
    if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-700 border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-0">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-0">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const canPreview = (proof: ProofOfPerformance) => {
    return proof.mimeType.startsWith('image/') || proof.mimeType === 'application/pdf';
  };

  const pendingCount = proofs.filter(p => p.verificationStatus === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Proof Verification Queue</h2>
          <p className="text-muted-foreground">
            Review and verify proof of performance submissions
          </p>
        </div>
        <div className="flex items-center gap-4">
          {pendingCount > 0 && statusFilter !== 'pending' && (
            <Badge variant="destructive" className="text-sm">
              {pendingCount} pending
            </Badge>
          )}
          <Button variant="outline" onClick={fetchProofs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by publication or filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(PROOF_FILE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="text-sm text-muted-foreground">
              {filteredProofs.length} proofs
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proofs Grid */}
      {filteredProofs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mb-4 opacity-50" />
            <p>
              {statusFilter === 'pending' 
                ? 'No pending proofs to review' 
                : 'No proofs found matching your filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProofs.map((proof) => (
            <Card key={proof._id?.toString()} className="overflow-hidden">
              {/* Preview Area */}
              <div className="h-40 bg-muted flex items-center justify-center relative">
                {proof.mimeType.startsWith('image/') ? (
                  <img
                    src={proof.fileUrl}
                    alt={proof.fileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    {getFileIcon(proof)}
                    <span className="text-xs mt-2">
                      {PROOF_FILE_TYPE_LABELS[proof.fileType]}
                    </span>
                  </div>
                )}
                
                <div className="absolute top-2 right-2">
                  {getStatusBadge(proof.verificationStatus)}
                </div>
              </div>
              
              <CardContent className="p-4 space-y-3">
                {/* File Info */}
                <div>
                  <p className="font-medium truncate" title={proof.fileName}>
                    {proof.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(proof.fileSize)} • {PROOF_FILE_TYPE_LABELS[proof.fileType]}
                  </p>
                </div>
                
                {/* Publication */}
                <div className="text-sm">
                  <span className="text-muted-foreground">Publication: </span>
                  <span className="font-medium">{proof.publicationName}</span>
                </div>
                
                {/* Run Date */}
                {proof.runDate && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Run date: </span>
                    <span>{format(new Date(proof.runDate), 'MMM d, yyyy')}</span>
                    {proof.runDateEnd && (
                      <span> - {format(new Date(proof.runDateEnd), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                )}
                
                {/* Uploaded */}
                <div className="text-xs text-muted-foreground">
                  Uploaded {formatDistanceToNow(new Date(proof.uploadedAt), { addSuffix: true })}
                </div>
                
                {/* Verification Notes */}
                {proof.verificationNotes && (
                  <div className="text-sm bg-muted p-2 rounded">
                    <span className="text-muted-foreground">Notes: </span>
                    {proof.verificationNotes}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a href={proof.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </a>
                  </Button>
                  
                  {proof.verificationStatus === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedProof(proof);
                          setVerifyAction('verified');
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedProof(proof);
                          setVerifyAction('rejected');
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Verification Dialog */}
      <Dialog 
        open={!!selectedProof && !!verifyAction} 
        onOpenChange={() => {
          setSelectedProof(null);
          setVerifyAction(null);
          setVerifyNotes('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyAction === 'verified' ? 'Verify Proof' : 'Reject Proof'}
            </DialogTitle>
            <DialogDescription>
              {verifyAction === 'verified'
                ? 'Confirm that this proof of performance is valid.'
                : 'Reject this proof and provide a reason.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedProof && (
            <div className="space-y-4">
              {/* Proof Summary */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                {getFileIcon(selectedProof)}
                <div>
                  <p className="font-medium">{selectedProof.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProof.publicationName} • {PROOF_FILE_TYPE_LABELS[selectedProof.fileType]}
                  </p>
                </div>
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Label>
                  Notes {verifyAction === 'rejected' && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  placeholder={
                    verifyAction === 'verified'
                      ? 'Optional notes...'
                      : 'Please provide a reason for rejection...'
                  }
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              {verifyAction === 'rejected' && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Rejection notes are required and will be visible to the publication.</span>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedProof(null);
                setVerifyAction(null);
                setVerifyNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={verifyAction === 'verified' ? 'default' : 'destructive'}
              onClick={handleVerify}
              disabled={verifying || (verifyAction === 'rejected' && !verifyNotes.trim())}
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : verifyAction === 'verified' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {verifyAction === 'verified' ? 'Verify' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProofVerificationQueue;
