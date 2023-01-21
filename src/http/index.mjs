import * as app from "../app.mjs";

/** @type {import("aws-lambda").APIGatewayProxyHandlerV2} */
export async function handler(event) {
  const request = createRequest(event);

  const response = await app.handler(request);

  return sendResponse(response);
}

async function sendResponse(response) {
  const cookies = [];
  // Arc/AWS API Gateway will send back set-cookies outside of response headers.
  for (let [key, values] of Object.entries(response.headers.entries())) {
    if (key.toLowerCase() === "set-cookie") {
      for (let value of values) {
        cookies.push(value);
      }
    }
  }

  if (cookies.length) {
    response.headers.delete("Set-Cookie");
  }

  const contentType = response.headers.get("Content-Type");
  const isBase64Encoded = isBinaryType(contentType);
  let body;

  if (response.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(response.body, "base64");
    } else {
      body = await response.text();
    }
  }

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    cookies,
    body,
    isBase64Encoded,
  };
}

/**
 * @param {import("aws-lambda").APIGatewayProxyEventV2} event
 */
function createRequest(event) {
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const search = event.rawQueryString.length ? `?${event.rawQueryString}` : "";
  const scheme = process.env.ARC_SANDBOX ? "http" : "https";
  const url = new URL(event.rawPath + search, `${scheme}://${host}`);
  const isFormData = event.headers["content-type"]?.includes(
    "multipart/form-data"
  );

  const headers = new Headers();
  for (let [header, value] of Object.entries(event.headers)) {
    if (value) {
      headers.append(header, value);
    }
  }
  if (event.cookies) {
    headers.append("Cookie", event.cookies.join("; "));
  }

  const controller = new AbortController();
  return new Request(url.href, {
    body:
      event.body && event.isBase64Encoded
        ? isFormData
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "base64").toString()
        : event.body,
    headers,
    method: event.requestContext.http.method,
    signal: controller.signal,
  });
}

async function readableStreamToString(stream, encoding) {
  let reader = stream.getReader();
  let chunks = [];

  async function read() {
    let { done, value } = await reader.read();

    if (done) {
      return;
    } else if (value) {
      chunks.push(value);
    }

    await read();
  }

  await read();

  return Buffer.concat(chunks).toString(encoding);
}

/**
 * Common binary MIME types
 * @see https://github.com/architect/functions/blob/45254fc1936a1794c185aac07e9889b241a2e5c6/src/http/helpers/binary-types.js
 */
const binaryTypes = [
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
];

function isBinaryType(contentType) {
  if (!contentType) return false;
  const [test] = contentType.split(";");
  return binaryTypes.includes(test);
}
