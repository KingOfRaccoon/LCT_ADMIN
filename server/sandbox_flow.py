import json
import re
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException

from .bindings import apply_context_patch, get_context_value, is_binding, resolve_binding


ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT_DIR / "src/pages/Sandbox/data/ecommerceDashboard.json"

try:
    with DATASET_PATH.open("r", encoding="utf-8") as dataset_file:
        _PRODUCT_DATA: Dict[str, Any] = json.load(dataset_file)
except FileNotFoundError as exc:
    raise RuntimeError(
        f"Sandbox dataset not found at '{DATASET_PATH}'. "
        "Ensure the JSON export exists so the API can mirror the sandbox."
    ) from exc
except json.JSONDecodeError as exc:
    raise RuntimeError(
        f"Sandbox dataset at '{DATASET_PATH}' is not a valid JSON document"
    ) from exc


_BASE_CONTEXT: Dict[str, Any] = deepcopy(_PRODUCT_DATA.get("initialContext") or {})
_SCREEN_REGISTRY: Dict[str, Dict[str, Any]] = _PRODUCT_DATA.get("screens") or {}
_NODE_REGISTRY: Dict[str, Dict[str, Any]] = {
    node["id"]: node for node in _PRODUCT_DATA.get("nodes", []) if isinstance(node, dict) and node.get("id")
}

_EDGE_REGISTRY: Dict[str, Dict[str, Any]] = {}
for node in _PRODUCT_DATA.get("nodes", []) or []:
    node_id = node.get("id")
    for edge in node.get("edges", []) or []:
        if not isinstance(edge, dict) or not edge.get("id"):
            continue
        edge_copy = dict(edge)
        edge_copy["source"] = node_id
        _EDGE_REGISTRY[edge["id"]] = edge_copy


DEFAULT_INPUTS: Dict[str, str] = {"email": ""}


EVENT_RULES: Dict[str, Dict[str, Any]] = {
    "checkemail": {"edge_id": "edge-email-submit", "source_node": "email-entry", "keep_inputs": True},
    "retryfromsuccess": {"edge_id": "edge-valid-retry", "source_node": "email-valid", "keep_inputs": False},
    "retryfromerror": {"edge_id": "edge-invalid-retry", "source_node": "email-invalid", "keep_inputs": False}
}


_BUTTON_EVENT_INJECTIONS: Dict[str, Dict[str, str]] = {}


def _clone_base_context() -> Dict[str, Any]:
    return deepcopy(_BASE_CONTEXT)


def _state_overrides_for_node(node_id: str) -> Dict[str, Any]:
    node = _NODE_REGISTRY.get(node_id) or {}
    title = node.get("label") if isinstance(node.get("label"), str) else None
    return {"title": title.strip()} if title and title.strip() else {}


def _resolve_screen_id(node_id: str) -> str:
    node = _NODE_REGISTRY.get(node_id)
    if not node:
        raise HTTPException(status_code=500, detail=f"Unknown node '{node_id}' in sandbox flow")
    screen_id = node.get("screenId")
    if not isinstance(screen_id, str) or not screen_id.strip():
        raise HTTPException(status_code=500, detail=f"Node '{node_id}' has no screenId binding")
    return screen_id


def _inject_button_events(screen_id: str, screen: Dict[str, Any]) -> None:
    injections = _BUTTON_EVENT_INJECTIONS.get(screen_id)
    if not injections or not isinstance(screen, dict):
        return

    component_map: Dict[str, Dict[str, Any]] = {}

    def register_component(component: Any) -> None:
        if not isinstance(component, dict):
            return
        component_id = component.get("id")
        if isinstance(component_id, str) and component_id and component_id not in component_map:
            component_map[component_id] = component
        children = component.get("children")
        if isinstance(children, list):
            for child in children:
                if isinstance(child, dict):
                    register_component(child)
                elif isinstance(child, str):
                    referenced = component_map.get(child)
                    if referenced is not None:
                        register_component(referenced)

    base_components = screen.get("components")
    if isinstance(base_components, list):
        for comp in base_components:
            register_component(comp)

    sections = screen.get("sections")
    if isinstance(sections, dict):
        for section in sections.values():
            register_component(section)

    for component_id, event_name in injections.items():
        if not event_name:
            continue
        component = component_map.get(component_id)
        if not isinstance(component, dict):
            continue

        props = component.get("props")
        if isinstance(props, dict):
            props["event"] = event_name
        properties = component.get("properties")
        if isinstance(properties, dict):
            properties["event"] = event_name
        elif not isinstance(props, dict):
            component["properties"] = {"event": event_name}
        component["event"] = event_name


def _get_screen_payload(screen_id: str) -> Dict[str, Any]:
    screen = _SCREEN_REGISTRY.get(screen_id)
    if not isinstance(screen, dict):
        raise HTTPException(status_code=500, detail=f"Unknown screen '{screen_id}' in sandbox flow")
    screen_copy = deepcopy(screen)
    _inject_button_events(screen_id, screen_copy)
    return screen_copy


def _resolve_condition_source_value(condition: Dict[str, Any], context: Dict[str, Any]) -> Any:
    if not isinstance(condition, dict):
        return None

    source = condition.get("source")
    path = condition.get("path")
    fallback = condition.get("fallback")
    value = condition.get("value")

    if source is not None:
        if is_binding(source):
            return resolve_binding(source, context)
        if isinstance(source, str):
            if source.startswith("${") and source.endswith("}"):
                return resolve_binding({"reference": source, "value": fallback}, context)
            return source
        return source

    if isinstance(path, str) and path.strip():
        return get_context_value(context, path.strip())

    return value


def _is_empty_value(candidate: Any) -> bool:
    if candidate is None:
        return True
    if isinstance(candidate, str):
        return candidate.strip() == ""
    if isinstance(candidate, (list, tuple, set)):
        return len(candidate) == 0
    if isinstance(candidate, dict):
        return len(candidate.keys()) == 0
    return False


def _evaluate_condition(condition: Dict[str, Any], context: Dict[str, Any]) -> bool:
    if not isinstance(condition, dict):
        return False

    condition_type = condition.get("type") or "truthy"
    raw_value = _resolve_condition_source_value(condition, context)
    result = False

    if condition_type == "regex":
        pattern = condition.get("pattern") or ""
        if pattern:
            flags = condition.get("flags") or ""
            try:
                regex = re.compile(pattern, flags)
            except re.error:
                regex = None
            if regex is not None:
                result = bool(regex.search(str(raw_value or "")))
    elif condition_type == "empty":
        result = _is_empty_value(raw_value)
    elif condition_type == "nonEmpty":
        result = not _is_empty_value(raw_value)
    elif condition_type == "equals":
        result = raw_value == condition.get("value")
    else:
        result = bool(raw_value)

    if condition.get("negate"):
        return not result
    return result


def _resolve_condition_edge(node: Dict[str, Any], context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not isinstance(node, dict) or node.get("type") != "action":
        return None

    edges = node.get("edges") or []
    config = node.get("data", {}).get("config", {}) if isinstance(node.get("data"), dict) else {}
    conditions = config.get("conditions") or []

    for condition in conditions:
        edge_id = condition.get("edgeId")
        target_edge = next((edge for edge in edges if isinstance(edge, dict) and edge.get("id") == edge_id), None)
        if not target_edge:
            continue
        if _evaluate_condition(condition, context):
            return target_edge

    fallback_edge_id = config.get("fallbackEdgeId")
    if isinstance(fallback_edge_id, str) and fallback_edge_id.strip():
        return next((edge for edge in edges if isinstance(edge, dict) and edge.get("id") == fallback_edge_id), None)

    if len(edges) == 1:
        return edges[0]

    return None


def _run_edge_sequence(edge_id: Optional[str], source_node_id: str, starting_context: Dict[str, Any]) -> Tuple[Dict[str, Any], Optional[str]]:
    if not edge_id:
        return starting_context, source_node_id

    context = starting_context
    current_edge_id = edge_id
    current_source_node = source_node_id
    guard = 0
    last_target_node: Optional[str] = source_node_id

    while current_edge_id:
        edge = _EDGE_REGISTRY.get(current_edge_id)
        if not edge:
            raise HTTPException(status_code=500, detail=f"Edge '{current_edge_id}' is not defined in sandbox flow")
        if edge.get("source") and edge["source"] != current_source_node:
            raise HTTPException(status_code=500, detail=f"Edge '{current_edge_id}' is not connected to node '{current_source_node}'")

        context, _ = apply_context_patch(context, edge.get("contextPatch") or {}, trace_enabled=False)
        last_target_node = edge.get("target") or last_target_node

        target_node = _NODE_REGISTRY.get(edge.get("target")) if edge.get("target") else None
        if not target_node or target_node.get("type") != "action":
            return context, target_node.get("id") if target_node else last_target_node

        guard += 1
        if guard > 20:
            raise HTTPException(status_code=500, detail=f"Action node '{target_node.get('id')}' produced too many transitions")

        next_edge = _resolve_condition_edge(target_node, context)
        if not next_edge:
            return context, target_node.get("id")

        current_edge_id = next_edge.get("id")
        current_source_node = target_node.get("id") or current_source_node

    return context, last_target_node


def _build_dynamic_patch(event: str, inputs: Dict[str, str]) -> Dict[str, Any]:
    patch: Dict[str, Any] = {}
    email = inputs.get("email")
    if isinstance(email, str):
        patch["inputs.email"] = email.strip()
    else:
        patch["inputs.email"] = ""
    return patch


def _apply_patch_to_context(base_context: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    if not patch:
        return deepcopy(base_context)
    next_ctx, _ = apply_context_patch(base_context, patch, trace_enabled=False)
    return next_ctx


def _make_state_snapshot(context: Dict[str, Any], overrides: Dict[str, Any], inputs: Dict[str, str]) -> Dict[str, Any]:
    ui = context.get("ui", {}) if isinstance(context, dict) else {}
    notifications = ui.get("notifications", {}) if isinstance(ui, dict) else {}
    data = context.get("data", {}) if isinstance(context, dict) else {}
    raw_validation = data.get("validation") if isinstance(data, dict) else None
    validation = raw_validation if isinstance(raw_validation, dict) else {}

    status = overrides.get("status") or validation.get("status") or "idle"

    validation_message = validation.get("message") if isinstance(validation.get("message"), str) else None
    notification_message = notifications.get("lastAction") if isinstance(notifications, dict) and isinstance(notifications.get("lastAction"), str) else None
    message = overrides.get("message") or validation_message or notification_message or ""

    email_value = inputs.get("email")
    email_from_inputs = email_value.strip() if isinstance(email_value, str) else ""
    email_from_context = get_context_value(context, "data.user.email")
    email = overrides.get("email") or email_from_inputs
    if not email and isinstance(email_from_context, str):
        email = email_from_context

    details_override = overrides.get("details") if isinstance(overrides.get("details"), list) else None
    if details_override:
        details = details_override
    else:
        details = []
        if message:
            details.append(message)
        if email:
            details.append(f"Email: {email}")

    last_action = notification_message or ""

    return {
        "title": overrides.get("title") or (ui.get("screen", {}).get("title") if isinstance(ui.get("screen"), dict) else "Проверка email"),
        "status": status or "idle",
        "message": message,
        "email": email,
        "lastAction": last_action,
        "details": details
    }


def _build_api_context(core_ctx: Dict[str, Any], inputs: Dict[str, str], state_overrides: Dict[str, Any]) -> Dict[str, Any]:
    merged_inputs: Dict[str, Any] = {**DEFAULT_INPUTS, **(inputs or {})}
    email_value = merged_inputs.get("email")
    if isinstance(email_value, str):
        merged_inputs["email"] = email_value.strip()
    else:
        merged_inputs["email"] = ""

    context_payload: Dict[str, Any] = {
        "ui": deepcopy(core_ctx.get("ui", {})),
        "data": deepcopy(core_ctx.get("data", {})),
        "inputs": merged_inputs
    }
    context_payload["state"] = _make_state_snapshot(context_payload, state_overrides or {}, context_payload["inputs"])
    return context_payload


def _make_screen_response(screen_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "screen": _get_screen_payload(screen_id),
        "context": context
    }


def _extract_form_values(params: Dict[str, Any]) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for key, value in params.items():
        if key == "event":
            continue
        if isinstance(value, str):
            result[key] = value.strip()
        else:
            result[key] = value
    return result


def start_response() -> Dict[str, Any]:
    core_context = _clone_base_context()
    context = _build_api_context(core_context, DEFAULT_INPUTS, _state_overrides_for_node("email-entry"))
    screen_id = _resolve_screen_id("email-entry")
    return _make_screen_response(screen_id, context)


def handle_action(event: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if not event:
        raise HTTPException(status_code=400, detail="Parameter 'event' is required")

    normalized_event = event.strip().lower()
    rule = EVENT_RULES.get(normalized_event)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Unknown event '{event}'")

    form_values = _extract_form_values(params)
    inputs_for_patch = {**DEFAULT_INPUTS, **form_values}
    email_value = inputs_for_patch.get("email")
    if isinstance(email_value, str):
        inputs_for_patch["email"] = email_value.strip()
    else:
        inputs_for_patch["email"] = ""

    dynamic_patch = _build_dynamic_patch(normalized_event, inputs_for_patch)

    base_context = _clone_base_context()
    context_with_inputs = _apply_patch_to_context(base_context, dynamic_patch)

    context_after_flow, final_node_id = _run_edge_sequence(rule["edge_id"], rule["source_node"], context_with_inputs)
    if not final_node_id:
        raise HTTPException(status_code=500, detail=f"Event '{event}' did not resolve to a target node")

    keep_inputs = rule.get("keep_inputs", True)
    inputs_for_context = inputs_for_patch if keep_inputs else deepcopy(DEFAULT_INPUTS)

    screen_id = _resolve_screen_id(final_node_id)
    context = _build_api_context(context_after_flow, inputs_for_context, _state_overrides_for_node(final_node_id))
    return _make_screen_response(screen_id, context)
