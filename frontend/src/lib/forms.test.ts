import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError } from "../api/client";
import { changedOnly, showServerErrors } from "./forms";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

type Values = { name: string; value: number };

beforeEach(() => vi.mocked(toast.error).mockClear());

describe("showServerErrors (V5)", () => {
  it("puts each field's message next to that field", () => {
    const setError = vi.fn();
    const error = new ApiError(422, "Name is required", { name: "Name is required" });
    showServerErrors<Values>(error, setError, ["name", "value"]);
    expect(setError).toHaveBeenCalledWith("name", { type: "server", message: "Name is required" });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows a toast when the error isn't about a field on the form", () => {
    const setError = vi.fn();
    const error = new ApiError(422, "Stage is invalid", { stage: "Stage is invalid" });
    showServerErrors<Values>(error, setError, ["name"]);
    expect(setError).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Stage is invalid");
  });

  it("shows any other error's message in a toast", () => {
    showServerErrors<Values>(new Error("Network down"), vi.fn(), ["name"]);
    expect(toast.error).toHaveBeenCalledWith("Network down");
  });

  it("has a fallback message for errors that aren't Errors", () => {
    showServerErrors<Values>("oops", vi.fn(), ["name"]);
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });
});

describe("changedOnly", () => {
  it("keeps only the fields the user changed", () => {
    expect(changedOnly({ name: "Acme", value: 5, stage: "new" }, { value: true })).toEqual({
      value: 5,
    });
  });
});
