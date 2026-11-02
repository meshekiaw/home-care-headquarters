// Keep old email URLs readable without calling the retired unsubscribe service.
// New email preference links are hosted by Lovable, not by this app.
export default function Unsubscribe() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">This email link has expired</h1>
        <p className="text-muted-foreground text-sm">
          Please use the unsubscribe link at the bottom of a recent email from Home Care Headquarters.
        </p>
      </div>
    </main>
  );
}