import { usd, usdShort } from "../lib/format";

/** Money in JetBrains Mono, always with its currency sign. */
export function Money({
  value,
  short = false,
  className = "",
}: {
  value: number;
  short?: boolean;
  className?: string;
}) {
  return (
    <span className={`mono ${className}`} title={short ? `${usd(value)} USD` : undefined}>
      {short ? usdShort(value) : usd(value)}
    </span>
  );
}
