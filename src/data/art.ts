import type { YokaiDef } from '../core/types';

// AI 초상화 프롬프트. 모든 캐릭터가 같은 화풍으로 나오도록 STYLE은 고정하고 캐릭터 묘사만 바꾼다.
export const ART_STYLE = [
  'Bright, warm Korean folk-tale picture book illustration.',
  'Soft watercolor and gouache on hanji paper texture, gentle brown ink outlines, cute rounded proportions, cheerful friendly expression.',
  'Palette: warm cream, jade green, vermilion, saffron yellow and soft indigo, like Korean dancheong accents.',
  'Every character is an adult young woman in her twenties, drawn in a wholesome, modest, family-friendly way.',
  'Upper-body character portrait, centered, three-quarter view.',
  'Plain warm cream background with no scenery. No text, no letters, no watermark, no frame, no border.',
].join(' ');

export function portraitPrompt(def: YokaiDef): string {
  return `${ART_STYLE}\nCharacter: ${def.artSubject}.`;
}

/** 기준 그림을 참고해 같은 화풍으로 다른 캐릭터를 그릴 때 쓰는 프롬프트 */
export function portraitPromptWithReference(def: YokaiDef): string {
  return (
    `${ART_STYLE}\nUse the reference image only for the art style: brushwork, line weight, palette, lighting and background. ` +
    `Draw a completely different character: ${def.artSubject}.`
  );
}

/** 게임이 읽는 초상화 경로(public 기준) */
export const portraitPath = (id: string) => `portraits/${id}.webp`;
