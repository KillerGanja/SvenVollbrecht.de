#!/bin/bash

# Simple script to trigger a rebuild or notify that content has changed to update sitemap
# In Astro, sitemap is usually generated during build (astro-sitemap integration is active)

echo "Checking for new works in src/content/works/..."

# This script can be expanded to perform more specific tasks if needed, 
# but for now, it's a placeholder to remind that the sitemap integration 
# in astro.config.mjs will handle the generation on build.

npm run build
