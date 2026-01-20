/**
 * Google Fonts Utility
 * Manages font loading and provides font data for the storefront editor
 */

export interface GoogleFont {
  name: string;
  family: string; // CSS font-family name
  category: 'sans-serif' | 'serif' | 'display' | 'monospace';
  weights: number[];
  fallback: string;
}

/**
 * Comprehensive list of Google Fonts available for storefronts
 * Organized by category with proper weights and fallbacks
 */
export const GOOGLE_FONTS: GoogleFont[] = [
  // ============ SANS-SERIF FONTS ============
  { name: 'Abel', family: 'Abel', category: 'sans-serif', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Acme', family: 'Acme', category: 'sans-serif', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Albert Sans', family: 'Albert Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Alegreya Sans', family: 'Alegreya Sans', category: 'sans-serif', weights: [300, 400, 500, 700], fallback: 'Arial, sans-serif' },
  { name: 'Arimo', family: 'Arimo', category: 'sans-serif', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Arsenal', family: 'Arsenal', category: 'sans-serif', weights: [400, 700], fallback: 'Arial, sans-serif' },
  { name: 'Asap', family: 'Asap', category: 'sans-serif', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Assistant', family: 'Assistant', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Barlow', family: 'Barlow', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Barlow Condensed', family: 'Barlow Condensed', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Barlow Semi Condensed', family: 'Barlow Semi Condensed', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Be Vietnam Pro', family: 'Be Vietnam Pro', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Cabin', family: 'Cabin', category: 'sans-serif', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Cairo', family: 'Cairo', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Cantarell', family: 'Cantarell', category: 'sans-serif', weights: [400, 700], fallback: 'Arial, sans-serif' },
  { name: 'Catamaran', family: 'Catamaran', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Chivo', family: 'Chivo', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Commissioner', family: 'Commissioner', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'DM Sans', family: 'DM Sans', category: 'sans-serif', weights: [400, 500, 700], fallback: 'Arial, sans-serif' },
  { name: 'Dosis', family: 'Dosis', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Encode Sans', family: 'Encode Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Exo', family: 'Exo', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Exo 2', family: 'Exo 2', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Figtree', family: 'Figtree', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Fira Sans', family: 'Fira Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Fira Sans Condensed', family: 'Fira Sans Condensed', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Heebo', family: 'Heebo', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Hind', family: 'Hind', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Hind Siliguri', family: 'Hind Siliguri', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'IBM Plex Sans', family: 'IBM Plex Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'IBM Plex Sans Condensed', family: 'IBM Plex Sans Condensed', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Instrument Sans', family: 'Instrument Sans', category: 'sans-serif', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Inter', family: 'Inter', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'system-ui, sans-serif' },
  { name: 'Inter Tight', family: 'Inter Tight', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'system-ui, sans-serif' },
  { name: 'Jost', family: 'Jost', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Kanit', family: 'Kanit', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Karla', family: 'Karla', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Lato', family: 'Lato', category: 'sans-serif', weights: [300, 400, 700, 900], fallback: 'Arial, sans-serif' },
  { name: 'Lexend', family: 'Lexend', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Lexend Deca', family: 'Lexend Deca', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Libre Franklin', family: 'Libre Franklin', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Manrope', family: 'Manrope', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Maven Pro', family: 'Maven Pro', category: 'sans-serif', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Merriweather Sans', family: 'Merriweather Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Montserrat', family: 'Montserrat', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Montserrat Alternates', family: 'Montserrat Alternates', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Mukta', family: 'Mukta', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Mulish', family: 'Mulish', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Nanum Gothic', family: 'Nanum Gothic', category: 'sans-serif', weights: [400, 700], fallback: 'Arial, sans-serif' },
  { name: 'Noto Sans', family: 'Noto Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Noto Sans Display', family: 'Noto Sans Display', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Nunito', family: 'Nunito', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Nunito Sans', family: 'Nunito Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Open Sans', family: 'Open Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Oswald', family: 'Oswald', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Outfit', family: 'Outfit', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Overpass', family: 'Overpass', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Oxygen', family: 'Oxygen', category: 'sans-serif', weights: [300, 400, 700], fallback: 'Arial, sans-serif' },
  { name: 'Pathway Gothic One', family: 'Pathway Gothic One', category: 'sans-serif', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Play', family: 'Play', category: 'sans-serif', weights: [400, 700], fallback: 'Arial, sans-serif' },
  { name: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Poppins', family: 'Poppins', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'PT Sans', family: 'PT Sans', category: 'sans-serif', weights: [400, 700], fallback: 'Arial, sans-serif' },
  { name: 'PT Sans Narrow', family: 'PT Sans Narrow', category: 'sans-serif', weights: [400, 700], fallback: 'Arial, sans-serif' },
  { name: 'Public Sans', family: 'Public Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Questrial', family: 'Questrial', category: 'sans-serif', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Quicksand', family: 'Quicksand', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Rajdhani', family: 'Rajdhani', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Raleway', family: 'Raleway', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Red Hat Display', family: 'Red Hat Display', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Red Hat Text', family: 'Red Hat Text', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Roboto', family: 'Roboto', category: 'sans-serif', weights: [300, 400, 500, 700], fallback: 'Arial, sans-serif' },
  { name: 'Roboto Condensed', family: 'Roboto Condensed', category: 'sans-serif', weights: [300, 400, 700], fallback: 'Arial, sans-serif' },
  { name: 'Roboto Flex', family: 'Roboto Flex', category: 'sans-serif', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Rubik', family: 'Rubik', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Saira', family: 'Saira', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Saira Condensed', family: 'Saira Condensed', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Sen', family: 'Sen', category: 'sans-serif', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Signika', family: 'Signika', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Signika Negative', family: 'Signika Negative', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Sora', family: 'Sora', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Source Sans 3', family: 'Source Sans 3', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Space Grotesk', family: 'Space Grotesk', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Spartan', family: 'League Spartan', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Teko', family: 'Teko', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Titillium Web', family: 'Titillium Web', category: 'sans-serif', weights: [300, 400, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Ubuntu', family: 'Ubuntu', category: 'sans-serif', weights: [300, 400, 500, 700], fallback: 'Arial, sans-serif' },
  { name: 'Urbanist', family: 'Urbanist', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Varela Round', family: 'Varela Round', category: 'sans-serif', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Work Sans', family: 'Work Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Yantramanav', family: 'Yantramanav', category: 'sans-serif', weights: [300, 400, 500, 700], fallback: 'Arial, sans-serif' },
  
  // ============ SERIF FONTS ============
  { name: 'Alegreya', family: 'Alegreya', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Alike', family: 'Alike', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Amiri', family: 'Amiri', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Arapey', family: 'Arapey', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Arvo', family: 'Arvo', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Bitter', family: 'Bitter', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Bodoni Moda', family: 'Bodoni Moda', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Brygada 1918', family: 'Brygada 1918', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Baskervville', family: 'Baskervville', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Cormorant', family: 'Cormorant', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Cormorant Garamond', family: 'Cormorant Garamond', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Crimson Pro', family: 'Crimson Pro', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Crimson Text', family: 'Crimson Text', category: 'serif', weights: [400, 600, 700], fallback: 'Georgia, serif' },
  { name: 'DM Serif Display', family: 'DM Serif Display', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'DM Serif Text', family: 'DM Serif Text', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Domine', family: 'Domine', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'EB Garamond', family: 'EB Garamond', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Eczar', family: 'Eczar', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Faustina', family: 'Faustina', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Frank Ruhl Libre', family: 'Frank Ruhl Libre', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Fraunces', family: 'Fraunces', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Gelasio', family: 'Gelasio', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Gentium Book Plus', family: 'Gentium Book Plus', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'IBM Plex Serif', family: 'IBM Plex Serif', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Instrument Serif', family: 'Instrument Serif', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Josefin Slab', family: 'Josefin Slab', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Libre Baskerville', family: 'Libre Baskerville', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Libre Caslon Text', family: 'Libre Caslon Text', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Literata', family: 'Literata', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Lora', family: 'Lora', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Marcellus', family: 'Marcellus', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Martel', family: 'Martel', category: 'serif', weights: [300, 400, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Merriweather', family: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900], fallback: 'Georgia, serif' },
  { name: 'Newsreader', family: 'Newsreader', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Noticia Text', family: 'Noticia Text', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Noto Serif', family: 'Noto Serif', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Noto Serif Display', family: 'Noto Serif Display', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Old Standard TT', family: 'Old Standard TT', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Petrona', family: 'Petrona', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Playfair Display', family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Playfair Display SC', family: 'Playfair Display SC', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Podkova', family: 'Podkova', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Prata', family: 'Prata', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Pridi', family: 'Pridi', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'PT Serif', family: 'PT Serif', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Quattrocento', family: 'Quattrocento', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Roboto Serif', family: 'Roboto Serif', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Roboto Slab', family: 'Roboto Slab', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Rokkitt', family: 'Rokkitt', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Sanchez', family: 'Sanchez', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Slabo 27px', family: 'Slabo 27px', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Source Serif 4', family: 'Source Serif 4', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Spectral', family: 'Spectral', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Taviraj', family: 'Taviraj', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Tinos', family: 'Tinos', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Unna', family: 'Unna', category: 'serif', weights: [400, 700], fallback: 'Georgia, serif' },
  { name: 'Vollkorn', family: 'Vollkorn', category: 'serif', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Yeseva One', family: 'Yeseva One', category: 'serif', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Zilla Slab', family: 'Zilla Slab', category: 'serif', weights: [300, 400, 500, 600, 700], fallback: 'Georgia, serif' },
  
  // ============ DISPLAY FONTS ============
  { name: 'Abril Fatface', family: 'Abril Fatface', category: 'display', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Alfa Slab One', family: 'Alfa Slab One', category: 'display', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Archivo', family: 'Archivo', category: 'display', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Archivo Black', family: 'Archivo Black', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Archivo Narrow', family: 'Archivo Narrow', category: 'display', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Bebas Neue', family: 'Bebas Neue', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Big Shoulders Display', family: 'Big Shoulders Display', category: 'display', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Black Ops One', family: 'Black Ops One', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Bungee', family: 'Bungee', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Cinzel', family: 'Cinzel', category: 'display', weights: [400, 500, 600, 700], fallback: 'Georgia, serif' },
  { name: 'Comfortaa', family: 'Comfortaa', category: 'display', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Concert One', family: 'Concert One', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Crete Round', family: 'Crete Round', category: 'display', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Fredoka', family: 'Fredoka', category: 'display', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Fugaz One', family: 'Fugaz One', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Josefin Sans', family: 'Josefin Sans', category: 'display', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Lilita One', family: 'Lilita One', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Lobster', family: 'Lobster', category: 'display', weights: [400], fallback: 'cursive' },
  { name: 'Lobster Two', family: 'Lobster Two', category: 'display', weights: [400, 700], fallback: 'cursive' },
  { name: 'Orbitron', family: 'Orbitron', category: 'display', weights: [400, 500, 600, 700], fallback: 'Arial, sans-serif' },
  { name: 'Oleo Script', family: 'Oleo Script', category: 'display', weights: [400, 700], fallback: 'cursive' },
  { name: 'Pacifico', family: 'Pacifico', category: 'display', weights: [400], fallback: 'cursive' },
  { name: 'Passion One', family: 'Passion One', category: 'display', weights: [400, 700], fallback: 'Arial, sans-serif' },
  { name: 'Patua One', family: 'Patua One', category: 'display', weights: [400], fallback: 'Georgia, serif' },
  { name: 'Permanent Marker', family: 'Permanent Marker', category: 'display', weights: [400], fallback: 'cursive' },
  { name: 'Righteous', family: 'Righteous', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Russo One', family: 'Russo One', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Satisfy', family: 'Satisfy', category: 'display', weights: [400], fallback: 'cursive' },
  { name: 'Secular One', family: 'Secular One', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Shadows Into Light', family: 'Shadows Into Light', category: 'display', weights: [400], fallback: 'cursive' },
  { name: 'Special Elite', family: 'Special Elite', category: 'display', weights: [400], fallback: 'monospace' },
  { name: 'Staatliches', family: 'Staatliches', category: 'display', weights: [400], fallback: 'Arial, sans-serif' },
  { name: 'Ultra', family: 'Ultra', category: 'display', weights: [400], fallback: 'Georgia, serif' },
  
  // ============ MONOSPACE FONTS ============
  { name: 'Fira Code', family: 'Fira Code', category: 'monospace', weights: [300, 400, 500, 600, 700], fallback: 'monospace' },
  { name: 'Fira Mono', family: 'Fira Mono', category: 'monospace', weights: [400, 500, 700], fallback: 'monospace' },
  { name: 'IBM Plex Mono', family: 'IBM Plex Mono', category: 'monospace', weights: [300, 400, 500, 600, 700], fallback: 'monospace' },
  { name: 'Inconsolata', family: 'Inconsolata', category: 'monospace', weights: [300, 400, 500, 600, 700], fallback: 'monospace' },
  { name: 'JetBrains Mono', family: 'JetBrains Mono', category: 'monospace', weights: [300, 400, 500, 600, 700], fallback: 'monospace' },
  { name: 'Roboto Mono', family: 'Roboto Mono', category: 'monospace', weights: [300, 400, 500, 600, 700], fallback: 'monospace' },
  { name: 'Source Code Pro', family: 'Source Code Pro', category: 'monospace', weights: [300, 400, 500, 600, 700], fallback: 'monospace' },
  { name: 'Space Mono', family: 'Space Mono', category: 'monospace', weights: [400, 700], fallback: 'monospace' },
  { name: 'Ubuntu Mono', family: 'Ubuntu Mono', category: 'monospace', weights: [400, 700], fallback: 'monospace' },
];

/**
 * Get font data by name
 */
export function getFontByName(name: string): GoogleFont | undefined {
  return GOOGLE_FONTS.find(font => font.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get fonts grouped by category
 */
export function getFontsByCategory(): Record<string, GoogleFont[]> {
  return GOOGLE_FONTS.reduce((acc, font) => {
    if (!acc[font.category]) {
      acc[font.category] = [];
    }
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, GoogleFont[]>);
}

/**
 * Generate Google Fonts API URL for a single font
 * @param fontName - The font name (e.g., "Inter", "Playfair Display")
 * @param weights - Optional specific weights to load (defaults to all available)
 */
export function getGoogleFontUrl(fontName: string, weights?: number[]): string {
  const font = getFontByName(fontName);
  if (!font) {
    console.warn(`Font "${fontName}" not found in GOOGLE_FONTS list`);
    return '';
  }
  
  const weightsToLoad = weights || font.weights;
  const familyParam = font.family.replace(/ /g, '+');
  const weightsParam = weightsToLoad.join(';');
  
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightsParam}&display=swap`;
}

/**
 * Generate Google Fonts API URL for multiple fonts
 * @param fonts - Array of font names
 */
export function getGoogleFontsUrl(fonts: string[]): string {
  const fontParams = fonts
    .map(fontName => {
      const font = getFontByName(fontName);
      if (!font) return null;
      
      const familyParam = font.family.replace(/ /g, '+');
      const weightsParam = font.weights.join(';');
      return `family=${familyParam}:wght@${weightsParam}`;
    })
    .filter(Boolean)
    .join('&');
  
  if (!fontParams) return '';
  
  return `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
}

/**
 * Get the CSS font-family value for a font
 * @param fontName - The font name
 */
export function getFontFamily(fontName: string): string {
  const font = getFontByName(fontName);
  if (!font) {
    return `"${fontName}", system-ui, sans-serif`;
  }
  return `"${font.family}", ${font.fallback}`;
}

/**
 * Cache of loaded fonts to avoid duplicate loads
 */
const loadedFonts = new Set<string>();

/**
 * Dynamically load a Google Font into the document
 * @param fontName - The font name to load
 * @returns Promise that resolves when the font is loaded
 */
export async function loadGoogleFont(fontName: string): Promise<void> {
  // Skip if already loaded
  if (loadedFonts.has(fontName.toLowerCase())) {
    return;
  }
  
  const fontUrl = getGoogleFontUrl(fontName);
  if (!fontUrl) {
    console.warn(`Could not generate URL for font: ${fontName}`);
    return;
  }
  
  // Check if link already exists in document
  const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
  if (existingLink) {
    loadedFonts.add(fontName.toLowerCase());
    return;
  }
  
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    
    link.onload = () => {
      loadedFonts.add(fontName.toLowerCase());
      resolve();
    };
    
    link.onerror = () => {
      reject(new Error(`Failed to load font: ${fontName}`));
    };
    
    document.head.appendChild(link);
  });
}

/**
 * Preload a font (adds link with rel="preload")
 * @param fontName - The font name to preload
 */
export function preloadGoogleFont(fontName: string): void {
  const fontUrl = getGoogleFontUrl(fontName);
  if (!fontUrl) return;
  
  const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
  if (existingLink) return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = fontUrl;
  document.head.appendChild(link);
}

/**
 * Generate a link tag HTML string for embedding in HTML
 * @param fontName - The font name
 */
export function getGoogleFontLinkTag(fontName: string): string {
  const fontUrl = getGoogleFontUrl(fontName);
  if (!fontUrl) return '';
  
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontUrl}" rel="stylesheet">`;
}

/**
 * Generate link tags HTML for multiple fonts
 * @param fonts - Array of font names
 */
export function getGoogleFontsLinkTags(fonts: string[]): string {
  const fontUrl = getGoogleFontsUrl(fonts);
  if (!fontUrl) return '';
  
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontUrl}" rel="stylesheet">`;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    'sans-serif': 'Sans Serif',
    'serif': 'Serif',
    'display': 'Display',
    'monospace': 'Monospace'
  };
  return names[category] || category;
}
