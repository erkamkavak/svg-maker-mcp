import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import sharp from "sharp";
import { optimize } from "svgo";
import format from "xml-formatter";
import { transform } from "@svgr/core";
import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { SVG_TAGS } from "./svg_standards.js";

const OUTPUT_DIR = path.join(process.cwd(), "output");

// Ensure output directory exists
if (!fsSync.existsSync(OUTPUT_DIR)) {
  fsSync.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export const configSchema = z.object({
  // No config needed for now, but keeping structure
});

function validateSvgContent(svgCode: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validationResult = XMLValidator.validate(svgCode);
  if (validationResult !== true) {
    return {
      valid: false,
      errors: [`XML Syntax Error: ${(validationResult as any).err?.msg || "Invalid XML"}`],
      warnings: [],
    };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  
  try {
    const jsonObj = parser.parse(svgCode);
    const rootKeys = Object.keys(jsonObj);
    const rootTag = rootKeys.find(key => key !== "?xml");
    
    if (!rootTag || rootTag.replace(/^.*:/, "") !== "svg") {
       errors.push(`Root element must be 'svg', found '${rootTag || "none"}'`);
    }
  } catch (e: any) {
    errors.push(`Parsing error: ${e.message}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function createServerInstance() {
  const server = new McpServer({
    name: "SVG Maker",
    version: "1.0.0",
  });

  server.registerTool(
    "render_svg",
    {
      title: "Render SVG",
      description: "Renders SVG code to a PNG image for visual verification.",
      inputSchema: z.object({
        svg_code: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    },
    async ({ svg_code, width, height }) => {
      const validation = validateSvgContent(svg_code);
      if (!validation.valid) {
        throw new Error(`Invalid SVG: ${validation.errors.join("; ")}`);
      }

      try {
        let pipeline = sharp(Buffer.from(svg_code));
        if (width || height) {
          pipeline = pipeline.resize(width, height);
        }
        const pngBuffer = await pipeline.png().toBuffer();
        return {
          content: [
            {
              type: "image",
              data: pngBuffer.toString("base64"),
              mimeType: "image/png",
            },
          ],
        };
      } catch (e: any) {
        throw new Error(`Error rendering SVG: ${e.message}`);
      }
    }
  );

  server.registerTool(
    "save_svg",
    {
      title: "Save SVG",
      description: "Saves the SVG code to a file on the local system.",
      inputSchema: z.object({
        svg_code: z.string(),
        filename: z.string(),
        optimize: z.boolean().optional().default(true),
      }),
    },
    async ({ svg_code, filename, optimize: shouldOptimize }) => {
      try {
        let content = svg_code;
        if (shouldOptimize) {
          try {
            const result = optimize(svg_code, {
              multipass: true,
              plugins: ['preset-default', 'removeDimensions', { name: 'removeViewBox', active: false }]
            });
            content = result.data;
          } catch (e) {
            console.warn("Optimization failed, saving original", e);
          }
        }

        if (!filename.toLowerCase().endsWith(".svg")) {
          filename += ".svg";
        }

        const finalPath = path.resolve(process.cwd(), filename);
        const dir = path.dirname(finalPath);
        await fs.mkdir(dir, { recursive: true });
        
        await fs.writeFile(finalPath, content, "utf-8");
        return {
          content: [{ type: "text", text: finalPath }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error saving SVG: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "optimize_svg",
    {
      title: "Optimize SVG",
      description: "Optimizes and minifies SVG code using SVGO.",
      inputSchema: z.object({
        svg_code: z.string(),
      }),
    },
    async ({ svg_code }) => {
      try {
        const result = optimize(svg_code, {
          multipass: true,
          plugins: ['preset-default', { name: 'removeViewBox', active: false }]
        });
        return {
          content: [{ type: "text", text: result.data }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error optimizing SVG: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "format_svg",
    {
      title: "Format SVG",
      description: "Prettifies SVG code.",
      inputSchema: z.object({
        svg_code: z.string(),
      }),
    },
    async ({ svg_code }) => {
      try {
        const formatted = format(svg_code, {
          indentation: "  ",
          collapseContent: true,
          lineSeparator: "\n",
        });
        return {
          content: [{ type: "text", text: formatted }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error formatting SVG: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "svg_to_react",
    {
      title: "SVG to React",
      description: "Converts SVG code to a React Functional Component.",
      inputSchema: z.object({
        svg_code: z.string(),
        component_name: z.string().optional().default("SvgComponent"),
      }),
    },
    async ({ svg_code, component_name }) => {
      try {
        const jsCode = await transform(
          svg_code,
          { icon: true, plugins: ["@svgr/plugin-jsx"] },
          { componentName: component_name }
        );
        return {
          content: [{ type: "text", text: jsCode }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error converting to React: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "svg_to_react_native",
    {
      title: "SVG to React Native",
      description: "Converts SVG code to a React Native Component.",
      inputSchema: z.object({
        svg_code: z.string(),
        component_name: z.string().optional().default("SvgComponent"),
      }),
    },
    async ({ svg_code, component_name }) => {
      try {
        const jsCode = await transform(
          svg_code,
          { native: true, plugins: ["@svgr/plugin-jsx"] },
          { componentName: component_name }
        );
        return {
          content: [{ type: "text", text: jsCode }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error converting to React Native: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "svg_to_data_uri",
    {
      title: "SVG to Data URI",
      description: "Converts SVG code into a base64-encoded Data URI.",
      inputSchema: z.object({
        svg_code: z.string(),
      }),
    },
    async ({ svg_code }) => {
      try {
        const encoded = Buffer.from(svg_code).toString("base64");
        return {
          content: [{ type: "text", text: `data:image/svg+xml;base64,${encoded}` }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error converting to Data URI: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "svg_to_pdf",
    {
      title: "SVG to PDF",
      description: "Converts SVG code into a PDF document.",
      inputSchema: z.object({
        svg_code: z.string(),
      }),
    },
    async ({ svg_code }) => {
      try {
        const filename = `${uuidv4()}.pdf`;
        const filepath = path.join(OUTPUT_DIR, filename);

        const doc = new PDFDocument();
        const writeStream = fsSync.createWriteStream(filepath);
        doc.pipe(writeStream);
        SVGtoPDF(doc, svg_code, 0, 0);
        doc.end();

        await new Promise((resolve, reject) => {
           writeStream.on('finish', resolve);
           writeStream.on('error', reject);
        });

        return {
          content: [{ type: "text", text: path.resolve(filepath) }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error converting SVG to PDF: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
  
  server.registerTool(
    "validate_svg",
     {
      title: "Validate SVG",
      description: "Validates SVG code.",
      inputSchema: z.object({
        svg_code: z.string(),
      }),
    },
    async ({ svg_code }) => {
      const result = validateSvgContent(svg_code);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_svg_metadata",
    {
      title: "Get SVG Metadata",
      description: "Extracts metadata from SVG code.",
      inputSchema: z.object({
        svg_code: z.string(),
      }),
    },
    async ({ svg_code }) => {
      try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
        });
        const jsonObj = parser.parse(svg_code);
        let root = jsonObj.svg;
        if (!root) {
             const keys = Object.keys(jsonObj).filter(k => k !== "?xml");
             if (keys.length > 0) root = jsonObj[keys[0]];
        }
        if (!root) throw new Error("Could not find SVG root element");

        const metadata = {
          width: root["@_width"],
          height: root["@_height"],
          viewBox: root["@_viewBox"],
          title: root.title,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(metadata, null, 2) }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error extracting metadata: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

// Entry point
async function run() {
  const transport = process.env.MCP_TRANSPORT || "stdio";

  if (transport === "stdio") {
    const server = createServerInstance();
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
  } else if (transport === "sse") {
    const app = express();
    const server = createServerInstance();
    let sseTransport: SSEServerTransport;

    app.get("/sse", async (req, res) => {
      sseTransport = new SSEServerTransport("/messages", res);
      await server.connect(sseTransport);
    });

    app.post("/messages", async (req, res) => {
      if (sseTransport) {
        await sseTransport.handlePostMessage(req, res);
      }
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.error(`SSE Server listening on port ${port}`);
    });
  }
}

run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});