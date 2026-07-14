// `cloudflare:email` is a workerd built-in module (only available at runtime on the
// Worker). Declare a minimal type so the Node build / tsc don't fail to resolve it.
declare module "cloudflare:email" {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string);
  }
}
