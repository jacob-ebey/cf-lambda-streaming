import { Suspense, useState } from "react";
import { defer } from "@remix-run/node";
import { Await, Link, useLoaderData } from "@remix-run/react";

export function loader() {
  return defer({
    deferred: new Promise((resolve) =>
      setTimeout(() => {
        resolve("I WAS DEFERRED!!!!!!");
      }, 500)
    ),
  });
}

export default function Deferred() {
  const { deferred } = useLoaderData();
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Deferred</h1>
      <p>
        <Link to="/about">Go to About page</Link>
      </p>
      <p>Count: {count}</p>
      <p>
        <button onClick={() => setCount(count + 1)}>Increment</button>
      </p>
      <Suspense
        fallback={
          <div>
            <p>LOADING...</p>
          </div>
        }
      >
        <Await
          resolve={deferred}
          children={(resolved) => (
            <div>
              <p>{resolved}</p>
            </div>
          )}
        />
      </Suspense>
      {Array(100)
        .fill(null)
        .map((_, i) => (
          <p key={i}>Home {i}</p>
        ))}
    </div>
  );
}
