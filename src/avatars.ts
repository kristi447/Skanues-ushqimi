// Every image dropped into src/assets/avatars is picked up automatically.
// Prefix files with a number to control the order: 06-name.jpg, 07-name.png ...
// Square images on a black background look best (256x256 is plenty).
const files = import.meta.glob<string>('./assets/avatars/*.{png,jpg,jpeg,webp,gif,svg}', {
  eager: true,
  import: 'default',
});

export interface AvatarDef {
  id: string;
  label: string;
  src: string;
}

export const avatars: AvatarDef[] = Object.keys(files)
  .sort()
  .map((path) => {
    const id = path
      .split('/')
      .pop()!
      .replace(/\.[^.]+$/, '');
    const label = id.replace(/^\d+[-_]?/, '').replace(/[-_]/g, ' ');
    return { id, label, src: files[path] };
  });

export function avatarById(id: string | undefined): AvatarDef | undefined {
  return avatars.find((a) => a.id === id);
}
