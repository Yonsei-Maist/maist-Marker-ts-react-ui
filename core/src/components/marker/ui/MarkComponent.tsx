import React, { forwardRef } from 'react';
import styled from '@emotion/styled';

const MarkComponentStyled = styled.div`
    height: 100%;
    .ol-attribution {
        left: 2em;
        bottom: 2em;
        right: inherit;
        text-align: left;
    }

    .ol-attribution button {
        display: none;
    }

    .ol-attribution.ol-collapsed ul {
        display: block;
    }
`

type MarkComponentProps = {
    className?: string;
};

/**
 * OpenLayers 맵이 마운트되는 컨테이너.
 * 고정 id 대신 ref로 대상을 넘기므로 한 페이지에 여러 Marker 인스턴스를 둘 수 있다.
 */
const MarkComponent = forwardRef<HTMLDivElement, MarkComponentProps>(function MarkComponent({ className }, ref) {
    return (
        <MarkComponentStyled ref={ref} className={className} />
    );
});

export default MarkComponent;
