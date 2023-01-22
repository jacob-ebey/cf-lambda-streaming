import { createRequestHandler } from "@remix-run/node";

import * as build from "./remix.mjs";

const requestHandler = createRequestHandler(build);

/**
 * @param {Request} request
 */
export async function handler(request) {
  return await requestHandler(request, process.env.NODE_ENV);
}
