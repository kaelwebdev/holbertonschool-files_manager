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
      return res.status(400).json({ error: 'Missing data' });
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
    if (type === 'folder') {
      const tmpIsPublic = fileData.isPublic;
      delete fileData.data;
      delete fileData.isPublic;
      const newFile = await FilesController.uploadFile(fileData);
      newFile.id = newFile._id;
      delete newFile._id;
      newFile.isPublic = tmpIsPublic;
      return res.status(201).json(newFile);
    }
    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';
    const filename = uuid();
    const localPath = `${pathDir}/${filename}`;
    fileData.localPath = localPath;
    try {
      await writeFile(filename, data, type, pathDir);
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }
    const newFile = await FilesController.uploadFile(fileData);
    newFile.data = data;
    if (type === 'image') await fileQueue.add(newFile);
    newFile.id = newFile._id;
    delete newFile._id;
    delete newFile.data;
    delete newFile.localPath;
    return res.status(201).json(newFile);
  }

  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectID(id), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    file.id = file._id;
    delete file._id;
    delete file.data;
    delete file.localPath;

    return res.json(file);
  }

  static async aggregateFiles(userId, parentId = 0, page = 0) {
    const qMatch = { $and: [{ parentId }] };
    let qData = [{ $match: qMatch }, { $skip: page * 20 }, { $limit: 20 }];
    if (parentId === 0) qData = [{ $skip: page * 20 }, { $limit: 20 }];

    const cursor = await dbClient.db.collection('files').aggregate(
      qData,
    ).toArray();
    const files = [];
    cursor.forEach(({
      _id, userId, name, type, isPublic, parentId,
    }) => {
      files.push({
        id: _id, userId, name, type, isPublic, parentId,
      });
    });
    return files;
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const { parentId, page } = req.query;

    const paginate = await FilesController.aggregateFiles(userId, parentId, page);
    return res.json(paginate);
  }
}
