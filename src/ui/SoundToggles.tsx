// 배경음·효과음 켜고 끄기
import { useEffect, useState } from 'react';
import { onSoundChange, play, setSound, soundSettings } from './sound';

export function SoundToggles() {
  const [s, setS] = useState(soundSettings);
  useEffect(() => onSoundChange(() => setS(soundSettings())), []);
  return (
    <div className="sound-toggles">
      <button className={`btn ${s.bgm ? 'hong' : ''}`} aria-pressed={s.bgm} onClick={() => setSound({ bgm: !s.bgm })}>
        배경음 {s.bgm ? '켜짐' : '꺼짐'}
      </button>
      <button
        className={`btn ${s.sfx ? 'hong' : ''}`}
        aria-pressed={s.sfx}
        onClick={() => {
          setSound({ sfx: !s.sfx });
          if (!s.sfx) setTimeout(() => play('chime'), 50);
        }}
      >
        효과음 {s.sfx ? '켜짐' : '꺼짐'}
      </button>
    </div>
  );
}
