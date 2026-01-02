# SVG Maker MCP Server (TypeScript)

A robust Model Context Protocol (MCP) server for creating, rendering, converting, and optimizing SVG images.

## Features

- **Render SVG**: Validate and convert SVG code to high-quality PNG images (returned as image content).
- **Optimize SVG**: Minify and optimize SVG code using `svgo`.
- **Convert to React**: Generate React functional components from SVG code using `@svgr/core`.
- **Convert to React Native**: Generate React Native SVG components.
- **Data URI**: Convert SVG to base64 Data URI.
- **Format SVG**: Prettify SVG code.
- **SVG to PDF**: Convert SVG code to PDF documents using `pdfkit`.
- **Validate SVG**: Check for XML errors and standard SVG compliance.
- **Get Metadata**: Extract dimensions and title.

---

## Configuration

To use this server with your favorite MCP client (like Claude Desktop, Cursor, Gemini CLI, etc.), use the following settings.

### 1. Claude Desktop / Gemini CLI
Add this to your configuration file (e.g., `~/.gemini/settings.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "svg-maker": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/svg-mcp-server-ts/src/index.ts"]
    }
  }
}
```

### 2. Cursor
1. Go to **Settings** > **Features** > **MCP**.
2. Add a new server:
   - **Name**: `svg-maker`
   - **Type**: `command`
   - **Command**: `npx tsx /absolute/path/to/svg-mcp-server-ts/src/index.ts`

---

## Tools

### `render_svg`
- **Arguments**: `svg_code` (str), `width` (number, opt), `height` (number, opt)
- **Returns**: Image Content (PNG).
- **Description**: Renders SVG to PNG. **IMPORTANT**: Always use this to preview generated SVGs to ensure they match visual intent.

### `save_svg`
- **Arguments**: `svg_code` (str), `filename` (str), `optimize` (boolean)
- **Returns**: Path (Saved file).
- **Description**: Optimizes and saves the SVG to a local file.

### `optimize_svg`
- **Arguments**: `svg_code` (str)
- **Description**: Optimizes SVG size using SVGO.

### `format_svg`
- **Arguments**: `svg_code` (str)
- **Description**: Formats SVG with indentation.

### `svg_to_react`
- **Arguments**: `svg_code` (str), `component_name` (str)
- **Returns**: String (JSX code).

### `svg_to_react_native`
- **Arguments**: `svg_code` (str), `component_name` (str)
- **Returns**: String (React Native JSX).

### `svg_to_data_uri`
- **Arguments**: `svg_code` (str)
- **Returns**: String (Base64 Data URI).

### `svg_to_pdf`
- **Arguments**: `svg_code` (str)
- **Returns**: Path (PDF file).

### `validate_svg`
- **Arguments**: `svg_code` (str)
- **Returns**: JSON object with validation status.

### `get_svg_metadata`
- **Arguments**: `svg_code` (str)
- **Returns**: JSON object with metadata.

---

## Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Locally**:
   ```bash
   npm start
   ```

3. **Build**:
   ```bash
   npm run build
   ```