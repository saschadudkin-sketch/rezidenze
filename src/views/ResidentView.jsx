import { useState, useMemo } from 'react';
import { useActions, useRequests } from '../store/AppStore.jsx';
import { GroupedReqList } from '../requests/ReqCard.jsx';
import { CreateModal } from '../requests/CreateModal.jsx';
import { EditRequestModal } from '../requests/EditRequestModal.jsx';
import { PermsList, MyTemplates } from '../perms/PermsList.jsx';
import { ChatView } from '../chat/ChatView.jsx';
import { toast } from '../ui/Toasts.jsx';
import { can } from '../domain/permissions';

export default function ResidentView({ user, activeTab, setActiveTab }) {
  const requests = useRequests();
  const { deleteRequest } = useActions();
  const [modal,    setModal]    = useState(null);
  const [editReq,  setEditReq]  = useState(null);
  const [passFilter, setPassFilter] = useState('all');

  const onEdit   = r => { if (can(user).editRequest(r)) setEditReq(r); };
  const onDelete = async id => {
    deleteRequest(id);
    toast('Заявка удалена', 'success');
  };

  const myPasses = useMemo(() => requests.filter(r => r.createdByUid === user.uid && r.type === 'pass'), [requests, user.uid]);
  const myTech   = useMemo(() => requests.filter(r => r.createdByUid === user.uid && r.type === 'tech'), [requests, user.uid]);

  const filteredPasses = useMemo(() => {
    if (passFilter === 'all') return myPasses;
    return myPasses.filter(r => (r.passDuration || 'once') === passFilter);
  }, [myPasses, passFilter]);

  const tempCount = useMemo(() => myPasses.filter(r => r.passDuration === 'temporary').length, [myPasses]);
  const permCount = useMemo(() => myPasses.filter(r => r.passDuration === 'permanent').length, [myPasses]);

  const passIcons = user.role === 'contractor'
    ? [['worker','👷','Рабочий'],['team','👷','Бригада'],['delivery','🚚','Доставка'],['car','🚗','Авто']]
    : [['guest','👤','Гость'],['courier','📦','Курьер'],['taxi','🚕','Такси'],['car','🚗','Авто'],['master','🔨','Мастер']];

  return (
    <>
      {activeTab === 'passes' && (
        <>
          <div className="type-grid">
            {passIcons.map(([k, i, l]) => (
              <div key={k} className="type-card" role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && e.currentTarget.click()} onClick={() => setModal({ type: 'pass', cat: k })}>
                <div className="type-icon">{i}</div>
                <div className="type-label">{l}</div>
              </div>
            ))}
            <div className="type-card" role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && e.currentTarget.click()} onClick={() => setActiveTab('templates')}
              style={{ borderColor: activeTab === 'templates' ? 'var(--g2)' : 'var(--b1)' }}>
              <div className="type-icon">📑</div>
              <div className="type-label">Шаблоны</div>
            </div>
          </div>
          {myPasses.length > 0 && (
            <div className="pass-filter-pills">
              {[['all', 'Все', myPasses.length], ['temporary', '📅 Временные', tempCount], ['permanent', '♾ Постоянные', permCount], ['once', 'Разовые', myPasses.length - tempCount - permCount]].map(([k, l, c]) => (
                c > 0 || k === 'all' ? <button key={k} className={'date-pill' + (passFilter === k ? ' active' : '')} onClick={() => setPassFilter(k)}>{l}{c > 0 && k !== 'all' ? ` (${c})` : ''}</button> : null
              ))}
            </div>
          )}
          {filteredPasses.length === 0 && myPasses.length === 0
            ? <div className="empty"><div style={{ fontSize: 36, marginBottom: 12, opacity: .15 }}>🎫</div><div className="empty-title">Пропусков пока нет</div><div className="empty-sub">Нажмите на категорию выше, чтобы создать первый пропуск</div></div>
            : filteredPasses.length === 0
              ? <div className="empty"><div className="empty-title">Нет пропусков в этой категории</div></div>
              : <GroupedReqList
                  reqs={filteredPasses} userRole={user.role} userName={user.name}
                  onRepeat={r => setModal({ type: r.type, cat: r.category, data: {
                    visitorName: r.visitorName, visitorPhone: r.visitorPhone,
                    carPlate: r.carPlate, comment: r.comment,
                  } })}
                  onEdit={onEdit} onDelete={onDelete}
                />
          }
        </>
      )}

      {activeTab === 'tech' && (
        <>
          <div className="type-grid">
            {[['electrician','⚡','Электрик'],['plumber','🔧','Сантехник']].map(([k, i, l]) => (
              <div key={k} className="type-card" role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && e.currentTarget.click()} onClick={() => setModal({ type: 'tech', cat: k })}>
                <div className="type-icon">{i}</div>
                <div className="type-label">{l}</div>
              </div>
            ))}
            <div className="type-card" role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && e.currentTarget.click()} onClick={() => setActiveTab('templates')}
              style={{ borderColor: activeTab === 'templates' ? 'var(--g2)' : 'var(--b1)' }}>
              <div className="type-icon">📑</div>
              <div className="type-label">Шаблоны</div>
            </div>
          </div>
          {myTech.length === 0
            ? <div className="empty"><div style={{ fontSize: 36, marginBottom: 12, opacity: .15 }}>🔧</div><div className="empty-title">Заявок нет</div><div className="empty-sub">Нажмите на категорию выше, чтобы вызвать техслужбу</div></div>
            : <GroupedReqList
                reqs={myTech} userRole={user.role} userName={user.name}
                onRepeat={r => setModal({ type: r.type, cat: r.category, data: {
                  comment: r.comment,
                } })}
                onEdit={onEdit} onDelete={onDelete}
              />
          }
        </>
      )}

      {activeTab === 'perms'     && <PermsList user={user} />}
      {activeTab === 'templates' && (<>
        <button className="btn-outline" style={{ marginBottom: 16 }} onClick={() => setActiveTab('passes')}>
          ← Назад к пропускам
        </button>
        <MyTemplates user={user} onUse={t => {
          setActiveTab(t.type === 'tech' ? 'tech' : 'passes');
          setModal({ type: t.type, cat: t.category, data: {
            visitorName: t.visitorName, visitorPhone: t.visitorPhone,
            carPlate: t.carPlate, comment: t.comment,
          } });
        }} />
      </>)}
      {activeTab === 'chat'      && <ChatView user={user} />}

      {modal    && <CreateModal key={Date.now() + '_' + modal.cat} user={user} type={modal.type} initialCat={modal.cat} initialData={modal.data} onClose={() => setModal(null)} onDone={() => {}} />}
      {editReq  && <EditRequestModal req={editReq} onClose={() => setEditReq(null)} onDone={() => {}} />}
    </>
  );
}
