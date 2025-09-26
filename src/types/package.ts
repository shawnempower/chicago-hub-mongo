import { DatabasePackage } from "@/hooks/usePackages";

// Frontend Package interface (compatible with existing components)
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

// Convert database package to frontend package format
export const convertDatabasePackage = (dbPackage: DatabasePackage): Package => {
  return {
    id: dbPackage.legacy_id || 0,
    name: dbPackage.name,
    tagline: dbPackage.tagline || "",
    description: dbPackage.description || "",
    price: dbPackage.price || "Contact for pricing",
    priceRange: dbPackage.price_range as Package["priceRange"] || "under-5k",
    audience: dbPackage.audience || [],
    channels: dbPackage.channels || [],
    complexity: dbPackage.complexity as Package["complexity"] || "turnkey",
    outlets: dbPackage.outlets || []
  };
};

// Convert frontend package to database format for saving
export const convertToSaveFormat = (pkg: Package): { packageId: number; legacyId: number } => {
  return {
    packageId: pkg.id,
    legacyId: pkg.id
  };
};