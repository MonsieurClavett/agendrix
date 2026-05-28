"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid SSR/CSR mismatch — render a sized placeholder until next-themes
  // has resolved the active theme on the client.
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Basculer le thème"
        className="opacity-0"
        tabIndex={-1}
      >
        <Sun />
      </Button>
    );
  }

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
