type LogoSize = "h1" | "h2" | "h3" | "body" | "small" | "xs";

type LogoProps = {
  size?: LogoSize;
  className?: string;
};

const logoSizeClasses: Record<LogoSize, string> = {
  h1: "text-4xl leading-[1.2]",
  h2: "text-2xl leading-[1.3]",
  h3: "text-xl leading-[1.4]",
  body: "text-base leading-[1.6]",
  small: "text-sm leading-[1.4]",
  xs: "text-xs leading-[1.3]",
};

export function Logo({ size = "h1", className = "" }: LogoProps) {
  return (
    <div>
      <span
        className={`
          ${logoSizeClasses[size]}
          font-bold
          tracking-tight
          bg-gradient-to-br
          from-foreground
          to-foreground/60
          bg-clip-text
          text-transparent
          ${className}
        `}
      >
        Finance<span className="text-brand-1">Hub</span>
      </span>
    </div>
    
  );
}
