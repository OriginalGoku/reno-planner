export type ExtractedInvoiceLine = {
  sourceText: string;
  description: string;
  quantity: number;
  unitType:
    | "linear_ft"
    | "sqft"
    | "sqm"
    | "piece"
    | "bundle"
    | "box"
    | "roll"
    | "sheet"
    | "bag"
    | "gallon"
    | "liter"
    | "kg"
    | "lb"
    | "meter"
    | "other";
  unitPrice: number;
  lineTotal: number;
  confidence: number;
  needsReview: boolean;
  notes: string;
};

export type ExtractedInvoice = {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  totals: {
    subTotal: number;
    tax: number;
    shipping: number;
    otherFees: number;
    grandTotal: number;
  };
  lines: ExtractedInvoiceLine[];
  rawOutput: unknown;
};

export type InvoiceExtractionInput = {
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
  provider?: string;
  model?: string;
};

export interface InvoiceExtractor {
  extract(input: InvoiceExtractionInput): Promise<ExtractedInvoice>;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const n = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function coerceUnit(value: unknown): ExtractedInvoiceLine["unitType"] {
  const unit = asString(value).toLowerCase();
  const allowed: ExtractedInvoiceLine["unitType"][] = [
    "linear_ft",
    "sqft",
    "sqm",
    "piece",
    "bundle",
    "box",
    "roll",
    "sheet",
    "bag",
    "gallon",
    "liter",
    "kg",
    "lb",
    "meter",
    "other",
  ];
  if (allowed.includes(unit as ExtractedInvoiceLine["unitType"])) {
    return unit as ExtractedInvoiceLine["unitType"];
  }
  return "other";
}

function normalizeExtracted(payload: unknown): ExtractedInvoice {
  const root = (payload ?? {}) as Record<string, unknown>;
  const totals = (root.totals ?? {}) as Record<string, unknown>;
  const linesRaw = Array.isArray(root.lines) ? root.lines : [];

  const lines: ExtractedInvoiceLine[] = linesRaw.map((rawLine) => {
    const line = (rawLine ?? {}) as Record<string, unknown>;
    const quantity = asNumber(line.quantity);
    const unitPrice = asNumber(line.unitPrice);
    const lineTotalRaw = asNumber(line.lineTotal);
    const lineTotal = lineTotalRaw > 0 ? lineTotalRaw : quantity * unitPrice;
    const confidenceRaw = asNumber(line.confidence);
    const confidence = Math.max(0, Math.min(1, confidenceRaw));
    return {
      sourceText: asString(line.sourceText),
      description: asString(line.description),
      quantity,
      unitType: coerceUnit(line.unitType),
      unitPrice,
      lineTotal,
      confidence,
      needsReview:
        typeof line.needsReview === "boolean" ? line.needsReview : true,
      notes: asString(line.notes),
    };
  });

  return {
    vendorName: asString(root.vendorName),
    invoiceNumber: asString(root.invoiceNumber),
    invoiceDate: asString(root.invoiceDate),
    currency: asString(root.currency) || "CAD",
    totals: {
      subTotal: asNumber(totals.subTotal),
      tax: asNumber(totals.tax),
      shipping: asNumber(totals.shipping),
      otherFees: asNumber(totals.otherFees),
      grandTotal: asNumber(totals.grandTotal),
    },
    lines,
    rawOutput: payload,
  };
}

class OpenAiInvoiceExtractor implements InvoiceExtractor {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(params: { apiKey: string; model: string }) {
    this.apiKey = params.apiKey;
    this.model = params.model;
  }

  async extract(input: InvoiceExtractionInput): Promise<ExtractedInvoice> {
    if (!input.mimeType.startsWith("image/")) {
      throw new Error("OpenAI invoice extraction currently supports image files only.");
    }

    const dataUrl = `data:${input.mimeType};base64,${input.fileBuffer.toString("base64")}`;
    const schemaHint = {
      vendorName: "string",
      invoiceNumber: "string",
      invoiceDate: "YYYY-MM-DD string",
      currency: "ISO string like CAD",
      totals: {
        subTotal: "number",
        tax: "number",
        shipping: "number",
        otherFees: "number",
        grandTotal: "number",
      },
      lines: [
        {
          sourceText: "string",
          description: "string",
          quantity: "number",
          unitType:
            "linear_ft|sqft|sqm|piece|bundle|box|roll|sheet|bag|gallon|liter|kg|lb|meter|other",
          unitPrice: "number",
          lineTotal: "number",
          confidence: "number 0..1",
          needsReview: "boolean",
          notes: "string",
        },
      ],
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: input.model || this.model,
        input: [
          {
            role: "system",
            content:
              "You are an invoice extraction engine. Return strict JSON only, no markdown.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Extract invoice fields and line items from this image.",
                  "If uncertain, set needsReview=true and lower confidence.",
                  "Return only JSON matching this shape:",
                  JSON.stringify(schemaHint),
                ].join("\n"),
              },
              {
                type: "input_image",
                image_url: dataUrl,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI extraction failed (${response.status}): ${body.slice(0, 400)}`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const outputText =
      typeof payload.output_text === "string"
        ? payload.output_text
        : JSON.stringify(payload);

    const text = outputText.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error("OpenAI response did not contain valid JSON.");
      }
      parsed = JSON.parse(match[0]);
    }
    return normalizeExtracted(parsed);
  }
}

class FallbackInvoiceExtractor implements InvoiceExtractor {
  async extract(input: InvoiceExtractionInput): Promise<ExtractedInvoice> {
    const now = new Date().toISOString();
    return {
      vendorName: "",
      invoiceNumber: input.fileName,
      invoiceDate: now.slice(0, 10),
      currency: "CAD",
      totals: {
        subTotal: 0,
        tax: 0,
        shipping: 0,
        otherFees: 0,
        grandTotal: 0,
      },
      lines: [
        {
          sourceText: input.fileName,
          description: "",
          quantity: 0,
          unitType: "other",
          unitPrice: 0,
          lineTotal: 0,
          confidence: 0,
          needsReview: true,
          notes: "No extractor configured; manual review required.",
        },
      ],
      rawOutput: {
        provider: "fallback",
        reason: "LLM extractor unavailable",
      },
    };
  }
}

export function buildInvoiceExtractor(): InvoiceExtractor {
  const provider = (process.env.RENO_INVOICE_LLM_PROVIDER || "openai")
    .trim()
    .toLowerCase();
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      return new FallbackInvoiceExtractor();
    }
    const model = process.env.RENO_INVOICE_LLM_MODEL?.trim() || "gpt-5-nano";
    return new OpenAiInvoiceExtractor({ apiKey: key, model });
  }

  return new FallbackInvoiceExtractor();
}
