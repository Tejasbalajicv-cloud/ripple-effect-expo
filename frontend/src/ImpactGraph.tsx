import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  AnalysisRun,
  Dependency,
  Entity,
  EntityType,
  EventRecord,
  EventTrigger,
  ImpactPath,
  ImpactPathStep,
  ImpactResult,
} from "./api";

type ImpactGraphProps = {
  event: EventRecord | null;
  triggers: EventTrigger[];
  entities: Entity[];
  dependencies: Dependency[];
  results: ImpactResult[];
  paths: ImpactPath[];
  selectedResult: ImpactResult | null;
  analysisStatus: AnalysisRun["status"] | null;
  loading: boolean;
  error: string | null;
};

type GraphEntity = {
  id: string;
  name: string;
  entity_type: EntityType;
};

type GraphCategory = "event" | "trigger" | "direct" | "downstream" | "context";
type GraphNode = Node<{ label: string }>;

type PathConnection = {
  id: string;
  dependencyId: string | null;
  sourceId: string;
  targetId: string;
  relationship: string;
  weight: number | null;
  isPrimary: boolean;
};

type RelationshipSummary = {
  id: string;
  sourceName: string;
  targetName: string;
  label: string;
  detail: string;
};

function categoryLabel(category: GraphCategory) {
  switch (category) {
    case "event":
      return "Event";
    case "trigger":
      return "Direct trigger";
    case "direct":
      return "Direct impact · depth 1";
    case "downstream":
      return "Downstream impact";
    case "context":
      return "Other modelled entity";
  }
}

function collectPathConnections(paths: ImpactPath[]): PathConnection[] {
  const connections = new Map<string, PathConnection>();

  for (const path of paths) {
    const steps = path.provenance.steps;
    for (let index = 1; index < steps.length; index += 1) {
      const source = steps[index - 1];
      const target = steps[index];
      const key = target.dependency_id ?? `${path.id}-${index}`;
      const relationship =
        target.relationship_label ?? target.relationship_type ?? "dependency";
      const previous = connections.get(key);
      if (previous) {
        previous.isPrimary ||= path.is_primary;
      } else {
        connections.set(key, {
          id: key,
          dependencyId: target.dependency_id,
          sourceId: source.entity_id,
          targetId: target.entity_id,
          relationship,
          weight: target.weight,
          isPrimary: path.is_primary,
        });
      }
    }
  }
  return [...connections.values()];
}

function graphElements(
  event: EventRecord,
  triggers: EventTrigger[],
  entities: Entity[],
  dependencies: Dependency[],
  results: ImpactResult[],
  paths: ImpactPath[],
  selectedResult: ImpactResult | null,
) {
  const entityById = new Map<string, GraphEntity>(
    entities.map((entity) => [
      entity.id,
      { id: entity.id, name: entity.name, entity_type: entity.entity_type },
    ]),
  );
  const resultByEntityId = new Map(
    results.map((result) => [result.entity_id, result]),
  );
  const triggerByEntityId = new Map(
    triggers.map((trigger) => [trigger.entity_id, trigger]),
  );
  const pathConnections = collectPathConnections(paths);
  const eventNodeId = `event:${event.id}`;

  function ensureEntity(
    id: string,
    fallback?: Pick<ImpactPathStep, "entity_name" | "entity_type">,
  ) {
    if (!entityById.has(id)) {
      const result = resultByEntityId.get(id);
      entityById.set(id, {
        id,
        name: fallback?.entity_name ?? result?.entity_name ?? `Entity ${id}`,
        entity_type: fallback?.entity_type ?? result?.entity_type ?? "resource",
      });
    }
  }

  for (const result of results) {
    ensureEntity(result.entity_id);
  }
  for (const trigger of triggers) {
    ensureEntity(trigger.entity_id);
  }
  for (const dependency of dependencies) {
    ensureEntity(dependency.source_entity_id);
    ensureEntity(dependency.target_entity_id);
  }
  for (const path of paths) {
    for (const step of path.provenance.steps) {
      ensureEntity(step.entity_id, step);
    }
  }

  const nodeDescriptions = new Map<
    string,
    { category: GraphCategory; entity: GraphEntity; result?: ImpactResult }
  >();
  for (const entity of entityById.values()) {
    const result = resultByEntityId.get(entity.id);
    const category: GraphCategory = triggerByEntityId.has(entity.id)
      ? "trigger"
      : result?.depth === 1
        ? "direct"
        : result && result.depth > 1
          ? "downstream"
          : "context";
    nodeDescriptions.set(entity.id, { category, entity, result });
  }

  const nodesByColumn = new Map<
    number,
    Array<{
      id: string;
      category: GraphCategory;
      entity: GraphEntity;
      result?: ImpactResult;
    }>
  >();
  const maxImpactDepth = results.reduce(
    (maximum, result) => Math.max(maximum, result.depth),
    0,
  );
  for (const descriptor of nodeDescriptions.values()) {
    const column =
      descriptor.category === "direct"
        ? 2
        : descriptor.category === "downstream"
          ? Math.max(3, (descriptor.result?.depth ?? 2) + 1)
          : descriptor.category === "context"
            ? Math.max(2, Math.min(3, maxImpactDepth))
            : 1;
    const columnNodes = nodesByColumn.get(column) ?? [];
    columnNodes.push({ id: descriptor.entity.id, ...descriptor });
    nodesByColumn.set(column, columnNodes);
  }
  for (const columnNodes of nodesByColumn.values()) {
    columnNodes.sort((left, right) =>
      left.entity.name.localeCompare(right.entity.name),
    );
  }

  const nodes: GraphNode[] = [
    {
      id: eventNodeId,
      type: "default",
      className: "impact-node impact-node-event",
      data: { label: `EVENT\n${event.title}` },
      position: { x: 30, y: 30 },
      ariaLabel: `Event: ${event.title}`,
      style: { width: 184 },
    },
  ];

  for (const [column, columnNodes] of nodesByColumn) {
    columnNodes.forEach((descriptor, index) => {
      const { category, entity, result } = descriptor;
      const trigger = triggerByEntityId.get(entity.id);
      const resultText = result
        ? `${result.score.toFixed(1)} · ${result.impact_level}`
        : trigger
          ? `Exposure ${trigger.exposure.toFixed(2)}`
          : "Not in loaded results";
      const selectedClass =
        selectedResult?.entity_id === entity.id ? " impact-node-selected" : "";
      nodes.push({
        id: entity.id,
        type: "default",
        className: `impact-node impact-node-${category}${result ? ` impact-level-${result.impact_level}` : ""}${selectedClass}`,
        data: {
          label: `${categoryLabel(category).toUpperCase()}\n${entity.name}\n${resultText}`,
        },
        position: {
          x: 30 + column * 225,
          y: 30 + index * 100,
        },
        ariaLabel: `${categoryLabel(category)}: ${entity.name}${result ? `, heuristic score ${result.score.toFixed(1)}, ${result.impact_level} impact band, depth ${result.depth}` : ""}`,
        style: { width: 184 },
      });
    });
  }

  const dependenciesById = new Map(
    dependencies.map((dependency) => [dependency.id, dependency]),
  );
  const relationshipSummaries: RelationshipSummary[] = [];
  const edges: Edge[] = triggers.map((trigger) => {
    const targetName =
      entityById.get(trigger.entity_id)?.name ?? `Entity ${trigger.entity_id}`;
    relationshipSummaries.push({
      id: `trigger:${trigger.id}`,
      sourceName: event.title,
      targetName,
      label: "event trigger",
      detail: `Exposure ${trigger.exposure.toFixed(2)}`,
    });
    return {
      id: `event-trigger:${trigger.id}`,
      source: eventNodeId,
      target: trigger.entity_id,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#b9a2ff" },
      style: { stroke: "#b9a2ff", strokeWidth: 2 },
      ariaLabel: `Event ${event.title} triggers ${targetName}`,
    };
  });

  for (const dependency of dependencies) {
    const sourceName =
      entityById.get(dependency.source_entity_id)?.name ??
      `Entity ${dependency.source_entity_id}`;
    const targetName =
      entityById.get(dependency.target_entity_id)?.name ??
      `Entity ${dependency.target_entity_id}`;
    const connection = pathConnections.find(
      (candidate) =>
        candidate.dependencyId === dependency.id &&
        candidate.sourceId === dependency.source_entity_id &&
        candidate.targetId === dependency.target_entity_id,
    );
    const relation =
      dependency.relationship_label || dependency.relationship_type;
    const color = connection
      ? connection.isPrimary
        ? "#b9a2ff"
        : "#63c4df"
      : dependency.is_active
        ? "#7389a2"
        : "#626d84";
    const detail = `weight ${dependency.weight.toFixed(2)} · ${dependency.is_active ? "active status" : "inactive status"} · ${dependency.review_status} review`;
    relationshipSummaries.push({
      id: dependency.id,
      sourceName,
      targetName,
      label: relation,
      detail,
    });
    edges.push({
      id: dependency.id,
      source: dependency.source_entity_id,
      target: dependency.target_entity_id,
      markerEnd: { type: MarkerType.ArrowClosed, color },
      style: {
        stroke: color,
        strokeWidth: connection?.isPrimary ? 3 : connection ? 2.5 : 1.5,
        ...(dependency.is_active ? {} : { strokeDasharray: "6 5" }),
      },
      ariaLabel: `Dependency from ${sourceName} to ${targetName}: ${relation}; dependency strength ${dependency.weight.toFixed(2)}; ${dependency.is_active ? "active" : "inactive"} status${connection ? `; retained ${connection.isPrimary ? "primary" : "alternate"} analysis path` : ""}`,
    });
  }

  for (const connection of pathConnections) {
    const currentDependency = connection.dependencyId
      ? dependenciesById.get(connection.dependencyId)
      : undefined;
    if (
      currentDependency &&
      currentDependency.source_entity_id === connection.sourceId &&
      currentDependency.target_entity_id === connection.targetId
    ) {
      continue;
    }
    const sourceName =
      entityById.get(connection.sourceId)?.name ??
      `Entity ${connection.sourceId}`;
    const targetName =
      entityById.get(connection.targetId)?.name ??
      `Entity ${connection.targetId}`;
    const weight =
      connection.weight === null
        ? "weight unavailable"
        : `weight ${connection.weight.toFixed(2)}`;
    const detail = `${weight} · saved analysis snapshot`;
    relationshipSummaries.push({
      id: `saved:${connection.id}`,
      sourceName,
      targetName,
      label: `saved path: ${connection.relationship}`,
      detail,
    });
    edges.push({
      id: `saved-path:${connection.id}`,
      source: connection.sourceId,
      target: connection.targetId,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#b9a2ff" },
      style: {
        stroke: connection.isPrimary ? "#b9a2ff" : "#63c4df",
        strokeWidth: connection.isPrimary ? 3 : 2.5,
        strokeDasharray: "4 5",
      },
      ariaLabel: `Saved analysis path from ${sourceName} to ${targetName}: ${connection.relationship}; ${weight}`,
    });
  }

  return { nodes, edges, relationshipSummaries };
}

function ImpactGraph({
  event,
  triggers,
  entities,
  dependencies,
  results,
  paths,
  selectedResult,
  analysisStatus,
  loading,
  error,
}: ImpactGraphProps) {
  if (loading) {
    return (
      <section className="graph-section" aria-labelledby="graph-title">
        <h3 id="graph-title">Dependency network</h3>
        <p className="loading-banner" role="status">
          Loading the selected event&apos;s network and saved path details…
        </p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="graph-section" aria-labelledby="graph-title">
        <h3 id="graph-title">Dependency network</h3>
        <p className="error-banner" role="alert">
          Could not load the network or selected analysis details: {error}
        </p>
      </section>
    );
  }
  if (!event) {
    return (
      <section className="graph-section" aria-labelledby="graph-title">
        <h3 id="graph-title">Dependency network</h3>
        <p className="empty-state">
          Select an event to inspect its dependency network.
        </p>
      </section>
    );
  }

  const { nodes, edges, relationshipSummaries } = graphElements(
    event,
    triggers,
    entities,
    dependencies,
    results,
    paths,
    selectedResult,
  );
  const nodeNames = nodes.map((node) => node.data.label.replace(/\n/g, ": "));
  const snapshotPaths = paths.map((path) => ({
    path,
    names: path.provenance.steps.map((step) => step.entity_name),
    relationships: path.provenance.steps.slice(1).map((step) => {
      const relationship =
        step.relationship_label ?? step.relationship_type ?? "dependency";
      const weight =
        step.weight === null ? "" : ` · weight ${step.weight.toFixed(2)}`;
      return `${relationship}${weight}`;
    }),
  }));

  return (
    <section className="graph-section" aria-labelledby="graph-title">
      <div className="section-heading compact-heading">
        <div>
          <h3 id="graph-title">Dependency network and saved analysis paths</h3>
          <p>
            Current dependency records are shown with their direction and active
            status. Highlighted retained paths and their details come from the
            selected run&apos;s immutable snapshot; relationship labels and
            weights are listed below.
          </p>
        </div>
        {selectedResult && (
          <span className="status-pill">
            Paths for {selectedResult.entity_name}
          </span>
        )}
      </div>
      {analysisStatus === "failed" && (
        <p className="error-banner" role="alert">
          The selected analysis run failed. The network below shows current
          dependency records, not impact results.
        </p>
      )}
      {(analysisStatus === "pending" || analysisStatus === "running") && (
        <p className="loading-banner" role="status">
          The selected analysis run is {analysisStatus}; impact results may not
          be available yet.
        </p>
      )}
      {results.length === 0 && analysisStatus !== "failed" && (
        <p className="empty-state">
          No impact results are loaded for this run; showing the available
          network without impact bands.
        </p>
      )}
      {dependencies.length === 0 && (
        <p className="empty-state">
          No dependency records are available. The event and its triggers are
          shown without inferred connections.
        </p>
      )}
      <ul className="graph-legend" aria-label="Graph legend">
        <li>
          <span className="legend-swatch legend-event" />
          Event
        </li>
        <li>
          <span className="legend-swatch legend-trigger" />
          Direct trigger
        </li>
        <li>
          <span className="legend-swatch legend-direct" />
          Direct impact
        </li>
        <li>
          <span className="legend-swatch legend-downstream" />
          Downstream impact
        </li>
        <li>
          <span className="legend-swatch legend-context" />
          Other modelled entity
        </li>
      </ul>
      <p className="impact-band-legend">
        Impact bands are heuristic score ranges: low &lt;25, moderate 25–&lt;50,
        high 50–&lt;75, critical ≥75 (0–100 scale). Confidence is dependency
        review quality, not probability.
      </p>
      <ul className="impact-level-legend" aria-label="Impact severity bands">
        <li>
          <span className="level-swatch level-low" />
          Low
        </li>
        <li>
          <span className="level-swatch level-moderate" />
          Moderate
        </li>
        <li>
          <span className="level-swatch level-high" />
          High
        </li>
        <li>
          <span className="level-swatch level-critical" />
          Critical
        </li>
      </ul>
      <p className="graph-edge-legend">
        Arrows point source → target. Solid edges have active status; dashed
        edges have inactive status. Edge weights represent dependency strength,
        not probability or confirmed resource availability.
      </p>
      <div
        className="flow-canvas"
        role="group"
        aria-label={`Directed impact graph for ${event.title}: ${nodeNames.join("; ")}`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          defaultEdgeOptions={{ type: "smoothstep" }}
          minZoom={0.2}
          maxZoom={1.4}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <section
        className="accessible-path"
        aria-labelledby="network-details-title"
      >
        <h4 id="network-details-title">Keyboard-accessible network details</h4>
        <ul aria-label="Directed dependency relationships">
          {relationshipSummaries.map((relationship) => (
            <li key={relationship.id}>
              <strong>{relationship.sourceName}</strong> →{" "}
              <strong>{relationship.targetName}</strong>: {relationship.label}
              {" · "}
              {relationship.detail}
            </li>
          ))}
          {relationshipSummaries.length === 0 && (
            <li>
              No event, trigger, or dependency relationships are available.
            </li>
          )}
        </ul>
        <h4>
          {selectedResult
            ? `Retained paths for ${selectedResult.entity_name}`
            : "Retained paths"}
        </h4>
        {snapshotPaths.length > 0 ? (
          <ol aria-label="Saved analysis paths">
            {snapshotPaths.map(({ path, names, relationships }) => (
              <li key={path.id}>
                <span className="path-role">
                  {path.is_primary ? "Primary path" : "Alternate path"}
                </span>
                <strong>{names.join(" → ")}</strong>
                {relationships.length > 0 && (
                  <span>Saved relationships: {relationships.join(" → ")}</span>
                )}
                <span>
                  Path estimate {path.score.toFixed(1)} · {path.edge_count}{" "}
                  directed {path.edge_count === 1 ? "edge" : "edges"}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-state">
            No retained path is available for the selected result.
          </p>
        )}
      </section>
    </section>
  );
}

export default ImpactGraph;
