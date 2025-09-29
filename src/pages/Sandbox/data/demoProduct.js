export const demoProduct = {
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
      id: 'screen-checkout',
      name: 'Checkout',
      components: [
        {
          id: 'checkout-screen-root',
          type: 'screen',
          children: ['checkout-topbar', 'checkout-body', 'checkout-footer'],
          style: {
            minHeight: '100%',
            background: 'linear-gradient(180deg, rgba(226,232,240,0.48) 0%, rgba(241,245,249,1) 100%)',
            padding: '32px',
            boxSizing: 'border-box'
          }
        },
        {
          id: 'checkout-topbar',
          type: 'column',
          parentId: 'checkout-screen-root',
          children: ['checkout-title', 'checkout-status'],
          props: {
            spacing: 8,
            padding: 0
          },
          style: {
            borderBottom: '1px solid rgba(15,23,42,0.08)',
            paddingBottom: '16px'
          }
        },
        {
          id: 'checkout-title',
          type: 'text',
          parentId: 'checkout-topbar',
          props: {
            variant: 'heading',
            content: {
              reference: '${ui.screen.title}',
              value: 'Оформление заказа'
            }
          },
          style: {
            fontSize: '28px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--color-primary, #0f172a)'
          }
        },
        {
          id: 'checkout-status',
          type: 'text',
          parentId: 'checkout-topbar',
          props: {
            variant: 'caption',
            content: {
              reference: '${ui.notifications.lastAction}',
              value: 'Заказ ожидает оплаты'
            },
            color: {
              value: 'rgba(30, 64, 175, 0.9)'
            }
          },
          style: {
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }
        },
        {
          id: 'checkout-body',
          type: 'row',
          parentId: 'checkout-screen-root',
          children: ['checkout-summary-card', 'checkout-form-card'],
          props: {
            spacing: 24
          },
          style: {
            marginTop: '24px',
            alignItems: 'flex-start'
          }
        },
        {
          id: 'checkout-summary-card',
          type: 'column',
          parentId: 'checkout-body',
          children: ['checkout-summary-title', 'checkout-summary-list', 'checkout-total-row'],
          props: {
            spacing: 16,
            padding: 24
          },
          style: {
            flex: 1,
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0px 24px 64px rgba(15,23,42,0.08)'
          }
        },
        {
          id: 'checkout-summary-title',
          type: 'text',
          parentId: 'checkout-summary-card',
          props: {
            variant: 'subtitle',
            content: {
              value: 'Состав заказа'
            }
          },
          style: {
            fontWeight: 600
          }
        },
        {
          id: 'checkout-summary-list',
          type: 'list',
          parentId: 'checkout-summary-card',
            props: {
            variant: 'unordered',
            // When items are objects, use displayPath to choose which field to show
            displayPath: 'title',
            items: {
              reference: '${data.cart.items}',
              value: [
                {
                  title: 'Тариф «Премиум» — 9 990 ₽',
                  price: 9990,
                  priceFormatted: '9 990 ₽'
                }
              ]
            }
          },
          style: {
            paddingLeft: '20px',
            color: 'rgba(15,23,42,0.72)'
          }
        },
        {
          id: 'checkout-total-row',
          type: 'row',
          parentId: 'checkout-summary-card',
          children: ['checkout-total-label', 'checkout-total-value'],
          props: {
            spacing: 12
          },
          style: {
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        },
        {
          id: 'checkout-total-label',
          type: 'text',
          parentId: 'checkout-total-row',
          props: {
            variant: 'body',
            content: {
              value: 'Итого'
            }
          },
          style: {
            fontWeight: 600
          }
        },
        {
          id: 'checkout-total-value',
          type: 'text',
          parentId: 'checkout-total-row',
          props: {
            variant: 'heading',
            content: {
              reference: '${data.order.totalFormatted}',
              value: '12 990 ₽'
            }
          },
          style: {
            color: 'var(--color-accent, #2563eb)'
          }
        },
        {
          id: 'checkout-form-card',
          type: 'column',
          parentId: 'checkout-body',
          children: ['checkout-form-title', 'checkout-email-label', 'checkout-email-input', 'checkout-promo-label', 'checkout-promo-input'],
          props: {
            spacing: 12,
            padding: 24
          },
          style: {
            flex: 1,
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0px 24px 64px rgba(15,23,42,0.08)'
          }
        },
        {
          id: 'checkout-form-title',
          type: 'text',
          parentId: 'checkout-form-card',
          props: {
            variant: 'subtitle',
            content: {
              value: 'Информация клиента'
            }
          },
          style: {
            fontWeight: 600
          }
        },
        {
          id: 'checkout-email-label',
          type: 'text',
          parentId: 'checkout-form-card',
          props: {
            variant: 'caption',
            content: {
              value: 'Email для чека'
            }
          },
          style: {
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }
        },
        {
          id: 'checkout-email-input',
          type: 'input',
          parentId: 'checkout-form-card',
          props: {
            type: 'email',
            placeholder: {
              reference: '${data.user.email}',
              value: 'client@example.com'
            },
            required: true
          },
          style: {
            width: '100%'
          }
        },
        {
          id: 'checkout-promo-label',
          type: 'text',
          parentId: 'checkout-form-card',
          props: {
            variant: 'caption',
            content: {
              value: 'Промокод'
            }
          },
          style: {
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }
        },
        {
          id: 'checkout-promo-input',
          type: 'input',
          parentId: 'checkout-form-card',
          props: {
            placeholder: {
              reference: '${ui.form.promoPlaceholder}',
              value: 'Введите промокод'
            }
          },
          style: {
            width: '100%'
          }
        },
        {
          id: 'checkout-footer',
          type: 'row',
          parentId: 'checkout-screen-root',
          children: ['checkout-cancel-button', 'checkout-submit-button'],
          props: {
            spacing: 12,
            padding: 24
          },
          style: {
            marginTop: '32px',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0px 24px 64px rgba(15,23,42,0.08)',
            justifyContent: 'space-between'
          }
        },
        {
          id: 'checkout-cancel-button',
          type: 'button',
          parentId: 'checkout-footer',
          props: {
            variant: 'secondary',
            size: 'large',
            text: {
              reference: '${ui.actions.cancel}',
              value: 'Отменить'
            }
          }
        },
        {
          id: 'checkout-submit-button',
          type: 'button',
          parentId: 'checkout-footer',
          props: {
            variant: 'primary',
            size: 'large',
            text: {
              reference: '${ui.actions.submit}',
              value: 'Оплатить заказ'
            }
          }
        }
      ]
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
