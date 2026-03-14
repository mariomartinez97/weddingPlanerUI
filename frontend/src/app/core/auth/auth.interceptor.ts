import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const planId = auth.activePlanId();

  let headers = req.headers;
  if (token) headers = headers.set('X-Auth-Token', token);
  if (planId && !req.url.startsWith('/api/auth/')) headers = headers.set('X-Plan-Id', planId);

  return next(req.clone({ headers }));
};
