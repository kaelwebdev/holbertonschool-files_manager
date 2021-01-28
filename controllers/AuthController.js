import { v4 as uuid } from 'uuid';
import sha1 from 'sha1';

import UserController from './UsersController';
import RedisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.header('Authorization').slice(6);

    const buffer = Buffer.from(authHeader, 'base64');

    const [email, password] = buffer.toString('utf8').split(':');

    const user = await UserController.findUser({ email });

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (sha1(password) !== user.password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuid();
    const key = `auth_${token}`;
    await RedisClient.set(key, user._id.toString(), 86400);

    return res.json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;

    const uid = await RedisClient.get(key);

    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    await RedisClient.del(key);

    return res.status(204).json({});
  }
}
