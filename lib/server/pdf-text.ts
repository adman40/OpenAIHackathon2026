export async function extractPdfTextFromBuffer(buffer: Uint8Array) {
  const { PdfReader } = await import("pdfreader");

  return await new Promise<string>((resolve, reject) => {
    const lines: string[] = [];

    new PdfReader().parseBuffer(Buffer.from(buffer), (error, item) => {
      if (error) {
        reject(error);
        return;
      }

      if (!item) {
        resolve(lines.join("\n"));
        return;
      }

      if ("text" in item && typeof item.text === "string") {
        lines.push(item.text);
      }
    });
  });
}
