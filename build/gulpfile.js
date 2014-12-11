// Build for breeze.js.samples

// include gulp
var gulp = require('gulp');

var fs   = require('fs');
var path = require('path');
var glob = require('glob');
var async = require('async');
var del = require('del');
var eventStream = require('event-stream');

// include plug-ins
var gutil = require('gulp-util');
var flatten = require('gulp-flatten');
var rename  = require('gulp-rename');
var zip = require('gulp-zip');

//var concat  = require('gulp-concat');
//var newer   = require('gulp-newer');

var _tempDir = './_temp/';
var _clientDir = '../../breeze.js/'
var _clientSrcDir =  _clientDir + 'src/'
var _clientBuildDir = _clientDir + 'build/';
var _clientTsSrcDir    = _clientDir + 'typescript/typescript/';
var _clientLabsDir = '../../breeze.js.labs/';
var _serverLabsDir = '../../breeze.server.labs/';
var _serverNetDir = '../../breeze.server.net/';
var _vendorDir = _clientDir + 'test/vendor/'
var _metadataDir = _clientDir + 'docs/metadata/';

// var _msBuildCmd = 'C:/Windows/Microsoft.NET/Framework/v4.0.30319/MSBuild.exe ';
var _msBuildCmd = '"C:/Program Files (x86)/MSBuild/12.0/Bin/MsBuild.exe" '; // vs 2013 version of MsBuild
var _msBuildOptions = ' /p:Configuration=Release /verbosity:minimal ';


var _nugetPackageNames = [
  'Breeze.Client',
  'Breeze.Server.WebApi2',
  'Breeze.Server.ContextProvider.EF6',
  'Breeze.Server.ContextProvider.NH',
  'Breeze.Server.ContextProvider',
  'Breeze.WebApi2.EF6',
  'Breeze.WebApi2.NH'
];

var breezeDlls = [
  'Breeze.ContextProvider',
  'Breeze.ContextProvider.EF6',
  'Breeze.ContextProvider.NH',
  'Breeze.WebApi2'
];


var _versionNum = getBreezeVersion();
gutil.log('LocalAppData dir: ' + process.env.LOCALAPPDATA);

var _sampleSolutionFileNames = glob.sync('../**/*.sln');
// exclude zza
_sampleSolutionFileNames = _sampleSolutionFileNames.filter(function(item) {
  return item.indexOf('zza') == -1;
});


gulp.task('getLibs', function() {
  var destDir = './libs/'
  return eventStream.concat(
    gulp.src(_clientBuildDir + 'breeze.*.js')
        .pipe(flatten())
        .pipe(gulp.dest(destDir + 'js')),
    gulp.src(_clientSrcDir + 'breeze.dataService.mongo.js')
        .pipe(flatten())
        .pipe(gulp.dest(destDir + 'js.adapters')),
    gulp.src([_clientLabsDir + '*.js', _clientLabsDir + '*.css'])
        .pipe(flatten())
        .pipe(gulp.dest(destDir + 'js.labs')),
    gulp.src(_serverLabsDir + '*.cs')
        .pipe(flatten())
        .pipe(gulp.dest(destDir + 'server.labs'))
  );
  // Translated from this
  /*
  XCOPY "%1..\..\..\breeze.js\build\*.js" "%1js" /Y
  XCOPY "%1..\..\..\breeze.js\src\breeze.dataService.mongo.js" "%1js.adapters" /Y
  XCOPY "%1..\..\..\breeze.js.labs\*.js" "%1js.labs" /Y
  XCOPY "%1..\..\..\breeze.js.labs\*.css" "%1js.labs" /Y
  XCOPY "%1..\..\..\breeze.server.labs\*.cs" "%1server.labs" /Y
  */
});


gulp.task('sampleSolutionsUpdateNugets', function(done) {
  async.each(_sampleSolutionFileNames, function (fileName, cb) {
    execNugetInstallUpdate(fileName, _nugetPackageNames, cb);
  }, done);

});

gulp.task('sampleSolutionsBuild', ['getLibs', 'sampleSolutionsUpdateNugets'], function(done) {
  async.each(_sampleSolutionFileNames, function(fileName, cb) {
    msBuildSolution(fileName, cb);
  }, done);
});

gulp.task('breezeServerBuild', function(done) {
  var solutionFileName = _serverNetDir + 'Breeze.Build.sln';
  msBuildSolution(solutionFileName, done);
});

gulp.task('copyToTempDir', ['breezeServerBuild'], function() {
  del.sync(_tempDir, { force: true} );

  try { fs.mkdirSync(_tempDir); } catch(e) {}; // in case it doesn't exist.
  fs.writeFileSync(_tempDir + 'version.txt', 'Version: ' + _versionNum);

  var srcDlls = [];
  breezeDlls.forEach(function(dllName) {
    var path = _serverNetDir + dllName + '/bin/release/';
    srcDlls.push(path + dllName + '.dll');
    srcDlls.push(path + dllName + '.pdb');
    srcDlls.push(path + dllName + '.xml');
  })

  return eventStream.concat(
    gulp.src('./readme.txt').pipe(gulp.dest(_tempDir)),
    // gulp.src('../readme.md').pipe(gulp.dest(_tempDir));

    gulp.src([_clientBuildDir + 'breeze.*min.js', _clientBuildDir + 'breeze.*debug.js',  _vendorDir + 'q.**js'])
        .pipe(gulp.dest(_tempDir + 'Scripts')),
    gulp.src(_clientSrcDir + 'b??_breeze.**js')
        .pipe(rename(function(path) {
          // replace 'b??_breeze' with 'breeze.'
          var name = path.basename;
          path.basename = 'breeze' + name.substring(name.indexOf('.'));
        }))
        .pipe(gulp.dest(_tempDir + 'Scripts/Adapters')),
    gulp.src(_clientSrcDir + 'breeze.*.*.js')
        .pipe(gulp.dest(_tempDir + 'Scripts/Adapters')),
    gulp.src(_clientTsSrcDir + '*.d.ts')
        .pipe(gulp.dest(_tempDir + 'Typescript')),
    gulp.src(_metadataDir + '*.*')
        .pipe(gulp.dest(_tempDir + 'Scripts/Metadata')),
    gulp.src(srcDlls)
        .pipe(gulp.dest(_tempDir + 'NetDlls'))
  );
})

gulp.task('zip', ['copyToTempDir'], function() {
// gulp.task('zip', function() {
  gutil.log('Zipping...');
  var zipFileName = 'breeze-runtime-' + _versionNum + '.zip';
  del.sync('./' + zipFileName);
  gulp.src(_tempDir + '**/*')
      .pipe(zip(zipFileName))
      .pipe(gulp.dest('.'));
});

// gulp.task('default', ['sampleSolutionsBuild'] , function() {
gulp.task('default', ['sampleSolutionsBuild', 'zip'] , function() {

});

function msBuildSolution(solutionFileName, done) {
  var baseName = path.basename(solutionFileName);
  var rootCmd = _msBuildCmd + '"' + baseName +'"' + _msBuildOptions + ' /t:'

  var cmds = [rootCmd + 'Clean', rootCmd + 'Rebuild'];
  var cwd = path.dirname(solutionFileName);
  execCommands(cmds, { cwd: cwd},  done);
}

function execNugetInstallUpdate(solutionFileName, nugetPackageNames, done ) {

  var solutionDir = path.dirname(solutionFileName);
  var packagesDir = solutionDir + '/packages';
  gutil.log('Executing nuget install for file: ' + solutionFileName);
  var configFileNames = glob.sync(solutionDir + '/**/packages.config');

  var installCmds = configFileNames.map(function(configFileName) {
    return 'nuget install ' + configFileName + ' -OutputDirectory ' + packagesDir;
  });

  var baseUpdateCmd = 'nuget update ' + solutionFileName +  ' -FileConflictAction Ignore -Id ';
  var updateCmds = nugetPackageNames.map(function(npn) {
    return baseUpdateCmd + npn;
  });
  var cmds = installCmds.concat(updateCmds);
  execCommands(cmds, null, done);

}

function getBreezeVersion() {
  var versionFile = fs.readFileSync( _clientSrcDir + '_head.jsfrag');
  var regex = /\s+version:\s*"(\d.\d\d*.?\d*.?\d*)"/
  var matches = regex.exec(versionFile);

  if (matches == null) {
    throw new Error('Breeze client version number not found');
  }
  // matches[0] is entire version string - [1] is just the capturing group.
  var versionNum = matches[1];
  gutil.log("Breeze client version from: " + _clientSrcDir + ' is: ' + versionNum);
  return versionNum;
}

// utilities

// added options are: shouldLog
// cb is function(err, stdout, stderr);
function execCommands(cmds, options, cb) {
  options = options || {};
  options.shouldThrow = options.shouldThrow == null ? true : options.shouldThrow;
  options.shouldLog = options.shouldLog == null ? true : options.shouldLog;
  if (!cmds || cmds.length == 0) cb(null, null, null);
  var exec = require('child_process').exec;  // just to make it more portable.
  exec(cmds[0], options, function(err, stdout, stderr) {
    if (err == null) {
      if (options.shouldLog) {
        gutil.log('cmd: ' + cmds[0]);
        gutil.log('stdout: ' + stdout);
      }
      if (cmds.length == 1) {
        cb(err, stdout, stderr);
      } else {
        execCommands(cmds.slice(1), options, cb);
      }
    } else {
      if (options.shouldLog) {
        gutil.log('exec error on cmd: ' + cmds[0]);
        gutil.log('exec error: ' + err);
        if (stdout) gutil.log('stdout: ' + stdout);
        if (stderr) gutil.log('stderr: ' + stderr);
      }
      if (err && options.shouldThrow) throw err;
      cb(err, stdout, stderr);
    } 
  });
}

function mapPath(dir, fileNames) {
  return fileNames.map(function(fileName) {
    return dir + fileName;
  });
};

