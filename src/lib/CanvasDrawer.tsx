
class CanvasDrawer {

    public readonly originWindowWidth: number;
    public readonly originWindowCenter: number;

    public readonly width: number;
    public readonly height: number;
    public readonly memoryCanvas: HTMLCanvasElement;
    
    public redrawingCanvas: HTMLCanvasElement;
    public redrawingContext: CanvasRenderingContext2D;
    protected context: CanvasRenderingContext2D | null;
    protected imageData: ImageData | undefined;

    public retouchX: number;
    public retouchY: number;
    public retouchWidth: number;
    public retouchHeight: number;

    constructor(width: number, height: number) {
        this.height = height;
        this.width = width;

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

    drawing() {
        
    }
}

export default CanvasDrawer;