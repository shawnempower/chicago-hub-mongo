import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/chicago-hero.jpg";
import { mediaOutlets } from "@/data/mediaOutlets";
interface HeroSectionProps {
  onAssistantClick?: () => void;
}
export function HeroSection({
  onAssistantClick = () => {}
}: HeroSectionProps) {
  return <section className="relative overflow-hidden bg-gradient-to-br from-background via-brand-cream to-brand-light-gray">
      <div className="container mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="hero-title">
                Reach 5 Million Chicagoans Through <span className="text-accent">Voices They Trust.</span>
              </h1>
              <p className="body-large max-w-xl">35+ trusted local voices. One powerful partnership. Limitless Chicago connections.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" onClick={onAssistantClick} className="sm:w-auto">Plan Your Campaign</Button>
              <Button variant="link" size="lg" className="text-primary hover:text-accent" asChild>
                <Link to="/packages">Browse Ad Packages →</Link>
              </Button>
            </div>

            <div className="pt-8">
              
              
            </div>
          </div>

          {/* Right Column - Visual Grid */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent z-10 rounded-2xl"></div>
            <img src={heroImage} alt="Chicago skyline representing diverse media connections" className="w-full h-[500px] object-cover rounded-2xl shadow-2xl" />
            
            {/* Floating Media Outlet Cards */}
            <div className="absolute inset-0 z-20 p-6 flex flex-col justify-end">
              <div className="grid grid-cols-2 gap-3 opacity-90">
                {mediaOutlets.slice(0, 4).map((outlet, index) => <div key={outlet.id} className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg transform transition-all duration-300 hover:scale-105" style={{
                animationDelay: `${index * 0.2}s`,
                animation: 'fade-in 0.6s ease-out forwards'
              }}>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {outlet.type}
                    </p>
                    <h3 className="font-semibold text-sm text-primary font-serif">
                      {outlet.name}
                    </h3>
                    <p className="text-xs text-accent italic">"{outlet.tagline}"</p>
                  </div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
}