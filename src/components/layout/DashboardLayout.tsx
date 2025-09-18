import { AppShell } from "./AppShell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onViewPackage?: (packageId: number) => void;
}

export function DashboardLayout({ children, onViewPackage }: DashboardLayoutProps) {
  return (
    <AppShell showHeaderFooter={true} onViewPackage={onViewPackage}>
      {children}
    </AppShell>
  );
}