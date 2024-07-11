
export class DrawObject {
    public readonly width: number;
    public readonly height: number;
    public readonly totalPageNo: number;

    public currentPageNo: number;
    constructor(width: number, height: number, total: number = 1) {
        this.width = width;
        this.height = height;
        this.totalPageNo = total;
        this.currentPageNo = 1;
    }

    setCurrentPageNo(page: number) {
        this.currentPageNo = page;
    }

    retouch() {

    }

    drawing() {
        
    }
}

class CanvasDrawer extends DrawObject {

    public readonly originWindowWidth: number;
    public readonly originWindowCenter: number;

    public readonly memoryCanvas: HTMLCanvasElement;
    
    public redrawingCanvas: HTMLCanvasElement;
    public redrawingContext: CanvasRenderingContext2D;
    protected context: CanvasRenderingContext2D | null;
    protected imageData: ImageData | undefined;

    public retouchX: number;
    public retouchY: number;
    public retouchWidth: number;
    public retouchHeight: number;

    constructor(width: number, height: number, total?: number) {
        super(width, height, total);

        this.memoryCanvas = document.createElement("canvas");
        this.createContext();
    }
    
    createContext() {
        this.memoryCanvas.width = this.width;
        this.memoryCanvas.height = this.height;
        this.context = this.memoryCanvas.getContext("2d", {alpha: false});
        this.imageData = this.context?.createImageData(this.memoryCanvas.width, this.memoryCanvas.height);
    }

    retouch() {
        this.redrawingContext.drawImage(this.memoryCanvas,
            this.retouchX, this.retouchY, 
            this.retouchWidth, this.retouchHeight
        );
    }

    getContext() {
        return this.context;
    }

    getImageData() {
        return this.imageData;
    }
}

export default CanvasDrawer;