import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDelete, deleteMessage } from "./ConfirmDelete";

describe("delete wording (D1)", () => {
  it("organization", () => {
    expect(deleteMessage({ kind: "organization", id: 1, name: "Northwind Partners" }, { contacts: 3, deals: 2 })).toEqual({
      title: "Delete Northwind Partners?",
      body: "Its 3 contacts and 2 deals will be kept, with no organization.",
    });
    expect(deleteMessage({ kind: "organization", id: 1, name: "X" }, { contacts: 1, deals: 0 }).body).toBe(
      "Its 1 contact will be kept, with no organization.",
    );
    expect(deleteMessage({ kind: "organization", id: 1, name: "X" }, { contacts: 0, deals: 0 }).body).toBe(
      "It has no contacts or deals.",
    );
  });
  it("contact", () => {
    expect(deleteMessage({ kind: "contact", id: 1, name: "Ana Ruiz" }, { activities: 5, deals: 2 })).toEqual({
      title: "Delete Ana Ruiz?",
      body: "Ana Ruiz's 5 activities and follow-ups will be deleted. Their 2 deals stay, with no main contact.",
    });
    expect(deleteMessage({ kind: "contact", id: 1, name: "Ana Ruiz" }, { activities: 0, deals: 1 }).body).toBe(
      "Ana Ruiz has no activities. Their 1 deal stays, with no main contact.",
    );
  });
  it("deal", () => {
    expect(deleteMessage({ kind: "deal", id: 1, name: "Website rebuild" }, { activities: 4, stage_changes: 2 })).toEqual({
      title: "Delete Website rebuild?",
      body: "Its 4 activities and follow-ups and its stage history will be deleted.",
    });
  });
  it("activity", () => {
    expect(
      deleteMessage({ kind: "activity", id: 1, type: "call", occurredAt: "2026-11-12T10:00:00Z" }, undefined).title,
    ).toBe("Delete this call from 12 Nov 2026?");
  });
});

describe("ConfirmDelete", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the counts and focuses Cancel (D2)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ contacts: 3, deals: 2 }) }),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmDelete
          target={{ kind: "organization", id: 7, name: "Northwind Partners" }}
          onOpenChange={() => {}}
          onConfirm={() => Promise.resolve()}
        />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Its 3 contacts and 2 deals will be kept, with no organization.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/organizations/7/delete-impact", expect.anything());
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("btn-danger");
  });
});
