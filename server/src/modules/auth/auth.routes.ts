import { Router } from 'express';
import { register, login, getProfile, updateProfile } from './auth.controller';
import { validateBody } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { registerSchema, loginSchema, updateProfileSchema } from './auth.validation';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validateBody(updateProfileSchema), updateProfile);

export default router;
