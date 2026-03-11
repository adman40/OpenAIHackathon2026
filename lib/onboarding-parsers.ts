import { parseResumeText, parseTranscriptText } from "./profile-upload-parsing";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name)) {
    return await file.text();
  }

  return "";
}

export async function parseTranscriptFile(file: File, major: string) {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const response = await fetch("/api/profile/parse-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "transcript",
        major,
        fileName: file.name,
        mimeType: file.type,
        base64: arrayBufferToBase64(await file.arrayBuffer()),
      }),
    });

    if (!response.ok) {
      throw new Error("Transcript parse request failed.");
    }

    return await response.json();
  }

  const extractedText = await extractTextFromFile(file);
  return parseTranscriptText(extractedText, major);
}

export async function parseResumeFile(file: File, major: string) {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const response = await fetch("/api/profile/parse-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "resume",
        major,
        fileName: file.name,
        mimeType: file.type,
        base64: arrayBufferToBase64(await file.arrayBuffer()),
      }),
    });

    if (!response.ok) {
      throw new Error("Resume parse request failed.");
    }

    return await response.json();
  }

  const extractedText = await extractTextFromFile(file);
  return parseResumeText(extractedText, major);
}

export async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to preview the selected image."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}
