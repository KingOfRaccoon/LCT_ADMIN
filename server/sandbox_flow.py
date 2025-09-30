import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict

from fastapi import HTTPException

from .bindings import apply_context_patch


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


DEFAULT_INPUTS: Dict[str, str] = {"email": "", "promo": ""}


EVENT_RULES: Dict[str, Dict[str, Any]] = {
    "pay": {"edge_id": "edge-submit-success", "target_node": "success"},
    "cancel": {"edge_id": "edge-submit-cancel", "target_node": "cancelled"},
    "resume": {"edge_id": "edge-cancelled-retry", "target_node": "checkout"},
    "restart": {
        "edge_id": "edge-success-new-order",
        "target_node": "checkout",
        "keep_inputs": False
    }
}


_BUTTON_EVENT_INJECTIONS: Dict[str, Dict[str, str]] = {
    "screen-checkout": {
        "button-3yqrdr-1758927807107": "pay",
        "button-krym27-1758927807107": "cancel"
    }
}


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


def _build_dynamic_patch(event: str, inputs: Dict[str, str]) -> Dict[str, Any]:
    patch: Dict[str, Any] = {}
    email = inputs.get("email")
    promo = inputs.get("promo")

    if event == "pay":
        message_parts = []
        if email:
            patch["data.user.email"] = email
            message_parts.append(f"чек отправлен на {email}")
        else:
            message_parts.append("чек отправлен клиенту")
        if promo:
            message_parts.append(f"применён промокод {promo}")
        message = "Платёж завершён"
        if message_parts:
            message = f"{message}, " + ", ".join(message_parts)
        patch["ui.notifications.lastAction"] = message
    elif event == "cancel":
        base_message = "Заказ перенесён в отменённые"
        extra_parts = []
        if email:
            patch["data.user.email"] = email
            extra_parts.append(f"email клиента: {email}")
        if promo:
            extra_parts.append(f"промокод: {promo}")
        if extra_parts:
            patch["ui.notifications.lastAction"] = f"{base_message}. " + " ".join(extra_parts)
        else:
            patch["ui.notifications.lastAction"] = base_message
    elif event in {"resume", "restart"}:
        if email:
            patch["data.user.email"] = email

    return patch


def _build_patch_for_event(event: str, inputs: Dict[str, str]) -> Dict[str, Any]:
    rule = EVENT_RULES[event]
    edge = _EDGE_REGISTRY.get(rule["edge_id"])
    if not isinstance(edge, dict):
        raise HTTPException(status_code=500, detail=f"Edge '{rule['edge_id']}' is not defined in sandbox flow")
    patch = deepcopy(edge.get("contextPatch") or {})
    dynamic_patch = _build_dynamic_patch(event, inputs)
    if dynamic_patch:
        patch.update(dynamic_patch)
    return patch


def _apply_patch_to_context(base_context: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    if not patch:
        return deepcopy(base_context)
    next_ctx, _ = apply_context_patch(base_context, patch, trace_enabled=False)
    return next_ctx


def _make_state_snapshot(context: Dict[str, Any], overrides: Dict[str, Any], inputs: Dict[str, str]) -> Dict[str, Any]:
    ui = context.get("ui", {}) if isinstance(context, dict) else {}
    data = context.get("data", {}) if isinstance(context, dict) else {}
    order = data.get("order", {}) if isinstance(data, dict) else {}
    notifications = ui.get("notifications", {}) if isinstance(ui, dict) else {}

    cart_items = []
    cart = data.get("cart") if isinstance(data, dict) else None
    if isinstance(cart, dict):
        items = cart.get("items")
        if isinstance(items, list):
            cart_items = [item.get("title") for item in items if isinstance(item, dict) and item.get("title")]

    details = []
    message = overrides.get("lastMessage") or notifications.get("lastAction")
    if message:
        details.append(message)

    email = inputs.get("email")
    promo = inputs.get("promo")
    if email:
        details.append(f"Email клиента: {email}")
    if promo:
        details.append(f"Промокод: {promo}")

    state = {
        "title": overrides.get("title") or (ui.get("screen", {}).get("title") if isinstance(ui.get("screen"), dict) else "E-commerce Dashboard"),
        "status": overrides.get("status") or order.get("status", "draft"),
        "orderNumber": overrides.get("orderNumber") or order.get("number") or "ORD-1024",
        "total": order.get("total"),
        "totalFormatted": order.get("totalFormatted"),
        "lastMessage": message or "",
        "details": overrides.get("details") or details,
        "items": overrides.get("items") or cart_items
    }

    return state


def _build_api_context(core_ctx: Dict[str, Any], inputs: Dict[str, str], state_overrides: Dict[str, Any]) -> Dict[str, Any]:
    context_payload: Dict[str, Any] = {
        "ui": deepcopy(core_ctx.get("ui", {})),
        "data": deepcopy(core_ctx.get("data", {})),
        "inputs": {**DEFAULT_INPUTS, **(inputs or {})}
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
    context = _build_api_context(core_context, DEFAULT_INPUTS, _state_overrides_for_node("checkout"))
    screen_id = _resolve_screen_id("checkout")
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
    patch = _build_patch_for_event(normalized_event, inputs_for_patch)

    base_context = _clone_base_context()
    patched_context = _apply_patch_to_context(base_context, patch)

    email = inputs_for_patch.get("email")
    if email:
        patched_context.setdefault("data", {}).setdefault("user", {})["email"] = email

    keep_inputs = rule.get("keep_inputs", True)
    inputs_for_context = inputs_for_patch if keep_inputs else deepcopy(DEFAULT_INPUTS)

    screen_id = _resolve_screen_id(rule["target_node"])
    context = _build_api_context(patched_context, inputs_for_context, _state_overrides_for_node(rule["target_node"]))
    return _make_screen_response(screen_id, context)
