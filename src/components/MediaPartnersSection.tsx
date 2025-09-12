import { Button } from "@/components/ui/button";
import { mediaOutlets } from "@/data/mediaOutlets";
import communitiesImage from "@/assets/chicago-communities.jpg";
import { Link } from "react-router-dom";
interface MediaPartnersSectionProps {
  onAssistantClick: () => void;
}
const collections = [{
  title: "Reach Diverse Communities",
  description: "Connect with Chicago's rich tapestry of cultures and languages",
  image: communitiesImage,
  outlets: ["la-raza", "univision-chicago", "wbez"]
}, {
  title: "Connect with Families",
  description: "Trusted voices that reach parents and families across the city",
  image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=400&fit=crop",
  outlets: ["chicago-parent", "block-club", "red-eye"]
}, {
  title: "Influence Business Leaders",
  description: "Essential publications for Chicago's professional community",
  image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
  outlets: ["crains", "chicago-business", "wbez"]
}, {
  title: "Go Hyperlocal",
  description: "Neighborhood-focused media that builds community connections",
  image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop",
  outlets: ["block-club", "chicago-sun-times", "red-eye"]
}];
export function MediaPartnersSection({
  onAssistantClick
}: MediaPartnersSectionProps) {
  return (
    <section id="media-partners" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="section-title mb-4">
            Discover Your Perfect{" "}
            <span className="text-accent">Media Mix</span>
          </h2>
          <p className="body-large max-w-2xl mx-auto mb-8">
            From the Loop to Little Village, reach every community that matters to your brand. 
            Our AI assistant knows exactly which outlets will connect you with your audience.
          </p>
          <Button variant="assistant" size="lg" asChild>
            <a href="/packages">Explore Ad Packages</a>
          </Button>
        </div>

        {/* Collections Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {collections.map(collection => <div key={collection.title} className="outlet-card group cursor-pointer">
              <div className="relative h-48 overflow-hidden rounded-t-xl">
                <img src={collection.image} alt={collection.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-semibold font-serif">{collection.title}</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-muted-foreground mb-4">{collection.description}</p>
                <Button variant="outline" size="sm">
                  Explore Collection →
                </Button>
              </div>
            </div>)}
        </div>

        {/* Featured Outlets */}
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-primary font-serif mb-2">
              Featured Media Partners
            </h3>
            <p className="text-muted-foreground">
              A curated selection of Chicago's most trusted voices
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaOutlets.slice(0, 6).map(outlet => <div key={outlet.id} className="outlet-card group">
                <div className="relative h-48 overflow-hidden rounded-t-xl">
                  <img src={outlet.image} alt={outlet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                
                <div className="p-6">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">
                    {outlet.type}
                  </p>
                  <h3 className="text-xl font-semibold text-primary font-serif mb-2">
                    {outlet.name}
                  </h3>
                  <p className="text-accent italic mb-4">"{outlet.tagline}"</p>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    {outlet.description}
                  </p>
                  <div className="flex space-x-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      Learn More →
                    </Button>
                    
                  </div>
                </div>
              </div>)}
          </div>

          <div className="text-center pt-8">
            <Button variant="assistant" size="lg" asChild>
              <Link to="/partners">Explore Media Partners</Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Discover our full network of trusted Chicago media outlets
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}