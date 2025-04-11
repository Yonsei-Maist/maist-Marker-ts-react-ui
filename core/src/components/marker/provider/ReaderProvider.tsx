import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios, { AxiosInstance, AxiosRequestHeaders } from 'axios';
import { Layer } from 'ol/layer';
import { View, Map as OlMap } from 'ol';
import { ResponseMessage } from '@/models/response';
import useAsync, { ReducerState } from '@/hooks/useAsync';
import { IS_MAIN_LAYER, MAP_HEIGHT, MAP_WIDTH } from '@/constants/tag';

export interface SourceData {
    layer: Layer;
    view: View;
}

export interface ReaderAddon {
    id: string;
    name: string;
    ext: string[] | RegExp;
    parser: (map: OlMap, path: string, data: any, axiosInstance?: AxiosInstance) => SourceData;
    reader: (fileBuffer: ArrayBuffer) => Promise<ResponseMessage>;
}

interface AddonContextProps {
    readerAddons: ReaderAddon[];
    registerReaderAddon: (addon: ReaderAddon) => void;
    makeLayer: (map: OlMap, path: string, data: any, axiosInstance?: AxiosInstance) => SourceData
    readFile: (url: string, fileBlob?: Blob, dev?: React.DependencyList, axiosInstance?: AxiosInstance, header?: AxiosRequestHeaders, withCredentials?: boolean) => [ReducerState, () => Promise<void>]
}

const ReaderAddonContext = createContext<AddonContextProps | undefined>(undefined);

function ReaderAddonProvider({ children, path }: { children: ReactNode, path: string }) {
    const [readerAddons, setReaderAddons] = useState<ReaderAddon[]>([]);

    const registerReaderAddon = (addon: ReaderAddon) => {
        if (readerAddons.find(o => o.id == addon.id)) return;

        setReaderAddons((prev) => {
            if (prev && prev.find(o => o.id == addon.id)) return prev;
            return [...prev, addon]
        });
    };

    const getReaderAddon = () => {
        let ext = path.split('.').pop();
        for (const readerAddon of readerAddons) {
            const extSupport = readerAddon.ext;
            if (Array.isArray(extSupport)) {
                if (extSupport.find(o => o == ext)) {
                    return readerAddon;
                }
            } else {
                if (extSupport.test(ext)) {
                    return readerAddon;
                }
            }
        }

        return undefined;
    }

    const makeLayer = (map: OlMap, path: string, data: any, axiosInstance?: AxiosInstance): SourceData => {
        let mainReader: ReaderAddon = getReaderAddon();
        let parsed: SourceData = mainReader.parser(map, path, data, axiosInstance);

        let extent = parsed.layer.getExtent();
        parsed.layer.set(IS_MAIN_LAYER, true);
        
        map.set(MAP_WIDTH, extent[2]);
        map.set(MAP_HEIGHT, -extent[1]);

        return parsed;
    }

    const readFile = (url: string, fileBlob?: Blob, dev: React.DependencyList = [], axiosInstance?: AxiosInstance, header?: AxiosRequestHeaders, withCredentials = true): [ReducerState, () => Promise<void>] => {
        let mainReader: ReaderAddon = getReaderAddon();

        async function getFileFromUrl() {
            let buffer: ArrayBuffer;
            if (!fileBlob) {
                const response = await (axiosInstance || axios.create({ withCredentials })).get(
                    url, { responseType: "arraybuffer", headers: header }
                );

                buffer = response.data;
            } else {
                buffer = await fileBlob.arrayBuffer();
            }
            return buffer;
        }
        
        return useAsync(getFileFromUrl, mainReader ? mainReader.reader : async () => { return {} as ResponseMessage }, dev, true);
    }

    return (
        <ReaderAddonContext.Provider value={{ readerAddons, registerReaderAddon, makeLayer, readFile }}>
            {children}
        </ReaderAddonContext.Provider>
    );
};

export const useReaderAddon = (): AddonContextProps => {
    const context = useContext(ReaderAddonContext);
    if (!context) {
        throw new Error('useReaderAddon must be used within an ReaderAddonProvider');
    }

    return context;
};

export default ReaderAddonProvider;