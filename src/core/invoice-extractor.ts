import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

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
  passUsed: "pass1" | "pass2";
  modelUsed: string;
  rawOutput: unknown;
};

export type InvoiceExtractionInput = {
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
  provider?: string;
  model?: string;
  forceSecondPass?: boolean;
};

export interface InvoiceExtractor {
  extract(input: InvoiceExtractionInput): Promise<ExtractedInvoice>;
}

function isDebugEnabled() {
  return process.env.RENO_INVOICE_DEBUG === "1";
}

const INVOICE_LOG_PATH = path.join(
  process.cwd(),
  "storage",
  "logs",
  "invoice-extractor.log",
);

async function persistDebugLog(line: string) {
  try {
    await mkdir(path.dirname(INVOICE_LOG_PATH), { recursive: true });
    await appendFile(INVOICE_LOG_PATH, `${line}\n`, "utf8");
  } catch {
    // Best-effort logging: ignore file write errors.
  }
}

function debugLog(message: string) {
  if (!isDebugEnabled()) {
    return;
  }
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  void persistDebugLog(line);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function normalizeExtracted(
  payload: unknown,
): Omit<ExtractedInvoice, "passUsed" | "modelUsed"> {
  const root = (payload ?? {}) as Record<string, unknown>;
  const nestedInvoice = isRecord(root.invoice) ? root.invoice : null;
  const totals = (root.totals ?? nestedInvoice?.totals ?? {}) as Record<
    string,
    unknown
  >;
  const linesCandidate =
    root.lines ??
    root.lineItems ??
    root.items ??
    nestedInvoice?.lines ??
    nestedInvoice?.lineItems ??
    nestedInvoice?.items;
  const linesRaw = Array.isArray(linesCandidate) ? linesCandidate : [];

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
    vendorName: asString(root.vendorName || nestedInvoice?.vendorName),
    invoiceNumber: asString(root.invoiceNumber || nestedInvoice?.invoiceNumber),
    invoiceDate: asString(root.invoiceDate || nestedInvoice?.invoiceDate),
    currency: asString(root.currency || nestedInvoice?.currency) || "CAD",
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
  private readonly secondPassModel: string;

  constructor(params: {
    apiKey: string;
    model: string;
    secondPassModel: string;
  }) {
    this.apiKey = params.apiKey;
    this.model = params.model;
    this.secondPassModel = params.secondPassModel;
  }

  private async runOpenAiExtraction(params: {
    dataUrl: string;
    model: string;
    prompt: string;
    passLabel: "pass1" | "pass2";
  }): Promise<ExtractedInvoice> {
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
        model: params.model,
        input: [
          {
            role: "system",
            content:
              "You are a high-precision invoice extraction engine. Return strict JSON only (no markdown, no extra text).",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  params.prompt,
                  "Return every visible line item, including zero-tax lines and discount-like lines if they are product/service lines.",
                  "Do not collapse multiple SKU lines into one summary line.",
                  "If quantity or unit price is uncertain, infer from nearby text and set needsReview=true.",
                  "Make best effort to include all purchasable lines.",
                  "Return only JSON matching this shape:",
                  JSON.stringify(schemaHint),
                ].join("\n"),
              },
              {
                type: "input_image",
                image_url: params.dataUrl,
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
    const outputTextCandidates: string[] = [];
    if (typeof payload.output_text === "string" && payload.output_text.trim()) {
      outputTextCandidates.push(payload.output_text);
    }
    const output = payload.output;
    if (Array.isArray(output)) {
      for (const item of output) {
        const content = (item as { content?: unknown }).content;
        if (!Array.isArray(content)) {
          continue;
        }
        for (const block of content) {
          const text =
            (block as { text?: unknown }).text ??
            (block as { output_text?: unknown }).output_text;
          if (typeof text === "string" && text.trim()) {
            outputTextCandidates.push(text);
          }
        }
      }
    }

    const outputText = outputTextCandidates.join("\n").trim();
    if (!outputText) {
      debugLog(
        `[invoice-extractor] ${params.passLabel} openai raw payload (no output_text): ${JSON.stringify(payload)}`,
      );
      throw new Error("OpenAI response did not include text output.");
    }
    debugLog(
      `[invoice-extractor] ${params.passLabel} openai output_text: ${outputText.slice(0, 8000)}`,
    );

    const text = outputText;
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
    if (isDebugEnabled()) {
      debugLog(
        `[invoice-extractor] ${params.passLabel} openai raw parsed: ${JSON.stringify(parsed)}`,
      );
      const root = isRecord(parsed) ? parsed : {};
      const nestedInvoice = isRecord(root.invoice) ? root.invoice : {};
      const lineCounts = {
        lines: Array.isArray(root.lines) ? root.lines.length : 0,
        lineItems: Array.isArray(root.lineItems) ? root.lineItems.length : 0,
        items: Array.isArray(root.items) ? root.items.length : 0,
        invoiceLines: Array.isArray(nestedInvoice.lines)
          ? nestedInvoice.lines.length
          : 0,
        invoiceLineItems: Array.isArray(nestedInvoice.lineItems)
          ? nestedInvoice.lineItems.length
          : 0,
        invoiceItems: Array.isArray(nestedInvoice.items)
          ? nestedInvoice.items.length
          : 0,
      };
      debugLog(
        `[invoice-extractor] ${params.passLabel} parsed keys=${Object.keys(root).join(",")} line_counts=${JSON.stringify(lineCounts)}`,
      );
    }
    const normalized = normalizeExtracted(parsed);
    debugLog(
      `[invoice-extractor] ${params.passLabel} normalized summary vendor="${normalized.vendorName}" invoice="${normalized.invoiceNumber}" date="${normalized.invoiceDate}" lines=${normalized.lines.length} totals=${JSON.stringify(normalized.totals)}`,
    );
    return {
      ...normalized,
      passUsed: params.passLabel,
      modelUsed: params.model,
    };
  }

  async extract(input: InvoiceExtractionInput): Promise<ExtractedInvoice> {
    const firstPassModel = input.model || this.model;
    debugLog(
      `[invoice-extractor] provider=openai model=${firstPassModel} second_pass_model=${this.secondPassModel} mime=${input.mimeType} file=${input.fileName}`,
    );
    if (!input.mimeType.startsWith("image/")) {
      throw new Error(
        "OpenAI invoice extraction currently supports image files only.",
      );
    }

    const dataUrl = `data:${input.mimeType};base64,${input.fileBuffer.toString("base64")}`;
    if (input.forceSecondPass) {
      debugLog("[invoice-extractor] forceSecondPass=true, skipping pass1");
      const forcedPrompt = [
        "Re-extract this invoice with focus on complete line-item recovery.",
        "Do not return a summarized list; return every purchasable line item visible on the invoice.",
        "Preserve line-level quantity, unit price, and total when visible.",
        "If a value is unclear, keep the line with best estimate and set needsReview=true with a note.",
        "Invoice date must be read strictly from the document.",
      ].join(" ");
      return this.runOpenAiExtraction({
        dataUrl,
        model: this.secondPassModel,
        prompt: forcedPrompt,
        passLabel: "pass2",
      });
    }

    const firstPrompt = [
      "Extract vendor, invoice number, invoice date, currency, totals, and all line items from this invoice image.",
      "Invoice date must come from the document; never infer from current date.",
      "Capture line items at receipt-line granularity.",
      "Where possible, ensure the sum of lineTotal values approximately matches subtotal; if not possible, still include all visible lines and flag uncertain ones with needsReview=true.",
    ].join(" ");

    const firstPass = await this.runOpenAiExtraction({
      dataUrl,
      model: firstPassModel,
      prompt: firstPrompt,
      passLabel: "pass1",
    });

    const subtotal = firstPass.totals.subTotal;
    const lineSum = firstPass.lines.reduce(
      (sum, line) => sum + line.lineTotal,
      0,
    );
    const coverage = subtotal > 0 ? lineSum / subtotal : 1;
    const shouldRunSecondPass =
      firstPass.lines.length <= 1 && subtotal > 0 && coverage < 0.7;

    if (!shouldRunSecondPass) {
      return firstPass;
    }

    debugLog(
      `[invoice-extractor] triggering second pass lines=${firstPass.lines.length} subtotal=${subtotal} line_sum=${lineSum} coverage=${coverage.toFixed(3)}`,
    );

    const secondPrompt = [
      "Re-extract this invoice with focus on complete line-item recovery.",
      "Do not return a summarized list; return every purchasable line item visible on the invoice.",
      "Preserve line-level quantity, unit price, and total when visible.",
      "If a value is unclear, keep the line with best estimate and set needsReview=true with a note.",
      "Invoice date must be read strictly from the document.",
    ].join(" ");

    const secondPass = await this.runOpenAiExtraction({
      dataUrl,
      model: this.secondPassModel,
      prompt: secondPrompt,
      passLabel: "pass2",
    });

    const chosen =
      secondPass.lines.length > firstPass.lines.length ? secondPass : firstPass;
    debugLog(
      `[invoice-extractor] pass comparison pass1_lines=${firstPass.lines.length} pass2_lines=${secondPass.lines.length} selected=${chosen === secondPass ? "pass2" : "pass1"}`,
    );
    return chosen;
  }
}

class FallbackInvoiceExtractor implements InvoiceExtractor {
  async extract(input: InvoiceExtractionInput): Promise<ExtractedInvoice> {
    debugLog(
      `[invoice-extractor] provider=fallback mime=${input.mimeType} file=${input.fileName}`,
    );
    return {
      vendorName: "",
      invoiceNumber: input.fileName,
      invoiceDate: "",
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
      passUsed: "pass1",
      modelUsed: "fallback",
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
    debugLog(
      `[invoice-extractor] configured provider=openai key_present=${Boolean(key)} model=${process.env.RENO_INVOICE_LLM_MODEL?.trim() || "gpt-5-nano"} second_pass_model=${process.env.RENO_INVOICE_LLM_SECOND_PASS_MODEL?.trim() || "gpt-5-mini"}`,
    );
    if (!key) {
      return new FallbackInvoiceExtractor();
    }
    const model = process.env.RENO_INVOICE_LLM_MODEL?.trim() || "gpt-5-nano";
    const secondPassModel =
      process.env.RENO_INVOICE_LLM_SECOND_PASS_MODEL?.trim() || "gpt-5-mini";
    return new OpenAiInvoiceExtractor({ apiKey: key, model, secondPassModel });
  }

  return new FallbackInvoiceExtractor();
}
