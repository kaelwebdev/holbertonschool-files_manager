const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const dbName = process.env.DB_DATABASE || 'files_manager';
const mOptions = { useUnifiedTopology: true };
const url = `mongodb://${host}:${port}/${dbName}`;

class DBClient {
  constructor() {
    this.db = null;
    MongoClient.connect(
      url,
      mOptions,
      async (err, client) => {
        if (err) console.log(err);
        this.db = client.db(dbName);
        const collections = await this.db.listCollections().toArray();
        const collectionNames = collections.map((c) => c.name);
        if (!collectionNames.includes('users')) this.db.createCollection('users');
        if (!collectionNames.includes('files')) this.db.createCollection('files');
      },
    );
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() { return this.db.collection('users').countDocuments(); }

  async nbFiles() { return this.db.collection('files').countDocuments(); }
}

const dbClient = new DBClient();

module.exports = dbClient;
