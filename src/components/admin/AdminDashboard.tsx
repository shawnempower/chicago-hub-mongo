import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssistantManagement } from './AssistantManagement';
import { UserManagement } from './UserManagement';
import { PublicationsImport } from './PublicationsImport';
import SurveyManagement from './SurveyManagement';
import { ErrorBoundary } from '../ErrorBoundary';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage users, surveys, imports, and assistant</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="surveys">
          <ErrorBoundary>
            <SurveyManagement />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="import">
          <PublicationsImport />
        </TabsContent>

        <TabsContent value="assistant">
          <AssistantManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};