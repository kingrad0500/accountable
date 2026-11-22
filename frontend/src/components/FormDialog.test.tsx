import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { FormDialog } from "./FormDialog";

function Opener({ description }: { description?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add deal
      </button>
      <FormDialog open={open} onOpenChange={setOpen} title="Add deal" description={description}>
        <label>
          Name <input />
        </label>
      </FormDialog>
    </>
  );
}

describe("FormDialog", () => {
  it("shows its title, description and form when open", async () => {
    render(<Opener description="Deals start in New." />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add deal" }));
    const dialog = screen.getByRole("dialog", { name: "Add deal" });
    expect(dialog).toHaveAccessibleDescription("Deals start in New.");
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("closes with its Close button and puts focus back on what opened it", async () => {
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Add deal" });
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes with Escape and puts focus back", async () => {
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Add deal" });
    await userEvent.click(opener);
    expect(opener).not.toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
