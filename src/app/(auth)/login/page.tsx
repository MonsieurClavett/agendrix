import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Accédez à votre tableau de bord.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm />
          <p className="text-muted-foreground text-center text-sm">
            Pas de compte ?{" "}
            <Link href="/signup" className="text-foreground underline">
              Créer une entreprise
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
