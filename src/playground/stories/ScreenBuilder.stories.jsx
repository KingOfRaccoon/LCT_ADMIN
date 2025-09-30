import { useMemo } from 'react';
import SandboxScreenRenderer from '../../pages/Sandbox/SandboxScreenRenderer.jsx';
import ecommerceDashboard from '../../pages/Sandbox/data/ecommerceDashboard.json';
import { componentPalette } from '../../pages/ScreenBuilder/constants.js';
import { resolveWidgetStyles } from '../../styles/resolveWidgetStyles.js';
import { useDesignTokens } from '../hooks/useDesignTokens.js';
import '../../pages/ScreenBuilder/ScreenBuilder.css';
import './Playground.css';

const clone = (value) => JSON.parse(JSON.stringify(value));

export default {
  title: 'Screen Builder/Playground'
};

export const CheckoutScreenBlueprint = () => {
  useDesignTokens();
  const screen = ecommerceDashboard.screens['screen-checkout'];
  const context = useMemo(() => clone(ecommerceDashboard.initialContext), []);

  return (
    <div className="playground-surface">
      <div className="playground-sandbox">
        <SandboxScreenRenderer screen={screen} context={context} />
      </div>
    </div>
  );
};

CheckoutScreenBlueprint.storyName = 'Checkout screen blueprint';

const groupPaletteByCategory = (palette) => {
  return palette.reduce((acc, component) => {
    const category = component.category || 'Components';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(component);
    return acc;
  }, {});
};

export const ComponentPaletteGallery = () => {
  useDesignTokens();
  const paletteByCategory = useMemo(() => groupPaletteByCategory(componentPalette), []);

  return (
    <div className="playground-palette">
      {Object.entries(paletteByCategory).map(([category, entries]) => (
        <section key={category} className="playground-palette-section">
          <h3 className="playground-palette-title">{category}</h3>
          <div className="playground-palette-grid">
            {entries.map((entry) => {
              const { variant, size } = entry.defaultProps;
              const { meta } = resolveWidgetStyles(entry.id, { variant, size });
              const Icon = entry.icon;

              return (
                <article key={entry.id} className="playground-palette-card">
                  <div className="palette-card-header">
                    <Icon size={20} />
                    <h4 className="palette-card-title">{entry.name}</h4>
                  </div>
                  <div>
                    <strong>Default props</strong>
                    <div className="playground-token-preview">
                      {JSON.stringify(entry.defaultProps, null, 2)}
                    </div>
                  </div>
                  <div>
                    <strong>Resolved styles</strong>
                    <div className="playground-token-preview">
                      {JSON.stringify(meta.combined, null, 2)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

ComponentPaletteGallery.storyName = 'Component palette gallery';
