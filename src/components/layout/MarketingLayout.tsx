import { AppShell } from "./AppShell";

interface MarketingLayoutProps {
  children: React.ReactNode;
  onViewPackage?: (packageId: number) => void;
  showHeaderFooter?: boolean;
}

export function MarketingLayout({ children, onViewPackage, showHeaderFooter = true }: MarketingLayoutProps) {
  return (
    <AppShell showHeaderFooter={showHeaderFooter} onViewPackage={onViewPackage}>
      {children}
    </AppShell>
  );
}