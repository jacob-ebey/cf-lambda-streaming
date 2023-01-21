export default {
  /**
   * @param {Request} request
   * @param {{
   *  AWS_BRIDGE: import("@cloudflare/workers-types").DurableObjectNamespace
   * }} env
   * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
   * @returns {Response}
   */
  async fetch(request, env, ctx) {
    ctx.passThroughOnException();

    let webSocketResponse = await fetch("http://localhost:3333", {
      headers: {
        Upgrade: "websocket",
      },
      signal: request.signal,
    });

    /** @type {WebSocket} */
    const ws = webSocketResponse.webSocket;
    if (!ws) {
      return new Response("Server did not accept WebSocket");
    }
    ws.accept();

    ws.send(
      JSON.stringify({
        headers: Array.from(request.headers.entries()),
        method: request.method,
        url: request.url,
        body: !!request.body,
      })
    );

    let resolveResponseInit;
    const responseInitCallback = (event) => {
      const responseInfo = JSON.parse(event.data);

      resolveResponseInit({
        headers: new Headers(responseInfo.headers),
        status: responseInfo.status,
        statusText: responseInfo.statusText,
        body: responseInfo.body,
      });
      ws.removeEventListener("message", responseInitCallback);
    };

    let responseInit = await new Promise((resolve) => {
      resolveResponseInit = resolve;
      ws.addEventListener("message", responseInitCallback);
    });

    let body = null;
    if (responseInit.body) {
      body = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          ws.addEventListener("message", (event) => {
            controller.enqueue(encoder.encode(JSON.parse(event.data)));
          });
          ws.addEventListener("close", () => {
            controller.close();
          });
        },
      });
    }

    return new Response(body, {
      headers: responseInit.headers,
      status: responseInit.status,
      statusText: responseInit.statusText,
    });
  },
};
