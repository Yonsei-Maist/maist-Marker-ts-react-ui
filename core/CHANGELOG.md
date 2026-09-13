# Changelog

## 1.4.1-snapshot (개발 중, dist-tag `snapshot`)

정식 릴리스 전까지 `1.4.1-snapshot.N`으로만 올린다. `latest`는 1.3.3.

### 8종 어노테이션 타입

기술협상 확정본의 8종 어노테이션 타입을 모두 지원한다. (⑦ Classification은 호스트가 마킹 존재 여부로 파생)

### 추가

- **① Bounding Box**: 8방향 핸들(꼭짓점 4 + 변 중점 4) 리사이즈. 박스는 8점 폴리곤으로 표현되며 기존 5점 데이터는 로드 시 정규화된다. 좌표 수치 직접 입력은 `setMarkData(id, format)`.
- **② Polygon**: 정점 추가(단일 선택 시 변 클릭), 이동, Alt+클릭 삭제. 자석 스냅은 Snap 인터랙션으로 유지.
- **③ Polyline**: 정점 추가·삭제 조건 동일 적용.
- **④ Keypoint** (`PresetKeypoint`, id `Keypoint`): 단일/다중 포인트, 같은 클래스 안에서 순번 자동 부여·표시, `setMarkOrder`로 변경. 저장 `coco=[x,y], order`.
- **⑤ Semantic Segmentation** (`PresetSemanticSegmentation`, id `SemanticMask`): 원본 픽셀 해상도 마스크, 브러시/소거, 브러시 크기, 투명도. 클래스당 마스크 1장. 저장 `mask`(PNG data URL), `maskSize`.
- **⑥ Instance Segmentation** (`PresetInstanceSegmentation`, id `InstanceMask`): 인스턴스별 마스크·번호(`order`) 자동 부여, 중첩 허용(그린 순서대로 합성), 「새 인스턴스」/`newInstance()`, 패널에서 인스턴스 선택 후 이어 칠하기.
- **⑧ Cuboid** (`PresetCuboid`, id `Cuboid`, 확장 옵션): 앞면 박스 + 깊이 오프셋의 2.5D 입력. 앞면 꼭짓점은 리사이즈, 뒷면 꼭짓점은 깊이 변경. 저장 `coco`(앞면), `depth=[dx,dy]`. 3D 확장 시 `depth`를 z 값으로 대체할 수 있도록 분리.
- 브러시 설정 UI: 마스크 도구 활성 시 툴바 옆에 브러시/소거, 크기, 투명도, 새 인스턴스. ref로도 제어(`getMaskSettings`, `setMaskSettings`, `newInstance`).
- `LabelFormat`에 `order`, `depth`, `mask`, `maskSize` 추가. 저장·로드 시 `depth`도 비율 변환된다.
- 클래스 변경 시 마스크는 새 클래스 색으로 재채색된다.
- export: `BoxDrawer`, `BoxMark`, `KeypointDrawer`, `CuboidDrawer`, `MaskDrawer`, `MaskMark`, `MaskSettings`, 신규 프리셋 4종.

### 내부

- 맵 객체에 `DRAWER_MAP`, `FIT_POINT`, `SELECTED_LABEL`, `MASK_LAYER`, `MASK_SETTINGS`, `CURRENT_INSTANCE`를 실어 드로어와 프로바이더가 공유한다.
- 마스크는 벡터 레이어 아래의 ImageCanvas 레이어가 합성한다. 마스크 마크의 벡터 지오메트리는 선택용 대표점뿐이다.

### 호스트 UI 연동 API

호스트 UI와 편집기를 연동하기 위한 API 추가. 기존 API는 그대로 동작한다.

### 추가

- **`onChange(labelList)`**: 마크 추가·수정(드래그/정점 편집/이동)·삭제, 라벨·메모 변경 시마다 현재 목록을 전달한다. 저장 버튼과 무관하게 호스트가 실시간으로 상태를 파생할 수 있다.
- **`onSelectedLabelChange`, `onSelectionChange(ids)`, `onToolChange(tool)`** 콜백.
- **`LabelInfo.id`, `LabelInfo.memo`**: 저장 결과와 `getLabelList()`에 마크 id가 포함되고, `savedLabelInfo`에 id를 넣으면 같은 id로 복원된다.
- **ref 메서드**: `getSelectedLabel`, `setSelectedLabel(name)`, `setTool(id | '')`, `getSelectedIds`, `selectMark`, `unselectMark`, `clearSelection`, `removeMark`, `setMarkLabel`, `setMarkMemo`. 호스트 패널이 라이브러리 드로어를 대체할 수 있다.
- **옵션**: `hideLabelNavigator`, `hidePalette`, `confirmOnSave`(기본 true), `showSaveNotification`(기본 true), `defaultTool`.
- **`PresetPolyline`**: 측정 표시 없는 개곡선 라벨 도구 (id `Polyline`). 확정본의 ③ Polyline 타입.
- **`PresetPolygon({ measure: false })`**: Length/Area 없이 Polygon만 등록 (id `Polygon`).
- **export**: `useLabel`, `useMap`, `LengthDrawer`, `PolylineDrawer`, `LengthMark`, `MarkerOptions`, `LabelFormat`.

### 수정

- `refreshLabels`가 함수형 갱신을 쓰므로 ol 이벤트 핸들러(오래된 클로저)에서 호출해도 안전하다.
- 초기 선택 모드 진입 시 `onToolChange`를 호출하지 않는다 (사용자 조작만 알린다).

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
