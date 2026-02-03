"use client";

import { Button } from "@/components/ui/button";
import { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

type Props = ComponentProps<typeof Button>;

export default function AuthSubmitButton({ children, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} {...props}>
      {pending ? "Signing in..." : (children || "Sign in")}
    </Button>
  );
}
