import { useState } from 'react';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Header } from '@/components/Header';
import SurveyForm from '@/components/SurveyForm';

const Admin = () => {
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Header 
          onSurveyClick={() => setIsSurveyOpen(true)}
          showDashboardNav={false}
        />
        
        <main className="container mx-auto px-6 py-8">
          <AdminDashboard />
        </main>
        
        <SurveyForm open={isSurveyOpen} onOpenChange={setIsSurveyOpen} />
      </div>
    </AdminRoute>
  );
};

export default Admin;