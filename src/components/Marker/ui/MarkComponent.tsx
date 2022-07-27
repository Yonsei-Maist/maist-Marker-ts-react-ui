import React, { useEffect, useState } from 'react';
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
};

function MarkComponent({}: MarkComponentProps) {
    const [value, setValue] = useState("init value");

    useEffect(() => {
        return () => {
        }
    }, [value]);

    return (
        <MarkComponentStyled id="map">
        </MarkComponentStyled>
    );
}

MarkComponent.defaultProps = {
};

export default MarkComponent;