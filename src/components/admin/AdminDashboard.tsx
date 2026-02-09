import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssistantManagement } from './AssistantManagement';
import { UserManagement } from './UserManagement';
import { PublicationsImport } from './PublicationsImport';
import SurveyManagement from './SurveyManagement';
import { HubManagement } from './HubManagement';
import { AlgorithmManagement } from './AlgorithmManagement';
import { ActivityLog } from './ActivityLog';
import { PlatformBillingDashboard } from './PlatformBillingDashboard';
import { ErrorBoundary } from '../ErrorBoundary';
import { useHubContext } from '@/contexts/HubContext';

/** Special hubId for platform-wide auth events (login, logout, password reset) */
export const PLATFORM_ACTIVITY_HUB_ID = '__platform';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const { selectedHubId, setSelectedHubId, hubs } = useHubContext();
  // Default Activity tab to Platform so login/password reset events are visible
  const [activityScope, setActivityScope] = useState<'hub' | 'platform'>('platform');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage users, hubs, surveys, algorithms, imports, and system settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="hubs">Hubs</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="hubs">
          <ErrorBoundary>
            <HubManagement />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="billing">
          <ErrorBoundary>
            <PlatformBillingDashboard />
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
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">View:</span>
                <Select
                  value={activityScope === 'platform' ? PLATFORM_ACTIVITY_HUB_ID : (selectedHubId ?? '')}
                  onValueChange={(value) => {
                    if (!value) return;
                    if (value === PLATFORM_ACTIVITY_HUB_ID) {
                      setActivityScope('platform');
                    } else {
                      setActivityScope('hub');
                      if (value) setSelectedHubId(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PLATFORM_ACTIVITY_HUB_ID}>
                      Platform — logins, password resets
                    </SelectItem>
                    {hubs.map((hub) => (
                      <SelectItem key={hub.hubId} value={hub.hubId}>
                        {hub.name ?? hub.hubId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activityScope === 'platform' && (
                  <span className="text-xs text-muted-foreground">Logins, logouts, and password resets</span>
                )}
              </div>
              {activityScope === 'platform' ? (
                <ActivityLog hubId={PLATFORM_ACTIVITY_HUB_ID} showFilters={true} />
              ) : selectedHubId ? (
                <ActivityLog hubId={selectedHubId} showFilters={true} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a hub above or choose &quot;Platform&quot; to view login and password reset events.
                </div>
              )}
            </div>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
};