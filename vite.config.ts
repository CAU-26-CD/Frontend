import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

const feedbackBubbleBackdropFilter =
  'blur(4px) saturate(115%)'

const preserveFeedbackBubbleBackdropFilter = () => ({
  name: 'preserve-feedback-bubble-backdrop-filter',
  enforce: 'post' as const,
  generateBundle(_: unknown, bundle: Record<string, unknown>) {
    for (const asset of Object.values(bundle)) {
      if (
        !asset ||
        typeof asset !== 'object' ||
        !('type' in asset) ||
        asset.type !== 'asset' ||
        !('fileName' in asset) ||
        typeof asset.fileName !== 'string' ||
        !asset.fileName.endsWith('.css') ||
        !('source' in asset) ||
        typeof asset.source !== 'string'
      ) {
        continue
      }

      asset.source = asset.source.replace(
        /-webkit-backdrop-filter:blur\(4px\)saturate\(115%\)/g,
        `-webkit-backdrop-filter: ${feedbackBubbleBackdropFilter};backdrop-filter: ${feedbackBubbleBackdropFilter}`,
      )
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), preserveFeedbackBubbleBackdropFilter()],
})
