import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import rinonEmpty from "@/assets/rinon-empty.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-[28px]">
      <div className="flex flex-col items-center text-center max-w-sm animate-fade-in">
        {/* Character illustration */}
        <img 
          src={rinonEmpty} 
          alt="Rinon character" 
          className="w-[120px] h-auto object-contain mb-6"
        />
        
        {/* Glowing 404 */}
        <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse-glow">
          404
        </h1>
        
        {/* Message */}
        <p className="text-xl font-semibold text-foreground mb-2">
          Page not found
        </p>
        <p className="text-muted-foreground mb-8">
          This chart doesn't exist in our catalog...
        </p>
        
        {/* CTA Button */}
        {/* NOTE: keep a single React element child when using `asChild` (Radix Slot) */}
        <Button asChild size="lg" className="rounded-full px-8"><Link to="/home">Return Home</Link></Button>
      </div>
    </div>
  );
};

export default NotFound;
