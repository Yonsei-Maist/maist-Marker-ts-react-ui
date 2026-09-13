/**
 * 클래스 자동 배색 팔레트.
 * 밝은 배경과 어두운 배경 모두에서 외곽선이 보이도록 채도가 높고 명도가 중간인 색만 사용한다.
 * (기존 HTML 색상 이름 목록은 AliceBlue, Ivory 같은 흰색 계열이 앞에 있어 도형이 보이지 않았다.)
 */
const palette = [
    '#e6194b', // red
    '#3cb44b', // green
    '#4363d8', // blue
    '#f58231', // orange
    '#911eb4', // purple
    '#42d4f4', // cyan
    '#f032e6', // magenta
    '#bfef45', // lime
    '#fabed4', // pink
    '#469990', // teal
    '#dcbeff', // lavender
    '#9a6324', // brown
    '#fffac8', // beige
    '#800000', // maroon
    '#aaffc3', // mint
    '#808000', // olive
    '#ffd8b1', // apricot
    '#000075', // navy
    '#a9a9a9', // grey
    '#ffe119', // yellow
];

export function allocateColor(idx: number) {
    return palette[((idx % palette.length) + palette.length) % palette.length];
}
