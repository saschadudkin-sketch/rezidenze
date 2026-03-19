// ─── Начальные данные ────────────────────────────────────────────────────────

export const INITIAL_REQUESTS = [
  { id: 'r1', type: 'pass',  category: 'guest',       createdByUid: 'u1', createdByRole: 'owner',      createdByName: 'Михаил Волков', createdByApt: '12', visitorName: 'Дмитрий Орлов',   visitorPhone: '+7 916 777-88-99', comment: 'Гость на обед около 14:00',       photo: null, priority: 'normal', passDuration: 'once',      validUntil: null, status: 'pending',  createdAt: new Date(Date.now() - 3_600_000),  arrivedAt: null },
  { id: 'r2', type: 'pass',  category: 'courier',     createdByUid: 'u2', createdByRole: 'tenant',     createdByName: 'Анна Соколова', createdByApt: '34', visitorName: 'СДЭК',             visitorPhone: null,               comment: '',                                photo: null, priority: 'normal', passDuration: 'once',      validUntil: null, status: 'approved', createdAt: new Date(Date.now() - 7_200_000),  arrivedAt: null },
  { id: 'r3', type: 'tech',  category: 'electrician', createdByUid: 'u1', createdByRole: 'owner',      createdByName: 'Михаил Волков', createdByApt: '12', visitorName: null,               visitorPhone: null,               comment: 'Не работает розетка в гостиной',  photo: null, priority: 'normal', passDuration: null,        validUntil: null, status: 'pending',  createdAt: new Date(Date.now() - 1_800_000),  arrivedAt: null },
  { id: 'r4', type: 'pass',  category: 'taxi',        createdByUid: 'u2', createdByRole: 'tenant',     createdByName: 'Анна Соколова', createdByApt: '34', visitorName: 'Яндекс.Такси',    visitorPhone: null,               comment: '',                                photo: null, priority: 'low',    passDuration: 'once',      validUntil: null, status: 'rejected', createdAt: new Date(Date.now() - 86_400_000), arrivedAt: null },
  { id: 'r5', type: 'pass',  category: 'worker',      createdByUid: 'u3', createdByRole: 'contractor', createdByName: 'Строй Групп',   createdByApt: '—',  visitorName: 'Бригада (3 чел.)', visitorPhone: '+7 903 111-22-33', comment: 'Работы в апартаментах 45',        photo: null, priority: 'normal', passDuration: 'temporary', validUntil: new Date(Date.now() + 7 * 86_400_000), status: 'pending',  createdAt: new Date(Date.now() - 900_000),    arrivedAt: null },
  { id: 'r6', type: 'tech',  category: 'plumber',     createdByUid: 'u2', createdByRole: 'tenant',     createdByName: 'Анна Соколова', createdByApt: '34', visitorName: null,               visitorPhone: null,               comment: 'Течёт кран на кухне',             photo: null, priority: 'urgent', passDuration: null,        validUntil: null, status: 'accepted', createdAt: new Date(Date.now() - 43_200_000), arrivedAt: null },
];

export const INITIAL_HISTORY = {};

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function requestsReducer(state, action) {
  switch (action.type) {

    case 'REQUEST_ADD':
      return { ...state, requests: [action.request, ...state.requests] };

    case 'REQUEST_UPDATE':
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === action.id ? { ...r, ...action.patch } : r
        ),
      };

    case 'REQUEST_DELETE':
      return { ...state, requests: state.requests.filter(r => r.id !== action.id) };

    case 'REQUEST_SET_STATUS':
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === action.id ? { ...r, status: action.status } : r
        ),
      };

    case 'REQUEST_ARRIVE': {
      const now = action.arrivedAt || new Date();
      return {
        ...state,
        requests: state.requests.map(r => {
          if (r.id !== action.id) return r;
          // Постоянный или временный пропуск — остаётся approved после входа
          if (r.passDuration === 'permanent' || r.passDuration === 'temporary') {
            return { ...r, arrivedAt: now };
          }
          // Разовый (или без типа) — стандартное поведение: arrived
          return { ...r, status: 'arrived', arrivedAt: now };
        }),
      };
    }

    case 'REQUESTS_SET_ALL':
      return { ...state, requests: action.requests };

    case 'REQUEST_ACTIVATE_SCHEDULED': {
      const now = new Date();
      return {
        ...state,
        requests: state.requests.map(r => {
          // Активация запланированных
          if (r.status === 'scheduled' && r.scheduledFor && new Date(r.scheduledFor) <= now) {
            return { ...r, status: 'pending', scheduledFor: null };
          }
          // Истечение временных пропусков
          if (r.passDuration === 'temporary' && r.validUntil && new Date(r.validUntil) <= now
              && r.status !== 'rejected' && r.status !== 'arrived' && r.status !== 'expired') {
            return { ...r, status: 'expired' };
          }
          return r;
        }),
      };
    }

    case 'HISTORY_ADD': {
      const existing = state.history[action.reqId] || [];
      return {
        ...state,
        history: {
          ...state.history,
          [action.reqId]: [
            ...existing,
            { at: action.at || new Date(), byName: action.byName, byRole: action.byRole, action: action.label },
          ],
        },
      };
    }

    default:
      return state;
  }
}
