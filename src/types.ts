export interface WorkFrontmatter {
  title: string;
  slug?: string;
  year?: number | string;
  cover_image?: string;
  gallery_images?: string[];
  images?: string[]; // Legacy support if needed, or consistent with gallery_images
  materials?: string;
  materials_en?: string;
  dimensions?: string;
  dimensions_en?: string;
  description?: string;
  description_en?: string;
  body_en?: string;
  order?: number;
  // Add other frontmatter fields as they originate from your markdown files
}
