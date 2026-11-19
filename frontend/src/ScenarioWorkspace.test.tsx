import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  AnalysisRun,
  ApiClient,
  Entity,
  Page,
  Scenario,
  ScenarioComparison,
  ScenarioDetail,
  ScenarioIntervention,
} from "./api";
import ScenarioWorkspace from "./ScenarioWorkspace";

const createdAt = "2026-11-07T09:00:00Z";

const baselineRun: AnalysisRun = {
  id: "baseline-run",
  organization_id: "organization-id",
  event_id: "event-id",
  scenario_id: null,
  status: "completed",
  configuration: {},
  algorithm_version: "ripple-engine-v1",
  input_hash: "baseline-hash",
  as_of: createdAt,
  summary: {},
  created_by_user_id: "user-id",
  created_at: createdAt,
  updated_at: createdAt,
};

const scenarioRun: AnalysisRun = {
  ...baselineRun,
  id: "scenario-run",
  scenario_id: "scenario-id",
};

const entity: Entity = {
  id: "entity-id",
  name: "Practical Session",
  description: null,
  entity_type: "activity",
  status: "active",
  exposure: 1,
  mitigation: 0,
  attributes: {},
  archived_at: null,
  created_at: createdAt,
  updated_at: createdAt,
};

const scenario: Scenario = {
  id: "scenario-id",
  organization_id: "organization-id",
  name: "Move session",
  description: null,
  baseline_run_id: baselineRun.id,
  status: "draft",
  version: 1,
  created_by_user_id: "user-id",
  created_at: createdAt,
  updated_at: createdAt,
};

const scenarioDetail: ScenarioDetail = {
  ...scenario,
  event_overlay: {
    event: {
      id: baselineRun.event_id,
      title: "Laboratory unavailable",
      status: "open",
      severity: 80,
      start_at: createdAt,
    },
    triggers: [],
  },
  entity_overrides: [],
  dependency_overrides: [],
  interventions: [],
};

const intervention: ScenarioIntervention = {
  id: "intervention-id",
  scenario_id: scenario.id,
  title: "Test mitigation assumption",
  action_type: "mitigation",
  target_entity_id: entity.id,
  target_dependency_id: null,
  rationale: "Synthetic test assumption",
  assumptions: {},
  author_user_id: "user-id",
  created_at: createdAt,
};

const comparison: ScenarioComparison = {
  scenario_id: scenario.id,
  baseline_run_id: baselineRun.id,
  scenario_run_id: scenarioRun.id,
  scenario_version: scenario.version,
  baseline_status: "completed",
  scenario_status: "completed",
  potentially_incomplete: false,
  estimated_effect: {
    baseline_total_score: 23.25,
    scenario_total_score: 20.25,
    score_delta: 3,
  },
  assumptions: [],
  items: [
    {
      entity_id: entity.id,
      entity_name: entity.name,
      change_type: "changed",
      baseline_score: 23.25,
      scenario_score: 20.25,
      delta: -3,
    },
  ],
};

function page<T>(items: T[]): Page<T> {
  return { items, limit: 100, offset: 0, total: items.length };
}

describe("ScenarioWorkspace score presentation", () => {
  it("formats aggregate and per-entity estimates to one decimal", async () => {
    const client: Pick<
      ApiClient,
      | "listScenarios"
      | "getScenario"
      | "createScenario"
      | "updateScenarioEvent"
      | "createScenarioIntervention"
      | "listScenarioRuns"
      | "runScenario"
      | "compareScenario"
      | "archiveScenario"
    > = {
      listScenarios: vi.fn(async () => page([scenario])),
      getScenario: vi.fn(async () => scenarioDetail),
      createScenario: vi.fn(async () => scenario),
      updateScenarioEvent: vi.fn(async () => scenario),
      createScenarioIntervention: vi.fn(async () => intervention),
      listScenarioRuns: vi.fn(async () => page([scenarioRun])),
      runScenario: vi.fn(async () => scenarioRun),
      compareScenario: vi.fn(async () => comparison),
      archiveScenario: vi.fn(async () => scenario),
    };

    const user = userEvent.setup();
    render(
      <ScenarioWorkspace
        client={client}
        dependencies={[]}
        entities={[entity]}
        runs={[baselineRun]}
      />,
    );
    await screen.findByRole("option", { name: /Move session/ });
    await user.selectOptions(screen.getByLabelText("Scenario"), scenario.id);

    expect(
      await screen.findByText(
        "Sum of baseline scores minus scenario scores: 3.0",
      ),
    ).toBeVisible();
    const comparisonTable = screen.getByRole("table", {
      name: "Entity-level baseline and scenario estimate comparison",
    });
    expect(
      within(comparisonTable).getByRole("cell", { name: "23.3" }),
    ).toBeVisible();
    expect(
      within(comparisonTable).getByRole("cell", { name: "20.3" }),
    ).toBeVisible();
    expect(
      within(comparisonTable).getByRole("cell", { name: "-3.0" }),
    ).toBeVisible();
  });
});
