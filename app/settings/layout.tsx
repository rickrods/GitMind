import { redirect } from "next/navigation";
import { getUser } from "@/app/actions/actions";
import React from "react";


export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }
  return <>{children}</>;
}

