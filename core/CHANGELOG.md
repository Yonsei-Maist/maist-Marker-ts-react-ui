# Changelog

## 1.3.3

안정화 릴리스. 공개 API는 유지하며 버그와 전역 부작용만 고쳤다.

### 수정

- **다중 인스턴스**: 맵 컨테이너가 `id="map"` 고정이라 한 페이지에 Marker를 하나만 둘 수 있었다. `MarkComponent`가 ref를 받고 `MapProvider`가 `targetRef`로 마운트한다 (`targetRef`가 없으면 예전처럼 `#map`을 찾는다).
- **키보드 리스너 누수**: `ToolNavigator`가 `document`에 붙인 Delete/Backspace 리스너를 언마운트 시 제거하지 않았다. 정리하고, 텍스트 입력 중(INPUT/TEXTAREA/contentEditable)에는 무시한다.
- **props 변형 제거**: 호스트가 넘긴 `labelNameList` 객체의 `color`를 직접 쓰던 코드를 복사본 생성으로 바꿨다.
- **렌더 중 상태 변형 제거**: `LabelNavigator`가 렌더 중 `mark.label`을 대입하던 것을 `LabelProvider.addLabel`에서 기본 라벨을 지정하도록 옮겼다.
- **`LabelNameManager`**: 클래스 삭제/수정 시 배열과 객체를 제자리에서 고치던 것을 불변 갱신으로 바꿨다.
- **`getLabelNameList()`**: 초기 prop이 아니라 클래스 관리 대화상자에서 편집한 최신 목록을 돌려준다.
- **옵션 리로드**: `useEffect` 의존성을 `options` 객체에서 `labelNameList`, `savedLabelInfo` 필드로 좁혔다. 인라인 options 객체 때문에 매 렌더마다 라벨이 리로드되어 편집 중 도형이 사라지던 문제.
- **`SelectClass`** 컴포넌트를 `LabelNavigator` 밖으로 옮겼다. 렌더마다 새 컴포넌트가 되어 Autocomplete가 포커스와 입력값을 잃던 문제.
- **`PencilDrawer`**: `clipPolygon`이 "Function not implemented" 스텁이라 자유곡선 그리기가 drawend에서 예외를 던졌다. `PolygonDrawer`의 구현을 사용한다.
- **`PencilDrawer`, `AreaDrawer`**: `super.createMark(saveData, memo)`로 memo를 toolType 자리에 넘기던 인자 순서 오류.
- **`BoxMark`, `EllipseMark`**: `fromFormat`의 pascal_voc 분기가 `format.coco`를 읽던 오류.
- **`BaseMark.fillFromJSON`**: `jsonObj.mark`의 키로 `jsonObj[key]`를 읽어 빈 값이 복원되던 오류. mark 필드가 없으면 좌표 포맷으로 복원한다.
- **`PolygonDrawer`**: `insertVertexCondition`이 생성 시점에 한 번 평가되어 꼭짓점 추가가 항상 막혀 있었다. 이벤트 시점에 평가한다.
- **이미지 리더**: 바이트를 문자열로 이어 붙여 base64 data URL을 만들던 것을 Blob URL로 바꿨다. 큰 이미지에서 훨씬 빠르고, `window.Buffer` 전역 대입을 없앴으며, MIME이 항상 png로 고정되던 문제를 고쳤다. 로드 후 URL을 해제한다.
- **자동 배색**: AliceBlue, Ivory 같은 흰색 계열이 앞에 있어 도형이 보이지 않던 팔레트를 고대비 20색으로 교체했다.
- **타입**: `MarkerState.getLabelList`의 반환 타입을 실제와 같은 `LabelInfo[][]`로 수정.
- **빌드 스크립트**: `composite: true`로 남는 `tsconfig.tsbuildinfo` 때문에 두 번째 빌드부터 선언 파일(`dist/types`)이 생성되지 않던 문제. build 시 tsbuildinfo도 함께 지운다.
- **peerDependencies**: react/react-dom/@types를 `^19.2.3`에서 배포본과 같은 `^19.0.0`으로 되돌렸다. 19.1을 쓰는 소비자에서 설치가 막혔다.
