import { ROLE_COLOR } from '../constants';

export function AvatarCircle({ avData, role, name, size, fontSize }) {
  const bg        = ROLE_COLOR[role] || 'var(--g-bg)';
  const textColor = role ? '#fff' : 'var(--g2)';
  const base = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  if (avData && avData.type === 'photo' && avData.src)
    return <div style={base}><img src={avData.src} alt="" className="u-cover" /></div>;

  return (
    <div style={{ ...base, background: bg, fontFamily: "'Playfair Display',serif", fontSize, color: textColor }}>
      {name.charAt(0)}
    </div>
  );
}
