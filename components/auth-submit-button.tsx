import { Button } from "@/components/ui/button";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof Button>;

export default function AuthSubmitButton({ children, ...props }: Props) {
  return (
    <Button type="submit" {...props}>
      {children || "Sign in"}
    </Button>
  );
}
