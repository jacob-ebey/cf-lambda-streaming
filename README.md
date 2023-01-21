# cf-lambda-streaming

Enable your AWS Lambda hosted applications to stream responses via Cloudflare Workers.

## Overview

HTTP request -> CF Worker -> CF DO configurable load balancer-> WebSocket -> AWS -> WebSocket -> CF DO -> CF Worker -> HTTP Response

## Deploying

Build the remix app:

```sh
npm run build
```

Deploy to AWS:

```sh
npx arc deploy production
```

Copy the HTTP and WS URL's printed at the end of the deployment into `wrangler.toml`
with HTTP as `ORIGIN_URL` and WS as `SOCKET_URL`.

Deploy to Cloudflare:

```sh
npx wrangler publish
```

## TODO

- [] Look into hydration errors when `<Scripts>` is added, someone who knows AWS might be able to help here. IDK how to even access logs in the dashboard.
