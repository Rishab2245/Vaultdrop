import { Request, Response } from 'express';
import { AnonSession } from '@prisma/client';

export interface GraphQLContext {
  req: Request;
  res: Response;
  session: AnonSession | null | undefined;
}

export function createContext({ req, res }: { req: Request; res: Response }): GraphQLContext {
  return {
    req,
    res,
    session: req.session,
  };
}
