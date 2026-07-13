declare module "docxtemplater-image-module-free" {
  export type ImageModuleOptions = {
    centered?: boolean;
    fileType?: "docx" | "pptx";
    getImage: (tagValue: string, tagName: string) => Buffer | Uint8Array;
    getSize: (img: Buffer | Uint8Array, tagValue: string, tagName: string) => [number, number];
  };

  export default class ImageModule {
    constructor(options: ImageModuleOptions);
  }
}
