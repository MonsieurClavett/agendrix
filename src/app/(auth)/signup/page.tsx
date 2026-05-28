import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Créer un compte entreprise</CardTitle>
          <CardDescription>
            Vous deviendrez le premier gestionnaire de votre entreprise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignupForm />
          <p className="text-muted-foreground text-center text-sm">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-foreground underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
