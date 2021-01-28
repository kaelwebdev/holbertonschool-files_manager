import { ObjectID } from 'mongodb';
import { v4 as uuid } from 'uuid';

import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import writeFile from '../utils/writeFile';
import fileQueue from '../worker';

export default class FilesController {
  static async findFile(data) {
    return dbClient.db.collection('files').findOne(data);
  }

  static async uploadFile(data) {
    await dbClient.db.collection('files').insertOne(data);
    return dbClient.db.collection('files').findOne(data);
  }

  static async newFile(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, data } = req.body;
    let { parentId, isPublic } = req.body;

    if (!parentId) parentId = 0;
    if (!isPublic) isPublic = false;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    const fileTypes = ['folder', 'file', 'image'];

    if (!type || !fileTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing Data' });
    }
    if (parentId) {
      const parent = await FilesController.findFile({ _id: ObjectID(parentId) });

      if (!parent) return res.status(400).json({ error: 'Parent not found' });

      if (parent.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    const fileData = {
      userId,
      name,
      type,
      parentId,
      isPublic,
    };

    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (type !== 'folder') {
      fileData.data = data;
      fileData.localPath = await writeFile(uuid(), data, type, pathDir);
      if (!fileData.localPath) return res.status(400).send({ error: 'write error' });
    }

    const newFile = await FilesController.uploadFile(fileData);

    if (type === 'image') await fileQueue.add(newFile);

    newFile.id = newFile._id;
    delete newFile._id;
    delete newFile.data;
    delete newFile.localPath;

    return res.status(201).json(newFile);
  }
}
