import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Agendrix</h1>
        <p className="mt-3 text-muted-foreground">
          Gestion d&apos;horaires d&apos;employés — MVP.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Créer un compte entreprise</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    </main>
  );
}
