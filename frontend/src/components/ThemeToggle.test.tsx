import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => localStorage.clear());
afterEach(() => {
  delete document.documentElement.dataset.theme;
});

const html = document.documentElement;
const toggle = (name: string) => screen.getByRole("button", { name });

it("starts in light mode, offering dark", () => {
  render(<ThemeToggle />);
  expect(toggle("Switch to dark mode")).toBeInTheDocument();
  expect(html).not.toHaveAttribute("data-theme");
});

it("starts in dark mode when that's what was stored", () => {
  localStorage.setItem("accountable.theme", "dark");
  render(<ThemeToggle />);
  expect(toggle("Switch to light mode")).toBeInTheDocument();
});

it("switches to dark mode and back, remembering each choice", async () => {
  render(<ThemeToggle />);
  await userEvent.click(toggle("Switch to dark mode"));
  expect(html).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem("accountable.theme")).toBe("dark");

  await userEvent.click(toggle("Switch to light mode"));
  expect(html).not.toHaveAttribute("data-theme");
  expect(localStorage.getItem("accountable.theme")).toBe("light");
  expect(toggle("Switch to dark mode")).toBeInTheDocument();
});

it.each(["{Enter}", " "])("works from the keyboard with %s", async (key) => {
  render(<ThemeToggle />);
  toggle("Switch to dark mode").focus();
  await userEvent.keyboard(key);
  expect(html).toHaveAttribute("data-theme", "dark");
  expect(toggle("Switch to light mode")).toHaveFocus();
});
