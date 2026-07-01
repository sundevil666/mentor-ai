import type { RequestHandler } from 'express';

type ControllerAction<T> = Parameters<RequestHandler>[0] extends infer Req
  ? (req: Req) => T | Promise<T>
  : never;

export function sendData<T>(action: ControllerAction<T>): RequestHandler {
  return async (req, res, next) => {
    try {
      res.json({ data: await action(req) });
    } catch (error) {
      next(error);
    }
  };
}
