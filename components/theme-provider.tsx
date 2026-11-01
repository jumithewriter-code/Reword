'use client'

import { ThemeProvider as NextThemes } from 'next-themes'

/** Functional dark AND light modes are an acceptance criterion (scope 5 / 7). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  )
}
