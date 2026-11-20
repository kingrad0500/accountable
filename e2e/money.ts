/** "$12,500", the way the app shows money. */
export const usd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
