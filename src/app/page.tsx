import { PredictorForm } from "@/components/predictor-form";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-border bg-background/80 px-6 py-6 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            March ML Mania — interactive predictions
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Explore matchup win probabilities from the bundled tournament model. Start the
            FastAPI server locally, then pick two teams. For competition context and data, see
            the{" "}
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href="https://kaggle.com/competitions/march-machine-learning-mania-2026"
              target="_blank"
              rel="noreferrer"
            >
              Kaggle competition page
            </a>
            .
          </p>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 py-10">
        <PredictorForm />
      </main>
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        <p>
          Competition: Jeff Sonas, Martyna Plomecka, Yao Yan, Addison Howard. March Machine
          Learning Mania 2026. Kaggle, 2026.
        </p>
      </footer>
    </div>
  );
}
