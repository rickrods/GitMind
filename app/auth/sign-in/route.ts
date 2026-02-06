import { createSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { encodedRedirect } from "@/utils/redirect";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const client = await createSupabaseClient();

    const { error } = await client.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return encodedRedirect("error", "/sign-in", error.message);
    }

    return redirect("/dashboard");
}
