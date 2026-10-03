import { AppShell } from '@/features/shell/AppShell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
      <Toaster position="bottom-right" richColors />
    </ErrorBoundary>
  );
}
