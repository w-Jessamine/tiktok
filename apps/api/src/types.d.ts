import "fastify";

declare module "fastify" {
  interface FastifyReply {
    badRequest(message: string): FastifyReply;
  }

  interface FastifyRequest {
    id: string;
  }
}
