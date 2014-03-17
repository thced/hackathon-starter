var db = require('./../config/db').connection;
var couchbase = require('couchbase');
var uuid = require('uuid');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');

function User() {
   this.type = 'user',
   this.uid = uuid.v4(),
   this.email = '',
   this.password = '',
   this.facebook = '',
   this.twitter = '',
   this.google = '',
   this.github = '',
   this.linkedin = '',
   this.tokens = [], 
   this.profile = {
      name: '',
      gender: '',
      location: '',
      website: '',
      picture: ''
   },
   this.resetPasswordToken = '',
   this.resetPasswordExpires = ''
}

function User(user) {
   this.type = 'user',
   this.uid = user.uid || uuid.v4(),
   this.email = user.email,
   this.password = user.password || 'NOT-SET',
   this.facebook = user.facebook || '',
   this.twitter = user.twitter || '',
   this.google = user.google || '',
   this.github = user.github || '',
   this.linkedin = user.linkedin || '',
   this.tokens = user.tokens || [],    
   this.profile = {
      name: user.profile ? user.profile.name : '',
      gender: user.profile ? user.profile.gender : '',
      location: user.profile ? user.profile.location : '',
      website: user.profile ? user.profile.website : '',
      picture: user.profile ? user.profile.picture : ''
   },
   this.resetPasswordToken = '',
   this.resetPasswordExpires = ''
}

User.cleanUserObject = function(obj) {
   delete obj.type;
   
   return obj;
}


User.prototype.hashPassword = function(callback) {
   var user = this;

   bcrypt.genSalt(8, function(err, salt) {
      if(err) return callback(err);

      bcrypt.hash(user.password, salt, null, function(err, hash) {
         if(err) return callback(err);
         
         return callback(null, hash);
      });
   });
}


User.create = function(user, callback) {
   user.hashPassword(function(err, newPass) {
      if(err) return callback(err);

      var userDoc = new User(user);
      userDoc.password = newPass;
      
      var userDocName = 'user-' + userDoc.uid;
      var refDoc = {
         type: 'username',
         uid: userDoc.uid
      };
      var refDocName = 'username-' + userDoc.email;
      
      db.add(refDocName, refDoc, function(err) {
         if (err && err.code === couchbase.errors.keyAlreadyExists) {
            return callback(err);
         }

         db.add(userDocName, userDoc, function(err, result) {
            if (err) return callback(err);
             
            callback(null, User.cleanUserObject(userDoc), result.cas);
         });
      });
   });
}

User.save = function(user, callback) {
   var userDocName = 'user-'+user.uid;
     
   db.set(userDocName, user, function(err, result) {
      if(err) return callback(err);
   
      return callback(null, result.cas);
   });
}

User.remove = function(uid, callback) {
   User.get(uid, function(err, result, cas) {
      if(err) return callback(err);
      
      var user = result;
      var refDocName = 'username-' + user.email;
      db.remove(refDocName, function(err, result) {
         if(err) return callback(err);
         
         var userDocName = 'user-' + user.uid;
         db.remove(userDocName, function(err, result) {
            if(err) return callback(err);
            
            return callback(null);
         });
      });
   });
}

User.prototype.comparePasswords = function(candidate, callback) {
   bcrypt.compare(candidate, this.password, function(err, isMatch) {
      if(err) return callback(err);

      callback(null, isMatch);
   });
}

User.get = function(uid, callback) {
   var userDocName = 'user-' + uid;
   db.get(userDocName, function(err, result) {
      if (err) return callback(err);

      var user = new User(result.value);
      User.cleanUserObject(user);

      callback(null, user, result.cas);
   });
};

User.getByUsername = function(username, callback) {
   var refDocName = 'username-' + username;
   
   db.get(refDocName, function(err, result) {
      if (err && err.code === couchbase.errors.keyNotFound) {
         return callback('Username not found');
      } else if (err) {
         return callback(err);
      }
      // Extract the UID we found
      var foundUid = result.value.uid;
      // Forward to a normal get
      User.get(foundUid, callback);
   });
};

User.prototype.gravatar = function(size, defaults) {
  if (!size) size = 200;
  if (!defaults) defaults = 'retro';

  if (!this.email) {
    return 'https://gravatar.com/avatar/?s=' + size + '&d=' + defaults;
  }

  var md5 = crypto.createHash('md5').update(this.email);
  return 'https://gravatar.com/avatar/' + md5.digest('hex').toString()
            + '?s=' + size + '&d=' + defaults;
};


module.exports = User;
