declare module 'hpp' {
  import { RequestHandler } from 'express';
  function hpp(options?: any): RequestHandler;
  export = hpp;
}
