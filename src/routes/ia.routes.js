import { Router } from 'express';
import { chatAgente } from '../controllers/ia.controller.js';

const router = Router();

router.post('/chat', chatAgente);

export default router;
