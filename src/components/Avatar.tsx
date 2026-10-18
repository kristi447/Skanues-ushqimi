import { avatarById } from '../avatars';

export function Avatar({ id, size = 28, label }: { id: string; size?: number; label?: string }) {
  const a = avatarById(id);
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {a ? <img src={a.src} alt={label ?? a.label} draggable={false} /> : <span className="avatar__none">?</span>}
    </span>
  );
}
