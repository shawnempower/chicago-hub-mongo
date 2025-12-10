import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssistantManagement } from './AssistantManagement';
import { UserManagement } from './UserManagement';
import { PublicationsImport } from './PublicationsImport';
import SurveyManagement from './SurveyManagement';
import { HubManagement } from './HubManagement';
import { AlgorithmManagement } from './AlgorithmManagement';
import { ActivityLog } from './ActivityLog';
import { PerformanceEntryManagement } from './PerformanceEntryManagement';
import { ProofVerificationQueue } from './ProofVerificationQueue';
import { HubPricingReport } from '@/components/dashboard/HubPricingReport';
import { ErrorBoundary } from '../ErrorBoundary';
import { useHubContext } from '@/contexts/HubContext';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const { selectedHubId } = useHubContext();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage users, hubs, surveys, algorithms, imports, assistant, and activity</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="hubs">Hubs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="proofs">Proofs</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="hub-pricing">Hub Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="hubs">
          <ErrorBoundary>
            <HubManagement />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="performance">
          <ErrorBoundary>
            <PerformanceEntryManagement hubId={selectedHubId || undefined} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="proofs">
          <ErrorBoundary>
            <ProofVerificationQueue hubId={selectedHubId || undefined} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="surveys">
          <ErrorBoundary>
            <SurveyManagement />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="algorithms">
          <ErrorBoundary>
            <AlgorithmManagement />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="import">
          <PublicationsImport />
        </TabsContent>

        <TabsContent value="assistant">
          <AssistantManagement />
        </TabsContent>

        <TabsContent value="activity">
          <ErrorBoundary>
            {selectedHubId ? (
              <ActivityLog hubId={selectedHubId} showFilters={true} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Please select a hub to view activities
              </div>
            )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="hub-pricing">
          <ErrorBoundary>
            <HubPricingReport onBack={() => setActiveTab('hubs')} />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
};