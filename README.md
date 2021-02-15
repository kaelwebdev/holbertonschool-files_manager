# 0x15. Files manager
In this project the program does the following:
* User authentication via token
* List all files
* Upload a new file
* Change permission of a file
* View a file Generate thumbnails for images
## Resources:books:
Read or watch:
* [Node JS getting started](https://intranet.hbtn.io/rltoken/J_U3SM5CYCUEN1brjOYchg)
* [Process API doc](https://intranet.hbtn.io/rltoken/nP0R4BowbhpL4f8EqRp_fg)
* [Express getting started](https://intranet.hbtn.io/rltoken/0Na8JRLrAhDKV-wHixwV0A)
* [Mocha documentation](https://intranet.hbtn.io/rltoken/GmYXjUgsy9U1vyaJEBgxKg)
* [Nodemon documentation](https://intranet.hbtn.io/rltoken/b04g3H0SE9X2qQa8p9apEg)
* [MongoDB](https://intranet.hbtn.io/rltoken/EH7qVDpUEXcKfvWt8cMwnQ)
* [Bull](https://intranet.hbtn.io/rltoken/w3LMsDeIqzOxQyn9mFq5Yw)
* [Image thumbnail](https://intranet.hbtn.io/rltoken/e7qYbmNo0KnILM0SEbBt5g)
* [Mime-Types](https://intranet.hbtn.io/rltoken/cr22bbwXIxvXoSokT6IigA)
* [Redis](https://intranet.hbtn.io/rltoken/Gh1y27KhgdYJ8ixb-3uP4A)

---
## Learning Objectives:bulb:
What you should learn from this project:

* how to create an API with Express
* how to authenticate a user
* how to store data in MongoDB
* how to store temporary data in Redis
* how to setup and use a background worker

---

# **Use**
1. Verify that the mongodb and redis databases are running in the background.
* For this project we are using Redis version 6.0.10. https://redis.io/download
```
$ wget http://download.redis.io/releases/redis-6.0.10.tar.gz
$ tar xzf redis-6.0.10.tar.gz
$ cd redis-6.0.10
$ make
```
2. Start application
```
npm run start-server
```
Nota: in a second terminal you can check the status of the database.
```
curl 0.0.0.0:5000/status ; echo ""
```
```
curl 0.0.0.0:5000/stats ; echo ""
```
## **Start application**


## **Create user**
```
curl 0.0.0.0:5000/users -XPOST -H "Content-Type: application/json" -d '{ "email": "bob@dylan.com", "password": "toto1234!" }' ; echo ""
```

#####  Output
```
{"id":"60124c0b4d04b125af96382f","email":"bob@dylan.com"}

```
#####  Note:
if the user already exists the exit will be {"error": "Already exist"}
if the password is incorrect {"error":"Missing password"}

### Check that the user exists in the database
```
echo 'db.users.find()' | mongo files_manager
```

#####  Output
```
{ "_id" : ObjectId("60124c0b4d04b125af96382f"), "email" : "bob@dylan.com", "password" : "89cad29e3ebc1035b29b1478a8e70854f25fa2b2" }
```

## **Login and logout**
Login
```
curl 0.0.0.0:5000/connect -H "Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=" ; echo ""
```
#### Output
```
{"token":"51c999b9-0f1d-440f-8b68-53a5d3b2b9a3"}
```

Current user
```
curl 0.0.0.0:5000/users/me -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" ; echo ""
```
#### Output
```
{"id":"60124c0b4d04b125af96382f","email":"bob@dylan.com"}
```

Logout
```
curl 0.0.0.0:5000/disconnect -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" ; echo ""
```
Nota: if the user is not logged in when doing certain actions the output will be

```
{"error": "Unauthorized"}
```

### **Creating files**

#### **Creating file of type file**
```
curl -XPOST 0.0.0.0:5000/files -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" -H "Content-Type: application/json" -d '{ "name": "myText.txt", "type": "file", "data": "SGVsbG8gV2Vic3RhY2shCg==" }' ; echo ""
```

#####  Output

```
{"userId":"60124c0b4d04b125af96382f","name":"myText.txt","type":"file","parentId":0,"isPublic":false,"id":"601693bddff36e5136bc4948"}
```
#### Checking file creation
```
ls /tmp/files_manager/
```
##### Output
```
8b3c96d5-7df0-4450-8e2c-c7ddb5ba39dd
```
#### checking file content
```
cat /tmp/files_manager/8b3c96d5-7df0-4450-8e2c-c7ddb5ba39dd
```
##### Output
```
Hello Webstack!
```

#### **Creating file of type folder**
```
curl -XPOST 0.0.0.0:5000/files -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" -H "Content-Type: application/json" -d '{ "name": "images", "type": "folder" }' ; echo ""
```
##### Output
```
{"userId":"60124c0b4d04b125af96382f","name":"images","type":"folder","parentId":0,"id":"60169577dff36e5136bc4949","isPublic":false}
```

#### **Creating image file**
```
python3 image_upload.py image.png 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3 60169577dff36e5136bc4949
```
##### Output
```
{'userId': '60124c0b4d04b125af96382f', 'name': 'image.png', 'type': 'image', 'parentId': '60169577dff36e5136bc4949', 'isPublic': True, 'id': '601696d0dff36e5136bc494a'}
```		
#### Checking file creation in database
```
echo 'db.files.find()' | mongo files_manager
```
Output
```
{ "_id" : ObjectId("601693bddff36e5136bc4948"), "userId" : "60124c0b4d04b125af96382f", "name" : "myText.txt", "type" : "file", "parentId" : 0, "isPublic" : false, "localPath" : "/tmp/files_manager/8b3c96d5-7df0-4450-8e2c-c7ddb5ba39dd" }
{ "_id" : ObjectId("60169577dff36e5136bc4949"), "userId" : "60124c0b4d04b125af96382f", "name" : "images", "type" : "folder", "parentId" : 0 }
{ "_id" : ObjectId("601696d0dff36e5136bc494a"), "userId" : "60124c0b4d04b125af96382f", "name" : "image.png", "type" : "image", "parentId" : "60169577dff36e5136bc4949", "isPublic" : true, "localPath" : "/tmp/files_manager/d15f3956-54b0-4ed6-937b-c8f52e372736" }
```

##### Checking file creation locally
```
ls /tmp/files_manager/
```
Output
```
8b3c96d5-7df0-4450-8e2c-c7ddb5ba39dd
d15f3956-54b0-4ed6-937b-c8f52e372736
d15f3956-54b0-4ed6-937b-c8f52e372736_100
d15f3956-54b0-4ed6-937b-c8f52e372736_250
d15f3956-54b0-4ed6-937b-c8f52e372736_500
```
## **Get and list files**
```
curl -XGET 0.0.0.0:5000/files -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" ; echo ""
```
```
[{"id":"601693bddff36e5136bc4948","userId":"60124c0b4d04b125af96382f","name":"myText.txt","type":"file","isPublic":false,"parentId":0},{"id":"60169577dff36e5136bc4949","userId":"60124c0b4d04b125af96382f","name":"images","type":"folder","parentId":0},{"id":"601696d0dff36e5136bc494a","userId":"60124c0b4d04b125af96382f","name":"image.png","type":"image","isPublic":true,"parentId":"60169577dff36e5136bc4949"}]
```
### Get files associated with a parent ID
```
curl -XGET 0.0.0.0:5000/files?parentId=60169577dff36e5136bc4949 -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" ; echo ""
```

##### Output
```
[{"id":"601696d0dff36e5136bc494a","userId":"60124c0b4d04b125af96382f","name":"image.png","type":"image","isPublic":true,"parentId":"60169577dff36e5136bc4949"}]
```

### Get one file by ID
```
curl -XGET 0.0.0.0:5000/files/601693bddff36e5136bc4948 -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" ; echo ""
```

##### Output
```
{"id":"601693bddff36e5136bc4948","userId":"60124c0b4d04b125af96382f","name":"myText.txt","type":"file","isPublic":false,"parentId":0}
```

## **Public and non-public files**
```
curl -XPUT 0.0.0.0:5000/files/601693bddff36e5136bc4948/publish -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" ; echo ""
```
```
curl -XPUT 0.0.0.0:5000/files/601693bddff36e5136bc4948/unpublish -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" ; echo ""
```

### **Get file content**
if the file is not public
```
curl -XGET 0.0.0.0:5000/files/601693bddff36e5136bc4948/data -H "X-Token: 51c999b9-0f1d-440f-8b68-53a5d3b2b9a3" ; echo ""
```
if the file is public
```
curl -XGET 0.0.0.0:5000/files/601693bddff36e5136bc4948/data ; echo ""
```
---

## Author
* **Carlos Daniel Cortez** - [kaelwebdev](https://github.com/kaelwebdev)

