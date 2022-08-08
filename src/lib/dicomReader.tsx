import dicomParser from "dicom-parser";

import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import cornerstone from "cornerstone-core";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

export class DicomObject {
    private slope: number;
    private intercept: number;
    private data: any;
    private dataSet: any;
    private photometricInterpretation: string;
    private pixelData: any;

    private context: CanvasRenderingContext2D;
    private imageData: ImageData;

    public readonly originWindowWidth: number;
    public readonly originWindowCenter: number;

    public ww: number;
    public wc: number;
    public readonly width: number;
    public readonly height: number;
    public readonly memoryCanvas: HTMLCanvasElement;

    public redrawingCanvas: HTMLCanvasElement;
    public redrawingContext: CanvasRenderingContext2D;

    public retouchX: number;
    public retouchY: number;
    public retouchWidth: number;
    public retouchHeight: number;

    public extent: number[];

    constructor(data: any) {
        this.data = data;
        this.dataSet = data.data;
        this.ww = data.windowWidth;
        this.wc = data.windowCenter;
        this.height = data.height;
        this.width = data.width;
        this.photometricInterpretation = this.dataSet.string('x00280004');
        this.pixelData = data.getPixelData();
        this.slope = data.slope;
        this.intercept = data.intercept;

        this.memoryCanvas = document.createElement("canvas");
        this.createContext();
    }
    
    createContext() {
        this.memoryCanvas.width = this.width;
        this.memoryCanvas.height = this.height;
        this.context = this.memoryCanvas.getContext("2d", {alpha: false});
        this.imageData = this.context.createImageData(this.memoryCanvas.width, this.memoryCanvas.height);
    }

    drawing() {
        var buf = new ArrayBuffer(this.imageData.data.length);
        var pixels = new Uint8ClampedArray(buf);
        var data = new Uint32Array(buf);
        data[1] = 0x0b0a0c0d;

        var isLittleEndian = true;
        if (buf[4] === 0x0a && buf[5] === 0x0b && buf[6] === 0x0c &&
            buf[7] === 0x0d) {
            isLittleEndian = false;
        }

        function to32bit(isLittleEndian: boolean, value: number) {
            if (isLittleEndian) {
                return (255 << 24) |    // alpha
                    (value << 16) |    // blue
                    (value << 8) |    // green
                    value;            // red
            } else {
                return (value << 24) |    // red
                    (value << 16) |    // green
                    (value << 8) |    // blue
                    255; // alpha
            }
        }

        for (var y = 0; y < this.height; ++y) {
            for (var x = 0; x < this.width; ++x) {
                let i = y * this.width + x;
                
                let pixelValue = this.pixelData[i] * this.slope + this.intercept; //this.convertBit(this.pixelData[i]);

                let grayscale: number;
                if (pixelValue <= this.wc - 0.5 - (this.ww - 1) / 2)
                    grayscale = 0;
                else if (pixelValue > this.wc - 0.5 + (this.ww - 1) / 2)
                    grayscale = 255;
                else
                    grayscale = ((pixelValue - (this.wc - 0.5)) / (this.ww - 1) + 0.5) * 255;

                if (this.photometricInterpretation == 'MONOCHROME1') {
                    grayscale = 255 - grayscale;
                }

                data[i] = to32bit(isLittleEndian, grayscale);
            }
        }
        
        this.imageData.data.set(pixels);
        this.context.putImageData(this.imageData, 0, 0);
    }

    retouch() {
        this.redrawingContext.drawImage(this.memoryCanvas,
            this.retouchX, this.retouchY, 
            this.retouchWidth, this.retouchHeight
        );
    }
}

export function fitSize(width: number, height: number) {
    let mapSize = [1000000, 1000000];

    let newWidth = mapSize[0];
    let newHeight = mapSize[1] * height / width;

    return [newWidth, newHeight];
}

export interface HeaderString {
    key: string;
    value: string;
}

async function dicomReader(url: string, header?: HeaderString[], withCredentials?: boolean) {
    if (header || withCredentials == true) {
        cornerstoneWADOImageLoader.configure({
            beforeSend: function (xhr: XMLHttpRequest) {
                xhr.withCredentials = withCredentials;

                if (header) {
                    for (let i = 0; i < header.length; i++) {
                        xhr.setRequestHeader(header[i].key, header[i].value);
                    }
                }
            },
        });
    }
    return await cornerstone.loadAndCacheImage('wadouri:' + url);
}

export default dicomReader;