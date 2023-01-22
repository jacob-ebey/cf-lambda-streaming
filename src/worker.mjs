import { identify, Group, Replica } from "dog";

/**
 * @typedef {{
 *  ORIGIN_URL: string;
 *  SOCKET_URL: string;
 *  AWS_BRIDGE: import("@cloudflare/workers-types").DurableObjectNamespace
 *  AWS_POOL: import("@cloudflare/workers-types").DurableObjectNamespace
 * }} Env
 */

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
   * @returns {Response}
   */
  async fetch(request, env, ctx) {
    ctx.passThroughOnException();

    if (!(request.headers.get("Accept") || "").includes("text/html")) {
      const url = new URL(request.url);
      return await fetch(
        new URL(url.pathname + url.search, env.ORIGIN_URL),
        request
      );
    }

    const poolId = env.AWS_POOL.idFromName("singleton");
    const replica = await identify(poolId, "AWS_POOL", {
      child: env.AWS_BRIDGE,
      parent: env.AWS_POOL,
    });

    return await replica.fetch(request);
  },
};

export class AWSPool extends Group {
  limit = 10;

  /**
   * @param {Env} env
   */
  link(env) {
    return {
      child: env.AWS_BRIDGE,
      self: env.AWS_POOL,
    };
  }
}

export class AWSBridge extends Replica {
  /**
   *
   * @param {Env} env
   */
  link(env) {
    return {
      parent: env.AWS_POOL,
      self: env.AWS_BRIDGE,
    };
  }

  /**
   *
   * @param {import("@cloudflare/workers-types").DurableObjectState} state
   * @param {Env} env
   */
  constructor(state, env) {
    super(state, env);

    this.state = state;

    this.state.blockConcurrencyWhile(async () => {
      console.log("Connecting to WebSocket...");
      if (!this.ws) {
        let webSocketResponse = await fetch(env.SOCKET_URL, {
          headers: {
            Upgrade: "websocket",
          },
        });

        /** @type {WebSocket} */
        this.ws = webSocketResponse.webSocket;
        if (!this.ws) {
          throw new Error("Server did not accept WebSocket");
        }
        await this.ws.accept();
      }
    });
  }

  /**
   * @param {Request} request
   */
  async receive(request) {
    const id = crypto.randomUUID();
    this.ws.send(
      JSON.stringify({
        id,
        headers: Array.from(request.headers.entries()),
        method: request.method,
        url: request.url,
        body: !!request.body,
      })
    );

    let resolveResponseInit;
    const responseInitCallback = (event) => {
      const responseInfo = JSON.parse(event.data);

      if (responseInfo.id !== id) {
        return;
      }

      resolveResponseInit({
        headers: new Headers(responseInfo.headers),
        status: responseInfo.status,
        statusText: responseInfo.statusText,
        body: responseInfo.body,
      });
      this.ws.removeEventListener("message", responseInitCallback);
    };

    let responseInit = await new Promise((resolve) => {
      resolveResponseInit = resolve;
      this.ws.addEventListener("message", responseInitCallback);
    });

    let body = null;
    if (responseInit.body) {
      body = new ReadableStream({
        start: async (controller) => {
          const encoder = new TextEncoder();
          this.ws.addEventListener("message", (event) => {
            const message = JSON.parse(event.data);
            if (message.id !== id) {
              return;
            }
            if (typeof message.body === "string") {
              controller.enqueue(encoder.encode(message.body));
            }
            if (message.done) {
              controller.close();
            }
          });
          this.ws.addEventListener("close", () => {
            controller.error(new Error("WebSocket closed"));
          });
        },
      });
    }

    return new Response(body, {
      headers: responseInit.headers,
      status: responseInit.status,
      statusText: responseInit.statusText,
    });
  }
}
