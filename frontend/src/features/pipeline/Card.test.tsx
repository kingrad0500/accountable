import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { aDeal } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { CardView } from "./Card";

const deal = aDeal({ id: 4, name: "Website rebuild" });

it("opens the deal when its name is clicked", async () => {
  const { router } = renderScreen(<CardView deal={deal} late={false} />);
  await userEvent.click(screen.getByRole("link", { name: "Website rebuild" }));
  expect(router.state.location.pathname).toBe("/deals/4");
});

it("stays on the board when the name of the card being dragged is clicked", async () => {
  const { router } = renderScreen(<CardView deal={deal} late={false} lifted />);
  await userEvent.click(screen.getByRole("link", { name: "Website rebuild" }));
  expect(router.state.location.pathname).toBe("/");
});
