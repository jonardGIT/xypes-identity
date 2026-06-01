declare module "express" {
  export interface Request {}

  export interface Response {
    json(body: unknown): Response;
    status(code: number): Response;
  }

  export type NextFunction = (error?: unknown) => void;

  export type RequestHandler = (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => void;

  export type ErrorRequestHandler = (
    error: unknown,
    request: Request,
    response: Response,
    next: NextFunction,
  ) => void;

  export interface Application {
    use(...handlers: unknown[]): Application;
    get(path: string, ...handlers: unknown[]): Application;
    listen(port: number, callback?: () => void): void;
  }

  export interface ExpressStatic {
    (): Application;
    json(): RequestHandler;
  }

  const express: ExpressStatic;
  export default express;
}

declare module "fastify" {
  export interface FastifyRequest {}

  export interface FastifyReply {
    code(statusCode: number): FastifyReply;
    send(payload: unknown): void;
  }

  export interface FastifyLogger {
    error(error: unknown): void;
    info(message: string): void;
  }

  export interface FastifyInstance {
    log: FastifyLogger;
    addHook(name: string, hook: unknown): FastifyInstance;
    get<RouteGeneric = unknown>(
      path: string,
      options: unknown,
      handler: (...args: any[]) => unknown,
    ): FastifyInstance;
    get(path: string, handler: (...args: any[]) => unknown): FastifyInstance;
    register(
      plugin: (instance: FastifyInstance) => Promise<void>,
      options?: { prefix?: string },
    ): FastifyInstance;
    setErrorHandler(handler: (...args: any[]) => void): FastifyInstance;
    listen(options: { host: string; port: number }): Promise<void>;
  }

  export interface FastifyServerOptions {
    logger?: boolean;
  }

  export default function Fastify(
    options?: FastifyServerOptions,
  ): FastifyInstance;
}
