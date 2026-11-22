import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { fakeBackend, renderScreen } from "./render";

afterEach(() => vi.unstubAllGlobals());

function Greeting() {
  const { data, error } = useQuery({
    queryKey: ["g"],
    queryFn: () => api.get<{ name: string }>("/hello"),
  });
  if (error) return <p>{error.message}</p>;
  return <p>{data ? `Hello ${data.name}` : "Loading"}</p>;
}

it("serves fake routes to screens", async () => {
  fakeBackend({ "GET /hello": { name: "Ada" } });
  renderScreen(<Greeting />);
  expect(await screen.findByText("Hello Ada")).toBeInTheDocument();
});

it("sends error replies as API errors", async () => {
  fakeBackend({ "GET /hello": { status: 409, detail: "Taken" } });
  renderScreen(<Greeting />);
  expect(await screen.findByText("Taken")).toBeInTheDocument();
});
