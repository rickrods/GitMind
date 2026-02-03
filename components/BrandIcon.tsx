import type { SimpleIcon } from 'simple-icons';

interface IconProps {
  icon: SimpleIcon;
  size?: number;
  className?: string;
}

export default function BrandIcon({ icon, size = 24, className }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={`#${icon.hex}`} // Uses official brand color
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}