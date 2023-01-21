import { Links, Meta, Outlet, ScrollRestoration } from "@remix-run/react";

export default function Root() {
  return (
    <html lang="en-US">
      <head>
        <Meta />
        <Links />
        {/* favicon */}
        <link rel="icon" href="/_static/favicon.ico" />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        {/* <Scripts /> */}
        {Array(100)
          .fill(null)
          .map((_, i) => (
            <p key={i}>YOOOOOOOOOO {i}</p>
          ))}
      </body>
    </html>
  );
}
