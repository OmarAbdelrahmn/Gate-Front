import "./treasury.css";

export default function TreasuryLayout({ children }: { children: React.ReactNode }) {
  return <section className="treasury-workspace" aria-label="خزينة جاهز">{children}</section>;
}
