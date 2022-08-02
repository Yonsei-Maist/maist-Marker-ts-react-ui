import dicomParser from "dicom-parser";

export class DicomObject {
    private pixelData: Uint16Array | Uint32Array;
    private slope: number;
    private intercept: number;
    private max: number;
    private min: number;
    private uid: string;
    private bitStored: number;
    private highBit: number;
    private photometricInterpretation: string;

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

    constructor(pixelData: Uint16Array | Uint32Array, slope: number, intercept: number, max: number, min: number, 
            ww: number, wc: number, width: number, height: number, uid:string, bitStored: number, highBit: number, photometricInterpretation: string) {
        this.pixelData = pixelData;
        this.slope = slope;
        this.intercept = intercept;
        this.max = max;
        this.min = min;
        this.ww = ww;
        this.wc = wc;
        this.originWindowWidth = ww;
        this.originWindowCenter = wc;
        this.width = width;
        this.height = height;
        this.uid = uid;
        this.bitStored = bitStored;
        this.highBit = highBit;
        this.photometricInterpretation = photometricInterpretation;
        this.memoryCanvas = document.createElement("canvas");
        this.createContext();
        this.redrawingCanvas = undefined;
        this.redrawingContext = undefined;
    }
    
    createContext() {
        this.memoryCanvas.width = this.width;
        this.memoryCanvas.height = this.height;
        this.context = this.memoryCanvas.getContext("2d");
        this.imageData = this.context.createImageData(this.memoryCanvas.width, this.memoryCanvas.height);
    }

    drawing() {
        let range = [Math.max(this.wc - this.ww / 2, this.min), this.wc + this.ww / 2];
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
                
                let pixelValue = this.convertBit(this.pixelData[i]);
                if (pixelValue < range[0])
                    pixelValue = range[0];
                else if (pixelValue > range[1])
                    pixelValue = range[1];
                
                pixelValue = pixelValue * this.slope + this.intercept;

                let grayscale = Math.round((pixelValue - range[0]) / (range[1] - range[0]) * 255);
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

    convertBit(origin: number) {
        let value = origin;
        if (this.uid == "1.2.840.10008.1.2.2") {
            // if data was wrotten using big endian
            // change the msb and lsb (8 bit each)
            let msb = origin & 65280;
            let lsb = origin & 255;

            lsb = lsb << 8;
            msb = msb >> 8;

            value = lsb | msb;
        }

        let stored = Math.pow(2, this.bitStored) - 1;
        stored = stored << (this.highBit - this.bitStored + 1);

        return value;
    }
}

function dicomReader(data: ArrayBuffer): DicomObject {
    var dicomRawData = new Uint8Array(data);
    var dataSet = dicomParser.parseDicom(dicomRawData);
    var height = dataSet.uint16('x00280010');
    var width = dataSet.uint16('x00280011');
    var uid = dataSet.string('x00020010');
    var bitAllocated = dataSet.uint16('x00280100');
    var bitStored = dataSet.uint16('x00280101');
    var highBit = dataSet.uint16('x00280102');
    var pixelRepresentation = dataSet.uint16('x00280103');
    var photometricInterpretation = dataSet.string('x00280004');
    var wc = dataSet.floatString('x00281050');
    var ww = dataSet.floatString('x00281051');
    var intercept = dataSet.floatString('x00281052') || 0.0;
    var slope = dataSet.floatString('x00281053') || 0.0;
    var pixelDataElement = dataSet.elements.x7fe00010;
    var pixelData = bitAllocated == 16 ? 
        new Uint16Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length / 2) :
        new Uint32Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length / 4);

    let min = Math.pow(-2, bitStored - 1);
    let max = Math.pow(2, bitStored - 1) - 1;

    if (pixelRepresentation == 0) {
        min = 0;
        max = Math.pow(2, bitStored) - 1;
    }

    return new DicomObject(
        pixelData,
        slope,
        intercept,
        max,
        min,
        ww,
        wc,
        width,
        height,
        uid,
        bitStored,
        highBit,
        photometricInterpretation);
}

export default dicomReader;