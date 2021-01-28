import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import RedisClient from '../utils/redis';

export default class UsersController {
  // manipulation of user collection in database

  static async findUser(user) {
    return dbClient.db.collection('users').findOne(user);
  }

  static async createUser(email, password) {
    await dbClient.db.collection('users').insertOne({ email, password });

    const newUser = await dbClient.db.collection('users').findOne({ email });

    return { id: newUser._id, email };
  }

  // user control functions

  static async newUser(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    let user = await UsersController.findUser({ email });
    if (user) return res.status(400).json({ error: 'Already exist' });

    user = await UsersController.createUser(email, sha1(password));

    return res.status(201).send(user);
  }

  static async getMe(req, res) {
    const token = req.header('X-token');

    const uid = await RedisClient.get(`auth_${token}`);

    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const user = await UsersController.findUser({ _id: ObjectId(uid) });

    return res.json({ email: user.email, id: user._id });
  }
}
