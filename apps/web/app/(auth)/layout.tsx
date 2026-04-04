import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo-192.png"
            alt="SquadSwarm"
            width={80}
            height={80}
            className="rounded-xl mb-4"
            priority
          />
          <h1 className="text-2xl font-bold text-text-primary">SquadSwarm</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
