# BDUI Admin Panel - Business-Driven User Interface Platform

A comprehensive low-code platform for creating products using drag-and-drop interfaces, real-time preview, and seamless data binding through virtual context management.

## 🚀 Features

### Core Capabilities
- **Visual Product Builder**: Create complete applications with drag-and-drop components
- **Flow Editor**: Design screen transitions and actions using React Flow
- **Virtual Context System**: Manage global state and variables across screens
- **Real-time Preview**: Instant visualization of changes
- **Component Library**: Extensible set of UI components
- **Data Binding**: Connect components to variables and APIs
- **Export/Import**: Save and share product configurations

### Key Screens

#### 1. Product List Dashboard
- Grid and table view of all products
- Search and filter capabilities
- Status management (draft/active)
- CRUD operations (create, edit, duplicate, delete)
- Responsive design

#### 2. Product Overview
- Product metadata editing
- Screen flow visualization
- Global settings management
- Statistics dashboard
- Version control

#### 3. Screen Flow Editor
- Visual graph editor with React Flow
- Custom node types (screens, actions, conditions)
- Drag-to-connect transitions
- Properties panel for detailed configuration
- Validation system with error highlighting
- Undo/redo functionality

#### 4. UI Builder
- Drag-and-drop component palette
- Visual canvas with real-time editing
- Properties panel for component customization
- Data binding to virtual context variables
- Preview mode
- Responsive design tools

#### 5. Sandbox
- Interactive testing environment for product graphs
- Navigate through screen flows with simulated context
- Debug transitions and variable changes in real-time
- Preview UI components with live data binding
- History tracking for context patches and transitions

## 🏗️ Architecture

### Virtual Context System
The core of BDUI is the Virtual Context - a centralized state management system that:
- Stores variables from user inputs, API calls, and actions
- Enables seamless data binding across components
- Maintains data flow between screens
- Supports real-time updates and synchronization

### Component Structure
```
src/
├── context/
│   └── VirtualContext.jsx     # Global state management
├── components/
│   └── Layout/                 # App layout components
├── pages/
│   ├── ProductList/           # Dashboard with product grid/table
│   ├── ProductOverview/       # Product metadata and screen management
│   ├── ScreenEditor/          # Flow editor with React Flow
│   └── ScreenBuilder/         # UI builder with drag-and-drop
└── App.jsx                    # Main routing and context provider
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20.19.0 or higher
- npm 10.9.0 or higher

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd TeST

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run unit and integration tests
npm test
```

### Development Server
The application runs on `http://localhost:5173` by default.

### Testing & Quality

- **Node test runner:** `npm test` executes unit and integration suites across the sandbox server and front-end bindings.
- **Linting:** `npm run lint` keeps JavaScript and JSX consistent with the shared ESLint config.

### Component Playground

- `npm run playground` launches a Ladle-powered catalog with interactive Screen Builder blueprints and widget presets.
- `npm run playground:build` produces a static build you can host alongside the main app for design reviews.
- Stories live in `src/playground/stories` and automatically apply the shared design tokens for visual parity with the builder canvas.

### Debug logging

- Set `VITE_VC_TRACE=true` (for Vite) or `VC_TRACE=true` (for Node-based sandboxes/tests) to enable verbose logging via `src/utils/logger.js`.
- Toggle logging at runtime in the browser console with `window.__VC_TRACE__ = true`.

## 🎨 Design Tokens & Cross-Platform Styling

To keep the React web client and the Compose Multiplatform mobile client visually aligned, the project now ships with a shared set of design tokens.

### Where the tokens live

- **Source of truth:** `src/styles/designTokens.json`
- **Runtime helper:** `src/styles/applyDesignTokens.js`
	- `applyDesignTokens()` loads the JSON and exposes every token as a CSS custom property (e.g. `--colors-primary`).
	- `designTokens` and `getToken()` exports let you read raw values inside React components when you need numeric values instead of CSS variables.

### Using the tokens in React

```jsx
import { designTokens, getToken } from '../styles/applyDesignTokens.js' // adjust the path for your component

const Card = ({ children }) => (
	<div
		style={{
			borderRadius: getToken('radius.field'),
			boxShadow: getToken('shadows.md'),
			background: 'var(--colors-surface)'
		}}
	>
		{children}
	</div>
)
```

You can also use the CSS variables straight in stylesheets: `background: var(--colors-surface); padding: var(--spacing-lg);`.

### Using the tokens in Compose Multiplatform

Because the tokens are plain JSON, the mobile app can deserialize them once and feed them into a theme layer.

```kotlin
@Serializable
data class DesignTokens(val colors: Colors, val spacing: Spacing, /* ... */)

val tokens = remember {
		Json.decodeFromString<DesignTokens>(
				resources.openRawResource("designTokens.json").readBytes().decodeToString()
		)
}

val PrimaryColor = Color(tokens.colors.primary)
val PaddingLg = tokens.spacing.lg.dp

Surface(color = PrimaryColor) {
		Box(Modifier.padding(PaddingLg)) {
				/* content */
		}
}
```

You can keep the JSON file in a shared `resources` directory or fetch it from the web bundle at runtime. The same numeric spacing and radius values map cleanly to `dp`, while colors convert to `Color(...)`.

> Tip: if you need to generate strongly typed Kotlin models automatically, run `kotlinx.serialization`'s JSON-to-schema task or copy the existing data classes into your shared module.

### Widget styling presets for React & Compose

On top of the atomic design tokens we now ship higher-level widget presets that capture the default look & feel of buttons, inputs, lists, charts, and more. They live in `src/styles/widgetStyles.json` and are consumed in React through `resolveWidgetStyles`.

#### React usage

```jsx
import { resolveWidgetStyles } from '../styles/resolveWidgetStyles.js'

const PrimaryButton = ({ label }) => {
	const { style } = resolveWidgetStyles('button', { variant: 'primary', size: 'medium' })

	return (
		<button className="canvas-button" style={style}>
			{label}
		</button>
	)
}
```

The helper merges base, size, and variant presets, exposes them both as regular inline React style props (`backgroundColor`, `fontSize`, etc.) and as CSS variables (`--widget-button-background-color`). The Screen Builder canvas and any custom component can reuse the very same contract by spreading `style` and adding extra overrides on top:

```jsx
const { style } = resolveWidgetStyles('input')
return <input className="canvas-input" style={{ ...style, width: 320 }} readOnly />
```

#### Compose usage

Compose can reuse the exact same JSON. Each widget entry is a plain serializable map, so you can decode it into data classes and map the fields to modifiers and theming primitives:

```kotlin
@Serializable data class WidgetStyles(
		val button: WidgetPreset,
		val input: WidgetPreset,
		// ...
)

val widgetPresets = remember {
		Json.decodeFromString<WidgetStyles>(
				resources.openRawResource("widgetStyles.json").readBytes().decodeToString()
		)
}

val button = widgetPresets.button.resolved("primary", size = "medium")
Button(
		onClick = {},
		colors = ButtonDefaults.buttonColors(backgroundColor = Color(button.backgroundColor)),
		shape = RoundedCornerShape(button.borderRadius.dp)
) {
		Text("Action", fontSize = button.fontSize.sp)
}
```

A thin Kotlin extension (e.g. `WidgetPreset.resolved()`) can perform the same base/variant/size merge that happens in React, so both platforms stay pixel-perfect without duplicating values. Keep the JSON alongside `designTokens.json` in your shared resources and re-run decoding whenever the bundle refreshes.

## �️ Схема взаимодействия виджетов и контекста

<p align="center">
	<img src="./docs/widget-context-diagram.png" alt="Диаграмма взаимодействия виджетов и виртуального контекста" width="720" />
</p>

### Диаграмма последовательности

<p align="center">
	<img src="./docs/widget-context-sequence.png" alt="Диаграмма последовательности для оркестрации экрана" width="720" />
</p>

### Диаграмма потоков данных

<p align="center">
	<img src="./docs/widget-context-dataflow.png" alt="Диаграмма потоков данных для платформы" width="720" />
</p>

```mermaid
flowchart LR
	subgraph Backend
		ctx[(Virtual Context
		значения)]
		screenDef[Screen Definition
		+ Widget Props]
		enrich[[Сервис оркестрации]]
	end

	subgraph Frontend / Runtime
		renderer[Клиентское дерево экрана]
		widgets{{Виджеты
		(capabilities)}}
		events[[Event Dispatcher]]
	end

	ctx --> enrich
	screenDef --> enrich
	enrich -->|contextSnapshot| renderer
	renderer --> widgets
	widgets -->|consumesContext=true|
		renderer
	widgets -->|producesContext=true|
		events
	events -->|outputs| enrich
	enrich -->|обновлённые значения|
		ctx
```

**Как читать схему:**

- Миддл-бек объединяет описание экрана (`screenDef`) и актуальные значения из виртуального контекста (`ctx`), а также сверяется с графом продукта, чтобы выбрать следующий экран.
- Рендерер на фронте проходится по дереву компонентов, подставляет снапшот в каждый виджет с флагом `consumesContext`.
- Виджеты, которые генерируют данные (`producesContext`), отправляют изменения через единый `Event Dispatcher`.
- Миддл-бек принимает `outputs`, обновляет виртуальный контекст, выбирает следующий узел графа и при следующем рендере снова отдаёт консистентный снапшот.

Такое разделение позволяет явно контролировать, какие элементы только читают контекст, какие пишут обратно, и как состояние сохраняется между переходами по экрану.

## �🔧 Technical Stack

### Core Technologies
- **React 19.1.1**: UI framework
- **Vite**: Build tool and development server
- **React Router DOM**: Client-side routing
- **@xyflow/react**: Visual flow editor
- **React DnD**: Drag-and-drop functionality
- **React Hot Toast**: Notification system
- **Lucide React**: Icon library

### Development Tools
- **ESLint**: Code linting
- **CSS Modules**: Scoped styling
- **Hot Reload**: Instant development feedback

## 📋 User Workflows

### Creating a New Product
1. Navigate to Product List
2. Click "New Product" button
3. Enter product metadata (name, description, version)
4. Add screens using the overview interface
5. Design screen flows in the Flow Editor
6. Build UI components in the Screen Builder
7. Test and preview the complete product
8. Export or deploy the finished product

### Managing Virtual Context
1. Define variables in any screen or action
2. Bind component properties to variables
3. Use variables in conditional logic
4. Share data between screens seamlessly
5. Debug variable flow using the context panel

### Testing in Sandbox
1. Navigate to Sandbox from the sidebar
2. Select a node in the graph to view its screen
3. Click transition buttons to apply context patches
4. Monitor variable changes in the context panel
5. Review transition history for debugging
6. Reset scenario to start over

## 🎯 Key Features in Detail

### Virtual Context Management
- **Variable Types**: String, number, boolean, object, array
- **Sources**: User input, API responses, manual entry, calculations
- **Binding**: Two-way data binding between components and variables
- **Persistence**: Variables maintained across screen transitions
- **Debugging**: Real-time variable inspection and modification

### Flow Editor Capabilities
- **Node Types**: Screen nodes, action nodes (API, validation, condition)
- **Connections**: Configurable triggers (onClick, onSubmit, onSuccess, onError)
- **Validation**: Real-time error detection and flow validation
- **Export**: JSON export for deployment or backup
- **Undo/Redo**: Complete history management

### UI Builder Features
- **Component Palette**: Buttons, inputs, text, containers, images, lists, charts
- **Styling**: Visual property editor with real-time preview
- **Events**: Component event handling and screen transitions
- **Responsive**: Mobile-first responsive design tools
- **Data Binding**: Connect components to virtual context variables

### Sandbox Environment
- **Interactive Graph Navigation**: Click nodes to switch screens instantly
- **Context Simulation**: Apply patches to test variable changes
- **Transition History**: Track all state changes with timestamps
- **Real-time Rendering**: See UI updates as context evolves
- **Demo Products**: Pre-built examples like checkout flows for testing

---

**Built with ❤️ using React, Vite, and modern web technologies**
