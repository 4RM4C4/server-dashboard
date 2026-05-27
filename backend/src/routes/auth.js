import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username !== config.admin.username) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!config.admin.passwordHash) {
    return res.status(500).json({ error: 'Admin password not configured' });
  }
  const valid = await bcrypt.compare(password, config.admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  res.json({ token });
});

export default router;
