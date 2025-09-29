from copy import deepcopy
from typing import Any, Dict, Optional, Tuple, List


def get_context_value(ctx: Dict[str, Any], path: str) -> Optional[Any]:
    """
    Получение значения из контекста по dot-path. Поддерживает числовые индексы для списков.
    Возвращает None, если путь не найден.
    """
    if not path:
        return None
    node = ctx
    for seg in path.split('.'):
        if isinstance(node, list):
            try:
                idx = int(seg)
            except Exception:
                return None
            if 0 <= idx < len(node):
                node = node[idx]
                continue
            return None
        if isinstance(node, dict) and seg in node:
            node = node[seg]
        else:
            return None
    return node


def is_binding(obj: Any) -> bool:
    """Определяет, является ли объект binding-описанием: словарь с ключом 'reference'"""
    return isinstance(obj, dict) and 'reference' in obj and isinstance(obj['reference'], str)


def normalize_reference(ref: str) -> str:
    """Превращает '${path.to.x}' -> 'path.to.x'"""
    if ref.startswith('${') and ref.endswith('}'):
        return ref[2:-1]
    return ref


def resolve_binding(binding_obj: Any, source_context: Dict[str, Any], trace: Optional[List[Dict]] = None) -> Any:
    """
    Разрешение binding-объекта против source_context.
    Если binding_obj не похож на binding, возвращаем его как есть.
    trace: опциональный список событий для трассировки.
    """
    if not is_binding(binding_obj):
        return binding_obj
    ref = normalize_reference(binding_obj['reference'])
    resolved = get_context_value(source_context, ref)
    if trace is not None:
        trace.append({'action': 'resolve', 'reference': ref, 'resolved': resolved})
    if resolved is not None:
        return resolved
    return binding_obj.get('value')


def flatten_patch(prefix: str, value: Any, out: Dict[str, Any]):
    """Преобразует вложенный patch (словарь) в плоский словарь 'a.b.c': value.
    Binding-объекты считаются атомарными (не флаттерятся).
    """
    if isinstance(value, dict) and not is_binding(value):
        for k, v in value.items():
            new_prefix = f"{prefix}.{k}" if prefix else k
            flatten_patch(new_prefix, v, out)
    else:
        out[prefix] = value


def set_context_value(ctx: Dict[str, Any], path: str, value: Any):
    """Устанавливает значение в dict ctx по dot-path, создавая словари/списки по необходимости.
    Упрощённая реализация, покрывающая типичные случаи.
    """
    parts = path.split('.') if path else []
    node = ctx
    for i, p in enumerate(parts):
        last = (i == len(parts) - 1)
        # если сегмент — индекс списка
        if p.isdigit():
            idx = int(p)
            if not isinstance(node, list):
                # если текущий узел не список, заменим его на список
                # это простая эвристика; в продакшне нужна аккуратная миграция структуры
                parent_key = parts[i - 1] if i > 0 else None
                if parent_key is not None and isinstance(node, dict):
                    node[parent_key] = []
                    node = node[parent_key]
                else:
                    # если не можем корректно создать список — создаём новый
                    node = []
            while len(node) <= idx:
                node.append(None)
            if last:
                node[idx] = value
                return
            if node[idx] is None:
                node[idx] = {}
            node = node[idx]
        else:
            if last:
                node[p] = value
                return
            if p not in node or not isinstance(node[p], dict):
                node[p] = {}
            node = node[p]


def recompute_derived(ctx: Dict[str, Any]):
    """Пример рекомпутации: пересчитать data.order.total и totalFormatted по сумме data.cart.items[].price"""
    try:
        items = get_context_value(ctx, 'data.cart.items') or []
        total = 0
        for it in items:
            if isinstance(it, dict) and isinstance(it.get('price'), (int, float)):
                total += int(it['price'])
        ctx.setdefault('data', {})
        ctx['data'].setdefault('order', {})
        ctx['data']['order']['total'] = total
        ctx['data']['order']['totalFormatted'] = f"{total:,d}".replace(',', ' ') + ' ₽'
    except Exception:
        # не ломаем при ошибках — в реальном приложении логировать
        pass


def apply_context_patch(source_context: Dict[str, Any], patch: Dict[str, Any], trace_enabled: bool = False) -> Tuple[Dict[str, Any], Optional[List[Dict]]]:
    """
    Применяет patch к source_context и возвращает новую копию next_context.
    Binding-ы внутри patch разрешаются относительно source_context (не по промежуточным результатам).
    Возвращает (next_context, trace?) где trace — список операций, если trace_enabled.
    """
    trace = [] if trace_enabled else None
    next_ctx = deepcopy(source_context)
    flat: Dict[str, Any] = {}
    # 1) flatten
    for k, v in patch.items():
        flatten_patch(k, v, flat)
    # 2) resolve и set
    for path, val in flat.items():
        if is_binding(val):
            resolved = resolve_binding(val, source_context, trace)
        else:
            resolved = val
        set_context_value(next_ctx, path, resolved)
        if trace is not None:
            trace.append({'action': 'set', 'path': path, 'value': resolved})
    # 3) recompute derived
    recompute_derived(next_ctx)
    if trace is not None:
        trace.append({'action': 'recompute_derived'})
    return next_ctx, trace


def render_screen(schema: Dict[str, Any], context: Dict[str, Any], trace_enabled: bool = False) -> Tuple[Dict[str, Any], Optional[List[Dict]]]:
    """
    Рекурсивно проходит по schema (json описанию экрана) и заменяет binding-объекты
    на реальные значения из context. Возвращает resolved_schema и trace (опционально).
    """
    trace = [] if trace_enabled else None

    def resolve_props(props: Any, node_display_path: Optional[str] = None):
        # props может быть словарём, списком или примитивом
        if isinstance(props, dict):
            out = {}
            for k, v in props.items():
                # специальная логика для items + displayPath
                if k == 'items' and is_binding(v):
                    resolved = resolve_binding(v, context, trace)
                    disp = props.get('displayPath') or node_display_path
                    if isinstance(resolved, list) and disp:
                        out[k] = [ (item.get(disp) if isinstance(item, dict) else item) for item in resolved ]
                    else:
                        out[k] = resolved
                elif is_binding(v):
                    out[k] = resolve_binding(v, context, trace)
                else:
                    out[k] = resolve_props(v)
            return out
        elif isinstance(props, list):
            return [resolve_props(i) for i in props]
        else:
            return props

    resolved_schema = deepcopy(schema)
    # Принципиально: предполагается, что schema содержит список компонентов в ключе 'components'
    if isinstance(resolved_schema, dict) and 'components' in resolved_schema:
        new_components = []
        for comp in resolved_schema['components']:
            comp_copy = deepcopy(comp)
            if 'props' in comp_copy:
                comp_copy['props'] = resolve_props(comp_copy['props'])
            new_components.append(comp_copy)
        resolved_schema['components'] = new_components
    else:
        # универсальная попытка разрешить один узел
        if isinstance(resolved_schema, dict) and 'props' in resolved_schema:
            resolved_schema['props'] = resolve_props(resolved_schema['props'])
    return resolved_schema, trace
