import arc from "@architect/functions";

import * as app from "../../app.mjs";

export async function handler(event) {
  const connectionId = event.requestContext.connectionId;
  const message = JSON.parse(event.body);

  const headers = new Headers(message.headers);
  const request = new Request(message.url, {
    headers,
    method: message.method,
  });

  const response = await app.handler(request);

  await arc.ws.send({
    id: connectionId,
    payload: {
      headers: Array.from(response.headers.entries()),
      status: response.status,
      statusText: response.statusText,
      body: !!response.body,
    },
  });

  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let { done, value } = await reader.read();
    while (!done) {
      await arc.ws.send({
        id: connectionId,
        payload: decoder.decode(value, { stream: true }),
      });
      ({ done, value } = await reader.read());
    }

    await arc.ws.send({
      id: connectionId,
      payload: decoder.decode(),
    });
  }
  await arc.ws.close({ id: connectionId });

  return { statusCode: 200 };
}
