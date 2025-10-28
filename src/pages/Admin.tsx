import { useState } from 'react';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Header } from '@/components/Header';
import { AssistantModal } from '@/components/AssistantModal';
import SurveyForm from '@/components/SurveyForm';

const Admin = () => {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Header 
          onAssistantClick={() => setIsAssistantOpen(true)}
          onSurveyClick={() => setIsSurveyOpen(true)}
          showDashboardNav={false}
        />
        
        <main className="container mx-auto px-6 py-8">
          <AdminDashboard />
        </main>

        <AssistantModal 
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />
        
        <SurveyForm open={isSurveyOpen} onOpenChange={setIsSurveyOpen} />
      </div>
    </AdminRoute>
  );
};

export default Admin;