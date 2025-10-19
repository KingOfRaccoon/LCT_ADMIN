import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import avitoDemo from '../src/pages/Sandbox/data/avitoDemo.json' with { type: 'json' };
import { convertAvitoDemoNodesToReactFlow, convertAvitoDemoEdgesToReactFlow } from '../src/utils/avitoDemoConverter.js';
import { exportWorkflowAsJson } from '../src/utils/workflowMapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const workflow = avitoDemo;

  const nodes = convertAvitoDemoNodesToReactFlow(workflow.nodes || []);
  const edges = convertAvitoDemoEdgesToReactFlow(workflow.nodes || []);

  const graphData = {
    nodes,
    edges,
    screens: workflow.screens || {}
  };

  const exportJson = exportWorkflowAsJson(graphData, workflow.initialContext || {});
  const outputPath = path.resolve(__dirname, '../src/pages/Sandbox/data/avitoDemo.workflow.json');

  writeFileSync(outputPath, `${exportJson}\n`, 'utf-8');
  console.log(`✅ avitoDemo mapped workflow saved to ${outputPath}`);
}

run().catch((error) => {
  console.error('❌ Failed to map avitoDemo:', error);
  process.exitCode = 1;
});
