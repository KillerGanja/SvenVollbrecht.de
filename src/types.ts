export interface WorkFrontmatter {
  title: string;
  slug?: string;
  year?: number | string;
  cover_image?: string;
  gallery_images?: string[];
  images?: string[]; // Legacy support if needed, or consistent with gallery_images
  materials?: string;
  dimensions?: string;
  description?: string;
  // Add other frontmatter fields as they originate from your markdown files
}
