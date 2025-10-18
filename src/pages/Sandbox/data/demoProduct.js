/**
 * Демо-продукт для Sandbox
 * Теперь использует централизованный список продуктов из products.js
 */
import { defaultProduct, getDefaultProduct } from './products';

// Экспортируем продукт по умолчанию (featured)
export const demoProduct = defaultProduct;
export default defaultProduct;

// Также экспортируем функцию получения метаданных продукта
export { getDefaultProduct };

/* Legacy inline dataset retained for reference.
const legacyEcommerceDashboard = {
  id: 'demo-checkout-product',
  name: 'Demo Checkout Flow',
  description: 'Мини-песочница для исследования переходов в воронке оформления заказа',
  initialContext: {
    ui: {
      screen: {
        title: 'Оформление заказа'
      },
      actions: {
        submit: 'Оплатить заказ',
        cancel: 'Отменить',
        restart: 'Новый заказ'
      },
      form: {
        promoPlaceholder: 'У меня есть промокод'
      },
      notifications: {
        lastAction: 'Заказ создан и ожидает оплаты'
      }
    },
    data: {
      order: {
        status: 'draft',
        total: 16110,
        totalFormatted: '16 110 ₽'
      },
      cart: {
        items: [
          {
            title: 'Тариф «Премиум» — 9 990 ₽',
            price: 9990,
            priceFormatted: '9 990 ₽'
          },
          {
            title: 'Сопровождение запуска — 3 000 ₽',
            price: 3000,
            priceFormatted: '3 000 ₽'
          },
          {
            title: 'Сопровождение запуска — 3 120 ₽',
            price: 3120,
            priceFormatted: '3 120 ₽'
          }
        ]
      },
      user: {
        email: 'founder@example.com'
      }
    }
  },
  nodes: [
    {
      id: 'checkout',
      label: 'Оформление заказа',
      screenId: 'screen-checkout',
      start: true,
      edges: [
        {
          id: 'edge-submit-success',
          label: 'Оплатить успешно',
          target: 'success',
          summary: 'Переход на экран успеха, обновляет статус заказа',
          contextPatch: {
            'data.order.status': 'paid',
            'data.order.total': 16110,
            'data.order.totalFormatted': '16 110 ₽',
            'ui.notifications.lastAction': 'Платёж завершён, чек отправлен клиенту'
          }
        },
        {
          id: 'edge-submit-cancel',
          label: 'Отменить заказ',
          target: 'cancelled',
          summary: 'Клиент отменяет оплату и возвращается в салес-воронку',
          contextPatch: {
            'data.order.status': 'cancelled',
            'ui.notifications.lastAction': 'Заказ перенесён в отменённые'
          }
        }
      ]
    },
    {
      id: 'success',
      label: 'Оплата прошла',
      screenId: 'screen-success',
      edges: [
        {
          id: 'edge-success-new-order',
          label: 'Оформить новый заказ',
          target: 'checkout',
          summary: 'Возврат на основной экран с очисткой статуса',
          contextPatch: {
            'data.order.status': 'draft',
            'ui.notifications.lastAction': 'Создан новый драфт заказа'
          }
        }
      ]
    },
    {
      id: 'cancelled',
      label: 'Заказ отменён',
      screenId: 'screen-cancelled',
      edges: [
        {
          id: 'edge-cancelled-retry',
          label: 'Вернуться к оплате',
          target: 'checkout',
          summary: 'Повторная попытка оплаты, сбрасывает статус заказа',
          contextPatch: {
            'data.order.status': 'draft',
            'ui.notifications.lastAction': 'Клиент вернулся к оформлению'
          }
        }
      ]
    }
  ],
  screens: {
    'screen-checkout': {
      "id": "screen-cuhn04-1758927807107",
      "type": "Screen",
      "name": "Screen",
      "style": {
        "display": "flex",
        "flexDirection": "column",
        "minHeight": "720px",
        "backgroundColor": "#ffffff",
        "borderRadius": "var(--screen-radius, 32px)",
        "border": "1px solid var(--screen-border-color, rgba(148, 163, 184, 0.16))",
        "boxShadow": "var(--screen-shadow, 0 32px 60px rgba(15, 23, 42, 0.18))",
        "padding": "var(--screen-padding, 0px)",
        "gap": "0px"
      },
      "sections": {
        "topBar": {
          "id": "topbar-td51kr-1758927807107",
          "type": "Section",
          "properties": {
            "slot": "topBar",
            "spacing": 16,
            "padding": 20,
            "alignItems": "stretch",
            "justifyContent": "flex-start",
            "background": "transparent"
          },
          "style": {
            "width": "100%",
            "borderBottom": "1px solid rgba(148, 163, 184, 0.1)",
            "paddingBottom": "10px",
            "marginBottom": "18px",
            "background": "transparent"
          },
          "children": [
            {
              "id": "row-p3ti8u-1758927807107",
              "type": "row",
              "properties": {
                "spacing": 24,
                "padding": 0,
                "alignItems": "center",
                "justifyContent": "space-between",
                "background": "transparent"
              },
              "style": {
                "width": "100%",
                "background": "transparent"
              },
              "children": [
                {
                  "id": "row-wby4en-1758927807107",
                  "type": "row",
                  "properties": {
                    "spacing": 16,
                    "padding": 0,
                    "alignItems": "center",
                    "justifyContent": "flex-start",
                    "background": "transparent"
                  },
                  "style": {
                    "flex": "1 1 auto",
                    "background": "transparent"
                  },
                  "children": [
                    {
                      "id": "text-nzz36b-1758927807107",
                      "type": "text",
                      "properties": {
                        "content": "NE",
                        "variant": "heading",
                        "color": "#1d4ed8"
                      },
                      "style": {
                        "width": "48px",
                        "height": "48px",
                        "borderRadius": "16px",
                        "background": "#dbeafe",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "fontSize": "20px",
                        "fontWeight": 700,
                        "letterSpacing": "0.04em"
                      },
                      "children": [],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    },
                    {
                      "id": "column-xbtgxw-1758927807107",
                      "type": "column",
                      "properties": {
                        "spacing": 4,
                        "padding": 0,
                        "alignItems": "flex-start",
                        "justifyContent": "flex-start",
                        "background": "transparent"
                      },
                      "style": {
                        "flex": "0 1 auto",
                        "background": "transparent"
                      },
                      "children": [
                        {
                          "id": "text-nz5g1b-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "Магазин «New Screen»",
                            "variant": "heading",
                            "color": "#0f172a"
                          },
                          "style": {
                            "fontSize": "22px",
                            "fontWeight": 600
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "text-f8qv45-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "Работает ежедневно • Ответ за 5 минут",
                            "variant": "caption",
                            "color": "#64748b"
                          },
                          "style": {
                            "fontSize": "14px",
                            "letterSpacing": "0.02em"
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        }
                      ],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    }
                  ],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                },
                {
                  "id": "row-0erxe4-1758927807107",
                  "type": "row",
                  "properties": {
                    "spacing": 12,
                    "padding": 0,
                    "alignItems": "center",
                    "justifyContent": "flex-end",
                    "background": "transparent"
                  },
                  "style": {
                    "background": "transparent"
                  },
                  "children": [
                    {
                      "id": "button-29czmf-1758927807107",
                      "type": "button",
                      "properties": {
                        "text": "Сообщения",
                        "variant": "secondary",
                        "size": "medium"
                      },
                      "style": {
                        "height": "44px",
                        "padding": "0 20px",
                        "borderRadius": "12px",
                        "border": "1px solid rgba(148, 163, 184, 0.6)",
                        "background": "#f8fafc",
                        "color": "#0f172a",
                        "fontWeight": 500
                      },
                      "children": [],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    },
                    {
                      "id": "button-2rs9mg-1758927807107",
                      "type": "button",
                      "properties": {
                        "text": "Новое объявление",
                        "variant": "primary",
                        "size": "medium"
                      },
                      "style": {
                        "height": "44px",
                        "padding": "0 24px",
                        "borderRadius": "12px",
                        "background": "#2563eb",
                        "color": "#ffffff",
                        "fontWeight": 600,
                        "boxShadow": "0 14px 28px rgba(37, 99, 235, 0.28)"
                      },
                      "children": [],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    }
                  ],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                }
              ],
              "position": {
                "x": 0,
                "y": 0
              }
            },
            {
              "id": "row-7tt3h3-1758927807107",
              "type": "row",
              "properties": {
                "spacing": 16,
                "padding": 0,
                "alignItems": "center",
                "justifyContent": "space-between",
                "background": "transparent"
              },
              "style": {
                "width": "100%",
                "background": "transparent"
              },
              "children": [
                {
                  "id": "input-a46y0a-1758927807107",
                  "type": "input",
                  "properties": {
                    "placeholder": "Поиск по объявлениям и покупателям",
                    "type": "search",
                    "required": false
                  },
                  "style": {
                    "flex": "1 1 auto",
                    "height": "46px",
                    "borderRadius": "14px",
                    "border": "1px solid rgba(148, 163, 184, 0.32)",
                    "padding": "0 18px",
                    "background": "#f8fafc",
                    "fontSize": "15px"
                  },
                  "children": [],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                },
                {
                  "id": "row-ihi3k9-1758927807107",
                  "type": "row",
                  "properties": {
                    "spacing": 12,
                    "padding": 0,
                    "alignItems": "center",
                    "justifyContent": "flex-end",
                    "background": "transparent"
                  },
                  "style": {
                    "background": "transparent"
                  },
                  "children": [
                    {
                      "id": "button-6zng9l-1758927807107",
                      "type": "button",
                      "properties": {
                        "text": "Фильтры",
                        "variant": "secondary",
                        "size": "medium"
                      },
                      "style": {
                        "height": "44px",
                        "padding": "0 20px",
                        "borderRadius": "12px",
                        "border": "1px solid rgba(148, 163, 184, 0.48)",
                        "background": "#ffffff",
                        "color": "#0f172a",
                        "fontWeight": 500
                      },
                      "children": [],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    },
                    {
                      "id": "button-d1bop8-1758927807107",
                      "type": "button",
                      "properties": {
                        "text": "Аналитика",
                        "variant": "primary",
                        "size": "medium"
                      },
                      "style": {
                        "height": "44px",
                        "padding": "0 22px",
                        "borderRadius": "12px",
                        "background": "#0f172a",
                        "color": "#f8fafc",
                        "fontWeight": 600,
                        "boxShadow": "0 16px 28px rgba(15, 23, 42, 0.28)"
                      },
                      "children": [],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    }
                  ],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                }
              ],
              "position": {
                "x": 0,
                "y": 0
              }
            }
          ]
        },
        "body": {
          "id": "body-zmsxns-1758927807107",
          "type": "Section",
          "properties": {
            "slot": "body",
            "spacing": 20,
            "padding": 24,
            "alignItems": "stretch",
            "justifyContent": "flex-start",
            "background": "transparent"
          },
          "style": {
            "flex": "1 1 auto",
            "marginBottom": "18px",
            "background": "transparent"
          },
          "children": [
            {
              "id": "column-rgllih-1758927807107",
              "type": "column",
              "properties": {
                "spacing": 14,
                "padding": 28,
                "alignItems": "flex-start",
                "justifyContent": "flex-start",
                "background": "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)"
              },
              "style": {
                "borderRadius": "26px",
                "color": "#ffffff",
                "boxShadow": "0 32px 56px rgba(30, 64, 175, 0.35)",
                "border": "none",
                "background": "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)"
              },
              "children": [
                {
                  "id": "text-7gak61-1758927807107",
                  "type": "text",
                  "properties": {
                    "content": "Управляйте витриной магазина как в приложении Авито",
                    "variant": "heading",
                    "color": "#ffffff"
                  },
                  "style": {
                    "fontSize": "30px",
                    "fontWeight": 700,
                    "lineHeight": "38px"
                  },
                  "children": [],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                },
                {
                  "id": "text-3zyb1l-1758927807107",
                  "type": "text",
                  "properties": {
                    "content": "Следите за статусом объявлений, перепиской и аналитикой в одном экране конструктора.",
                    "variant": "body",
                    "color": "rgba(255, 255, 255, 0.82)"
                  },
                  "style": {
                    "fontSize": "16px",
                    "maxWidth": "540px"
                  },
                  "children": [],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                },
                {
                  "id": "row-siyn92-1758927807107",
                  "type": "row",
                  "properties": {
                    "spacing": 20,
                    "padding": 0,
                    "alignItems": "stretch",
                    "justifyContent": "flex-start",
                    "background": "transparent"
                  },
                  "style": {
                    "width": "100%",
                    "background": "transparent"
                  },
                  "children": [
                    {
                      "id": "column-7sq3br-1758927807107",
                      "type": "column",
                      "properties": {
                        "spacing": 6,
                        "padding": 0,
                        "alignItems": "flex-start",
                        "justifyContent": "flex-start",
                        "background": "transparent"
                      },
                      "style": {
                        "background": "transparent"
                      },
                      "children": [
                        {
                          "id": "text-rokggj-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "Активные объявления",
                            "variant": "caption",
                            "color": "rgba(226, 232, 240, 0.82)"
                          },
                          "style": {
                            "letterSpacing": "0.08em",
                            "textTransform": "uppercase"
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "text-wcf15n-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "27",
                            "variant": "heading",
                            "color": "#ffffff"
                          },
                          "style": {
                            "fontSize": "28px",
                            "fontWeight": 700
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        }
                      ],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    },
                    {
                      "id": "column-hv84ph-1758927807107",
                      "type": "column",
                      "properties": {
                        "spacing": 6,
                        "padding": 0,
                        "alignItems": "flex-start",
                        "justifyContent": "flex-start",
                        "background": "transparent"
                      },
                      "style": {
                        "background": "transparent"
                      },
                      "children": [
                        {
                          "id": "text-4k9owf-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "Отклики за сутки",
                            "variant": "caption",
                            "color": "rgba(226, 232, 240, 0.82)"
                          },
                          "style": {
                            "letterSpacing": "0.08em",
                            "textTransform": "uppercase"
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "text-ylh33e-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "312",
                            "variant": "heading",
                            "color": "#ffffff"
                          },
                          "style": {
                            "fontSize": "28px",
                            "fontWeight": 700
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        }
                      ],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    },
                    {
                      "id": "column-zehtz9-1758927807107",
                      "type": "column",
                      "properties": {
                        "spacing": 6,
                        "padding": 0,
                        "alignItems": "flex-start",
                        "justifyContent": "flex-start",
                        "background": "transparent"
                      },
                      "style": {
                        "background": "transparent"
                      },
                      "children": [
                        {
                          "id": "text-wzzzul-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "Средний рейтинг",
                            "variant": "caption",
                            "color": "rgba(226, 232, 240, 0.82)"
                          },
                          "style": {
                            "letterSpacing": "0.08em",
                            "textTransform": "uppercase"
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "text-rnmvro-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "4.9",
                            "variant": "heading",
                            "color": "#ffffff"
                          },
                          "style": {
                            "fontSize": "28px",
                            "fontWeight": 700
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        }
                      ],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    }
                  ],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                }
              ],
              "position": {
                "x": 0,
                "y": 0
              }
            },
            {
              "id": "column-gv13y0-1758927807107",
              "type": "column",
              "properties": {
                "spacing": 20,
                "padding": 24,
                "alignItems": "stretch",
                "justifyContent": "flex-start",
                "background": "#ffffff"
              },
              "style": {
                "borderRadius": "22px",
                "border": "1px solid rgba(148, 163, 184, 0.16)",
                "background": "#ffffff"
              },
              "children": [
                {
                  "id": "row-aw15bf-1758927807107",
                  "type": "row",
                  "properties": {
                    "spacing": 16,
                    "padding": 0,
                    "alignItems": "center",
                    "justifyContent": "space-between",
                    "background": "transparent"
                  },
                  "style": {
                    "background": "transparent"
                  },
                  "children": [
                    {
                      "id": "text-ygim6d-1758927807107",
                      "type": "text",
                      "properties": {
                        "content": "Объявления магазина",
                        "variant": "subheading",
                        "color": "#0f172a"
                      },
                      "style": {
                        "fontSize": "20px",
                        "fontWeight": 600
                      },
                      "children": [],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    },
                    {
                      "id": "text-38ld4i-1758927807107",
                      "type": "text",
                      "properties": {
                        "content": "Последнее обновление — 15 минут назад",
                        "variant": "caption",
                        "color": "#64748b"
                      },
                      "style": {
                        "fontSize": "14px"
                      },
                      "children": [],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    }
                  ],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                },
                {
                  "id": "row-lih1m9-1758927807107",
                  "type": "row",
                  "properties": {
                    "spacing": 20,
                    "padding": 0,
                    "alignItems": "stretch",
                    "justifyContent": "space-between",
                    "flexWrap": "wrap",
                    "background": "transparent"
                  },
                  "style": {
                    "width": "100%",
                    "background": "transparent"
                  },
                  "children": [
                    {
                      "id": "column-azq9tw-1758927807107",
                      "type": "column",
                      "properties": {
                        "spacing": 12,
                        "padding": 20,
                        "alignItems": "flex-start",
                        "justifyContent": "flex-start",
                        "background": "#f8fafc"
                      },
                      "style": {
                        "flex": "1 1 0",
                        "minWidth": "220px",
                        "borderRadius": "18px",
                        "border": "1px solid rgba(148, 163, 184, 0.18)",
                        "boxShadow": "0 16px 28px rgba(15, 23, 42, 0.06)",
                        "background": "#f8fafc"
                      },
                      "children": [
                        {
                          "id": "text-hrv3h8-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "Колесные диски R18",
                            "variant": "subheading",
                            "color": "#0f172a"
                          },
                          "style": {
                            "fontSize": "18px",
                            "fontWeight": 600
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "text-vcpidi-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "12 900 ₽",
                            "variant": "heading",
                            "color": "#111827"
                          },
                          "style": {
                            "fontSize": "20px",
                            "fontWeight": 600
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "row-galrer-1758927807107",
                          "type": "row",
                          "properties": {
                            "spacing": 8,
                            "padding": 0,
                            "alignItems": "center",
                            "justifyContent": "space-between",
                            "background": "transparent"
                          },
                          "style": {
                            "width": "100%",
                            "background": "transparent"
                          },
                          "children": [
                            {
                              "id": "text-1cqmc1-1758927807107",
                              "type": "text",
                              "properties": {
                                "color": "#15803d"
                              },
                              "style": {
                                "fontWeight": 600
                              },
                              "children": [],
                              "position": {
                                "x": 0,
                                "y": 0
                              }
                            },
                            {
                              "id": "text-fqflm6-1758927807107",
                              "type": "text",
                              "properties": {
                                "color": "#64748b"
                              },
                              "style": {
                                "fontSize": "13px"
                              },
                              "children": [],
                              "position": {
                                "x": 0,
                                "y": 0
                              }
                            }
                          ],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "button-aijk48-1758927807107",
                          "type": "button",
                          "properties": {
                            "text": "Открыть чат",
                            "variant": "primary",
                            "size": "medium"
                          },
                          "style": {
                            "width": "100%",
                            "height": "42px",
                            "borderRadius": "12px",
                            "background": "#2563eb",
                            "color": "#ffffff",
                            "fontWeight": 600,
                            "border": "none"
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        }
                      ],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    },
                    {
                      "id": "column-yj2dgy-1758927807107",
                      "type": "column",
                      "properties": {
                        "spacing": 12,
                        "padding": 20,
                        "alignItems": "flex-start",
                        "justifyContent": "flex-start",
                        "background": "#f8fafc"
                      },
                      "style": {
                        "flex": "1 1 0",
                        "minWidth": "220px",
                        "borderRadius": "18px",
                        "border": "1px solid rgba(148, 163, 184, 0.18)",
                        "boxShadow": "0 16px 28px rgba(15, 23, 42, 0.06)",
                        "background": "#f8fafc"
                      },
                      "children": [
                        {
                          "id": "text-u7hk6o-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "Шины Bridgestone Ice",
                            "variant": "subheading",
                            "color": "#0f172a"
                          },
                          "style": {
                            "fontSize": "18px",
                            "fontWeight": 600
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "text-nc0oz5-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "21 300 ₽",
                            "variant": "heading",
                            "color": "#111827"
                          },
                          "style": {
                            "fontSize": "20px",
                            "fontWeight": 600
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "row-5kx0v2-1758927807107",
                          "type": "row",
                          "properties": {
                            "spacing": 8,
                            "padding": 0,
                            "alignItems": "center",
                            "justifyContent": "space-between",
                            "background": "transparent"
                          },
                          "style": {
                            "width": "100%",
                            "background": "transparent"
                          },
                          "children": [
                            {
                              "id": "text-81qdjp-1758927807107",
                              "type": "text",
                              "properties": {
                                "color": "#b45309"
                              },
                              "style": {
                                "fontWeight": 600
                              },
                              "children": [],
                              "position": {
                                "x": 0,
                                "y": 0
                              }
                            },
                            {
                              "id": "text-2c8int-1758927807107",
                              "type": "text",
                              "properties": {
                                "color": "#64748b"
                              },
                              "style": {
                                "fontSize": "13px"
                              },
                              "children": [],
                              "position": {
                                "x": 0,
                                "y": 0
                              }
                            }
                          ],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "button-scaabs-1758927807107",
                          "type": "button",
                          "properties": {
                            "text": "Редактировать",
                            "variant": "primary",
                            "size": "medium"
                          },
                          "style": {
                            "width": "100%",
                            "height": "42px",
                            "borderRadius": "12px",
                            "background": "#2563eb",
                            "color": "#ffffff",
                            "fontWeight": 600,
                            "border": "none"
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        }
                      ],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    },
                    {
                      "id": "column-isl1e2-1758927807107",
                      "type": "column",
                      "properties": {
                        "spacing": 12,
                        "padding": 20,
                        "alignItems": "flex-start",
                        "justifyContent": "flex-start",
                        "background": "#f8fafc"
                      },
                      "style": {
                        "flex": "1 1 0",
                        "minWidth": "220px",
                        "borderRadius": "18px",
                        "border": "1px solid rgba(148, 163, 184, 0.18)",
                        "boxShadow": "0 16px 28px rgba(15, 23, 42, 0.06)",
                        "background": "#f8fafc"
                      },
                      "children": [
                        {
                          "id": "text-huw9zl-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "Съёмный фаркоп",
                            "variant": "subheading",
                            "color": "#0f172a"
                          },
                          "style": {
                            "fontSize": "18px",
                            "fontWeight": 600
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "text-0hugn3-1758927807107",
                          "type": "text",
                          "properties": {
                            "content": "9 500 ₽",
                            "variant": "heading",
                            "color": "#111827"
                          },
                          "style": {
                            "fontSize": "20px",
                            "fontWeight": 600
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "row-pdegcp-1758927807107",
                          "type": "row",
                          "properties": {
                            "spacing": 8,
                            "padding": 0,
                            "alignItems": "center",
                            "justifyContent": "space-between",
                            "background": "transparent"
                          },
                          "style": {
                            "width": "100%",
                            "background": "transparent"
                          },
                          "children": [
                            {
                              "id": "text-j75onh-1758927807107",
                              "type": "text",
                              "properties": {
                                "color": "#1d4ed8"
                              },
                              "style": {
                                "fontWeight": 600
                              },
                              "children": [],
                              "position": {
                                "x": 0,
                                "y": 0
                              }
                            }
                          ],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        },
                        {
                          "id": "button-zvzjg2-1758927807107",
                          "type": "button",
                          "properties": {
                            "text": "Продолжить",
                            "variant": "primary",
                            "size": "medium"
                          },
                          "style": {
                            "width": "100%",
                            "height": "42px",
                            "borderRadius": "12px",
                            "background": "#2563eb",
                            "color": "#ffffff",
                            "fontWeight": 600,
                            "border": "none"
                          },
                          "children": [],
                          "position": {
                            "x": 0,
                            "y": 0
                          }
                        }
                      ],
                      "position": {
                        "x": 0,
                        "y": 0
                      }
                    }
                  ],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                }
              ],
              "position": {
                "x": 0,
                "y": 0
              }
            },
            {
              "id": "row-ypp07r-1758927807107",
              "type": "row",
              "properties": {
                "spacing": 12,
                "padding": 0,
                "alignItems": "center",
                "justifyContent": "flex-end",
                "background": "transparent"
              },
              "style": {
                "background": "transparent"
              },
              "children": [
                {
                  "id": "button-krym27-1758927807107",
                  "type": "button",
                  "properties": {
                    "text": "Сохранить как черновик",
                    "variant": "secondary",
                    "size": "medium"
                  },
                  "style": {
                    "height": "44px",
                    "padding": "0 22px",
                    "borderRadius": "12px",
                    "border": "1px solid rgba(148, 163, 184, 0.48)",
                    "background": "#ffffff",
                    "color": "#0f172a",
                    "fontWeight": 500
                  },
                  "children": [],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                },
                {
                  "id": "button-3yqrdr-1758927807107",
                  "type": "button",
                  "properties": {
                    "text": "Запланировать публикацию",
                    "variant": "primary",
                    "size": "medium"
                  },
                  "style": {
                    "height": "44px",
                    "padding": "0 28px",
                    "borderRadius": "12px",
                    "background": "#2563eb",
                    "color": "#ffffff",
                    "fontWeight": 600,
                    "boxShadow": "0 16px 32px rgba(37, 99, 235, 0.28)"
                  },
                  "children": [],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                }
              ],
              "position": {
                "x": 0,
                "y": 0
              }
            }
          ]
        },
        "bottomBar": {
          "id": "bottombar-h7u2wu-1758927807107",
          "type": "Section",
          "properties": {
            "slot": "bottomBar",
            "spacing": 12,
            "padding": 16,
            "alignItems": "stretch",
            "justifyContent": "flex-end",
            "background": "transparent"
          },
          "style": {
            "width": "100%",
            "borderTop": "1px solid rgba(148, 163, 184, 0.1)",
            "paddingTop": "12px",
            "background": "transparent"
          },
          "children": [
            {
              "id": "row-bse4xu-1758927807107",
              "type": "row",
              "properties": {
                "spacing": 16,
                "padding": 0,
                "alignItems": "center",
                "justifyContent": "space-between",
                "background": "transparent"
              },
              "style": {
                "width": "100%",
                "background": "transparent"
              },
              "children": [
                {
                  "id": "text-xpn76z-1758927807107",
                  "type": "text",
                  "properties": {
                    "content": "Согласуйте изменения с командой перед публикацией.",
                    "variant": "caption",
                    "color": "#475569"
                  },
                  "style": {
                    "fontSize": "14px"
                  },
                  "children": [],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                },
                {
                  "id": "button-kyrmqe-1758927807107",
                  "type": "button",
                  "properties": {
                    "text": "Сохранить",
                    "variant": "secondary",
                    "size": "medium"
                  },
                  "style": {
                    "height": "42px",
                    "padding": "0 20px",
                    "borderRadius": "12px",
                    "border": "1px solid rgba(148, 163, 184, 0.48)",
                    "background": "#ffffff",
                    "color": "#0f172a",
                    "fontWeight": 500
                  },
                  "children": [],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                },
                {
                  "id": "button-1hx4vg-1758927807107",
                  "type": "button",
                  "properties": {
                    "text": "Опубликовать всё",
                    "variant": "primary",
                    "size": "medium"
                  },
                  "style": {
                    "height": "42px",
                    "padding": "0 24px",
                    "borderRadius": "12px",
                    "background": "#10b981",
                    "color": "#ffffff",
                    "fontWeight": 600,
                    "boxShadow": "0 14px 24px rgba(16, 185, 129, 0.32)"
                  },
                  "children": [],
                  "position": {
                    "x": 0,
                    "y": 0
                  }
                }
              ],
              "position": {
                "x": 0,
                "y": 0
              }
            }
          ]
        }
      },
      "references": {}
    },
    'screen-success': {
      id: 'screen-success',
      name: 'Success',
      components: [
        {
          id: 'success-root',
          type: 'screen',
          children: ['success-wrapper'],
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100%',
            background: 'linear-gradient(180deg, rgba(187,247,208,0.32) 0%, rgba(220,252,231,1) 100%)'
          }
        },
        {
          id: 'success-wrapper',
          type: 'column',
          parentId: 'success-root',
          children: ['success-badge', 'success-title', 'success-description'],
          props: {
            spacing: 16,
            padding: 32
          },
          style: {
            background: '#ffffff',
            borderRadius: '32px',
            boxShadow: '0px 32px 80px rgba(22,101,52,0.18)',
            maxWidth: '440px',
            textAlign: 'center'
          }
        },
        {
          id: 'success-badge',
          type: 'text',
          parentId: 'success-wrapper',
          props: {
            variant: 'badge',
            content: {
              value: 'Оплата прошла'
            }
          },
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 16px',
            background: 'rgba(34,197,94,0.16)',
            color: '#15803d',
            borderRadius: '9999px',
            fontWeight: 600
          }
        },
        {
          id: 'success-title',
          type: 'text',
          parentId: 'success-wrapper',
          props: {
            variant: 'heading',
            content: {
              value: 'Чек отправлен клиенту'
            }
          },
          style: {
            fontSize: '32px',
            lineHeight: 1.1,
            color: '#166534'
          }
        },
        {
          id: 'success-description',
          type: 'text',
          parentId: 'success-wrapper',
          props: {
            variant: 'body',
            content: {
              value: 'Можно оформить новый заказ или перейти к апселлам.'
            }
          },
          style: {
            color: 'rgba(22,101,52,0.72)'
          }
        }
      ]
    },
    'screen-cancelled': {
      id: 'screen-cancelled',
      name: 'Cancelled',
      components: [
        {
          id: 'cancel-root',
          type: 'screen',
          children: ['cancel-wrapper'],
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100%',
            background: 'linear-gradient(180deg, rgba(254,226,226,0.32) 0%, rgba(254,242,242,1) 100%)'
          }
        },
        {
          id: 'cancel-wrapper',
          type: 'column',
          parentId: 'cancel-root',
          children: ['cancel-badge', 'cancel-title', 'cancel-description'],
          props: {
            spacing: 16,
            padding: 32
          },
          style: {
            background: '#ffffff',
            borderRadius: '32px',
            boxShadow: '0px 32px 80px rgba(127,29,29,0.18)',
            maxWidth: '440px',
            textAlign: 'center'
          }
        },
        {
          id: 'cancel-badge',
          type: 'text',
          parentId: 'cancel-wrapper',
          props: {
            variant: 'badge',
            content: {
              value: 'Оплата отменена'
            }
          },
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 16px',
            background: 'rgba(239,68,68,0.16)',
            color: '#b91c1c',
            borderRadius: '9999px',
            fontWeight: 600
          }
        },
        {
          id: 'cancel-title',
          type: 'text',
          parentId: 'cancel-wrapper',
          props: {
            variant: 'heading',
            content: {
              value: 'Клиент передумал'
            }
          },
          style: {
            fontSize: '32px',
            lineHeight: 1.1,
            color: '#991b1b'
          }
        },
        {
          id: 'cancel-description',
          type: 'text',
          parentId: 'cancel-wrapper',
          props: {
            variant: 'body',
            content: {
              value: 'Попробуйте предложить рассрочку или сопровождение менеджера.'
            }
          },
          style: {
            color: 'rgba(153,27,27,0.72)'
          }
        }
      ]
    }
  }
};

*/
