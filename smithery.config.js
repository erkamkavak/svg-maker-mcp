export default {
  esbuild: {
    // Mark native modules and ESM-only modules as external to avoid bundling issues
    // These modules use createRequire(import.meta.url) which doesn't work in CJS bundles
    external: [
      // Native modules with binary bindings
      "sharp",           // Image processing - uses native bindings
      "pdfkit",          // PDF generation - has complex dependencies
      "svg-to-pdfkit",   // Works with pdfkit
      // ESM modules that use import.meta.url
      "svgo",            // SVG optimizer - uses css-tree which has ESM issues
      "css-tree",        // CSS parsing - uses createRequire(import.meta.url)
      "mdn-data",        // MDN data - loaded via createRequire
      "@svgr/core",      // SVG to React - has ESM dependencies
      "@svgr/plugin-jsx", // SVG to React JSX plugin
    ],
    // Set Node.js target version
    target: "node18",
  },
};
