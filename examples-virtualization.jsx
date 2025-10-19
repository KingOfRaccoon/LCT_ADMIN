/**
 * Example: How to Add Virtualization to Any List Component
 * 
 * This file demonstrates how to convert any list from .map() to virtualized rendering
 */

import React, { useCallback } from 'react';
import { SmartList, VirtualizedList, VirtualizedDynamicList } from '../pages/Sandbox/components/VirtualizedList';

// ============================================================================
// Example 1: Simple List with Fixed Height Items
// ============================================================================

// BEFORE: Regular rendering with .map()
function SimpleListBefore({ items }) {
  return (
    <div className="list-container">
      {items.map((item, index) => (
        <div key={item.id} className="list-item" style={{ height: 50 }}>
          {item.name}
        </div>
      ))}
    </div>
  );
}

// AFTER: Virtualized rendering with SmartList
function SimpleListAfter({ items }) {
  const renderItem = useCallback(({ index, data }) => (
    <div className="list-item">
      {data.name}
    </div>
  ), []);

  return (
    <SmartList
      items={items}
      renderItem={renderItem}
      itemHeight={50}
      height={400}
      itemKey={(index, item) => item.id}
    />
  );
}

// ============================================================================
// Example 2: Product Cards Grid
// ============================================================================

// BEFORE: Grid with .map()
function ProductGridBefore({ products }) {
  return (
    <div className="products-grid">
      {products.map((product) => (
        <div key={product.id} className="product-card">
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <button onClick={() => handleEdit(product)}>Edit</button>
        </div>
      ))}
    </div>
  );
}

// AFTER: Virtualized grid
function ProductGridAfter({ products }) {
  const renderProductCard = useCallback(({ index, data }) => (
    <div className="product-card">
      <h3>{data.name}</h3>
      <p>{data.description}</p>
      <button onClick={() => handleEdit(data)}>Edit</button>
    </div>
  ), []);

  return (
    <SmartList
      items={products}
      renderItem={renderProductCard}
      itemHeight={280}
      height={window.innerHeight - 200}
      className="products-grid virtualized"
      itemKey={(index, item) => item.id}
    />
  );
}

// ============================================================================
// Example 3: Table Rows
// ============================================================================

// BEFORE: Table with .map()
function DataTableBefore({ rows }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.email}</td>
            <td>{row.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// AFTER: Virtualized table
function DataTableAfter({ rows }) {
  const renderRow = useCallback(({ index, data }) => (
    <tr>
      <td>{data.name}</td>
      <td>{data.email}</td>
      <td>{data.status}</td>
    </tr>
  ), []);

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
          </tr>
        </thead>
      </table>
      <SmartList
        items={rows}
        renderItem={renderRow}
        itemHeight={60}
        height={500}
        className="virtualized-tbody"
        itemKey={(index, item) => item.id}
      />
    </div>
  );
}

// ============================================================================
// Example 4: Dynamic Height Items
// ============================================================================

// BEFORE: Comments with variable heights
function CommentsListBefore({ comments }) {
  return (
    <div className="comments-list">
      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <h4>{comment.author}</h4>
          <p>{comment.text}</p>
          {comment.replies && (
            <div className="replies">
              {comment.replies.map(reply => (
                <div key={reply.id}>{reply.text}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// AFTER: Virtualized with dynamic heights
function CommentsListAfter({ comments }) {
  const renderComment = useCallback(({ index, data }) => (
    <div className="comment">
      <h4>{data.author}</h4>
      <p>{data.text}</p>
      {data.replies && (
        <div className="replies">
          {data.replies.map(reply => (
            <div key={reply.id}>{reply.text}</div>
          ))}
        </div>
      )}
    </div>
  ), []);

  const getCommentHeight = useCallback((index, comment) => {
    // Base height + replies
    const baseHeight = 100;
    const replyHeight = (comment.replies?.length || 0) * 60;
    return baseHeight + replyHeight;
  }, []);

  return (
    <VirtualizedDynamicList
      items={comments}
      renderItem={renderComment}
      getItemHeight={getCommentHeight}
      estimatedItemHeight={100}
      height={600}
      itemKey={(index, item) => item.id}
    />
  );
}

// ============================================================================
// Example 5: Conditional Virtualization
// ============================================================================

function SmartProductList({ products, forceVirtualization = false }) {
  const renderProduct = useCallback(({ index, data }) => (
    <div className="product-item">
      <span>{data.name}</span>
      <span>{data.price}</span>
    </div>
  ), []);

  return (
    <SmartList
      items={products}
      renderItem={renderProduct}
      itemHeight={80}
      height={600}
      enableVirtualization={forceVirtualization || products.length >= 50}
      itemKey={(index, item) => item.id}
    />
  );
}

// ============================================================================
// Example 6: Advanced - Manual Virtualization Control
// ============================================================================

function AdvancedList({ items }) {
  const shouldVirtualize = items.length >= 100;

  const renderItem = useCallback(({ index, data }) => (
    <div className="advanced-item">
      <h3>{data.title}</h3>
      <p>{data.description}</p>
      <div className="actions">
        <button>Edit</button>
        <button>Delete</button>
      </div>
    </div>
  ), []);

  if (!shouldVirtualize) {
    // Normal rendering for small lists
    return (
      <div className="advanced-list">
        {items.map((item, index) => (
          <div key={item.id} className="advanced-item">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="actions">
              <button>Edit</button>
              <button>Delete</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Virtualized rendering for large lists
  return (
    <VirtualizedList
      items={items}
      renderItem={renderItem}
      itemHeight={120}
      height={700}
      overscanCount={3}
      itemKey={(index, item) => item.id}
    />
  );
}

// ============================================================================
// Example 7: With Loading States
// ============================================================================

function ListWithLoading({ items, loading }) {
  const renderItem = useCallback(({ index, data }) => (
    <div className="item">
      {data.name}
    </div>
  ), []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (items.length === 0) {
    return <div className="empty">No items found</div>;
  }

  return (
    <SmartList
      items={items}
      renderItem={renderItem}
      itemHeight={60}
      height={500}
      itemKey={(index, item) => item.id}
    />
  );
}

// ============================================================================
// Example 8: Responsive Heights
// ============================================================================

function ResponsiveList({ items }) {
  const renderItem = useCallback(({ index, data }) => (
    <div className="responsive-item">{data.name}</div>
  ), []);

  const containerHeight = Math.min(
    window.innerHeight - 200,  // Leave space for header/footer
    items.length * 80,         // Don't scroll if all items fit
    800                        // Max height
  );

  return (
    <SmartList
      items={items}
      renderItem={renderItem}
      itemHeight={80}
      height={containerHeight}
      itemKey={(index, item) => item.id}
    />
  );
}

// ============================================================================
// CSS Required for Virtualized Lists
// ============================================================================

const requiredCSS = `
/* For grid layout virtualization */
.products-grid.virtualized {
  display: block;
}

.products-grid.virtualized > div {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

/* For table virtualization */
.virtualized-tbody {
  display: block;
}

.virtualized-tbody table {
  width: 100%;
  border-collapse: collapse;
}

.virtualized-tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}

/* Ensure consistent heights */
.product-card,
.list-item,
.advanced-item {
  height: 100%;
}
`;

// ============================================================================
// Quick Migration Checklist
// ============================================================================

const migrationSteps = `
✅ MIGRATION CHECKLIST:

1. Import SmartList component
   import { SmartList } from '../Sandbox/components/VirtualizedList';

2. Extract item rendering logic to useCallback function
   const renderItem = useCallback(({ index, data }) => (
     // Your item JSX here
   ), [dependencies]);

3. Replace .map() with SmartList
   <SmartList
     items={items}
     renderItem={renderItem}
     itemHeight={YourItemHeight}
     height={ContainerHeight}
     itemKey={(index, item) => item.id}
   />

4. Update CSS if needed (grid/table layouts)
   - Add .virtualized class styles
   - Ensure items have consistent heights

5. Test with different item counts
   - < 50 items (normal rendering)
   - 50-100 items (virtualization starts)
   - 1000+ items (full performance benefits)

6. Verify functionality
   - Scrolling is smooth
   - Click handlers work
   - Styles are correct
   - Responsive behavior maintained
`;

export {
  SimpleListAfter,
  ProductGridAfter,
  DataTableAfter,
  CommentsListAfter,
  SmartProductList,
  AdvancedList,
  ListWithLoading,
  ResponsiveList,
  requiredCSS,
  migrationSteps
};
