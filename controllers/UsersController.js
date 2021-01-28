import sha1 from 'sha1';
import dbClient from '../utils/db';

// manipulation of user collection in database

export const findUser = async (user) => dbClient.db.collection('users').findOne(user);

export const createUser = async (email, password) => {
  await dbClient.db.collection('users').insertOne({ email, password });

  const newUser = await dbClient.db.collection('users').findOne({ email });

  return { id: newUser._id, email };
};

// user control functions

export const newUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email) return res.status(400).json({ error: 'Missing email' });
  if (!password) return res.status(400).json({ error: 'Missing password' });

  let user = await findUser({ email });
  if (user) return res.status(400).json({ error: 'Already exist' });

  user = await createUser(email, sha1(password));

  return res.json(user);
};
