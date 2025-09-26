import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const Admin = () => {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  );
};

export default Admin;