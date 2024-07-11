/**
 * read dzi format using openlayers
 * @author Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05. ~
 * @Date 2021.10.27
 */
import React, { Ref, useEffect, useLayoutEffect, useState } from 'react';

import 'ol/ol.css';
import { PresetBox, PresetEllipse, PresetImageReader, PresetPolygon } from './addon/Presets';
import ReaderAddonProvider from '../provider/ReaderProvider';
import AddonProvider from '../provider/AddonProvider';
import Marker, { MarkerProps, MarkerState } from './Marker';

function AddonContainer({children, onMount}) {
    useLayoutEffect(() => {
        onMount();
    }, [onMount]);
    return <>{children}</>
}

function MarkerExt({fileUri, fileBlob, saveHandler, children = [<PresetBox key={0}/>, <PresetPolygon key={1}/>, <PresetEllipse key={2}/>], axiosInstance, options}: MarkerProps, ref: Ref<MarkerState>) {
    const [mounted, setMounted] = useState(false);

    return (
        <ReaderAddonProvider path={fileUri}>
            <AddonProvider>
                <AddonContainer onMount={() => {setMounted(true);}}>
                    <PresetImageReader />
                    {children}
                </AddonContainer>
                {
                    mounted &&
                    <Marker ref={ref} fileUri={fileUri} fileBlob={fileBlob} saveHandler={saveHandler} axiosInstance={axiosInstance} options={options}/>
                }
            </AddonProvider>
        </ReaderAddonProvider>
    );
}

const RefMarker = React.forwardRef<MarkerState, MarkerProps>(MarkerExt);

export default RefMarker;