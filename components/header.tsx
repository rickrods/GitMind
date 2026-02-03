import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUser } from "@/app/actions/actions";
import AuthPageSignOutButton from "./auth-sign-out-button";
import { ThemeToggleButton } from "./theme-toggle-button";

export default async function Header() {
  const user = await getUser();

  return (
    <nav className="border-b w-full h-16 shrink-0 flex items-center">
      <div className="px-6 w-full flex items-center justify-between mx-auto">
        <Link href="/" className="text-sm font-medium">
          SocialNexus
        </Link>
        <div className="flex items-center gap-2">
          {user == null && (
            <>
              <Button variant="outline" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
          {user != null && (
            <Button variant="outline" asChild>
              <Link href="/settings">Settings</Link>
            </Button>
          )}
          {user != null && (
            <AuthPageSignOutButton />
          )}
          <ThemeToggleButton />
        </div>
      </div>
    </nav>
  );
}
