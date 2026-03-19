// ChatView извлечён из App.jsx (строки 2359–2646)
// Импорты добавлены вручную
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useActions, useChat, useUsers } from '../store/AppStore.jsx';
import { ROLE_LABELS } from '../constants/index.js';
import { fmtTime, genId } from '../utils.js';
import { AvatarCircle } from '../ui/AvatarCircle.jsx';
import { PhotoLightbox } from '../ui/PhotoLightbox.jsx';
import { toast } from '../ui/Toasts.jsx';

import { FB_MODE, sendMessage as fbSendMessage } from '../services/firebaseService';



export function ChatView({user}){
  const{chat,chatLastSeen}=useChat();
  const{sendMessage,markChatSeen,updateMessage,deleteMessage}=useActions();
  const{users}=useUsers();
  const[text,setText]=useState("");
  const[photoSending,setPhotoSending]=useState(false);
  const[lightbox,setLightbox]=useState(null);
  const[replyTo,setReplyTo]=useState(null);
  const[msgMenu,setMsgMenu]=useState(null);
  const[editingMsg,setEditingMsg]=useState(null);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);
  const fileRef=useRef(null);
  const swipeRef=useRef({});
  const longPressRef=useRef(null);

  useEffect(()=>bottomRef.current&&bottomRef.current.scrollIntoView({behavior:"smooth"}),[chat]);
  useEffect(()=>{
    markChatSeen(user.uid);
    return()=>{markChatSeen(user.uid);};
  },[user.uid,markChatSeen]);
  useEffect(()=>{
    if(!msgMenu) return;
    const close=()=>{setMsgMenu(null);};
    document.addEventListener("click",close);
    return()=>document.removeEventListener("click",close);
  },[msgMenu]);

  const REACTIONS=["👍","❤️","😂","😮","👎"];

  // Статус прочтения
  const otherUids=Object.keys(users).filter(uid=>uid!==user.uid);
  const getReadStatus=(msg)=>{
    if(msg.uid!==user.uid) return null;
    const msgTime=new Date(msg.at).getTime();
    if(otherUids.length===0) return "sent";
    return otherUids.every(uid=>(chatLastSeen[uid]||0)>=msgTime)?"read":"sent";
  };
  const CheckIcon=({status})=>{
    if(!status) return null;
    const cls=status==="read"?"msg-check-read":"msg-check-sent";
    if(status==="sent") return(
      <span className={"msg-checks "+cls} aria-label="Отправлено">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
    return(
      <span className={"msg-checks "+cls} aria-label="Прочитано">
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 5L8.5 8.5L15 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  };

  // Разделители дат
  const fmtDateSep=(date)=>{
    const d=new Date(date);
    const now=new Date();
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const yesterday=new Date(today-86400000);
    const msgDay=new Date(d.getFullYear(),d.getMonth(),d.getDate());
    if(msgDay.getTime()===today.getTime()) return "Сегодня";
    if(msgDay.getTime()===yesterday.getTime()) return "Вчера";
    const sameYear=d.getFullYear()===now.getFullYear();
    return d.toLocaleDateString("ru-RU",sameYear?{day:"numeric",month:"long"}:{day:"numeric",month:"long",year:"numeric"});
  };
  const getDayKey=date=>new Date(date).toDateString();

  // Реакции
  const toggleReaction=(msgId,emoji)=>{
    const msg=chat.find(m=>m.id===msgId);
    if(!msg) return;
    const prev=msg.reactions||{};
    const uids=prev[emoji]||[];
    const already=uids.includes(user.uid);
    const newUids=already?uids.filter(u=>u!==user.uid):[...uids,user.uid];
    const nr={...prev,[emoji]:newUids};
    Object.keys(nr).forEach(k=>{if(!nr[k].length)delete nr[k];});
    updateMessage(msgId,{reactions:nr});
  };

  // Сохранение редактирования
  const saveEdit=(id,newText)=>{
    if(!newText.trim()) return;
    updateMessage(id,{text:newText.trim(),edited:true});
    setEditingMsg(null);
  };

  // Ответ на сообщение
  const startReply=(m)=>{
    setReplyTo({id:m.id,name:m.uid===user.uid?"Вы":(m.role==="security"||m.role==="concierge"?ROLE_LABELS[m.role]:m.name),text:m.text||(m.photo?"Фото":""),photo:m.photo||null});
    inputRef.current&&setTimeout(()=>inputRef.current.focus(),50);
  };

  // Свайп для ответа
  const onTouchStart=(e,m)=>{
    const t=e.touches[0];
    swipeRef.current={startX:t.clientX,startY:t.clientY,msgId:m.id,el:e.currentTarget,triggered:false};
  };
  const onTouchMove=(e,m)=>{
    const s=swipeRef.current;
    if(!s.startX||s.msgId!==m.id) return;
    const dx=e.touches[0].clientX-s.startX;
    const dy=Math.abs(e.touches[0].clientY-s.startY);
    if(dy>20){swipeRef.current={};return;}
    if(dx>0&&dx<72){
      s.el.style.transform="translateX("+Math.min(dx*0.6,40)+"px)";
      s.el.classList.add("swiping");
    }
    if(dx>55&&!s.triggered){
      s.triggered=true;
      startReply(m);
      if(navigator.vibrate) navigator.vibrate(30);
    }
  };
  const onTouchEnd=()=>{
    const s=swipeRef.current;
    if(s.el){s.el.style.transform="";s.el.classList.remove("swiping");}
    swipeRef.current={};
  };

  // Long press (мобиль) — открывает меню действий
  const onLongPressStart=(e,msgId)=>{
    longPressRef.current=setTimeout(()=>{
      setMsgMenu(p=>p===msgId?null:msgId);
      if(navigator.vibrate) navigator.vibrate(40);
    },500);
  };
  const onLongPressEnd=()=>clearTimeout(longPressRef.current);

  // Отправка
  const send=useCallback(()=>{
    if(!text.trim())return;
    const m={id:genId("m"),uid:user.uid,name:user.name,role:user.role,text:text.trim(),photo:null,replyTo:replyTo||null,at:new Date()};
    if(FB_MODE==="live"){fbSendMessage({uid:user.uid,name:user.name,role:user.role,text:text.trim()}).catch(e=>console.warn(e));}
    sendMessage(m);setText("");setReplyTo(null);inputRef.current&&inputRef.current.focus();
  },[text,user,sendMessage,replyTo]);

  const onPhotoClick=()=>fileRef.current&&fileRef.current.click();
  const onFileChange=async e=>{
    const f=e.target.files[0];
    if(!f)return;
    e.target.value="";
    if(f.size>10*1024*1024){toast("Фото слишком большое (макс. 10 МБ)","error");return;}
    setPhotoSending(true);
    try{
      const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=ev=>res(ev.target.result);r.onerror=()=>rej(new Error("fail"));r.readAsDataURL(f);});
      const compressed=await new Promise(resolve=>{
        const img=new Image();
        img.onload=()=>{const max=800;const ratio=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement("canvas");canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",0.72));};
        img.onerror=()=>resolve(dataUrl);img.src=dataUrl;
      });
      const m={id:genId("m"),uid:user.uid,name:user.name,role:user.role,text:"",photo:compressed,at:new Date()};
      sendMessage(m);
    }catch(err){toast("Не удалось загрузить фото","error");}
    finally{setPhotoSending(false);}
  };

  // Авто-ссылки в тексте
  const linkify = (text) => {
    const urlRx = /(https?:\/\/[^\s<]+)/g;
    const parts = text.split(urlRx);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      /^https?:\/\//.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="msg-link">{part}</a>
        : part
    );
  };

  return(
    <div className="chat-wrap">
      <div className="chat-msgs">
        {chat.length===0&&<div style={{textAlign:"center",color:"var(--t3)",padding:"40px 20px",fontSize:13}}>Начните переписку</div>}
        {chat.map((m,i)=>{
          const readStatus=getReadStatus(m);
          const showSep=!chat[i-1]||getDayKey(m.at)!==getDayKey(chat[i-1].at);
          const quotedMsg=m.replyTo?chat.find(x=>x.id===m.replyTo.id)||m.replyTo:null;
          const prev=chat[i-1];
          const isGrouped=prev && !showSep && prev.uid===m.uid && (new Date(m.at)-new Date(prev.at))<300000;
          return(
            <React.Fragment key={m.id}>
              {showSep&&<div className="msg-date-sep"><span>{fmtDateSep(m.at)}</span></div>}
              <div
                className={"msg-row "+(m.uid===user.uid?"mine":"")+(isGrouped?" grouped":"")}
                style={{position:"relative"}}
                onTouchStart={e=>{onTouchStart(e,m);onLongPressStart(e,m.id);}}
                onTouchMove={e=>{onTouchMove(e,m);onLongPressEnd();}}
                onTouchEnd={e=>{onTouchEnd(e);onLongPressEnd();}}
                onDoubleClick={()=>startReply(m)}
              >
                {msgMenu===m.id&&(<>
                  <div className="msg-menu-backdrop" onClick={()=>setMsgMenu(null)}/>
                  <div className="msg-menu-popup" onClick={e=>e.stopPropagation()}>
                    <button className="msg-menu-item" onClick={()=>{startReply(m);setMsgMenu(null);}}>↩ Ответить</button>
                    {m.uid===user.uid&&!m.photo&&<button className="msg-menu-item" onClick={()=>{setEditingMsg({id:m.id,text:m.text});setMsgMenu(null);}}>✏️ Редактировать</button>}
                    {m.uid===user.uid&&<button className="msg-menu-item danger" onClick={()=>{deleteMessage(m.id);setMsgMenu(null);}}>🗑 Удалить</button>}
                    <div className="msg-menu-reactions">
                      {REACTIONS.map(emoji=>(
                        <button key={emoji} className="reaction-picker-btn" onClick={()=>{toggleReaction(m.id,emoji);setMsgMenu(null);}}>{emoji}</button>
                      ))}
                    </div>
                  </div>
                </>)}
                {m.uid!==user.uid&&!isGrouped&&<div className="msg-av" style={{flexShrink:0,overflow:"hidden",padding:0}}>
                    <AvatarCircle avData={(users[m.uid]&&users[m.uid].avatar)||null} role={m.role} name={m.name||"?"} size={28} fontSize={11}/>
                  </div>}
                {m.uid!==user.uid&&isGrouped&&<div className="msg-av-spacer"/>}
                <div>
                  <div className={"msg-bubble "+(m.uid===user.uid?"mine":"theirs")} data-msg-id={m.id}>
                    {m.uid!==user.uid&&!isGrouped&&<div className="msg-sender">{(m.role==="security"||m.role==="concierge")?ROLE_LABELS[m.role]:m.name}</div>}
                    {quotedMsg&&(
                      <div className="msg-reply-quote" onClick={()=>{
                        const el=document.querySelector('[data-msg-id="'+quotedMsg.id+'"]');
                        if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("msg-highlight");setTimeout(()=>el.classList.remove("msg-highlight"),1200);}
                      }}>
                        <div className="msg-reply-quote-name">{quotedMsg.name||(m.replyTo&&m.replyTo.name)}</div>
                        <div className="msg-reply-quote-text">{quotedMsg.photo?"📷 Фото":quotedMsg.text||(m.replyTo&&m.replyTo.text)}</div>
                      </div>
                    )}
                    {m.photo&&<img src={m.photo} className="msg-photo" alt="фото" onClick={()=>setLightbox(m.photo)}/>}
                    {m.text&&<div className="msg-text">{linkify(m.text)}</div>}
                    <div className="msg-time">
                      <span>{fmtTime(m.at)}</span>
                      {m.edited&&<span className="msg-edited-mark">изменено</span>}
                      <CheckIcon status={readStatus}/>
                    </div>
                    <button className="msg-ctx-btn" onClick={e=>{e.stopPropagation();setMsgMenu(p=>p===m.id?null:m.id);}} aria-label="Меню">⋯</button>
                  </div>
                  {editingMsg&&editingMsg.id===m.id&&(
                    <div className="msg-edit-wrap">
                      <textarea className="msg-edit-inp" rows={2} value={editingMsg.text}
                        onChange={e=>setEditingMsg({id:editingMsg.id,text:e.target.value})}
                        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();saveEdit(m.id,editingMsg.text);}if(e.key==="Escape"){setEditingMsg(null);}}}
                        autoFocus/>
                      <div className="msg-edit-hint"><span><kbd>Enter</kbd> сохранить</span><span><kbd>Esc</kbd> отменить</span></div>
                    </div>
                  )}
                  {m.reactions&&Object.keys(m.reactions).length>0&&(
                    <div className="msg-reactions">
                      {Object.entries(m.reactions).map(([emoji,uids])=>uids.length>0&&(
                        <button key={emoji} className={"reaction-badge"+(uids.includes(user.uid)?" mine":"")} onClick={()=>toggleReaction(m.id,emoji)} title={uids.length+" чел."}>
                          <span>{emoji}</span><span className="reaction-count">{uids.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      {replyTo&&(
        <div className="chat-reply-bar">
          <div className="chat-reply-bar-line"/>
          <div className="chat-reply-bar-body">
            <div className="chat-reply-bar-name">{replyTo.name}</div>
            <div className="chat-reply-bar-text">{replyTo.photo?"📷 Фото":replyTo.text}</div>
          </div>
          <button className="chat-reply-close" onClick={()=>setReplyTo(null)} aria-label="Отменить ответ">✕</button>
        </div>
      )}
      <div className="chat-bar">
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onFileChange}/>
        <button className="chat-photo-btn" onClick={onPhotoClick} disabled={photoSending} aria-label="Прикрепить фото">{photoSending?"⏳":"📎"}</button>
        <textarea ref={inputRef} className="chat-inp" rows={1}
          placeholder="Напишите сообщение..." value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}}
        />
        <button className="chat-send" onClick={send} disabled={!text.trim()} aria-label="Отправить сообщение">→</button>
      </div>
      {lightbox&&<PhotoLightbox src={lightbox} onClose={()=>setLightbox(null)}/>}
    </div>
  );
}
