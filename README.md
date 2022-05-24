# react-maist-marker
Typescript react module  

## About the Project

### Summary
- Read dzi formatted file
- Draw Box, Polygon to images

### Functions
- Drawing
- Labeling
- Zoom Out, In

## Environment
```
node v17.0.1
npx v8.1.0
typescript v4.4.4
```

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
npm run start // start using webpack: localhost:3000
npm run build // build to publish
```

## Author
```
Chanwoo Gwon, Yonsei Univ. Researcher, since 2020.05 ~
```

## maintainer
```
Chanwoo Gwon, arknell@yonsei.ac.kr (2021.10. ~)
```
