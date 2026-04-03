import { Sidebar } from '../../components/sidebar';
import { UserMenu } from '../../components/user-menu';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-white flex items-center justify-end px-6 shrink-0">
          <UserMenu />
        </header>
        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
