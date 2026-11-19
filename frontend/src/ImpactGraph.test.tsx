import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  Dependency,
  Entity,
  EventRecord,
  EventTrigger,
  ImpactPath,
  ImpactResult,
} from "./api";
import ImpactGraph from "./ImpactGraph";

vi.mock("@xyflow/react", () => ({
  Background: () => null,
  Controls: () => null,
  MarkerType: { ArrowClosed: "arrowclosed" },
  ReactFlow: ({
    nodes,
    edges,
  }: {
    nodes: {
      id: string;
      className?: string;
      data: { label: string };
    }[];
    edges: {
      id: string;
      source: string;
      target: string;
      label?: string;
      style?: { strokeDasharray?: string };
    }[];
  }) => (
    <div data-testid="flow-canvas">
      <p>
        {nodes.length} nodes and {edges.length} directed edges
      </p>
      <ul>
        {nodes.map((node) => (
          <li
            className={node.className}
            data-testid={`node-${node.id}`}
            key={node.id}
          >
            {node.data.label}
          </li>
        ))}
        {edges.map((edge) => (
          <li
            data-testid={`edge-${edge.id}`}
            data-dashed={edge.style?.strokeDasharray}
            key={edge.id}
          >
            {edge.source} → {edge.target}: {edge.label}
          </li>
        ))}
      </ul>
    </div>
  ),
}));

const event: EventRecord = {
  id: "campus-event",
  title: "Laboratory unavailable",
  description: null,
  severity: 80,
  start_at: "2026-11-07T09:00:00Z",
  duration_minutes: null,
  status: "open",
  created_at: "2026-11-07T09:00:00Z",
  updated_at: "2026-11-07T09:00:00Z",
};

const source: Entity = {
  id: "source-id",
  name: "North Campus Laboratory",
  description: null,
  entity_type: "resource",
  status: "active",
  exposure: 1,
  mitigation: 0,
  attributes: {},
  archived_at: null,
  created_at: event.created_at,
  updated_at: event.updated_at,
};

const target: Entity = {
  ...source,
  id: "target-id",
  name: "Practical Session",
  entity_type: "activity",
};

const intermediate: Entity = {
  ...source,
  id: "intermediate-id",
  name: "Shared Timetable",
  entity_type: "system",
};

const trigger: EventTrigger = {
  id: "trigger-id",
  event_id: event.id,
  entity_id: source.id,
  exposure: 1,
  rationale: null,
  created_at: event.created_at,
};

const primaryDependency: Dependency = {
  id: "dependency-id",
  source_entity_id: source.id,
  target_entity_id: target.id,
  relationship_type: "hosts",
  relationship_label: "hosts",
  weight: 0.8,
  rationale: null,
  review_status: "reviewed",
  is_active: true,
  valid_from: null,
  valid_until: null,
  created_at: event.created_at,
  updated_at: event.updated_at,
};

const firstAlternateDependency: Dependency = {
  ...primaryDependency,
  id: "alternate-first",
  target_entity_id: intermediate.id,
  relationship_type: "updates",
  relationship_label: "updates",
};

const secondAlternateDependency: Dependency = {
  ...primaryDependency,
  id: "alternate-second",
  source_entity_id: intermediate.id,
  target_entity_id: target.id,
  relationship_type: "schedules",
  relationship_label: "schedules",
};

const result: ImpactResult = {
  id: "result-id",
  run_id: "run-id",
  entity_id: target.id,
  entity_name: target.name,
  entity_type: target.entity_type,
  depth: 1,
  score: 23.25,
  impact_level: "moderate",
  confidence_value: 0.75,
  confidence_label: "medium",
  confidence_reason: "Dependency review quality is mixed.",
  primary_path_id: "primary-path-id",
  trigger_entity_ids: [source.id],
  explanation: "The laboratory affects the practical session.",
  result_flags: {},
};

const primaryPath: ImpactPath = {
  id: "primary-path-id",
  run_id: result.run_id,
  entity_id: target.id,
  trigger_entity_id: source.id,
  score: result.score,
  edge_count: 1,
  is_primary: true,
  provenance: {
    entity_ids: [source.id, target.id],
    entity_names: [source.name, target.name],
    dependency_labels: ["hosts"],
    dependency_types: ["hosts"],
    weights: [0.8],
    review_statuses: ["reviewed"],
    steps: [
      {
        entity_id: source.id,
        entity_name: source.name,
        entity_type: source.entity_type,
        mitigation: 0,
        dependency_id: null,
        relationship_type: null,
        relationship_label: null,
        weight: null,
        review_status: null,
        rationale: null,
        is_hypothetical: false,
      },
      {
        entity_id: target.id,
        entity_name: target.name,
        entity_type: target.entity_type,
        mitigation: 0,
        dependency_id: primaryDependency.id,
        relationship_type: "hosts",
        relationship_label: "hosts",
        weight: 0.8,
        review_status: "reviewed",
        rationale: null,
        is_hypothetical: false,
      },
    ],
  },
};

const alternatePath: ImpactPath = {
  ...primaryPath,
  id: "alternate-path-id",
  edge_count: 2,
  is_primary: false,
  provenance: {
    entity_ids: [source.id, intermediate.id, target.id],
    entity_names: [source.name, intermediate.name, target.name],
    dependency_labels: ["updates", "schedules"],
    dependency_types: ["updates", "schedules"],
    weights: [0.6, 0.5],
    review_statuses: ["draft", "draft"],
    steps: [
      primaryPath.provenance.steps[0],
      {
        entity_id: intermediate.id,
        entity_name: intermediate.name,
        entity_type: intermediate.entity_type,
        mitigation: 0,
        dependency_id: firstAlternateDependency.id,
        relationship_type: "updates",
        relationship_label: "updates",
        weight: 0.6,
        review_status: "draft",
        rationale: null,
        is_hypothetical: false,
      },
      {
        ...primaryPath.provenance.steps[1],
        dependency_id: secondAlternateDependency.id,
        relationship_type: "schedules",
        relationship_label: "schedules",
        weight: 0.5,
        review_status: "draft",
      },
    ],
  },
};

function renderGraph(
  overrides: {
    dependencies?: Dependency[];
    paths?: ImpactPath[];
    loading?: boolean;
    error?: string | null;
    event?: EventRecord | null;
  } = {},
) {
  return render(
    <ImpactGraph
      analysisStatus="completed"
      dependencies={
        overrides.dependencies ?? [
          primaryDependency,
          firstAlternateDependency,
          secondAlternateDependency,
        ]
      }
      entities={[source, target, intermediate]}
      error={overrides.error ?? null}
      event={overrides.event === undefined ? event : overrides.event}
      loading={overrides.loading ?? false}
      paths={overrides.paths ?? [primaryPath, alternatePath]}
      results={[result]}
      selectedResult={result}
      triggers={[trigger]}
    />,
  );
}

describe("ImpactGraph", () => {
  it("shows the full directed network, impact bands, and multiple saved paths accessibly", () => {
    renderGraph();

    expect(screen.getByTestId("flow-canvas")).toHaveTextContent(
      "4 nodes and 4 directed edges",
    );
    expect(screen.getByTestId("node-event:campus-event")).toHaveTextContent(
      "EVENT Laboratory unavailable",
    );
    expect(screen.getByTestId("node-source-id")).toHaveClass(
      "impact-node-trigger",
    );
    expect(screen.getByTestId("node-target-id")).toHaveClass(
      "impact-node-direct",
    );
    expect(screen.getByTestId("node-target-id")).toHaveTextContent(
      /DIRECT IMPACT · DEPTH 1\s+Practical Session\s+23\.3 · moderate/,
    );
    const savedPaths = screen.getByRole("list", {
      name: "Saved analysis paths",
    });
    expect(savedPaths).toHaveTextContent(
      /Primary path\s*North Campus Laboratory → Practical Session/,
    );
    expect(savedPaths).toHaveTextContent(
      /Alternate path\s*North Campus Laboratory → Shared Timetable → Practical Session/,
    );
    expect(
      screen.getByRole("list", {
        name: "Directed dependency relationships",
      }),
    ).toHaveTextContent(
      /North Campus Laboratory → Practical Session: hosts · weight 0\.80/,
    );
    expect(
      screen.getByText(/Impact bands are heuristic score ranges/),
    ).toBeVisible();
  });

  it("shows inactive dependencies as dashed rather than hiding them", () => {
    renderGraph({
      dependencies: [{ ...primaryDependency, is_active: false }],
      paths: [],
    });

    expect(screen.getByTestId("flow-canvas")).toHaveTextContent(
      "4 nodes and 2 directed edges",
    );
    expect(screen.getByTestId(`edge-${primaryDependency.id}`)).toHaveAttribute(
      "data-dashed",
      "6 5",
    );
    expect(
      screen.getByRole("list", {
        name: "Directed dependency relationships",
      }),
    ).toHaveTextContent(/inactive status/);
  });

  it("keeps historical retained path edges visible when current dependencies differ", () => {
    renderGraph({ dependencies: [primaryDependency] });

    expect(
      screen.getByTestId("edge-saved-path:alternate-first"),
    ).toHaveAttribute("data-dashed", "4 5");
    expect(
      screen.getByRole("list", {
        name: "Directed dependency relationships",
      }),
    ).toHaveTextContent(
      /North Campus Laboratory → Shared Timetable: saved path: updates · weight 0\.60 · saved analysis snapshot/,
    );
  });

  it("shows useful loading, error, and empty-event states", () => {
    const loading = renderGraph({ loading: true });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the selected event's network",
    );
    loading.unmount();

    const failed = renderGraph({ error: "API request failed" });
    expect(screen.getByRole("alert")).toHaveTextContent("API request failed");
    failed.unmount();

    renderGraph({ event: null });
    expect(
      screen.getByText("Select an event to inspect its dependency network."),
    ).toBeInTheDocument();
  });
});
