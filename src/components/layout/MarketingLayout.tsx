import { AppShell } from "./AppShell";

interface MarketingLayoutProps {
  children: React.ReactNode;
  onViewPackage?: (packageId: number) => void;
}

export function MarketingLayout({ children, onViewPackage }: MarketingLayoutProps) {
  return (
    <AppShell showHeaderFooter={true} onViewPackage={onViewPackage}>
      {children}
    </AppShell>
  );
}