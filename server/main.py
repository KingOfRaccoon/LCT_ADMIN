from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
from .bindings import apply_context_patch, render_screen

app = FastAPI(title='Sandbox Binding API')


class ApplyTransitionRequest(BaseModel):
    context: Dict[str, Any]
    patch: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None


class ApplyTransitionResponse(BaseModel):
    next_context: Dict[str, Any]
    trace: Optional[Any] = None


class RenderScreenRequest(BaseModel):
    schema: Dict[str, Any]
    context: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None


class RenderScreenResponse(BaseModel):
    resolved_schema: Dict[str, Any]
    trace: Optional[Any] = None


@app.post('/apply-transition', response_model=ApplyTransitionResponse)
def apply_transition(req: ApplyTransitionRequest):
    """Endpoint: применяет patch к context и возвращает новый контекст.
    Опционально возвращает trace при options.trace==True
    """
    trace_enabled = bool(req.options and req.options.get('trace'))
    try:
        next_ctx, trace = apply_context_patch(req.context, req.patch, trace_enabled=trace_enabled)
        return {'next_context': next_ctx, 'trace': trace}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/render-screen', response_model=RenderScreenResponse)
def render_screen_endpoint(req: RenderScreenRequest):
    """Endpoint: возвращает schema с подставленными из context значениями.
    """
    trace_enabled = bool(req.options and req.options.get('trace'))
    try:
        resolved, trace = render_screen(req.schema, req.context, trace_enabled=trace_enabled)
        return {'resolved_schema': resolved, 'trace': trace}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
