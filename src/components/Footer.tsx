export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-serif">Chicago Media Hub</h3>
            <p className="text-primary-foreground/80">
              Connecting brands with Chicago's diverse media landscape through intelligent discovery.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold">Platform</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Media Partners</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Success Stories</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">AI Assistant</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold">Resources</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Chicago Media Guide</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Community Insights</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Best Practices</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Support</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold">Connect</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Schedule a Demo</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Contact Sales</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Partnership Inquiries</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Media Outlet Partners</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-foreground/60 text-sm">
            © 2024 Chicago Media Hub. Connecting communities through trusted media.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors">Privacy</a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors">Terms</a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}