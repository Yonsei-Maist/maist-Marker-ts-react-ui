import CanvasDrawer from "../lib/CanvasDrawer";
import ImageSource from "ol/source/Image";
import { Map } from "ol";
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
    new Blob([`importScripts('${pdfjsWorker});`], { type: 'application/javascript' })
);

export class PDFObject extends CanvasDrawer {
    private readonly source: ImageSource;
    private readonly map: Map;
    private currentPageNo: number;

    public readonly pdf: any;
    public readonly pages: any;

    constructor(pdf: any, pages: any, map: Map, source: ImageSource) {
        const viewport = pages[0].getViewport({ scale: 1, });
        super(viewport.width, viewport.height);

        this.pdf = pdf;
        this.pages = pages;
        this.source = source;
        this.map = map;
        this.currentPageNo = 1;
    }

    drawing(): void {
        const page = this.pages[this.currentPageNo - 1];

        var viewport = page.getViewport({ scale: 1, });
        // Support HiDPI-screens.
        var outputScale = window.devicePixelRatio || 1;

        var transform = outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : null;

        this.memoryCanvas.width = Math.floor(viewport.width * outputScale);
        this.memoryCanvas.height = Math.floor(viewport.height * outputScale);
        this.memoryCanvas.style.width = Math.floor(viewport.width) + "px";
        this.memoryCanvas.style.height = Math.floor(viewport.height) + "px";

        var renderContext = {
            canvasContext: this.context,
            transform: transform,
            viewport: viewport
        };

        let renderTask = page.render(renderContext);
        renderTask.promise.then(() => { this.source.changed() });
    }

    setCurrentPageNo(page: number) {
        this.currentPageNo = page;
    }
}

export function isPDF(url: string) {
    return url.indexOf(".pdf") > -1
}

async function pdfReader(fileBuffer: ArrayBuffer) {
    let task = pdfjs.getDocument(await fileBuffer);
    return await task.promise;
}

export default pdfReader;