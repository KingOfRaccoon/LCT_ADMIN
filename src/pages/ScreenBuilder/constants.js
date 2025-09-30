import {
  MousePointer,
  Type,
  TextCursorInput,
  Image,
  List,
  BarChart,
  LayoutGrid,
  Columns,
  Rows
} from 'lucide-react';

export const SCREEN_BASE_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '720px',
  backgroundColor: '#ffffff',
  borderRadius: 'var(--screen-radius, 32px)',
  border: '1px solid var(--screen-border-color, rgba(148, 163, 184, 0.16))',
  boxShadow: 'var(--screen-shadow, 0 32px 60px rgba(15, 23, 42, 0.18))',
  padding: 'var(--screen-padding, 0px)',
  gap: '0px'
};

export const SECTION_DEFAULTS = {
  topBar: {
    props: {
      spacing: 0,
      padding: 0,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      background: 'transparent'
    },
    style: {
      width: '100%',
      borderBottom: '1px solid rgba(148, 163, 184, 0.08)'
    }
  },
  body: {
    props: {
      spacing: 0,
      padding: 0,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      background: 'transparent'
    },
    style: {
      flex: '1 1 auto'
    }
  },
  bottomBar: {
    props: {
      spacing: 0,
      padding: 0,
      alignItems: 'stretch',
      justifyContent: 'flex-end',
      background: 'transparent'
    },
    style: {
      width: '100%',
      borderTop: '1px solid rgba(148, 163, 184, 0.08)'
    }
  }
};

export const componentPalette = [
  {
    id: 'button',
    name: 'Button',
    category: 'Actions',
    icon: MousePointer,
    defaultProps: {
      text: 'Новая кнопка',
      variant: 'primary',
      size: 'medium'
    }
  },
  {
    id: 'text',
    name: 'Text',
    category: 'Content',
    icon: Type,
    defaultProps: {
      content: 'Новый текстовый блок',
      variant: 'body',
      color: '#0f172a'
    }
  },
  {
    id: 'input',
    name: 'Input',
    category: 'Forms',
    icon: TextCursorInput,
    defaultProps: {
      placeholder: 'Введите значение',
      type: 'text',
      required: false
    }
  },
  {
    id: 'image',
    name: 'Image',
    category: 'Content',
    icon: Image,
    defaultProps: {
      src: 'https://via.placeholder.com/640x360',
      alt: 'Placeholder image'
    }
  },
  {
    id: 'list',
    name: 'List',
    category: 'Content',
    icon: List,
    defaultProps: {
      variant: 'unordered',
      items: ['Первый элемент', 'Второй элемент', 'Третий элемент'],
      itemAlias: 'item'
    }
  },
  {
    id: 'chart',
    name: 'Chart',
    category: 'Data',
    icon: BarChart,
    defaultProps: {
      title: 'Диаграмма'
    }
  },
  {
    id: 'container',
    name: 'Floating Container',
    category: 'Layout',
    icon: LayoutGrid,
    defaultProps: {
      padding: 24,
      background: '#ffffff'
    }
  },
  {
    id: 'column',
    name: 'Column',
    category: 'Layout',
    icon: Columns,
    defaultProps: {
      spacing: 24,
      padding: 16,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      background: 'transparent'
    }
  },
  {
    id: 'row',
    name: 'Row',
    category: 'Layout',
    icon: Rows,
    defaultProps: {
      spacing: 16,
      padding: 0,
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexWrap: 'nowrap',
      background: 'transparent'
    }
  }
];
