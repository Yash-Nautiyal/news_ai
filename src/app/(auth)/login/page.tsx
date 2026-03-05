import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
