import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

export default function Root() {
  return (
    <html lang="en-US">
      <head>
        <Meta />
        <Links />
        <link rel="icon" href="/_static/favicon.ico" />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        {Array(100)
          .fill(null)
          .map((_, i) => (
            <p key={i}>YOOOOOOOOOO {i}</p>
          ))}
      </body>
    </html>
  );
}
