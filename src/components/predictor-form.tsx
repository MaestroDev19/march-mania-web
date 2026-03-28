"use client";

import { useForm } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const apiBase = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

interface TeamEntry {
  id: number;
  name: string;
}

interface TeamsPayload {
  generatedAt: string;
  sources: { M: string; W: string };
  M: TeamEntry[];
  W: TeamEntry[];
}

interface PredictResult {
  id: string;
  season: number;
  team1_id: number;
  team2_id: number;
  team1_name: string;
  team2_name: string;
  gender: string;
  pred: number;
  prob_lower_team_wins: number;
  elo_diff: number;
  adjEM_diff: number;
  seed_diff: number;
  massey_diff: number;
}

const formSchema = z
  .object({
    gender: z.enum(["M", "W"]),
    season: z.number().int().min(2000).max(2100),
    teamA: z.string(),
    teamB: z.string(),
  })
  .refine((d) => d.teamA.length > 0, {
    message: "Select team A.",
    path: ["teamA"],
  })
  .refine((d) => d.teamB.length > 0, {
    message: "Select team B.",
    path: ["teamB"],
  })
  .refine((d) => d.teamA !== d.teamB, {
    message: "Choose two different teams.",
    path: ["teamB"],
  });

function fieldInvalid(
  meta: { errors: unknown[]; isTouched: boolean; isValid: boolean },
  submitted: boolean,
) {
  return (meta.errors?.length ?? 0) > 0 && (meta.isTouched || submitted);
}

export function PredictorForm() {
  const [teamsPayload, setTeamsPayload] = useState<TeamsPayload | null>(null);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/data/teams.json", { cache: "force-cache" });
        if (!res.ok) {
          throw new Error(`Failed to load teams (${res.status})`);
        }
        const data = (await res.json()) as TeamsPayload;
        if (!cancelled) {
          setTeamsPayload(data);
          setTeamsError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setTeamsPayload(null);
          setTeamsError(
            e instanceof Error
              ? e.message
              : "Could not load /data/teams.json. Run: python scripts/generate_teams_json.py",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const form = useForm({
    defaultValues: {
      gender: "M",
      season: 2026,
      teamA: "",
      teamB: "",
    } as {
      gender: "M" | "W";
      season: number;
      teamA: string;
      teamB: string;
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      setApiError(null);
      setResult(null);
      const a = Number(value.teamA);
      const b = Number(value.teamB);
      try {
        const res = await fetch(`${apiBase()}/v1/predict/matchup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            season: value.season,
            team_a_id: a,
            team_b_id: b,
          }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          const msg =
            typeof detail?.detail === "string"
              ? detail.detail
              : JSON.stringify(detail) || res.statusText;
          throw new Error(msg);
        }
        const data: PredictResult = await res.json();
        setResult(data);
      } catch (e) {
        setApiError(e instanceof Error ? e.message : "Prediction failed.");
      }
    },
  });

  const gender = useStore(form.store, (s) => s.values.gender);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const submissionAttempts = useStore(
    form.store,
    (s) => s.submissionAttempts ?? 0,
  );

  const teamOptions = useMemo(() => {
    if (!teamsPayload) {
      return [];
    }
    const list = gender === "M" ? teamsPayload.M : teamsPayload.W;
    return list.map((t) => ({
      value: String(t.id),
      label: `${t.name} (${t.id})`,
    }));
  }, [teamsPayload, gender]);

  const teamsReady = Boolean(teamsPayload) && !teamsError;

  return (
    <Card className="w-full max-w-lg">
      <form
        id="matchup-form"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <CardHeader>
          <CardTitle>Matchup probability</CardTitle>
          <CardDescription>
            Pick teams by name (IDs come from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              MTeams.csv
            </code>{" "}
            /{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              WTeams.csv
            </code>
            , baked into{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              public/data/teams.json
            </code>
            ). The model outputs P(lower{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">TeamID</code>{" "}
            wins).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <form.Field name="gender">
              {(field) => {
                const invalid = fieldInvalid(
                  field.state.meta,
                  submissionAttempts > 0,
                );
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor="matchup-gender">Division</FieldLabel>
                    <Select
                      name={field.name}
                      value={field.state.value}
                      onValueChange={(v) => {
                        if (v === "M" || v === "W") {
                          field.handleChange(v);
                          form.setFieldValue("teamA", "");
                          form.setFieldValue("teamB", "");
                        }
                      }}
                    >
                      <SelectTrigger
                        id="matchup-gender"
                        className="w-full"
                        aria-invalid={invalid}
                      >
                        <SelectValue placeholder="Division" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="M">
                          Men (TeamID 1000–1999)
                        </SelectItem>
                        <SelectItem value="W">
                          Women (TeamID 3000–3999)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {invalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="season">
              {(field) => {
                const invalid = fieldInvalid(
                  field.state.meta,
                  submissionAttempts > 0,
                );
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor="matchup-season">Season</FieldLabel>
                    <Input
                      id="matchup-season"
                      name={field.name}
                      type="number"
                      min={2000}
                      max={2100}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      aria-invalid={invalid}
                    />
                    <FieldDescription>
                      Tournament year (e.g. 2026).
                    </FieldDescription>
                    {invalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="teamA">
              {(field) => {
                const invalid = fieldInvalid(
                  field.state.meta,
                  submissionAttempts > 0,
                );
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor="matchup-team-a">Team A</FieldLabel>
                    <Select
                      name={field.name}
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v ?? "")}
                      disabled={!teamsReady}
                    >
                      <SelectTrigger
                        id="matchup-team-a"
                        className="w-full"
                        aria-invalid={invalid}
                      >
                        <SelectValue
                          placeholder={
                            teamsError
                              ? "Teams unavailable"
                              : teamsPayload
                                ? "Select team A"
                                : "Loading teams…"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent
                        alignItemWithTrigger={false}
                        className="max-h-72 min-w-[var(--anchor-width)]"
                      >
                        {teamOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {invalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="teamB">
              {(field) => {
                const invalid = fieldInvalid(
                  field.state.meta,
                  submissionAttempts > 0,
                );
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor="matchup-team-b">Team B</FieldLabel>
                    <Select
                      name={field.name}
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v ?? "")}
                      disabled={!teamsReady}
                    >
                      <SelectTrigger
                        id="matchup-team-b"
                        className="w-full"
                        aria-invalid={invalid}
                      >
                        <SelectValue
                          placeholder={
                            teamsError
                              ? "Teams unavailable"
                              : teamsPayload
                                ? "Select team B"
                                : "Loading teams…"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent
                        alignItemWithTrigger={false}
                        className="max-h-72 min-w-[var(--anchor-width)]"
                      >
                        {teamOptions.map((o) => (
                          <SelectItem key={`b-${o.value}`} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {invalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>

          {teamsError ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {teamsError}
            </p>
          ) : null}
          {apiError ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {apiError}
            </p>
          ) : null}
          {result ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">
                P({result.team1_name} wins) = {(result.pred * 100).toFixed(2)}%
              </p>
              <p className="mt-1 text-muted-foreground">
                vs {result.team2_name} — ID {result.id}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <dt>Elo diff</dt>
                <dd className="text-right font-mono">
                  {result.elo_diff.toFixed(3)}
                </dd>
                <dt>AdjEM diff</dt>
                <dd className="text-right font-mono">
                  {result.adjEM_diff.toFixed(3)}
                </dd>
                <dt>Seed diff</dt>
                <dd className="text-right font-mono">
                  {result.seed_diff.toFixed(3)}
                </dd>
                <dt>Massey diff</dt>
                <dd className="text-right font-mono">
                  {result.massey_diff.toFixed(3)}
                </dd>
              </dl>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            form="matchup-form"
            disabled={isSubmitting || !teamsReady}
          >
            {isSubmitting ? "Running…" : "Predict"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
