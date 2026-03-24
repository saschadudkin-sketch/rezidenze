import { useEffect, useRef } from 'react';
import { canManageRequests } from '../../constants/requestPredicates';
import { ROLES, isStaff } from '../../domain/permissions';
import { sendNotif, playAlert } from '../../utils';
import {
  FB_MODE,
  subscribeRequests,
  subscribeChat,
  fetchAllUsers,
  fetchPerms,
  fetchTemplates,
} from '../../services/firebaseService';

function notifyPendingPasses(nextCount, prevRef, userRole) {
  if (nextCount > prevRef.current && userRole === ROLES.SECURITY) {
    sendNotif('Новый пропуск', 'Требует рассмотрения', 'pass');
    playAlert('pass');
  }
  prevRef.current = nextCount;
}

function notifyPendingTech(nextCount, prevRef, userRole) {
  if (nextCount > prevRef.current && canManageRequests(userRole)) {
    sendNotif('Техзаявка', 'Новая заявка в техслужбу', 'tech');
    playAlert('tech');
  }
  prevRef.current = nextCount;
}

function notifyNewChatMessages(messages, prevRef, currentUid) {
  if (messages.length > prevRef.current) {
    const last = messages[messages.length - 1];
    if (last && last.uid !== currentUid) {
      sendNotif('Сообщение от ' + last.name, (last.text || '').slice(0, 60), 'chat');
    }
  }
  prevRef.current = messages.length;
}

export function useDashboardRuntime({
  user,
  requests,
  chat,
  unreadMsgs,
  pendingP,
  pendingT,
  actions,
}) {
  const {
    activateScheduled,
    setAllRequests,
    setAllMessages,
    setAllUsers,
    setPerms,
    setTemplates,
  } = actions;

  const prevPendingT = useRef(pendingT);
  const prevPendingP = useRef(pendingP);
  const prevMsgs = useRef(chat.length);
  const requestsRef = useRef(requests);
  const notifTimer = useRef(null);
  const prevArrivedIds = useRef(new Set(
    requests.filter(r => r.arrivedAt).map(r => r.id)
  ));

  requestsRef.current = requests;

  useEffect(() => {
    activateScheduled();
    const id = setInterval(() => {
      if (requestsRef.current.some(r => r.status === 'scheduled')) activateScheduled();
    }, 30000);
    return () => clearInterval(id);
  }, [activateScheduled]);

  useEffect(() => {
    const total = canManageRequests(user.role) ? pendingT + pendingP : unreadMsgs;
    if ('setAppBadge' in navigator) {
      if (total > 0) navigator.setAppBadge(total).catch(() => {});
      else navigator.clearAppBadge().catch(() => {});
    }
  }, [pendingP, pendingT, unreadMsgs, user.role]);

  useEffect(() => {
    if (FB_MODE === 'live') return undefined;
    clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => {
      notifyPendingPasses(pendingP, prevPendingP, user.role);
      notifyPendingTech(pendingT, prevPendingT, user.role);
      notifyNewChatMessages(chat, prevMsgs, user.uid);
    }, 300);
    return () => clearTimeout(notifTimer.current);
  }, [pendingP, pendingT, chat, user.role, user.uid]);

  useEffect(() => {
    if (isStaff(user.role)) return;
    const arrivedNow = requests.filter(r => r.arrivedAt && r.createdByUid === user.uid);
    for (const request of arrivedNow) {
      if (!prevArrivedIds.current.has(request.id)) {
        prevArrivedIds.current.add(request.id);
        const who = request.visitorName || request.category;
        sendNotif('Гость на территории', who + ' — вход отмечен', 'arrival');
        playAlert('pass');
      }
    }
  }, [requests, user.uid, user.role]);

  useEffect(() => {
    if (FB_MODE !== 'live') return undefined;

    const unsubReqs = subscribeRequests((docs) => {
      const newPendingPasses = docs.filter(r => r.type === 'pass' && r.status === 'pending').length;
      const newPendingTech = docs.filter(r => r.type === 'tech' && r.status === 'pending').length;

      notifyPendingPasses(newPendingPasses, prevPendingP, user.role);
      notifyPendingTech(newPendingTech, prevPendingT, user.role);
      setAllRequests(docs);
    });

    const unsubChat = subscribeChat((docs) => {
      notifyNewChatMessages(docs, prevMsgs, user.uid);
      setAllMessages(docs);
    });

    fetchAllUsers().then((users) => {
      if (users.length) setAllUsers(users);
    }).catch(() => {});
    fetchPerms(user.uid).then(perms => setPerms(user.uid, perms)).catch(() => {});
    fetchTemplates(user.uid).then(items => setTemplates(user.uid, items)).catch(() => {});

    return () => {
      unsubReqs();
      unsubChat();
    };
  }, [user.role, user.uid, setAllRequests, setAllMessages, setAllUsers, setPerms, setTemplates]);
}
