interface DeyaarLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "brown" | "orange" | "beige" | "dark" | "light";
}

const LOGO_PATHS = {
  brown: "/DEYAAR_LOGO_EN_BROWN.png",
  orange: "/DEYAAR_LOGO_EN_ORANGE.png",
  beige: "/DEYAAR_LOGO_EN_BEIGE.png",
  dark: "/DEYAAR_LOGO_EN_DARK.png",
};

// Fallback to CDN if local files not available
const FALLBACK_LOGO = "https://image.discover.deyaar.ae/lib/fe28117373640478721079/m/1/708d41dc-ecb3-40da-b63b-8d24370d4ec1.png";

export default function DeyaarLogo({ 
  className = "", 
  size = "md",
  variant = "brown"
}: DeyaarLogoProps) {
  const dimensions = {
    sm: { width: 100, maxHeight: 28 },
    md: { width: 140, maxHeight: 38 },
    lg: { width: 180, maxHeight: 50 },
  };

  const { width, maxHeight } = dimensions[size];
  
  // For light variant, use brown logo with CSS filter
  const logoPath = variant === "light" 
    ? LOGO_PATHS.brown 
    : (LOGO_PATHS[variant] || LOGO_PATHS.brown);

  return (
    <img
      src={logoPath}
      alt="DEYAAR"
      className={className}
      style={{
        width: width,
        height: "auto",
        maxHeight: maxHeight,
        objectFit: "contain",
        filter: variant === "light" 
          ? "brightness(0) invert(1)" 
          : "none",
      }}
      onError={(e) => {
        // Fallback to CDN if local image fails
        (e.target as HTMLImageElement).src = FALLBACK_LOGO;
        (e.target as HTMLImageElement).style.filter = variant === "light" 
          ? "brightness(0) invert(1)" 
          : "none";
      }}
    />
  );
}

// Tagline/Shaping Lives logo
export function DeyaarTagline({ 
  className = "", 
  size = "md",
  variant = "brown"
}: DeyaarLogoProps) {
  const dimensions = {
    sm: { width: 120 },
    md: { width: 160 },
    lg: { width: 200 },
  };

  const { width } = dimensions[size];
  
  // Note: Tagline images would need to be created or sourced
  // Using text-based fallback for now
  if (variant === "light") {
    return (
      <span 
        className={className}
        style={{
          fontFamily: "'Acta Display', Georgia, serif",
          fontSize: size === "sm" ? 12 : size === "md" ? 14 : 16,
          color: "#F5ECD9",
          letterSpacing: "2px",
          textTransform: "uppercase",
          fontWeight: 400,
        }}
      >
        Shaping Lives
      </span>
    );
  }

  return (
    <span 
      className={className}
      style={{
        fontFamily: "'Acta Display', Georgia, serif",
        fontSize: size === "sm" ? 12 : size === "md" ? 14 : 16,
        color: variant === "orange" ? "#D26935" : "#3D2914",
        letterSpacing: "2px",
        textTransform: "uppercase",
        fontWeight: 400,
      }}
    >
      Shaping Lives
    </span>
  );
}
