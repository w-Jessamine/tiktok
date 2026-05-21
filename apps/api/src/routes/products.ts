import type { FastifyInstance } from "fastify";
import { productCreateSchema } from "@videopilot/shared";
import { prisma } from "../db/prisma";

export const registerProductRoutes = async (app: FastifyInstance) => {
  app.post("/api/products", async (request, reply) => {
    const input = productCreateSchema.parse(request.body);
    const product = await prisma.product.create({
      data: {
        ...input,
        productUrl: input.productUrl || null
      }
    });
    return reply.send({ data: product, requestId: request.id });
  });

  app.get("/api/products", async (request, reply) => {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { assets: true, scripts: { include: { shots: true }, orderBy: { createdAt: "desc" } } }
    });
    return reply.send({ data: products, requestId: request.id });
  });
};
