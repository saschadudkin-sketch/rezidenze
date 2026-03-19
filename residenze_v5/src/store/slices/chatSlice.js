// ─── Начальные данные ────────────────────────────────────────────────────────

export const INITIAL_CHAT = [
  { id: 'm1', uid: 'u1', name: 'Михаил Волков', role: 'owner',     text: 'Добрый день! Когда уборка паркинга?',                          at: new Date(Date.now() - 3_600_000) },
  { id: 'm2', uid: 'u4', name: 'Елена Петрова', role: 'concierge', text: 'Добрый день! Уборка запланирована на завтра с 10:00 до 14:00.', at: new Date(Date.now() - 3_400_000) },
];

export const INITIAL_CHAT_LAST_SEEN = {};

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function chatReducer(state, action) {
  switch (action.type) {

    case 'CHAT_SEND':
      return { ...state, chat: [...state.chat, action.message] };

    case 'CHAT_SET_ALL':
      return { ...state, chat: action.messages };

    case 'CHAT_UPDATE_MESSAGE':
      return {
        ...state,
        chat: state.chat.map(m =>
          m.id === action.id ? { ...m, ...action.patch } : m
        ),
      };

    case 'CHAT_DELETE_MESSAGE':
      return {
        ...state,
        chat: state.chat.filter(m => m.id !== action.id),
      };

    case 'CHAT_MARK_SEEN':
      return {
        ...state,
        chatLastSeen: { ...state.chatLastSeen, [action.uid]: Date.now() },
      };

    default:
      return state;
  }
}
