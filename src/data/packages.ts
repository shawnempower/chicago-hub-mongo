export interface Package {
  id: number;
  name: string;
  tagline: string;
  description: string;
  price: string;
  priceRange: "under-5k" | "5-15k" | "15-50k" | "50k-plus";
  audience: string[];
  channels: string[];
  complexity: "turnkey" | "custom";
  outlets: string[];
}

export const packages: Package[] = [
  {
    id: 1,
    name: "The Cultural Bridge Builder",
    tagline: "Where communities intersect",
    description: "Mirror how Chicago's diverse communities naturally overlap at corner stores, CTA stations, and schools.",
    price: "$15K/month",
    priceRange: "15-50k",
    audience: ["diverse", "families"],
    channels: ["radio", "print", "digital"],
    complexity: "custom",
    outlets: ["La Raza", "WVON Radio", "Chinatown Spotlight", "Borderless Magazine", "Chicago Reader", "True Star Media"]
  },
  {
    id: 2,
    name: "The Sunday Morning Amplifier",
    tagline: "Reach families when they're together",
    description: "Capture Chicago's most culturally active day when families gather and decisions get made.",
    price: "$20K/month",
    priceRange: "15-50k",
    audience: ["diverse", "families", "faith"],
    channels: ["tv", "radio", "print"],
    complexity: "custom",
    outlets: ["N'DIGO Sunday TV", "WVON Sunday", "La Raza Weekend", "Windy City Times", "Block Club Sunday"]
  },
  {
    id: 3,
    name: "Newsletter Blitz",
    tagline: "Every inbox, every morning",
    description: "Simple, effective email marketing across Chicago's most engaged newsletters.",
    price: "$2,500/month",
    priceRange: "under-5k",
    audience: ["all"],
    channels: ["newsletter"],
    complexity: "turnkey",
    outlets: ["Chicago Public Square", "Block Club", "Chicago Parent", "Chicago Reader", "The TRiiBE"]
  },
  {
    id: 4,
    name: "Radio Repeater",
    tagline: "One spot, maximum reach",
    description: "Your 30-second message distributed across all Chicago radio partners.",
    price: "$5,000/month",
    priceRange: "5-15k",
    audience: ["all"],
    channels: ["radio"],
    complexity: "turnkey",
    outlets: ["WBEZ", "WVON", "CHIRP", "Lumpen Radio"]
  },
  {
    id: 5,
    name: "The Neighborhood Package",
    tagline: "Own your local area",
    description: "Complete saturation of a single Chicago neighborhood with all available local media.",
    price: "$1,500/month",
    priceRange: "under-5k",
    audience: ["hyperlocal"],
    channels: ["print", "digital", "newsletter"],
    complexity: "turnkey",
    outlets: ["Block Club neighborhood edition", "Community paper", "CAN TV bulletin", "StreetWise vendors"]
  },
  {
    id: 6,
    name: "The Power Breakfast",
    tagline: "Where deals get done",
    description: "Reach Chicago's business decision-makers during their morning routine.",
    price: "$25K/month",
    priceRange: "15-50k",
    audience: ["business"],
    channels: ["radio", "print", "podcast"],
    complexity: "custom",
    outlets: ["Crain's Chicago Business", "WBEZ Morning Edition", "Sun-Times Business", "Candid Candace Podcast"]
  },
  {
    id: 7,
    name: "After Dark Chicago",
    tagline: "Own the night shift",
    description: "Connect with Chicago's third shift economy - 500K+ night workers and culture makers.",
    price: "$10K/month",
    priceRange: "5-15k",
    audience: ["diverse", "youth"],
    channels: ["radio", "digital", "print"],
    complexity: "custom",
    outlets: ["WVON overnight", "Chicago Reader nightlife", "Lumpen Radio late", "Windy City Times", "StreetWise late vendors"]
  },
  {
    id: 8,
    name: "Transit Tribe Dominator",
    tagline: "Every commute covered",
    description: "Follow Chicagoans throughout their daily transit patterns with strategic media placement.",
    price: "$12K/month",
    priceRange: "5-15k",
    audience: ["all"],
    channels: ["radio", "digital", "print"],
    complexity: "custom",
    outlets: ["Morning drive radio", "Geo-targeted digital", "Transit papers", "Station vendors", "Commuter newsletters"]
  },
  {
    id: 9,
    name: "The Village Builder",
    tagline: "It takes a village",
    description: "Comprehensive family-focused package reaching parents and children across platforms.",
    price: "$8K/month",
    priceRange: "5-15k",
    audience: ["families"],
    channels: ["print", "radio", "newsletter"],
    complexity: "custom",
    outlets: ["Chicago Parent", "Free Spirit Media", "True Star", "Block Club family", "WBEZ family shows"]
  },
  {
    id: 10,
    name: "B2B Basic",
    tagline: "Business visibility simplified",
    description: "No-fuss business reach through Chicago's essential professional media.",
    price: "$3,500/month",
    priceRange: "under-5k",
    audience: ["business"],
    channels: ["print", "radio", "digital"],
    complexity: "turnkey",
    outlets: ["Crain's digital", "WBEZ underwriting", "Sun-Times business", "Chicago Public Square"]
  },
  {
    id: 11,
    name: "The Faith Circuit",
    tagline: "Sunday morning to Friday prayers",
    description: "Connect with Chicago's diverse faith communities across all denominations.",
    price: "$6K/month",
    priceRange: "5-15k",
    audience: ["faith", "families", "diverse"],
    channels: ["radio", "print", "tv"],
    complexity: "custom",
    outlets: ["WVON Sunday gospel", "La Raza faith", "Church bulletins", "N'DIGO TV", "Community papers"]
  },
  {
    id: 12,
    name: "Quick Start Special",
    tagline: "Launch in 48 hours",
    description: "The fastest way to get your message into Chicago media. Pick and go.",
    price: "$500/month",
    priceRange: "under-5k",
    audience: ["all"],
    channels: ["flexible"],
    complexity: "turnkey",
    outlets: ["Your choice of any single outlet"]
  },
  {
    id: 13,
    name: "Audio Domination Suite",
    tagline: "Own Chicago's ears",
    description: "Comprehensive audio coverage across radio, podcasts, and streaming platforms.",
    price: "$25K-100K/month",
    priceRange: "50k-plus",
    audience: ["all"],
    channels: ["radio", "podcast"],
    complexity: "custom",
    outlets: ["All radio partners", "All podcasts", "Streaming audio", "Smart speakers"]
  },
  {
    id: 14,
    name: "Newsletter Empire",
    tagline: "Dominate the inbox",
    description: "Reach 600K+ engaged email subscribers across Chicago's top newsletters.",
    price: "$15K-50K/month",
    priceRange: "15-50k",
    audience: ["all"],
    channels: ["newsletter"],
    complexity: "custom",
    outlets: ["Block Club all editions", "Sun-Times newsletters", "Chicago Parent", "Crain's", "All partners"]
  },
  {
    id: 15,
    name: "Hyperlocal Hero",
    tagline: "Be the neighborhood champion",
    description: "Deep integration into a specific Chicago neighborhood's complete media ecosystem.",
    price: "$3K/month",
    priceRange: "under-5k",
    audience: ["hyperlocal"],
    channels: ["all"],
    complexity: "custom",
    outlets: ["All neighborhood media", "Local events", "Community partnerships", "Street teams"]
  },
  {
    id: 16,
    name: "The Makers & Creators",
    tagline: "Reach Chicago's creative class",
    description: "Connect with artists, entrepreneurs, and innovators shaping Chicago's future.",
    price: "$7K/month",
    priceRange: "5-15k",
    audience: ["creative", "youth", "diverse"],
    channels: ["print", "radio", "digital"],
    complexity: "custom",
    outlets: ["Chicago Reader", "Lumpen Radio", "True Star", "Bridge Chicago", "South Side Weekly"]
  },
  {
    id: 17,
    name: "Seasonal Surge",
    tagline: "Match Chicago's rhythm",
    description: "Adaptive package that changes with Chicago's dramatic seasonal behavior patterns.",
    price: "$8K/month",
    priceRange: "5-15k",
    audience: ["all"],
    channels: ["flexible"],
    complexity: "custom",
    outlets: ["Winter: Digital heavy", "Summer: Events", "Fall: Family", "Spring: Outdoor"]
  },
  {
    id: 18,
    name: "Own a Day",
    tagline: "24-hour domination",
    description: "Every outlet, every platform, for one full day. Maximum impact for launches or events.",
    price: "$1,000",
    priceRange: "under-5k",
    audience: ["all"],
    channels: ["all"],
    complexity: "turnkey",
    outlets: ["Every newsletter", "All radio mentions", "Digital takeovers", "Social coordination"]
  },
  {
    id: 19,
    name: "The Side Hustler",
    tagline: "Multi-job, multi-dream",
    description: "Reach Chicago's gig economy workers across their various interests and needs.",
    price: "$5K/month",
    priceRange: "5-15k",
    audience: ["diverse", "business"],
    channels: ["digital", "radio", "newsletter"],
    complexity: "custom",
    outlets: ["Professional day media", "Evening passion outlets", "Weekend community", "Gig platforms"]
  },
  {
    id: 20,
    name: "Youth Movement",
    tagline: "Gen Z authentic connection",
    description: "Genuine engagement with Chicago's youth through media they create and trust.",
    price: "$4K/month",
    priceRange: "under-5k",
    audience: ["youth"],
    channels: ["digital", "social", "events"],
    complexity: "custom",
    outlets: ["Free Spirit Media", "True Star Media", "Youth radio", "School partnerships"]
  },
  {
    id: 21,
    name: "Executive Influence",
    tagline: "C-suite connectivity",
    description: "Premium package for reaching Chicago's top business decision makers.",
    price: "$50K/month",
    priceRange: "50k-plus",
    audience: ["business"],
    channels: ["print", "events", "digital"],
    complexity: "custom",
    outlets: ["Crain's premium", "Executive events", "Private podcasts", "LinkedIn amplification"]
  },
  {
    id: 22,
    name: "Community Champion",
    tagline: "Sponsor an ecosystem",
    description: "Become synonymous with supporting a specific community's entire media landscape.",
    price: "$15K/month",
    priceRange: "15-50k",
    audience: ["diverse", "hyperlocal"],
    channels: ["all"],
    complexity: "custom",
    outlets: ["Underwrite journalism", "Youth programs", "Event sponsorship", "Branded content"]
  },
  {
    id: 23,
    name: "The Steady State",
    tagline: "Always on, never overwhelming",
    description: "Consistent background presence across multiple channels. The proven 2-2-2-2 formula.",
    price: "$2,000/month",
    priceRange: "under-5k",
    audience: ["all"],
    channels: ["mixed"],
    complexity: "turnkey",
    outlets: ["2 newsletters weekly", "2 radio spots daily", "2 print monthly", "2 digital always"]
  },
  {
    id: 24,
    name: "Grand Opening Kit",
    tagline: "Launch like a local",
    description: "Everything you need for a successful Chicago store or restaurant opening.",
    price: "$5,000",
    priceRange: "5-15k",
    audience: ["hyperlocal"],
    channels: ["all"],
    complexity: "turnkey",
    outlets: ["Pre-buzz media", "Launch week saturation", "Post-opening", "Influencers"]
  }
];

export const audienceTypes = [
  { id: "diverse", label: "Diverse", color: "bg-blue-100 text-blue-800" },
  { id: "families", label: "Families", color: "bg-green-100 text-green-800" },
  { id: "business", label: "Business", color: "bg-purple-100 text-purple-800" },
  { id: "hyperlocal", label: "Hyperlocal", color: "bg-orange-100 text-orange-800" },
  { id: "youth", label: "Youth", color: "bg-pink-100 text-pink-800" },
  { id: "faith", label: "Faith", color: "bg-indigo-100 text-indigo-800" },
  { id: "creative", label: "Creative", color: "bg-yellow-100 text-yellow-800" },
  { id: "all", label: "All", color: "bg-gray-100 text-gray-800" }
];

export const channelTypes = [
  { id: "radio", label: "Radio", color: "bg-purple-100 text-purple-800" },
  { id: "newsletter", label: "Newsletter", color: "bg-blue-100 text-blue-800" },
  { id: "print", label: "Print", color: "bg-green-100 text-green-800" },
  { id: "digital", label: "Digital", color: "bg-orange-100 text-orange-800" },
  { id: "tv", label: "TV", color: "bg-red-100 text-red-800" },
  { id: "podcast", label: "Podcast", color: "bg-indigo-100 text-indigo-800" },
  { id: "social", label: "Social", color: "bg-pink-100 text-pink-800" },
  { id: "events", label: "Events", color: "bg-yellow-100 text-yellow-800" },
  { id: "flexible", label: "Flexible", color: "bg-gray-100 text-gray-800" },
  { id: "mixed", label: "Mixed", color: "bg-gray-100 text-gray-800" },
  { id: "all", label: "All", color: "bg-gray-100 text-gray-800" }
];

export const priceRanges = [
  { id: "under-5k", label: "Under $5K", color: "bg-green-100 text-green-800" },
  { id: "5-15k", label: "$5K-$15K", color: "bg-yellow-100 text-yellow-800" },
  { id: "15-50k", label: "$15K-$50K", color: "bg-orange-100 text-orange-800" },
  { id: "50k-plus", label: "$50K+", color: "bg-red-100 text-red-800" }
];

export const complexityTypes = [
  { id: "turnkey", label: "Turnkey", color: "bg-green-100 text-green-800" },
  { id: "custom", label: "Custom", color: "bg-orange-100 text-orange-800" }
];