/* A converter for a git url to PROV-N */
var sys = require('sys')
var exec = require('child_process').exec;
var serialize = require('./provSerializer').serialize;

function convert(giturl, serialization, callback) {
  // get the repository name. 
  var repository = giturl.substring(giturl.lastIndexOf('/')+1, giturl.lastIndexOf('.git'));
  // This will be used to temporarily store the cloned repository. 
  // TODO: make this different for every user to avoid conflicts, e.g. using a session id.
  var repositoryPath = repository + "12345";
  // clone the git repository
  clone(giturl, repositoryPath, function(error) {
    if (error !== null){
      callback(null, error);
      // cleanup - delete the repository
      exec("rm -rf " + repositoryPath);
    } else {
      // convert the information from the git url to PROV
      convertRepositoryToProv(giturl, repository, repositoryPath, serialization, function(prov,contentType){
        callback(prov,null,contentType);
        // cleanup - delete the repository
        exec("rm -rf " + repositoryPath);
      });
    }
  });
}

function clone(giturl, repositoryPath, callback) {
  exec('git clone '+ giturl + ' ' + repositoryPath, { timeout : 5000 },function (error, stdout, stderr) {
    if( error !== null ) { 
      callback(error);
    } else {
      callback(null);
    }
  });
}

/* We convert git concepts to PROV concepts as follows:
  commit c ---> activity(c)
  file f   ---> entity(f)
  author a ---> agent(a)
  file f in commit c ---> specializationOf(f_c, f)
*/
function convertRepositoryToProv(giturl, repository, repositoryPath, serialization, callback) {
  // determine a QName for the bundle
  var prefix = giturl.substring(giturl.indexOf("://")+3,giturl.indexOf('.'));
  var prefixUrl = giturl.substring(0,giturl.lastIndexOf('/')+1);
  
  // first, do a git log to find out about all files that ever existed in the repository
  exec('git --no-pager log --pretty=format: --name-only --diff-filter=A', { cwd : repositoryPath }, function (error, stdout, stderr) {
    var files = stdout.toString().split('\n');
    // For some reason, git log appends empty lines here and there. Let's filter them out.
    files = files.filter(function(element, index, array) { return element !== ""; });
    var entities = [];
    files.forEach(function(file) {
        // Because all identifiers need to be QNames in PROV, we need to get rid of the slashes
        var entity = file.replace(/\//g,"-");
        entities.push(entity);
    });
    serialize(serialization, prefix, prefixUrl, repository, entities, null, null, null, null,function(prov, contentType) {
      callback(prov,contentType);
    });
  });
}

exports.convert = convert;