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

const INVENTORY_CHUNK_SIZE = 2500;
const INVENTORY_CONTENT_CATEGORY = "VibeSite";
const INVENTORY_CONTENT_TAG = "vibe-site";

type SiteDataInput = Record<string, unknown>;

function isRecord(value: unknown): value is SiteDataInput {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function slugify(value: string | undefined | null, fallback = "site") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function normalizeSiteData(siteData: unknown, username: string) {
  const now = new Date().toISOString();
  const publicSlug = slugify(username, "site");
  const record = isRecord(siteData) ? siteData : {};
  return {
    ...record,
    siteName: typeof record.siteName === "string" && record.siteName ? record.siteName : "My Vibe Site",
    username: publicSlug,
    publicSlug,
    pages: Array.isArray(record.pages) ? record.pages : [],
    publishedAt: typeof record.publishedAt === "string" && record.publishedAt ? record.publishedAt : now,
    updatedAt: now,
  };
}

function encodeSiteData(data: unknown) {
  const serialized = JSON.stringify(data);
  const chunks: string[] = [];
  for (let index = 0; index < serialized.length; index += INVENTORY_CHUNK_SIZE) {
    chunks.push(serialized.slice(index, index + INVENTORY_CHUNK_SIZE));
  }
  return chunks;
}

function buildInventoryContentInput(ownerId: string, username: string, siteData: unknown, existingId?: string) {
  const now = new Date().toISOString();
  const publicSlug = slugify(username, ownerId || "user");
  const siteDataRecord = isRecord(siteData) ? siteData : {};
  const data = normalizeSiteData(siteData, publicSlug);
  const payload = {
    contentType: process.env.VITE_CONTENT_TYPE || "vibe_site",
    ownerId,
    userId: ownerId,
    username: publicSlug,
    slug: publicSlug,
    title: data.siteName,
    isPublished: true,
    projectKey: X_BLOCKS_KEY,
    projectSlug: PROJECT_SLUG,
    data,
    created_at: typeof siteDataRecord.created_at === "string" && siteDataRecord.created_at ? siteDataRecord.created_at : now,
    updated_at: now,
  };

  return {
    ...(existingId ? { ItemId: existingId } : {}),
    ItemName: `${INVENTORY_CONTENT_TAG}:${payload.slug}`,
    Category: INVENTORY_CONTENT_CATEGORY,
    Supplier: ownerId,
    ItemLoc: payload.username,
    Status: "Published",
    Tags: [INVENTORY_CONTENT_TAG, payload.slug, ownerId],
    ItemImageFileId: payload.slug,
    ItemImageFileIds: encodeSiteData(payload),
    ItemDescription: JSON.stringify(data),
    Stock: 1,
    Price: 0,
    EligibleWarranty: false,
    EligibleReplacement: false,
    Discount: false,
  };
}

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
app.use(cors({
  origin: true, // Allow all origins (or you can specify http://localhost:5173)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-blocks-key']
}));

// Logging middleware for proxy
app.use((req, res, next) => {
  if (req.url.startsWith('/proxy')) {
    console.log(`[Proxy Request] ${req.method} ${req.url}`);
  }
  next();
});

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

// PROXY ROUTE: Site Content Read
app.get("/proxy/site-content", async (req, res) => {
  try {
    const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : "";
    const slug = typeof req.query.slug === "string" ? slugify(req.query.slug, "site") : "";
    if (!ownerId && !slug) return res.status(400).json({ error: "ownerId or slug is required" });

    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
    const filter = ownerId
      ? { Category: INVENTORY_CONTENT_CATEGORY, Supplier: ownerId }
      : { Category: INVENTORY_CONTENT_CATEGORY, ItemLoc: slug };

    const graphqlUrl = `${API_BASE}/uds/v1/${PROJECT_SLUG}/gateway`;
    const query = `
      query VibeInventorySite($input: DynamicQueryInput) {
        getInventoryItems(input: $input) {
          items {
            ItemId
            ItemName
            Category
            Supplier
            ItemLoc
            Status
            Tags
            ItemImageFileId
            ItemImageFileIds
            ItemDescription
            CreatedDate
            LastUpdatedDate
          }
        }
      }
    `;

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: getHeaders(bearerToken),
      body: JSON.stringify({
        query,
        variables: {
          input: {
            filter: JSON.stringify(filter),
            sort: JSON.stringify({ LastUpdatedDate: -1 }),
            pageNo: 1,
            pageSize: 1,
          },
        },
      }),
    });

    const result = await response.json() as unknown;
    if (!response.ok || (isRecord(result) && result.errors)) {
      return res.status(response.ok ? 502 : response.status).json(result);
    }

    const data = isRecord(result) && isRecord(result.data) ? result.data : {};
    const inventory = isRecord(data.getInventoryItems) ? data.getInventoryItems : {};
    const items = Array.isArray(inventory.items) ? inventory.items : [];
    res.status(200).json({ item: items[0] || null });
  } catch (error) {
    console.error("Proxy Site Read Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// PROXY ROUTE: Site Content Upsert
app.post("/proxy/upsert-site", async (req, res) => {
  try {
    const { ownerId, username, siteData } = req.body;
    if (!ownerId) return res.status(400).json({ error: "ownerId is required" });

    const graphqlUrl = `${API_BASE}/uds/v1/${PROJECT_SLUG}/gateway`;
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
    
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
      headers: getHeaders(bearerToken),
      body: JSON.stringify({
        query: checkQuery,
        variables: {
          input: {
            filter: JSON.stringify({ Category: INVENTORY_CONTENT_CATEGORY, Supplier: ownerId }),
            pageNo: 1, pageSize: 1
          }
        }
      })
    });
    const checkData = await checkRes.json() as unknown;
    const checkResultData = isRecord(checkData) && isRecord(checkData.data) ? checkData.data : {};
    const checkInventory = isRecord(checkResultData.getInventoryItems) ? checkResultData.getInventoryItems : {};
    const checkItems = Array.isArray(checkInventory.items) ? checkInventory.items : [];
    const existingItem = isRecord(checkItems[0]) ? checkItems[0] : {};
    const existingId = typeof existingItem.ItemId === "string" ? existingItem.ItemId : undefined;

    // 2. Perform Insert or Update
    const mutation = existingId 
      ? `mutation Update($itemId: String!, $input: InventoryItemInput!) {
          updateInventoryItem(itemId: $itemId, input: $input) { itemId }
        }`
      : `mutation Insert($input: InventoryItemInput!) {
          insertInventoryItem(input: $input) { itemId }
        }`;

    const input = buildInventoryContentInput(ownerId, username || "user", siteData, existingId);

    const upsertRes = await fetch(graphqlUrl, {
      method: "POST",
      headers: getHeaders(bearerToken),
      body: JSON.stringify({
        query: mutation,
        variables: { itemId: existingId, input }
      })
    });

    const result = await upsertRes.json();
    res.status(upsertRes.status).json(result);
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
    console.log(`[IAM Account] Response for ${req.headers.authorization?.slice(0, 20)}... :`, JSON.stringify(result).slice(0, 200));
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PROXY ROUTE: Generic UDS Data CRUD
app.options(/^\/proxy\/data\/.*/, (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-blocks-key");
  res.status(200).send();
});

app.all(/^\/proxy\/data\/([^\/]+)(.*)/, async (req, res) => {
  try {
    const schemaName = req.params[0];
    const subPath = req.params[1] || "";
    const method = req.method;
    const url = `${API_BASE}/uds/v1/data/${schemaName}${subPath}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

    const response = await fetch(url, {
      method,
      headers: {
        "x-blocks-key": X_BLOCKS_KEY,
        "Authorization": req.headers.authorization || "",
        "Content-Type": "application/json"
      },
      body: ["POST", "PUT", "PATCH"].includes(method) ? JSON.stringify(req.body) : undefined
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PROXY ROUTE: Role Assignment
app.post("/proxy/assign-role", async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/idp/v1/Role/Assign`, {
      method: "POST",
      headers: {
        "x-blocks-key": X_BLOCKS_KEY,
        "Authorization": req.headers.authorization || "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
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
