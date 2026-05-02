import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";
import dotenv from "dotenv";
import fetch from "node-fetch";
import FormData from "form-data";
import cors from "cors";

dotenv.config();

const API_BASE = process.env.VITE_BLOCKS_API_URL || "https://api.seliseblocks.com";
const X_BLOCKS_KEY = process.env.VITE_X_BLOCKS_KEY || "f44b9e7d-7c65-4783-a360-14a7df36674e";
const PROJECT_SLUG = process.env.VITE_PROJECT_SLUG || "dryzkn";

const server = new McpServer({
  name: "Selise OMNI Manager",
  version: "1.0.0",
});

// Helper for Selise API Headers
const getHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  "x-blocks-key": X_BLOCKS_KEY,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// Tool: Get Site Content
server.tool(
  "get_site_content",
  {
    ownerId: z.string().describe("The Selise ItemId of the site owner"),
  },
  async ({ ownerId }) => {
    try {
      const graphqlUrl = `${API_BASE}/uds/v1/${PROJECT_SLUG}/gateway`;
      const query = `
        query VibeInventorySite($input: DynamicQueryInput) {
          getInventoryItems(input: $input) {
            items {
              ItemId
              ItemName
              Supplier
              ItemLoc
              ItemImageFileIds
            }
          }
        }
      `;

      const response = await fetch(graphqlUrl, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          query,
          variables: {
            input: {
              filter: JSON.stringify({ Category: "VibeSite", Supplier: ownerId }),
              pageNo: 1,
              pageSize: 1,
            },
          },
        }),
      });

      const result: any = await response.json();
      const item = result.data?.getInventoryItems?.items?.[0];

      if (!item) {
        return {
          content: [{ type: "text", text: "No site found for this owner." }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Upload Media (Base64 Fallback Logic)
server.tool(
  "upload_media",
  {
    fileName: z.string(),
    base64Data: z.string().describe("Base64 string of the image"),
    mimeType: z.string().default("image/png"),
  },
  async ({ fileName, base64Data, mimeType }) => {
    // In a real MCP server, we might attempt the Selise upload, 
    // but here we demonstrate the data URL generation for the editor
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    return {
      content: [
        { 
          type: "text", 
          text: `Media prepared. Local Data URL generated for OMNI Editor bypass.\nURL: ${dataUrl.slice(0, 50)}...` 
        }
      ],
    };
  }
);

// Set up Express App with CORS support
const app = express();
app.use(cors()); // Allow your frontend to talk to this proxy
app.use(express.json({ limit: '50mb' }));

// PROXY ROUTE: The "CORS Fixer"
app.post("/proxy/upload", async (req, res) => {
  try {
    const { base64, fileName, mimeType, bucketName } = req.body;
    
    if (!base64) return res.status(400).json({ error: "Missing base64 data" });

    const buffer = Buffer.from(base64, 'base64');
    const form = new FormData();
    form.append('File', buffer, { filename: fileName, contentType: mimeType });
    form.append('BucketName', bucketName || 'omni-media');

    const seliseResponse = await fetch(`${API_BASE}/media/v1/File`, {
      method: 'POST',
      headers: {
        'x-blocks-key': X_BLOCKS_KEY,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await seliseResponse.json();
    res.status(seliseResponse.status).json(result);
  } catch (error: any) {
    console.error("Proxy Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PROXY ROUTE: Site Content Upsert
app.post("/proxy/upsert-site", async (req, res) => {
  try {
    const { ownerId, username, siteData } = req.body;
    if (!ownerId) return res.status(400).json({ error: "ownerId is required" });

    const graphqlUrl = `${API_BASE}/uds/v1/${PROJECT_SLUG}/gateway`;
    
    // 1. Check for existing item
    const checkQuery = `
      query GetSite($input: DynamicQueryInput) {
        getInventoryItems(input: $input) {
          items { ItemId }
        }
      }
    `;
    const checkRes = await fetch(graphqlUrl, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        query: checkQuery,
        variables: {
          input: {
            filter: JSON.stringify({ Category: "VibeSite", Supplier: ownerId }),
            pageNo: 1, pageSize: 1
          }
        }
      })
    });
    const checkData: any = await checkRes.json();
    const existingId = checkData.data?.getInventoryItems?.items?.[0]?.ItemId;

    // 2. Perform Insert or Update
    const mutation = existingId 
      ? `mutation Update($itemId: String!, $input: InventoryItemInput!) {
          updateInventoryItem(itemId: $itemId, input: $input) { itemId }
        }`
      : `mutation Insert($input: InventoryItemInput!) {
          insertInventoryItem(input: $input) { itemId }
        }`;

    const input = {
      ItemName: `vibe-site:${username || 'user'}`,
      Category: "VibeSite",
      Supplier: ownerId,
      ItemLoc: username || 'user',
      ItemDescription: JSON.stringify(siteData)
    };

    const upsertRes = await fetch(graphqlUrl, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        query: mutation,
        variables: { itemId: existingId, input }
      })
    });

    const result = await upsertRes.json();
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Proxy Site Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PROXY ROUTE: Token (Login)
app.post("/proxy/token", async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/idp/v1/Authentication/Token`, {
      method: "POST",
      headers: {
        "x-blocks-key": X_BLOCKS_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(req.body).toString()
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PROXY ROUTE: Signup
app.post("/proxy/signup", async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/identifier/v1/People/Signup`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(req.body)
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PROXY ROUTE: Activate
app.post("/proxy/activate", async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/idp/v1/Iam/Activate`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(req.body)
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PROXY ROUTE: Get Account
app.get("/proxy/get-account", async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/identifier/v1/People/GetAccount`, {
      method: "GET",
      headers: {
        "x-blocks-key": X_BLOCKS_KEY,
        "Authorization": req.headers.authorization || ""
      }
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PROXY ROUTE: Get IAM Account
app.get("/proxy/iam-account", async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/idp/v1/Iam/GetAccount`, {
      method: "GET",
      headers: {
        "x-blocks-key": X_BLOCKS_KEY,
        "Authorization": req.headers.authorization || ""
      }
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

let transport: SSEServerTransport | null = null;

app.get("/sse", async (req, res) => {
  console.log("New SSE connection established");
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active SSE connection");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Selise OMNI MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Message endpoint: http://localhost:${PORT}/messages`);
});
