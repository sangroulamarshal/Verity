import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppHeader } from "@/components/app-header";

const PHASES = [
  { n: 1, name: "Foundation", status: "done" },
  { n: 2, name: "Authentication", status: "done" },
  { n: 3, name: "Transactions + manual entry", status: "done" },
  { n: 4, name: "CSV/Excel import + normalization", status: "pending" },
  { n: 5, name: "Customer CRM", status: "pending" },
  { n: 6, name: "Risk & anomaly engine", status: "pending" },
  { n: 7, name: "Cash-flow forecasting", status: "pending" },
  { n: 8, name: "Dashboard integration", status: "pending" },
  { n: 9, name: "Security hardening", status: "pending" },
  { n: 10, name: "Testing + UI polish", status: "pending" },
] as const;

export default function Home() {
  return (
    <>
      <AppHeader />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-sm font-medium text-primary">Verity</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
          Financial clarity you can trust.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Data, normalized into one canonical model, turned into a clear view of
          customers, transactions, anomalies, and cash flow.
        </p>

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle>Build status</CardTitle>
            <CardDescription>Implemented in phases — nothing skipped ahead.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ol>
              {PHASES.map((phase) => (
                <li
                  key={phase.n}
                  className="flex items-center gap-3 border-b border-border/70 px-5 py-2.5 text-sm last:border-b-0"
                >
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(phase.n).padStart(2, "0")}
                  </span>
                  <span
                    className={
                      phase.status === "done"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {phase.name}
                  </span>
                  <span
                    className={
                      "ml-auto rounded-full px-2 py-0.5 text-xs font-medium " +
                      (phase.status === "done"
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground")
                    }
                  >
                    {phase.status === "done" ? "Done" : "Pending"}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
