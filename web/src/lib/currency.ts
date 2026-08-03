/** All prices are stored in the smallest unit (paisa, 100 = Rs 1) — same
 * reason Stripe et al. use cents, avoids floating-point rounding on money. */
export function formatCurrency(cents: number): string {
  return `Rs ${(cents / 100).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
