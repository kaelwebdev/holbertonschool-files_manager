import { ObjectID } from 'mongodb';
import { v4 as uuid } from 'uuid';
import mime from 'mime-types';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import writeFile from '../utils/writeFile';
import fileQueue from '../worker';

const fs = require('fs');

export default class FilesController {
  static async findFile(data) {
    return dbClient.db.collection('files').findOne(data);
  }

  static async uploadFile(data) {
    await dbClient.db.collection('files').insertOne(data);
    return dbClient.db.collection('files').findOne(data);
  }

  static async updateFile(idFile, change) {
    await dbClient.db.collection('files').updateOne(idFile, { $set: change });
    return dbClient.db.collection('files').findOne(idFile);
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
      isPublic,
      parentId,
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

  static async putPublish(req, res) {
    const { id } = req.params;

    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    let file = await dbClient.db.collection('files').findOne({ _id: ObjectID(id), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    file = await FilesController.updateFile({ _id: ObjectID(id) }, { isPublic: true });
    file = { id, ...file };
    delete file._id;
    delete file.data;
    delete file.localPath;

    return res.json(file);
  }

  static async putUnPublish(req, res) {
    const token = req.header('X-Token');
    const { id } = req.params;

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectID(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    let file = await dbClient.db.collection('files').findOne({ _id: ObjectID(id), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    file = await FilesController.updateFile({ _id: ObjectID(id) }, { isPublic: false });
    file = { id, ...file };
    delete file._id;
    delete file.data;
    delete file.localPath;

    return res.json(file);
  }

  static async getFile(req, res) {
    const { id } = req.params;

    const file = await FilesController.findFile({ _id: ObjectID(id) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    const {
      isPublic, type, name, userId,
    } = file;
    let { localPath } = file;

    if (isPublic === false) {
      const token = req.header('X-Token');
      const userIdToken = await redisClient.get(`auth_${token}`);
      if (userIdToken !== userId) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    const { size } = req.query;

    if (size && size !== undefined) localPath = `${localPath}_${size}`;

    try {
      const fileData = fs.readFileSync(localPath);
      res.setHeader('Content-Type', mime.contentType(name));
      return res.send(fileData);
    } catch (error) {
      return res.status(404).send({ error: 'Not found' });
    }
  }
}
