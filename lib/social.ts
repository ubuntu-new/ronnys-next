// Social links — data-driven so the admin can add / remove / show-hide later.
// For now this is a plain config; Phase "admin" swaps the source to Firestore
// WITHOUT changing <Footer/>. Order here = display order. enabled=false hides it.

export type SocialId = "facebook" | "instagram" | "tiktok" | "twitter" | "youtube";

export interface SocialLink {
  id: SocialId;
  label: string;
  href: string;
  enabled: boolean;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/ronnyspizza", enabled: true },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/ronnyspizza", enabled: true },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@ronnyspizza", enabled: true },
  // Not provided yet — flip enabled to true and set href when ready.
  { id: "twitter", label: "X", href: "", enabled: false },
];