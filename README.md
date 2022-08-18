# react-maist-marker
Typescript react module  

## About the Project

### Summary
- Read dzi formatted file (to show microscope data)
- Read image(.jpeg, .png, etc)
- Read dicom(.dcm) (to show CT, MRI, and X-ray data)
- Draw Box, Polygon, Ellipse to images
- Measure length and area

### Functions
- Drawing
- Labeling
- Zoom Out, In
- wc, ww controll in dcm

## Environment
```
node v17.0.1
npx v8.1.0
typescript v4.4.4
ol v6.15.1
cornerstone v2.3.0
cornerstone-wado-image-loader v3.3.0
dicom-parser v1.8.13
@mui/material v^5.0.0
@emotion/styled v^11.0.0
@babel/core v17.18.0
webpack v4.46.0
```

## Open source library
[React](https://reactjs.org/)  
[Typescript](https://www.typescriptlang.org/)  
[Openlayers](https://openlayers.org/)  
[Cornerstone](https://www.cornerstonejs.org/)  

## Install
```
# get source
git clone https://github.com/Yonsei-Maist/react-maist-marker.git

# install and use module
npm install --save @yonsei-maist/react-maist-marker
```

## How to Use
[Storybook](https://maist.yonsei.ac.kr/storybook/maist-marker)

### Marker
```
// next js - next.config.js
// using next-transpile-modules
const withTM = require('next-transpile-modules')(['@yonsei-maist/react-maist-marker', ...other modules]);

module.exports = withPlugins([withTM, removeImports], {
    ...config
}

// next js - add webpack config (because the cornerstone-wado-image-loader@3.3.0 need to set fs)
webpack(config) {
    config.resolve.fallback = { fs: false };
}

// please npm install -D worker-loader@^3.0.0 (because the pdfjs-dist/webpack need to set worker-loader)
npm install -D worker-loader

/*
ToolOption: {
    pencil?: boolean;
    box?: boolean;
    polygon?: boolean;
    length?: boolean;
    area?: boolean;
}
*/
<Marker dziUrl={"dzi url" : string} readOnly?={false : boolean} width?={"100%" : string} height?={"100%": string} toolOption?={ToolOption}/>
```

## Run
```
npm run storybook // start using storybook: localhost:6006
npm run build // build to publish
npm run deploy // deploy to repo
```

## Author
```
Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05 ~
```

## Maintainer
```
Chanwoo Gwon, arknell@yonsei.ac.kr (2021.10. ~)
```

## License
```
ISC.
```