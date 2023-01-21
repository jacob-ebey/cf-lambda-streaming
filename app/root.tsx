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
        {/* favicon */}
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        {Array(10000)
          .fill(null)
          .map((_, i) => (
            <p key={i}>YOOOOOOOOOO {i}</p>
          ))}
      </body>
    </html>
  );
}
