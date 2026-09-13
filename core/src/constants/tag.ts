/* TOOLS */
export const TOOL_TYPE = "TOOL_TPYE";
export const TOOL_MEMO = "TOOL_MEMO";
export const MARK = "MARK";
export const IS_DRAWER_VECTOR = "IS_DRAWER_VECTOR";
export const IS_MAIN_LAYER = "IS_MAIN_LAYER";

/* MAPS */
export const MAP_MEMO = "MAP_MEMO";
export const MAP_WIDTH = "MAP_WIDTH";
export const MAP_HEIGHT = "MAP_HEIGHT";
export const MAP_SIZE = 1000000;

/* DRAW */
export const DRAW_OBJECT = "DRAW_OBJECT";

/* 1.5+: 맵 객체에 붙여 드로어와 프로바이더가 공유하는 런타임 정보 */
/** ToolNavigator가 만든 toolType → BaseDrawer 맵 */
export const DRAWER_MAP = "DRAWER_MAP";
/** 저장 좌표를 비율(fitPoint=true)로 쓰는지 */
export const FIT_POINT = "FIT_POINT";
/** 현재 선택된 클래스(ClassInfo) */
export const SELECTED_LABEL = "SELECTED_LABEL";
/** 세그먼테이션 마스크를 그리는 ImageCanvas 레이어 */
export const MASK_LAYER = "MASK_LAYER";
/** 브러시 설정 { size, mode, opacity } */
export const MASK_SETTINGS = "MASK_SETTINGS";
/** 인스턴스 세그먼테이션에서 현재 칠하는 인스턴스 마크 id */
export const CURRENT_INSTANCE = "CURRENT_INSTANCE";
